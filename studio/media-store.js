(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.ProfitMenteMediaStore=api.ProfitMenteMediaStore;root.ProfitMenteIndexedDbMediaBackend=api.ProfitMenteIndexedDbMediaBackend})(typeof globalThis!=='undefined'?globalThis:this,function(){
const DB='profitmente-studio',STORE='media';
function keyOf(v){if(v===null||v===undefined)return null;const s=String(v).trim();return s||null}
class ProfitMenteIndexedDbMediaBackend{
  constructor(indexedDBApi=globalThis.indexedDB){this.indexedDB=indexedDBApi}
  open(){return new Promise((resolve,reject)=>{if(!this.indexedDB){reject(new Error('IndexedDB no disponible'));return}let req;try{req=this.indexedDB.open(DB,1)}catch(error){reject(error);return}req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'id'})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error('No se pudo abrir IndexedDB'))})}
  async loadAll(){const db=await this.open();return new Promise((resolve,reject)=>{let req;try{req=db.transaction(STORE,'readonly').objectStore(STORE).getAll()}catch(error){db.close?.();reject(error);return}req.onsuccess=()=>{db.close?.();resolve(Array.isArray(req.result)?req.result:[])};req.onerror=()=>{db.close?.();reject(req.error||new Error('No se pudieron leer los medios'))}})}
  async putMany(assets){if(!assets.length)return;const db=await this.open();return new Promise((resolve,reject)=>{let tx;try{tx=db.transaction(STORE,'readwrite');const store=tx.objectStore(STORE);for(const asset of assets)store.put(asset)}catch(error){db.close?.();reject(error);return}tx.oncomplete=()=>{db.close?.();resolve()};tx.onerror=()=>{db.close?.();reject(tx.error||new Error('No se pudieron guardar los medios'))};tx.onabort=()=>{db.close?.();reject(tx.error||new Error('Guardado de medios abortado'))}})}
  async deleteMany(ids){if(!ids.length)return;const db=await this.open();return new Promise((resolve,reject)=>{let tx;try{tx=db.transaction(STORE,'readwrite');const store=tx.objectStore(STORE);for(const id of ids)store.delete(id)}catch(error){db.close?.();reject(error);return}tx.oncomplete=()=>{db.close?.();resolve()};tx.onerror=()=>{db.close?.();reject(tx.error||new Error('No se pudieron eliminar los medios'))};tx.onabort=()=>{db.close?.();reject(tx.error||new Error('Eliminación de medios abortada'))}})}
}
class ProfitMenteMediaStore{
  constructor(backend){this.backend=backend===undefined?new ProfitMenteIndexedDbMediaBackend():backend;this.memory=new Map();this.dirty=new Set();this.pendingDeletes=new Set();this.storageAvailable=true;this.loaded=false;this.lastError=null;this.flushPromise=null}
  values(){return Array.from(this.memory.values())}
  async loadAll(){if(this.dirty.size||this.pendingDeletes.size||this.flushPromise)return this.values();if(!this.backend){this.storageAvailable=false;this.loaded=true;return this.values()}try{const items=await this.backend.loadAll();this.memory.clear();for(const asset of items||[]){const key=keyOf(asset?.id);if(key)this.memory.set(key,asset)}this.storageAvailable=true;this.lastError=null;this.loaded=true;return this.values()}catch(error){this.storageAvailable=false;this.lastError=error;this.loaded=true;return this.values()}}
  async put(asset){const key=keyOf(asset?.id);if(!key)throw new Error('El medio necesita un id válido');this.memory.set(key,asset);this.pendingDeletes.delete(key);this.dirty.add(key);await this.flush();return asset}
  async delete(id){const key=keyOf(id);if(!key)return false;const existed=this.memory.delete(key);this.dirty.delete(key);this.pendingDeletes.add(key);await this.flush();return existed}
  async flush(){
    if(this.flushPromise)return this.flushPromise;
    if(!this.dirty.size&&!this.pendingDeletes.size)return true;
    if(!this.backend){this.storageAvailable=false;return false}
    this.flushPromise=(async()=>{
      try{
        while(this.dirty.size||this.pendingDeletes.size){
          const pending=Array.from(this.dirty).map(key=>this.memory.get(key)).filter(Boolean);
          const removed=Array.from(this.pendingDeletes);
          try{
            if(pending.length)await this.backend.putMany(pending);
            if(removed.length){if(typeof this.backend.deleteMany!=='function')throw new Error('Backend de medios sin soporte de eliminación');await this.backend.deleteMany(removed)}
          }catch(error){this.storageAvailable=false;this.lastError=error;return false}
          for(const asset of pending){const key=keyOf(asset.id);if(this.memory.get(key)===asset&&!this.pendingDeletes.has(key))this.dirty.delete(key)}
          for(const key of removed){if(!this.memory.has(key)&&!this.dirty.has(key))this.pendingDeletes.delete(key)}
          this.storageAvailable=true;this.lastError=null;
        }
        return true;
      }finally{this.flushPromise=null}
    })();
    return this.flushPromise;
  }
  get(id){const key=keyOf(id);return key?this.memory.get(key)||null:null}
}
return{ProfitMenteMediaStore,ProfitMenteIndexedDbMediaBackend};
});
