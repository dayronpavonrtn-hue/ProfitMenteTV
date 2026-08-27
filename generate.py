import asyncio,json,textwrap
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFont
import edge_tts
from moviepy.editor import AudioFileClip,ImageClip,CompositeVideoClip
R=Path(__file__).parent;O=R/'output';O.mkdir(exist_ok=True)
cfg=json.loads((R/'video.json').read_text(encoding='utf-8'));plan=json.loads((R/'scenes.json').read_text(encoding='utf-8'))['scenes']
audio=O/'voice.mp3';out=O/'ProfitMenteTV.mp4';W,H=720,1280
async def voice(): await edge_tts.Communicate(cfg['script'],'es-MX-JorgeNeural',rate='+2%',pitch='-2Hz').save(str(audio))
def f(n): return ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',n)
def wrapdraw(d,text,y,size,width,fill='white'):
 lines=textwrap.wrap(text,width=width);font=f(size); boxes=[d.textbbox((0,0),x,font=font) for x in lines];yy=y
 for x,b in zip(lines,boxes):
  ww=b[2]-b[0];d.text(((W-ww)//2,yy),x,font=font,fill=fill,stroke_width=2,stroke_fill='black');yy+=b[3]-b[1]+12
def scene(s,index):
 im=Image.new('RGB',(W,H),(8+index*2,15,30+index*5));d=ImageDraw.Draw(im)
 for k in range(12):
  y=120+k*95; d.line((0,y,W,y-180),fill=(22+index*5,45,72),width=2)
 d.rounded_rectangle((55,110,665,205),24,fill=(5,8,16));d.text((82,132),'PROFITMENTE TV',font=f(30),fill=(255,220,60))
 d.rounded_rectangle((235,300,485,550),55,fill=(15,28,48),outline=(255,220,60),width=5)
 icon=s['icon'];b=d.textbbox((0,0),icon,font=f(64));d.text(((W-(b[2]-b[0]))//2,385),icon,font=f(64),fill=(255,220,60))
 wrapdraw(d,s['title'],650,48,22,(255,255,255));wrapdraw(d,s['subtitle'],830,32,35,(210,220,235))
 d.rounded_rectangle((55,1160,665,1170),5,fill=(45,60,80));progress=int(610*(index+1)/len(plan));d.rounded_rectangle((55,1160,55+progress,1170),5,fill=(255,220,60))
 return np.array(im)
def subtitle(text):
 im=Image.new('RGBA',(W,H),(0,0,0,0));d=ImageDraw.Draw(im);font=f(39);lines=textwrap.wrap(text,28);boxes=[d.textbbox((0,0),x,font=font) for x in lines];total=sum(b[3]-b[1]+8 for b in boxes);yy=1030-total//2
 for x,b in zip(lines,boxes):
  ww=b[2]-b[0];xx=(W-ww)//2;d.rounded_rectangle((xx-12,yy-5,xx+ww+12,yy+b[3]-b[1]+6),10,fill=(0,0,0,190));d.text((xx,yy),x,font=font,fill='white',stroke_width=2,stroke_fill='black');yy+=b[3]-b[1]+8
 return np.array(im)
asyncio.run(voice());a=AudioFileClip(str(audio));dur=a.duration
weights=[s.get('weight',1) for s in plan];total=sum(weights);clips=[];t=0
for i,s in enumerate(plan):
 sd=dur*weights[i]/total;clips.append(ImageClip(scene(s,i)).set_start(t).set_duration(sd).crossfadein(.25));t+=sd
words=cfg['script'].split();parts=[' '.join(words[i:i+6]) for i in range(0,len(words),6)];slot=dur/max(1,len(parts))
for i,x in enumerate(parts): clips.append(ImageClip(subtitle(x)).set_start(i*slot).set_duration(slot+.04))
v=CompositeVideoClip(clips,size=(W,H)).set_audio(a);v.write_videofile(str(out),fps=24,codec='libx264',audio_codec='aac',preset='veryfast',threads=2,bitrate='2800k');print(out)
