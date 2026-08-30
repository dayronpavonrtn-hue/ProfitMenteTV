(()=>{
  if(typeof document==='undefined'||!window.ProfitMenteSmartMixEngine||window.ProfitMenteSmartMix)return;
  const Engine=window.ProfitMenteSmartMixEngine,$=s=>document.querySelector(s);let busy=false,btn=null;
  const status=t=>typeof setStatus==='function'&&setStatus(t);
  function refresh(){persist?.();drawTimeline?.();renderAt?.(+($('#playhead')?.value||0))}
  function label(){if(btn)btn.textContent=busy?'Mezclando…':'🎚 Mezcla inteligente'}
  async function run(){
    if(busy)return;const before=Engine.inspect(project);
    if(!before.voice){status('Mezcla inteligente: añade o activa una pista de voz para aplicar ducking automático');return}
    if(!before.music){status('Mezcla inteligente: no hay música activa; puedes normalizar la voz por separado');return}
    busy=true;label();
    try{
      status('Mezcla inteligente · normalizando audio localmente…');
      if(window.ProfitMenteAudioNormalize?.normalizeAll){
        const normalized=await window.ProfitMenteAudioNormalize.normalizeAll({deferPersist:true,quiet:true});
        if(normalized?.reason==='busy'){status('Mezcla inteligente: espera a que termine la normalización de audio actual');return}
      }
      const r=Engine.apply(project,{duckRatio:.4});
      refresh();
      const after=Engine.inspect(project),detail=r.changed?`${r.changed} clip(s) de música ajustados`:'ducking ya estaba en nivel seguro';
      status(`Mezcla inteligente lista · ${detail} · ${after.overlapping} música/voz con ducking · $0 local`);
    }catch(err){console.error(err);status('No se pudo completar la mezcla inteligente: '+(err?.message||err))}
    finally{busy=false;label()}
  }
  function install(){
    const anchor=$('#audioNormalizeAllBtn')||$('#qaBtn');if(!anchor||$('#smartMixBtn'))return;
    btn=document.createElement('button');btn.id='smartMixBtn';btn.type='button';btn.textContent='🎚 Mezcla inteligente';btn.title='Normaliza voz/música/SFX y baja automáticamente la música mientras hay voz, sin APIs ni servicios de pago';btn.onclick=run;anchor.insertAdjacentElement('afterend',btn)
  }
  install();const observer=new MutationObserver(install);observer.observe(document.body,{childList:true,subtree:true});
  window.ProfitMenteSmartMix={inspect:()=>Engine.inspect(project),apply:run};
})();
