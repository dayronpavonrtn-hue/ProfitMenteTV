import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const src=fs.readFileSync(new URL('./export-preflight.js',import.meta.url),'utf8');const ctx={globalThis:{},window:undefined,document:undefined,module:{exports:{}}};vm.createContext(ctx);vm.runInContext(src,ctx);const P=ctx.globalThis.ProfitMenteExportPreflight;assert.ok(P);
let r=P.summarize({ok:true,score:100,issues:[],warnings:[],metrics:{clips:3}},{ok:true,render_ready:true});assert.equal(r.state,'ready');assert.equal(r.canRender,true);assert.equal(r.canPackage,true);
r=P.summarize({ok:true,score:93,issues:[],warnings:['baja resolución'],metrics:{}},{ok:true,render_ready:true});assert.equal(r.state,'warning');assert.equal(r.canRender,true);
r=P.summarize({ok:true,score:100,issues:[],warnings:[],metrics:{}},{ok:false,render_ready:false});assert.equal(r.state,'package');assert.equal(r.canPackage,true);assert.equal(r.canRender,false);
r=P.summarize({ok:false,score:50,issues:['medio faltante'],warnings:[],metrics:{}},{ok:true,render_ready:true});assert.equal(r.state,'blocked');assert.equal(r.canPackage,false);assert.equal(r.canRender,false);
console.log('Export preflight QA OK');
