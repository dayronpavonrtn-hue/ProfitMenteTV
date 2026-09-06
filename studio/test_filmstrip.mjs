import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync('studio/index.html','utf8');
const js=fs.readFileSync('studio/filmstrip-engine.js','utf8');
if(!html.includes('<script src="filmstrip-engine.js"></script>')) throw new Error('filmstrip-engine.js no está cargado por Studio');
for(const token of ['ProfitMenteFilmstripEngine','capture(asset,count,clip=null)','sourceWindow(clip,sourceDuration)','video.onseeked=snap','toDataURL','decorate(project,assets','MutationObserver','observer.observe(tracks,{childList:true})','this.sameId(c.id,el.dataset.id)','this.sameId(a.id,clip.asset)','this.frames(asset,count,clip)']) if(!js.includes(token)) throw new Error('Filmstrip incompleto: '+token);
if(js.includes('observer.observe(tracks,{childList:true,subtree:true})')) throw new Error('Filmstrip no debe observar sus propios frames: produciría un ciclo de decoración');
const supportsVideo=js.includes("asset.type==='video'")||js.includes("asset.type!=='video'");
const supportsImage=js.includes("asset.type==='image'")||js.includes("['video','image'].includes(asset.type)");
if(!supportsVideo||!supportsImage) throw new Error('Filmstrip debe soportar video e imagen');
if(!js.includes('this.cache=new Map()')||!js.includes('this.pending=new Map()')) throw new Error('Filmstrip sin caché/pending guard');

const classSource=js.slice(0,js.indexOf('window.ProfitMenteFilmstripEngine'))+'\nthis.Engine=ProfitMenteFilmstripEngine;';
const context={console};vm.createContext(context);vm.runInContext(classSource,context);
const engine=new context.Engine();
if(!engine.sameId(7,'007')||!engine.sameId('+07.0',7)||!engine.sameId(-0,'0')) throw new Error('Filmstrip no normaliza IDs numéricos heredados');
if(engine.sameId('Asset','asset')||engine.sameId({},'[object Object]')||engine.sameId(false,0)) throw new Error('Filmstrip aceptó IDs ambiguos o inválidos');
if(engine.track(false)!==null||engine.track('')!==null||engine.track('1.5')!==null||engine.track(7)!==null) throw new Error('Filmstrip aceptó pistas inválidas');
if(engine.track('01.0')!==1||engine.track('-0')!==0) throw new Error('Filmstrip no normaliza aliases de pista');

const trimmed=engine.sourceWindow({sourceOffset:8,duration:4,speed:1.5},30);
if(trimmed.start!==8||trimmed.end!==14) throw new Error('Filmstrip no respeta sourceOffset/duración/velocidad');
const clipped=engine.sourceWindow({sourceOffset:28,duration:4,speed:2},30);
if(clipped.start!==28||clipped.end!==30) throw new Error('Filmstrip no limita la ventana a la duración fuente');
const fallback=engine.sourceWindow({sourceOffset:-5,duration:0,speed:0},12);
if(fallback.start!==0||fallback.end!==12) throw new Error('Filmstrip no recupera una ventana fuente inválida');
const keyA=engine.key({id:1,blob:{size:10}},4,{sourceOffset:0,duration:2,speed:1});
const keyB=engine.key({id:1,blob:{size:10}},4,{sourceOffset:4,duration:2,speed:1});
if(keyA===keyB) throw new Error('Caché de filmstrip mezcla clips con ventanas fuente distintas');

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

const invalidStrip=fakeStrip();
const invalidEl={dataset:{id:'9'},clientWidth:140,isConnected:true,querySelector:q=>q==='.filmstrip'?invalidStrip:null,prepend(){}};
await engine.decorate({clips:[{id:9,track:false,asset:8}]},assets,{querySelectorAll:()=>[invalidEl]});
if(invalidStrip.style.backgroundImage) throw new Error('Filmstrip trató false como pista visual 0');

let forwarded=null;
engine.frames=async(asset,count,clip)=>{forwarded={asset,count,clip};return []};
const videoStrip=fakeStrip();
const videoEl={dataset:{id:'10'},clientWidth:210,isConnected:true,querySelector:q=>q==='.filmstrip'?videoStrip:null,prepend(){}};
const videoClip={id:10,track:'01.0',asset:11,sourceOffset:6,duration:3,speed:2};
await engine.decorate({clips:[videoClip]},[{id:11,type:'video',blob:{size:100}}],{querySelectorAll:()=>[videoEl]});
if(!forwarded||forwarded.clip!==videoClip||forwarded.count!==3) throw new Error('Filmstrip no propaga la ventana del clip al muestreo de video');
console.log('Filmstrip integration OK');
