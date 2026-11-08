#!/usr/bin/env python3
"""Offline tests for private-data-safe, pre-auth Android UI inspection."""
from __future__ import annotations

from pathlib import Path
import subprocess
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from auth_entry_smoke import EmulatorError, find_label, parse_hierarchy, tap_center, wait_for_labels

PKG = "com.cinerelay.app"


def xml(*parts):
    nodes = []
    for package, label, bounds, kind in parts:
        key = "text" if kind == "text" else "content-desc"
        nodes.append(f'<node index="0" package="{package}" {key}="{label}" bounds="{bounds}"/>')
    return '<?xml version="1.0"?><hierarchy rotation="0">' + "".join(nodes) + '</hierarchy>'


WELCOME = xml(
    (PKG, "Sign in", "[30,100][360,170]", "text"),
    (PKG, "Create account", "[30,180][360,250]", "text"),
)
SIGNIN = xml(
    (PKG, "Welcome back", "[20,30][350,85]", "text"),
    (PKG, "Email", "[20,100][350,160]", "text"),
    (PKG, "Password", "[20,200][350,260]", "text"),
    (PKG, "Back", "[10,10][60,60]", "desc"),
)


class AuthEntrySmokeTests(unittest.TestCase):
    def test_welcome_has_exact_controls(self):
        root = parse_hierarchy(WELCOME)
        self.assertIsNotNone(find_label(root, "Sign in"))
        self.assertIsNotNone(find_label(root, "Create account"))

    def test_forms_have_required_blank_entry_labels(self):
        root = parse_hierarchy(SIGNIN)
        for label in ("Welcome back", "Email", "Password", "Back"):
            self.assertIsNotNone(find_label(root, label))

    def test_back_accessibility_content_description(self):
        root = parse_hierarchy(SIGNIN)
        self.assertEqual(find_label(root, "Back").attrib.get("content-desc"), "Back")

    def test_unrelated_app_controls_never_used(self):
        tree = xml(
            (PKG, "Sign in", "[30,100][360,170]", "text"),
            ("com.fake", "Create account", "[30,180][360,250]", "text"),
        )
        self.assertIsNone(find_label(parse_hierarchy(tree), "Create account"))

    def test_garbage_xml_fails_closed(self):
        with self.assertRaises(EmulatorError):
            parse_hierarchy('<hierarchy><node package="com.cinerelay.app"')

    def test_anr_system_dialog_blocks(self):
        tree = xml(
            (PKG, "Sign in", "[30,100][360,170]", "text"),
            ("android", "Pixel Launcher isn't responding", "[30,180][360,250]", "text"),
        )
        with self.assertRaises(EmulatorError):
            parse_hierarchy(tree)

    def test_no_app_window_blocks(self):
        with self.assertRaises(EmulatorError):
            parse_hierarchy(xml(("android", "Allow", "[0,0][50,50]", "text")))

    def test_unbounded_hierarchy_blocks(self):
        with self.assertRaises(EmulatorError):
            parse_hierarchy(WELCOME + " " * 2_000_001)

    def test_tap_hits_middle_of_accessible_label(self):
        calls = []
        def runner(args, **kwargs):
            calls.append(args)
            return subprocess.CompletedProcess(args, 0, "", "")
        node = find_label(parse_hierarchy(WELCOME), "Sign in")
        center = tap_center(node, run=runner)
        self.assertEqual(center, (195, 135))
        self.assertEqual(calls[0], ["adb", "shell", "input", "tap", "195", "135"])

    def test_tap_rejects_bad_coordinates(self):
        root = parse_hierarchy(xml((PKG, "Sign in", "[300,170][30,100]", "text")))
        with self.assertRaises(EmulatorError):
            tap_center(find_label(root, "Sign in"))

    def test_wait_rejects_no_labels(self):
        with self.assertRaises(ValueError):
            wait_for_labels(())

    def test_wrong_package_in_forged_xml_does_not_pass(self):
        root = parse_hierarchy(xml((PKG, "Sign in", "[0,0][80,50]", "text"),
                                   ("other.package", "Password", "[0,50][80,120]", "text")))
        self.assertIsNone(find_label(root, "Password"))


if __name__ == "__main__":
    unittest.main()
