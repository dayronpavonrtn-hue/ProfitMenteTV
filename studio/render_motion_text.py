#!/usr/bin/env python3
"""Render ProfitMente MP4, then composite track-2 Motion text layers with FFmpeg. $0/local only."""
import json,pathlib,subprocess,sys,tempfile,re

if len(sys.argv)!=4: raise SystemExit('Usage: render_motion_text.py project.json assets_dir output.mp4')
project_path=pathlib.Path(sys.argv[1]);assets=pathlib.Path(sys.argv[2]);out=pathlib.Path(sys.argv[3]);root=pathlib.Path(__file__).resolve().parent
project=json.loads(project_path.read_text(encoding='utf-8'));duration=max(.25,float(project.get('duration',45)))
state=project.get('trackState',{});motion_state=state.get('2',state.get(2,{})) if isinstance(state,dict) else {}
clips=[] if isinstance(motion_state,dict) and motion_state.get('hidden') else [c for c in project.get('clips',[]) if int(c.get('track',-1))==2 and str(c.get('name','')).strip()]

def clamp(v,lo,hi,default):
    try:return max(lo,min(hi,float(v)))
    except (TypeError,ValueError):return default

def esc(value):return str(value).replace('\\','\\\\').replace(':','\\:').replace("'","\\'").replace('%','\\%').replace(',','\\,').replace('[','\\[').replace(']','\\]')
def color(value,default):return value if re.fullmatch(r'#[0-9a-fA-F]{6}',str(value or '')) else default

out.parent.mkdir(parents=True,exist_ok=True)
with tempfile.TemporaryDirectory(prefix='profitmente-motion-') as td:
    base=pathlib.Path(td)/'base.mp4'
    subprocess.run([sys.executable,str(root/'render_mp4.py'),str(project_path),str(assets),str(base)],check=True)
    if not clips:
        base.replace(out);print(f'Motion text: sin capas activas · {out}');raise SystemExit(0)
    chain=[]
    for c in sorted(clips,key=lambda x:float(x.get('start',0))):
        start=max(0,clamp(c.get('start'),0,duration,0));end=min(duration,start+max(.05,clamp(c.get('duration'),.05,duration,1)));text=esc(c.get('name',''))
        style=c.get('textStyle','title');anim=c.get('textAnimation','pop');size=clamp(c.get('fontSize'),16,84,40)*2;x=clamp(c.get('textX'),-45,45,0);y=clamp(c.get('textY'),-45,45,-28);fg=color(c.get('textColor'),'#FFE66D').replace('#','0x');bg=color(c.get('boxColor'),'#000000').replace('#','0x');box=clamp(c.get('boxOpacity'),0,1,.55)
        xexpr=f'(w-text_w)/2+w*{x}/100';yexpr=f'(h-text_h)/2+h*{y}/100';alpha='1'
        if anim=='fade':alpha=f'min(1,max(0,(t-{start})/0.25))'
        elif anim=='slide-up':yexpr+=f'+if(lt(t,{start+.25}),80*(1-(t-{start})/0.25),0)';alpha=f'min(1,max(0,(t-{start})/0.20))'
        elif anim=='pop':yexpr+=f'-if(lt(t,{start+.30}),18*exp(-12*(t-{start}))*cos(30*(t-{start})),0)';alpha=f'min(1,max(0,(t-{start})/0.12))'
        border=8 if style=='title' else 5;boxborder=30 if style=='callout' else (24 if style=='title' else 16)
        chain.append(f"drawtext=text='{text}':fontcolor={fg}:fontsize={size}:borderw={border}:bordercolor=black@0.9:box=1:boxcolor={bg}@{box}:boxborderw={boxborder}:x='{xexpr}':y='{yexpr}':alpha='{alpha}':enable='between(t,{start},{end})'")
    vf=','.join(chain)
    cmd=['ffmpeg','-hide_banner','-y','-i',str(base),'-vf',vf,'-map','0:v:0','-map','0:a?','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-c:a','copy','-movflags','+faststart',str(out)]
    subprocess.run(cmd,check=True)
print(f'Motion text render QA OK: {out}')
