const assert=require('assert');
const {ProfitMenteProjectImportEngine}=require('./project-import-engine.js');
const engine=new ProfitMenteProjectImportEngine();
const base={version:'1.3',name:'Keyframe contract',mode:'Manual',duration:10,format:'9:16',fps:30,renderQuality:'high',clips:[{id:'clip-1',track:0,start:0,duration:5,asset:'media-1'}]};
const withFrame=frame=>({...base,clips:[{...base.clips[0],visualKeyframes:[frame]}]});
const valid=engine.normalize(withFrame({time:2.5,x:200,y:-200,scale:8,rotation:3600,opacity:1,easing:'ease-in-out'}));
assert.equal(valid.clips[0].visualKeyframes[0].x,200);
assert.equal(valid.clips[0].visualKeyframes[0].easing,'ease-in-out');
for(const [field,value] of [['x',200.01],['y',-200.01],['scale',8.01],['scale',0.09],['rotation',3600.01],['opacity',1.01],['opacity',-0.01]]){
  assert.throws(()=>engine.normalize(withFrame({time:1,[field]:value})),/keyframe.*inválid|inválido/i,`${field}=${value} must be rejected`);
}
assert.throws(()=>engine.normalize(withFrame({time:1,easing:'elastic'})),/Easing de keyframe inválido/);
assert.throws(()=>engine.normalize(withFrame({time:5.01})),/Tiempo de keyframe fuera del clip/);
const defaults=engine.normalize(withFrame({time:'1.25'})).clips[0].visualKeyframes[0];
assert.deepStrictEqual(defaults,{time:1.25,x:0,y:0,scale:1,rotation:0,opacity:1,easing:'linear'});
console.log('project import visual keyframe contract: ok');
