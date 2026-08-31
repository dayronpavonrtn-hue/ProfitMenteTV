#!/usr/bin/env python3
"""ProfitMente Studio local server with zero-cost preview proxy generation."""
from __future__ import annotations

import argparse
import pathlib
import shutil
import subprocess
import tempfile
import urllib.parse
import webbrowser
import threading
from http import HTTPStatus
from http.server import ThreadingHTTPServer

import studio_server as base

MAX_PROXY_UPLOAD = 2 * 1024 * 1024 * 1024
PROXY_TIMEOUT_SECONDS = 900
VIDEO_CONTENT_TYPES = {
    "application/octet-stream",
    "video/mp4",
    "video/quicktime",
    "video/webm",
    "video/x-matroska",
    "video/x-msvideo",
}


def safe_suffix(filename: str) -> str:
    name = urllib.parse.unquote(str(filename or ""))
    suffix = pathlib.Path(name).suffix.lower()
    if suffix in {".mp4", ".mov", ".m4v", ".webm", ".avi", ".mkv"}:
        return suffix
    return ".video"


def build_proxy_command(source: pathlib.Path, output: pathlib.Path) -> list[str]:
    """Build a fast, broadly-decodable <=960px preview proxy command."""
    return [
        shutil.which("ffmpeg") or "ffmpeg",
        "-hide_banner", "-loglevel", "error", "-y",
        "-i", str(source),
        "-map", "0:v:0", "-map", "0:a?",
        "-vf", "scale=960:960:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2",
        "-c:v", "libx264", "-preset", "ultrafast", "-crf", "30",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart",
        "-c:a", "aac", "-b:a", "96k", "-ac", "2",
        str(output),
    ]


def create_preview_proxy(source: pathlib.Path, output: pathlib.Path, timeout: int = PROXY_TIMEOUT_SECONDS):
    cmd = build_proxy_command(source, output)
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    if result.returncode != 0 or not output.is_file() or output.stat().st_size <= 0:
        detail = (result.stderr or result.stdout or "FFmpeg no pudo crear el proxy").strip()[-3000:]
        raise RuntimeError(detail)
    return output


class Handler(base.Handler):
    server_version = "ProfitMenteStudio/1.6"

    def _read_proxy_upload(self):
        content_type = self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower()
        if content_type not in VIDEO_CONTENT_TYPES and not content_type.startswith("video/"):
            return None, (HTTPStatus.UNSUPPORTED_MEDIA_TYPE, "Se esperaba un archivo de video para crear el proxy.")
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if length <= 0:
            return None, (HTTPStatus.BAD_REQUEST, "Video vacío.")
        if length > MAX_PROXY_UPLOAD:
            return None, (HTTPStatus.REQUEST_ENTITY_TOO_LARGE, "El video supera 2 GB.")
        filename = self.headers.get("X-ProfitMente-Filename", "")
        td = pathlib.Path(tempfile.mkdtemp(prefix="profitmente-preview-proxy-"))
        source = td / ("source" + safe_suffix(filename))
        output = td / "preview-proxy.mp4"
        remaining = length
        try:
            with source.open("wb") as handle:
                while remaining:
                    chunk = self.rfile.read(min(1024 * 1024, remaining))
                    if not chunk:
                        break
                    handle.write(chunk)
                    remaining -= len(chunk)
            if remaining:
                shutil.rmtree(td, ignore_errors=True)
                return None, (HTTPStatus.BAD_REQUEST, "Carga de video incompleta.")
            return (td, source, output), None
        except Exception:
            shutil.rmtree(td, ignore_errors=True)
            raise

    def do_POST(self):
        path = urllib.parse.urlparse(self.path).path
        if path != "/api/media/proxy":
            return super().do_POST()
        if not self._same_local_origin():
            self._json(HTTPStatus.FORBIDDEN, {"ok": False, "error": "Origen local no autorizado."})
            return
        if not shutil.which("ffmpeg"):
            self._json(HTTPStatus.SERVICE_UNAVAILABLE, {"ok": False, "error": "FFmpeg no está disponible para crear proxies."})
            return
        payload, error = self._read_proxy_upload()
        if error:
            self._json(error[0], {"ok": False, "error": error[1]})
            return
        td, source, output = payload
        try:
            try:
                create_preview_proxy(source, output)
            except subprocess.TimeoutExpired:
                self._json(HTTPStatus.GATEWAY_TIMEOUT, {"ok": False, "error": "La creación del proxy superó 15 minutos."})
                return
            except Exception as exc:
                self._json(HTTPStatus.UNPROCESSABLE_ENTITY, {"ok": False, "error": str(exc)})
                return
            size = output.stat().st_size
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "video/mp4")
            self.send_header("Content-Length", str(size))
            self.send_header("X-ProfitMente-Preview-Proxy", "ready")
            self.end_headers()
            with output.open("rb") as handle:
                shutil.copyfileobj(handle, self.wfile, length=1024 * 1024)
        finally:
            shutil.rmtree(td, ignore_errors=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8080)
    parser.add_argument("--open-browser", action="store_true", help="Abrir Studio después de enlazar el servidor")
    args = parser.parse_args()
    address = ("127.0.0.1", args.port)
    url = f"http://127.0.0.1:{args.port}/studio/"
    httpd = ThreadingHTTPServer(address, Handler)
    print(f"ProfitMente Studio: {url}")
    print("Servidor local + proxies de preview $0. Ctrl+C para cerrar.")
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
