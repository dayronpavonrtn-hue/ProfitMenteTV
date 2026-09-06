import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const source=fs.readFileSync(path.join(here,'transport-engine.js'),'utf8');

function boot({project,playheadValue='0',storage={}}={}){
  const playhead={value:String(playheadValue)};
  const appended=[];
  const localStorage={
    getItem:key=>storage.getItem?storage.getItem(key):(storage[key]??null),
    setItem:(key,value)=>storage.setItem?storage.setItem(key,value):(storage[key]=String(value))
  };
  const document={
    activeElement:null,
    body:{appendChild:node=>appended.push(node)},
    querySelector(selector){
      if(selector==='#playhead')return playhead;
      return null;
    },
    querySelectorAll(){return []},
    createElement(){return {dataset:{},style:{}}},
    addEventListener(){}
  };
  const context={
    project,
    document,
    localStorage,
    playing:false,
    audio:{stop(){}},
    playTimer:null,
    cancelAnimationFrame(){},
    drawTimeline(){},
    syncForm(){},
    renderAt(t){context.lastRender=t},
    CustomEvent:class {constructor(type,init){this.type=type;this.detail=init?.detail}},
    console
  };
  context.window=context;
  context.dispatchEvent=()=>{};
  vm.createContext(context);
  vm.runInContext(source,context,{filename:'transport-engine.js'});
  return {context,playhead,storage,appended,api:context.ProfitMenteTransport};
}

{
  const project={
    fps:24,
    duration:10,
    clips:[
      {start:2,duration:3},
      {start:9,duration:5},
      {start:'bad',duration:2},
      {start:7,duration:-1},
      {start:false,duration:2}
    ]
  };
  const state=boot({project,playheadValue:4,storage:{'profitmente-timeline-zoom':'2.5'}});
  if(state.api.fps!==24)throw new Error('Transport must preserve supported FPS');
  if(JSON.stringify([...state.api.boundaries()])!==JSON.stringify([0,2,5,9,10]))throw new Error('Transport boundaries must ignore malformed clips and clamp valid cuts');
  state.api.nextCut();
  if(Number(state.playhead.value)!==5)throw new Error('nextCut must seek to the next valid edit boundary');
  state.api.prevCut();
  if(Number(state.playhead.value)!==2)throw new Error('prevCut must seek to the previous valid edit boundary');
  state.api.seek(Number.NaN);
  if(!Number.isFinite(Number(state.playhead.value))||Number(state.playhead.value)!==2)throw new Error('Invalid seeks must not poison the playhead');
  state.api.setZoom(false);
  if(state.api.zoom!==2.5)throw new Error('Boolean zoom values must not coerce into a valid zoom');
  state.api.setZoom(99);
  if(state.api.zoom!==6)throw new Error('Zoom must clamp to the supported maximum');
}

{
  const throwingStorage={
    getItem(){throw new Error('storage blocked')},
    setItem(){throw new Error('storage blocked')}
  };
  const state=boot({project:{fps:false,duration:'broken',clips:[]},playheadValue:'broken',storage:throwingStorage});
  if(state.api.fps!==30)throw new Error('Invalid/boolean FPS must fall back to 30');
  if(state.api.zoom!==1)throw new Error('Blocked localStorage must fall back to default zoom');
  state.api.seek(Infinity);
  if(Number(state.playhead.value)!==0)throw new Error('Invalid current time and seek target must recover to zero');
  if(JSON.stringify([...state.api.boundaries()])!==JSON.stringify([0,1]))throw new Error('Invalid project duration must recover to a finite transport duration');
}

console.log('ProfitMente Studio transport resilience regression OK');
