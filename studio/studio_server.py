#!/usr/bin/env python3
"""Local-only ProfitMente Studio server with zero-cost MP4 render endpoints."""
from __future__ import annotations
import argparse
import json
import pathlib
import shutil
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


def _read_qc(output: pathlib.Path):
    report = output.with_suffix(output.suffix + ".qc.json")
    if not report.is_file():
        return None
    try:
        value = json.loads(report.read_text(encoding="utf-8"))
        return value if isinstance(value, dict) else None
    except (OSError, json.JSONDecodeError):
        return None


def _wait_for_render_slot(job_id: str) -> bool:
    """Wait for the single local render slot while honoring queue cancellation."""
    while True:
        with RENDER_LOCK:
            job = RENDER_JOBS.get(job_id)
            if not job or job.get("cancel_requested") or job.get("status") == "cancelled":
                if job and job.get("status") != "cancelled":
                    job.update(status="cancelled", progress=0)
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
                    job.update(status="cancelled", progress=0)
                    _cleanup_job_files(job)
                return
            job.update(status="rendering", progress=35)
            cmd = [sys.executable, str(STUDIO / "render_bundle.py"), str(job["bundle"]), str(job["output"])]
            proc = subprocess.Popen(cmd, cwd=str(ROOT), stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            job["process"] = proc
        try:
            stdout, stderr = proc.communicate(timeout=1800)
        except subprocess.TimeoutExpired:
            proc.kill()
            stdout, stderr = proc.communicate()
            with RENDER_LOCK:
                job = RENDER_JOBS.get(job_id)
                if job:
                    job.update(status="error", progress=100, error="El render superó 30 minutos.", process=None)
            return
        with RENDER_LOCK:
            job = RENDER_JOBS.get(job_id)
            if not job:
                return
            job["process"] = None
            if job.get("cancel_requested"):
                job.update(status="cancelled", progress=0)
                _cleanup_job_files(job)
                return
            output = pathlib.Path(job["output"])
            if proc.returncode != 0 or not output.is_file():
                detail = (stderr or stdout or "Error desconocido de render").strip()[-4000:]
                job.update(status="error", progress=100, error=detail)
                return
            qc = _read_qc(output)
            if not qc or not qc.get("ok"):
                detail = "El MP4 terminó pero no superó el control post-render."
                if qc and qc.get("issues"):
                    detail += " " + " ".join(str(x) for x in qc["issues"][:3])
                job.update(status="error", progress=100, error=detail, qc=qc)
                return
            job.update(status="done", progress=100, size=output.stat().st_size, qc=qc)
    except Exception as exc:
        with RENDER_LOCK:
            job = RENDER_JOBS.get(job_id)
            if job and job.get("status") not in ("cancelled", "done"):
                job.update(status="error", progress=100, error=str(exc), process=None)
    finally:
        RENDER_SLOT.release()


class Handler(SimpleHTTPRequestHandler):
    server_version = "ProfitMenteStudio/1.5"

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
                "post_render_qc": True,
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
            try:
                with output.open("rb") as f:
                    shutil.copyfileobj(f, self.wfile, length=1024 * 1024)
            finally:
                with RENDER_LOCK:
                    job = RENDER_JOBS.pop(job_id, None)
                    if job: _cleanup_job_files(job)
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
        with RENDER_LOCK:
            job = RENDER_JOBS.get(job_id)
            if not job:
                self._json(HTTPStatus.NOT_FOUND, {"ok": False, "error": "Trabajo de render no encontrado."}); return
            if job.get("status") == "done":
                self._json(HTTPStatus.CONFLICT, {"ok": False, "error": "El render ya terminó."}); return
            job["cancel_requested"] = True
            proc = job.get("process")
            if proc and proc.poll() is None:
                proc.terminate()
            if job.get("status") == "queued":
                job.update(status="cancelled", progress=0)
                _cleanup_job_files(job)
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
            job = {"id": job_id, "status": "queued", "progress": 10, "created": time.time(), "tempdir": str(td), "bundle": str(bundle), "output": str(output), "process": None, "cancel_requested": False, "error": None, "qc": None}
            with RENDER_LOCK: RENDER_JOBS[job_id] = job
            threading.Thread(target=_run_render_job, args=(job_id,), daemon=True).start()
            self._json(HTTPStatus.ACCEPTED, _job_snapshot(job)); return
        # Legacy synchronous render uses the same slot so it cannot overload a
        # machine while an async render is already running.
        RENDER_SLOT.acquire()
        try:
            try:
                result = subprocess.run([sys.executable, str(STUDIO / "render_bundle.py"), str(bundle), str(output)], cwd=str(ROOT), capture_output=True, text=True, timeout=1800)
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
