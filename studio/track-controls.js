(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports){module.exports=api;return}
  root.ProfitMenteTrackSoloEngine=api.ProfitMenteTrackSoloEngine;
  if(typeof document==='undefined'||typeof project==='undefined')return;

  const engine=api.ProfitMenteTrackSoloEngine;
  const AUDIO_TRACKS=new Set(engine.AUDIO_TRACKS);
  const VISUAL_TRACKS=new Set(engine.VISUAL_TRACKS);

  function ensureState(){
    const states=engine.merge(project.trackState,project.trackStates);
    project.trackState=states;
    project.trackStates=states;
    engine.apply(states);
    return states;
  }
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
  if(typeof renderAt==='function'){
    const baseRenderAt=renderAt;
    renderAt=async function(t){
      const originalClips=project.clips;
      project.clips=engine.filterRenderableClips(originalClips,ensureState());
      try{return await baseRenderAt(t)}finally{project.clips=originalClips}
    };
  }
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
  const strictFlag=value=>value===true;
  const groupFor=track=>VISUAL_TRACKS.includes(Number(track))?VISUAL_TRACKS:AUDIO_TRACKS.includes(Number(track))?AUDIO_TRACKS:null;
  class ProfitMenteTrackSoloEngine{
    static get VISUAL_TRACKS(){return VISUAL_TRACKS}
    static get AUDIO_TRACKS(){return AUDIO_TRACKS}
    static canonicalTrack(value){
      if(typeof value==='boolean'||value===null||value===undefined)return null;
      if(typeof value==='number')return Number.isFinite(value)&&Number.isInteger(value)&&value>=0&&value<=6?value:null;
      if(typeof value==='string'){
        const raw=value.trim();if(!raw)return null;
        const numeric=Number(raw);
        return Number.isFinite(numeric)&&Number.isInteger(numeric)&&numeric>=0&&numeric<=6?numeric:null;
      }
      return null;
    }
    static rawState(stateMap,track){
      const target=this.canonicalTrack(track),merged={};
      if(target===null||!stateMap||typeof stateMap!=='object'||Array.isArray(stateMap))return merged;
      for(const [key,value] of Object.entries(stateMap)){
        if(this.canonicalTrack(key)!==target||!value||typeof value!=='object'||Array.isArray(value))continue;
        Object.assign(merged,value);
      }
      return merged;
    }
    static normalizedState(raw){
      const source=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
      const out={...source};
      for(const key of ['locked','hidden','muted','solo'])out[key]=strictFlag(source[key]);
      for(const key of ['_soloVisualActive','_soloHiddenBase','_soloAudioActive','_soloMutedBase']){
        if(key in source)out[key]=strictFlag(source[key]);
      }
      return out;
    }
    static ensure(trackState){
      const out={};
      for(let i=0;i<7;i++)out[i]=this.normalizedState(this.rawState(trackState,i));
      return out;
    }
    static merge(current,legacy){
      const cur=current&&typeof current==='object'&&!Array.isArray(current)?current:{};
      const old=legacy&&typeof legacy==='object'&&!Array.isArray(legacy)?legacy:{};
      const out={};
      for(let i=0;i<7;i++)out[i]=this.normalizedState({...this.rawState(old,i),...this.rawState(cur,i)});
      return out;
    }
    static state(trackState,track){const target=this.canonicalTrack(track);return target===null?{}:this.normalizedState(this.rawState(trackState,target))}
    static baseHidden(s){return strictFlag(s?._soloVisualActive)?strictFlag(s?._soloHiddenBase):strictFlag(s?.hidden)}
    static baseMuted(s){return strictFlag(s?._soloAudioActive)?strictFlag(s?._soloMutedBase):strictFlag(s?.muted)}
    static applyGroup(trackState,tracks){
      const states=this.ensure(trackState),solo=tracks.filter(i=>strictFlag(states[i].solo)),hasSolo=solo.length>0,isVisual=tracks===VISUAL_TRACKS;
      for(const i of tracks){const s=states[i];
        if(isVisual){
          if(hasSolo){if(!strictFlag(s._soloVisualActive))s._soloHiddenBase=strictFlag(s.hidden);s._soloVisualActive=true;s.hidden=strictFlag(s._soloHiddenBase)||!strictFlag(s.solo)}
          else if(strictFlag(s._soloVisualActive)){s.hidden=strictFlag(s._soloHiddenBase);delete s._soloHiddenBase;delete s._soloVisualActive}
        }else{
          if(hasSolo){if(!strictFlag(s._soloAudioActive))s._soloMutedBase=strictFlag(s.muted);s._soloAudioActive=true;s.muted=strictFlag(s._soloMutedBase)||!strictFlag(s.solo)}
          else if(strictFlag(s._soloAudioActive)){s.muted=strictFlag(s._soloMutedBase);delete s._soloMutedBase;delete s._soloAudioActive}
        }
      }
      return states;
    }
    static apply(trackState){let states=this.ensure(trackState);states=this.applyGroup(states,VISUAL_TRACKS);states=this.applyGroup(states,AUDIO_TRACKS);for(let i=0;i<7;i++)trackState[i]=states[i];return trackState}
    static toggleSolo(trackState,track){
      const target=this.canonicalTrack(track),group=groupFor(target);if(target===null||!group)return false;
      let states=this.ensure(trackState);states[target].solo=!strictFlag(states[target].solo);states=this.applyGroup(states,group);
      for(let i=0;i<7;i++)trackState[i]=states[i];return strictFlag(trackState[target].solo);
    }
    static toggleHidden(trackState,track){
      const target=this.canonicalTrack(track);if(target===null||!VISUAL_TRACKS.includes(target))return false;
      let states=this.ensure(trackState);const s=states[target],next=!this.baseHidden(s);if(strictFlag(s._soloVisualActive))s._soloHiddenBase=next;else s.hidden=next;
      states=this.applyGroup(states,VISUAL_TRACKS);for(let i=0;i<7;i++)trackState[i]=states[i];return next;
    }
    static toggleMuted(trackState,track){
      const target=this.canonicalTrack(track);if(target===null||!AUDIO_TRACKS.includes(target))return false;
      let states=this.ensure(trackState);const s=states[target],next=!this.baseMuted(s);if(strictFlag(s._soloAudioActive))s._soloMutedBase=next;else s.muted=next;
      states=this.applyGroup(states,AUDIO_TRACKS);for(let i=0;i<7;i++)trackState[i]=states[i];return next;
    }
    static isVisualHidden(trackState,track){const target=this.canonicalTrack(track);if(target===null||!VISUAL_TRACKS.includes(target))return false;return strictFlag(this.state(trackState,target).hidden)}
    static isAudioMuted(trackState,track){const target=this.canonicalTrack(track);if(target===null||!AUDIO_TRACKS.includes(target))return false;return strictFlag(this.state(trackState,target).muted)}
    static filterRenderableClips(clips,trackState){
      const states=this.apply(this.ensure(trackState));
      return (Array.isArray(clips)?clips:[]).filter(c=>!VISUAL_TRACKS.includes(Number(c?.track))||!this.isVisualHidden(states,Number(c.track)));
    }
  }
  return {ProfitMenteTrackSoloEngine,VISUAL_TRACKS,AUDIO_TRACKS};
});