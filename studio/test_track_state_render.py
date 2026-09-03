#!/usr/bin/env python3
import json, pathlib, subprocess, sys, tempfile
ROOT=pathlib.Path(__file__).resolve().parent
with tempfile.TemporaryDirectory() as td:
    d=pathlib.Path(td); assets=d/'assets'; assets.mkdir(); src=assets/'source.mp4'; audio=assets/'voice.wav'; out=d/'out.mp4'; project=d/'project.json'
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','lavfi','-i','color=c=red:s=1080x1920:r=30:d=1.2','-f','lavfi','-i','sine=frequency=1000:duration=1.2','-shortest','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac',str(src)],check=True)
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','lavfi','-i','sine=frequency=440:duration=1.2','-c:a','pcm_s16le',str(audio)],check=True)
    data={'version':'1.3','name':'track-state-test','format':'9:16','duration':1.0,'trackState':{'0':{'hidden':True},'6':{'muted':True}},'assets':[{'id':'v','name':'source.mp4','type':'video'},{'id':'a','name':'voice.wav','type':'audio'}],'clips':[{'id':'vc','track':0,'asset':'v','name':'red','start':0,'duration':1.0},{'id':'ac','track':6,'asset':'a','name':'voice','start':0,'duration':1.0}]}
    project.write_text(json.dumps(data),encoding='utf-8')
    subprocess.run([sys.executable,str(ROOT/'validate_project.py'),str(project),str(assets)],check=True)
    subprocess.run([sys.executable,str(ROOT/'render_mp4.py'),str(project),str(assets),str(out)],check=True)
    probe=json.loads(subprocess.run(['ffprobe','-v','error','-show_entries','stream=codec_type','-of','json',str(out)],check=True,capture_output=True,text=True).stdout)
    kinds=[s.get('codec_type') for s in probe.get('streams',[])]
    assert kinds.count('video')==1, kinds
    assert 'audio' not in kinds, kinds
    pixel=subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-i',str(out),'-frames:v','1','-vf','scale=1:1','-f','rawvideo','-pix_fmt','rgb24','-'],check=True,capture_output=True).stdout[:3]
    assert len(pixel)==3 and max(pixel)<20, list(pixel)

    # A disabled track must not require its missing source media. This is important
    # for imported/relinked projects where an unused track can intentionally stay offline.
    missing=d/'missing-project.json'; missing_out=d/'missing-out.mp4'
    missing_data={'version':'1.7','name':'disabled-missing','format':'9:16','duration':1.0,'trackState':{'0':{'hidden':True},'2':{'hidden':True},'3':{'hidden':True},'6':{'muted':True}},'assets':[],'clips':[{'id':'mv','track':0,'asset':'gone-video','name':'hidden missing visual','start':0,'duration':1.0,'fitMode':'bad','speed':99},{'id':'mm','track':2,'name':'','start':0,'duration':1.0,'textStyle':'bad'},{'id':'mc','track':3,'name':'hidden caption','start':0,'duration':1.0},{'id':'ma','track':6,'asset':'gone-audio','name':'muted missing audio','start':0,'duration':1.0,'fadeIn':99}]}
    missing.write_text(json.dumps(missing_data),encoding='utf-8')
    subprocess.run([sys.executable,str(ROOT/'validate_project.py'),str(missing),str(assets)],check=True)
    subprocess.run([sys.executable,str(ROOT/'render_mp4.py'),str(missing),str(assets),str(missing_out)],check=True)
    missing_probe=json.loads(subprocess.run(['ffprobe','-v','error','-show_entries','stream=codec_type','-of','json',str(missing_out)],check=True,capture_output=True,text=True).stdout)
    missing_kinds=[s.get('codec_type') for s in missing_probe.get('streams',[])]
    assert missing_kinds.count('video')==1 and 'audio' not in missing_kinds, missing_kinds

    # Legacy/imported JSON can persist track numbers as strings. validate_project.py
    # intentionally accepts integral numeric strings, so the renderer must consume the
    # exact same semantic tracks instead of silently dropping video/audio at selection.
    legacy=d/'legacy-string-tracks.json'; legacy_out=d/'legacy-string-tracks.mp4'
    legacy_data={'version':'1.0','name':'legacy-string-tracks','format':'9:16','duration':'1.0','trackState':{},'assets':[{'id':'v','name':'source.mp4','type':'video'},{'id':'a','name':'voice.wav','type':'audio'}],'clips':[{'id':'legacy-v','track':'0.0','asset':'v','name':'legacy red','start':'0','duration':'1.0'},{'id':'legacy-a','track':'6','asset':'a','name':'legacy voice','start':'0','duration':'1.0'}]}
    legacy.write_text(json.dumps(legacy_data),encoding='utf-8')
    subprocess.run([sys.executable,str(ROOT/'validate_project.py'),str(legacy),str(assets)],check=True)
    subprocess.run([sys.executable,str(ROOT/'render_mp4.py'),str(legacy),str(assets),str(legacy_out)],check=True)
    legacy_probe=json.loads(subprocess.run(['ffprobe','-v','error','-show_entries','stream=codec_type','-of','json',str(legacy_out)],check=True,capture_output=True,text=True).stdout)
    legacy_kinds=[s.get('codec_type') for s in legacy_probe.get('streams',[])]
    assert legacy_kinds.count('video')==1 and 'audio' in legacy_kinds, legacy_kinds
    legacy_pixel=subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-i',str(legacy_out),'-frames:v','1','-vf','scale=1:1','-f','rawvideo','-pix_fmt','rgb24','-'],check=True,capture_output=True).stdout[:3]
    assert len(legacy_pixel)==3 and legacy_pixel[0]>100 and legacy_pixel[0]>legacy_pixel[1]*2 and legacy_pixel[0]>legacy_pixel[2]*2, list(legacy_pixel)
    print('Track-state render OK:', list(pixel), kinds, 'disabled-missing:', missing_kinds, 'legacy-string-tracks:', legacy_kinds, list(legacy_pixel))
