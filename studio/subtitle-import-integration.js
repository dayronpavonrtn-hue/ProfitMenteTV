(()=>{
  if(typeof document==='undefined'||!window.ProfitMenteSubtitleImportEngine||window.ProfitMenteSubtitleImport)return;
  const Engine=window.ProfitMenteSubtitleImportEngine,$=s=>document.querySelector(s),anchor=$('#subtitleExportGroup')||$('#captionBtn');if(!anchor)return;
  const btn=document.createElement('button');btn.id='importSubtitleBtn';btn.type='button';btn.textContent='⬆ Importar SRT/VTT';
  anchor.insertAdjacentElement('afterend',btn);
  const input=document.createElement('input');input.id='subtitleImportInput';input.type='file';input.accept='.srt,.vtt,text/vtt,application/x-subrip';input.hidden=true;document.body.appendChild(input);
  function captionTrackLocked(){
    const Guard=window.ProfitMenteEditLockGuard;
    if(typeof Guard?.trackLocked==='function')return Guard.trackLocked(project,{track:3});
    const maps=[project?.trackState,project?.trackStates];
    return maps.some(map=>map&&typeof map==='object'&&Object.entries(map).some(([key,state])=>Number(key)===3&&state?.locked===true));
  }
  function persistImport(){
    if(typeof persist==='function')return persist();
    if(typeof originalPersist==='function')return originalPersist();
    try{localStorage.setItem('profitmente-project',JSON.stringify(project));return true}catch(err){throw new Error(`No se pudo guardar el proyecto: ${err?.message||'almacenamiento local no disponible'}`)}
  }
  async function refreshImportedView(){
    if(typeof syncForm==='function')syncForm();
    if(typeof drawTimeline==='function')drawTimeline();
    if(typeof drawLibrary==='function')drawLibrary();
    const playhead=$('#playhead'),time=Math.max(0,Math.min(Number(playhead?.value)||0,Number(project?.duration)||0));
    if(playhead)playhead.value=time;
    if(typeof renderAt==='function')await renderAt(time);
  }
  async function importText(text,name='subtitles'){
    if(!project||!Array.isArray(project.clips))throw new Error('Proyecto no disponible');
    if(captionTrackLocked())throw new Error('La pista de captions está bloqueada; desbloquéala para importar subtítulos');
    const clips=Engine.clips(text,{source:`subtitle-import:${name}`});
    if(!clips.length)throw new Error('No se encontraron subtítulos válidos en el archivo');
    const snapshot=typeof structuredClone==='function'?structuredClone(project):JSON.parse(JSON.stringify(project));
    try{
      project.clips.push(...clips);
      project.clips.sort((a,b)=>Number(a.start)-Number(b.start)||Number(a.track)-Number(b.track));
      const importedEnd=clips.reduce((max,clip)=>Math.max(max,Number(clip.start)+Number(clip.duration)),0);
      if(Number.isFinite(importedEnd)&&importedEnd>Number(project.duration||0))project.duration=Number(importedEnd.toFixed(3));
      persistImport();
    }catch(err){
      project=snapshot;
      throw err;
    }
    try{await refreshImportedView()}catch(err){console.error('ProfitMente subtitle import view refresh failed',err)}
    setStatus?.(`${clips.length} subtítulo(s) importados desde ${name}`);
    window.dispatchEvent(new CustomEvent('profitmente:subtitles-imported',{detail:{count:clips.length,name,end:clips.reduce((max,clip)=>Math.max(max,clip.start+clip.duration),0)}}));
    return clips;
  }
  input.onchange=async()=>{const file=input.files?.[0];input.value='';if(!file)return;try{await importText(await file.text(),file.name)}catch(err){console.error(err);setStatus?.(`Error importando subtítulos: ${err.message}`)}};
  btn.onclick=()=>input.click();
  window.ProfitMenteSubtitleImport={importText,parse:Engine.parse.bind(Engine),open:()=>input.click()};
})();
