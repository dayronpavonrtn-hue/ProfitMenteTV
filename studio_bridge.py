import argparse, json, math
from pathlib import Path

TRACKS = ['video','overlay','motion','captions','sfx','music','voice']
SUPPORTED_FPS = (24, 30, 60)


def finite_number(value, default=None):
    if value is None or isinstance(value, bool):
        return default
    try:
        number = float(value)
    except (TypeError, ValueError):
        return default
    return number if math.isfinite(number) else default


def normalize_track(value):
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, str) and not value.strip():
        return None
    number = finite_number(value)
    if number is None or not number.is_integer():
        return None
    index = int(number)
    return index if 0 <= index < len(TRACKS) else None


def normalize_fps(value, fallback=30):
    number = finite_number(value)
    if number is not None:
        rounded = int(round(number))
        if rounded in SUPPORTED_FPS:
            return rounded
    fallback_number = finite_number(fallback, 30)
    rounded = int(round(fallback_number)) if fallback_number is not None else 30
    return rounded if rounded in SUPPORTED_FPS else 30


def convert(project):
    if not isinstance(project, dict):
        raise TypeError('Proyecto inválido')

    duration = finite_number(project.get('duration'), 45.0)
    if duration is None or duration <= 0:
        duration = 45.0

    fmt = str(project.get('format') or '9:16').strip()
    sizes = {'9:16':(1080,1920),'16:9':(1920,1080),'1:1':(1080,1080)}
    if fmt not in sizes:
        fmt = '9:16'
    width,height = sizes[fmt]
    fps = normalize_fps(project.get('fps'), 30)

    tracks={k:[] for k in TRACKS}
    clips = project.get('clips', [])
    if not isinstance(clips, list):
        clips = []

    for clip in clips:
        if not isinstance(clip, dict):
            continue
        idx = normalize_track(clip.get('track'))
        if idx is None:
            continue
        start = max(0.0, finite_number(clip.get('start'), 0.0))
        if start >= duration:
            continue
        clip_duration = finite_number(clip.get('duration'), 1.0)
        if clip_duration is None:
            clip_duration = 1.0
        clip_duration = max(0.05, clip_duration)
        end = min(duration, start + clip_duration)
        if end <= start:
            continue

        name = clip.get('name', 'Clip')
        if not isinstance(name, str):
            name = str(name) if name is not None else 'Clip'
        item={
            'id':clip.get('id'),
            'name':name,
            'start':start,
            'end':end,
            'asset_id':clip.get('asset'),
        }
        if idx==0:
            transition = clip.get('transition')
            item.update({
                'transition': transition.strip() if isinstance(transition, str) and transition.strip() else 'cut',
                'zoom_from':1.0,
                'zoom_to':1.03,
            })
        elif idx==3:
            text = clip.get('text', name)
            item.update({
                'text': text if isinstance(text, str) else str(text or ''),
                'animation':clip.get('animation') or 'pop_word',
                'highlight_keywords':bool(clip.get('highlightKeywords',clip.get('highlight_keywords',True))),
            })
        tracks[TRACKS[idx]].append(item)
    return {
        'source':'ProfitMente Studio',
        'project_name':project.get('name','Nuevo video'),
        'mode':project.get('mode','Manual'),
        'format':{'width':width,'height':height,'fps':fps},
        'duration':duration,
        'tracks':tracks,
        'features':{'safe_captions':True,'audio_ducking':True,'browser_project':True},
    }


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


if __name__=='__main__':
    main()
