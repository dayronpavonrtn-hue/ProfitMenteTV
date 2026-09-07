(()=>{
  let selectedId=null,splitEnginePromise=null,groupEditEnginePromise=null,groupSplitEnginePromise=null;
  const $=s=>document.querySelector(s);
  const strictFinite=value=>{
    if(typeof value==='number')return Number.isFinite(value)?value:null;
    if(typeof value!=='string')return null;
    const raw=value.trim();if(!raw||!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(raw))return null;
    const numeric=Number(raw);return Number.isFinite(numeric)?numeric:null;
  };
  const clipIdKey=value=>{
    if(typeof value==='number')return Number.isFinite(value)?`n:${Object.is(value,-0)?0:value}`:null;
    if(typeof value!=='string')return null;
    const raw=value.trim();if(!raw)return null;
    if(/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(raw)){
      const numeric=Number(raw);if(Number.isFinite(numeric))return `n:${Object.is(numeric,-0)?0:numeric}`;
    }
    return `s:${raw}`;
  };
  const sameClipId=(a,b)=>{const left=clipIdKey(a),right=clipIdKey(b);return left!==null&&left===right};
  const clipMatches=id=>{const key=clipIdKey(id);return key===null?[]:(project.clips||[]).filter(c=>clipIdKey(c?.id)===key)};
  const clipById=id=>{const matches=clipMatches(id);return matches.length===1?matches[0]:null};
  const trackLookupKey=value=>{
    const numeric=strictFinite(value);if(numeric===null||!Number.isInteger(numeric))return null;
    return Object.is(numeric,-0)?0:numeric;
  };
  const locked=c=>{
    if(!c)return false;
    if(window.ProfitMenteEditLockGuard?.isLocked)return window.ProfitMenteEditLockGuard.isLocked(project,c)===true;
    const track=trackLookupKey(c.track);
    const modern=track===null?null:(project?.trackState?.[track]??project?.trackState?.[String(track)]);
    const legacy=track===null?null:(project?.trackStates?.[track]??project?.trackStates?.[String(track)]);
    return c.locked===true||
      (modern&&typeof modern==='object'&&modern.locked===true)||
      (legacy&&typeof legacy==='object'&&legacy.locked===true);
  };
  function status(t){if(typeof setStatus==='function')setStatus(t)}
  function loadEngine(globalName,src,dataKey){
    if(window[globalName])return Promise.resolve(window[globalName]);
    return new Promise((resolve,reject)=>{const existing=document.querySelector(`script[${dataKey}]`);if(existing){existing.addEventListener('load',()=>window[globalName]?resolve(window[globalName]):reject(new Error(`Motor ${globalName} no disponible`)),{once:true});existing.addEventListener('error',()=>reject(new Error(`No se pudo cargar ${src}`)),{once:true});return}const s=document.createElement('script');s.src=src;s.setAttribute(dataKey,'1');s.onload=()=>window[globalName]?resolve(window[globalName]):reject(new Error(`Motor ${globalName} no disponible`));s.onerror=()=>reject(new Error(`No se pudo cargar ${src}`));document.body.appendChild(s)});
  }
  function getSplitEngine(){
    if(window.ProfitMenteSplitEditEngine)return Promise.resolve(window.ProfitMenteSplitEditEngine);
    if(!splitEnginePromise)splitEnginePromise=loadEngine('ProfitMenteSplitEditEngine','split-edit-engine.js','data-profitmente-split-edit');
    return splitEnginePromise;
  }
  function getGroupEditEngine(){
    if(window.ProfitMenteGroupEditEngine)return Promise.resolve(window.ProfitMenteGroupEditEngine);
    if(!groupEditEnginePromise)groupEditEnginePromise=loadEngine('ProfitMenteGroupEditEngine','group-edit-engine.js','data-profitmente-group-edit');
    return groupEditEnginePromise;
  }
  function getGroupSplitEngine(){
    if(window.ProfitMenteGroupSplitEngine)return Promise.resolve(window.ProfitMenteGroupSplitEngine);
    if(!groupSplitEnginePromise)groupSplitEnginePromise=loadEngine('ProfitMenteGroupSplitEngine','group-split-engine.js','data-profitmente-group-split');
    return groupSplitEnginePromise;
  }
  function refresh(){
    document.querySelectorAll('.clip').forEach(el=>el.classList.toggle('selected',sameClipId(el.dataset.id,selectedId)));
    const c=clipById(selectedId),has=!!c,editable=has&&!locked(c);
    ['splitBtn','duplicateBtn','deleteClipBtn'].forEach(id=>{const b=$('#'+id);if(b)b.disabled=!editable});
  }
  function playheadTime(){const value=$('#playhead')?.value,numeric=strictFinite(value);return numeric===null?0:numeric}
  function commit(message){
    if(typeof persist==='function')persist();
    if(typeof drawTimeline==='function')drawTimeline();
    if(typeof renderAt==='function')renderAt(playheadTime());
    requestAnimationFrame(refresh);status(message);
  }
  function select(id){
    if(id===undefined||id===null){selectedId=null;refresh();return}
    if(clipIdKey(id)===null){selectedId=null;refresh();status('No se puede seleccionar el clip: su ID no es válido');return}
    const matches=clipMatches(id);
    if(matches.length>1){selectedId=null;refresh();status('No se puede seleccionar el clip: su ID es ambiguo en este proyecto');return}
    const c=matches[0]||null;selectedId=c?c.id:null;refresh();if(c)status(`Clip seleccionado: ${c.name||'sin nombre'}`)
  }
  async function split(){
    const c=clipById(selectedId);if(!c)return;
    if(locked(c)){status('La pista está bloqueada');return}
    const t=playheadTime();let Split,GroupSplit;
    try{[Split,GroupSplit]=await Promise.all([getSplitEngine(),getGroupSplitEngine()])}catch(err){console.error(err);status(err.message);return}
    if(clipById(selectedId)!==c){status('El clip cambió antes de completar el corte');return}
    const engine=new GroupSplit(Split),result=engine.split(project,c,t,{idFactory:()=>crypto.randomUUID(),groupIdFactory:()=>crypto.randomUUID()});
    if(!result.ok){
      if(result.reason==='locked'){status(result.members?.length>1?'No se puede cortar: el grupo contiene una pista bloqueada':'La pista está bloqueada');return}
      if(result.reason==='member-outside'){status(result.members?.length>1?'No se puede cortar el grupo: todos los clips enlazados deben cruzar el cursor':'Coloca el cursor dentro del clip para cortarlo');return}
      status('No se pudo completar el corte');return;
    }
    selectedId=result.rightId;
    const anchor=result.results.find(r=>r.right.id===result.rightId)||result.results[0],speedLabel=Math.abs(anchor.speed-1)>.001?` · ${anchor.speed.toFixed(2)}×`:'';
    commit(result.count>1?`Grupo cortado en ${t.toFixed(2)}s · ${result.count} clips enlazados${speedLabel}`:`Clip cortado en ${t.toFixed(2)}s${speedLabel} · in-point ${anchor.sourceCut.toFixed(2)}s`);
  }
  async function duplicate(){
    const c=clipById(selectedId);if(!c)return;if(locked(c)){status('La pista está bloqueada');return}
    let Engine;try{Engine=await getGroupEditEngine()}catch(err){console.error(err);status(err.message);return}
    if(clipById(selectedId)!==c){status('El clip cambió antes de completar el duplicado');return}
    const engine=new Engine(),members=engine.members(project,c),lockedGroup=engine.lockedMembers(project,c);
    if(lockedGroup.length){status(members.length>1?'No se puede duplicar: el grupo contiene una pista bloqueada':'La pista está bloqueada');return}
    const anchorIndex=Math.max(0,members.findIndex(x=>sameClipId(x.id,c.id))),result=engine.duplicate(project,c,{idFactory:()=>crypto.randomUUID(),offset:.5});
    if(!result.copies.length)return;selectedId=(result.copies[anchorIndex]||result.copies[0]).id;
    commit(result.copies.length>1?`Grupo duplicado · ${result.copies.length} clips`:'Clip duplicado');
  }
  async function remove(){
    const c=clipById(selectedId);if(!c)return;if(locked(c)){status('La pista está bloqueada');return}
    let Engine;try{Engine=await getGroupEditEngine()}catch(err){console.error(err);status(err.message);return}
    if(clipById(selectedId)!==c){status('El clip cambió antes de completar el borrado');return}
    const engine=new Engine(),members=engine.members(project,c),lockedGroup=engine.lockedMembers(project,c);
    if(lockedGroup.length){status(members.length>1?'No se puede borrar: el grupo contiene una pista bloqueada':'La pista está bloqueada');return}
    const removed=engine.remove(project,c);if(!removed.length)return;selectedId=null;
    commit(removed.length>1?`Grupo eliminado · ${removed.length} clips`:`Clip eliminado: ${c.name||'sin nombre'}`);
  }
  document.addEventListener('click',e=>{const el=e.target.closest?.('.clip');if(el)select(el.dataset.id)} ,true);
  document.addEventListener('dblclick',e=>{
    const el=e.target.closest?.('.clip');if(!el)return;
    e.preventDefault();e.stopImmediatePropagation();select(el.dataset.id);
    if(clipById(el.dataset.id))status('Clip abierto en el inspector · edita sus propiedades sin diálogos destructivos');
  },true);
  $('#splitBtn')?.addEventListener('click',split);$('#duplicateBtn')?.addEventListener('click',duplicate);$('#deleteClipBtn')?.addEventListener('click',remove);
  document.addEventListener('keydown',e=>{
    if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
    if(e.key==='Delete'||e.key==='Backspace'){if(clipById(selectedId)){e.preventDefault();remove()}}
    else if(e.key.toLowerCase()==='s'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!e.shiftKey){if(clipById(selectedId)){e.preventDefault();e.stopImmediatePropagation();split()}}
    else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='d'){if(clipById(selectedId)){e.preventDefault();duplicate()}}
  });
  const originalDraw=window.drawTimeline;
  if(typeof originalDraw==='function')window.drawTimeline=function(){originalDraw();requestAnimationFrame(refresh)};
  getSplitEngine().catch(err=>console.warn(err));getGroupEditEngine().catch(err=>console.warn(err));getGroupSplitEngine().catch(err=>console.warn(err));refresh();
  window.ProfitMenteClipIdentity={key:clipIdKey,same:sameClipId,find:clipById,matches:clipMatches};
  window.ProfitMenteEditTools={select,split,duplicate,remove,get selectedId(){return selectedId}};
})();