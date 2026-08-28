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
const empty={duration:5,clips:[]};const noAssets=Engine.fill(empty,[]);assert.equal(noAssets.created.length,0);assert.equal(noAssets.unresolved[0].reason,'no-visual-assets');
console.log('visual gap engine ok');
