import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
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
// 1. CONFIGURAÇÃO REAL (Extraída do seu print do Firebase)
// ===============================================================
const firebaseConfig = {
  apiKey: "AIzaSyDhzhUtiul_KbV9vW3_Vb2owWr89NBxEaU",
  authDomain: "gen-lang-client-0910721167.firebaseapp.com",
  projectId: "gen-lang-client-0910721167",
  storageBucket: "gen-lang-client-0910721167.firebasestorage.app",
  messagingSenderId: "542066404894",
  appId: "1:542066404894:web:c74f59d1badc954c7e080f"
};

// ===============================================================
// 2. INICIALIZAÇÃO
// ===============================================================
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// 3. EXPORTAÇÕES DE AUTENTICAÇÃO
export { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged };
export type { FirebaseUser };

// 4. EXPORTAÇÃO DE FUNÇÕES FIRESTORE
export { 
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
};

// 5. TRATAMENTO DE ERROS
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`🔴 Erro no Firestore [${operationType}] em [${path}]:`, errorMessage);
  return errorMessage;
}

// 6. TESTE DE CONEXÃO
export async function testConnection() {
  try {
    const testRef = doc(db, 'products', '1'); 
    await getDoc(testRef);
    console.log("✅ CONEXÃO ESTABELECIDA: Projeto Adriana Online!");
  } catch (error) {
    console.error("❌ ERRO: Verifique se o domínio vercel.app está autorizado no Firebase.");
  }
}