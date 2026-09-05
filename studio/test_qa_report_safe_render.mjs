import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

class Element {
  constructor(tag='div'){
    this.tagName=tag.toUpperCase();
    this.children=[];
    this.dataset={};
    this.hidden=true;
    this.textContent='';
    this.onclick=null;
  }
  appendChild(child){this.children.push(child);return child}
  replaceChildren(...children){this.children=[...children]}
}

const qaBtn=new Element('button');
const qaReport=new Element('div');
const bySelector={'#qaBtn':qaBtn,'#qaReport':qaReport};

globalThis.window=globalThis;
globalThis.document={
  querySelector(selector){return bySelector[selector]||null},
  createElement(tag){return new Element(tag)}
};
globalThis.project={name:'Importado',clips:[{id:'x',name:'<img src=x onerror=alert(1)>',track:0}]};
globalThis.assets=[];
let saved=0,status='';
globalThis.save=()=>{saved++};
globalThis.setStatus=value=>{status=value};
globalThis.qa={
  inspect(){
    return {
      ok:false,
      score:75,
      metrics:{visualCoverage:80,captionCoverage:60,clips:1,assets:0},
      issues:['Duración inválida: <img src=x onerror=alert(1)>'],
      warnings:['Nombre extraño: <b>clip</b>']
    };
  }
};

const source=fs.readFileSync(new URL('./qa-report-integration.js',import.meta.url),'utf8');
assert.equal(source.includes('innerHTML'),false,'QA report renderer must never inject report data through innerHTML');
vm.runInThisContext(source,{filename:'qa-report-integration.js'});

assert.equal(typeof ProfitMenteQAReport?.renderReport,'function','safe QA report API must be exposed');
assert.equal(qaBtn.dataset.safeQaReport,'1','QA button must be rewired to the safe renderer');
assert.equal(typeof qaBtn.onclick,'function');
qaBtn.onclick();

assert.equal(saved,1,'QA must still save current project before inspection');
assert.equal(status,'Corrige los errores marcados antes del render final');
assert.equal(qaReport.hidden,false);
assert.equal(qaReport.children[0].textContent,'QA 75/100 ✕');
assert.match(qaReport.children[1].textContent,/Visual 80%/);
assert.equal(qaReport.children[2].textContent,'❌ Duración inválida: <img src=x onerror=alert(1)>','malicious-looking imported names must remain inert text');
assert.equal(qaReport.children[3].textContent,'⚠️ Nombre extraño: <b>clip</b>','warning markup must remain inert text');
assert.equal(qaReport.children[2].dataset.qaKind,'issue');
assert.equal(qaReport.children[3].dataset.qaKind,'warning');

const normalized=ProfitMenteQAReport.normalizedReport({score:'500',ok:true,metrics:{clips:'2'},issues:null,warnings:['x']});
assert.equal(normalized.score,100,'score must be clamped for stable display');
assert.equal(normalized.metrics.clips,2);
assert.deepEqual(normalized.issues,[]);
assert.deepEqual(ProfitMenteQAReport.reportLines(normalized),[{kind:'warning',text:'⚠️ x'}]);

console.log('safe QA report rendering regression passed');
