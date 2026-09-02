import {createRequire} from 'module';
const require=createRequire(import.meta.url);
const {ProfitMenteAudioEnvelopeEngine}=require('./audio-envelope-engine.js');
const e=new ProfitMenteAudioEnvelopeEngine();
let x=e.normalize(10,2,3);if(Math.abs(x.fadeIn-2)>.001||Math.abs(x.fadeOut-3)>.001)throw new Error('normal fade failed');
x=e.normalize(1,1,1);if(Math.abs(x.fadeIn-.5)>.001||Math.abs(x.fadeOut-.5)>.001)throw new Error('overlap normalization failed');
const c={duration:4,fadeIn:1,fadeOut:1};
const near=(a,b)=>Math.abs(a-b)<.02;
if(!near(e.gainAt(c,0),0)||!near(e.gainAt(c,.5),.5)||!near(e.gainAt(c,2),1)||!near(e.gainAt(c,3.5),.5)||!near(e.gainAt(c,4),0))throw new Error('gain curve failed');

{
  const clip={track:5,duration:4,fadeIn:.2,fadeOut:.3};
  const project={trackState:{5:{locked:true}}};
  const before=structuredClone(clip);
  const r=e.apply(project,clip,1,1);
  if(r.ok!==false||r.reason!=='locked')throw new Error('modern lock must reject envelope edit');
  if(JSON.stringify(clip)!==JSON.stringify(before))throw new Error('modern locked envelope edit must be atomic');
}
{
  const clip={track:'5',duration:4,fadeIn:.2,fadeOut:.3};
  const project={trackState:{5:{locked:false}},trackStates:{5:{locked:true}}};
  const before=structuredClone(clip);
  const r=e.apply(project,clip,1,1);
  if(r.ok!==false||r.reason!=='locked')throw new Error('legacy lock must prevail');
  if(JSON.stringify(clip)!==JSON.stringify(before))throw new Error('legacy locked envelope edit must be atomic');
}
{
  const clip={track:5,duration:2,fadeIn:0,fadeOut:0};
  const project={trackState:{5:{locked:false}},trackStates:{5:{locked:false}}};
  const r=e.apply(project,clip,2,2);
  if(!r.ok||!near(clip.fadeIn,1)||!near(clip.fadeOut,1))throw new Error('unlocked envelope apply failed');
}
if(e.trackLocked({},5)!==false)throw new Error('missing track state must be unlocked');
if(e.trackLocked({trackStates:{'5':{locked:true}}},5)!==true)throw new Error('serialized legacy track key unsupported');
if(e.trackLocked({trackState:{5:{locked:true}}},'invalid')!==false)throw new Error('invalid track identifier must not lock accidentally');
console.log('Audio envelope engine OK');