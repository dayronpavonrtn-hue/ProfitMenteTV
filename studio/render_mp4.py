#!/usr/bin/env python3
"""ProfitMente Studio $0 MP4 renderer.
Usage: python studio/render_mp4.py project.json assets_dir output.mp4
Requires FFmpeg/ffprobe available on PATH.
"""
import json,sys,subprocess,pathlib,shlex,math
from caption_layout import layout_caption

if len(sys.argv) != 4:
    raise SystemExit('Usage: render_mp4.py project.json assets_dir output.mp4')

p=pathlib.Path(sys.argv[1]); assets=pathlib.Path(sys.argv[2]); out=pathlib.Path(sys.argv[3])
project=json.loads(p.read_text(encoding='utf-8'))
fmt=project.get('format','9:16'); w,h=(1080,1920) if fmt=='9:16' else ((1920,1080) if fmt=='16:9' else (1080,1080))
duration=max(.25,float(project.get('duration',45))); clips=project.get('clips',[]); amap={a['id']:a for a in project.get('assets',[])}
try: fps=int(round(float(project.get('fps',30) or 30)))
except (TypeError,ValueError): fps=30
fps=fps if fps in (24,30,60) else 30
inputs=[]; filters=[]; input_index={}; audio_probe_cache={}
track_state=project.get('trackState') if isinstance(project.get('trackState'),dict) else {}

def state(track):
    value=track_state.get(str(track),track_state.get(track,{}))
    return value if isinstance(value,dict) else {}

def track_hidden(track):return bool(state(track).get('hidden',False))
def track_muted(track):return bool(state(track).get('muted',False))

def asset_path(asset_id):
    a=amap.get(asset_id)
    if not a: raise ValueError(f'Asset id no encontrado: {asset_id}')
    f=assets/a['name']
    if not f.exists(): raise FileNotFoundError(f'Falta asset: {f}')
    return a,f

def add_input(asset_id):
    if asset_id in input_index:return input_index[asset_id]
    a,f=asset_path(asset_id); idx=len(input_index); input_index[asset_id]=idx
    if a.get('type')=='image': inputs.extend(['-loop','1','-i',str(f)])
    else: inputs.extend(['-i',str(f)])
    return idx

def has_audio_stream(asset_id):
    if asset_id in audio_probe_cache:return audio_probe_cache[asset_id]
    a,f=asset_path(asset_id)
    if a.get('type') not in ('video','audio'):
        audio_probe_cache[asset_id]=False; return False
    probe=subprocess.run(['ffprobe','-v','error','-select_streams','a:0','-show_entries','stream=index','-of','csv=p=0',str(f)],capture_output=True,text=True)
    ok=probe.returncode==0 and bool(probe.stdout.strip()); audio_probe_cache[asset_id]=ok; return ok

def overlap(a,b):
    a0=float(a.get('start',0)); a1=a0+float(a.get('duration',0)); b0=float(b.get('start',0)); b1=b0+float(b.get('duration',0))
    return a0 < b1 and b0 < a1

def esc_text(value):
    return str(value).replace('\\','\\\\').replace(':','\\:').replace("'","\\'").replace('%','\\%').replace(',','\\,')

def safe_hex(value,default):
    value=str(value or '')
    return value if len(value)==7 and value.startswith('#') and all(ch in '0123456789abcdefABCDEF' for ch in value[1:]) else default

def clip_speed(clip):
    try:return max(.25,min(4.0,float(clip.get('speed',1) or 1)))
    except (TypeError,ValueError):return 1.0

def bounded(clip,key,default,low,high):
    try:return max(low,min(high,float(clip.get(key,default))))
    except (TypeError,ValueError):return default

def transition_duration(clip,d):
    fallback=min(.28,max(.08,d*.12))
    try:raw=float(clip.get('transitionDuration')) if clip.get('transitionDuration') is not None else fallback
    except (TypeError,ValueError):raw=fallback
    return max(.05,min(min(2.0,d),raw))

