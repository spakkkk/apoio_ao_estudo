(()=>{'use strict';
const KEY='ian-study-topic-checks-v1';
let checked={};try{checked=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(e){}
function save(){try{localStorage.setItem(KEY,JSON.stringify(checked))}catch(e){}}
function sentences(text){try{if(Intl.Segmenter)return [...new Intl.Segmenter('pt-PT',{granularity:'sentence'}).segment(text)].map(x=>x.segment.trim()).filter(Boolean)}catch(e){}return [text]}
function decorate(){
 document.querySelectorAll('.lesson').forEach(lesson=>{
  const body=lesson.querySelector('.lesson-body');if(!body)return;
  const blocks=body.querySelectorAll('.study-cards .study-block');
  if(blocks.length){blocks.forEach((block,i)=>{
   if(block.dataset.topicCheck)return;
   const p=block.querySelector('p');if(!p)return;
   block.dataset.topicCheck='1';add(p,lesson.id+'-'+i);
  })}else{
   body.querySelectorAll(':scope > ul > li').forEach((li,i)=>{if(!li.dataset.topicCheck){li.dataset.topicCheck='1';add(li,lesson.id+'-'+i)}});
  }
 });
}
function add(container,id){
 const text=container.textContent.trim(),label=document.createElement('label'),input=document.createElement('input'),copy=document.createElement('span'),hint=document.createElement('span');
 label.className='topic-reading-check';input.type='checkbox';input.className='topic-reading-box';input.checked=!!checked[id];input.setAttribute('aria-label','Li e compreendi: '+text);input.dataset.topicId=id;
 copy.className='topic-reading-copy';sentences(text).forEach(sentence=>{const line=document.createElement('span');line.className='topic-reading-sentence';line.textContent=sentence;copy.append(line)});
 hint.className='topic-reading-hint';hint.textContent='Li e compreendi';copy.append(hint);
 label.append(input,copy);container.replaceChildren(label);container.classList.add('topic-reading-paragraph');
 label.classList.toggle('is-understood',input.checked);
 input.addEventListener('change',()=>{if(input.checked)checked[id]=true;else delete checked[id];save();label.classList.toggle('is-understood',input.checked)});
}
const observer=new MutationObserver(decorate);observer.observe(document.documentElement,{childList:true,subtree:true});document.addEventListener('DOMContentLoaded',decorate);decorate();
window.addEventListener('storage',event=>{if(event.key===KEY){try{checked=JSON.parse(event.newValue||'{}')}catch(e){checked={}}document.querySelectorAll('.topic-reading-box').forEach(input=>{input.checked=!!checked[input.dataset.topicId];input.closest('label').classList.toggle('is-understood',input.checked)})}});
})();