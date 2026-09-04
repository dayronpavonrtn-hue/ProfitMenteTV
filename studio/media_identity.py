"""Canonical media identity helpers for ProfitMente Studio's local render path."""


def media_id_key(value):
    if value is None:
        return None
    key = str(value).strip()
    return key or None


def normalize_project_media_ids(project):
    if not isinstance(project, dict):
        return project
    assets = project.get('assets')
    if isinstance(assets, list):
        for asset in assets:
            if isinstance(asset, dict):
                key = media_id_key(asset.get('id'))
                if key is not None:
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
            result[key] = asset
    return result
