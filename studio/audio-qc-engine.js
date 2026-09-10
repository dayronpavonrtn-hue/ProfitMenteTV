class ProfitMenteAudioQCEngine{
  static finiteNumber(value,fallback=null){
    if(typeof value==='number')return Number.isFinite(value)?value:fallback;
    if(typeof value==='string'&&value.trim()!==''){const n=Number(value);return Number.isFinite(n)?n:fallback}
    return fallback;
  }
  static clamp(value,min=0,max=2,fallback=min){const n=this.finiteNumber(value,fallback);return Math.min(max,Math.max(min,n))}
  static dbfs(peak){const p=Math.max(0,this.finiteNumber(peak,0));return p>0?20*Math.log10(p):-Infinity}
  static canonicalTrack(value){const n=this.finiteNumber(value,null);return n!==null&&Number.isInteger(n)&&n>=0&&n<=6?(Object.is(n,-0)?0:n):null}
  static trackGain(project,track){
    const canonical=this.canonicalTrack(track);if(canonical===null)return 1;
    for(const map of [project?.trackState,project?.trackStates]){
      if(!map||typeof map!=='object')continue;
      for(const [key,state] of Object.entries(map))if(this.canonicalTrack(key)===canonical&&state&&typeof state==='object')return this.clamp(state.gain,0,2,1);
    }
    return 1;
  }
  static trackLocked(project,track){
    const canonical=this.canonicalTrack(track);if(canonical===null)return false;
    for(const map of [project?.trackState,project?.trackStates]){
      if(!map||typeof map!=='object')continue;
      for(const [key,state] of Object.entries(map))if(this.canonicalTrack(key)===canonical&&state&&typeof state==='object'&&state.locked===true)return true;
    }
    return false;
  }
  static clipLocked(project,clip){return !!clip&&(clip.locked===true||this.trackLocked(project,clip.track))}
  static clipGain(project,clip){
    const track=this.canonicalTrack(clip?.track),trackGain=this.trackGain(project,track);
    let volume=1;
    if(track===5)volume=this.clamp(clip?.volume??.22,0,2,.22);
    else if(track===4||track===6)volume=this.clamp(clip?.volume??1,0,2,1);
    else if(track===0||track===1)volume=this.clamp(clip?.sourceVolume??1,0,2,1);
    return trackGain*volume;
  }
  static inspectPeaks(peaks=[],gain=1,{warningDb=-1,clipDb=-0.05}={}){
    const source=Array.from(peaks||[]),g=Math.max(0,this.finiteNumber(gain,1));
    let sourcePeak=0;for(const raw of source)sourcePeak=Math.max(sourcePeak,Math.max(0,this.finiteNumber(raw,0)));
    const effectivePeak=sourcePeak*g,db=this.dbfs(effectivePeak),warnLinear=Math.pow(10,this.finiteNumber(warningDb,-1)/20),clipLinear=Math.pow(10,this.finiteNumber(clipDb,-0.05)/20);
    const status=effectivePeak>=clipLinear?'clipping':effectivePeak>=warnLinear?'hot':sourcePeak<=1e-8?'silent':'ok';
    return {status,sourcePeak,effectivePeak,dbfs:db,gain:g,warningDb:this.finiteNumber(warningDb,-1),clipDb:this.finiteNumber(clipDb,-0.05)};
  }
  static inspectClip({project=null,clip=null,peaks=[],sourceDuration=0,waveformEngine=null}={}){
    if(!clip||!waveformEngine||typeof waveformEngine.slicePeaks!=='function')return {status:'unavailable',reason:'missing_input'};
    const duration=Math.max(0,this.finiteNumber(sourceDuration,0));if(duration<=0)return {status:'unavailable',reason:'unknown_duration'};
    const visible=waveformEngine.slicePeaks(peaks,{sourceOffset:this.finiteNumber(clip.sourceOffset,0),clipDuration:this.finiteNumber(clip.duration,0),speed:this.finiteNumber(clip.speed,1),sourceDuration:duration,bins:512});
    return {...this.inspectPeaks(visible,this.clipGain(project,clip)),clipId:clip.id,track:this.canonicalTrack(clip.track)};
  }
  static inspectMixOverlaps(results=[],{warningDb=-1,clipDb=-0.05}={}){
    const rows=(Array.isArray(results)?results:[]).filter(r=>r?.clip&&Number.isFinite(r.effectivePeak));
    const events=[];
    for(const row of rows){
      const start=this.finiteNumber(row.clip.start,null),duration=this.finiteNumber(row.clip.duration,null);
      if(start===null||duration===null||duration<=0)continue;
      events.push({time:start,kind:1,row},{time:start+duration,kind:-1,row});
    }
    events.sort((a,b)=>a.time-b.time||a.kind-b.kind);
    const active=new Set(),segments=[];let last=null;
    const warnLinear=Math.pow(10,this.finiteNumber(warningDb,-1)/20),clipLinear=Math.pow(10,this.finiteNumber(clipDb,-0.05)/20);
    for(const event of events){
      if(last!==null&&event.time>last&&active.size>1){
        const contributors=[...active],sumPeak=contributors.reduce((sum,row)=>sum+Math.max(0,row.effectivePeak),0),db=this.dbfs(sumPeak),status=sumPeak>=clipLinear?'clipping':sumPeak>=warnLinear?'hot':'ok';
        if(status!=='ok')segments.push({start:last,end:event.time,duration:event.time-last,status,effectivePeak:sumPeak,dbfs:db,clipIds:contributors.map(r=>r.clip?.id).filter(Boolean)});
      }
      if(event.kind<0)active.delete(event.row);else active.add(event.row);last=event.time;
    }
    const worst=segments.slice().sort((a,b)=>b.effectivePeak-a.effectivePeak)[0]||null;
    return {segments,clipping:segments.filter(s=>s.status==='clipping').length,hot:segments.filter(s=>s.status==='hot').length,worst};
  }
  static planHeadroomFix(project,results=[],mix=null,{targetDb=-1}={}){
    const rows=(Array.isArray(results)?results:[]).filter(row=>row?.clip&&Number.isFinite(row.effectivePeak));
    const analysis=mix&&Array.isArray(mix.segments)?mix:this.inspectMixOverlaps(rows);
    const target=this.finiteNumber(targetDb,-1),targetLinear=Math.pow(10,target/20);
    const worstClip=rows.reduce((peak,row)=>Math.max(peak,Math.max(0,row.effectivePeak)),0),worstMix=Math.max(0,this.finiteNumber(analysis?.worst?.effectivePeak,0)),worstPeak=Math.max(worstClip,worstMix);
    if(worstPeak<=targetLinear||worstPeak<=1e-9)return {ok:true,needed:false,gain:1,gainDb:0,targetDb:target,worstPeak,worstDb:this.dbfs(worstPeak),lockedClipIds:[],riskyClipIds:[]};
    const riskyIds=new Set();
    for(const row of rows)if(row.effectivePeak>targetLinear&&row.clip?.id!=null)riskyIds.add(String(row.clip.id));
    for(const segment of analysis?.segments||[])if(segment.effectivePeak>targetLinear)for(const id of segment.clipIds||[])riskyIds.add(String(id));
    const lockedClipIds=rows.filter(row=>riskyIds.has(String(row.clip?.id))&&this.clipLocked(project,row.clip)).map(row=>row.clip.id);
    const gain=Math.min(1,targetLinear/worstPeak),gainDb=this.dbfs(gain);
    return {ok:lockedClipIds.length===0,needed:true,gain,gainDb,targetDb:target,worstPeak,worstDb:this.dbfs(worstPeak),lockedClipIds,riskyClipIds:[...riskyIds]};
  }
  static applyHeadroomFix(project,results=[],mix=null,options={}){
    const plan=this.planHeadroomFix(project,results,mix,options);if(!plan.needed||!plan.ok)return {...plan,changed:0};
    const rows=(Array.isArray(results)?results:[]).filter(row=>row?.clip&&Number.isFinite(row.effectivePeak)),riskyIds=new Set(plan.riskyClipIds||[]);let changed=0;
    for(const row of rows){
      const clip=row.clip,track=this.canonicalTrack(clip.track);if(!riskyIds.has(String(clip?.id))||![0,1,4,5,6].includes(track)||this.clipLocked(project,clip))continue;
      if(track===0||track===1)clip.sourceVolume=this.clamp((clip.sourceVolume??1)*plan.gain,0,2,1);
      else clip.volume=this.clamp((clip.volume??(track===5?.22:1))*plan.gain,0,2,track===5?.22:1);
      changed++;
    }
    return {...plan,changed};
  }
  static summarize(results=[]){
    const list=Array.isArray(results)?results:[],counts={clipping:0,hot:0,ok:0,silent:0,unavailable:0};
    for(const item of list){const key=Object.prototype.hasOwnProperty.call(counts,item?.status)?item.status:'unavailable';counts[key]++}
    return {...counts,total:list.length,ok:counts.clipping===0};
  }
}
if(typeof window!=='undefined')window.ProfitMenteAudioQCEngine=ProfitMenteAudioQCEngine;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteAudioQCEngine;
