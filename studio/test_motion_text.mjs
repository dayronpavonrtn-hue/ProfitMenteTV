import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);const {ProfitMenteMotionTextEngine}=require('./motion-text-engine.js');
const e=new ProfitMenteMotionTextEngine();
let c=e.normalize({name:'Hola',textAnimation:'bad',textX:99,fontSize:5,textColor:'red',boxOpacity:4});
assert.equal(c.track,2);assert.equal(c.textAnimation,'pop');assert.equal(c.textX,45);assert.equal(c.fontSize,16);assert.equal(c.textColor,'#FFE66D');assert.equal(c.boxOpacity,1);
let f=e.frame({...c,start:1,duration:2,textAnimation:'slide-up'},1.05);assert.ok(f.alpha>0&&f.alpha<1);assert.ok(f.dy>0);
f=e.frame({...c,start:1,duration:2,textAnimation:'pop'},1.5);assert.ok(f.scale>.99&&f.scale<=1);assert.equal(f.alpha,1);
console.log('Motion text engine QA OK');