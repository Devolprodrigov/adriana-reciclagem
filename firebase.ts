import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, doc, getDoc } from 'firebase/firestore';

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
export const googleProvider = new GoogleAuthProvider();

// Exportando as funções para o resto do app não dar erro
export { collection, addDoc, onSnapshot, query, doc, getDoc, signInWithPopup, signOut, onAuthStateChanged };