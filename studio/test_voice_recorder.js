const assert=require('assert');
const {pickMime,extensionFor,recordingName}=require('./voice-recorder.js');
class MockRecorder{static isTypeSupported(m){return m==='audio/webm;codecs=opus'||m==='audio/ogg'}}
assert.strictEqual(pickMime(MockRecorder),'audio/webm;codecs=opus');
assert.strictEqual(extensionFor('audio/ogg;codecs=opus'),'ogg');
assert.strictEqual(extensionFor('audio/webm;codecs=opus'),'webm');
const name=recordingName(new Date('2026-08-28T03:00:00.000Z'),'audio/webm');
assert.ok(/^voz_2026-08-28_03-00-00-000\.webm$/.test(name),name);
assert.strictEqual(pickMime(null),'');
console.log('voice recorder helpers OK');