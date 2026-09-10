"""Canonical media identity helpers for ProfitMente Studio's local render path."""

from decimal import Decimal
import math
import re


_NUMERIC_MEDIA_ID = re.compile(r'^[+-]?(?:\d+\.?\d*|\.\d+)$')
_EXPONENT_ZERO = re.compile(r'e([+-])0+(\d+)$')
_MAX_SAFE_INTEGER = 2**53 - 1


def _javascript_number_string(numeric: float) -> str:
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


def _safe_integer_number(value):
    """Accept only primitive finite integers that JavaScript can represent safely."""
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    try:
        numeric = float(value)
    except (TypeError, ValueError, OverflowError):
        return None
    if not math.isfinite(numeric) or not numeric.is_integer():
        return None
    if abs(numeric) > _MAX_SAFE_INTEGER:
        return None
    return numeric


def media_id_key(value):
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        numeric = _safe_integer_number(value)
        return _javascript_number_string(numeric) if numeric is not None else None
    if not isinstance(value, str):
        return None
    raw = value.strip()
    if not raw:
        return None
    if _NUMERIC_MEDIA_ID.fullmatch(raw):
        try:
            numeric = float(raw)
        except (ValueError, OverflowError):
            numeric = None
        if numeric is not None and math.isfinite(numeric):
            # Legacy string IDs may contain decimal spellings. Canonicalize
            # fractional numbers (browser Number identity) and safe integers,
            # but preserve oversized integer strings as textual identities so
            # they cannot silently collide after IEEE-754 rounding.
            if not numeric.is_integer() or abs(numeric) <= _MAX_SAFE_INTEGER:
                return _javascript_number_string(numeric)
    return raw


def normalize_project_media_ids(project):
    if not isinstance(project, dict):
        return project
    assets = project.get('assets')
    if isinstance(assets, list):
        seen = {}
        for index, asset in enumerate(assets):
            if not isinstance(asset, dict):
                raise ValueError(f'Medio inválido en assets[{index}]')
            key = media_id_key(asset.get('id'))
            if key is None:
                raise ValueError(f'ID de medio inválido en assets[{index}]')
            if key in seen:
                raise ValueError(
                    f'IDs de medio ambiguos: assets {seen[key]} y {index} '
                    f'se normalizan ambos como {key!r}'
                )
            seen[key] = index
            asset['id'] = key
    clips = project.get('clips')
    if isinstance(clips, list):
        for index, clip in enumerate(clips):
            if not isinstance(clip, dict) or 'asset' not in clip or clip.get('asset') is None:
                continue
            key = media_id_key(clip.get('asset'))
            if key is None:
                raise ValueError(f'Referencia de medio inválida en clips[{index}]')
            clip['asset'] = key
    return project


def asset_map(project):
    result = {}
    assets = project.get('assets', []) if isinstance(project, dict) else []
    if not isinstance(assets, list):
        return result
    for index, asset in enumerate(assets):
        if not isinstance(asset, dict):
            raise ValueError(f'Medio inválido en assets[{index}]')
        key = media_id_key(asset.get('id'))
        if key is None:
            raise ValueError(f'ID de medio inválido en assets[{index}]')
        if key in result:
            raise ValueError(f'ID de medio duplicado o ambiguo: {key!r}')
        result[key] = asset
    return result
