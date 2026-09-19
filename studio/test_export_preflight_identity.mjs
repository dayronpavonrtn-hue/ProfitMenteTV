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
assert.equal(P.canonicalTrack('6e0'),6,'decimal scientific legacy track aliases must remain compatible');
for(const value of [false,true,null,undefined,{},[],Symbol('6'),6.5,7,'','  ','6x','0x6','0b110','0o6','Infinity','NaN']){
  assert.equal(P.canonicalTrack(value),null,`invalid track identity must be rejected: ${String(value)}`);
}

assert.equal(P.finiteNumber('+20.0',0),20,'legacy decimal numeric strings must remain compatible');
assert.equal(P.finiteNumber('2e1',0),20,'scientific decimal numeric strings must remain compatible');
for(const value of ['0x14','0b10100','0o24','Infinity','NaN',true,{},[]]){
  assert.equal(P.finiteNumber(value,7),7,`non-decimal or coercible numeric metadata must fall back: ${String(value)}`);
}

let r=P.narrationCoverage(qa(),project([{track:'+06.0',start:0,duration:20,asset:'voice'}]));
assert.equal(r.metrics.narrationCoverage,100,'legacy narration aliases must count toward export coverage');
assert.equal(r.warnings.length,0);

r=P.narrationCoverage(qa(),project([{track:6,start:0,duration:20,asset:'voice',muted:'false'}]));
assert.equal(r.metrics.narrationCoverage,100,'legacy string false must not mute narration in preflight');
assert.equal(r.warnings.length,0,'legacy string false must remain aligned with preview/render strict mute semantics');

r=P.narrationCoverage(qa(),project([{track:6,start:0,duration:20,asset:'voice',muted:false}]));
assert.equal(r.metrics.narrationCoverage,100,'boolean false must keep narration active');

r=P.narrationCoverage(qa(),project([{track:6,start:0,duration:20,asset:'voice',muted:true}]));
assert.equal(r.metrics.narrationCoverage,0,'only strict boolean true may mute narration');
assert.ok(r.warnings.some(x=>/no tiene narración activa/i.test(x)));

r=P.narrationCoverage(qa(),project([{track:6,start:0,duration:20,asset:null,pending:true,muted:true}]));
assert.equal(r.metrics.narrationCoverage,0,'muted pending narration must not count as coverage');
assert.ok(r.warnings.some(x=>/no tiene narración activa/i.test(x)),'muted pending narration must be treated as inactive, not as an outstanding recording');
assert.ok(!r.warnings.some(x=>/pendiente/i.test(x)),'muted pending narration must not produce a misleading pending warning');

r=P.narrationCoverage(qa(),project([{track:'0x6',start:0,duration:20,asset:'fake'}]));
assert.equal(r.metrics.narrationCoverage,0,'hex track aliases must not masquerade as narration clips');
assert.ok(r.warnings.some(x=>/no tiene narración activa/i.test(x)));

r=P.narrationCoverage(qa(),project([{track:{valueOf(){return 6}},start:0,duration:20,asset:'fake'}]));
assert.equal(r.metrics.narrationCoverage,0,'coercible objects must never masquerade as narration clips');
assert.ok(r.warnings.some(x=>/no tiene narración activa/i.test(x)));

for(const badStart of [{valueOf(){return 0}},'NaN','Infinity',-1,true]){
  r=P.narrationCoverage(qa(),project([{track:6,start:badStart,duration:20,asset:'voice'}]));
  assert.equal(r.metrics.narrationCoverage,0,`invalid start metadata must not create fake narration coverage: ${String(badStart)}`);
}

for(const badDuration of [{valueOf(){return 20}},'0x14','NaN','Infinity',-1,0,true]){
  r=P.narrationCoverage(qa(),project([{track:6,start:0,duration:badDuration,asset:'voice'}]));
  assert.equal(r.metrics.narrationCoverage,0,`invalid duration metadata must not create fake narration coverage: ${String(badDuration)}`);
}

r=P.narrationCoverage(qa(),{mode:'Automático',duration:'NaN',clips:[{track:6,start:0,duration:20,asset:'voice'}]});
assert.equal(r.metrics.narrationCoverage,0,'invalid project duration must never report fake narration coverage');

r=P.narrationCoverage(qa(),{mode:'Automático',duration:20,clips:[{track:true,start:0,duration:20,asset:null,pending:true}]});
assert.equal(r.metrics.narrationCoverage,0);
assert.ok(r.warnings.some(x=>/no tiene narración activa/i.test(x)),'invalid pending tracks must not be treated as narration');

console.log('Export preflight narration identity QA OK');