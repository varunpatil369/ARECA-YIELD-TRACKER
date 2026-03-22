import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

// Use environment variables if available, otherwise fallback to the config file
const env = (import.meta as any).env || {};
const config = {
  apiKey: env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
  firestoreDatabaseId: env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || firebaseConfig.firestoreDatabaseId,
};

const app = initializeApp(config);
export const db = getFirestore(app, config.firestoreDatabaseId);
export const auth = getAuth(app);
