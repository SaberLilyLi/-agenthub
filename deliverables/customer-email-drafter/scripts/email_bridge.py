#!/usr/bin/env python3
"""Minimal IMAP/SMTP bridge for the customer-email-drafter skill.

It intentionally uses only the Python standard library.  Keep secrets in environment
variables referenced by the configuration file, never in the file itself.
"""

from __future__ import annotations

import argparse
import email
import imaplib
import json
import os
import smtplib
import ssl
import sys
from datetime import datetime, timezone
from email.header import decode_header, make_header
from email.message import EmailMessage
from email.utils import getaddresses, make_msgid
from html.parser import HTMLParser
from pathlib import Path
from typing import Any


def default_config_path() -> Path:
    configured = os.environ.get("WORKBUDDY_DATA_DIR")
    if configured:
        root = Path(configured) / "customer-email-drafter"
    elif os.name == "nt":
        root = Path(os.environ.get("LOCALAPPDATA", Path.home() / "AppData" / "Local")) / "WorkBuddy" / "customer-email-drafter"
    else:
        root = Path(os.environ.get("XDG_STATE_HOME", Path.home() / ".local" / "state")) / "workbuddy" / "customer-email-drafter"
    return root / "mail-config.json"


def fail(message: str) -> None:
    print(json.dumps({"ok": False, "error": message}, ensure_ascii=False), file=sys.stderr)
    raise SystemExit(1)


def env_value(value: str) -> str:
    if value.startswith("env:"):
        name = value[4:]
        result = os.environ.get(name)
        if not result:
            fail(f"环境变量 {name} 未设置")
        return result
    return value


def read_config(path: str) -> dict[str, Any]:
    try:
        data = json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"无法读取配置: {exc}")
    required = ("email", "imap", "smtp")
    missing = [key for key in required if key not in data]
    if missing:
        fail(f"配置缺少: {', '.join(missing)}")
    return data


def password(config: dict[str, Any]) -> str:
    value = config.get("password")
    if not isinstance(value, str):
        fail("配置缺少 password（请使用 env:变量名 引用授权码）")
    return env_value(value)


def imap_client(config: dict[str, Any]) -> imaplib.IMAP4_SSL:
    settings = config["imap"]
    client = imaplib.IMAP4_SSL(settings["host"], int(settings.get("port", 993)))
    client.login(config["email"], password(config))
    return client


def decode(value: str | None) -> str:
    if not value:
        return ""
    try:
        return str(make_header(decode_header(value)))
    except Exception:
        return value


