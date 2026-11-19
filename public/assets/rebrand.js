import {enhanceSupervisorSummary} from './supervisor-summary.js?v=20261119b';
const urls=['./rebrand.css?v=20261119a','./portal-fixes.css?v=20261119b'];
const links=urls.map((url,i)=>{const id=i?'pa-portal-fixes-css':'pa-rebrand-css';let link=document.getElementById(id);if(!link){link=document.createElement('link');link.id=id;link.rel='stylesheet';link.href=new URL(url,import.meta.url).href;}return link;});
function last(){if(document.head.lastElementChild===links[1]&&links[1].previousElementSibling===links[0])return;for(const link of links)document.head.append(link);}
last();new MutationObserver(last).observe(document.head,{childList:true});
window.addEventListener('ian-study-ready',enhanceSupervisorSummary);
if(window.IanCloud)enhanceSupervisorSummary();
