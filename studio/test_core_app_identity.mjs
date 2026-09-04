import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.dirname(fileURLToPath(import.meta.url));
const src=fs.readFileSync(path.join(root,'app.js'),'utf8');

for(const token of [
  'function idKey(v)',
  'function sameId(a,b)',
  'function trackId(v)',
  'project.clips.filter(c=>trackId(c.track)===i)',
  'project.clips.find(x=>sameId(x.id,el.dataset.id))',
  'assets.find(x=>sameId(x.id,id))',
  'idKey(c.asset)!==null',
  'assets.find(x=>sameId(x.id,c.asset))',
  'trackId(c.track)===3'
]) if(!src.includes(token)) throw new Error('Core app identity guard missing: '+token);

for(const bad of [
  'project.clips.filter(c=>c.track===i)',
  'x.id===el.dataset.id',
  'assets.find(x=>x.id===id)',
  '&&c.asset&&',
  'x.id===c.asset',
  'c.track===3&&'
]) if(src.includes(bad)) throw new Error('Legacy strict/truthy identity pattern returned: '+bad);

const idKey=v=>{
  if(v===null||v===undefined)return null;
  const s=String(v).trim();
  if(!s)return null;
  if(/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(s)){
    const n=Number(s);
    if(Number.isFinite(n))return `n:${n}`;
  }
  return `s:${s}`;
};
const sameId=(a,b)=>{const x=idKey(a),y=idKey(b);return x!==null&&x===y};
const trackId=v=>{
  if(v===null||v===undefined||typeof v==='boolean')return null;
  const s=String(v).trim();
  if(!s)return null;
  const n=Number(s);
  return Number.isInteger(n)&&n>=0&&n<7?n:null;
};

for(const [a,b] of [[0,'0'],[7,'07'],[' 7 ','7.0'],['clip-a',' clip-a ']]) if(!sameId(a,b)) throw new Error(`Equivalent IDs differ: ${a} / ${b}`);
for(const v of [null,undefined,'','   ']) if(idKey(v)!==null) throw new Error('Empty media identity became valid');
for(const [v,want] of [[0,0],['00',0],['1.0',1],['04',4],['6.0',6]]) if(trackId(v)!==want) throw new Error(`Track alias failed: ${v}`);
for(const v of [null,undefined,'',false,true,'1.5',6.5,7,'7']) if(trackId(v)!==null) throw new Error(`Invalid track accepted: ${String(v)}`);

console.log('Core app identity OK: asset 0, numeric/string IDs and legacy track aliases are canonicalized');
