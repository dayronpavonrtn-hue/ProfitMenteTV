class ProfitMenteRenderQueueStorageEngine{
  static DB_NAME='profitmente-studio-render-queue';
  static STORE_NAME='render-queue';
  static RECORD_KEY='mp4:v1';
  constructor({indexedDBFactory=globalThis.indexedDB,localStorageRef=globalThis.localStorage,dbName=ProfitMenteRenderQueueStorageEngine.DB_NAME,storeName=ProfitMenteRenderQueueStorageEngine.STORE_NAME,key=ProfitMenteRenderQueueStorageEngine.RECORD_KEY}={}){
    this.indexedDBFactory=indexedDBFactory;
    this.localStorageRef=localStorageRef;
    this.dbName=dbName;
    this.storeName=storeName;
    this.key=key;
  }
  hasStructuredValue(value,seen=new Set()){
    if(value===undefined)return true;
    if(value==null)return false;
    const type=typeof value;
    if(type==='bigint'||type==='function'||type==='symbol')return true;
    if(type==='number'&&!Number.isFinite(value))return true;
    if(typeof Blob!=='undefined'&&value instanceof Blob)return true;
    if(typeof File!=='undefined'&&value instanceof File)return true;
    if(typeof ArrayBuffer!=='undefined'&&value instanceof ArrayBuffer)return true;
    if(typeof ArrayBuffer!=='undefined'&&ArrayBuffer.isView?.(value))return true;
    if(typeof Map!=='undefined'&&value instanceof Map)return true;
    if(typeof Set!=='undefined'&&value instanceof Set)return true;
    if(typeof Date!=='undefined'&&value instanceof Date)return true;
    if(typeof RegExp!=='undefined'&&value instanceof RegExp)return true;
    if(type!=='object'||seen.has(value))return false;
    seen.add(value);
    if(Array.isArray(value))return value.some(item=>this.hasStructuredValue(item,seen));
    const proto=Object.getPrototypeOf(value);
    if(proto!==Object.prototype&&proto!==null)return true;
    return Reflect.ownKeys(value).some(key=>typeof key==='symbol'||this.hasStructuredValue(value[key],seen));
  }
  hasBinary(value,seen=new Set()){return this.hasStructuredValue(value,seen)}
  open(){
    if(!this.indexedDBFactory?.open)return Promise.resolve(null);
    return new Promise((resolve,reject)=>{
      const request=this.indexedDBFactory.open(this.dbName,1);
      request.onupgradeneeded=()=>{
        const db=request.result;
        if(!db.objectStoreNames.contains(this.storeName))db.createObjectStore(this.storeName);
      };
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error||new Error('No se pudo abrir IndexedDB'));
    });
  }
  saveFallback(state){
    // localStorage is JSON-only. Reject anything JSON would drop, coerce or corrupt.
    if(this.hasStructuredValue(state))return false;
    try{this.localStorageRef?.setItem?.(this.key,JSON.stringify(state));return true}catch{return false}
  }
  loadFallback(){
    try{
      const raw=this.localStorageRef?.getItem?.(this.key);
      return raw?JSON.parse(raw):null;
    }catch{return null}
  }
  async save(state){
    if(!state||typeof state!=='object')return false;
    let db=null;
    try{db=await this.open()}catch{}
    if(db){
      try{
        await new Promise((resolve,reject)=>{
          const tx=db.transaction(this.storeName,'readwrite');
          tx.objectStore(this.storeName).put(state,this.key);
          tx.oncomplete=()=>resolve();
          tx.onerror=()=>reject(tx.error||new Error('No se pudo guardar la cola'));
          tx.onabort=()=>reject(tx.error||new Error('Guardado de cola cancelado'));
        });
        try{this.localStorageRef?.removeItem?.(this.key)}catch{}
        return true;
      }catch{}
      finally{db.close?.()}
    }
    return this.saveFallback(state);
  }
  async load(){
    let db=null;
    try{db=await this.open()}catch{}
    if(db){
      try{
        const state=await new Promise((resolve,reject)=>{
          const tx=db.transaction(this.storeName,'readonly');
          const request=tx.objectStore(this.storeName).get(this.key);
          request.onsuccess=()=>resolve(request.result??null);
          request.onerror=()=>reject(request.error||new Error('No se pudo leer la cola'));
        });
        if(state!=null)return state;
      }catch{}
      finally{db.close?.()}
    }
    return this.loadFallback();
  }
  async clear(){
    let db=null;
    try{db=await this.open()}catch{}
    if(db){
      try{
        await new Promise((resolve,reject)=>{
          const tx=db.transaction(this.storeName,'readwrite');
          tx.objectStore(this.storeName).delete(this.key);
          tx.oncomplete=()=>resolve();
          tx.onerror=()=>reject(tx.error||new Error('No se pudo limpiar la cola'));
          tx.onabort=()=>reject(tx.error||new Error('Limpieza de cola cancelada'));
        });
      }catch{}
      finally{db.close?.()}
    }
    try{this.localStorageRef?.removeItem?.(this.key)}catch{}
    return true;
  }
}
if(typeof window!=='undefined')window.ProfitMenteRenderQueueStorageEngine=ProfitMenteRenderQueueStorageEngine;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteRenderQueueStorageEngine;
