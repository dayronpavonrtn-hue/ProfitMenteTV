(()=>{
  const engine=new ProfitMenteGeneratorEngine();
  const btn=document.querySelector('#generateBtn');
  const topic=document.querySelector('#topicInput');
  if(!btn)return;
  btn.onclick=()=>{
    const duration=Math.max(10,+document.querySelector('#duration').value||45);
    const result=engine.generate(topic.value,duration);
    project.mode='Automático';
    project.duration=duration;
    project.name=result.title||'Video automático';
    project.script=result.script;
    project.generatorSeed=result.seed;
    project.clips=result.clips;
    const assigned=engine.assignAssets(project,assets);
    document.querySelector('#mode').value='Automático';
    document.querySelector('#projectName').value=project.name;
    document.querySelector('#playhead').value=0;
    save();
    const visual=assigned.primary?`${assigned.primary} escena(s) con medio y ${assigned.broll} B-roll.`:'Añade videos o imágenes a la biblioteca para completar visuales automáticamente.';
    const narration=assigned.narration?' Narración local conectada automáticamente.':'';
    const soundtrack=assigned.music?' Música local añadida automáticamente con ducking para voz.':'';
    const sfx=assigned.sfx?` ${assigned.sfx} efecto(s) local(es) colocado(s) en transiciones.`:'';
    setStatus(`Video automático creado con guion variable, captions animados y transiciones. ${visual}${narration}${soundtrack}${sfx}`);
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