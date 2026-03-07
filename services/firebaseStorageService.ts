/**
 * Firebase Storage Service
 * Handles file uploads, downloads, and deletions from Firebase Storage
 * 
 * Storage Structure (Match-Based):
 * When matchName is provided, files are organized under:
 *   {MatchName}/Players/   - Player photos
 *   {MatchName}/Teams/     - Team logos
 *   {MatchName}/Documents/ - PDFs and documents
 *   {MatchName}/Auctioneers/ - Auctioneer photos
 *   {MatchName}/Recordings/ - Auction recordings
 *   {MatchName}/Replays/   - Auction replays
 *   {MatchName}/Highlights/ - Match highlights
 *   {MatchName}/Profiles/  - Profile pictures
 */

import { storage } from './firebaseConfig';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject, listAll } from 'firebase/storage';

// Storage folder structure (without match prefix)
export const STORAGE_FOLDERS = {
  PLAYER_PHOTOS: 'Players',
  TEAM_LOGOS: 'Teams',
  AUCTION_VIDEOS: 'Videos',
  AUCTION_REPLAYS: 'Replays',
  AUCTION_RECORDINGS: 'Recordings',
  DOCUMENTS: 'Documents',
  USER_PROFILES: 'Profiles',
  MATCH_HIGHLIGHTS: 'Highlights',
  AUCTIONEERS: 'Auctioneers',
};

/**
 * Build storage path with optional match name prefix
 */
function buildStoragePath(folder: string, fileName: string, matchName?: string): string {
  if (matchName) {
    // Sanitize match name for use as folder name
    const safeMatchName = matchName.replace(/[\s\/\\]/g, '_');
    return `${safeMatchName}/${folder}/${fileName}`;
  }
  return `${folder}/${fileName}`;
}

/**
 * Upload a file to Firebase Storage and return its download URL
 * @param file - File to upload
 * @param folder - Storage folder path
 * @param fileName - Optional custom file name
 * @param matchName - Optional match name for folder organization
 * @returns Download URL of the uploaded file
 */
export async function uploadFileToStorage(
  file: File,
  folder: string,
  fileName?: string,
  matchName?: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    // Generate file name with timestamp for uniqueness
    const timestamp = Date.now();
    const finalFileName = fileName || `${timestamp}_${file.name}`;
    const storagePath = buildStoragePath(folder, finalFileName, matchName);

    // Create storage reference
    const fileRef = ref(storage, storagePath);

    // Upload file (resumable so we can report progress when needed)
    console.log(`📤 Uploading ${file.name} to Firebase Storage (${storagePath})...`);
    const uploadTask = uploadBytesResumable(fileRef, file);

    const snapshot = await new Promise<any>((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (taskSnapshot) => {
          if (!onProgress) return;
          const total = taskSnapshot.totalBytes || 0;
          const transferred = taskSnapshot.bytesTransferred || 0;
          const percent = total > 0 ? (transferred / total) * 100 : 0;
          onProgress(percent);
        },
        (error) => reject(error),
        () => resolve(uploadTask.snapshot)
      );
    });

    console.log(`✅ File uploaded: ${snapshot.ref.fullPath}`);
    const downloadURL = await getDownloadURL(snapshot.ref);
    onProgress?.(100);
    console.log(`✅ Download URL obtained`);
    return downloadURL;
  } catch (error) {
    console.error('❌ Firebase Storage upload failed:', error);
    throw new Error(`Failed to upload file to Firebase Storage: ${error}`);
  }
}

/**
 * Upload player photo
 * @param file - Image file
 * @param playerId - Player ID for file naming
 * @param matchName - Optional match name for folder organization
 */
export async function uploadPlayerPhoto(file: File, playerId: string, matchName?: string): Promise<string> {
  return uploadFileToStorage(file, STORAGE_FOLDERS.PLAYER_PHOTOS, `${playerId}_${Date.now()}`, matchName);
}

/**
 * Upload team logo
 * @param file - Image file
 * @param teamId - Team ID for file naming
 * @param matchName - Optional match name for folder organization
 */
export async function uploadTeamLogo(file: File, teamId: string, matchName?: string): Promise<string> {
  return uploadFileToStorage(file, STORAGE_FOLDERS.TEAM_LOGOS, `${teamId}_${Date.now()}`, matchName);
}

/**
 * Upload auction video/recording
 * @param file - Video file
 * @param auctionId - Auction ID for file naming
 * @param matchName - Optional match name for folder organization
 */
export async function uploadAuctionRecording(file: File, auctionId: string, matchName?: string): Promise<string> {
  return uploadFileToStorage(file, STORAGE_FOLDERS.AUCTION_RECORDINGS, `${auctionId}_${Date.now()}`, matchName);
}

/**
 * Upload auction replay
 * @param file - Video file
 * @param auctionId - Auction ID for file naming
 * @param matchName - Optional match name for folder organization
 */
export async function uploadAuctionReplay(file: File, auctionId: string, matchName?: string): Promise<string> {
  return uploadFileToStorage(file, STORAGE_FOLDERS.AUCTION_REPLAYS, `${auctionId}_${Date.now()}`, matchName);
}

/**
 * Upload document (authorization letter, ID, agreement, etc.)
 * @param file - PDF file
 * @param documentType - Type of document
 * @param docId - Document ID for file naming
 * @param matchName - Optional match name for folder organization
 */
export async function uploadDocument(file: File, documentType: string, docId: string, matchName?: string): Promise<string> {
  return uploadFileToStorage(file, `${STORAGE_FOLDERS.DOCUMENTS}/${documentType}`, `${docId}_${Date.now()}`, matchName);
}

/**
 * Upload user profile picture
 * @param file - Image file
 * @param userId - User ID for file naming
 * @param matchName - Optional match name for folder organization
 */
export async function uploadProfilePicture(file: File, userId: string, matchName?: string): Promise<string> {
  return uploadFileToStorage(file, STORAGE_FOLDERS.USER_PROFILES, `${userId}_profile_${Date.now()}`, matchName);
}

/**
 * Upload auctioneer photo
 * @param file - Image file
 * @param auctioneerId - Auctioneer ID for file naming
 * @param matchName - Optional match name for folder organization
 */
export async function uploadAuctioneerPhoto(file: File, auctioneerId: string, matchName?: string): Promise<string> {
  return uploadFileToStorage(file, STORAGE_FOLDERS.AUCTIONEERS, `${auctioneerId}_${Date.now()}`, matchName);
}

/**
 * Upload match highlight video
 * @param file - Video file
 * @param matchId - Match ID for file naming
 * @param matchName - Optional match name for folder organization
 */
export async function uploadMatchHighlight(file: File, matchId: string, matchName?: string): Promise<string> {
  return uploadFileToStorage(file, STORAGE_FOLDERS.MATCH_HIGHLIGHTS, `${matchId}_${Date.now()}`, matchName);
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
