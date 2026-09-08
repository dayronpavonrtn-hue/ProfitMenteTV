import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const ProxyEngine=require('./media-proxy-engine.js');

const tinyMp4={id:'tiny',name:'tiny.mp4',type:'video',mime:'video/mp4',blob:new Blob([new Uint8Array(1024)]),sourceFingerprint:'tiny'};
assert.equal(ProxyEngine.shouldProxy(tinyMp4),false,'small compatible MP4 should stay direct');
assert.equal(ProxyEngine.status(tinyMp4),'not-needed','small compatible MP4 should report direct preview');

const mov={id:'mov',name:'camera.MOV',type:'video',mime:'video/quicktime',blob:new Blob([new Uint8Array(2048)]),sourceFingerprint:'mov-v1'};
assert.equal(ProxyEngine.shouldProxy(mov),true,'MOV should get browser-friendly proxy');
assert.equal(ProxyEngine.status(mov),'pending','heavy/incompatible video should report pending proxy');
const disabledMov={...mov,id:'disabled',blob:mov.blob,proxyAutoDisabled:true};
assert.equal(ProxyEngine.shouldProxy(disabledMov),false,'manual cache cleanup must suppress automatic proxy recreation');
assert.equal(ProxyEngine.status(disabledMov),'disabled');
let suppressedFetch=false;
const suppressed=await ProxyEngine.createProxy(disabledMov,async()=>{suppressedFetch=true;throw new Error('must not fetch')});
assert.equal(suppressed,null);
assert.equal(suppressedFetch,false,'suppressed proxy must not contact local encoder');

const highRes={id:'hi',name:'hi.mp4',type:'video',mime:'video/mp4',width:3840,height:2160,blob:new Blob([new Uint8Array(2048)]),sourceFingerprint:'hi-v1'};
assert.equal(ProxyEngine.shouldProxy(highRes),true,'high-resolution MP4 should get proxy');

// Imported media IDs must use the same canonical identity as preview/generator/render.
const legacyNumeric={id:'007',name:'legacy.MOV',type:'video',mime:'video/quicktime',blob:new Blob([new Uint8Array(2048)]),sourceFingerprint:'legacy'};
assert.equal(ProxyEngine.mediaKey('007'),'n:7');
assert.equal(ProxyEngine.mediaKey('+07.000'),'n:7');
assert.equal(ProxyEngine.mediaKey(-0),'n:0');
assert.equal(ProxyEngine.mediaKey(false),null,'booleans are not valid media IDs');
assert.equal(ProxyEngine.mediaKey('Asset'),'s:Asset');
assert.notEqual(ProxyEngine.mediaKey('Asset'),ProxyEngine.mediaKey('asset'),'text IDs remain case-sensitive');
assert.deepEqual(ProxyEngine.candidates([legacyNumeric],[7]),[legacyNumeric],'numeric alias should select imported proxy candidate');
assert.deepEqual(ProxyEngine.candidates([legacyNumeric],['+07.000']),[legacyNumeric],'decimal numeric alias should select imported proxy candidate');
assert.deepEqual(ProxyEngine.candidates([legacyNumeric],['8']),[],'unrelated imported ID must not enqueue proxy work');
assert.deepEqual(ProxyEngine.candidates([legacyNumeric],[false]),[],'invalid imported IDs must fail closed instead of scanning the whole library');
assert.deepEqual(ProxyEngine.candidates([legacyNumeric],['   ']),[],'blank imported IDs must fail closed instead of scanning the whole library');
assert.deepEqual(ProxyEngine.candidates([legacyNumeric],[]),[legacyNumeric],'empty ID list preserves startup proxy scan');

