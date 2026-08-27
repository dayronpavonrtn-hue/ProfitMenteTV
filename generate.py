import asyncio,json,textwrap,math
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFont
import edge_tts
from moviepy.editor import AudioFileClip,ImageClip,CompositeVideoClip
R=Path(__file__).parent; O=R/'output'; O.mkdir(exist_ok=True)
cfg=json.loads((R/'video.json').read_text(encoding='utf-8'))
audio=O/'voice.mp3'; out=O/'ProfitMenteTV.mp4'
async def voice(): await edge_tts.Communicate(cfg['script'],'es-MX-JorgeNeural',rate='+2%',pitch='-2Hz').save(str(audio))
def font(n):
 p='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'; return ImageFont.truetype(p,n)
W,H=720,1280
def layer(text,y,size=42,width=25,accent=False):
 im=Image.new('RGBA',(W,H),(0,0,0,0));d=ImageDraw.Draw(im);f=font(size);lines=textwrap.wrap(text,width=width)
 boxes=[d.textbbox((0,0),x,font=f,stroke_width=2) for x in lines]; total=sum(b[3]-b[1]+10 for b in boxes);yy=y-total//2
 for x,b in zip(lines,boxes):
  ww=b[2]-b[0]; xx=(W-ww)//2
  if accent: d.rounded_rectangle((xx-18,yy-10,xx+ww+18,yy+(b[3]-b[1])+10),radius=16,fill=(0,0,0,175))
  d.text((xx,yy),x,font=f,fill=(255,220,60,255) if accent else 'white',stroke_width=2,stroke_fill='black');yy+=b[3]-b[1]+10
 return np.array(im)
def background():
 im=Image.new('RGB',(W,H));p=im.load()
 for y in range(H):
  t=y/H
  for x in range(W): p[x,y]=(8+int(12*t),15+int(18*t),30+int(38*t))
 d=ImageDraw.Draw(im)
 for i in range(7):
  x=60+i*105; d.ellipse((x,220+i*55,x+180,400+i*55),outline=(30,65,105),width=3)
 return np.array(im)
asyncio.run(voice());a=AudioFileClip(str(audio));dur=a.duration
base=ImageClip(background()).set_duration(dur)
clips=[base,ImageClip(layer('PROFITMENTE TV',72,30,30,True)).set_duration(dur),ImageClip(layer(cfg['hook'],300,50,21,True)).set_duration(min(4.2,dur))]
w=cfg['script'].split();parts=[' '.join(w[i:i+6]) for i in range(0,len(w),6)];slot=dur/max(1,len(parts))
for i,t in enumerate(parts):
 c=ImageClip(layer(t,980,42,25,i%3==0)).set_start(i*slot).set_duration(slot+.05)
 clips.append(c)
clips.append(ImageClip(layer(cfg['closing'],610,48,24,True)).set_start(max(0,dur-4)).set_duration(4))
v=CompositeVideoClip(clips,size=(W,H)).set_audio(a)
v.write_videofile(str(out),fps=24,codec='libx264',audio_codec='aac',preset='veryfast',threads=2,bitrate='2500k')
print(out)
