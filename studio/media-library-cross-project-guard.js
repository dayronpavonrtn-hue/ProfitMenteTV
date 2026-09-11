(function(root,factory){
  const Guard=factory();
  if(typeof module==='object'&&module.exports)module.exports=Guard;
  if(root)root.ProfitMenteMediaLibraryCrossProjectGuard=Guard;
  if(typeof window!=='undefined'&&window.ProfitMenteMediaLibraryTools){
    Guard.install(window.ProfitMenteMediaLibraryTools,{storage:window.localStorage});
    Guard.installMediaCardContract();
    Guard.loadTimelineDnD();
    queueMicrotask(()=>{try{if(typeof drawLibrary==='function')drawLibrary()}catch(err){console.warn('ProfitMente media cleanup refresh failed',err)}});
  }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  class ProfitMenteMediaLibraryCrossProjectGuard{
    static mediaIdKey(value){
      if(value===undefined||value===null||typeof value==='boolean'||typeof value==='symbol'||typeof value==='bigint'||typeof value==='object')return null;
      if(typeof value==='number'){
        if(!Number.isSafeInteger(value)||value<0)return null;
        return String(Object.is(value,-0)?0:value);
      }
      const raw=value.trim();if(!raw)return null;
      if(/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(raw)){
        const numeric=Number(raw);
        if(!Number.isSafeInteger(numeric)||numeric<0)return null;
        return String(Object.is(numeric,-0)?0:numeric);
      }
      return raw;
    }
    static libraryIdKey(value){
      if(value===undefined||value===null||typeof value==='boolean'||typeof value==='symbol'||typeof value==='bigint'||typeof value==='object')return null;
      if(typeof value==='number'){
        if(!Number.isSafeInteger(value)||value<0)return null;
        return String(Object.is(value,-0)?0:value);
      }
      const raw=value.trim();return raw||null;
    }
    static sameProject(a,b){
      const left=this.libraryIdKey(a?.libraryId),right=this.libraryIdKey(b?.libraryId);
      return left!==null&&right!==null&&left===right;
    }
    static readSavedProjectSnapshot(storage,key='profitmente-project-library'){
      if(!storage?.getItem)return {available:false,projects:[]};
      try{
        const raw=storage.getItem(key);
        if(raw===null||raw==='')return {available:true,projects:[]};
        const rows=JSON.parse(raw);
        if(!Array.isArray(rows))return {available:false,projects:[]};
        const projects=rows.map(row=>row?.project).filter(project=>project&&typeof project==='object'&&!Array.isArray(project));
        return {available:true,projects};
      }catch{return {available:false,projects:[]}}
    }
    static readSavedProjects(storage,key='profitmente-project-library'){
      return this.readSavedProjectSnapshot(storage,key).projects;
    }
    static projectScope(currentProject,savedProjects=[]){
      const out=[];
      if(currentProject&&typeof currentProject==='object'&&!Array.isArray(currentProject))out.push(currentProject);
      for(const project of savedProjects||[])if(project&&typeof project==='object'&&!Array.isArray(project))out.push(project);
      return out;
    }
    static clipsUsing(project,id){
      const wanted=this.mediaIdKey(id);if(wanted===null)return [];
      return (Array.isArray(project?.clips)?project.clips:[]).filter(clip=>this.mediaIdKey(clip?.asset)===wanted);
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
    static installMediaCardContract({doc=typeof document!=='undefined'?document:null,getDraw=()=>typeof drawLibrary==='function'?drawLibrary:null,setDraw=fn=>{drawLibrary=fn}}={}){
      if(!doc)return false;
      const library=doc.querySelector?.('#mediaLibrary');if(!library||library.dataset?.pmMediaCardContract==='1')return !!library;
      const current=getDraw?.();if(typeof current!=='function')return false;
      const wrapped=function(...args){
        const nativeAppend=library.appendChild;
        library.appendChild=function(node){
          if(node?.tagName==='BUTTON'&&node?.classList?.add)node.classList.add('mediaCard');
          return nativeAppend.call(this,node);
        };
        try{return current.apply(this,args)}finally{library.appendChild=nativeAppend}
      };
      setDraw(wrapped);
      if(library.dataset)library.dataset.pmMediaCardContract='1';
      return true;
    }
    static loadTimelineDnD({doc=typeof document!=='undefined'?document:null,src='./media-timeline-dnd.js'}={}){
      if(!doc||typeof window==='undefined')return false;
      if(window.ProfitMenteMediaTimelineDnD||doc.querySelector?.('script[data-profitmente-media-timeline-dnd="1"]'))return true;
      const script=doc.createElement?.('script');if(!script)return false;
      script.src=src;script.dataset.profitmenteMediaTimelineDnd='1';script.async=false;
      script.onerror=()=>console.warn('ProfitMente media timeline drag-and-drop could not be loaded');
      (doc.body||doc.head||doc.documentElement)?.appendChild(script);
      return true;
    }
    static install(tools,{storage,key='profitmente-project-library'}={}){
      if(!tools||tools.__crossProjectCleanupGuard)return tools;
      const originalUnusedBytes=typeof tools.unusedBytes==='function'?tools.unusedBytes.bind(tools):null;
      const originalUsage=typeof tools.usage==='function'?tools.usage.bind(tools):null;
      tools.crossProjectUsage=function(currentProject,id){
        const snapshot=ProfitMenteMediaLibraryCrossProjectGuard.readSavedProjectSnapshot(storage,key);
        const current=originalUsage?originalUsage(currentProject,id):ProfitMenteMediaLibraryCrossProjectGuard.clipsUsing(currentProject,id);
        if(!snapshot.available)return {available:false,current,otherProjects:[],otherClips:[]};
        const otherProjects=snapshot.projects.filter(saved=>!ProfitMenteMediaLibraryCrossProjectGuard.sameProject(currentProject,saved));
        const usedProjects=[],otherClips=[];
        for(const saved of otherProjects){
          const clips=ProfitMenteMediaLibraryCrossProjectGuard.clipsUsing(saved,id);
          if(clips.length){usedProjects.push(saved);otherClips.push(...clips)}
        }
        return {available:true,current,otherProjects:usedProjects,otherClips};
      };
      tools.unused=function(currentProject,assets=[]){
        const snapshot=ProfitMenteMediaLibraryCrossProjectGuard.readSavedProjectSnapshot(storage,key);
        if(!snapshot.available)return [];
        return ProfitMenteMediaLibraryCrossProjectGuard.unusedAcross(
          ProfitMenteMediaLibraryCrossProjectGuard.projectScope(currentProject,snapshot.projects),assets
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