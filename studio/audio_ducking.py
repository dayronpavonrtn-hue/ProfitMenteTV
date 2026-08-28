def _track_muted(project, track):
    state=project.get('trackState') if isinstance(project.get('trackState'),dict) else {}
    value=state.get(str(track),state.get(track,{}))
    return bool(value.get('muted',False)) if isinstance(value,dict) else False

def enabled(clip):
    return clip.get('ducking',True) is not False

def base_volume(clip):
    try:value=float(clip.get('volume',.22))
    except (TypeError,ValueError):value=.22
    return max(0,min(2,value))

def duck_volume(clip):
    base=base_volume(clip)
    try:value=float(clip.get('duckVolume',.16))
    except (TypeError,ValueError):value=.16
    return min(base,max(0,min(2,value)))

def multiplier(clip):
    base=base_volume(clip)
    return duck_volume(clip)/base if base>0 else 1.0

def intervals(project,music):
    if int(music.get('track',-1))!=5 or not enabled(music) or _track_muted(project,6):return []
    ms=float(music.get('start',0) or 0); md=max(0,float(music.get('duration',0) or 0)); me=ms+md
    raw=[]
    for voice in project.get('clips',[]):
        if int(voice.get('track',-1))!=6 or not voice.get('asset') or voice.get('muted'):continue
        vs=float(voice.get('start',0) or 0); ve=vs+max(0,float(voice.get('duration',0) or 0))
        start=max(ms,vs); end=min(me,ve)
        if end>start:raw.append({'start':start-ms,'end':end-ms})
    raw.sort(key=lambda x:(x['start'],x['end']))
    merged=[]
    for item in raw:
        if merged and item['start']<=merged[-1]['end']+.001:merged[-1]['end']=max(merged[-1]['end'],item['end'])
        else:merged.append(dict(item))
    return merged
