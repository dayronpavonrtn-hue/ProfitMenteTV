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
})();