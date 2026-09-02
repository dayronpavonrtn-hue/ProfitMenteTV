import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';

globalThis.window=globalThis;
if(!globalThis.crypto)Object.defineProperty(globalThis,'crypto',{value:webcrypto,configurable:true});
vm.runInThisContext(fs.readFileSync(new URL('./generator-engine.js',import.meta.url),'utf8'));
vm.runInThisContext(fs.readFileSync(new URL('./generator-autofill.js',import.meta.url),'utf8'));

const engine=new ProfitMenteGeneratorEngine();

const generated=engine.generate('automatización financiera',30);
const project={name:'Narration assignment',format:'9:16',duration:30,clips:generated.clips};
const assets=[
  {id:'visual',name:'automatizacion financiera vertical.jpg',type:'image',width:1080,height:1920},
  {id:'music',name:'background instrumental lofi.wav',type:'audio',duration:32},
  {id:'sfx',name:'whoosh transition.wav',type:'audio',duration:.5},
  {id:'wrong-voice',name:'podcast random audio.wav',type:'audio',duration:30},
  {id:'voice-short',name:'voz narracion final master.wav',type:'audio',duration:8},
  {id:'voice-final',name:'voz narracion final.wav',type:'audio',duration:29.6}
];
const assigned=engine.assignAssets(project,assets);
const voice=project.clips.find(c=>c.track===6);
if(assigned.narration!==1)throw new Error(`Expected one local narration assignment, got ${assigned.narration}`);
if(voice?.asset!=='voice-final')throw new Error(`Expected voice-final, got ${voice?.asset}`);
if(!voice.name.startsWith('Narración · '))throw new Error(`Narration label was not updated: ${voice.name}`);
if(voice.duration!==29.6)throw new Error(`Narration must clamp to available audio duration, got ${voice.duration}`);
if(voice.sourceOffset!==0||voice.volume!==1)throw new Error('Narration must start at source zero and preserve generated voice volume');
if(voice.fadeIn<=0||voice.fadeOut<=0)throw new Error('Narration needs safe edge fades');

const again=engine.assignAssets(project,assets);
if(again.narration!==0)throw new Error('Existing narration must not be reassigned or duplicated');
if(project.clips.filter(c=>c.track===6&&c.asset).length!==1)throw new Error('Narration clip was duplicated');

const manual={name:'Manual voice preserved',format:'9:16',duration:12,clips:[{id:'voice-manual',track:6,name:'Mi voz',start:0,duration:12,asset:'manual-voice',volume:.8}]};
const manualResult=engine.assignAssets(manual,[{id:'candidate',name:'voice narration final.wav',type:'audio',duration:12}]);
if(manualResult.narration!==0||manual.clips[0].asset!=='manual-voice')throw new Error('Manual voice assignment must never be overwritten');

const ambiguous={name:'Ambiguous audio',format:'9:16',duration:10,clips:[{id:'pending',track:6,name:'Narración automática pendiente',start:0,duration:10,asset:null,volume:1}]};
const ambiguousResult=engine.assignAssets(ambiguous,[{id:'unknown',name:'audio 001.wav',type:'audio',duration:10},{id:'beat',name:'music beat.wav',type:'audio',duration:10}]);
if(ambiguousResult.narration!==0||ambiguous.clips[0].asset!==null)throw new Error('Ambiguous or music audio must not be guessed as narration');

const insufficient={name:'Short voice guard',format:'9:16',duration:30,mode:'Automático',clips:[{id:'pending-short',track:6,name:'Narración automática pendiente',start:0,duration:30,asset:null,volume:1}]};
const insufficientResult=engine.assignAssets(insufficient,[{id:'short-only',name:'voice narration final master.wav',type:'audio',duration:8}]);
if(insufficientResult.narration!==0)throw new Error(`Short narration must be rejected automatically, got ${insufficientResult.narration}`);
if(insufficient.clips[0].asset!==null||insufficient.clips[0].duration!==30)throw new Error('Rejected short narration must leave the pending narration clip untouched');

const threshold={name:'Coverage threshold',format:'9:16',duration:30,mode:'Automático',clips:[{id:'pending-threshold',track:6,name:'Narración automática pendiente',start:0,duration:30,asset:null,volume:1}]};
const thresholdResult=engine.assignAssets(threshold,[{id:'enough',name:'voice narration final.wav',type:'audio',duration:21.6}]);
if(thresholdResult.narration!==1||threshold.clips[0].asset!=='enough')throw new Error('Narration at the 72% coverage threshold should remain eligible');

console.log(JSON.stringify({ok:true,narration:voice.asset,duration:voice.duration,manualPreserved:true,ambiguousSkipped:true,shortRejected:true,thresholdAccepted:true}));