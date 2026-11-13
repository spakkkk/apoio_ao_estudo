import {initializeApp,getApps,getApp} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js";
import {getAuth,onAuthStateChanged,signOut} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js";
import {getFirestore,doc,getDocFromServer,runTransaction,serverTimestamp} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js";
const config={apiKey:"AIzaSyC7qmpQmNAA1Y5WDmtKvamS1k4k7qcELNI",authDomain:"apoio-ao-estudo.firebaseapp.com",projectId:"apoio-ao-estudo",storageBucket:"apoio-ao-estudo.firebasestorage.app",messagingSenderId:"740789054680",appId:"1:740789054680:web:c068304d0b8bbcf96a3bad"};
const root=new URL("../",import.meta.url),blank=()=>({read:[],plan:[],history:[],drafts:{}});
function validate(s){if(!s||!Array.isArray(s.read)||!Array.isArray(s.plan)||!Array.isArray(s.history)||!s.drafts||typeof s.drafts!=="object"||Array.isArray(s.drafts))throw Error("Formato de progresso inválido.");return s;}
function download(text){const u=URL.createObjectURL(new Blob([text],{type:"application/json"})),a=document.createElement("a");a.href=u;a.download="progresso-ian-backup.json";a.click();setTimeout(()=>URL.revokeObjectURL(u),2000);}
export async function start(){
 const app=getApps().length?getApp():initializeApp(config),auth=getAuth(app),db=getFirestore(app);
 const user=await new Promise((resolve,reject)=>{const unsub=onAuthStateChanged(auth,u=>{unsub();resolve(u);},reject);});
 if(!user){location.replace(new URL("login.html",root));await new Promise(()=>{});}
 const key="ian-study-portal-v1:"+user.uid,pendingKey=key+":pending",reference=doc(db,"users",user.uid,"progresso","portal");
 let revision=0,pending=null,running=null,timeout,conflict=false;
 const bar=document.createElement("div");bar.style.cssText="display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding:10px 20px;background:#edf4ee;color:#183426;font:14px system-ui";
 const status=document.createElement("span");status.setAttribute("role","status");status.setAttribute("aria-live","polite");bar.append(status);
 const message=t=>{status.textContent=t;};
 const button=(text,action)=>{const b=document.createElement("button");b.type="button";b.textContent=text;b.onclick=action;bar.append(b);};
 button("Tentar guardar",()=>flush().catch(e=>alert(e.message)));
 button("Exportar cópia",()=>download(localStorage.getItem(key)||"{}"));
 button("Terminar sessão",async()=>{try{await flush();await signOut(auth);}catch(e){alert("A sessão não foi terminada: "+e.message);}});
 document.body.prepend(bar);const oldExit=document.getElementById("sair");if(oldExit)oldExit.hidden=true;
 function queue(state){validate(state);pending=JSON.stringify(state);localStorage.setItem(pendingKey,JSON.stringify({revision,state:pending}));message("Alterações por guardar…");clearTimeout(timeout);timeout=setTimeout(()=>flush().catch(()=>{}),1000);}
 async function flush(){
  clearTimeout(timeout);if(running){await running;if(pending)return flush();return;}if(!pending)return;if(conflict)throw Error("Conflito: exporta a cópia local e recarrega a página.");
  const payload=pending,expected=revision;if(new TextEncoder().encode(payload).length>850000){message("Dados demasiado grandes. Exporta uma cópia.");throw Error("O progresso excede o limite desta versão.");}
  message("A guardar na conta…");
  running=(async()=>{try{await runTransaction(db,async tx=>{const snap=await tx.get(reference),remote=snap.exists()?snap.data().revision||0:0;if(remote!==expected){const e=Error("O progresso mudou noutro dispositivo.");e.isConflict=true;throw e;}tx.set(reference,{schema:1,revision:expected+1,state:payload,updatedAt:serverTimestamp()});});revision=expected+1;if(pending===payload){pending=null;localStorage.removeItem(pendingKey);message("Guardado na conta do Ian.");}else localStorage.setItem(pendingKey,JSON.stringify({revision,state:pending}));}catch(e){if(e.isConflict)conflict=true;message(conflict?"Conflito: exporta uma cópia e recarrega.":"Não guardado na conta. Cópia local disponível; tenta novamente.");throw e;}finally{running=null;}})();
  await running;if(pending)return flush();
 }
 message("A carregar o progresso da conta…");const snapshot=await getDocFromServer(reference);revision=snapshot.exists()?snapshot.data().revision||0:0;
 let state=snapshot.exists()?validate(JSON.parse(snapshot.data().state)):blank();const saved=JSON.parse(localStorage.getItem(pendingKey)||"null");
 if(saved){validate(JSON.parse(saved.state));if(saved.revision===revision){state=JSON.parse(saved.state);pending=saved.state;}else{download(saved.state);if(!confirm("A conta mudou noutro dispositivo. Foi exportada a cópia local. Carregar a versão da conta?"))throw Error("Abertura cancelada para preservar as duas versões.");localStorage.removeItem(pendingKey);}}
 const legacy=localStorage.getItem("ian-study-portal-v1"),marker=key+":legacy-checked";
 if(!snapshot.exists()&&!saved&&legacy&&!localStorage.getItem(marker)){const old=validate(JSON.parse(legacy));if(old.read.length||old.plan.length||old.history.length||Object.keys(old.drafts).length){if(confirm("Importar o estudo antigo deste navegador para a conta do Ian?")){state=old;pending=JSON.stringify(old);}}localStorage.setItem(marker,"1");}
 localStorage.setItem(key,JSON.stringify(state));if(pending){localStorage.setItem(pendingKey,JSON.stringify({revision,state:pending}));await flush();}else message("Progresso carregado da conta.");
 window.addEventListener("online",()=>flush().catch(()=>{}));
 window.addEventListener("beforeunload",e=>{if(pending||running){e.preventDefault();e.returnValue="";}});
 window.addEventListener("storage",e=>{if(e.key===key){conflict=true;message("Outra janela alterou o estudo. Exporta e recarrega antes de continuar.");}});
 onAuthStateChanged(auth,u=>{if(!u||u.uid!==user.uid)location.replace(new URL("login.html",root));});
 document.addEventListener("click",e=>{const a=e.target.closest("a[href]");if(!a||e.defaultPrevented||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||a.target==="_blank"||a.hasAttribute("download"))return;const dest=new URL(a.href,location.href);if(dest.origin!==location.origin||dest.pathname===location.pathname)return;if(pending||running){e.preventDefault();flush().then(()=>location.assign(dest.href)).catch(err=>alert(err.message));}},true);
 const api={key,queue,flush};window.IanCloud=api;return api;
}
