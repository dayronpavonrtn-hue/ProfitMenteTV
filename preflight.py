import os, json, sys
from pathlib import Path

ROOT = Path(__file__).parent
errors = []
warnings = []
required = ['video.json', 'scenes.json', 'generate.py', 'broll.py', 'requirements.txt']

for name in required:
    if not (ROOT / name).exists():
        errors.append(f'Missing {name}')

try:
    scenes = json.loads((ROOT / 'scenes.json').read_text(encoding='utf-8'))['scenes']
    if len(scenes) < 6:
        errors.append('Need at least 6 scenes')
    for i, scene in enumerate(scenes, 1):
        if not scene.get('query'):
            errors.append(f'Scene {i} missing B-roll query')
except Exception as exc:
    errors.append(f'scenes.json invalid: {exc}')

try:
    cfg = json.loads((ROOT / 'video.json').read_text(encoding='utf-8'))
    if not cfg.get('script', '').strip():
        errors.append('video.json script is empty')
except Exception as exc:
    errors.append(f'video.json invalid: {exc}')

# Pexels is optional. Keeping it optional is important for ProfitMente Studio's
# $0 mode: generate.py already has a deterministic local visual fallback, so a
# missing stock-media credential must never block a render.
if not os.getenv('PEXELS_API_KEY'):
    warnings.append('PEXELS_API_KEY not configured; render will use the local/offline B-roll fallback.')

if errors:
    print('\n'.join('ERROR: ' + item for item in errors))
    sys.exit(1)

for item in warnings:
    print('WARNING: ' + item)
print('PRECHECK OK: assets, script and scenes are ready for zero-cost render.')