def clip_fades(clip,d):
    try:fade_in=max(0,min(d,float(clip.get('fadeIn',.18) if clip.get('fadeIn') is not None else .18)))
    except (TypeError,ValueError):fade_in=min(.18,d)
    try:fade_out=max(0,min(d,float(clip.get('fadeOut',.25) if clip.get('fadeOut') is not None else .25)))
    except (TypeError,ValueError):fade_out=min(.25,d)
    total=fade_in+fade_out
    if total>d and total>0:
        scale=d/total; fade_in*=scale; fade_out*=scale
    return fade_in,fade_out

def kf_value(clip,side,key,default,low,high):
    k=clip.get('keyframes') if isinstance(clip.get('keyframes'),dict) else None
    obj=k.get(side) if isinstance(k,dict) and isinstance(k.get(side),dict) else None
    if not obj:return bounded(clip,key,default,low,high)
    try:return max(low,min(high,float(obj.get(key,default))))
    except (TypeError,ValueError):return bounded(clip,key,default,low,high)

def has_keyframes(clip):
    k=clip.get('keyframes'); return isinstance(k,dict) and isinstance(k.get('start'),dict) and isinstance(k.get('end'),dict)

def lerp_expr(a,b,d,var='t'):
    return f'({a}+({b-a})*min(max({var}/{max(d,.001)},0),1))'

def color_filter(clip):
    brightness=bounded(clip,'brightness',0,-100,100)/100
    contrast=max(.1,1+bounded(clip,'contrast',0,-90,100)/100)
    saturation=max(0,1+bounded(clip,'saturation',0,-100,200)/100)
    hue=bounded(clip,'hue',0,-180,180)
    return f'eq=brightness={brightness:.3f}:contrast={contrast:.3f}:saturation={saturation:.3f},hue=h={hue:.2f}'

def visual_chain(idx,asset,start,d,clip,label):
    frames=max(1,int(math.ceil(d*fps)))
    motion=clip.get('motion',''); trans=clip.get('transition','cut'); speed=clip_speed(clip); source_offset=max(0,float(clip.get('sourceOffset',0) or 0)); src=f'[{idx}:v]'; fit=clip.get('fitMode','cover')
    if fit not in ('cover','contain'):fit='cover'
    if fit=='contain':
        chain=f'scale={w}:{h}:force_original_aspect_ratio=decrease,pad={w}:{h}:(ow-iw)/2:(oh-ih)/2:color=black,fps={fps}'
    elif motion in ('slow-zoom','push-in') and not has_keyframes(clip):
        step='.0018' if motion=='push-in' else '.0008'
        chain=f"scale={int(w*1.12)}:{int(h*1.12)}:force_original_aspect_ratio=increase,crop={int(w*1.12)}:{int(h*1.12)},zoompan=z='min(zoom+{step},1.10)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={w}x{h}:fps={fps}"
    else:
        chain=f'scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},fps={fps}'
    if asset.get('type')=='image': chain+=f',trim=duration={d}'
    else: chain=f'trim=start={source_offset}:duration={d*speed},setpts=(PTS-STARTPTS)/{speed},'+chain
    chain+=','+color_filter(clip)
    if clip.get('flipX'): chain+=',hflip'
    if clip.get('flipY'): chain+=',vflip'
    td=transition_duration(clip,d)
    if trans in ('fade','zoom','slide') and start>0: chain+=f',format=rgba,fade=t=in:st=0:d={td}:alpha=1'
    if trans=='zoom': chain+=f",scale='trunc(iw*(1+0.025*(1-min(t/{max(td,.01)},1)))/2)*2':'trunc(ih*(1+0.025*(1-min(t/{max(td,.01)},1)))/2)*2',crop={w}:{h}"
    s0=kf_value(clip,'start','scale',1,.25,3); s1=kf_value(clip,'end','scale',1,.25,3) if has_keyframes(clip) else s0
    r0=kf_value(clip,'start','rotation',0,-180,180); r1=kf_value(clip,'end','rotation',0,-180,180) if has_keyframes(clip) else r0
    opacity=bounded(clip,'opacity',1,0,1)
    if has_keyframes(clip):
        sexpr=lerp_expr(s0,s1,d)
        chain+=f",format=rgba,scale='trunc(iw*{sexpr}/2)*2':'trunc(ih*{sexpr}/2)*2':eval=frame"
        rexpr=lerp_expr(math.radians(r0),math.radians(r1),d)
        if abs(r0)>.001 or abs(r1)>.001: chain+=f",rotate='{rexpr}':ow=rotw(iw):oh=roth(ih):c=black@0"
    else:
        chain+=f",format=rgba,scale='trunc(iw*{s0}/2)*2':'trunc(ih*{s0}/2)*2'"
        if abs(r0)>.001: chain+=f",rotate={math.radians(r0)}:ow=rotw(iw):oh=roth(ih):c=black@0"
    if opacity<.999: chain+=f',colorchannelmixer=aa={opacity}'
    chain+=f',setpts=PTS-STARTPTS+{start}/TB{label}'
    filters.append(src+chain)

