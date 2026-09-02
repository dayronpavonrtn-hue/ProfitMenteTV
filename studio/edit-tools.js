(()=>{
  let selectedId=null,splitEnginePromise=null,groupEditEnginePromise=null,groupSplitEnginePromise=null;
  const $=s=>document.querySelector(s);
  const clipById=id=>(project.clips||[]).find(c=>c.id===id);
  const locked=c=>{
    if(!c)return false;
    if(window.ProfitMenteEditLockGuard?.isLocked)return window.ProfitMenteEditLockGuard.isLocked(project,c);
    const track=c.track,key=String(track);
    const modern=project?.trackState?.[track]??project?.trackState?.[key];
    const legacy=project?.trackStates?.[track]??project?.trackStates?.[key];
    return !!c.locked||!!(
      (modern&&typeof modern==='object'&&modern.locked)||
      (legacy&&typeof legacy==='object'&&legacy.locked)
    );
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
    document.querySelectorAll('.clip').forEach(el=>el.classList.toggle('selected',el.dataset.id===selectedId));
    const c=clipById(selectedId),has=!!c,editable=has&&!locked(c);
    ['splitBtn','duplicateBtn','deleteClipBtn'].forEach(id=>{const b=$('#'+id);if(b)b.disabled=!editable});
  }
  function commit(message){
    if(typeof persist==='function')persist();
    if(typeof drawTimeline==='function')drawTimeline();
    if(typeof renderAt==='function')renderAt(+$('#playhead').value||0);
    requestAnimationFrame(refresh);status(message);
  }
  function select(id){selectedId=id;refresh();const c=clipById(id);if(c)status(`Clip seleccionado: ${c.name||'sin nombre'}`)}
  async function split(){
    const c=clipById(selectedId);if(!c)return;
    if(locked(c)){status('La pista está bloqueada');return}
    const t=+$('#playhead').value||0;let Split,GroupSplit;
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
    const anchorIndex=Math.max(0,members.findIndex(x=>x.id===c.id)),result=engine.duplicate(project,c,{idFactory:()=>crypto.randomUUID(),offset:.5});
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
  window.ProfitMenteEditTools={select,split,duplicate,remove,get selectedId(){return selectedId}};
})();