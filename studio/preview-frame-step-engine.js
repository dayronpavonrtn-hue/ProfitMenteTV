class ProfitMentePreviewFrameStepEngine{
  static scalarNumber(value){
    if(typeof value==='number')return Number.isFinite(value)?value:null;
    if(typeof value!=='string')return null;
    const text=value.trim();
    if(!text||!^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(text))return null;
    const number=Number(text);
    return Number.isFinite(number)?number:null;
  }
  static fps(project){
    const value=this.scalarNumber(project?.fps);
    return Number.isInteger(value)&&[24,30,60].includes(value)?value:30;
  }
  static duration(project){
    const value=this.scalarNumber(project?.duration);
    return value!==null&&value>=0?value:0;
  }
  static frame(project){return 1/this.fps(project)}
  static clamp(project,time){
    const value=this.scalarNumber(time);
    const duration=this.duration(project);
    if(value===null)return 0;
    return Math.max(0,Math.min(duration,value));
  }
  static step(project,time,frames=1){
    const amount=this.scalarNumber(frames);
    if(!Number.isInteger(amount))return {ok:false,reason:'frames',time:this.clamp(project,time)};
    const fps=this.fps(project),duration=this.duration(project),current=this.clamp(project,time);
    const currentFrame=Math.round(current*fps);
    const maxFrame=Math.max(0,Math.round(duration*fps));
    const targetFrame=Math.max(0,Math.min(maxFrame,currentFrame+amount));
    return {ok:true,time:targetFrame/fps,frame:targetFrame,fps,boundary:targetFrame===0||targetFrame===maxFrame};
  }
  static seekFrame(project,frame){
    const target=this.scalarNumber(frame);
    if(!Number.isInteger(target))return {ok:false,reason:'frame',time:0};
    const fps=this.fps(project),maxFrame=Math.max(0,Math.round(this.duration(project)*fps));
    const clamped=Math.max(0,Math.min(maxFrame,target));
    return {ok:true,time:clamped/fps,frame:clamped,fps,boundary:clamped!==target};
  }
}
if(typeof window!=='undefined')window.ProfitMentePreviewFrameStepEngine=ProfitMentePreviewFrameStepEngine;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMentePreviewFrameStepEngine;
