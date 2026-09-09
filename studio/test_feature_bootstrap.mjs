import fs from 'node:fs';
import assert from 'node:assert/strict';
const bootstrap=fs.readFileSync(new URL('./feature-bootstrap.js',import.meta.url),'utf8');
const transition=fs.readFileSync(new URL('./transition-duration.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('./index.html',import.meta.url),'utf8');
const required=[
  'media-library-tools.js','generator-autofill.js','audio-normalize-integration.js','project-version-integration.js',
  'recovery-integration.js','render-job-integration.js','render-range-integration.js',
  'safe-area-integration.js','scene-detect-integration.js','subtitle-export-integration.js',
  'subtitle-import-engine.js','subtitle-import-integration.js',
  'media-relink-folder-engine.js','media-relink-folder-integration.js',
  'visual-gap-integration.js','automation-checkpoint.js','export-preflight.js'
];
for(const file of required)assert.ok(bootstrap.includes(`'${file}'`),`${file} debe activarse desde el bootstrap`);
assert.ok(bootstrap.includes('window.__profitmenteFeatureBootstrap'),'debe impedir doble inicialización');
assert.ok(bootstrap.includes('document.scripts'),'debe evitar cargar scripts existentes otra vez');
assert.ok(bootstrap.includes('profitmenteMediaImport'),'debe marcar media-import para evitar la autocarga duplicada de media-library-tools');
const mediaImportIndex=bootstrap.indexOf("'media-import-engine.js'");
const autoFillIndex=bootstrap.indexOf("'generator-autofill.js'");
assert.ok(mediaImportIndex>=0&&autoFillIndex>mediaImportIndex,'generator-autofill debe cargarse después del importador que emite profitmente:media-imported');
assert.ok(bootstrap.includes("['generator-autofill.js','ProfitMenteGeneratorAutoFillIntegration']"),'el guard debe comprobar la integración activa, no solo la clase del helper');
assert.ok(html.includes('<script src="feature-bootstrap.js"></script>'),'la UI principal debe arrancar el bootstrap directamente desde index.html');
assert.doesNotMatch(transition,/feature-bootstrap\.js/,'transition-duration no debe ser responsable del arranque global del bootstrap');
const transitionIndex=html.indexOf('transition-duration.js');
const bootstrapIndex=html.indexOf('feature-bootstrap.js');
assert.ok(transitionIndex>=0&&bootstrapIndex>transitionIndex,'el bootstrap debe arrancar después de las herramientas cargadas explícitamente');
const subtitleExportIndex=bootstrap.indexOf("'subtitle-export-integration.js'");
const subtitleImportEngineIndex=bootstrap.indexOf("'subtitle-import-engine.js'");
const subtitleImportIntegrationIndex=bootstrap.indexOf("'subtitle-import-integration.js'");
assert.ok(subtitleImportEngineIndex>subtitleExportIndex&&subtitleImportIntegrationIndex>subtitleImportEngineIndex,'subtitle import debe cargar engine antes de integration y después del exportador');
const relinkEngineIndex=bootstrap.indexOf("'media-relink-engine.js'");
const relinkIntegrationIndex=bootstrap.indexOf("'media-relink-integration.js'");
const folderRelinkEngineIndex=bootstrap.indexOf("'media-relink-folder-engine.js'");
const folderRelinkIntegrationIndex=bootstrap.indexOf("'media-relink-folder-integration.js'");
assert.ok(relinkEngineIndex>=0&&relinkIntegrationIndex>relinkEngineIndex,'relink base debe cargar engine antes de integration');
assert.ok(folderRelinkEngineIndex>relinkIntegrationIndex&&folderRelinkIntegrationIndex>folderRelinkEngineIndex,'relink por carpeta debe cargar después del relink base y su engine antes de integration');
assert.ok(bootstrap.includes("['media-relink-folder-engine.js','ProfitMenteMediaRelinkFolderEngine']"),'el bootstrap debe comprobar el engine de revinculación por carpeta');
assert.ok(bootstrap.includes("['media-relink-folder-integration.js','ProfitMenteMediaRelinkFolder']"),'el bootstrap debe comprobar que la interfaz de revinculación por carpeta quedó activa');
console.log('Feature bootstrap regression OK');