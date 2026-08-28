import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('./qa-autofix.js',import.meta.url),'utf8');
const context={globalThis:{},window:undefined,document:undefined,module:{exports:{}}};vm.createContext(context);vm.runInContext(source,context);
const Fix=context.globalThis.ProfitMenteQAAutofix;if(!Fix)throw new Error('QA autofix API no disponible');
const assets=[{id:'v1',type:'video',duration:8},{id:'a1',type:'audio',duration:4}];
const project={duration:5,clips:[
  {id:'c1',track:0,start:-2,duration:7,asset:'v1',fitMode:'weird',speed:9,sourceOffset:99,opacity:2,scale:9,rotation:999,fadeIn:20,fadeOut:-1},
  {id:'c2',track:5,start:3,duration:4,asset:'a1',sourceOffset:-2,fadeIn:8,fadeOut:8}
]};
const beforeIds=project.clips.map(c=>c.id).join(',');
const result=Fix.repair(project,assets);
if(result.changed<1)throw new Error('No se aplicaron reparaciones');
if(project.clips.map(c=>c.id).join(',')!==beforeIds||project.clips.length!==2)throw new Error('Autofix borró o reemplazó clips');
const v=project.clips[0],a=project.clips[1];
if(v.start!==0||v.fitMode!=='cover'||v.speed!==4)throw new Error('Normalización visual incompleta');
if(v.sourceOffset>7.951||v.opacity!==1||v.scale!==3||v.rotation!==180)throw new Error('Parámetros visuales fuera de rango tras reparar');
if(v.fadeIn!==7||v.fadeOut!==0)throw new Error('Fades visuales no normalizados');
if(a.sourceOffset!==0||a.fadeIn!==4||a.fadeOut!==4)throw new Error('Audio no normalizado');
if(project.duration<7)throw new Error('La duración no se amplió para conservar todo el contenido');
console.log(`Safe QA autofix OK: ${result.changed} ajustes, ${project.clips.length} clips preservados, duración ${project.duration}s`);
