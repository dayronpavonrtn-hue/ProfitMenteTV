import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
globalThis.window=globalThis;
if(!globalThis.crypto)Object.defineProperty(globalThis,'crypto',{value:webcrypto,configurable:true});
vm.runInThisContext(fs.readFileSync(new URL('./generator-engine.js',import.meta.url),'utf8'));
const engine=new ProfitMenteGeneratorEngine();
const a=engine.generate('inversiones con inteligencia artificial',45);
const b=engine.generate('ahorro automatizado para principiantes',45);
if(a.clips.filter(c=>c.track===0).length!==5)throw new Error('Generator must create 5 primary scenes');
if(a.clips.filter(c=>c.track===3).length!==5)throw new Error('Generator must create 5 caption clips');
if(a.script===b.script)throw new Error('Different topics should not generate identical scripts');
if(!a.clips.some(c=>c.transition&&c.motion))throw new Error('Scenes need transition and motion metadata');
const project={name:'Test generator',format:'9:16',clips:a.clips};
const assets=[
 {id:'money-video',name:'inversion dinero mercado.mp4',type:'video'},
 {id:'ai-image',name:'inteligencia artificial datos.jpg',type:'image'},
 {id:'random',name:'playa vacaciones.mp4',type:'video'}
];
const assigned=engine.assignAssets(project,assets);
if(assigned.primary!==5)throw new Error(`Expected 5 primary assignments, got ${assigned.primary}`);
if(assigned.broll<1)throw new Error('Expected automatic B-roll clips');
if(!project.clips.some(c=>c.track===1&&c.asset))throw new Error('B-roll clip was not created');

// Media-aware assignment: reject a video that is shorter than the scene, prefer portrait media for 9:16,
// and choose a safe source offset when a longer video is available.
const smartProject={name:'Vertical smart test',format:'9:16',clips:[{id:'scene',track:0,name:'HOOK',start:0,duration:6,asset:null,keywords:['inversion']}]};
const smartAssets=[
 {id:'short',name:'inversion vertical corto.mp4',type:'video',duration:2,width:1080,height:1920},
 {id:'landscape',name:'inversion mercado horizontal.mp4',type:'video',duration:20,width:1920,height:1080},
 {id:'portrait',name:'inversion mercado vertical.mp4',type:'video',duration:20,width:1080,height:1920},
 {id:'image',name:'inversion datos.jpg',type:'image',width:1080,height:1920}
];
const smart=engine.assignAssets(smartProject,smartAssets);
const scene=smartProject.clips.find(c=>c.id==='scene');
if(smart.primary!==1)throw new Error('Smart assignment did not assign the primary scene');
if(scene.asset==='short')throw new Error('Generator selected a video shorter than the scene');
if(scene.asset!=='portrait')throw new Error(`Expected portrait video for 9:16, got ${scene.asset}`);
if(!(scene.sourceOffset>=0&&scene.sourceOffset<=14.01))throw new Error(`Unsafe sourceOffset: ${scene.sourceOffset}`);
console.log(JSON.stringify({ok:true,primary:assigned.primary,broll:assigned.broll,smartAsset:scene.asset,sourceOffset:scene.sourceOffset,clips:project.clips.length,seed:a.seed}));