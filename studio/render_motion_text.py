#!/usr/bin/env python3
"""Compatibility entrypoint for ProfitMente Motion renders.
Motion text is composited directly by render_mp4.py, avoiding a second H.264 encode.
Long captions and Motion titles are normalized only for the render copy so the
saved Studio project remains unchanged.
"""
import json,pathlib,subprocess,sys,tempfile
from caption_compact import compact_project_captions
from motion_text_layout import expand_motion_text

if len(sys.argv)!=4:
    raise SystemExit('Usage: render_motion_text.py project.json assets_dir output.mp4')
root=pathlib.Path(__file__).resolve().parent
project_path=pathlib.Path(sys.argv[1])
project=json.loads(project_path.read_text(encoding='utf-8'))
render_project=expand_motion_text(compact_project_captions(project))
with tempfile.TemporaryDirectory(prefix='profitmente-render-project-') as td:
    prepared=pathlib.Path(td)/'project.render.json'
    prepared.write_text(json.dumps(render_project,ensure_ascii=False),encoding='utf-8')
    subprocess.run([sys.executable,str(root/'render_mp4.py'),str(prepared),sys.argv[2],sys.argv[3]],check=True)
print(f'Motion text y captions integrados: {sys.argv[3]}')
