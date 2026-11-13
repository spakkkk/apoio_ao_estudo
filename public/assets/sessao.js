import { initializeApp } from
  "https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut
} from
  "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyC7qmpQmNAA1Y5WDmtKvamS1k4k7qcELNI",
  authDomain: "apoio-ao-estudo.firebaseapp.com",
  projectId: "apoio-ao-estudo",
  storageBucket: "apoio-ao-estudo.firebasestorage.app",
  messagingSenderId: "740789054680",
  appId: "1:740789054680:web:c068304d0b8bbcf96a3bad"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const raizPortal = new URL("../", import.meta.url);

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.replace(
      new URL("login.html", raizPortal).href
    );
    return;
  }

  const nome = document.getElementById("utilizador");
  if (nome) nome.textContent = "Ian";

  const sair = document.getElementById("sair");

  if (sair) {
    sair.addEventListener("click", async () => {
      try {
        await signOut(auth);
      } catch {
        alert("Não foi possível terminar a sessão. Tenta novamente.");
      }
    });
  }
});