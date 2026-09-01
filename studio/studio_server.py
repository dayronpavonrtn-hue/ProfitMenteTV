#!/usr/bin/env python3
"""Local-only ProfitMente Studio server with zero-cost MP4 render endpoints."""
from __future__ import annotations
import argparse
import json
import os
import pathlib
import shutil
import signal
import subprocess
import sys
import tempfile
import threading
import time
import uuid
import webbrowser
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse
from render_progress import ENV_NAME as RENDER_PROGRESS_ENV, read_progress

ROOT = pathlib.Path(__file__).resolve().parent.parent
STUDIO = ROOT / "studio"
MAX_UPLOAD = 2 * 1024 * 1024 * 1024
ALLOWED_CONTENT_TYPES = {"application/x-tar", "application/octet-stream"}
RENDER_JOBS = {}
RENDER_LOCK = threading.RLock()
# One FFmpeg render at a time keeps Studio usable on normal PCs and prevents
# multiple queued clicks from exhausting CPU/RAM. Waiting jobs stay cancellable.
RENDER_SLOT = threading.Semaphore(1)
RENDER_QUEUE_POLL_SECONDS = 0.1
RENDER_PROGRESS_POLL_SECONDS = 0.25
RENDER_TIMEOUT_SECONDS = 1800


def _render_popen_kwargs() -> dict:
    """Create an isolated process group so cancelling Studio also stops FFmpeg children."""
    if os.name == "nt":
        return {"creationflags": getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0)}
    return {"start_new_session": True}


def _spawn_render_process(cmd, *, cwd, env):
    return subprocess.Popen(
        cmd,
        cwd=str(cwd),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        env=env,
        **_render_popen_kwargs(),
    )


