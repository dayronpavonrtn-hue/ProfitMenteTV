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
    project.clips=result.clips;
    const assigned=engine.assignAssets(project,assets);
    document.querySelector('#mode').value='Automático';
    document.querySelector('#projectName').value=project.name;
    document.querySelector('#playhead').value=0;
    save();
    setStatus(`Video automático creado: 5 escenas, subtítulos y guion. ${assigned} escena(s) vinculadas a medios.`);
  };
  topic.addEventListener('keydown',e=>{if(e.key==='Enter')btn.click()});
})();