(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  class ProfitMenteQAAutofix{
    static clamp(v,lo,hi,fallback=lo){const n=Number(v);return Math.max(lo,Math.min(hi,Number.isFinite(n)?n:fallback))}
    static isLocked(project,clip){
      if(!clip)return false;
      const track=clip.track,state=project?.trackState?.[track]??project?.trackState?.[String(track)]??{};
      return !!clip.locked||!!(state&&typeof state==='object'&&state.locked);
    }
    static repair(project,assets=[]){
      if(!project||typeof project!=='object')return {changed:0,fixes:['Proyecto inválido'],skippedLocked:0};
      project.clips=Array.isArray(project.clips)?project.clips:[];
      const byId=new Map((assets||[]).filter(a=>a?.id).map(a=>[a.id,a]));
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
          let offset=Math.max(0,Number(c.sourceOffset)||0),a=byId.get(c.asset);
          if(a?.duration&&['video','audio'].includes(a.type))offset=Math.min(offset,Math.max(0,Number(a.duration)-.05));
          set(c,'sourceOffset',offset,'Punto de entrada normalizado');
        }
        if(c.fadeIn!=null)set(c,'fadeIn',this.clamp(c.fadeIn,0,clipDuration,0),'Fade de entrada normalizado');
        if(c.fadeOut!=null)set(c,'fadeOut',this.clamp(c.fadeOut,0,clipDuration,0),'Fade de salida normalizado');
        if([0,1,2].includes(track)){
          if(c.positionX!=null)set(c,'positionX',this.clamp(c.positionX,-100,100,0),'Posición X normalizada');
          if(c.positionY!=null)set(c,'positionY',this.clamp(c.positionY,-100,100,0),'Posición Y normalizada');
          if(c.scale!=null)set(c,'scale',this.clamp(c.scale,.25,3,1),'Escala normalizada');
          if(c.rotation!=null)set(c,'rotation',this.clamp(c.rotation,-180,180,0),'Rotación normalizada');
          if(c.opacity!=null)set(c,'opacity',this.clamp(c.opacity,0,1,1),'Opacidad normalizada');
        }
        clipDuration=Math.max(.05,Number(c.duration)||.05);
        contentEnd=Math.max(contentEnd,normalizedStart+clipDuration);
      }
      duration=Math.max(duration,contentEnd);duration=Number(duration.toFixed(3));set(project,'duration',duration,'Duración del proyecto ampliada al contenido');
      return {changed,fixes:[...new Set(fixes)],duration,skippedLocked};
    }
  }
  root.ProfitMenteQAAutofix=ProfitMenteQAAutofix;
  if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteQAAutofix;
  if(typeof document==='undefined')return;
  const qaBtn=document.querySelector('#qaBtn');if(!qaBtn||document.querySelector('#qaFixBtn'))return;
  const btn=document.createElement('button');btn.id='qaFixBtn';btn.type='button';btn.textContent='🛠 Reparar seguro';btn.title='Corrige errores estructurales seguros sin borrar medios ni modificar clips o pistas bloqueados';qaBtn.insertAdjacentElement('afterend',btn);
  btn.onclick=async()=>{
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
