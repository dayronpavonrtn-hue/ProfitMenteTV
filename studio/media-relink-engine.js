class ProfitMenteMediaRelinkEngine{
  static kind(file={}){
    if(typeof ProfitMenteMediaImportEngine!=='undefined')return ProfitMenteMediaImportEngine.kind(file);
    const mime=String(file.type||file.mime||'').toLowerCase(),top=mime.split('/')[0];
    return ['video','image','audio'].includes(top)?top:null;
  }
  static fileSize(value={}){return Math.max(0,Number(value.size??value.blob?.size??value.sourceSize??0)||0)}
  static normalizedName(value={}){return String(value.name||'').trim().toLowerCase()}
  static isOffline(asset={}){
    const hasBlob=typeof Blob!=='undefined'&&asset.blob instanceof Blob;
    return !hasBlob&&!asset.objectUrl&&!asset.url&&!asset.src;
  }
  static compatible(asset,file){return !!asset&&!!file&&asset.type===this.kind(file)}
  static identity(asset,file,hash=''){
    if(!this.compatible(asset,file))return {ok:false,reason:'incompatible',confidence:'none'};
    const storedHash=String(asset?.sourceContentHash||''),incomingHash=String(hash||'');
    if(storedHash&&incomingHash){
      if(storedHash!==incomingHash)return {ok:false,reason:'content-hash-mismatch',confidence:'strong'};
      return {ok:true,reason:'content-hash-match',confidence:'strong'};
    }
    if(asset?.sourceFingerprint&&typeof ProfitMenteMediaImportEngine!=='undefined'){
      const fingerprint=ProfitMenteMediaImportEngine.signature(file);
      if(fingerprint===asset.sourceFingerprint)return {ok:true,reason:'fingerprint-match',confidence:'high'};
    }
    const name=this.normalizedName(file),assetName=this.normalizedName(asset),size=this.fileSize(file),assetSize=this.fileSize(asset);
    if(name&&name===assetName&&size&&assetSize&&size===assetSize)return {ok:true,reason:'name-size-match',confidence:'legacy'};
    if(name&&name===assetName)return {ok:true,reason:'name-match',confidence:'legacy'};
    return {ok:false,reason:'no-match',confidence:'none'};
  }
  static score(asset,file,hash=''){
    const identity=this.identity(asset,file,hash);
    if(!identity.ok)return -1;
    if(identity.reason==='content-hash-match')return 100;
    if(identity.reason==='fingerprint-match')return 90;
    if(identity.reason==='name-size-match')return 80;
    if(identity.reason==='name-match')return 60;
    return -1;
  }
  static bestMatch(assets=[],file={},hash=''){
    const ranked=(assets||[]).map(asset=>({asset,score:this.score(asset,file,hash)})).filter(x=>x.score>=0).sort((a,b)=>b.score-a.score);
    if(!ranked.length)return {asset:null,score:-1,ambiguous:false};
    const best=ranked[0],ambiguous=ranked.length>1&&ranked[1].score===best.score;
    return {asset:ambiguous?null:best.asset,score:best.score,ambiguous};
  }
  static invalidateDerivedMetadata(asset={}){
    for(const key of ['metadataVersion','duration','width','height','thumbnail','mediaReadable','mediaError'])delete asset[key];
    return asset;
  }
  static apply(asset,file,hash=''){
    const identity=this.identity(asset,file,hash);
    if(!identity.ok)return {ok:false,reason:identity.reason,confidence:identity.confidence};
    const before={name:asset.name,mime:asset.mime,size:this.fileSize(asset),sourceFingerprint:asset.sourceFingerprint,sourceContentHash:asset.sourceContentHash,duration:asset.duration,width:asset.width,height:asset.height,thumbnail:asset.thumbnail,metadataVersion:asset.metadataVersion,mediaReadable:asset.mediaReadable,mediaError:asset.mediaError};
    this.invalidateDerivedMetadata(asset);
    asset.blob=file;
    asset.name=file.name||asset.name;
    asset.mime=file.type||asset.mime||'';
    asset.size=Number(file.size||0);
    asset.sourceLastModified=Number(file.lastModified||0);
    asset.sourceFingerprint=typeof ProfitMenteMediaImportEngine!=='undefined'?ProfitMenteMediaImportEngine.signature(file):asset.sourceFingerprint;
    if(hash)asset.sourceContentHash=hash;
    asset.relinkedAt=new Date().toISOString();
    asset.relinkConfidence=identity.confidence;
    return {ok:true,asset,before,identity};
  }
  static sourceWindowIssues(project={},assets=[]){
    const map=new Map((assets||[]).map(a=>[a.id,a])),issues=[];
    for(const clip of project.clips||[]){
      const asset=map.get(clip.asset);if(!asset||!['video','audio'].includes(asset.type))continue;
      const native=Math.max(0,Number(asset.duration)||0);if(!native)continue;
      const offset=Math.max(0,Number(clip.sourceOffset)||0),duration=Math.max(0,Number(clip.duration)||0),speed=Math.max(.01,Number(clip.speed)||1),end=offset+duration*speed;
      if(end>native+.15)issues.push({clipId:clip.id,assetId:asset.id,required:end,available:native});
    }
    return issues;
  }
}
if(typeof window!=='undefined')window.ProfitMenteMediaRelinkEngine=ProfitMenteMediaRelinkEngine;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteMediaRelinkEngine;
