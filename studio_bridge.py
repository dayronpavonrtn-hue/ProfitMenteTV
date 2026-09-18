import argparse, json, math
from pathlib import Path

TRACKS = ['video','overlay','motion','captions','sfx','music','voice']
SUPPORTED_FPS = (24, 30, 60)
MIN_SPEED = 0.25
MAX_SPEED = 4.0
MIN_VOLUME = 0.0
MAX_VOLUME = 2.0
VISUAL_ADJUSTMENT_RANGES = {'brightness': (0.0, 300.0), 'contrast': (0.0, 200.0), 'saturation': (0.0, 300.0), 'grayscale': (0.0, 100.0)}
VISUAL_KEYFRAME_RANGES = {'x': (-200.0, 200.0), 'y': (-200.0, 200.0), 'scale': (0.05, 8.0), 'rotation': (-3600.0, 3600.0), 'opacity': (0.0, 1.0)}
VISUAL_EASINGS = {'linear', 'ease-in', 'ease-out', 'ease-in-out', 'hold'}


def finite_number(value, default=None):
    if value is None or isinstance(value, bool): return default
    try: number = float(value)
    except (TypeError, ValueError): return default
    return number if math.isfinite(number) else default


def normalize_track(value):
    if value is None or isinstance(value, bool): return None
    if isinstance(value, str) and not value.strip(): return None
    number = finite_number(value)
    if number is None or not number.is_integer(): return None
    index = int(number)
    return index if 0 <= index < len(TRACKS) else None


def normalize_fps(value, fallback=30):
    number = finite_number(value)
    if number is not None:
        rounded = int(round(number))
        if rounded in SUPPORTED_FPS: return rounded
    fallback_number = finite_number(fallback, 30)
    rounded = int(round(fallback_number)) if fallback_number is not None else 30
    return rounded if rounded in SUPPORTED_FPS else 30


def normalize_source_offset(value):
    number = finite_number(value, 0.0)
    return number if number is not None and number >= 0 else 0.0


def normalize_speed(value):
    number = finite_number(value, 1.0)
    return number if number is not None and MIN_SPEED <= number <= MAX_SPEED else 1.0


def normalize_volume(value, default=1.0):
    number = finite_number(value, default)
    if number is None: number = default
    return min(MAX_VOLUME, max(MIN_VOLUME, number))


def normalize_asset_id(value):
    if value is None or isinstance(value, bool): return None
    if isinstance(value, str):
        value = value.strip()
        return value or None
    if isinstance(value, (int, float)):
        if isinstance(value, float) and not math.isfinite(value): return None
        if float(value).is_integer(): return str(int(value))
        return str(value)
    return None


def normalize_assets(value):
    if not isinstance(value, list): return []
    result, seen = [], set()
    for asset in value:
        if not isinstance(asset, dict): continue
        asset_id = normalize_asset_id(asset.get('id'))
        if asset_id is None or asset_id in seen: continue
        seen.add(asset_id)
        item = {'id': asset_id}
        for field in ('name', 'type', 'mime'):
            field_value = asset.get(field)
            if isinstance(field_value, str) and field_value.strip(): item[field] = field_value.strip()
        duration = finite_number(asset.get('duration'))
        if duration is not None and duration > 0: item['duration'] = duration
        for field in ('width', 'height', 'size'):
            number = finite_number(asset.get(field))
            if number is not None and number > 0: item[field] = int(round(number))
        if isinstance(asset.get('mediaReadable'), bool): item['media_readable'] = asset['mediaReadable']
        result.append(item)
    return result


def normalize_visual_adjustments(value):
    if value is None: return None
    if not isinstance(value, dict): raise ValueError('Ajustes visuales inválidos')
    result = {}
    for field, bounds in VISUAL_ADJUSTMENT_RANGES.items():
        if field not in value: continue
        number = finite_number(value.get(field))
        if number is None or not bounds[0] <= number <= bounds[1]: raise ValueError(f'Ajuste visual {field} inválido')
        result[field] = number
    return result or None


