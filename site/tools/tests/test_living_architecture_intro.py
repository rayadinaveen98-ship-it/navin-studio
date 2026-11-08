"""Regression tests for the approved 5-second NAVIN STUDIO V3 opening."""
from html.parser import HTMLParser
from pathlib import Path
import json
import re
import shutil
import subprocess
import tempfile
import unittest

SITE = Path(__file__).resolve().parents[2]
INTRO = SITE / "intro" / "living-architecture-v3.html"
APP = SITE / "src" / "app.js"
STYLES = SITE / "src" / "styles.css"
TEMPLATE = SITE / "template.html"
PUBLIC_BUNDLE = SITE / "tools" / "build_dist.py"


class DivBalance(HTMLParser):
    def __init__(self):
        super().__init__()
        self.depth = 0
        self.minimum = 0

    def handle_starttag(self, tag, attrs):
        if tag == "div":
            self.depth += 1

    def handle_endtag(self, tag):
        if tag == "div":
            self.depth -= 1
            self.minimum = min(self.minimum, self.depth)


class LivingArchitectureTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = INTRO.read_text(encoding="utf-8")
        cls.app = APP.read_text(encoding="utf-8")
        cls.template = TEMPLATE.read_text(encoding="utf-8")
        cls.style = STYLES.read_text(encoding="utf-8")

    def test_approved_v3_is_exactly_five_seconds(self):
        self.assertIn("duration=5000", self.html)
        self.assertIn("function drawAtmosphere", self.html)
        self.assertIn("function animateVault", self.html)
        self.assertIn("function render(ms)", self.html)

    def test_intro_has_all_original_art_and_brand_layers(self):
        for label in ("id=\"introCanvas\"", "id=\"vaultWorld\"",
                      "id=\"worldFilm\"", "id=\"worldSystem\"",
                      "id=\"identStack\"", "id=\"identName\"",
                      "id=\"eclipseHalo\"", "id=\"markHalo\"",
                      "ONE UNIVERSE. MANY CREATIONS."):
            self.assertIn(label, self.html)

    def test_approved_visual_is_not_the_prototype_homepage(self):
        body = self.html.split("<body>", 1)[1].split("<script>", 1)[0]
        self.assertNotIn("class=\"website\"", body)
        self.assertNotIn("class=\"prototool\"", body)
        self.assertNotIn("id=\"scrub\"", body)
        script = self.html.split("<script>", 1)[1]
        self.assertNotIn("$('skipBtn')", script)
        self.assertNotIn("$('scrub')", script)
        self.assertNotIn("set(website", script)
        self.assertNotIn("PREVIEW · NOT LIVE", body)

    def test_intro_dom_divs_are_balanced(self):
        p = DivBalance()
        p.feed(self.html)
        self.assertEqual(p.minimum, 0)
        self.assertEqual(p.depth, 0)

    def test_animation_only_reports_to_same_origin_parent(self):
        self.assertIn("NAVIN_STUDIO_INTRO_READY", self.html)
        self.assertIn("NAVIN_STUDIO_INTRO_FINISHED", self.html)
        self.assertIn("e.origin!==location.origin", self.html)
        self.assertIn("e.source!==parent", self.html)

    def test_parent_skip_replay_focus_and_failopen(self):
        for label in ('id="studio-intro-shell"', 'id="studio-intro-frame"',
                      'id="studio-intro-skip"', 'id="studio-replay-intro"',
                      'aria-modal="true"', 'hidden role="dialog"'):
            self.assertIn(label, self.template)
        for label in ("studioIdent.start(false)",
                      "prefers-reduced-motion: reduce", "6200", 
                      "element.inert = true", "studio-intro-active",
                      "event.source !== iframe.contentWindow"):
            self.assertIn(label, self.app)
        self.assertIn("studio-intro-shell[hidden]", self.style)

    def test_included_in_explicit_pages_public_allowlist(self):
        self.assertIn('"intro/living-architecture-v3.html"', PUBLIC_BUNDLE.read_text(encoding="utf-8"))

    def test_offline_and_no_publication(self):
        self.assertNotIn("<script src=", self.html)
        self.assertNotIn('<link rel="stylesheet"', self.html)
        self.assertNotIn("https://", self.html)
        self.assertEqual(json.loads((SITE / "data" / "releases.json").read_text())["published_releases"], [])

    def test_standalone_intro_javascript_parses(self):
        if not shutil.which("node"):
            self.skipTest("Node unavailable in local test environment")
        scripts = re.findall(r"<script>(.*?)</script>", self.html, flags=re.S)
        self.assertEqual(len(scripts), 1)
        with tempfile.TemporaryDirectory() as tmp:
            script = Path(tmp) / "studio-intro.js"
            script.write_text(scripts[0], encoding="utf-8")
            proc = subprocess.run(["node", "--check", str(script)], capture_output=True, text=True)
            self.assertEqual(proc.returncode, 0, proc.stderr)


if __name__ == "__main__":
    unittest.main()
