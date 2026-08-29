(()=>{
  let selectedId=null,splitEnginePromise=null;
  const $=s=>document.querySelector(s);
  const clipById=id=>(project.clips||[]).find(c=>c.id===id);
  const locked=c=>!!project.trackState?.[c?.track]?.locked;
  function status(t){if(typeof setStatus==='function')setStatus(t)}
  function getSplitEngine(){
    if(window.ProfitMenteSplitEditEngine)return Promise.resolve(window.ProfitMenteSplitEditEngine);
    if(splitEnginePromise)return splitEnginePromise;
    splitEnginePromise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='split-edit-engine.js';s.onload=()=>window.ProfitMenteSplitEditEngine?resolve(window.ProfitMenteSplitEditEngine):reject(new Error('Motor de corte no disponible'));s.onerror=()=>reject(new Error('No se pudo cargar split-edit-engine.js'));document.body.appendChild(s)});
    return splitEnginePromise;
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
    const t=+$('#playhead').value||0;let engine;
    try{engine=await getSplitEngine()}catch(err){console.error(err);status(err.message);return}
    const result=engine.split(c,t,{idFactory:()=>crypto.randomUUID()});
    if(!result.ok){status('Coloca el cursor dentro del clip para cortarlo');return}
    const index=project.clips.findIndex(x=>x.id===c.id);if(index<0){status('El clip cambió antes de completar el corte');return}
    project.clips.splice(index,1,result.left,result.right);selectedId=result.right.id;
    const speedLabel=Math.abs(result.speed-1)>.001?` · ${result.speed.toFixed(2)}×`:'';
    commit(`Clip cortado en ${t.toFixed(2)}s${speedLabel} · in-point ${result.sourceCut.toFixed(2)}s`);
  }
  function duplicate(){
    const c=clipById(selectedId);if(!c)return;if(locked(c)){status('La pista está bloqueada');return}
    const copy=structuredClone(c);copy.id=crypto.randomUUID();copy.name=(c.name||'Clip')+' copia';copy.start=Math.min(Math.max(0,project.duration-copy.duration),c.start+Math.min(.5,c.duration));project.clips.push(copy);selectedId=copy.id;commit('Clip duplicado');
  }
  function remove(){
    const c=clipById(selectedId);if(!c)return;if(locked(c)){status('La pista está bloqueada');return}
    project.clips=project.clips.filter(x=>x.id!==selectedId);selectedId=null;commit(`Clip eliminado: ${c.name||'sin nombre'}`);
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
  getSplitEngine().catch(err=>console.warn(err));refresh();
  window.ProfitMenteEditTools={select,split,duplicate,remove,get selectedId(){return selectedId}};
})();