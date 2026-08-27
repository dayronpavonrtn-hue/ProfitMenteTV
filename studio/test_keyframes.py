#!/usr/bin/env python3
import json, pathlib, subprocess, sys, tempfile

root=pathlib.Path(__file__).resolve().parent
with tempfile.TemporaryDirectory() as td:
    work=pathlib.Path(td); assets=work/'assets'; assets.mkdir(); src=assets/'source.png'; out=work/'keyframes.mp4'; project=work/'project.json'
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','lavfi','-i','color=c=0x3366aa:s=640x360','-frames:v','1',str(src)],check=True)
    data={
      'format':'9:16','duration':2,'assets':[{'id':'img','name':'source.png','type':'image'}],
      'clips':[{'id':'clip','track':0,'name':'Keyframe test','asset':'img','start':0,'duration':2,'fitMode':'contain','keyframes':{
        'start':{'positionX':-25,'positionY':-10,'scale':0.7,'rotation':-8,'opacity':1},
        'end':{'positionX':25,'positionY':10,'scale':1.2,'rotation':8,'opacity':1}
      }}]
    }
    project.write_text(json.dumps(data),encoding='utf-8')
    subprocess.run([sys.executable,str(root/'render_mp4.py'),str(project),str(assets),str(out)],check=True)
    probe=json.loads(subprocess.run(['ffprobe','-v','error','-show_entries','stream=codec_type,width,height','-show_entries','format=duration','-of','json',str(out)],check=True,capture_output=True,text=True).stdout)
    video=next(s for s in probe['streams'] if s.get('codec_type')=='video')
    assert video['width']==1080 and video['height']==1920, video
    assert 1.8 <= float(probe['format']['duration']) <= 2.2, probe
    assert out.stat().st_size>1000
    print('Keyframe render OK',out.stat().st_size)
