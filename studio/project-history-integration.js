(()=>{
  if(typeof document==='undefined'||!window.ProfitMenteProjectHistoryEngine||window.ProfitMenteProjectHistory)return;
  const $=s=>document.querySelector(s),engine=new ProfitMenteProjectHistoryEngine(project,{limit:80});
  // index.html still exposes the original storage-only persist as a global lexical
  // binding. Prefer it over the legacy history wrapper so one edit is captured by
  // exactly one history engine instead of both the old and advanced stacks.
  let storagePersist=null;
  try{if(typeof originalPersist==='function')storagePersist=originalPersist}catch{}
  if(!storagePersist&&typeof persist==='function')storagePersist=persist;
  if(!storagePersist)return;
  let applying=false;
  function status(t){if(typeof setStatus==='function')setStatus(t)}
  function buttons(){return {u:$('#undoBtn')||$('#historyUndo'),r:$('#redoBtn')||$('#historyRedo')}}
  function updateButtons(){
    const s=engine.state(),{u,r}=buttons();
    if(u)u.disabled=!s.undo;if(r)r.disabled=!s.redo;
    const info=$('#historyInfo');if(info)info.textContent=`${s.undo} deshacer · ${s.redo} rehacer`;
  }
  function refreshView(message){
    syncForm?.();drawTimeline?.();renderAt?.(+($('#playhead')?.value||0));
    requestAnimationFrame(()=>{window.ProfitMenteMultiSelect?.refresh?.();updateButtons()});
    if(message)status(message);
  }
  window.persist=function(){
    if(!applying)engine.commit(project);
    const result=storagePersist();
    updateButtons();
    return result;
  };
  function apply(snapshot,message){
    if(!snapshot)return false;
    applying=true;
    try{
      project=snapshot;
      const playhead=$('#playhead');if(playhead)playhead.value=Math.max(0,Math.min(Number(playhead.value)||0,Number(project.duration)||0));
      storagePersist();
    }finally{applying=false}
    refreshView(message);return true;
  }
  function undo(){if(!apply(engine.undo(),'Deshacer aplicado'))status('No hay cambios para deshacer')}
  function redo(){if(!apply(engine.redo(),'Rehacer aplicado'))status('No hay cambios para rehacer')}
  function reset(value=project){engine.reset(value);updateButtons();return engine.state()}

  // Compatibility bridge: the original bundle-import path still calls
  // historyEngine.seed(project). Mirror that project-boundary reset into the
  // canonical advanced history so Undo can never jump back into another project.
  try{
    if(typeof historyEngine!=='undefined'&&historyEngine?.seed&&!historyEngine.__profitmenteProjectHistoryBridge){
      const legacySeed=historyEngine.seed.bind(historyEngine);
      historyEngine.seed=function(value){const result=legacySeed(value);reset(value??project);return result};
      historyEngine.__profitmenteProjectHistoryBridge=true;
    }
  }catch{}

  const {u,r}=buttons();
  if(u){u.onclick=undo;u.title='Ctrl/Cmd+Z'}
  if(r){r.onclick=redo;r.title='Ctrl/Cmd+Shift+Z o Ctrl/Cmd+Y'}
  if(!u&&!r){
    const props=$('.props')||document.body;
    const panel=document.createElement('section');panel.className='historyPanel';panel.innerHTML=`<hr><h3>Historial</h3><div class="historyActions"><button id="historyUndo" title="Ctrl/Cmd+Z">↶ Deshacer</button><button id="historyRedo" title="Ctrl/Cmd+Shift+Z o Ctrl/Cmd+Y">↷ Rehacer</button></div><small id="historyInfo">0 deshacer · 0 rehacer</small>`;props.appendChild(panel);
    $('#historyUndo').onclick=undo;$('#historyRedo').onclick=redo;
  }
  document.addEventListener('keydown',e=>{
    const mod=e.ctrlKey||e.metaKey;if(!mod||e.altKey)return;
    const tag=e.target?.tagName?.toLowerCase();if(['input','textarea','select'].includes(tag))return;
    const key=e.key.toLowerCase();if(key!=='z'&&key!=='y')return;
    e.preventDefault();e.stopImmediatePropagation();
    if(key==='z')e.shiftKey?redo():undo();else redo();
  },true);
  // Any canonical project transition is a hard history boundary. Project Library
  // already calls reset directly; this event makes the invariant hold for current
  // and future import/open integrations as well.
  window.addEventListener?.('profitmente:project-opened',()=>reset(project));
  window.ProfitMenteProjectHistory={engine,undo,redo,reset};
  updateButtons();
})();