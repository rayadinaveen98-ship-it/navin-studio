#!/usr/bin/env python3
"""Read published GitHub Releases as review CANDIDATES, never as approved downloads.

No private repository access is required. This tool has no GitHub write operations.
A scheduled Action can attach the JSON report for the owner to review.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

SITE = Path(__file__).resolve().parents[1]
REPO_RE = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")


def github_json(url: str):
    """Fetch only GitHub's known public API hostname; timeout and cap bytes."""
    if not url.startswith("https://api.github.com/repos/"):
        raise ValueError("Only the public GitHub repository API is allowed")
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "navin-studio-public-release-watch/0.1",
    }
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = Request(url, headers=headers)
    with urlopen(request, timeout=15) as response:
        raw = response.read(2_000_001)
        if len(raw) > 2_000_000:
            raise ValueError("GitHub API response exceeded size limit")
        return json.loads(raw)


def candidate_report(catalog: dict, fetch=github_json, checked_at: str | None = None) -> dict:
    """Pure transformation apart from injected GET function. No approval is possible."""
    if catalog.get("schema_version") != 1 or not isinstance(catalog.get("projects"), list):
        raise ValueError("Invalid project catalog")
    checked_at = checked_at or datetime.now(timezone.utc).isoformat(timespec="seconds")
    report = {"schema_version": 1, "checked_at": checked_at,
              "publication_state": "UNAPPROVED_CANDIDATES_ONLY",
              "note": "This report cannot authorize or publish a release. Asset hashes, signatures, QA and owner approval must be verified independently.",
              "projects": [], "errors": []}
    visited = set()
    for project in catalog["projects"]:
        repo = project.get("repository", "")
        if project.get("catalog_state") == "archived":
            continue
        if not isinstance(repo, str) or not REPO_RE.fullmatch(repo):
            report["errors"].append({"project_id": project.get("id"), "reason": "Invalid repository identifier"})
            continue
        if repo in visited:
            continue
        visited.add(repo)
        endpoint = f"https://api.github.com/repos/{repo}/releases?per_page=10"
        try:
            published = fetch(endpoint)
            if not isinstance(published, list):
                raise ValueError("Expected a GitHub Releases array")
        except (HTTPError, URLError, OSError, ValueError, TimeoutError) as error:
            reason = "GitHub API could not be read"
            if isinstance(error, HTTPError):
                reason += f" (HTTP {error.code})"
            report["errors"].append({"project_id": project.get("id"), "repository": repo, "reason": reason})
            continue
        versions = []
        for release in published:
            if not isinstance(release, dict) or release.get("draft") or not release.get("published_at"):
                continue
            tag = release.get("tag_name")
            if not isinstance(tag, str) or not tag.strip():
                continue
            assets = []
            for asset in release.get("assets", []):
                if not isinstance(asset, dict) or asset.get("state") != "uploaded":
                    continue
                name = asset.get("name", "")
                download_url = asset.get("browser_download_url", "")
                if not isinstance(name, str) or not name.lower().endswith(".apk"):
                    continue
                if not isinstance(download_url, str) or not download_url.startswith(f"https://github.com/{repo}/releases/download/"):
                    continue
                assets.append({"name": name, "bytes": asset.get("size"),
                               "github_digest": asset.get("digest"), "source_url": download_url,
                               "status": "UNVERIFIED"})
            if assets:
                versions.append({"tag": tag, "published_at": release["published_at"],
                                 "channel_hint": "prerelease" if release.get("prerelease") else "regular",
                                 "github_release_url": release.get("html_url"),
                                 "apk_assets": assets, "approval_state": "NOT_APPROVED"})
        report["projects"].append({"project_id": project.get("id"),
                                   "repository": repo, "candidate_releases": versions})
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalog", type=Path, default=SITE / "data/projects.json")
    parser.add_argument("--output", type=Path, default=SITE / "reports/release-candidates.json")
    args = parser.parse_args()
    catalog = json.loads(args.catalog.read_text(encoding="utf-8"))
    report = candidate_report(catalog)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    count = sum(len(project["candidate_releases"]) for project in report["projects"])
    print(f"Read-only scan finished: {count} GitHub releases containing APK candidates across "
          f"{len(report['projects'])} source repositories; {len(report['errors'])} API errors. "
          "No publishing or catalog changes performed.")
    return 1 if report["errors"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
