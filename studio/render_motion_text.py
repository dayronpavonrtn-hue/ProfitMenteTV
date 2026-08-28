#!/usr/bin/env python3
"""Compatibility entrypoint for ProfitMente Motion renders.
Motion text is now composited directly by render_mp4.py, avoiding a second H.264 encode.
"""
import pathlib,subprocess,sys

if len(sys.argv)!=4:
    raise SystemExit('Usage: render_motion_text.py project.json assets_dir output.mp4')
root=pathlib.Path(__file__).resolve().parent
subprocess.run([sys.executable,str(root/'render_mp4.py'),sys.argv[1],sys.argv[2],sys.argv[3]],check=True)
print(f'Motion text render integrado: {sys.argv[3]}')
