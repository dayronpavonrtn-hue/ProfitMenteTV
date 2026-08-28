class ProfitMenteQAEngine{
  inspect(project,assets){
    const issues=[],warnings=[]; const ids=new Set(assets.map(a=>a.id));
    const state=track=>{const s=project.trackState?.[track]??project.trackState?.[String(track)]??{};return s&&typeof s==='object'?s:{}};
    const hidden=track=>!!state(track).hidden,muted=track=>!!state(track).muted;
    if(!project.clips?.length) issues.push('El timeline está vacío.');
    const checkKeyframe=(c,k,label)=>{
      if(!k||typeof k!=='object'){issues.push(`Keyframe ${label} inválido: ${c.name||c.id}`);return}
      const ranges={positionX:[-100,100],positionY:[-100,100],scale:[.25,3],rotation:[-180,180],opacity:[0,1]};
      for(const [field,[lo,hi]] of Object.entries(ranges)){const v=Number(k[field]);if(!Number.isFinite(v)||v<lo||v>hi)issues.push(`Keyframe ${label} ${field} fuera de rango: ${c.name||c.id}`)}
    };
    for(const c of project.clips||[]){
      if(c.start<0||c.duration<=0||c.start+c.duration>project.duration+.01) issues.push(`Clip fuera de rango: ${c.name||c.id}`);
      if(c.asset&&!ids.has(c.asset)) issues.push(`Medio faltante: ${c.name||c.id}`);
      if([0,1,2].includes(Number(c.track))&&c.fitMode!=null&&!['cover','contain'].includes(c.fitMode)) issues.push(`Encuadre inválido: ${c.name||c.id}`);
      if(c.keyframes!=null){if(!c.keyframes.start||!c.keyframes.end)issues.push(`Keyframes incompletos: ${c.name||c.id}`);else{checkKeyframe(c,c.keyframes.start,'inicio');checkKeyframe(c,c.keyframes.end,'fin')}}
      const a=c.asset&&assets.find(x=>x.id===c.asset),sourceOffset=Math.max(0,Number(c.sourceOffset)||0),speed=Math.max(.25,Math.min(4,Number(c.speed)||1));
      if(a?.duration&&['video','audio'].includes(a.type)){
        const sourceNeeded=Math.max(0,Number(c.duration)||0)*speed;
        if(sourceOffset>a.duration+.01) issues.push(`Punto de entrada fuera del archivo fuente: ${c.name||a.name}`);
        else if(sourceOffset+sourceNeeded>a.duration+.15) warnings.push(`Recorte supera el final del archivo fuente: ${c.name||a.name} · requiere ${(sourceOffset+sourceNeeded).toFixed(2)}s de ${Number(a.duration).toFixed(2)}s`);
      }
    }
    const visuals=(project.clips||[]).filter(c=>[0,1].includes(Number(c.track))&&c.asset&&!hidden(Number(c.track)));
    if(!visuals.length) warnings.push('No hay video o imagen visible asignado a las pistas visuales.');
    const audio=(project.clips||[]).filter(c=>[4,5,6].includes(Number(c.track))&&c.asset&&!c.muted&&!muted(Number(c.track)));
    if(!audio.length) warnings.push('No hay voz, música ni SFX activos.');
    const captions=(project.clips||[]).filter(c=>Number(c.track)===3&&c.name&&!hidden(3));
    if(!captions.length) warnings.push('No hay subtítulos/captions visibles.');
    const disabled=[];
    for(let i=0;i<=6;i++){const s=state(i);if(s.hidden||s.muted)disabled.push(i)}
    if(disabled.length) warnings.push(`Pistas desactivadas para exportación: ${disabled.join(', ')}`);
    const usedVisualIds=new Set(visuals.map(c=>c.asset));
    for(const a of assets.filter(x=>usedVisualIds.has(x.id)&&['video','image'].includes(x.type))){
      if(a.width&&a.height){
        const shortSide=Math.min(a.width,a.height),longSide=Math.max(a.width,a.height);
        if(shortSide<720||longSide<1280) warnings.push(`Resolución baja para render profesional: ${a.name} (${a.width}×${a.height})`);
        const portrait=a.height>a.width,landscape=a.width>a.height;
        const usesCover=visuals.some(c=>c.asset===a.id&&(c.fitMode||'cover')==='cover');
        if(usesCover&&project.format==='9:16'&&landscape&&a.width/a.height>1.5) warnings.push(`Medio horizontal requerirá recorte fuerte en 9:16: ${a.name}`);
        if(usesCover&&project.format==='16:9'&&portrait&&a.height/a.width>1.5) warnings.push(`Medio vertical requerirá recorte fuerte en 16:9: ${a.name}`);
      }
    }
    for(let track=0;track<=6;track++){
      const cs=(project.clips||[]).filter(c=>Number(c.track)===track).sort((a,b)=>a.start-b.start);
      for(let i=1;i<cs.length;i++) if(cs[i].start<cs[i-1].start+cs[i-1].duration-.01&&![1,2,3,4,5,6].includes(track)) warnings.push(`Solapamiento en ${track}: ${cs[i-1].name} / ${cs[i].name}`);
    }
    const visualSeconds=this.coverage(visuals,project.duration),captionSeconds=this.coverage(captions,project.duration),safeDuration=Math.max(.001,Number(project.duration)||0);
    const score=Math.max(0,100-issues.length*25-warnings.length*7-Math.round(Math.max(0,.75-visualSeconds/safeDuration)*30));
    return {ok:issues.length===0,score,issues,warnings,metrics:{duration:project.duration,clips:(project.clips||[]).length,assets:assets.length,visualCoverage:+(visualSeconds/safeDuration*100).toFixed(1),captionCoverage:+(captionSeconds/safeDuration*100).toFixed(1),activeAudioClips:audio.length,disabledTracks:disabled}};
  }
  coverage(clips,duration){
    const ranges=clips.map(c=>[Math.max(0,c.start),Math.min(duration,c.start+c.duration)]).filter(r=>r[1]>r[0]).sort((a,b)=>a[0]-b[0]);
    if(!ranges.length)return 0; let total=0,[s,e]=ranges[0];
    for(const [a,b] of ranges.slice(1)){if(a<=e)e=Math.max(e,b);else{total+=e-s;s=a;e=b}} return total+e-s;
  }
}
window.ProfitMenteQAEngine=ProfitMenteQAEngine;