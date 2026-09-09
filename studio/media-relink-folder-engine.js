class ProfitMenteMediaRelinkFolderEngine{
  static key(value){if(value===undefined||value===null)return null;const s=String(value).trim();return s||null}
  static referencedIds(project={}){const out=new Set();for(const clip of project.clips||[]){const key=this.key(clip?.asset);if(key)out.add(key)}return out}
  static metadataById(project={}){const map=new Map();for(const meta of project.assets||[]){const key=this.key(meta?.id);if(key&&!map.has(key))map.set(key,meta)}return map}
  static recoveryCandidates(project={},assets=[],relinkEngine=globalThis.ProfitMenteMediaRelinkEngine){
    const referenced=this.referencedIds(project),live=new Map();for(const asset of assets||[]){const key=this.key(asset?.id);if(key&&!live.has(key))live.set(key,asset)}
    const candidates=[];for(const id of referenced){
      const current=live.get(id);if(current){if(relinkEngine?.isOffline?.(current))candidates.push({asset:current,placeholder:false});continue}
      const meta=this.metadataById(project).get(id);if(meta)candidates.push({asset:{...meta,id:meta.id??id},placeholder:true})
    }
    return candidates
  }
  static summary(project={},assets=[],relinkEngine=globalThis.ProfitMenteMediaRelinkEngine){
    const candidates=this.recoveryCandidates(project,assets,relinkEngine),missing=candidates.filter(x=>x.placeholder).length,offline=candidates.length-missing;
    return {total:candidates.length,missing,offline,candidates}
  }
  static bestCandidate(candidates=[],file={},hashes={},usedIds=new Set(),relinkEngine=globalThis.ProfitMenteMediaRelinkEngine){
    if(!relinkEngine)return {candidate:null,score:-1,ambiguous:false};const available=candidates.filter(item=>{const id=this.key(item?.asset?.id);return id&&!usedIds.has(id)});
    const match=relinkEngine.bestMatch(available.map(x=>x.asset),file,hashes);if(!match.asset)return {candidate:null,score:match.score,ambiguous:!!match.ambiguous};
    return {candidate:available.find(x=>x.asset===match.asset)||null,score:match.score,ambiguous:false}
  }
  static installRecoveredAsset(assets=[],candidate){if(!candidate?.placeholder)return candidate?.asset||null;const key=this.key(candidate.asset?.id);if(!key)return null;const existing=(assets||[]).find(a=>this.key(a?.id)===key);if(existing)return existing;assets.push(candidate.asset);candidate.placeholder=false;return candidate.asset}
}
if(typeof window!=='undefined')window.ProfitMenteMediaRelinkFolderEngine=ProfitMenteMediaRelinkFolderEngine;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteMediaRelinkFolderEngine;
