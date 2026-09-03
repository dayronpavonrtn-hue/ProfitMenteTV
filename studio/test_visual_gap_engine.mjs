import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const Engine=require('./visual-gap-engine.js');

const project={duration:10,clips:[{id:'a',track:0,asset:'v1',start:0,duration:2},{id:'b',track:1,asset:'v2',start:4,duration:2}]};
assert.deepEqual(Engine.gaps(project),[[2,4],[6,10]]);
const assets=[{id:'img',type:'image',name:'Still'},{id:'vid',type:'video',name:'Video',duration:1.5}];
const result=Engine.fill(project,assets);assert.equal(result.unresolved.length,0);assert.ok(result.created.length>=2);assert.equal(Engine.gaps(project).length,0);assert.ok(result.created.every(c=>c.autoGapFill&&c.fitMode==='cover'&&c.start>=2&&c.start+c.duration<=10.001));
const original=project.clips.filter(c=>['a','b'].includes(c.id));assert.equal(original[0].start,0);assert.equal(original[1].start,4);
const used=new Set(result.created.map(c=>c.asset));assert.ok(used.has('img'));assert.ok(used.has('vid'));

const hidden={duration:5,trackState:{0:{hidden:true},1:{hidden:true}},clips:[]};const blocked=Engine.fill(hidden,assets);assert.equal(blocked.created.length,0);assert.equal(blocked.unresolved[0].reason,'visual-tracks-hidden');
const legacyHidden={duration:5,trackStates:{'0':{hidden:true},'1':{hidden:true}},clips:[]};const legacyHiddenResult=Engine.fill(legacyHidden,assets);assert.equal(legacyHiddenResult.created.length,0);assert.equal(legacyHiddenResult.unresolved[0].reason,'visual-tracks-hidden');

const locked={duration:5,trackState:{0:{locked:true},1:{locked:true}},clips:[]};const lockedBefore=JSON.stringify(locked);const lockedResult=Engine.fill(locked,assets);assert.equal(lockedResult.created.length,0);assert.equal(lockedResult.unresolved[0].reason,'visual-tracks-locked');assert.equal(JSON.stringify(locked),lockedBefore);
const legacyLocked={duration:5,trackStates:{'0':{locked:true},'1':{locked:true}},clips:[]};const legacyLockedResult=Engine.fill(legacyLocked,assets);assert.equal(legacyLockedResult.created.length,0);assert.equal(legacyLockedResult.unresolved[0].reason,'visual-tracks-locked');
const conflictingLock={duration:5,trackState:{0:{locked:false},1:{hidden:true}},trackStates:{'0':{locked:true}},clips:[]};const conflictResult=Engine.fill(conflictingLock,assets);assert.equal(conflictResult.created.length,0);assert.equal(conflictResult.unresolved[0].reason,'visual-tracks-locked');

const fallbackTrack={duration:5,trackState:{0:{locked:true},1:{locked:false}},clips:[{id:'base',track:0,asset:'v1',start:0,duration:2}]};const fallbackResult=Engine.fill(fallbackTrack,assets);assert.ok(fallbackResult.created.length>0);assert.ok(fallbackResult.created.every(c=>c.track===1));assert.equal(fallbackTrack.clips.find(c=>c.id==='base').start,0);
const legacyFallback={duration:3,trackStates:{'0':{locked:true}},clips:[]};const legacyFallbackResult=Engine.fill(legacyFallback,assets);assert.ok(legacyFallbackResult.created.length>0);assert.ok(legacyFallbackResult.created.every(c=>c.track===1));

const empty={duration:5,clips:[]};const noAssets=Engine.fill(empty,[]);assert.equal(noAssets.created.length,0);assert.equal(noAssets.unresolved[0].reason,'no-visual-assets');
console.log('visual gap engine ok');
