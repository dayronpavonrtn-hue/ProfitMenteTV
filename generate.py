import asyncio,json,textwrap,re
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFont
import edge_tts
from moviepy.editor import AudioFileClip,VideoFileClip,ImageClip,CompositeVideoClip,concatenate_videoclips,vfx
R=Path(__file__).parent;O=R/'output';O.mkdir(exist_ok=True);B=R/'assets'/'broll'
cfg=json.loads((R/'video.json').read_text(encoding='utf-8'));plan=json.loads((R/'scenes.json').read_text(encoding='utf-8'))['scenes']
audio=O/'voice.mp3';out=O/'ProfitMenteTV.mp4';W,H=720,1280
async def voice(): await edge_tts.Communicate(cfg['script'],'es-MX-JorgeNeural',rate='+4%',pitch='-1Hz').save(str(audio))
def font(n): return ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',n)
def overlay(text,y=1000,size=40,width=27,accent=False):
 im=Image.new('RGBA',(W,H),(0,0,0,0));d=ImageDraw.Draw(im);f=font(size);lines=textwrap.wrap(text,width);boxes=[d.textbbox((0,0),x,font=f,stroke_width=2) for x in lines];total=sum(b[3]-b[1]+10 for b in boxes);yy=y-total//2
 for x,b in zip(lines,boxes):
  ww=b[2]-b[0];xx=(W-ww)//2;hh=b[3]-b[1]
  d.rounded_rectangle((xx-14,yy-7,xx+ww+14,yy+hh+8),11,fill=(0,0,0,155))
  d.text((xx,yy),x,font=f,fill=(255,220,60,255) if accent else 'white',stroke_width=2,stroke_fill='black');yy+=hh+10
 return np.array(im)
def fallback(i):
 im=Image.new('RGB',(W,H),(10+i*3,18,35+i*4));d=ImageDraw.Draw(im)
 for k in range(10): d.ellipse((40+k*70,180+k*65,230+k*70,370+k*65),outline=(35,70,110),width=3)
 return ImageClip(np.array(im))
def fit_vertical(c):
 scale=max(W/c.w,H/c.h);c=c.resize(scale);x=max(0,(c.w-W)/2);y=max(0,(c.h-H)/2);return c.crop(x1=x,y1=y,x2=x+W,y2=y+H)
def real_scene(i,duration,variant=0):
 p=B/f'scene_{i+1}.mp4'
 try:
  c=fit_vertical(VideoFileClip(str(p)).without_audio())
  if c.duration<duration+1:c=c.fx(vfx.loop,duration=duration+1)
  maxstart=max(0,c.duration-duration-.05);start=min(maxstart,(variant*1.37)%max(maxstart,.01));c=c.subclip(start,start+duration).set_duration(duration)
  zoom=0.025+0.012*(variant%3);c=c.resize(lambda t:1.0+zoom*(t/max(duration,.1)));c=fit_vertical(c).set_duration(duration)
  if variant%2:c=c.fx(vfx.mirror_x)
  return c
 except Exception:return fallback(i).set_duration(duration)
def cut_scene(i,s,duration,variant):
 base=real_scene(i,duration,variant);shade=ImageClip(np.array(Image.new('RGBA',(W,H),(0,0,0,32)))).set_duration(duration)
 title=ImageClip(overlay(s['title'],235,40,23,True)).set_duration(min(1.05,duration)).crossfadeout(.12)
 return CompositeVideoClip([base,shade,title],size=(W,H)).set_duration(duration)
def subtitle_chunks(script):
 words=script.split();chunks=[];cur=[]
 for w in words:
  cur.append(w)
  if len(cur)>=3 or (len(cur)>=2 and re.search(r'[,.!?;:]$',w)):
   chunks.append(' '.join(cur));cur=[]
 if cur:chunks.append(' '.join(cur))
 return chunks
asyncio.run(voice());a=AudioFileClip(str(audio));dur=a.duration
# Fast, real-video rhythm without leaving a stock shot static for too long.
target_cut=1.9;cuts=max(len(plan),int(round(dur/target_cut)));cutdur=dur/cuts;sc=[]
for n in range(cuts):
 idx=n%len(plan);sc.append(cut_scene(idx,plan[idx],cutdur,n//len(plan)))
visual=concatenate_videoclips(sc,method='compose',padding=-0.045)
clips=[visual];parts=subtitle_chunks(cfg['script']);weights=[max(2,len(p.replace(' ','').strip('.,:;!?¡¿'))) for p in parts];total=sum(weights);t=0
keywords={'IA','DINERO','NEGOCIO','NEGOCIOS','AUTOMATIZA','CLIENTES','RÁPIDO','OPORTUNIDAD','VENTAS','TRABAJO','GRATIS'}
for i,(x,w) in enumerate(zip(parts,weights)):
 sd=dur*w/total;accent=any(z.strip('.,:;!?¡¿').upper() in keywords for z in x.split())
 clips.append(ImageClip(overlay(x,1040,44,22,accent)).set_start(t).set_duration(sd+.03).crossfadein(.035));t+=sd
clips.append(ImageClip(overlay('PROFITMENTE TV',82,25,30,True)).set_duration(dur))
final=CompositeVideoClip(clips,size=(W,H)).set_duration(dur).set_audio(a)
final.write_videofile(str(out),fps=30,codec='libx264',audio_codec='aac',preset='medium',threads=2,bitrate='5500k',ffmpeg_params=['-movflags','+faststart']);print(out)
