"""Canonical media identity helpers for ProfitMente Studio's local render path."""

import math
import re


_NUMERIC_MEDIA_ID = re.compile(r'^[+-]?(?:\d+\.?\d*|\.\d+)$')


def media_id_key(value):
    """Return the same logical media identity used by Studio's browser QA/preview.

    Legacy projects can serialize numeric IDs in several equivalent forms, such as
    ``7``, ``"007"``, ``"7.0"`` or ``"+07.000"``. JavaScript's editor path treats
    those values as the same Number identity. Normalize them here before any strict
    Python dictionary lookup so preview, validation and MP4 render cannot disagree.

    Non-numeric IDs remain trimmed, case-sensitive text. Negative zero is collapsed
    to ``"0"`` to match JavaScript Number stringification.
    """
    if value is None:
        return None
    raw = str(value).strip()
    if not raw:
        return None
    if _NUMERIC_MEDIA_ID.fullmatch(raw):
        try:
            numeric = float(raw)
        except ValueError:
            numeric = None
        if numeric is not None and math.isfinite(numeric):
            if numeric == 0:
                return '0'
            # JavaScript String(Number(...)) prints ordinary integral values without
            # a trailing .0 up to the point where scientific notation is preferred.
            if numeric.is_integer() and abs(numeric) < 1e21:
                return str(int(numeric))
            return repr(numeric)
    return raw


def normalize_project_media_ids(project):
    """Canonicalize persisted media IDs without allowing ambiguous collisions.

    Imported/legacy projects can represent the same logical ID as ``7``, ``"007"``,
    ``"7.0"`` or ``"+07.000"``. Clips and assets must resolve through one canonical
    identity, but two *asset declarations* collapsing to the same key are ambiguous:
    silently keeping whichever declaration happens to be last can render the wrong
    local file. Reject that project at the render boundary instead.
    """
    if not isinstance(project, dict):
        return project
    assets = project.get('assets')
    if isinstance(assets, list):
        seen = {}
        for index, asset in enumerate(assets):
            if not isinstance(asset, dict):
                continue
            key = media_id_key(asset.get('id'))
            if key is not None:
                if key in seen:
                    raise ValueError(
                        f'IDs de medio ambiguos: assets {seen[key]} y {index} '
                        f'se normalizan ambos como {key!r}'
                    )
                seen[key] = index
                asset['id'] = key
    clips = project.get('clips')
    if isinstance(clips, list):
        for clip in clips:
            if isinstance(clip, dict) and 'asset' in clip:
                key = media_id_key(clip.get('asset'))
                if key is not None:
                    clip['asset'] = key
    return project


def asset_map(project):
    result = {}
    assets = project.get('assets', []) if isinstance(project, dict) else []
    if not isinstance(assets, list):
        return result
    for asset in assets:
        if not isinstance(asset, dict):
            continue
        key = media_id_key(asset.get('id'))
        if key is not None:
            if key in result:
                raise ValueError(f'ID de medio duplicado o ambiguo: {key!r}')
            result[key] = asset
    return result
