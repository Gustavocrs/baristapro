/**
 * @file src/firebase.js
 * @description Inicialização segura do Firebase App, Firestore e Auth utilizando
 * variáveis de ambiente prefixadas com NEXT_PUBLIC_ para exposição ao client-side.
 */

import {initializeApp} from "firebase/app";
import {getFirestore} from "firebase/firestore";
import {getAuth, GoogleAuthProvider} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const hasPlaceholder = Object.values(firebaseConfig).some(
  (v) =>
    typeof v === "string" &&
    (v.includes("SUA_") || v.includes("SEU_") || v.trim() === ""),
);

let db = null;
let auth = null;
let googleProvider = null;

if (hasPlaceholder) {
  console.warn(
    "Firebase não configurado ou variáveis ausentes. Auth e Firestore offline.",
  );
} else if (!firebaseConfig.apiKey) {
  console.error(
    "ERRO CRÍTICO: Chave de API não encontrada no ambiente. Verifique o prefixo NEXT_PUBLIC_ no .env.local.",
  );
} else {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
}

export {db, auth, googleProvider};
