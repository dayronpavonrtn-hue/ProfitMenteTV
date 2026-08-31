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
    clips.push({id:crypto.randomUUID(),track:2,name:clean,start:.2,duration:Math.max(.8,Math.min(3.6,slice-.35)),asset:null,textStyle:'title',textAnimation:this.pick(['pop','slide-up','fade'],seed,7),textX:0,textY:-28,fontSize:40,textColor:'#FFE66D',boxColor:'#000000',boxOpacity:.55});
    clips.push({id:crypto.randomUUID(),track:6,name:'Narración automática pendiente',start:0,duration,asset:null,script:parts.map(p=>p[1]).join(' '),volume:1});
    return {clips,script:parts.map(p=>p[1]).join(' '),title:clean,seed};
  }
  scoreAsset(asset,keywords,projectFormat='9:16',requiredDuration=0){
    const name=this.words(asset.name).join(' ');let score=0;
    for(const k of keywords||[])if(name.includes(k))score+=3;
    if(asset.type==='video')score+=1.25;
    const width=Number(asset.width)||0,height=Number(asset.height)||0;
    if(width&&height){const portrait=height>width,landscape=width>height;if(projectFormat==='9:16')score+=portrait?3:(landscape?-2:0);else if(projectFormat==='16:9')score+=landscape?3:(portrait?-2:0);else score+=Math.abs(width-height)/Math.max(width,height)<.25?2:.25;const shortSide=Math.min(width,height),longSide=Math.max(width,height);if(shortSide>=720&&longSide>=1280)score+=1.5;if(shortSide<480)score-=2}
    if(asset.type==='video'&&requiredDuration>0){const duration=Number(asset.duration)||0;if(duration>=requiredDuration)score+=2;else if(duration>0)score-=8}return score
  }
  sourceOffset(asset,clip,seed){if(asset.type!=='video')return 0;const available=Math.max(0,(Number(asset.duration)||0)-Math.max(.05,Number(clip.duration)||0));if(available<=.05)return 0;const fraction=((seed%997)+1)/998;return +(available*fraction).toFixed(3)}
  diversityScore(asset,keywords,format,required,usage){return this.scoreAsset(asset,keywords,format,required)-(Number(usage.get(asset.id))||0)*4.5}
  soundtrackScore(asset,projectDuration=45){
    if(asset?.type!=='audio')return -Infinity;
    const words=this.words(asset.name),joined=words.join(' '),music=['music','musica','beat','song','cancion','instrumental','background','fondo','lofi','soundtrack','track'],exclude=['voice','voz','narration','narracion','dialogue','dialogo','sfx','effect','efecto','speech','locucion'];
    if(exclude.some(k=>joined.includes(k)))return -Infinity;
    const matches=music.filter(k=>joined.includes(k)).length;if(!matches)return -Infinity;
    const d=Number(asset.duration)||0,need=Math.max(8,Math.min(Number(projectDuration)||45,20));
    if(d>0&&d<need)return -Infinity;
    let score=matches*4;if(d>=projectDuration)score+=4;else if(d>=need)score+=2;if(joined.includes('background')||joined.includes('fondo')||joined.includes('instrumental'))score+=2;return score;
  }
  assignSoundtrack(project,assets){
    if((project.clips||[]).some(c=>Number(c.track)===5&&c.asset))return 0;
    const duration=Math.max(.25,Number(project.duration)||45),ranked=(assets||[]).filter(a=>a?.type==='audio').map(a=>({a,score:this.soundtrackScore(a,duration)})).filter(x=>Number.isFinite(x.score)).sort((x,y)=>y.score-x.score||String(x.a.name).localeCompare(String(y.a.name)));
    const chosen=ranked[0]?.a;if(!chosen)return 0;
    const available=Number(chosen.duration)||duration,clipDuration=Math.max(.25,Math.min(duration,available));
    project.clips.push({id:crypto.randomUUID(),track:5,name:`Música · ${chosen.name}`,start:0,duration:clipDuration,asset:chosen.id,sourceOffset:0,volume:.18,duckVolume:.10,ducking:true,fadeIn:Math.min(.4,clipDuration/4),fadeOut:Math.min(.8,clipDuration/3)});
    return 1;
  }
  assignAssets(project,assets){
    const visual=assets.filter(a=>a.type==='video'||a.type==='image');let primary=0,broll=0,skipped=0,sequence=0;const usage=new Map(),seed=this.hash(project.name||project.title||'ProfitMente');
    const mark=a=>usage.set(a.id,(usage.get(a.id)||0)+1);
    for(const c of project.clips.filter(c=>c.track===0&&!c.asset)){
      const required=Math.max(.05,Number(c.duration)||0),eligible=visual.filter(a=>a.type!=='video'||!a.duration||Number(a.duration)+.05>=required),pool=eligible.length?eligible:visual.filter(a=>a.type==='image');
      if(!pool.length){skipped++;continue}
      const ranked=[...pool].sort((a,b)=>this.diversityScore(b,c.keywords,project.format,required,usage)-this.diversityScore(a,c.keywords,project.format,required,usage)||String(a.name).localeCompare(String(b.name)));
      const chosen=ranked[0];if(!chosen){skipped++;continue}
      c.asset=chosen.id;c.sourceOffset=this.sourceOffset(chosen,c,seed+sequence*31);mark(chosen);primary++;sequence++;
      if(c.duration>=4){
        const bd=Math.min(2.4,c.duration*.38),alts=ranked.filter(a=>a.id!==chosen.id&&(a.type!=='video'||!a.duration||Number(a.duration)>=bd+.05)).sort((a,b)=>this.diversityScore(b,c.keywords,project.format,bd,usage)-this.diversityScore(a,c.keywords,project.format,bd,usage)||String(a.name).localeCompare(String(b.name))),alt=alts[0];
        if(alt){const bc={id:crypto.randomUUID(),track:1,name:`B-roll · ${c.name}`,start:c.start+c.duration*.46,duration:bd,asset:alt.id,transition:'fade',motion:'slow-zoom',keywords:c.keywords};bc.sourceOffset=this.sourceOffset(alt,bc,seed+sequence*47);project.clips.push(bc);mark(alt);broll++;sequence++}
      }
    }
    const music=this.assignSoundtrack(project,assets);
    return {primary,broll,skipped,unique:usage.size,music};
  }
}
window.ProfitMenteGeneratorEngine=ProfitMenteGeneratorEngine;