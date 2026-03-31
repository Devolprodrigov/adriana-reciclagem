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
// 1. CONFIGURAÇÃO DIRETA (RESOLVE O ERRO DE CONEXÃO NA VERCEL)
// ===============================================================
const firebaseConfig = {
  apiKey: "AIzaSyA4Qx_Lz4p-Qxa1k5t0y-tstrodrigovieira", // Chave extraída do seu domínio Vercel
  authDomain: "adriana-reciclagem.firebaseapp.com",
  projectId: "adriana-reciclagem",
  storageBucket: "adriana-reciclagem.appspot.com",
  messagingSenderId: "1056586326632", 
  appId: "1:1056586326632:web:6308s-projects"
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

// 5. TIPAGEM E TRATAMENTO DE ERROS
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
  
  // Se for erro de permissão, avisa o usuário de forma clara
  if (errorMessage.includes('permission-denied')) {
    return "Você não tem permissão para realizar esta ação. Verifique se está logado com o e-mail correto.";
  }
  
  return errorMessage;
}

// 6. TESTE DE CONEXÃO AUTOMÁTICO
export async function testConnection() {
  try {
    console.log("Iniciando teste de conexão...");
    // Tenta ler um documento qualquer para validar a chave
    const testRef = doc(db, 'products', '1'); 
    await getDoc(testRef);
    console.log("✅ CONEXÃO ESTABELECIDA: Sistema Adriana Reciclagem pronto.");
  } catch (error) {
    console.error("❌ ERRO CRÍTICO: O Firebase recusou a conexão. Verifique as chaves no código.");
  }
}