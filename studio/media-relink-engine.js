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
  static hashSet(value=''){
    if(value&&typeof value==='object')return {current:String(value.current||''),legacy:String(value.legacy||''),version:String(value.version||'')};
    const current=String(value||'');return {current,legacy:'',version:''};
  }
  static fingerprintMatches(asset,file){
    if(!asset?.sourceFingerprint||typeof ProfitMenteMediaImportEngine==='undefined')return false;
    return ProfitMenteMediaImportEngine.signature(file)===asset.sourceFingerprint;
  }
  static identity(asset,file,hashInput=''){
    if(!this.compatible(asset,file))return {ok:false,reason:'incompatible',confidence:'none'};
    const hashes=this.hashSet(hashInput),storedCurrent=String(asset?.sourceContentHash||''),storedLegacy=String(asset?.sourceLegacyContentHash||''),storedVersion=String(asset?.sourceHashVersion||''),fingerprintMatch=this.fingerprintMatches(asset,file);
    const structured=!!hashInput&&typeof hashInput==='object';
    if(structured){
      if(storedVersion==='sample-v2'&&storedCurrent&&hashes.current){
        if(storedCurrent!==hashes.current)return {ok:false,reason:'content-hash-mismatch',confidence:'strong'};
        return {ok:true,reason:'content-hash-match',confidence:'strong'};
      }
      // Projects created during the sample-v2 rollout may have kept the modern
      // content hash but lost sourceHashVersion when a used asset became offline.
      // A direct current-hash equality is still collision-resistant and safe.
      if(!storedVersion&&storedCurrent&&hashes.current&&storedCurrent===hashes.current)return {ok:true,reason:'content-hash-match',confidence:'strong'};
      const expectedLegacy=storedLegacy||(!storedVersion?storedCurrent:'');
      if(expectedLegacy&&hashes.legacy){
        if(expectedLegacy===hashes.legacy){
          // The former first+last-MB hash can collide for large files. Require
          // the original metadata fingerprint as a second factor before an
          // automatic legacy relink. Without it, continue to conservative
          // name/size matching rather than treating the hash as authoritative.
          if(fingerprintMatch)return {ok:true,reason:'legacy-content-hash-match',confidence:'high'};
        }else if(!storedVersion)return {ok:false,reason:'content-hash-mismatch',confidence:'strong'};
      }
      if(storedVersion==='sample-v2'&&storedCurrent&&hashes.current)return {ok:false,reason:'content-hash-mismatch',confidence:'strong'};
    }else if(storedCurrent&&hashes.current){
      // Backwards compatibility for callers/tests that still pass one hash.
      if(storedCurrent!==hashes.current)return {ok:false,reason:'content-hash-mismatch',confidence:'strong'};
      return {ok:true,reason:'content-hash-match',confidence:'strong'};
    }
    if(fingerprintMatch)return {ok:true,reason:'fingerprint-match',confidence:'high'};
    const name=this.normalizedName(file),assetName=this.normalizedName(asset),size=this.fileSize(file),assetSize=this.fileSize(asset);
    if(name&&name===assetName&&size&&assetSize&&size===assetSize)return {ok:true,reason:'name-size-match',confidence:'legacy'};
    if(name&&name===assetName)return {ok:true,reason:'name-match',confidence:'legacy'};
    return {ok:false,reason:'no-match',confidence:'none'};
  }
  static score(asset,file,hashInput=''){
    const identity=this.identity(asset,file,hashInput);
    if(!identity.ok)return -1;
    if(identity.reason==='content-hash-match')return 100;
    if(identity.reason==='legacy-content-hash-match')return 95;
    if(identity.reason==='fingerprint-match')return 90;
    if(identity.reason==='name-size-match')return 80;
    if(identity.reason==='name-match')return 60;
    return -1;
  }
  static bestMatch(assets=[],file={},hashInput=''){
    const ranked=(assets||[]).map(asset=>({asset,score:this.score(asset,file,hashInput)})).filter(x=>x.score>=0).sort((a,b)=>b.score-a.score);
    if(!ranked.length)return {asset:null,score:-1,ambiguous:false};
    const best=ranked[0],ambiguous=ranked.length>1&&ranked[1].score===best.score;
    return {asset:ambiguous?null:best.asset,score:best.score,ambiguous};
  }
  static invalidateDerivedMetadata(asset={}){
    for(const key of ['metadataVersion','duration','width','height','thumbnail','mediaReadable','mediaError'])delete asset[key];
    return asset;
  }
  static apply(asset,file,hashInput=''){
    const identity=this.identity(asset,file,hashInput);
    if(!identity.ok)return {ok:false,reason:identity.reason,confidence:identity.confidence};
    const hashes=this.hashSet(hashInput),before={name:asset.name,mime:asset.mime,size:this.fileSize(asset),sourceFingerprint:asset.sourceFingerprint,sourceContentHash:asset.sourceContentHash,sourceLegacyContentHash:asset.sourceLegacyContentHash,sourceHashVersion:asset.sourceHashVersion,duration:asset.duration,width:asset.width,height:asset.height,thumbnail:asset.thumbnail,metadataVersion:asset.metadataVersion,mediaReadable:asset.mediaReadable,mediaError:asset.mediaError};
    this.invalidateDerivedMetadata(asset);
    asset.blob=file;
    asset.name=file.name||asset.name;
    asset.mime=file.type||asset.mime||'';
    asset.size=Number(file.size||0);
    asset.sourceLastModified=Number(file.lastModified||0);
    asset.sourceFingerprint=typeof ProfitMenteMediaImportEngine!=='undefined'?ProfitMenteMediaImportEngine.signature(file):asset.sourceFingerprint;
    if(hashes.current)asset.sourceContentHash=hashes.current;
    if(hashes.legacy)asset.sourceLegacyContentHash=hashes.legacy;
    if(hashes.version)asset.sourceHashVersion=hashes.version;
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
