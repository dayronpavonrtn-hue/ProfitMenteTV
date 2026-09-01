(()=>{
  const engine=new ProfitMenteGeneratorEngine();
  const applyGeneratedProject=(target,result,duration)=>{
    const previous=Array.isArray(target?.clips)?target.clips:[];
    const preserved=previous.filter(clip=>engine.clipLocked(target,clip));
    const blockedTracks=new Set();
    const generated=(Array.isArray(result?.clips)?result.clips:[]).filter(clip=>{
      if(engine.trackLocked(target,clip?.track)){
        blockedTracks.add(String(clip?.track));
        return false;
      }
      return true;
    });
    const requested=Math.max(10,Number(duration)||45);
    const protectedEnd=preserved.reduce((max,clip)=>Math.max(max,(Number(clip?.start)||0)+Math.max(0,Number(clip?.duration)||0)),0);
    target.mode='Automático';
    target.duration=Math.max(requested,protectedEnd);
    target.name=result?.title||'Video automático';
    target.script=result?.script||'';
    target.generatorSeed=result?.seed;
    target.clips=[...preserved,...generated];
    return {preserved:preserved.length,generated:generated.length,blockedTracks:blockedTracks.size,duration:target.duration};
  };
  window.ProfitMenteApplyGeneratedProject=applyGeneratedProject;
  const btn=document.querySelector('#generateBtn');
  const topic=document.querySelector('#topicInput');
  if(!btn)return;
  btn.onclick=()=>{
    const duration=Math.max(10,+document.querySelector('#duration').value||45);
    const result=engine.generate(topic.value,duration);
    const merge=applyGeneratedProject(project,result,duration);
    const assigned=engine.assignAssets(project,assets);
    document.querySelector('#mode').value='Automático';
    document.querySelector('#projectName').value=project.name;
    document.querySelector('#duration').value=project.duration;
    document.querySelector('#playhead').max=project.duration;
    document.querySelector('#playhead').value=0;
    save();
    const visual=assigned.primary?`${assigned.primary} escena(s) con medio y ${assigned.broll} B-roll.`:'Añade videos o imágenes a la biblioteca para completar visuales automáticamente.';
    const narration=assigned.narration?' Narración local conectada automáticamente.':'';
    const soundtrack=assigned.music?' Música local añadida automáticamente con ducking para voz.':'';
    const sfx=assigned.sfx?` ${assigned.sfx} efecto(s) local(es) colocado(s) en transiciones.`:'';
    const protectedEdits=merge.preserved?` ${merge.preserved} clip(s) manual(es) bloqueado(s) conservado(s).`:'';
    const protectedTracks=merge.blockedTracks?` ${merge.blockedTracks} pista(s) bloqueada(s) quedaron fuera de la regeneración.`:'';
    setStatus(`Video automático creado con guion variable, captions animados y transiciones. ${visual}${narration}${soundtrack}${sfx}${protectedEdits}${protectedTracks}`);
  };
  topic.addEventListener('keydown',e=>{if(e.key==='Enter')btn.click()});

  function loadScriptOnce(src,key,onload){
    if(document.querySelector(`script[data-profitmente-${key}]`)){onload?.();return}
    const s=document.createElement('script');s.src=src;s.dataset[`profitmente${key[0].toUpperCase()+key.slice(1)}`]=key;s.onload=()=>onload?.();document.body.appendChild(s);
  }

  loadScriptOnce('generator-autofill.js','generatorAutofill');
  loadScriptOnce('qa-autofix.js','qaAutofix',()=>loadScriptOnce('source-window-guard.js','sourceWindowGuard'));
  loadScriptOnce('export-preflight.js','exportPreflight');
  loadScriptOnce('post-render-report.js','postRenderReport');
  loadScriptOnce('render-error-engine.js','renderErrorEngine');

  function bootMediaReplacement(){
    if(window.ProfitMenteMediaReplaceEngine){loadScriptOnce('media-replace-integration.js','mediaReplaceIntegration');return}
    loadScriptOnce('media-replace-engine.js','mediaReplaceEngine',()=>loadScriptOnce('media-replace-integration.js','mediaReplaceIntegration'));
  }
  function bootRenderJobs(){
    if(window.ProfitMenteRenderJobClient){loadScriptOnce('render-job-integration.js','renderJobIntegration');return}
    loadScriptOnce('render-job-client.js','renderJobClient',()=>loadScriptOnce('render-job-integration.js','renderJobIntegration'));
  }
  function bootVisualGaps(){
    if(window.ProfitMenteVisualGapEngine){loadScriptOnce('visual-gap-integration.js','visualGapIntegration');return}
    loadScriptOnce('visual-gap-engine.js','visualGapEngine',()=>loadScriptOnce('visual-gap-integration.js','visualGapIntegration'));
  }
  function bootProjectVersions(){
    if(window.ProfitMenteProjectVersionEngine){loadScriptOnce('project-version-integration.js','projectVersionIntegration');return}
    loadScriptOnce('project-version-engine.js','projectVersionEngine',()=>loadScriptOnce('project-version-integration.js','projectVersionIntegration'));
  }
  function bootSubtitleExport(){
    if(window.ProfitMenteSubtitleExportEngine){loadScriptOnce('subtitle-export-integration.js','subtitleExportIntegration');return}
    loadScriptOnce('subtitle-export-engine.js','subtitleExportEngine',()=>loadScriptOnce('subtitle-export-integration.js','subtitleExportIntegration'));
  }
  function bootRenderRange(){
    if(window.ProfitMenteRenderRangeEngine){loadScriptOnce('render-range-integration.js','renderRangeIntegration');return}
    loadScriptOnce('render-range-engine.js','renderRangeEngine',()=>loadScriptOnce('render-range-integration.js','renderRangeIntegration'));
  }
  function bootProjectReset(){
    if(window.ProfitMenteProjectResetEngine){loadScriptOnce('project-reset-integration.js','projectResetIntegration');return}
    loadScriptOnce('project-reset-engine.js','projectResetEngine',()=>loadScriptOnce('project-reset-integration.js','projectResetIntegration'));
  }
  function bootAudioNormalize(){
    if(window.ProfitMenteAudioNormalizeEngine){loadScriptOnce('audio-normalize-integration.js','audioNormalizeIntegration');return}
    loadScriptOnce('audio-normalize-engine.js','audioNormalizeEngine',()=>loadScriptOnce('audio-normalize-integration.js','audioNormalizeIntegration'));
  }
  function bootSafeArea(){
    if(window.ProfitMenteSafeAreaEngine){loadScriptOnce('safe-area-integration.js','safeAreaIntegration');return}
    loadScriptOnce('safe-area-engine.js','safeAreaEngine',()=>loadScriptOnce('safe-area-integration.js','safeAreaIntegration'));
  }
  function bootProjectImport(){
    if(window.ProfitMenteProjectImportEngine){loadScriptOnce('project-import-integration.js','projectImportIntegration');return}
    loadScriptOnce('project-import-engine.js','projectImportEngine',()=>loadScriptOnce('project-import-integration.js','projectImportIntegration'));
  }

  function bootSupportModules(){
    bootMediaReplacement();
    bootRenderJobs();
    bootVisualGaps();
    bootProjectVersions();
    bootSubtitleExport();
    bootRenderRange();
    bootProjectReset();
    bootAudioNormalize();
    bootSafeArea();
    bootProjectImport();
    if(window.ProfitMenteProjectPortability){bootRecovery();return}
    loadScriptOnce('project-portability.js','portability',bootRecovery);
  }

  function bootRecovery(){
    if(window.ProfitMenteRecoveryEngine||document.querySelector('script[data-profitmente-recovery]'))return;
    const core=document.createElement('script');core.src='recovery-engine.js';core.dataset.profitmenteRecovery='core';
    core.onload=()=>{
      if(document.querySelector('script[data-profitmente-recovery="integration"]'))return;
      const integration=document.createElement('script');integration.src='recovery-integration.js';integration.dataset.profitmenteRecovery='integration';document.body.appendChild(integration);
    };
    document.body.appendChild(core);
  }
  if(document.readyState==='complete')bootSupportModules();else window.addEventListener('load',bootSupportModules,{once:true});
})();