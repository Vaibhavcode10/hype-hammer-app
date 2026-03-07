/**
 * Image URL Validation Utility
 * Handles validation of image URLs to prevent 404 errors from invalid data
 */

/**
 * Check if a URL is valid and not just an ID or empty string
 * Prevents loading resources like "match-1769088913489" as image URLs
 */
// Track which invalid URLs we've already warned about to prevent log spam
const warnedUrls = new Set<string>();

export const isValidImageUrl = (url: any): boolean => {
  if (!url || typeof url !== 'string') return false;
  if (url.trim() === '') return false;
  
  // Check if it looks like a valid absolute or relative URL
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) {
    return true;
  }
  
  // IMPORTANT: data: URLs (base64 images) are VALID image URLs
  if (url.startsWith('data:image/')) {
    return true;
  }
  
  // Check if it looks like a placeholder ID (e.g., "match-123456" or just a number)
  // This catches cases where matchId or other IDs are mistakenly used as image URLs
  if (/^(match|player|team|auction|season|bid)-?[\w-]{0,30}$/.test(url)) {
    // Only warn once per URL to prevent log spam
    if (!warnedUrls.has(url)) {
      warnedUrls.add(url);
      console.warn(`⚠️ Invalid image URL detected (appears to be an ID, not a URL): "${url}"`);
    }
    return false;
  }
  
  // If it doesn't look like a recognizable URL pattern, reject it
  // Only warn once per URL (truncate for logging)
  const urlKey = url.length > 50 ? url.substring(0, 50) : url;
  if (!warnedUrls.has(urlKey)) {
    warnedUrls.add(urlKey);
    console.warn(`⚠️ Invalid image URL detected (not a recognized URL format): "${url.substring(0, 100)}..."`);
  }
  return false;
};

/**
 * Get a safe image URL with fallback
 * Returns the URL if valid, otherwise returns null
 */
export const getSafeImageUrl = (url: any): string | null => {
  return isValidImageUrl(url) ? url : null;
};

/**
 * Create an error handler for image load failures
 * Useful for debugging 404 errors
 */
export const createImageErrorHandler = (context: string, url?: string) => {
  return (e: any) => {
    console.error(`❌ Failed to load ${context}: ${url || e.currentTarget.src}`);
    // Optionally hide the broken image
    if (e.currentTarget) {
      e.currentTarget.style.display = 'none';
    }
  };
};
