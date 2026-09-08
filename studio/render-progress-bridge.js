(function(g){
  'use strict';

  function numeric(value){
    if(typeof value==='number')return Number.isFinite(value)?value:null;
    if(typeof value!=='string')return null;
    const text=value.trim();
    if(!text||!/^\d+(?:\.\d+)?$/.test(text))return null;
    const out=Number(text);
    return Number.isFinite(out)?out:null;
  }

  function fromStatus(value){
    const message=typeof value==='string'?value.trim():'';
    const lower=message.toLowerCase();
    let stage='rendering',progress=null,elapsed=null;
    if(lower.includes('empaquetando'))stage='packing';
    else if(lower.includes('enviando'))stage='uploading';
    else if(lower.includes('en cola'))stage='queued';
    else if(lower.includes('qa post-render')||lower.includes('control post-render'))stage='qa';
    else if(lower.includes('preparando descarga')||lower.includes('descargando'))stage='downloading';
    else if(lower.includes('cancelando')||lower.includes('cancelado'))stage='cancelled';
    else if(lower.includes('error')||lower.includes('falló')||lower.includes('no se pudo'))stage='error';
    const percent=message.match(/(?:^|·|\s)(\d+(?:\.\d+)?)\s*%/);
    if(percent)progress=numeric(percent[1]);
    const seconds=message.match(/(?:^|·|\s)(\d+(?:\.\d+)?)\s*s(?:$|\s|·)/i);
    if(seconds)elapsed=numeric(seconds[1]);
    return {stage,progress,elapsed,message:message||undefined};
  }

  function emit(detail){
    if(typeof document==='undefined'||typeof CustomEvent==='undefined')return detail;
    document.dispatchEvent(new CustomEvent('profitmente:render-progress',{detail}));
    return detail;
  }

  function install(){
    const Bundle=g.ProfitMenteBundleEngine;
    if(!Bundle?.prototype||Bundle.prototype.__renderProgressBridge)return false;
    const original=Bundle.prototype.renderLocal;
    if(typeof original!=='function')return false;
    Bundle.prototype.renderLocal=async function(project,assets,onStatus=()=>{}){
      const report=value=>{const detail=fromStatus(value);emit(detail);return onStatus(value)};
      emit({stage:'packing',message:'Preparando render MP4'});
      try{
        const result=await original.call(this,project,assets,report);
        emit({stage:'done',progress:100,message:'Render MP4 completado'});
        return result;
      }catch(error){
        const message=String(error?.message||error||'Error de render');
        emit({stage:/cancelad/i.test(message)?'cancelled':'error',message});
        throw error;
      }
    };
    Bundle.prototype.__renderProgressBridge=true;
    return true;
  }

  const api={numeric,fromStatus,emit,install};
  g.ProfitMenteRenderProgressBridge=api;
  install();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
