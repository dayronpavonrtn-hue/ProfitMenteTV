import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.resolve(here, '..', 'app.js');
const source = fs.readFileSync(appPath, 'utf8');

// Preview seeks and image decodes are asynchronous. A late completion from an
// older playhead position must never paint over the newest requested frame.
assert.match(source, /previewRenderVersion\s*=\s*0/,
  'preview must keep a monotonically increasing render generation');
assert.match(source, /const renderVersion=\+\+previewRenderVersion,isCurrent=\(\)=>renderVersion===previewRenderVersion/,
  'each preview request must capture and compare its render generation');
assert.match(source, /if\(!isCurrent\(\)\)\{URL\.revokeObjectURL\(url\);return false\}/,
  'stale async media work must abort and release its object URL');
assert.match(source, /if\(isCurrent\(\)\)\{let sc=Math\.max\(canvas\.width\/im\.width,canvas\.height\/im\.height\)/,
  'late image loads must be prevented from painting stale frames');
assert.match(source, /if\(isCurrent\(\)&&v\.videoWidth&&v\.videoHeight\)/,
  'late video seeks must be prevented from painting stale frames');
assert.match(source, /if\(!isCurrent\(\)\)return false;let cap=/,
  'captions must not be painted after a preview request becomes stale');

console.log('[OK] preview stale-frame cancellation guard is present');
