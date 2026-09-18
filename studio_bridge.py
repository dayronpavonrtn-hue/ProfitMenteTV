import argparse, json, math
from pathlib import Path

TRACKS = ['video','overlay','motion','captions','sfx','music','voice']
SUPPORTED_FPS = (24, 30, 60)
MIN_SPEED = 0.25
MAX_SPEED = 4.0
MIN_VOLUME = 0.0
MAX_VOLUME = 2.0


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


def is_temporal_asset(asset):
    if not isinstance(asset, dict): return False
    kind = str(asset.get('type') or '').strip().lower()
    mime = str(asset.get('mime') or '').strip().lower()
    return kind in ('video', 'audio') or mime.startswith(('video/', 'audio/'))


def validate_asset_reference(asset_id, asset_lookup, clip_id=None):
    if asset_id is None: return None
    asset = asset_lookup.get(asset_id)
    if asset is None:
        label = clip_id if clip_id is not None else 'clip'
        raise ValueError(f'Clip {label!r} referencia un medio inexistente: {asset_id!r}')
    if asset.get('media_readable') is False:
        label = clip_id if clip_id is not None else 'clip'
        raise ValueError(f'Clip {label!r} referencia un medio que Studio no pudo decodificar: {asset_id!r}')
    return asset


def validate_source_bounds(item, asset, clip_id=None):
    if not is_temporal_asset(asset) or 'duration' not in asset: return
    source_duration = asset['duration']
    source_end = item['source_offset'] + (item['end'] - item['start']) * item['speed']
    item['source_duration'] = source_duration
    item['source_end'] = source_end
    if source_end > source_duration + 1e-6:
        label = clip_id if clip_id is not None else item.get('name', 'clip')
        raise ValueError(f'Clip {label!r} excede la duración del medio fuente')


def convert(project):
    if not isinstance(project, dict): raise TypeError('Proyecto inválido')
    duration = finite_number(project.get('duration'), 45.0)
    if duration is None or duration <= 0: duration = 45.0
    fmt = str(project.get('format') or '9:16').strip()
    sizes = {'9:16':(1080,1920),'16:9':(1920,1080),'1:1':(1080,1080)}
    if fmt not in sizes: fmt = '9:16'
    width,height = sizes[fmt]
    fps = normalize_fps(project.get('fps'), 30)
    assets = normalize_assets(project.get('assets'))
    asset_lookup = {asset['id']: asset for asset in assets}
    tracks={k:[] for k in TRACKS}
    clips = project.get('clips', [])
    if not isinstance(clips, list): clips = []
    for clip in clips:
        if not isinstance(clip, dict): continue
        idx = normalize_track(clip.get('track'))
        if idx is None: continue
        start = max(0.0, finite_number(clip.get('start'), 0.0))
        if start >= duration: continue
        clip_duration = finite_number(clip.get('duration'), 1.0)
        if clip_duration is None: clip_duration = 1.0
        clip_duration = max(0.05, clip_duration)
        end = min(duration, start + clip_duration)
        if end <= start: continue
        name = clip.get('name', 'Clip')
        if not isinstance(name, str): name = str(name) if name is not None else 'Clip'
        asset_id = normalize_asset_id(clip.get('asset'))
        asset = validate_asset_reference(asset_id, asset_lookup, clip.get('id'))
        item={'id':clip.get('id'),'name':name,'start':start,'end':end,'asset_id':asset_id,'source_offset':normalize_source_offset(clip.get('sourceOffset')),'speed':normalize_speed(clip.get('speed'))}
        validate_source_bounds(item, asset, clip.get('id'))
        if idx==0:
            transition = clip.get('transition')
            item.update({'transition': transition.strip() if isinstance(transition, str) and transition.strip() else 'cut','zoom_from':1.0,'zoom_to':1.03})
        elif idx==3:
            text = clip.get('text', name)
            item.update({'text': text if isinstance(text, str) else str(text or ''),'animation':clip.get('animation') or 'pop_word','highlight_keywords':bool(clip.get('highlightKeywords',clip.get('highlight_keywords',True)))})
        elif idx in (4, 5, 6):
            default_volume = 0.22 if idx == 5 else 1.0
            volume = normalize_volume(clip.get('volume'), default_volume)
            item.update({'volume': volume,'gain_db': -120.0 if volume <= 0 else 20.0 * math.log10(volume)})
        tracks[TRACKS[idx]].append(item)
    return {'source':'ProfitMente Studio','project_name':project.get('name','Nuevo video'),'mode':project.get('mode','Manual'),'format':{'width':width,'height':height,'fps':fps},'duration':duration,'assets':assets,'tracks':tracks,'features':{'safe_captions':True,'audio_ducking':True,'browser_project':True}}


def main():
    ap=argparse.ArgumentParser(description='Convierte un proyecto exportado por ProfitMente Studio al edit_plan v5.')
    ap.add_argument('project', help='JSON exportado por Studio')
    ap.add_argument('-o','--output',default='output/edit_plan_studio.json')
    args=ap.parse_args()
    project=json.loads(Path(args.project).read_text(encoding='utf-8'))
    plan=convert(project)
    out=Path(args.output);out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(plan,ensure_ascii=False,indent=2),encoding='utf-8')
    print(out)


if __name__=='__main__': main()
