(()=>{'use strict';const ROOT=new URL('../',document.currentScript.src);let pending=false;
const text=(n,t)=>{if(n&&n.textContent!==t)n.textContent=t;};
function render(){pending=false;const view=document.getElementById('view');if(!view)return;
 // The shared dashboard is the only owner of the hero, counters and calendar.
 for(const node of view.querySelectorAll('[data-fi-hero],[data-fi-event]'))node.remove();
 for(const node of view.querySelectorAll('[data-fi-previous]')){node.hidden=false;node.style.removeProperty('display');delete node.dataset.fiPrevious;}
 if(document.body.dataset.page==='home'){
  const greeting=[...view.querySelectorAll('.welcome p')].find(p=>p.textContent.includes('Um pouco de foco hoje'));
  if(greeting){let note=view.querySelector('.pa-ian-motivation');if(!note){note=document.createElement('p');note.className='pa-ian-motivation';note.style.cssText='margin-top:10px;max-width:760px;font-size:13px;line-height:1.7;color:#294737;font-weight:600';greeting.after(note);}text(note,'Sacrifica umas horas do teu presente para teres um futuro melhor e promissor! És capaz de tudo!');}
 }
 const data=window.PORTAL_DATA;if(data){for(const subject of data.subjects||[]){const card=[...view.querySelectorAll('a.subject')].find(a=>a.href===new URL('disciplinas/'+subject.id+'/index.html',ROOT).href);if(!card)continue;const events=subject.events||[];if(events.length&&subject.id==='filosofia'){text(card.querySelector('.subject-bottom span'),events.length+' '+(events.length===1?'avaliação':'avaliações')+' · PDF e 3 quizzes');text(card.querySelector('.subject-bottom span:last-child'),'Atualizado 16/11/2026');}}}
 // Keep one route to the separate Philosophy history on the existing results page.
 if(document.body.dataset.page==='results'){
  let panel=view.querySelector('[data-fi-progress]');if(!panel){panel=document.createElement('section');panel.className='panel';panel.dataset.fiProgress='1';const h=document.createElement('h3');h.textContent='Resultados de Filosofia';const p=document.createElement('p');p.className='muted';const a=document.createElement('a');a.className='btn primary';a.href=new URL('disciplinas/filosofia/prova-comum-2026-11-19/index.html#resultados',ROOT).href;a.textContent='Abrir histórico de Filosofia →';panel.append(h,p,a);view.prepend(panel);}
  let s={};try{const k=window.IanCloud?.key;if(k)s=JSON.parse(localStorage.getItem(k)||'{}').philosophy20261119||{};}catch{}const history=s.history||[];text(panel.querySelector('p'),history.filter(r=>!r.practice).length+' tentativas completas e '+history.filter(r=>r.practice).length+' treinos focados. Repetir um quiz não aumenta o total de quizzes diferentes concluídos.');
 }else for(const node of view.querySelectorAll('[data-fi-progress]'))node.remove();
}
function schedule(){if(!pending){pending=true;requestAnimationFrame(render);}}new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});window.addEventListener('ian-study-ready',schedule);window.addEventListener('storage',schedule);schedule();})();