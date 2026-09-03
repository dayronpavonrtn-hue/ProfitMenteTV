(function(root,factory){
  const Guard=factory();
  if(typeof module==='object'&&module.exports)module.exports=Guard;
  if(root)root.ProfitMenteMediaLibraryCrossProjectGuard=Guard;
  if(typeof window!=='undefined'&&window.ProfitMenteMediaLibraryTools){
    Guard.install(window.ProfitMenteMediaLibraryTools,{storage:window.localStorage});
    queueMicrotask(()=>{try{if(typeof drawLibrary==='function')drawLibrary()}catch(err){console.warn('ProfitMente media cleanup refresh failed',err)}});
  }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  class ProfitMenteMediaLibraryCrossProjectGuard{
    static mediaIdKey(value){
      if(value===undefined||value===null)return null;
      const key=String(value).trim();
      return key||null;
    }
    static readSavedProjects(storage,key='profitmente-project-library'){
      if(!storage?.getItem)return [];
      try{
        const rows=JSON.parse(storage.getItem(key)||'[]');
        if(!Array.isArray(rows))return [];
        return rows.map(row=>row?.project).filter(project=>project&&typeof project==='object'&&!Array.isArray(project));
      }catch{return []}
    }
    static projectScope(currentProject,savedProjects=[]){
      const out=[];
      if(currentProject&&typeof currentProject==='object'&&!Array.isArray(currentProject))out.push(currentProject);
      for(const project of savedProjects||[])if(project&&typeof project==='object'&&!Array.isArray(project))out.push(project);
      return out;
    }
    static usedIdsAcross(projects=[]){
      const used=new Set();
      for(const project of projects||[]){
        const clips=Array.isArray(project?.clips)?project.clips:[];
        for(const clip of clips){
          const key=this.mediaIdKey(clip?.asset);
          if(key!==null)used.add(key);
        }
      }
      return used;
    }
    static unusedAcross(projects=[],assets=[]){
      const used=this.usedIdsAcross(projects);
      return (assets||[]).filter(asset=>{
        const key=this.mediaIdKey(asset?.id);
        return key!==null&&!used.has(key);
      });
    }
    static install(tools,{storage,key='profitmente-project-library'}={}){
      if(!tools||tools.__crossProjectCleanupGuard)return tools;
      const originalUnusedBytes=typeof tools.unusedBytes==='function'?tools.unusedBytes.bind(tools):null;
      tools.unused=function(currentProject,assets=[]){
        const saved=ProfitMenteMediaLibraryCrossProjectGuard.readSavedProjects(storage,key);
        return ProfitMenteMediaLibraryCrossProjectGuard.unusedAcross(
          ProfitMenteMediaLibraryCrossProjectGuard.projectScope(currentProject,saved),assets
        );
      };
      tools.unusedBytes=function(currentProject,assets=[]){
        const unused=tools.unused(currentProject,assets);
        if(typeof tools.assetBytes==='function')return unused.reduce((sum,asset)=>sum+tools.assetBytes(asset),0);
        if(originalUnusedBytes)return originalUnusedBytes({clips:[]},unused);
        return 0;
      };
      Object.defineProperty(tools,'__crossProjectCleanupGuard',{value:true,configurable:true});
      return tools;
    }
  }
  return ProfitMenteMediaLibraryCrossProjectGuard;
});
