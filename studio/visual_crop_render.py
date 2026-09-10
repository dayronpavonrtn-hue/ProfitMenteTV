#!/usr/bin/env python3
"""Local FFmpeg crop helper for ProfitMente Studio."""

def _number(value, fallback=0.0):
    try:
        n=float(value)
        return n if n==n and abs(n)!=float('inf') else fallback
    except (TypeError,ValueError):
        return fallback

def normalize_visual_crop(clip):
    raw=clip.get('visualCrop') if isinstance(clip,dict) else None
    raw=raw if isinstance(raw,dict) else {}
    vals={k:max(0.0,min(95.0,_number(raw.get(k),0.0))) for k in ('left','right','top','bottom')}
    hs=vals['left']+vals['right']
    if hs>95.0:
        scale=95.0/hs;vals['left']*=scale;vals['right']*=scale
    vs=vals['top']+vals['bottom']
    if vs>95.0:
        scale=95.0/vs;vals['top']*=scale;vals['bottom']*=scale
    return vals

def visual_crop_filter(clip):
    s=normalize_visual_crop(clip)
    if not any(s.values()):return ''
    wf=max(.05,1-(s['left']+s['right'])/100)
    hf=max(.05,1-(s['top']+s['bottom'])/100)
    xf=s['left']/100;yf=s['top']/100
    return f"crop=iw*{wf:.8f}:ih*{hf:.8f}:iw*{xf:.8f}:ih*{yf:.8f}"
