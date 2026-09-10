#!/usr/bin/env python3
import copy
from media_identity import media_id_key, normalize_project_media_ids, asset_map


def expect_error(fn, text):
    try:
        fn()
    except ValueError as exc:
        assert text in str(exc), (text, str(exc))
    else:
        raise AssertionError(f'expected ValueError containing {text!r}')


# Match the strict browser bundle boundary: primitive, safe integer identities only.
assert media_id_key(True) is None
assert media_id_key(False) is None
assert media_id_key({'id': 7}) is None
assert media_id_key([7]) is None
assert media_id_key(2**53) is None
assert media_id_key(1.5) is None
assert media_id_key(-0.0) == '0'
assert media_id_key('007') == '7'
assert media_id_key('7.0') == '7'
assert media_id_key('+07.000') == '7'
assert media_id_key('1.5') == '1.5'
assert media_id_key('asset-7') == 'asset-7'
assert media_id_key(str(2**53)) == str(2**53)

base = {
    'assets': [{'id': '007', 'name': 'a.mp4'}],
    'clips': [{'asset': 7, 'track': 0}, {'track': 3, 'name': 'caption'}],
}
normalized = normalize_project_media_ids(copy.deepcopy(base))
assert normalized['assets'][0]['id'] == '7'
assert normalized['clips'][0]['asset'] == '7'
assert normalized['clips'][1].get('asset') is None
assert list(asset_map(normalized)) == ['7']

expect_error(lambda: normalize_project_media_ids({'assets': [{'id': True}], 'clips': []}), 'ID de medio inválido')
expect_error(lambda: normalize_project_media_ids({'assets': [{'id': {'nested': 1}}], 'clips': []}), 'ID de medio inválido')
expect_error(lambda: normalize_project_media_ids({'assets': [{'id': 2**53}], 'clips': []}), 'ID de medio inválido')
expect_error(lambda: normalize_project_media_ids({'assets': [{'id': 7}, {'id': '007'}], 'clips': []}), 'ambiguos')
expect_error(lambda: normalize_project_media_ids({'assets': [{'id': 7}], 'clips': [{'asset': True}]}), 'Referencia de medio inválida')
expect_error(lambda: normalize_project_media_ids({'assets': [{'id': 7}], 'clips': [{'asset': [7]}]}), 'Referencia de medio inválida')
expect_error(lambda: asset_map({'assets': [{'id': False}]}), 'ID de medio inválido')

print('Strict render media identity regression: OK')
