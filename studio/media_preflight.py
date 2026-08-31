#!/usr/bin/env python3
"""Fail-fast media validation for ProfitMente Studio's local $0 render pipeline."""
import json,pathlib,subprocess,sys


def _state(project,track):
    state=project.get('trackState') if isinstance(project.get('trackState'),dict) else {}
    value=state.get(str(track),state.get(track,{}))
    return value if isinstance(value,dict) else {}


def _active_clip(project,clip):
    try: track=int(clip.get('track',-1))
    except (TypeError,ValueError): return False
    state=_state(project,track)
    if track in (0,1,2,3) and state.get('hidden'): return False
    if track in (4,5,6) and state.get('muted'): return False
    if clip.get('muted') and track in (4,5,6): return False
    return bool(clip.get('asset')) and track in (0,1,4,5,6)


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
    try: duration=float((data.get('format') or {}).get('duration',0) or 0)
    except (TypeError,ValueError): duration=0
    return streams,duration


def inspect(project,assets_dir):
    amap={a.get('id'):a for a in project.get('assets',[]) if isinstance(a,dict) and a.get('id')}
    checks={}
    errors=[]
    for clip in project.get('clips',[]):
        if not isinstance(clip,dict) or not _active_clip(project,clip): continue
        aid=clip.get('asset'); asset=amap.get(aid)
        if not asset: continue  # validate_project.py reports undeclared assets.
        if aid not in checks:
            path=assets_dir/str(asset.get('name',''))
            if not path.is_file(): continue  # validate_project.py reports missing files.
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
    # Keep diagnostics deterministic and avoid duplicate messages when an asset is reused.
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
