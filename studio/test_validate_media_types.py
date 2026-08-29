#!/usr/bin/env python3
import json,pathlib,subprocess,sys,tempfile

ROOT=pathlib.Path(__file__).resolve().parent
VALIDATOR=ROOT/'validate_project.py'

def run(project):
    with tempfile.TemporaryDirectory(prefix='profitmente-validate-') as td:
        path=pathlib.Path(td)/'project.json'
        path.write_text(json.dumps(project),encoding='utf-8')
        return subprocess.run([sys.executable,str(VALIDATOR),str(path)],capture_output=True,text=True)

def project(asset_type,track):
    return {
        'format':'9:16','duration':5,
        'assets':[{'id':'a1','name':'sample.bin','type':asset_type}],
        'clips':[{'id':'c1','track':track,'start':0,'duration':2,'asset':'a1'}]
    }

bad_visual=run(project('audio',0))
assert bad_visual.returncode==2, bad_visual.stdout+bad_visual.stderr
assert 'incompatible con track 0' in bad_visual.stdout

bad_audio=run(project('image',6))
assert bad_audio.returncode==2, bad_audio.stdout+bad_audio.stderr
assert 'incompatible con track 6' in bad_audio.stdout

ok_image=run(project('image',1))
assert ok_image.returncode==0, ok_image.stdout+ok_image.stderr

ok_video_audio=run(project('video',5))
assert ok_video_audio.returncode==0, ok_video_audio.stdout+ok_video_audio.stderr

print('Media type render preflight QA OK')
