(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  let sourceLoadPromise=null;
  function ensureSourceWindow(){
    if(root.ProfitMenteSourceWindowEngine)return Promise.resolve(root.ProfitMenteSourceWindowEngine);
    if(typeof document==='undefined'){
      if(typeof require==='function'){try{root.ProfitMenteSourceWindowEngine=require('./source-window-engine.js')}catch{}}
      return Promise.resolve(root.ProfitMenteSourceWindowEngine||null);
    }
    if(sourceLoadPromise)return sourceLoadPromise;
    sourceLoadPromise=new Promise(resolve=>{
      const existing=[...document.scripts].find(s=>s.src.endsWith('/source-window-engine.js')||s.src.endsWith('source-window-engine.js'));
      if(existing){existing.addEventListener('load',()=>resolve(root.ProfitMenteSourceWindowEngine||null),{once:true});setTimeout(()=>resolve(root.ProfitMenteSourceWindowEngine||null),1500);return}
      const script=document.createElement('script');script.src='source-window-engine.js';script.async=false;script.onload=()=>resolve(root.ProfitMenteSourceWindowEngine||null);script.onerror=()=>resolve(null);document.body.appendChild(script);
    });
    return sourceLoadPromise;
  }
  class ProfitMenteQAAutofix{
    static clamp(v,lo,hi,fallback=lo){const n=Number(v);return Math.max(lo,Math.min(hi,Number.isFinite(n)?n:fallback))}
    static isLocked(project,clip){
      if(!clip)return false;
      const track=clip.track;
      const read=map=>map?.[track]??map?.[String(track)]??{};
      const current=read(project?.trackState),legacy=read(project?.trackStates);
      return !!clip.locked||!!(current&&typeof current==='object'&&current.locked)||!!(legacy&&typeof legacy==='object'&&legacy.locked);
    }
    static repair(project,assets=[]){
      if(!project||typeof project!=='object')return {changed:0,fixes:['Proyecto inválido'],skippedLocked:0};
      project.clips=Array.isArray(project.clips)?project.clips:[];
      const Source=root.ProfitMenteSourceWindowEngine;
      const byId=new Map((assets||[]).filter(a=>a?.id).map(a=>[a.id,a]));
      const assetFor=clip=>Source?.sameId?(assets||[]).find(a=>Source.sameId(a?.id,clip?.asset))||null:byId.get(clip?.asset);
      let changed=0,skippedLocked=0;const fixes=[];
      const set=(obj,key,value,label)=>{if(obj[key]===value)return;obj[key]=value;changed++;if(label)fixes.push(label)};
      let duration=Math.max(1,Number(project.duration)||1),contentEnd=0;
      for(const c of project.clips){
        if(!c||typeof c!=='object')continue;
        const normalizedStart=Math.max(0,Number.isFinite(Number(c.start))?Number(c.start):0);
        const normalizedDuration=Math.max(.05,Number.isFinite(Number(c.duration))?Number(c.duration):.05);
        if(this.isLocked(project,c)){
          skippedLocked++;
          contentEnd=Math.max(contentEnd,normalizedStart+normalizedDuration);
          continue;
        }
        set(c,'start',normalizedStart,'Inicio de clip normalizado');
        let clipDuration=normalizedDuration;set(c,'duration',clipDuration,'Duración de clip normalizada');
        const track=Number(c.track);
        if([0,1].includes(track)&&c.fitMode!=null&&!['cover','contain'].includes(c.fitMode))set(c,'fitMode','cover','Encuadre visual restablecido');
        if(c.speed!=null){const speed=this.clamp(c.speed,.25,4,1);set(c,'speed',speed,'Velocidad normalizada')}
        if(c.sourceOffset!=null||c.asset){
          let offset=Math.max(0,Number(c.sourceOffset)||0),a=assetFor(c);
          if(a?.duration&&['video','audio'].includes(a.type))offset=Math.min(offset,Math.max(0,Number(a.duration)-.05));
          set(c,'sourceOffset',offset,'Punto de entrada normalizado');
        }
        const sourceAsset=assetFor(c);
        if(Source&&sourceAsset?.duration&&['video','audio'].includes(sourceAsset.type)){
          const beforeDuration=Number(c.duration)||0;
          const normalized=Source.normalize(c,sourceAsset,{projectRemaining:Infinity,edited:'duration'});
          set(c,'speed',normalized.speed,'Velocidad de fuente normalizada');
          set(c,'sourceOffset',normalized.sourceOffset,'Punto de entrada ajustado a la fuente');
          set(c,'duration',normalized.duration,'Duración recortada al final real del medio');
          if(normalized.duration<beforeDuration-1e-9)Source.cropWordTimings?.(c);
        }
        clipDuration=Math.max(.001,Number(c.duration)||.001);
        if(c.fadeIn!=null)set(c,'fadeIn',this.clamp(c.fadeIn,0,clipDuration,0),'Fade de entrada normalizado');
        if(c.fadeOut!=null)set(c,'fadeOut',this.clamp(c.fadeOut,0,clipDuration,0),'Fade de salida normalizado');
        if([0,1,2].includes(track)){
          if(c.positionX!=null)set(c,'positionX',this.clamp(c.positionX,-100,100,0),'Posición X normalizada');
          if(c.positionY!=null)set(c,'positionY',this.clamp(c.positionY,-100,100,0),'Posición Y normalizada');
          if(c.scale!=null)set(c,'scale',this.clamp(c.scale,.25,3,1),'Escala normalizada');
          if(c.rotation!=null)set(c,'rotation',this.clamp(c.rotation,-180,180,0),'Rotación normalizada');
          if(c.opacity!=null)set(c,'opacity',this.clamp(c.opacity,0,1,1),'Opacidad normalizada');
        }
        contentEnd=Math.max(contentEnd,normalizedStart+clipDuration);
      }
      duration=Math.max(duration,contentEnd);duration=Number(duration.toFixed(3));set(project,'duration',duration,'Duración del proyecto ampliada al contenido');
      return {changed,fixes:[...new Set(fixes)],duration,skippedLocked};
    }
  }
  root.ProfitMenteQAAutofix=ProfitMenteQAAutofix;
  if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteQAAutofix;
  if(typeof document==='undefined')return;
  ensureSourceWindow();
  const qaBtn=document.querySelector('#qaBtn');if(!qaBtn||document.querySelector('#qaFixBtn'))return;
  const btn=document.createElement('button');btn.id='qaFixBtn';btn.type='button';btn.textContent='🛠 Reparar seguro';btn.title='Corrige errores estructurales seguros sin borrar medios ni modificar clips o pistas bloqueados';qaBtn.insertAdjacentElement('afterend',btn);
  btn.onclick=async()=>{
    await ensureSourceWindow();
    const result=ProfitMenteQAAutofix.repair(project,assets);
    if(typeof persist==='function')persist();
    if(typeof drawTimeline==='function')drawTimeline();
    if(typeof syncForm==='function')syncForm();
    if(typeof renderAt==='function')await renderAt(+document.querySelector('#playhead')?.value||0);
    document.querySelector('#qaBtn')?.click();
    const protectedText=result.skippedLocked?` · ${result.skippedLocked} clip${result.skippedLocked===1?'':'s'} protegido${result.skippedLocked===1?'':'s'} sin cambios`:'';
    if(typeof setStatus==='function')setStatus(result.changed?`Reparación segura aplicada · ${result.changed} ajuste(s) · sin borrar clips ni medios${protectedText}`:`QA seguro: no había ajustes estructurales que aplicar${protectedText}`);
  };
})();
