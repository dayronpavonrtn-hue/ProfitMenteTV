import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const Guard=require('./media-library-cross-project-guard.js');

function classList(){
  const values=new Set();
  return {add:v=>values.add(v),contains:v=>values.has(v),values};
}

{
  const children=[];
  const library={
    dataset:{},
    appendChild(node){children.push(node);return node;}
  };
  const doc={querySelector(selector){return selector==='#mediaLibrary'?library:null}};
  let draw=()=>{
    const button={tagName:'BUTTON',classList:classList()};
    library.appendChild(button);
    return button;
  };
  const installed=Guard.installMediaCardContract({doc,getDraw:()=>draw,setDraw:fn=>{draw=fn}});
  assert.equal(installed,true);
  const button=draw();
  assert.equal(button.classList.contains('mediaCard'),true,'direct media buttons must expose the mediaCard contract before downstream enhancers run');
  assert.equal(library.dataset.pmMediaCardContract,'1');
  const wrapped=draw;
  assert.equal(Guard.installMediaCardContract({doc,getDraw:()=>draw,setDraw:fn=>{draw=fn}}),true);
  assert.equal(draw,wrapped,'contract install must be idempotent');
}

{
  const oldWindow=globalThis.window;
  globalThis.window={};
  try{
    const appended=[];
    const doc={
      createElement(tag){return {tagName:String(tag).toUpperCase(),dataset:{}}},
      querySelector(){return null},
      body:{appendChild(node){appended.push(node);return node}}
    };
    assert.equal(Guard.loadTimelineDnD({doc}),true);
    assert.equal(appended.length,1);
    assert.equal(appended[0].src,'./media-timeline-dnd.js');
    assert.equal(appended[0].dataset.profitmenteMediaTimelineDnd,'1');
    doc.querySelector=selector=>selector==='script[data-profitmente-media-timeline-dnd="1"]'?appended[0]:null;
    assert.equal(Guard.loadTimelineDnD({doc}),true);
    assert.equal(appended.length,1,'drag/drop runtime loader must not inject duplicates');
  } finally {
    if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow;
  }
}

{
  const project={libraryId:'current',clips:[{asset:'a'}]};
  const saved={libraryId:'saved',clips:[{asset:'b'}]};
  const storage={getItem(){return JSON.stringify([{project:saved}])}};
  const tools={
    usage(p,id){return (p.clips||[]).filter(c=>c.asset===id)},
    unusedBytes(){return 0},
    assetBytes(){return 10}
  };
  Guard.install(tools,{storage});
  assert.deepEqual(tools.unused(project,[{id:'a'},{id:'b'},{id:'c'}]).map(x=>x.id),['c'],'cleanup must preserve media referenced by other saved projects');
}

console.log('media library runtime contract regression: ok');
