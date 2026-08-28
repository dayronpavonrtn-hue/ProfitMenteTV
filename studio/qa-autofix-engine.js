class ProfitMenteQAAutofixEngine{
  static clamp(value,min,max,fallback=min){const n=Number(value);return Math.min(max,Math.max(min,Number.isFinite(n)?n:fallback))}
  static trackState(project,track){return project?.trackState?.[track]??project?.trackState?.[String(track)]??{}}
  static isDisabled(project,clip){const t=Number(clip?.track),s=this.trackState(project,t);return ([0,1,2,3].includes(t)&&!!s.hidden)||([4,5,6].includes(t)&&!!s.muted)}
  static fix(project,assets=[]){
    if(!project||!Array.isArray(project.clips))return {changed:false,fixes:[],unresolved:['Proyecto inválido']};
    const fixes=[],unresolved=[],byId=new Map((assets||[]).map(a=>[a.id,a]));let changed=false;
    const note=(text)=>{fixes.push(text);changed=true};
    project.duration=Math.max(.25,Number(project.duration)||.25);
    for(const c of project.clips){
      const label=c.name||c.id||'clip',track=Number(c.track),inactive=this.isDisabled(project,c);
      if(!Number.isFinite(Number(c.start))) {c.start=0;note(`Inicio inválido corregido: ${label}`)}
      if(Number(c.start)<0){const old=Number(c.start),d=Math.max(.25,Number(c.duration)||.25);c.start=0;c.duration=Math.max(.25,d+old);note(`Inicio negativo recortado: ${label}`)}
      if(!Number.isFinite(Number(c.duration))||Number(c.duration)<=0){c.duration=.25;note(`Duración inválida corregida: ${label}`)}
      if(!inactive&&[0,1].includes(track)&&c.fitMode!=null&&!['cover','contain'].includes(c.fitMode)){c.fitMode='cover';note(`Encuadre normalizado: ${label}`)}
      if(!inactive&&[0,1].includes(track)){
        const ranges={brightness:[-100,100,0],contrast:[-90,100,0],saturation:[-100,200,0],hue:[-180,180,0]};
        for(const [field,[lo,hi,fallback]] of Object.entries(ranges)){if(c[field]==null)continue;const next=this.clamp(c[field],lo,hi,fallback);if(Number(c[field])!==next){c[field]=next;note(`${field} limitado al rango seguro: ${label}`)}}
      }
      if(!inactive&&c.keyframes!=null){
        const base={positionX:Number(c.x)||0,positionY:Number(c.y)||0,scale:Number(c.scale)||1,rotation:Number(c.rotation)||0,opacity:Number(c.opacity??1)};
        if(!c.keyframes||typeof c.keyframes!=='object')c.keyframes={};
        for(const side of ['start','end']){
          if(!c.keyframes[side]||typeof c.keyframes[side]!=='object'){c.keyframes[side]={...base};note(`Keyframe ${side==='start'?'inicial':'final'} reconstruido: ${label}`)}
          const k=c.keyframes[side],ranges={positionX:[-100,100,base.positionX],positionY:[-100,100,base.positionY],scale:[.25,3,base.scale],rotation:[-180,180,base.rotation],opacity:[0,1,base.opacity]};
          for(const [field,[lo,hi,fallback]] of Object.entries(ranges)){const next=this.clamp(k[field],lo,hi,fallback);if(Number(k[field])!==next){k[field]=next;note(`Keyframe ${field} normalizado: ${label}`)}}
        }
      }
      const asset=!inactive&&c.asset?byId.get(c.asset):null;
      if(!inactive&&c.asset&&!asset)unresolved.push(`Medio faltante: ${label}`);
      if(asset&&([4,5,6].includes(track)||([0,1].includes(track)&&asset.type==='video'))){
        let fi=this.clamp(c.fadeIn??.18,0,Math.max(.25,Number(c.duration)||.25),.18),fo=this.clamp(c.fadeOut??.25,0,Math.max(.25,Number(c.duration)||.25),.25),d=Math.max(.25,Number(c.duration)||.25);
        if(fi+fo>d){const scale=d/(fi+fo||1);fi*=scale;fo*=scale}
        if(Number(c.fadeIn??.18)!==fi){c.fadeIn=fi;note(`Fade de entrada normalizado: ${label}`)}
        if(Number(c.fadeOut??.25)!==fo){c.fadeOut=fo;note(`Fade de salida normalizado: ${label}`)}
      }
      if(asset?.duration&&['video','audio'].includes(asset.type)){
        const speed=this.clamp(c.speed??1,.25,4,1);if(Number(c.speed??1)!==speed){c.speed=speed;note(`Velocidad normalizada: ${label}`)}
        let offset=Math.max(0,Number(c.sourceOffset)||0);if(offset>asset.duration){offset=Math.max(0,asset.duration-.01);c.sourceOffset=offset;note(`Punto de entrada limitado al archivo fuente: ${label}`)}
        const available=Math.max(.01,Number(asset.duration)-offset),maxTimeline=Math.max(.25,available/speed);
        if(Number(c.duration)>maxTimeline+.01){c.duration=maxTimeline;note(`Duración ajustada al medio fuente: ${label}`)}
      }
      if(!inactive&&track===3&&Array.isArray(c.wordTimings)){
        const start=Number(c.start)||0,end=start+(Number(c.duration)||0),clean=[];
        for(const w of c.wordTimings){const word=String(w?.word||'').trim();if(!word)continue;let ws=Number(w?.start),we=Number(w?.end);if(!Number.isFinite(ws)||!Number.isFinite(we)||we<=ws)continue;ws=Math.max(start,Math.min(end,ws));we=Math.max(ws+.01,Math.min(end,we));if(we<=end+.001)clean.push({...w,word,start:ws,end:we})}
        clean.sort((a,b)=>a.start-b.start);let cursor=start;for(const w of clean){w.start=Math.max(cursor,w.start);w.end=Math.max(w.start+.01,Math.min(end,w.end));cursor=w.end}
        const differs=JSON.stringify(clean)!==JSON.stringify(c.wordTimings);if(differs){c.wordTimings=clean;note(`Tiempos de captions normalizados: ${label}`)}
      }
    }
    const maxEnd=project.clips.reduce((m,c)=>Math.max(m,(Number(c.start)||0)+(Number(c.duration)||0)),0);
    if(maxEnd>project.duration+.01){project.duration=+maxEnd.toFixed(3);note(`Duración del proyecto ampliada a ${project.duration}s`)}
    if(!project.clips.length)unresolved.push('El timeline está vacío.');
    return {changed,fixes:[...new Set(fixes)],unresolved:[...new Set(unresolved)]};
  }
}
if(typeof window!=='undefined')window.ProfitMenteQAAutofixEngine=ProfitMenteQAAutofixEngine;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteQAAutofixEngine;
