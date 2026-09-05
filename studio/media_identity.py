"""Canonical media identity helpers for ProfitMente Studio's local render path."""

from decimal import Decimal
import math
import re


_NUMERIC_MEDIA_ID = re.compile(r'^[+-]?(?:\d+\.?\d*|\.\d+)$')
_EXPONENT_ZERO = re.compile(r'e([+-])0+(\d+)$')


def _javascript_number_string(numeric: float) -> str:
    """Approximate JavaScript ``String(Number(value))`` for persisted media IDs.

    Python and JavaScript use different presentation thresholds for scientific
    notation. In particular, Python renders ``1e-6`` as ``1e-06`` while JavaScript
    renders it as ``0.000001``; JavaScript also omits exponent zero padding
    (``1e-7`` rather than ``1e-07``). Those spelling differences matter because the
    renderer uses canonical IDs as dictionary keys.
    """
    if numeric == 0:
        return '0'
    magnitude = abs(numeric)
    if numeric.is_integer() and magnitude < 1e21:
        return str(int(numeric))

    shortest = repr(numeric)
    if 1e-6 <= magnitude < 1e21 and 'e' in shortest.lower():
        fixed = format(Decimal(shortest), 'f')
        if '.' in fixed:
            fixed = fixed.rstrip('0').rstrip('.')
        return fixed

    return _EXPONENT_ZERO.sub(r'e\1\2', shortest)


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
            return _javascript_number_string(numeric)
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
