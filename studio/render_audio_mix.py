#!/usr/bin/env python3
"""Render ProfitMente Studio audio accurately and mux it over a video-only MP4.

Keeps preview/render parity for clip fades, track gain, source-video audio and
music ducking that only applies while voice clips overlap. Uses only FFmpeg.
"""
from __future__ import annotations
import json, pathlib, shutil, subprocess, sys, tempfile
from render_quality import resolve_render_quality

if len(sys.argv) != 5:
    raise SystemExit('Usage: render_audio_mix.py project.json assets_dir video_only.mp4 output.mp4')

project_path=pathlib.Path(sys.argv[1]); assets_dir=pathlib.Path(sys.argv[2]); video_in=pathlib.Path(sys.argv[3]); out=pathlib.Path(sys.argv[4])
project=json.loads(project_path.read_text(encoding='utf-8'))
render_quality=resolve_render_quality(project.get('renderQuality','high'))
duration=max(.25,float(project.get('duration',45) or 45)); clips=project.get('clips',[]); amap={a['id']:a for a in project.get('assets',[]) if isinstance(a,dict) and a.get('id')}
track_state=project.get('trackState') if isinstance(project.get('trackState'),dict) else {}


def state(track):
    value=track_state.get(str(track),track_state.get(track,{}))
    return value if isinstance(value,dict) else {}

def track_muted(track): return bool(state(track).get('muted',False))
def track_hidden(track): return bool(state(track).get('hidden',False))
def track_gain(track):
    try:return max(0,min(2,float(state(track).get('gain',1) if state(track).get('gain') is not None else 1)))
    except (TypeError,ValueError):return 1.0

def asset_path(asset_id):
    a=amap.get(asset_id)
    if not a: raise ValueError(f'Asset id no encontrado: {asset_id}')
    f=assets_dir/a['name']
    if not f.exists(): raise FileNotFoundError(f'Falta asset: {f}')
    return a,f

def has_audio_stream(asset_id):
    a,f=asset_path(asset_id)
    if a.get('type') not in ('video','audio'): return False
    p=subprocess.run(['ffprobe','-v','error','-select_streams','a:0','-show_entries','stream=index','-of','csv=p=0',str(f)],capture_output=True,text=True)
    return p.returncode==0 and bool(p.stdout.strip())

def speed_of(c):
    try:return max(.25,min(4,float(c.get('speed',1) or 1)))
    except (TypeError,ValueError):return 1.0

def atempo_filters(speed):
    parts=[]; value=float(speed)
    while value<.5-1e-9: parts.append('.5'); value/=.5
    while value>2+1e-9: parts.append('2'); value/=2
    parts.append(f'{value:.8f}'.rstrip('0').rstrip('.'))
    return ','.join('atempo='+p for p in parts)

def clip_fades(c,d):
    def n(key,default):
        try:return max(0,min(d,float(c.get(key,default) if c.get(key) is not None else default)))
        except (TypeError,ValueError):return min(default,d)
    fi=n('fadeIn',.18); fo=n('fadeOut',.25); total=fi+fo
    if total>d and total>0: fi*=d/total; fo*=d/total
    return fi,fo

def voice_intervals(music,voice):
    if music.get('ducking') is False:return []
    ms=max(0,float(music.get('start',0) or 0)); md=max(0,float(music.get('duration',0) or 0)); me=ms+md
    raw=[]
    for v in voice:
        vs=max(0,float(v.get('start',0) or 0)); ve=vs+max(0,float(v.get('duration',0) or 0)); s=max(ms,vs); e=min(me,ve)
        if e>s:raw.append([s-ms,e-ms])
    raw.sort(); merged=[]
    for s,e in raw:
        if merged and s<=merged[-1][1]+.001: merged[-1][1]=max(merged[-1][1],e)
        else:merged.append([s,e])
    return merged

def volume_expr(base,duck,intervals):
    expr=f'{base:.8f}'
    for s,e in reversed(intervals): expr=f'if(between(t,{s:.8f},{e:.8f}),{duck:.8f},{expr})'
    return expr

