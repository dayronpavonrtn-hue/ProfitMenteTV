#!/usr/bin/env python3
import unittest

from composition_settings_preflight import inspect


class CompositionTrackStatePreflightTests(unittest.TestCase):
    def project(self, **extra):
        project = {
            'format': '9:16',
            'fps': 30,
            'duration': 12,
            'renderQuality': 'high',
            'clips': [],
        }
        project.update(extra)
        return project

    def test_valid_track_state_is_accepted(self):
        issues = inspect(self.project(trackState={
            '4': {'gain': 0.75, 'muted': False, 'solo': True, 'locked': False},
            5: {'gain': '1.25', 'hidden': False},
        }))
        self.assertEqual([], issues)

    def test_state_collection_must_be_object(self):
        for field in ('trackState', 'trackStates'):
            for value in (None, [], 'bad', True):
                with self.subTest(field=field, value=value):
                    issues = inspect(self.project(**{field: value}))
                    self.assertTrue(any(field in issue and 'objeto' in issue for issue in issues), issues)

    def test_track_key_must_be_canonical_range(self):
        for key in ('', 'bad', '-1', '7', '1.5'):
            with self.subTest(key=key):
                issues = inspect(self.project(trackStates={key: {}}))
                self.assertTrue(any('pista inválida' in issue for issue in issues), issues)

    def test_alias_collision_is_rejected(self):
        issues = inspect(self.project(trackStates={'04': {}, '4': {}}))
        self.assertTrue(any('aliases duplicados' in issue for issue in issues), issues)

    def test_track_state_value_must_be_object(self):
        issues = inspect(self.project(trackState={'4': []}))
        self.assertTrue(any('objeto de estado válido' in issue for issue in issues), issues)

    def test_gain_uses_same_zero_to_two_contract_as_audio_engine(self):
        for value in (-0.01, 2.01, True, '', 'bad', None, float('inf'), float('nan')):
            with self.subTest(value=value):
                issues = inspect(self.project(trackState={'4': {'gain': value}}))
                self.assertTrue(any('gain inválido' in issue for issue in issues), issues)
        for value in (0, 0.5, 2, '1.25'):
            with self.subTest(valid=value):
                issues = inspect(self.project(trackState={'4': {'gain': value}}))
                self.assertFalse(any('gain inválido' in issue for issue in issues), issues)

    def test_flags_are_strict_booleans(self):
        for flag in ('hidden', 'muted', 'solo', 'locked'):
            for value in (0, 1, 'true', None, [], {}):
                with self.subTest(flag=flag, value=value):
                    issues = inspect(self.project(trackState={'4': {flag: value}}))
                    self.assertTrue(any(flag in issue and 'true o false' in issue for issue in issues), issues)

    def test_legacy_project_without_track_state_remains_compatible(self):
        self.assertEqual([], inspect(self.project()))


if __name__ == '__main__':
    unittest.main()
