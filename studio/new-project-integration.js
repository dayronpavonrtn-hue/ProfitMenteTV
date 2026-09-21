(()=>{
  const btn=document.querySelector('#clearBtn');
  if(!btn||btn.dataset.profitmenteNewProjectGuard==='1'||typeof btn.onclick!=='function')return;
  const baseNewProject=btn.onclick;
  btn.onclick=function(event){
    const previous=project;
    baseNewProject.call(this,event);
    if(project===previous)return;

    // A new project is a new editing session: stop transport/audio and clear
    // transient UI so state from the previous project cannot leak into it.
    try{playing=false}catch{}
    try{if(playTimer!=null)cancelAnimationFrame(playTimer)}catch{}
    try{audio?.stop?.()}catch{}
    const playBtn=document.querySelector('#playBtn');
    if(playBtn)playBtn.textContent='▶ Preview';
    const playhead=document.querySelector('#playhead');
    if(playhead)playhead.value='0';
    const qaReport=document.querySelector('#qaReport');
    if(qaReport){qaReport.hidden=true;qaReport.replaceChildren()}
    const topic=document.querySelector('#topicInput');
    if(topic)topic.value='';

    // Do not allow Undo to resurrect clips from a different project session.
    try{historyEngine?.seed?.(project);updateHistoryButtons?.()}catch{}
    try{syncForm();drawTimeline();renderAt(0)}catch(error){console.warn('New project UI refresh failed',error)}
    document.dispatchEvent(new CustomEvent('profitmente:new-project',{detail:{project}}));
    setStatus('Proyecto nuevo listo · sesión anterior cerrada de forma segura');
  };
  btn.dataset.profitmenteNewProjectGuard='1';
  window.ProfitMenteNewProjectIntegration={enabled:true,zeroCost:true};
})();