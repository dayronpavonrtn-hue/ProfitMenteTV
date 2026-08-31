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
const project={name:'Test generator',format:'9:16',duration:45,clips:a.clips};
const assets=[
 {id:'money-video',name:'inversion dinero mercado.mp4',type:'video'},
 {id:'ai-image',name:'inteligencia artificial datos.jpg',type:'image'},
 {id:'random',name:'playa vacaciones.mp4',type:'video'}
];
const assigned=engine.assignAssets(project,assets);
if(assigned.primary!==5)throw new Error(`Expected 5 primary assignments, got ${assigned.primary}`);
if(assigned.broll<1)throw new Error('Expected automatic B-roll clips');
if(!project.clips.some(c=>c.track===1&&c.asset))throw new Error('B-roll clip was not created');
if(assigned.music!==0)throw new Error('Generator must not invent soundtrack when no music asset exists');
if(assigned.sfx!==0)throw new Error('Generator must not invent SFX when no effect asset exists');

// Media-aware assignment: reject a video that is shorter than the scene, prefer portrait media for 9:16,
// and choose a safe source offset when a longer video is available.
const smartProject={name:'Vertical smart test',format:'9:16',duration:45,clips:[{id:'scene',track:0,name:'HOOK',start:0,duration:6,asset:null,keywords:['inversion']}]};
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

// Diversity regression: when several equally suitable assets exist, rotate them instead of repeating one.
const diversityProject={name:'Diversity test',format:'9:16',duration:15,clips:Array.from({length:5},(_,i)=>({id:`d${i}`,track:0,name:`Scene ${i}`,start:i*3,duration:3,asset:null,keywords:['tema']}))};
const diversityAssets=[
 {id:'d-a',name:'tema uno.jpg',type:'image',width:1080,height:1920},
 {id:'d-b',name:'tema dos.jpg',type:'image',width:1080,height:1920},
 {id:'d-c',name:'tema tres.jpg',type:'image',width:1080,height:1920}
];
const diversity=engine.assignAssets(diversityProject,diversityAssets);
const counts=new Map();for(const c of diversityProject.clips.filter(c=>c.track===0))counts.set(c.asset,(counts.get(c.asset)||0)+1);
if(diversity.unique!==3)throw new Error(`Expected all 3 suitable assets to be used, got ${diversity.unique}`);
if(Math.max(...counts.values())>2)throw new Error(`Media repetition is too high: ${JSON.stringify([...counts])}`);

// Automatic soundtrack: only clearly identified local music is eligible. Voice/SFX must never be
// misclassified, and an existing music clip must not be duplicated.
const audioProject={name:'Automatic soundtrack',format:'9:16',duration:30,clips:[{id:'visual',track:0,name:'Scene',start:0,duration:5,asset:null,keywords:['tema']}]};
const audioAssets=[
 {id:'visual-a',name:'tema vertical.jpg',type:'image',width:1080,height:1920},
 {id:'voice-a',name:'voice narration final.wav',type:'audio',duration:30},
 {id:'sfx-a',name:'impact sound effect.wav',type:'audio',duration:30},
 {id:'music-a',name:'background instrumental lofi.wav',type:'audio',duration:35},
 {id:'music-short',name:'background music short.wav',type:'audio',duration:3}
];
const audioAssigned=engine.assignAssets(audioProject,audioAssets),musicClip=audioProject.clips.find(c=>c.track===5&&c.asset);
if(audioAssigned.music!==1)throw new Error(`Expected one automatic soundtrack, got ${audioAssigned.music}`);
if(musicClip?.asset!=='music-a')throw new Error(`Expected safe local music asset, got ${musicClip?.asset}`);
if(musicClip.volume!==.18||musicClip.duckVolume!==.10||musicClip.ducking!==true)throw new Error('Automatic soundtrack must use conservative mix defaults with ducking');
if(musicClip.duration!==30)throw new Error(`Soundtrack must cover project without exceeding it, got ${musicClip.duration}`);
const second=engine.assignAssets(audioProject,audioAssets);
if(second.music!==0||audioProject.clips.filter(c=>c.track===5&&c.asset).length!==1)throw new Error('Existing soundtrack was duplicated');

// Automatic transition SFX: use only clearly identified local effects, keep them short and conservative,
// never classify music/voice as SFX, place at scene boundaries, and do not duplicate manual SFX.
const sfxProject={name:'Automatic SFX',format:'9:16',duration:16,clips:Array.from({length:4},(_,i)=>({id:`s${i}`,track:0,name:`Scene ${i}`,start:i*4,duration:4,asset:null,keywords:['tema']}))};
const sfxAssets=[
 {id:'visual-sfx',name:'tema visual.jpg',type:'image',width:1080,height:1920},
 {id:'whoosh',name:'whoosh transition.wav',type:'audio',duration:.55},
 {id:'impact',name:'impact sfx.wav',type:'audio',duration:.35},
 {id:'music-no',name:'background music.wav',type:'audio',duration:30},
 {id:'voice-no',name:'voice narration.wav',type:'audio',duration:16}
];
const sfxAssigned=engine.assignAssets(sfxProject,sfxAssets),sfxClips=sfxProject.clips.filter(c=>c.track===4&&c.asset);
if(sfxAssigned.sfx!==3||sfxClips.length!==3)throw new Error(`Expected 3 automatic transition SFX, got ${sfxAssigned.sfx}/${sfxClips.length}`);
if(sfxClips.some(c=>!['whoosh','impact'].includes(c.asset)))throw new Error(`Music/voice was misclassified as SFX: ${JSON.stringify(sfxClips.map(c=>c.asset))}`);
if(sfxClips.some(c=>c.duration>.8||c.volume>.62))throw new Error('Automatic SFX must use short conservative defaults');
for(let i=0;i<sfxClips.length;i++){const boundary=(i+1)*4;if(Math.abs(sfxClips[i].start-boundary)>.07)throw new Error(`SFX ${i} is not aligned to scene boundary: ${sfxClips[i].start}`)}
const sfxSecond=engine.assignAssets(sfxProject,sfxAssets);
if(sfxSecond.sfx!==0||sfxProject.clips.filter(c=>c.track===4&&c.asset).length!==3)throw new Error('Existing SFX were duplicated');

console.log(JSON.stringify({ok:true,primary:assigned.primary,broll:assigned.broll,smartAsset:scene.asset,sourceOffset:scene.sourceOffset,diversity:[...counts],soundtrack:musicClip.asset,sfx:sfxClips.map(c=>c.asset),clips:project.clips.length,seed:a.seed}));