/**
 * Firebase Configuration and Initialization
 * Provides Firebase app instance and Firestore for real-time updates
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';

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
let storage: FirebaseStorage;

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
  storage = getStorage(app);
  
  // Connect to Auth Emulator on localhost for Phone OTP development
  // Only connect if explicitly enabled via URL param: ?useEmulator=true
  // This prevents connection errors when emulator isn't running
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const useEmulator = new URLSearchParams(window.location.search).get('useEmulator') === 'true';
  if (isLocalhost && useEmulator && !auth.emulatorConfig) {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    console.log('🔧 Connected to Firebase Auth Emulator (localhost:9099)');
  } else if (isLocalhost && !useEmulator) {
    console.log('🔧 Auth Emulator disabled (add ?useEmulator=true to enable)');
  }
  
  console.log('✅ Firestore, Auth, and Storage initialized');
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
  throw error;
}

export { app, firestore, auth, storage };
export default app;
