(()=>{
  let selectedId=null;
  const $=s=>document.querySelector(s);
  const clipById=id=>(project.clips||[]).find(c=>c.id===id);
  function status(t){if(typeof setStatus==='function')setStatus(t)}
  function refresh(){
    document.querySelectorAll('.clip').forEach(el=>el.classList.toggle('selected',el.dataset.id===selectedId));
    const has=!!clipById(selectedId);
    ['splitBtn','duplicateBtn','deleteClipBtn'].forEach(id=>{const b=$('#'+id);if(b)b.disabled=!has});
  }
  function commit(message){
    if(typeof persist==='function')persist();
    if(typeof drawTimeline==='function')drawTimeline();
    if(typeof renderAt==='function')renderAt(+$('#playhead').value||0);
    requestAnimationFrame(refresh);status(message);
  }
  function select(id){selectedId=id;refresh();const c=clipById(id);if(c)status(`Clip seleccionado: ${c.name||'sin nombre'}`)}
  function split(){
    const c=clipById(selectedId);if(!c)return;
    const t=+$('#playhead').value||0,end=c.start+c.duration;
    if(t<=c.start+.05||t>=end-.05){status('Coloca el cursor dentro del clip para cortarlo');return}
    const cutOffset=t-c.start,right=structuredClone(c);right.id=crypto.randomUUID();right.start=t;right.duration=end-t;right.sourceOffset=Math.max(0,Number(c.sourceOffset)||0)+cutOffset;right.name=(c.name||'Clip')+' · 2';
    c.duration=cutOffset;c.name=(c.name||'Clip').replace(/ · [12]$/,'')+' · 1';project.clips.push(right);selectedId=right.id;commit(`Clip cortado en ${t.toFixed(2)}s · in-point ${right.sourceOffset.toFixed(2)}s`);
  }
  function duplicate(){
    const c=clipById(selectedId);if(!c)return;
    const copy=structuredClone(c);copy.id=crypto.randomUUID();copy.name=(c.name||'Clip')+' copia';copy.start=Math.min(Math.max(0,project.duration-copy.duration),c.start+Math.min(.5,c.duration));project.clips.push(copy);selectedId=copy.id;commit('Clip duplicado');
  }
  function remove(){
    const c=clipById(selectedId);if(!c)return;
    project.clips=project.clips.filter(x=>x.id!==selectedId);selectedId=null;commit(`Clip eliminado: ${c.name||'sin nombre'}`);
  }
  document.addEventListener('click',e=>{const el=e.target.closest?.('.clip');if(el)select(el.dataset.id)} ,true);
  $('#splitBtn')?.addEventListener('click',split);$('#duplicateBtn')?.addEventListener('click',duplicate);$('#deleteClipBtn')?.addEventListener('click',remove);
  document.addEventListener('keydown',e=>{
    if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
    if(e.key==='Delete'||e.key==='Backspace'){if(clipById(selectedId)){e.preventDefault();remove()}}
    else if(e.key.toLowerCase()==='s'&&!e.ctrlKey&&!e.metaKey&&!e.altKey){if(clipById(selectedId)){e.preventDefault();split()}}
    else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='d'){if(clipById(selectedId)){e.preventDefault();duplicate()}}
  });
  const originalDraw=window.drawTimeline;
  if(typeof originalDraw==='function')window.drawTimeline=function(){originalDraw();requestAnimationFrame(refresh)};
  refresh();
  window.ProfitMenteEditTools={select,split,duplicate,remove,get selectedId(){return selectedId}};
})();