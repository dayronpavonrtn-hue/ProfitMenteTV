const assert = require('assert');
const { ProfitMenteProjectImportEngine } = require('./project-import-engine.js');

const engine = new ProfitMenteProjectImportEngine();
const valid = {
  version: '1.3', name: 'Import test', mode: 'Manual', duration: 12,
  format: '9:16', fps: 30, renderQuality: 'high',
  clips: [
    { id: 'v1', track: 0, name: 'Video', start: 0, duration: 6, asset: 'media-1' },
    { id: 'c1', track: 3, name: 'Caption', start: 1, duration: 2 }
  ]
};

const normalized = engine.normalize(valid);
assert.equal(normalized.name, 'Import test');
assert.equal(normalized.clips.length, 2);
assert.equal(normalized.clips[0].asset, 'media-1');
assert.equal(normalized.fps, 30);
assert.equal(normalized.renderQuality, 'high');

const rejects = [
  [{ ...valid, clips: 'not-an-array' }, /Timeline de proyecto inválida/],
  [{ ...valid, duration: 0 }, /Duración de proyecto inválida/],
  [{ ...valid, format: '4:3' }, /Formato de proyecto no compatible/],
  [{ ...valid, fps: 25 }, /FPS de proyecto no compatible/],
  [{ ...valid, fps: 29.97 }, /FPS de proyecto no compatible/],
  [{ ...valid, renderQuality: 'ultra' }, /Calidad de render no compatible/],
  [{ ...valid, clips: [{ id: 'x', track: 9, start: 0, duration: 1 }] }, /Pista de clip inválida/],
  [{ ...valid, clips: [{ id: 'x', track: 0, start: 11, duration: 2 }] }, /Clip excede la duración del proyecto/],
  [{ ...valid, clips: [
    { id: '1', track: 0, start: 0, duration: 1 },
    { id: 1, track: 0, start: 1, duration: 1 }
  ] }, /ID de clip duplicado o ambiguo/],
  [{ ...valid, clips: [
    { id: '1', track: 0, start: 0, duration: 1 },
    { id: '01', track: 0, start: 1, duration: 1 }
  ] }, /ID de clip duplicado o ambiguo/],
  [{ ...valid, clips: [{ id: 'x', track: 0, start: 0, duration: 1, asset: {} }] }, /Referencia de medio inválida/],
  [{ ...valid, clips: [{ id: 'x', track: 0, start: 0, duration: 1, asset: '   ' }] }, /Referencia de medio inválida/],
  [{ ...valid, clips: [{ id: 'x', track: 0, start: 0, duration: 1, speed: 8 }] }, /Velocidad de clip inválido/],
  [{ ...valid, clips: [{ id: 'x', track: 0, start: 0, duration: 1, fadeIn: .75, fadeOut: .75 }] }, /Fades de audio solapados/]
];

for (const [project, pattern] of rejects) {
  assert.throws(() => engine.normalize(project), pattern);
}

const wrapped = engine.normalize({ kind: 'profitmente-studio-project', project: valid });
assert.equal(wrapped.clips.length, 2);

console.log('[OK] Project import normalization rejects malformed or unsafe timelines.');
