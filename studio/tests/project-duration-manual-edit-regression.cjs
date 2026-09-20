const fs=require('fs');
const path=require('path');
const assert=require('assert');

const source=fs.readFileSync(path.join(__dirname,'..','project-duration.js'),'utf8');
const start=source.indexOf("durationInput.addEventListener('change'");
assert(start>=0,'project-duration must handle manual duration changes');
const end=source.indexOf("const basePersist",start);
assert(end>start,'manual duration handler must be bounded before persist wrapper');
const handler=source.slice(start,end);

const read=handler.indexOf('durationInput.value');
const assign=handler.indexOf('project.duration=requested');
const sanitize=handler.indexOf('ProfitMenteProjectDuration.sanitize(project)');
const persist=handler.indexOf("typeof persist==='function'");
assert(read>=0,'handler must read the typed duration');
assert(assign>read,'handler must commit the typed value into the project');
assert(sanitize>assign,'handler must sanitize only after committing the typed value');
assert(persist>sanitize,'handler must persist the sanitized manual edit');
assert(handler.includes('p.max=value'),'playhead range must follow the committed duration');
assert(handler.includes('drawTimeline'),'timeline must redraw after a manual duration edit');
assert(handler.includes('renderAt'),'preview must refresh after a manual duration edit');
console.log('PASS project duration manual edit regression');
