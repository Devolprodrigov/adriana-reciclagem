import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, onSnapshot, query, orderBy, doc, setDoc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';

// CONFIGURAÇÃO DO PROJETO QUE APARECE NO SEU PRINT (0910721167)
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

// FUNÇÃO DE TESTE - ELA VAI TENTAR LER O SEU NOME NO BANCO
export async function testarConexaoAgora() {
  try {
    // Tenta ler a coleção que você mostrou no print
    const querySnapshot = await getDocs(collection(db, 'customersPF'));
    if (querySnapshot.empty) {
      console.log("⚠️ Conectou, mas a pasta 'customersPF' está vazia no banco.");
      return "CONECTADO (BANCO VAZIO)";
    } else {
      console.log("✅ SUCESSO: O site conseguiu ler os dados do banco!");
      return "CONEXÃO OK!";
    }
  } catch (error: any) {
    console.error("❌ ERRO DE CONEXÃO:", error.message);
    return `ERRO: ${error.message}`;
  }
}

export { signInWithEmailAndPassword, signOut, onAuthStateChanged };
export type { FirebaseUser };
export { collection, addDoc, getDocs, onSnapshot, query, orderBy, doc, setDoc, updateDoc, deleteDoc, getDoc };
export default app;