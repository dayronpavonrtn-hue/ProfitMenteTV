#!/usr/bin/env python3
"""Regression: cancelling a render must stop its descendant encoder processes too."""
from __future__ import annotations

import os
import pathlib
import subprocess
import sys
import tempfile
import time

from studio_server import _render_popen_kwargs, _spawn_render_process, _terminate_process_tree

kwargs = _render_popen_kwargs()
if os.name == "nt":
    assert "creationflags" in kwargs
else:
    assert kwargs.get("start_new_session") is True

with tempfile.TemporaryDirectory(prefix="profitmente-render-tree-test-") as td:
    root = pathlib.Path(td)
    started = root / "child-started.txt"
    sentinel = root / "child-survived.txt"

    child_code = (
        "import pathlib,sys,time;"
        "time.sleep(1.5);"
        "pathlib.Path(sys.argv[1]).write_text('survived',encoding='utf-8')"
    )
    parent_code = (
        "import pathlib,subprocess,sys,time;"
        "subprocess.Popen([sys.executable,'-c',sys.argv[3],sys.argv[2]],"
        "stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);"
        "pathlib.Path(sys.argv[1]).write_text('ready',encoding='utf-8');"
        "time.sleep(30)"
    )
    proc = _spawn_render_process(
        [sys.executable, "-c", parent_code, str(started), str(sentinel), child_code],
        cwd=root,
        env=os.environ.copy(),
    )

    deadline = time.monotonic() + 5
    while not started.exists() and time.monotonic() < deadline:
        if proc.poll() is not None:
            out, err = proc.communicate()
            raise AssertionError(f"parent exited before child started: {out!r} {err!r}")
        time.sleep(0.05)
    assert started.exists(), "child process did not start"

    assert _terminate_process_tree(proc) is True
    proc.wait(timeout=5)
    time.sleep(2.0)
    assert not sentinel.exists(), "child process survived render cancellation"

# Already-finished processes should be a harmless no-op.
finished = subprocess.Popen([sys.executable, "-c", "pass"])
finished.wait(timeout=5)
assert _terminate_process_tree(finished) is False

print("Render process tree cancellation QA OK")
