// Importe as funções necessárias do SDK que você precisa
import {initializeApp} from "firebase/app";
import {getFirestore} from "firebase/firestore";

// A configuração do seu aplicativo da web do Firebase
// ATENÇÃO: Substitua pelos dados do seu projeto!
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_AUTH_DOMAIN",
  projectId: "SEU_PROJECT_ID",
  storageBucket: "SEU_STORAGE_BUCKET",
  messagingSenderId: "SEU_MESSAGING_SENDER_ID",
  appId: "SEU_APP_ID",
};

// Checagem simples: se os placeholders não foram substituídos, não inicializamos
const hasPlaceholder = Object.values(firebaseConfig).some(
  (v) =>
    typeof v === "string" &&
    (v.includes("SUA_") || v.includes("SEU_") || v.trim() === "")
);

let db = null;
if (hasPlaceholder) {
  // Não inicializa; o app deve tratar db === null
  console.warn(
    "Firebase não configurado (placeholders detectados). O Firestore não será inicializado."
  );
} else {
  // Inicialize o Firebase e atribua o Firestore
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
}

export {db};
