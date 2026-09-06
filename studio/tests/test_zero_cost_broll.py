import importlib.util
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def load_broll_module():
    spec = importlib.util.spec_from_file_location('profitmente_broll', ROOT / 'broll.py')
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def test_broll_without_api_key_uses_offline_manifest():
    module = load_broll_module()
    with tempfile.TemporaryDirectory() as tmp:
        module.OUT = Path(tmp)
        module.KEY = ''
        module.main()
        manifest_path = module.OUT / 'credits.json'
        assert manifest_path.exists(), 'offline mode must still produce credits.json for the render artifact bundle'
        manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
        assert manifest['mode'] == 'zero-cost-offline'
        assert manifest['clips'] == []
        assert 'local/offline' in manifest['provider']


def test_preflight_does_not_require_pexels_key():
    env = os.environ.copy()
    env.pop('PEXELS_API_KEY', None)
    proc = subprocess.run(
        [sys.executable, str(ROOT / 'preflight.py')],
        cwd=ROOT,
        env=env,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )
    assert proc.returncode == 0, proc.stdout
    assert 'WARNING:' in proc.stdout
    assert 'local/offline B-roll fallback' in proc.stdout
    assert 'PRECHECK OK:' in proc.stdout


if __name__ == '__main__':
    test_broll_without_api_key_uses_offline_manifest()
    test_preflight_does_not_require_pexels_key()
    print('zero-cost B-roll fallback QA: OK')
