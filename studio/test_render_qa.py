import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from studio.render_qa import inspect_project


def test_ready_project_reports_full_coverage():
    project = {
        'duration': 6,
        'assets': [
            {'id': 'v', 'type': 'video', 'duration': 6},
            {'id': 'a', 'type': 'audio', 'duration': 6},
        ],
        'clips': [
            {'id': 'v1', 'track': 0, 'asset': 'v', 'start': 0, 'duration': 6},
            {'id': 'voice', 'track': 6, 'asset': 'a', 'start': 0, 'duration': 6},
            {'id': 'cap', 'track': 3, 'start': 0, 'duration': 6, 'text': 'Hola'},
        ],
    }
    report = inspect_project(project)
    assert report['ok'] is True
    assert report['stage'] == 'generator'
    assert report['blockers'] == []
    assert report['warnings'] == []
    assert report['metrics']['visual_coverage_ratio'] == 1.0
    assert report['metrics']['unresolved_source_clips'] == 0
    assert report['metrics']['automation_enabled_clips'] == 0
    assert report['metrics']['automation_unresolved_clips'] == 0
    assert report['metrics']['timeline_gaps'] == []
    assert report['metrics']['video_overlaps'] == []
    assert report['metrics']['voice_overlaps'] == []
    final = inspect_project(project, final=True)
    assert final['ok'] is True
    assert final['stage'] == 'final-render'


def test_visual_gaps_are_warning_for_generator_but_block_final_render():
    project = {'duration': 6, 'clips': [
        {'id': 'a', 'track': 0, 'start': 0, 'duration': 2},
        {'id': 'b', 'track': 1, 'start': 4, 'duration': 2},
    ]}
    report = inspect_project(project)
    assert report['ok'] is True
    assert report['metrics']['visual_coverage_seconds'] == 4
    assert report['metrics']['timeline_gaps'] == [{'start': 2.0, 'end': 4.0}]
    assert any('hueco' in warning for warning in report['warnings'])
    final = inspect_project(project, final=True)
    assert final['ok'] is False
    assert any('hueco' in blocker for blocker in final['blockers'])
    assert any('sin medio fuente' in blocker for blocker in final['blockers'])


def test_unresolved_source_can_enter_generator_but_not_final_render():
    project = {'duration': 5, 'clips': [
        {'id': 'generated-later', 'track': 0, 'start': 0, 'duration': 5},
    ]}
    generator = inspect_project(project)
    assert generator['ok'] is True
    assert generator['metrics']['unresolved_source_clips'] == 1
    final = inspect_project(project, final=True)
    assert final['ok'] is False
    assert final['metrics']['unresolved_source_clips'] == 1
    assert any('sin medio fuente' in blocker for blocker in final['blockers'])


def test_main_video_overlap_is_warning_then_final_blocker():
    project = {
        'duration': 6,
        'assets': [
            {'id': 'a', 'type': 'video', 'duration': 4},
            {'id': 'b', 'type': 'video', 'duration': 4},
        ],
        'clips': [
            {'id': 'first', 'track': 0, 'asset': 'a', 'start': 0, 'duration': 4},
            {'id': 'second', 'track': 0, 'asset': 'b', 'start': 3, 'duration': 3},
        ],
    }
    generator = inspect_project(project)
    assert generator['ok'] is True
    assert generator['metrics']['video_overlaps'] == [
        {'start': 3.0, 'end': 4.0, 'clip_ids': ['first', 'second']}
    ]
    assert any('solapamiento' in warning for warning in generator['warnings'])
    final = inspect_project(project, final=True)
    assert final['ok'] is False
    assert any('pista principal de video' in blocker for blocker in final['blockers'])


