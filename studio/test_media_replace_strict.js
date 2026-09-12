const assert=require('assert');
const Engine=require('./media-replace-engine.js');

function projectWith(overrides={}){
  return {clips:[{id:'clip-1',asset:'old',name:'Old',track:0,duration:4,speed:1,sourceOffset:2,fadeIn:.2,fadeOut:.2,...overrides}]};
}

// Legacy numeric strings remain supported.
{
  const project=projectWith({track:'0',duration:'4',speed:'1.25',sourceOffset:'2'});
  const result=Engine.replace(project,'clip-1',{id:'new',name:'New',type:'video',duration:'10'});
  assert.equal(result.ok,true);
  assert.equal(project.clips[0].sourceOffset,2);
  assert.equal(project.clips[0].duration,'4');
}

// Corrupt asset duration must not be coerced (true used to become 1 second).
{
  const project=projectWith({duration:4,sourceOffset:2});
  const result=Engine.replace(project,'clip-1',{id:'new',type:'video',duration:true});
  assert.equal(result.ok,true);
  assert.equal(project.clips[0].duration,4);
  assert.equal(project.clips[0].sourceOffset,2);
  assert.equal(result.trimmed,false);
}

// Corrupt clip scalars must fall back safely rather than JS Number coercion.
{
  const project=projectWith({duration:true,speed:[2],sourceOffset:[8],fadeIn:true,fadeOut:{value:3}});
  const result=Engine.replace(project,'clip-1',{id:'new',type:'video',duration:12});
  assert.equal(result.ok,true);
  assert.equal(project.clips[0].duration,Engine.MIN_CLIP_DURATION);
  assert.equal(project.clips[0].sourceOffset,0);
  assert.equal(project.clips[0].fadeIn,true);
  assert.deepEqual(project.clips[0].fadeOut,{value:3});
}

// Boolean/array tracks must not masquerade as valid visual/audio tracks.
for(const track of [true,[0],{value:0}]){
  const project=projectWith({track});
  const result=Engine.replace(project,'clip-1',{id:'new',type:'video',duration:10});
  assert.equal(result.ok,false);
  assert.equal(result.reason,'incompatible');
}

// Strict range replacement rejects corrupt numeric inputs but accepts numeric strings.
{
  const corrupt=projectWith({duration:4,speed:true});
  // Invalid persisted speed falls back to 1 in the range path for legacy resilience.
  const ok=Engine.replaceFromRange(corrupt,'clip-1',{id:'new',type:'video',duration:'10'},'1','5');
  assert.equal(ok.ok,true);
  assert.equal(ok.requiredSource,4);

  const badRange=projectWith();
  const bad=Engine.replaceFromRange(badRange,'clip-1',{id:'new',type:'video',duration:10},true,5);
  assert.equal(bad.ok,false);
  assert.equal(bad.reason,'invalid-source-range');
}

// A shorter replacement trims deterministically and clamps fades to the final duration.
{
  const project=projectWith({duration:8,speed:1,sourceOffset:1,fadeIn:7,fadeOut:'9'});
  const result=Engine.replace(project,'clip-1',{id:'new',type:'video',duration:4});
  assert.equal(result.ok,true);
  assert.equal(result.trimmed,true);
  assert.equal(project.clips[0].duration,3);
  assert.equal(project.clips[0].fadeIn,3);
  assert.equal(project.clips[0].fadeOut,3);
}

console.log('Strict media replacement regression: OK');
