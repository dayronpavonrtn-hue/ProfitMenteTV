#!/usr/bin/env python3
import json,pathlib,subprocess,tempfile,sys
root=pathlib.Path(__file__).resolve().parent
with tempfile.TemporaryDirectory() as td:
    td=pathlib.Path(td); assets=td/'assets'; assets.mkdir(); src=assets/'source.mp4'; project=td/'project.json'; out=td/'out.mp4'
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','lavfi','-i','color=c=red:s=640x360:r=30:d=1.2','-c:v','libx264','-pix_fmt','yuv420p',str(src)],check=True)
    data={
      'version':'1.7','name':'transform-test','format':'9:16','duration':1.0,
      'assets':[{'id':'v1','name':'source.mp4','type':'video','mime':'video/mp4'}],
      'clips':[{'id':'c1','track':0,'name':'Transform','start':0,'duration':1,'asset':'v1','scale':0.55,'positionX':25,'positionY':-15,'rotation':12,'opacity':0.65,'transition':'cut','motion':'none'}]
    }
    project.write_text(json.dumps(data),encoding='utf-8')
    subprocess.run([sys.executable,str(root/'validate_project.py'),str(project),str(assets)],check=True)
    subprocess.run([sys.executable,str(root/'render_mp4.py'),str(project),str(assets),str(out)],check=True)
    probe=subprocess.run(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=width,height','-of','json',str(out)],check=True,capture_output=True,text=True)
    info=json.loads(probe.stdout); stream=info['streams'][0]
    assert stream['width']==1080 and stream['height']==1920, stream
    assert out.stat().st_size>1000
    print('visual transform render test OK')
