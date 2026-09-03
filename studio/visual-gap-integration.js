(function(){
  function boot(){
    if(typeof document==='undefined'||typeof project==='undefined'||typeof assets==='undefined'||!window.ProfitMenteVisualGapEngine){setTimeout(boot,80);return}
    if(document.getElementById('visualGapFillBtn'))return;
    var anchor=document.getElementById('brollBtn');if(!anchor)return;
    var btn=document.createElement('button');btn.id='visualGapFillBtn';btn.type='button';btn.textContent='Completar huecos visuales';btn.title='Rellena solo espacios sin imagen/video usando medios locales disponibles y respeta pistas bloqueadas';anchor.parentNode.insertBefore(btn,anchor.nextSibling);
    function run(silent){
      var before=ProfitMenteVisualGapEngine.gaps(project),result=ProfitMenteVisualGapEngine.fill(project,assets);
      if(result.created.length){if(typeof persist==='function')persist();if(typeof drawTimeline==='function')drawTimeline();if(typeof renderAt==='function')renderAt(Number(document.getElementById('playhead')?.value)||0)}
      if(!silent){
        var reasons=new Set((result.unresolved||[]).map(function(item){return item&&item.reason}));
        if(result.created.length)setStatus(result.created.length+' clip(s) añadidos · '+before.length+' hueco(s) visuales cubiertos');
        else if(reasons.has('visual-tracks-locked'))setStatus('Huecos sin cambios: las pistas visuales disponibles están bloqueadas');
        else if(reasons.has('visual-tracks-hidden'))setStatus('Huecos sin cambios: las pistas visuales están ocultas');
        else if(result.unresolved.length)setStatus('No se pudieron cubrir todos los huecos: añade videos o imágenes compatibles');
        else setStatus('Timeline visual ya está cubierto');
      }
      return result;
    }
    btn.onclick=function(){run(false)};
    window.profitMenteVisualGapFill={run:run,gaps:function(){return ProfitMenteVisualGapEngine.gaps(project)}};
    window.addEventListener('profitmente:media-imported',function(){if(String(project.mode||'').toLowerCase().includes('autom'))run(true)});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
