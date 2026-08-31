#!/usr/bin/env python3
import pathlib
import tempfile

import studio_server
from render_progress import read_progress, write_progress


def main():
    with tempfile.TemporaryDirectory(prefix="profitmente-progress-test-") as td:
        progress_file = pathlib.Path(td) / "progress.json"
        assert write_progress(35, "  Componiendo   video y gráficos  ", progress_file)
        first = read_progress(progress_file)
        assert first["progress"] == 35
        assert first["phase"] == "Componiendo video y gráficos"

        # Corrupt/partial snapshots must never break the render server.
        progress_file.write_text("{", encoding="utf-8")
        assert read_progress(progress_file) is None

        write_progress(72, "Mezclando narración, música y SFX", progress_file)
        job_id = "progress-regression"
        job = {
            "id": job_id,
            "status": "rendering",
            "progress": 35,
            "phase": "Componiendo video y gráficos",
            "created": 1,
            "cancel_requested": False,
        }
        with studio_server.RENDER_LOCK:
            studio_server.RENDER_JOBS[job_id] = job
        try:
            studio_server._sync_render_progress(job_id, progress_file)
            snapshot = studio_server._job_snapshot(job)
            assert snapshot["progress"] == 72
            assert snapshot["phase"] == "Mezclando narración, música y SFX"

            # Late/stale updates may change the descriptive phase but cannot move
            # the percentage backwards and make the Studio UI look stuck/reversed.
            write_progress(20, "Validando proyecto y medios", progress_file)
            studio_server._sync_render_progress(job_id, progress_file)
            snapshot = studio_server._job_snapshot(job)
            assert snapshot["progress"] == 72
            assert snapshot["phase"] == "Validando proyecto y medios"
        finally:
            with studio_server.RENDER_LOCK:
                studio_server.RENDER_JOBS.pop(job_id, None)

        write_progress(150, "x" * 300, progress_file)
        bounded = read_progress(progress_file)
        assert bounded["progress"] == 99
        assert len(bounded["phase"]) == 120

    print("Render progress regression OK")


if __name__ == "__main__":
    main()
