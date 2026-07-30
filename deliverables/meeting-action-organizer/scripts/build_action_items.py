#!/usr/bin/env python3
"""Extract structured action items from meeting text and emit action_items.json.

This script uses only the Python standard library. It accepts meeting material
as plain text, chat-log JSON, or transcript lines, applies keyword heuristics to
identify action items / decisions / risks, and writes a JSON array whose schema
is designed for direct consumption by a future unified administrative-task center.

Usage:
  python scripts/build_action_items.py input.txt --output-dir ./out
  cat transcript.txt | python scripts/build_action_items.py --title "周会" --output-dir ./out
  python scripts/build_action_items.py input.txt            # prints JSON to stdout

Output schema (one object per action item):
  {
    "sourceType": "meeting",
    "sourceReference": "<id or empty>",
    "title": "动词开头的事项",
    "description": "事项说明",
    "ownerName": "负责人或待指定",
    "dueAt": "ISO date or null",
    "status": "draft",
    "riskLevel": "low|medium|high",
    "requiresConfirmation": true,
    "evidence": "原始会议中的对应片段"
  }

Design rules (from SKILL.md):
  - Never fabricate decisions, owners, dates, or commitments.
  - Missing owner → "待指定"; missing deadline → null.
  - Preserve the source snippet as evidence.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

# ── keyword sets ──────────────────────────────────────────────────────────

ACTION_VERBS = [
    "负责", "完成", "提交", "发送", "确认", "跟进", "安排", "整理",
    "准备", "发布", "评审", "上线", "修复", "更新", "对接", "推进",
    "输出", "核对", "同步", "回复", "提供", "协调", "部署", "测试",
]

DECISION_KEYWORDS = ["决定", "确定", "达成", "同意", "通过", "结论", "敲定", "确认通过", "最终方案"]
RISK_KEYWORDS = ["风险", "待确认", "可能", "不确定", "依赖", "阻塞", "需要确认", "存疑", "暂未"]
HIGH_RISK_KEYWORDS = ["紧急", "投诉", "退款", "法务", "合同", "赔偿", "违约"]

# deadline patterns
DEADLINE_PATTERNS = [
    (r"(\d{4})[年\-/](\d{1,2})[月\-/](\d{1,2})[日号]?\s*(?:前|之前)?", "ymd"),
    (r"本周([一二三四五六日天])", "weekday"),
    (r"下周([一二三四五六日天])", "weekday"),
    (r"(?:明天|今日|今天|后天)", "relative"),
    (r"(\d{1,2})[月\-/](\d{1,2})[日号]\s*(?:前|之前)?", "md"),
]

WEEKDAY_MAP = {"一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "日": 7, "天": 7}


# ── helpers ───────────────────────────────────────────────────────────────

def extract_deadline(text: str) -> str | None:
    """Return an ISO date string if a deadline is found, else None."""
    for pattern, kind in DEADLINE_PATTERNS:
        match = re.search(pattern, text)
        if not match:
            continue
        if kind == "ymd":
            y, m, d = match.groups()
            return f"{int(y):04d}-{int(m):02d}-{int(d):02d}"
        if kind == "md":
            m, d = match.groups()
            # no year in text → leave as MM-DD (caller may resolve); return null to avoid fabrication
            return None
        if kind == "weekday":
            # weekday without a concrete date → cannot fabricate an ISO date
            return None
        if kind == "relative":
            # relative day → cannot fabricate without knowing "today"
            return None
    return None


# words that must never be treated as a person name
NON_NAME_WORDS = {
    "我们", "大家", "你们", "他们", "咱们", "本周", "下周", "本周先", "今天",
    "明天", "后天", "现在", "目前", "之后", "然后", "这个", "那个", "如果",
    "需要", "可以", "应该", "已经", "之前", "以上", "以下", "产品", "项目",
    "团队", "部门", "公司", "系统", "功能", "版本", "需求", "问题",
}


def extract_owner(text: str, known_names: list[str]) -> str:
    """Try to find a responsible person; return '待指定' if not found."""
    # 1) "我负责/我来…" → speaker self-reference
    if re.search(r"我\s*(?:负责|来|去|牵头|跟进|完成|提交|整理|准备|输出|对接)", text):
        return "待指定（发言人自称）"
    # 2) check known attendees
    for name in known_names:
        if name and name in text:
            return name
    # 3) "由XX负责/XX牵头" — require a leading preposition to avoid false positives
    match = re.search(r"(?:由|让|请|交给)\s*([\u4e00-\u9fa5]{2,4})\s*(?:负责|牵头|跟进|完成|提交|整理|准备|输出|对接)", text)
    if match:
        candidate = match.group(1)
        if candidate not in NON_NAME_WORDS:
            return candidate
    # 4) "XX负责/XX来" — only when XX is immediately before the verb with no particle
    match = re.search(r"(?<![\u4e00-\u9fa5])([\u4e00-\u9fa5]{2,3})(?:负责|牵头)", text)
    if match:
        candidate = match.group(1)
        if candidate not in NON_NAME_WORDS:
            return candidate
    return "待指定"


def classify_risk(text: str) -> str:
    for kw in HIGH_RISK_KEYWORDS:
        if kw in text:
            return "high"
    for kw in RISK_KEYWORDS:
        if kw in text:
            return "medium"
    return "low"


def truncate(text: str, limit: int = 300) -> str:
    text = text.strip().replace("\n", " ")
    return text[:limit] + ("…" if len(text) > limit else "")


# ── parsing ───────────────────────────────────────────────────────────────

def parse_messages(raw: str) -> list[dict[str, str]]:
    """Parse input into a list of {sender, content, time} dicts.

    Accepts:
      - JSON with "messages" array (chat-log format)
      - JSON array of {sender, content, ...}
      - Plain text (each non-empty line becomes one entry, sender = "")
    """
    raw = raw.strip()
    if not raw:
        return []

    # try JSON
    try:
        data = json.loads(raw)
    except (json.JSONDecodeError, ValueError):
        data = None

    if data is not None:
        msgs = data.get("messages", data) if isinstance(data, dict) else data
        if isinstance(msgs, list):
            result = []
            for item in msgs:
                if isinstance(item, dict):
                    result.append({
                        "sender": str(item.get("sender", item.get("from", ""))),
                        "content": str(item.get("content", item.get("text", item.get("body", "")))),
                        "time": str(item.get("time", item.get("date", ""))),
                    })
                elif isinstance(item, str):
                    result.append({"sender": "", "content": item, "time": ""})
            return result

    # plain text: split into lines, strip timestamps/speaker labels if present
    result = []
    for line in raw.splitlines():
        line = line.strip()
        if not line:
            continue
        # strip leading timestamp [12.5-13.0]
        line = re.sub(r"^\[\d+\.?\d*-\d+\.?\d*\]\s*", "", line)
        # strip speaker label 【发言人 N｜...】
        sender = ""
        speaker_match = re.match(r"【发言人\s*\d+[｜|]([^】]+)】\s*(.*)", line)
        if speaker_match:
            sender = speaker_match.group(1).strip()
            line = speaker_match.group(2).strip()
        else:
            line = re.sub(r"^【[^】]+】\s*", "", line)
        if line:
            result.append({"sender": sender, "content": line, "time": ""})
    return result


def build_action_items(
    messages: list[dict[str, str]],
    source_reference: str,
    attendees: list[str],
) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    seen_evidence: set[str] = set()

    for msg in messages:
        content = msg["content"]
        if not content:
            continue

        is_action = any(verb in content for verb in ACTION_VERBS)
        is_decision = any(kw in content for kw in DECISION_KEYWORDS)
        is_risk = any(kw in content for kw in RISK_KEYWORDS) or any(kw in content for kw in HIGH_RISK_KEYWORDS)

        if not (is_action or is_decision or is_risk):
            continue

        # deduplicate by evidence
        evidence_key = content[:120]
        if evidence_key in seen_evidence:
            continue
        seen_evidence.add(evidence_key)

        owner = extract_owner(content, attendees) if is_action else "待指定"
        due = extract_deadline(content) if is_action else None
        risk = classify_risk(content)

        # build title: verb-first, concise
        title = content[:80].rstrip("。，；,;") if is_action else None
        if is_decision and not is_action:
            title = ("确认：" + content[:70]).rstrip("。，；,;")
        if is_risk and not is_action and not is_decision:
            title = ("关注：" + content[:70]).rstrip("。，；,;")

        if not title:
            continue

        description_parts = []
        if msg.get("sender"):
            description_parts.append(f"发言人：{msg['sender']}")
        if msg.get("time"):
            description_parts.append(f"时间：{msg['time']}")
        if is_decision:
            description_parts.append("类型：决策")
        elif is_risk:
            description_parts.append("类型：风险/待确认")
        else:
            description_parts.append("类型：行动项")
        description = "；".join(description_parts)

        items.append({
            "sourceType": "meeting",
            "sourceReference": source_reference,
            "title": title,
            "description": description,
            "ownerName": owner,
            "dueAt": due,
            "status": "draft",
            "riskLevel": risk,
            "requiresConfirmation": True,
            "evidence": truncate(content),
        })

    return items


# ── main ──────────────────────────────────────────────────────────────────

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("input", type=Path, nargs="?", help="Meeting text file (omit to read from stdin)")
    parser.add_argument("--title", default="", help="Meeting title (stored in metadata)")
    parser.add_argument("--meeting-at", default="", help="Meeting time (stored in metadata)")
    parser.add_argument("--attendees", default="", help="Comma-separated attendee names for owner extraction")
    parser.add_argument("--source-reference", default="", help="Meeting record ID or file ID for traceability")
    parser.add_argument("--output-dir", type=Path, help="Local output directory; if omitted, JSON is printed to stdout only")
    parser.add_argument("--pretty", action="store_true", default=True, help="Pretty-print JSON (default)")
    args = parser.parse_args()

    # read input
    if args.input:
        if not args.input.is_file():
            print(f"Input file not found: {args.input}", file=sys.stderr)
            return 1
        raw = args.input.read_text(encoding="utf-8")
    else:
        raw = sys.stdin.read()

    attendees = [a.strip() for a in args.attendees.split(",") if a.strip()]
    messages = parse_messages(raw)
    if not messages:
        print("No meeting content found in input.", file=sys.stderr)
        return 1

    items = build_action_items(messages, args.source_reference, attendees)

    output = {
        "metadata": {
            "title": args.title or "未提供",
            "meetingAt": args.meeting_at or "未提供",
            "attendees": attendees,
            "sourceReference": args.source_reference,
            "itemCount": len(items),
        },
        "actionItems": items,
    }

    json_str = json.dumps(output, ensure_ascii=False, indent=2 if args.pretty else None)

    if args.output_dir:
        args.output_dir.mkdir(parents=True, exist_ok=True)
        items_path = args.output_dir / "action_items.json"
        items_path.write_text(json_str, encoding="utf-8")
        print(f"action_items.json written to: {items_path} ({len(items)} items)", file=sys.stderr)
        # also write the raw meeting text for traceability if input was a file
        if args.input:
            raw_copy = args.output_dir / "meeting_source.txt"
            raw_copy.write_text(raw, encoding="utf-8")
    else:
        print(json_str)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
