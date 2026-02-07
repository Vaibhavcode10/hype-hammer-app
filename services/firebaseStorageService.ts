/**
 * Firebase Storage Service
 * Handles file uploads, downloads, and deletions from Firebase Storage
 */

import { storage } from './firebaseConfig';
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';

// Storage folder structure
export const STORAGE_FOLDERS = {
  PLAYER_PHOTOS: 'players/photos',
  TEAM_LOGOS: 'teams/logos',
  AUCTION_VIDEOS: 'auctions/videos',
  AUCTION_REPLAYS: 'auctions/replays',
  AUCTION_RECORDINGS: 'auctions/recordings',
  DOCUMENTS: 'documents',
  USER_PROFILES: 'users/profiles',
  MATCH_HIGHLIGHTS: 'matches/highlights',
};

/**
 * Upload a file to Firebase Storage and return its download URL
 * @param file - File to upload
 * @param folder - Storage folder path
 * @param fileName - Optional custom file name
 * @returns Download URL of the uploaded file
 */
export async function uploadFileToStorage(
  file: File,
  folder: string,
  fileName?: string
): Promise<string> {
  try {
    // Generate file name with timestamp for uniqueness
    const timestamp = Date.now();
    const finalFileName = fileName || `${timestamp}_${file.name}`;
    const storagePath = `${folder}/${finalFileName}`;

    // Create storage reference
    const fileRef = ref(storage, storagePath);

    // Upload file
    console.log(`📤 Uploading ${file.name} to Firebase Storage (${storagePath})...`);
    const snapshot = await uploadBytes(fileRef, file);
    console.log(`✅ File uploaded: ${snapshot.ref.fullPath}`);

    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log(`✅ Download URL obtained`);

    return downloadURL;
  } catch (error) {
    console.error('❌ Firebase Storage upload failed:', error);
    throw new Error(`Failed to upload file to Firebase Storage: ${error}`);
  }
}

/**
 * Upload player photo
 */
export async function uploadPlayerPhoto(file: File, playerId: string): Promise<string> {
  return uploadFileToStorage(file, STORAGE_FOLDERS.PLAYER_PHOTOS, `${playerId}_${Date.now()}`);
}

/**
 * Upload team logo
 */
export async function uploadTeamLogo(file: File, teamId: string): Promise<string> {
  return uploadFileToStorage(file, STORAGE_FOLDERS.TEAM_LOGOS, `${teamId}_${Date.now()}`);
}

/**
 * Upload auction video/recording
 */
export async function uploadAuctionRecording(file: File, auctionId: string): Promise<string> {
  return uploadFileToStorage(file, STORAGE_FOLDERS.AUCTION_RECORDINGS, `${auctionId}_${Date.now()}`);
}

/**
 * Upload auction replay
 */
export async function uploadAuctionReplay(file: File, auctionId: string): Promise<string> {
  return uploadFileToStorage(file, STORAGE_FOLDERS.AUCTION_REPLAYS, `${auctionId}_${Date.now()}`);
}

/**
 * Upload document (authorization letter, ID, agreement, etc.)
 */
export async function uploadDocument(file: File, documentType: string, docId: string): Promise<string> {
  return uploadFileToStorage(file, `${STORAGE_FOLDERS.DOCUMENTS}/${documentType}`, `${docId}_${Date.now()}`);
}

/**
 * Upload user profile picture
 */
export async function uploadProfilePicture(file: File, userId: string): Promise<string> {
  return uploadFileToStorage(file, STORAGE_FOLDERS.USER_PROFILES, `${userId}_profile_${Date.now()}`);
}

/**
 * Upload match highlight video
 */
export async function uploadMatchHighlight(file: File, matchId: string): Promise<string> {
  return uploadFileToStorage(file, STORAGE_FOLDERS.MATCH_HIGHLIGHTS, `${matchId}_${Date.now()}`);
}

/**
 * Delete file from Firebase Storage
 */
export async function deleteFileFromStorage(filePath: string): Promise<void> {
  try {
    const fileRef = ref(storage, filePath);
    await deleteObject(fileRef);
    console.log(`✅ File deleted: ${filePath}`);
  } catch (error) {
    console.error('❌ Firebase Storage delete failed:', error);
    throw new Error(`Failed to delete file from Firebase Storage: ${error}`);
  }
}

/**
 * Get download URL for an existing file in storage
 */
export async function getFileDownloadURL(filePath: string): Promise<string> {
  try {
    const fileRef = ref(storage, filePath);
    const downloadURL = await getDownloadURL(fileRef);
    return downloadURL;
  } catch (error) {
    console.error('❌ Failed to get download URL:', error);
    throw new Error(`Failed to get download URL: ${error}`);
  }
}

/**
 * List all files in a folder
 */
export async function listFilesInFolder(folderPath: string): Promise<any[]> {
  try {
    const folderRef = ref(storage, folderPath);
    const result = await listAll(folderRef);
    
    const files = await Promise.all(
      result.items.map(async (item) => ({
        name: item.name,
        path: item.fullPath,
        url: await getDownloadURL(item),
      }))
    );
    
    return files;
  } catch (error) {
    console.error('❌ Failed to list files:', error);
    throw new Error(`Failed to list files in folder: ${error}`);
  }
}

/**
 * Batch upload multiple files
 */
export async function batchUploadFiles(
  files: File[],
  folder: string
): Promise<string[]> {
  try {
    console.log(`📤 Batch uploading ${files.length} files...`);
    const uploadPromises = files.map((file) =>
      uploadFileToStorage(file, folder)
    );
    const downloadURLs = await Promise.all(uploadPromises);
    console.log(`✅ Batch upload complete: ${files.length} files uploaded`);
    return downloadURLs;
  } catch (error) {
    console.error('❌ Batch upload failed:', error);
    throw new Error(`Failed to batch upload files: ${error}`);
  }
}
