const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'project-autosave.js'), 'utf8');

assert.match(source, /function retryAfterResume\(reason\)\{if\(!unsaved\)return false;retryCount=0;cancel\(\);return flush\(reason\)\}/,
  'resume retry must only run for an unsaved project and reset retry state');
assert.match(source, /window\.addEventListener\('pageshow',\(\)=>retryAfterResume\('reanudar'\)\)/,
  'pageshow must retry a failed autosave after browser page restoration');
assert.match(source, /document\.addEventListener\('visibilitychange',[\s\S]*retryAfterResume\('visible'\)/,
  'returning to a visible tab must retry a failed autosave');
assert.match(source, /document\.addEventListener\('resume',\(\)=>retryAfterResume\('reanudar'\)\)/,
  'Page Lifecycle resume must retry a failed autosave');
assert.match(source, /window\.addEventListener\('beforeunload',[\s\S]*if\(unsaved\)\{event\.preventDefault\(\);event\.returnValue=''\}/,
  'beforeunload must retain the unsaved-change warning when persistence still fails');

console.log('PASS project autosave lifecycle regression');
