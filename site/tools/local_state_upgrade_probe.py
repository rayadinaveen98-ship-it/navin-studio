#!/usr/bin/env python3
"""Probe non-sensitive CineRelay local preference continuity during APK upgrade.

CineRelay v0.2.7 -> v0.2.9 on a disposable, ROOTED Android emulator only.
Never read session/token/account/cache files. Never create/login to accounts.
Never claim that authenticated user-data migration or feature QA was tested.

What this really tests:
  - CineRelay's *own* welcome preference says old/new app version as expected.
  - A synthetic marker written to the same private app sandbox persists during
    adb install -r without uninstalling the package.
  - App can launch, show the logged-out welcome controls, and avoid system ANRs.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import secrets
import subprocess
import tempfile
import time
from xml.etree import ElementTree as ET

from auth_entry_smoke import wait_for_labels
from emulator_smoke import EmulatorError, launched_monkey, package_crashed, screen_png, shell_adb
from inspect_apk import InspectionError, fetch_exact_asset, read_android_identity
from release_review import prepare_packet
from release_watch import github_json
from upgrade_smoke import installed_version_from_dumpsys, validate_upgrade_pair

SITE = Path(__file__).resolve().parents[1]
APP_PACKAGE = "com.cinerelay.app"
WELCOME_PREF = f"/data/user/0/{APP_PACKAGE}/shared_prefs/cinerelay_welcome.xml"
PROBE_FILE = f"/data/user/0/{APP_PACKAGE}/files/navin_studio_synthetic_probe.txt"
EXPECTED_OLD = "v0.2.7"
EXPECTED_NEW = "v0.2.9"
TRUSTED_SOURCE_CERT = "17728aedee7361b8c7126c3317bd396fee4dded3ab8790594fde5bd7e0123617"


def parse_welcome_version(xml: str) -> str:
    """Extract the *only* allowed app state from a specific local preferences file."""
    if not isinstance(xml, str) or len(xml) > 30000:
        raise EmulatorError("Welcome preference XML unavailable or too large")
    offset = xml.find("<?xml")
    if offset >= 0:
        xml = xml[offset:]
    else:
        xml = xml.lstrip()
    try:
        root = ET.fromstring(xml)
    except ET.ParseError as exc:
        raise EmulatorError("Welcome preference file was not parseable XML") from exc
    if root.tag != "map":
        raise EmulatorError("Welcome preference XML has unexpected root")
    nodes = root.findall("string[@name='last_played_version']")
    if len(nodes) != 1 or not nodes[0].text:
        raise EmulatorError("CineRelay welcome preference version missing")
    version = nodes[0].text.strip()
    if not re.fullmatch(r"[A-Za-z0-9._+-]{1,35}", version):
        raise EmulatorError("Welcome preference has an unexpected version value")
    return version


def require_emulator_root(*, run=subprocess.run) -> None:
    """Production/locked devices must fail rather than being probed or bypassed."""
    shell_adb(["root"], run, timeout=35)
    shell_adb(["wait-for-device"], run, timeout=45)
    uid = shell_adb(["shell", "id", "-u"], run, timeout=15).strip()
    if uid != "0":
        raise EmulatorError("This non-sensitive sandbox probe requires a rooted disposable emulator")


def read_welcome_version(*, run=subprocess.run, pause=time.sleep,
                         attempts: int = 12, expected: str | None = None) -> str:
    for i in range(attempts):
        try:
            raw = shell_adb(["shell", "cat", WELCOME_PREF], run, timeout=15)
            actual = parse_welcome_version(raw)
            if expected is None or actual == expected:
                return actual
        except EmulatorError:
            if i == attempts - 1:
                raise
        if i < attempts - 1:
            pause(1)
    raise EmulatorError("CineRelay welcome preference did not reach expected version")


def write_synthetic_probe(folder: Path, *, run=subprocess.run) -> str:
    """Write only a disposable random marker in the app sandbox; no user data."""
    marker = "STUDIO_QA_" + secrets.token_hex(20)
    local_file = folder / "synthetic_probe.txt"
    local_file.write_text(marker + "\n", encoding="ascii")
    shell_adb(["shell", "mkdir", "-p", str(Path(PROBE_FILE).parent)], run)
    shell_adb(["push", str(local_file), PROBE_FILE], run, timeout=45)
    if read_synthetic_probe(run=run) != marker:
        raise EmulatorError("Synthetic sandbox probe could not be written")
    return marker


def read_synthetic_probe(*, run=subprocess.run) -> str:
    return shell_adb(["shell", "cat", PROBE_FILE], run, timeout=15).strip()


def check_installed_version(package: str, expected: str, *, run=subprocess.run) -> None:
    version = installed_version_from_dumpsys(
        shell_adb(["shell", "dumpsys", "package", package], run))
    if version != int(expected):
        raise EmulatorError("Installed Android version code does not match the exact APK")


def launch(package: str, *, run=subprocess.run) -> None:
    shell_adb(["shell", "logcat", "-c"], run)
    output = shell_adb([
        "shell", "monkey", "-p", package, "-c",
        "android.intent.category.LAUNCHER", "1"], run)
    if not launched_monkey(output):
        raise EmulatorError("Launcher event was not delivered to the CineRelay app")


def validate_state_flow(previous: str, current: str,
                        old_expected: str, new_expected: str,
                        probe_before: str, probe_after: str) -> None:
    if previous != old_expected:
        raise EmulatorError("The previous app did not write its expected welcome version")
    if current != new_expected:
        raise EmulatorError("The target app did not update its own welcome preference")
    if not re.fullmatch(r"STUDIO_QA_[0-9a-f]{40}", probe_before):
        raise EmulatorError("Synthetic marker invalid before upgrade")
    if probe_after != probe_before:
        raise EmulatorError("Synthetic app sandbox marker was not retained during upgrade")


def probe_upgrade_state(catalog: dict, *, project: str, old_tag: str,
                        new_tag: str, apksigner: Path, aapt: Path,
                        screenshot: Path, fetch=github_json,
                        opener=None, sdk_run=subprocess.run,
                        adb_run=subprocess.run, pause=time.sleep,
                        checked_at: str | None = None) -> dict:
    """Integration proof for a local preference and synthetic app sandbox file.

    Authentication/session/personalization files are never inspected, modified,
    printed, or uploaded. APKs are temporary and not uploaded as artifacts.
    """
    if project != "cinerelay" or (old_tag, new_tag) != (EXPECTED_OLD, EXPECTED_NEW):
        raise EmulatorError("Local-state test is locked to CineRelay v0.2.7 -> v0.2.9")
    previous_packet = prepare_packet(catalog, project, old_tag, fetch=fetch)
    target_packet = prepare_packet(catalog, project, new_tag, fetch=fetch)
    with tempfile.TemporaryDirectory(prefix="navin-studio-local-state-") as tmp:
        folder = Path(tmp)
        old_apk, new_apk = folder / "older.apk", folder / "target.apk"
        old_digest = fetch_exact_asset(previous_packet, old_apk, opener=opener)
        new_digest = fetch_exact_asset(target_packet, new_apk, opener=opener)
        old_identity = read_android_identity(old_apk, apksigner, aapt, run=sdk_run)
        new_identity = read_android_identity(new_apk, apksigner, aapt, run=sdk_run)
        contract = validate_upgrade_pair(old_identity, new_identity, TRUSTED_SOURCE_CERT)
        if contract["package_id"] != APP_PACKAGE:
            raise EmulatorError("APK package identity is not CineRelay")
        require_emulator_root(run=adb_run)

        installed = shell_adb(["install", "-r", str(old_apk)], adb_run, timeout=180)
        if "Success" not in installed:
            raise EmulatorError("Older APK did not install on emulator")
        check_installed_version(APP_PACKAGE, old_identity["version_code"], run=adb_run)
        launch(APP_PACKAGE, run=adb_run)
        pause(4)
        prior_welcome = read_welcome_version(run=adb_run, pause=pause,
                                            expected=old_identity["version_name"])
        shell_adb(["shell", "am", "force-stop", APP_PACKAGE], adb_run)
        prior_probe = write_synthetic_probe(folder, run=adb_run)

        upgraded = shell_adb(["install", "-r", str(new_apk)], adb_run, timeout=180)
        if "Success" not in upgraded:
            raise EmulatorError("Target APK did not upgrade in place")
        check_installed_version(APP_PACKAGE, new_identity["version_code"], run=adb_run)
        marker_after = read_synthetic_probe(run=adb_run)
        if marker_after != prior_probe:
            raise EmulatorError("Sandbox marker disappeared after Android upgrade")

        launch(APP_PACKAGE, run=adb_run)
        pause(4)
        # App writes the welcome version to the SAME SharedPreferences file.
        new_welcome = read_welcome_version(run=adb_run, pause=pause,
                                          expected=new_identity["version_name"])
        validate_state_flow(prior_welcome, new_welcome,
                            old_identity["version_name"], new_identity["version_name"],
                            prior_probe, marker_after)

        # Screenshots are from logged-out welcome only; no credential entry.
        wait_for_labels(("Sign in", "Create account"), run=adb_run, pause=pause)
        screenshot.parent.mkdir(parents=True, exist_ok=True)
        screenshot.write_bytes(screen_png(adb_run))
        pid = shell_adb(["shell", "pidof", APP_PACKAGE], adb_run).strip()
        if not re.fullmatch(r"\d+(?:\s+\d+)*", pid):
            raise EmulatorError("CineRelay process did not remain running")
        logs = shell_adb(["logcat", "-d", "-t", "1200"], adb_run)
        if package_crashed(logs, APP_PACKAGE):
            raise EmulatorError("CineRelay fatal exception detected during local-state probe")
        device = shell_adb(["shell", "getprop", "ro.product.model"], adb_run).strip()
        sdk = shell_adb(["shell", "getprop", "ro.build.version.sdk"], adb_run).strip()

    return {
        "schema_version": 1,
        "kind": "NAVIN_STUDIO_CINERELAY_LOCAL_STATE_UPGRADE_PROBE",
        "state": "LOCAL_PREF_AND_SANDBOX_PERSISTENCE_PASSED_NOT_RELEASE_APPROVED",
        "checked_at": checked_at or datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "project_id": project, "package_id": APP_PACKAGE,
        "previous_tag": old_tag, "target_tag": new_tag,
        "old_source_commit": previous_packet["source_commit"],
        "new_source_commit": target_packet["source_commit"],
        "previous_sha256_verified": old_digest["sha256"],
        "target_sha256_verified": new_digest["sha256"],
        "emulator": {"model": device, "android_api": sdk, "rooted_disposable": True},
        "checks": {
            "previous_install_verified": True,
            "target_in_place_upgrade_verified": True,
            "package_and_signing_certificate_continuity_verified": True,
            "source_declared_certificate_matched": True,
            "app_welcome_preference_before": prior_welcome,
            "app_welcome_preference_after": new_welcome,
            "existing_app_welcome_preference_was_read_and_updated": True,
            "synthetic_app_sandbox_marker_survived": True,
            "logged_out_welcome_screen_visible": True,
            "app_stayed_alive": True,
            "authenticated_saved_data_migration_tested": False,
            "session_tokens_read_or_modified": False,
            "production_device_tested": False,
            "owner_publication_approval": False,
        },
        "limitations": [
            "A non-sensitive welcome preference and a synthetic app-sandbox file were checked.",
            "This is NOT verification of user accounts, session tokens, favorites, onboarding, real app migrations, or server data.",
            "The rooted environment is a disposable emulator, not a regular user phone.",
            "No owner approval or publication capability was used.",
        ]
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalog", type=Path, default=SITE / "data/projects.json")
    parser.add_argument("--project", default="cinerelay")
    parser.add_argument("--previous-tag", default=EXPECTED_OLD)
    parser.add_argument("--target-tag", default=EXPECTED_NEW)
    parser.add_argument("--apksigner", type=Path, required=True)
    parser.add_argument("--aapt", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--screenshot", type=Path, required=True)
    args = parser.parse_args()
    args.report.parent.mkdir(parents=True, exist_ok=True)
    try:
        catalog = json.loads(args.catalog.read_text(encoding="utf-8"))
        result = probe_upgrade_state(
            catalog, project=args.project, old_tag=args.previous_tag,
            new_tag=args.target_tag, apksigner=args.apksigner, aapt=args.aapt,
            screenshot=args.screenshot)
        exit_code = 0
    except (EmulatorError, InspectionError, OSError, KeyError, TypeError,
            ValueError) as error:
        result = {
            "schema_version": 1,
            "kind": "NAVIN_STUDIO_CINERELAY_LOCAL_STATE_UPGRADE_PROBE",
            "state": "BLOCKED_NOT_RELEASE_APPROVED",
            "project_id": args.project,
            "previous_tag": args.previous_tag,
            "target_tag": args.target_tag,
            "reason": str(error)[:200],
            "owner_publication_approval": False
        }
        exit_code = 1
    args.report.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(result["state"] + ": no personal data, account access or website publishing")
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
