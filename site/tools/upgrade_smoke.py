#!/usr/bin/env python3
"""Verify an in-place Android APK upgrade on a disposable emulator.

Independent public GitHub releases, byte hashes and Android signing identities
are compared before installation. This does NOT prove application-data integrity,
full functional QA, a trusted publisher, or permission for a public release.
"""
from __future__ import annotations

import argparse
from html import unescape
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import subprocess
import tempfile
import time

from release_review import prepare_packet
from release_watch import github_json
from inspect_apk import InspectionError, fetch_exact_asset, read_android_identity
from emulator_smoke import EmulatorError, launched_monkey, package_crashed, screen_png, shell_adb

SITE = Path(__file__).resolve().parents[1]
VERSION_RE = re.compile(r"\bversionCode=(\d+)\b")
HEX_SHA256 = re.compile(r"^[0-9a-f]{64}$")


def validate_upgrade_pair(previous: dict, current: dict, expected_cert: str | None = None) -> dict:
    """Fail closed unless the app IDs, certs and version order are compatible."""
    prev_package = previous.get("package_id")
    next_package = current.get("package_id")
    if (not isinstance(prev_package, str) or not prev_package
        or prev_package != next_package):
        raise EmulatorError("APK package identifiers differ")
    try:
        old_version, new_version = int(previous["version_code"]), int(current["version_code"])
    except (KeyError, TypeError, ValueError) as exc:
        raise EmulatorError("Android APK version codes are not valid") from exc
    if not 0 < old_version < new_version:
        raise EmulatorError("New APK version code must strictly exceed old version code")
    old_signers = set(previous.get("signer_certificate_sha256") or [])
    new_signers = set(current.get("signer_certificate_sha256") or [])
    if (not old_signers or old_signers != new_signers
        or not all(isinstance(c, str) and HEX_SHA256.fullmatch(c) for c in old_signers)):
        raise EmulatorError("Signing certificates differ between the two APKs")
    if current.get("debug_certificate_subject_detected"):
        raise EmulatorError("Target APK has a debug signing certificate subject")
    expected_match = None
    if expected_cert is not None:
        normalized = expected_cert.replace(":", "").lower()
        if not HEX_SHA256.fullmatch(normalized):
            raise EmulatorError("Invalid source-declared expected certificate")
        if normalized not in new_signers:
            raise EmulatorError("Both APKs differ from source-declared signing certificate")
        expected_match = True
    return {
        "package_id": next_package,
        "previous_version_code": old_version,
        "target_version_code": new_version,
        "signing_certificates_match_between_apks": True,
        "source_declared_certificate_match": expected_match,
        "target_debug_certificate_subject_detected": False
    }


def installed_version_from_dumpsys(output: str) -> int:
    match = VERSION_RE.search(output)
    if not match:
        raise EmulatorError("Installed Android package versionCode not found")
    return int(match.group(1))


SYSTEM_ANR_RE = re.compile(
    r"(?:isn['’]t|is\\s+not)\\s+responding|(?:app|application)\\s+not\\s+responding",
    re.I,
)


def check_visible_app_hierarchy(xml: str, package_id: str) -> None:
    """Fail closed on a system ANR dialog, inaccessible tree or non-app screen.

    This screens for obvious Android system overlays; it does not replace
    screenshot review, accessibility testing, or real feature QA.
    """
    rendered = unescape(xml)
    if "<hierarchy" not in rendered or "<node" not in rendered:
        raise EmulatorError("Android visible UI hierarchy unavailable")
    if SYSTEM_ANR_RE.search(rendered):
        raise EmulatorError("System 'not responding' dialog obscures app")
    if f'package="{package_id}"' not in rendered:
        raise EmulatorError("Visible UI hierarchy does not contain target app")


