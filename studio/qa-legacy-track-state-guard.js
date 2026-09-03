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
      for(const [key,value] of Object.entries(states)){
        if(!value||typeof value!=='object'||Array.isArray(value))continue;
        if(this.canonicalTrack(key)===target){
          Object.assign(merged,value);
          for(const flag of ['hidden','muted','locked','solo'])if(value[flag]===true)merged[flag]=true;
        }
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
        }
        for(const key of ['_soloHiddenBase','_soloVisualActive','_soloMutedBase','_soloAudioActive']){
          if(!(key in b)&&key in a)state[key]=a[key];
        }
        merged[String(track)]=state;
      }
      return merged;
    }
    static baseHidden(state){
      return state?._soloVisualActive?!!state._soloHiddenBase:!!state?.hidden;
    }
    static baseMuted(state){
      return state?._soloAudioActive?!!state._soloMutedBase:!!state?.muted;
    }
    static applySolo(trackState){
      const states={};
      for(let track=0;track<7;track++)states[String(track)]={...this.readState(trackState,track)};
      const visualSolo=this.VISUAL_TRACKS.some(track=>!!states[String(track)].solo);
      const audioSolo=this.AUDIO_TRACKS.some(track=>!!states[String(track)].solo);
      for(const track of this.VISUAL_TRACKS){
        const state=states[String(track)];
        state.hidden=this.baseHidden(state)||(visualSolo&&!state.solo);
        delete state._soloHiddenBase;
        delete state._soloVisualActive;
      }
      for(const track of this.AUDIO_TRACKS){
        const state=states[String(track)];
        state.muted=this.baseMuted(state)||(audioSolo&&!state.solo);
        delete state._soloMutedBase;
        delete state._soloAudioActive;
      }
      return states;
    }
    static normalize(project){
      if(!project||typeof project!=='object')return project;
      return {...project,trackState:this.applySolo(this.mergeTrackState(project))};
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
