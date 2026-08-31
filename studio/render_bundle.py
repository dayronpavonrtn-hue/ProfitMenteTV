#!/usr/bin/env python3
"""Render a .profitmente.tar exported by Studio to MP4 with local FFmpeg."""
import json,pathlib,sys,tarfile,tempfile,subprocess
from track_state_render import normalize_track_solo
if len(sys.argv)!=3: raise SystemExit('Usage: render_bundle.py bundle.profitmente.tar output.mp4')
bundle=pathlib.Path(sys.argv[1]); out=pathlib.Path(sys.argv[2]); root=pathlib.Path(__file__).resolve().parent
if not bundle.is_file(): raise FileNotFoundError(bundle)
with tempfile.TemporaryDirectory(prefix='profitmente-bundle-') as td:
    td=pathlib.Path(td)
    with tarfile.open(bundle,'r:') as tar:
        for m in tar.getmembers():
            dest=(td/m.name).resolve()
            if td.resolve() not in dest.parents and dest!=td.resolve(): raise RuntimeError(f'Ruta insegura en bundle: {m.name}')
        tar.extractall(td)
    project=td/'project.json'; assets=td/'assets'
    if not project.is_file(): raise RuntimeError('Bundle inválido: falta project.json')
    assets.mkdir(exist_ok=True)
    # Solo is semantic state, not just a browser UI effect. Re-derive hidden/muted
    # before validation so non-Solo offline media is not required and preview,
    # validation, FFmpeg and post-render QA all consume the same effective tracks.
    data=json.loads(project.read_text(encoding='utf-8'))
    project.write_text(json.dumps(normalize_track_solo(data),ensure_ascii=False),encoding='utf-8')
    subprocess.run([sys.executable,str(root/'validate_project.py'),str(project),str(assets)],check=True)
    subprocess.run([sys.executable,str(root/'render_motion_text.py'),str(project),str(assets),str(out)],check=True)
    report=out.with_suffix(out.suffix+'.qc.json')
    qc=subprocess.run([sys.executable,str(root/'output_qc.py'),str(project),str(out),str(report)],capture_output=True,text=True)
    if qc.returncode!=0:
        detail=(qc.stdout or qc.stderr or 'Post-render QA falló').strip()
        raise RuntimeError(detail)
    data=json.loads(report.read_text(encoding='utf-8'))
    print(f"Post-render QA {data.get('score',0)}/100 OK")
print(f'Bundle render QA OK: {out}')