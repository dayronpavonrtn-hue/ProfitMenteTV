#!/usr/bin/env python3
import unittest
from composition_settings_preflight import inspect


class ClipBooleanPreflightTests(unittest.TestCase):
    def project(self, clip):
        return {'format': '9:16', 'fps': 30, 'duration': 45, 'renderQuality': 'high', 'clips': [clip]}

    def test_render_switches_require_real_booleans(self):
        for flag in ('muted', 'flipX', 'flipY', 'locked'):
            for value in ('true', 'false', 0, 1, None, [], {}):
                with self.subTest(flag=flag, value=value):
                    issues = inspect(self.project({'id': 'clip-1', flag: value}))
                    self.assertTrue(any(flag in issue and 'true o false' in issue for issue in issues))

    def test_explicit_booleans_pass(self):
        for flag in ('muted', 'flipX', 'flipY', 'locked'):
            for value in (True, False):
                with self.subTest(flag=flag, value=value):
                    self.assertEqual([], inspect(self.project({'id': 'clip-1', flag: value})))

    def test_legacy_clips_without_flags_remain_compatible(self):
        self.assertEqual([], inspect(self.project({'id': 'legacy-clip'})))


if __name__ == '__main__':
    unittest.main()
