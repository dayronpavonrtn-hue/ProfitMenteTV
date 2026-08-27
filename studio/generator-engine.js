class ProfitMenteGeneratorEngine{
  generate(topic,duration=45){
    const clean=(topic||'idea de inversión con IA').trim();
    const parts=[
      ['HOOK',`¿Y si ${clean} pudiera cambiar cómo manejas tu dinero?`],
      ['PROBLEMA',`La mayoría pierde tiempo buscando información y tomando decisiones sin un sistema claro.`],
      ['SOLUCIÓN',`Usa IA para organizar datos, comparar escenarios y detectar oportunidades con reglas definidas.`],
      ['PRUEBA',`La clave no es adivinar: es automatizar análisis, límites de riesgo y revisión constante.`],
      ['CTA',`Sigue ProfitMente TV para aprender a usar IA con una estrategia más inteligente.`]
    ];
    const slice=Math.max(2,duration/parts.length);
    const clips=[];
    parts.forEach((p,i)=>{
      const start=i*slice,d=Math.min(slice,duration-start);
      clips.push({id:crypto.randomUUID(),track:0,name:p[0],start,duration:d,asset:null,sceneText:p[1],transition:i?'fade':'cut'});
      clips.push({id:crypto.randomUUID(),track:3,name:p[1],start,duration:d,asset:null,style:'dynamic'});
    });
    clips.push({id:crypto.randomUUID(),track:6,name:'Narración automática pendiente',start:0,duration,asset:null,script:parts.map(p=>p[1]).join(' '),volume:1});
    return {clips,script:parts.map(p=>p[1]).join(' '),title:clean};
  }
  assignAssets(project,assets){
    const visual=assets.filter(a=>a.type==='video'||a.type==='image');
    if(!visual.length)return 0;
    let n=0,i=0;
    for(const c of project.clips.filter(c=>c.track===0&&!c.asset)){
      c.asset=visual[i%visual.length].id;i++;n++;
    }
    return n;
  }
}
window.ProfitMenteGeneratorEngine=ProfitMenteGeneratorEngine;