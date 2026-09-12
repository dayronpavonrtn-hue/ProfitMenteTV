(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  class ProfitMenteVisualKeyframeRenderBaker{
    constructor(options={}){
      const Engine=options.Engine||root.ProfitMenteVisualKeyframeEngine;
      if(!Engine)throw new Error('Visual keyframe engine no disponible');
      this.engine=options.engine||new Engine();
      this.samplesPerSecond=Math.max(2,Math.min(24,Number(options.samplesPerSecond)||8));
      this.maxSamplesPerSpan=Math.max(2,Math.min(48,Number(options.maxSamplesPerSpan)||24));
      this.minSpan=Math.max(.001,Number(options.minSpan)||.01);
    }
    finite(value,fallback=0){
      if(typeof value==='number')return Number.isFinite(value)?value:fallback;
      if(typeof value!=='string'||!value.trim())return fallback;
      const n=Number(value);return Number.isFinite(n)?n:fallback;
    }
    legacyState(state){return {positionX:state.x,positionY:state.y,scale:state.scale,rotation:state.rotation,opacity:state.opacity}}
    clone(value){return typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value))}
    stateAt(clip,time){return this.engine.stateAt(clip,time)}
    easingForSpan(clip,start){return this.engine.easingAt(clip,Math.min(this.engine.duration(clip),start+this.engine.tolerance*2))}
    splitSpan(start,end,easing){
      const span=end-start;if(span<=this.minSpan)return [[start,end]];
      if(easing==='linear'||easing==='hold')return [[start,end]];
      const pieces=Math.max(2,Math.min(this.maxSamplesPerSpan,Math.ceil(span*this.samplesPerSecond)));
      const result=[];for(let i=0;i<pieces;i++)result.push([start+span*i/pieces,start+span*(i+1)/pieces]);return result;
    }
    bakeClip(project,clip){
      if(!this.engine.eligible(clip))return [this.clone(clip)];
      const frames=this.engine.normalize(clip);if(!frames.length)return [this.clone(clip)];
      const duration=this.engine.duration(clip),cuts=[0,...frames.map(frame=>frame.time),duration]
        .sort((a,b)=>a-b).filter((value,index,list)=>index===0||Math.abs(value-list[index-1])>this.engine.tolerance);
      const spans=[];
      for(let i=1;i<cuts.length;i++){
        const start=cuts[i-1],end=cuts[i];if(end-start<=this.minSpan)continue;
        const easing=this.easingForSpan(clip,start);
        spans.push(...this.splitSpan(start,end,easing).map(pair=>({pair,easing})));
      }
      if(!spans.length){
        const out=this.clone(clip),state=this.stateAt(clip,0);out.keyframes={start:this.legacyState(state),end:this.legacyState(state)};delete out.visualKeyframes;return [out];
      }
      const speed=Math.max(.25,Math.min(4,this.finite(clip.speed,1)||1)),sourceOffset=Math.max(0,this.finite(clip.sourceOffset,0));
      return spans.map(({pair:[localStart,localEnd],easing},index)=>{
        const out=this.clone(clip),a=this.stateAt(clip,localStart),b=easing==='hold'?a:this.stateAt(clip,localEnd);
        out.id=`${String(clip.id??'clip')}::render-kf::${index}`;
        out.start=this.finite(clip.start,0)+localStart;out.duration=localEnd-localStart;
        if(clip.asset!=null)out.sourceOffset=sourceOffset+localStart*speed;
        out.keyframes={start:this.legacyState(a),end:this.legacyState(b)};
        delete out.visualKeyframes;
        if(index>0){out.transition='cut';delete out.transitionDuration}
        return out;
      });
    }
    bakeProject(project){
      const output=this.clone(project||{}),source=Array.isArray(output.clips)?output.clips:[],clips=[];
      for(const clip of source)clips.push(...this.bakeClip(output,clip));
      output.clips=clips;output.renderCompatibility={...(output.renderCompatibility||{}),visualKeyframesBaked:true};
      return output;
    }
  }
  root.ProfitMenteVisualKeyframeRenderBaker=ProfitMenteVisualKeyframeRenderBaker;
  if(typeof module!=='undefined'&&module.exports)module.exports={ProfitMenteVisualKeyframeRenderBaker};
  if(typeof document!=='undefined'&&root.ProfitMenteBundleEngine&&!root.__profitmenteVisualKeyframeRenderBakerPatched){
    root.__profitmenteVisualKeyframeRenderBakerPatched=true;
    const original=root.ProfitMenteBundleEngine.prototype.renderLocal;
    root.ProfitMenteBundleEngine.prototype.renderLocal=async function(project,assets,onStatus=()=>{}){
      const baker=new ProfitMenteVisualKeyframeRenderBaker(),baked=baker.bakeProject(project);
      if(baked.clips.length!==(Array.isArray(project?.clips)?project.clips.length:0))onStatus(`Preparando ${baked.clips.length} segmentos de animación para MP4…`);
      return original.call(this,baked,assets,onStatus);
    };
  }
})();