#!/usr/bin/env python3
import json, pathlib, subprocess, tempfile

root=pathlib.Path(__file__).resolve().parent
with tempfile.TemporaryDirectory() as td:
    td=pathlib.Path(td); assets=td/'assets'; assets.mkdir(); src=assets/'source.mp4'; out=td/'out.mp4'; project=td/'project.json'
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','lavfi','-i','testsrc2=size=640x360:rate=30','-t','1.2','-pix_fmt','yuv420p',str(src)],check=True)
    data={'version':'1.3','name':'fit-flip-test','format':'9:16','duration':1.0,'assets':[{'id':'v1','name':'source.mp4','type':'video'}],'clips':[{'id':'c1','track':0,'name':'fit','start':0,'duration':1.0,'asset':'v1','fitMode':'contain','flipX':True,'flipY':True}]}
    project.write_text(json.dumps(data),encoding='utf-8')
    subprocess.run(['python',str(root/'render_mp4.py'),str(project),str(assets),str(out)],check=True)
    probe=json.loads(subprocess.run(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=width,height','-of','json',str(out)],check=True,capture_output=True,text=True).stdout)
    stream=probe['streams'][0]
    assert stream['width']==1080 and stream['height']==1920,stream
    assert out.stat().st_size>1000
    print('fit/flip render regression OK',out.stat().st_size)
