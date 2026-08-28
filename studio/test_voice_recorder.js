const assert=require('assert');
const {pickMime,extensionFor,recordingName,resolveDuration}=require('./voice-recorder.js');
class MockRecorder{static isTypeSupported(m){return m==='audio/webm;codecs=opus'||m==='audio/ogg'}}
assert.strictEqual(pickMime(MockRecorder),'audio/webm;codecs=opus');
assert.strictEqual(extensionFor('audio/ogg;codecs=opus'),'ogg');
assert.strictEqual(extensionFor('audio/webm;codecs=opus'),'webm');
const name=recordingName(new Date('2026-08-28T03:00:00.000Z'),'audio/webm');
assert.ok(/^voz_2026-08-28_03-00-00-000\.webm$/.test(name),name);
assert.strictEqual(pickMime(null),'');
assert.strictEqual(resolveDuration(4.25,3.5),4.25);
assert.strictEqual(resolveDuration(0,3.5),3.5);
assert.strictEqual(resolveDuration(Infinity,2.75),2.75);
assert.strictEqual(resolveDuration(NaN,0),0);
console.log('voice recorder helpers OK');