#!/usr/bin/env python3
"""Offline, deterministic APK in-place-upgrade regression tests."""
from __future__ import annotations

import hashlib
import io
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from upgrade_smoke import EmulatorError, check_visible_app_hierarchy, installed_version_from_dumpsys, validate_upgrade_pair, upgrade_smoke

PACKAGE = "com.cinerelay.app"
CERT = "a" * 64
OLDER = {"package_id": PACKAGE, "version_name": "0.2.7",
         "version_code": "210007", "signer_certificate_sha256": [CERT],
         "debug_certificate_subject_detected": False}
NEWER = {"package_id": PACKAGE, "version_name": "0.2.9",
         "version_code": "221001", "signer_certificate_sha256": [CERT],
         "debug_certificate_subject_detected": False}
OLD_BYTES = b"mock-old-apk-for-testing"
NEW_BYTES = b"mock-new-apk-for-testing"
REPO = "rayadinaveen98-ship-it/cinerelay"
CATALOG = {"schema_version": 1,
           "projects": [{"id": "cinerelay", "name": "CineRelay", "repository": REPO,
                         "catalog_state": "draft"}]}


class Response:
    def __init__(self, data: bytes, url: str):
        self.file, self.url = io.BytesIO(data), url

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        self.file.close()

    def read(self, count: int):
        return self.file.read(count)

    def geturl(self):
        return self.url


class BinaryOpener:
    def open(self, req, timeout=45):
        tag = "v0.2.7" if "/v0.2.7/" in req.full_url else "v0.2.9"
        return Response(OLD_BYTES if tag == "v0.2.7" else NEW_BYTES, req.full_url)


def github_fetch(url):
    tag = "v0.2.7" if "v0.2.7" in url else "v0.2.9"
    if "/git/ref/tags/" in url:
        return {"ref": "refs/tags/" + tag,
                "object": {"type": "commit", "sha": "c" * 40 if tag == "v0.2.7" else "d" * 40}}
    if "/releases/tags/" in url:
        data = OLD_BYTES if tag == "v0.2.7" else NEW_BYTES
        name = f"CineRelay-{tag}.apk"
        return {"tag_name": tag, "published_at": "2026-11-08T00:00:00Z",
                "draft": False, "prerelease": False,
                "html_url": f"https://github.com/{REPO}/releases/tag/{tag}",
                "assets": [{
                    "name": name, "size": len(data), "state": "uploaded",
                    "browser_download_url": f"https://github.com/{REPO}/releases/download/{tag}/{name}",
                    "digest": "sha256:" + hashlib.sha256(data).hexdigest()
                }]}
    raise AssertionError("Unexpected public GitHub endpoint " + url)


def fake_android_tools(args, **_kwargs):
    path = args[-1]
    if "apksigner" in args[0]:
        return subprocess.CompletedProcess(
            args, 0, "V2 Signer: certificate SHA-256 digest: " + CERT, "")
    if "aapt" in args[0]:
        ver = OLDER if path.endswith("previous.apk") else NEWER
        return subprocess.CompletedProcess(args, 0,
            f"package: name='{PACKAGE}' versionCode='{ver['version_code']}' versionName='{ver['version_name']}'\n"
            "sdkVersion:'26'\ntargetSdkVersion:'36'\n", "")
    raise AssertionError(args)


class FakeAdb:
    def __init__(self, ui_xml=None):
        self.version = None
        self.calls = []
        self.ui_xml = ui_xml if ui_xml is not None else (
            '<hierarchy><node package="com.cinerelay.app" text="Sign in"/></hierarchy>'
        )

    def __call__(self, args, **_kwargs):
        self.calls.append(args)
        key = args[1:]
        output = ""
        if key[:1] == ["install"]:
            self.version = 210007 if key[-1].endswith("previous.apk") else 221001
            output = "Success\n"
        elif key[:3] == ["shell", "dumpsys", "package"]:
            output = f"Packages:\n  versionCode={self.version} minSdk=26 targetSdk=36\n"
        elif key[:3] == ["shell", "getprop", "ro.product.model"]:
            output = "sdk_gphone64_x86_64\n"
        elif key[:3] == ["shell", "getprop", "ro.build.version.sdk"]:
            output = "35\n"
        elif key[:2] == ["shell", "monkey"]:
            output = "Events injected: 1\n"
        elif key[:2] == ["shell", "pidof"]:
            output = "1400\n"
        elif key[:3] == ["shell", "logcat", "-d"]:
            output = "No app-specific fatal errors\n"
        elif key[:3] == ["shell", "cat", "/sdcard/studio-visible-ui.xml"]:
            output = self.ui_xml
        elif key[:3] == ["exec-out", "screencap", "-p"]:
            return subprocess.CompletedProcess(args, 0, b"\x89PNG\r\n\x1a\n" + b"test", b"")
        return subprocess.CompletedProcess(args, 0, output, "")


