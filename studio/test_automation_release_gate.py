from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

import automation_release_gate as gate


class AutomationReleaseGateTests(unittest.TestCase):
    def _files(self, root: Path):
        project = root / "project.json"
        project.write_text("{}", encoding="utf-8")
        output = root / "out" / "video.mp4"
        output.parent.mkdir()
        output.write_bytes(b"mp4")
        return project, output

    def test_good_qc_is_released(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); project, output = self._files(root)
            payload = {"results": [{"ok": True, "project": str(project), "output": str(output)}]}
            report = gate.gate_batch_result(payload, root / "quarantine", inspector=lambda p, o: {"ok": True, "score": 100, "issues": [], "warnings": [], "metrics": {}})
            self.assertTrue(report["ok"])
            self.assertEqual(report["release_files"], [str(output.resolve())])
            self.assertTrue(output.exists())

    def test_failed_qc_is_quarantined_and_never_released(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); project, output = self._files(root)
            payload = {"results": [{"ok": True, "project": str(project), "output": str(output)}]}
            report = gate.gate_batch_result(payload, root / "quarantine", inspector=lambda p, o: {"ok": False, "score": 0, "issues": ["black"], "warnings": [], "metrics": {}})
            self.assertFalse(report["ok"])
            self.assertEqual(report["release_files"], [])
            self.assertFalse(output.exists())
            quarantined = Path(report["results"][0]["quarantined"])
            self.assertTrue(quarantined.is_file())
            self.assertEqual(quarantined.read_bytes(), b"mp4")

    def test_inspector_exception_fails_closed_and_quarantines(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); project, output = self._files(root)
            payload = {"results": [{"ok": True, "project": str(project), "output": str(output)}]}
            def broken(p, o):
                raise RuntimeError("ffmpeg unavailable")
            report = gate.gate_batch_result(payload, root / "quarantine", inspector=broken)
            self.assertFalse(report["ok"])
            self.assertFalse(output.exists())
            self.assertIn("QC final no pudo ejecutarse", report["results"][0]["qc"]["issues"][0])

    def test_prior_render_failure_cannot_enter_release_list(self):
        report = gate.gate_batch_result({"results": [{"ok": False, "project": "p.json", "output": None, "error": "render failed"}]}, "quarantine")
        self.assertFalse(report["ok"])
        self.assertEqual(report["release_files"], [])
        self.assertEqual(report["failed"], 1)

    def test_report_write_is_atomic_and_valid_json(self):
        import json
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "report.json"
            gate._atomic_json(path, {"ok": True, "release_files": []})
            self.assertEqual(json.loads(path.read_text(encoding="utf-8"))["ok"], True)
            self.assertFalse((path.parent / f".{path.name}.tmp").exists())


if __name__ == "__main__":
    unittest.main()
