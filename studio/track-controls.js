(function(){
  const AUDIO_TRACKS=new Set([4,5,6]);
  const VISUAL_TRACKS=new Set([0,1,2,3]);
  function ensureState(){
    project.trackState=project.trackState||{};
    for(let i=0;i<7;i++) project.trackState[i]=Object.assign({locked:false,hidden:false,muted:false},project.trackState[i]||{});
    return project.trackState;
  }
  function state(i){return ensureState()[i]}
  function isVisualHidden(i){return VISUAL_TRACKS.has(Number(i))&&!!state(Number(i)).hidden}
  function isAudioMuted(i){return AUDIO_TRACKS.has(Number(i))&&!!state(Number(i)).muted}
  function saveState(){ if(typeof persist==='function') persist(); if(typeof drawTimeline==='function') drawTimeline(); if(typeof renderAt==='function') renderAt(+document.querySelector('#playhead')?.value||0); }
  function button(icon,title,on,handler){
    const b=document.createElement('button'); b.type='button'; b.className='trackCtl'+(on?' active':''); b.textContent=icon; b.title=title; b.onclick=e=>{e.stopPropagation();handler()}; return b;
  }
  function decorate(){
    ensureState();
    document.querySelectorAll('.track').forEach((row,i)=>{
      const label=row.querySelector('span'); if(!label||label.querySelector('.trackControls'))return;
      const wrap=document.createElement('span'); wrap.className='trackControls'; const s=state(i);
      wrap.appendChild(button(s.locked?'🔒':'🔓',s.locked?'Desbloquear pista':'Bloquear pista',s.locked,()=>{s.locked=!s.locked;saveState()}));
      if(VISUAL_TRACKS.has(i)) wrap.appendChild(button(s.hidden?'🙈':'👁',s.hidden?'Mostrar pista':'Ocultar pista',s.hidden,()=>{s.hidden=!s.hidden;saveState()}));
      if(AUDIO_TRACKS.has(i)) wrap.appendChild(button(s.muted?'🔇':'🔊',s.muted?'Activar audio':'Silenciar pista',s.muted,()=>{s.muted=!s.muted;saveState()}));
      label.appendChild(wrap);
      if(s.locked){row.classList.add('trackLocked');row.querySelectorAll('.clip').forEach(c=>{c.style.pointerEvents='none';c.title='Pista bloqueada'})}
      if(s.hidden||s.muted) row.classList.add('trackDisabled');
    });
  }
  const baseDraw=drawTimeline;
  drawTimeline=function(){baseDraw();decorate()};
  if(window.audio&&typeof window.audio.schedule==='function'){
    const baseSchedule=window.audio.schedule.bind(window.audio);
    window.audio.schedule=async function(p,a,from,monitor){
      const states=ensureState(),copy={...p,clips:p.clips.filter(c=>!(AUDIO_TRACKS.has(Number(c.track))&&states[Number(c.track)]?.muted))};
      return baseSchedule(copy,a,from,monitor);
    };
  } else if(typeof audio!=='undefined'&&audio&&typeof audio.schedule==='function'){
    const baseSchedule=audio.schedule.bind(audio);
    audio.schedule=async function(p,a,from,monitor){
      const states=ensureState(),copy={...p,clips:p.clips.filter(c=>!(AUDIO_TRACKS.has(Number(c.track))&&states[Number(c.track)]?.muted))};
      return baseSchedule(copy,a,from,monitor);
    };
  }
  window.ProfitMenteTrackControls={ensureState,state,isVisualHidden,isAudioMuted};
  drawTimeline();
})();