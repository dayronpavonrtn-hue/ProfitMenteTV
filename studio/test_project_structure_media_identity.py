#!/usr/bin/env python3
"""Regression coverage for bundle-boundary media identity collisions."""
import unittest

from project_structure_preflight import inspect


class ProjectStructureMediaIdentityTests(unittest.TestCase):
    def project(self, ids):
        return {
            'clips': [],
            'assets': [
                {'id': value, 'name': f'asset-{index}.mp4'}
                for index, value in enumerate(ids)
            ],
        }

    def assert_ambiguous(self, ids):
        issues = inspect(self.project(ids))
        self.assertTrue(
            any('duplicado o ambiguo' in issue for issue in issues),
            f'expected canonical collision for {ids!r}, got {issues!r}',
        )

    def test_numeric_spellings_collide_like_browser_identity(self):
        for ids in ([1, 1.0], [1, '1.0'], ['01', 1], ['+1', '1']):
            with self.subTest(ids=ids):
                self.assert_ambiguous(ids)

    def test_fractional_string_spellings_canonicalize(self):
        self.assert_ambiguous(['1.50', '1.5'])

    def test_distinct_text_ids_remain_distinct(self):
        self.assertEqual([], inspect(self.project(['media-01', 'media-1'])))

    def test_unsafe_numeric_ids_fail_before_normalization(self):
        for value in (True, False, None, 1.5):
            with self.subTest(value=value):
                issues = inspect(self.project([value]))
                self.assertTrue(any('id inválido' in issue for issue in issues), issues)


if __name__ == '__main__':
    unittest.main()
