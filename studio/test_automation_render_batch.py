from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

import automation_render_batch as batch
import automation_preflight_batch as preflight


class BatchRenderTests(unittest.TestCase):
    def _fixture(self, root: Path):
        project = root / "ready.json"
        project.write_text("{}", encoding="utf-8")
        manifest = root / "manifest.json"
        manifest.write_text(json.dumps(preflight.build_manifest([project])), encoding="utf-8")
        assets = root / "assets"
        assets.mkdir()
        renderer = root / "renderer.py"
        renderer.write_text("# fake", encoding="utf-8")
        return project, manifest, assets, renderer

    @staticmethod
    def _good_probe(*args, **kwargs):
        class Done:
            returncode = 0
            stdout = json.dumps({"streams": [{"codec_type": "video"}], "format": {"duration": "4.0"}})
            stderr = ""
        return Done()

    def test_stale_manifest_blocks_before_renderer_runs(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            project, manifest, assets, renderer = self._fixture(root)
            project.write_text('{"changed":true}', encoding="utf-8")
            called = False
            def runner(*args, **kwargs):
                nonlocal called
                called = True
                raise AssertionError("renderer must not run")
            with self.assertRaises(ValueError):
                batch.render_manifest(manifest, assets, root / "out", runner=runner, renderer=renderer)
            self.assertFalse(called)

    def test_success_is_verified_then_atomically_published(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            project, manifest, assets, renderer = self._fixture(root)
            def runner(command, **kwargs):
                Path(command[-1]).write_bytes(b"mp4")
                class Done:
                    returncode = 0; stdout = ""; stderr = ""
                return Done()
            result = batch.render_manifest(manifest, assets, root / "out", runner=runner, probe_runner=self._good_probe, renderer=renderer)
            self.assertTrue(result["ok"])
            output = Path(result["results"][0]["output"])
            self.assertEqual(output.read_bytes(), b"mp4")
            self.assertFalse((output.parent / f".{output.name}.part.mp4").exists())

    def test_ffprobe_rejection_never_publishes_renderer_output(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            project, manifest, assets, renderer = self._fixture(root)
            def runner(command, **kwargs):
                Path(command[-1]).write_bytes(b"not-a-real-mp4")
                class Done:
                    returncode = 0; stdout = ""; stderr = ""
                return Done()
            def bad_probe(*args, **kwargs):
                class Done:
                    returncode = 1; stdout = ""; stderr = "invalid data"
                return Done()
            result = batch.render_manifest(manifest, assets, root / "out", runner=runner, probe_runner=bad_probe, renderer=renderer)
            self.assertFalse(result["ok"])
            self.assertIn("MP4 no verificable", result["results"][0]["error"])
            self.assertFalse(any((root / "out").glob("*.mp4")))

    def test_probe_without_video_or_positive_duration_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            project, manifest, assets, renderer = self._fixture(root)
            def runner(command, **kwargs):
                Path(command[-1]).write_bytes(b"mp4")
                class Done:
                    returncode = 0; stdout = ""; stderr = ""
                return Done()
            def audio_only_probe(*args, **kwargs):
                class Done:
                    returncode = 0
                    stdout = json.dumps({"streams": [], "format": {"duration": "0"}})
                    stderr = ""
                return Done()
            result = batch.render_manifest(manifest, assets, root / "out", runner=runner, probe_runner=audio_only_probe, renderer=renderer)
            self.assertFalse(result["ok"])
            self.assertFalse(any((root / "out").glob("*.mp4")))

    def test_failed_render_never_publishes_partial_output(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            project, manifest, assets, renderer = self._fixture(root)
            def runner(command, **kwargs):
                Path(command[-1]).write_bytes(b"partial")
                class Done:
                    returncode = 1; stdout = ""; stderr = "ffmpeg failed"
                return Done()
            result = batch.render_manifest(manifest, assets, root / "out", runner=runner, renderer=renderer)
            self.assertFalse(result["ok"])
            self.assertEqual(result["failed"], 1)
            self.assertFalse(any((root / "out").glob("*.mp4")))
            self.assertFalse(any((root / "out").glob("*.part.mp4")))

    def test_duplicate_stems_get_distinct_outputs(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            a = root / "a" / "same.json"; a.parent.mkdir(); a.write_text("{}", encoding="utf-8")
            b = root / "b" / "same.json"; b.parent.mkdir(); b.write_text("{}", encoding="utf-8")
            manifest = root / "manifest.json"
            manifest.write_text(json.dumps(preflight.build_manifest([a, b])), encoding="utf-8")
            assets = root / "assets"; assets.mkdir()
            renderer = root / "renderer.py"; renderer.write_text("# fake", encoding="utf-8")
            def runner(command, **kwargs):
                Path(command[-1]).write_bytes(b"mp4")
                class Done:
                    returncode = 0; stdout = ""; stderr = ""
                return Done()
            result = batch.render_manifest(manifest, assets, root / "out", runner=runner, probe_runner=self._good_probe, renderer=renderer)
            names = [Path(item["output"]).name for item in result["results"]]
            self.assertEqual(names, ["same.mp4", "same-2.mp4"])

    def test_existing_export_is_never_overwritten(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            project, manifest, assets, renderer = self._fixture(root)
            output_dir = root / "out"; output_dir.mkdir()
            existing = output_dir / "ready.mp4"; existing.write_bytes(b"keep-me")
            def runner(command, **kwargs):
                Path(command[-1]).write_bytes(b"new-mp4")
                class Done:
                    returncode = 0; stdout = ""; stderr = ""
                return Done()
            result = batch.render_manifest(manifest, assets, output_dir, runner=runner, probe_runner=self._good_probe, renderer=renderer)
            self.assertTrue(result["ok"])
            self.assertEqual(existing.read_bytes(), b"keep-me")
            new_output = Path(result["results"][0]["output"])
            self.assertEqual(new_output.name, "ready-2.mp4")
            self.assertEqual(new_output.read_bytes(), b"new-mp4")


if __name__ == "__main__":
    unittest.main()
