#!/usr/bin/env python3
import copy
import importlib.util
from pathlib import Path
from unittest.mock import patch

MODULE_PATH = Path(__file__).resolve().parents[1] / "media_ingest.py"
spec = importlib.util.spec_from_file_location("profitmente_media_ingest", MODULE_PATH)
media_ingest = importlib.util.module_from_spec(spec)
spec.loader.exec_module(media_ingest)


def asset(asset_id, digest):
    return {"id": asset_id, "name": asset_id + ".mp4", "type": "video", "sha256": digest}


def test_batch_failure_is_transactional():
    project = {"assets": [asset("old", "oldhash")], "clips": []}
    before = copy.deepcopy(project)

    def fake_probe(path, ffprobe="ffprobe"):
        if path == "bad.mp4":
            raise ValueError("broken")
        return asset("new", "newhash")

    with patch.object(media_ingest, "probe", side_effect=fake_probe):
        try:
            media_ingest.ingest(project, ["good.mp4", "bad.mp4"])
        except ValueError:
            pass
        else:
            raise AssertionError("expected failed probe")

    assert project == before, "failed batch must not partially mutate the project"


def test_deduplicates_legacy_hash_and_batch_hash():
    project = {"assets": [asset("legacy-id", "samehash")], "clips": []}
    candidates = {
        "same.mp4": asset("new-derived-id", "samehash"),
        "first.mp4": asset("first", "freshhash"),
        "copy.mp4": asset("copy-id", "freshhash"),
    }
    with patch.object(media_ingest, "probe", side_effect=lambda path, ffprobe="ffprobe": candidates[path]):
        result, added = media_ingest.ingest(project, list(candidates))

    assert result is project
    assert [item["id"] for item in added] == ["first"]
    assert [item["id"] for item in project["assets"]] == ["legacy-id", "first"]


def test_missing_assets_key_commits_only_after_success():
    project = {"clips": []}
    candidate = asset("one", "onehash")
    with patch.object(media_ingest, "probe", return_value=candidate):
        _, added = media_ingest.ingest(project, ["one.mp4"])
    assert added == [candidate]
    assert project["assets"] == [candidate]


if __name__ == "__main__":
    test_batch_failure_is_transactional()
    test_deduplicates_legacy_hash_and_batch_hash()
    test_missing_assets_key_commits_only_after_success()
    print("media ingest transactional regression OK")