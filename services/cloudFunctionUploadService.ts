/**
 * Legacy Cloud Function File Upload Service (COMPAT LAYER)
 *
 * IMPORTANT:
 * Firebase Cloud Functions upload routes `/auction/upload/*` have been disabled in production.
 * This module now uploads directly to Firebase Storage from the frontend, while preserving the
 * existing function signatures so older pages don’t break.
 *
 * Storage Structure (Match-Based):
 * When matchName is provided, files are organized under:
 *   {MatchName}/Players/      - Player photos
 *   {MatchName}/Teams/        - Team logos
 *   {MatchName}/Documents/*   - PDFs and documents
 *   {MatchName}/Auctioneers/  - Auctioneer photos
 *   {MatchName}/Recordings/   - Auction recordings
 *   {MatchName}/Replays/      - Auction replays
 *   {MatchName}/Highlights/   - Match highlights
 *   {MatchName}/Profiles/     - Profile pictures
 */

import { STORAGE_FOLDERS, uploadFileToStorage } from './firebaseStorageService';

// Kept for backward compatibility/debugging only
function getCloudFunctionBaseURL(): string {
  if (typeof window !== 'undefined' && (window as any).__CLOUD_FUNCTION_URL__) {
    return (window as any).__CLOUD_FUNCTION_URL__;
  }
  return 'https://us-central1-axilam.cloudfunctions.net/auction';
}

interface UploadOptions {
  onProgress?: (progress: number) => void;
  matchName?: string;  // Match/Season name for folder organization (e.g., 'WPL', 'IPL 2026')
}

const UPLOAD_TYPE_TO_FOLDER: Record<string, string> = {
  'player-photo': STORAGE_FOLDERS.PLAYER_PHOTOS,
  'team-logo': STORAGE_FOLDERS.TEAM_LOGOS,
  'profile-picture': STORAGE_FOLDERS.USER_PROFILES,
  'auctioneer-photo': STORAGE_FOLDERS.AUCTIONEERS,
  'auction-recording': STORAGE_FOLDERS.AUCTION_RECORDINGS,
  'auction-replay': STORAGE_FOLDERS.AUCTION_REPLAYS,
  'match-highlight': STORAGE_FOLDERS.MATCH_HIGHLIGHTS,
  // Documents are handled specially because they can have subfolders/types
  document: STORAGE_FOLDERS.DOCUMENTS,
};

function sanitizeFileNamePart(value: string): string {
  return (value || '')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, 120);
}

function buildDefaultFileName(uploadType: string, file: File): string {
  const ts = Date.now();
  const safeOriginal = sanitizeFileNamePart(file.name || 'file');
  const safeType = sanitizeFileNamePart(uploadType || 'upload');
  return `${safeType}_${ts}_${safeOriginal}`;
}

function resolveStorageTarget(uploadType: string): { folder: string; fileName: string } {
  // If uploadType is a typed document path like `document:OrganizerProof`, preserve it
  const [baseTypeRaw, subTypeRaw] = (uploadType || '').split(':');
  const baseType = baseTypeRaw || uploadType;

  if (baseType === 'document' && subTypeRaw) {
    const safeSubType = sanitizeFileNamePart(subTypeRaw);
    return { folder: `${STORAGE_FOLDERS.DOCUMENTS}/${safeSubType}`, fileName: '' };
  }

  const folder = UPLOAD_TYPE_TO_FOLDER[uploadType] || UPLOAD_TYPE_TO_FOLDER[baseType] || STORAGE_FOLDERS.DOCUMENTS;
  return { folder, fileName: '' };
}

/**
 * Upload player photo via Cloud Function
 * @param file - Image file to upload
 * @param options - Upload options including matchName for folder organization
 */
export async function uploadPlayerPhotoViaAPI(
  file: File,
  onProgressOrOptions?: ((progress: number) => void) | UploadOptions
): Promise<string> {
  const options = normalizeUploadOptions(onProgressOrOptions);
  return uploadFileViaAPI(file, 'player-photo', options);
}

/**
 * Upload team logo via Cloud Function
 * @param file - Image file to upload
 * @param options - Upload options including matchName for folder organization
 */
export async function uploadTeamLogoViaAPI(
  file: File,
  onProgressOrOptions?: ((progress: number) => void) | UploadOptions
): Promise<string> {
  const options = normalizeUploadOptions(onProgressOrOptions);
  return uploadFileViaAPI(file, 'team-logo', options);
}

/**
 * Upload user profile picture via Cloud Function
 * @param file - Image file to upload
 * @param options - Upload options including matchName for folder organization
 */
