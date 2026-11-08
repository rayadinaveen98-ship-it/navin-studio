#!/usr/bin/env python3
"""Fast, offline tests; no Android emulator/network needed."""
import subprocess
import sys
from pathlib import Path
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from emulator_smoke import (EmulatorError, launched_monkey, package_crashed, screen_png, PNG_MAGIC)


class EmulatorSmokeTests(unittest.TestCase):
    def test_one_launcher_event_was_injected(self):
        self.assertTrue(launched_monkey(":Monkey: seed=12\nEvents injected: 1\n"))

    def test_zero_launcher_events_is_not_success(self):
        self.assertFalse(launched_monkey("Events injected: 0\n"))
        self.assertFalse(launched_monkey("monkey did not start"))

    def test_other_app_crash_is_not_ours(self):
        self.assertFalse(package_crashed("FATAL EXCEPTION\nProcess: com.other.app\n",
                                         "com.cinerelay.app"))

    def test_app_crash_is_flagged(self):
        self.assertTrue(package_crashed(
            "FATAL EXCEPTION: main\nProcess: com.cinerelay.app, PID: 1234\n",
            "com.cinerelay.app"))

    def test_valid_screenshot_bytes_only(self):
        def runner(args, **kwargs):
            return subprocess.CompletedProcess(args, 0, PNG_MAGIC + b"fakePNG", b"")
        self.assertTrue(screen_png(runner).startswith(PNG_MAGIC))

    def test_no_screenshot_is_blocked(self):
        def runner(args, **kwargs):
            return subprocess.CompletedProcess(args, 0, b"text", b"")
        with self.assertRaises(EmulatorError):
            screen_png(runner)


if __name__ == "__main__":
    unittest.main()
