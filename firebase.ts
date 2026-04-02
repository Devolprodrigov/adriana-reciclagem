import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, getDocs, onSnapshot, query, orderBy, 
  doc, setDoc, updateDoc, deleteDoc, getDoc 
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDhzhUtiul_KbV9vW3_Vb2owWr89NBxEaU",
  authDomain: "gen-lang-client-0817268461.firebaseapp.com",
  projectId: "gen-lang-client-0817268461",
  storageBucket: "gen-lang-client-0817268461.firebasestorage.app",
  messagingSenderId: "542066404894",
  appId: "1:542066404894:web:c74f59d1badc954c7e080f"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export { signInWithEmailAndPassword, signOut, onAuthStateChanged };
export type { FirebaseUser };
export { collection, addDoc, getDocs, onSnapshot, query, orderBy, doc, setDoc, updateDoc, deleteDoc, getDoc };

export enum OperationType { CREATE = 'create', UPDATE = 'update', DELETE = 'delete', LIST = 'list', GET = 'get', WRITE = 'write' }
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  console.error(`🔴 Erro no Firestore:`, error);
  return "Erro de conexão.";
}
export async function testConnection() {
  try { await getDoc(doc(db, 'products', '1')); console.log("✅ CONEXÃO OK"); } catch (e) { console.error("❌ ERRO"); }
}
export default app;