import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

class Element{
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.style={};this.className='';this.textContent='';this.clientWidth=1000;}
  appendChild(child){this.children.push(child);return child;}
  append(...items){for(const item of items)this.appendChild(item);}
  replaceChildren(...items){this.children=[...items];}
}
const document={createElement:tag=>new Element(tag)};
const tracks=new Element('div');
const names=['Video','Overlays','Motion','Captions','SFX','Music','Voice'];
const project={duration:10,clips:[{id:'clip-1',track:'00',name:'<img src=x onerror="globalThis.pwned=1">',start:1,duration:3}]};
class Ops{}
const context={console,document,window:null,globalThis:null,ProfitMenteTimelineOperations:Ops,tracks,names,project,startDrag(){},editClip(){},addClip(){},drawTimeline(){}};
context.window=context;context.globalThis=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL('./timeline-track-alias-guard.js',import.meta.url),'utf8'),context);
assert.equal(typeof context.drawTimeline,'function');
assert.equal(context.drawTimeline(),true);
const lane=tracks.children[0].children[1];
assert.equal(lane.children.length,1);
assert.equal(lane.children[0].textContent,project.clips[0].name);
assert.equal(lane.children[0].children.length,0,'clip name must not create DOM children');
assert.equal(context.pwned,undefined,'imported clip name must remain inert');
assert.equal(lane.children[0].dataset.id,'clip-1');
assert.equal(lane.children[0].style.left,'10%');
assert.equal(lane.children[0].style.width,'30%');
console.log('Timeline safe render regression OK');
