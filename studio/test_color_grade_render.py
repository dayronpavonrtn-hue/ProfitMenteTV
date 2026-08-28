#!/usr/bin/env python3
import json,subprocess,tempfile,pathlib,sys
root=pathlib.Path(__file__).resolve().parent
with tempfile.TemporaryDirectory() as td:
    td=pathlib.Path(td); assets=td/'assets'; assets.mkdir(); src=assets/'red.mp4'; out=td/'graded.mp4'; project=td/'project.json'
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','lavfi','-i','color=c=red:s=640x360:r=30:d=1.2','-c:v','libx264','-pix_fmt','yuv420p',str(src)],check=True)
    data={'version':'1.3','name':'Color QA','mode':'Manual','duration':1.0,'format':'9:16','assets':[{'id':'a1','name':'red.mp4','type':'video','mime':'video/mp4'}],'clips':[{'id':'c1','track':0,'name':'red','asset':'a1','start':0,'duration':1.0,'brightness':-20,'contrast':20,'saturation':-100,'hue':45}]}
    project.write_text(json.dumps(data),encoding='utf-8')
    subprocess.run([sys.executable,str(root/'render_mp4.py'),str(project),str(assets),str(out)],check=True)
    probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=width,height','-of','json',str(out)],text=True))
    s=probe['streams'][0]; assert (s['width'],s['height'])==(1080,1920),s
    raw=subprocess.check_output(['ffmpeg','-hide_banner','-loglevel','error','-i',str(out),'-vf','select=eq(n\,10),scale=1:1,format=rgb24','-frames:v','1','-f','rawvideo','-'])
    assert len(raw)>=3
    r,g,b=raw[:3]; assert max(r,g,b)-min(r,g,b)<18,(r,g,b)
    assert max(r,g,b)<210,(r,g,b)
    print('Color grade render OK',r,g,b)
