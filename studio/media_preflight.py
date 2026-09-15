#!/usr/bin/env python3
"""Fail-fast media validation for ProfitMente Studio's local $0 render pipeline."""
import json,math,pathlib,subprocess,sys

SOURCE_TOLERANCE=0.05


def _state(project,track):
    state=project.get('trackState') if isinstance(project.get('trackState'),dict) else {}
    value=state.get(str(track),state.get(track,{}))
    return value if isinstance(value,dict) else {}


def _active_clip(project,clip):
    try: track=int(clip.get('track',-1))
    except (TypeError,ValueError): return False
    state=_state(project,track)
    if track in (0,1,2,3) and state.get('hidden') is True: return False
    if track in (4,5,6) and state.get('muted') is True: return False
    if clip.get('muted') is True and track in (4,5,6): return False
    return bool(clip.get('asset')) and track in (0,1,4,5,6)


def _finite(value,default=0.0):
    if isinstance(value,bool) or not isinstance(value,(int,float,str)): return default
    if isinstance(value,str):
        value=value.strip()
        if not value:return default
    try: number=float(value)
    except (TypeError,ValueError):return default
    return number if math.isfinite(number) else default


def _strict_finite(value):
    """Parse persisted edit scalars without silently changing malformed projects."""
    if isinstance(value,bool) or value is None or not isinstance(value,(int,float,str)):
        return None
    if isinstance(value,str) and not value.strip():
        return None
    try: number=float(value)
    except (TypeError,ValueError): return None
    return number if math.isfinite(number) else None


def probe_media(path,timeout=12):
    cmd=['ffprobe','-v','error','-show_entries','format=duration:stream=codec_type','-of','json',str(path)]
    try:
        result=subprocess.run(cmd,capture_output=True,text=True,timeout=timeout)
    except FileNotFoundError as exc:
        raise RuntimeError('FFprobe no está disponible en PATH. Instala FFmpeg gratis para renderizar MP4.') from exc
    except subprocess.TimeoutExpired as exc:
        raise RuntimeError(f'FFprobe agotó el tiempo al leer {path.name}') from exc
    if result.returncode!=0:
        detail=(result.stderr or result.stdout or 'archivo no legible').strip().splitlines()[-1]
        raise RuntimeError(f'Medio no legible: {path.name} · {detail}')
    try: data=json.loads(result.stdout or '{}')
    except json.JSONDecodeError as exc:
        raise RuntimeError(f'FFprobe devolvió datos inválidos para {path.name}') from exc
    streams={s.get('codec_type') for s in data.get('streams',[]) if isinstance(s,dict)}
    duration=_finite((data.get('format') or {}).get('duration',0),0.0)
    return streams,duration


def _source_range_error(clip,asset,media_duration):
    """Return a deterministic diagnostic when FFmpeg would run past source EOF."""
    if asset.get('type') not in ('video','audio') or media_duration<=0:
        return None
    name=asset.get('name') or asset.get('id') or 'medio'
    clip_id=clip.get('id','?')
    raw_offset=clip.get('sourceOffset',0)
    raw_duration=clip.get('duration',1)
    raw_speed=clip.get('speed',1)
    offset=_strict_finite(raw_offset)
    clip_duration=_strict_finite(raw_duration)
    speed=_strict_finite(raw_speed)
    if offset is None:
        return f'{name}: clip {clip_id!r} tiene sourceOffset inválido'
    if clip_duration is None or clip_duration<=0:
        return f'{name}: clip {clip_id!r} tiene duración inválida para validar la fuente'
    if speed is None or speed<0.25 or speed>4:
        return f'{name}: clip {clip_id!r} tiene velocidad inválida para validar la fuente'
    if offset<0:
        return f'{name}: clip {clip_id!r} tiene sourceOffset negativo ({offset:.3f}s)'
    required_end=offset+clip_duration*speed
    if offset >= media_duration-SOURCE_TOLERANCE:
        return f'{name}: clip {clip_id!r} comienza en {offset:.3f}s, fuera de la duración fuente ({media_duration:.3f}s)'
    if required_end > media_duration+SOURCE_TOLERANCE:
        return f'{name}: clip {clip_id!r} necesita fuente hasta {required_end:.3f}s (offset {offset:.3f}s, duración {clip_duration:.3f}s, velocidad {speed:.3g}x), pero el medio termina en {media_duration:.3f}s'
    return None


def inspect(project,assets_dir):
    amap={a.get('id'):a for a in project.get('assets',[]) if isinstance(a,dict) and a.get('id')}
    checks={}
    errors=[]
    for clip in project.get('clips',[]):
        if not isinstance(clip,dict) or not _active_clip(project,clip): continue
        aid=clip.get('asset'); asset=amap.get(aid)
        if not asset: continue
        if aid not in checks:
            path=assets_dir/str(asset.get('name',''))
            if not path.is_file(): continue
            try: checks[aid]=probe_media(path)
            except RuntimeError as exc:
                errors.append(str(exc)); checks[aid]=(set(),0)
        streams,duration=checks[aid]
        track=int(clip.get('track',-1)); typ=asset.get('type')
        if track in (0,1) and typ=='video' and 'video' not in streams:
            errors.append(f'{asset.get("name")}: no contiene stream de video para la pista visual')
        if track in (4,5,6) and 'audio' not in streams:
            errors.append(f'{asset.get("name")}: no contiene stream de audio para la pista {track}')
        if typ in ('video','audio') and duration<=0:
            errors.append(f'{asset.get("name")}: duración multimedia inválida o desconocida')
        source_error=_source_range_error(clip,asset,duration)
        if source_error:errors.append(source_error)
    errors=list(dict.fromkeys(errors))
    return {'ok':not errors,'errors':errors,'checkedAssets':len(checks)}


def main(argv=None):
    argv=sys.argv if argv is None else argv
    if len(argv)!=3: raise SystemExit('Usage: media_preflight.py project.json assets_dir')
    project_path=pathlib.Path(argv[1]); assets_dir=pathlib.Path(argv[2])
    project=json.loads(project_path.read_text(encoding='utf-8'))
    report=inspect(project,assets_dir)
    print(json.dumps(report,ensure_ascii=False,indent=2))
    if not report['ok']: raise SystemExit(2)


if __name__=='__main__': main()
