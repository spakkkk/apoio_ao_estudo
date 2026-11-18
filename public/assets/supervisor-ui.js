const ROOT=new URL('../',import.meta.url);
export function enhanceSupervisor(){
let queued=false;
function render(){
 const nav=document.querySelector('.sidebar .nav');
 if(nav&&!nav.querySelector('[data-supervisor-link]')){
  for(const [label,hash] of [['Resumo do Ian','report'],['Atividade do Ian','audit']]){const a=document.createElement('a');a.dataset.supervisorLink=hash;a.href=new URL('acompanhamento.html#'+hash,ROOT).href;a.textContent=label;nav.append(a);}
 }
 for(const n of document.querySelectorAll('.profile-label')){if(!n.dataset.supervisor){n.dataset.supervisor='1';n.replaceChildren(document.createTextNode('A minha conta'));}}
 for(const n of document.querySelectorAll('.avatar'))if(n.textContent==='I')n.textContent='A';
 const greeting=document.querySelector('.welcome p');if(greeting&&greeting.textContent.startsWith('Olá, Ian.'))greeting.textContent=greeting.textContent.replace('Olá, Ian.','Olá.');
 const profile=document.querySelector('.topbar .profile');if(profile&&!profile.querySelector('[data-own-progress]')){const p=document.createElement('span');p.dataset.ownProgress='1';p.style.cssText='font-size:11px;color:#627464';p.textContent='Progresso próprio';profile.append(p);}
}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;render();});}
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});schedule();
}