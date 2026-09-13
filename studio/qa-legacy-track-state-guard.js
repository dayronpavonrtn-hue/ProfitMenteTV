(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  class ProfitMenteQALegacyTrackStateGuard{
    static get VISUAL_TRACKS(){return [0,1,2,3]}
    static get AUDIO_TRACKS(){return [4,5,6]}
    static canonicalTrack(value){
      const raw=String(value??'').trim();
      if(!raw)return null;
      const numeric=Number(raw);
      return Number.isInteger(numeric)&&numeric>=0&&numeric<=6?numeric:null;
    }
    static readState(states,track){
      if(!states||typeof states!=='object')return {};
      const target=this.canonicalTrack(track),merged={};
      if(target===null)return merged;
      const strictTrue=new Set();
      const strictFlags=['hidden','muted','locked','solo'];
      for(const [key,value] of Object.entries(states)){
        if(!value||typeof value!=='object'||Array.isArray(value))continue;
        if(this.canonicalTrack(key)!==target)continue;
        Object.assign(merged,value);
        for(const flag of strictFlags)if(value[flag]===true)strictTrue.add(flag);
      }
      // Imported/legacy aliases can appear more than once (for example "0", "0.0"
      // and "00"). Restrictive state survives when any alias stores a real boolean
      // true, while strings/numbers/arrays never become active through JS truthiness.
      for(const flag of strictFlags){
        if(strictTrue.has(flag))merged[flag]=true;
        else if(flag in merged)merged[flag]=false;
      }
      for(const flag of ['_soloHiddenBase','_soloVisualActive','_soloMutedBase','_soloAudioActive']){
        if(flag in merged)merged[flag]=merged[flag]===true;
      }
      return merged;
    }
    static mergeTrackState(project){
      const current=project?.trackState&&typeof project.trackState==='object'?project.trackState:{};
      const legacy=project?.trackStates&&typeof project.trackStates==='object'?project.trackStates:{};
      const merged={};
      for(let track=0;track<7;track++){
        const a=this.readState(legacy,track);
        const b=this.readState(current,track);
        const state={...a,...b};
        for(const flag of ['hidden','muted','locked','solo']){
          if(a[flag]===true||b[flag]===true)state[flag]=true;
          else if(flag in state)state[flag]=false;
        }
        for(const key of ['_soloHiddenBase','_soloVisualActive','_soloMutedBase','_soloAudioActive']){
          if(!(key in b)&&key in a)state[key]=a[key];
          if(key in state)state[key]=state[key]===true;
        }
        merged[String(track)]=state;
      }
      return merged;
    }
    static baseHidden(state){
      return state?._soloVisualActive===true?state?._soloHiddenBase===true:state?.hidden===true;
    }
    static baseMuted(state){
      return state?._soloAudioActive===true?state?._soloMutedBase===true:state?.muted===true;
    }
    static applySolo(trackState){
      const states={};
      for(let track=0;track<7;track++)states[String(track)]={...this.readState(trackState,track)};
      const visualSolo=this.VISUAL_TRACKS.some(track=>states[String(track)].solo===true);
      const audioSolo=this.AUDIO_TRACKS.some(track=>states[String(track)].solo===true);
      for(const track of this.VISUAL_TRACKS){
        const state=states[String(track)];
        state.hidden=this.baseHidden(state)||(visualSolo&&state.solo!==true);
        delete state._soloHiddenBase;
        delete state._soloVisualActive;
      }
      for(const track of this.AUDIO_TRACKS){
        const state=states[String(track)];
        state.muted=this.baseMuted(state)||(audioSolo&&state.solo!==true);
        delete state._soloMutedBase;
        delete state._soloAudioActive;
      }
      return states;
    }
    static normalize(project){
      if(!project||typeof project!=='object')return project;
      // Collapse both modern and legacy maps into one canonical state map before QA.
      // Leaving the raw legacy object attached would let qa-engine read malformed keys
      // a second time (for example Number('') === 0) and undo this guard's sanitizing.
      return {...project,trackState:this.applySolo(this.mergeTrackState(project)),trackStates:{}};
    }
    static resolveQA(){
      if(root.ProfitMenteQAEngine)return root.ProfitMenteQAEngine;
      if(typeof module!=='undefined'&&module.exports&&typeof require==='function'){
        try{return require('./qa-engine.js').ProfitMenteQAEngine}catch(_){return null}
      }
      return null;
    }
    static install(){
      const QA=this.resolveQA();
      if(!QA?.prototype||QA.prototype.__profitmenteLegacyTrackStateGuard)return false;
      const original=QA.prototype.inspect;
      if(typeof original!=='function')return false;
      QA.prototype.inspect=function(project,assets){
        return original.call(this,ProfitMenteQALegacyTrackStateGuard.normalize(project),assets);
      };
      QA.prototype.__profitmenteLegacyTrackStateGuard=true;
      return true;
    }
  }
  root.ProfitMenteQALegacyTrackStateGuard=ProfitMenteQALegacyTrackStateGuard;
  if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteQALegacyTrackStateGuard;
  ProfitMenteQALegacyTrackStateGuard.install();
})();
