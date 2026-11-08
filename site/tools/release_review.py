#!/usr/bin/env python3
"""Prepare a GitHub APK release review packet without approving or publishing it.

This program only performs public GET requests. Its JSON output is a candidate
for *manual* Android signing, independent hash, installation and QA review.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import re
from urllib.parse import quote

from release_watch import github_json
from release_source import REPO_PATTERN, TAG_PATTERN, resolve_tag_commit

SITE = Path(__file__).resolve().parents[1]
DIGEST = re.compile(r"^sha256:([0-9a-fA-F]{64})$")


def prepare_packet(catalog: dict, project_id: str, tag: str,
                   asset_name: str | None = None, fetch=github_json,
                   checked_at: str | None = None) -> dict:
    if catalog.get("schema_version") != 1 or not isinstance(catalog.get("projects"), list):
        raise ValueError("Unrecognized public catalog")
    projects = [p for p in catalog["projects"] if isinstance(p, dict) and p.get("id") == project_id]
    if len(projects) != 1:
        raise ValueError("Unknown or ambiguous project id")
    project = projects[0]
    repo = project.get("repository")
    if not isinstance(repo, str) or not REPO_PATTERN.fullmatch(repo):
        raise ValueError("Invalid repository")
    if not isinstance(tag, str) or not TAG_PATTERN.fullmatch(tag):
        raise ValueError("Invalid release tag")
    release = fetch(f"https://api.github.com/repos/{repo}/releases/tags/{quote(tag, safe='')}")
    if (not isinstance(release, dict) or release.get("tag_name") != tag
            or release.get("draft") or not release.get("published_at")):
        raise ValueError("Release is not a published GitHub release")
    prefix = f"https://github.com/{repo}/releases/download/{quote(tag, safe='')}/"
    assets = []
    for asset in release.get("assets", []):
        if not isinstance(asset, dict):
            continue
        name, url = asset.get("name"), asset.get("browser_download_url")
        if (asset.get("state") != "uploaded" or not isinstance(name, str)
            or not name.lower().endswith(".apk") or not isinstance(url, str)
            or not url.startswith(prefix)
            or not isinstance(asset.get("size"), int) or asset["size"] <= 0):
            continue
        digest = asset.get("digest", "")
        if not isinstance(digest, str) or not DIGEST.fullmatch(digest):
            continue
        assets.append(asset)
    if asset_name is not None:
        assets = [a for a in assets if a["name"] == asset_name]
    if len(assets) != 1:
        raise ValueError(
            f"Exactly one eligible APK is required; found {len(assets)}. "
            "Specify --asset when a release contains multiple APKs, or publish a valid SHA-256 digest."
        )
    apk = assets[0]
    source_commit = resolve_tag_commit(repo, tag, fetch)
    checked_at = checked_at or datetime.now(timezone.utc).isoformat(timespec="seconds")
    return {
        "schema_version": 1,
        "kind": "NAVIN_STUDIO_APK_REVIEW_PACKET",
        "state": "CANDIDATE_ONLY_NOT_APPROVED",
        "checked_at": checked_at,
        "project_id": project["id"],
        "project_name": project["name"],
        "repository": repo,
        "release_tag": tag,
        "release_url": release.get("html_url"),
        "published_at": release["published_at"],
        "channel_hint": "prerelease" if release.get("prerelease") else "regular",
        "source_commit": source_commit,
        "asset": {
            "name": apk["name"],
            "size_bytes": apk["size"],
            "download_url": apk["browser_download_url"],
            "github_reported_sha256": DIGEST.fullmatch(apk["digest"]).group(1).lower(),
        },
        "required_manual_evidence": {
            "independent_download_sha256": None,
            "apk_signing_certificate_sha256": None,
            "android_package_id": None,
            "install_device_and_result": None,
            "functional_qa_notes": None,
            "reviewed_by": None,
            "owner_publication_approval": False
        },
        "instructions": "Candidate only. Verify actual APK bytes, Android signature/package and device QA; approve exact tag and asset in a reviewed GitHub change. This packet never publishes a download."
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalog", type=Path, default=SITE / "data/projects.json")
    parser.add_argument("--project", required=True, help="Catalog project id")
    parser.add_argument("--tag", required=True, help="Existing published GitHub Release tag")
    parser.add_argument("--asset", help="Exact APK asset name when release has multiple APKs")
    parser.add_argument("--output", type=Path, default=SITE / "reports/release-review-packet.json")
    args = parser.parse_args()
    catalog = json.loads(args.catalog.read_text(encoding="utf-8"))
    packet = prepare_packet(catalog, args.project, args.tag, args.asset)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(packet, indent=2) + "\n", encoding="utf-8")
    print(f"Prepared UNAPPROVED release review packet for {args.project}@{args.tag}; "
          f"asset {packet['asset']['name']}. No repository or website changed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
