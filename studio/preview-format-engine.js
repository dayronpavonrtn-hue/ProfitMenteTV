class ProfitMentePreviewFormatEngine{
  static normalize(format){return ['9:16','16:9','1:1'].includes(format)?format:'9:16'}
  static dimensions(format,quality='full'){
    format=this.normalize(format);quality=['draft','balanced','full'].includes(quality)?quality:'full';
    const base={
      '9:16':{full:[540,960],balanced:[360,640],draft:[270,480]},
      '16:9':{full:[960,540],balanced:[640,360],draft:[480,270]},
      '1:1':{full:[720,720],balanced:[480,480],draft:[360,360]}
    }[format][quality];
    return {width:base[0],height:base[1],format,quality,aspect:base[0]/base[1]};
  }
  static apply(canvas,format,quality='full'){
    if(!canvas)return {changed:false,...this.dimensions(format,quality)};
    const next=this.dimensions(format,quality),changed=canvas.width!==next.width||canvas.height!==next.height;
    if(changed){canvas.width=next.width;canvas.height=next.height}
    if(canvas.dataset){canvas.dataset.projectFormat=next.format;canvas.dataset.previewQuality=next.quality}
    return {changed,...next};
  }
  static exportDimensions(format){
    format=this.normalize(format);
    return format==='9:16'?{width:1080,height:1920}:format==='16:9'?{width:1920,height:1080}:{width:1080,height:1080};
  }
}
if(typeof window!=='undefined')window.ProfitMentePreviewFormatEngine=ProfitMentePreviewFormatEngine;
if(typeof globalThis!=='undefined')globalThis.ProfitMentePreviewFormatEngine=ProfitMentePreviewFormatEngine;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMentePreviewFormatEngine;
