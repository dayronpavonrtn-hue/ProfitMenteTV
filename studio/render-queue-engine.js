class ProfitMenteRenderQueueEngine{
  static STATE_VERSION=1;
  static MAX_PERSISTED_ITEMS=50;
  static INTERRUPTED_ERROR='Render interrumpido al cerrar o recargar Studio. Reintenta el trabajo.';
  constructor({snapshotEngine=globalThis.ProfitMenteRenderSnapshotEngine,now=()=>Date.now(),idFactory=null}={}){
    this.snapshotEngine=snapshotEngine;
    this.now=now;
    this.idFactory=idFactory;
    this.items=[];
    this.running=false;
    this.abortController=null;
    this.sequence=0;
  }
  makeId(){
    this.sequence+=1;
    if(typeof this.idFactory==='function')return String(this.idFactory(this.sequence));
    return `render-${this.now()}-${this.sequence}`;
  }
  clone(value){
    if(typeof structuredClone==='function')return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }
  snapshot(project,assets=[]){
    if(this.snapshotEngine?.capture)return this.snapshotEngine.capture(project,assets);
    if(!project||typeof project!=='object'||Array.isArray(project))throw new Error('Proyecto inválido para la cola de render');
    return {project:this.clone(project),assets:this.clone(Array.isArray(assets)?assets:[])};
  }
  enqueue(project,assets=[],options={}){
    const snapshot=this.snapshot(project,assets);
    const item={
      id:this.makeId(),
      name:String(options.name||snapshot.project?.name||'profitmente').trim()||'profitmente',
      format:String(options.format||'mp4').toLowerCase(),
      status:'pending',
      createdAt:this.now(),
      startedAt:null,
      finishedAt:null,
      error:null,
      result:null,
      progress:null,
      project:snapshot.project,
      assets:snapshot.assets
    };
    this.items.push(item);
    return item;
  }
  get(id){return this.items.find(item=>item.id===id)||null}
  pending(){return this.items.filter(item=>item.status==='pending')}
  summary(){
    const counts={pending:0,running:0,done:0,error:0,cancelled:0};
    for(const item of this.items){if(Object.hasOwn(counts,item.status))counts[item.status]+=1}
    return {total:this.items.length,...counts,active:this.running};
  }
  exportState({maxItems=ProfitMenteRenderQueueEngine.MAX_PERSISTED_ITEMS}={}){
    const limit=Math.max(1,Math.min(200,Number(maxItems)||ProfitMenteRenderQueueEngine.MAX_PERSISTED_ITEMS));
    const items=this.items.filter(item=>item.status!=='done').slice(-limit).map(item=>({
      id:String(item.id||''),
      name:String(item.name||'profitmente'),
      format:String(item.format||'mp4').toLowerCase(),
      status:item.status,
      createdAt:Number.isFinite(Number(item.createdAt))?Number(item.createdAt):this.now(),
      startedAt:Number.isFinite(Number(item.startedAt))?Number(item.startedAt):null,
      finishedAt:Number.isFinite(Number(item.finishedAt))?Number(item.finishedAt):null,
      error:item.error==null?null:String(item.error),
      project:this.clone(item.project),
      assets:this.clone(Array.isArray(item.assets)?item.assets:[])
    }));
    return {version:ProfitMenteRenderQueueEngine.STATE_VERSION,savedAt:this.now(),items};
  }
  uniqueRestoreId(rawId,usedIds){
    let base=String(rawId??'').trim();
    if(!base)base=this.makeId();
    if(!usedIds.has(base)){usedIds.add(base);return base}
    let suffix=2,candidate=`${base}-${suffix}`;
    while(usedIds.has(candidate)){suffix+=1;candidate=`${base}-${suffix}`}
    usedIds.add(candidate);
    return candidate;
  }
  restoreState(state,{maxItems=ProfitMenteRenderQueueEngine.MAX_PERSISTED_ITEMS}={}){
    if(this.running)throw new Error('No se puede restaurar la cola durante un render activo');
    if(!state||typeof state!=='object'||Array.isArray(state))return 0;
    if(Number(state.version)!==ProfitMenteRenderQueueEngine.STATE_VERSION||!Array.isArray(state.items))return 0;
    const limit=Math.max(1,Math.min(200,Number(maxItems)||ProfitMenteRenderQueueEngine.MAX_PERSISTED_ITEMS));
    const allowed=new Set(['pending','running','error','cancelled']);
    const restored=[];
    const usedIds=new Set();
    for(const raw of state.items.slice(-limit)){
      if(!raw||typeof raw!=='object'||Array.isArray(raw)||!raw.project||typeof raw.project!=='object'||Array.isArray(raw.project))continue;
      const originalStatus=String(raw.status||'pending');
      if(originalStatus==='done'||!allowed.has(originalStatus))continue;
      const interrupted=originalStatus==='running';
      restored.push({
        id:this.uniqueRestoreId(raw.id,usedIds),
        name:String(raw.name||raw.project?.name||'profitmente').trim()||'profitmente',
        format:String(raw.format||'mp4').toLowerCase(),
        status:interrupted?'error':originalStatus,
        createdAt:Number.isFinite(Number(raw.createdAt))?Number(raw.createdAt):this.now(),
        startedAt:Number.isFinite(Number(raw.startedAt))?Number(raw.startedAt):null,
        finishedAt:interrupted?this.now():(Number.isFinite(Number(raw.finishedAt))?Number(raw.finishedAt):null),
        error:interrupted?ProfitMenteRenderQueueEngine.INTERRUPTED_ERROR:(raw.error==null?null:String(raw.error)),
        result:null,
        progress:null,
        project:this.clone(raw.project),
        assets:this.clone(Array.isArray(raw.assets)?raw.assets:[])
      });
    }
    this.items=restored;
    this.abortController=null;
    this.running=false;
    this.sequence=Math.max(this.sequence,restored.length);
    return restored.length;
  }
  remove(id){
    const index=this.items.findIndex(item=>item.id===id);
    if(index<0)return false;
    if(this.items[index].status==='running')return false;
    this.items.splice(index,1);return true;
  }
  movePending(id,direction){
    if(this.running)return false;
    const pending=this.pending();
    const pos=pending.findIndex(item=>item.id===id);
    if(pos<0)return false;
    const delta=Number(direction);
    if(!Number.isFinite(delta)||delta===0)return false;
    const targetPos=Math.max(0,Math.min(pending.length-1,pos+(delta<0?-1:1)));
    if(targetPos===pos)return false;
    const currentIndex=this.items.indexOf(pending[pos]);
    const targetIndex=this.items.indexOf(pending[targetPos]);
    [this.items[currentIndex],this.items[targetIndex]]=[this.items[targetIndex],this.items[currentIndex]];
    return true;
  }
  retry(id){
    if(this.running)return false;
    const item=this.get(id);
    if(!item||!['error','cancelled'].includes(item.status))return false;
    item.status='pending';
    item.startedAt=null;
    item.finishedAt=null;
    item.error=null;
    item.result=null;
    item.progress=null;
    return true;
  }
  retryFailed(){
    if(this.running)return 0;
    let count=0;
    for(const item of this.items)if(item.status==='error'&&this.retry(item.id))count+=1;
    return count;
  }
  clearFinished(){
    const before=this.items.length;
    this.items=this.items.filter(item=>!['done','error','cancelled'].includes(item.status));
    return before-this.items.length;
  }
  cancel({cancelPending=true}={}){
    if(this.abortController&&!this.abortController.signal.aborted)this.abortController.abort();
    let cancelled=0;
    if(cancelPending){
      const finishedAt=this.now();
      for(const item of this.items){
        if(item.status==='pending'){item.status='cancelled';item.finishedAt=finishedAt;cancelled+=1}
      }
    }
    return cancelled;
  }
  async run(worker,{continueOnError=true,onUpdate=()=>{}}={}){
    if(typeof worker!=='function')throw new Error('La cola necesita un trabajador de render');
    if(this.running)throw new Error('La cola de render ya está procesándose');
    this.running=true;
    this.abortController=new AbortController();
    const signal=this.abortController.signal;
    const notify=item=>{try{onUpdate(item,this.summary())}catch{}};
    try{
      while(!signal.aborted){
        const item=this.items.find(candidate=>candidate.status==='pending');
        if(!item)break;
        item.status='running';item.startedAt=this.now();item.error=null;notify(item);
        try{
          const result=await worker(item,signal,progress=>{item.progress=progress;notify(item)});
          if(signal.aborted){item.status='cancelled';item.finishedAt=this.now();notify(item);break}
          item.status='done';item.result=result??null;item.finishedAt=this.now();notify(item);
        }catch(error){
          item.finishedAt=this.now();
          if(signal.aborted||error?.name==='AbortError'){
            item.status='cancelled';item.error=null;notify(item);break;
          }
          item.status='error';item.error=error?.message||String(error);notify(item);
          if(!continueOnError)break;
        }
      }
    }finally{
      this.running=false;this.abortController=null;
      onUpdate(null,this.summary());
    }
    return this.summary();
  }
}
if(typeof window!=='undefined')window.ProfitMenteRenderQueueEngine=ProfitMenteRenderQueueEngine;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteRenderQueueEngine;
