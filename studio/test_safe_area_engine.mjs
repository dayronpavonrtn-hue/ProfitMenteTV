import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {ProfitMenteSafeAreaEngine}=require('./safe-area-engine.js');
const engine=new ProfitMenteSafeAreaEngine();
const tik=engine.rect('tiktok','9:16');
assert.equal(tik.x,0.05);
assert.equal(tik.right,0.82);
assert.equal(tik.bottom,0.81);
assert.ok(tik.width>0.7&&tik.height>0.7);
const landscape=engine.rect('tiktok','16:9');
assert.equal(landscape.x,0.05);
assert.equal(landscape.right,0.95);
const project={format:'9:16',clips:[
 {id:'safe',track:2,name:'Título seguro',textX:0,textY:-20},
 {id:'right',track:2,name:'Título tapado derecha',textX:45,textY:0},
 {id:'caption',track:3,name:'Caption',textX:90,textY:90}
]};
const result=engine.inspect(project,'tiktok');
assert.equal(result.ok,false);
assert.deepEqual(result.warnings.map(x=>x.clipId),['right']);
const generic=engine.inspect({format:'9:16',clips:[{id:'center',track:2,name:'Centro',textX:0,textY:0}]},'generic');
assert.equal(generic.ok,true);
console.log('Safe area engine QA OK');