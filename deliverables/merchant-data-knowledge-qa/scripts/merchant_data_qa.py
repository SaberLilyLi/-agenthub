#!/usr/bin/env python3
"""Inspect a local workbook and answer deterministic apparel wholesale questions.

No database, no third-party dependencies, no network calls.  The workbook is read into
memory only for this process.  `inspect` proposes Sheet relationships; `ask` uses only
relationships the user confirmed in workspace.json.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import sys
import zipfile
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any
from xml.etree import ElementTree as ET

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main", "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships"}
REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
KEY_ALIASES = ["款号", "货号", "商品编号", "sku", "SKU", "编码", "编号"]
SEMANTICS = {
    "style_code": KEY_ALIASES,
    "supplier": ["供应商", "供货商", "厂家"],
    "purchase_quantity": ["进货数量", "采购数量", "采购件数", "进货件数"],
    "inbound_quantity": ["入库数量", "入库件数", "收货数量"],
    "sales_quantity": ["销售数量", "销量", "出库数量", "销售件数"],
    "inventory": ["可售库存", "库存", "现货", "库存数量"],
    "unit_price": ["进货单价", "采购单价", "单价"],
    "amount": ["进货金额", "采购金额", "金额", "总额"],
    "date": ["日期", "下单日期", "入库日期", "销售日期", "时间"],
}

def col_num(ref: str) -> int:
    result = 0
    for char in re.match(r"[A-Z]+", ref).group(0):
        result = result * 26 + ord(char) - 64
    return result - 1

def text_value(cell: ET.Element, shared: list[str]) -> str:
    cell_type = cell.get("t")
    value = cell.find("m:v", NS)
    if cell_type == "inlineStr":
        text = cell.find(".//m:t", NS)
        return text.text if text is not None and text.text else ""
    if value is None or value.text is None:
        return ""
    if cell_type == "s":
        try: return shared[int(value.text)]
        except (ValueError, IndexError): return ""
    return value.text

def read_xlsx(path: Path) -> dict[str, list[dict[str, str]]]:
    with zipfile.ZipFile(path) as book:
        shared: list[str] = []
        if "xl/sharedStrings.xml" in book.namelist():
            root = ET.fromstring(book.read("xl/sharedStrings.xml"))
            shared = ["".join(node.itertext()) for node in root.findall("m:si", NS)]
        rel_root = ET.fromstring(book.read("xl/_rels/workbook.xml.rels"))
        rels = {item.get("Id"): item.get("Target") for item in rel_root.findall(f"{{{REL_NS}}}Relationship")}
        workbook = ET.fromstring(book.read("xl/workbook.xml"))
        result: dict[str, list[dict[str, str]]] = {}
        for sheet in workbook.findall("m:sheets/m:sheet", NS):
            target = rels.get(sheet.get(f"{{{NS['r']}}}id"), "")
            normalized_target = target.lstrip("/")
            part = normalized_target if normalized_target.startswith("xl/") else "xl/" + normalized_target
            root = ET.fromstring(book.read(part))
            raw_rows: list[dict[int, str]] = []
            for row in root.findall("m:sheetData/m:row", NS):
                values: dict[int, str] = {}
                for cell in row.findall("m:c", NS): values[col_num(cell.get("r", "A1"))] = text_value(cell, shared).strip()
                if any(values.values()): raw_rows.append(values)
            if not raw_rows: result[sheet.get("name", "Sheet")] = []; continue
            # Workbooks exported by business tools often have a title row above the
            # table header. Select the early row whose values best match known
            # business-field aliases, then fall back to the widest early row.
            aliases = {alias for values in SEMANTICS.values() for alias in values}
            candidates_for_header = raw_rows[: min(5, len(raw_rows))]
            header_index = max(
                range(len(candidates_for_header)),
                key=lambda index: (
                    sum(1 for value in candidates_for_header[index].values() if value in aliases),
                    len(candidates_for_header[index]),
                ),
            )
            header_row = raw_rows[header_index]
            headers = {idx: value.strip() or f"列{idx + 1}" for idx, value in header_row.items()}
            result[sheet.get("name", "Sheet")] = [{headers[idx]: row.get(idx, "") for idx in headers} for row in raw_rows[header_index + 1:]]
        return result

def read_workbook(path: Path) -> dict[str, list[dict[str, str]]]:
    if path.suffix.lower() == ".csv":
        with path.open("r", encoding="utf-8-sig", newline="") as handle:
            return {path.stem: [{k.strip(): (v or "").strip() for k, v in row.items()} for row in csv.DictReader(handle)]}
    if path.suffix.lower() == ".xlsx": return read_xlsx(path)
    raise ValueError("只支持 .xlsx 或 .csv")

def find_field(headers: list[str], semantic: str) -> str | None:
    for alias in SEMANTICS[semantic]:
        if alias in headers: return alias
    return None

def semantic_fields(rows: list[dict[str, str]]) -> dict[str, str]:
    headers = list(rows[0]) if rows else []
    return {name: field for name in SEMANTICS if (field := find_field(headers, name))}

def candidates(book: dict[str, list[dict[str, str]]]) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    sheets = list(book)
    for i, left_name in enumerate(sheets):
        left_rows = book[left_name]
        if not left_rows: continue
        left_key = find_field(list(left_rows[0]), "style_code")
        if not left_key: continue
        left_values = {row[left_key] for row in left_rows if row.get(left_key)}
        for right_name in sheets[i + 1:]:
            right_rows = book[right_name]
            if not right_rows: continue
            right_key = find_field(list(right_rows[0]), "style_code")
            if not right_key: continue
            right_values = {row[right_key] for row in right_rows if row.get(right_key)}
            matched = left_values & right_values
            if matched:
                results.append({"leftSheet": left_name, "leftField": left_key, "rightSheet": right_name, "rightField": right_key, "matchedKeys": len(matched), "matchRate": round(len(matched) / max(1, min(len(left_values), len(right_values))), 4), "confirmed": False})
    return results

def file_hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()

def file_modified_at(path: Path) -> str:
    return datetime.fromtimestamp(path.stat().st_mtime).astimezone().isoformat()

def verify_file_integrity(version: dict[str, Any], path: Path) -> dict[str, Any]:
    baseline_modified = version.get("sourceFileModifiedAt")
    baseline_size = version.get("sourceFileSizeBytes")
    baseline_hash = version.get("fileHash", "").removeprefix("sha256:")
    if not baseline_modified or baseline_size is None or not baseline_hash:
        return {"status": "cannot_verify", "reasons": ["该版本缺少上传时的完整性基线"]}
    current_modified = file_modified_at(path)
    current_size = path.stat().st_size
    current_hash = file_hash(path)
    reasons = []
    if current_modified != baseline_modified:
        reasons.append("文件最新修改时间与上传时记录不一致")
    if current_size != baseline_size:
        reasons.append("文件大小与上传时记录不一致")
    if current_hash != baseline_hash:
        reasons.append("文件内容指纹与上传时记录不一致")
    return {
        "status": "verified" if not reasons else "modified",
        "currentModifiedAt": current_modified,
        "currentSizeBytes": current_size,
        "reasons": reasons,
    }

def high_risk_fields(book: dict[str, list[dict[str, str]]]) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for name, rows in book.items():
        fields = semantic_fields(rows)
        if fields.get("style_code"):
            items.append({"category": "relation_key", "sheet": name, "field": fields["style_code"], "question": "该字段是否可作为跨 Sheet 的款号/货号关联键？"})
        if fields.get("date"):
            items.append({"category": "primary_date", "sheet": name, "field": fields["date"], "question": "该日期字段是否为本表的业务统计日期？"})
        if fields.get("amount"):
            items.append({"category": "amount_definition", "sheet": name, "field": fields["amount"], "question": "该金额字段的业务口径是什么，是否可用于金额统计？"})
        if fields.get("inventory"):
            items.append({"category": "inventory_definition", "sheet": name, "field": fields["inventory"], "question": "该库存字段是可售、账面、锁定还是在途库存？"})
    return items

def dataset_version(path: Path, book: dict[str, list[dict[str, str]]], relations_confirmed: bool, high_risk_confirmed: bool) -> dict[str, Any]:
    uploaded_at = datetime.now().astimezone()
    digest = file_hash(path)
    return {
        "datasetId": "ds_" + (re.sub(r"[^A-Za-z0-9]+", "_", path.stem).strip("_").lower() or "dataset"),
        "versionId": "v" + uploaded_at.strftime("%Y%m%d-%H%M%S-%f") + "-" + digest[:8],
        "uploadedAt": uploaded_at.isoformat(),
        "fileName": path.name,
        "fileHash": "sha256:" + digest,
        "sourceFileModifiedAt": file_modified_at(path),
        "sourceFileSizeBytes": path.stat().st_size,
        "sourceFile": str(path.resolve()),
        "status": "active" if high_risk_confirmed else "pending_confirmation",
        "confirmation": {
            "relationsConfirmed": relations_confirmed,
            "highRiskFieldsConfirmed": high_risk_confirmed,
            "confirmedAt": uploaded_at.isoformat() if high_risk_confirmed else None,
        },
        "highRiskFields": high_risk_fields(book),
        "sheets": [{"name": name, "rowCount": len(rows), "fields": semantic_fields(rows)} for name, rows in book.items()],
        "relations": [{**relation, "confirmed": relations_confirmed} for relation in candidates(book)],
    }

def add_version(existing: dict[str, Any] | None, version: dict[str, Any]) -> dict[str, Any]:
    versions = list(existing.get("versions", [])) if existing else []
    if version["status"] == "active":
        for item in versions:
            if item.get("status") == "active":
                item["status"] = "superseded"
    versions.append(version)
    active = version["versionId"] if version["status"] == "active" else (existing or {}).get("activeVersionId")
    return {"schemaVersion": 2, "activeVersionId": active, "versions": versions}

def active_version(workspace: dict[str, Any]) -> dict[str, Any]:
    if "versions" not in workspace:
        return workspace
    active_id = workspace.get("activeVersionId")
    for version in workspace["versions"]:
        if version.get("versionId") == active_id and version.get("status") == "active":
            return version
    raise ValueError("没有已确认的 active 数据版本。请先确认高风险字段后再提问。")

def number(value: str) -> float:
    try: return float(re.sub(r"[^0-9.\-]", "", value or "0") or 0)
    except ValueError: return 0.0

def parse_date(value: str) -> datetime | None:
    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%Y.%m.%d", "%Y-%m-%d %H:%M:%S"):
        try: return datetime.strptime(value[:19], fmt)
        except ValueError: pass
    return None

def sheet_by_name(book: dict[str, list[dict[str, str]]], words: list[str]) -> tuple[str, list[dict[str, str]]] | None:
    for name, rows in book.items():
        if any(word in name for word in words): return name, rows
    return None

def confirmed(workspace: dict[str, Any], sheet_a: str, sheet_b: str) -> bool:
    return any(rel.get("confirmed") and {rel.get("leftSheet"), rel.get("rightSheet")} == {sheet_a, sheet_b} for rel in workspace.get("relations", []))

def latest_window(rows: list[dict[str, str]], date_field: str | None, days: int = 7) -> list[dict[str, str]]:
    if not date_field: return rows
    dates = [parse_date(row.get(date_field, "")) for row in rows]
    valid = [item for item in dates if item]
    if not valid: return rows
    end = max(valid); start = end - timedelta(days=days - 1)
    return [row for row in rows if (value := parse_date(row.get(date_field, ""))) and start <= value <= end]

def answer_low_stock(book: dict[str, list[dict[str, str]]], workspace: dict[str, Any], question: str) -> dict[str, Any]:
    sales = sheet_by_name(book, ["销售", "出库"]); stock = sheet_by_name(book, ["库存"])
    if not sales or not stock: raise ValueError("需要名称含“销售”和“库存”的 Sheet")
    sales_name, sales_rows = sales; stock_name, stock_rows = stock
    if not confirmed(workspace, sales_name, stock_name): raise ValueError(f"{sales_name} 与 {stock_name} 的关联尚未由用户确认")
    sf, tf = semantic_fields(sales_rows), semantic_fields(stock_rows)
    if not all([sf.get("style_code"), sf.get("sales_quantity"), tf.get("style_code"), tf.get("inventory")]): raise ValueError("销售/库存 Sheet 缺少款号、销量或库存字段")
    period_rows = latest_window(sales_rows, sf.get("date"))
    volumes: dict[str, float] = defaultdict(float)
    for row in period_rows: volumes[row[sf["style_code"]]] += number(row[sf["sales_quantity"]])
    stock_map = {row[tf["style_code"]]: number(row[tf["inventory"]]) for row in stock_rows}
    threshold_match = re.search(r"(?:低于|小于|不足)\s*(\d+)", question)
    threshold = float(threshold_match.group(1)) if threshold_match else 20
    items = [{"styleCode": key, "salesQuantity": round(qty, 2), "inventory": stock_map[key]} for key, qty in volumes.items() if key in stock_map and stock_map[key] < threshold]
    items.sort(key=lambda item: item["salesQuantity"], reverse=True); items = items[:10]
    return {"answerType": "data", "summary": f"按销售记录中的最近 7 天计算，销量前列且库存低于 {threshold:g} 的款共有 {len(items)} 个。", "result": items, "evidence": {"sheets": [sales_name, stock_name], "fields": [sf["style_code"], sf["sales_quantity"], tf["inventory"]], "calculation": f"最近 7 天销量汇总，按款号关联库存，筛选库存 < {threshold:g}，按销量降序取前 10", "matchedRows": len(items)}}

def answer_supplier_purchase(book: dict[str, list[dict[str, str]]]) -> dict[str, Any]:
    found = sheet_by_name(book, ["采购", "进货"])
    if not found: raise ValueError("需要名称含“采购”或“进货”的 Sheet")
    name, rows = found; fields = semantic_fields(rows)
    if not fields.get("supplier") or not fields.get("purchase_quantity"): raise ValueError("采购 Sheet 缺少供应商或进货数量字段")
    period_rows = latest_window(rows, fields.get("date"), days=31)
    totals: dict[str, dict[str, float]] = defaultdict(lambda: {"quantity": 0, "amount": 0})
    for row in period_rows:
        supplier = row[fields["supplier"]] or "未填写供应商"; qty = number(row[fields["purchase_quantity"]]); totals[supplier]["quantity"] += qty
        amount = number(row.get(fields.get("amount", ""), "")) if fields.get("amount") else qty * number(row.get(fields.get("unit_price", ""), "")); totals[supplier]["amount"] += amount
    result = [{"supplier": key, "purchaseQuantity": round(value["quantity"], 2), "purchaseAmount": round(value["amount"], 2)} for key, value in totals.items()]
    result.sort(key=lambda item: item["purchaseAmount"], reverse=True)
    return {"answerType": "data", "summary": f"按采购记录中的最近 31 天计算，共有 {len(result)} 个供应商有进货记录。", "result": result, "evidence": {"sheets": [name], "fields": [fields["supplier"], fields["purchase_quantity"], fields.get("amount") or fields.get("unit_price", "")], "calculation": "最近 31 天按供应商汇总进货数量；金额优先使用进货金额，缺失时以进货数量 × 单价计算", "matchedRows": len(period_rows)}}

def answer_customer_products(book: dict[str, list[dict[str, str]]], question: str) -> dict[str, Any]:
    found = sheet_by_name(book, ["销售", "订单"])
    if not found: raise ValueError("需要名称含“销售”或“订单”的 Sheet")
    name, rows = found
    if not rows: raise ValueError("销售订单 Sheet 没有数据")
    headers = list(rows[0])
    customer_field = next((item for item in ["客户名称", "客户", "客户名"] if item in headers), None)
    product_field = next((item for item in ["商品名称", "商品", "产品名称"] if item in headers), None)
    quantity_field = next((item for item in ["销售数量", "销量", "出库数量"] if item in headers), None)
    if not customer_field or not product_field: raise ValueError("销售订单 Sheet 缺少客户名称或商品名称字段")
    customer = next((value for value in {row.get(customer_field, "") for row in rows} if value and value in question), None)
    if not customer: raise ValueError("未在销售订单中识别到客户名称，请在问题中提供完整客户名称。")
    products: dict[str, dict[str, Any]] = {}
    matched_rows = [row for row in rows if row.get(customer_field) == customer]
    for row in matched_rows:
        product = row.get(product_field, "未填写商品")
        entry = products.setdefault(product, {"productName": product, "orderCount": 0, "salesQuantity": 0.0})
        entry["orderCount"] += 1
        entry["salesQuantity"] += number(row.get(quantity_field, "")) if quantity_field else 0
    result = sorted(products.values(), key=lambda item: (-item["salesQuantity"], item["productName"]))
    for item in result: item["salesQuantity"] = round(item["salesQuantity"], 2)
    return {"answerType": "data", "summary": f"{customer} 共购买过 {len(result)} 个商品，涉及 {len(matched_rows)} 笔订单。", "result": result, "evidence": {"sheets": [name], "fields": [customer_field, product_field] + ([quantity_field] if quantity_field else []), "calculation": "按客户名称筛选销售订单，再按商品名称分组汇总订单数和销售数量", "matchedRows": len(matched_rows)}}

def answer_reconcile(book: dict[str, list[dict[str, str]]], workspace: dict[str, Any], question: str) -> dict[str, Any]:
    match = re.search(r"(?:款号|货号|SKU)\s*([A-Za-z0-9_-]+)", question, re.I)
    if not match:
        match = re.search(r"\b([A-Za-z]+[0-9][A-Za-z0-9_-]*)\b", question)
    if not match: raise ValueError("请在问题中提供款号，例如：款号 A123 的库存是否一致？")
    code = match.group(1); parts = {"采购": sheet_by_name(book, ["采购", "进货"]), "入库": sheet_by_name(book, ["入库"]), "销售": sheet_by_name(book, ["销售", "出库"]), "库存": sheet_by_name(book, ["库存"])}
    if not all(parts.values()): raise ValueError("核对需要采购/进货、入库、销售、库存四类 Sheet")
    names = [value[0] for value in parts.values() if value]
    if any(not confirmed(workspace, names[0], name) for name in names[1:]): raise ValueError("采购、入库、销售、库存之间存在未确认的关联")
    values: dict[str, float] = {}
    quantity_names = {"采购": "purchase_quantity", "入库": "inbound_quantity", "销售": "sales_quantity", "库存": "inventory"}
    for label, item in parts.items():
        name, rows = item; fields = semantic_fields(rows); key = fields.get("style_code"); qty = fields.get(quantity_names[label])
        if not key or not qty: raise ValueError(f"{name} 缺少款号或{label}数量字段")
        values[label] = sum(number(row[qty]) for row in rows if row.get(key) == code)
    expected = values["入库"] - values["销售"]; difference = values["库存"] - expected
    status = "一致" if abs(difference) < 1e-9 else "不一致"
    return {"answerType": "data", "summary": f"款号 {code}：入库减销售应为 {expected:g}，当前库存为 {values['库存']:g}，结果{status}。", "result": {"styleCode": code, **{key: round(value, 2) for key, value in values.items()}, "expectedInventory": round(expected, 2), "difference": round(difference, 2), "status": status}, "evidence": {"sheets": names, "fields": ["款号", "进货数量", "入库数量", "销售数量", "可售库存"], "calculation": "按款号汇总；库存核对公式为 入库数量 - 销售数量", "matchedRows": 1}}

def ask(book: dict[str, list[dict[str, str]]], workspace: dict[str, Any], question: str) -> dict[str, Any]:
    if any(word in question.lower() for word in ["一致", "核对", "对账", "reconcile"]): return answer_reconcile(book, workspace, question)
    if "商品" in question or "产品" in question: return answer_customer_products(book, question)
    if any(word in question for word in ["销量", "销售"]) and any(word in question for word in ["库存", "低于", "不足"]): return answer_low_stock(book, workspace, question)
    if any(word in question for word in ["供应商", "进货", "采购"]) and any(word in question for word in ["金额", "数量", "多少"]): return answer_supplier_purchase(book)
    raise ValueError("当前脚本只支持已列出的服装批发验收问题。请确认字段后改为库存销量、供应商进货或款号库存核对问题。")

def write_audit(directory: Path, item: dict[str, Any]) -> None:
    directory.mkdir(parents=True, exist_ok=True)
    with (directory / "query-audits.jsonl").open("a", encoding="utf-8") as handle: handle.write(json.dumps(item, ensure_ascii=False) + "\n")

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    inspect = sub.add_parser("inspect"); inspect.add_argument("input", type=Path); inspect.add_argument("--output-dir", type=Path); inspect.add_argument("--confirm-relations", action="store_true"); inspect.add_argument("--confirm-high-risk", action="store_true", help="Confirm the generated high-risk field checklist and activate this version")
    question = sub.add_parser("ask"); question.add_argument("input", type=Path); question.add_argument("--workspace", type=Path, required=True); question.add_argument("--question", required=True); question.add_argument("--output-dir", type=Path)
    args = parser.parse_args()
    try:
        book = read_workbook(args.input)
        if args.command == "inspect":
            relations_confirmed = args.confirm_relations or args.confirm_high_risk
            version = dataset_version(args.input, book, relations_confirmed, args.confirm_high_risk)
            existing = None
            if args.output_dir:
                args.output_dir.mkdir(parents=True, exist_ok=True)
                workspace_file = args.output_dir / "workspace.json"
                if workspace_file.exists():
                    existing = json.loads(workspace_file.read_text(encoding="utf-8"))
                output = add_version(existing, version)
                workspace_file.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
            else:
                output = add_version(None, version)
            print(json.dumps(output, ensure_ascii=False, indent=2)); return 0
        workspace_file = args.workspace / "workspace.json"
        if not workspace_file.exists(): raise ValueError("未找到 workspace.json。请先运行 inspect 并确认跨 Sheet 关系。")
        workspace = json.loads(workspace_file.read_text(encoding="utf-8"))
        selected_version = active_version(workspace)
        if Path(selected_version.get("sourceFile", "")).resolve() != args.input.resolve():
            raise ValueError("当前 active 版本对应的文件与本次输入不一致。请使用该版本的原始文件，或先扫描并确认新文件。")
        integrity = verify_file_integrity(selected_version, args.input)
        if integrity["status"] != "verified":
            reasons = "；".join(integrity["reasons"])
            raise ValueError(f"文件可能已被修改，当前数据可能不准确：{reasons}。请重新运行 inspect 生成并确认新版本。")
        output = ask(book, selected_version, args.question)
        output["datasetId"] = selected_version.get("datasetId")
        output["versionId"] = selected_version.get("versionId")
        output["fileIntegrity"] = integrity
        output["question"] = args.question; output["answeredAt"] = datetime.now().astimezone().isoformat()
        if args.output_dir: write_audit(args.output_dir, output)
        else: write_audit(args.workspace, output)
        print(json.dumps(output, ensure_ascii=False, indent=2)); return 0
    except (OSError, ValueError, zipfile.BadZipFile, ET.ParseError) as error:
        print(json.dumps({"error": str(error)}, ensure_ascii=False), file=sys.stderr); return 1

if __name__ == "__main__": raise SystemExit(main())
