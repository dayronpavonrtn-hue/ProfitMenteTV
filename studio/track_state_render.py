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


def _canonical_track(value):
    """Return an integer for legacy numeric track values when that is lossless.

    Older/imported JSON can contain ``"0"`` or ``"0.0"``. The validator accepts
    those as integral track numbers, while several FFmpeg selection paths use exact
    integer membership checks. Canonicalizing the render copy prevents a validated
    project from silently losing its visual/audio clips during export. Invalid or
    fractional values stay untouched so downstream validation can reject them.
    """
    try:
        parsed=float(value)
    except (TypeError,ValueError):
        return value
    if not math.isfinite(parsed) or not parsed.is_integer():
        return value
    return int(parsed)


def _state(states, track):
    """Read one semantic track even when persisted map keys use legacy numerics.

    JSON object keys are strings, and old/imported projects can therefore carry
    aliases such as ``"0.0"`` or ``"06"``. Merge every lossless numeric alias so
    safety flags cannot be bypassed by a duplicate key, while the canonical key
    remains authoritative for ordinary values.
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
        if any(bool(value.get(flag,False)) for _,value in aliases):
            merged[flag]=True
    return merged


def _merged_state(current, legacy, track):
    """Merge current + legacy maps without silently re-enabling protected state.

    Newer properties win for ordinary values, but semantic safety flags are ORed.
    This mirrors the browser compatibility path: a track that was hidden, muted or
    solo in either persisted representation stays effective until the project is
    explicitly edited and saved in the canonical format.
    """
    old=_state(legacy,track)
    new=_state(current,track)
    merged=dict(old)
    merged.update(new)
    for key in ('hidden','muted','solo'):
        if bool(old.get(key,False)) or bool(new.get(key,False)):
            merged[key]=True
    # Solo bookkeeping can also exist only in a legacy snapshot. Keep it long
    # enough for _base_hidden/_base_muted to recover the user's manual state.
    for key in ('_soloHiddenBase','_soloVisualActive','_soloMutedBase','_soloAudioActive'):
        if key not in new and key in old:
            merged[key]=old[key]
    return merged


def _base_hidden(state):
    if state.get('_soloVisualActive'):
        return bool(state.get('_soloHiddenBase',False))
    return bool(state.get('hidden',False))


def _base_muted(state):
    if state.get('_soloAudioActive'):
        return bool(state.get('_soloMutedBase',False))
    return bool(state.get('muted',False))


def normalize_track_solo(project):
    """Return a deep-copied project with canonical render state.

    Visual Solo affects tracks 0-3 only; audio Solo affects tracks 4-6 only,
    matching ``track-controls.js``. Manual hidden/muted state from either current
    ``trackState`` or legacy ``trackStates`` is preserved, stale browser-only Solo
    bookkeeping is removed, and the legacy map is removed from the render copy so
    downstream validators/renderers consume one unambiguous source of truth.
    Numeric legacy clip tracks and media IDs are canonicalized in this copy so
    standalone render entrypoints match browser preview/QA identity rules.
    """
    out=copy.deepcopy(project if isinstance(project,dict) else {})
    clips=out.get('clips')
    if isinstance(clips,list):
        for clip in clips:
            if isinstance(clip,dict) and 'track' in clip:
                clip['track']=_canonical_track(clip.get('track'))
    current=out.get('trackState')
    current=current if isinstance(current,dict) else {}
    legacy=out.get('trackStates')
    legacy=legacy if isinstance(legacy,dict) else {}
    states={i:_merged_state(current,legacy,i) for i in range(7)}
    visual_solo={i for i in VISUAL_TRACKS if bool(states[i].get('solo',False))}
    audio_solo={i for i in AUDIO_TRACKS if bool(states[i].get('solo',False))}

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
