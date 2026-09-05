(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.ProfitMenteMediaStore=api.ProfitMenteMediaStore;root.ProfitMenteIndexedDbMediaBackend=api.ProfitMenteIndexedDbMediaBackend})(typeof globalThis!=='undefined'?globalThis:this,function(){
const DB='profitmente-studio',STORE='media';
function keyOf(v){if(v===null||v===undefined)return null;const s=String(v).trim();return s||null}
class ProfitMenteIndexedDbMediaBackend{
  constructor(indexedDBApi=globalThis.indexedDB){this.indexedDB=indexedDBApi}
  open(){return new Promise((resolve,reject)=>{if(!this.indexedDB){reject(new Error('IndexedDB no disponible'));return}let req;try{req=this.indexedDB.open(DB,1)}catch(error){reject(error);return}req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'id'})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error('No se pudo abrir IndexedDB'))})}
  async loadAll(){const db=await this.open();return new Promise((resolve,reject)=>{let req;try{req=db.transaction(STORE,'readonly').objectStore(STORE).getAll()}catch(error){db.close?.();reject(error);return}req.onsuccess=()=>{db.close?.();resolve(Array.isArray(req.result)?req.result:[])};req.onerror=()=>{db.close?.();reject(req.error||new Error('No se pudieron leer los medios'))}})}
  async putMany(assets){if(!assets.length)return;const db=await this.open();return new Promise((resolve,reject)=>{let tx;try{tx=db.transaction(STORE,'readwrite');const store=tx.objectStore(STORE);for(const asset of assets)store.put(asset)}catch(error){db.close?.();reject(error);return}tx.oncomplete=()=>{db.close?.();resolve()};tx.onerror=()=>{db.close?.();reject(tx.error||new Error('No se pudieron guardar los medios'))};tx.onabort=()=>{db.close?.();reject(tx.error||new Error('Guardado de medios abortado'))}})}
}
class ProfitMenteMediaStore{
  constructor(backend){this.backend=backend===undefined?new ProfitMenteIndexedDbMediaBackend():backend;this.memory=new Map();this.dirty=new Set();this.storageAvailable=true;this.loaded=false;this.lastError=null}
  values(){return Array.from(this.memory.values())}
  async loadAll(){if(this.dirty.size)return this.values();if(!this.backend){this.storageAvailable=false;this.loaded=true;return this.values()}try{const items=await this.backend.loadAll();this.memory.clear();for(const asset of items||[]){const key=keyOf(asset?.id);if(key)this.memory.set(key,asset)}this.storageAvailable=true;this.lastError=null;this.loaded=true;return this.values()}catch(error){this.storageAvailable=false;this.lastError=error;this.loaded=true;return this.values()}}
  async put(asset){const key=keyOf(asset?.id);if(!key)throw new Error('El medio necesita un id válido');this.memory.set(key,asset);this.dirty.add(key);await this.flush();return asset}
  async flush(){if(!this.dirty.size)return true;if(!this.backend){this.storageAvailable=false;return false}const pending=Array.from(this.dirty).map(key=>this.memory.get(key)).filter(Boolean);try{await this.backend.putMany(pending);for(const asset of pending)this.dirty.delete(keyOf(asset.id));this.storageAvailable=true;this.lastError=null;return true}catch(error){this.storageAvailable=false;this.lastError=error;return false}}
  get(id){const key=keyOf(id);return key?this.memory.get(key)||null:null}
}
return{ProfitMenteMediaStore,ProfitMenteIndexedDbMediaBackend};
});
