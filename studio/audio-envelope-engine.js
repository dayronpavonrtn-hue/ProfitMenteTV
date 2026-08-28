class ProfitMenteAudioEnvelopeEngine{
  normalize(duration,fadeIn=0.18,fadeOut=0.25){
    const d=Math.max(.001,Number(duration)||.001);
    let fi=Math.max(0,Math.min(d,Number(fadeIn)||0));
    let fo=Math.max(0,Math.min(d,Number(fadeOut)||0));
    if(fi+fo>d){const scale=d/(fi+fo);fi*=scale;fo*=scale}
    return {fadeIn:fi,fadeOut:fo};
  }
  forClip(clip){
    const duration=Math.max(.001,Number(clip?.duration)||.001);
    const fallbackIn=.18,fallbackOut=.25;
    return this.normalize(duration,clip?.fadeIn??fallbackIn,clip?.fadeOut??fallbackOut);
  }
  gainAt(clip,localTime){
    const d=Math.max(.001,Number(clip?.duration)||.001),t=Math.max(0,Math.min(d,Number(localTime)||0));
    const {fadeIn,fadeOut}=this.forClip(clip);
    let g=1;
    if(fadeIn>0&&t<fadeIn)g=Math.min(g,t/fadeIn);
    if(fadeOut>0&&t>d-fadeOut)g=Math.min(g,(d-t)/fadeOut);
    return Math.max(0,Math.min(1,g));
  }
}
if(typeof window!=='undefined')window.ProfitMenteAudioEnvelopeEngine=ProfitMenteAudioEnvelopeEngine;
if(typeof module!=='undefined')module.exports={ProfitMenteAudioEnvelopeEngine};