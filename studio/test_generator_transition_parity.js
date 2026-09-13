const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

class ProfitMenteGeneratorEngine{
  canonicalTrack(value){
    if(value==null||typeof value==='boolean')return null;
    const n=Number(String(value).trim());
    return Number.isInteger(n)&&n>=0&&n<=6?String(n):null;
  }
  clipLocked(project,clip){return !!clip?.locked||this.trackLocked(project,clip?.track)}
  trackLocked(){return false}
}

const context={
  console,
  ProfitMenteGeneratorEngine,
  window:{},
  document:{querySelector:()=>null},
  assets:[]
};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(__dirname+'/generator-integration.js','utf8'),context,{filename:'generator-integration.js'});

assert.strictEqual(typeof context.window.ProfitMenteApplyGeneratedProject,'function');
const target={clips:[]};
const result={title:'Parity',script:'',seed:1,clips:[
  {id:'a',track:0,start:0,duration:1,transition:'cut'},
  {id:'b',track:'0',start:1,duration:1,transition:'zoom'},
  {id:'c',track:0,start:2,duration:1,transition:'fade'},
  {id:'d',track:0,start:3,duration:1,transition:'slide'},
  {id:'e',track:0,start:4,duration:1,transition:'none'},
  {id:'f',track:0,start:5,duration:1,transition:true},
  {id:'g',track:0,start:6,duration:1,transition:' Fade '},
  {id:'caption',track:3,start:0,duration:1,transition:'zoom'}
]};
const source=JSON.parse(JSON.stringify(result));
context.window.ProfitMenteApplyGeneratedProject(target,result,10);

const byId=Object.fromEntries(target.clips.map(c=>[c.id,c]));
assert.strictEqual(byId.a.transition,'none');
assert.strictEqual(byId.b.transition,'none');
assert.strictEqual(byId.c.transition,'fade');
assert.strictEqual(byId.d.transition,'slide');
assert.strictEqual(byId.e.transition,'none');
assert.strictEqual(byId.f.transition,'none');
assert.strictEqual(byId.g.transition,'fade');
assert.strictEqual(byId.caption.transition,'zoom','non-video metadata must remain untouched');
assert.deepStrictEqual(result,source,'generated source must not be mutated');
console.log('ProfitMente generator transition parity regression: OK');
