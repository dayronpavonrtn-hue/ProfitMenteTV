const assert=require('assert');

// Regression: when feature-bootstrap is active, the QA guard must never replace
// the production WebM handler after ProfitMenteWebMRender becomes available.
const listeners={};
const legacy=async()=> 'legacy';
const button={dataset:{},disabled:false,onclick:legacy};

global.window=globalThis;
global.document={querySelector(sel){return sel==='#renderBtn'?button:null}};
global.__profitmenteFeatureBootstrap=Promise.resolve();
global.addEventListener=(name,fn)=>{listeners[name]=fn};
global.ProfitMenteWebMRender={run:async()=> 'advanced'};

require('./render-qa-guard.js');

assert.strictEqual(button.onclick,legacy,'QA guard replaced the WebM handler during bootstrap');
assert.strictEqual(typeof listeners['profitmente:features-ready'],'function','QA guard did not wait for feature bootstrap');
listeners['profitmente:features-ready']();
assert.strictEqual(button.dataset.qaGuard,'advanced','advanced renderer was not recognized');
assert.strictEqual(button.onclick,legacy,'QA guard replaced the advanced renderer handler');

console.log('render-qa-guard advanced renderer regression: ok');
