import {createRequire} from 'module';
import fs from 'fs';
import vm from 'vm';
const require=createRequire(import.meta.url);const Engine=require('./caption-compact-engine.js');
const ok=(v,m)=>{if(!v)throw new Error(m)};const near=(a,b,e=.001)=>Math.abs(a-b)<=e;const e=new Engine();
const clip={id:'cap',track:3,name:'Esta es una frase bastante larga que debe dividirse de forma segura para el preview final',start:2,duration:4};
const seg=e.segments(clip);ok(seg.length>1,'Caption largo debe compactarse');ok(near(seg[0].start,2),'Inicio incorrecto');ok(near(seg.reduce((s,x)=>s+x.duration,0),4,.002),'Duración total debe conservarse');ok(seg.every(x=>x.text.length<=28||x.text.split(' ').length===1),'Segmento demasiado largo');
ok(e.textAtTime(clip,2.01)===seg[0].text,'Texto inicial incorrecto');ok(e.textAtTime(clip,5.99)===seg.at(-1).text,'Texto final incorrecto');
const timed={...clip,wordTimings:[{word:'Esta',start:2,end:2.3}]};ok(e.segments(timed).length===1,'Word timings no deben compactarse');
const short={...clip,name:'Texto corto'};ok(e.segments(short).length===1,'Texto corto no debe dividirse');
const flash={...clip,duration:.2};ok(e.segments(flash).length===1,'Clip muy corto no debe fragmentarse');

const context={
  window:{},assets:[],project:{clips:[],trackState:{},mode:'Manual'},canvas:{width:540,height:960},
  ctx:{font:'',measureText(text){const px=Number((this.font.match(/(\d+)px/)||[])[1]||30);return {width:String(text).length*px*.56}}},
  Image:function(){},document:{createElement(){return {}}},URL:{createObjectURL(){return 'blob:test'},revokeObjectURL(){}},
  $(){return {hidden:false}},setTimeout(fn){fn()},console,Math,Number,Map,Promise
};
context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync(new URL('./preview-engine.js',import.meta.url),'utf8'),context);
const layout=context.ProfitMentePreviewEngine.captionLayout('Un subtítulo largo debe permanecer dentro del área segura del video sin cortarse por los bordes',38);
ok(layout.lines.length>=2&&layout.lines.length<=3,'Caption largo debe envolver en 2-3 líneas');
ok(layout.size<=38&&layout.size>=24,'Tamaño ajustado fuera del rango seguro');
context.ctx.font=`900 ${layout.size}px Arial`;ok(layout.lines.every(line=>context.ctx.measureText(line).width<=context.canvas.width*.88),'Una línea excede el 88% del ancho del preview');
const single=context.ProfitMentePreviewEngine.captionLayout('Texto corto',38);ok(single.lines.length===1,'Caption corto no debe envolverse');
console.log('caption preview compact + safe-fit regression ok');