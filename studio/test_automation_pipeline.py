"""Regression tests for the local-only ProfitMente Studio automation pipeline."""
from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

import automation_pipeline as pipeline


class AutomationPipelineTests(unittest.TestCase):
    def test_success_chains_preflight_render_and_release_without_publishing(self):
        calls = []

        def gate(inputs, *, manifest_path):
            calls.append(("gate", list(inputs), Path(manifest_path)))
            return {"ok": True, "manifest_path": str(manifest_path)}

        def render(manifest_path, output_dir):
            calls.append(("render", Path(manifest_path), Path(output_dir)))
            return {"ok": True, "outputs": [str(Path(output_dir) / "video.mp4")]}

        def release(rendered, quarantine_dir):
            calls.append(("release", rendered, Path(quarantine_dir)))
            return {"ok": True, "release_files": ["video.mp4"]}

        with tempfile.TemporaryDirectory() as tmp:
            report = pipeline.run_pipeline(
                ["project.json"], tmp,
                gate_runner=gate,
                render_runner=render,
                release_runner=release,
            )

        self.assertTrue(report["ok"])
        self.assertEqual(report["stage"], "complete")
        self.assertEqual(report["release_files"], ["video.mp4"])
        self.assertIs(report["published"], False)
        self.assertEqual([entry[0] for entry in calls], ["gate", "render", "release"])

    def test_preflight_failure_stops_before_render(self):
        def gate(inputs, *, manifest_path):
            return {"ok": False, "blocked": ["missing media"]}

        def forbidden(*args, **kwargs):
            self.fail("render/release must not run after failed preflight")

        with tempfile.TemporaryDirectory() as tmp:
            report = pipeline.run_pipeline(
                ["bad.json"], tmp,
                gate_runner=gate,
                render_runner=forbidden,
                release_runner=forbidden,
            )

        self.assertFalse(report["ok"])
        self.assertEqual(report["stage"], "preflight")
        self.assertEqual(report["release_files"], [])

    def test_render_failure_stops_before_release(self):
        def gate(inputs, *, manifest_path):
            return {"ok": True}

        def render(manifest_path, output_dir):
            return {"ok": False, "failed": [{"error": "ffmpeg failed"}]}

        def forbidden(*args, **kwargs):
            self.fail("release must not run after failed render")

        with tempfile.TemporaryDirectory() as tmp:
            report = pipeline.run_pipeline(
                ["project.json"], tmp,
                gate_runner=gate,
                render_runner=render,
                release_runner=forbidden,
            )

        self.assertFalse(report["ok"])
        self.assertEqual(report["stage"], "render")
        self.assertEqual(report["release_files"], [])

    def test_failed_post_render_qc_never_marks_output_releasable(self):
        def gate(inputs, *, manifest_path):
            return {"ok": True}

        def render(manifest_path, output_dir):
            return {"ok": True, "outputs": ["candidate.mp4"]}

        def release(rendered, quarantine_dir):
            return {"ok": False, "release_files": [], "quarantined": ["candidate.mp4"]}

        with tempfile.TemporaryDirectory() as tmp:
            report = pipeline.run_pipeline(
                ["project.json"], tmp,
                gate_runner=gate,
                render_runner=render,
                release_runner=release,
            )

        self.assertFalse(report["ok"])
        self.assertEqual(report["stage"], "quality_control")
        self.assertEqual(report["release_files"], [])
        self.assertIs(report["published"], False)


if __name__ == "__main__":
    unittest.main()
