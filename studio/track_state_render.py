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

VISUAL_TRACKS=(0,1,2,3)
AUDIO_TRACKS=(4,5,6)


def _state(states, track):
    value=states.get(str(track),states.get(track,{}))
    return dict(value) if isinstance(value,dict) else {}


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
    """Return a deep-copied project with one effective canonical trackState.

    Visual Solo affects tracks 0-3 only; audio Solo affects tracks 4-6 only,
    matching ``track-controls.js``. Manual hidden/muted state from either current
    ``trackState`` or legacy ``trackStates`` is preserved, stale browser-only Solo
    bookkeeping is removed, and the legacy map is removed from the render copy so
    downstream validators/renderers consume one unambiguous source of truth.
    """
    out=copy.deepcopy(project if isinstance(project,dict) else {})
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
    return out
