#!/usr/bin/env python3
"""Post-render quality control for ProfitMente Studio MP4 outputs.
Uses local ffprobe + FFmpeg only. No network or paid services.
"""
from __future__ import annotations
import json
import math
import pathlib
import re
import subprocess
import sys

TARGETS = {"9:16": (1080, 1920), "16:9": (1920, 1080), "1:1": (1080, 1080)}
BLACK_RE = re.compile(r"black_start:(?P<start>[0-9.]+)\s+black_end:(?P<end>[0-9.]+)\s+black_duration:(?P<duration>[0-9.]+)")
SILENCE_START_RE = re.compile(r"silence_start:\s*(?P<start>[0-9.]+)")
SILENCE_END_RE = re.compile(r"silence_end:\s*(?P<end>[0-9.]+)\s*\|\s*silence_duration:\s*(?P<duration>[0-9.]+)")
FREEZE_START_RE = re.compile(r"freeze_start:\s*(?P<start>[0-9.]+)")
FREEZE_DURATION_RE = re.compile(r"freeze_duration:\s*(?P<duration>[0-9.]+)")
FREEZE_END_RE = re.compile(r"freeze_end:\s*(?P<end>[0-9.]+)")
LOUDNESS_JSON_RE = re.compile(r"\{\s*\"input_i\"\s*:.*?\}", re.S)


def _num(value, default=0.0):
    try: return float(value)
    except (TypeError, ValueError): return default


def _finite(value):
    v = _num(value, float('nan'))
    return v if math.isfinite(v) else None


def _fps(value):
    try:
        a,b=str(value or '0/1').split('/',1); b=float(b); return float(a)/b if b else 0.0
    except (ValueError,ZeroDivisionError): return 0.0


def _track_state(project, track):
    tracks=project.get('trackState') if isinstance(project.get('trackState'),dict) else {}
    state=tracks.get(str(track),tracks.get(track,{}))
    return state if isinstance(state,dict) else {}


def project_expects_audio(project: dict) -> bool:
    assets={str(a.get('id')):a for a in project.get('assets',[]) if isinstance(a,dict) and a.get('id') is not None}
    for clip in project.get('clips',[]):
        if not isinstance(clip,dict) or _num(clip.get('duration')) <= 0: continue
        try: track=int(clip.get('track',0))
        except (TypeError,ValueError): track=0
        state=_track_state(project,track)
        if state.get('muted') or clip.get('muted'): continue
        if track >= 4: return True
        # Video source audio follows the visual track's visibility and source-volume controls.
        if track in (0,1) and not state.get('hidden') and _num(clip.get('sourceVolume',1),1) > 0:
            asset=assets.get(str(clip.get('asset')))
            if asset and asset.get('type') == 'video': return True
    return False


