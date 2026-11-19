import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const argument=process.argv.find(x=>x.startsWith('--root='));
const root=path.resolve(argument?argument.slice(7):'public'),check=process.argv.includes('--check');
const fail=message=>{throw Error(message);};
const files=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);
const output=path.resolve('.portal-build/public');if(output===root||output.startsWith(root+path.sep))fail('Build output must be outside source public.');
const all=files(root),changes=new Map(),read=file=>changes.get(file)??fs.readFileSync(file,'utf8');
const safe=value=>{const target=path.resolve(root,value);if(!target.startsWith(root+path.sep))fail('Path outside public: '+value);return target;};
const scripts=html=>[...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>\s*<\/script>/gi)].map(m=>m[1]);
function context(){const window={};return vm.createContext({window,document:{readyState:'loading',addEventListener(){},getElementById(){return null;},querySelector(){return null;},querySelectorAll(){return [];}},URL,console});}
const baseFile=safe('data/content.js'),base=context();vm.runInContext(read(baseFile),base,{timeout:3000});
const data=base.window.PORTAL_DATA;if(!Array.isArray(data?.subjects))fail('Missing subject catalog.');
const entries=[],keys=new Set(),storageIds=new Set();
for(const subject of data.subjects)for(const event of subject.events||[]){
 const key=subject.id+'/'+event.id;if(keys.has(key))fail('Duplicate assessment: '+key);keys.add(key);
 const index=safe(event.path),html=read(index),ctx=context();vm.runInContext(read(baseFile),ctx,{timeout:3000});
 for(const src of new Set([...scripts(html),...(event.dataScripts||[])])){
  if(/^(?:https?:)?\/\//.test(src))continue;
  const filename=path.resolve(path.dirname(index),src.split(/[?#]/)[0]);
  if(filename===baseFile||(!/(?:-data|-objectives)\.js$/.test(filename)&&!(event.dataScripts||[]).includes(src)))continue;
  if(!scripts(html).some(s=>path.resolve(path.dirname(index),s.split(/[?#]/)[0])===filename))fail('Data script not loaded by assessment: '+src);
  if(!filename.startsWith(root+path.sep))fail('Invalid data path: '+src);
  vm.runInContext(read(filename),ctx,{timeout:3000,filename});
 }
 const candidates=Object.values(ctx.window).filter(v=>v&&Array.isArray(v.lessons)&&Array.isArray(v.quizzes));
 const extra=candidates.filter(v=>v!==ctx.window.PORTAL_DATA);
 const dataset=event.dataGlobal?ctx.window[event.dataGlobal]:extra.length===1?extra[0]:extra.length===0&&subject.id==='geografia-a'?ctx.window.PORTAL_DATA:null;
 if(!dataset)fail('Register one *-data.js source, or dataScripts/dataGlobal, for '+key);
 if(!Array.isArray(dataset.lessons)||!Array.isArray(dataset.quizzes))fail('Invalid assessment data: '+key);
 if(dataset!==ctx.window.PORTAL_DATA&&!event.progressKey)fail('Register progressKey for '+key);
 const ids=(list,label)=>{const values=list.map(x=>x.id);if(values.some(x=>typeof x!=='string'||!x)||new Set(values).size!==values.length)fail('Missing or duplicate '+label+' IDs: '+key);return values;};
 const lessonIds=ids(dataset.lessons,'lesson'),quizIds=ids(dataset.quizzes,'quiz');
 for(const [kind,values] of [['lesson',lessonIds],['quiz',quizIds]])for(const id of values){const sk=(event.progressKey||'root')+':'+kind+':'+id;if(storageIds.has(sk))fail('Shared progress ID collision: '+sk);storageIds.add(sk);}
 for(const q of dataset.quizzes)if(!Array.isArray(q.questions)||!q.questions.length)fail('Empty quiz: '+key+'/'+q.id);
 entries.push({subjectId:subject.id,eventId:event.id,progressKey:event.progressKey||null,lessonIds,quizIds,sectionCount:lessonIds.length,quizCount:quizIds.length,quizMeta:dataset.quizzes.map(q=>({id:q.id,title:q.title,questionCount:q.questions.length}))});
}
for(const file of all.filter(f=>f.endsWith(path.sep+'index.html')&&f.includes(path.sep+'disciplinas'+path.sep))){
 const relative=path.relative(root,file).split(path.sep).join('/');
 if(/\bdata-page=["'](?:event|filosofia)["']/.test(read(file))&&!data.subjects.some(s=>(s.events||[]).some(e=>e.path===relative)))fail('Assessment not registered: '+relative);
}
const catalog=`(()=>{'use strict';const entries=${JSON.stringify(entries)};const data=window.PORTAL_DATA;if(!data)throw Error('Load content.js before catalog.generated.js');
for(const entry of entries){const event=data.subjects.find(s=>s.id===entry.subjectId)?.events?.find(e=>e.id===entry.eventId);if(!event)throw Error('Assessment missing from catalog');Object.assign(event,entry);}
function assessment(subjectId,eventId,state){const e=entries.find(x=>x.subjectId===subjectId&&x.eventId===eventId);if(!e)return null;const source=e.progressKey?state[e.progressKey]||{}:state,read=new Set(source.read||[]),records=state.quizRecords?.[e.progressKey||'root']||{},done=new Set([...(source.history||[]).filter(r=>!r.practice).map(r=>r.quizId),...Object.keys(records).filter(id=>records[id]?.last)]);return {read:e.lessonIds.filter(id=>read.has(id)).length,total:e.lessonIds.length,quizzes:e.quizIds.filter(id=>done.has(id)).length,quizTotal:e.quizIds.length};}
function summary(state){let sectionTotal=0,quizTotal=0,completedSections=0,completedQuizzes=0;for(const e of entries){const s=assessment(e.subjectId,e.eventId,state);sectionTotal+=s.total;quizTotal+=s.quizTotal;completedSections+=s.read;completedQuizzes+=s.quizzes;}return {sectionTotal,quizTotal,completedSections,completedQuizzes,remainingSections:sectionTotal-completedSections,remainingQuizzes:quizTotal-completedQuizzes};}
window.PA_CATALOG={entries,assessment,summary};})();\n`;
changes.set(safe('data/catalog.generated.js'),catalog);
const colors={'#294737':'#2d5ddc','#23362e':'#151313','#263d2f':'#151313','#527245':'#2d5ddc','#365331':'#244fbd','#3e6036':'#244fbd','#f6f7f2':'#f3f4f6','#657169':'#59616d','#627464':'#59616d'};
for(const file of all.filter(f=>/\.(css|js|html|svg)$/.test(f)))changes.set(file,read(file).replace(/#[\da-f]{6}\b/gi,x=>colors[x.toLowerCase()]||x));
function patch(relative,transform){const file=safe(relative);changes.set(file,transform(read(file)));}
patch('assets/rebrand.js',()=>"import {enhanceSupervisorSummary} from './supervisor-summary.js?v=20261119b';\nwindow.addEventListener('ian-study-ready',enhanceSupervisorSummary);\nif(window.IanCloud)enhanceSupervisorSummary();\n");
patch('assets/acompanhamento-tabs.css',s=>s.replace(/@import\s+url\(['"]\.\/(?:rebrand|portal-fixes)\.css[^)]*\);\s*/g,''));
patch('assets/portal-ui.js',s=>{const start=s.indexOf('export function getStudySummary('),end=s.indexOf('export function findResume(',start);if(start<0||end<0)fail('Study summary entry points changed.');return s.slice(0,start)+'export function getStudySummary(data,state,subject,event){return window.PA_CATALOG.assessment(subject.id,event.id,state);}\n'+s.slice(end);});
patch('assets/dashboard.js',s=>{if(s.includes('window.PA_CATALOG.summary(state)'))return s;const start=s.indexOf(' let sections=0,quizzes=0,sectionTotal=0,quizTotal=0;'),end=s.indexOf(' return {all,pending,next,sections,quizzes,sectionTotal,quizTotal};',start);if(start<0||end<0)fail('Dashboard summary entry point changed.');return s.slice(0,start)+' const {remainingSections:sections,remainingQuizzes:quizzes,sectionTotal,quizTotal}=window.PA_CATALOG.summary(state);\n'+s.slice(end);});
patch('assets/app.js',s=>s.replace("s.events.length?'1 avaliação · PDF e 3 quizzes':'A aguardar materiais'","s.events.length?(s.events.length+' '+(s.events.length===1?'avaliação':'avaliações')+' · PDF e '+s.events.reduce((n,e)=>n+(e.quizIds?.length||0),0)+' quizzes'):'A aguardar materiais'"));
patch('assets/filosofia-home.js',s=>s.replace("+' · PDF e 3 quizzes'","+' · PDF e '+events.reduce((n,e)=>n+(e.quizIds?.length||0),0)+' quizzes'"));
for(const relative of ['assets/app.js','assets/filosofia-home.js'])if(/PDF e 3 quizzes/.test(read(safe(relative))))fail('Hardcoded quiz count remains in '+relative);
const hash=text=>createHash('sha256').update(text).digest('hex').slice(0,12);
const theme=hash(read(safe('assets/rebrand.css'))+read(safe('assets/portal-fixes.css'))),catalogVersion=hash(catalog);
for(const file of all.filter(f=>f.endsWith('.html'))){
 let html=read(file);if(!/<\/head>/i.test(html))continue;
 const prefix=path.relative(path.dirname(file),root).split(path.sep).join('/')||'.';
 html=html.replace(/<link\b[^>]*\bhref=["'][^"']*assets\/(?:rebrand|portal-fixes)\.css[^"']*["'][^>]*>\s*/gi,'');
 html=html.replace(/<script\b[^>]*\bsrc=["'][^"']*data\/catalog\.generated\.js[^"']*["'][^>]*>\s*<\/script>\s*/gi,'');
 let count=0;html=html.replace(/(<script\b[^>]*\bsrc=["'][^"']*data\/content\.js[^"']*["'][^>]*>\s*<\/script>)/gi,match=>{count++;return match+'<script src="'+prefix+'/data/catalog.generated.js?v='+catalogVersion+'" defer></script>';});
 if(count>1)fail('Repeated content.js in '+file);
 const links='<link rel="stylesheet" href="'+prefix+'/assets/rebrand.css?v='+theme+'"><link rel="stylesheet" href="'+prefix+'/assets/portal-fixes.css?v='+theme+'">';
 html=html.replace(/<\/head>/i,links+'</head>');changes.set(file,html);
 if(!html.includes(links))fail('Missing initial theme: '+file);
}
const test=context();vm.runInContext(read(baseFile),test);vm.runInContext(catalog,test);const totals=test.window.PA_CATALOG.summary({read:[],history:[],drafts:{}});if(totals.quizTotal!==entries.reduce((n,e)=>n+e.quizIds.length,0))fail('Catalog total mismatch.');
for(const [file,text] of changes)if(file.endsWith('.css')&&/#(?:294737|527245|23362e)\b/i.test(text))fail('Legacy theme remains: '+file);
for(const relative of ['assets/app.js','assets/filosofia-home.js','assets/portal-ui.js','assets/dashboard.js','assets/rebrand.js','data/catalog.generated.js']){const parsed=spawnSync(process.execPath,['--input-type=module','--check'],{input:read(safe(relative)),encoding:'utf8'});if(parsed.status!==0)fail('JavaScript syntax failed in '+relative+': '+parsed.stderr);}
if(!check){fs.rmSync(output,{recursive:true,force:true});fs.mkdirSync(path.dirname(output),{recursive:true});fs.cpSync(root,output,{recursive:true});for(const [file,text] of changes){const destination=path.join(output,path.relative(root,file));fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,text);}}
console.log(JSON.stringify({mode:check?'validated':'built',assessments:entries.length,sections:totals.sectionTotal,quizzes:totals.quizTotal,htmlPages:all.filter(f=>f.endsWith('.html')).length}));
