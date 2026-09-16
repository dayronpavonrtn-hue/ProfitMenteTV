import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('./startup-project-guard.js',import.meta.url),'utf8');
function boot(initial={},options={}){
  const values=new Map(Object.entries(initial));
  const localStorage={
    getItem:key=>values.has(key)?values.get(key):null,
    setItem(key,value){if(options.failSet?.includes(key))throw new Error('set failed');values.set(key,String(value))},
    removeItem(key){if(options.failRemove?.includes(key))throw new Error('remove failed');values.delete(key)}
  };
  const document={documentElement:{dataset:{}}};
  const context={localStorage,document,console:{warn(){}}};
  context.globalThis=context;
  vm.runInNewContext(source,context);
  return {api:context.ProfitMenteStartupProjectGuard,result:context.__profitmenteStartupProjectGuard,recovered:context.__profitmenteStartupRecovered,localStorage,values};
}

{
  const {result}=boot({});
  assert.equal(result.ok,true);
  assert.equal(result.empty,true);
  assert.equal(result.project.name,'Nuevo video');
}

{
  const raw=JSON.stringify({name:'Good',clips:[],duration:30,format:'9:16',mode:'Manual'});
  const {result,localStorage,api}=boot({'profitmente-project':raw});
  assert.equal(result.ok,true);
  assert.equal(result.project.mode,'Manual');
  assert.ok(localStorage.getItem(api.LAST_GOOD_KEY));
}

{
  const raw='{"broken"';
  const lastGood=JSON.stringify({name:'Recovered',clips:[],duration:20,format:'9:16',mode:'Automático'});
  const {result,recovered,localStorage,api}=boot({'profitmente-project':raw,'profitmente-project-last-good':lastGood});
  assert.equal(result.ok,true);
  assert.equal(result.quarantined,true);
  assert.equal(result.recoveredLastGood,true);
  assert.equal(result.project.name,'Recovered');
  assert.equal(recovered?.reason,'last-good-project-recovered');
  assert.equal(localStorage.getItem(api.BACKUP_KEY),raw);
  assert.equal(JSON.parse(localStorage.getItem(api.PRIMARY_KEY)).name,'Recovered');
}

{
  const raw='{"broken"';
  const lastGood=JSON.stringify({name:'Recovered',clips:[],duration:20,format:'9:16',mode:'Automático'});
  const {result,values,api}=boot({'profitmente-project':raw,'profitmente-project-last-good':lastGood},{failSet:[apiPlaceholder()]});
  function apiPlaceholder(){return 'profitmente-project-corrupt-backup'}
  assert.equal(result.ok,false);
  assert.equal(result.quarantineFailed,true);
  assert.equal(result.preservedCorruptPrimary,true);
  assert.equal(values.get('profitmente-project'),raw,'corrupt primary remains intact when no backup can be created');
  assert.equal(values.get('profitmente-project-last-good'),lastGood,'last-known-good snapshot remains untouched');
  assert.equal(values.has('profitmente-project-corrupt-backup'),false,'failed backup must not be treated as committed');
}

{
  const raw='{"broken"';
  const {result,recovered,localStorage}=boot({'profitmente-project':raw,'profitmente-project-last-good':'[]'});
  assert.equal(result.ok,false,'invalid recovery snapshot must not be trusted');
  assert.equal(result.fallback,true);
  assert.equal(result.project.name,'Nuevo video');
  assert.equal(recovered?.reason,'corrupt-project-storage');
  assert.equal(localStorage.getItem('profitmente-project'),null);
}

{
  const raw=JSON.stringify({name:'Legacy',clips:null,duration:'30'});
  const {result,localStorage}=boot({'profitmente-project':raw});
  assert.equal(result.ok,true,'recoverable legacy project should be normalized instead of quarantined');
  assert.equal(result.project.name,'Legacy');
  assert.deepEqual(Array.from(result.project.clips),[]);
  assert.equal(result.project.duration,30);
  assert.equal(result.project.format,'9:16');
  assert.equal(result.project.mode,'Automático');
  assert.equal(localStorage.getItem('profitmente-project'),raw,'normalization must not destroy the original stored project');
}

{
  const raw=JSON.stringify({name:'Ambiguous legacy',clips:[],duration:'30',format:'bad-format',mode:'bad-mode'});
  const {result,localStorage}=boot({'profitmente-project':raw});
  assert.equal(result.ok,false,'explicit invalid editor state must be quarantined instead of silently rewritten');
  assert.equal(result.quarantined,true);
  assert.equal(result.fallback,true);
  assert.equal(localStorage.getItem('profitmente-project'),null);
  assert.equal(localStorage.getItem('profitmente-project-corrupt-backup'),raw);
}

{
  const {api}=boot({});
  const base={clips:[{id:'clip-1',track:0,start:0,duration:4,visualKeyframes:[{time:1,x:0},{time:2,x:20}]}],duration:10,format:'9:16',mode:'Manual'};
  assert.ok(api.normalizeProject(base),'distinct visual keyframe times remain valid at startup');
  assert.equal(api.normalizeProject({...base,clips:[{...base.clips[0],visualKeyframes:[{time:1,x:0},{time:1,x:20}]}]}),null,'duplicate visual keyframe times must be rejected');
  assert.equal(api.normalizeProject({...base,clips:[{...base.clips[0],visualKeyframes:[{time:1,x:0},{time:1.0005,x:20}]}]}),null,'ambiguous visual keyframe times inside 1ms must be rejected');
  assert.ok(api.normalizeProject({...base,clips:[{...base.clips[0],visualKeyframes:[{time:1,x:0},{time:1.002,x:20}]}]}),'visual keyframes separated by more than 1ms remain valid');
}

{
  const {api}=boot({});
  assert.equal(api.normalizeProject({clips:[],duration:' 3e1 '}).duration,30,'legacy numeric duration strings remain supported');
  for(const value of [true,false,null,[],[30],{}, {valueOf(){return 30}},'', '   ',Number.NaN,Infinity]){
    assert.equal(api.normalizeProject({clips:[],duration:value}),null,`invalid duration must be rejected: ${String(value)}`);
  }
}

console.log('Studio startup corruption guard regression OK');