def test_voice_overlap_is_detected_but_music_layering_is_allowed():
    project = {
        'duration': 6,
        'assets': [
            {'id': 'v', 'type': 'video', 'duration': 6},
            {'id': 'voice-a', 'type': 'audio', 'duration': 4},
            {'id': 'voice-b', 'type': 'audio', 'duration': 4},
            {'id': 'music-a', 'type': 'audio', 'duration': 6},
            {'id': 'music-b', 'type': 'audio', 'duration': 6},
        ],
        'clips': [
            {'id': 'video', 'track': 0, 'asset': 'v', 'start': 0, 'duration': 6},
            {'id': 'voice1', 'track': 6, 'asset': 'voice-a', 'start': 0, 'duration': 4},
            {'id': 'voice2', 'track': 6, 'asset': 'voice-b', 'start': 3, 'duration': 3},
            {'id': 'music1', 'track': 5, 'asset': 'music-a', 'start': 0, 'duration': 6},
            {'id': 'music2', 'track': 5, 'asset': 'music-b', 'start': 0, 'duration': 6},
        ],
    }
    report = inspect_project(project)
    assert len(report['metrics']['voice_overlaps']) == 1
    assert any('pista de voz' in warning for warning in report['warnings'])
    final = inspect_project(project, final=True)
    assert final['ok'] is False
    assert any('pista de voz' in blocker for blocker in final['blockers'])


def test_enabled_automation_requires_action_before_final_render():
    project = {
        'duration': 4,
        'assets': [{'id': 'v', 'type': 'video', 'duration': 4}],
        'clips': [{'id': 'auto', 'track': 0, 'asset': 'v', 'start': 0, 'duration': 4,
                   'automation': {'enabled': True, 'intensity': 0.8}}],
    }
    generator = inspect_project(project)
    assert generator['ok'] is True
    assert generator['metrics']['automation_enabled_clips'] == 1
    assert generator['metrics']['automation_unresolved_clips'] == 1
    assert generator['metrics']['automation_unresolved'][0]['clip_id'] == 'auto'
    assert any('automatización' in warning for warning in generator['warnings'])
    final = inspect_project(project, final=True)
    assert final['ok'] is False
    assert any('automatización' in blocker for blocker in final['blockers'])


def test_actionable_and_disabled_automation_are_final_safe():
    project = {
        'duration': 4,
        'assets': [{'id': 'v', 'type': 'video', 'duration': 4}],
        'clips': [
            {'id': 'auto', 'track': 0, 'asset': 'v', 'start': 0, 'duration': 4,
             'automation': {'enabled': True, 'rule': 'beat-sync', 'intensity': 0.6}},
            {'id': 'caption', 'track': 3, 'start': 0, 'duration': 2,
             'automation': {'enabled': False}},
        ],
    }
    final = inspect_project(project, final=True)
    assert final['metrics']['automation_enabled_clips'] == 1
    assert final['metrics']['automation_disabled_clips'] == 1
    assert final['metrics']['automation_unresolved_clips'] == 0
    assert not any('automatización' in blocker for blocker in final['blockers'])


def test_no_visual_content_blocks_render_readiness():
    report = inspect_project({'duration': 5, 'clips': [
        {'id': 'caption', 'track': 3, 'start': 0, 'duration': 5, 'text': 'Solo texto'}
    ]})
    assert report['ok'] is False
    assert any('No hay clips visuales' in blocker for blocker in report['blockers'])


def test_bridge_validation_becomes_qa_blocker():
    project = {
        'duration': 5,
        'assets': [{'id': 'v', 'type': 'video', 'duration': 2}],
        'clips': [{'id': 'overrun', 'track': 0, 'asset': 'v', 'start': 0, 'duration': 3}],
    }
    report = inspect_project(project)
    assert report['ok'] is False
    assert report['metrics'] == {}
    assert any('excede la duración' in blocker for blocker in report['blockers'])


def run():
    test_ready_project_reports_full_coverage()
    test_visual_gaps_are_warning_for_generator_but_block_final_render()
    test_unresolved_source_can_enter_generator_but_not_final_render()
    test_main_video_overlap_is_warning_then_final_blocker()
    test_voice_overlap_is_detected_but_music_layering_is_allowed()
    test_enabled_automation_requires_action_before_final_render()
    test_actionable_and_disabled_automation_are_final_safe()
    test_no_visual_content_blocks_render_readiness()
    test_bridge_validation_becomes_qa_blocker()
    print('Studio render QA OK')


if __name__ == '__main__':
    run()
