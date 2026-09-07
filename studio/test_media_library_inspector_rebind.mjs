import assert from 'node:assert/strict';
import fs from 'node:fs';

const inspector=fs.readFileSync(new URL('./media-inspector.js',import.meta.url),'utf8');
const rebind=fs.readFileSync(new URL('./media-library-inspector-rebind.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('./index.html',import.meta.url),'utf8');

assert.match(
  inspector,
  /if\(!window\.ProfitMenteMediaLibraryTools&&!document\.querySelector\('script\[data-profitmente-media-library-tools\]'\)\)/,
  'media inspector must not dynamically load a second copy of media-library-tools.js when the static tools are already active'
);
assert.match(
  inspector,
  /else if\(window\.ProfitMenteMediaLibraryTools\)\{loadCleanupGuard\(\);loadInspectorRebind\(\)\}/,
  'static media library tools must be rebound after media inspector replaces drawLibrary'
);
assert.match(inspector,/s\.src='media-library-inspector-rebind\.js'/,'inspector must load the dedicated post-render rebind');

assert.match(rebind,/const baseDraw=drawLibrary;/,'rebind must capture the inspector renderer');
assert.match(rebind,/drawLibrary=function\(\)\{baseDraw\(\);enhanceInspectorCards\(\)\}/,'every library redraw must restore management rows');
assert.match(rebind,/:scope > \.mediaCard/,'rebind must target inspector media cards');
assert.match(rebind,/row\.className='mediaRow'/,'inspector cards must regain media rows used by search/filter tooling');
assert.match(rebind,/del\.className='mediaDelete'/,'inspector cards must regain delete controls');
assert.match(rebind,/tools\.crossProjectUsage\?\.\(project,asset\.id\)/,'delete path must consult cross-project usage');
assert.match(rebind,/if\(cross&&!cross\.available\)/,'delete path must fail closed when saved-project usage cannot be verified');
assert.match(rebind,/ProfitMenteMediaLibraryDeleteGuard\?\.refresh\?\.\(\)/,'existing cross-project delete guard must be refreshed after rows are rebuilt');

const toolsIndex=html.indexOf('<script src="media-library-tools.js"></script>');
const inspectorIndex=html.indexOf('<script src="media-inspector.js"></script>');
assert.ok(toolsIndex>=0&&inspectorIndex>toolsIndex,'static media library tools must exist before the inspector renderer');

console.log('Media library inspector rebind regression: PASS');
