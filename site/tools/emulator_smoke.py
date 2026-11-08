#!/usr/bin/env python3
"""Smoke-check one verified GitHub APK on a disposable Android emulator.

This is a technical install + first-launch test, NOT a human feature QA pass,
trusted publisher attestation, or release approval. No repository is modified.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import subprocess
import tempfile
import time

from inspect_apk import fetch_exact_asset, read_android_identity
from release_review import prepare_packet
from release_watch import github_json

SITE = Path(__file__).resolve().parents[1]
PNG_MAGIC = b"\x89PNG\r\n\x1a\n"


class EmulatorError(Exception):
    pass


def launched_monkey(output: str) -> bool:
    return bool(re.search(r"(?m)^Events injected:\s*1\s*$", output))


def package_crashed(logs: str, package: str) -> bool:
    return bool(re.search(
        r"FATAL EXCEPTION[\s\S]{0,650}?Process:\s*" + re.escape(package) + r"(?:\s|,)",
        logs
    ))


def shell_adb(args: list[str], runner=subprocess.run, *, timeout: int = 120) -> str:
    try:
        result = runner(["adb", *args], capture_output=True, text=True,
                        encoding="utf-8", errors="replace", timeout=timeout,
                        check=False)
    except (OSError, subprocess.TimeoutExpired) as error:
        raise EmulatorError("Android emulator adb command unavailable or timed out") from error
    if result.returncode:
        raise EmulatorError(f"Android emulator command failed: {args[0]}")
    return (result.stdout or "") + "\n" + (result.stderr or "")


def screen_png(runner=subprocess.run) -> bytes:
    try:
        output = runner(["adb", "exec-out", "screencap", "-p"],
                        capture_output=True, timeout=30, check=False)
    except (OSError, subprocess.TimeoutExpired) as error:
        raise EmulatorError("Emulator screenshot failed") from error
    if output.returncode or not output.stdout.startswith(PNG_MAGIC):
        raise EmulatorError("Emulator screenshot is not a valid PNG")
    if len(output.stdout) > 12 * 1024 * 1024:
        raise EmulatorError("Emulator screenshot exceeds limit")
    return output.stdout


def smoke_one(catalog: dict, project: str, tag: str, apksigner: Path, aapt: Path,
              screenshot: Path, *, asset: str | None = None,
              fetch=github_json, runner=subprocess.run, checked_at=None,
              pause=time.sleep) -> dict:
    packet = prepare_packet(catalog, project, tag, asset, fetch=fetch)
    with tempfile.TemporaryDirectory(prefix="navin-studio-emulator-") as folder:
        apk = Path(folder) / "candidate.apk"
        digest = fetch_exact_asset(packet, apk)
        identity = read_android_identity(apk, apksigner, aapt)
        pkg = identity["package_id"]
        model = shell_adb(["shell", "getprop", "ro.product.model"], runner).strip()
        api_level = shell_adb(["shell", "getprop", "ro.build.version.sdk"], runner).strip()
        installed = shell_adb(["install", "-r", str(apk)], runner, timeout=180)
        if "Success" not in installed:
            raise EmulatorError("APK did not report a successful emulator installation")
        shell_adb(["logcat", "-c"], runner)
        monkey = shell_adb(
            ["shell", "monkey", "-p", pkg, "-c",
             "android.intent.category.LAUNCHER", "1"],
            runner,
        )
        if not launched_monkey(monkey):
            raise EmulatorError("No launcher event was delivered to the APK")
        pause(4)
        pid = shell_adb(["shell", "pidof", pkg], runner).strip()
        if not re.fullmatch(r"\d+(?:\s+\d+)*", pid):
            raise EmulatorError("Application process did not remain running after launch")
        logs = shell_adb(["logcat", "-d", "-t", "1200"], runner)
        if package_crashed(logs, pkg):
            raise EmulatorError("FATAL EXCEPTION detected for application during launch")
        screenshot.parent.mkdir(parents=True, exist_ok=True)
        screenshot.write_bytes(screen_png(runner))
    return {
        "schema_version": 1,
        "kind": "NAVIN_STUDIO_EMULATOR_SMOKE",
        "status": "INSTALL_LAUNCH_SMOKE_PASSED_NOT_QA_APPROVED",
        "checked_at": checked_at or datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "project_id": packet["project_id"],
        "source_commit": packet["source_commit"],
        "release_tag": packet["release_tag"],
        "apk_sha256": digest["sha256"],
        "signer_certificate_sha256": identity["signer_certificate_sha256"],
        "package_id": identity["package_id"],
        "version_name": identity["version_name"],
        "device": {"model": model, "android_api_level": api_level, "kind": "emulator"},
        "checks": {
            "download_integrity": True,
            "signature_integrity": True,
            "apk_install": True,
            "launcher_event": True,
            "process_alive_after_launch": True,
            "launch_fatal_exception_absent_in_sampled_logs": True,
            "screen_capture": True,
            "functional_qa": False,
            "physical_device_test": False,
            "owner_publication_approval": False,
        },
        "limitations": [
            "This smoke check cannot establish all app features work correctly.",
            "An emulator is not a physical Android phone.",
            "Device permissions, network dependencies and app functionality require dedicated QA.",
            "The signature is valid but publisher certificate trust and update lineage need review.",
        ],
    }


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--project", required=True)
    p.add_argument("--tag", required=True)
    p.add_argument("--asset", default=None)
    p.add_argument("--catalog", type=Path, default=SITE / "data/projects.json")
    p.add_argument("--apksigner", type=Path, required=True)
    p.add_argument("--aapt", type=Path, required=True)
    p.add_argument("--out", type=Path, required=True)
    p.add_argument("--screenshot", type=Path, required=True)
    args = p.parse_args()
    args.out.parent.mkdir(parents=True, exist_ok=True)
    try:
        catalog = json.loads(args.catalog.read_text(encoding="utf-8"))
        report = smoke_one(catalog, args.project, args.tag, args.apksigner,
                           args.aapt, args.screenshot, asset=args.asset)
        code = 0
    except (EmulatorError, ValueError, KeyError, TypeError, OSError) as err:
        report = {"schema_version": 1, "kind": "NAVIN_STUDIO_EMULATOR_SMOKE",
                  "status": "BLOCKED_NOT_QA_APPROVED", "project_id": args.project,
                  "release_tag": args.tag, "reason": str(err)[:200],
                  "owner_publication_approval": False}
        code = 1
    args.out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"Emulator smoke: {report['status']} — {args.project}@{args.tag}; "
          "no public APK approval.")
    return code


if __name__ == "__main__":
    raise SystemExit(main())
