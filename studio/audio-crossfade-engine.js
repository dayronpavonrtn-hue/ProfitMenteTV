class ProfitMenteAudioCrossfadeEngine{
  constructor(envelopeEngine){
    this.envelope=envelopeEngine||new ProfitMenteAudioEnvelopeEngine();
    this.epsilon=.001;
  }
  finite(value){return this.envelope.finiteNumber(value)}
  startOf(clip){const n=this.finite(clip?.start);return n!==null&&n>=0?n:null}
  durationOf(clip){const n=this.finite(clip?.duration);return n!==null&&n>0?n:null}
  findClip(project,id){return (Array.isArray(project?.clips)?project.clips:[]).find(c=>this.envelope.sameId(c?.id,id))||null}
  nextOverlap(project,assets,id){
    const first=this.findClip(project,id);
    if(!first||!this.envelope.isAudioEligible(first,assets))return {ok:false,reason:'ineligible'};
    const track=this.envelope.canonicalTrack(first.track),start=this.startOf(first),duration=this.durationOf(first);
    if(track===null||start===null||duration===null)return {ok:false,reason:'invalid-timing'};
    const end=start+duration;
    const candidates=(Array.isArray(project?.clips)?project.clips:[])
      .filter(c=>c!==first&&this.envelope.canonicalTrack(c?.track)===track&&this.envelope.isAudioEligible(c,assets))
      .map(c=>({clip:c,start:this.startOf(c),duration:this.durationOf(c)}))
      .filter(x=>x.start!==null&&x.duration!==null&&x.start>start+this.epsilon)
      .sort((a,b)=>a.start-b.start);
    const next=candidates[0];
    if(!next||next.start>=end-this.epsilon)return {ok:false,reason:'no-overlap'};
    const overlap=Math.min(end,next.start+next.duration)-next.start;
    if(overlap<=this.epsilon)return {ok:false,reason:'no-overlap'};
    if(this.envelope.clipLocked(project,first)||this.envelope.clipLocked(project,next.clip))return {ok:false,reason:'locked'};
    const firstEnv=this.envelope.forClip(first),nextEnv=this.envelope.forClip(next.clip);
    const availableFirst=Math.max(0,duration-firstEnv.fadeIn);
    const availableNext=Math.max(0,next.duration-nextEnv.fadeOut);
    const crossfade=Math.min(overlap,availableFirst,availableNext);
    if(crossfade<=this.epsilon)return {ok:false,reason:'insufficient-room'};
    return {ok:true,first,next:next.clip,overlap:+overlap.toFixed(3),duration:+crossfade.toFixed(3),firstEnv,nextEnv};
  }
  applyNext(project,assets,id){
    const plan=this.nextOverlap(project,assets,id);
    if(!plan.ok)return plan;
    const a=plan.first,b=plan.next;
    const beforeA={hasIn:Object.prototype.hasOwnProperty.call(a,'fadeIn'),fadeIn:a.fadeIn,hasOut:Object.prototype.hasOwnProperty.call(a,'fadeOut'),fadeOut:a.fadeOut};
    const beforeB={hasIn:Object.prototype.hasOwnProperty.call(b,'fadeIn'),fadeIn:b.fadeIn,hasOut:Object.prototype.hasOwnProperty.call(b,'fadeOut'),fadeOut:b.fadeOut};
    const restore=(clip,before)=>{for(const [key,flag,value] of [['fadeIn',before.hasIn,before.fadeIn],['fadeOut',before.hasOut,before.fadeOut]]){if(flag)clip[key]=value;else delete clip[key]}};
    try{
      const r1=this.envelope.apply(project,a,plan.firstEnv.fadeIn,plan.duration);
      if(!r1.ok)throw Object.assign(new Error(r1.reason),{reason:r1.reason});
      const r2=this.envelope.apply(project,b,plan.duration,plan.nextEnv.fadeOut);
      if(!r2.ok)throw Object.assign(new Error(r2.reason),{reason:r2.reason});
      const actual=Math.min(r1.fadeOut,r2.fadeIn);
      if(actual<=this.epsilon)throw Object.assign(new Error('insufficient-room'),{reason:'insufficient-room'});
      if(Math.abs(r1.fadeOut-r2.fadeIn)>this.epsilon){
        const rr1=this.envelope.apply(project,a,r1.fadeIn,actual),rr2=this.envelope.apply(project,b,actual,r2.fadeOut);
        if(!rr1.ok||!rr2.ok)throw Object.assign(new Error('apply-failed'),{reason:'apply-failed'});
      }
      return {ok:true,firstId:a.id,nextId:b.id,duration:+actual.toFixed(3),overlap:plan.overlap};
    }catch(err){
      restore(a,beforeA);restore(b,beforeB);
      return {ok:false,reason:err?.reason||'apply-failed'};
    }
  }
}
if(typeof window!=='undefined')window.ProfitMenteAudioCrossfadeEngine=ProfitMenteAudioCrossfadeEngine;
if(typeof module!=='undefined')module.exports={ProfitMenteAudioCrossfadeEngine};
