#!/usr/bin/env python3
import unittest

from composition_settings_preflight import inspect


class CompositionAudioFadePreflightTests(unittest.TestCase):
    def project(self, clip):
        return {
            'format': '9:16',
            'fps': 30,
            'duration': 12,
            'renderQuality': 'high',
            'clips': [clip],
        }

    def test_valid_fades_fit_inside_clip(self):
        issues = inspect(self.project({
            'id': 'audio-1', 'start': 1, 'duration': 5,
            'fadeIn': 1.5, 'fadeOut': 2,
        }))
        self.assertFalse(any('fade' in issue for issue in issues), issues)

    def test_invalid_fade_values_fail_closed(self):
        for field in ('fadeIn', 'fadeOut'):
            for value in (-0.01, True, '', 'bad', None, float('inf'), float('nan')):
                with self.subTest(field=field, value=value):
                    issues = inspect(self.project({
                        'id': 'audio-1', 'start': 0, 'duration': 5, field: value,
                    }))
                    self.assertTrue(any(field in issue and 'inválido' in issue for issue in issues), issues)

    def test_individual_fade_cannot_exceed_clip_duration(self):
        for field in ('fadeIn', 'fadeOut'):
            issues = inspect(self.project({
                'id': 'audio-1', 'start': 0, 'duration': 5, field: 5.01,
            }))
            self.assertTrue(any(field in issue and 'mayor que su duración' in issue for issue in issues), issues)

    def test_combined_fades_cannot_exceed_clip_duration(self):
        issues = inspect(self.project({
            'id': 'audio-1', 'start': 0, 'duration': 5,
            'fadeIn': 3, 'fadeOut': 2.01,
        }))
        self.assertTrue(any('fades combinados' in issue for issue in issues), issues)

    def test_fades_equal_to_duration_boundary_are_valid(self):
        issues = inspect(self.project({
            'id': 'audio-1', 'start': 0, 'duration': 5,
            'fadeIn': 2, 'fadeOut': 3,
        }))
        self.assertFalse(any('fade' in issue for issue in issues), issues)

    def test_legacy_clip_without_fades_remains_compatible(self):
        self.assertEqual([], inspect(self.project({'id': 'legacy-audio'})))


if __name__ == '__main__':
    unittest.main()
