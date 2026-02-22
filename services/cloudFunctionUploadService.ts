/**
 * Cloud Function File Upload Service
 * Handles file uploads to Firebase via Cloud Functions API
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

// Get Cloud Function URL from window (set in index.tsx) or use default
function getCloudFunctionBaseURL(): string {
  if (typeof window !== 'undefined' && (window as any).__CLOUD_FUNCTION_URL__) {
    return (window as any).__CLOUD_FUNCTION_URL__;
  }
  return 'https://us-central1-axilam.cloudfunctions.net/auction';
}

const CLOUD_FUNCTION_URL = getCloudFunctionBaseURL();

interface UploadResponse {
  success: boolean;
  url?: string;
  filename?: string;
  fileType?: string;
  uploadedAt?: string;
  error?: string;
}

interface UploadOptions {
  onProgress?: (progress: number) => void;
  matchName?: string;  // Match/Season name for folder organization (e.g., 'WPL', 'IPL 2026')
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

    console.log(`📤 Starting upload: ${file.name} (type: ${uploadType}${matchName ? `, match: ${matchName}` : ''})`);

    // Create FormData
    const formData = new FormData();
    formData.append('file', file);

    // Build API URL with matchName query param if provided
    let apiUrl = `${CLOUD_FUNCTION_URL}/upload/${uploadType}`;
    if (matchName) {
      const encodedMatchName = encodeURIComponent(matchName);
      apiUrl += `?matchName=${encodedMatchName}`;
    }
    console.log(`📍 API Endpoint: ${apiUrl}`);

    // Create XMLHttpRequest for progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const percentComplete = (event.loaded / event.total) * 100;
          console.log(`⏳ Upload progress: ${percentComplete.toFixed(2)}%`);
          onProgress(percentComplete);
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            
            if (response.success && response.url) {
              console.log(`✅ Upload successful: ${response.url}`);
              onProgress?.(100);
              resolve(response.url);
            } else {
              reject(new Error(response.error || 'Upload failed'));
            }
          } catch (e) {
            reject(new Error('Invalid response from server'));
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            reject(new Error(error.error || `Upload failed with status ${xhr.status}`));
          } catch (e) {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload aborted'));
      });

      // Send request
      xhr.open('POST', apiUrl);
      xhr.send(formData);
    });
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
