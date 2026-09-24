#!/usr/bin/env python3
import unittest

from composition_settings_preflight import inspect


class CompositionAudioPreflightTests(unittest.TestCase):
    def project(self, clip):
        return {
            'format': '9:16',
            'fps': 30,
            'duration': 10,
            'renderQuality': 'high',
            'clips': [clip],
        }

    def test_volume_and_source_volume_accept_editor_range(self):
        for field in ('volume', 'sourceVolume'):
            for value in (0, 0.5, 1, 2, '1.25'):
                with self.subTest(field=field, value=value):
                    issues = inspect(self.project({'id': 'audio-1', field: value}))
                    self.assertFalse(any(field in issue for issue in issues), issues)

    def test_volume_and_source_volume_fail_closed_outside_editor_range(self):
        for field in ('volume', 'sourceVolume'):
            for value in (-0.01, 2.01, True, '', 'loud', None, float('inf'), float('nan')):
                with self.subTest(field=field, value=value):
                    issues = inspect(self.project({'id': 'audio-1', field: value}))
                    self.assertTrue(any(field in issue and 'inválido' in issue for issue in issues), issues)

    def test_legacy_clip_without_gain_fields_remains_compatible(self):
        self.assertEqual([], inspect(self.project({'id': 'legacy-audio'})))


if __name__ == '__main__':
    unittest.main()
