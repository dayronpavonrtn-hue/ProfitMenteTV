import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { ProfitMenteProjectLibrary } = require('./project-library.js');

function baseProject(overrides = {}) {
  return {
    name: 'Import test',
    duration: 60,
    format: '9:16',
    fps: 30,
    clips: [],
    ...overrides,
  };
}

{
  const source = baseProject({
    duration: '120.5',
    clips: [{ id: 'clip-1', start: '3.25', duration: '4.5' }],
  });
  const normalized = ProfitMenteProjectLibrary.normalizeImportedProject(source);
  assert.equal(normalized.duration, 120.5, 'legacy numeric project duration strings remain supported');
  assert.equal(normalized.clips[0].start, 3.25, 'legacy numeric clip start strings are normalized');
  assert.equal(normalized.clips[0].duration, 4.5, 'legacy numeric clip duration strings are normalized');
  assert.equal(typeof normalized.duration, 'number');
  assert.equal(typeof normalized.clips[0].start, 'number');
  assert.equal(typeof normalized.clips[0].duration, 'number');
}

for (const badDuration of [true, false, [], [120], {}, '   ', null]) {
  assert.throws(
    () => ProfitMenteProjectLibrary.normalizeImportedProject(baseProject({ duration: badDuration })),
    /Duración de proyecto inválida/,
    `project duration must reject coercive value ${JSON.stringify(badDuration)}`,
  );
}

for (const badTime of [true, false, [], [2], {}, '   ']) {
  assert.throws(
    () => ProfitMenteProjectLibrary.normalizeImportedProject(baseProject({ clips: [{ start: badTime, duration: 2 }] })),
    /Tiempo de clip inválido/,
    `clip start must reject coercive value ${JSON.stringify(badTime)}`,
  );
  assert.throws(
    () => ProfitMenteProjectLibrary.normalizeImportedProject(baseProject({ clips: [{ start: 0, duration: badTime }] })),
    /Tiempo de clip inválido/,
    `clip duration must reject coercive value ${JSON.stringify(badTime)}`,
  );
}

assert.throws(
  () => ProfitMenteProjectLibrary.normalizeImportedProject(baseProject({ duration: 'Infinity' })),
  /Duración de proyecto inválida/,
);
assert.throws(
  () => ProfitMenteProjectLibrary.normalizeImportedProject(baseProject({ clips: [{ start: '-1', duration: 1 }] })),
  /Tiempo de clip inválido/,
);

{
  const original = baseProject({ duration: '75', clips: [{ start: '1', duration: '2' }] });
  const before = structuredClone(original);
  const normalized = ProfitMenteProjectLibrary.normalizeImportedProject(original);
  assert.deepEqual(original, before, 'normalization must not mutate imported source data');
  assert.equal(normalized.duration, 75);
  assert.equal(normalized.clips[0].start, 1);
  assert.equal(normalized.clips[0].duration, 2);
}

{
  const blank = ProfitMenteProjectLibrary.blank();
  assert.equal(ProfitMenteProjectLibrary.hasUnsavedWork({ ...blank, duration: '45', fps: '30' }), false, 'legacy numeric strings matching blank defaults remain clean');
  assert.equal(ProfitMenteProjectLibrary.hasUnsavedWork({ ...blank, duration: true }), true, 'boolean duration cannot masquerade as a numeric project setting');
  assert.equal(ProfitMenteProjectLibrary.hasUnsavedWork({ ...blank, fps: [30] }), true, 'array fps cannot masquerade as a numeric project setting');
}

console.log('ProfitMente project library numeric import regression: OK');
