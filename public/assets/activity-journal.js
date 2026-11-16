const clone=value=>JSON.parse(JSON.stringify(value));
const eq=(a,b)=>JSON.stringify(a??null)===JSON.stringify(b??null);
function contexts(s){return [['geografia',s],['filosofia',s.philosophy20261119||{}]];}
export function changes(before,after){
 const out=[];
 const emit=(type,subject,detail)=>out.push({type,subject,...detail});
 for(const [subject,b] of contexts(after)){
  const a=subject==='geografia'?before:(before.philosophy20261119||{});
  for(const field of ['read','plan']){
   const x=new Set(a[field]||[]),y=new Set(b[field]||[]);
   for(const id of new Set([...x,...y]))if(x.has(id)!==y.has(id))emit(field,subject,{key:String(id),value:y.has(id)});
  }
  for(const field of subject==='geografia'?['topicChecks']:['checks']){
   const x=a[field]||{},y=b[field]||{};
   for(const key of new Set([...Object.keys(x),...Object.keys(y)]))if(!!x[key]!==!!y[key])emit('check',subject,{key,value:!!y[key],label:subject==='geografia'?document.querySelector('[data-topic-id="'+CSS.escape(key)+'"]')?.getAttribute('aria-label')||'': ''});
  }
  const oldIds=new Set((a.history||[]).map(r=>r.id));
  const completed=new Set();
  for(const r of b.history||[])if(!oldIds.has(r.id)){
   completed.add(r.quizId);
   const data=subject==='filosofia'?window.FILOSOFIA_DATA:window.PORTAL_DATA;
   const q=data?.quizzes?.find(q=>q.id===r.quizId);
   emit('completed',subject,{key:r.quizId,result:clone(r),questions:q?clone(q.questions):[],catalogCaptured:!!q});
  }
  const x=a.drafts||{},y=b.drafts||{};
  for(const key of new Set([...Object.keys(x),...Object.keys(y)])){
   if(!x[key]&&y[key])emit('started',subject,{key,start:y[key].start??null,practice:!!y[key].practice});
   if(x[key]&&!y[key]&&!completed.has(key))emit('draftRemoved',subject,{key});
   if(!y[key])continue;
   const aa=x[key]?.answers||{},bb=y[key].answers||{};
   for(const question of new Set([...Object.keys(aa),...Object.keys(bb)]))if(!eq(aa[question],bb[question])){const catalog=subject==='filosofia'?window.FILOSOFIA_DATA:window.PORTAL_DATA;const quiz=catalog?.quizzes?.find(q=>q.id===key);const entry=subject==='filosofia'?quiz?.questions?.find(q=>q.id===question):quiz?.questions?.[Number(question)];emit('answer',subject,{key,question,value:bb[question]??null,questionSnapshot:entry?clone(entry):null});}
  }
 }
 return out;
}
export function createJournal(key,baseline){
 const storageKey=key+':audit-v1';let previous=clone(baseline),events=[];
 try{const saved=JSON.parse(localStorage.getItem(storageKey)||'[]');if(Array.isArray(saved))events=saved;}catch{throw Error('Não foi possível recuperar o histórico local de atividade.');}
 const persist=()=>localStorage.setItem(storageKey,JSON.stringify(events));
 function add(items){
  const at=new Date().toISOString(),page=location.pathname+location.hash;
  for(const item of items){
   const event={...item,id:crypto.randomUUID(),at,page};
   const tail=events.at(-1);
   if(event.type==='answer'&&tail?.type==='answer'&&tail.subject===event.subject&&tail.key===event.key&&tail.question===event.question&&Date.parse(at)-Date.parse(tail.at)<2000)events[events.length-1]=event;
   else events.push(event);
  }
  persist();
 }
 return {
  capture(state){const next=clone(state),items=changes(previous,next);add(items);previous=next;},
  visit(){add([{type:'page',subject:document.body.dataset.subject||'',key:document.title}]);},
  pending(){return clone(events);},
  acknowledge(batch){const ids=new Set(batch.map(e=>e.id));events=events.filter(e=>!ids.has(e.id));persist();},
  clear(){events=[];persist();}
 };
}
