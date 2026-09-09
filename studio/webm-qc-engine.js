(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  class ProfitMenteWebMQCEngine{
    static finite(value,fallback=NaN){
      if(value===null||value===undefined||typeof value==='boolean'||typeof value==='symbol')return fallback;
      if(typeof value==='string'&&!value.trim())return fallback;
      const n=Number(value);return Number.isFinite(n)?n:fallback;
    }
    static expected({duration,width,height,fps=30}={}){
      return {
        duration:Math.max(0,this.finite(duration,0)),
        width:Math.max(1,Math.round(this.finite(width,1))),
        height:Math.max(1,Math.round(this.finite(height,1))),
        fps:Math.max(1,Math.round(this.finite(fps,30)))
      };
    }
    static inspectMetadata(meta={},expected={}){
      const exp=this.expected(expected),duration=this.finite(meta.duration,NaN),width=Math.round(this.finite(meta.width,NaN)),height=Math.round(this.finite(meta.height,NaN)),size=Math.max(0,this.finite(meta.size,0));
      const issues=[],warnings=[];
      if(size<64)issues.push(`WebM vacío o truncado (${size} bytes)`);
      if(!Number.isFinite(duration)||duration<=0)issues.push('Duración WebM no válida');
      if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)issues.push('Resolución WebM no válida');
      if(Number.isFinite(width)&&Number.isFinite(height)&&(width!==exp.width||height!==exp.height))issues.push(`Resolución inesperada: ${width}×${height}; esperado ${exp.width}×${exp.height}`);
      const frameTolerance=Math.max(.20,2/exp.fps),durationDelta=Number.isFinite(duration)?Math.abs(duration-exp.duration):Infinity;
      if(exp.duration>0&&Number.isFinite(duration)&&durationDelta>frameTolerance){
        const text=`Duración inesperada: ${duration.toFixed(2)}s; esperado ${exp.duration.toFixed(2)}s`;
        if(durationDelta>Math.max(1,exp.duration*.05))issues.push(text);else warnings.push(text);
      }
      const score=Math.max(0,100-issues.length*35-warnings.length*8);
      return {ok:issues.length===0,score,issues,warnings,metrics:{size,duration:Number.isFinite(duration)?duration:null,width:Number.isFinite(width)?width:null,height:Number.isFinite(height)?height:null,durationDelta:Number.isFinite(durationDelta)?+durationDelta.toFixed(3):null,expectedDuration:exp.duration,expectedWidth:exp.width,expectedHeight:exp.height,fps:exp.fps}};
    }
    static async inspectBlob(blob,expected={},options={}){
      if(!blob||!Number.isFinite(Number(blob.size)))return this.inspectMetadata({size:0},expected);
      if(typeof document==='undefined'||typeof URL==='undefined'||typeof URL.createObjectURL!=='function')return this.inspectMetadata({size:blob.size,duration:expected.duration,width:expected.width,height:expected.height},expected);
      const timeoutMs=Math.max(500,Number(options.timeoutMs)||12000),video=document.createElement('video'),url=URL.createObjectURL(blob);
      video.preload='metadata';video.muted=true;video.playsInline=true;
      try{
        const metadata=await new Promise((resolve,reject)=>{
          let timer=setTimeout(()=>reject(new Error('Tiempo agotado al validar metadata WebM')),timeoutMs);
          const done=fn=>value=>{clearTimeout(timer);video.onloadedmetadata=null;video.onerror=null;fn(value)};
          video.onloadedmetadata=done(resolve);video.onerror=done(()=>reject(new Error('El navegador no pudo abrir el WebM renderizado')));video.src=url;try{video.load()}catch{}
        });
        void metadata;
        return this.inspectMetadata({size:blob.size,duration:video.duration,width:video.videoWidth,height:video.videoHeight},expected);
      }catch(error){
        const base=this.inspectMetadata({size:blob.size},expected);base.ok=false;base.score=Math.min(base.score,25);base.issues.unshift(error?.message||'No se pudo validar el WebM renderizado');return base;
      }finally{
        try{video.removeAttribute('src');video.load()}catch{}try{URL.revokeObjectURL(url)}catch{}
      }
    }
    static summary(result={}){
      const m=result.metrics||{},dim=m.width&&m.height?`${m.width}×${m.height}`:'resolución desconocida',dur=Number.isFinite(Number(m.duration))?`${Number(m.duration).toFixed(2)}s`:'duración desconocida';
      return `QA WebM ${Number(result.score)||0}/100 · ${dim} · ${dur}`;
    }
  }
  root.ProfitMenteWebMQCEngine=ProfitMenteWebMQCEngine;
  if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteWebMQCEngine;
})();
