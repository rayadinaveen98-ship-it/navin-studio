#!/usr/bin/env python3
"""CineRelay unauthenticated onboarding/navigation smoke on a clean Android emulator.

ONLY explore the welcome, Sign in form, Back, and Create account form. This
tool NEVER types passwords, submits account forms, creates users or calls APIs.
Uploaded evidence contains a small allowlisted JSON report and screenshots
of *blank* forms; it does not contain raw accessibility trees or credentials.
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
from xml.etree import ElementTree as ET

from emulator_smoke import EmulatorError, launched_monkey, package_crashed, screen_png, shell_adb
from inspect_apk import InspectionError, fetch_exact_asset, read_android_identity
from release_review import prepare_packet
from release_watch import github_json
from upgrade_smoke import check_visible_app_hierarchy

SITE = Path(__file__).resolve().parents[1]
PACKAGE_ID = "com.cinerelay.app"
EXPECTED_VERSION = "0.2.9"
MAX_XML_CHARS = 2_000_000
BOUNDS_RE = re.compile(r"^\[(\d+),(\d+)\]\[(\d+),(\d+)\]$")


def parse_hierarchy(xml: str, expected_package: str = PACKAGE_ID) -> ET.Element:
    """Fail on ANR/other-app windows, malformed trees, or oversized dumps."""
    if not isinstance(xml, str) or len(xml) > MAX_XML_CHARS:
        raise EmulatorError("Invalid or oversized UI dump")
    start = xml.find("<?xml")
    if start >= 0:
        xml = xml[start:]
    check_visible_app_hierarchy(xml, expected_package)
    try:
        root = ET.fromstring(xml)
    except ET.ParseError as error:
        raise EmulatorError("Android accessibility tree was not valid XML") from error
    if root.tag != "hierarchy":
        raise EmulatorError("Unexpected Android UI hierarchy root")
    return root


def find_label(root: ET.Element, text: str, package: str = PACKAGE_ID) -> ET.Element | None:
    """Only allow taps on named nodes in the actual CineRelay app package."""
    for node in root.iter("node"):
        if node.attrib.get("package") != package:
            continue
        labels = (node.attrib.get("text", ""), node.attrib.get("content-desc", ""))
        if text in labels:
            return node
    return None


def tap_center(node: ET.Element, *, run=subprocess.run) -> tuple[int, int]:
    found = BOUNDS_RE.fullmatch(node.attrib.get("bounds", ""))
    if not found:
        raise EmulatorError("Target UI control has invalid screen bounds")
    x1, y1, x2, y2 = (int(v) for v in found.groups())
    if not 0 <= x1 < x2 <= 2000 or not 0 <= y1 < y2 <= 3000:
        raise EmulatorError("Target UI control bounds are outside reasonable emulator screen")
    x, y = ((x1 + x2) // 2, (y1 + y2) // 2)
    shell_adb(["shell", "input", "tap", str(x), str(y)], run, timeout=25)
    return x, y


def read_tree(*, run=subprocess.run) -> ET.Element:
    result = shell_adb(["shell", "uiautomator", "dump", "/sdcard/studio-qa-tree.xml"],
                       run, timeout=45)
    if "ERROR" in result.upper() or "EXCEPTION" in result.upper():
        raise EmulatorError("Android UI hierarchy dump failed")
    xml = shell_adb(["shell", "cat", "/sdcard/studio-qa-tree.xml"], run, timeout=30)
    return parse_hierarchy(xml)


def wait_for_labels(labels: tuple[str, ...], *, run=subprocess.run,
                    attempts: int = 10, pause=time.sleep) -> ET.Element:
    if not labels:
        raise ValueError("No UI labels requested")
    for i in range(attempts):
        try:
            root = read_tree(run=run)
            if all(find_label(root, label) is not None for label in labels):
                return root
        except EmulatorError:
            if i == attempts - 1:
                raise
        if i < attempts - 1:
            pause(2)
    raise EmulatorError("Expected CineRelay screen controls not visible: " + ", ".join(labels))


def inspect_auth_entry(catalog: dict, project: str, tag: str, apksigner: Path,
                       aapt: Path, evidence_dir: Path, *, fetch=github_json,
                       run=subprocess.run, pause=time.sleep,
                       checked_at: str | None = None) -> dict:
    """Verify unauthenticated navigation without submitting forms or test data."""
    packet = prepare_packet(catalog, project, tag, fetch=fetch)
    if project != "cinerelay":
        raise EmulatorError("This UI smoke is limited to the reviewed CineRelay app")
    with tempfile.TemporaryDirectory(prefix="studio-cinerelay-auth-ui-") as folder:
        apk = Path(folder) / "downloaded.apk"
        digest = fetch_exact_asset(packet, apk)
        identity = read_android_identity(apk, apksigner, aapt)
        if identity.get("package_id") != PACKAGE_ID or identity.get("version_name") != EXPECTED_VERSION:
            raise EmulatorError("Downloaded binary is not the expected CineRelay version")
        shell_adb(["wait-for-device"], run)
        installed = shell_adb(["install", "-r", str(apk)], run, timeout=180)
        if "Success" not in installed:
            raise EmulatorError("APK did not install")
        shell_adb(["logcat", "-c"], run)
        launched = shell_adb(
            ["shell", "monkey", "-p", PACKAGE_ID, "-c",
             "android.intent.category.LAUNCHER", "1"], run)
        if not launched_monkey(launched):
            raise EmulatorError("CineRelay launcher event failed")
        pause(4)
        gate = wait_for_labels(("Sign in", "Create account"), run=run, pause=pause)
        evidence_dir.mkdir(parents=True, exist_ok=True)
        (evidence_dir / "01-welcome.png").write_bytes(screen_png(run))

        sign_in = find_label(gate, "Sign in")
        assert sign_in is not None
        tap_center(sign_in, run=run)
        signin_form = wait_for_labels(
            ("Welcome back", "Email", "Password"), run=run, pause=pause)
        (evidence_dir / "02-sign-in-empty.png").write_bytes(screen_png(run))
        back = find_label(signin_form, "Back")
        if back is None:
            raise EmulatorError("Sign in form has no accessible Back control")
        tap_center(back, run=run)
        gate = wait_for_labels(("Sign in", "Create account"), run=run, pause=pause)

        create = find_label(gate, "Create account")
        assert create is not None
        tap_center(create, run=run)
        signup_form = wait_for_labels(
            ("Choose your sources after signing up.", "Email", "Password"),
            run=run, pause=pause)
        (evidence_dir / "03-create-account-empty.png").write_bytes(screen_png(run))
        back = find_label(signup_form, "Back")
        if back is None:
            raise EmulatorError("Create account form has no accessible Back control")
        tap_center(back, run=run)
        wait_for_labels(("Sign in", "Create account"), run=run, pause=pause)
        (evidence_dir / "04-returned-welcome.png").write_bytes(screen_png(run))

        pid = shell_adb(["shell", "pidof", PACKAGE_ID], run).strip()
        if not re.fullmatch(r"\d+(?:\s+\d+)*", pid):
            raise EmulatorError("CineRelay app process did not survive navigation")
        logs = shell_adb(["logcat", "-d", "-t", "1200"], run)
        if package_crashed(logs, PACKAGE_ID):
            raise EmulatorError("CineRelay app-specific FATAL EXCEPTION detected")
        model = shell_adb(["shell", "getprop", "ro.product.model"], run).strip()
        api = shell_adb(["shell", "getprop", "ro.build.version.sdk"], run).strip()

    return {
        "schema_version": 1,
        "kind": "NAVIN_STUDIO_CINERELAY_AUTH_ENTRY_SMOKE",
        "state": "UNAUTHENTICATED_ENTRY_UI_PASSED_NOT_RELEASE_APPROVED",
        "project_id": project,
        "tag": tag,
        "checked_at": checked_at or datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "asset_sha256_verified": digest["sha256"],
        "source_commit": packet["source_commit"],
        "package_id": PACKAGE_ID,
        "version_name": EXPECTED_VERSION,
        "emulator": {"model": model, "android_api": api},
        "checks": {
            "fresh_install": True,
            "welcome_sign_in_visible": True,
            "welcome_create_account_visible": True,
            "sign_in_form_email_password_visible": True,
            "sign_in_back_navigation": True,
            "create_account_form_email_password_visible": True,
            "create_account_back_navigation": True,
            "visible_app_after_return": True,
            "process_alive": True,
            "app_fatal_exception_absent_in_sampled_logs": True,
            "credential_entry": False,
            "credential_submission": False,
            "account_created": False,
            "authenticated_features_tested": False,
            "persisted_user_data_migration_verified": False,
            "physical_device_tested": False,
            "owner_release_approval": False
        },
        "privacy": "No passwords, email addresses, API tokens, or personal sessions entered; raw accessibility tree is not uploaded.",
        "screenshots": ["01-welcome.png", "02-sign-in-empty.png",
                        "03-create-account-empty.png", "04-returned-welcome.png"]
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", default="cinerelay")
    parser.add_argument("--tag", default="v0.2.9")
    parser.add_argument("--catalog", type=Path, default=SITE / "data/projects.json")
    parser.add_argument("--apksigner", required=True, type=Path)
    parser.add_argument("--aapt", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    try:
        catalog = json.loads(args.catalog.read_text(encoding="utf-8"))
        report = inspect_auth_entry(catalog, args.project, args.tag, args.apksigner,
                                    args.aapt, args.output.parent)
        code = 0
    except (InspectionError, EmulatorError, OSError, ValueError, KeyError, TypeError) as error:
        report = {
            "schema_version": 1, "kind": "NAVIN_STUDIO_CINERELAY_AUTH_ENTRY_SMOKE",
            "state": "BLOCKED_NOT_RELEASE_APPROVED", "project_id": args.project,
            "tag": args.tag, "reason": str(error)[:200],
            "owner_release_approval": False
        }
        code = 1
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("CineRelay login-entry test: " + report["state"] + ". No credentials or releases published.")
    return code


if __name__ == "__main__":
    raise SystemExit(main())
