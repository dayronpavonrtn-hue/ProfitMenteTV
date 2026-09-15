#!/usr/bin/env python3
import io
import pathlib
import subprocess
import sys
import tarfile
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
RENDER = ROOT / 'render_bundle.py'
MAX_MEMBERS = 4096

with tempfile.TemporaryDirectory(prefix='profitmente-bundle-budget-test-') as td:
    td = pathlib.Path(td)
    bundle = td / 'too-many.profitmente.tar'
    output = td / 'out.mp4'
    with tarfile.open(bundle, 'w') as tar:
        for index in range(MAX_MEMBERS + 1):
            info = tarfile.TarInfo(f'assets/empty-{index}.bin')
            info.size = 0
            tar.addfile(info, io.BytesIO(b''))
    result = subprocess.run(
        [sys.executable, str(RENDER), str(bundle), str(output)],
        capture_output=True,
        text=True,
    )
    detail = (result.stdout or '') + '\n' + (result.stderr or '')
    if result.returncode == 0:
        raise SystemExit('Expected oversized member-count bundle to be rejected')
    if 'demasiados archivos' not in detail:
        raise SystemExit('Bundle member budget did not fail at extraction preflight:\n' + detail)
    if output.exists():
        raise SystemExit('Rejected bundle must not publish an MP4')

print('Bundle extraction budget regression OK')