def _terminate_process_tree(proc, *, force: bool = False, grace_seconds: float = 1.5) -> bool:
    """Best-effort termination of the render parent plus all descendants.

    render_bundle.py launches FFmpeg/FFprobe subprocesses. Killing only the Python
    parent can leave those children encoding in the background, so every async
    render starts in its own process group and cancellation targets the group.
    """
    if not proc or proc.poll() is not None:
        return False
    try:
        if os.name == "nt":
            taskkill = shutil.which("taskkill")
            if taskkill and getattr(proc, "pid", None):
                subprocess.run(
                    [taskkill, "/PID", str(proc.pid), "/T", "/F"],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    timeout=5,
                    check=False,
                )
            if proc.poll() is None:
                proc.kill()
            return True

        pgid = os.getpgid(proc.pid)
        os.killpg(pgid, signal.SIGKILL if force else signal.SIGTERM)
        if not force:
            try:
                proc.wait(timeout=max(0.1, float(grace_seconds)))
            except subprocess.TimeoutExpired:
                try:
                    os.killpg(pgid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
        return True
    except (ProcessLookupError, OSError, subprocess.SubprocessError):
        try:
            if proc.poll() is None:
                (proc.kill if force else proc.terminate)()
            return True
        except (OSError, subprocess.SubprocessError):
            return False


def _render_counts() -> tuple[int, int]:
    """Return (active, queued) without exposing cancelled/error jobs."""
    active = sum(1 for j in RENDER_JOBS.values() if j.get("status") == "rendering")
    queued = sum(
        1 for j in RENDER_JOBS.values()
        if j.get("status") == "queued" and not j.get("cancel_requested")
    )
    return active, queued


def _queue_position(job: dict) -> int | None:
    if job.get("status") != "queued" or job.get("cancel_requested"):
        return None
    waiting = sorted(
        (
            j for j in RENDER_JOBS.values()
            if j.get("status") == "queued" and not j.get("cancel_requested")
        ),
        key=lambda j: (float(j.get("created", 0)), str(j.get("id", ""))),
    )
    for index, candidate in enumerate(waiting, 1):
        if candidate is job or candidate.get("id") == job.get("id"):
            return index
    return None


def _job_snapshot(job: dict) -> dict:
    created = float(job.get("created", time.time()))
    active, queued = _render_counts()
    return {
        "ok": True,
        "job_id": job["id"],
        "status": job.get("status", "queued"),
        "progress": int(job.get("progress", 0)),
        "phase": job.get("phase"),
        "error": job.get("error"),
        "elapsed": max(0, round(time.time() - created, 1)),
        "qc": job.get("qc"),
        "queue_position": _queue_position(job),
        "render_active": active,
        "render_queued": queued,
    }


def _cleanup_job_files(job: dict):
    td = job.get("tempdir")
    if td:
        shutil.rmtree(td, ignore_errors=True)
        job["tempdir"] = None


def _finish_job_download(job_id: str, *, delivered: bool) -> bool:
    """Consume a completed render only after its HTTP body was delivered.

    The browser client validates the received MP4 and retries network/truncation
    failures. Keeping the job when socket delivery fails makes those retries real
    instead of forcing an expensive second render.
    """
    if not delivered:
        return False
    with RENDER_LOCK:
        job = RENDER_JOBS.pop(job_id, None)
        if not job:
            return False
        _cleanup_job_files(job)
        return True


def _mark_job_error(job: dict, error, *, phase: str = "Error", qc=None):
    """Keep error metadata available to the UI while releasing large temp files."""
    job.update(
        status="error",
        progress=100,
        phase=phase,
        error=str(error),
        process=None,
    )
    if qc is not None:
        job["qc"] = qc
    _cleanup_job_files(job)


def _read_qc(output: pathlib.Path):
    report = output.with_suffix(output.suffix + ".qc.json")
    if not report.is_file():
        return None
    try:
        value = json.loads(report.read_text(encoding="utf-8"))
        return value if isinstance(value, dict) else None
    except (OSError, json.JSONDecodeError):
        return None


def _sync_render_progress(job_id: str, progress_file: pathlib.Path):
    snapshot = read_progress(progress_file)
    if not snapshot:
        return
    with RENDER_LOCK:
        job = RENDER_JOBS.get(job_id)
        if not job or job.get("status") != "rendering":
            return
        current = int(job.get("progress", 0))
        incoming = int(snapshot.get("progress", 0))
        # Never make the UI move backwards if two child stages publish close together.
        job["progress"] = max(current, incoming)
        if snapshot.get("phase"):
            job["phase"] = snapshot["phase"]


def _wait_for_render_slot(job_id: str) -> bool:
    """Wait for the single local render slot while honoring queue cancellation."""
    while True:
        with RENDER_LOCK:
            job = RENDER_JOBS.get(job_id)
            if not job or job.get("cancel_requested") or job.get("status") == "cancelled":
                if job and job.get("status") != "cancelled":
                    job.update(status="cancelled", progress=0, phase="Cancelado")
                    _cleanup_job_files(job)
                return False
        if RENDER_SLOT.acquire(timeout=RENDER_QUEUE_POLL_SECONDS):
            return True


def _run_render_job(job_id: str):
    if not _wait_for_render_slot(job_id):
        return
    proc = None
    try:
        with RENDER_LOCK:
            job = RENDER_JOBS.get(job_id)
            if not job or job.get("cancel_requested"):
                if job:
                    job.update(status="cancelled", progress=0, phase="Cancelado")
                    _cleanup_job_files(job)
                return
            progress_file = pathlib.Path(job["tempdir"]) / "render-progress.json"
            job.update(status="rendering", progress=11, phase="Preparando render", progress_file=str(progress_file))
            cmd = [sys.executable, str(STUDIO / "render_bundle.py"), str(job["bundle"]), str(job["output"])]
            env = os.environ.copy()
            env[RENDER_PROGRESS_ENV] = str(progress_file)
            proc = _spawn_render_process(cmd, cwd=ROOT, env=env)
            job["process"] = proc
        started = time.monotonic()
        while True:
            try:
                stdout, stderr = proc.communicate(timeout=RENDER_PROGRESS_POLL_SECONDS)
                break
            except subprocess.TimeoutExpired:
                _sync_render_progress(job_id, progress_file)
                if time.monotonic() - started > RENDER_TIMEOUT_SECONDS:
                    _terminate_process_tree(proc, force=True)
                    stdout, stderr = proc.communicate()
                    with RENDER_LOCK:
                        job = RENDER_JOBS.get(job_id)
                        if job:
                            _mark_job_error(job, "El render superó 30 minutos.")
                    return
        _sync_render_progress(job_id, progress_file)
        with RENDER_LOCK:
            job = RENDER_JOBS.get(job_id)
            if not job:
                return
            job["process"] = None
            if job.get("cancel_requested"):
                job.update(status="cancelled", progress=0, phase="Cancelado")
                _cleanup_job_files(job)
                return
            output = pathlib.Path(job["output"])
            if proc.returncode != 0 or not output.is_file():
                detail = (stderr or stdout or "Error desconocido de render").strip()[-4000:]
                _mark_job_error(job, detail)
                return
            qc = _read_qc(output)
            if not qc or not qc.get("ok"):
                detail = "El MP4 terminó pero no superó el control post-render."
                if qc and qc.get("issues"):
                    detail += " " + " ".join(str(x) for x in qc["issues"][:3])
                _mark_job_error(job, detail, phase="Control de calidad fallido", qc=qc)
                return
            job.update(status="done", progress=100, phase="Completado", size=output.stat().st_size, qc=qc)
    except Exception as exc:
        with RENDER_LOCK:
            job = RENDER_JOBS.get(job_id)
            if job and job.get("status") not in ("cancelled", "done"):
                _mark_job_error(job, exc)
    finally:
        RENDER_SLOT.release()


class Handler(SimpleHTTPRequestHandler):
    server_version = "ProfitMenteStudio/1.8"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Referrer-Policy", "no-referrer")
        super().end_headers()

    def _json(self, status: int, payload: dict):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _same_local_origin(self) -> bool:
        host = self.headers.get("Host", "")
        if not (host.startswith("127.0.0.1:") or host.startswith("localhost:")):
            return False
        origin = self.headers.get("Origin")
        if not origin:
            return True
        parsed = urlparse(origin)
        return parsed.scheme == "http" and parsed.netloc == host

    def _read_bundle(self):
        content_type = self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower()
        if content_type not in ALLOWED_CONTENT_TYPES:
            return None, (HTTPStatus.UNSUPPORTED_MEDIA_TYPE, "Se esperaba un paquete TAR de ProfitMente Studio.")
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if length <= 0:
            return None, (HTTPStatus.BAD_REQUEST, "Paquete vacío.")
        if length > MAX_UPLOAD:
            return None, (HTTPStatus.REQUEST_ENTITY_TOO_LARGE, "El paquete supera 2 GB.")
        td = pathlib.Path(tempfile.mkdtemp(prefix="profitmente-local-render-"))
        bundle = td / "project.profitmente.tar"
        remaining = length
        try:
            with bundle.open("wb") as f:
                while remaining:
                    chunk = self.rfile.read(min(1024 * 1024, remaining))
                    if not chunk:
                        break
                    f.write(chunk)
                    remaining -= len(chunk)
            if remaining:
                shutil.rmtree(td, ignore_errors=True)
                return None, (HTTPStatus.BAD_REQUEST, "Carga incompleta.")
            return (td, bundle), None
        except Exception:
            shutil.rmtree(td, ignore_errors=True)
            raise

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/health":
            ffmpeg = shutil.which("ffmpeg")
            ffprobe = shutil.which("ffprobe")
            with RENDER_LOCK:
                active, queued = _render_counts()
            self._json(HTTPStatus.OK, {
                "ok": True,
                "python": sys.version.split()[0],
                "ffmpeg": bool(ffmpeg),
                "ffprobe": bool(ffprobe),
                "render_ready": bool(ffmpeg and ffprobe),
                "render_jobs": True,
                "render_concurrency": 1,
                "render_active": active,
                "render_queued": queued,
                "render_progress_phases": True,
                "render_process_tree_cancel": True,
                "render_failure_cleanup": True,
                "post_render_qc": True,
                "render_result_retry_safe": True,
                "server": self.server_version,
            })
            return
        if path.startswith("/api/render/jobs/"):
            parts = path.strip("/").split("/")
            if len(parts) not in (4, 5):
                self.send_error(HTTPStatus.NOT_FOUND); return
            job_id = parts[3]
            with RENDER_LOCK:
                job = RENDER_JOBS.get(job_id)
                if not job:
                    self._json(HTTPStatus.NOT_FOUND, {"ok": False, "error": "Trabajo de render no encontrado."}); return
                if len(parts) == 4:
                    self._json(HTTPStatus.OK, _job_snapshot(job)); return
                if parts[4] != "result":
                    self.send_error(HTTPStatus.NOT_FOUND); return
                if job.get("status") != "done":
                    self._json(HTTPStatus.CONFLICT, {"ok": False, "error": "El render todavía no está terminado."}); return
                output = pathlib.Path(job["output"])
                if not output.is_file():
                    self._json(HTTPStatus.GONE, {"ok": False, "error": "El archivo renderizado ya no está disponible."}); return
                size = output.stat().st_size
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "video/mp4")
            self.send_header("Content-Disposition", 'attachment; filename="profitmente-render.mp4"')
            self.send_header("Content-Length", str(size))
            self.end_headers()
            delivered = False
            try:
                with output.open("rb") as f:
                    shutil.copyfileobj(f, self.wfile, length=1024 * 1024)
                self.wfile.flush()
                delivered = True
            finally:
                _finish_job_download(job_id, delivered=delivered)
            return
        super().do_GET()

    def do_DELETE(self):
        path = urlparse(self.path).path
        if not path.startswith("/api/render/jobs/") or not self._same_local_origin():
            self.send_error(HTTPStatus.NOT_FOUND); return
        parts = path.strip("/").split("/")
        if len(parts) != 4:
            self.send_error(HTTPStatus.NOT_FOUND); return
        job_id = parts[3]
        proc = None
        with RENDER_LOCK:
            job = RENDER_JOBS.get(job_id)
            if not job:
                self._json(HTTPStatus.NOT_FOUND, {"ok": False, "error": "Trabajo de render no encontrado."}); return
            if job.get("status") == "done":
                self._json(HTTPStatus.CONFLICT, {"ok": False, "error": "El render ya terminó."}); return
            job["cancel_requested"] = True
            proc = job.get("process")
            if job.get("status") == "queued":
                job.update(status="cancelled", progress=0, phase="Cancelado")
                _cleanup_job_files(job)
        if proc and proc.poll() is None:
            _terminate_process_tree(proc)
        with RENDER_LOCK:
            job = RENDER_JOBS.get(job_id)
            if not job:
                self._json(HTTPStatus.NOT_FOUND, {"ok": False, "error": "Trabajo de render no encontrado."}); return
            self._json(HTTPStatus.OK, _job_snapshot(job))
        return

    def do_POST(self):
        path = urlparse(self.path).path
        if path not in ("/api/render", "/api/render/jobs"):
            self.send_error(HTTPStatus.NOT_FOUND); return
        if not self._same_local_origin():
            self._json(HTTPStatus.FORBIDDEN, {"ok": False, "error": "Origen local no autorizado."}); return
        if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
            self._json(HTTPStatus.SERVICE_UNAVAILABLE, {"ok": False, "error": "FFmpeg/FFprobe no están instalados o no están disponibles en PATH."}); return
        payload, error = self._read_bundle()
        if error:
            self._json(error[0], {"ok": False, "error": error[1]}); return
        td, bundle = payload
        output = td / "output.mp4"
        if path == "/api/render/jobs":
            job_id = uuid.uuid4().hex
            job = {"id": job_id, "status": "queued", "progress": 10, "phase": "En cola", "created": time.time(), "tempdir": str(td), "bundle": str(bundle), "output": str(output), "process": None, "progress_file": None, "cancel_requested": False, "error": None, "qc": None}
            with RENDER_LOCK: RENDER_JOBS[job_id] = job
            threading.Thread(target=_run_render_job, args=(job_id,), daemon=True).start()
            self._json(HTTPStatus.ACCEPTED, _job_snapshot(job)); return
        # Legacy synchronous render uses the same slot so it cannot overload a
        # machine while an async render is already running.
        RENDER_SLOT.acquire()
        try:
            try:
                result = subprocess.run([sys.executable, str(STUDIO / "render_bundle.py"), str(bundle), str(output)], cwd=str(ROOT), capture_output=True, text=True, timeout=RENDER_TIMEOUT_SECONDS)
            except subprocess.TimeoutExpired:
                shutil.rmtree(td, ignore_errors=True)
                self._json(HTTPStatus.GATEWAY_TIMEOUT, {"ok": False, "error": "El render superó 30 minutos."}); return
            if result.returncode != 0 or not output.is_file():
                detail = (result.stderr or result.stdout or "Error desconocido de render").strip()[-4000:]
                shutil.rmtree(td, ignore_errors=True)
                self._json(HTTPStatus.INTERNAL_SERVER_ERROR, {"ok": False, "error": detail}); return
            size = output.stat().st_size
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "video/mp4")
            self.send_header("Content-Disposition", 'attachment; filename="profitmente-render.mp4"')
            self.send_header("Content-Length", str(size))
            self.send_header("X-ProfitMente-Post-Render-QC", "passed")
            self.end_headers()
            try:
                with output.open("rb") as f: shutil.copyfileobj(f, self.wfile, length=1024 * 1024)
            finally:
                shutil.rmtree(td, ignore_errors=True)
        finally:
            RENDER_SLOT.release()

    def log_message(self, fmt, *args):
        print("[Studio]", fmt % args)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8080)
    parser.add_argument("--open-browser", action="store_true", help="Abrir Studio después de enlazar el servidor")
    args = parser.parse_args()
    address = ("127.0.0.1", args.port)
    url = f"http://127.0.0.1:{args.port}/studio/"
    httpd = ThreadingHTTPServer(address, Handler)
    print(f"ProfitMente Studio: {url}")
    print("Servidor local únicamente. Ctrl+C para cerrar.")
    if args.open_browser: threading.Timer(0.15, lambda: webbrowser.open(url, new=2)).start()
    try: httpd.serve_forever()
    except KeyboardInterrupt: print("\nProfitMente Studio cerrado.")
    finally: httpd.server_close()


if __name__ == "__main__": main()