class HtmlText(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []
        self.skip_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() in {"script", "style"}:
            self.skip_depth += 1

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() in {"script", "style"} and self.skip_depth:
            self.skip_depth -= 1

    def handle_data(self, data: str) -> None:
        if not self.skip_depth:
            self.parts.append(data)

    def text(self) -> str:
        return " ".join(" ".join(self.parts).split())


def decode_part(part: email.message.Message) -> str:
    raw = part.get_payload(decode=True) or b""
    return raw.decode(part.get_content_charset() or "utf-8", errors="replace").strip()


def text_body(message: email.message.Message) -> str:
    parts = message.walk() if message.is_multipart() else [message]
    html_fallback = ""
    for part in parts:
        if part.get_content_disposition() == "attachment":
            continue
        if part.get_content_type() == "text/plain":
            return decode_part(part)
        if part.get_content_type() == "text/html" and not html_fallback:
            parser = HtmlText()
            parser.feed(decode_part(part))
            html_fallback = parser.text()
    return html_fallback


def safe_search_value(value: str, label: str) -> str:
    if any(char in value for char in ('"', "\r", "\n")):
        fail(f"{label} 不能包含引号或换行")
    return value


def parse_search_date(value: str, option: str) -> datetime:
    try:
        return datetime.strptime(value, "%Y-%m-%d")
    except ValueError:
        fail(f"{option} 必须使用 YYYY-MM-DD 格式")
        raise AssertionError("unreachable")


def poll(config: dict[str, Any], limit: int, from_filter: str | None, subject_filter: str | None, search_all: bool, since: str | None, before: str | None) -> None:
    client = imap_client(config)
    folder = config.get("folder", "INBOX")
    try:
        status, _ = client.select(folder, readonly=True)
        if status != "OK":
            fail(f"无法打开文件夹 {folder}")
        criteria = ["ALL" if search_all else "UNSEEN"]
        if from_filter:
            criteria.extend(("FROM", f'"{safe_search_value(from_filter, "发件人筛选")}"'))
        since_date = parse_search_date(since, "--since") if since else None
        before_date = parse_search_date(before, "--before") if before else None
        if since_date and before_date and since_date >= before_date:
            fail("--since 必须早于 --before")
        if since_date:
            criteria.extend(("SINCE", since_date.strftime("%d-%b-%Y")))
        if before_date:
            criteria.extend(("BEFORE", before_date.strftime("%d-%b-%Y")))
        status, rows = client.search(None, *criteria)
        if status != "OK":
            fail("无法按条件检索邮件")
        state_path = Path(config.get("state_file", "email-state.json"))
        try:
            seen = set(json.loads(state_path.read_text(encoding="utf-8")).get("message_ids", []))
        except (OSError, json.JSONDecodeError):
            seen = set()
        messages: list[dict[str, Any]] = []
        for uid in reversed(rows[0].split()):
            status, payload = client.fetch(uid, "(UID BODY.PEEK[])")
            if status != "OK" or not payload or not isinstance(payload[0], tuple):
                continue
            msg = email.message_from_bytes(payload[0][1])
            message_id = msg.get("Message-ID", "") or f"uid:{uid.decode()}"
            if not search_all and message_id in seen:
                continue
            sender = decode(msg.get("From"))
            subject = decode(msg.get("Subject"))
            if subject_filter and subject_filter.lower() not in subject.lower():
                continue
            messages.append({
                "uid": uid.decode(),
                "message_id": message_id,
                "from": sender,
                "to": decode(msg.get("To")),
                "subject": subject,
                "date": msg.get("Date", ""),
                "body": text_body(msg),
                "has_attachments": any(p.get_content_disposition() == "attachment" for p in msg.walk()),
            })
            if len(messages) >= limit:
                break
        if not search_all:
            state_path.parent.mkdir(parents=True, exist_ok=True)
            state_path.write_text(json.dumps({"message_ids": list((seen | {m["message_id"] for m in messages}))[-1000:]}, ensure_ascii=False), encoding="utf-8")
        print(json.dumps({"ok": True, "folder": folder, "search": {"all": search_all, "from": from_filter, "subject": subject_filter, "since": since, "before": before}, "messages": messages}, ensure_ascii=False))
    finally:
        try:
            client.logout()
        except Exception:
            pass


def approved_recipients(config: dict[str, Any], recipients: list[str]) -> bool:
    allowed = config.get("allowed_recipient_domains", [])
    if not allowed:
        return False
    domains = {item.rsplit("@", 1)[-1].lower() for _, item in getaddresses([r for r in recipients if r]) if "@" in item}
    return bool(domains) and domains.issubset({item.lower() for item in allowed})


def send(config: dict[str, Any], message_path: str, acknowledge: bool) -> None:
    if not config.get("auto_send", False):
        fail("auto_send 未启用；请先在配置中显式设置为 true")
    if not acknowledge:
        fail("请传入 --confirm-auto-send 以执行外发")
    try:
        draft = json.loads(Path(message_path).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"无法读取待发邮件: {exc}")
    required = ("to", "subject", "body")
    if any(not draft.get(key) for key in required):
        fail("待发邮件必须包含 to、subject、body")
    recipient_fields = [draft["to"], draft.get("cc", ""), draft.get("bcc", "")]
    if not approved_recipients(config, recipient_fields):
        fail("收件人域名不在 allowed_recipient_domains 白名单中")

    msg = EmailMessage()
    msg["From"] = config.get("display_from", config["email"])
    msg["To"] = draft["to"]
    msg["Subject"] = draft["subject"]
    msg["Message-ID"] = make_msgid()
    if draft.get("cc"):
        msg["Cc"] = draft["cc"]
    if draft.get("in_reply_to"):
        msg["In-Reply-To"] = draft["in_reply_to"]
        msg["References"] = draft.get("references", draft["in_reply_to"])
    msg.set_content(draft["body"])
    recipients = [item for _, item in getaddresses([r for r in recipient_fields if r]) if item]

    settings = config["smtp"]
    context = ssl.create_default_context()
    if settings.get("starttls", True):
        server = smtplib.SMTP(settings["host"], int(settings.get("port", 587)), timeout=30)
        server.ehlo()
        server.starttls(context=context)
    else:
        server = smtplib.SMTP_SSL(settings["host"], int(settings.get("port", 465)), context=context, timeout=30)
    try:
        server.login(config["email"], password(config))
        server.send_message(msg, to_addrs=recipients)
    finally:
        server.quit()
    audit = {"at": datetime.now(timezone.utc).isoformat(), "to": recipients, "subject": draft["subject"], "message_id": msg["Message-ID"]}
    audit_path = Path(config.get("audit_log", "email-audit.jsonl"))
    audit_path.parent.mkdir(parents=True, exist_ok=True)
    with audit_path.open("a", encoding="utf-8") as file:
        file.write(json.dumps(audit, ensure_ascii=False) + "\n")
    print(json.dumps({"ok": True, "sent": audit}, ensure_ascii=False))


def test(config: dict[str, Any]) -> None:
    client = imap_client(config)
    client.logout()
    print(json.dumps({"ok": True, "email": config["email"], "message": "IMAP 登录成功"}, ensure_ascii=False))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default=str(default_config_path()), help="Persistent mail config path")
    sub = parser.add_subparsers(dest="command", required=True)
    test_parser = sub.add_parser("test")
    poll_parser = sub.add_parser("poll")
    poll_parser.add_argument("--limit", type=int, default=10)
    poll_parser.add_argument("--from", dest="from_filter", help="按发件人邮箱或名称筛选")
    poll_parser.add_argument("--subject", dest="subject_filter", help="按主题关键字筛选")
    poll_parser.add_argument("--since", help="只搜索此日期（YYYY-MM-DD）及之后的邮件")
    poll_parser.add_argument("--before", help="只搜索此日期（YYYY-MM-DD）之前的邮件")
    poll_parser.add_argument("--all", dest="search_all", action="store_true", help="搜索已读和未读邮件，且不使用历史去重")
    send_parser = sub.add_parser("send")
    send_parser.add_argument("--message", required=True)
    send_parser.add_argument("--confirm-auto-send", action="store_true")
    args = parser.parse_args()
    config = read_config(args.config)
    if args.command == "test":
        test(config)
    elif args.command == "poll":
        poll(config, args.limit, args.from_filter, args.subject_filter, args.search_all, args.since, args.before)
    else:
        send(config, args.message, args.confirm_auto_send)


if __name__ == "__main__":
    main()