def normalize_visual_keyframes(value, clip_duration):
    if value is None: return None
    if not isinstance(value, list): raise ValueError('Keyframes visuales inválidos')
    result = []
    for frame in value:
        if not isinstance(frame, dict): raise ValueError('Keyframe visual inválido')
        time = finite_number(frame.get('time'))
        if time is None or time < 0 or time > clip_duration + 1e-6: raise ValueError('Tiempo de keyframe fuera del clip')
        item = {'time': time}
        for field, bounds in VISUAL_KEYFRAME_RANGES.items():
            if field not in frame: continue
            number = finite_number(frame.get(field))
            if number is None or not bounds[0] <= number <= bounds[1]: raise ValueError(f'{field} de keyframe inválido')
            item[field] = number
        easing = frame.get('easing')
        if easing is not None:
            if not isinstance(easing, str) or easing.strip().lower() not in VISUAL_EASINGS: raise ValueError('Easing de keyframe inválido')
            item['easing'] = easing.strip().lower()
        result.append(item)
    result.sort(key=lambda frame: frame['time'])
    for previous, current in zip(result, result[1:]):
        if current['time'] - previous['time'] < 0.001: raise ValueError('Tiempos de keyframe duplicados o ambiguos')
    return result or None


def normalize_clip_automation(value, clip_duration):
    if value is None: return None
    if not isinstance(value, dict): raise ValueError('Automatización de clip inválida')
    result = {}
    enabled = value.get('enabled')
    if enabled is not None:
        if not isinstance(enabled, bool): raise ValueError('Estado de automatización inválido')
        result['enabled'] = enabled
    for field in ('preset', 'rule'):
        raw = value.get(field)
        if raw is not None:
            if not isinstance(raw, str) or not raw.strip(): raise ValueError(f'{field} de automatización inválido')
            result[field] = raw.strip()
    if 'intensity' in value:
        intensity = finite_number(value.get('intensity'))
        if intensity is None or not 0.0 <= intensity <= 1.0: raise ValueError('Intensidad de automatización inválida')
        result['intensity'] = intensity
    start = finite_number(value.get('start'), 0.0)
    end = finite_number(value.get('end'), clip_duration)
    if start is None or end is None or start < 0 or end <= start or end > clip_duration + 1e-6:
        raise ValueError('Ventana de automatización fuera del clip')
    result['start'] = start
    result['end'] = end
    return result


def is_temporal_asset(asset):
    if not isinstance(asset, dict): return False
    kind = str(asset.get('type') or '').strip().lower(); mime = str(asset.get('mime') or '').strip().lower()
    return kind in ('video', 'audio') or mime.startswith(('video/', 'audio/'))


def validate_asset_reference(asset_id, asset_lookup, clip_id=None):
    if asset_id is None: return None
    asset = asset_lookup.get(asset_id)
    if asset is None: raise ValueError(f'Clip {clip_id if clip_id is not None else "clip"!r} referencia un medio inexistente: {asset_id!r}')
    if asset.get('media_readable') is False: raise ValueError(f'Clip {clip_id if clip_id is not None else "clip"!r} referencia un medio que Studio no pudo decodificar: {asset_id!r}')
    return asset


def validate_source_bounds(item, asset, clip_id=None):
    if not is_temporal_asset(asset) or 'duration' not in asset: return
    source_duration = asset['duration']; source_end = item['source_offset'] + (item['end'] - item['start']) * item['speed']
    item['source_duration'] = source_duration; item['source_end'] = source_end
    if source_end > source_duration + 1e-6: raise ValueError(f'Clip {clip_id if clip_id is not None else item.get("name", "clip")!r} excede la duración del medio fuente')


