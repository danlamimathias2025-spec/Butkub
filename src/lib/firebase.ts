import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDJYhjXr-DNB2vjCcwjN503poENJa3Fnsg",
  authDomain: "gen-lang-client-0977149338.firebaseapp.com",
  projectId: "gen-lang-client-0977149338",
  storageBucket: "gen-lang-client-0977149338.firebasestorage.app",
  messagingSenderId: "470856496159",
  appId: "1:470856496159:web:9d70808043a0c3ef5a512a"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, "ai-studio-bitkub-f9c655db-8978-4933-8f7f-ed139713c502");
