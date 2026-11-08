#!/usr/bin/env python3
"""Offline safety tests for the CineRelay non-sensitive local-state QA probe."""
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from urllib.error import HTTPError, URLError

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from emulator_smoke import EmulatorError
from local_state_upgrade_probe import (
    APP_PACKAGE, PROBE_FILE, WELCOME_PREF,
    check_installed_version, parse_welcome_version, probe_upgrade_state,
    read_synthetic_probe, read_welcome_version, require_emulator_root,
    retry_upstream,
    validate_state_flow, write_synthetic_probe
)

OLD = "0.2.7"
NEW = "0.2.9"
MARKER = "STUDIO_QA_" + "a" * 40


def preference(version):
    return f"""<?xml version='1.0' encoding='utf-8' standalone='yes' ?>
<map><string name="last_played_version">{version}</string></map>"""


def shell_response(output, argv=None):
    return subprocess.CompletedProcess(argv or [], 0, output, "")


class LocalStateProbeTests(unittest.TestCase):
    def test_exact_app_owned_welcome_preferences(self):
        self.assertEqual(parse_welcome_version(preference(OLD)), OLD)
        self.assertEqual(parse_welcome_version(preference(NEW)), NEW)

    def test_refuse_unrelated_private_data_key(self):
        with self.assertRaises(EmulatorError):
            parse_welcome_version("""<map><string name="access_token">private</string></map>""")

    def test_fail_closed_on_malformed_xml(self):
        with self.assertRaises(EmulatorError):
            parse_welcome_version("<map><string")

    def test_reject_oversized_or_unexpected_content(self):
        with self.assertRaises(EmulatorError):
            parse_welcome_version("x" * 31000)
        with self.assertRaises(EmulatorError):
            parse_welcome_version("<root></root>")

    def test_accept_actual_version_transition_and_synthetic_marker(self):
        validate_state_flow(OLD, NEW, OLD, NEW, MARKER, MARKER)

    def test_reject_missing_before_or_after_app_writes(self):
        for previous, current in ((NEW, NEW), (OLD, OLD)):
            with self.assertRaises(EmulatorError):
                validate_state_flow(previous, current, OLD, NEW, MARKER, MARKER)

    def test_reject_disappeared_synthetic_marker(self):
        with self.assertRaises(EmulatorError):
            validate_state_flow(OLD, NEW, OLD, NEW, MARKER, "lost")

    def test_reject_unvalidated_synthetic_marker_shape(self):
        with self.assertRaises(EmulatorError):
            validate_state_flow(OLD, NEW, OLD, NEW, "secret", "secret")

    def test_refuse_running_on_nonroot_user_device(self):
        def unrooted(args, **kwargs):
            output = "2000" if args[-3:] == ["shell", "id", "-u"] else ""
            return shell_response(output, args)
        with self.assertRaisesRegex(EmulatorError, "rooted disposable emulator"):
            require_emulator_root(run=unrooted)

    def test_allow_rooted_disposable_emulator(self):
        def rooted(args, **kwargs):
            output = "0" if args[-3:] == ["shell", "id", "-u"] else ""
            return shell_response(output, args)
        require_emulator_root(run=rooted)

    def test_welcome_preference_poll_awaits_new_version(self):
        outputs = iter([preference(OLD), preference(OLD), preference(NEW)])
        waits = []
        def fake_adb(args, **kwargs):
            self.assertEqual(args, ["adb", "shell", "cat", WELCOME_PREF])
            return shell_response(next(outputs), args)
        actual = read_welcome_version(run=fake_adb, pause=waits.append,
                                      expected=NEW, attempts=3)
        self.assertEqual(actual, NEW)
        self.assertEqual(waits, [1, 1])

    def test_welcome_preference_wrong_version_fails_closed(self):
        def fake_adb(args, **kwargs):
            return shell_response(preference(OLD), args)
        with self.assertRaisesRegex(EmulatorError, "expected version"):
            read_welcome_version(run=fake_adb, pause=lambda _: None,
                                 expected=NEW, attempts=2)

    def test_real_installed_version_check(self):
        def fake_adb(args, **kwargs):
            self.assertIn("dumpsys", args)
            return shell_response("versionCode=221001 minSdk=26 targetSdk=36", args)
        check_installed_version(APP_PACKAGE, "221001", run=fake_adb)
        with self.assertRaisesRegex(EmulatorError, "does not match"):
            check_installed_version(APP_PACKAGE, "210007", run=fake_adb)

    def test_synthetic_probe_roundtrip_never_reads_session_file(self):
        marker_written = None
        invoked = []
        def fake_adb(args, **kwargs):
            nonlocal marker_written
            invoked.append(args)
            if args[1] == "push":
                marker_written = Path(args[2]).read_text(encoding="ascii").strip()
                self.assertEqual(args[3], PROBE_FILE)
                return shell_response("1 file pushed", args)
            if args[1:] == ["shell", "cat", PROBE_FILE]:
                return shell_response(marker_written, args)
            return shell_response("", args)
        with tempfile.TemporaryDirectory() as folder:
            marker = write_synthetic_probe(Path(folder), run=fake_adb)
        self.assertEqual(marker, marker_written)
        self.assertTrue(marker.startswith("STUDIO_QA_"))
        self.assertFalse(any("cinerelay_session" in " ".join(args) for args in invoked))
        self.assertFalse(any("access_token" in " ".join(args) for args in invoked))

    def test_504_upstream_retries_then_succeeds(self):
        called=[]
        waits=[]
        def task():
            called.append(True)
            if len(called) < 3:
                raise HTTPError("https://api.github.com/", 504, "Gateway Time-out", {}, None)
            return "verified result"
        self.assertEqual(retry_upstream("metadata", task, pause=waits.append), "verified result")
        self.assertEqual(len(called),3)
        self.assertEqual(waits,[1,2])

    def test_401_is_not_retried_or_bypassed(self):
        called=[]
        def task():
            called.append(1)
            raise HTTPError("https://api.github.com/", 401, "Unauthorized", {}, None)
        with self.assertRaisesRegex(EmulatorError,"HTTP 401"):
            retry_upstream("metadata", task, pause=lambda _: None)
        self.assertEqual(len(called),1)

    def test_persistent_gateway_failure_stays_blocked(self):
        called=[]
        def task():
            called.append(1)
            raise HTTPError("https://github.com/", 504, "Gateway Time-out", {}, None)
        with self.assertRaisesRegex(EmulatorError,"APK download unavailable after bounded attempts"):
            retry_upstream("APK download", task, pause=lambda _: None)
        self.assertEqual(len(called),3)

    def test_transient_connection_failure_retries_only_bounded(self):
        count=[0]
        def task():
            count[0] += 1
            if count[0] == 1:
                raise URLError("temporary")
            return "ok"
        self.assertEqual(retry_upstream("metadata", task, pause=lambda _: None), "ok")
        self.assertEqual(count[0],2)

    def test_requires_expected_exact_public_release_pair(self):
        with self.assertRaisesRegex(EmulatorError, "locked"):
            probe_upgrade_state({}, project="cinerelay", old_tag="v0.2.6",
                                new_tag="v0.2.9", apksigner=Path("/not-applicable"),
                                aapt=Path("/not-applicable"),
                                screenshot=Path("/tmp/unused-probe.png"))
        with self.assertRaisesRegex(EmulatorError, "locked"):
            probe_upgrade_state({}, project="frame-one", old_tag="v0.2.7",
                                new_tag="v0.2.9", apksigner=Path("/not-applicable"),
                                aapt=Path("/not-applicable"),
                                screenshot=Path("/tmp/unused-probe.png"))


if __name__ == "__main__":
    unittest.main()
