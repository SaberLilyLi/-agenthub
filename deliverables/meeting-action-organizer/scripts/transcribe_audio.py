#!/usr/bin/env python3
"""Transcribe one local audio file with Tencent Cloud Flash ASR."""

from __future__ import annotations

import argparse
import base64
import hashlib
import hmac
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


HOST = "asr.cloud.tencent.com"
SUPPORTED_FORMATS = {"wav", "pcm", "ogg-opus", "speex", "silk", "mp3", "m4a", "aac", "amr"}


def tc3_key(secret_key: str, date: str, service: str) -> bytes:
    date_key = hmac.new(("TC3" + secret_key).encode("utf-8"), date.encode("utf-8"), hashlib.sha256).digest()
    service_key = hmac.new(date_key, service.encode("utf-8"), hashlib.sha256).digest()
    return hmac.new(service_key, b"tc3_request", hashlib.sha256).digest()


def fetch_app_id(secret_id: str, secret_key: str) -> str:
    """Verify Tencent credentials and return the owning account AppId."""
    host, service, action, version = "cam.tencentcloudapi.com", "cam", "GetUserAppId", "2019-01-16"
    payload = b"{}"
    timestamp = int(time.time())
    date = time.strftime("%Y-%m-%d", time.gmtime(timestamp))
    canonical_headers = f"content-type:application/json; charset=utf-8\nhost:{host}\nx-tc-action:{action.lower()}\n"
    signed_headers = "content-type;host;x-tc-action"
    canonical_request = "\n".join(("POST", "/", "", canonical_headers, signed_headers, hashlib.sha256(payload).hexdigest()))
    scope = f"{date}/{service}/tc3_request"
    string_to_sign = "\n".join(("TC3-HMAC-SHA256", str(timestamp), scope, hashlib.sha256(canonical_request.encode("utf-8")).hexdigest()))
    signature = hmac.new(tc3_key(secret_key, date, service), string_to_sign.encode("utf-8"), hashlib.sha256).hexdigest()
    authorization = f"TC3-HMAC-SHA256 Credential={secret_id}/{scope}, SignedHeaders={signed_headers}, Signature={signature}"
    request = urllib.request.Request(
        f"https://{host}", data=payload, method="POST",
        headers={"Authorization": authorization, "Content-Type": "application/json; charset=utf-8", "Host": host, "X-TC-Action": action, "X-TC-Timestamp": str(timestamp), "X-TC-Version": version},
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            body = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Credential verification failed ({error.code}): {detail}") from error
    except urllib.error.URLError as error:
        raise RuntimeError(f"Credential verification could not be completed: {error.reason}") from error
    response = body.get("Response", {})
    if "Error" in response or not response.get("AppId"):
        error = response.get("Error", {})
        raise RuntimeError(f"Credential verification failed: {error.get('Code', 'UnknownError')} — {error.get('Message', 'AppId was not returned')}")
    return str(response["AppId"])


def voice_format(path: Path) -> str:
    suffix = path.suffix.lower().lstrip(".")
    if suffix not in SUPPORTED_FORMATS:
        raise ValueError(f"Unsupported audio format: .{suffix or '[none]'}. Supported: {', '.join(sorted(SUPPORTED_FORMATS))}")
    return suffix


def signed_url(app_id: str, secret_id: str, secret_key: str, audio_format: str, engine: str, diarize: bool, word_info: bool, hotwords: str) -> str:
    params = {
        "convert_num_mode": "1",
        "engine_type": engine,
        "filter_dirty": "0",
        "filter_modal": "0",
        "filter_punc": "0",
        "first_channel_only": "1",
        "secretid": secret_id,
        "speaker_diarization": "1" if diarize else "0",
        "timestamp": str(int(time.time())),
        "voice_format": audio_format,
        "word_info": "3" if word_info else "0",
    }
    if hotwords:
        params["hotword_list"] = hotwords
    query = urllib.parse.urlencode(sorted(params.items()), quote_via=urllib.parse.quote)
    path = f"/asr/flash/v1/{app_id}"
    source = f"POST{HOST}{path}?{query}".encode("utf-8")
    signature = base64.b64encode(hmac.new(secret_key.encode("utf-8"), source, hashlib.sha1).digest()).decode("ascii")
    return f"https://{HOST}{path}?{query}", signature


def milliseconds(value: int | float) -> str:
    return f"{float(value) / 1000:.1f}"


def render(payload: dict, timestamps: bool, diarize: bool) -> str:
    channels = payload.get("flash_result") or []
    if not timestamps and not diarize:
        return "\n".join(channel.get("text", "").strip() for channel in channels if channel.get("text")) + "\n"
    lines = []
    for channel in channels:
        for sentence in channel.get("sentence_list") or []:
            prefix = f"[{milliseconds(sentence.get('start_time', 0))}-{milliseconds(sentence.get('end_time', 0))}]" if timestamps else ""
            speaker_id = sentence.get("speaker_id") if diarize else None
            speaker = f"【发言人 {speaker_id}｜身份待确认】" if speaker_id is not None else "【发言人待确认】"
            lines.append(f"{prefix}{speaker} {sentence.get('text', '').strip()}")
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("audio", type=Path, nargs="?", help="Local wav/pcm/ogg-opus/speex/silk/mp3/m4a/aac/amr audio file")
    parser.add_argument("--output", type=Path, help="Output text path (default: <audio>.transcript.txt)")
    parser.add_argument("--engine", default="16k_zh_en", help="Tencent ASR engine type")
    parser.add_argument("--timestamps", action="store_true", default=True, help="Include sentence timestamps (default: enabled)")
    parser.add_argument("--diarize", action="store_true", default=True, help="Enable speaker diarization and speaker labels (default: enabled)")
    parser.add_argument("--hotwords", default="", help="Temporary hotwords, e.g. '鲸创|10,WorkBuddy|10'")
    parser.add_argument("--verify", action="store_true", help="Verify credentials and print the detected AppId; do not transcribe")
    args = parser.parse_args()

    if args.verify and args.audio:
        parser.error("--verify does not accept an audio file.")
    if not args.verify and not args.audio:
        parser.error("An audio file is required unless --verify is used.")
    if args.audio and not args.audio.is_file():
        parser.error(f"Audio file not found: {args.audio}")
    try:
        audio_format = voice_format(args.audio) if args.audio else ""
    except ValueError as error:
        parser.error(str(error))
    secret_id = os.environ.get("TENCENT_SECRET_ID")
    secret_key = os.environ.get("TENCENT_SECRET_KEY")
    if not all((secret_id, secret_key)):
        parser.error("TENCENT_SECRET_ID and TENCENT_SECRET_KEY are required; configure them in WorkBuddy's secure credentials, not in chat or files.")
    try:
        app_id = fetch_app_id(secret_id, secret_key)
    except RuntimeError as error:
        print(str(error), file=sys.stderr)
        return 1
    if args.verify:
        print(f"Credentials verified. Detected AppId: {app_id}")
        return 0

    url, signature = signed_url(app_id, secret_id, secret_key, audio_format, args.engine, args.diarize, args.timestamps or args.diarize, args.hotwords)
    request = urllib.request.Request(
        url,
        data=args.audio.read_bytes(),
        method="POST",
        headers={"Authorization": signature, "Content-Type": "application/octet-stream"},
    )
    try:
        with urllib.request.urlopen(request, timeout=300) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        print(f"Tencent ASR request failed ({error.code}): {error.read().decode('utf-8', errors='replace')}", file=sys.stderr)
        return 1
    except urllib.error.URLError as error:
        print(f"Tencent ASR request could not be completed: {error.reason}", file=sys.stderr)
        return 1
    if payload.get("code") != 0:
        print(f"Tencent ASR failed ({payload.get('code')}): {payload.get('message', 'Unknown error')}. Request ID: {payload.get('request_id', 'unknown')}", file=sys.stderr)
        return 1

    output = args.output or args.audio.with_suffix(".transcript.txt")
    output.write_text(render(payload, args.timestamps, args.diarize), encoding="utf-8")
    print(f"Transcript written to: {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
