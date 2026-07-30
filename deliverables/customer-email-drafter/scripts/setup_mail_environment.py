#!/usr/bin/env python3
"""Inspect/create an isolated Python environment and generate a safe mail config."""

from __future__ import annotations

import argparse
import json
import os
import sys
import venv
from pathlib import Path


PROVIDERS = {
    "qq": {
        "label": "QQ 邮箱",
        "imap": {"host": "imap.qq.com", "port": 993},
        "smtp": {"host": "smtp.qq.com", "port": 465, "starttls": False},
        "credential_hint": "在 QQ 邮箱设置中开启 IMAP/SMTP 服务后生成授权码。",
    },
    "netease-163": {
        "label": "网易 163 邮箱",
        "imap": {"host": "imap.163.com", "port": 993},
        "smtp": {"host": "smtp.163.com", "port": 465, "starttls": False},
        "credential_hint": "在 163 邮箱设置中开启 IMAP/SMTP 服务后生成客户端授权密码。",
    },
    "netease-126": {
        "label": "网易 126 邮箱",
        "imap": {"host": "imap.126.com", "port": 993},
        "smtp": {"host": "smtp.126.com", "port": 465, "starttls": False},
        "credential_hint": "在 126 邮箱设置中开启 IMAP/SMTP 服务后生成客户端授权密码。",
    },
    "gmail": {
        "label": "Gmail / Google Workspace",
        "imap": {"host": "imap.gmail.com", "port": 993},
        "smtp": {"host": "smtp.gmail.com", "port": 587, "starttls": True},
        "credential_hint": "优先使用 OAuth；使用 SMTP 时在 Google 帐号启用两步验证后创建应用专用密码。",
    },
    "outlook": {
        "label": "Outlook / Microsoft 365",
        "imap": {"host": "outlook.office365.com", "port": 993},
        "smtp": {"host": "smtp.office365.com", "port": 587, "starttls": True},
        "credential_hint": "优先使用 Microsoft OAuth/Graph；若管理员允许 SMTP AUTH，再使用应用密码或管理员提供的凭据。",
    },
}


def python_in(venv_dir: Path) -> Path:
    return venv_dir / ("Scripts/python.exe" if os.name == "nt" else "bin/python")


def default_storage_dir() -> Path:
    configured = os.environ.get("WORKBUDDY_DATA_DIR")
    if configured:
        return Path(configured) / "customer-email-drafter"
    if os.name == "nt":
        return Path(os.environ.get("LOCALAPPDATA", Path.home() / "AppData" / "Local")) / "WorkBuddy" / "customer-email-drafter"
    return Path(os.environ.get("XDG_STATE_HOME", Path.home() / ".local" / "state")) / "workbuddy" / "customer-email-drafter"


def default_config_path(storage_dir: Path) -> Path:
    return storage_dir / "mail-config.json"


def environment_ready(venv_dir: Path) -> bool:
    return python_in(venv_dir).is_file()


def inspect(venv_dir: Path, config_path: Path) -> bool:
    executable = python_in(venv_dir)
    ready = environment_ready(venv_dir)
    print(json.dumps({"environment_ready": ready, "config_ready": config_path.is_file(), "venv": str(venv_dir), "config": str(config_path), "python": str(executable) if ready else None}, ensure_ascii=False))
    return ready


def create_venv(venv_dir: Path) -> Path:
    if environment_ready(venv_dir):
        return python_in(venv_dir)
    venv.EnvBuilder(with_pip=True, clear=False).create(venv_dir)
    executable = python_in(venv_dir)
    if not executable.is_file():
        raise RuntimeError("虚拟环境创建失败，未找到 Python 可执行文件")
    print(json.dumps({"environment_created": True, "venv": str(venv_dir), "python": str(executable)}, ensure_ascii=False))
    return executable


def init_config(args: argparse.Namespace) -> None:
    executable = create_venv(args.venv)
    profile = PROVIDERS[args.provider]
    target = args.config
    if target.exists() and not args.force:
        raise RuntimeError(f"配置已存在：{target}；如需覆盖请传入 --force")
    target.parent.mkdir(parents=True, exist_ok=True)
    config = {
        "provider": args.provider,
        "email": args.email,
        "password": "env:MAIL_APP_PASSWORD",
        "folder": "INBOX",
        "imap": profile["imap"],
        "smtp": profile["smtp"],
        "display_from": args.email,
        "auto_send": False,
        "allowed_recipient_domains": [],
        "audit_log": str(target.with_name("email-audit.jsonl")),
        "state_file": str(target.with_name("email-state.json")),
    }
    target.write_text(json.dumps(config, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "ok": True,
        "provider": profile["label"],
        "config": str(target),
        "python": str(executable),
        "credential_instruction": profile["credential_hint"],
        "next_step": "将官方生成的授权码保存到 WorkBuddy 安全凭据 MAIL_APP_PASSWORD；不要粘贴到聊天或配置文件。",
    }, ensure_ascii=False))


def show_config(config_path: Path) -> None:
    if not config_path.is_file():
        raise RuntimeError(f"未找到持久化邮箱配置：{config_path}")
    try:
        config = json.loads(config_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise RuntimeError(f"无法读取持久化邮箱配置：{error}") from error
    print(json.dumps({"ok": True, "config": str(config_path), "provider": config.get("provider"), "email": config.get("email"), "folder": config.get("folder", "INBOX"), "auto_send": config.get("auto_send", False), "credential": "env:MAIL_APP_PASSWORD"}, ensure_ascii=False))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--storage-dir", type=Path, help="Persistent user-data directory; defaults to the WorkBuddy user-data location")
    parser.add_argument("--venv", type=Path, help="Virtual-environment path; defaults inside persistent storage")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("inspect", help="Check whether the persistent configuration and virtual environment exist")
    sub.add_parser("show", help="Show non-sensitive fields in the persisted configuration")
    choices = ", ".join(f"{key}={value['label']}" for key, value in PROVIDERS.items())
    init = sub.add_parser("init", help=f"Create missing environment and config. Providers: {choices}")
    init.add_argument("--provider", choices=PROVIDERS.keys(), required=True)
    init.add_argument("--email", required=True)
    init.add_argument("--config", type=Path, help="Config path; defaults inside persistent storage")
    init.add_argument("--force", action="store_true")
    args = parser.parse_args()
    storage_dir = args.storage_dir or default_storage_dir()
    args.venv = args.venv or storage_dir / ".customer-email-venv"
    args.config = getattr(args, "config", None) or default_config_path(storage_dir)
    try:
        if args.command == "inspect":
            inspect(args.venv, args.config)
        elif args.command == "show":
            show_config(args.config)
        else:
            init_config(args)
    except RuntimeError as error:
        print(json.dumps({"ok": False, "error": str(error)}, ensure_ascii=False), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
