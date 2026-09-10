import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const {ProfitMenteProjectImportEngine}=require('./project-import-engine.js');

const engine=new ProfitMenteProjectImportEngine();
const base={name:'Import QA',mode:'Manual',duration:10,format:'9:16',fps:30,clips:[]};

const valid=engine.normalize({...base,clips:[{id:'v1',track:0,start:8,duration:2}]});
assert.equal(valid.clips[0].start,8);
assert.equal(valid.clips[0].duration,2);

assert.throws(
  ()=>engine.normalize({...base,clips:[{id:'too-long',track:0,start:9,duration:2}]}),
  /Clip excede la duración del proyecto/,
  'an imported clip must not extend past the project duration'
);

assert.throws(
  ()=>engine.normalize({...base,clips:[{id:'past-end',track:4,start:10,duration:.1}]}),
  /Clip excede la duración del proyecto/,
  'a clip starting at the project end with positive duration must be rejected'
);

assert.throws(
  ()=>engine.normalize({...base,clips:[{id:'bool-track',track:true,start:0,duration:1}]}),
  /Pista de clip inválid[oa]/,
  'boolean tracks must not be coerced into real timeline tracks'
);

assert.throws(
  ()=>engine.normalize({...base,clips:[{id:'bool-start',track:0,start:true,duration:1}]}),
  /Tiempo de clip inválido/,
  'boolean time values must not be coerced into timeline positions'
);

const legacy=engine.normalize({...base,clips:[{id:'legacy',track:'01',start:'2',duration:'3'}]});
assert.equal(legacy.clips[0].track,1);
assert.equal(legacy.clips[0].start,2);
assert.equal(legacy.clips[0].duration,3);

const animated=engine.normalize({...base,clips:[{
  id:'animated',track:0,start:1,duration:4,type:'video',
  visualAdjustments:{brightness:'350',contrast:80,saturation:-10,grayscale:'25'},
  visualKeyframes:[
    {time:4,x:250,y:-250,scale:99,rotation:7200,opacity:2,easing:'EASE-IN'},
    {time:1,x:10,y:20,scale:1.2,rotation:5,opacity:.8,easing:'hold'},
    {time:1.0005,x:11,y:21,scale:1.3,rotation:6,opacity:.7,easing:'not-real'}
  ]
}]});
assert.deepEqual(animated.clips[0].visualAdjustments,{brightness:300,contrast:80,saturation:0,grayscale:25});
assert.equal(animated.clips[0].visualKeyframes.length,2,'near-duplicate imported keyframes should be deduplicated');
assert.deepEqual(animated.clips[0].visualKeyframes[0],{time:1,x:11,y:21,scale:1.3,rotation:6,opacity:.7,easing:'linear'});
assert.deepEqual(animated.clips[0].visualKeyframes[1],{time:4,x:200,y:-200,scale:8,rotation:3600,opacity:1,easing:'ease-in'});

assert.throws(
  ()=>engine.normalize({...base,clips:[{id:'bad-kf',track:0,start:0,duration:2,visualKeyframes:[{time:2.01}]}]}),
  /Tiempo de keyframe fuera del clip/,
  'imported keyframes cannot extend past their clip'
);
assert.throws(
  ()=>engine.normalize({...base,clips:[{id:'bad-adjust',track:0,start:0,duration:2,visualAdjustments:'bright'}]}),
  /Ajustes visuales inválidos/,
  'visual adjustment structures must be objects'
);
assert.throws(
  ()=>engine.normalize({...base,clips:[{id:'bad-frame',track:0,start:0,duration:2,visualKeyframes:[null]}]}),
  /Keyframe visual inválido/,
  'malformed keyframe records must be rejected'
);

console.log('ProfitMente Studio project import bounds QA passed');
