from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import automation_preflight_batch as batch


class BatchPreflightTests(unittest.TestCase):
    def test_discover_is_sorted_deduplicated_and_json_only(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "b.json").write_text("{}", encoding="utf-8")
            (root / "a.json").write_text("{}", encoding="utf-8")
            (root / "ignore.txt").write_text("{}", encoding="utf-8")
            found = batch.discover([str(root), str(root / "a.json")])
            self.assertEqual([p.name for p in found], ["a.json", "b.json"])

    def test_blocked_project_is_excluded_from_manifest(self):
        paths = [Path("ready.json"), Path("blocked.json")]
        def fake(path, final=True):
            return {"ok": path.name == "ready.json", "stage": "ready" if path.name == "ready.json" else "qa", "blockers": [] if path.name == "ready.json" else ["gap"]}
        with patch.object(batch, "inspect_file", side_effect=fake):
            result = batch.inspect_many(paths)
        self.assertFalse(result["ok"])
        self.assertEqual(result["ready"], 1)
        self.assertEqual(result["blocked"], 1)
        self.assertEqual(result["render_manifest"], ["ready.json"])

    def test_manifest_hash_detects_project_changed_after_preflight(self):
        with tempfile.TemporaryDirectory() as tmp:
            project = Path(tmp) / "ready.json"
            project.write_text('{"version":1}', encoding="utf-8")
            manifest = batch.build_manifest([project])
            self.assertEqual(manifest["version"], 2)
            self.assertEqual(manifest["algorithm"], "sha256")
            entry = manifest["projects"][0]
            self.assertEqual(len(entry["sha256"]), 64)
            self.assertTrue(batch.verify_manifest_entry(entry))
            self.assertTrue(batch.verify_manifest(manifest)["ok"])
            project.write_text('{"version":2}', encoding="utf-8")
            self.assertFalse(batch.verify_manifest_entry(entry))
            report = batch.verify_manifest(manifest)
            self.assertFalse(report["ok"])
            self.assertEqual(report["verified"], 0)

    def test_manifest_verification_rejects_missing_malformed_or_unsupported(self):
        self.assertFalse(batch.verify_manifest_entry({"path": "missing.json", "sha256": "0" * 64}))
        self.assertFalse(batch.verify_manifest_entry({"path": "x", "sha256": "short"}))
        self.assertFalse(batch.verify_manifest_entry({}))
        self.assertFalse(batch.verify_manifest({"version": 1, "algorithm": "sha256", "projects": []})["ok"])
        self.assertFalse(batch.verify_manifest({"version": 2, "algorithm": "md5", "projects": []})["ok"])
        self.assertFalse(batch.verify_manifest([])["ok"])

    def test_manifest_verification_rejects_duplicate_projects(self):
        with tempfile.TemporaryDirectory() as tmp:
            project = Path(tmp) / "ready.json"
            project.write_text("{}", encoding="utf-8")
            entry = batch.build_manifest([project])["projects"][0]
            report = batch.verify_manifest({"version": 2, "algorithm": "sha256", "projects": [entry, dict(entry)]})
            self.assertFalse(report["ok"])
            self.assertEqual(report["verified"], 1)
            self.assertTrue(any("duplicado" in error for error in report["errors"]))

    def test_verify_manifest_file_fails_closed_on_bad_json(self):
        with tempfile.TemporaryDirectory() as tmp:
            manifest = Path(tmp) / "manifest.json"
            manifest.write_text("{bad", encoding="utf-8")
            report = batch.verify_manifest_file(manifest)
            self.assertFalse(report["ok"])
            self.assertTrue(report["errors"])

    def test_atomic_json_writer_leaves_valid_payload(self):
        with tempfile.TemporaryDirectory() as tmp:
            target = Path(tmp) / "out" / "manifest.json"
            batch._write_json(target, {"version": 2, "projects": [{"path": "a.json", "sha256": "0" * 64}]})
            self.assertEqual(json.loads(target.read_text(encoding="utf-8"))["version"], 2)
            self.assertFalse(target.with_name(target.name + ".tmp").exists())


if __name__ == "__main__":
    unittest.main()
