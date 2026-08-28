import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

globalThis.window=globalThis;
globalThis.assets=[];
globalThis.project={
  mode:'Manual',duration:8,
  trackState:{0:{hidden:true},1:{hidden:true},3:{hidden:true}},
  clips:[
    {id:'video-hidden',track:0,name:'Hidden video',start:0,duration:5,asset:'missing'},
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

vm.runInThisContext(fs.readFileSync(new URL('./preview-engine.js',import.meta.url),'utf8'),{filename:'preview-engine.js'});
assert.equal(window.ProfitMentePreviewEngine.isTrackHidden(0),true);
assert.equal(window.ProfitMentePreviewEngine.isTrackHidden(2),false);
await globalThis.renderAt(0);
assert.strictEqual(project.clips,originalClips,'preview must never replace project.clips while rendering');

vm.runInThisContext(fs.readFileSync(new URL('./caption-preview.js',import.meta.url),'utf8'),{filename:'caption-preview.js'});
assert.equal(window.ProfitMenteCaptionPreview.captionsHidden(),true);

const controls=fs.readFileSync(new URL('./track-controls.js',import.meta.url),'utf8');
assert.ok(!controls.includes('project.clips=all.filter'),'track controls must not filter by replacing project.clips during async preview');
assert.ok(!controls.includes('project.clips=all'),'track controls must not restore a temporarily replaced clip array');

console.log('Preview track-state QA OK');
