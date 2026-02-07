/**
 * Cloud Function File Upload Service
 * Handles file uploads to Firebase via Cloud Functions API
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

/**
 * Upload player photo via Cloud Function
 */
export async function uploadPlayerPhotoViaAPI(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  return uploadFileViaAPI(file, 'player-photo', onProgress);
}

/**
 * Upload team logo via Cloud Function
 */
export async function uploadTeamLogoViaAPI(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  return uploadFileViaAPI(file, 'team-logo', onProgress);
}

/**
 * Upload user profile picture via Cloud Function
 */
export async function uploadProfilePictureViaAPI(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  return uploadFileViaAPI(file, 'profile-picture', onProgress);
}

/**
 * Upload document (PDF, authorization letter, ID, etc.) via Cloud Function
 */
export async function uploadDocumentViaAPI(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  return uploadFileViaAPI(file, 'document', onProgress);
}

/**
 * Upload auction recording via Cloud Function
 */
export async function uploadAuctionRecordingViaAPI(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  return uploadFileViaAPI(file, 'auction-recording', onProgress);
}

/**
 * Upload auction replay via Cloud Function
 */
export async function uploadAuctionReplayViaAPI(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  return uploadFileViaAPI(file, 'auction-replay', onProgress);
}

/**
 * Upload match highlight video via Cloud Function
 */
export async function uploadMatchHighlightViaAPI(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  return uploadFileViaAPI(file, 'match-highlight', onProgress);
}

/**
 * Generic file upload function
 * Calls the Cloud Function API endpoint
 * 
 * @param file - File to upload
 * @param uploadType - Type of upload ('player-photo', 'team-logo', 'document', etc.)
 * @param onProgress - Optional callback for upload progress
 * @returns Download URL of the uploaded file
 */
export async function uploadFileViaAPI(
  file: File,
  uploadType: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    // Validate file
    if (!file) {
      throw new Error('No file provided');
    }

    if (!uploadType) {
      throw new Error('No upload type specified');
    }

    console.log(`📤 Starting upload: ${file.name} (type: ${uploadType})`);

    // Create FormData
    const formData = new FormData();
    formData.append('file', file);

    // Build API URL
    const apiUrl = `${CLOUD_FUNCTION_URL}/upload/${uploadType}`;
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
