(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  class ProfitMenteProjectDuration{
    static contentEnd(project){
      let end=0;
      for(const c of project?.clips||[]){
        const start=Math.max(0,Number(c?.start)||0),duration=Math.max(0,Number(c?.duration)||0);
        end=Math.max(end,start+duration);
      }
      return end;
    }
    static outside(project){
      const limit=Math.max(0,Number(project?.duration)||0);
      return (project?.clips||[]).filter(c=>(Number(c?.start)||0)+(Number(c?.duration)||0)>limit+.001);
    }
    static fit(project,{minimum=1,padding=0}={}){
      if(!project)return 0;
      const next=Math.max(Number(minimum)||1,this.contentEnd(project)+Math.max(0,Number(padding)||0));
      project.duration=Number(next.toFixed(3));
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
    const before=Number(project.duration)||0,next=ProfitMenteProjectDuration.fit(project);
    durationInput.value=next;const p=$('#playhead');if(p){p.max=next;if(Number(p.value)>next)p.value=next}
    if(typeof persist==='function')persist();if(typeof drawTimeline==='function')drawTimeline();if(typeof renderAt==='function')renderAt(+p?.value||0);
    if(typeof setStatus==='function')setStatus(`Duración ajustada ${before.toFixed(2)}s → ${next.toFixed(2)}s sin recortar clips`);refresh();
  };
  durationInput.addEventListener('change',()=>requestAnimationFrame(refresh));
  const basePersist=typeof persist==='function'?persist:null;
  if(basePersist){persist=function(){const r=basePersist.apply(this,arguments);refresh();return r}}
  refresh();
})();
