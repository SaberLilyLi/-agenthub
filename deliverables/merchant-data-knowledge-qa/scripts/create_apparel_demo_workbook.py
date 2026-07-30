#!/usr/bin/env python3
"""Create a dependency-free apparel wholesale .xlsx fixture for local verification."""
from __future__ import annotations

import argparse
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

SHEETS = {
    "采购明细": [
        ["款号", "供应商", "进货数量", "进货单价", "日期"],
        ["A123", "广州优衣供应链", "100", "45", "2026-07-20"],
        ["B205", "杭州潮品厂", "80", "38", "2026-07-21"],
        ["C310", "广州优衣供应链", "60", "52", "2026-07-22"],
    ],
    "入库明细": [
        ["款号", "入库数量", "日期"],
        ["A123", "100", "2026-07-21"], ["B205", "80", "2026-07-22"], ["C310", "60", "2026-07-23"],
    ],
    "销售明细": [
        ["款号", "销售数量", "日期"],
        ["A123", "85", "2026-07-23"], ["A123", "10", "2026-07-25"], ["B205", "45", "2026-07-24"], ["C310", "12", "2026-07-26"],
    ],
    "库存明细": [
        ["款号", "可售库存", "更新时间"],
        ["A123", "5", "2026-07-26"], ["B205", "35", "2026-07-26"], ["C310", "48", "2026-07-26"],
    ],
}

def column(index: int) -> str:
    value = ""
    while index:
        index, remainder = divmod(index - 1, 26); value = chr(65 + remainder) + value
    return value

def sheet_xml(rows: list[list[str]]) -> str:
    xml_rows = []
    for row_index, row in enumerate(rows, start=1):
        cells = []
        for col_index, value in enumerate(row, start=1):
            ref = f"{column(col_index)}{row_index}"
            cells.append(f'<c r="{ref}" t="inlineStr"><is><t>{escape(value)}</t></is></c>')
        xml_rows.append(f'<row r="{row_index}">{"".join(cells)}</row>')
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' + "".join(xml_rows) + '</sheetData></worksheet>'

def main() -> int:
    parser = argparse.ArgumentParser(); parser.add_argument("output", type=Path); args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    sheet_entries = list(SHEETS)
    workbook_sheets = "".join(f'<sheet name="{escape(name)}" sheetId="{i}" r:id="rId{i}"/>' for i, name in enumerate(sheet_entries, start=1))
    relationships = "".join(f'<Relationship Id="rId{i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet{i}.xml"/>' for i in range(1, len(sheet_entries) + 1))
    with zipfile.ZipFile(args.output, "w", zipfile.ZIP_DEFLATED) as book:
        book.writestr("[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' + "".join(f'<Override PartName="/xl/worksheets/sheet{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' for i in range(1, len(sheet_entries) + 1)) + '</Types>')
        book.writestr("_rels/.rels", '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')
        book.writestr("xl/workbook.xml", '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' + workbook_sheets + '</sheets></workbook>')
        book.writestr("xl/_rels/workbook.xml.rels", '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + relationships + '</Relationships>')
        for index, name in enumerate(sheet_entries, start=1): book.writestr(f"xl/worksheets/sheet{index}.xml", sheet_xml(SHEETS[name]))
    print(args.output.resolve()); return 0

if __name__ == "__main__": raise SystemExit(main())
