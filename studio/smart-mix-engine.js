class ProfitMenteSmartMixEngine{
  static state(project,track){const s=project?.trackState?.[String(track)]??project?.trackState?.[track];return s&&typeof s==='object'?s:{}}
  static muted(project,track){return !!this.state(project,track).muted}
  static active(clip,project){return !!clip?.asset&&!clip?.muted&&!this.muted(project,Number(clip?.track))}
  static overlap(a,b){const s=Math.max(Number(a?.start)||0,Number(b?.start)||0),e=Math.min((Number(a?.start)||0)+Math.max(0,Number(a?.duration)||0),(Number(b?.start)||0)+Math.max(0,Number(b?.duration)||0));return Math.max(0,e-s)}
  static voiceIntervals(project,music){
    const ms=Number(music?.start)||0,me=ms+Math.max(0,Number(music?.duration)||0),raw=(project?.clips||[]).filter(c=>Number(c.track)===6&&this.active(c,project)).map(v=>{const s=Math.max(ms,Number(v.start)||0),e=Math.min(me,(Number(v.start)||0)+Math.max(0,Number(v.duration)||0));return e>s?{start:s,end:e}:null}).filter(Boolean).sort((a,b)=>a.start-b.start||a.end-b.end),merged=[];
    for(const x of raw){const last=merged.at(-1);if(last&&x.start<=last.end+.001)last.end=Math.max(last.end,x.end);else merged.push({...x})}return merged
  }
  static voiceOverlap(project,music){return this.voiceIntervals(project,music).reduce((sum,x)=>sum+x.end-x.start,0)}
  static safeDuckVolume(music,ratio=.4){const base=Math.max(0,Math.min(2,Number(music?.volume??.22)||0)),r=Math.max(.15,Math.min(.75,Number(ratio)||.4));return +Math.max(0,Math.min(base,base*r)).toFixed(3)}
  static inspect(project){
    const music=(project?.clips||[]).filter(c=>Number(c.track)===5&&this.active(c,project)),voice=(project?.clips||[]).filter(c=>Number(c.track)===6&&this.active(c,project));
    const rows=music.map(c=>{const overlap=this.voiceOverlap(project,c),duration=Math.max(.001,Number(c.duration)||.001),recommended=this.safeDuckVolume(c);return {id:c.id,name:c.name||c.id,overlap:+overlap.toFixed(3),coverage:+Math.min(1,overlap/duration).toFixed(3),base:+Math.max(0,Number(c.volume??.22)||0).toFixed(3),duck:+Math.max(0,Number(c.duckVolume??.16)||0).toFixed(3),recommended,enabled:c.ducking!==false}});
    const needsDucking=rows.filter(r=>r.overlap>.01&&(!r.enabled||r.duck>r.recommended+.01));
    return {music:music.length,voice:voice.length,overlapping:rows.filter(r=>r.overlap>.01).length,needsDucking:needsDucking.length,rows}
  }
  static apply(project,{duckRatio=.4}={}){
    const before=this.inspect(project),changed=[];
    for(const clip of project?.clips||[]){
      if(Number(clip.track)!==5||!this.active(clip,project)||this.voiceOverlap(project,clip)<=.01)continue;
      const next=this.safeDuckVolume(clip,duckRatio),old=Number(clip.duckVolume??.16),was=clip.ducking!==false;
      clip.ducking=true;clip.duckVolume=next;
      if(!was||Math.abs(old-next)>.001)changed.push({id:clip.id,from:+old.toFixed(3),to:next})
    }
    return {changed:changed.length,clips:changed,before,after:this.inspect(project)}
  }
}
if(typeof window!=='undefined')window.ProfitMenteSmartMixEngine=ProfitMenteSmartMixEngine;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteSmartMixEngine;
