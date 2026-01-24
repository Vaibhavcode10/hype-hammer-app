/**
 * Firebase Storage Service
 * Handles image uploads to Firebase Storage and returns download URLs
 */

import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Firebase configuration for 'axilam' project
// These values are public and safe to expose in frontend code
const firebaseConfig = {
  apiKey: "AIzaSyCYdvz5nRlxjKZF_1X3jFj5xH7T8Y9Z0aB",  // Public web API key
  authDomain: "axilam.firebaseapp.com",
  projectId: "axilam",
  storageBucket: "axilam.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdefghijklmnop"
};

let app: any = null;
let storage: any = null;

try {
  // Initialize Firebase (only once, handle multiple calls gracefully)
  if (!app) {
    app = initializeApp(firebaseConfig);
    storage = getStorage(app);
    console.log('✅ Firebase Storage initialized');
  }
} catch (error: any) {
  // Firebase might already be initialized, that's ok
  if (!error.message.includes('Firebase App')) {
    console.warn('⚠️ Firebase initialization issue:', error.message);
  }
  // Try to get storage reference even if init failed
  try {
    storage = getStorage();
  } catch (e) {
    console.error('❌ Failed to initialize Firebase Storage:', e);
  }
}

/**
 * Upload a file to Firebase Storage and return its download URL
 * @param file - File to upload
 * @param folder - Storage folder (e.g., 'players', 'teams', 'documents')
 * @param fileName - Optional custom file name (defaults to timestamp + original name)
 * @returns Download URL of the uploaded file
 */
export async function uploadFileToStorage(
  file: File,
  folder: string,
  fileName?: string
): Promise<string> {
  if (!storage) {
    throw new Error('Firebase Storage is not initialized');
  }

  try {
    // Generate file name if not provided
    const finalFileName = fileName || `${Date.now()}_${file.name}`;
    const storagePath = `${folder}/${finalFileName}`;

    // Create a storage reference
    const fileRef = ref(storage, storagePath);

    // Upload the file
    console.log(`📤 Uploading ${file.name} to Firebase Storage (${storagePath})...`);
    const snapshot = await uploadBytes(fileRef, file);
    console.log(`✅ File uploaded: ${snapshot.ref.fullPath}`);

    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log(`✅ Download URL obtained: ${downloadURL.substring(0, 80)}...`);

    return downloadURL;
  } catch (error) {
    console.error('❌ Firebase Storage upload failed:', error);
    throw new Error(`Failed to upload file to Firebase Storage: ${error}`);
  }
}

/**
 * Upload player photo
 */
export async function uploadPlayerPhoto(file: File): Promise<string> {
  return uploadFileToStorage(file, 'players/photos');
}

/**
 * Upload team logo
 */
export async function uploadTeamLogo(file: File): Promise<string> {
  return uploadFileToStorage(file, 'teams/logos');
}

/**
 * Upload document (authorization letter, ID, etc.)
 */
export async function uploadDocument(file: File, documentType: string): Promise<string> {
  return uploadFileToStorage(file, `documents/${documentType}`);
}
