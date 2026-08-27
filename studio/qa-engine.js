class ProfitMenteQAEngine{
  inspect(project,assets){
    const issues=[],warnings=[]; const ids=new Set(assets.map(a=>a.id));
    if(!project.clips?.length) issues.push('El timeline está vacío.');
    for(const c of project.clips||[]){
      if(c.start<0||c.duration<=0||c.start+c.duration>project.duration+.01) issues.push(`Clip fuera de rango: ${c.name||c.id}`);
      if(c.asset&&!ids.has(c.asset)) issues.push(`Medio faltante: ${c.name||c.id}`);
      const a=c.asset&&assets.find(x=>x.id===c.asset),sourceOffset=Math.max(0,Number(c.sourceOffset)||0);
      if(a?.duration&&['video','audio'].includes(a.type)&&sourceOffset+c.duration>a.duration+.15) warnings.push(`Recorte supera el final del archivo fuente: ${c.name||a.name}`);
    }
    const visuals=(project.clips||[]).filter(c=>[0,1].includes(c.track)&&c.asset);
    if(!visuals.length) warnings.push('No hay video o imagen asignado a las pistas visuales.');
    const audio=(project.clips||[]).filter(c=>[4,5,6].includes(c.track)&&c.asset);
    if(!audio.length) warnings.push('No hay voz, música ni SFX asignados.');
    const captions=(project.clips||[]).filter(c=>c.track===3&&c.name);
    if(!captions.length) warnings.push('No hay subtítulos/captions.');
    const usedVisualIds=new Set(visuals.map(c=>c.asset));
    for(const a of assets.filter(x=>usedVisualIds.has(x.id)&&['video','image'].includes(x.type))){
      if(a.width&&a.height){
        const shortSide=Math.min(a.width,a.height),longSide=Math.max(a.width,a.height);
        if(shortSide<720||longSide<1280) warnings.push(`Resolución baja para render profesional: ${a.name} (${a.width}×${a.height})`);
        const portrait=a.height>a.width,landscape=a.width>a.height;
        if(project.format==='9:16'&&landscape&&a.width/a.height>1.5) warnings.push(`Medio horizontal requerirá recorte fuerte en 9:16: ${a.name}`);
        if(project.format==='16:9'&&portrait&&a.height/a.width>1.5) warnings.push(`Medio vertical requerirá recorte fuerte en 16:9: ${a.name}`);
      }
    }
    for(let track=0;track<=6;track++){
      const cs=(project.clips||[]).filter(c=>c.track===track).sort((a,b)=>a.start-b.start);
      for(let i=1;i<cs.length;i++) if(cs[i].start<cs[i-1].start+cs[i-1].duration-.01&&![1,2,3,4,5,6].includes(track)) warnings.push(`Solapamiento en ${track}: ${cs[i-1].name} / ${cs[i].name}`);
    }
    const visualSeconds=this.coverage(visuals,project.duration),captionSeconds=this.coverage(captions,project.duration);
    const score=Math.max(0,100-issues.length*25-warnings.length*7-Math.round(Math.max(0,.75-visualSeconds/project.duration)*30));
    return {ok:issues.length===0,score,issues,warnings,metrics:{duration:project.duration,clips:(project.clips||[]).length,assets:assets.length,visualCoverage:+(visualSeconds/project.duration*100).toFixed(1),captionCoverage:+(captionSeconds/project.duration*100).toFixed(1)}};
  }
  coverage(clips,duration){
    const ranges=clips.map(c=>[Math.max(0,c.start),Math.min(duration,c.start+c.duration)]).filter(r=>r[1]>r[0]).sort((a,b)=>a[0]-b[0]);
    if(!ranges.length)return 0; let total=0,[s,e]=ranges[0];
    for(const [a,b] of ranges.slice(1)){if(a<=e)e=Math.max(e,b);else{total+=e-s;s=a;e=b}} return total+e-s;
  }
}
window.ProfitMenteQAEngine=ProfitMenteQAEngine;