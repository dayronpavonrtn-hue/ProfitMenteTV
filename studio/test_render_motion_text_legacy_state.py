#!/usr/bin/env python3
"""Regression: direct Motion render must honor legacy trackStates before child renderers run."""
import json
import pathlib
import runpy
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent


def main():
    project = {
        "duration": 2,
        "trackState": {
            "0": {"hidden": False},
            "5": {"muted": False},
        },
        "trackStates": {
            "0": {"hidden": True},
            "5": {"muted": True},
        },
        "assets": [],
        "clips": [],
    }
    captured = {}
    original_run = subprocess.run
    original_argv = sys.argv[:]
    original_path = sys.path[:]
    try:
        with tempfile.TemporaryDirectory(prefix="profitmente-direct-render-state-") as td:
            td = pathlib.Path(td)
            source = td / "project.json"
            assets = td / "assets"
            output = td / "out.mp4"
            assets.mkdir()
            source.write_text(json.dumps(project), encoding="utf-8")

            def fake_run(cmd, check=False, **kwargs):
                child = pathlib.Path(str(cmd[1])).name if len(cmd) > 1 else ""
                if child == "render_mp4.py":
                    captured["video"] = json.loads(pathlib.Path(cmd[2]).read_text(encoding="utf-8"))
                elif child == "render_audio_mix.py":
                    captured["audio"] = json.loads(pathlib.Path(cmd[2]).read_text(encoding="utf-8"))
                return subprocess.CompletedProcess(cmd, 0, "", "")

            subprocess.run = fake_run
            sys.path.insert(0, str(ROOT))
            sys.argv = [str(ROOT / "render_motion_text.py"), str(source), str(assets), str(output)]
            runpy.run_path(str(ROOT / "render_motion_text.py"), run_name="__main__")
    finally:
        subprocess.run = original_run
        sys.argv = original_argv
        sys.path[:] = original_path

    assert set(captured) == {"video", "audio"}, captured
    for name, value in captured.items():
        assert "trackStates" not in value, (name, value)
        assert value["trackState"]["0"]["hidden"] is True, (name, value)
        assert value["trackState"]["5"]["muted"] is True, (name, value)

    print("Direct Motion render legacy track-state parity OK")


if __name__ == "__main__":
    main()
