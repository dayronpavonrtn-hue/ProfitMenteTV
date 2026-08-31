import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';

globalThis.window=globalThis;
if(!globalThis.crypto)Object.defineProperty(globalThis,'crypto',{value:webcrypto,configurable:true});
vm.runInThisContext(fs.readFileSync(new URL('./edit-lock-guard.js',import.meta.url),'utf8'));
vm.runInThisContext(fs.readFileSync(new URL('./generator-engine.js',import.meta.url),'utf8'));

const engine=new ProfitMenteGeneratorEngine();
const assets=[
  {id:'visual-a',name:'tema vertical uno.jpg',type:'image',width:1080,height:1920},
  {id:'visual-b',name:'tema vertical dos.jpg',type:'image',width:1080,height:1920},
  {id:'voice',name:'voice narration final.wav',type:'audio',duration:20},
  {id:'music',name:'background instrumental music.wav',type:'audio',duration:30},
  {id:'whoosh',name:'whoosh transition sfx.wav',type:'audio',duration:.4}
];

const protectedProject={
  name:'Protected automation',format:'9:16',duration:20,
  trackState:{1:{locked:true},4:{locked:true},5:{locked:true},6:{locked:true}},
  clips:[
    {id:'locked-primary',track:0,name:'Manual protegido',start:0,duration:5,asset:null,locked:true,keywords:['tema']},
    {id:'editable-primary',track:0,name:'Automático editable',start:5,duration:5,asset:null,keywords:['tema']},
    {id:'voice-slot',track:6,name:'Narración pendiente',start:0,duration:20,asset:null}
  ]
};
const result=engine.assignAssets(protectedProject,assets);
assert.equal(result.primary,1,'only the editable primary scene may be auto-filled');
assert.equal(protectedProject.clips.find(c=>c.id==='locked-primary').asset,null,'locked clip must never be assigned media');
assert.ok(protectedProject.clips.find(c=>c.id==='editable-primary').asset,'editable clip should still be auto-filled');
assert.equal(result.broll,0,'locked B-roll track must block automatic B-roll creation');
assert.equal(result.narration,0,'locked narration track must block automatic narration assignment');
assert.equal(result.music,0,'locked music track must block automatic soundtrack creation');
assert.equal(result.sfx,0,'locked SFX track must block automatic effects');
assert.equal(protectedProject.clips.filter(c=>[1,4,5].includes(Number(c.track))).length,0,'automation must not insert clips into locked tracks');
assert.equal(protectedProject.clips.find(c=>c.id==='voice-slot').asset,null,'track-locked narration placeholder must stay untouched');

const lockedPrimaryTrack={
  name:'Locked primary track',format:'9:16',duration:8,trackState:{0:{locked:true}},
  clips:[{id:'scene',track:0,start:0,duration:4,asset:null,keywords:['tema']}]
};
const lockedPrimaryResult=engine.assignAssets(lockedPrimaryTrack,assets);
assert.equal(lockedPrimaryResult.primary,0,'track lock must protect all primary placeholders');
assert.equal(lockedPrimaryTrack.clips[0].asset,null);

const mixedNarration={
  name:'Mixed narration locks',format:'9:16',duration:20,
  clips:[
    {id:'voice-locked',track:6,name:'Voz manual reservada',start:0,duration:10,asset:null,locked:true},
    {id:'voice-open',track:6,name:'Voz automática',start:10,duration:10,asset:null}
  ]
};
const narrationCount=engine.assignNarration(mixedNarration,assets);
assert.equal(narrationCount,1,'an unlocked narration slot should remain automatable');
assert.equal(mixedNarration.clips[0].asset,null,'individually locked narration must remain untouched');
assert.equal(mixedNarration.clips[1].asset,'voice','unlocked narration should receive the local voice');

console.log('generator edit lock regression passed');
