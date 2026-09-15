#!/usr/bin/env python3
import unittest
from composition_settings_preflight import inspect


class CompositionSettingsPreflightTests(unittest.TestCase):
    def project(self, **changes):
        data = {'format': '9:16', 'fps': 30, 'renderQuality': 'high'}
        data.update(changes)
        return data

    def test_supported_settings_pass(self):
        for fmt in ('9:16', '16:9', '1:1'):
            for fps in (24, 30, 60):
                for quality in ('draft', 'standard', 'high'):
                    self.assertEqual([], inspect(self.project(format=fmt, fps=fps, renderQuality=quality)))

    def test_defaults_match_renderer(self):
        self.assertEqual([], inspect({}))

    def test_invalid_format_fails_instead_of_silent_square_fallback(self):
        for value in ('vertical', '4:3', '', None, 916):
            with self.subTest(value=value):
                self.assertTrue(any('Formato' in issue for issue in inspect(self.project(format=value))))

    def test_invalid_fps_fails_instead_of_silent_30fps_fallback(self):
        for value in (25, 29.97, 120, 0, True, '', 'oops', None):
            with self.subTest(value=value):
                self.assertTrue(any('FPS' in issue for issue in inspect(self.project(fps=value))))

    def test_numeric_string_fps_is_unambiguous(self):
        self.assertEqual([], inspect(self.project(fps='60')))

    def test_invalid_quality_fails_instead_of_renderer_coercion(self):
        for value in ('ultra', '', None, 1):
            with self.subTest(value=value):
                self.assertTrue(any('Calidad' in issue for issue in inspect(self.project(renderQuality=value))))


if __name__ == '__main__':
    unittest.main()
