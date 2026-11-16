import {initializeApp,getApps,getApp} from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js';
import {getAuth,onAuthStateChanged,signOut} from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js';
import {getFirestore,doc,onSnapshot} from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js';
const config={apiKey:'AIzaSyC7qmpQmNAA1Y5WDmtKvamS1k4k7qcELNI',authDomain:'apoio-ao-estudo.firebaseapp.com',projectId:'apoio-ao-estudo',storageBucket:'apoio-ao-estudo.firebasestorage.app',messagingSenderId:'740789054680',appId:'1:740789054680:web:c068304d0b8bbcf96a3bad'};
const SUPERVISOR='6X1jNaIZgMNO6CgkMXndkAHiB1m1',IAN='e8qdr6yFCXYkZco5QZafsswdRkZ2';
const app=getApps().length?getApp():initializeApp(config),auth=getAuth(app),db=getFirestore(app);
const status=document.getElementById('status'),report=document.getElementById('report'),logout=document.getElementById('logout'),print=document.getElementById('print');
let unsubscribe=null;
function el(tag,text,parent){const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);if(parent)parent.append(n);return n;}
function plain(value){const d=new DOMParser().parseFromString(String(value??''),'text/html');return d.body.textContent||'';}
function date(value){const d=value?.toDate?value.toDate():new Date(value);return Number.isFinite(d.getTime())?d.toLocaleString('pt-PT'):'Data indisponível';}
function panel(title){const p=el('section',undefined,report);p.className='panel';el('h2',title,p);return p;}
function list(parent,items,empty){if(!items.length){el('p',empty,parent);return;}const ul=el('ul',undefined,parent);items.forEach(x=>el('li',x,ul));}
function valueText(value){if(value===null||value===undefined||value==='')return 'Sem resposta';return typeof value==='object'?JSON.stringify(value,null,2):String(value);}
function answer(q,value){if(value===undefined||value===null||String(value).trim()==='')return 'Sem resposta';if(q?.t==='mc')return plain(q.o?.[Number(value)]??value);if(q?.t==='tf')return String(value)==='true'?'Verdadeiro':'Falso';return valueText(value);}
function render(data){
 const s=typeof data.state==='string'?JSON.parse(data.state):data.state;
 if(!s||!Array.isArray(s.read)||!Array.isArray(s.plan)||!Array.isArray(s.history)||!s.drafts||typeof s.drafts!=='object'||Array.isArray(s.drafts))throw Error('Formato do progresso não reconhecido.');
 report.replaceChildren();report.hidden=false;print.hidden=false;
 const meta=panel('Dados guardados na conta');
 el('p','Última gravação do progresso: '+(data.updatedAt?date(data.updatedAt):'Data indisponível'),meta);
 el('p','Esta data indica uma gravação, não o último login nem tempo efetivo de estudo. A consulta atualiza-se enquanto esta página estiver aberta.',meta);
 const stats=el('div',undefined,report);stats.className='stats';
 for(const [label,value] of [['Secções assinaladas',s.read.length],['Tarefas concluídas',s.plan.length],['Tentativas disponíveis',s.history.length],['Quizzes em curso',Object.keys(s.drafts).length]]){const p=el('div',undefined,stats);p.className='stat';el('strong',value,p);el('span',label,p);}
 const lessons=window.PORTAL_DATA?.lessons||[],quizzes=window.PORTAL_DATA?.quizzes||[];
 const progress=panel('Progresso atual');
 el('h3','Secções revistas',progress);
 list(progress,s.read.map(id=>{const l=lessons.find(x=>x.id===id);return l?plain(l.title)+' ('+id+')':String(id);}), 'Nenhuma secção assinalada nesta lista.');
 el('h3','Tarefas concluídas',progress);
 const plans={ler:'Rever o guia',treinar:'Fazer um quiz',corrigir:'Voltar aos erros'};
 list(progress,s.plan.map(id=>plans[id]||String(id)),'Nenhuma tarefa assinalada.');
 const checks=s.topicChecks;
 if(checks&&typeof checks==='object'){el('h3','Registos adicionais de matéria',progress);el('p','Chaves e valores tal como guardados pelo portal; os identificadores não são datas de estudo.',progress);const pre=el('pre',JSON.stringify(checks,null,2),progress);pre.className='answer';}
 const drafts=panel('Quizzes em curso');
 const entries=Object.entries(s.drafts);
 if(!entries.length)el('p','Não existem rascunhos guardados.',drafts);
 for(const [id,d] of entries){const q=quizzes.find(x=>x.id===id),details=el('details',undefined,drafts);el('summary',q?plain(q.title):'Quiz '+id,details);el('p','Início registado: '+(d?.start?date(d.start):'Indisponível'),details);el('p','Respostas preenchidas: '+Object.values(d?.answers||{}).filter(x=>String(x??'').trim()).length,details);el('p','Um rascunho guardado não significa que o Ian esteja online neste momento.',details);}
 const history=panel('Histórico de resultados');
 el('p','Mostra as tentativas ainda presentes no progresso guardado. Não representa um histórico de todos os cliques ou alterações de matéria.',history);
 if(!s.history.length)el('p','Ainda não existem tentativas guardadas.',history);
 const ordered=[...s.history].sort((a,b)=>(Date.parse(b.at)||0)-(Date.parse(a.at)||0));
 for(const r of ordered){
 const details=el('details',undefined,history),q=quizzes.find(x=>x.id===r.quizId);
 const score=Number(r.score),max=Number(r.max),valid=Number.isFinite(score)&&Number.isFinite(max)&&max>0;
 el('summary',plain(r.title||r.quizId||'Quiz')+' · '+date(r.at)+' · '+(valid?score+'/'+max+' ('+Math.round(score/max*100)+'%)':'Pontuação indisponível'),details);
 const elapsed=Number(r.elapsed);if(Number.isFinite(elapsed)&&elapsed>=0)el('p','Tempo decorrido da tentativa: '+Math.floor(elapsed/60)+' min '+Math.floor(elapsed%60)+' s. Pode incluir períodos fora da página.',details);
 if(Number(r.manual)>0)el('p','Avaliação manual prevista: '+r.manual+' pontos. A pontuação automática não é uma classificação final.',details);
 const answers=r.answers&&typeof r.answers==='object'?r.answers:{};
 if(!q)el('p','Enunciados não disponíveis no catálogo desta página. Apresentam-se as respostas guardadas, sem inventar enunciados ou correções.',details);
 const indexes=q?.questions? q.questions.map((_,i)=>String(i)):Object.keys(answers);
 if(!indexes.length)el('p','Sem respostas disponíveis.',details);
 indexes.forEach(index=>{const question=q?.questions?.[Number(index)],item=el('div',undefined,details);item.className='question';el('h3','Pergunta '+(Number.isFinite(Number(index))?Number(index)+1:index),item);if(question)el('p',plain(question.q),item);const p=el('p','Resposta guardada: '+answer(question,answers[index]),item);p.className='answer';if(question?.t==='op'){el('p','Resposta extensa: exige avaliação humana.',item);if(question.m)el('p','Modelo de resposta atual: '+plain(question.m),item);}else if(question&&question.a!==undefined){el('p','Solução do catálogo atual: '+answer(question,question.a)+(question.u?' '+plain(question.u):''),item);if(question.e)el('p',plain(question.e),item);}});
 }
 el('p','Os enunciados e modelos apresentados pertencem ao catálogo atual, não a uma cópia histórica da versão do quiz. Esta página não modifica o progresso.',report);
}
logout.onclick=async()=>{logout.disabled=true;try{await signOut(auth);location.replace('./login.html');}catch{status.textContent='Não foi possível terminar a sessão. Tenta novamente.';logout.disabled=false;}};
print.onclick=()=>window.print();
onAuthStateChanged(auth,user=>{
 if(unsubscribe){unsubscribe();unsubscribe=null;}report.replaceChildren();report.hidden=true;print.hidden=true;logout.hidden=!user;
 if(!user){location.replace('./login.html');return;}
 if(user.uid!==SUPERVISOR){status.textContent='Esta página está reservada à conta de acompanhamento.';const a=el('a',' Voltar ao portal',status);a.href='./index.html';return;}
 status.textContent='A carregar os dados do Ian…';
 unsubscribe=onSnapshot(doc(db,'users',IAN,'progresso','portal'),{includeMetadataChanges:true},snap=>{
 if(!snap.exists()){report.replaceChildren();report.hidden=true;print.hidden=true;status.textContent=snap.metadata.fromCache?'A aguardar confirmação do servidor…':'Ainda não existe progresso guardado para o Ian.';return;}
 try{render(snap.data());status.textContent=snap.metadata.fromCache?'Dados locais em cache; a aguardar confirmação do servidor.':'Dados confirmados pelo servidor. Consulta apenas de leitura.';}catch(error){report.replaceChildren();report.hidden=true;print.hidden=true;status.textContent='Não foi possível interpretar os dados: '+error.message;}
 },error=>{report.replaceChildren();report.hidden=true;print.hidden=true;status.textContent=error.code==='permission-denied'?'Acesso negado. Confirma a conta e as regras publicadas no Firestore.':'Não foi possível carregar os dados. Verifica a ligação e recarrega a página.';});
},()=>{report.replaceChildren();report.hidden=true;print.hidden=true;status.textContent='Não foi possível verificar a sessão. Recarrega a página.';});
