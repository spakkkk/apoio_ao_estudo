import {getStudySummary} from "./portal-ui.js";
const ROOT=new URL("../",import.meta.url);
const create=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const text=(n,value)=>{if(n&&n.textContent!==String(value))n.textContent=value;};
export function todayISO(now=new Date()){return now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0")+"-"+String(now.getDate()).padStart(2,"0");}
const dateValue=value=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(value||""))return NaN;const n=Date.parse(value+"T00:00:00Z");return Number.isFinite(n)&&new Date(n).toISOString().slice(0,10)===value?n:NaN;};
export function statusText(item,today){if(item.done)return "Concluido!";const days=(dateValue(item.event.date)-dateValue(today))/86400000;return !Number.isFinite(days)?"Data a definir":days===0?"É hoje!":days>0?"Faltam "+days+" dias":"Avaliação por concluir";}
export function dashboardModel(data,state,today){
 const checks=state.topicChecks||{},all=[];
 for(const subject of data.subjects||[])for(const event of subject.events||[])all.push({subject,event,key:subject.id+"/"+event.id,done:checks["assessment:"+subject.id+"/"+event.id]===true});
 all.sort((a,b)=>(a.event.date||"9999").localeCompare(b.event.date||"9999")||a.key.localeCompare(b.key));
 const pending=all.filter(item=>!item.done),next=pending.find(item=>Number.isFinite(dateValue(item.event.date))&&item.event.date>=today)||pending[0]||null;
 let sections=0,quizzes=0,sectionTotal=0,quizTotal=0;
 for(const item of all){const summary=getStudySummary(data,state,item.subject,item.event);if(!summary)continue;sectionTotal+=summary.total;quizTotal+=summary.quizTotal;if(!item.done){sections+=Math.max(0,summary.total-summary.read);quizzes+=Math.max(0,summary.quizTotal-summary.quizzes);}}
 return {all,pending,next,sections,quizzes,sectionTotal,quizTotal};
}
const humanDate=value=>Number.isFinite(dateValue(value))?new Date(value+"T12:00:00").toLocaleDateString("pt-PT"):"Data a definir";
export function enhanceDashboard(api){
 if(!document.getElementById("pa-dashboard-css")){const link=create("link");link.id="pa-dashboard-css";link.rel="stylesheet";link.href=new URL("dashboard.css",import.meta.url).href;document.head.append(link);}
 let queued=false,month=null,selected=null;
 const schedule=()=>{if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;render();});}};
 const oldQueue=api.queue;api.queue=value=>{oldQueue.call(api,value);schedule();};
 function render(){
  const motto=document.querySelector(".sidefoot p");if(motto&&!motto.querySelector(".pa-motto")){motto.replaceChildren(document.createTextNode("Compreender. Praticar."),create("br"),create("strong","pa-motto","PONTAPÉ NA PORTA!!"));}
  if(document.body.dataset.page!=="home")return;
  const view=document.getElementById("view"),data=window.PORTAL_DATA;if(!view||!data||typeof api.getTopicChecks!=="function")return;
  let state;try{state=JSON.parse(localStorage.getItem(api.key)||"{}");}catch{return;}
  const today=todayISO(),model=dashboardModel(data,state,today);
  for(const panel of view.querySelectorAll(".right-col .panel"))if(panel.querySelector("h3")?.textContent.trim()==="Pequenos passos")panel.remove();
  const stats=view.querySelectorAll(".stats .stat"),completedSections=Math.max(0,model.sectionTotal-model.sections),completedQuizzes=Math.max(0,model.quizTotal-model.quizzes);text(stats[1]?.querySelector("strong"),completedSections+"/"+model.sectionTotal);text(stats[1]?.querySelector("small"),"Secções Concluídas - Faltam concluir "+model.sections);text(stats[2]?.querySelector("strong"),completedQuizzes+"/"+model.quizTotal);text(stats[2]?.querySelector("small"),"Quizzes Concluídos - Faltam concluir "+model.quizzes);
  hero(view.querySelector(".hero"),model,today);
  const panel=[...view.querySelectorAll(".right-col .panel")].find(n=>n.querySelector(".calendar")||n.classList.contains("pa-agenda"));if(panel)calendar(panel,model,today);
  const resume=view.querySelector(".pa-resume");if(resume){const href=resume.querySelector("a")?.href,item=model.all.find(x=>href&&href.startsWith(new URL(x.event.path,ROOT).href.replace(/[^/]*$/,"")));const hide=!!item?.done;if(resume.hidden!==hide)resume.hidden=hide;}
 }
 function hero(box,model,today){
  if(!box)return;const item=model.next,signature=JSON.stringify([item?.key,item?.event,item?.subject.name,today,model.pending.length]);if(box.dataset.dashboardSignature===signature)return;box.dataset.dashboardSignature=signature;
  box.classList.toggle("pa-dashboard-complete",!item);const copy=create("div","hero-copy");
  if(!item){copy.append(create("span","eyebrow","Avaliações"),create("h2","","Sem avaliações por concluir"),create("p","","Os materiais e os resultados continuam disponíveis."));const link=create("a","btn lime","Ver disciplinas");link.href="#disciplinas";const actions=create("div","actions");actions.append(link);copy.append(actions);box.replaceChildren(copy,create("span","pa-completed-stamp","Concluido"));return;}
  const event=item.event,valid=Number.isFinite(dateValue(event.date)),date=valid?new Date(event.date+"T12:00:00"):null;
  copy.append(create("span","eyebrow",item.subject.name+" · "+event.type+" · "+humanDate(event.date)),create("h2","",event.title),create("p","",statusText(item,today)+". Consulta os materiais e prepara o teu próximo desafio."));
  const actions=create("div","actions"),study=create("a","btn lime","Vamos estudar");study.href=new URL(event.path,ROOT).href;actions.append(study);
  const pdf=event.pdfPath||(item.key==="geografia-a/prova-comum-2026-11-13"?event.path.replace(/[^/]*$/,"guia-geografia.pdf"):null);
  if(pdf){const link=create("a","btn ghost","Descarregar guia PDF");link.href=new URL(pdf,ROOT).href;link.setAttribute("download","");actions.append(link);}copy.append(actions);
  const art=create("div","hero-art"),card=create("div","art-card"),number=create("div","num",date?date.getDate():"—");art.setAttribute("aria-hidden","true");if(date){const week=create("span","pa-hero-week"," / "+date.toLocaleDateString("pt-PT",{weekday:"short"}));number.append(week);}
  card.append(create("span","eyebrow",date?date.toLocaleDateString("pt-PT",{month:"long",year:"numeric"}):"Data a definir"),number,create("small","",item.subject.name+" · "+event.type),create("div","line"),create("div","line short"));art.append(create("div","orb"),card);box.replaceChildren(copy,art);
 }
 function calendar(panel,model,today){
  if(!selected)selected=model.all.some(x=>x.event.date===today)?today:model.next?.event.date||model.all.filter(x=>Number.isFinite(dateValue(x.event.date))).at(-1)?.event.date||today;
  if(!Number.isFinite(dateValue(selected)))selected=today;if(!month)month=selected.slice(0,7);
  const signature=JSON.stringify([month,selected,today,model.all.map(x=>[x.key,x.event.date,x.event.type,x.event.title,x.event.path,x.subject.name,x.done,x.event.minutes])]);if(panel.dataset.calendarSignature===signature)return;panel.dataset.calendarSignature=signature;panel.classList.add("pa-agenda");
  const [year,m]=month.split("-").map(Number),first=new Date(year,m-1,1,12),count=new Date(year,m,0,12).getDate(),head=create("div","calendar-head"),nav=create("div","pa-month-nav");
  const label=first.toLocaleDateString("pt-PT",{month:"long",year:"numeric"});head.append(create("strong","",label.charAt(0).toUpperCase()+label.slice(1)));
  for(const [delta,label,mark] of [[-1,"Mês anterior","‹"],[1,"Mês seguinte","›"]]){const button=create("button","pa-month-button",mark);button.type="button";button.setAttribute("aria-label",label);button.onclick=()=>{month=todayISO(new Date(year,m-1+delta,1,12)).slice(0,7);selected=month+"-01";schedule();};nav.append(button);}head.append(nav);
  const grid=create("div","calendar pa-calendar");grid.setAttribute("role","group");grid.setAttribute("aria-label","Selecionar uma data");
  for(const day of ["S","T","Q","Q","S","S","D"]){const cell=create("span","weekday",day);cell.setAttribute("aria-hidden","true");grid.append(cell);}
  for(let i=0;i<(first.getDay()+6)%7;i++){const cell=create("span");cell.setAttribute("aria-hidden","true");grid.append(cell);}
  for(let day=1;day<=count;day++){const iso=month+"-"+String(day).padStart(2,"0"),events=model.all.filter(x=>x.event.date===iso),button=create("button","pa-calendar-day",day);button.type="button";
   if(events.length){button.classList.add("event");if(events.every(x=>x.done))button.classList.add("pa-date-done");}if(iso===today){button.classList.add("today");button.setAttribute("aria-current","date");}button.setAttribute("aria-pressed",String(iso===selected));button.setAttribute("aria-label",humanDate(iso)+(events.length?" · "+events.length+" avaliação(ões), "+events.filter(x=>x.done).length+" concluída(s)":" · sem avaliações"));button.onclick=()=>{selected=iso;schedule();};grid.append(button);
  }
  const details=create("section","pa-date-details");details.setAttribute("aria-label","Avaliações de "+humanDate(selected));details.append(create("h3","",humanDate(selected)));
  const events=model.all.filter(x=>x.event.date===selected);if(!events.length)details.append(create("p","muted","Sem avaliações nesta data."));
  for(const item of events){const date=new Date(selected+"T12:00:00"),row=create("a","event-row"),tile=create("span","date-tile"),copy=create("span"),status=create("p",item.done?"pa-calendar-completed":"",statusText(item,today));row.href=new URL(item.event.path,ROOT).href;tile.append(create("strong","",date.getDate()),create("small","",date.toLocaleDateString("pt-PT",{month:"short"})));
   const minutes=item.event.minutes||(item.key==="geografia-a/prova-comum-2026-11-13"?100:null);copy.append(create("h4","",item.event.type+" · "+item.subject.name),create("p","",item.event.title),status,create("p","",date.toLocaleDateString("pt-PT",{weekday:"long"})+(minutes?" · "+minutes+" minutos":"")));row.append(tile,copy);details.append(row);}
  panel.replaceChildren(head,grid,details);
 }
 const observer=new MutationObserver(schedule);observer.observe(document.body,{childList:true,subtree:true});window.addEventListener("ian-study-ready",schedule);document.addEventListener("visibilitychange",schedule);setInterval(schedule,60000);schedule();
}
