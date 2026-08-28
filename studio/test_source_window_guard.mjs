import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('./source-window-guard.js',import.meta.url),'utf8');
const context={globalThis:{},window:undefined,document:undefined,module:{exports:{}},console};vm.createContext(context);vm.runInContext(source,context);
const Guard=context.globalThis.ProfitMenteSourceWindowGuard||context.module.exports;if(!Guard)throw new Error('Source window guard no disponible');
const assets=[{id:'v1',name:'video.mp4',type:'video',duration:10},{id:'a1',name:'audio.wav',type:'audio',duration:5}];
const project={duration:20,clips:[
  {id:'c1',name:'Visual',track:0,asset:'v1',start:0,duration:4,speed:1,sourceOffset:8},
  {id:'c2',name:'Muy largo',track:0,asset:'v1',start:5,duration:12,speed:1,sourceOffset:0},
  {id:'c3',name:'Audio oculto',track:5,asset:'a1',start:0,duration:8,speed:1,sourceOffset:0}
],trackState:{5:{muted:true}}};
let v=Guard.inspect(project,assets);if(v.length!==2)throw new Error(`Se esperaban 2 violaciones activas, llegaron ${v.length}`);
if(!v.find(x=>x.clip.id==='c1')?.canShift)throw new Error('Clip desplazable no detectado');
if(v.find(x=>x.clip.id==='c2')?.canShift)throw new Error('Clip más largo que la fuente no debe marcarse reparable por offset');
const beforeDuration=project.clips[0].duration,r=Guard.repair(project,assets);
if(r.changed!==1)throw new Error('La reparación segura debía recolocar exactamente un sourceOffset');
if(Math.abs(project.clips[0].sourceOffset-6)>.001)throw new Error(`sourceOffset esperado 6, recibido ${project.clips[0].sourceOffset}`);
if(project.clips[0].duration!==beforeDuration)throw new Error('La reparación no debe cambiar duración del clip');
if(r.unresolved.length!==1||r.unresolved[0].clip.id!=='c2')throw new Error('Debe dejar explícito el clip imposible de reparar sin decisión editorial');
v=Guard.inspect(project,assets);if(v.length!==1||v[0].clip.id!=='c2')throw new Error('Tras reparar solo debe quedar el clip imposible');
const message=Guard.message(v[0]);if(!message.includes('reduce duración/velocidad'))throw new Error('El mensaje de bloqueo no es accionable');
console.log('Source window guard QA OK');
