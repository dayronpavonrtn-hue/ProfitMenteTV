import os, json, sys
from pathlib import Path
ROOT=Path(__file__).parent
errors=[]
required=['video.json','scenes.json','generate.py','broll.py','requirements.txt']
for name in required:
    if not (ROOT/name).exists(): errors.append(f'Missing {name}')
try:
    scenes=json.loads((ROOT/'scenes.json').read_text(encoding='utf-8'))['scenes']
    if len(scenes)<6: errors.append('Need at least 6 scenes')
    for i,s in enumerate(scenes,1):
        if not s.get('query'): errors.append(f'Scene {i} missing B-roll query')
except Exception as e: errors.append(f'scenes.json invalid: {e}')
try:
    cfg=json.loads((ROOT/'video.json').read_text(encoding='utf-8'))
    if not cfg.get('script','').strip(): errors.append('video.json script is empty')
except Exception as e: errors.append(f'video.json invalid: {e}')
if not os.getenv('PEXELS_API_KEY'):
    errors.append('PEXELS_API_KEY is not configured in GitHub Actions secrets')
if errors:
    print('\n'.join('ERROR: '+x for x in errors));sys.exit(1)
print('PRECHECK OK: v4 assets, script, scenes and Pexels key are ready.')
