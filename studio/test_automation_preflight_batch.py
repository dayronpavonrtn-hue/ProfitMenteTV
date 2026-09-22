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

    def test_atomic_json_writer_leaves_valid_payload(self):
        with tempfile.TemporaryDirectory() as tmp:
            target = Path(tmp) / "out" / "manifest.json"
            batch._write_json(target, {"version": 1, "projects": ["a.json"]})
            self.assertEqual(json.loads(target.read_text(encoding="utf-8"))["projects"], ["a.json"])
            self.assertFalse(target.with_name(target.name + ".tmp").exists())


if __name__ == "__main__":
    unittest.main()
