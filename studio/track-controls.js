(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports){module.exports=api;return}
  root.ProfitMenteTrackSoloEngine=api.ProfitMenteTrackSoloEngine;
  if(typeof document==='undefined'||typeof project==='undefined')return;

  const engine=api.ProfitMenteTrackSoloEngine;
  const AUDIO_TRACKS=new Set(engine.AUDIO_TRACKS);
  const VISUAL_TRACKS=new Set(engine.VISUAL_TRACKS);

  function ensureState(){project.trackState=engine.ensure(project.trackState);engine.apply(project.trackState);return project.trackState}
  function state(i){return engine.state(ensureState(),i)}
  function isVisualHidden(i){ensureState();return engine.isVisualHidden(project.trackState,Number(i))}
  function isAudioMuted(i){ensureState();return engine.isAudioMuted(project.trackState,Number(i))}
  function saveState(message=''){
    engine.apply(ensureState());
    if(typeof persist==='function')persist();
    if(typeof drawTimeline==='function')drawTimeline();
    if(typeof renderAt==='function')renderAt(+document.querySelector('#playhead')?.value||0);
    if(message&&typeof setStatus==='function')setStatus(message);
  }
  function button(icon,title,on,handler){
    const b=document.createElement('button');b.type='button';b.className='trackCtl'+(on?' active':'');b.textContent=icon;b.title=title;b.onclick=e=>{e.stopPropagation();handler()};return b;
  }
  function decorate(){
    const states=ensureState();
    document.querySelectorAll('.track').forEach((row,i)=>{
      const label=row.querySelector('span');if(!label||label.querySelector('.trackControls'))return;
      const wrap=document.createElement('span');wrap.className='trackControls';const s=states[i];
      wrap.appendChild(button(s.locked?'🔒':'🔓',s.locked?'Desbloquear pista':'Bloquear pista',s.locked,()=>{s.locked=!s.locked;saveState(s.locked?'Pista bloqueada':'Pista desbloqueada')}));
      if(VISUAL_TRACKS.has(i)){
        wrap.appendChild(button('S',s.solo?'Quitar Solo visual':'Solo visual: mostrar únicamente las pistas visuales en Solo',s.solo,()=>{engine.toggleSolo(states,i);saveState(s.solo?'Solo visual activado':'Solo visual actualizado')}));
        const baseHidden=engine.baseHidden(s);
        wrap.appendChild(button(baseHidden?'🙈':'👁',baseHidden?'Mostrar pista':'Ocultar pista',baseHidden,()=>{engine.toggleHidden(states,i);saveState(baseHidden?'Pista visual mostrada':'Pista visual ocultada')}));
      }
      if(AUDIO_TRACKS.has(i)){
        wrap.appendChild(button('S',s.solo?'Quitar Solo de audio':'Solo de audio: escuchar únicamente las pistas de audio en Solo',s.solo,()=>{engine.toggleSolo(states,i);saveState(s.solo?'Solo de audio activado':'Solo de audio actualizado')}));
        const baseMuted=engine.baseMuted(s);
        wrap.appendChild(button(baseMuted?'🔇':'🔊',baseMuted?'Activar audio':'Silenciar pista',baseMuted,()=>{engine.toggleMuted(states,i);saveState(baseMuted?'Audio activado':'Pista silenciada')}));
      }
      label.appendChild(wrap);
      if(s.locked){row.classList.add('trackLocked');row.querySelectorAll('.clip').forEach(c=>{c.style.pointerEvents='none';c.title='Pista bloqueada'})}
      if(isVisualHidden(i)||isAudioMuted(i))row.classList.add('trackDisabled');
      if(s.solo)row.classList.add('trackSolo');
    });
  }
  const baseDraw=drawTimeline;
  drawTimeline=function(){baseDraw();decorate()};
  if(window.audio&&typeof window.audio.schedule==='function'){
    const baseSchedule=window.audio.schedule.bind(window.audio);
    window.audio.schedule=async function(p,a,from,monitor){
      engine.apply(ensureState());
      const copy={...p,clips:p.clips.filter(c=>!(AUDIO_TRACKS.has(Number(c.track))&&isAudioMuted(Number(c.track))))};
      return baseSchedule(copy,a,from,monitor);
    };
  }else if(typeof audio!=='undefined'&&audio&&typeof audio.schedule==='function'){
    const baseSchedule=audio.schedule.bind(audio);
    audio.schedule=async function(p,a,from,monitor){
      engine.apply(ensureState());
      const copy={...p,clips:p.clips.filter(c=>!(AUDIO_TRACKS.has(Number(c.track))&&isAudioMuted(Number(c.track))))};
      return baseSchedule(copy,a,from,monitor);
    };
  }
  window.ProfitMenteTrackControls={ensureState,state,isVisualHidden,isAudioMuted,soloEngine:engine};
  engine.apply(ensureState());
  drawTimeline();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const VISUAL_TRACKS=[0,1,2,3],AUDIO_TRACKS=[4,5,6];
  const groupFor=track=>VISUAL_TRACKS.includes(Number(track))?VISUAL_TRACKS:AUDIO_TRACKS.includes(Number(track))?AUDIO_TRACKS:null;
  class ProfitMenteTrackSoloEngine{
    static get VISUAL_TRACKS(){return VISUAL_TRACKS}
    static get AUDIO_TRACKS(){return AUDIO_TRACKS}
    static ensure(trackState){
      const out=trackState&&typeof trackState==='object'&&!Array.isArray(trackState)?trackState:{};
      for(let i=0;i<7;i++)out[i]=Object.assign({locked:false,hidden:false,muted:false,solo:false},out[i]||out[String(i)]||{});
      return out;
    }
    static state(trackState,track){return this.ensure(trackState)[Number(track)]}
    static baseHidden(s){return s?._soloVisualActive?!!s._soloHiddenBase:!!s?.hidden}
    static baseMuted(s){return s?._soloAudioActive?!!s._soloMutedBase:!!s?.muted}
    static applyGroup(trackState,tracks){
      const states=this.ensure(trackState),solo=tracks.filter(i=>!!states[i].solo),hasSolo=solo.length>0,isVisual=tracks===VISUAL_TRACKS;
      for(const i of tracks){const s=states[i];
        if(isVisual){
          if(hasSolo){if(!s._soloVisualActive)s._soloHiddenBase=!!s.hidden;s._soloVisualActive=true;s.hidden=!!s._soloHiddenBase||!s.solo}
          else if(s._soloVisualActive){s.hidden=!!s._soloHiddenBase;delete s._soloHiddenBase;delete s._soloVisualActive}
        }else{
          if(hasSolo){if(!s._soloAudioActive)s._soloMutedBase=!!s.muted;s._soloAudioActive=true;s.muted=!!s._soloMutedBase||!s.solo}
          else if(s._soloAudioActive){s.muted=!!s._soloMutedBase;delete s._soloMutedBase;delete s._soloAudioActive}
        }
      }
      return states;
    }
    static apply(trackState){const states=this.ensure(trackState);this.applyGroup(states,VISUAL_TRACKS);this.applyGroup(states,AUDIO_TRACKS);return states}
    static toggleSolo(trackState,track){const states=this.ensure(trackState),s=this.state(states,track);if(!groupFor(track))return false;s.solo=!s.solo;this.applyGroup(states,groupFor(track));return s.solo}
    static toggleHidden(trackState,track){const states=this.ensure(trackState),s=this.state(states,track);if(!VISUAL_TRACKS.includes(Number(track)))return false;const next=!this.baseHidden(s);if(s._soloVisualActive)s._soloHiddenBase=next;else s.hidden=next;this.applyGroup(states,VISUAL_TRACKS);return next}
    static toggleMuted(trackState,track){const states=this.ensure(trackState),s=this.state(states,track);if(!AUDIO_TRACKS.includes(Number(track)))return false;const next=!this.baseMuted(s);if(s._soloAudioActive)s._soloMutedBase=next;else s.muted=next;this.applyGroup(states,AUDIO_TRACKS);return next}
    static isVisualHidden(trackState,track){const s=this.state(trackState,track);return VISUAL_TRACKS.includes(Number(track))?!!s.hidden:false}
    static isAudioMuted(trackState,track){const s=this.state(trackState,track);return AUDIO_TRACKS.includes(Number(track))?!!s.muted:false}
  }
  return {ProfitMenteTrackSoloEngine,VISUAL_TRACKS,AUDIO_TRACKS};
});
