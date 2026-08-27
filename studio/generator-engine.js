class ProfitMenteGeneratorEngine{
  hash(text){let h=2166136261;for(const ch of text){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
  pick(list,seed,offset=0){return list[(seed+offset)%list.length]}
  words(text){return String(text||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w=>w.length>3)}
  captionWords(text,start,duration){const raw=String(text||'').trim().split(/\s+/).filter(Boolean);if(!raw.length)return[];const weights=raw.map(w=>Math.max(1,w.replace(/[^\p{L}\p{N}]/gu,'').length*.32)),sum=weights.reduce((a,b)=>a+b,0);let cursor=start;return raw.map((word,i)=>{const d=duration*weights[i]/sum,seg={word,start:cursor,duration:d,end:cursor+d,index:i};cursor+=d;return seg})}
  generate(topic,duration=45){
    const clean=(topic||'idea de inversión con IA').trim(),seed=this.hash(clean),slice=Math.max(2,duration/5);
    const hooks=[`La mayoría está ignorando algo importante sobre ${clean}.`,`Esto puede cambiar tu forma de pensar sobre ${clean}.`,`Antes de usar ${clean}, mira esto.`,`Si te interesa ${clean}, evita cometer este error.`];
    const problems=[`El problema no es la falta de información: es no saber qué datos importan ni cuándo actuar.`,`Muchos toman decisiones por impulso, mezclan ruido con señales útiles y terminan reaccionando tarde.`,`Sin un proceso claro, comparar opciones y medir riesgo se vuelve lento e inconsistente.`];
    const solutions=[`Convierte ${clean} en un sistema: define objetivo, datos, reglas y límites antes de tomar una decisión.`,`Usa IA para resumir señales, comparar escenarios y ejecutar una checklist en vez de improvisar.`,`Automatiza la parte repetitiva de ${clean} y deja las decisiones críticas bajo reglas visibles y medibles.`];
    const proofs=[`Una buena automatización no promete adivinar el futuro: reduce errores repetitivos y obliga a seguir un proceso.`,`La ventaja aparece cuando cada decisión deja evidencia: qué señal viste, qué riesgo aceptaste y qué resultado obtuviste.`,`Cuando el proceso es consistente puedes revisar resultados, detectar fallos y mejorar una regla a la vez.`];
    const ctas=[`Guarda este video y sigue ProfitMente TV para más sistemas prácticos de IA y dinero.`,`Sigue ProfitMente TV si quieres más estrategias de IA explicadas sin humo.`,`Comenta “IA” y guarda este video para volver a esta estructura cuando la necesites.`];
    const parts=[['HOOK',this.pick(hooks,seed,1)],['PROBLEMA',this.pick(problems,seed,2)],['SOLUCIÓN',this.pick(solutions,seed,3)],['PRUEBA',this.pick(proofs,seed,4)],['CTA',this.pick(ctas,seed,5)]];
    const clips=[];
    parts.forEach((p,i)=>{
      const start=i*slice,d=Math.min(slice,duration-start),transition=i===0?'cut':this.pick(['fade','zoom','slide'],seed,i),capStart=start+.15,capDur=Math.max(.5,d-.3);
      clips.push({id:crypto.randomUUID(),track:0,name:p[0],start,duration:d,asset:null,sceneText:p[1],transition,motion:i%2?'push-in':'slow-zoom',keywords:this.words(`${clean} ${p[1]}`).slice(0,8)});
      clips.push({id:crypto.randomUUID(),track:3,name:p[1],start:capStart,duration:capDur,asset:null,style:i===0?'hook-pop':'dynamic',animation:'word-by-word',wordTimings:this.captionWords(p[1],capStart,capDur)});
    });
    clips.push({id:crypto.randomUUID(),track:6,name:'Narración automática pendiente',start:0,duration,asset:null,script:parts.map(p=>p[1]).join(' '),volume:1});
    return {clips,script:parts.map(p=>p[1]).join(' '),title:clean,seed};
  }
  scoreAsset(asset,keywords){const name=this.words(asset.name).join(' ');let score=0;for(const k of keywords||[])if(name.includes(k))score+=3;if(asset.type==='video')score+=1;return score}
  assignAssets(project,assets){const visual=assets.filter(a=>a.type==='video'||a.type==='image');if(!visual.length)return {primary:0,broll:0};let primary=0,broll=0,used=new Set();for(const c of project.clips.filter(c=>c.track===0&&!c.asset)){const ranked=[...visual].sort((a,b)=>this.scoreAsset(b,c.keywords)-this.scoreAsset(a,c.keywords)||Number(used.has(a.id))-Number(used.has(b.id)));const chosen=ranked[0];if(!chosen)continue;c.asset=chosen.id;used.add(chosen.id);primary++;const alt=ranked.find(a=>a.id!==chosen.id);if(alt&&c.duration>=4){project.clips.push({id:crypto.randomUUID(),track:1,name:`B-roll · ${c.name}`,start:c.start+c.duration*.46,duration:Math.min(2.4,c.duration*.38),asset:alt.id,transition:'fade',motion:'slow-zoom',keywords:c.keywords});broll++}}return {primary,broll:0+broll}}
}
window.ProfitMenteGeneratorEngine=ProfitMenteGeneratorEngine;