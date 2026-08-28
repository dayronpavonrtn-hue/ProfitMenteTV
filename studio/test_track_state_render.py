#!/usr/bin/env python3
import json, pathlib, subprocess, sys, tempfile
ROOT=pathlib.Path(__file__).resolve().parent
with tempfile.TemporaryDirectory() as td:
    d=pathlib.Path(td); assets=d/'assets'; assets.mkdir(); src=assets/'source.mp4'; audio=assets/'voice.wav'; out=d/'out.mp4'; project=d/'project.json'
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','lavfi','-i','color=c=red:s=1080x1920:r=30:d=1.2','-f','lavfi','-i','sine=frequency=1000:duration=1.2','-shortest','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac',str(src)],check=True)
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','lavfi','-i','sine=frequency=440:duration=1.2','-c:a','pcm_s16le',str(audio)],check=True)
    data={'version':'1.3','name':'track-state-test','format':'9:16','duration':1.0,'trackState':{'0':{'hidden':True},'6':{'muted':True}},'assets':[{'id':'v','name':'source.mp4','type':'video'},{'id':'a','name':'voice.wav','type':'audio'}],'clips':[{'id':'vc','track':0,'asset':'v','name':'red','start':0,'duration':1.0},{'id':'ac','track':6,'asset':'a','name':'voice','start':0,'duration':1.0}]}
    project.write_text(json.dumps(data),encoding='utf-8')
    subprocess.run([sys.executable,str(ROOT/'render_mp4.py'),str(project),str(assets),str(out)],check=True)
    probe=json.loads(subprocess.run(['ffprobe','-v','error','-show_entries','stream=codec_type','-of','json',str(out)],check=True,capture_output=True,text=True).stdout)
    kinds=[s.get('codec_type') for s in probe.get('streams',[])]
    assert kinds.count('video')==1, kinds
    assert 'audio' not in kinds, kinds
    pixel=subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-i',str(out),'-frames:v','1','-vf','scale=1:1','-f','rawvideo','-pix_fmt','rgb24','-'],check=True,capture_output=True).stdout[:3]
    assert len(pixel)==3 and max(pixel)<20, list(pixel)
    print('Track-state render OK:', list(pixel), kinds)
