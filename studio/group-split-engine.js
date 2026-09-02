class ProfitMenteGroupSplitEngine{
  constructor(splitEngine=globalThis.ProfitMenteSplitEditEngine){this.Split=splitEngine}
  members(project,clip){const gid=String(clip?.groupId||'').trim();return gid?(project?.clips||[]).filter(c=>String(c.groupId||'').trim()===gid):clip?[clip]:[]}
  locked(project,clip){
    if(!clip)return false;
    const track=clip.track,key=String(track);
    const modern=project?.trackState?.[track]??project?.trackState?.[key];
    const legacy=project?.trackStates?.[track]??project?.trackStates?.[key];
    return !!clip.locked||!!(
      (modern&&typeof modern==='object'&&modern.locked)||
      (legacy&&typeof legacy==='object'&&legacy.locked)
    );
  }
  id(prefix='group'){return globalThis.crypto?.randomUUID?.()||`${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`}
  split(project,clip,time,{idFactory,groupIdFactory}={}){
    if(!this.Split?.split)return {ok:false,reason:'split-engine-missing'};
    const members=this.members(project,clip);if(!members.length)return {ok:false,reason:'missing'};
    const blocked=members.filter(c=>this.locked(project,c));if(blocked.length)return {ok:false,reason:'locked',blocked:blocked.length,members};
    const results=members.map(c=>({clip:c,result:this.Split.split(c,time,{idFactory})}));
    const invalid=results.find(x=>!x.result?.ok);if(invalid)return {ok:false,reason:'member-outside',member:invalid.clip,members};
    const grouped=members.length>1,leftGroup=grouped?(groupIdFactory?.('left')||this.id('group-left')):'',rightGroup=grouped?(groupIdFactory?.('right')||this.id('group-right')):'';
    const byId=new Map(results.map(x=>[String(x.clip.id),x.result]));
    project.clips=(project.clips||[]).flatMap(c=>{const r=byId.get(String(c.id));if(!r)return [c];if(grouped){r.left.groupId=leftGroup;r.right.groupId=rightGroup}else{delete r.left.groupId;delete r.right.groupId}return [r.left,r.right]});
    const anchor=results.find(x=>String(x.clip.id)===String(clip.id))||results[0];
    return {ok:true,count:results.length,leftGroup,rightGroup,rightId:anchor.result.right.id,results:results.map(x=>x.result)};
  }
}
if(typeof window!=='undefined')window.ProfitMenteGroupSplitEngine=ProfitMenteGroupSplitEngine;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteGroupSplitEngine;