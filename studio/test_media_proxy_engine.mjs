import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const ProxyEngine=require('./media-proxy-engine.js');

const tinyMp4={id:'tiny',name:'tiny.mp4',type:'video',mime:'video/mp4',blob:new Blob([new Uint8Array(1024)]),sourceFingerprint:'tiny'};
assert.equal(ProxyEngine.shouldProxy(tinyMp4),false,'small compatible MP4 should stay direct');

const mov={id:'mov',name:'camera.MOV',type:'video',mime:'video/quicktime',blob:new Blob([new Uint8Array(2048)]),sourceFingerprint:'mov-v1'};
assert.equal(ProxyEngine.shouldProxy(mov),true,'MOV should get browser-friendly proxy');

const highRes={id:'hi',name:'hi.mp4',type:'video',mime:'video/mp4',width:3840,height:2160,blob:new Blob([new Uint8Array(2048)]),sourceFingerprint:'hi-v1'};
assert.equal(ProxyEngine.shouldProxy(highRes),true,'high-resolution MP4 should get proxy');

const original=mov.blob;
let persisted=null;
const fetchImpl=async(url,options)=>{
  assert.equal(url,'/api/media/proxy');
  assert.equal(options.method,'POST');
  assert.equal(options.body,original,'proxy upload must use original source blob');
  return {ok:true,status:200,blob:async()=>new Blob([new Uint8Array(333)],{type:'video/mp4'})};
};
const changed=await ProxyEngine.prepare(mov,{fetchImpl,persist:async asset=>{persisted=asset}});
assert.equal(changed,true);
assert.equal(mov.blob,original,'original asset blob must never be replaced by proxy');
assert.ok(mov.previewBlob instanceof Blob);
assert.equal(mov.previewBlob.size,333);
assert.equal(mov.previewMime,'video/mp4');
assert.equal(mov.proxySourceFingerprint,'mov-v1');
assert.equal(persisted,mov);
assert.equal(ProxyEngine.proxyCurrent(mov),true);

let called=false;
const skipped=await ProxyEngine.createProxy(mov,async()=>{called=true;throw new Error('should not run')});
assert.equal(skipped,null,'current proxy should be reused');
assert.equal(called,false);

mov.sourceFingerprint='mov-v2';
assert.equal(ProxyEngine.proxyCurrent(mov),false,'source change must invalidate stale proxy');
console.log('media proxy engine regression OK');