visual=[c for c in clips if c.get('track') in (0,1) and c.get('asset') and not track_hidden(int(c.get('track',0)))]
audio=[c for c in clips if c.get('track') in (4,5,6) and c.get('asset') and not c.get('muted') and not track_muted(int(c.get('track',5)))]
voice=[c for c in audio if int(c.get('track',-1))==6]
for c in visual+audio:add_input(c['asset'])

base_input=len(input_index); inputs.extend(['-f','lavfi','-i',f'color=c=0x090b10:s={w}x{h}:r={fps}:d={duration}'])
filters.append(f'[{base_input}:v]setpts=PTS-STARTPTS[vbase0]'); base='[vbase0]'
for n,c in enumerate(sorted(visual,key=lambda x:(float(x.get('start',0)),x.get('track',0)))):
    idx=input_index[c['asset']]; a=amap[c['asset']]; start=max(0,float(c.get('start',0))); d=max(.05,min(float(c.get('duration',1)),duration-start)); end=start+d
    vin=f'[vis{n}]'; nxt=f'[vbase{n+1}]'; visual_chain(idx,a,start,d,c,vin)
    x0=kf_value(c,'start','positionX',0,-100,100); x1=kf_value(c,'end','positionX',0,-100,100) if has_keyframes(c) else x0
    y0=kf_value(c,'start','positionY',0,-100,100); y1=kf_value(c,'end','positionY',0,-100,100) if has_keyframes(c) else y0
    if has_keyframes(c):
        progress=f'min(max((t-{start})/{max(d,.001)},0),1)'
        xbase=f'(W-w)/2+W*({x0}+({x1-x0})*{progress})/100'; ybase=f'(H-h)/2+H*({y0}+({y1-y0})*{progress})/100'
    else:
        xbase=f'(W-w)/2+W*{x0}/100'; ybase=f'(H-h)/2+H*{y0}/100'
    trans=c.get('transition','cut')
    if trans=='slide' and start>0:
        td=transition_duration(c,d); x=f"{xbase}+if(lt(t,{start+td}),W*(1-(t-{start})/{td}),0)"
        filters.append(f"{base}{vin}overlay=x='{x}':y='{ybase}':eof_action=pass:enable='between(t,{start},{end})'{nxt}")
    else:
        filters.append(f"{base}{vin}overlay=x='{xbase}':y='{ybase}':eof_action=pass:enable='between(t,{start},{end})'{nxt}")
    base=nxt

