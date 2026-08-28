#!/usr/bin/env python3
import json,pathlib,subprocess,sys,tempfile
ROOT=pathlib.Path(__file__).resolve().parent
with tempfile.TemporaryDirectory(prefix='profitmente-motion-test-') as td:
    td=pathlib.Path(td); assets=td/'assets'; assets.mkdir(); project=td/'project.json'; out=td/'motion.mp4'
    data={
      'version':'1.7','name':'Motion QA','format':'9:16','duration':1.4,'assets':[],
      'clips':[{'id':'motion-1','track':2,'name':'PROFITMENTE AI','start':0.1,'duration':1.0,'textStyle':'title','textAnimation':'slide-up','textX':0,'textY':-20,'fontSize':34,'textColor':'#FFE66D','boxColor':'#000000','boxOpacity':0.55}]
    }
    project.write_text(json.dumps(data),encoding='utf-8')
    subprocess.run([sys.executable,str(ROOT/'render_motion_text.py'),str(project),str(assets),str(out)],check=True)
    if not out.is_file() or out.stat().st_size<1000: raise AssertionError('MP4 Motion no fue generado')
    probe=subprocess.run(['ffprobe','-v','error','-show_entries','stream=codec_type,width,height','-show_entries','format=duration','-of','json',str(out)],check=True,capture_output=True,text=True)
    info=json.loads(probe.stdout); video=next((s for s in info.get('streams',[]) if s.get('codec_type')=='video'),None)
    if not video: raise AssertionError('MP4 Motion sin video')
    if (int(video.get('width',0)),int(video.get('height',0)))!=(1080,1920): raise AssertionError(f'Resolución incorrecta: {video}')
    duration=float(info.get('format',{}).get('duration',0) or 0)
    if not 1.0<=duration<=2.2: raise AssertionError(f'Duración incorrecta: {duration}')
    print('Motion text FFmpeg render QA OK',out.stat().st_size)
