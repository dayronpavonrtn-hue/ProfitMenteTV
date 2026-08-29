(()=>{
  if(typeof document==='undefined'||!window.ProfitMenteProjectHistoryEngine||window.ProfitMenteProjectHistory)return;
  const $=s=>document.querySelector(s),engine=new ProfitMenteProjectHistoryEngine(project,{limit:80});
  const originalPersist=typeof persist==='function'?persist:null;
  if(!originalPersist)return;
  let applying=false;
  function status(t){if(typeof setStatus==='function')setStatus(t)}
  function updateButtons(){
    const s=engine.state(),u=$('#historyUndo'),r=$('#historyRedo');
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
    const result=originalPersist();
    updateButtons();
    return result;
  };
  function apply(snapshot,message){
    if(!snapshot)return false;
    applying=true;
    try{
      project=snapshot;
      const playhead=$('#playhead');if(playhead)playhead.value=Math.max(0,Math.min(Number(playhead.value)||0,Number(project.duration)||0));
      originalPersist();
    }finally{applying=false}
    refreshView(message);return true;
  }
  function undo(){if(!apply(engine.undo(),'Deshacer aplicado'))status('No hay cambios para deshacer')}
  function redo(){if(!apply(engine.redo(),'Rehacer aplicado'))status('No hay cambios para rehacer')}
  const props=$('.props')||document.body;
  const panel=document.createElement('section');panel.className='historyPanel';panel.innerHTML=`<hr><h3>Historial</h3><div class="historyActions"><button id="historyUndo" title="Ctrl/Cmd+Z">↶ Deshacer</button><button id="historyRedo" title="Ctrl/Cmd+Shift+Z o Ctrl/Cmd+Y">↷ Rehacer</button></div><small id="historyInfo">0 deshacer · 0 rehacer</small>`;props.appendChild(panel);
  const style=document.createElement('style');style.textContent='.historyPanel .historyActions{display:flex;gap:6px;flex-wrap:wrap}.historyPanel small{display:block;margin-top:6px;opacity:.7}';document.head.appendChild(style);
  $('#historyUndo').onclick=undo;$('#historyRedo').onclick=redo;
  document.addEventListener('keydown',e=>{
    const mod=e.ctrlKey||e.metaKey;if(!mod||e.altKey)return;
    const tag=e.target?.tagName?.toLowerCase();if(['input','textarea','select'].includes(tag))return;
    if(e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo()}
    else if(e.key.toLowerCase()==='y'){e.preventDefault();redo()}
  });
  window.ProfitMenteProjectHistory={engine,undo,redo,reset:()=>{engine.reset(project);updateButtons()}};
  updateButtons();
})();
