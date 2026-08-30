import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
const require=createRequire(import.meta.url);

globalThis.window=globalThis;
globalThis.crypto={randomUUID:()=> 'test-id'};
globalThis.assets=[];
globalThis.project={assets:[],clips:[]};
globalThis.drawLibrary=()=>{};
globalThis.putAsset=async()=>{};
globalThis.persist=()=>{};
globalThis.setStatus=()=>{};
const library={querySelectorAll:()=>[]};
globalThis.document={querySelector:s=>s==='#mediaLibrary'?library:null,createElement:()=>({id:'',textContent:'',className:'',classList:{toggle(){},add(){}},dataset:{}}),head:{appendChild(){}}};

const {ProfitMenteMediaPriorityEngine:Priority}=require('./media-priority-engine.js');
require('./generator-engine.js');
require('./media-priority-integration.js');

const plain={id:'a',name:'mercado vertical.mp4',type:'video',width:1080,height:1920,duration:12};
const preferred={...plain,id:'b',preferred:true};
assert.equal(Priority.isPreferred(plain),false);
assert.equal(Priority.toggle(plain),true);
assert.equal(Priority.bonus(plain),5);
assert.equal(Priority.preferred([plain,{id:'c'}]).length,1);

const generator=new globalThis.ProfitMenteGeneratorEngine();
const base={...preferred,preferred:false};
assert.equal(generator.scoreAsset(preferred,['mercado'],'9:16',5)-generator.scoreAsset(base,['mercado'],'9:16',5),5,'preferred media should receive a +5 automatic selection bonus');

const bootstrap=fs.readFileSync(new URL('./feature-bootstrap.js',import.meta.url),'utf8');
assert.ok(bootstrap.indexOf("media-priority-engine.js")<bootstrap.indexOf("media-priority-integration.js"));
assert.ok(bootstrap.includes("'ProfitMenteMediaPriority'"));
console.log('media priority regression: ok');
