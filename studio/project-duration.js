(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  const MAX_DURATION=60*60;
  const finite=(value,fallback=0)=>{try{const n=Number(value);return Number.isFinite(n)?n:fallback}catch(_){return fallback}};
  const clipsOf=project=>Array.isArray(project?.clips)?project.clips:[];
  // Keep the real sanitized clip end here. Clamping each clip to MAX_DURATION
  // made a clip at/after the one-hour boundary look valid because both its end
  // and the project limit collapsed to exactly 3600s. Clamp only when choosing
  // a project duration; validation must still be able to see overflow.
  const safeEnd=c=>Math.max(0,finite(c?.start))+Math.max(0,finite(c?.duration));
  class ProfitMenteProjectDuration{
    static contentEnd(project){
      let end=0;
      for(const c of clipsOf(project))end=Math.max(end,safeEnd(c));
      return end;
    }
    static outside(project){
      const limit=Math.max(0,Math.min(MAX_DURATION,finite(project?.duration)));
      return clipsOf(project).filter(c=>safeEnd(c)>limit+.001);
    }
    static fit(project,{minimum=1,padding=0}={}){
      if(!project||typeof project!=='object')return 0;
      const min=Math.max(1,finite(minimum,1));
      const pad=Math.max(0,finite(padding));
      const next=Math.min(MAX_DURATION,Math.max(min,this.contentEnd(project)+pad));
      project.duration=Number(next.toFixed(3));
      return project.duration;
    }
    static sanitize(project){
      if(!project||typeof project!=='object')return 0;
      const current=finite(project.duration,45);
      project.duration=Number(Math.max(1,Math.min(MAX_DURATION,current)).toFixed(3));
      return project.duration;
    }
  }
  root.ProfitMenteProjectDuration=ProfitMenteProjectDuration;
  if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteProjectDuration;
  if(typeof document==='undefined')return;
  const $=s=>document.querySelector(s),durationInput=$('#duration');if(!durationInput)return;
  const wrap=durationInput.closest('label');if(!wrap||$('#fitProjectDurationBtn'))return;
  const row=document.createElement('div');row.className='projectDurationTools';
  const btn=document.createElement('button');btn.type='button';btn.id='fitProjectDurationBtn';btn.textContent='↔ Duración = contenido';btn.title='Ajusta la duración del proyecto al final del último clip sin recortar material';
  const info=document.createElement('small');info.id='projectDurationInfo';row.append(btn,info);wrap.after(row);
  function refresh(){
    const end=ProfitMenteProjectDuration.contentEnd(project),outside=ProfitMenteProjectDuration.outside(project);
    info.textContent=outside.length?`⚠ ${outside.length} clip(s) pasan del final · contenido hasta ${end.toFixed(2)}s`:`Contenido hasta ${end.toFixed(2)}s`;
    row.classList.toggle('warn',outside.length>0);
  }
  btn.onclick=()=>{
    const before=finite(project.duration),next=ProfitMenteProjectDuration.fit(project);
    durationInput.value=next;const p=$('#playhead');if(p){p.max=next;if(finite(p.value)>next)p.value=next}
    if(typeof persist==='function')persist();if(typeof drawTimeline==='function')drawTimeline();if(typeof renderAt==='function')renderAt(+p?.value||0);
    if(typeof setStatus==='function')setStatus(`Duración ajustada ${before.toFixed(2)}s → ${next.toFixed(2)}s sin recortar clips`);refresh();
  };
  durationInput.addEventListener('change',()=>{
    const requested=finite(durationInput.value,project?.duration??45);
    project.duration=requested;
    const value=ProfitMenteProjectDuration.sanitize(project);durationInput.value=value;
    const p=$('#playhead');if(p){p.max=value;if(finite(p.value)>value)p.value=value}
    if(typeof persist==='function')persist();
    if(typeof drawTimeline==='function')drawTimeline();
    if(typeof renderAt==='function')void renderAt(+p?.value||0);
    requestAnimationFrame(refresh)
  });
  const basePersist=typeof persist==='function'?persist:null;
  if(basePersist){persist=function(){ProfitMenteProjectDuration.sanitize(project);const r=basePersist.apply(this,arguments);refresh();return r}}
  ProfitMenteProjectDuration.sanitize(project);durationInput.value=project.duration;refresh();
})();