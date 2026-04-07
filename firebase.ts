import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, increment } from 'firebase/firestore';

// CONFIGURAÇÃO EXATA DO PROJETO 0910721167 QUE VIMOS NO SEU PRINT
const firebaseConfig = {
  apiKey: "AIzaSyDhzhUtiul_KbV9vW3_Vb2owWr89NBxEaU",
  authDomain: "gen-lang-client-0910721167.firebaseapp.com",
  projectId: "gen-lang-client-0910721167",
  storageBucket: "gen-lang-client-0910721167.firebasestorage.app",
  messagingSenderId: "542066404894",
  appId: "1:542066404894:web:c74f59d1badc954c7e080f"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Exportando as funções que o resto do sistema usa
export { collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, increment };
export default app;