# Track 2: text/titles. This layer is rendered before captions so track 3 stays on top.
motionn=0
for c in [x for x in clips if int(x.get('track',-1))==2 and str(x.get('name','')).strip() and not track_hidden(2)]:
    start=max(0,float(c.get('start',0))); end=min(duration,start+max(.05,float(c.get('duration',1)))); d=max(.05,end-start)
    if end<=start:continue
    text=esc_text(str(c.get('name',''))[:180]); style=c.get('textStyle','title'); anim=c.get('textAnimation','pop')
    if style not in ('title','label','callout'):style='title'
    if anim not in ('none','fade','pop','slide-up'):anim='pop'
    size=max(16,min(84,float(c.get('fontSize',40) or 40)))*2
    tx=max(-45,min(45,float(c.get('textX',0) or 0))); ty=max(-45,min(45,float(c.get('textY',-28) or -28)))
    text_color=safe_hex(c.get('textColor'),'#FFE66D').replace('#','0x'); box_color=safe_hex(c.get('boxColor'),'#000000').replace('#','0x'); box_op=max(0,min(1,float(c.get('boxOpacity',.55) or 0)))
    enter=min(.28,max(.06,d*.25)); progress=f'min(max((t-{start})/{enter},0),1)'
    alpha='1'
    if anim in ('fade','pop','slide-up'):alpha=progress
    ybase=f'(h-text_h)/2+h*{ty}/100'
    if anim=='slide-up': yexpr=f'{ybase}+56*(1-{progress})'
    elif anim=='pop': yexpr=f'{ybase}+12*(1-{progress})'
    else:yexpr=ybase
    border=max(4,int(round(size*.055))); pad=14 if style=='label' else (26 if style=='callout' else 20)
    nxt=f'[motion{motionn}]'
    filters.append(f"{base}drawtext=text='{text}':fontcolor={text_color}:fontsize={size}:borderw={border}:bordercolor=black@0.90:box=1:boxcolor={box_color}@{box_op:.3f}:boxborderw={pad}:x='(w-text_w)/2+w*{tx}/100':y='{yexpr}':alpha='{alpha}':enable='between(t,{start},{end})'{nxt}")
    base=nxt; motionn+=1

capn=0
for c in [x for x in clips if x.get('track')==3 and x.get('name') and not track_hidden(3)]:
    start=max(0,float(c.get('start',0))); end=min(duration,start+max(.05,float(c.get('duration',1))))
    timings=c.get('wordTimings') if isinstance(c.get('wordTimings'),list) else []
    valid=[]
    for wt in timings:
        try:
            ws=max(start,float(wt.get('start',start))); we=min(end,float(wt.get('end',ws+.05))); word=str(wt.get('word','')).strip()
        except (TypeError,ValueError,AttributeError): continue
        if word and we>ws: valid.append((word,ws,we))
    if valid:
        for word,ws,we in valid:
            text=esc_text(word.upper()); nxt=f'[cap{capn}]'; word_d=max(.05,we-ws); progress=f'min(max((t-{ws})/{word_d},0),1)'
            pop=f'(1+0.16*exp(-7*{progress})*sin(PI*{progress}*2))'
            filters.append(f"{base}drawtext=text='{text}':fontcolor=0xFFE66D:fontsize='78*{pop}':borderw=7:bordercolor=black@0.96:box=1:boxcolor=black@0.72:boxborderw=26:x=(w-text_w)/2:y='h*0.73-text_h/2':enable='between(t,{ws},{we})'{nxt}")
            base=nxt; capn+=1
        continue
    style=c.get('style','dynamic'); anim=c.get('animation','')
    if style=='hook-pop':
        color='0xFFE66D'; base_size=76; box='black@0.48'; anchor=f"h*0.69-18*exp(-10*(t-{start}))*cos(28*(t-{start}))" if anim=='pop' else 'h*0.69'
    else:
        color='white'; base_size=60; box='black@0.36'; anchor=f"h*0.72-6*sin(8*(t-{start}))" if anim=='word-pulse' else 'h*0.72'
    layout=layout_caption(c['name'],base_size,w)
    lines=layout.get('lines') or []
    size=float(layout.get('size',base_size)); line_height=max(1,int(layout.get('line_height',round(size*1.16))))
    block_height=line_height*max(1,len(lines)); border=max(4,int(round(size*.10)))
    for line_index,line in enumerate(lines):
        text=esc_text(line); nxt=f'[cap{capn}]'; offset=-block_height/2+line_index*line_height
        y=f"({anchor}){offset:+.2f}"
        filters.append(f"{base}drawtext=text='{text}':fontcolor={color}:fontsize={size:.2f}:borderw={border}:bordercolor=black@0.92:box=1:boxcolor={box}:boxborderw=24:x=(w-text_w)/2:y='{y}':enable='between(t,{start},{end})'{nxt}")
        base=nxt; capn+=1

