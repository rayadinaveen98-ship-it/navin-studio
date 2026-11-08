#!/usr/bin/env python3
"""Offline deterministic tests. No live GitHub requests or APK SDK required."""
import hashlib
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from urllib.error import HTTPError

TOOLS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(TOOLS))

from inspect_apk import (InspectionError, assert_allowed_url,
                         fetch_exact_asset, inspect_candidate, read_android_identity)

PAYLOAD = b"test-apk-content-without-a-real-android-app"
HASH = hashlib.sha256(PAYLOAD).hexdigest()
COMMIT = "a" * 40
REPO = "rayadinaveen98-ship-it/sample"
TAG = "v2.1.0"
URL = f"https://github.com/{REPO}/releases/download/{TAG}/sample.apk"
CERT = "c" * 64
CATALOG = {
    "schema_version": 1,
    "projects": [{"id": "sample", "name": "Sample", "repository": REPO, "catalog_state": "draft"}],
}
ASSET = {
    "name": "sample.apk", "browser_download_url": URL,
    "size": len(PAYLOAD), "state": "uploaded",
    "digest": "sha256:" + HASH,
}
RELEASE = {
    "tag_name": TAG, "published_at": "2026-11-08T00:00:00Z",
    "draft": False, "prerelease": True,
    "html_url": f"https://github.com/{REPO}/releases/tag/{TAG}",
    "assets": [ASSET],
}


def fake_fetch(url):
    if "/releases/tags/" in url:
        return RELEASE
    if "/git/ref/tags/" in url:
        return {"ref": "refs/tags/" + TAG, "object": {"type": "commit", "sha": COMMIT}}
    raise AssertionError(url)


class FakeResponse:
    def __init__(self, data=PAYLOAD, final_url=URL):
        self.stream = io.BytesIO(data)
        self.final_url = final_url

    def read(self, size):
        return self.stream.read(size)

    def geturl(self):
        return self.final_url

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        self.stream.close()


class FakeOpener:
    def __init__(self, payload=PAYLOAD, final_url=URL):
        self.payload, self.final_url = payload, final_url

    def open(self, request, timeout=45):
        return FakeResponse(self.payload, self.final_url)


def fake_command(args, **_kwargs):
    if "apksigner" in args[0]:
        return subprocess.CompletedProcess(args, 0, "\n".join([
            "Verifies",
            "Verified using v1 scheme (JAR signing): true",
            "Verified using v2 scheme (APK Signature Scheme v2): true",
            "Signer #1 certificate SHA-256 digest: " + CERT,
            "Signer #1 certificate DN: CN=Android Debug,O=Android,C=US",
        ]), "")
    if "aapt" in args[0]:
        return subprocess.CompletedProcess(args, 0, "\n".join([
            "package: name='com.example.sample' versionCode='42' versionName='2.1.0'",
            "sdkVersion:'24'",
            "targetSdkVersion:'35'",
        ]), "")
    raise AssertionError(args)


def failing_apksigner(args, **_kwargs):
    if "apksigner" in args[0]:
        return subprocess.CompletedProcess(args, 1, "", "signature mismatch")
    return fake_command(args, **_kwargs)


