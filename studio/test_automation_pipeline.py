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
            report = pipeline.run_pipeline(["project.json"], tmp, gate_runner=gate, render_runner=render, release_runner=release)
            self.assertFalse((Path(tmp) / pipeline._LOCK_NAME).exists())

        self.assertTrue(report["ok"])
        self.assertEqual(report["stage"], "complete")
        self.assertEqual(report["release_files"], ["video.mp4"])
        self.assertIs(report["published"], False)
        self.assertEqual([entry[0] for entry in calls], ["gate", "render", "release"])

    def test_workspace_is_cleaned_before_new_run(self):
        with tempfile.TemporaryDirectory() as tmp:
            work = Path(tmp)
            (work / "render-manifest.json").write_text("stale", encoding="utf-8")
            (work / "renders").mkdir()
            (work / "renders" / "old.mp4").write_bytes(b"old")
            (work / "quarantine").mkdir()
            (work / "quarantine" / "old.mp4").write_bytes(b"old")

            def gate(inputs, *, manifest_path):
                self.assertFalse(Path(manifest_path).exists())
                self.assertEqual(list((work / "renders").iterdir()), [])
                self.assertEqual(list((work / "quarantine").iterdir()), [])
                return {"ok": False, "blocked": ["expected stop"]}

            report = pipeline.run_pipeline(["project.json"], work, gate_runner=gate)

        self.assertFalse(report["ok"])
        self.assertEqual(report["stage"], "preflight")
        self.assertIs(report["published"], False)

    def test_workspace_lock_blocks_concurrent_run_before_cleanup(self):
        with tempfile.TemporaryDirectory() as tmp:
            work = Path(tmp)
            (work / "renders").mkdir()
            sentinel = work / "renders" / "active.mp4"
            sentinel.write_bytes(b"active")
            lock = pipeline._acquire_workspace_lock(work)
            try:
                report = pipeline.run_pipeline(["project.json"], work)
                self.assertTrue(sentinel.exists())
            finally:
                pipeline._release_workspace_lock(lock)

        self.assertFalse(report["ok"])
        self.assertEqual(report["stage"], "workspace")
        self.assertIn("already in use", report["error"])
        self.assertEqual(report["release_files"], [])
        self.assertIs(report["published"], False)

    def test_workspace_lock_is_released_after_pipeline_exception(self):
        def exploding_gate(inputs, *, manifest_path):
            raise RuntimeError("gate exploded")

        with tempfile.TemporaryDirectory() as tmp:
            work = Path(tmp)
            report = pipeline.run_pipeline(["project.json"], work, gate_runner=exploding_gate)
            self.assertFalse((work / pipeline._LOCK_NAME).exists())
            lock = pipeline._acquire_workspace_lock(work)
            pipeline._release_workspace_lock(lock)

        self.assertFalse(report["ok"])
        self.assertEqual(report["stage"], "preflight")

    def test_preflight_failure_stops_before_render(self):
        def gate(inputs, *, manifest_path):
            return {"ok": False, "blocked": ["missing media"]}

        def forbidden(*args, **kwargs):
            self.fail("render/release must not run after failed preflight")

        with tempfile.TemporaryDirectory() as tmp:
            report = pipeline.run_pipeline(["bad.json"], tmp, gate_runner=gate, render_runner=forbidden, release_runner=forbidden)

        self.assertFalse(report["ok"])
        self.assertEqual(report["stage"], "preflight")
        self.assertEqual(report["release_files"], [])
        self.assertIs(report["published"], False)

    def test_render_failure_stops_before_release(self):
        def gate(inputs, *, manifest_path):
            return {"ok": True}

        def render(manifest_path, output_dir):
            return {"ok": False, "failed": [{"error": "ffmpeg failed"}]}

        def forbidden(*args, **kwargs):
            self.fail("release must not run after failed render")

        with tempfile.TemporaryDirectory() as tmp:
            report = pipeline.run_pipeline(["project.json"], tmp, gate_runner=gate, render_runner=render, release_runner=forbidden)

        self.assertFalse(report["ok"])
        self.assertEqual(report["stage"], "render")
        self.assertEqual(report["release_files"], [])
        self.assertIs(report["published"], False)

    def test_failed_post_render_qc_never_marks_output_releasable(self):
        def gate(inputs, *, manifest_path):
            return {"ok": True}

        def render(manifest_path, output_dir):
            return {"ok": True, "outputs": ["candidate.mp4"]}

        def release(rendered, quarantine_dir):
            return {"ok": False, "release_files": [], "quarantined": ["candidate.mp4"]}

        with tempfile.TemporaryDirectory() as tmp:
            report = pipeline.run_pipeline(["project.json"], tmp, gate_runner=gate, render_runner=render, release_runner=release)

        self.assertFalse(report["ok"])
        self.assertEqual(report["stage"], "quality_control")
        self.assertEqual(report["release_files"], [])
        self.assertIs(report["published"], False)


if __name__ == "__main__":
    unittest.main()
