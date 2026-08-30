(()=>{
  if(typeof document==='undefined'||window.__profitmenteFeatureBootstrap)return;
  window.__profitmenteFeatureBootstrap=true;
  const modules=[
    ['caption-compact-engine.js','ProfitMenteCaptionCompactEngine'],
    ['media-import-engine.js','ProfitMenteMediaImportEngine','profitmenteMediaImport'],
    ['generator-autofill.js','ProfitMenteGeneratorAutoFillIntegration'],
    ['media-library-tools.js','ProfitMenteMediaLibraryTools'],
    ['media-relink-engine.js','ProfitMenteMediaRelinkEngine'],
    ['media-relink-integration.js','ProfitMenteMediaRelink'],
    ['media-replace-engine.js','ProfitMenteMediaReplaceEngine'],
    ['media-replace-integration.js','ProfitMenteMediaReplace'],
    ['media-timeline-dnd.js','ProfitMenteMediaTimelineDnD'],
    ['media-placement-engine.js','ProfitMenteMediaPlacementEngine'],
    ['media-placement-integration.js','ProfitMenteMediaPlacement'],
    ['project-frame-rate-engine.js','ProfitMenteProjectFrameRateEngine'],
    ['project-frame-rate-integration.js','ProfitMenteProjectFrameRate'],
    ['frame-grid-engine.js','ProfitMenteFrameGridEngine'],
    ['frame-grid-integration.js','ProfitMenteFrameGrid'],
    ['preview-format-engine.js','ProfitMentePreviewFormatEngine'],
    ['preview-format-integration.js','ProfitMentePreviewFormat'],
    ['webm-render-engine.js','ProfitMenteWebMRenderEngine'],
    ['webm-render-integration.js','ProfitMenteWebMRender'],
    ['source-monitor-engine.js','ProfitMenteSourceMonitorEngine'],
    ['source-monitor-integration.js','ProfitMenteSourceMonitor'],
    ['match-frame-engine.js','ProfitMenteMatchFrameEngine'],
    ['match-frame-integration.js','ProfitMenteMatchFrame'],
    ['track-mixer-engine.js','ProfitMenteTrackMixerEngine'],
    ['track-mixer-integration.js','ProfitMenteTrackMixer'],
    ['audio-normalize-engine.js','ProfitMenteAudioNormalizeEngine'],
    ['audio-normalize-integration.js','ProfitMenteAudioNormalize'],
    ['smart-mix-engine.js','ProfitMenteSmartMixEngine'],
    ['smart-mix-integration.js','ProfitMenteSmartMix'],
    ['audio-silence-engine.js','ProfitMenteAudioSilenceEngine'],
    ['audio-silence-integration.js','ProfitMenteAudioSilence'],
    ['audio-waveform-engine.js','ProfitMenteAudioWaveformEngine'],
    ['audio-waveform-integration.js','ProfitMenteAudioWaveforms'],
    ['beat-detect-engine.js','ProfitMenteBeatDetectEngine'],
    ['beat-detect-integration.js','ProfitMenteBeatDetect'],
    ['beat-sync-engine.js','ProfitMenteBeatSyncEngine'],
    ['beat-sync-integration.js','ProfitMenteBeatSync'],
    ['project-duration.js','ProfitMenteProjectDuration'],
    ['project-history-engine.js','ProfitMenteProjectHistoryEngine'],
    ['project-history-integration.js','ProfitMenteProjectHistory'],
    ['project-portability.js','ProfitMenteProjectPortability'],
    ['project-migration-engine.js','ProfitMenteProjectMigrationEngine'],
    ['project-migration-integration.js','ProfitMenteProjectMigration'],
    ['project-reset-engine.js','ProfitMenteProjectResetEngine'],
    ['project-reset-integration.js','ProfitMenteProjectReset'],
    ['project-version-engine.js','ProfitMenteProjectVersionEngine'],
    ['project-version-integration.js','ProfitMenteProjectVersions'],
    ['qa-autofix.js','ProfitMenteQAAutofix'],
    ['qa-source-window-guard.js','ProfitMenteQASourceWindowGuard'],
    ['recovery-engine.js','ProfitMenteRecoveryEngine'],
    ['recovery-integration.js','ProfitMenteRecovery'],
    ['render-job-client.js','ProfitMenteRenderJobClient'],
    ['render-job-integration.js','ProfitMenteRenderJobs'],
    ['render-range-engine.js','ProfitMenteRenderRangeEngine'],
    ['render-range-integration.js','ProfitMenteRenderRange'],
    ['range-edit-engine.js','ProfitMenteRangeEditEngine'],
    ['range-edit-integration.js','ProfitMenteRangeEdit'],
    ['safe-area-engine.js','ProfitMenteSafeAreaEngine'],
    ['safe-area-integration.js','ProfitMenteSafeArea'],
    ['scene-detect-engine.js','ProfitMenteSceneDetectEngine'],
    ['scene-detect-integration.js','ProfitMenteSceneDetect'],
    ['slip-edit-engine.js','ProfitMenteSlipEditEngine'],
    ['slip-edit-integration.js','ProfitMenteSlipEdit'],
    ['roll-edit-engine.js','ProfitMenteRollEditEngine'],
    ['roll-edit-integration.js','ProfitMenteRollEdit'],
    ['rate-stretch-engine.js','ProfitMenteRateStretchEngine'],
    ['rate-stretch-integration.js','ProfitMenteRateStretch'],
    ['freeze-frame-engine.js','ProfitMenteFreezeFrameEngine'],
    ['freeze-frame-integration.js','ProfitMenteFreezeFrame'],
    ['clip-group-engine.js','ProfitMenteClipGroupEngine'],
    ['clip-group-integration.js','ProfitMenteClipGroups'],
    ['subtitle-export-engine.js','ProfitMenteSubtitleExportEngine'],
    ['subtitle-export-integration.js','ProfitMenteSubtitleExport'],
    ['visual-gap-engine.js','ProfitMenteVisualGapEngine'],
    ['visual-gap-integration.js','ProfitMenteVisualGap'],
    ['auto-transition-engine.js','ProfitMenteAutoTransitionEngine'],
    ['auto-transition-integration.js','ProfitMenteAutoTransitions'],
    ['auto-finish-engine.js','ProfitMenteAutoFinishEngine'],
    ['export-preflight.js','ProfitMenteExportPreflight'],
    ['auto-finish-integration.js','ProfitMenteAutoFinish'],
    ['automation-checkpoint.js','ProfitMenteAutomationCheckpoint']
  ];
  function load([src,guard,dataKey]){
    if(guard&&window[guard])return Promise.resolve();
    if([...document.scripts].some(s=>s.src.endsWith('/'+src)||s.src.endsWith(src)))return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const s=document.createElement('script');s.src=src;s.async=false;
      if(dataKey)s.dataset[dataKey]='1';
      s.onload=resolve;s.onerror=()=>reject(new Error('No se pudo cargar '+src));document.body.appendChild(s);
    });
  }
  (async()=>{
    const failed=[];
    for(const mod of modules){try{await load(mod)}catch(err){failed.push(mod[0]);console.error(err)}}
    if(failed.length)setStatus?.(`Studio activo con ${failed.length} módulo(s) no cargado(s): ${failed.join(', ')}`);
    else setStatus?.('Studio listo · herramientas avanzadas activadas');
    window.dispatchEvent(new CustomEvent('profitmente:features-ready',{detail:{failed}}));
  })();
})();