class BinaryInspectionTests(unittest.TestCase):
    def make_sdk(self, folder):
        root = Path(folder)
        signer, aapt = root / "apksigner", root / "aapt"
        signer.write_text("fake")
        aapt.write_text("fake")
        return signer, aapt

    def packet(self):
        return {
            "repository": REPO, "release_tag": TAG,
            "asset": {
                "name": "sample.apk", "size_bytes": len(PAYLOAD),
                "download_url": URL, "github_reported_sha256": HASH,
            },
        }

    def test_exact_bytes_sha256(self):
        with tempfile.TemporaryDirectory() as d:
            result = fetch_exact_asset(self.packet(), Path(d) / "test.apk", opener=FakeOpener())
            self.assertEqual(result["sha256"], HASH)
            self.assertEqual(result["size_bytes"], len(PAYLOAD))

    def test_bad_binary_digest_is_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            with self.assertRaisesRegex(InspectionError, "SHA-256"):
                fetch_exact_asset(self.packet(), Path(d) / "test.apk",
                                  opener=FakeOpener(b"X" * len(PAYLOAD)))

    def test_wrong_download_size_is_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            with self.assertRaisesRegex(InspectionError, "size"):
                fetch_exact_asset(self.packet(), Path(d) / "test.apk",
                                  opener=FakeOpener(PAYLOAD[:-1]))

    def test_external_hosts_and_insecure_urls_blocked(self):
        for url in ("http://github.com/x", "https://evil.invalid/file.apk",
                    "https://github.com.evil.invalid/file.apk",
                    "https://user:pass@github.com/file.apk",
                    "https://127.0.0.1/file.apk"):
            with self.assertRaises(InspectionError):
                assert_allowed_url(url)

    def test_github_release_host_redirect_is_accepted(self):
        assert_allowed_url("https://release-assets.githubusercontent.com/file?download=1")

    def test_redirect_to_untrusted_host_is_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            with self.assertRaises(InspectionError):
                fetch_exact_asset(self.packet(), Path(d) / "test.apk",
                                  opener=FakeOpener(final_url="https://127.0.0.1/private"))

    def test_transient_504_uses_only_same_official_asset_id(self):
        api = f"https://api.github.com/repos/{REPO}/releases/assets/987654"
        class FallbackOpener:
            def __init__(self):
                self.urls = []
            def open(self, request, timeout=45):
                self.urls.append(request.full_url)
                if len(self.urls) == 1:
                    raise HTTPError(request.full_url, 504, "Gateway Time-out", {}, None)
                return FakeResponse(PAYLOAD, api)
        opener = FallbackOpener()
        packet = self.packet()
        packet["asset"]["asset_id"] = 987654
        with tempfile.TemporaryDirectory() as folder:
            result = fetch_exact_asset(packet, Path(folder) / "download.apk", opener=opener)
        self.assertTrue(result["integrity_matches_github"])
        self.assertEqual(opener.urls, [URL, api])

    def test_permanent_403_never_tries_any_fallback(self):
        class DeniedOpener:
            def __init__(self):
                self.calls=0
            def open(self, request, timeout=45):
                self.calls += 1
                raise HTTPError(request.full_url, 403, "Forbidden", {}, None)
        opener = DeniedOpener()
        packet = self.packet()
        packet["asset"]["asset_id"] = 987654
        with tempfile.TemporaryDirectory() as folder:
            with self.assertRaises(HTTPError):
                fetch_exact_asset(packet, Path(folder) / "download.apk", opener=opener)
        self.assertEqual(opener.calls,1)

    def test_api_metadata_json_never_counts_as_apk(self):
        api = f"https://api.github.com/repos/{REPO}/releases/assets/987654"
        class MetadataOpener:
            def open(self, request, timeout=45):
                if request.full_url == URL:
                    raise HTTPError(URL, 504, "Gateway Time-out", {}, None)
                return FakeResponse(b"{}" , api)
        packet = self.packet()
        packet["asset"]["asset_id"] = 987654
        with tempfile.TemporaryDirectory() as folder:
            with self.assertRaisesRegex(InspectionError, "size"):
                fetch_exact_asset(packet, Path(folder) / "download.apk", opener=MetadataOpener())

    def test_wrong_fallback_binary_fails_checksum_without_retry(self):
        api = f"https://api.github.com/repos/{REPO}/releases/assets/987654"
        class WrongOpener:
            def __init__(self):
                self.calls=0
            def open(self, request, timeout=45):
                self.calls+=1
                if self.calls == 1:
                    raise HTTPError(URL, 504, "Gateway Time-out", {}, None)
                return FakeResponse(b"X" * len(PAYLOAD), api)
        opener = WrongOpener()
        packet = self.packet()
        packet["asset"]["asset_id"] = 987654
        with tempfile.TemporaryDirectory() as folder:
            with self.assertRaisesRegex(InspectionError, "SHA-256"):
                fetch_exact_asset(packet, Path(folder) / "download.apk", opener=opener)
        self.assertEqual(opener.calls,2)

    def test_missing_or_invalid_asset_id_never_uses_rest_fallback(self):
        class FailingOpener:
            def __init__(self):
                self.calls=0
            def open(self, request, timeout=45):
                self.calls+=1
                raise HTTPError(URL, 504, "Gateway Time-out", {}, None)
        for bad_id in [None, True, -1, "987654"]:
            packet = self.packet()
            packet["asset"]["asset_id"] = bad_id
            opener = FailingOpener()
            with tempfile.TemporaryDirectory() as folder:
                with self.assertRaises(HTTPError):
                    fetch_exact_asset(packet, Path(folder) / "download.apk", opener=opener)
            self.assertEqual(opener.calls,1)

    def test_android_signed_package_parsing(self):
        with tempfile.TemporaryDirectory() as d:
            signer, aapt = self.make_sdk(d)
            apk = Path(d) / "test.apk"
            apk.write_bytes(PAYLOAD)
            identity = read_android_identity(apk, signer, aapt, run=fake_command)
            self.assertTrue(identity["signature_integrity_verified"])
            self.assertEqual(identity["signer_certificate_sha256"], [CERT])
            self.assertTrue(identity["debug_certificate_subject_detected"])
            self.assertEqual(identity["package_id"], "com.example.sample")
            self.assertEqual(identity["version_name"], "2.1.0")
            self.assertEqual(identity["min_sdk"], 24)
            self.assertFalse(identity["functional_qa_passed"])
            self.assertFalse(identity["owner_approval"])

    def test_android_build_tools_37_v2_signer_heading(self):
        def v37(args, **kwargs):
            if "apksigner" in args[0]:
                return subprocess.CompletedProcess(
                    args, 0,
                    "Verifies\nV2 Signer: certificate SHA-256 digest: " + CERT
                    + "\nV2 Signer: certificate DN: CN=Android Debug, O=Android",
                    "")
            return fake_command(args, **kwargs)
        with tempfile.TemporaryDirectory() as d:
            signer, aapt = self.make_sdk(d)
            apk = Path(d) / "test.apk"
            apk.write_bytes(PAYLOAD)
            result = read_android_identity(apk, signer, aapt, run=v37)
            self.assertEqual(result["signer_certificate_sha256"], [CERT])
            self.assertTrue(result["debug_certificate_subject_detected"])

    def test_android_build_tools_37_v3_signer_heading(self):
        def v37(args, **kwargs):
            if "apksigner" in args[0]:
                return subprocess.CompletedProcess(
                    args, 0,
                    "V3.0 Signer: certificate SHA-256 digest: "
                    + ":".join(CERT[i:i + 2] for i in range(0, 64, 2)),
                    "")
            return fake_command(args, **kwargs)
        with tempfile.TemporaryDirectory() as d:
            signer, aapt = self.make_sdk(d)
            apk = Path(d) / "test.apk"
            apk.write_bytes(PAYLOAD)
            result = read_android_identity(apk, signer, aapt, run=v37)
            self.assertEqual(result["signer_certificate_sha256"], [CERT])

    def test_signature_failure_blocks(self):
        with tempfile.TemporaryDirectory() as d:
            signer, aapt = self.make_sdk(d)
            apk = Path(d) / "test.apk"
            apk.write_bytes(PAYLOAD)
            with self.assertRaises(InspectionError):
                read_android_identity(apk, signer, aapt, run=failing_apksigner)

    def test_inspected_candidate_is_not_approved(self):
        with tempfile.TemporaryDirectory() as d:
            signer, aapt = self.make_sdk(d)
            report = inspect_candidate(
                CATALOG, "sample", TAG, None, signer, aapt,
                fetch=fake_fetch, opener=FakeOpener(), run=fake_command,
                checked_at="2026-11-08T00:00:00Z")
            self.assertEqual(report["state"], "BINARY_INSPECTED_NOT_QA_APPROVED")
            self.assertEqual(report["source_commit"], COMMIT)
            self.assertTrue(report["downloaded_asset"]["integrity_matches_github"])
            self.assertFalse(report["android"]["owner_approval"])
            self.assertFalse(report["android"]["trusted_publisher_identity_confirmed"])

    def test_expected_package_mismatch_blocks(self):
        with tempfile.TemporaryDirectory() as d:
            signer, aapt = self.make_sdk(d)
            with self.assertRaisesRegex(InspectionError, "package ID"):
                inspect_candidate(
                    CATALOG, "sample", TAG, None, signer, aapt,
                    fetch=fake_fetch, opener=FakeOpener(), run=fake_command,
                    expected_package="com.example.other")

    def test_expected_certificate_mismatch_blocks(self):
        with tempfile.TemporaryDirectory() as d:
            signer, aapt = self.make_sdk(d)
            with self.assertRaisesRegex(InspectionError, "certificate differs"):
                inspect_candidate(
                    CATALOG, "sample", TAG, None, signer, aapt,
                    fetch=fake_fetch, opener=FakeOpener(), run=fake_command,
                    expected_cert="f" * 64)

    def test_expected_certificate_and_package_match_do_not_approve(self):
        with tempfile.TemporaryDirectory() as d:
            signer, aapt = self.make_sdk(d)
            report = inspect_candidate(
                CATALOG, "sample", TAG, None, signer, aapt,
                fetch=fake_fetch, opener=FakeOpener(), run=fake_command,
                expected_cert=CERT, expected_package="com.example.sample")
            self.assertTrue(report["expected_certificate_match"])
            self.assertTrue(report["expected_package_match"])
            self.assertEqual(report["state"], "BINARY_INSPECTED_NOT_QA_APPROVED")
            self.assertFalse(report["android"]["owner_approval"])

    def test_draft_release_fails_before_binary_download(self):
        def draft_fetch(url):
            result = fake_fetch(url)
            if "/releases/tags/" in url:
                return {**result, "draft": True}
            return result
        with tempfile.TemporaryDirectory() as d:
            signer, aapt = self.make_sdk(d)
            with self.assertRaises(ValueError):
                inspect_candidate(
                    CATALOG, "sample", TAG, None, signer, aapt,
                    fetch=draft_fetch, opener=FakeOpener(), run=fake_command)


if __name__ == "__main__":
    unittest.main()
