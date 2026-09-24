#!/usr/bin/env python3
import unittest
from composition_settings_preflight import inspect


class CompositionSettingsPreflightTests(unittest.TestCase):
    def project(self, **changes):
        data = {'format': '9:16', 'fps': 30, 'duration': 45, 'renderQuality': 'high', 'clips': []}
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

    def test_invalid_duration_is_rejected_before_render(self):
        for value in (0, -1, True, '', 'oops', None, float('inf'), float('nan')):
            with self.subTest(value=value):
                self.assertTrue(any('Duración' in issue for issue in inspect(self.project(duration=value))))

    def test_positive_numeric_string_duration_is_supported(self):
        self.assertEqual([], inspect(self.project(duration='12.5')))

    def test_clips_must_be_an_ordered_list_of_objects(self):
        for value in ({}, 'clip', 1, None):
            with self.subTest(value=value):
                self.assertTrue(any('clips' in issue for issue in inspect(self.project(clips=value))))
        for value in ([None], ['clip'], [1], [{'id': 'ok'}, None]):
            with self.subTest(value=value):
                self.assertTrue(any('Clip #' in issue for issue in inspect(self.project(clips=value))))
        self.assertEqual([], inspect(self.project(clips=[{'id': 'ok'}])))

    def test_persisted_clip_id_must_be_usable_when_present(self):
        for value in ('', '   ', None, True, False, [], {}, float('inf'), float('nan')):
            with self.subTest(value=value):
                issues = inspect(self.project(clips=[{'id': value}]))
                self.assertTrue(any('ID inválido' in issue for issue in issues))
        for value in ('clip-1', '  clip-1  ', 0, 7, 1.5):
            with self.subTest(value=value):
                self.assertEqual([], inspect(self.project(clips=[{'id': value}])))
        self.assertEqual([], inspect(self.project(clips=[{}])))

    def test_duplicate_persisted_clip_ids_are_rejected(self):
        issues = inspect(self.project(clips=[{'id': 'clip-1'}, {'id': 'clip-1'}]))
        self.assertTrue(any('ID duplicado' in issue for issue in issues))
        issues = inspect(self.project(clips=[{'id': 7}, {'id': '7'}]))
        self.assertTrue(any('ID duplicado' in issue for issue in issues))
        issues = inspect(self.project(clips=[{'id': ' clip-1 '}, {'id': 'clip-1'}]))
        self.assertTrue(any('ID duplicado' in issue for issue in issues))
        self.assertEqual([], inspect(self.project(clips=[{'id': 'clip-1'}, {'id': 'clip-2'}])))
        self.assertEqual([], inspect(self.project(clips=[{}, {}])))

    def test_persisted_clip_timing_must_be_complete(self):
        for clip in ({'id': 'clip-1', 'start': 1}, {'id': 'clip-1', 'duration': 2}):
            with self.subTest(clip=clip):
                issues = inspect(self.project(clips=[clip]))
                self.assertTrue(any('timing incompleto' in issue for issue in issues))
        self.assertEqual([], inspect(self.project(clips=[{'id': 'clip-1'}])))
        self.assertEqual([], inspect(self.project(clips=[{'id': 'clip-1', 'start': 1, 'duration': 2}])))

    def test_persisted_clip_start_must_be_finite_and_non_negative(self):
        for value in (-1, True, '', 'oops', None, float('inf'), float('nan')):
            with self.subTest(value=value):
                issues = inspect(self.project(clips=[{'id': 'clip-1', 'start': value, 'duration': 1}]))
                self.assertTrue(any('inicio inválido' in issue for issue in issues))
        self.assertEqual([], inspect(self.project(clips=[{'id': 'clip-1', 'start': '0.25', 'duration': 1}])))

    def test_persisted_clip_duration_must_be_finite_and_positive(self):
        for value in (0, -1, True, '', 'oops', None, float('inf'), float('nan')):
            with self.subTest(value=value):
                issues = inspect(self.project(clips=[{'id': 'clip-1', 'start': 0, 'duration': value}]))
                self.assertTrue(any('duración inválida' in issue for issue in issues))
        self.assertEqual([], inspect(self.project(clips=[{'id': 'clip-1', 'start': 0, 'duration': '1.5'}])))

    def test_persisted_clip_track_must_match_editor_tracks(self):
        for value in (-1, 7, 1.5, True, '', 'oops', None, float('inf'), float('nan')):
            with self.subTest(value=value):
                issues = inspect(self.project(clips=[{'id': 'clip-1', 'track': value}]))
                self.assertTrue(any('pista inválida' in issue for issue in issues))
        for value in (0, 6, '3'):
            with self.subTest(value=value):
                self.assertEqual([], inspect(self.project(clips=[{'id': 'clip-1', 'track': value}])))

    def test_persisted_source_offset_must_be_finite_and_non_negative(self):
        for value in (-1, True, '', 'oops', None, float('inf'), float('nan')):
            with self.subTest(value=value):
                issues = inspect(self.project(clips=[{'id': 'clip-1', 'sourceOffset': value}]))
                self.assertTrue(any('sourceOffset inválido' in issue for issue in issues))
        for value in (0, 1.25, '2.5'):
            with self.subTest(value=value):
                self.assertEqual([], inspect(self.project(clips=[{'id': 'clip-1', 'sourceOffset': value}])))

    def test_persisted_playback_speed_matches_preview_contract(self):
        for value in (0, 0.249, 4.001, -1, True, '', 'oops', None, float('inf'), float('nan')):
            with self.subTest(value=value):
                issues = inspect(self.project(clips=[{'id': 'clip-1', 'speed': value}]))
                self.assertTrue(any('velocidad inválida' in issue for issue in issues))
        for value in (0.25, 1, 4, '1.5'):
            with self.subTest(value=value):
                self.assertEqual([], inspect(self.project(clips=[{'id': 'clip-1', 'speed': value}])))
        self.assertEqual([], inspect(self.project(clips=[{'id': 'legacy-without-speed'}])))

    def test_persisted_clip_must_fit_inside_project_render_window(self):
        self.assertEqual([], inspect(self.project(duration=10, clips=[{'id': 'clip-1', 'start': 8, 'duration': 2}])))
        self.assertEqual([], inspect(self.project(duration='10', clips=[{'id': 'clip-1', 'start': '8.5', 'duration': '1.5'}])))
        issues = inspect(self.project(duration=10, clips=[{'id': 'clip-1', 'start': 8, 'duration': 2.01}]))
        self.assertTrue(any('fuera de la duración del proyecto' in issue for issue in issues))

    def test_invalid_quality_fails_instead_of_renderer_coercion(self):
        for value in ('ultra', '', None, 1):
            with self.subTest(value=value):
                self.assertTrue(any('Calidad' in issue for issue in inspect(self.project(renderQuality=value))))


if __name__ == '__main__':
    unittest.main()
