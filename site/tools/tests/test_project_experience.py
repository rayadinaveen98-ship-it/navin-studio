"""Regressions for M3 editorial project pages: presentation, deep links and release safety."""
from pathlib import Path
import json
import re
import shutil
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[2]


class ProjectExperienceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.story = (ROOT / "src/project_experience.js").read_text(encoding="utf-8")
        cls.app = (ROOT / "src/app.js").read_text(encoding="utf-8")
        cls.css = (ROOT / "src/project_experience.css").read_text(encoding="utf-8")
        cls.template = (ROOT / "template.html").read_text(encoding="utf-8")
        cls.catalog = json.loads((ROOT / "data/projects.json").read_text(encoding="utf-8"))
        cls.releases = json.loads((ROOT / "data/releases.json").read_text(encoding="utf-8"))

    def test_all_eight_catalog_projects_have_editorial_briefs(self):
        for p in self.catalog["projects"]:
            self.assertIn("'"+p["id"]+"': {", self.story)
        self.assertEqual(len(self.catalog["projects"]), 8)

    def test_project_pages_are_not_release_claims(self):
        self.assertIn("NOT A PRODUCT RELEASE", self.story)
        self.assertIn("creative focus areas, not promises of shipped features", self.story)
        self.assertIn("No studio-approved public download or demo", self.story)
        self.assertNotIn("Download APK", self.story)
        self.assertNotIn("fake progress", self.story.lower())
        self.assertEqual(self.releases["published_releases"], [])

    def test_public_links_only_come_from_validated_project_catalog(self):
        self.assertIn("esc(project.repo)", self.story)
        self.assertIn("project.approvedDownloadUrl && project.publishedReleaseTag", self.story)
        self.assertNotIn("https://", self.story)
        self.assertIn("noopener noreferrer", self.story)

    def test_usable_deep_link_and_semantic_heading(self):
        self.assertIn("projectRouteMatch(route)", self.app)
        self.assertIn("showRoute(location.hash.slice(1))", self.app)
        self.assertIn("function projectRouteMatch(route)", self.story)
        self.assertIn('id="project-story-title"', self.story)
        self.assertIn('data-copy-project=', self.story)
        self.assertIn("navigator.clipboard?.writeText", self.story)

    def test_project_view_integrates_existing_public_site(self):
        self.assertIn('data-view="project"', self.template)
        self.assertIn('id="project-experience-content"', self.template)
        self.assertIn('class="project-experience"', self.template)
        self.assertIn('data-project', self.app)
        self.assertIn('data-search-project', self.app)

    def test_mobile_and_motion_safety_styles(self):
        self.assertIn("@media(max-width:750px)", self.css)
        self.assertIn("@media(max-width:440px)", self.css)
        self.assertIn("@media(prefers-reduced-motion:reduce)", self.css)

    def test_separate_private_admin_boundary(self):
        self.assertNotIn("supabase", self.story.lower())
        self.assertNotIn("adminToken", self.story)
        self.assertNotIn("github_pat", self.story.lower())
        self.assertNotIn("PRIVATE_KEY", self.story)

    def test_story_script_parses_in_node(self):
        if not shutil.which("node"):
            self.skipTest("node is absent")
        result=subprocess.run(["node","--check",str(ROOT / "src/project_experience.js")],
                              capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stderr)


if __name__ == "__main__":
    unittest.main()
