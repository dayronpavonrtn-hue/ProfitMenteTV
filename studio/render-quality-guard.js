(()=>{
  const install=()=>{
    const btn=document.querySelector('#renderBtn');
    if(!btn||btn.dataset.profitmenteQaRenderGuard==='1')return false;
    const baseRender=btn.onclick;
    if(typeof baseRender!=='function')return false;

    let rendering=false;
    btn.onclick=async function(event){
      if(rendering)return;
      if(typeof save==='function')save();

      const inspector=typeof qa!=='undefined'&&qa?.inspect?qa:null;
      if(inspector){
        const report=inspector.inspect(project,assets);
        if(Array.isArray(report?.issues)&&report.issues.length){
          if(typeof setStatus==='function')setStatus('Render WebM bloqueado: corrige primero los errores de QA');
          const qaBtn=document.querySelector('#qaBtn');
          if(qaBtn)qaBtn.click();
          return;
        }
      }

      rendering=true;
      btn.disabled=true;
      try{
        await baseRender.call(this,event);
      }catch(error){
        console.error('ProfitMente WebM render failed',error);
        try{if(typeof audio!=='undefined')audio.stop?.()}catch{}
        if(typeof setStatus==='function')setStatus('No se pudo renderizar WebM: '+(error?.message||error));
      }finally{
        rendering=false;
        btn.disabled=false;
      }
    };

    btn.dataset.profitmenteQaRenderGuard='1';
    window.ProfitMenteRenderQualityGuard={
      enabled:true,
      blocksQaErrors:true,
      preventsConcurrentRenders:true,
      zeroCost:true
    };
    return true;
  };

  if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
