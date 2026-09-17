#!/usr/bin/env python3
import json
import pathlib
import tempfile
import threading

import studio_server
from render_progress import read_progress, write_progress


def main():
    with tempfile.TemporaryDirectory(prefix="profitmente-progress-test-") as td:
        progress_file = pathlib.Path(td) / "progress.json"
        assert write_progress(35, "  Componiendo   video y gráficos  ", progress_file)
        first = read_progress(progress_file)
        assert first["progress"] == 35
        assert first["phase"] == "Componiendo video y gráficos"

        # Multiple local render stages may briefly overlap. Concurrent publishers
        # must not fight over one fixed .tmp file or leave temporary debris behind.
        barrier = threading.Barrier(8)
        failures = []

        def publish(index):
            barrier.wait()
            if not write_progress(index * 10, f"Etapa {index}", progress_file):
                failures.append(index)

        workers = [threading.Thread(target=publish, args=(index,)) for index in range(1, 9)]
        for worker in workers:
            worker.start()
        for worker in workers:
            worker.join()
        assert not failures
        concurrent = read_progress(progress_file)
        assert concurrent is not None
        assert concurrent["phase"].startswith("Etapa ")
        assert not list(pathlib.Path(td).glob("progress.json.*.tmp"))

        # Corrupt/partial snapshots must never break the render server.
        progress_file.write_text("{", encoding="utf-8")
        assert read_progress(progress_file) is None
        progress_file.write_bytes(b"{\xff\xfe\x80}")
        assert read_progress(progress_file) is None

        # Malformed/non-finite progress values are optional UI metadata and must
        # be sanitized rather than interrupting render progress polling.
        for bad_progress in ("not-a-number", None, float("nan"), float("inf"), float("-inf")):
            progress_file.write_text(
                json.dumps({"progress": bad_progress, "phase": "Render local", "updated": 1}),
                encoding="utf-8",
            )
            malformed_progress = read_progress(progress_file)
            assert malformed_progress["progress"] == 0
            assert malformed_progress["phase"] == "Render local"

        # Malformed/non-finite timestamps are optional metadata and must not make
        # an otherwise valid progress snapshot unreadable.
        for bad_updated in ("not-a-number", None, -12, float("nan"), float("inf"), float("-inf")):
            progress_file.write_text(
                json.dumps({"progress": 41, "phase": "Render local", "updated": bad_updated}),
                encoding="utf-8",
            )
            malformed = read_progress(progress_file)
            assert malformed["progress"] == 41
            assert malformed["phase"] == "Render local"
            assert malformed["updated"] == 0.0

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
