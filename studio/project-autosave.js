(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.ProfitMenteProjectAutosaveEngine=api.ProfitMenteProjectAutosaveEngine})(typeof globalThis!=='undefined'?globalThis:this,function(){
class ProfitMenteProjectAutosaveEngine{
  static fields(project={}){return {name:project.name||'Nuevo video',duration:Math.max(1,Number(project.duration)||45),format:['9:16','16:9','1:1'].includes(project.format)?project.format:'9:16',mode:project.mode==='Automático'?'Automático':'Manual'}}
  static merge(project={},values={}){
    const current=this.fields(project),rawDuration=values.duration;
    const parsedDuration=rawDuration===''||rawDuration==null?current.duration:Number(rawDuration);
    return {
      name:typeof values.name==='string'&&values.name.trim()?values.name.trim():current.name,
      duration:Math.max(1,Number.isFinite(parsedDuration)?parsedDuration:current.duration),
      format:['9:16','16:9','1:1'].includes(values.format)?values.format:current.format,
      mode:values.mode==='Automático'||values.mode==='Manual'?values.mode:current.mode
    };
  }
  static fingerprint(project={}){return JSON.stringify(this.fields(project))}
  static changed(project={},next={}){return this.fingerprint(project)!==JSON.stringify(this.fields(next))}
}
return {ProfitMenteProjectAutosaveEngine};
});

if(typeof document!=='undefined')(()=>{
  if(typeof project==='undefined'||!window.ProfitMenteProjectAutosaveEngine||window.ProfitMenteProjectAutosave)return;
  const engine=window.ProfitMenteProjectAutosaveEngine,$=s=>document.querySelector(s),name=$('#projectName'),duration=$('#duration'),format=$('#format'),modeInput=$('#mode');
  if(!name||!duration||!format||!modeInput)return;
  let timer=null,flushing=false,last=engine.fingerprint(project),retryCount=0,unsaved=false,lastError=null;
  function read(){return {name:name.value,duration:duration.value,format:format.value,mode:modeInput.value}}
  function cancel(){if(timer){clearTimeout(timer);timer=null}}
  function markSaved(){
    unsaved=false;lastError=null;
    try{delete document.documentElement.dataset.projectSaveError}catch{}
  }
  function markUnsaved(err){
    unsaved=true;lastError=err||lastError;
    try{document.documentElement.dataset.projectSaveError='true'}catch{}
    if(typeof setStatus==='function')setStatus('⚠ Cambios del proyecto sin guardar · Studio seguirá reintentando');
  }
  function flush(reason='autoguardado'){
    cancel();if(flushing)return false;
    const next=engine.merge(project,read()),nextFingerprint=JSON.stringify(engine.fields(next));
    if(last===nextFingerprint&&!unsaved)return false;
    const previous=engine.fields(project);Object.assign(project,next);flushing=true;
    try{
      if(typeof persist==='function')persist();else localStorage.setItem('profitmente-project',JSON.stringify(project));
      last=nextFingerprint;retryCount=0;markSaved();
      const layoutChanged=previous.duration!==next.duration||previous.format!==next.format;
      if(layoutChanged&&typeof drawTimeline==='function')drawTimeline();
      if(reason!=='cierre'&&typeof renderAt==='function')void renderAt(+($('#playhead')?.value||0));
      window.dispatchEvent(new CustomEvent('profitmente:project-autosaved',{detail:{reason,libraryId:project.libraryId||null,name:project.name||'Sin título'}}));
      return true;
    }catch(err){
      console.error('ProfitMente property autosave failed',err);markUnsaved(err);
      window.dispatchEvent(new CustomEvent('profitmente:project-autosave-error',{detail:{reason,error:err?.message||String(err),retry:retryCount}}));
      if(reason!=='cierre'&&retryCount<3){retryCount+=1;timer=setTimeout(()=>flush('reintento'),1500*retryCount)}
      return false;
    }
    finally{flushing=false}
  }
  function schedule(){cancel();timer=setTimeout(()=>flush('propiedades'),450)}
  name.addEventListener('input',schedule);duration.addEventListener('input',schedule);
  format.addEventListener('change',()=>flush('formato'));modeInput.addEventListener('change',()=>flush('modo'));
  window.addEventListener('profitmente:project-opened',()=>{cancel();retryCount=0;last=engine.fingerprint(project);markSaved()});
  window.addEventListener('beforeunload',event=>{
    try{flush('cierre')}catch(err){markUnsaved(err)}
    if(unsaved){event.preventDefault();event.returnValue=''}
  });
  window.addEventListener('pagehide',()=>{try{flush('cierre')}catch(err){markUnsaved(err)}});
  window.ProfitMenteProjectAutosave={engine,flush,schedule,get lastFingerprint(){return last},get unsaved(){return unsaved},get lastError(){return lastError}};
})();
