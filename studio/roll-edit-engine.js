(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  class ProfitMenteRollEditEngine{
    constructor(options={}){this.minDuration=Math.max(.01,Number(options.minDuration)||.05);this.tolerance=Math.max(.0001,Number(options.tolerance)||.02)}
    speed(clip){return Math.max(.25,Math.min(4,Number(clip?.speed)||1))}
    sourceDuration(asset){return Math.max(0,Number(asset?.duration)||0)}
    sourceOffset(clip){return Math.max(0,Number(clip?.sourceOffset)||0)}
    end(clip){return (Number(clip?.start)||0)+Math.max(0,Number(clip?.duration)||0)}
    isContinuous(left,right){return !!left&&!!right&&Number(left.track)===Number(right.track)&&Math.abs(this.end(left)-(Number(right.start)||0))<=this.tolerance}
    sourceLimit(clip,asset){
      if(!clip?.asset)return Infinity;
      if(asset?.type==='image')return Infinity;
      const total=this.sourceDuration(asset);
      if(!total)return Infinity;
      return Math.max(0,(total-this.sourceOffset(clip))/this.speed(clip));
    }
    bounds(left,right,leftAsset,rightAsset){
      if(!this.isContinuous(left,right))return {ok:false,reason:'not-adjacent',minDelta:0,maxDelta:0};
      const ld=Math.max(0,Number(left.duration)||0),rd=Math.max(0,Number(right.duration)||0),rightOffset=this.sourceOffset(right),rightSpeed=this.speed(right);
      let minDelta=-(ld-this.minDuration);
      minDelta=Math.max(minDelta,-rightOffset/rightSpeed);
      let maxDelta=rd-this.minDuration;
      const leftLimit=this.sourceLimit(left,leftAsset);
      if(Number.isFinite(leftLimit))maxDelta=Math.min(maxDelta,leftLimit-ld);
      minDelta=Math.min(0,minDelta);maxDelta=Math.max(0,maxDelta);
      return {ok:true,reason:'ok',minDelta:+minDelta.toFixed(6),maxDelta:+maxDelta.toFixed(6),boundary:+this.end(left).toFixed(6)};
    }
    roll(left,right,leftAsset,rightAsset,requestedDelta){
      const b=this.bounds(left,right,leftAsset,rightAsset);if(!b.ok)return {...b,changed:false,delta:0};
      const requested=Number(requestedDelta);if(!Number.isFinite(requested))return {...b,ok:false,reason:'invalid-delta',changed:false,delta:0};
      const delta=Math.max(b.minDelta,Math.min(b.maxDelta,requested));
      if(Math.abs(delta)<=1e-9)return {...b,changed:false,delta:0,clamped:Math.abs(requested)>1e-9};
      const oldBoundary=this.end(left),oldTotal=(Number(left.duration)||0)+(Number(right.duration)||0);
      left.duration=+(Math.max(this.minDuration,(Number(left.duration)||0)+delta)).toFixed(6);
      right.start=+(oldBoundary+delta).toFixed(6);
      right.duration=+(Math.max(this.minDuration,(Number(right.duration)||0)-delta)).toFixed(6);
      right.sourceOffset=+(Math.max(0,this.sourceOffset(right)+delta*this.speed(right))).toFixed(6);
      return {...b,changed:true,delta:+delta.toFixed(6),requested:+requested.toFixed(6),clamped:Math.abs(delta-requested)>1e-6,boundary:+(oldBoundary+delta).toFixed(6),totalDuration:+((Number(left.duration)||0)+(Number(right.duration)||0)).toFixed(6),preservedTotal:Math.abs(((Number(left.duration)||0)+(Number(right.duration)||0))-oldTotal)<=1e-6};
    }
    findPair(clips,selectedId){
      const selected=(clips||[]).find(c=>c?.id===selectedId);if(!selected)return null;
      const same=(clips||[]).filter(c=>c&&c.id!==selected.id&&Number(c.track)===Number(selected.track));
      const right=same.filter(c=>Math.abs((Number(c.start)||0)-this.end(selected))<=this.tolerance).sort((a,b)=>(Number(a.start)||0)-(Number(b.start)||0))[0];
      if(right)return {left:selected,right,selectedSide:'left'};
      const left=same.filter(c=>Math.abs(this.end(c)-(Number(selected.start)||0))<=this.tolerance).sort((a,b)=>this.end(b)-this.end(a))[0];
      return left?{left,right:selected,selectedSide:'right'}:null;
    }
  }
  root.ProfitMenteRollEditEngine=ProfitMenteRollEditEngine;
  if(typeof module!=='undefined')module.exports={ProfitMenteRollEditEngine};
})();
