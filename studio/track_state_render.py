#!/usr/bin/env python3
"""Normalize ProfitMente Studio track state for non-browser render paths.

The browser Track Solo engine materializes Solo into hidden/muted flags while the
editor is open. Imported/recovered projects can legitimately contain only the
semantic ``solo`` flag, stale internal Solo bookkeeping, or the legacy
``trackStates`` map. The local render pipeline must derive one effective
``trackState`` before validation and FFmpeg so preview and export agree.
"""
from __future__ import annotations
import copy
import math
from media_identity import normalize_project_media_ids

VISUAL_TRACKS=(0,1,2,3)
AUDIO_TRACKS=(4,5,6)
VALID_TRANSITIONS=('cut','none','fade','slide','zoom')


def _is_true(value):
    """Persisted render-state flags are active only when they are real booleans."""
    return value is True


def _canonical_track(value):
    """Return an integer for legacy numeric track values when that is lossless.

    Older/imported JSON can contain ``"0"`` or ``"0.0"``. The validator accepts
    those as integral track numbers, while several FFmpeg selection paths use exact
    integer membership checks. Canonicalizing the render copy prevents a validated
    project from silently losing its visual/audio clips during export. Booleans and
    other non-numeric JSON values stay untouched so they cannot masquerade as tracks
    (Python otherwise treats ``True``/``False`` as ``1``/``0``).
    """
    if isinstance(value,bool) or not isinstance(value,(int,float,str)):
        return value
    if isinstance(value,str) and not value.strip():
        return value
    try:
        parsed=float(value)
    except (TypeError,ValueError):
        return value
    if not math.isfinite(parsed) or not parsed.is_integer():
        return value
    return int(parsed)


def _finite_scalar(value, default):
    """Return a finite JSON scalar number or a safe default.

    Local FFmpeg code still contains a few direct ``float(...)`` conversions for
    core render timing. Sanitizing the render copy here keeps malformed imports,
    booleans, arrays, objects, empty strings, NaN and infinities from either
    crashing export or being coerced differently from the browser editor. Numeric
    strings remain supported for legacy projects.
    """
    if isinstance(value,bool) or not isinstance(value,(int,float,str)):
        return default
    if isinstance(value,str):
        value=value.strip()
        if not value:
            return default
    try:
        parsed=float(value)
    except (TypeError,ValueError):
        return default
    return parsed if math.isfinite(parsed) else default


def _bounded_scalar(value, default, low, high):
    return max(low,min(high,_finite_scalar(value,default)))


def _normalize_project_scalars(project):
    """Canonicalize project-level values consumed before FFmpeg is constructed."""
    if not isinstance(project,dict):
        return
    if 'duration' in project:
        project['duration']=max(0.25,_finite_scalar(project.get('duration'),45.0))
    if 'fps' in project:
        raw=_finite_scalar(project.get('fps'),30.0)
        fps=int(round(raw))
        project['fps']=fps if fps in (24,30,60) else 30


def _normalize_visual_scalars(clip):
    """Keep browser preview and FFmpeg visual-number semantics identical.

    render_mp4.py intentionally supports legacy numeric strings, but Python's
    ``float`` also accepts booleans as 0/1. Normalize every scalar consumed by the
    color/transform/keyframe render paths before they reach those helpers so a
    malformed import cannot change the exported picture while preview/QA reject it.
    """
    fields={
        'brightness':(0.0,-100.0,100.0),
        'contrast':(0.0,-90.0,100.0),
        'saturation':(0.0,-100.0,200.0),
        'hue':(0.0,-180.0,180.0),
        'scale':(1.0,0.25,3.0),
        'rotation':(0.0,-180.0,180.0),
        'opacity':(1.0,0.0,1.0),
        'positionX':(0.0,-100.0,100.0),
        'positionY':(0.0,-100.0,100.0),
    }
    for key,(default,low,high) in fields.items():
        if key in clip:
            clip[key]=_bounded_scalar(clip.get(key),default,low,high)

    keyframes=clip.get('keyframes')
    if not isinstance(keyframes,dict):
        return
    for side in ('start','end'):
        frame=keyframes.get(side)
        if not isinstance(frame,dict):
            continue
        for key in ('scale','rotation','opacity','positionX','positionY'):
            if key not in frame:
                continue
            default,low,high=fields[key]
            frame[key]=_bounded_scalar(frame.get(key),default,low,high)


