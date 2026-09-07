(()=>{
  const root=typeof window!=='undefined'?window:globalThis;

  function strictNumber(value){
    if(typeof value==='number')return Number.isFinite(value)?value:null;
    if(typeof value!=='string')return null;
    const text=value.trim();
    if(!text)return null;
    const n=Number(text);
    return Number.isFinite(n)?n:null;
  }
  function scalarKey(value){
    if(typeof value==='number')return Number.isFinite(value)?`n:${Object.is(value,-0)?0:value}`:null;
    if(typeof value!=='string')return null;
    const text=value.trim();
    if(!text)return null;
    if(/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(text)){
      const n=Number(text);
      if(Number.isFinite(n))return `n:${Object.is(n,-0)?0:n}`;
    }
    return `s:${text}`;
  }
  function sameScalar(a,b){const x=scalarKey(a),y=scalarKey(b);return x!==null&&x===y}
  function trackLocked(project,track){
    const key=scalarKey(track);if(key===null)return true;
    const stateIn=states=>{
      if(!states||typeof states!=='object')return null;
      for(const [candidate,state] of Object.entries(states))if(sameScalar(candidate,track))return state;
      return null;
    };
    const modern=stateIn(project?.trackState),legacy=stateIn(project?.trackStates);
    return modern?.locked===true||legacy?.locked===true;
  }
  function clipLocked(project,clip){return clip?.locked===true||trackLocked(project,clip?.track)}
  function clipWindow(clip){
    const start=strictNumber(clip?.start),duration=strictNumber(clip?.duration);
    return start!==null&&start>=0&&duration!==null&&duration>0?{start,duration,end:start+duration}:null;
  }
  function shiftedWords(words,delta){
    if(!Array.isArray(words))return words;
    return words.map(item=>{
      if(!item||typeof item!=='object')return item;
      const start=strictNumber(item.start),end=strictNumber(item.end);
      if(start===null||end===null||end<=start)throw new Error('invalid-word-timing');
      return {...item,start:Math.max(0,start+delta),end:Math.max(0,end+delta)};
    });
  }
  function trimWords(words,start,end){
    if(!Array.isArray(words))return words;
    const out=[];
    for(const timing of words){
      if(!timing||typeof timing!=='object')continue;
      const ws=strictNumber(timing.start),we=strictNumber(timing.end);
      if(ws===null||we===null||we<=ws)throw new Error('invalid-word-timing');
      if(we<=start||ws>=end)continue;
      const item={...timing,start:Math.max(start,ws),end:Math.min(end,we)};
      item.duration=Math.max(0,item.end-item.start);
      if(item.duration>0)out.push(item);
    }
    return out.map((x,index)=>({...x,index}));
  }
  function maxEnd(clips){let max=0;for(const clip of clips){const w=clipWindow(clip);if(!w)throw new Error('invalid-clip-window');max=Math.max(max,w.end)}return max}

  class ProfitMenteRippleTrimEngine{
    trimRight(project,id,at,{minDuration=.25}={}){
      if(!project||!Array.isArray(project.clips))return {ok:false,reason:'invalid-project'};
      const idKey=scalarKey(id),target=strictNumber(at),minimum=strictNumber(minDuration);
      if(idKey===null||target===null||minimum===null||minimum<=0)return {ok:false,reason:'invalid'};
      const matches=project.clips.filter(c=>scalarKey(c?.id)===idKey);
      if(matches.length!==1)return {ok:false,reason:matches.length?'ambiguous-id':'missing'};
      const anchor=matches[0],anchorWindow=clipWindow(anchor);
      if(!anchorWindow)return {ok:false,reason:'invalid-anchor'};
      if(clipLocked(project,anchor))return {ok:false,reason:'locked',clip:anchor};
      if(target<=anchorWindow.start+minimum-.001||target>=anchorWindow.end-.001)return {ok:false,reason:'outside'};

      const shift=anchorWindow.end-target,trackKey=scalarKey(anchor.track);
      if(trackKey===null)return {ok:false,reason:'invalid-track'};
      const followers=project.clips.filter(c=>c!==anchor&&scalarKey(c?.track)===trackKey&&clipWindow(c)?.start>=anchorWindow.end-.001);
      const affected=[anchor,...followers];
      if(affected.some(c=>clipLocked(project,c)))return {ok:false,reason:'locked'};

      let prepared;
      try{
        prepared=affected.map(c=>{
          const w=clipWindow(c);if(!w)throw new Error('invalid-clip-window');
          if(c===anchor){
            const next={...c,duration:target-anchorWindow.start};
            if(Array.isArray(c.wordTimings))next.wordTimings=trimWords(c.wordTimings,anchorWindow.start,target);
            if(Object.prototype.hasOwnProperty.call(c,'fadeIn')){const n=strictNumber(c.fadeIn);if(n===null)throw new Error('invalid-fade');next.fadeIn=Math.min(next.duration,Math.max(0,n))}
            if(Object.prototype.hasOwnProperty.call(c,'fadeOut')){const n=strictNumber(c.fadeOut);if(n===null)throw new Error('invalid-fade');next.fadeOut=Math.min(next.duration,Math.max(0,n))}
            return [c,next];
          }
          const next={...c,start:w.start-shift};
          if(Array.isArray(c.wordTimings))next.wordTimings=shiftedWords(c.wordTimings,-shift);
          return [c,next];
        });
        for(const clip of project.clips)if(!affected.includes(clip)&&!clipWindow(clip))throw new Error('invalid-clip-window');
      }catch(error){return {ok:false,reason:error.message||'invalid-data'};}

      for(const [original,next] of prepared){for(const key of Object.keys(original))if(!Object.prototype.hasOwnProperty.call(next,key))delete original[key];Object.assign(original,next)}
      const oldDuration=strictNumber(project.duration),newMax=maxEnd(project.clips);
      if(oldDuration===null||oldDuration<0)return {ok:false,reason:'invalid-duration'};
      if(oldDuration<=anchorWindow.end+.001||oldDuration<=newMax+shift+.001)project.duration=newMax;
      return {ok:true,clip:anchor,moved:followers.length,shift,at:target,duration:project.duration,track:anchor.track};
    }
  }

  root.ProfitMenteRippleTrimEngine=ProfitMenteRippleTrimEngine;
})();