import asyncio,json,textwrap
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFont
import edge_tts
from moviepy.editor import AudioFileClip,ImageClip,CompositeVideoClip
R=Path(__file__).parent; O=R/'output'; O.mkdir(exist_ok=True)
cfg=json.loads((R/'video.json').read_text(encoding='utf-8'))
audio=O/'voice.mp3'; out=O/'ProfitMenteTV.mp4'
async def voice():
    await edge_tts.Communicate(cfg['script'],'es-MX-JorgeNeural',rate='+5%').save(str(audio))
def font(n):
    for p in ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf','/usr/share/fonts/tru/dejavu/DejaVuSans.ttf']:
        if Path(p).exists(): return ImageFont.truetype(p,n)
    return ImageFont.load_default()
W,H=720,1280
def txt(text,y,size=42,width=25):
    im=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(im); f=font(size)
    lines=textwrap.wrap(text,width=width); hs=[]
    for x in lines:
        b=d.textbbox((0,0),x,font=f,stroke_width=2); hs.append((x,b,b[3]-b[1]))
    yy=y-sum(h for _,_,h in hs)//2
    for x,b,h in hs:
        ww=b[2]-b[0]; d.text(((W-ww)//2,yy),x,font=f,fill='white',stroke_width=2,stroke_fill='black'); yy+=h+10
    return np.array(im)
asyncio.run(voice()); a=AudioFileClip(str(audio)); dur=a.duration
bg=Image.new('RGB',(W,H),(14,18,32)); base=ImageClip(np.array(bg)).set_duration(dur)
clips=[base,ImageClip(txt('ProfitMenteTV',80,34,30)).set_duration(dur),ImageClip(txt(cfg['hook'],280,48,22)).set_duration(min(4,dur))]
w=cfg['script'].split(); parts=[' '.join(w[i:i+7]) for i in range(0,len(w),7)]; slot=dur/max(1,len(parts))
for i,t in enumerate(parts): clips.append(ImageClip(txt(t,980,40,28)).set_start(i*slot).set_duration(slot+.05))
clips.append(ImageClip(txt(cfg['closing'],600,44,25)).set_start(max(0,dur-3.5)).set_duration(3.5))
v=CompositeVideoClip(clips,size=(W,H)).set_audio(a); v.write_videofile(str(out),fps=24,codec='libx264',audio_codec='aac',preset='ultrafast',threads=2)
print(out)
