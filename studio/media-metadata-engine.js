(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  class ProfitMenteMediaMetadataEngine{
    static orientation(width,height){width=Number(width)||0;height=Number(height)||0;if(!width||!height)return 'unknown';if(Math.abs(width-height)<=Math.max(width,height)*.03)return 'square';return width>height?'landscape':'portrait'}
    static resolutionClass(width,height){const edge=Math.max(Number(width)||0,Number(height)||0);if(!edge)return 'unknown';if(edge>=3840)return '4k';if(edge>=1920)return 'fhd';if(edge>=1280)return 'hd';return 'sd'}
    static normalize(meta={}){
      const duration=Number(meta.duration),width=Math.max(0,Math.round(Number(meta.width)||0)),height=Math.max(0,Math.round(Number(meta.height)||0));
      return {
        duration:Number.isFinite(duration)&&duration>0?duration:0,
        width,height,
        orientation:this.orientation(width,height),
        resolutionClass:this.resolutionClass(width,height)
      };
    }
    static needsProbe(asset={}){
      if(!asset?.blob)return false;
      if(asset.type==='image')return !(Number(asset.width)>0&&Number(asset.height)>0);
      if(['video','audio'].includes(asset.type))return !(Number(asset.duration)>0&&(asset.type!=='video'||(Number(asset.width)>0&&Number(asset.height)>0)));
      return false;
    }
    static async probe(blob,type){
      if(!(blob instanceof Blob))throw new Error('Medio inválido para analizar');
      type=String(type||'').toLowerCase();
      if(type==='image')return this.probeImage(blob);
      if(type==='video'||type==='audio')return this.probeMedia(blob,type);
      return this.normalize({});
    }
    static async probeImage(blob){
      if(typeof createImageBitmap==='function'){
        const bitmap=await createImageBitmap(blob);try{return this.normalize({width:bitmap.width,height:bitmap.height})}finally{bitmap.close?.()}
      }
      if(typeof document==='undefined'||typeof URL==='undefined')throw new Error('No hay decodificador de imagen disponible');
      const url=URL.createObjectURL(blob);try{return await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(this.normalize({width:img.naturalWidth||img.width,height:img.naturalHeight||img.height}));img.onerror=()=>reject(new Error('No se pudo leer la imagen'));img.src=url})}finally{URL.revokeObjectURL(url)}
    }
    static async probeMedia(blob,type){
      if(typeof document==='undefined'||typeof URL==='undefined')throw new Error('No hay decodificador multimedia disponible');
      const el=document.createElement(type==='audio'?'audio':'video'),url=URL.createObjectURL(blob);
      el.preload='metadata';el.muted=true;
      try{return await new Promise((resolve,reject)=>{
        const done=()=>resolve(this.normalize({duration:el.duration,width:type==='video'?el.videoWidth:0,height:type==='video'?el.videoHeight:0}));
        const fail=()=>reject(new Error('No se pudieron leer los metadatos del medio'));
        el.addEventListener('loadedmetadata',done,{once:true});el.addEventListener('error',fail,{once:true});el.src=url;el.load?.();
      })}finally{el.removeAttribute?.('src');el.load?.();URL.revokeObjectURL(url)}
    }
    static apply(asset={},meta={}){
      const n=this.normalize(meta);asset.duration=n.duration||Number(asset.duration)||0;asset.width=n.width||Number(asset.width)||0;asset.height=n.height||Number(asset.height)||0;asset.orientation=n.orientation!=='unknown'?n.orientation:(asset.orientation||'unknown');asset.resolutionClass=n.resolutionClass!=='unknown'?n.resolutionClass:(asset.resolutionClass||'unknown');asset.metadataVersion=1;return asset;
    }
    static label(asset={}){
      const parts=[];if(Number(asset.width)>0&&Number(asset.height)>0)parts.push(`${asset.width}×${asset.height}`);if(Number(asset.duration)>0)parts.push(`${asset.duration<60?asset.duration.toFixed(1):Math.floor(asset.duration/60)+':'+String(Math.round(asset.duration%60)).padStart(2,'0')}`);return parts.join(' · ');
    }
  }
  root.ProfitMenteMediaMetadataEngine=ProfitMenteMediaMetadataEngine;
  if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteMediaMetadataEngine;
})();
