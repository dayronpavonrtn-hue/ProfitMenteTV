import os, json, urllib.parse, urllib.request
from pathlib import Path

ROOT = Path(__file__).parent
OUT = ROOT / 'assets' / 'broll'
OUT.mkdir(parents=True, exist_ok=True)
PLAN = json.loads((ROOT / 'scenes.json').read_text(encoding='utf-8'))['scenes']
KEY = os.getenv('PEXELS_API_KEY', '').strip()


def request_json(url):
    req = urllib.request.Request(url, headers={'Authorization': KEY, 'User-Agent': 'ProfitMenteTV/1.0'})
    with urllib.request.urlopen(req, timeout=30) as response:
        return json.load(response)


def score(video):
    duration = float(video.get('duration') or 0)
    files = video.get('video_files', [])
    portrait = any((item.get('height') or 0) > (item.get('width') or 0) for item in files)
    hd = max([item.get('height') or 0 for item in files] or [0])
    duration_score = 1200 if 5 <= duration <= 20 else max(0, 800 - abs(duration - 10) * 40)
    return (5000 if portrait else 0) + duration_score + min(hd, 1920)


def best_file(video):
    files = video.get('video_files', [])
    portrait = [item for item in files if (item.get('height') or 0) > (item.get('width') or 0)]
    pool = portrait or files
    suitable = [item for item in pool if int(item.get('height') or 0) >= 1280 and int(item.get('width') or 0) >= 720] or pool
    return min(
        suitable,
        key=lambda item: abs((item.get('height') or 0) - 1920) + abs((item.get('width') or 0) - 1080),
    ) if suitable else None


def download(url, dest):
    req = urllib.request.Request(url, headers={'User-Agent': 'ProfitMenteTV/1.0'})
    with urllib.request.urlopen(req, timeout=90) as src, open(dest, 'wb') as dst:
        while True:
            chunk = src.read(1024 * 1024)
            if not chunk:
                break
            dst.write(chunk)
    if dest.stat().st_size < 100000:
        raise RuntimeError('Downloaded B-roll file is unexpectedly small: ' + str(dest))


def write_offline_manifest(reason='PEXELS_API_KEY not configured'):
    manifest = {
        'provider': 'ProfitMente Studio local/offline fallback',
        'provider_url': '',
        'mode': 'zero-cost-offline',
        'reason': reason,
        'clips': [],
    }
    (OUT / 'credits.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    print('B-roll network lookup skipped:', reason)
    print('generate.py will use its built-in local visual fallback; no paid service or credential is required.')


def main():
    # Stock media is an enhancement, not a hard dependency. In $0 mode the
    # renderer must still complete when no external API credential is present.
    if not KEY:
        write_offline_manifest()
        return

    credits = []
    used = set()
    for old in OUT.glob('scene_*.mp4'):
        old.unlink()

    for i, scene in enumerate(PLAN):
        query = scene.get('query') or scene.get('subtitle') or scene.get('title')
        url = (
            'https://api.pexels.com/v1/videos/search?per_page=30&orientation=portrait&size=medium&locale=en-US&query='
            + urllib.parse.quote(query)
        )
        videos = sorted(request_json(url).get('videos', []), key=score, reverse=True)
        video = next((item for item in videos if item.get('id') not in used), None)
        if not video:
            raise RuntimeError('No suitable Pexels video for scene ' + str(i + 1) + ' query=' + query)
        used.add(video.get('id'))
        file_info = best_file(video)
        if not file_info:
            raise RuntimeError('No downloadable file for scene ' + str(i + 1))
        dest = OUT / f'scene_{i + 1}.mp4'
        download(file_info['link'], dest)
        credits.append({
            'scene': i + 1,
            'pexels_id': video.get('id'),
            'creator': video.get('user', {}).get('name', 'Pexels creator'),
            'creator_url': video.get('user', {}).get('url', ''),
            'source': video.get('url', ''),
            'query': query,
            'bytes': dest.stat().st_size,
        })
        print('Scene', i + 1, 'ready:', dest, 'bytes=', dest.stat().st_size)

    (OUT / 'credits.json').write_text(
        json.dumps({'provider': 'Pexels', 'provider_url': 'https://www.pexels.com', 'clips': credits}, ensure_ascii=False, indent=2),
        encoding='utf-8',
    )


if __name__ == '__main__':
    main()
