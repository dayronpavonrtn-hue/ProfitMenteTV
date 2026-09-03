#!/usr/bin/env python3
"""Validate a ProfitMente Studio project before MP4 rendering."""
import json,sys,pathlib,re,subprocess,math
from track_state_render import normalize_track_solo

if len(sys.argv) not in (2,3):
    raise SystemExit('Usage: validate_project.py project.json [assets_dir]')
p=pathlib.Path(sys.argv[1]); project=normalize_track_solo(json.loads(p.read_text(encoding='utf-8'))); assets_dir=pathlib.Path(sys.argv[2]) if len(sys.argv)==3 else None
errors=[]; warnings=[]

def finite_float(value, label, default=0.0):
    """Parse imported/project numeric values without allowing NaN/Infinity through."""
    try:
        parsed=float(value)
    except (TypeError,ValueError):
        errors.append(f'{label} no es numérico')
        return default,False
    if not math.isfinite(parsed):
        errors.append(f'{label} debe ser un número finito')
        return default,False
    return parsed,True

def finite_track(value, label):
    parsed,ok=finite_float(value,label,-1)
    if not ok:return -1,False
    if not parsed.is_integer():
        errors.append(f'{label} debe ser un entero')
        return -1,False
    return int(parsed),True

fmt=project.get('format','9:16'); duration,duration_ok=finite_float(project.get('duration',0) or 0,'La duración del proyecto',0); clips=project.get('clips',[]); assets=project.get('assets',[]); amap={a.get('id'):a for a in assets if a.get('id')}
track_state=project.get('trackState') if isinstance(project.get('trackState'),dict) else {}
def state(track):
    value=track_state.get(str(track),track_state.get(track,{}))
    return value if isinstance(value,dict) else {}
def track_hidden(track): return bool(state(track).get('hidden',False))
def track_muted(track): return bool(state(track).get('muted',False))
def disabled(track): return (track in (0,1,2,3) and track_hidden(track)) or (track in (4,5,6) and track_muted(track))
def expected_asset_types(track):
    if track in (0,1): return {'video','image'}
    if track in (4,5,6): return {'video','audio'}
    return None
def asset_has_audio(asset_id):
    a=amap.get(asset_id)
    if not a or a.get('type') not in ('video','audio'): return False
    if a.get('type')=='audio': return True
    if not assets_dir: return bool(a.get('hasAudio',False))
    f=assets_dir/a.get('name','')
    if not f.exists(): return False
    try:
        probe=subprocess.run(['ffprobe','-v','error','-select_streams','a:0','-show_entries','stream=index','-of','csv=p=0',str(f)],capture_output=True,text=True,timeout=8)
        return probe.returncode==0 and bool(probe.stdout.strip())
    except (OSError,subprocess.SubprocessError):
        return bool(a.get('hasAudio',False))
def asset_duration(asset):
    try:
        value=float(asset.get('duration',0) or 0)
        return value if math.isfinite(value) and value>0 else 0
    except (TypeError,ValueError):
        return 0
def validate_source_window(i,c,a,d,speed):
    if not a or a.get('type') not in ('video','audio'): return
    track=c.get('_validatedTrack',c.get('track'))
    if not (track in (4,5,6) or (track in (0,1) and a.get('type')=='video')): return
    native=asset_duration(a)
    if native<=0: return
    offset,offset_ok=finite_float(c.get('sourceOffset',0) or 0,f'Clip {i}: sourceOffset',0)
    if not offset_ok:return
    if offset<0:
        errors.append(f'Clip {i}: sourceOffset negativo'); return
    needed=d*speed; end=offset+needed
    if offset>native+.01 or end>native+.15:
        errors.append(f'Clip {i}: fuente insuficiente; necesita hasta {end:.2f}s de un archivo de {native:.2f}s')
if fmt not in ('9:16','16:9','1:1'): errors.append(f'Formato inválido: {fmt}')
if duration_ok and duration<=0: errors.append('La duración debe ser mayor que 0')
if not isinstance(clips,list):
    errors.append('clips debe ser una lista'); clips=[]
if not isinstance(assets,list):
    errors.append('assets debe ser una lista'); assets=[]; amap={}
