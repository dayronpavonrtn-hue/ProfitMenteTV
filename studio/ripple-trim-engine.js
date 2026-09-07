(()=>{
  const root=typeof window!=='undefined'?window:globalThis;

  function strictNumber(value){
    if(typeof value==='number')return Number.isFinite(value)?value:null;
    if(typeof value!=='string')return null;
    const text=value.trim();if(!text)return null;
    const n=Number(text);return Number.isFinite(n)?n:null;
  }
  function scalarKey(value){
    if(typeof value==='number')return Number.isFinite(value)?`n:${Object.is(value,-0)?0:value}`:null;
    if(typeof value!=='string')return null;
    const text=value.trim();if(!text)return null;
    if(/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(text)){
      const n=Number(text);if(Number.isFinite(n))return `n:${Object.is(n,-0)?0:n}`;
    }
    return `s:${text}`;
  }
  function sameScalar(a,b){const x=scalarKey(a),y=scalarKey(b);return x!==null&&x===y}
  function trackLocked(project,track){
    if(scalarKey(track)===null)return true;
    const stateIn=states=>{
      if(!states||typeof states!=='object')return null;
      for(const [candidate,state] of Object.entries(states))if(sameScalar(candidate,track))return state;
      return null;
    };
    return stateIn(project?.trackState)?.locked===true||stateIn(project?.trackStates)?.locked===true;
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
      const nextStart=Math.max(0,start+delta),nextEnd=Math.max(0,end+delta);
      return {...item,start:nextStart,end:nextEnd,duration:Math.max(0,nextEnd-nextStart)};
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
      item.duration=Math.max(0,item.end-item.start);if(item.duration>0)out.push(item);
    }
    return out.map((x,index)=>({...x,index}));
  }

  class ProfitMenteRippleTrimEngine{
    trimRight(project,id,at,{minDuration=.25}={}){
      if(!project||!Array.isArray(project.clips))return {ok:false,reason:'invalid-project'};
      const idKey=scalarKey(id),target=strictNumber(at),minimum=strictNumber(minDuration),oldDuration=strictNumber(project.duration);
      if(idKey===null||target===null||minimum===null||minimum<=0||oldDuration===null||oldDuration<0)return {ok:false,reason:'invalid'};
      const matches=project.clips.filter(c=>scalarKey(c?.id)===idKey);
      if(matches.length!==1)return {ok:false,reason:matches.length?'ambiguous-id':'missing'};
      const anchor=matches[0],anchorWindow=clipWindow(anchor);
      if(!anchorWindow)return {ok:false,reason:'invalid-anchor'};
      if(clipLocked(project,anchor))return {ok:false,reason:'locked',clip:anchor};
      if(target<=anchorWindow.start+minimum-.001||target>=anchorWindow.end-.001)return {ok:false,reason:'outside'};

      const shift=anchorWindow.end-target,trackKey=scalarKey(anchor.track);
      if(trackKey===null)return {ok:false,reason:'invalid-track'};
      let oldMax=0;
      for(const clip of project.clips){const w=clipWindow(clip);if(!w)return {ok:false,reason:'invalid-clip-window'};oldMax=Math.max(oldMax,w.end)}
      const followers=project.clips.filter(c=>c!==anchor&&scalarKey(c?.track)===trackKey&&clipWindow(c).start>=anchorWindow.end-.001);
      const affected=[anchor,...followers];
      if(affected.some(c=>clipLocked(project,c)))return {ok:false,reason:'locked'};

      let prepared;
      try{
        prepared=affected.map(c=>{
          const w=clipWindow(c);
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
      }catch(error){return {ok:false,reason:error.message||'invalid-data'};}

      let newMax=0;
      for(const clip of project.clips){
        const preparedPair=prepared.find(([original])=>original===clip),candidate=preparedPair?preparedPair[1]:clip,w=clipWindow(candidate);
        if(!w)return {ok:false,reason:'invalid-clip-window'};newMax=Math.max(newMax,w.end);
      }
      for(const [original,next] of prepared)Object.assign(original,next);
      if(oldDuration<=oldMax+.001)project.duration=newMax;
      return {ok:true,clip:anchor,moved:followers.length,shift,at:target,duration:project.duration,track:anchor.track};
    }
  }

  root.ProfitMenteRippleTrimEngine=ProfitMenteRippleTrimEngine;
})();