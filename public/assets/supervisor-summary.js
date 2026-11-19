import {getApp} from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js';
import {getFirestore,doc,onSnapshot} from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js';
import {dashboardModel,todayISO} from './dashboard.js';
const SUPERVISOR='6X1jNaIZgMNO6CgkMXndkAHiB1m1',IAN='e8qdr6yFCXYkZco5QZafsswdRkZ2';
export function enhanceSupervisorSummary(){
 if(document.body.dataset.page!=='home'||document.body.dataset.ianSummary)return;
 const auth=getAuth(getApp());if(auth.currentUser?.uid!==SUPERVISOR)return;document.body.dataset.ianSummary='1';
 let state=null,status='A carregar o progresso do Ian…',queued=false,stop;
 const make=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 const text=(n,value)=>{if(n.textContent!==String(value))n.textContent=String(value);};
 function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;render();});}
 function render(){
  const stats=document.querySelector('.stats');if(!stats)return;
  const original=[...stats.querySelectorAll('.stat:not(.pa-ian-stat)')];if(original.length<3)return;
  original[1].hidden=true;original[2].hidden=true;
  for(const kind of ['sections','quizzes'])if(!stats.querySelector('[data-ian-stat="'+kind+'"]')){const card=make('div','stat pa-ian-stat'),icon=make('span','stat-icon',kind==='sections'?'▤':'◇'),copy=make('div');icon.setAttribute('aria-hidden','true');card.dataset.ianStat=kind;copy.append(make('strong','','—'),make('small'),make('small','pa-ian-source'));card.append(icon,copy);stats.append(card);}
  const model=state&&window.PORTAL_DATA?dashboardModel(window.PORTAL_DATA,state,todayISO()):null;
  for(const [kind,total,left,label] of [['sections',model?.sectionTotal,model?.sections,'Secções do Ian concluídas'],['quizzes',model?.quizTotal,model?.quizzes,'Quizzes do Ian concluídos']]){const card=stats.querySelector('[data-ian-stat="'+kind+'"]');card.setAttribute('aria-busy',String(!model));text(card.querySelector('strong'),model?Math.max(0,total-left)+'/'+total:'—');text(card.querySelector('small'),label+(model?' · Faltam concluir '+left:''));text(card.querySelector('.pa-ian-source'),status);}
 }
 const observer=new MutationObserver(schedule);observer.observe(document.body,{childList:true,subtree:true});window.addEventListener('ian-study-ready',schedule);schedule();
 stop=onSnapshot(doc(getFirestore(getApp()),'users',IAN,'progresso','portal'),{includeMetadataChanges:true},snap=>{
  if(auth.currentUser?.uid!==SUPERVISOR)return;
  try{if(!snap.exists())throw Error('Sem progresso do Ian disponível.');const raw=snap.data().state,parsed=typeof raw==='string'?JSON.parse(raw):raw;if(!parsed||!Array.isArray(parsed.history)||!Array.isArray(parsed.read))throw Error('Formato de progresso do Ian inválido.');state=parsed;status=snap.metadata.fromCache?'Ian · dados em cache; a confirmar no servidor.':'Ian · progresso confirmado pelo servidor.';}catch(e){state=null;status=e.message;}schedule();
 },()=>{state=null;status='Não foi possível ler o progresso do Ian. Consulta o acompanhamento.';schedule();});
 const off=onAuthStateChanged(auth,user=>{if(user?.uid===SUPERVISOR)return;stop?.();off();state=null;status='Sessão de acompanhamento terminada.';schedule();});
}
