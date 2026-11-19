import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=path.resolve('.portal-build/public'),asset=name=>path.join(root,'assets',name);
const readAsset=name=>fs.readFileSync(asset(name),'utf8').replace(/\r\n?/g,'\n');
const imports="import {completionSummary,renderCompletionStats} from './completion-progress.js';\n";
function compile(name,text){const result=spawnSync(process.execPath,['--input-type=module','--check'],{input:text,encoding:'utf8'});if(result.status!==0)throw Error('Invalid completion patch in '+name+': '+result.stderr);}
const dashboard=readAsset('dashboard.js'),supervisor=readAsset('supervisor-summary.js');
const targets=new Map();
if(!dashboard.includes('renderCompletionStats([stats[1],stats[2]]')){
 const start=dashboard.indexOf('  const stats=view.querySelectorAll('),end=dashboard.indexOf('  hero(view.querySelector(',start);
 if(start<0||end<0)throw Error('Dashboard stats entry point changed; publication stopped.');
 const replacement="  const stats=view.querySelectorAll('.stats .stat');renderCompletionStats([stats[1],stats[2]],completionSummary(data,state));\n";
 targets.set('dashboard.js',imports+dashboard.slice(0,start)+replacement+dashboard.slice(end));
}
if(!supervisor.includes('renderCompletionStats(cards,model')){
 const start=supervisor.indexOf('  const model=state&&window.PORTAL_DATA?'),end=supervisor.indexOf('\n }\n const observer=',start);
 if(start<0||end<0)throw Error('Supervisor stats entry point changed; publication stopped.');
 const replacement="  const model=state&&window.PORTAL_DATA?completionSummary(window.PORTAL_DATA,state):null;\n  const cards=['sections','quizzes'].map(kind=>stats.querySelector('[data-ian-stat=\"'+kind+'\"]'));renderCompletionStats(cards,model,'Ian');\n  for(const card of cards)text(card.querySelector('.pa-ian-source'),status);";
 targets.set('supervisor-summary.js',imports+supervisor.slice(0,start)+replacement+supervisor.slice(end));
}
compile('completion-progress.js',readAsset('completion-progress.js'));
for(const [name,text] of targets)compile(name,text);
for(const [name,text] of targets)fs.writeFileSync(asset(name),text);
console.log('Completion policy applied: closed assessments have no pending tasks; actual history is preserved.');
