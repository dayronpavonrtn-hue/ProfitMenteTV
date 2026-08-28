#!/usr/bin/env python3
import json,pathlib,subprocess,sys,tempfile
ROOT=pathlib.Path(__file__).resolve().parent

def yellow_pixels(raw):
    return sum(1 for i in range(0,len(raw)-2,3) if raw[i]>175 and raw[i+1]>135 and raw[i+2]<150)

def render(td,hidden=False):
    assets=td/'assets';assets.mkdir(exist_ok=True);project=td/('hidden.json' if hidden else 'visible.json');out=td/('hidden.mp4' if hidden else 'visible.mp4')
    data={'version':'1.8','name':'Motion QA','format':'9:16','duration':1.2,'assets':[],'trackState':{'2':{'hidden':hidden}},'clips':[{'id':'motion-1','track':2,'name':'PROFITMENTE AI','start':0.1,'duration':0.9,'textStyle':'title','textAnimation':'slide-up','textX':0,'textY':0,'fontSize':46,'textColor':'#FFE66D','boxColor':'#000000','boxOpacity':0.55}]}
    project.write_text(json.dumps(data),encoding='utf-8')
    subprocess.run([sys.executable,str(ROOT/'render_motion_text.py'),str(project),str(assets),str(out)],check=True)
    if not out.is_file() or out.stat().st_size<1000:raise AssertionError('MP4 Motion no fue generado')
    raw=subprocess.run(['ffmpeg','-v','error','-ss','0.50','-i',str(out),'-frames:v','1','-f','rawvideo','-pix_fmt','rgb24','pipe:1'],check=True,capture_output=True).stdout
    return out,yellow_pixels(raw)

with tempfile.TemporaryDirectory(prefix='profitmente-motion-test-') as tmp:
    td=pathlib.Path(tmp);visible_out,visible=render(td,False);hidden_out,hidden=render(td,True)
    if visible<1000:raise AssertionError(f'El título Motion no apareció en el MP4: {visible} píxeles amarillos')
    if hidden>50:raise AssertionError(f'La pista Motion oculta siguió apareciendo: {hidden} píxeles amarillos')
    probe=subprocess.run(['ffprobe','-v','error','-show_entries','stream=codec_type,width,height','-show_entries','format=duration','-of','json',str(visible_out)],check=True,capture_output=True,text=True)
    info=json.loads(probe.stdout);video=next((s for s in info.get('streams',[]) if s.get('codec_type')=='video'),None)
    if not video or (int(video.get('width',0)),int(video.get('height',0)))!=(1080,1920):raise AssertionError(f'Resolución Motion incorrecta: {video}')
    print(json.dumps({'ok':True,'visible_yellow_pixels':visible,'hidden_yellow_pixels':hidden,'bytes':visible_out.stat().st_size},indent=2))
