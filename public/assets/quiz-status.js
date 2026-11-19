export function collectRecords(state,previous={}){
 const records=JSON.parse(JSON.stringify(previous));
 for(const [scope,data] of [['root',state],...Object.entries(state).filter(([k,v])=>k!=='quizRecords'&&v&&Array.isArray(v.history)&&v.drafts)]){
  const target=records[scope]||(records[scope]={});
  for(const r of data.history||[]){
   if(r.practice||!r.quizId||!Number.isFinite(r.score)||!Number.isFinite(r.max)||r.max<=0||!Number.isFinite(Date.parse(r.at)))continue;
   const compact={at:r.at,score:r.score,max:r.max,manual:Number(r.manual)||0},entry=target[r.quizId]||(target[r.quizId]={});
   if(!entry.last||Date.parse(r.at)>Date.parse(entry.last.at))entry.last=compact;
   const best=entry.best;if(!best||r.score/r.max>best.score/best.max||(r.score/r.max===best.score/best.max&&Date.parse(r.at)>Date.parse(best.at)))entry.best=compact;
  }
 }
 return records;
}
const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
function install(){
 const api=window.IanCloud;if(!api||api.quizStatusInstalled)return;api.quizStatusInstalled=true;
 const read=()=>{try{return JSON.parse(localStorage.getItem(api.key)||'{}');}catch{return {};}};
 let records=collectRecords(read(),read().quizRecords||{}),latest=null,scheduled=false;
 const oldQueue=api.queue;api.queue=value=>{records=collectRecords(value,{...records,...(value.quizRecords||{})});value.quizRecords=records;latest=value;localStorage.setItem(api.key,JSON.stringify(value));oldQueue(value);schedule();};
 const css=node('style');css.textContent='.pa-quiz-status{margin:16px 0;padding:14px 0;border-top:1px solid var(--line,#ddd);font-size:12px;line-height:1.6}.pa-quiz-status dt{font-weight:650;margin-top:8px}.pa-quiz-status dd{margin:0;color:inherit;opacity:.85}.pa-quiz-progress{width:100%;height:6px;accent-color:var(--green,#2d5ddc)}.pa-quiz-new{margin-top:9px}.quiz-card,.quiz-card-fi{display:flex;flex-direction:column}.quiz-card>.btn,.quiz-card-fi>.actions-fi{margin-top:auto}';document.head.append(css);
 function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;render();});}
 function context(card){const b=card.querySelector('[data-quiz]');if(b){const q=window.FILOSOFIA_DATA?.quizzes?.find(q=>q.id===b.dataset.quiz);if(q)return {q,scope:'philosophy20261119',button:b};}
  const a=card.querySelector('a[href*="quiz-"]');if(!a)return;const name=new URL(a.href).pathname.split('/').pop(),q=window.PORTAL_DATA?.quizzes?.find(q=>name==='quiz-'+q.id+'.html');if(q)return {q,scope:'root',button:a};}
 function render(){const state=read(),all=collectRecords(state,records);records=all;
  for(const card of document.querySelectorAll('.quiz-card,.quiz-card-fi')){
   const c=context(card);if(!c)continue;const {q,scope,button}=c,data=scope==='root'?state:state[scope]||{},d=data.drafts?.[q.id],entry=all[scope]?.[q.id]||{},total=d?.order?.length||q.questions.length,answered=d?Object.values(d.answers||{}).filter(a=>String(a??'').trim()).length:0;
   const signature=JSON.stringify([entry,d?.index,total,answered,!!d?.practice]);if(card.dataset.paQuizSignature===signature)continue;card.dataset.paQuizSignature=signature;
   card.querySelector('.pa-quiz-status')?.remove();card.querySelector('.pa-quiz-new')?.remove();
   const box=node('dl','pa-quiz-status'),add=(label,text)=>box.append(node('dt','',label),node('dd','',text));
   const format=r=>new Date(r.at).toLocaleString('pt-PT')+' · '+r.score+' / '+r.max+' · '+Math.round(r.score/r.max*100)+'%'+(r.manual?' automáticos · '+r.manual+' pontos por avaliar':'');
   add('Última tentativa concluída',entry.last?format(entry.last):'Ainda sem tentativas concluídas');add('Melhor pontuação',entry.best?format(entry.best):'Ainda sem pontuação');
   if(d){add(d.practice?'Treino dos erros em curso':'Tentativa em curso',answered+' de '+total+' respondidas · paraste na pergunta '+(Math.max(0,Math.min(total-1,Number(d.index)||0))+1));const p=node('progress','pa-quiz-progress');p.max=Math.max(1,total);p.value=answered;p.setAttribute('aria-label',answered+' de '+total+' perguntas respondidas');box.append(p);}
   const actions=button.closest('.actions-fi')||button;actions.before(box);
   const label=d?'Continuar de onde parei →':'Começar quiz →';if(button.textContent!==label)button.textContent=label;
   if(button.tagName==='A'){const u=new URL(button.href);u.searchParams.set('pa-resume','1');button.href=u.href;}
   else button.addEventListener('click',()=>{if(!card.dataset.paNew)document.getElementById('start')?.click();},{once:true});
   if(d){const b=node('button',button.tagName==='A'?'btn pa-quiz-new':'btn-fi pa-quiz-new','Começar nova tentativa');b.type='button';b.onclick=()=>{
    if(button.tagName==='A'){const u=new URL(button.href);u.searchParams.delete('pa-resume');u.searchParams.set('pa-new','1');location.assign(u.href);}
    else {card.dataset.paNew='1';button.click();delete card.dataset.paNew;const restart=document.getElementById('restart');if(restart)restart.click();}
   };actions.after(b);}
  }
  const params=new URLSearchParams(location.search),start=document.getElementById('start');if(document.body.dataset.page==='quiz'&&start&&(params.has('pa-resume')||params.has('pa-new'))){const fresh=params.has('pa-new');params.delete('pa-resume');params.delete('pa-new');history.replaceState(null,'',location.pathname+(params.size?'?'+params:'')+location.hash);if(fresh){const restart=document.getElementById('restart');if(restart){restart.click();if(read().drafts?.[document.body.dataset.quiz])return;}}document.getElementById('start')?.click();}
 }
 new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true});
 document.addEventListener('click',e=>{if(!e.target.closest('#prev,#next,[data-go]'))return;requestAnimationFrame(()=>{if(!latest||document.body.dataset.page!=='quiz')return;const dot=document.querySelector('.q-dots [aria-current="step"]'),d=latest.drafts?.[document.body.dataset.quiz];if(dot&&d){const index=Number(dot.dataset.go);if(d.index!==index){d.index=index;api.queue(latest);}}});});
 window.addEventListener('storage',schedule);schedule();
}
if(typeof window!=='undefined'){window.addEventListener('ian-study-ready',install);if(window.IanCloud)install();}
