import asyncio,json,textwrap
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFont
import edge_tts
from moviepy.editor import AudioFileClip,VideoFileClip,ImageClip,CompositeVideoClip,concatenate_videoclips,vfx
R=Path(__file__).parent;O=R/'output';O.mkdir(exist_ok=True);B=R/'assets'/'broll'
cfg=json.loads((R/'video.json').read_text(encoding='utf-8'));plan=json.loads((R/'scenes.json').read_text(encoding='utf-8'))['scenes']
audio=O/'voice.mp3';out=O/'ProfitMenteTV.mp4';W,H=720,1280
async def voice(): await edge_tts.Communicate(cfg['script'],'es-MX-JorgeNeural',rate='+2%',pitch='-2Hz').save(str(audio))
def font(n): return ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',n)
def overlay(text,y=1000,size=40,width=27,accent=False):
 im=Image.new('RGBA',(W,H),(0,0,0,0));d=ImageDraw.Draw(im);f=font(size);lines=textwrap.wrap(text,width);boxes=[d.textbbox((0,0),x,font=f,stroke_width=2) for x in lines];total=sum(b[3]-b[1]+10 for b in boxes);yy=y-total//2
 for x,b in zip(lines,boxes):
  ww=b[2]-b[0];xx=(W-ww)//2;hh=b[3]-b[1]
  d.rounded_rectangle((xx-16,yy-8,xx+ww+16,yy+hh+9),12,fill=(0,0,0,180))
  d.text((xx,yy),x,font=f,fill=(255,220,60,255) if accent else 'white',stroke_width=2,stroke_fill='black');yy+=hh+10
 return np.array(im)
def fallback(i):
 im=Image.new('RGB',(W,H),(10+i*3,18,35+i*4));d=ImageDraw.Draw(im)
 for k in range(10): d.ellipse((40+k*70,180+k*65,230+k*70,370+k*65),outline=(35,70,110),width=3)
 return ImageClip(np.array(im))
def fit_vertical(c):
 scale=max(W/c.w,H/c.h);c=c.resize(scale);x=max(0,(c.w-W)/2);y=max(0,(c.h-H)/2);return c.crop(x1=x,y1=y,x2=x+W,y2=y+H)
def real_scene(i,duration):
 p=B/f'scene_{i+1}.mp4'
 try:
  c=VideoFileClip(str(p)).without_audio();c=fit_vertical(c)
  if c.duration<duration: c=c.fx(vfx.loop,duration=duration)
  c=c.subclip(0,min(duration,c.duration)).set_duration(duration)
  return c
 except Exception: return fallback(i).set_duration(duration)
asyncio.run(voice());a=AudioFileClip(str(audio));dur=a.duration
weights=[s.get('weight',1) for s in plan];total=sum(weights);sc=[]
for i,s in enumerate(plan):
 sd=dur*weights[i]/total;base=real_scene(i,sd)
 title=ImageClip(overlay(s['title'],250,44,22,True)).set_duration(min(2.4,sd))
 shade=ImageClip(np.array(Image.new('RGBA',(W,H),(0,0,0,55)))).set_duration(sd)
 sc.append(CompositeVideoClip([base,shade,title],size=(W,H)).set_duration(sd))
visual=concatenate_videoclips(sc,method='compose',padding=-0.12)
clips=[visual]
words=cfg['script'].split();parts=[' '.join(words[i:i+5]) for i in range(0,len(words),5)];slot=dur/max(1,len(parts))
for i,x in enumerate(parts): clips.append(ImageClip(overlay(x,1040,40,26,i%4==0)).set_start(i*slot).set_duration(slot+.05))
brand=ImageClip(overlay('PROFITMENTE TV',90,27,30,True)).set_duration(dur);clips.append(brand)
final=CompositeVideoClip(clips,size=(W,H)).set_duration(dur).set_audio(a)
final.write_videofile(str(out),fps=30,codec='libx264',audio_codec='aac',preset='veryfast',threads=2,bitrate='4200k');print(out)
