#!/usr/bin/env python3
"""Render-only caption compaction for ProfitMente Studio.

Long caption clips without word timings are split into short sequential phrases before
FFmpeg rendering. The saved Studio project is never modified.
"""
from copy import deepcopy


def _chunks(text,max_chars=28):
    words=str(text or '').split()
    if not words:return []
    out=[]; current=[]
    for word in words:
        candidate=' '.join([*current,word])
        if current and len(candidate)>max_chars:
            out.append(' '.join(current)); current=[word]
        else:current.append(word)
    if current:out.append(' '.join(current))
    return out


def _has_word_timings(clip):
    timings=clip.get('wordTimings')
    return isinstance(timings,list) and any(isinstance(x,dict) and str(x.get('word','')).strip() for x in timings)


def compact_caption_clip(clip,max_chars=28,min_segment=.18):
    """Return one or more render clips for a track-3 caption clip."""
    try:track=int(clip.get('track',-1))
    except (TypeError,ValueError):track=-1
    text=' '.join(str(clip.get('name','')).split())
    if track!=3 or not text or _has_word_timings(clip) or len(text)<=max_chars:return [deepcopy(clip)]
    chunks=_chunks(text,max_chars=max_chars)
    if len(chunks)<=1:return [deepcopy(clip)]
    try:start=max(0.0,float(clip.get('start',0) or 0))
    except (TypeError,ValueError):start=0.0
    try:duration=max(.05,float(clip.get('duration',1) or 1))
    except (TypeError,ValueError):duration=1.0
    weights=[max(1,len(x.split())) for x in chunks]; total=sum(weights)
    # Extremely short clips stay whole: splitting them would create unreadable flashes.
    if duration < min_segment*len(chunks):return [deepcopy(clip)]
    result=[]; cursor=start; remaining=duration
    for i,(chunk,weight) in enumerate(zip(chunks,weights)):
        if i==len(chunks)-1:seg_duration=remaining
        else:
            seg_duration=max(min_segment,duration*weight/total)
            max_allowed=remaining-min_segment*(len(chunks)-i-1)
            seg_duration=min(seg_duration,max_allowed)
        item=deepcopy(clip); item['name']=chunk; item['start']=round(cursor,6); item['duration']=round(seg_duration,6)
        if item.get('id') is not None:item['id']=f"{item['id']}__rendercap{i+1}"
        item['renderCaptionSegment']=True
        result.append(item); cursor+=seg_duration; remaining=max(0.0,start+duration-cursor)
    return result


def compact_project_captions(project,max_chars=28):
    result=deepcopy(project); clips=[]
    for clip in project.get('clips',[]) if isinstance(project.get('clips'),list) else []:
        clips.extend(compact_caption_clip(clip,max_chars=max_chars))
    result['clips']=clips
    return result
