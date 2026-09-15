const assert=require('node:assert/strict');
require('../startup-project-guard.js');
const guard=globalThis.ProfitMenteStartupProjectGuard;
assert.ok(guard,'startup guard must load');
const base={version:'1.3',name:'QA',mode:'Manual',duration:45,clips:[]};
const valid=guard.normalizeProject({...base,format:'16:9',fps:60,renderQuality:'STANDARD'});
assert.ok(valid);
assert.equal(valid.format,'16:9');
assert.equal(valid.fps,60);
assert.equal(valid.renderQuality,'standard');
const legacy=guard.normalizeProject(base);
assert.ok(legacy,'legacy project without render settings must remain supported');
assert.equal(legacy.format,'9:16');
assert.equal(legacy.fps,30);
assert.equal(legacy.renderQuality,'high');
for(const patch of [
  {format:null},{format:'4:3'},{format:''},
  {fps:null},{fps:25},{fps:'29.97'},{fps:true},
  {frameRate:null},{frameRate:120},
  {renderQuality:null},{renderQuality:''},{renderQuality:'ultra'},{renderQuality:true}
])assert.equal(guard.normalizeProject({...base,...patch}),null,`must reject ${JSON.stringify(patch)}`);
console.log('startup render settings strict regression: ok');
