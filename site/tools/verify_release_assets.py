#!/usr/bin/env python3
"""Fail closed when an owner-approved public release lacks matching GitHub assets.

This is a remote asset-metadata integrity check, not a replacement for testing,
APK signature verification, or directly hashing a downloaded binary.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
from urllib.parse import quote, urlsplit

from release_watch import github_json
from release_source import resolve_tag_commit

SITE = Path(__file__).resolve().parents[1]
HEX_SHA256 = re.compile(r"^[0-9a-f]{64}$")
REPOSITORY = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")


def audit(catalog: dict, manifest: dict, fetch=github_json) -> list[str]:
    """Return errors; no remote writes, no binary downloads, no secret logging."""
    problems: list[str] = []
    if manifest.get("schema_version") != 1 or not isinstance(manifest.get("published_releases"), list):
        return ["Unrecognized release manifest schema"]
    if catalog.get("schema_version") != 1 or not isinstance(catalog.get("projects"), list):
        return ["Unrecognized catalog schema"]
    by_id = {p.get("id"): p for p in catalog["projects"] if isinstance(p, dict)}
    for index, item in enumerate(manifest["published_releases"]):
        ident = f"release[{index}]"
        if not isinstance(item, dict):
            problems.append(f"{ident}: not an object")
            continue
        project = by_id.get(item.get("project_id"))
        if not project:
            problems.append(f"{ident}: unknown project")
            continue
        repo = project.get("repository", "")
        tag, checksum, url = item.get("release_tag"), item.get("sha256"), item.get("download_url")
        if (not isinstance(repo, str) or not REPOSITORY.fullmatch(repo)
            or not isinstance(tag, str) or not tag.strip() or "/" in tag
            or not isinstance(url, str)
            or not url.startswith(f"https://github.com/{repo}/releases/download/")
            or not HEX_SHA256.fullmatch(checksum or "")):
            problems.append(f"{ident}: missing/invalid repository, tag, URL, or SHA-256")
            continue
        if not all(item.get(key) is True for key in ("approved", "qa_passed", "signature_checked")):
            problems.append(f"{ident}: QA/signing/owner approval is incomplete")
            continue
        if (project.get("catalog_state") != "published"
            or project.get("published_release_tag") != tag
            or project.get("approved_download_url") != url):
            problems.append(f"{ident}: catalog and manifest do not agree")
            continue
        endpoint = f"https://api.github.com/repos/{repo}/releases/tags/{quote(tag, safe='')}"
        try:
            release = fetch(endpoint)
        except Exception:
            problems.append(f"{ident}: GitHub release metadata unavailable (fail closed)")
            continue
        if (not isinstance(release, dict) or release.get("draft")
            or not release.get("published_at") or release.get("tag_name") != tag):
            problems.append(f"{ident}: GitHub tag is not a published release")
            continue
        matches = [asset for asset in release.get("assets", [])
                   if isinstance(asset, dict) and asset.get("browser_download_url") == url
                   and asset.get("state") == "uploaded"
                   and asset.get("size", 0) > 0
                   and str(asset.get("name", "")).lower().endswith(".apk")]
        if len(matches) != 1:
            problems.append(f"{ident}: exact uploaded APK asset not found")
            continue
        digest = matches[0].get("digest")
        # The digest is supplied by GitHub's uploaded release asset metadata.
        # Without it we cannot corroborate the approved checksum through the API.
        if digest != f"sha256:{checksum}":
            problems.append(f"{ident}: GitHub asset digest missing or mismatched")
            continue
        try:
            actual_commit = resolve_tag_commit(repo, tag, fetch)
        except Exception:
            problems.append(f"{ident}: GitHub tag source commit unavailable (fail closed)")
            continue
        if actual_commit != str(item.get("source_commit", "")).lower():
            problems.append(f"{ident}: source commit does not match release tag")
    return problems


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalog", type=Path, default=SITE / "data/projects.json")
    parser.add_argument("--manifest", type=Path, default=SITE / "data/releases.json")
    args = parser.parse_args()
    errors = audit(json.loads(args.catalog.read_text(encoding="utf-8")),
                   json.loads(args.manifest.read_text(encoding="utf-8")))
    if errors:
        for error in errors:
            print("ERROR:", error)
        return 1
    print("PASS: all approved releases match their exact published GitHub assets (or none are approved).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