const original=mov.blob;
let persisted=null;
const fetchImpl=async(url,options)=>{
  assert.equal(url,'/api/media/proxy');
  assert.equal(options.method,'POST');
  assert.equal(options.body,original,'proxy upload must use original source blob');
  return {ok:true,status:200,blob:async()=>new Blob([new Uint8Array(333)],{type:'video/mp4'})};
};
mov.proxyAutoDisabled=true;
delete mov.proxyAutoDisabled;
const changed=await ProxyEngine.prepare(mov,{fetchImpl,persist:async asset=>{persisted=asset}});
assert.equal(changed,true);
assert.equal(mov.blob,original,'original asset blob must never be replaced by proxy');
assert.ok(mov.previewBlob instanceof Blob);
assert.equal(mov.previewBlob.size,333);
assert.equal(mov.previewMime,'video/mp4');
assert.equal(mov.proxySourceFingerprint,'mov-v1');
assert.equal(mov.proxyAutoDisabled,undefined,'successful regeneration must leave automatic proxy mode enabled');
assert.equal(mov.proxyStatus,'ready');
assert.equal(ProxyEngine.status(mov),'ready');
assert.equal(persisted,mov);
assert.equal(ProxyEngine.proxyCurrent(mov),true);

let called=false;
const skipped=await ProxyEngine.createProxy(mov,async()=>{called=true;throw new Error('should not run')});
assert.equal(skipped,null,'current proxy should be reused');
assert.equal(called,false);

// Manual lifecycle: disable uses original, rebuild recreates the proxy, originals are never replaced.
assert.equal(ProxyEngine.clearProxy(mov,true),true);
assert.equal(mov.previewBlob,undefined);
assert.equal(mov.proxyAutoDisabled,true);
assert.equal(ProxyEngine.status(mov),'disabled');
assert.equal(mov.blob,original,'disabling a proxy must preserve the original');
let forcedCalls=0;
const forceFetch=async(url,options)=>{forcedCalls++;assert.equal(options.body,original);return {ok:true,status:200,blob:async()=>new Blob([new Uint8Array(222)],{type:'video/mp4'})}};
const forced=await ProxyEngine.prepare(mov,{fetchImpl:forceFetch,force:true});
assert.equal(forced,true,'manual rebuild must bypass automatic suppression');
assert.equal(forcedCalls,1);
assert.equal(mov.previewBlob.size,222);
assert.equal(mov.proxyAutoDisabled,undefined);
assert.equal(ProxyEngine.status(mov),'ready');
assert.equal(mov.blob,original);

// Manual proxy creation is allowed even for a small compatible video when explicitly forced.
let tinyCalls=0;
const tinyOriginal=tinyMp4.blob;
const tinyForced=await ProxyEngine.prepare(tinyMp4,{force:true,fetchImpl:async(_url,options)=>{tinyCalls++;assert.equal(options.body,tinyOriginal);return {ok:true,status:200,blob:async()=>new Blob([new Uint8Array(111)],{type:'video/mp4'})}}});
assert.equal(tinyForced,true);
assert.equal(tinyCalls,1);
assert.equal(ProxyEngine.status(tinyMp4),'ready');
assert.equal(tinyMp4.blob,tinyOriginal);

// Failed proxy work must expose a retryable error state without destroying the source.
const broken={id:'broken',name:'broken.MOV',type:'video',mime:'video/quicktime',blob:new Blob([new Uint8Array(128)]),sourceFingerprint:'broken-v1'};
await assert.rejects(()=>ProxyEngine.prepare(broken,{fetchImpl:async()=>({ok:false,status:500,json:async()=>({error:'ffmpeg failed'})})}),/ffmpeg failed/);
assert.equal(ProxyEngine.status(broken),'error');
assert.match(broken.proxyError,/ffmpeg failed/);
assert.ok(broken.blob instanceof Blob);
ProxyEngine.clearProxy(broken,false);
assert.equal(ProxyEngine.status(broken),'pending','clearing an error should return an eligible video to pending');

mov.sourceFingerprint='mov-v2';
assert.equal(ProxyEngine.proxyCurrent(mov),false,'source change must invalidate stale proxy');
assert.equal(ProxyEngine.status(mov),'pending','stale proxy should not be reported as ready');
console.log('media proxy engine regression OK');
