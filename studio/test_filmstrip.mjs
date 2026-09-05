import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync('studio/index.html','utf8');
const js=fs.readFileSync('studio/filmstrip-engine.js','utf8');
if(!html.includes('<script src="filmstrip-engine.js"></script>')) throw new Error('filmstrip-engine.js no está cargado por Studio');
for(const token of ['ProfitMenteFilmstripEngine','capture(asset,count)','video.onseeked=snap','toDataURL','decorate(project,assets','MutationObserver','observer.observe(tracks','this.sameId(c.id,el.dataset.id)','this.sameId(a.id,clip.asset)']) if(!js.includes(token)) throw new Error('Filmstrip incompleto: '+token);
const supportsVideo=js.includes("asset.type==='video'")||js.includes("asset.type!=='video'");
const supportsImage=js.includes("asset.type==='image'")||js.includes("['video','image'].includes(asset.type)");
if(!supportsVideo||!supportsImage) throw new Error('Filmstrip debe soportar video e imagen');
if(!js.includes('this.cache=new Map()')||!js.includes('this.pending=new Map()')) throw new Error('Filmstrip sin caché/pending guard');

const classSource=js.slice(0,js.indexOf('window.ProfitMenteFilmstripEngine'))+'\nthis.Engine=ProfitMenteFilmstripEngine;';
const context={console};vm.createContext(context);vm.runInContext(classSource,context);
const engine=new context.Engine();
if(!engine.sameId(7,'007')||!engine.sameId('+07.0',7)||!engine.sameId(-0,'0')) throw new Error('Filmstrip no normaliza IDs numéricos heredados');
if(engine.sameId('Asset','asset')) throw new Error('Filmstrip mezcló IDs textuales distintos');

function fakeStrip(){
  const classes=new Set();return {className:'filmstrip',style:{},classList:{add:v=>classes.add(v),toggle:(v,on)=>on?classes.add(v):classes.delete(v)},replaceChildren(){this.children=[...arguments]},children:[]};
}
const strip=fakeStrip();
const el={dataset:{id:'007'},clientWidth:140,isConnected:true,querySelector:q=>q==='.filmstrip'?strip:null,prepend(){}};
const root={querySelectorAll:()=>[el]};
const project={clips:[{id:7,track:0,asset:'+08.0'}]};
const assets=[{id:8,type:'image',thumbnail:'data:image/jpeg;base64,abc'}];
await engine.decorate(project,assets,root);
if(!strip.style.backgroundImage.includes('data:image/jpeg')) throw new Error('Filmstrip no resolvió alias canónico clip→medio');
if(strip.children.length!==0) throw new Error('Filmstrip de imagen dejó frames obsoletos');
console.log('Filmstrip integration OK');
