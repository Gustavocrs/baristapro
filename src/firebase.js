// Importe as funções necessárias do SDK que você precisa
import {initializeApp} from "firebase/app";
import {getFirestore} from "firebase/firestore";

// A configuração do seu aplicativo da web do Firebase
// ATENÇÃO: Substitua pelos dados do seu projeto!
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "meuexpresso-5d31e.firebaseapp.com",
  projectId: "meuexpresso-5d31e",
  storageBucket: "meuexpresso-5d31e.firebasestorage.app",
  messagingSenderId: "400791506963",
  appId: "1:400791506963:web:fa20d9c9e5adeadbe86fe6",
  measurementId: "G-2W56PW0S6Z",
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
