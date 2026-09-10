'use strict';
const assert=require('assert');
const {ProfitMenteClipAttributesClipboardEngine:Engine}=require('./clip-attributes-clipboard-engine.js');

const project={
  trackState:{0:{locked:false},4:{locked:false}},
  clips:[
    {id:'visual-a',track:0,start:1,duration:6,asset:'asset-a',sourceOffset:2,fitMode:'contain',flipX:true,positionX:12,positionY:-8,scale:1.4,rotation:9,opacity:.7,motion:'push-in',keyframes:{start:{scale:1},end:{scale:1.5}},visualKeyframes:[{time:0,x:0,y:0,scale:1,rotation:0,opacity:1,easing:'linear'}],transition:'fade'},
    {id:'visual-b',track:1,start:20,duration:3,asset:'asset-b',sourceOffset:7,fitMode:'cover',positionX:0,scale:1,transition:'zoom'},
    {id:'audio-a',track:4,start:2,duration:5,asset:'audio-a',volume:.45,fadeInMs:300,fadeOutMs:500},
    {id:'audio-b',track:5,start:10,duration:4,asset:'audio-b',volume:1},
    {id:'caption-a',track:3,start:1,duration:2,style:'hook-pop',animation:'word-pulse'},
    {id:'caption-b',track:3,start:5,duration:2,style:'dynamic',animation:'none'}
  ]
};

const visualCopy=Engine.copy(project,'visual-a');
assert.equal(visualCopy.ok,true);
assert.equal(visualCopy.data.kind,'visual');
visualCopy.data.values.positionX=99;
assert.equal(project.clips[0].positionX,12,'clipboard must be isolated from source');
const visualCopy2=Engine.copy(project,'visual-a');
const targetBefore={id:project.clips[1].id,start:project.clips[1].start,duration:project.clips[1].duration,asset:project.clips[1].asset,sourceOffset:project.clips[1].sourceOffset,transition:project.clips[1].transition};
const visualPaste=Engine.paste(project,'visual-b',visualCopy2.data);
assert.equal(visualPaste.reason,'ok');
assert.ok(visualPaste.changed>0);
assert.equal(project.clips[1].fitMode,'contain');
assert.equal(project.clips[1].positionX,12);
assert.deepEqual(project.clips[1].visualKeyframes,project.clips[0].visualKeyframes);
assert.notStrictEqual(project.clips[1].visualKeyframes,project.clips[0].visualKeyframes,'keyframes must be deep-cloned');
for(const [key,value] of Object.entries(targetBefore))assert.deepEqual(project.clips[1][key],value,`paste must preserve ${key}`);

const incompatible=Engine.paste(project,'audio-b',visualCopy2.data);
assert.equal(incompatible.reason,'incompatible');
assert.equal(project.clips[3].volume,1);

const audioCopy=Engine.copy(project,'audio-a');
assert.equal(audioCopy.data.kind,'audio');
const audioPaste=Engine.paste(project,'audio-b',audioCopy.data);
assert.equal(audioPaste.reason,'ok');
assert.equal(project.clips[3].volume,.45);
assert.equal(project.clips[3].fadeInMs,300);
assert.equal(project.clips[3].fadeOutMs,500);
assert.equal(project.clips[3].start,10);
assert.equal(project.clips[3].asset,'audio-b');

const captionCopy=Engine.copy(project,'caption-a');
const captionPaste=Engine.paste(project,'caption-b',captionCopy.data);
assert.equal(captionPaste.reason,'ok');
assert.equal(project.clips[5].style,'hook-pop');
assert.equal(project.clips[5].animation,'word-pulse');

project.trackState[4].locked=true;
const locked=Engine.paste(project,'audio-b',audioCopy.data);
assert.equal(locked.reason,'locked');
assert.equal(locked.changed,0);
project.trackState[4].locked=false;
project.clips[3].locked=true;
assert.equal(Engine.paste(project,'audio-b',audioCopy.data).reason,'locked');
project.clips[3].locked=false;

assert.equal(Engine.paste(project,'visual-b',{version:99,kind:'visual',values:{scale:2}}).reason,'incompatible');
assert.equal(Engine.copy(project,'missing').ok,false);
assert.ok(!visualCopy2.data.values.transition,'dedicated transition attributes must not be duplicated here');
assert.ok(!visualCopy2.data.values.start&&!visualCopy2.data.values.duration&&!visualCopy2.data.values.asset&&!visualCopy2.data.values.sourceOffset,'identity/timing/source fields must not enter clipboard');
console.log('ProfitMente Studio clip attributes clipboard regression: OK');
