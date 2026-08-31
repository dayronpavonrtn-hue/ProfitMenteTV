#!/usr/bin/env python3
from render_quality import resolve_render_quality

assert resolve_render_quality()['id']=='high'
assert resolve_render_quality('HIGH')['crf']=='18'
assert resolve_render_quality('draft')=={'id':'draft','preset':'veryfast','crf':'27','audio_bitrate':'128k'}
assert resolve_render_quality('standard')=={'id':'standard','preset':'fast','crf':'21','audio_bitrate':'160k'}
assert resolve_render_quality('invalid')==resolve_render_quality('high')
print('Render quality Python regression OK')
