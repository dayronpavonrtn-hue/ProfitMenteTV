import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {ProfitMenteSubtitleExportEngine:Engine}=require('./subtitle-export-engine.js');
const project={clips:[
  {id:'c1',track:3,name:'Hola mundo',start:0,duration:2},
  {id:'c2',track:3,name:'Ignorado por timings',start:2,duration:2,wordTimings:[{word:'Compra',start:2,end:2.6},{word:'inteligente',start:2.6,end:3.5}]},
  {id:'v1',track:0,name:'Video',start:0,duration:4}
]};
const cues=Engine.cues(project);
if(cues.length!==3)throw new Error(`Se esperaban 3 cues y llegaron ${cues.length}`);
if(cues[0].text!=='Hola mundo'||cues[1].text!=='Compra'||cues[2].text!=='inteligente')throw new Error('Orden/contenido de cues incorrecto');
const srt=Engine.srt(project);
if(!srt.includes('00:00:00,000 --> 00:00:02,000\nHola mundo'))throw new Error('SRT de caption por clip incorrecto');
if(!srt.includes('00:00:02,600 --> 00:00:03,500\ninteligente'))throw new Error('SRT de word timings incorrecto');
const vtt=Engine.vtt(project);
if(!vtt.startsWith('WEBVTT\n\n')||!vtt.includes('00:00:02.000 --> 00:00:02.600'))throw new Error('VTT incorrecto');
if(Engine.time(59.9996,true)!=='00:01:00,000')throw new Error('El redondeo de milisegundos no normaliza al minuto siguiente');
const clipped=Engine.cues({clips:[{track:3,name:'x',start:5,duration:1,wordTimings:[{word:'antes',start:4,end:5.4},{word:'despues',start:5.8,end:7}]}]});
if(clipped.length!==2||clipped[0].start!==5||clipped[0].end!==5.4||clipped[1].end!==6)throw new Error('Los word timings no quedan limitados al clip');
console.log('Subtitle export QA OK');