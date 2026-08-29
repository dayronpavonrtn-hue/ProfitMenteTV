import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {ProfitMenteSafeAreaEngine}=require('./safe-area-engine.js');
const engine=new ProfitMenteSafeAreaEngine();
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
const tik=engine.rect('tiktok','9:16');
close(tik.x,0.05);
close(tik.right,0.82);
close(tik.bottom,0.81);
assert.ok(tik.width>0.7&&tik.height>0.7);
const landscape=engine.rect('tiktok','16:9');
close(landscape.x,0.05);
close(landscape.right,0.95);
const project={format:'9:16',clips:[
 {id:'safe',track:2,name:'Título seguro',textX:0,textY:-20},
 {id:'right',track:2,name:'Título tapado derecha',textX:45,textY:0},
 {id:'bottom',track:2,name:'Título tapado abajo',textX:0,textY:45},
 {id:'caption',track:3,name:'Caption',textX:90,textY:90}
]};
const result=engine.inspect(project,'tiktok');
assert.equal(result.ok,false);
assert.deepEqual(result.warnings.map(x=>x.clipId),['right','bottom']);
const repair=engine.clampProject(project,'tiktok');
assert.equal(repair.changed,true);
assert.equal(repair.count,2);
assert.equal(repair.inspection.ok,true);
assert.ok(project.clips.find(x=>x.id==='right').textX<=32);
assert.ok(project.clips.find(x=>x.id==='bottom').textY<=31);
assert.equal(project.clips.find(x=>x.id==='safe').textX,0);
assert.equal(project.clips.find(x=>x.id==='caption').textX,90);
const second=engine.clampProject(project,'tiktok');
assert.equal(second.changed,false);
assert.equal(second.count,0);
const generic=engine.inspect({format:'9:16',clips:[{id:'center',track:2,name:'Centro',textX:0,textY:0}]},'generic');
assert.equal(generic.ok,true);
console.log('Safe area engine QA OK');