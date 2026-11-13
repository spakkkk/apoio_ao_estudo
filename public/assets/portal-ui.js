const ROOT=new URL("../",import.meta.url);
const CURRENT="geografia-a/prova-comum-2026-11-13";
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
export function getStudySummary(data,state,subject,event){
 const current=subject.id+"/"+event.id===CURRENT;
 const lessons=Array.isArray(event.lessonIds)?event.lessonIds:current?(data.lessons||[]).map(l=>l.id):null;
 const quizzes=Array.isArray(event.quizIds)?event.quizIds:current?(data.quizzes||[]).map(q=>q.id):null;
 if(!lessons||!quizzes)return null;
 const read=new Set(state.read||[]),done=new Set((state.history||[]).map(r=>r.quizId));
 return {read:lessons.filter(id=>read.has(id)).length,total:lessons.length,quizzes:quizzes.filter(id=>done.has(id)).length,quizTotal:quizzes.length};
}
export function findResume(data,state){
 const options=[];
 for(const subject of data.subjects||[])for(const event of subject.events||[]){
  const current=subject.id+"/"+event.id===CURRENT;
  const ids=Array.isArray(event.quizIds)?event.quizIds:current?(data.quizzes||[]).map(q=>q.id):[];
  for(const q of data.quizzes||[]){const d=state.drafts?.[q.id];if(!ids.includes(q.id)||!d||!q.questions?.length)continue;
   const index=Math.max(0,Math.min(q.questions.length-1,Number(d.index)||0));
   options.push({title:q.title,index,total:q.questions.length,start:Number(d.start)||0,path:event.path.replace(/[^/]*$/,"quiz-"+q.id+".html")});
  }
 }
 return options.sort((a,b)=>b.start-a.start)[0]||null;
}
export function createAccountBar(){
 if(!document.getElementById("pa-portal-ui-css")){const link=el("link");link.id="pa-portal-ui-css";link.rel="stylesheet";link.href=new URL("portal-ui.css",import.meta.url).href;document.head.append(link);}
 const bar=el("section","pa-account");bar.hidden=true;bar.setAttribute("aria-label","Conta e gravação do estudo");
 const status=el("span","pa-account-status");status.setAttribute("role","status");status.setAttribute("aria-live","polite");status.setAttribute("aria-atomic","true");
 const actions=el("div","pa-account-actions"),menu=el("details","pa-options"),summary=el("summary","btn pa-options-toggle","Opções"),items=el("div","pa-options-items");
 menu.append(summary,items);actions.append(menu);bar.append(status,actions);let retry;
 const button=(text,action)=>{const b=el("button","btn pa-account-button",text);b.type="button";b.onclick=async()=>{menu.open=false;await action();};if(text==="Tentar guardar"){b.textContent="Tentar novamente";b.classList.add("pa-retry");b.hidden=true;retry=b;bar.insertBefore(b,actions);}else if(text==="Exportar cópia"){b.classList.add("pa-export");items.append(b);}else{b.classList.add("pa-signout");actions.append(b);}return b;};
 const message=text=>{const error=/^(Não |Conflito|Dados |Outra janela)/.test(text),busy=/^(A guardar|A carregar|Alterações)/.test(text);bar.dataset.state=error?"error":busy?"busy":"saved";status.textContent=/^(Guardado na conta|Progresso carregado)/.test(text)?"Tudo guardado":text;if(retry)retry.hidden=!error;};
 document.addEventListener("click",e=>{if(!menu.contains(e.target))menu.open=false;});
 document.addEventListener("keydown",e=>{if(e.key==="Escape"&&menu.open){menu.open=false;summary.focus();}});
 return {bar,message,button};
}
export function enhancePortal(api,bar){
 let scheduled=false;
 const state=()=>{try{return JSON.parse(localStorage.getItem(api.key)||"{}");}catch{return {};}};
 const schedule=()=>{if(!scheduled){scheduled=true;requestAnimationFrame(()=>{scheduled=false;render();});}};
 const baseQueue=api.queue;api.queue=value=>{baseQueue(value);schedule();};
 function render(){
  const header=document.querySelector(".topbar");if(header&&bar.parentElement!==header){header.append(bar);bar.hidden=false;document.body.classList.add("pa-ui-ready");}
  const data=window.PORTAL_DATA;if(!data||typeof api.getTopicChecks!=="function")return;
  const view=document.getElementById("view");if(!view)return;
  if(document.body.dataset.page==="subject")subjectView(view,data);
  if(document.body.dataset.page==="home")homeView(view,data);
 }
 function subjectView(view,data){
  const subject=(data.subjects||[]).find(s=>s.id===document.body.dataset.subject);if(!subject?.events?.length)return;
  const cards=[...view.querySelectorAll("article.panel")];if(!cards.length)return;
  let filter=view.querySelector(".pa-status-filter");
  if(!filter){filter=el("div","pa-status-filter");const label=el("label","pa-filter-label","Filtro de Status"),select=el("select","pa-filter-select");select.id="pa-status-select";label.htmlFor=select.id;
   for(const [value,text] of [["all","Todas"],["pending","Por concluir"],["done","Concluídas"]]){const option=el("option","",text);option.value=value;select.append(option);}
   filter.append(label,select);cards[0].before(filter);select.onchange=schedule;
   const empty=el("p","pa-filter-empty","Nenhuma avaliação com este status.");empty.hidden=true;filter.after(empty);
  }
  const selected=filter.querySelector("select").value,checks=api.getTopicChecks()||{};let visible=0;
  for(const card of cards){
   const link=card.querySelector("a[href]"),event=subject.events.find(e=>link&&new URL(e.path,ROOT).href===link.href);if(!event)continue;
   const key="assessment:"+subject.id+"/"+event.id,done=checks[key]===true;
   if(!card.dataset.paAssessment){
    card.dataset.paAssessment="1";const pill=card.querySelector(".pill"),head=el("div","pa-assessment-head"),label=el("label","pa-completion"),input=el("input"),text=el("span","pa-completion-text");input.type="checkbox";input.setAttribute("aria-label","Concluída: "+event.title);label.append(input,text);if(pill){pill.before(head);head.append(pill);}else card.prepend(head);head.append(label);
    input.onchange=async()=>{input.disabled=true;const next={...(api.getTopicChecks()||{})};if(input.checked)next[key]=true;else delete next[key];try{api.setTopicChecks(next);schedule();await api.flush();}catch(error){alert("A marcação ainda não foi confirmada na conta. Usa Tentar novamente ou exporta uma cópia. "+error.message);}finally{input.disabled=false;schedule();}};
    const preparation=el("div","pa-preparation");preparation.append(el("p","pa-preparation-text"),el("progress","pa-preparation-progress"));const title=card.querySelector("h2");if(title)title.after(preparation);else card.append(preparation);
   }
   const input=card.querySelector(".pa-completion input"),text=card.querySelector(".pa-completion-text");if(input.checked!==done)input.checked=done;if(text.textContent!==(done?"Concluída":"Marcar como concluída"))text.textContent=done?"Concluída":"Marcar como concluída";card.classList.toggle("pa-assessment-done",done);
   const preparation=card.querySelector(".pa-preparation"),summary=getStudySummary(data,state(),subject,event);preparation.hidden=!summary;
   if(summary){const copy=summary.read+" de "+summary.total+" secções revistas · "+summary.quizzes+" de "+summary.quizTotal+" quizzes realizados",p=preparation.querySelector("p"),progress=preparation.querySelector("progress");if(p.textContent!==copy)p.textContent=copy;if(progress.max!==Math.max(1,summary.total))progress.max=Math.max(1,summary.total);if(progress.value!==summary.read)progress.value=summary.read;progress.setAttribute("aria-label","Secções revistas: "+summary.read+" de "+summary.total);}
   const hidden=selected!=="all"&&(selected==="done"?!done:done);if(card.hidden!==hidden)card.hidden=hidden;if(!hidden)visible++;
  }
  const empty=view.querySelector(".pa-filter-empty");if(empty.hidden!==(visible>0))empty.hidden=visible>0;
 }
 function homeView(view,data){
  const resume=findResume(data,state());let card=view.querySelector(".pa-resume");if(!resume){if(card)card.remove();return;}
  if(!card){card=el("section","pa-resume");const copy=el("div","pa-resume-copy");copy.append(el("span","eyebrow","Continuar de onde fiquei"),el("h2"),el("p","muted"));const link=el("a","btn primary","Continuar quiz");card.append(copy,link);const stats=view.querySelector(".stats");if(stats)stats.after(card);else view.prepend(card);}
  const title=card.querySelector("h2"),p=card.querySelector("p"),link=card.querySelector("a"),detail="Pergunta "+(resume.index+1)+" de "+resume.total+" · retoma o teu rascunho";if(title.textContent!==resume.title)title.textContent=resume.title;if(p.textContent!==detail)p.textContent=detail;const href=new URL(resume.path,ROOT).href;if(link.href!==href)link.href=href;
 }
 const observer=new MutationObserver(schedule);observer.observe(document.body,{childList:true,subtree:true});window.addEventListener("ian-study-ready",schedule);schedule();
}
