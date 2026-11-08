#!/usr/bin/env python3
"""Offline deterministic tests of the release watch, audit and publisher."""
from __future__ import annotations

import json
from pathlib import Path
import sys
import tempfile
import unittest

TOOLS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(TOOLS))
from release_watch import candidate_report
from verify_release_assets import audit
from build_dist import build

REPO = "rayadinaveen98-ship-it/example"
URL = f"https://github.com/{REPO}/releases/download/v1/example.apk"
DIGEST = "a" * 64
PROJECT = {"id": "demo", "name": "Demo", "repository": REPO,
           "catalog_state": "draft", "published_release_tag": None,
           "approved_download_url": None}
CATALOG = {"schema_version": 1, "projects": [PROJECT]}
RELEASE = {"tag_name": "v1", "draft": False, "prerelease": False,
           "published_at": "2026-11-08T00:00:00Z", "html_url": f"https://github.com/{REPO}/releases/tag/v1",
           "assets": [{"name": "example.apk", "size": 9123, "state": "uploaded",
                       "browser_download_url": URL, "digest": f"sha256:{DIGEST}"}]}


class ReleaseWatchTests(unittest.TestCase):
    def test_published_apk_is_still_unapproved(self):
        result = candidate_report(CATALOG, lambda _: [RELEASE], checked_at="2026-11-08T00:00:00Z")
        rows = result["projects"][0]["candidate_releases"]
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["approval_state"], "NOT_APPROVED")
        self.assertEqual(rows[0]["apk_assets"][0]["status"], "UNVERIFIED")
        self.assertEqual(result["publication_state"], "UNAPPROVED_CANDIDATES_ONLY")

    def test_drafts_ignored(self):
        result = candidate_report(CATALOG, lambda _: [{**RELEASE, "draft": True}], "2026-11-08T00:00:00Z")
        self.assertEqual(result["projects"][0]["candidate_releases"], [])

    def test_api_outage_is_reported_not_invented(self):
        def offline(_):
            raise OSError("No network")
        report = candidate_report(CATALOG, offline, "2026-11-08T00:00:00Z")
        self.assertEqual(report["projects"], [])
        self.assertEqual(len(report["errors"]), 1)


class PublishedAssetTests(unittest.TestCase):
    def setUp(self):
        self.project = {**PROJECT, "catalog_state": "published",
                        "published_release_tag": "v1", "approved_download_url": URL}
        self.row = {"project_id": "demo", "release_tag": "v1",
                    "download_url": URL, "sha256": DIGEST,
                    "approved": True, "qa_passed": True, "signature_checked": True}

    def test_published_exact_asset_passes(self):
        self.assertEqual(audit({"schema_version": 1, "projects": [self.project]},
                               {"schema_version": 1, "published_releases": [self.row]},
                               lambda _: RELEASE), [])

    def test_wrong_checksum_fails_closed(self):
        changed = {**self.row, "sha256": "b" * 64}
        errors = audit({"schema_version": 1, "projects": [self.project]},
                       {"schema_version": 1, "published_releases": [changed]}, lambda _: RELEASE)
        self.assertTrue(any("digest" in error for error in errors), errors)

    def test_unavailable_github_fails_closed(self):
        def offline(_):
            raise OSError("No network")
        errors = audit({"schema_version": 1, "projects": [self.project]},
                       {"schema_version": 1, "published_releases": [self.row]}, offline)
        self.assertTrue(errors)

    def test_no_release_requires_no_network(self):
        self.assertEqual(audit(CATALOG, {"schema_version": 1, "published_releases": []},
                               lambda _: (_ for _ in ()).throw(RuntimeError("should not fetch"))), [])


class BuildTests(unittest.TestCase):
    def test_build_whitelists_files(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            source = root / "src"
            (source / "data").mkdir(parents=True)
            (source / "index.html").write_text("<!doctype html><html><style>h1{}</style><script>1</script></html>")
            (source / "robots.txt").write_text("User-agent: *\nDisallow: /\n")
            (source / "data/projects.json").write_text(json.dumps(CATALOG))
            (source / "data/releases.json").write_text(json.dumps({"schema_version": 1, "published_releases": []}))
            (source / "private-token.txt").write_text("never publish")
            target = root / "dist"
            files = build(source, target)
            self.assertEqual(len(files), 4)
            self.assertFalse((target / "private-token.txt").exists())
            self.assertTrue((target / ".nojekyll").exists())

    def test_external_script_detected(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            source = root / "src"
            (source / "data").mkdir(parents=True)
            (source / "index.html").write_text('<script src="app.js"></script>')
            for name in ("robots.txt",):
                (source / name).write_text("none")
            (source / "data/projects.json").write_text(json.dumps(CATALOG))
            (source / "data/releases.json").write_text(json.dumps({"schema_version": 1, "published_releases": []}))
            with self.assertRaises(ValueError):
                build(source, root / "dist")


if __name__ == "__main__":
    unittest.main()