def analyze_probe(project: dict, probe: dict) -> dict:
    streams=probe.get('streams') if isinstance(probe.get('streams'),list) else []
    fmt=probe.get('format') if isinstance(probe.get('format'),dict) else {}
    videos=[s for s in streams if s.get('codec_type')=='video']; audios=[s for s in streams if s.get('codec_type')=='audio']
    issues,warnings=[],[]; video=videos[0] if videos else {}
    expected_w,expected_h=TARGETS.get(project.get('format','9:16'),TARGETS['9:16'])
    expected_duration=max(.25,_num(project.get('duration'),45)); duration=_num(fmt.get('duration'),_num(video.get('duration')))
    video_duration=_finite(video.get('duration')) if videos else None
    width,height=int(_num(video.get('width'))),int(_num(video.get('height'))); fps=_fps(video.get('avg_frame_rate') or video.get('r_frame_rate'))
    vcodec=str(video.get('codec_name') or ''); acodec=str(audios[0].get('codec_name') or '') if audios else ''; pix_fmt=str(video.get('pix_fmt') or '')
    tolerance=max(.75,expected_duration*.03)
    if not videos: issues.append('El archivo final no contiene una pista de video.')
    else:
        if (width,height)!=(expected_w,expected_h): issues.append(f'Resolución final incorrecta: {width}×{height}; esperada {expected_w}×{expected_h}.')
        if vcodec not in ('h264','avc1'): warnings.append(f"Codec de video inesperado: {vcodec or 'desconocido'}; se recomienda H.264.")
        if pix_fmt and pix_fmt not in ('yuv420p','yuvj420p'): warnings.append(f'Formato de píxel {pix_fmt} puede reducir compatibilidad en redes sociales.')
        expected_fps=int(round(_num(project.get('fps'),30))); expected_fps=expected_fps if expected_fps in (24,30,60) else 30
        if fps and abs(fps-expected_fps)>.25: issues.append(f'Frame rate final {fps:.2f} FPS; esperado {expected_fps} FPS.')
        # The MP4 container may keep the expected duration because audio/subtitle data continues
        # even when the actual video stream was truncated. Validate the video stream itself when
        # ffprobe exposes a stream duration, so QC cannot report a false success in that case.
        if video_duration is not None and video_duration > 0 and abs(video_duration-expected_duration)>tolerance:
            issues.append(f'La pista de video dura {video_duration:.2f}s; el proyecto requiere {expected_duration:.2f}s.')
    if duration<=0: issues.append('No se pudo verificar la duración del MP4 final.')
    elif abs(duration-expected_duration)>tolerance: issues.append(f'Duración final {duration:.2f}s fuera de tolerancia; proyecto {expected_duration:.2f}s.')
    wants_audio=project_expects_audio(project)
    if wants_audio and not audios: issues.append('El proyecto contiene audio activo pero el MP4 final no tiene pista de audio.')
    elif audios and acodec!='aac': warnings.append(f'Codec de audio inesperado: {acodec}; se recomienda AAC.')
    size=int(_num(fmt.get('size')))
    if size<=0: issues.append('El MP4 final está vacío o ffprobe no informó su tamaño.')
    elif size<10000: warnings.append('El MP4 final es anormalmente pequeño; conviene revisarlo visualmente.')
    return {'ok':not issues,'score':max(0,100-25*len(issues)-5*len(warnings)),'issues':issues,'warnings':warnings,'metrics':{'width':width,'height':height,'duration':round(duration,3),'video_duration':round(video_duration,3) if video_duration is not None else None,'expected_duration':expected_duration,'fps':round(fps,3),'video_codec':vcodec,'audio_codec':acodec or None,'pixel_format':pix_fmt or None,'size':size,'has_audio':bool(audios)}}


def parse_blackdetect(log): return [{'start':_num(m.group('start')),'end':_num(m.group('end')),'duration':_num(m.group('duration'))} for m in BLACK_RE.finditer(log or '')]

def parse_silencedetect(log,total_duration=0.0):
    events=[]; pending=None
    for line in (log or '').splitlines():
        m=SILENCE_START_RE.search(line)
        if m: pending=_num(m.group('start'))
        m=SILENCE_END_RE.search(line)
        if m:
            end=_num(m.group('end')); duration=_num(m.group('duration')); start=pending if pending is not None else max(0,end-duration)
            events.append({'start':start,'end':end,'duration':duration}); pending=None
    if pending is not None and total_duration>pending: events.append({'start':pending,'end':total_duration,'duration':total_duration-pending})
    return events

def parse_freezedetect(log,total_duration=0.0):
    events=[]; pending_start=None; pending_duration=None
    for line in (log or '').splitlines():
        m=FREEZE_START_RE.search(line)
        if m: pending_start=_num(m.group('start')); pending_duration=None
        m=FREEZE_DURATION_RE.search(line)
        if m: pending_duration=_num(m.group('duration'))
        m=FREEZE_END_RE.search(line)
        if m:
            end=_num(m.group('end')); duration=pending_duration if pending_duration is not None else max(0,end-_num(pending_start)); start=pending_start if pending_start is not None else max(0,end-duration)
            events.append({'start':start,'end':end,'duration':duration}); pending_start=pending_duration=None
    if pending_start is not None and total_duration>pending_start:
        end=total_duration; duration=pending_duration if pending_duration is not None else end-pending_start; events.append({'start':pending_start,'end':end,'duration':duration})
    return events

