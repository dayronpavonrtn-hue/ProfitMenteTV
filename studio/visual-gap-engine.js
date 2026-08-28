class ProfitMenteVisualGapEngine{
  static state(project,track){const s=project?.trackState?.[track]??project?.trackState?.[String(track)]??{};return s&&typeof s==='object'?s:{}}
  static visibleTracks(project){return [0,1].filter(t=>!this.state(project,t).hidden)}
  static gaps(project,minGap=.15){
    const duration=Math.max(0,Number(project?.duration)||0),tracks=this.visibleTracks(project);if(!duration||!tracks.length)return [];
    const ranges=(project.clips||[]).filter(c=>tracks.includes(Number(c.track))&&c.asset).map(c=>[Math.max(0,Number(c.start)||0),Math.min(duration,(Number(c.start)||0)+Math.max(0,Number(c.duration)||0))]).filter(r=>r[1]>r[0]).sort((a,b)=>a[0]-b[0]);
    if(!ranges.length)return [[0,duration]];
    const merged=[];for(const r of ranges){const last=merged[merged.length-1];if(last&&r[0]<=last[1]+.001)last[1]=Math.max(last[1],r[1]);else merged.push([...r])}
    const gaps=[];let cursor=0;for(const [s,e] of merged){if(s-cursor>=minGap)gaps.push([cursor,s]);cursor=Math.max(cursor,e)}if(duration-cursor>=minGap)gaps.push([cursor,duration]);return gaps;
  }
  static usage(project){const m=new Map();for(const c of project?.clips||[])if(c.asset)m.set(c.asset,(m.get(c.asset)||0)+1);return m}
  static pick(assets,usage,lastId){const visual=(assets||[]).filter(a=>a?.id&&['video','image'].includes(a.type));if(!visual.length)return null;return visual.slice().sort((a,b)=>{const ua=usage.get(a.id)||0,ub=usage.get(b.id)||0;if(ua!==ub)return ua-ub;if(a.id===lastId)return 1;if(b.id===lastId)return -1;return String(a.name||a.id).localeCompare(String(b.name||b.id))})[0]}
  static fill(project,assets=[],options={}){
    const duration=Math.max(0,Number(project?.duration)||0),tracks=this.visibleTracks(project),created=[],unresolved=[];
    if(!tracks.length)return {created,unresolved:duration?[{gap:[0,duration],reason:'visual-tracks-hidden'}]:[],gaps:[]};
    const gaps=this.gaps(project,Number(options.minGap)||.15),usage=this.usage(project),track=tracks[0];let lastId=null;
    for(const gap of gaps){let cursor=gap[0],guard=0;while(cursor<gap[1]-.01&&guard++<200){const asset=this.pick(assets,usage,lastId);if(!asset){unresolved.push({gap:[cursor,gap[1]],reason:'no-visual-assets'});break}
        const remaining=gap[1]-cursor,native=asset.type==='image'?remaining:Math.max(0,Number(asset.duration)||0);if(asset.type==='video'&&native<.15){usage.set(asset.id,(usage.get(asset.id)||0)+1000);continue}
        const clipDuration=Math.max(.01,Math.min(remaining,asset.type==='image'?remaining:native));const clip={id:(globalThis.crypto?.randomUUID?.()||`gap-${Date.now()}-${created.length}`),track,asset:asset.id,name:`Auto fill · ${asset.name||'medio'}`,start:+cursor.toFixed(3),duration:+clipDuration.toFixed(3),sourceOffset:0,speed:1,fitMode:'cover',transition:'fade',transitionDuration:Math.min(.25,clipDuration/3),autoGapFill:true};
        project.clips.push(clip);created.push(clip);usage.set(asset.id,(usage.get(asset.id)||0)+1);lastId=asset.id;cursor+=clipDuration;
      }}
    return {created,unresolved,gaps};
  }
}
if(typeof window!=='undefined')window.ProfitMenteVisualGapEngine=ProfitMenteVisualGapEngine;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteVisualGapEngine;
