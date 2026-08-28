(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.ProfitMenteSubtitleExportEngine=api.ProfitMenteSubtitleExportEngine})(typeof globalThis!=='undefined'?globalThis:this,function(){
class ProfitMenteSubtitleExportEngine{
  static pad(n,w=2){return String(Math.max(0,Math.floor(Number(n)||0))).padStart(w,'0')}
  static time(seconds,srt=false){const total=Math.max(0,Number(seconds)||0),ms=Math.round((total-Math.floor(total))*1000),whole=Math.floor(total),s=whole%60,m=Math.floor(whole/60)%60,h=Math.floor(whole/3600);return `${this.pad(h)}:${this.pad(m)}:${this.pad(s)}${srt?',':'.'}${this.pad(ms,3)}`}
  static cleanText(value){return String(value??'').replace(/\s+/g,' ').trim()}
  static cues(project){
    const clips=(project?.clips||[]).filter(c=>Number(c?.track)===3&&this.cleanText(c?.name)).sort((a,b)=>(Number(a.start)||0)-(Number(b.start)||0));
    const out=[];
    for(const clip of clips){
      const start=Math.max(0,Number(clip.start)||0),end=Math.max(start+.05,start+Math.max(.05,Number(clip.duration)||0));
      const words=Array.isArray(clip.wordTimings)?clip.wordTimings:[];
      const valid=words.map(w=>({text:this.cleanText(w?.word),start:Number(w?.start),end:Number(w?.end)})).filter(w=>w.text&&Number.isFinite(w.start)&&Number.isFinite(w.end)&&w.end>w.start);
      if(valid.length){
        for(const w of valid)out.push({start:Math.max(start,w.start),end:Math.min(end,w.end),text:w.text});
      }else out.push({start,end,text:this.cleanText(clip.name)});
    }
    return out.filter(c=>c.end>c.start+.001);
  }
  static srt(project){return this.cues(project).map((c,i)=>`${i+1}\n${this.time(c.start,true)} --> ${this.time(c.end,true)}\n${c.text}`).join('\n\n')+(this.cues(project).length?'\n':'')}
  static vtt(project){const body=this.cues(project).map(c=>`${this.time(c.start,false)} --> ${this.time(c.end,false)}\n${c.text}`).join('\n\n');return `WEBVTT\n\n${body}${body?'\n':''}`}
}
return {ProfitMenteSubtitleExportEngine};
});
