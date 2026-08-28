(function(){
  function boot(){
    if(typeof document==='undefined'||typeof project==='undefined'||typeof assets==='undefined'||typeof persist!=='function'||!window.ProfitMenteQAAutofixEngine||!window.ProfitMenteQAEngine){setTimeout(boot,80);return;}
    if(document.getElementById('qaAutofixBtn'))return;
    var qaBtn=document.getElementById('qaBtn'),report=document.getElementById('qaReport');if(!qaBtn||!report)return;
    var btn=document.createElement('button');btn.id='qaAutofixBtn';btn.type='button';btn.textContent='Auto-corregir seguro';btn.title='Corrige problemas tecnicos deterministas sin reemplazar medios ni tomar decisiones creativas';btn.style.marginTop='6px';report.parentNode.insertBefore(btn,report.nextSibling);
    var qa=new ProfitMenteQAEngine();
    btn.onclick=function(){
      var before=qa.inspect(project,assets),result=ProfitMenteQAAutofixEngine.fix(project,assets),after=qa.inspect(project,assets);
      if(!result.changed){setStatus(result.unresolved.length?'No hay correcciones automaticas seguras; quedan problemas que requieren intervencion':'QA ya esta normalizado');qaBtn.click();return;}
      persist();if(typeof drawTimeline==='function')drawTimeline();if(typeof syncForm==='function')syncForm();
      var playhead=document.getElementById('playhead');if(playhead){playhead.max=String(project.duration);playhead.value=String(Math.min(Number(playhead.value)||0,project.duration));}
      if(typeof renderAt==='function')renderAt(Number(playhead&&playhead.value)||0);qaBtn.click();
      var repaired=Math.max(0,before.issues.length-after.issues.length);setStatus(result.fixes.length+' ajuste(s) seguros aplicados · '+repaired+' error(es) resueltos · QA '+after.score+'/100');
    };
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
