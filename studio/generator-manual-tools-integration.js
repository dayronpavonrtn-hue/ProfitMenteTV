(()=>{
  if(typeof document==='undefined')return;
  if(window.ProfitMenteGeneratorManualToolsIntegration)return;

  function boot(){
    if(window.ProfitMenteGeneratorManualToolsIntegration)return;
    if(typeof ProfitMenteGeneratorEngine==='undefined'||typeof ProfitMenteGeneratorManualTools==='undefined'){setTimeout(boot,80);return}
    const engine=new ProfitMenteGeneratorEngine(),tools=new ProfitMenteGeneratorManualTools(engine);
    const status=message=>typeof setStatus==='function'&&setStatus(message);
    const redraw=()=>{
      try{typeof save==='function'&&save()}catch{}
      try{typeof syncForm==='function'&&syncForm()}catch{}
      try{typeof drawTimeline==='function'&&drawTimeline()}catch{}
      try{const value=Number(document.querySelector('#playhead')?.value)||0;const r=typeof renderAt==='function'?renderAt(value):null;r?.catch?.(()=>{})}catch{}
    };
    const transactional=operation=>{
      const Guard=window.ProfitMenteGeneratorTransactionGuard;
      if(!Guard?.run)return {ok:true,value:operation()};
      return Guard.run(project,operation);
    };
    const fail=(result,label)=>{
      if(result?.ok!==false)return false;
      console.error(`ProfitMente Studio: ${label} revertido`,result.error);
      redraw();status(`${label} cancelado sin alterar el proyecto: ${result.error?.message||'error inesperado'}`);return true;
    };
    function bind(){
      if(typeof project==='undefined'||typeof assets==='undefined'){setTimeout(bind,80);return}
      const sceneBtn=document.querySelector('#sceneBtn'),captionBtn=document.querySelector('#captionBtn'),brollBtn=document.querySelector('#brollBtn');
      if(!sceneBtn||!captionBtn||!brollBtn){setTimeout(bind,120);return}
      sceneBtn.onclick=()=>{
        const duration=Math.max(10,Number(document.querySelector('#duration')?.value)||Number(project.duration)||45);
        const topic=String(document.querySelector('#topicInput')?.value||project.name||'').trim();
        const result=transactional(()=>{
          const generated=engine.generate(topic,duration),apply=window.ProfitMenteApplyGeneratedProject;
          if(typeof apply!=='function')throw new Error('Motor de proyecto generado no disponible');
          const merge=apply(project,generated,duration);return {generated,merge};
        });
        if(fail(result,'Generación de estructura'))return;
        redraw();
        const merge=result.value.merge;
        const protectedText=merge.preserved?` · ${merge.preserved} edición(es) bloqueada(s) conservada(s)`:'';
        status(`Estructura real generada: escenas, guion y captions sincronizados${protectedText}.`);
      };
      captionBtn.onclick=()=>{
        const result=transactional(()=>tools.addMissingCaptions(project));if(fail(result,'Generación de subtítulos'))return;
        redraw();const r=result.value;
        if(r.locked)status('Subtítulos sin cambios: la pista de captions está bloqueada.');
        else status(r.added?`${r.added} subtítulo(s) generado(s) desde el texto real de las escenas, con timing por palabra.`:'No había escenas sin subtítulos para completar.');
      };
      brollBtn.onclick=()=>{
        const result=transactional(()=>tools.addBroll(project,assets,{maxClips:4}));if(fail(result,'Generación de B-roll'))return;
        redraw();const r=result.value;
        if(r.locked)status('B-roll sin cambios: la pista de overlays está bloqueada.');
        else if(!r.available)status('B-roll pendiente: sube al menos un video o imagen local utilizable.');
        else status(r.added?`${r.added} B-roll real(es) añadido(s) con medios locales, dentro del rango de cada escena.`:'No había escenas libres de B-roll para completar.');
      };
      window.ProfitMenteGeneratorManualToolsIntegration={engine,tools,sceneBtn,captionBtn,brollBtn};
    }
    bind();
  }
  boot();
})();
