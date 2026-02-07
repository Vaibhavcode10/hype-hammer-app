/**
 * Firebase Cloud Function Configuration
 * Initialize your Cloud Function URL here
 */

import { setCloudFunctionURL } from './services/cloudFunctionUploadService';

/**
 * Initialize Cloud Function URL
 * Call this in your App.tsx or main entry point
 */
export function initializeCloudFunctionConfig(): void {
  // Get URL from environment or use default
  const cloudFunctionURL = 
    (import.meta as any).env?.VITE_CLOUD_FUNCTION_URL ||
    'https://us-central1-axilam.cloudfunctions.net/auction';
  
  console.log('🔗 Cloud Function URL:', cloudFunctionURL);
  
  // Set the URL
  setCloudFunctionURL(cloudFunctionURL);
}

// Auto-initialize when module loads
if (typeof window !== 'undefined') {
  initializeCloudFunctionConfig();
}
