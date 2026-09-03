import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';

globalThis.window=globalThis;
if(!globalThis.crypto)Object.defineProperty(globalThis,'crypto',{value:webcrypto,configurable:true});
globalThis.document={querySelector:()=>null};
vm.runInThisContext(fs.readFileSync(new URL('./edit-lock-guard.js',import.meta.url),'utf8'));
vm.runInThisContext(fs.readFileSync(new URL('./generator-engine.js',import.meta.url),'utf8'));
vm.runInThisContext(fs.readFileSync(new URL('./generator-integration.js',import.meta.url),'utf8'));

const project={
  name:'Manual mix',format:'9:16',mode:'Manual',duration:45,
  trackState:{3:{locked:true}},
  trackStates:{6:{locked:true}},
  clips:[
    {id:'manual-scene',track:0,name:'Manual scene protected',start:48,duration:8,asset:null,locked:true},
    {id:'manual-overlap',track:0,name:'Manual scene inside generated range',start:8,duration:4,asset:'manual-media',locked:true},
    {id:'old-unlocked',track:0,name:'Old auto scene',start:8,duration:4,asset:null},
    {id:'manual-caption',track:3,name:'Caption locked by track',start:2,duration:3,asset:null},
    {id:'manual-voice',track:6,name:'Voice locked by legacy track',start:0,duration:45,asset:'voice-manual'}
  ]
};

const engine=new ProfitMenteGeneratorEngine();
const generated=engine.generate('automatización de inversiones',30);
const summary=ProfitMenteApplyGeneratedProject(project,generated,30);

assert.equal(summary.preserved,4,'locked clips plus clips on current/legacy locked tracks must survive');
assert.equal(summary.blockedTracks,2,'generated captions and narration must be blocked on protected tracks');
assert.equal(summary.blockedOverlaps,1,'a generated clip overlapping an individually locked clip on the same track must be suppressed');
assert.equal(project.clips.some(c=>c.id==='manual-scene'),true,'individually locked manual scene must survive regeneration');
assert.equal(project.clips.some(c=>c.id==='manual-overlap'),true,'locked manual scene inside the regenerated time range must survive');
assert.equal(project.clips.some(c=>c.id==='manual-caption'),true,'track-locked manual caption must survive regeneration');
assert.equal(project.clips.some(c=>c.id==='manual-voice'),true,'legacy track-locked narration must survive regeneration');
assert.equal(project.clips.some(c=>c.id==='old-unlocked'),false,'unlocked prior generated/editable content should be replaced');
assert.equal(project.clips.filter(c=>Number(c.track)===3).length,1,'new generated captions must not enter locked caption track');
assert.equal(project.clips.filter(c=>Number(c.track)===6).length,1,'new generated narration must not enter legacy-locked narration track');
assert.ok(project.clips.some(c=>Number(c.track)===0&&c.id!=='manual-scene'&&c.id!=='manual-overlap'),'new editable primary scenes should still be generated outside protected intervals');
assert.ok(project.clips.some(c=>Number(c.track)===2),'unlocked title track should still receive generated content');
assert.equal(project.duration,56,'project duration must expand so a protected manual clip is never truncated');
assert.equal(project.mode,'Automático');
assert.equal(project.name,'automatización de inversiones');
assert.equal(project.generatorSeed,generated.seed);

const protectedStart=8,protectedEnd=12;
const conflictingGenerated=project.clips.filter(c=>Number(c.track)===0&&!['manual-scene','manual-overlap'].includes(c.id)).filter(c=>Number(c.start)<protectedEnd&&Number(c.start)+Number(c.duration)>protectedStart);
assert.equal(conflictingGenerated.length,0,'no regenerated primary clip may cover a locked manual interval on the same track');

const beforeLockedScene=project.clips.find(c=>c.id==='manual-scene');
const assigned=engine.assignAssets(project,[{id:'img',name:'inversiones vertical.jpg',type:'image',width:1080,height:1920}]);
assert.equal(beforeLockedScene.asset,null,'media auto-fill after regeneration must still respect the preserved clip lock');
assert.ok(assigned.primary>0,'new generated primary scenes should remain eligible for local media auto-fill');

console.log('generator regeneration lock preservation regression passed');