import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocFromServer, 
  getDoc 
} from 'firebase/firestore';

// ===============================================================
// 1. CONFIGURAÇÃO ATUALIZADA (PROJETO FINAL: 0817268461)
// ===============================================================
const firebaseConfig = {
  // ATENÇÃO: Verifique se a sua API Key no painel do Firebase 0817268461 é esta mesma:
  apiKey: "AIzaSyDhzhUtiul_KbV9vW3_Vb2owWr89NBxEaU", 
  
  authDomain: "gen-lang-client-0817268461.firebaseapp.com",
  projectId: "gen-lang-client-0817268461",
  storageBucket: "gen-lang-client-0817268461.firebasestorage.app",
  messagingSenderId: "542066404894",
  appId: "1:542066404894:web:c74f59d1badc954c7e080f"
};

// 2. Inicialização
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// 3. Exportações de Autenticação
export { GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged };
export type { FirebaseUser };

// 4. Exportação das funções do Firestore
export { 
  collection, addDoc, getDocs, onSnapshot, query, orderBy, 
  doc, setDoc, updateDoc, deleteDoc, getDocFromServer, getDoc 
};

// 5. Funções Auxiliares
export enum OperationType {
  CREATE = 'create', UPDATE = 'update', DELETE = 'delete', 
  LIST = 'list', GET = 'get', WRITE = 'write'
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`🔴 Erro no Firestore [${operationType}] em [${path}]:`, errorMessage);
  return errorMessage;
}

export async function testConnection() {
  try {
    const testRef = doc(db, 'products', '1'); 
    await getDoc(testRef);
    console.log("✅ CONEXÃO ESTABELECIDA NO NOVO PROJETO!");
  } catch (error) {
    console.error("❌ ERRO DE CONEXÃO: Verifique o domínio autorizado.");
  }
}

export default app;