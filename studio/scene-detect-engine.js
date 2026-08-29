class ProfitMenteSceneDetectEngine{
  static frameDistance(a,b){
    if(!a||!b||a.length!==b.length||!a.length)return 0;
    let total=0;for(let i=0;i<a.length;i++)total+=Math.abs((Number(a[i])||0)-(Number(b[i])||0));
    return total/(a.length*255);
  }
  static median(values=[]){const v=values.filter(Number.isFinite).slice().sort((a,b)=>a-b);if(!v.length)return 0;const m=Math.floor(v.length/2);return v.length%2?v[m]:(v[m-1]+v[m])/2}
  static threshold(distances=[],opts={}){
    const median=this.median(distances),dev=distances.map(x=>Math.abs(x-median)),mad=this.median(dev);
    const floor=Math.max(.04,Number(opts.floor)||.08),sensitivity=Math.max(.5,Number(opts.sensitivity)||3.5);
    return Math.max(floor,median+mad*sensitivity);
  }
  static detect(frames=[],opts={}){
    if(!Array.isArray(frames)||frames.length<2)return {cuts:[],distances:[],threshold:0};
    const distances=[];for(let i=1;i<frames.length;i++)distances.push(this.frameDistance(frames[i-1].pixels,frames[i].pixels));
    const threshold=this.threshold(distances,opts),minGap=Math.max(.1,Number(opts.minGap)||.65),cuts=[];
    let last=-Infinity;
    for(let i=0;i<distances.length;i++){
      const score=distances[i],time=Number(frames[i+1]?.time)||0;
      if(score>=threshold&&time-last>=minGap){cuts.push({time,score});last=time}
    }
    return {cuts,distances,threshold};
  }
  static timelineTime(cutSourceTime,clip={}){
    const speed=Math.max(.01,Number(clip.speed)||1),sourceOffset=Math.max(0,Number(clip.sourceOffset)||0),start=Math.max(0,Number(clip.start)||0);
    return start+Math.max(0,(Number(cutSourceTime)||0)-sourceOffset)/speed;
  }
}
if(typeof window!=='undefined')window.ProfitMenteSceneDetectEngine=ProfitMenteSceneDetectEngine;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteSceneDetectEngine;
