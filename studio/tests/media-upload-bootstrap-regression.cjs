const assert=require('assert');
const fs=require('fs');
const path=require('path');

const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const app=html.indexOf('<script src="app.js"></script>');
const inspector=html.indexOf('<script src="media-inspector.js"></script>');
const upload=html.indexOf('<script src="media-upload-dedupe.js"></script>');

assert(app>=0,'app.js must be loaded');
assert(inspector>=0,'media-inspector.js must be loaded');
assert(upload>=0,'media-upload-dedupe.js must be loaded');
assert(upload>app,'resilient upload handler must replace the basic app.js handler');
assert(upload>inspector,'media inspector must be available before resilient upload bootstraps');
assert.equal((html.match(/<script src="media-upload-dedupe\.js"><\/script>/g)||[]).length,1,'upload integration must be loaded exactly once');
console.log('media upload bootstrap regression: OK');
