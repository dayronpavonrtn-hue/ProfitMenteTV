import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const Engine=require('./preview-format-engine.js');
const canvas={width:540,height:960,dataset:{}};
const frame={dataset:{},style:{}};
const formatSelect={value:'9:16',addEventListener(){}};
const meta={textContent:''};
const qualitySelect={value:'full',onchange:null};
const controls={className:'',title:'',innerHTML:'',querySelector(){return qualitySelect}};
const preview={appendChild(){}};
const renderBtn={onclick:null};
const nodes={
  '#previewCanvas':canvas,'#format':formatSelect,'.phone':frame,'#previewMeta':meta,
  '.preview':preview,'#renderBtn':renderBtn,'#playhead':{value:'0'}
};
const document={querySelector:s=>nodes[s]||null,createElement:()=>controls};
const localStorage={getItem:()=>null,setItem(){}};
const window={ProfitMentePreviewFormatEngine:Engine,dispatchEvent(){}};
const context={window,document,localStorage,project:{format:'9:16'},renderAt:async()=>{},syncForm(){},CustomEvent:class{constructor(type,opts){this.type=type;this.detail=opts?.detail}},Promise,Number};
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL('./preview-format-integration.js',import.meta.url),'utf8'),context);
const api=context.window.ProfitMentePreviewFormat;
if(!api)throw new Error('Preview format integration did not initialize');
for(const [format,aspect,width,height] of [['9:16','540 / 960',540,960],['16:9','960 / 540',960,540],['1:1','720 / 720',720,720]]){
  formatSelect.value=format;context.project.format=format;const result=api.apply({rerender:false});
  if(result.format!==format||canvas.width!==width||canvas.height!==height)throw new Error(`Canvas geometry mismatch for ${format}`);
  if(frame.dataset.format!==format||frame.style.aspectRatio!==aspect)throw new Error(`Frame geometry mismatch for ${format}`);
}
console.log('preview frame geometry QA passed');