def parse_loudnorm(log: str) -> dict | None:
    matches=list(LOUDNESS_JSON_RE.finditer(log or ''))
    if not matches: return None
    try: data=json.loads(matches[-1].group(0))
    except json.JSONDecodeError: return None
    mapping={'integrated_lufs':'input_i','true_peak_dbtp':'input_tp','loudness_range_lu':'input_lra','loudness_threshold_lufs':'input_thresh'}
    result={k:_finite(data.get(v)) for k,v in mapping.items()}
    return result if result['integrated_lufs'] is not None or result['true_peak_dbtp'] is not None else None

def analyze_loudness(metrics: dict | None) -> dict:
    issues,warnings=[],[]; metrics=metrics or {}
    integrated=_finite(metrics.get('integrated_lufs')); peak=_finite(metrics.get('true_peak_dbtp'))
    if integrated is not None:
        if integrated < -24: warnings.append(f'El loudness final está bajo ({integrated:.1f} LUFS); puede percibirse débil en móvil.')
        elif integrated > -11: warnings.append(f'El loudness final está alto ({integrated:.1f} LUFS); conviene revisar compresión/ganancia.')
    if peak is not None:
        if peak > .5: issues.append(f'El true peak final alcanza {peak:.1f} dBTP; existe riesgo alto de clipping al codificar/publicar.')
        elif peak > -1.0: warnings.append(f'El true peak final alcanza {peak:.1f} dBTP; conviene dejar al menos ~1 dB de margen.')
    return {'issues':issues,'warnings':warnings,'metrics':{k:(round(v,3) if isinstance(v,(int,float)) and math.isfinite(v) else v) for k,v in metrics.items()}}

def _signal_summary(events):
    total=sum(max(0,_num(x.get('duration'))) for x in events); longest=max([_num(x.get('duration')) for x in events] or [0]); return total,longest

def analyze_signals(project,duration,black_events,silence_events,freeze_events=None):
    duration=max(.25,_num(duration,_num(project.get('duration'),45))); freeze_events=freeze_events or []
    black_total,black_longest=_signal_summary(black_events); silence_total,silence_longest=_signal_summary(silence_events); freeze_total,freeze_longest=_signal_summary(freeze_events); issues,warnings=[],[]
    severe_black=max(3,duration*.40); warn_black=max(1.25,duration*.12)
    if black_longest>=severe_black: issues.append(f'El render contiene una pantalla negra continua de {black_longest:.2f}s.')
    elif black_longest>=warn_black: warnings.append(f'Se detectó una pantalla negra continua de {black_longest:.2f}s; conviene revisarla.')
    severe_freeze=max(5,duration*.50); warn_freeze=max(2,duration*.20)
    if freeze_longest>=severe_freeze or freeze_total>=duration*.80: issues.append(f'El render parece congelado durante {freeze_total:.2f}s (tramo máximo {freeze_longest:.2f}s).')
    elif freeze_longest>=warn_freeze: warnings.append(f'Se detectó imagen congelada durante {freeze_longest:.2f}s; conviene revisar ese tramo.')
    if project_expects_audio(project):
        severe_silence=max(4,duration*.60); warn_silence=max(2,duration*.25)
        if silence_longest>=severe_silence or silence_total>=duration*.85: issues.append(f'El render tiene audio silencioso durante {silence_total:.2f}s (tramo máximo {silence_longest:.2f}s).')
        elif silence_longest>=warn_silence: warnings.append(f'Se detectó un tramo de audio silencioso de {silence_longest:.2f}s.')
    return {'issues':issues,'warnings':warnings,'metrics':{'black_seconds':round(black_total,3),'longest_black':round(black_longest,3),'freeze_seconds':round(freeze_total,3),'longest_freeze':round(freeze_longest,3),'silence_seconds':round(silence_total,3),'longest_silence':round(silence_longest,3)}}

