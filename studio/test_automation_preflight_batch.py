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
            project.write_text('{"version":2}', encoding="utf-8")
            self.assertFalse(batch.verify_manifest_entry(entry))

    def test_manifest_verification_rejects_missing_or_malformed_entry(self):
        self.assertFalse(batch.verify_manifest_entry({"path": "missing.json", "sha256": "0" * 64}))
        self.assertFalse(batch.verify_manifest_entry({"path": "x", "sha256": "short"}))
        self.assertFalse(batch.verify_manifest_entry({}))

    def test_atomic_json_writer_leaves_valid_payload(self):
        with tempfile.TemporaryDirectory() as tmp:
            target = Path(tmp) / "out" / "manifest.json"
            batch._write_json(target, {"version": 2, "projects": [{"path": "a.json", "sha256": "0" * 64}]})
            self.assertEqual(json.loads(target.read_text(encoding="utf-8"))["version"], 2)
            self.assertFalse(target.with_name(target.name + ".tmp").exists())


if __name__ == "__main__":
    unittest.main()
