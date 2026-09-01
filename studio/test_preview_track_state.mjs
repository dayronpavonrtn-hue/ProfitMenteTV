import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const NativeURL=globalThis.URL;
const previewPath=new NativeURL('./preview-engine.js',import.meta.url);
const captionPath=new NativeURL('./caption-preview.js',import.meta.url);
const controlsPath=new NativeURL('./track-controls.js',import.meta.url);

globalThis.window=globalThis;
globalThis.assets=[];
globalThis.project={
  mode:'Manual',duration:8,
  trackState:{0:{hidden:true},1:{hidden:false},3:{hidden:false}},
  trackStates:{1:{hidden:true},3:{hidden:true},4:{hidden:true}},
  clips:[
    {id:'video-hidden',track:0,name:'Hidden video',start:0,duration:5,asset:'missing'},
    {id:'overlay-legacy-hidden',track:1,name:'Legacy hidden overlay',start:0,duration:5,asset:'missing'},
    {id:'caption-hidden',track:3,name:'NO DEBE DIBUJARSE',start:0,duration:5,wordTimings:[{word:'NO',start:0,end:1,duration:1}]}
  ]
};
const originalClips=project.clips;
globalThis.canvas={width:540,height:960};
globalThis.ctx={
  clearRect(){},fillRect(){},fillText(){},strokeText(){},save(){},restore(){},translate(){},rotate(){},scale(){},drawImage(){},
  measureText(text){return {width:String(text).length*10}},
  set fillStyle(v){},set font(v){},set textAlign(v){},set textBaseline(v){},set lineWidth(v){},set strokeStyle(v){},set globalAlpha(v){},set filter(v){}
};
const placeholder={hidden:false};
globalThis.$=selector=>selector==='#placeholder'?placeholder:null;
globalThis.Image=class {};
globalThis.URL={createObjectURL(){return 'blob:test'},revokeObjectURL(){}};

vm.runInThisContext(fs.readFileSync(previewPath,'utf8'),{filename:'preview-engine.js'});
assert.equal(window.ProfitMentePreviewEngine.isTrackHidden(0),true,'current trackState hidden flag must hide preview track');
assert.equal(window.ProfitMentePreviewEngine.isTrackHidden(1),true,'legacy trackStates hidden flag must remain authoritative when current state says visible');
assert.equal(window.ProfitMentePreviewEngine.isTrackHidden(2),false,'track without hidden state must remain visible');
assert.equal(window.ProfitMentePreviewEngine.isTrackHidden(4),true,'legacy-only hidden track must be recognized');
await globalThis.renderAt(0);
assert.strictEqual(project.clips,originalClips,'preview must never replace project.clips while rendering');
assert.equal(placeholder.hidden,false,'legacy-hidden visual tracks must not create a false active preview');

const base={start:1,duration:2,transitionDuration:.4,opacity:1};
const fadeMid=window.ProfitMentePreviewEngine.transformFor({...base,transition:'fade'},1.2);
const slideMid=window.ProfitMentePreviewEngine.transformFor({...base,transition:'slide'},1.2);
const zoomMid=window.ProfitMentePreviewEngine.transformFor({...base,transition:'zoom'},1.2);
assert.ok(Math.abs(fadeMid.alpha-.5)<.001,'fade preview must match MP4 transition opacity');
assert.ok(Math.abs(slideMid.alpha-.5)<.001,'slide preview must include the same entry fade as MP4');
assert.ok(Math.abs(zoomMid.alpha-.5)<.001,'zoom preview must include the same entry fade as MP4');
assert.ok(slideMid.x>0,'slide preview must still translate horizontally during entry');
assert.ok(zoomMid.scale>1,'zoom preview must still scale during entry');

vm.runInThisContext(fs.readFileSync(captionPath,'utf8'),{filename:'caption-preview.js'});
assert.equal(window.ProfitMenteCaptionPreview.captionsHidden(),true,'legacy caption hidden state must suppress word preview even when current state says visible');
project.trackStates[3].hidden=false;
assert.equal(window.ProfitMenteCaptionPreview.captionsHidden(),false,'caption preview must become visible once both state maps are visible');
project.trackState[3].hidden=true;
assert.equal(window.ProfitMenteCaptionPreview.captionsHidden(),true,'current caption hidden state must still suppress preview');

const controls=fs.readFileSync(controlsPath,'utf8');
assert.ok(!controls.includes('project.clips=all.filter'),'track controls must not filter by replacing project.clips during async preview');
assert.ok(!controls.includes('project.clips=all'),'track controls must not restore a temporarily replaced clip array');

console.log('Preview track-state and transition parity QA OK');
