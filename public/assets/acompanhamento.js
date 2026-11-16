import {initializeApp} from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js';
import {getAuth,onAuthStateChanged,signOut} from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js';
import {getFirestore,doc,onSnapshot,collection,query,orderBy,limit,startAfter,getDocs} from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js';
const app=initializeApp({apiKey:'AIzaSyC7qmpQmNAA1Y5WDmtKvamS1k4k7qcELNI',authDomain:'apoio-ao-estudo.firebaseapp.com',projectId:'apoio-ao-estudo',storageBucket:'apoio-ao-estudo.firebasestorage.app',messagingSenderId:'740789054680',appId:'1:740789054680:web:c068304d0b8bbcf96a3bad'}),auth=getAuth(app),db=getFirestore(app),IAN='e8qdr6yFCXYkZco5QZafsswdRkZ2',SUPERVISOR='6X1jNaIZgMNO6CgkMXndkAHiB1m1';
const $=id=>document.getElementById(id);let unsub=null,cursor=null,busy=false,generation=0;
function el(tag,text,parent){const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);parent?.append(n);return n;}
function plain(x){return new DOMParser().parseFromString(String(x??''),'text/html').body.textContent||'';}
function date(x){const d=x?.toDate?x.toDate():new Date(x);return Number.isFinite(d.getTime())?d.toLocaleString('pt-PT'):'Data indisponível';}
const data=subject=>subject==='filosofia'?window.FILOSOFIA_DATA:window.PORTAL_DATA;
const subjectName=s=>s==='filosofia'?'Filosofia':s==='geografia'?'Geografia A':'Portal';
const quiz=(subject,id)=>data(subject)?.quizzes?.find(q=>q.id===id);
function label(subject,id){
 if(String(id).startsWith('assessment:')){
  const path=id.slice(11),[sid,eid]=path.split('/');
  const s=window.PORTAL_DATA?.subjects?.find(s=>s.id===sid),e=s?.events?.find(e=>e.id===eid);
  return (s?.name||sid)+' — '+(e?.title||eid);
 }
 const d=data(subject),l=d?.lessons?.find(l=>l.id===id);if(l)return plain(l.title);
 if(subject==='filosofia'&&String(id).includes(':')){const [lesson,n]=id.split(':'),l=d?.lessons?.find(l=>l.id===lesson);if(l)return plain(l.title)+' — '+plain(l.points?.[Number(n)]||id);}
 if(subject==='geografia'){
  const m=String(id).match(/^(.*)-(\d+)$/),l=m&&d?.lessons?.find(l=>l.id===m[1]);if(l)return plain(l.title)+' — '+plain(l.points?.[Number(m[2])]||id);
 }
 return ({ler:'Rever o guia',treinar:'Fazer um quiz',corrigir:'Voltar aos erros'})[id]||quiz(subject,id)?.title||String(id);
}
function answer(q,a){if(a===null||a===undefined||String(a).trim()==='')return 'Sem resposta';if(q?.t==='mc')return plain(q.o?.[Number(a)]??a);if(q?.t==='tf')return String(a)==='true'?'Verdadeiro':'Falso';return typeof a==='object'?JSON.stringify(a):String(a);}
function result(parent,r,subject,captured=null){
 const d=el('details',undefined,parent);el('summary',plain(r.title||label(subject,r.quizId))+' · '+date(r.at)+' · '+r.score+'/'+r.max+' automáticos'+(r.practice?' · treino focado':''),d);
 const elapsed=Number(r.elapsed);if(Number.isFinite(elapsed))el('p','Tempo decorrido: '+Math.floor(elapsed/60)+' min '+Math.floor(elapsed%60)+' s (pode incluir pausas).',d);
 if(r.manual)el('p',r.manual+' pontos de respostas extensas previstos para avaliação humana. Não é uma nota final.',d);
 const qs=captured||quiz(subject,r.quizId)?.questions||[];
 el('p',captured?'Enunciados preservados no registo desta tentativa.':'Enunciados do catálogo atual; não são uma cópia histórica.',d);
 const order=subject==='filosofia'?(r.order||Object.keys(r.answers||{})):qs.length?qs.map((_,i)=>String(i)):Object.keys(r.answers||{});
 order.forEach((key,i)=>{const q=subject==='filosofia'?qs.find(q=>q.id===key):qs[Number(key)],section=el('div',undefined,d);section.className='question';el('h3','Pergunta '+(i+1),section);el('p',q?plain(q.q):'Enunciado indisponível ('+key+')',section);const a=el('p','Resposta: '+answer(q,r.answers?.[key]),section);a.className='answer';if(q?.t==='op'){if(q.m)el('p','Modelo: '+plain(q.m),section);if(q.pts){const ul=el('ul',undefined,section);q.pts.forEach(p=>el('li',plain(p),ul));}}else if(q){el('p','Solução: '+answer(q,q.a),section);if(q.e)el('p',plain(q.e),section);}});
 return d;
}
function panel(title,parent=$('report')){const p=el('section',undefined,parent);p.className='panel';el('h2',title,p);return p;}
function items(parent,values,empty){if(!values.length){el('p',empty,parent);return;}const ul=el('ul',undefined,parent);values.forEach(v=>el('li',v,ul));}
function render(raw){
 const s=JSON.parse(raw.state);if(!s||!Array.isArray(s.history))throw Error('Formato de progresso inválido.');
 $('report').replaceChildren();$('report').hidden=false;$('print').hidden=false;
 const meta=panel('Estado atual');el('p','Última gravação: '+(raw.updatedAt?date(raw.updatedAt):'Indisponível')+'. Não indica o último login.',meta);
 el('p','As marcações anteriores à ativação do histórico não têm data de ação. Uma avaliação marcada como concluída é uma declaração do utilizador, não prova de que reviu todos os conteúdos.',meta);
 const assessments=Object.entries(s.topicChecks||{}).filter(([k])=>k.startsWith('assessment:'));
 items(meta,assessments.map(([k,v])=>label('geografia',k)+': '+(v?'marcada como concluída':'não marcada como concluída')),'Sem avaliações marcadas como concluídas.');
 for(const [subject,state] of [['geografia',s],['filosofia',s.philosophy20261119||{}]]){
  const p=panel(subjectName(subject));
  el('h3','Etapas revistas',p);items(p,(state.read||[]).map(id=>label(subject,id)),'Nenhuma etapa assinalada.');
  el('h3','Ideias assinaladas como lidas e compreendidas',p);
  const checks=subject==='filosofia'?state.checks||{}:s.topicChecks||{};
  items(p,Object.entries(checks).filter(([k,v])=>v&&!k.startsWith('assessment:')).map(([k])=>label(subject,k)),'Nenhuma ideia assinalada.');
  if(subject==='geografia'){el('h3','Tarefas concluídas',p);items(p,(state.plan||[]).map(id=>label(subject,id)),'Nenhuma tarefa assinalada.');}
  el('h3','Quizzes em curso',p);const drafts=Object.entries(state.drafts||{});if(!drafts.length)el('p','Sem rascunhos.',p);
  for(const [id,draft] of drafts){const details=el('details',undefined,p);el('summary',label(subject,id)+' · início '+date(draft.start),details);el('p','Rascunho guardado; não indica presença online.',details);const q=quiz(subject,id);for(const [key,a] of Object.entries(draft.answers||{})){const question=subject==='filosofia'?q?.questions?.find(x=>x.id===key):q?.questions?.[Number(key)];el('p',(question?plain(question.q):'Pergunta '+key)+' — '+answer(question,a),details);}}
  el('h3','Tentativas no progresso atual',p);const h=state.history||[];if(!h.length)el('p','Sem tentativas guardadas.',p);[...h].sort((a,b)=>(Date.parse(b.at)||0)-(Date.parse(a.at)||0)).forEach(r=>result(p,r,subject));
 }
}
function event(parent,e){
 const d=el('details',undefined,parent),name=e.label||label(e.subject,e.key||'');
 const names={read:(e.value?'Marcou etapa como revista: ':'Desmarcou etapa: ')+name,plan:(e.value?'Concluiu tarefa: ':'Desmarcou tarefa: ')+name,check:(e.value?'Assinalou: ':'Retirou a marcação: ')+name,started:'Iniciou um rascunho: '+name,draftRemoved:'Removeu/substituiu um rascunho: '+name,answer:'Guardou/alterou resposta: '+name,completed:'Concluiu um quiz: '+name,page:'Abriu uma página do portal',coach:'Atualizou exercício de escrita'};
 el('summary',date(e.at)+' · '+subjectName(e.subject)+' · '+(names[e.type]||e.type),d);
 if(e.type==='completed')result(d,e.result,e.subject,e.catalogCaptured?e.questions:null);
 if(e.type==='answer'){
  const q=quiz(e.subject,e.key),question=e.questionSnapshot||(e.subject==='filosofia'?q?.questions?.find(x=>x.id===e.question):q?.questions?.[Number(e.question)]);
  el('p',question?plain(question.q):'Pergunta '+e.question,d);el('p','Resposta guardada: '+answer(question,e.value),d).className='answer';el('small',e.questionSnapshot?'Enunciado e opções preservados com a resposta.':'Enunciado e opções do catálogo atual.',d);
 }
 if(e.page)el('p','Página: '+e.page,d);
}
async function load(reset=false){
 if(busy)return;busy=true;const g=generation;$('more').disabled=true;$('refresh').disabled=true;
 if(reset){cursor=null;$('events').replaceChildren();}
 $('audit-status').textContent='A carregar atividade…';
 try{
  const base=[orderBy('revision','desc'),limit(20)];if(cursor)base.splice(1,0,startAfter(cursor));
  const snap=await getDocs(query(collection(db,'users',IAN,'activity'),...base));
  if(g!==generation)return;
  for(const doc of snap.docs){const b=doc.data(),box=el('section',undefined,$('events'));el('h3','Gravação confirmada: '+date(b.savedAt)+' · revisão '+b.revision,box);[...(b.events||[])].reverse().forEach(e=>event(box,e));}
  cursor=snap.docs.at(-1)||cursor;$('more').hidden=snap.size<20;
  $('audit-status').textContent=$('events').children.length?'Atividade carregada. Usa Atualizar atividade para obter novos registos.':'Ainda sem atividade detalhada. O Ian precisa de abrir a versão atualizada do portal e guardar novas ações.';
 }catch(error){if(g===generation)$('audit-status').textContent='Não foi possível carregar o histórico: '+error.message;}
 finally{busy=false;$('more').disabled=false;$('refresh').disabled=false;}
}
$('refresh').onclick=()=>load(true);$('more').onclick=()=>load();$('print').onclick=()=>{document.querySelectorAll('details').forEach(d=>d.open=true);window.print();};
$('logout').onclick=async()=>{try{await signOut(auth);location.replace('./login.html');}catch{$('status').textContent='Não foi possível terminar a sessão.';}};
onAuthStateChanged(auth,user=>{
 generation++;unsub?.();unsub=null;$('report').replaceChildren();$('events').replaceChildren();$('report').hidden=true;$('audit').hidden=true;$('print').hidden=true;$('logout').hidden=!user;
 if(!user){location.replace('./login.html');return;}
 if(user.uid!==SUPERVISOR){$('status').textContent='Área reservada à conta de acompanhamento.';return;}
 $('audit').hidden=false;cursor=null;load(true);
 unsub=onSnapshot(doc(db,'users',IAN,'progresso','portal'),{includeMetadataChanges:true},snap=>{
  if(!snap.exists()){$('report').replaceChildren();$('report').hidden=true;$('print').hidden=true;$('status').textContent='Sem progresso disponível.';return;}
  try{render(snap.data());$('status').textContent=snap.metadata.fromCache?'Dados em cache; aguarda confirmação do servidor.':'Progresso confirmado pelo servidor. Apenas leitura.';}catch(error){$('report').replaceChildren();$('print').hidden=true;$('status').textContent=error.message;}
 },error=>{$('report').replaceChildren();$('print').hidden=true;$('status').textContent='Não foi possível ler o progresso: '+error.message;});
});
