import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('./qa-autofix.js',import.meta.url),'utf8');
const context={globalThis:{},window:undefined,document:undefined,module:{exports:{}}};vm.createContext(context);vm.runInContext(source,context);
const Fix=context.globalThis.ProfitMenteQAAutofix;if(!Fix)throw new Error('QA autofix API no disponible');
const assets=[{id:'v1',type:'video',duration:8},{id:'a1',type:'audio',duration:4}];
const project={duration:5,trackState:{5:{locked:true}},clips:[
  {id:'c1',track:0,start:-2,duration:7,asset:'v1',fitMode:'weird',speed:9,sourceOffset:99,opacity:2,scale:9,rotation:999,fadeIn:20,fadeOut:-1},
  {id:'locked-clip',track:0,start:-4,duration:12,asset:'v1',fitMode:'bad',speed:12,sourceOffset:90,opacity:9,locked:true},
  {id:'locked-track',track:5,start:-3,duration:11,asset:'a1',sourceOffset:-2,fadeIn:20,fadeOut:20},
  {id:'c2',track:4,start:3,duration:4,asset:'a1',sourceOffset:-2,fadeIn:8,fadeOut:8}
]};
const beforeIds=project.clips.map(c=>c.id).join(',');
const lockedClipBefore=JSON.stringify(project.clips[1]);
const lockedTrackBefore=JSON.stringify(project.clips[2]);
if(!Fix.isLocked(project,project.clips[1])||!Fix.isLocked(project,project.clips[2])||Fix.isLocked(project,project.clips[0]))throw new Error('Detección de bloqueo incorrecta');
const result=Fix.repair(project,assets);
if(result.changed<1)throw new Error('No se aplicaron reparaciones');
if(result.skippedLocked!==2)throw new Error(`Se esperaban 2 clips protegidos omitidos y se obtuvieron ${result.skippedLocked}`);
if(project.clips.map(c=>c.id).join(',')!==beforeIds||project.clips.length!==4)throw new Error('Autofix borró o reemplazó clips');
if(JSON.stringify(project.clips[1])!==lockedClipBefore)throw new Error('Autofix modificó un clip bloqueado individualmente');
if(JSON.stringify(project.clips[2])!==lockedTrackBefore)throw new Error('Autofix modificó un clip en una pista bloqueada');
const v=project.clips[0],a=project.clips[3];
if(v.start!==0||v.fitMode!=='cover'||v.speed!==4)throw new Error('Normalización visual incompleta');
if(v.sourceOffset>7.951||v.opacity!==1||v.scale!==3||v.rotation!==180)throw new Error('Parámetros visuales fuera de rango tras reparar');
if(v.fadeIn!==7||v.fadeOut!==0)throw new Error('Fades visuales no normalizados');
if(a.sourceOffset!==0||a.fadeIn!==4||a.fadeOut!==4)throw new Error('Audio desbloqueado no normalizado');
if(project.duration<12)throw new Error('La duración no se amplió para conservar contenido protegido fuera del rango');
console.log(`Safe QA autofix lock guard OK: ${result.changed} ajustes, ${result.skippedLocked} protegidos sin cambios, ${project.clips.length} clips preservados, duración ${project.duration}s`);
