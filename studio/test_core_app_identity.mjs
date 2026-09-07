import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.dirname(fileURLToPath(import.meta.url));
const src=fs.readFileSync(path.join(root,'app.js'),'utf8');

for(const token of [
  'function scalarText(v)',
  'function numberValue(v)',
  'function clipWindow(c)',
  'function idKey(v)',
  'function sameId(a,b)',
  'function trackId(v)',
  'project.clips.filter(c=>trackId(c.track)===i)',
  'project.clips.find(x=>sameId(x.id,el.dataset.id))',
  'assets.find(x=>sameId(x.id,id))',
  'idKey(c.asset)!==null',
  'assets.find(x=>sameId(x.id,c.asset))',
  'trackId(c.track)===3',
  'rawSpeed=numberValue(c.speed)',
  'rawOffset=numberValue(c.sourceOffset)'
]) if(!src.includes(token)) throw new Error('Core app identity guard missing: '+token);

for(const bad of [
  'project.clips.filter(c=>c.track===i)',
  'x.id===el.dataset.id',
  'assets.find(x=>x.id===id)',
  '&&c.asset&&',
  'x.id===c.asset',
  'c.track===3&&',
  'const s=String(v).trim()',
  'Number(c.speed)||1',
  'Number(c.sourceOffset)||0'
]) if(src.includes(bad)) throw new Error('Legacy coercive identity/numeric pattern returned: '+bad);

const scalarText=v=>{
  if(typeof v==='number')return Number.isFinite(v)?String(v):null;
  if(typeof v!=='string')return null;
  const s=v.trim();
  return s||null;
};
const numberValue=v=>{const s=scalarText(v);if(s===null)return null;const n=Number(s);return Number.isFinite(n)?n:null};
const idKey=v=>{
  const s=scalarText(v);
  if(s===null)return null;
  if(/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(s)){
    const n=Number(s);
    if(Number.isFinite(n))return `n:${Object.is(n,-0)?0:n}`;
  }
  return `s:${s}`;
};
const sameId=(a,b)=>{const x=idKey(a),y=idKey(b);return x!==null&&x===y};
const trackId=v=>{const n=numberValue(v);return Number.isInteger(n)&&n>=0&&n<7?n:null};

for(const [a,b] of [[0,'0'],[7,'07'],[' 7 ','7.0'],['clip-a',' clip-a '],[-0,'-0']]) if(!sameId(a,b)) throw new Error(`Equivalent IDs differ: ${a} / ${b}`);
for(const v of [null,undefined,'','   ',false,true,{},[],[0],Symbol('0'),{toString(){return '0'}},{valueOf(){return 0}},NaN,Infinity]) if(idKey(v)!==null) throw new Error('Non-scalar/empty media identity became valid: '+String(v));
for(const [v,want] of [[0,0],[-0,0],['-0',0],['00',0],['1.0',1],['04',4],['+06.0',6],['6.0',6]]) if(trackId(v)!==want) throw new Error(`Track alias failed: ${v}`);
for(const v of [null,undefined,'',false,true,'1.5',6.5,7,'7',{},[],[0],Symbol('0'),{toString(){return '0'}},{valueOf(){return 0}},NaN,Infinity]) if(trackId(v)!==null) throw new Error(`Invalid track accepted: ${String(v)}`);
for(const [v,want] of [[0,0],[-0,0],['0',0],['1.25',1.25],[' 2 ',2]]) if(!Object.is(numberValue(v),want)) throw new Error(`Numeric scalar alias failed: ${String(v)}`);
for(const v of [null,undefined,'',false,true,{},[],[1],Symbol('1'),NaN,Infinity,{toString(){return '1'}}]) if(numberValue(v)!==null) throw new Error('Invalid numeric scalar accepted: '+String(v));

console.log('Core app identity OK: scalar IDs/tracks and preview numerics reject object/boolean coercion while preserving legacy numeric aliases');
