#!/usr/bin/env python3
"""Classify customer email intent & risk, produce email_analysis.json and reply_draft.json.

Uses only the Python standard library. Accepts an email (from, subject, body) via
CLI arguments, a JSON file, or stdin; classifies intent and risk level with keyword
heuristics; generates a suggested action and reply draft; and writes structured JSON
suitable for a future unified administrative-task center.

Usage:
  python scripts/analyze_email.py --from "..." --subject "..." --body "..." --output-dir ./out
  python scripts/analyze_email.py --demo-id "demo-001" --output-dir ./out   # uses mock-inbox.json
  python scripts/analyze_email.py --input email.json                         # reads from JSON file
  cat email.json | python scripts/analyze_email.py                           # reads from stdin

Output schema (email_analysis.json):
  {
    "sourceType": "email",
    "messageId": "原始 Message-ID 或本地演示ID",
    "threadId": null,
    "from": "发件人",
    "subject": "主题",
    "intent": "inquiry|followup|complaint|quote|urging|other",
    "riskLevel": "low|medium|high",
    "recommendedAction": "建议动作",
    "draftReply": "回复草稿",
    "requiresHumanConfirmation": true
  }

reply_draft.json contains just the reply text for easy copy-and-send.

Security rules (from SKILL.md):
  - Never auto-send without explicit user confirmation.
  - High-risk emails (quote/payment/refund/contract/legal/sensitive/complaint/urgent)
    MUST have requiresHumanConfirmation = true and send default to forbidden.
  - No real mailbox credentials are required; demo mode works without any.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

# ── keyword sets ──────────────────────────────────────────────────────────

INTENT_KEYWORDS: dict[str, list[str]] = {
    "inquiry": ["询价", "请问", "咨询", "了解", "价格", "报价", "产品", "功能", "方案",
                "演示", "demo", "试用", "资料", "规格", "参数"],
    "quote": ["报价", "折扣", "优惠", "价格", "询价", "采购", "购买", "签约",
              "订单", "合同金额", "付款方式", "报价单"],
    "followup": ["跟进", "进度", "状态", "什么时候", "预计", "更新", "进展",
                 "回复", "确认", "下一步", "后续", "安排"],
    "complaint": ["投诉", "不满意", "问题", "故障", "错误", "缺陷", "bug",
                  "退款", "差劲", "失望", "投诉建议"],
    "urging": ["催", "尽快", "紧急", "今天内", "何时", "多久", "拖延",
               "还没有", "请尽快", "等不及"],
}

HIGH_RISK_KEYWORDS = [
    "报价", "折扣", "付款", "退款", "合同", "法务", "法律", "诉讼",
    "敏感", "隐私", "密码", "赔偿", "违约", "罚款", "起诉", "投诉",
    "紧急", "立刻", "立即", "尽快", "今天内",
]

MEDIUM_RISK_KEYWORDS = [
    "确认", "协调", "安排", "需要审批", "需要申请", "考虑",
]

# ── helper ────────────────────────────────────────────────────────────────

def classify_intent(subject: str, body: str) -> str:
    combined = f"{subject} {body}"
    scores: dict[str, int] = {}
    for intent, keywords in INTENT_KEYWORDS.items():
        scores[intent] = sum(1 for kw in keywords if kw in combined)
    if not scores or max(scores.values()) == 0:
        return "other"
    return max(scores, key=lambda k: scores[k])  # type: ignore[arg-type]


def classify_risk(subject: str, body: str) -> str:
    combined = f"{subject} {body}"
    if any(kw in combined for kw in HIGH_RISK_KEYWORDS):
        return "high"
    if any(kw in combined for kw in MEDIUM_RISK_KEYWORDS):
        return "medium"
    return "low"


def recommended_action(intent: str, risk: str, subject: str, body: str) -> str:
    if risk == "high":
        return "高风险：仅生成草稿，强制人工确认后再发送"
    if intent == "quote":
        return "要求报价：生成报价草稿，需销售经理审核后发送"
    if intent == "complaint":
        return "客户投诉：生成安抚与跟进草稿，需主管确认后发送"
    if intent == "inquiry":
        return "客户询盘：生成产品介绍与联系方式回复草稿"
    if intent == "followup":
        return "客户跟进：生成进度同步与时间确认草稿"
    if intent == "urging":
        return "客户催办：生成进度解释与预计时间草稿"
    return "生成通用回复草稿，建议人工确认后发送"


def generate_reply(
    from_addr: str, subject: str, intent: str, risk: str, body: str
) -> str:
    """Generate a reply draft based on classified intent and risk."""
    # extract sender name for salutation
    name_match = re.match(r"([\u4e00-\u9fa5]{2,4}|[\w\.]+)", from_addr)
    salutation = name_match.group(1) if name_match else "客户"

    lines: list[str] = []

    if intent == "inquiry":
        lines.append(f"{salutation}，您好！")
        lines.append("")
        lines.append("感谢您的咨询。我们已在处理您的需求，将尽快为您提供详细信息。")
        lines.append("")
        lines.append("如需进一步了解，请随时联系我们：")
        lines.append("- 客服热线：[待补充]")
        lines.append("- 产品手册：[待补充链接]")
        lines.append("")
        lines.append("期待与您的合作。")
    elif intent == "quote":
        lines.append(f"{salutation}，您好！")
        lines.append("")
        lines.append("感谢您的询价。我们已开始为您准备报价，预计 [待补充时间] 内完成。")
        lines.append("")
        lines.append("在正式提供报价前，如能告知以下信息将更有助于我们提供精准方案：")
        lines.append("- 使用人数/规模")
        lines.append("- 期望的功能范围")
        lines.append("- 是否有时间节点要求")
        lines.append("")
        lines.append("如方便，我们也可以安排一次简短的电话沟通。")
    elif intent == "complaint":
        lines.append(f"{salutation}，您好！")
        lines.append("")
        lines.append("非常抱歉给您带来了不好的体验。我们已经收到您的反馈，并高度重视。")
        lines.append("")
        lines.append("团队将在 [待补充时间] 内给您一个明确的处理方案。")
        lines.append("如您需要，可以直接联系我的电话：[待补充]。")
        lines.append("")
        lines.append("感谢您的宝贵反馈，我们会持续改进。")
    elif intent == "urging":
        lines.append(f"{salutation}，您好！")
        lines.append("")
        lines.append("感谢您的耐心等待。关于您催促的事项，当前进展如下：")
        lines.append("- [待补充具体进展]")
        lines.append("")
        lines.append("预计完成时间：[待补充]")
        lines.append("如有变化，我们会第一时间同步。")
        lines.append("")
        lines.append("感谢您的理解。")
    elif intent == "followup":
        lines.append(f"{salutation}，您好！")
        lines.append("")
        lines.append("感谢您的关注。以下是当前进度同步：")
        lines.append("- [待补充具体进度]")
        lines.append("")
        lines.append("如您方便，我们可以安排一个简短沟通以同步细节。")
        lines.append("")
        lines.append("期待您的回复。")
    else:
        lines.append(f"{salutation}，您好！")
        lines.append("")
        lines.append("已收到您的邮件，我们正在处理中。")
        lines.append("")
        lines.append("将在 [待补充时间] 内给您回复。如有紧急需求，请电话联系：[待补充]。")

    # common closing
    lines.append("")
    lines.append("此致")
    lines.append("销售团队")
    lines.append("[待补充发件人签名]")

    return "\n".join(lines)


# ── input parsing ─────────────────────────────────────────────────────────

def parse_email_input(args: argparse.Namespace) -> dict[str, str]:
    """Resolve email fields from CLI args, input file, mock data, or stdin."""
    # priority: explicit CLI args > --input file > --demo-id > stdin
    if args.from_addr and args.subject and args.body:
        return {
            "messageId": args.demo_id or "",
            "from": args.from_addr,
            "subject": args.subject,
            "body": args.body,
        }

    if args.demo_id:
        mock_path = Path(__file__).resolve().parent / "mock-inbox.json"
        if not mock_path.is_file():
            print(f"mock-inbox.json not found at {mock_path}", file=sys.stderr)
            raise SystemExit(1)
        mock_data = json.loads(mock_path.read_text(encoding="utf-8"))
        for msg in mock_data.get("messages", []):
            if msg.get("message_id") == args.demo_id or msg.get("uid") == args.demo_id:
                return {
                    "messageId": msg.get("message_id", args.demo_id),
                    "threadId": msg.get("thread_id", ""),
                    "from": msg.get("from", msg.get("from_address", "")),
                    "subject": msg.get("subject", ""),
                    "body": msg.get("body", ""),
                }
        print(f"No message found in mock-inbox.json with id/uid '{args.demo_id}'", file=sys.stderr)
        raise SystemExit(1)

    # stdin or --input file
    if args.input:
        raw = Path(args.input).read_text(encoding="utf-8")
    else:
        raw = sys.stdin.read()

    try:
        data = json.loads(raw)
        if isinstance(data, list):
            data = data[0]  # take first if array
        return {
            "messageId": data.get("message_id", data.get("messageId", "")),
            "threadId": data.get("thread_id", data.get("threadId", "")),
            "from": data.get("from", data.get("fromAddress", "")),
            "subject": data.get("subject", ""),
            "body": data.get("body", ""),
        }
    except (json.JSONDecodeError, ValueError, KeyError):
        # try to parse as plain email headers
        lines = raw.strip().split("\n")
        result = {"messageId": "", "threadId": "", "from": "", "subject": "", "body": ""}
        current = "headers"
        body_lines: list[str] = []
        for line in lines:
            if current == "headers":
                if line.startswith("From:") or line.startswith("from:"):
                    result["from"] = line.split(":", 1)[1].strip()
                elif line.startswith("Subject:") or line.startswith("subject:"):
                    result["subject"] = line.split(":", 1)[1].strip()
                elif line.startswith("Message-ID:") or line.startswith("message-id:"):
                    result["messageId"] = line.split(":", 1)[1].strip()
                elif line == "" or line.startswith("Body:") or line.startswith("body:"):
                    current = "body"
                else:
                    body_lines.append(line)
            else:
                body_lines.append(line)
        result["body"] = "\n".join(body_lines).strip()
        return result


# ── main ──────────────────────────────────────────────────────────────────

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    # explicit email fields
    parser.add_argument("--from", dest="from_addr", help="Sender email/name")
    parser.add_argument("--subject", help="Email subject")
    parser.add_argument("--body", help="Email body text")
    # input sources
    parser.add_argument("--input", type=Path, help="JSON file containing email fields")
    parser.add_argument("--demo-id", help="Use a message from scripts/mock-inbox.json by uid or message_id")
    # output
    parser.add_argument("--output-dir", type=Path, help="Local output directory; if omitted, JSON is printed to stdout only")
    parser.add_argument("--pretty", action="store_true", default=True, help="Pretty-print JSON (default)")
    args = parser.parse_args()

    email_data = parse_email_input(args)

    from_addr = email_data.get("from", "")
    subject = email_data.get("subject", "")
    body = email_data.get("body", "")
    message_id = email_data.get("messageId", args.demo_id or "")
    thread_id = email_data.get("threadId", "")

    if not subject and not body:
        print("No email content detected. Please provide --from/--subject/--body, --input, or --demo-id.", file=sys.stderr)
        return 1

    intent = classify_intent(subject, body)
    risk = classify_risk(subject, body)
    action = recommended_action(intent, risk, subject, body)
    reply = generate_reply(from_addr, subject, intent, risk, body)

    analysis_output: dict[str, Any] = {
        "sourceType": "email",
        "messageId": message_id or "未提供",
        "threadId": thread_id or None,
        "from": from_addr,
        "subject": subject,
        "intent": intent,
        "riskLevel": risk,
        "recommendedAction": action,
        "draftReply": reply,
        "requiresHumanConfirmation": True,
    }

    indent = 2 if args.pretty else None

    if args.output_dir:
        args.output_dir.mkdir(parents=True, exist_ok=True)
        analysis_path = args.output_dir / "email_analysis.json"
        analysis_path.write_text(json.dumps(analysis_output, ensure_ascii=False, indent=indent), encoding="utf-8")
        reply_path = args.output_dir / "reply_draft.json"
        reply_path.write_text(json.dumps({"reply": reply, "subject": f"Re: {subject}"}, ensure_ascii=False, indent=indent), encoding="utf-8")
        print(f"email_analysis.json → {analysis_path}", file=sys.stderr)
        print(f"reply_draft.json   → {reply_path}", file=sys.stderr)
    else:
        print(json.dumps(analysis_output, ensure_ascii=False, indent=indent))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
