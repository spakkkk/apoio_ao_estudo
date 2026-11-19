const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('./rebrand.css?v=20261119a',import.meta.url).href;link.id='pa-rebrand-css';
function last(){if(document.head.lastElementChild!==link)document.head.append(link);}
if(!document.getElementById(link.id)){document.head.append(link);new MutationObserver(last).observe(document.head,{childList:true});}