def _normalize_text_scalars(clip):
    """Canonicalize numeric motion-text values before drawtext expressions.

    In particular, zero is a valid centered text position.  The MP4 renderer used
    legacy ``value or default`` coercion for these fields, which could turn a real
    ``textY=0`` into ``-28`` and could allow booleans/collections to diverge from
    browser preview semantics.  Normalize the render copy once so all consumers
    receive finite, bounded numbers while retaining legacy numeric strings.
    """
    fields={
        'fontSize':(40.0,16.0,84.0),
        'textX':(0.0,-45.0,45.0),
        'textY':(-28.0,-45.0,45.0),
        'boxOpacity':(0.55,0.0,1.0),
    }
    for key,(default,low,high) in fields.items():
        if key in clip:
            clip[key]=_bounded_scalar(clip.get(key),default,low,high)


def _normalize_caption_word_timings(clip):
    """Keep per-word caption timing safe without changing its time coordinate.

    Studio-native captions store absolute timeline seconds, while imported/legacy
    projects may store clip-relative seconds. ``caption_render_timing.py`` accepts
    both forms later and canonicalizes them for FFmpeg. This boundary therefore
    validates one consistent coordinate system per caption but must not assume
    every timing is relative to zero. Any malformed, overlapping or out-of-window
    list fails closed to the full-caption fallback. Legacy finite numeric strings
    remain supported.
    """
    timings=clip.get('wordTimings')
    if not isinstance(timings,list):
        return
    clip_start=_finite_scalar(clip.get('start'),0.0)
    clip_duration=clip.get('duration')
    if isinstance(clip_duration,bool) or not isinstance(clip_duration,(int,float)) or not math.isfinite(clip_duration):
        clip_duration=None
    clip_end=clip_start+clip_duration if clip_duration is not None else None
    declared=clip.get('wordTimingMode')
    declared=declared.strip().lower() if isinstance(declared,str) else ''
    if declared not in ('relative','absolute'):
        declared=''

    normalized=[]
    raw_ranges=[]
    for item in timings:
        if not isinstance(item,dict):
            clip['wordTimings']=[]
            return
        start=_finite_scalar(item.get('start'),None)
        end=_finite_scalar(item.get('end'),None)
        if start is None or end is None or end<=start:
            clip['wordTimings']=[]
            return
        word=str(item.get('word','')).strip()
        if not word:
            clip['wordTimings']=[]
            return
        copy_item=dict(item)
        copy_item['word']=word
        copy_item['start']=start
        copy_item['end']=end
        normalized.append(copy_item)
        raw_ranges.append((start,end))

    if clip_duration is not None:
        epsilon=1e-6
        relative_ok=all(start>=-epsilon and end<=clip_duration+epsilon for start,end in raw_ranges)
        absolute_ok=all(start>=clip_start-epsilon and end<=clip_end+epsilon for start,end in raw_ranges)
        explicit_relative=declared=='relative' or any(item.get('relative') is True for item in timings)
        if declared=='absolute':
            coordinate='absolute'
        elif explicit_relative:
            coordinate='relative'
        elif absolute_ok and not relative_ok:
            coordinate='absolute'
        elif relative_ok:
            coordinate='relative'
        elif absolute_ok:
            coordinate='absolute'
        else:
            clip['wordTimings']=[]
            return
        if coordinate=='relative' and not relative_ok:
            clip['wordTimings']=[]
            return
        if coordinate=='absolute' and not absolute_ok:
            clip['wordTimings']=[]
            return

    previous_end=None
    for start,end in raw_ranges:
        if previous_end is not None and start<previous_end:
            clip['wordTimings']=[]
            return
        previous_end=end
    clip['wordTimings']=normalized


