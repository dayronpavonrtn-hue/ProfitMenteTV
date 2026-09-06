(()=>{
  class ProfitMenteMatchFrameEngine{
    num(v,d=0){const n=Number(v);return Number.isFinite(n)?n:d}
    mediaKey(id){
      if(typeof id==='boolean'||id===null||id===undefined)return null;
      if(typeof id==='number')return Number.isFinite(id)?`n:${Object.is(id,-0)?0:id}`:null;
      if(typeof id!=='string')return `s:${String(id)}`;
      const s=id.trim();if(!s)return 's:';
      const n=Number(s);
      if(Number.isFinite(n)&&/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(s))return `n:${Object.is(n,-0)?0:n}`;
      return `s:${s}`;
    }
    sameId(a,b){const ak=this.mediaKey(a),bk=this.mediaKey(b);return ak!==null&&ak===bk}
    speed(clip){return Math.max(.25,Math.min(4,this.num(clip?.speed,1)||1))}
    sourceAssetId(clip){return clip?.freezeOriginalAsset??clip?.asset??null}
    inside(clip,t){
      if(!clip)return false;
      const start=this.num(clip.start,0),duration=Math.max(0,this.num(clip.duration,0)),time=this.num(t,start);
      return time>=start-1e-6&&time<=start+duration+1e-6;
    }
    sourceTimeAt(clip,t,asset){
      if(!clip)return {ok:false,reason:'clip-required'};
      if(!asset||!['video','audio'].includes(asset.type))return {ok:false,reason:'av-required'};
      if(!this.inside(clip,t))return {ok:false,reason:'playhead-outside'};
      const sourceDuration=Math.max(0,this.num(asset.duration,0));
      let raw;
      if(clip.freezeOriginalAsset&&Number.isFinite(Number(clip.freezeFrameSource)))raw=Math.max(0,Number(clip.freezeFrameSource));
      else{
        const local=Math.max(0,this.num(t,clip.start)-this.num(clip.start,0));
        raw=Math.max(0,this.num(clip.sourceOffset,0)+local*this.speed(clip));
      }
      const max=sourceDuration>0?Math.max(0,sourceDuration-.001):raw;
      return {ok:true,time:Math.min(raw,max),sourceDuration,assetId:this.sourceAssetId(clip)};
    }
    chooseClip(clips,t,selectedId=null){
      const list=Array.isArray(clips)?clips:[];
      const selected=list.find(c=>this.sameId(c?.id,selectedId));
      if(selected&&this.inside(selected,t))return selected;
      const candidates=list.filter(c=>this.inside(c,t)&&[0,1,2].includes(Number(c.track)));
      candidates.sort((a,b)=>{
        const ap=Number(a.track)===0?0:Number(a.track)===1?1:2;
        const bp=Number(b.track)===0?0:Number(b.track)===1?1:2;
        return ap-bp||this.num(b.start)-this.num(a.start);
      });
      return candidates[0]||null;
    }
    findAsset(assets,id){return (Array.isArray(assets)?assets:[]).find(a=>this.sameId(a?.id,id))||null}
  }
  if(typeof window!=='undefined')window.ProfitMenteMatchFrameEngine=ProfitMenteMatchFrameEngine;
  if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteMatchFrameEngine;
})();
