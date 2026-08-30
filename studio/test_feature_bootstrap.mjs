import fs from 'node:fs';
import assert from 'node:assert/strict';
const bootstrap=fs.readFileSync(new URL('./feature-bootstrap.js',import.meta.url),'utf8');
const transition=fs.readFileSync(new URL('./transition-duration.js',import.meta.url),'utf8');
const required=[
  'media-library-tools.js','generator-autofill.js','audio-normalize-integration.js','project-version-integration.js',
  'recovery-integration.js','render-job-integration.js','render-range-integration.js',
  'safe-area-integration.js','scene-detect-integration.js','subtitle-export-integration.js',
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
assert.ok(transition.includes("s.src='feature-bootstrap.js'"),'la UI principal debe arrancar el bootstrap desde un script ya cargado');
assert.ok(transition.includes('data-profitmente-feature-bootstrap')||transition.includes('profitmenteFeatureBootstrap'),'debe impedir inyectar dos bootstrap');
const bootstrapStart=transition.indexOf("s.src='feature-bootstrap.js'");
const propsGuard=transition.indexOf("const props=$('.props');if(!props)return;");
assert.ok(bootstrapStart>=0&&propsGuard>=0&&bootstrapStart<propsGuard,'el bootstrap debe arrancar antes de cualquier guard de UI que pueda abortar transition-duration');
console.log('Feature bootstrap regression OK');