def probe_file(mp4):
    r=subprocess.run(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(mp4)],capture_output=True,text=True)
    if r.returncode!=0: raise RuntimeError((r.stderr or 'ffprobe falló').strip())
    return json.loads(r.stdout or '{}')

def measure_loudness(mp4):
    r=subprocess.run(['ffmpeg','-hide_banner','-nostats','-i',str(mp4),'-vn','-af','loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json','-f','null','-'],capture_output=True,text=True)
    if r.returncode!=0: return None,'No se pudo medir loudness/true peak del audio final.'
    parsed=parse_loudnorm(r.stderr)
    return (parsed,None) if parsed else (None,'FFmpeg no devolvió métricas de loudness interpretables.')

def scan_output(mp4,duration,scan_audio):
    warnings=[]; black_events=[]; silence_events=[]; freeze_events=[]
    r=subprocess.run(['ffmpeg','-hide_banner','-nostats','-i',str(mp4),'-vf','blackdetect=d=0.75:pix_th=0.10','-an','-f','null','-'],capture_output=True,text=True)
    if r.returncode==0: black_events=parse_blackdetect(r.stderr)
    else: warnings.append('No se pudo ejecutar la detección local de pantallas negras.')
    r=subprocess.run(['ffmpeg','-hide_banner','-nostats','-i',str(mp4),'-vf','freezedetect=n=-60dB:d=1.5','-an','-f','null','-'],capture_output=True,text=True)
    if r.returncode==0: freeze_events=parse_freezedetect(r.stderr,duration)
    else: warnings.append('No se pudo ejecutar la detección local de imagen congelada.')
    if scan_audio:
        r=subprocess.run(['ffmpeg','-hide_banner','-nostats','-i',str(mp4),'-vn','-af','silencedetect=noise=-45dB:d=1.5','-f','null','-'],capture_output=True,text=True)
        if r.returncode==0: silence_events=parse_silencedetect(r.stderr,duration)
        else: warnings.append('No se pudo ejecutar la detección local de silencio.')
    return black_events,silence_events,freeze_events,warnings

def inspect_output(project_path,mp4_path):
    project=json.loads(project_path.read_text(encoding='utf-8'))
    if not mp4_path.is_file(): return {'ok':False,'score':0,'issues':['El MP4 final no existe.'],'warnings':[],'metrics':{}}
    report=analyze_probe(project,probe_file(mp4_path)); duration=_num(report.get('metrics',{}).get('duration'),_num(project.get('duration'),45)); has_audio=bool(report.get('metrics',{}).get('has_audio'))
    black,silence,freeze,scan_warnings=scan_output(mp4_path,duration,has_audio and project_expects_audio(project)); signal=analyze_signals(project,duration,black,silence,freeze)
    report['issues'].extend(signal['issues']); report['warnings'].extend(signal['warnings']); report['warnings'].extend(scan_warnings); report['metrics'].update(signal['metrics'])
    if has_audio:
        loudness,loudness_warning=measure_loudness(mp4_path)
        if loudness:
            audio_qc=analyze_loudness(loudness); report['issues'].extend(audio_qc['issues']); report['warnings'].extend(audio_qc['warnings']); report['metrics'].update(audio_qc['metrics'])
        elif loudness_warning: report['warnings'].append(loudness_warning)
    report['ok']=not report['issues']; report['score']=max(0,100-25*len(report['issues'])-5*len(report['warnings'])); return report

def main():
    if len(sys.argv) not in (3,4): raise SystemExit('Usage: output_qc.py project.json output.mp4 [report.json]')
    report=inspect_output(pathlib.Path(sys.argv[1]),pathlib.Path(sys.argv[2])); text=json.dumps(report,ensure_ascii=False,indent=2); print(text)
    if len(sys.argv)==4: pathlib.Path(sys.argv[3]).write_text(text,encoding='utf-8')
    if not report['ok']: raise SystemExit(2)
if __name__=='__main__': main()