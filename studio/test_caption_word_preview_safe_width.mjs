import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('./caption-preview.js',import.meta.url),'utf8');
const calls=[];
const ctx={
  font:'',textAlign:'',textBaseline:'',fillStyle:'',strokeStyle:'',lineWidth:0,
  save(){},restore(){},
  measureText(text){const size=Number((this.font.match(/(\d+(?:\.\d+)?)px/)||[])[1]||46);return {width:String(text).length*size*.62};},
  fillRect(x,y,w,h){calls.push({kind:'rect',x,y,w,h});},
  strokeText(text,x,y){calls.push({kind:'stroke',text,x,y,font:this.font});},
  fillText(text,x,y){calls.push({kind:'fill',text,x,y,font:this.font});}
};
const canvas={width:1080,height:1920};
const project={trackState:{},clips:[{track:3,start:0,duration:2,wordTimings:[{word:'SUPERCALIFRAGILISTICEXPIALIDOCIOUSFINANCIERO',start:0,end:2,duration:2}]}]};
const sandbox={ctx,canvas,project,renderAt:async()=>{},window:{},Math,console};
vm.createContext(sandbox);
vm.runInContext(source,sandbox);
await sandbox.renderAt(1);

const rect=calls.find(x=>x.kind==='rect');
const fill=calls.find(x=>x.kind==='fill');
assert.ok(rect,'caption background should render');
assert.ok(fill,'caption text should render');
assert.ok(rect.w<=canvas.width*.88+.001,`caption box overflowed safe width: ${rect.w}`);
const size=Number((fill.font.match(/(\d+(?:\.\d+)?)px/)||[])[1]);
assert.ok(size<46,'long word should shrink below base font size');
assert.ok(size>=22,'word should respect readable minimum size');

const helper=sandbox.window.ProfitMenteCaptionPreview.fitWordFont;
ctx.font='';
const shortSize=helper(ctx,'DINERO',46,canvas.width*.88-48,22);
assert.equal(shortSize,46,'short word should keep base size');
console.log('caption word preview safe width regression: ok');