def _normalize_audio_scalars(clip):
    """Canonicalize volume values before the FFmpeg audio graph consumes them.

    The audio renderer still converts ``volume`` and ``sourceVolume`` directly with
    ``float(...)``. Imported arrays/objects can therefore crash export, while JSON
    booleans are silently accepted by Python as 0/1 and diverge from Studio's strict
    numeric semantics. Defaults mirror render_mp4.py and depend on the canonical
    track so old projects containing numeric strings remain compatible.
    """
    track=clip.get('track')
    if 'volume' in clip:
        default=0.22 if track==5 else 1.0
        clip['volume']=_bounded_scalar(clip.get('volume'),default,0.0,4.0)
    if 'sourceVolume' in clip:
        clip['sourceVolume']=_bounded_scalar(clip.get('sourceVolume'),1.0,0.0,2.0)


def _normalize_clip_flags(clip):
    """Fail closed on non-boolean clip flags consumed through Python truthiness.

    Imported JSON strings such as ``"false"`` are truthy in Python. Without this
    boundary, FFmpeg could mute an audio clip or flip a visual clip even though the
    persisted value was not the real boolean ``true``. Canonicalize the render copy
    so only explicit booleans can activate these destructive render switches.
    """
    for key in ('muted','flipX','flipY'):
        if key in clip:
            clip[key]=_is_true(clip.get(key))


def _normalize_clip_transition(clip):
    """Fail closed when an imported project carries an unknown transition mode.

    The local FFmpeg compositor implements cut/none plus fade, slide and zoom.
    Imported typos, booleans, objects or future unsupported transition names must
    degrade safely to ``none`` instead of being interpreted as another effect.
    """
    if 'transition' not in clip:
        return
    value=clip.get('transition')
    clip['transition']=value if isinstance(value,str) and value in VALID_TRANSITIONS else 'none'


def _normalize_clip_scalars(clip):
    """Canonicalize the timing and visual scalars every render path depends on."""
    if not isinstance(clip,dict):
        return
    if 'start' in clip:
        clip['start']=max(0.0,_finite_scalar(clip.get('start'),0.0))
    if 'duration' in clip:
        clip['duration']=max(0.05,_finite_scalar(clip.get('duration'),1.0))
    if 'sourceOffset' in clip:
        clip['sourceOffset']=max(0.0,_finite_scalar(clip.get('sourceOffset'),0.0))
    if 'speed' in clip:
        clip['speed']=max(0.25,min(4.0,_finite_scalar(clip.get('speed'),1.0)))
    if 'transitionDuration' in clip:
        value=_finite_scalar(clip.get('transitionDuration'),None)
        if value is None:
            clip.pop('transitionDuration',None)
        else:
            clip['transitionDuration']=max(0.05,min(2.0,value))
    _normalize_clip_flags(clip)
    _normalize_clip_transition(clip)
    _normalize_visual_scalars(clip)
    _normalize_text_scalars(clip)
    _normalize_caption_word_timings(clip)
    _normalize_audio_scalars(clip)


def _state(states, track):
    """Read one semantic track even when persisted map keys use legacy numerics.

    JSON object keys are strings, and old/imported projects can therefore carry
    aliases such as ``"0.0"`` or ``"06"``. Merge every lossless numeric alias so
    safety flags cannot be bypassed by a duplicate key, while the canonical key
    remains authoritative for ordinary values. Semantic flags use strict booleans;
    strings such as ``"false"`` and numeric values must never disable exported
    content by accident.
    """
    if not isinstance(states,dict):
        return {}
    aliases=[]
    for key,value in states.items():
        if _canonical_track(key)==track and isinstance(value,dict):
            aliases.append((key,value))
    if not aliases:
        return {}
    merged={}
    canonical_key=str(track)
    for key,value in aliases:
        if key!=canonical_key:
            merged.update(value)
    for key,value in aliases:
        if key==canonical_key:
            merged.update(value)
    for flag in ('hidden','muted','solo'):
        if any(_is_true(value.get(flag,False)) for _,value in aliases):
            merged[flag]=True
        elif flag in merged and not isinstance(merged.get(flag),bool):
            merged[flag]=False
    return merged


