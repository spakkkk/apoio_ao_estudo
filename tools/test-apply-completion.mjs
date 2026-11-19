import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const repo=fileURLToPath(new URL('../',import.meta.url)),script=path.join(repo,'tools','apply-completion.mjs');
const names=['dashboard.js','supervisor-summary.js','completion-progress.js'];
const sources=new Map(names.map(name=>[name,fs.readFileSync(path.join(repo,'public','assets',name),'utf8').replace(/\r\n?/g,'\n')]));
for(const [label,eol] of [['LF','\n'],['CRLF','\r\n'],['CR','\r']]){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'portal-completion-')),assets=path.join(root,'.portal-build','public','assets');
 try{
  fs.mkdirSync(assets,{recursive:true});
  for(const [name,text] of sources)fs.writeFileSync(path.join(assets,name),text.replace(/\n/g,eol));
  const run=()=>spawnSync(process.execPath,[script],{cwd:root,encoding:'utf8'});
  let result=run();assert.equal(result.status,0,label+': '+result.stderr);
  const patched=new Map(names.map(name=>[name,fs.readFileSync(path.join(assets,name),'utf8')]));
  assert.match(patched.get('dashboard.js'),/renderCompletionStats\(\[stats\[1\],stats\[2\]\]/);
  assert.match(patched.get('supervisor-summary.js'),/renderCompletionStats\(cards,model/);
  result=run();assert.equal(result.status,0,label+' repeat: '+result.stderr);
  for(const [name,text] of patched)assert.equal(fs.readFileSync(path.join(assets,name),'utf8'),text,label+' must be idempotent: '+name);
  const broken=sources.get('supervisor-summary.js').replace('  const model=state&&window.PORTAL_DATA?','  const model=changed?');
  assert.notEqual(broken,sources.get('supervisor-summary.js'));
  fs.writeFileSync(path.join(assets,'dashboard.js'),sources.get('dashboard.js'));
  fs.writeFileSync(path.join(assets,'supervisor-summary.js'),broken);
  result=run();assert.notEqual(result.status,0,label+' must reject changed source');
  assert.match(result.stderr,/Supervisor stats entry point changed/);
  assert.equal(fs.readFileSync(path.join(assets,'dashboard.js'),'utf8'),sources.get('dashboard.js'));
  assert.equal(fs.readFileSync(path.join(assets,'supervisor-summary.js'),'utf8'),broken);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
}
console.log('Completion predeploy tests passed: LF, CRLF, CR, repeated runs and safe rejection of changed source.');