export async function uploadProfilePictureViaAPI(
  file: File,
  onProgressOrOptions?: ((progress: number) => void) | UploadOptions
): Promise<string> {
  const options = normalizeUploadOptions(onProgressOrOptions);
  return uploadFileViaAPI(file, 'profile-picture', options);
}

/**
 * Upload auctioneer photo via Cloud Function
 * @param file - Image file to upload
 * @param options - Upload options including matchName for folder organization
 */
export async function uploadAuctioneerPhotoViaAPI(
  file: File,
  onProgressOrOptions?: ((progress: number) => void) | UploadOptions
): Promise<string> {
  const options = normalizeUploadOptions(onProgressOrOptions);
  return uploadFileViaAPI(file, 'auctioneer-photo', options);
}

/**
 * Upload document (PDF, authorization letter, ID, etc.) via Cloud Function
 * @param file - PDF file to upload
 * @param options - Upload options including matchName for folder organization
 */
export async function uploadDocumentViaAPI(
  file: File,
  onProgressOrOptions?: ((progress: number) => void) | UploadOptions
): Promise<string> {
  const options = normalizeUploadOptions(onProgressOrOptions);
  return uploadFileViaAPI(file, 'document', options);
}

/**
 * Upload auction recording via Cloud Function
 * @param file - Video file to upload
 * @param options - Upload options including matchName for folder organization
 */
export async function uploadAuctionRecordingViaAPI(
  file: File,
  onProgressOrOptions?: ((progress: number) => void) | UploadOptions
): Promise<string> {
  const options = normalizeUploadOptions(onProgressOrOptions);
  return uploadFileViaAPI(file, 'auction-recording', options);
}

/**
 * Upload auction replay via Cloud Function
 * @param file - Video file to upload
 * @param options - Upload options including matchName for folder organization
 */
export async function uploadAuctionReplayViaAPI(
  file: File,
  onProgressOrOptions?: ((progress: number) => void) | UploadOptions
): Promise<string> {
  const options = normalizeUploadOptions(onProgressOrOptions);
  return uploadFileViaAPI(file, 'auction-replay', options);
}

/**
 * Upload match highlight video via Cloud Function
 * @param file - Video file to upload
 * @param options - Upload options including matchName for folder organization
 */
export async function uploadMatchHighlightViaAPI(
  file: File,
  onProgressOrOptions?: ((progress: number) => void) | UploadOptions
): Promise<string> {
  const options = normalizeUploadOptions(onProgressOrOptions);
  return uploadFileViaAPI(file, 'match-highlight', options);
}

/**
 * Normalize upload options - supports both callback and options object for backward compatibility
 */
function normalizeUploadOptions(
  onProgressOrOptions?: ((progress: number) => void) | UploadOptions
): UploadOptions {
  if (!onProgressOrOptions) {
    return {};
  }
  if (typeof onProgressOrOptions === 'function') {
    return { onProgress: onProgressOrOptions };
  }
  return onProgressOrOptions;
}

/**
 * Generic file upload function
 * Calls the Cloud Function API endpoint
 * 
 * @param file - File to upload
 * @param uploadType - Type of upload ('player-photo', 'team-logo', 'document', etc.)
 * @param options - Upload options with onProgress callback and matchName
 * @returns Download URL of the uploaded file
 */
export async function uploadFileViaAPI(
  file: File,
  uploadType: string,
  options: UploadOptions = {}
): Promise<string> {
  const { onProgress, matchName } = options;
  
  try {
    // Validate file
    if (!file) {
      throw new Error('No file provided');
    }

    if (!uploadType) {
      throw new Error('No upload type specified');
    }

    // Direct-to-Storage upload (Cloud Function upload routes are disabled in production)
    const target = resolveStorageTarget(uploadType);
    const fileName = target.fileName || buildDefaultFileName(uploadType, file);

    console.log(
      `📤 Uploading directly to Firebase Storage: ${file.name} (type: ${uploadType}${matchName ? `, match: ${matchName}` : ''})`
    );

    const downloadURL = await uploadFileToStorage(file, target.folder, fileName, matchName, (p) => {
      if (!onProgress) return;
      // Mirror old behavior (percent 0-100)
      onProgress(Math.max(0, Math.min(100, p)));
    });

    console.log(`✅ Upload successful: ${downloadURL}`);
    return downloadURL;
  } catch (error) {
    console.error('❌ Upload error:', error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}

/**
 * Get the Cloud Function URL for debugging
 */
export function getCloudFunctionURL(): string {
  return getCloudFunctionBaseURL();
}

/**
 * Configure the Cloud Function URL (useful for dynamic configuration)
 */
export function setCloudFunctionURL(url: string): void {
  if (typeof window !== 'undefined') {
    (window as any).__CLOUD_FUNCTION_URL__ = url;
    console.log('🔗 Cloud Function URL updated:', url);
  }
}
