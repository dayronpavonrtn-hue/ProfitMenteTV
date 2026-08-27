#!/usr/bin/env python3
"""Render a .profitmente.tar exported by Studio to MP4 with the existing FFmpeg engine."""
import pathlib,sys,tarfile,tempfile,subprocess
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
    subprocess.run([sys.executable,str(root/'validate_project.py'),str(project),str(assets)],check=True)
    subprocess.run([sys.executable,str(root/'render_mp4.py'),str(project),str(assets),str(out)],check=True)
print(f'Bundle render QA OK: {out}')