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
from release_review import prepare_packet
from release_source import resolve_tag_commit

REPO = "rayadinaveen98-ship-it/example"
URL = f"https://github.com/{REPO}/releases/download/v1/example.apk"
DIGEST = "a" * 64
SOURCE_SHA = "c" * 40
PROJECT = {"id": "demo", "name": "Demo", "repository": REPO,
           "catalog_state": "draft", "published_release_tag": None,
           "approved_download_url": None}
CATALOG = {"schema_version": 1, "projects": [PROJECT]}
RELEASE = {"tag_name": "v1", "draft": False, "prerelease": False,
           "published_at": "2026-11-08T00:00:00Z", "html_url": f"https://github.com/{REPO}/releases/tag/v1",
           "assets": [{"id": 78945612, "name": "example.apk", "size": 9123, "state": "uploaded",
                       "browser_download_url": URL, "digest": f"sha256:{DIGEST}"}]}


def public_release_fetch(url):
    if "/releases/tags/v1" in url:
        return RELEASE
    if "/git/ref/tags/v1" in url:
        return {"ref": "refs/tags/v1", "object": {"type": "commit", "sha": SOURCE_SHA}}
    raise AssertionError("Unexpected GitHub endpoint " + url)


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
                    "source_commit": SOURCE_SHA,
                    "approved": True, "qa_passed": True, "signature_checked": True}

    def test_published_exact_asset_passes(self):
        self.assertEqual(audit({"schema_version": 1, "projects": [self.project]},
                               {"schema_version": 1, "published_releases": [self.row]},
                               public_release_fetch), [])

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


class ProvenanceAndPacketTests(unittest.TestCase):
    def test_lightweight_tag_resolves(self):
        self.assertEqual(resolve_tag_commit(REPO, "v1", public_release_fetch), SOURCE_SHA)

    def test_annotated_tag_resolves(self):
        tag_sha = "d" * 40
        def fetch(url):
            if "/git/ref/tags/v1" in url:
                return {"ref": "refs/tags/v1", "object": {"type": "tag", "sha": tag_sha}}
            if "/git/tags/" in url:
                return {"sha": tag_sha, "object": {"type": "commit", "sha": SOURCE_SHA}}
            raise AssertionError(url)
        self.assertEqual(resolve_tag_commit(REPO, "v1", fetch), SOURCE_SHA)

    def test_tag_url_refuses_untrusted_identifiers(self):
        for tag in ("../secret", "v1/bad", "%2F", ""):
            with self.assertRaises(ValueError):
                resolve_tag_commit(REPO, tag, public_release_fetch)

    def test_review_packet_retains_exact_published_apk_asset_id(self):
        packet = prepare_packet(CATALOG, "demo", "v1", fetch=public_release_fetch)
        self.assertEqual(packet["asset"]["asset_id"], 78945612)
        self.assertEqual(packet["asset"]["github_reported_sha256"], DIGEST)
        self.assertFalse(packet["required_manual_evidence"]["owner_publication_approval"])

    def test_packet_includes_provenance_but_no_approval(self):
        packet = prepare_packet(CATALOG, "demo", "v1", fetch=public_release_fetch,
                                checked_at="2026-11-08T00:00:00Z")
        self.assertEqual(packet["state"], "CANDIDATE_ONLY_NOT_APPROVED")
        self.assertEqual(packet["source_commit"], SOURCE_SHA)
        self.assertEqual(packet["asset"]["github_reported_sha256"], DIGEST)
        self.assertFalse(packet["required_manual_evidence"]["owner_publication_approval"])

    def test_packet_rejects_missing_digest(self):
        def fetch(url):
            if "/releases/tags/" in url:
                return {**RELEASE, "assets": [{**RELEASE["assets"][0], "digest": None}]}
            return public_release_fetch(url)
        with self.assertRaises(ValueError):
            prepare_packet(CATALOG, "demo", "v1", fetch=fetch)

    def test_packet_requires_exact_asset_if_ambiguous(self):
        double = {**RELEASE, "assets": RELEASE["assets"] + [
            {**RELEASE["assets"][0], "name": "another.apk",
             "browser_download_url": URL.replace("example.apk", "another.apk")} ]}
        def fetch(url):
            return double if "/releases/tags/" in url else public_release_fetch(url)
        with self.assertRaises(ValueError):
            prepare_packet(CATALOG, "demo", "v1", fetch=fetch)
        selected = prepare_packet(CATALOG, "demo", "v1", asset_name="example.apk", fetch=fetch)
        self.assertEqual(selected["asset"]["name"], "example.apk")

    def test_packet_never_approves_a_draft(self):
        def fetch(url):
            return {**RELEASE, "draft": True} if "/releases/tags/" in url else public_release_fetch(url)
        with self.assertRaises(ValueError):
            prepare_packet(CATALOG, "demo", "v1", fetch=fetch)

    def test_publication_audit_rejects_tag_mismatch(self):
        project = {**PROJECT, "catalog_state": "published",
                   "published_release_tag": "v1", "approved_download_url": URL}
        row = {"project_id": "demo", "release_tag": "v1", "download_url": URL,
               "sha256": DIGEST, "source_commit": "e" * 40,
               "approved": True, "qa_passed": True, "signature_checked": True}
        errors = audit({"schema_version": 1, "projects": [project]},
                       {"schema_version": 1, "published_releases": [row]}, public_release_fetch)
        self.assertTrue(any("source commit" in error for error in errors), errors)


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
            (source / "intro").mkdir()
            (source / "intro/living-architecture-v3.html").write_text("<!doctype html><title>Approved V3 cinematic intro</title>")
            (source / "private-token.txt").write_text("never publish")
            target = root / "dist"
            files = build(source, target)
            self.assertEqual(len(files), 5)
            self.assertTrue((target / "intro/living-architecture-v3.html").is_file())
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
