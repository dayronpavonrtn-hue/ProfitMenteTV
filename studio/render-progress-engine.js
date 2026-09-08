(function(g){
  'use strict';

  const STAGES=new Set(['packing','uploading','queued','rendering','reconnecting','qa','downloading','done','cancelled','error','idle']);

  function numeric(value){
    if(typeof value==='number')return Number.isFinite(value)?value:null;
    if(typeof value!=='string')return null;
    const text=value.trim();
    if(!text||!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(text))return null;
    const out=Number(text);
    return Number.isFinite(out)?out:null;
  }

  function clamp(value,min,max){return Math.max(min,Math.min(max,value))}

  function stageOf(value){
    const stage=String(value??'').trim().toLowerCase();
    return STAGES.has(stage)?stage:'rendering';
  }

  function percentOf(value){
    const n=numeric(value);
    return n==null?null:clamp(n,0,100);
  }

  function secondsOf(value){
    const n=numeric(value);
    return n==null||n<0?null:n;
  }

  function etaOf(progress,elapsed){
    if(progress==null||elapsed==null||progress<=0||progress>=100)return null;
    const eta=elapsed*(100-progress)/progress;
    return Number.isFinite(eta)&&eta>=0?eta:null;
  }

  function label(stage){
    return ({
      packing:'Empaquetando proyecto y medios',
      uploading:'Enviando al motor local',
      queued:'Render en cola',
      rendering:'Renderizando MP4',
      reconnecting:'Reconectando motor de render',
      qa:'Control de calidad post-render',
      downloading:'Descargando MP4 validado',
      done:'Render completado',
      cancelled:'Render cancelado',
      error:'Error de render',
      idle:'Listo para renderizar'
    })[stage]||'Renderizando MP4';
  }

  function normalize(input={}){
    const safe=input&&typeof input==='object'&&!Array.isArray(input)?input:{};
    const stage=stageOf(safe.stage||safe.status);
    const progress=percentOf(safe.progress);
    const elapsed=secondsOf(safe.elapsed);
    const eta=secondsOf(safe.eta)??etaOf(progress,elapsed);
    const message=typeof safe.message==='string'&&safe.message.trim()?safe.message.trim():label(stage);
    const stale=safe.progress_stale===true;
    const terminal=stage==='done'||stage==='cancelled'||stage==='error';
    return {stage,progress,elapsed,eta,message,stale,terminal,indeterminate:progress==null};
  }

  function formatSeconds(value){
    const n=secondsOf(value);
    if(n==null)return '';
    if(n<60)return `${n.toFixed(n<10?1:0)}s`;
    const minutes=Math.floor(n/60),seconds=Math.round(n%60);
    return `${minutes}m ${String(seconds).padStart(2,'0')}s`;
  }

  const api={numeric,percentOf,secondsOf,etaOf,normalize,formatSeconds,label};
  g.ProfitMenteRenderProgressEngine=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
