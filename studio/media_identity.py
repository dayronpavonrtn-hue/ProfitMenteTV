"""Canonical media identity helpers for ProfitMente Studio's local render path."""


def media_id_key(value):
    if value is None:
        return None
    key = str(value).strip()
    return key or None


def normalize_project_media_ids(project):
    """Canonicalize persisted media IDs without allowing ambiguous collisions.

    Imported/legacy projects can represent the same logical ID as ``7``, ``"7"``
    or ``" 7 "``. Clips and assets must resolve through one canonical identity,
    but two *asset declarations* collapsing to the same key are ambiguous: silently
    keeping whichever declaration happens to be last can render the wrong local
    file. Reject that project at the render boundary instead.
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
