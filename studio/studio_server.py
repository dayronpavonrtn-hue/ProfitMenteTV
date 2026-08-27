#!/usr/bin/env python3
"""Local-only ProfitMente Studio server with a zero-cost MP4 render endpoint."""
from __future__ import annotations
import argparse
import json
import pathlib
import shutil
import subprocess
import sys
import tempfile
import threading
import webbrowser
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

ROOT = pathlib.Path(__file__).resolve().parent.parent
STUDIO = ROOT / "studio"
MAX_UPLOAD = 2 * 1024 * 1024 * 1024  # 2 GB safety ceiling


class Handler(SimpleHTTPRequestHandler):
    server_version = "ProfitMenteStudio/1.1"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def _json(self, status: int, payload: dict):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if urlparse(self.path).path == "/api/health":
            ffmpeg = shutil.which("ffmpeg")
            self._json(HTTPStatus.OK, {
                "ok": True,
                "python": sys.version.split()[0],
                "ffmpeg": bool(ffmpeg),
                "render_ready": bool(ffmpeg),
            })
            return
        super().do_GET()

    def do_POST(self):
        if urlparse(self.path).path != "/api/render":
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        if not shutil.which("ffmpeg"):
            self._json(HTTPStatus.SERVICE_UNAVAILABLE, {
                "ok": False,
                "error": "FFmpeg no está instalado o no está disponible en PATH."
            })
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if length <= 0:
            self._json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "Paquete vacío."})
            return
        if length > MAX_UPLOAD:
            self._json(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, {"ok": False, "error": "El paquete supera 2 GB."})
            return
        with tempfile.TemporaryDirectory(prefix="profitmente-local-render-") as td:
            td = pathlib.Path(td)
            bundle = td / "project.profitmente.tar"
            output = td / "output.mp4"
            remaining = length
            with bundle.open("wb") as f:
                while remaining:
                    chunk = self.rfile.read(min(1024 * 1024, remaining))
                    if not chunk:
                        break
                    f.write(chunk)
                    remaining -= len(chunk)
            if remaining:
                self._json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "Carga incompleta."})
                return
            try:
                result = subprocess.run(
                    [sys.executable, str(STUDIO / "render_bundle.py"), str(bundle), str(output)],
                    cwd=str(ROOT), capture_output=True, text=True, timeout=1800
                )
            except subprocess.TimeoutExpired:
                self._json(HTTPStatus.GATEWAY_TIMEOUT, {"ok": False, "error": "El render superó 30 minutos."})
                return
            if result.returncode != 0 or not output.is_file():
                detail = (result.stderr or result.stdout or "Error desconocido de render").strip()[-4000:]
                self._json(HTTPStatus.INTERNAL_SERVER_ERROR, {"ok": False, "error": detail})
                return
            size = output.stat().st_size
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "video/mp4")
            self.send_header("Content-Disposition", 'attachment; filename="profitmente-render.mp4"')
            self.send_header("Content-Length", str(size))
            self.end_headers()
            with output.open("rb") as f:
                shutil.copyfileobj(f, self.wfile, length=1024 * 1024)

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
    if args.open_browser:
        threading.Timer(0.15, lambda: webbrowser.open(url, new=2)).start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nProfitMente Studio cerrado.")
    finally:
        httpd.server_close()


if __name__ == "__main__":
    main()
