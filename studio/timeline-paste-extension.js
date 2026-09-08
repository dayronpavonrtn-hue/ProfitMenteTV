(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  const Ops=root.ProfitMenteTimelineOperations;if(!Ops)return;
  const proto=Ops.prototype,DECIMAL=/^[+-]?(?:\d+\.?\d*|\.\d+)$/;
  const strictNumber=value=>{
    if(typeof value!=='number'&&typeof value!=='string')return null;
    const s=String(value).trim();if(!DECIMAL.test(s))return null;
    const n=Number(s);return Number.isFinite(n)?n:null;
  };
  const trackKey=value=>{const n=strictNumber(value);return Number.isInteger(n)&&n>=0&&n<=6?String(n):null};

  // Keep legacy imports authoritative, but only a real boolean true locks a track.
  proto.trackLocked=function(project,track){
    const wanted=trackKey(track);if(wanted===null)return true;
    for(const states of [project?.trackState,project?.trackStates]){
      if(!states||typeof states!=='object'||Array.isArray(states))continue;
      for(const [key,state] of Object.entries(states))if(trackKey(key)===wanted&&state?.locked===true)return true;
    }
    return false;
  };

  // Stable single-clip fallback for Node regression tests and degraded startup.
  const legacyCopy=proto.copy;
  proto.copy=function(clip){this.__legacyClipboard=legacyCopy.call(this,clip);return this.__legacyClipboard};
  proto.paste=function(project,at,track=null){
    const source=this.__legacyClipboard||this.clipboard;if(!source||!project)return null;
    const targetTrack=track??source.track;if(this.trackLocked(project,targetTrack))return null;
    const clip=this.cloneClip(source),raw=strictNumber(at),start=Math.max(0,raw===null?0:raw);clip.track=targetTrack;clip.start=start;
    if(!Array.isArray(project.clips))project.clips=[];project.clips.push(clip);
    const end=clip.start+Math.max(0,strictNumber(clip.duration)??0),duration=Math.max(0,strictNumber(project.duration)??0);project.duration=Math.max(duration,end);return clip;
  };

  function installEnhanced(){
    const Engine=root.ProfitMenteClipClipboardEngine;if(!Engine||proto.__profitmenteGroupedClipboard)return;
    proto.__profitmenteGroupedClipboard=true;
    const fallbackCopy=proto.copy,fallbackPaste=proto.paste;
    proto.copy=function(clip){
      const active=typeof project!=='undefined'?project:null;
      if(!active||!Array.isArray(active.clips))return fallbackCopy.call(this,clip);
      this.__clipClipboardEngine??=new Engine();
      const result=this.__clipClipboardEngine.collect(active,clip?.id);
      this.__clipClipboardResult=result;
      if(!result.ok){this.__clipClipboardEngine.clear();this.clipboard=null;this.__legacyClipboard=null;return null}
      this.clipboard={__profitmenteGrouped:true,track:result.anchorTrack,count:result.count};
      this.__legacyClipboard=null;
      return structuredClone(clip);
    };
    proto.paste=function(projectRef,at,track=null){
      const engine=this.__clipClipboardEngine;
      if(!engine?.hasData())return fallbackPaste.call(this,projectRef,at,track);
      const target=track??this.clipboard?.track;
      const result=engine.paste(projectRef,at,{targetTrack:target,extendDuration:true});
      this.__clipClipboardResult=result;
      if(!result.ok)return null;
      return result.clips[0]||null;
    };
  }

  if(root.ProfitMenteClipClipboardEngine)installEnhanced();
  else if(typeof document!=='undefined'&&!document.querySelector('script[data-profitmente-clip-clipboard]')){
    const script=document.createElement('script');script.src='clip-clipboard-engine.js';script.async=false;script.dataset.profitmenteClipClipboard='1';script.onload=installEnhanced;script.onerror=()=>console.error('ProfitMente Studio: no se pudo cargar clip-clipboard-engine.js');document.body.appendChild(script);
  }
})();
