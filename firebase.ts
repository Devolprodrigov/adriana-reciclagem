import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult, // ADICIONADO AQUI
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

// EXPORTAÇÕES (Todas que o App.tsx precisa agora)
export { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult, // ADICIONADO AQUI TAMBÉM
  signOut, 
  onAuthStateChanged 
};
export type { FirebaseUser };

export { 
  collection, addDoc, getDocs, onSnapshot, query, orderBy, 
  doc, setDoc, updateDoc, deleteDoc, getDocFromServer, getDoc 
};

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
    console.log("✅ CONEXÃO ESTABELECIDA!");
  } catch (error) {
    console.error("❌ ERRO DE CONEXÃO.");
  }
}

export default app;