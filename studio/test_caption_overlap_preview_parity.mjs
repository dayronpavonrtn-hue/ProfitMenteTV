import fs from 'fs';
import vm from 'vm';

const ok=(value,message)=>{if(!value)throw new Error(message)};
const drawn=[];
const ctx={
  font:'',fillStyle:'',strokeStyle:'',lineWidth:1,textAlign:'',textBaseline:'',filter:'none',globalAlpha:1,
  clearRect(){},fillRect(){},save(){},restore(){},translate(){},rotate(){},scale(){},drawImage(){},
  measureText(text){const px=Number((this.font.match(/([\d.]+)px/)||[])[1]||30);return {width:String(text).length*px*.5}},
  strokeText(){},fillText(text){drawn.push(String(text))}
};
const placeholder={hidden:false};
const context={
  window:{},assets:[],project:{mode:'Manual',trackState:{},trackStates:{},clips:[]},
  canvas:{width:540,height:960},ctx,
  Image:function(){},document:{createElement(){return {}}},URL:{createObjectURL(){return 'blob:test'},revokeObjectURL(){}},
  $(){return placeholder},setTimeout,clearTimeout,console,Math,Number,Map,Promise,Blob
};
context.window=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL('./preview-engine.js',import.meta.url),'utf8'),context);
vm.runInContext(fs.readFileSync(new URL('./caption-preview.js',import.meta.url),'utf8'),context);

context.project.clips=[
  {id:'old',track:3,name:'PRIMERO',start:0,duration:4},
  {id:'new',track:3,name:'SEGUNDO',start:2,duration:4}
];
const active=context.ProfitMentePreviewEngine.activeCaptions(3);
ok(active.length===2,'Debe detectar ambos captions solapados');
ok(active[0].id==='old'&&active[1].id==='new','Debe conservar el orden del proyecto igual que render_mp4.py');
drawn.length=0;
await context.renderAt(3);
const normal=drawn.filter(x=>x==='PRIMERO'||x==='SEGUNDO');
ok(normal.join('|')==='PRIMERO|SEGUNDO',`Preview normal no respetó composición MP4: ${normal.join('|')}`);

context.project.clips=[
  {id:'word-a',track:3,name:'A',start:0,duration:4,wordTimings:[{word:'UNO',start:2,end:4,duration:2}]},
  {id:'word-b',track:3,name:'B',start:1,duration:4,wordTimings:[{word:'DOS',start:2,end:4,duration:2}]}
];
drawn.length=0;
await context.renderAt(3);
const words=drawn.filter(x=>x==='UNO'||x==='DOS');
ok(words.join('|')==='UNO|DOS',`Preview word-timed no respetó composición MP4: ${words.join('|')}`);

context.project.trackStates={'3':{hidden:true}};
drawn.length=0;
await context.renderAt(3);
ok(!drawn.some(x=>x==='UNO'||x==='DOS'),'Una pista captions legacy hidden no debe dibujarse');

console.log('caption overlap preview/render parity regression ok');
