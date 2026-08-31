class ProfitMenteRenderQualityEngine{
  static presets(){return {
    draft:{id:'draft',label:'Borrador',description:'Render rápido para revisar',preset:'veryfast',crf:27,audioBitrate:'128k'},
    standard:{id:'standard',label:'Estándar',description:'Buen balance de calidad y velocidad',preset:'fast',crf:21,audioBitrate:'160k'},
    high:{id:'high',label:'Alta',description:'Calidad final',preset:'medium',crf:18,audioBitrate:'192k'}
  }}
  static normalize(value='high'){
    const key=String(value||'high').trim().toLowerCase();
    return this.presets()[key]?key:'high';
  }
  static resolve(value='high'){return {...this.presets()[this.normalize(value)]}}
  static apply(project,value='high'){
    if(!project||typeof project!=='object')throw new Error('Proyecto inválido');
    project.renderQuality=this.normalize(value);return this.resolve(project.renderQuality);
  }
}
if(typeof window!=='undefined')window.ProfitMenteRenderQualityEngine=ProfitMenteRenderQualityEngine;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteRenderQualityEngine;
