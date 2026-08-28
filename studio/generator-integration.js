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
    const media=assigned.primary?`${assigned.primary} escena(s) con medio y ${assigned.broll} B-roll.`:'Añade videos o imágenes a la biblioteca para completar visuales automáticamente.';
    setStatus(`Video automático creado con guion variable, captions animados y transiciones. ${media}`);
  };
  topic.addEventListener('keydown',e=>{if(e.key==='Enter')btn.click()});

  function loadScriptOnce(src,key,onload){
    if(document.querySelector(`script[data-profitmente-${key}]`)){onload?.();return}
    const s=document.createElement('script');s.src=src;s.dataset[`profitmente${key[0].toUpperCase()+key.slice(1)}`]=key;s.onload=()=>onload?.();document.body.appendChild(s);
  }

  // Keep automatic projects live: newly imported media can fill scenes that were generated without visuals.
  loadScriptOnce('generator-autofill.js','generatorAutofill');

  function bootMediaReplacement(){
    if(window.ProfitMenteMediaReplaceEngine){loadScriptOnce('media-replace-integration.js','mediaReplaceIntegration');return}
    loadScriptOnce('media-replace-engine.js','mediaReplaceEngine',()=>loadScriptOnce('media-replace-integration.js','mediaReplaceIntegration'));
  }

  // Project portability must be active before recovery wraps the final persistence chain.
  function bootSupportModules(){
    bootMediaReplacement();
    if(window.ProfitMenteProjectPortability){bootRecovery();return}
    loadScriptOnce('project-portability.js','portability',bootRecovery);
  }

  // Recovery must wrap the final persist() chain after every Studio module is loaded.
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