def upgrade_smoke(catalog: dict, project_id: str, previous_tag: str,
                  target_tag: str, apksigner: Path, aapt: Path, screenshot: Path,
                  *, expected_cert: str | None = None, fetch=github_json,
                  opener=None, sdk_run=subprocess.run, adb_run=subprocess.run,
                  pause=time.sleep, checked_at: str | None = None) -> dict:
    """No server writes or publishing. Stop before install if signer check fails."""
    if previous_tag == target_tag:
        raise EmulatorError("Previous and target release tags must differ")
    previous_packet = prepare_packet(catalog, project_id, previous_tag, fetch=fetch)
    target_packet = prepare_packet(catalog, project_id, target_tag, fetch=fetch)
    if previous_packet["repository"] != target_packet["repository"]:
        raise EmulatorError("GitHub releases originate from different repositories")
    with tempfile.TemporaryDirectory(prefix="studio-apk-upgrade-") as directory:
        previous_path = Path(directory) / "previous.apk"
        target_path = Path(directory) / "target.apk"
        previous_digest = fetch_exact_asset(previous_packet, previous_path, opener=opener)
        target_digest = fetch_exact_asset(target_packet, target_path, opener=opener)
        previous_identity = read_android_identity(previous_path, apksigner, aapt, run=sdk_run)
        target_identity = read_android_identity(target_path, apksigner, aapt, run=sdk_run)
        contract = validate_upgrade_pair(previous_identity, target_identity, expected_cert)
        pkg = contract["package_id"]

        shell_adb(["wait-for-device"], adb_run)
        device_model = shell_adb(["shell", "getprop", "ro.product.model"], adb_run).strip()
        android_api = shell_adb(["shell", "getprop", "ro.build.version.sdk"], adb_run).strip()
        install_previous = shell_adb(["install", "-r", str(previous_path)], adb_run, timeout=180)
        if "Success" not in install_previous:
            raise EmulatorError("Previous APK installation did not succeed")
        old_installed = installed_version_from_dumpsys(
            shell_adb(["shell", "dumpsys", "package", pkg], adb_run))
        if old_installed != contract["previous_version_code"]:
            raise EmulatorError("Installed previous package version does not match APK metadata")

        # No uninstall or pm clear is performed between old and new versions.
        install_target = shell_adb(["install", "-r", str(target_path)], adb_run, timeout=180)
        if "Success" not in install_target:
            raise EmulatorError("In-place APK upgrade did not succeed")
        upgraded = installed_version_from_dumpsys(
            shell_adb(["shell", "dumpsys", "package", pkg], adb_run))
        if upgraded != contract["target_version_code"]:
            raise EmulatorError("Installed target package version does not match APK metadata")
        shell_adb(["logcat", "-c"], adb_run)
        monkey = shell_adb(
            ["shell", "monkey", "-p", pkg, "-c",
             "android.intent.category.LAUNCHER", "1"], adb_run)
        if not launched_monkey(monkey):
            raise EmulatorError("Target app launcher event failed after upgrade")
        pause(5)
        pid = shell_adb(["shell", "pidof", pkg], adb_run).strip()
        if not re.fullmatch(r"\d+(?:\s+\d+)*", pid):
            raise EmulatorError("Target app process stopped after upgrade")
        logs = shell_adb(["logcat", "-d", "-t", "1200"], adb_run)
        if package_crashed(logs, pkg):
            raise EmulatorError("Target app has a launch fatal exception")
        shell_adb(["shell", "uiautomator", "dump", "/sdcard/studio-visible-ui.xml"],
                  adb_run, timeout=75)
        hierarchy = shell_adb(["shell", "cat", "/sdcard/studio-visible-ui.xml"],
                              adb_run, timeout=30)
        check_visible_app_hierarchy(hierarchy, pkg)
        screenshot.parent.mkdir(parents=True, exist_ok=True)
        screenshot.write_bytes(screen_png(adb_run))

    return {
        "schema_version": 1,
        "kind": "NAVIN_STUDIO_IN_PLACE_APK_UPGRADE_SMOKE",
        "state": "APK_UPGRADE_SMOKE_PASSED_NOT_RELEASE_APPROVED",
        "checked_at": checked_at or datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "project_id": project_id,
        "repository": previous_packet["repository"],
        "previous": {
            "release_tag": previous_tag,
            "source_commit": previous_packet["source_commit"],
            "download_sha256_verified": previous_digest["sha256"],
            "package_version": previous_identity["version_name"],
            "version_code": previous_identity["version_code"],
        },
        "target": {
            "release_tag": target_tag,
            "source_commit": target_packet["source_commit"],
            "download_sha256_verified": target_digest["sha256"],
            "package_version": target_identity["version_name"],
            "version_code": target_identity["version_code"],
        },
        "upgrade_contract": contract,
        "emulator": {"model": device_model, "android_api_level": android_api},
        "checks": {
            "previous_install_succeeded": True,
            "target_installed_with_adb_install_r_without_uninstall": True,
            "on_device_version_upgraded": True,
            "target_app_launched": True,
            "target_process_survived_startup": True,
            "target_app_fatal_exception_absent_in_sampled_logs": True,
            "visible_app_accessibility_tree_checked": True,
            "system_not_responding_dialog_absent_during_check": True,
            "screenshot_captured": True,
            "application_user_data_contents_verified": False,
            "authenticated_user_journeys_verified": False,
            "physical_device_tested": False,
            "owner_approved_for_publication": False,
        },
        "limitations": [
            "Install -r without uninstall tests Android install continuity, not the contents of app user data.",
            "Release signer was compared to prior APK and optionally a source-declared fingerprint; independent owner trust must still be established.",
            "No account authentication, network feature checks, or complete device QA were performed.",
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", required=True)
    parser.add_argument("--previous-tag", required=True)
    parser.add_argument("--target-tag", required=True)
    parser.add_argument("--catalog", type=Path, default=SITE / "data/projects.json")
    parser.add_argument("--expected-cert", default=None)
    parser.add_argument("--apksigner", type=Path, required=True)
    parser.add_argument("--aapt", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--screenshot", type=Path, required=True)
    args = parser.parse_args()
    args.report.parent.mkdir(parents=True, exist_ok=True)
    try:
        catalog = json.loads(args.catalog.read_text(encoding="utf-8"))
        report = upgrade_smoke(
            catalog, args.project, args.previous_tag, args.target_tag,
            args.apksigner, args.aapt, args.screenshot, expected_cert=args.expected_cert)
        code = 0
    except (EmulatorError, InspectionError, OSError, ValueError, KeyError, TypeError) as exc:
        report = {"schema_version": 1, "kind": "NAVIN_STUDIO_IN_PLACE_APK_UPGRADE_SMOKE",
                  "state": "UPGRADE_BLOCKED_NOT_RELEASE_APPROVED",
                  "project_id": args.project, "previous_tag": args.previous_tag,
                  "target_tag": args.target_tag, "reason": str(exc)[:200],
                  "owner_approved_for_publication": False}
        code = 1
    args.report.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"APK upgrade check: {report['state']} - no website publication")
    return code


if __name__ == "__main__":
    raise SystemExit(main())