def convert(project):
    if not isinstance(project, dict): raise TypeError('Proyecto inválido')
    duration = finite_number(project.get('duration'), 45.0)
    if duration is None or duration <= 0: duration = 45.0
    fmt = str(project.get('format') or '9:16').strip(); sizes = {'9:16':(1080,1920),'16:9':(1920,1080),'1:1':(1080,1080)}
    if fmt not in sizes: fmt = '9:16'
    width,height = sizes[fmt]; fps = normalize_fps(project.get('fps'), 30)
    assets = normalize_assets(project.get('assets')); asset_lookup = {asset['id']: asset for asset in assets}; tracks={k:[] for k in TRACKS}
    clips = project.get('clips', []); clips = clips if isinstance(clips, list) else []
    for clip in clips:
        if not isinstance(clip, dict): continue
        idx = normalize_track(clip.get('track'))
        if idx is None: continue
        start = max(0.0, finite_number(clip.get('start'), 0.0))
        if start >= duration: continue
        clip_duration = finite_number(clip.get('duration'), 1.0); clip_duration = max(0.05, clip_duration if clip_duration is not None else 1.0)
        end = min(duration, start + clip_duration)
        if end <= start: continue
        name = clip.get('name', 'Clip'); name = name if isinstance(name, str) else str(name) if name is not None else 'Clip'
        asset_id = normalize_asset_id(clip.get('asset')); asset = validate_asset_reference(asset_id, asset_lookup, clip.get('id'))
        item={'id':clip.get('id'),'name':name,'start':start,'end':end,'asset_id':asset_id,'source_offset':normalize_source_offset(clip.get('sourceOffset')),'speed':normalize_speed(clip.get('speed'))}
        validate_source_bounds(item, asset, clip.get('id'))
        automation = normalize_clip_automation(clip.get('automation'), end - start)
        if automation is not None: item['automation'] = automation
        if idx in (0, 1, 2):
            adjustments = normalize_visual_adjustments(clip.get('visualAdjustments')); keyframes = normalize_visual_keyframes(clip.get('visualKeyframes'), end - start)
            if adjustments is not None: item['visual_adjustments'] = adjustments
            if keyframes is not None: item['visual_keyframes'] = keyframes
        if idx==0:
            transition = clip.get('transition'); item.update({'transition': transition.strip() if isinstance(transition, str) and transition.strip() else 'cut','zoom_from':1.0,'zoom_to':1.03})
        elif idx==3:
            text = clip.get('text', name); item.update({'text': text if isinstance(text, str) else str(text or ''),'animation':clip.get('animation') or 'pop_word','highlight_keywords':bool(clip.get('highlightKeywords',clip.get('highlight_keywords',True)))})
        elif idx in (4, 5, 6):
            default_volume = 0.22 if idx == 5 else 1.0; volume = normalize_volume(clip.get('volume'), default_volume); item.update({'volume': volume,'gain_db': -120.0 if volume <= 0 else 20.0 * math.log10(volume)})
        tracks[TRACKS[idx]].append(item)
    return {'source':'ProfitMente Studio','project_name':project.get('name','Nuevo video'),'mode':project.get('mode','Manual'),'format':{'width':width,'height':height,'fps':fps},'duration':duration,'assets':assets,'tracks':tracks,'features':{'safe_captions':True,'audio_ducking':True,'browser_project':True,'clip_automation':True}}


def main():
    ap=argparse.ArgumentParser(description='Convierte un proyecto exportado por ProfitMente Studio al edit_plan v5.'); ap.add_argument('project', help='JSON exportado por Studio'); ap.add_argument('-o','--output',default='output/edit_plan_studio.json'); args=ap.parse_args()
    project=json.loads(Path(args.project).read_text(encoding='utf-8')); plan=convert(project); out=Path(args.output); out.parent.mkdir(parents=True,exist_ok=True); out.write_text(json.dumps(plan,ensure_ascii=False,indent=2),encoding='utf-8'); print(out)


if __name__=='__main__': main()