# Audio-track clips. Visual clip mute/visibility governs original source audio.
audio=[c for c in clips if int(c.get('track',-1)) in (4,5,6) and c.get('asset') and not c.get('muted') and not track_muted(int(c.get('track',-1)))]
voice=[c for c in audio if int(c.get('track',-1))==6]
visual=[c for c in clips if int(c.get('track',-1)) in (0,1) and c.get('asset') and not c.get('muted') and not track_muted(int(c.get('track',-1))) and not track_hidden(int(c.get('track',-1)))]
source_audio=[c for c in visual if amap.get(c.get('asset'),{}).get('type')=='video' and has_audio_stream(c['asset'])]
render_audio=[]
for c in audio:
    a=amap.get(c.get('asset'),{})
    if a.get('type') in ('audio','video') and has_audio_stream(c['asset']):render_audio.append((c,False))
for c in source_audio:render_audio.append((c,True))

if not render_audio:
    out.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(video_in,out); print('Audio mix: sin pistas audibles; video copiado.'); raise SystemExit(0)

inputs=['-i',str(video_in)]; indices={}; filters=[]; labels=[]
def input_index(asset_id):
    if asset_id in indices:return indices[asset_id]
    _,f=asset_path(asset_id); idx=1+len(indices); indices[asset_id]=idx; inputs.extend(['-i',str(f)]); return idx

for c,is_source in render_audio:
    idx=input_index(c['asset']); start=max(0,float(c.get('start',0) or 0)); d=max(.05,min(float(c.get('duration',1) or 1),duration-start)); speed=speed_of(c); offset=max(0,float(c.get('sourceOffset',0) or 0)); fi,fo=clip_fades(c,d); delay=int(round(start*1000)); label=f'[a{len(labels)}]'
    if is_source:
        try:base=max(0,min(2,float(c.get('sourceVolume',1) if c.get('sourceVolume') is not None else 1)))
        except (TypeError,ValueError):base=1
        expr=f'{base:.8f}'
    else:
        track=int(c.get('track',5)); default=.22 if track==5 else 1
        try:base=max(0,min(4,float(c.get('volume',default) if c.get('volume') is not None else default)))
        except (TypeError,ValueError):base=default
        gain=track_gain(track); base*=gain
        if track==5:
            try:duck=max(0,min(4,float(c.get('duckVolume',.16) if c.get('duckVolume') is not None else .16)))*gain
            except (TypeError,ValueError):duck=.16*gain
            duck=min(base,duck); expr=volume_expr(base,duck,voice_intervals(c,voice))
        else:expr=f'{base:.8f}'
    chain=f'[{idx}:a]atrim=start={offset}:duration={d*speed},asetpts=PTS-STARTPTS,{atempo_filters(speed)},volume=\'{expr}\':eval=frame'
    if fi>0:chain+=f',afade=t=in:st=0:d={fi}'
    if fo>0:chain+=f',afade=t=out:st={max(0,d-fo)}:d={fo}'
    chain+=f',adelay={delay}|{delay}{label}'; filters.append(chain); labels.append(label)

# WebAudio sums buses without automatic normalization; match that behavior and
# retain the existing safety limiter for peaks above full scale.
filters.append(''.join(labels)+f'amix=inputs={len(labels)}:duration=longest:dropout_transition=0:normalize=0,atrim=duration={duration},alimiter=limit=0.95[aout]')
out.parent.mkdir(parents=True,exist_ok=True)
with tempfile.TemporaryDirectory(prefix='profitmente-audio-mux-') as td:
    tmp=pathlib.Path(td)/'muxed.mp4'
    cmd=['ffmpeg','-hide_banner','-y',*inputs,'-filter_complex',';'.join(filters),'-map','0:v:0','-map','[aout]','-c:v','copy','-c:a','aac','-b:a',render_quality['audio_bitrate'],'-t',str(duration),'-movflags','+faststart',str(tmp)]
    subprocess.run(cmd,check=True)
    probe=subprocess.run(['ffprobe','-v','error','-show_entries','stream=codec_type','-of','json',str(tmp)],check=True,capture_output=True,text=True)
    streams=json.loads(probe.stdout).get('streams',[])
    if not any(s.get('codec_type')=='video' for s in streams):raise RuntimeError('Audio mix QA: faltó video')
    if not any(s.get('codec_type')=='audio' for s in streams):raise RuntimeError('Audio mix QA: faltó audio')
    shutil.copy2(tmp,out)
print(f"Audio mix QA OK: {out} · calidad {render_quality['id']} · AAC {render_quality['audio_bitrate']}")