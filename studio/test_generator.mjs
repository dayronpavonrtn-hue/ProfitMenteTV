import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
globalThis.window=globalThis;
globalThis.crypto=crypto;
vm.runInThisContext(fs.readFileSync(new URL('./generator-engine.js',import.meta.url),'utf8'));
const engine=new ProfitMenteGeneratorEngine();
const a=engine.generate('inversiones con inteligencia artificial',45);
const b=engine.generate('ahorro automatizado para principiantes',45);
if(a.clips.filter(c=>c.track===0).length!==5)throw new Error('Generator must create 5 primary scenes');
if(a.clips.filter(c=>c.track===3).length!==5)throw new Error('Generator must create 5 caption clips');
if(a.script===b.script)throw new Error('Different topics should not generate identical scripts');
if(!a.clips.some(c=>c.transition&&c.motion))throw new Error('Scenes need transition and motion metadata');
const project={clips:a.clips};
const assets=[
 {id:'money-video',name:'inversion dinero mercado.mp4',type:'video'},
 {id:'ai-image',name:'inteligencia artificial datos.jpg',type:'image'},
 {id:'random',name:'playa vacaciones.mp4',type:'video'}
];
const assigned=engine.assignAssets(project,assets);
if(assigned.primary!==5)throw new Error(`Expected 5 primary assignments, got ${assigned.primary}`);
if(assigned.broll<1)throw new Error('Expected automatic B-roll clips');
if(!project.clips.some(c=>c.track===1&&c.asset))throw new Error('B-roll clip was not created');
console.log(JSON.stringify({ok:true,primary:assigned.primary,broll:assigned.broll,clips:project.clips.length,seed:a.seed}));