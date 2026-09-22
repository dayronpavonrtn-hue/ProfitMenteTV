const assert=require('assert');
const upload=require('../media-upload-dedupe.js');

assert.equal(upload.mediaType({name:'clip.MOV',type:''}),'video');
assert.equal(upload.mediaMime({name:'clip.MOV',type:''},'video'),'video/quicktime');
assert.equal(upload.mediaType({name:'voice.m4a',type:''}),'audio');
assert.equal(upload.mediaMime({name:'voice.m4a',type:''},'audio'),'audio/mp4');
assert.equal(upload.mediaType({name:'photo.JPEG',type:''}),'image');
assert.equal(upload.mediaMime({name:'photo.JPEG',type:''},'image'),'image/jpeg');
assert.equal(upload.mediaType({name:'unknown.bin',type:''}),'');
assert.equal(upload.mediaType({name:'odd.data',type:'video/mp4'}),'video');
assert.equal(upload.mediaMime({name:'odd.data',type:'video/mp4'},'video'),'video/mp4');
assert.equal(upload.extension('archive.name.webm'),'webm');
console.log('media upload type regression: OK');
