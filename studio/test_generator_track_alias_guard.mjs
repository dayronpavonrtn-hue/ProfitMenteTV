import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';

globalThis.window=globalThis;
if(!globalThis.crypto)Object.defineProperty(globalThis,'crypto',{value:webcrypto,configurable:true});
vm.runInThisContext(fs.readFileSync(new URL('./edit-lock-guard.js',import.meta.url),'utf8'));
vm.runInThisContext(fs.readFileSync(new URL('./generator-engine.js',import.meta.url),'utf8'));
vm.runInThisContext(fs.readFileSync(new URL('./generator-track-alias-guard.js',import.meta.url),'utf8'));

const engine=new ProfitMenteGeneratorEngine();
const assets=[
  {id:'visual',name:'tema vertical.jpg',type:'image',width:1080,height:1920},
  {id:'voice',name:'voice narration final.wav',type:'audio',duration:20},
  {id:'music',name:'background instrumental music.wav',type:'audio',duration:30},
  {id:'sfx',name:'whoosh transition sfx.wav',type:'audio',duration:.4}
];

assert.equal(ProfitMenteGeneratorTrackAliasGuard.canonicalTrack('0.0'),0);
assert.equal(ProfitMenteGeneratorTrackAliasGuard.canonicalTrack('06'),6);
assert.equal(ProfitMenteGeneratorTrackAliasGuard.canonicalTrack(' 5.0 '),5);
assert.equal(ProfitMenteGeneratorTrackAliasGuard.canonicalTrack(''),null);
assert.equal(ProfitMenteGeneratorTrackAliasGuard.canonicalTrack('1.5'),null);
assert.equal(ProfitMenteGeneratorTrackAliasGuard.canonicalTrack('7'),null);

const aliasLocked={
  name:'Alias locks',format:'9:16',duration:20,
  trackState:{'0.0':{locked:true},'01':{locked:true},'05':{locked:true}},
  trackStates:{'4.0':{locked:true},'06':{locked:true}},
  clips:[
    {id:'scene',track:0,start:0,duration:5,asset:null,keywords:['tema']},
    {id:'voice-slot',track:6,start:0,duration:20,asset:null}
  ]
};
const before=JSON.stringify(aliasLocked);
const result=engine.assignAssets(aliasLocked,assets);
assert.equal(result.primary,0,'0.0 must lock the canonical primary track');
assert.equal(result.broll,0,'01 must lock the canonical B-roll track');
assert.equal(result.narration,0,'06 must lock the canonical narration track');
assert.equal(result.music,0,'05 must lock the canonical music track');
assert.equal(result.sfx,0,'4.0 must lock the canonical SFX track');
assert.equal(JSON.stringify(aliasLocked),before,'fully alias-locked project should remain unchanged');

const clipAlias={track:'0.0',locked:true,start:0,duration:5};
assert.equal(engine.clipLocked({clips:[clipAlias]},clipAlias),true);
assert.equal(clipAlias.track,0,'locked clip aliases must canonicalize before regeneration overlap checks');
assert.equal(String(clipAlias.track),String({track:0}.track),'canonicalized locked clip must compare equal to generated track 0');

const unlocked={track:'0.0',locked:false,start:0,duration:5};
assert.equal(engine.clipLocked({clips:[unlocked]},unlocked),false);
assert.equal(unlocked.track,'0.0','unlocked clips must not be rewritten as a side effect');

const html=fs.readFileSync(new URL('./index.html',import.meta.url),'utf8');
const enginePos=html.indexOf('generator-engine.js');
const guardPos=html.indexOf('generator-track-alias-guard.js');
const integrationPos=html.indexOf('generator-integration.js');
assert.ok(enginePos>=0&&guardPos>enginePos&&integrationPos>guardPos,'alias guard must load after generator engine and before integration');

console.log('generator track alias guard regression passed');