def _merged_state(current, legacy, track):
    """Merge current + legacy maps without silently re-enabling protected state.

    Newer properties win for ordinary values, but semantic safety flags are ORed
    only when a persisted representation contains the real boolean ``true``. This
    mirrors the strict browser/import guards while still preserving genuine legacy
    hidden, muted and Solo state.
    """
    old=_state(legacy,track)
    new=_state(current,track)
    merged=dict(old)
    merged.update(new)
    for key in ('hidden','muted','solo'):
        if _is_true(old.get(key,False)) or _is_true(new.get(key,False)):
            merged[key]=True
        elif key in merged and not isinstance(merged.get(key),bool):
            merged[key]=False
    # Solo bookkeeping can also exist only in a legacy snapshot. Keep it long
    # enough for _base_hidden/_base_muted to recover the user's manual state.
    for key in ('_soloHiddenBase','_soloVisualActive','_soloMutedBase','_soloAudioActive'):
        if key not in new and key in old:
            merged[key]=old[key]
    return merged


def _base_hidden(state):
    if _is_true(state.get('_soloVisualActive')):
        return _is_true(state.get('_soloHiddenBase',False))
    return _is_true(state.get('hidden',False))


def _base_muted(state):
    if _is_true(state.get('_soloAudioActive')):
        return _is_true(state.get('_soloMutedBase',False))
    return _is_true(state.get('muted',False))


def normalize_track_solo(project, normalize_scalars=True):
    """Return a deep-copied project with canonical render state.

    Visual Solo affects tracks 0-3 only; audio Solo affects tracks 4-6 only,
    matching ``track-controls.js``. Manual hidden/muted state from either current
    ``trackState`` or legacy ``trackStates`` is preserved, stale browser-only Solo
    bookkeeping is removed, and the legacy map is removed from the render copy so
    downstream validators/renderers consume one unambiguous source of truth.
    Numeric legacy clip tracks and media IDs are always canonicalized. Render
    scalars are canonicalized by default, but validators can disable scalar
    normalization so malformed persisted values remain visible and fail closed.
    """
    out=copy.deepcopy(project if isinstance(project,dict) else {})
    if normalize_scalars:
        _normalize_project_scalars(out)
    clips=out.get('clips')
    if isinstance(clips,list):
        for clip in clips:
            if isinstance(clip,dict):
                if 'track' in clip:
                    clip['track']=_canonical_track(clip.get('track'))
                if normalize_scalars:
                    _normalize_clip_scalars(clip)
    current=out.get('trackState')
    current=current if isinstance(current,dict) else {}
    legacy=out.get('trackStates')
    legacy=legacy if isinstance(legacy,dict) else {}
    states={i:_merged_state(current,legacy,i) for i in range(7)}
    visual_solo={i for i in VISUAL_TRACKS if _is_true(states[i].get('solo',False))}
    audio_solo={i for i in AUDIO_TRACKS if _is_true(states[i].get('solo',False))}

    for i in VISUAL_TRACKS:
        s=states[i]; base=_base_hidden(s)
        s['hidden']=base or (bool(visual_solo) and i not in visual_solo)
        s.pop('_soloHiddenBase',None); s.pop('_soloVisualActive',None)
    for i in AUDIO_TRACKS:
        s=states[i]; base=_base_muted(s)
        s['muted']=base or (bool(audio_solo) and i not in audio_solo)
        s.pop('_soloMutedBase',None); s.pop('_soloAudioActive',None)

    out['trackState']={str(i):states[i] for i in range(7)}
    out.pop('trackStates',None)
    return normalize_project_media_ids(out)
