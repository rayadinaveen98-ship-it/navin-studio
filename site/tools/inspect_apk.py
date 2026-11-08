#!/usr/bin/env python3
"""Independent APK-byte digest and Android signature/package inspection.

Read-only candidate inspection. Never approves a release, edits a catalog,
publishes a binary, or claims an install/device QA test happened.

Uses the exact public GitHub Release asset selected by release_review.py.
Android SDK's official "apksigner" and "aapt" executables must be supplied.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import subprocess
import tempfile
from urllib.parse import quote, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

from release_review import prepare_packet
from release_watch import github_json

SITE = Path(__file__).resolve().parents[1]
MAX_APK_BYTES = 250 * 1024 * 1024
CHUNK_BYTES = 1024 * 1024
REDIRECT_HOSTS = frozenset({
    "github.com", "release-assets.githubusercontent.com",
    "objects.githubusercontent.com",
})
DIGEST_RE = re.compile(r"^[0-9a-f]{64}$")
# Android Build Tools 37+ uses "V2 Signer:" / "V3.0 Signer:" rather
# than the legacy "Signer #1" heading. Both refer to the APK certificate.
CERT_RE = re.compile(
    r"(?im)^\s*(?:(?:Signer\s*#\d+)|(?:V[1-4](?:\.\d+)?\s+Signer))"
    r"\s*:?\s*certificate\s+SHA-256\s+digest\s*:\s*([0-9a-fA-F:]{64,95})"
)
PACKAGE_RE = re.compile(
    r"(?m)^package:\s+name='([^']+)'\s+versionCode='([^']+)'\s+versionName='([^']*)'"
)
PACKAGE_ID_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)+$")


class InspectionError(Exception):
    """Rejects an unsafe, unverified, or incomplete inspection."""


def assert_allowed_url(url: str) -> None:
    parsed = urlsplit(url)
    if (parsed.scheme != "https" or parsed.hostname not in REDIRECT_HOSTS
            or parsed.port not in (None, 443)
            or parsed.username or parsed.password or parsed.fragment):
        raise InspectionError("Unapproved release download destination")


class RestrictedRedirects(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        assert_allowed_url(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def fetch_exact_asset(packet: dict, output: Path, *, opener=None) -> dict:
    """Download the sole preselected APK with strict bounds and an independent hash."""
    repo, tag = packet["repository"], packet["release_tag"]
    asset = packet["asset"]
    url = asset["download_url"]
    expected_prefix = f"https://github.com/{repo}/releases/download/{quote(tag, safe='')}/"
    if not isinstance(url, str) or not url.startswith(expected_prefix):
        raise InspectionError("APK URL is not from the approved GitHub project/tag")
    assert_allowed_url(url)
    name = asset["name"]
    if not isinstance(name, str) or not name.lower().endswith(".apk"):
        raise InspectionError("Expected a named APK file")
    size = asset["size_bytes"]
    if not isinstance(size, int) or isinstance(size, bool) or not 0 < size <= MAX_APK_BYTES:
        raise InspectionError("APK size is absent, empty, or exceeds 250 MiB")
    digest = asset["github_reported_sha256"]
    if not isinstance(digest, str) or not DIGEST_RE.fullmatch(digest):
        raise InspectionError("GitHub SHA-256 metadata is unavailable or invalid")
    opener = opener or build_opener(RestrictedRedirects())
    request = Request(url, headers={
        "User-Agent": "navin-studio-binary-inspector/0.1",
        "Accept": "application/octet-stream",
    })
    sha256 = hashlib.sha256()
    count = 0
    with opener.open(request, timeout=45) as response, output.open("wb") as handle:
        final_url = response.geturl()
        assert_allowed_url(final_url)
        while True:
            chunk = response.read(CHUNK_BYTES)
            if not chunk:
                break
            count += len(chunk)
            if count > size or count > MAX_APK_BYTES:
                raise InspectionError("APK download exceeded the GitHub-reported size")
            handle.write(chunk)
            sha256.update(chunk)
    if count != size:
        raise InspectionError("Downloaded APK size does not match published asset metadata")
    actual = sha256.hexdigest()
    if actual != digest:
        raise InspectionError("Independent downloaded APK SHA-256 does not match GitHub digest")
    return {"sha256": actual, "size_bytes": count, "integrity_matches_github": True}


def _run_tool(command: list[str], run=subprocess.run) -> str:
    try:
        p = run(command, capture_output=True, text=True, encoding="utf-8",
                errors="replace", timeout=120, check=False)
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise InspectionError("Android SDK tool could not execute") from exc
    if p.returncode != 0:
        # Do not embed untrusted compiler/tool output or external paths in public artifacts.
        raise InspectionError(f"Android SDK check failed: {Path(command[0]).name} returned {p.returncode}")
    return (p.stdout or "") + "\n" + (p.stderr or "")


def read_android_identity(apk: Path, apksigner: Path, aapt: Path, *, run=subprocess.run) -> dict:
    """Verify APK signing integrity and inspect manifest package metadata."""
    if not apk.is_file():
        raise InspectionError("APK file missing")
    if not apksigner.is_file() or not aapt.is_file():
        raise InspectionError("Official Android SDK build-tools are unavailable")
    signed = _run_tool([str(apksigner), "verify", "--verbose", "--print-certs", str(apk)], run)
    certificates = sorted({
        m.group(1).replace(":", "").lower() for m in CERT_RE.finditer(signed)
        if DIGEST_RE.fullmatch(m.group(1).replace(":", "").lower())
    })
    if not certificates:
        raise InspectionError("APK verified but signer certificate SHA-256 was not readable")
    badging = _run_tool([str(aapt), "dump", "badging", str(apk)], run)
    package = PACKAGE_RE.search(badging)
    if not package or not PACKAGE_ID_RE.fullmatch(package.group(1)):
        raise InspectionError("Android package/version metadata could not be parsed")
    def sdk_field(field: str) -> int | None:
        match = re.search(rf"(?m)^{field}:'([0-9]+)'", badging)
        return int(match.group(1)) if match else None
    return {
        "signature_integrity_verified": True,
        "signer_certificate_sha256": certificates,
        "debug_certificate_subject_detected": "CN=Android Debug" in signed,
        "package_id": package.group(1),
        "version_code": package.group(2),
        "version_name": package.group(3),
        "min_sdk": sdk_field("sdkVersion"),
        "target_sdk": sdk_field("targetSdkVersion"),
        "trusted_publisher_identity_confirmed": False,
        "device_install_tested": False,
        "functional_qa_passed": False,
        "owner_approval": False,
    }


def inspect_candidate(catalog: dict, project: str, tag: str, asset_name: str | None,
                      apksigner: Path, aapt: Path, *, fetch=github_json, opener=None,
                      run=subprocess.run, expected_package: str | None = None,
                      expected_cert: str | None = None, checked_at: str | None = None) -> dict:
    """Return inspection results with no publishing/approval capability."""
    packet = prepare_packet(catalog, project, tag, asset_name, fetch=fetch,
                            checked_at=checked_at)
    with tempfile.TemporaryDirectory(prefix="navin-studio-apk-") as directory:
        apk = Path(directory) / "candidate.apk"
        digest = fetch_exact_asset(packet, apk, opener=opener)
        identity = read_android_identity(apk, apksigner, aapt, run=run)
    if expected_package is not None and identity["package_id"] != expected_package:
        raise InspectionError("APK package ID does not match expected publisher package")
    if expected_cert is not None:
        normalized = expected_cert.replace(":", "").lower()
        if not DIGEST_RE.fullmatch(normalized):
            raise InspectionError("Invalid trusted certificate fingerprint")
        if normalized not in identity["signer_certificate_sha256"]:
            raise InspectionError("APK signing certificate differs from expected certificate")
    return {
        "schema_version": 1,
        "kind": "NAVIN_STUDIO_BINARY_INSPECTION",
        "state": "BINARY_INSPECTED_NOT_QA_APPROVED",
        "checked_at": checked_at or datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "project_id": packet["project_id"],
        "repository": packet["repository"],
        "release_tag": packet["release_tag"],
        "source_commit": packet["source_commit"],
        "asset_name": packet["asset"]["name"],
        "download_url": packet["asset"]["download_url"],
        "published_at": packet["published_at"],
        "channel_hint": packet["channel_hint"],
        "downloaded_asset": digest,
        "android": identity,
        "expected_package_match": expected_package is not None,
        "expected_certificate_match": expected_cert is not None,
        "limitations": [
            "A valid APK signature is not proof of trusted publisher identity.",
            "The source tag is resolved, but a reproducible source-to-binary build was not proven.",
            "No Android device installation or functional QA was performed.",
            "No human owner approval was granted.",
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalog", type=Path, default=SITE / "data/projects.json")
    parser.add_argument("--project", required=True)
    parser.add_argument("--tag", required=True)
    parser.add_argument("--asset", default=None)
    parser.add_argument("--apksigner", type=Path, required=True)
    parser.add_argument("--aapt", type=Path, required=True)
    parser.add_argument("--expected-package", default=None)
    parser.add_argument("--expected-cert", default=None)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    try:
        catalog = json.loads(args.catalog.read_text(encoding="utf-8"))
        report = inspect_candidate(
            catalog, args.project, args.tag, args.asset, args.apksigner, args.aapt,
            expected_package=args.expected_package or None,
            expected_cert=args.expected_cert or None)
    except (InspectionError, ValueError, KeyError, TypeError, OSError) as exc:
        # Deliberately no tokens, arbitrary remote text, or signing material in output.
        report = {
            "schema_version": 1,
            "kind": "NAVIN_STUDIO_BINARY_INSPECTION",
            "state": "BLOCKED_NOT_APPROVED",
            "project_id": args.project,
            "release_tag": args.tag,
            "reason": str(exc)[:300],
            "owner_approval": False,
        }
        code = 1
    else:
        code = 0
    args.output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n",
                           encoding="utf-8")
    print(f"Inspection: {report['state']} for {args.project}@{args.tag}. "
          "No binary publication or owner approval performed.")
    return code


if __name__ == "__main__":
    raise SystemExit(main())