ids=set(); color_re=re.compile(r'^#[0-9a-fA-F]{6}$')
for i,c in enumerate(clips):
    if not isinstance(c,dict):
        errors.append(f'Clip {i}: estructura inválida'); continue
    cid=c.get('id')
    start,start_ok=finite_float(c.get('start',0) or 0,f'Clip {i}: inicio',0)
    d,d_ok=finite_float(c.get('duration',0) or 0,f'Clip {i}: duración',0)
    track,track_ok=finite_track(c.get('track'),f'Clip {i}: track')
    c['_validatedTrack']=track
    inactive=disabled(track) if track_ok else False
    speed,speed_ok=finite_float(c.get('speed',1) or 1,f'Clip {i}: velocidad',1)
    if cid in ids: errors.append(f'Clip duplicado: {cid}')
    if cid: ids.add(cid)
    if track_ok and track not in range(7): errors.append(f'Clip {i}: track inválido {track}')
    if start_ok and start<0: errors.append(f'Clip {i}: inicio negativo')
    if d_ok and d<=0: errors.append(f'Clip {i}: duración inválida')
    if not inactive and speed_ok and (speed<.25 or speed>4): errors.append(f'Clip {i}: velocidad inválida {speed}; usa 0.25x–4x')
    if not inactive and track in (0,1):
        ranges={'positionX':(-100,100,0),'positionY':(-100,100,0),'scale':(.25,3,1),'rotation':(-180,180,0),'opacity':(0,1,1)}
        for key,(lo,hi,default) in ranges.items():
            value,ok=finite_float(c.get(key,default),f'Clip {i}: {key}',default)
            if ok and (value<lo or value>hi): errors.append(f'Clip {i}: {key} fuera de rango ({lo}–{hi})')
    if not inactive and track==2:
        if not str(c.get('name','')).strip(): errors.append(f'Clip {i}: texto Motion vacío')
        if c.get('textStyle','title') not in ('title','label','callout'): errors.append(f'Clip {i}: estilo Motion inválido')
        if c.get('textAnimation','pop') not in ('none','fade','pop','slide-up'): errors.append(f'Clip {i}: animación Motion inválida')
        for key,lo,hi,default in [('textX',-45,45,0),('textY',-45,45,-28),('fontSize',16,84,40),('boxOpacity',0,1,.55)]:
            value,ok=finite_float(c.get(key,default),f'Clip {i}: {key} Motion',default)
            if ok and (value<lo or value>hi): errors.append(f'Clip {i}: {key} Motion fuera de rango ({lo}–{hi})')
        for key,default in [('textColor','#FFE66D'),('boxColor','#000000')]:
            if not color_re.fullmatch(str(c.get(key,default))):errors.append(f'Clip {i}: {key} Motion inválido')
    if duration_ok and start_ok and d_ok and start+d>duration+.05: warnings.append(f'Clip {i} excede la duración del proyecto y será recortado')
    aid=c.get('asset')
    if aid and not inactive:
        a=amap.get(aid)
        if not a: errors.append(f'Clip {i}: asset no declarado {aid}')
        else:
            asset_type=a.get('type'); allowed=expected_asset_types(track)
            if allowed and asset_type not in allowed:
                expected='video/imagen' if track in (0,1) else 'audio/video con audio'
                errors.append(f'Clip {i}: medio {asset_type or "sin tipo"} incompatible con track {track}; se espera {expected}')
            if assets_dir and not (assets_dir/a.get('name','')).exists(): errors.append(f'Falta archivo: {a.get("name")}')
            if speed_ok and d_ok and speed>=.25 and speed<=4: validate_source_window(i,c,a,d,speed)
            if track in (4,5,6) or (track in (0,1) and a.get('type')=='video'):
                fades=[]
                for key,default in [('fadeIn',.18),('fadeOut',.25)]:
                    value,ok=finite_float(c.get(key,default) if c.get(key) is not None else default,f'Clip {i}: {key}',default)
                    fades.append((value,ok))
                    if ok and d_ok and (value<0 or value>d+.001):errors.append(f'Clip {i}: {key} fuera de rango 0–{d:.2f}s')
                if d_ok and all(ok for _,ok in fades) and fades[0][0]>=0 and fades[1][0]>=0 and fades[0][0]+fades[1][0]>d+.001:warnings.append(f'Clip {i}: fades se solapan y serán normalizados')
    c.pop('_validatedTrack',None)
if not any(isinstance(c,dict) and c.get('track') in (0,1) and c.get('asset') and not track_hidden(c.get('track')) for c in clips): warnings.append('No hay medios visuales; el render usará fondo negro')
has_dedicated_audio=any(isinstance(c,dict) and c.get('track') in (4,5,6) and c.get('asset') and not c.get('muted') and not track_muted(c.get('track')) for c in clips)
has_source_audio=any(isinstance(c,dict) and c.get('track') in (0,1) and c.get('asset') and not c.get('muted') and not track_hidden(c.get('track')) and asset_has_audio(c.get('asset')) for c in clips)
if not has_dedicated_audio and not has_source_audio: warnings.append('No hay audio en el proyecto')
print(json.dumps({'ok':not errors,'errors':errors,'warnings':warnings,'clips':len(clips),'assets':len(assets)},ensure_ascii=False,indent=2))
if errors: raise SystemExit(2)