class UpgradeTests(unittest.TestCase):
    def test_pair_matches_signer_and_version(self):
        self.assertTrue(validate_upgrade_pair(OLDER, NEWER, CERT)["source_declared_certificate_match"])

    def test_version_must_increase(self):
        with self.assertRaisesRegex(EmulatorError, "strictly exceed"):
            validate_upgrade_pair(NEWER, OLDER)

    def test_signing_mismatch_rejected(self):
        with self.assertRaisesRegex(EmulatorError, "Signing certificates differ"):
            validate_upgrade_pair(OLDER, {**NEWER, "signer_certificate_sha256": ["f" * 64]})

    def test_package_mismatch_rejected(self):
        with self.assertRaisesRegex(EmulatorError, "package identifiers differ"):
            validate_upgrade_pair(OLDER, {**NEWER, "package_id": "com.other.app"})

    def test_debug_target_rejected(self):
        with self.assertRaisesRegex(EmulatorError, "debug"):
            validate_upgrade_pair(OLDER, {**NEWER, "debug_certificate_subject_detected": True})

    def test_source_declared_signer_mismatch_rejected(self):
        with self.assertRaisesRegex(EmulatorError, "source-declared"):
            validate_upgrade_pair(OLDER, NEWER, "f" * 64)

    def test_version_from_adb_dumpsys(self):
        self.assertEqual(installed_version_from_dumpsys(
            "  versionCode=221001 minSdk=26 targetSdk=36\n"), 221001)

    def test_missing_version_from_adb_blocks(self):
        with self.assertRaises(EmulatorError):
            installed_version_from_dumpsys("Package not found")

    def test_visible_app_hierarchy_is_clear(self):
        check_visible_app_hierarchy(
            '<hierarchy><node package="com.cinerelay.app" text="Welcome"/></hierarchy>',
            PACKAGE)

    def test_pixel_launcher_anr_dialog_blocks(self):
        xml = ('<hierarchy><node package="android" '
               'text="Pixel Launcher isn&apos;t responding"/></hierarchy>')
        with self.assertRaisesRegex(EmulatorError, "not responding"):
            check_visible_app_hierarchy(xml, PACKAGE)

    def test_system_ui_is_not_responding_dialog_blocks(self):
        xml = ('<hierarchy><node package="com.cinerelay.app" '
               'text="System UI is not responding"/></hierarchy>')
        with self.assertRaisesRegex(EmulatorError, "not responding"):
            check_visible_app_hierarchy(xml, PACKAGE)

    def test_not_our_foreground_app_blocks(self):
        xml = '<hierarchy><node package="com.android.launcher" text="Home"/></hierarchy>'
        with self.assertRaisesRegex(EmulatorError, "target app"):
            check_visible_app_hierarchy(xml, PACKAGE)

    def test_empty_visible_tree_blocks(self):
        with self.assertRaisesRegex(EmulatorError, "hierarchy unavailable"):
            check_visible_app_hierarchy("UI tree could not be retrieved", PACKAGE)

    def test_end_to_end_system_dialog_blocks_before_screenshot(self):
        with tempfile.TemporaryDirectory() as d:
            folder = Path(d)
            signer, aapt = folder / "apksigner", folder / "aapt"
            signer.write_text("fixture")
            aapt.write_text("fixture")
            adb = FakeAdb(ui_xml=(
                '<hierarchy><node package="android" '
                'text="Pixel Launcher isn&apos;t responding"/></hierarchy>'))
            with self.assertRaisesRegex(EmulatorError, "not responding"):
                upgrade_smoke(
                    CATALOG, "cinerelay", "v0.2.7", "v0.2.9",
                    signer, aapt, folder / "screen.png",
                    expected_cert=CERT, fetch=github_fetch,
                    opener=BinaryOpener(), sdk_run=fake_android_tools,
                    adb_run=adb, pause=lambda _: None)
            self.assertFalse((folder / "screen.png").exists())

    def test_same_release_tag_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            with self.assertRaises(EmulatorError):
                upgrade_smoke(CATALOG, "cinerelay", "v0.2.9", "v0.2.9",
                              Path(d) / "apksigner", Path(d) / "aapt", Path(d) / "x.png",
                              fetch=github_fetch)

    def test_install_upgrade_launch_never_uninstalls_and_never_approves(self):
        with tempfile.TemporaryDirectory() as d:
            folder=Path(d)
            signer=folder / "apksigner"
            aapt=folder / "aapt"
            signer.write_text("fixture")
            aapt.write_text("fixture")
            adb=FakeAdb()
            report=upgrade_smoke(
                CATALOG, "cinerelay", "v0.2.7", "v0.2.9",
                signer, aapt, folder / "screen.png",
                expected_cert=CERT, fetch=github_fetch,
                opener=BinaryOpener(), sdk_run=fake_android_tools,
                adb_run=adb, pause=lambda _: None,
                checked_at="2026-11-08T00:00:00Z")
            self.assertEqual(report["state"], "APK_UPGRADE_SMOKE_PASSED_NOT_RELEASE_APPROVED")
            self.assertEqual(report["upgrade_contract"]["target_version_code"], 221001)
            self.assertFalse(report["checks"]["application_user_data_contents_verified"])
            self.assertFalse(report["checks"]["owner_approved_for_publication"])
            installs=[x for x in adb.calls if x[1:2] == ["install"]]
            self.assertEqual(len(installs), 2)
            self.assertTrue(all("-r" in x for x in installs))
            self.assertFalse(any("uninstall" in x or "clear" in x for x in adb.calls))
            self.assertTrue((folder / "screen.png").is_file())

    def test_adb_target_version_mismatch_blocks(self):
        class BadAdb(FakeAdb):
            def __call__(self, args, **kwargs):
                result=super().__call__(args, **kwargs)
                if args[1:4] == ["shell", "dumpsys", "package"] and self.version == 221001:
                    return subprocess.CompletedProcess(args, 0,
                        "versionCode=210007 minSdk=26 targetSdk=36", "")
                return result
        with tempfile.TemporaryDirectory() as d:
            folder=Path(d)
            signer=folder / "apksigner"
            aapt=folder / "aapt"
            signer.write_text("fixture")
            aapt.write_text("fixture")
            with self.assertRaisesRegex(EmulatorError, "Installed target package version"):
                upgrade_smoke(CATALOG, "cinerelay", "v0.2.7", "v0.2.9",
                              signer, aapt, folder / "screen.png",
                              fetch=github_fetch, opener=BinaryOpener(),
                              sdk_run=fake_android_tools, adb_run=BadAdb(), pause=lambda _: None)


if __name__ == "__main__":
    unittest.main()
