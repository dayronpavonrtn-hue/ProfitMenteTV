from studio.render_qa import inspect_plan


def plan(captions):
    return {
        'duration': 10.0,
        'tracks': {
            'video': [{'id': 'v1', 'start': 0.0, 'end': 10.0, 'asset_id': 'video'}],
            'overlay': [],
            'motion': [],
            'captions': captions,
            'sfx': [],
            'music': [],
            'voice': [],
        },
    }


clean = inspect_plan(plan([
    {'id': 'c1', 'start': 0.0, 'end': 2.0, 'text': 'Uno'},
    {'id': 'c2', 'start': 2.0, 'end': 4.0, 'text': 'Dos'},
]), final=True)
assert clean['ok'] is True, clean
assert clean['metrics']['caption_overlaps'] == [], clean

overlapping_captions = [
    {'id': 'c1', 'start': 0.0, 'end': 3.0, 'text': 'Uno'},
    {'id': 'c2', 'start': 2.5, 'end': 4.0, 'text': 'Dos'},
]
preview = inspect_plan(plan(overlapping_captions), final=False)
assert preview['ok'] is True, preview
assert len(preview['metrics']['caption_overlaps']) == 1, preview
assert preview['metrics']['caption_overlaps'][0]['clip_ids'] == ['c1', 'c2'], preview
assert any('captions' in warning for warning in preview['warnings']), preview

final = inspect_plan(plan(overlapping_captions), final=True)
assert final['ok'] is False, final
assert len(final['metrics']['caption_overlaps']) == 1, final
assert any('captions' in blocker for blocker in final['blockers']), final

print('render caption overlap regression: ok')
