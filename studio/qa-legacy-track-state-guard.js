(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  class ProfitMenteQALegacyTrackStateGuard{
    static get VISUAL_TRACKS(){return [0,1,2,3]}
    static get AUDIO_TRACKS(){return [4,5,6]}
    static canonicalTrack(value){
      if(typeof value==='boolean'||value===null||value===undefined)return null;
      if(typeof value==='number')return Number.isFinite(value)&&Number.isInteger(value)&&value>=0&&value<=6?value:null;
      if(typeof value==='string'){
        const raw=value.trim();if(!raw)return null;
        const numeric=Number(raw);
        return Number.isFinite(numeric)&&Number.isInteger(numeric)&&numeric>=0&&numeric<=6?numeric:null;
      }
      return null;
    }
    static rawState(states,track){
      const target=this.canonicalTrack(track),merged={};
      if(target===null||!states||typeof states!=='object'||Array.isArray(states))return merged;
      for(const [key,value] of Object.entries(states)){
        if(this.canonicalTrack(key)!==target||!value||typeof value!=='object'||Array.isArray(value))continue;
        Object.assign(merged,value);
      }
      return merged;
    }
    static normalizeState(raw){
      const source=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
      const out={...source};
      for(const flag of ['hidden','muted','locked','solo'])out[flag]=source[flag]===true;
      for(const flag of ['_soloHiddenBase','_soloVisualActive','_soloMutedBase','_soloAudioActive']){
        if(flag in source)out[flag]=source[flag]===true;
      }
      return out;
    }
    static readState(states,track){return this.normalizeState(this.rawState(states,track))}
    static mergeTrackState(project){
      const current=project?.trackState&&typeof project.trackState==='object'&&!Array.isArray(project.trackState)?project.trackState:{};
      const legacy=project?.trackStates&&typeof project.trackStates==='object'&&!Array.isArray(project.trackStates)?project.trackStates:{};
      const merged={};
      for(let track=0;track<7;track++)merged[String(track)]=this.normalizeState({...this.rawState(legacy,track),...this.rawState(current,track)});
      return merged;
    }
    static baseHidden(state){return state?._soloVisualActive===true?state?._soloHiddenBase===true:state?.hidden===true}
    static baseMuted(state){return state?._soloAudioActive===true?state?._soloMutedBase===true:state?.muted===true}
    static applySolo(trackState){
      const states={};
      for(let track=0;track<7;track++)states[String(track)]={...this.readState(trackState,track)};
      const visualSolo=this.VISUAL_TRACKS.some(track=>states[String(track)].solo===true);
      const audioSolo=this.AUDIO_TRACKS.some(track=>states[String(track)].solo===true);
      for(const track of this.VISUAL_TRACKS){
        const state=states[String(track)];
        state.hidden=this.baseHidden(state)||(visualSolo&&state.solo!==true);
        delete state._soloHiddenBase;delete state._soloVisualActive;
      }
      for(const track of this.AUDIO_TRACKS){
        const state=states[String(track)];
        state.muted=this.baseMuted(state)||(audioSolo&&state.solo!==true);
        delete state._soloMutedBase;delete state._soloAudioActive;
      }
      return states;
    }
    static normalize(project){
      if(!project||typeof project!=='object')return project;
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
      const original=QA.prototype.inspect;if(typeof original!=='function')return false;
      QA.prototype.inspect=function(project,assets){return original.call(this,ProfitMenteQALegacyTrackStateGuard.normalize(project),assets)};
      QA.prototype.__profitmenteLegacyTrackStateGuard=true;return true;
    }
  }
  root.ProfitMenteQALegacyTrackStateGuard=ProfitMenteQALegacyTrackStateGuard;
  if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteQALegacyTrackStateGuard;
  ProfitMenteQALegacyTrackStateGuard.install();
})();
