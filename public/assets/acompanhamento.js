import {initializeApp} from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js';
import {getAuth,onAuthStateChanged,signOut} from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js';
import {getFirestore,doc,onSnapshot,collection,query,orderBy,limit,startAfter,getDocs} from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js';
const app=initializeApp({apiKey:'AIzaSyC7qmpQmNAA1Y5WDmtKvamS1k4k7qcELNI',authDomain:'apoio-ao-estudo.firebaseapp.com',projectId:'apoio-ao-estudo',storageBucket:'apoio-ao-estudo.firebasestorage.app',messagingSenderId:'740789054680',appId:'1:740789054680:web:c068304d0b8bbcf96a3bad'}),auth=getAuth(app),db=getFirestore(app),IAN='e8qdr6yFCXYkZco5QZafsswdRkZ2',SUPERVISOR='6X1jNaIZgMNO6CgkMXndkAHiB1m1';
const $=id=>document.getElementById(id);let unsub=null,unsubActivity=null,generation=0,activityGeneration=0,busy=false,cursor=null,hasMore=false,firstBatch=true;
const batches=new Map();
const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('./acompanhamento-folds.css',import.meta.url).href;document.head.append(css);
function el(tag,text,parent){const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);parent?.append(n);return n;}
function plain(x){return new DOMParser().parseFromString(String(x??''),'text/html').body.textContent||'';}
function date(x){if(x===undefined||x===null||x==='')return 'Data indisponível';const d=x?.toDate?x.toDate():new Date(x);return Number.isFinite(d.getTime())?d.toLocaleString('pt-PT'):'Data indisponível';}
const data=subject=>subject==='filosofia'?window.FILOSOFIA_DATA:subject==='geografia'||subject==='geografia-a'?window.PORTAL_DATA:null;
const subjectName=s=>s==='geografia'?'Geografia A':window.PORTAL_DATA?.subjects?.find(x=>x.id===s)?.name||'Portal';
const quiz=(subject,id)=>data(subject)?.quizzes?.find(q=>q.id===id);
function label(subject,id){
 if(String(id).startsWith('assessment:')){const [sid,eid]=id.slice(11).split('/');const s=window.PORTAL_DATA?.subjects?.find(s=>s.id===sid),e=s?.events?.find(e=>e.id===eid);return (s?.name||sid)+' — '+(e?.title||eid);}
 const d=data(subject),l=d?.lessons?.find(l=>l.id===id);if(l)return plain(l.title);
 if(subject==='filosofia'&&String(id).includes(':')){const [lesson,n]=id.split(':'),l=d?.lessons?.find(l=>l.id===lesson);if(l)return plain(l.title)+' — '+plain(l.points?.[Number(n)]||id);}
 if(subject==='geografia'||subject==='geografia-a'){const m=String(id).match(/^(.*)-(\d+)$/),l=m&&d?.lessons?.find(l=>l.id===m[1]);if(l)return plain(l.title)+' — '+plain(l.points?.[Number(m[2])]||id);}
 return ({ler:'Rever o guia',treinar:'Fazer um quiz',corrigir:'Voltar aos erros'})[id]||quiz(subject,id)?.title||String(id);
}
function answer(q,a){if(a===null||a===undefined||String(a).trim()==='')return 'Sem resposta';if(q?.t==='mc')return plain(q.o?.[Number(a)]??a);if(q?.t==='tf')return String(a)==='true'?'Verdadeiro':'Falso';return typeof a==='object'?JSON.stringify(a):String(a);}
function result(parent,r,subject,captured=null){
 const d=el('details',undefined,parent);el('summary',plain(r.title||label(subject,r.quizId))+' · '+date(r.at)+' · '+r.score+'/'+r.max+' automáticos'+(r.practice?' · treino focado':''),d);
 const elapsed=Number(r.elapsed);if(Number.isFinite(elapsed))el('p','Tempo decorrido: '+Math.floor(elapsed/60)+' min '+Math.floor(elapsed%60)+' s (pode incluir pausas).',d);
 if(r.manual)el('p',r.manual+' pontos de respostas extensas previstos para avaliação humana. Não é uma nota final.',d);
 const qs=captured||quiz(subject,r.quizId)?.questions||[];el('p',captured?'Enunciados preservados no registo desta tentativa.':'Enunciados do catálogo atual; não são uma cópia histórica.',d);
 const order=subject==='filosofia'?(r.order||Object.keys(r.answers||{})):qs.length?qs.map((_,i)=>String(i)):Object.keys(r.answers||{});
 order.forEach((key,i)=>{const q=subject==='filosofia'?qs.find(q=>q.id===key):qs[Number(key)],section=el('div',undefined,d);section.className='question';el('h3','Pergunta '+(i+1),section);el('p',q?plain(q.q):'Enunciado indisponível ('+key+')',section);el('p','Resposta: '+answer(q,r.answers?.[key]),section).className='answer';if(q?.t==='op'){if(q.m)el('p','Modelo: '+plain(q.m),section);if(q.pts){const ul=el('ul',undefined,section);q.pts.forEach(p=>el('li',plain(p),ul));}}else if(q){el('p','Solução: '+answer(q,q.a),section);if(q.e)el('p',plain(q.e),section);}});return d;
}
function items(parent,values,empty){if(!values.length){el('p',empty,parent);return;}const ul=el('ul',undefined,parent);values.forEach(v=>el('li',v,ul));}
function fold(parent,key,title,status,cls){const d=el('details',undefined,parent);d.dataset.fold=key;d.className=cls;const summary=el('summary',undefined,d),copy=el('span',undefined,summary);copy.className='ac-fold-copy';el('span',title,copy).className='ac-fold-title';if(status)el('span',status,copy).className='ac-fold-status';const content=el('div',undefined,d);content.className='ac-fold-body';return {d,content};}
function sourceFor(s,subject,event){if(event.progressKey)return s[event.progressKey]||{};if(subject.id==='geografia-a'&&event.id==='prova-comum-2026-11-13')return s;if(subject.id==='filosofia'&&event.id==='prova-comum-2026-11-19')return s.philosophy20261119||{};return null;}
function progress(parent,state,subject,event){
 if(!state){el('p','Ainda não existe uma origem de progresso detalhado associada a esta avaliação.',parent);return;}
 const lessonIds=Array.isArray(event.lessonIds)?new Set(event.lessonIds):null,quizIds=Array.isArray(event.quizIds)?new Set(event.quizIds):null;
 const read=(state.read||[]).filter(id=>!lessonIds||lessonIds.has(id));
 el('h3','Etapas revistas',parent);items(parent,read.map(id=>label(subject,id)),'Nenhuma etapa assinalada.');
 el('h3','Ideias assinaladas como lidas e compreendidas',parent);const checks=subject==='geografia'?state.topicChecks||{}:state.checks||{};
 items(parent,Object.entries(checks).filter(([k,v])=>v&&!k.startsWith('assessment:')&&(!lessonIds||[...lessonIds].some(id=>k===id||k.startsWith(id+':')||k.startsWith(id+'-')))).map(([k])=>label(subject,k)),'Nenhuma ideia assinalada.');
 if(subject==='geografia'){el('h3','Tarefas concluídas',parent);items(parent,(state.plan||[]).map(id=>label(subject,id)),'Nenhuma tarefa assinalada.');}
 el('h3','Quizzes em curso',parent);const drafts=Object.entries(state.drafts||{}).filter(([id])=>!quizIds||quizIds.has(id));if(!drafts.length)el('p','Sem rascunhos.',parent);
 for(const [id,draft] of drafts){const details=el('details',undefined,parent);el('summary',label(subject,id)+' · início '+date(draft.start),details);el('p','Rascunho guardado; não indica presença online.',details);const q=quiz(subject,id);for(const [key,a] of Object.entries(draft.answers||{})){const question=subject==='filosofia'?q?.questions?.find(x=>x.id===key):q?.questions?.[Number(key)];el('p',(question?plain(question.q):'Pergunta '+key)+' — '+answer(question,a),details);}}
 el('h3','Tentativas no progresso atual',parent);const h=(state.history||[]).filter(r=>!quizIds||quizIds.has(r.quizId));if(!h.length)el('p','Sem tentativas guardadas.',parent);[...h].sort((a,b)=>(Date.parse(b.at)||0)-(Date.parse(a.at)||0)).forEach(r=>result(parent,r,subject));
}
function render(raw){
 const s=typeof raw.state==='string'?JSON.parse(raw.state):raw.state;if(!s||!Array.isArray(s.history))throw Error('Formato de progresso inválido.');
 const opened=new Set([...$('report').querySelectorAll('[data-fold][open]')].map(n=>n.dataset.fold));
 $('report').replaceChildren();$('report').hidden=false;$('print').hidden=false;
 const meta=el('section',undefined,$('report'));meta.className='panel';el('h2','Estado atual',meta);el('p','Última gravação: '+(raw.updatedAt?date(raw.updatedAt):'Indisponível')+'. Não indica o último login.',meta);el('p','Todas as disciplinas e avaliações são apresentadas, incluindo as marcadas como concluídas. Expande uma disciplina para consultar os pormenores. As marcações antigas não têm data de ação e não comprovam, por si só, a leitura dos conteúdos.',meta);
 const subjects=window.PORTAL_DATA?.subjects||[];if(!subjects.length)el('p','O catálogo de disciplinas não está disponível.',meta);
 for(const subject of subjects){
  const events=subject.events||[],done=events.filter(e=>s.topicChecks?.['assessment:'+subject.id+'/'+e.id]===true).length;
  const status=events.length?done+' de '+events.length+' avaliações marcadas como concluídas':'Sem avaliações publicadas';
  const box=fold($('report'),'subject:'+subject.id,subject.name,status,'panel ac-subject');box.d.open=opened.has('subject:'+subject.id);
  if(!events.length){el('p','Ainda não foram publicados materiais ou avaliações para esta disciplina.',box.content);continue;}
  for(const e of events){
   const key='assessment:'+subject.id+'/'+e.id,completed=s.topicChecks?.[key]===true;
   const title=(e.type?e.type+' · ':'')+e.title;
   const assessment=fold(box.content,key,title,completed?'Marcada como concluída':'Por concluir','ac-assessment');assessment.d.open=opened.has(key);assessment.d.classList.toggle('ac-is-complete',completed);
   if(e.date)el('p','Data da avaliação: '+e.date.split('-').reverse().join('/')+(e.time?' · '+e.time:''),assessment.content);
   if(completed)el('p','A conclusão foi assinalada no portal. O progresso e os resultados continuam disponíveis abaixo.',assessment.content);
   progress(assessment.content,sourceFor(s,subject,e),subject.id==='geografia-a'?'geografia':subject.id,e);
  }
 }
}
function event(parent,e,savedAt){
 const d=el('details',undefined,parent),name=e.label||label(e.subject,e.key||'');
 const names={read:(e.value?'Marcou etapa como revista: ':'Desmarcou etapa: ')+name,plan:(e.value?'Concluiu tarefa: ':'Desmarcou tarefa: ')+name,check:(e.value?'Assinalou: ':'Retirou a marcação: ')+name,started:'Iniciou um rascunho: '+name,draftRemoved:'Removeu/substituiu um rascunho: '+name,answer:'Guardou/alterou resposta: '+name,completed:'Concluiu um quiz: '+name,page:'Abriu uma página do portal',coach:'Atualizou exercício de escrita'};
 el('summary',date(e.at)+' · '+subjectName(e.subject)+' · '+(names[e.type]||e.type),d);
 if(savedAt)el('small','Gravação confirmada: '+date(savedAt),d);
 if(e.type==='completed')result(d,e.result,e.subject,e.catalogCaptured?e.questions:null);
 if(e.type==='answer'){const q=quiz(e.subject,e.key),question=e.questionSnapshot||(e.subject==='filosofia'?q?.questions?.find(x=>x.id===e.question):q?.questions?.[Number(e.question)]);el('p',question?plain(question.q):'Pergunta '+e.question,d);el('p','Resposta guardada: '+answer(question,e.value),d).className='answer';el('small',e.questionSnapshot?'Enunciado e opções preservados com a resposta.':'Enunciado e opções do catálogo atual.',d);}
 if(e.page)el('p','Página: '+e.page,d);return d;
}
function renderActivity(){
 const keepOpen=$('events').querySelector('.ac-older')?.open||false;const ordered=[...batches.values()].sort((a,b)=>(Number(b.data().revision)||0)-(Number(a.data().revision)||0));
 const entries=ordered.flatMap(snap=>{const b=snap.data();return [...(b.events||[])].reverse().map(e=>({e,savedAt:b.savedAt}));});
 $('events').replaceChildren();cursor=ordered.at(-1)||null;$('more').hidden=!hasMore;
 if(!entries.length)return;
 const latest=el('section',undefined,$('events'));latest.className='ac-latest';el('h3','Última atividade registada',latest);const first=entries[0];event(latest,first.e,first.savedAt).open=true;
 if(entries.length>1){const older=el('details',undefined,$('events'));older.className='ac-older';older.open=keepOpen;el('summary','Atividade anterior · '+(entries.length-1)+' registos carregados',older);const body=el('div',undefined,older);body.className='ac-older-body';entries.slice(1).forEach(item=>event(body,item.e,item.savedAt));}
}
function watchActivity(){
 unsubActivity?.();const token=++activityGeneration,g=generation;batches.clear();cursor=null;firstBatch=true;hasMore=false;busy=false;$('events').replaceChildren();$('more').hidden=true;$('audit-status').textContent='A carregar atividade…';
 unsubActivity=onSnapshot(query(collection(db,'users',IAN,'activity'),orderBy('revision','desc'),limit(20)),{includeMetadataChanges:true},snap=>{
  if(g!==generation||token!==activityGeneration)return;
  snap.docs.forEach(d=>batches.set(d.id,d));if(firstBatch){hasMore=snap.size===20;firstBatch=false;}
  renderActivity();$('audit-status').textContent=snap.metadata.fromCache?'Histórico em cache; a aguardar confirmação do servidor.':batches.size?'Atualização automática ativa. A última atividade aparece em destaque.':'Ainda sem atividade detalhada registada.';
 },error=>{if(g===generation&&token===activityGeneration)$('audit-status').textContent='Não foi possível atualizar a atividade: '+error.message;});
}
async function loadMore(){
 if(busy||!cursor||!hasMore)return;busy=true;const g=generation,token=activityGeneration,after=cursor;$('more').disabled=true;
 try{const snap=await getDocs(query(collection(db,'users',IAN,'activity'),orderBy('revision','desc'),startAfter(after),limit(20)));if(g!==generation||token!==activityGeneration)return;snap.docs.forEach(d=>batches.set(d.id,d));hasMore=snap.size===20;renderActivity();}catch(error){if(g===generation&&token===activityGeneration)$('audit-status').textContent='Não foi possível carregar registos anteriores: '+error.message;}finally{if(token===activityGeneration){busy=false;$('more').disabled=false;}}
}
$('refresh').onclick=()=>watchActivity();$('more').onclick=()=>loadMore();
let printState=[];$('print').onclick=()=>{printState=[...document.querySelectorAll('details')].map(d=>[d,d.open]);printState.forEach(([d])=>d.open=true);window.print();};window.addEventListener('afterprint',()=>{printState.forEach(([d,open])=>{if(d.isConnected)d.open=open;});printState=[];});
$('logout').onclick=async()=>{try{await signOut(auth);location.replace('./login.html');}catch{$('status').textContent='Não foi possível terminar a sessão.';}};
onAuthStateChanged(auth,user=>{
 generation++;activityGeneration++;unsub?.();unsub=null;unsubActivity?.();unsubActivity=null;batches.clear();cursor=null;busy=false;$('more').disabled=false;$('report').replaceChildren();$('events').replaceChildren();$('report').hidden=true;$('audit').hidden=true;$('print').hidden=true;$('logout').hidden=!user;
 if(!user){location.replace('./login.html');return;}if(user.uid!==SUPERVISOR){$('status').textContent='Área reservada à conta de acompanhamento.';return;}
 $('audit').hidden=false;watchActivity();const g=generation;
 unsub=onSnapshot(doc(db,'users',IAN,'progresso','portal'),{includeMetadataChanges:true},snap=>{if(g!==generation)return;if(!snap.exists()){$('report').replaceChildren();$('report').hidden=true;$('print').hidden=true;$('status').textContent='Sem progresso disponível.';return;}try{render(snap.data());$('status').textContent=snap.metadata.fromCache?'Dados em cache; aguarda confirmação do servidor.':'Progresso confirmado pelo servidor. Apenas leitura.';}catch(error){$('report').replaceChildren();$('print').hidden=true;$('status').textContent=error.message;}},error=>{if(g!==generation)return;$('report').replaceChildren();$('print').hidden=true;$('status').textContent='Não foi possível ler o progresso: '+error.message;});
});
