import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const src=fs.readFileSync(new URL('./export-preflight.js',import.meta.url),'utf8');
const ctx={globalThis:{},window:undefined,document:undefined,module:{exports:{}}};
vm.createContext(ctx);
vm.runInContext(src,ctx);
const P=ctx.globalThis.ProfitMenteExportPreflight;
assert.ok(P);

const qa=()=>({ok:true,score:100,issues:[],warnings:[],metrics:{}});
const project=clips=>({mode:'Automático',duration:20,clips});

assert.equal(P.canonicalTrack('+06.0'),6,'legacy numeric narration aliases must remain compatible');
assert.equal(P.canonicalTrack('-0'),0,'negative zero must normalize to track zero');
for(const value of [false,true,null,undefined,{},[],Symbol('6'),6.5,7,'','  ','6x']){
  assert.equal(P.canonicalTrack(value),null,`invalid track identity must be rejected: ${String(value)}`);
}

let r=P.narrationCoverage(qa(),project([{track:'+06.0',start:0,duration:20,asset:'voice'}]));
assert.equal(r.metrics.narrationCoverage,100,'legacy narration aliases must count toward export coverage');
assert.equal(r.warnings.length,0);

r=P.narrationCoverage(qa(),project([{track:{valueOf(){return 6}},start:0,duration:20,asset:'fake'}]));
assert.equal(r.metrics.narrationCoverage,0,'coercible objects must never masquerade as narration clips');
assert.ok(r.warnings.some(x=>/no tiene narración activa/i.test(x)));

r=P.narrationCoverage(qa(),project([{track:6,start:{valueOf(){return 0}},duration:20,asset:'voice'}]));
assert.equal(r.metrics.narrationCoverage,100,'invalid start metadata must fall back safely without invoking object coercion');

r=P.narrationCoverage(qa(),project([{track:6,start:0,duration:{valueOf(){return 20}},asset:'voice'}]));
assert.equal(r.metrics.narrationCoverage,0,'coercible duration objects must not create fake narration coverage');
assert.ok(r.warnings.some(x=>/no tiene narración activa/i.test(x)));

r=P.narrationCoverage(qa(),{mode:'Automático',duration:20,clips:[{track:true,start:0,duration:20,asset:null,pending:true}]});
assert.equal(r.metrics.narrationCoverage,0);
assert.ok(r.warnings.some(x=>/no tiene narración activa/i.test(x)),'invalid pending tracks must not be treated as narration');

console.log('Export preflight narration identity QA OK');
