/**
 * Firebase Configuration and Initialization
 * Provides Firebase app instance and Firestore for real-time updates
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAx63B-kvvXQDx-WipN0VC-D2id6ffrOvw",
  authDomain: "axilam.firebaseapp.com",
  projectId: "axilam",
  storageBucket: "axilam.appspot.com",
  messagingSenderId: "174862654229",
  appId: "1:174862654229:web:b495894e8e2f921c03a71c"
};

// Initialize Firebase (only once)
let app: FirebaseApp;
let firestore: Firestore;
let auth: Auth;

try {
  // Check if Firebase is already initialized
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    console.log('✅ Firebase initialized successfully');
  } else {
    app = getApp();
    console.log('✅ Firebase already initialized, using existing instance');
  }
  
  // Initialize services
  firestore = getFirestore(app);
  auth = getAuth(app);
  
  console.log('✅ Firestore and Auth initialized');
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
  throw error;
}

export { app, firestore, auth };
export default app;