source_audio=[]
for c in visual:
    if c.get('muted') or track_muted(int(c.get('track',0))) or amap.get(c.get('asset'),{}).get('type')!='video':continue
    if has_audio_stream(c['asset']):source_audio.append(c)

aouts=[]
def append_audio_filter(c,n,source=False):
    idx=input_index[c['asset']]; start=max(0,float(c.get('start',0))); d=max(.05,min(float(c.get('duration',1)),duration-start)); speed=clip_speed(c); source_offset=max(0,float(c.get('sourceOffset',0) or 0))
    if source: vol=max(0,min(2,float(c.get('sourceVolume',1.0))))
    else:
        track=int(c.get('track',5)); default=.22 if track==5 else 1.0; vol=max(0,min(4,float(c.get('volume',default))))
        if track==5 and any(overlap(c,v) for v in voice): vol=min(vol,.16)
    fade_in,fade_out=clip_fades(c,d); fadeout_start=max(0,d-fade_out); delay=int(round(start*1000)); label=f'[a{n}]'
    chain=f'[{idx}:a]atrim=start={source_offset}:duration={d*speed},asetpts=PTS-STARTPTS,atempo={speed},volume={vol}'
    if fade_in>0: chain+=f',afade=t=in:st=0:d={fade_in}'
    if fade_out>0: chain+=f',afade=t=out:st={fadeout_start}:d={fade_out}'
    chain+=f',adelay={delay}|{delay}{label}'
    filters.append(chain); aouts.append(label)

for c in audio:append_audio_filter(c,len(aouts),False)
for c in source_audio:append_audio_filter(c,len(aouts),True)
if aouts: filters.append(''.join(aouts)+f'amix=inputs={len(aouts)}:duration=longest:dropout_transition=0,atrim=duration={duration},alimiter=limit=0.95[aout]')

out.parent.mkdir(parents=True,exist_ok=True)
cmd=['ffmpeg','-hide_banner','-y',*inputs,'-filter_complex',';'.join(filters),'-map',base]
if aouts: cmd+=['-map','[aout]','-c:a','aac','-b:a','192k']
cmd+=['-t',str(duration),'-r',str(fps),'-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',str(out)]
print('Rendering:', ' '.join(shlex.quote(x) for x in cmd)); subprocess.run(cmd,check=True)
probe=subprocess.run(['ffprobe','-v','error','-show_entries','stream=codec_type,codec_name,width,height,r_frame_rate','-show_entries','format=duration,size','-of','json',str(out)],check=True,capture_output=True,text=True)
info=json.loads(probe.stdout); streams=info.get('streams',[]); video_stream=next((s for s in streams if s.get('codec_type')=='video'),None)
if not video_stream: raise RuntimeError('Control de calidad: el MP4 no contiene video')
if int(video_stream.get('width',0))!=w or int(video_stream.get('height',0))!=h: raise RuntimeError(f'Control de calidad: resolución inesperada {video_stream.get("width")}x{video_stream.get("height")}')
if aouts and not any(s.get('codec_type')=='audio' for s in streams): raise RuntimeError('Control de calidad: faltó la pista de audio')
def rate_value(value):
    try:
        if '/' in str(value):
            num,den=str(value).split('/',1); return float(num)/float(den)
        return float(value)
    except (TypeError,ValueError,ZeroDivisionError): return 0.0
actual_fps=rate_value(video_stream.get('r_frame_rate'))
if abs(actual_fps-fps)>.5: raise RuntimeError(f'Control de calidad: FPS inesperados {actual_fps:.2f} vs {fps}')
actual=float(info.get('format',{}).get('duration',0) or 0)
if abs(actual-duration)>1.0: raise RuntimeError(f'Control de calidad: duración inesperada {actual:.2f}s vs {duration:.2f}s')
print(json.dumps(info,indent=2)); print(f'QA OK: {out} · {fps} FPS')