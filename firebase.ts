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

// 1. Configuração Centralizada
// Certifique-se de que no .env.local os nomes comecem com VITE_
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, // Adicionado
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID, // Adicionado
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Log de depuração rápido (remova em produção se desejar)
if (!firebaseConfig.apiKey) {
  console.warn("⚠️ Firebase: Chave de API não encontrada. Verifique suas variáveis de ambiente.");
}

// 2. Inicialização
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// 3. Exportações de Autenticação
export { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged };
export type { FirebaseUser };

// 4. Re-export de funções do Firestore para uso simplificado nos componentes
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

// 5. Tratamento de Erros e Tipagem
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any; // Simplificado para evitar erros de tipagem profunda
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      providerInfo: auth.currentUser?.providerData.map(p => p.providerId) || []
    }
  };
  console.error('🔴 Erro no Firestore:', errInfo);
  throw new Error(`Erro na operação ${operationType}: ${errInfo.error}`);
}

// 6. Teste de Conexão
export async function testConnection() {
  try {
    const testRef = doc(db, 'test', 'connection');
    await getDocFromServer(testRef);
    console.log("✅ Conexão com Firebase estabelecida com sucesso!");
  } catch (error) {
    console.error("❌ Falha na conexão com Firebase. Verifique as chaves e permissões.");
  }
}