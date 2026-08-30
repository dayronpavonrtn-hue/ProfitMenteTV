class ProfitMenteProjectFrameRateEngine{
  static get supported(){return [24,30,60]}
  static normalize(value,fallback=30){
    const n=Math.round(Number(value));
    if(this.supported.includes(n))return n;
    const safe=Math.round(Number(fallback));
    return this.supported.includes(safe)?safe:30;
  }
  static frameDuration(value){return 1/this.normalize(value)}
  static frameCount(duration,value){
    const seconds=Math.max(0,Number(duration)||0);
    return Math.max(1,Math.ceil(seconds*this.normalize(value)));
  }
  static apply(project,value){
    if(!project||typeof project!=='object')throw new TypeError('Proyecto inválido');
    project.fps=this.normalize(value,project.fps);
    return project.fps;
  }
}
if(typeof window!=='undefined')window.ProfitMenteProjectFrameRateEngine=ProfitMenteProjectFrameRateEngine;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteProjectFrameRateEngine;
