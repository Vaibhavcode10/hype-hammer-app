/**
 * Socket Service - Now using Firebase Firestore for real-time updates
 * This file re-exports the Firebase Realtime Service for backward compatibility
 * 
 * All real-time functionality is now handled via Firestore onSnapshot listeners
 */

// Export Firebase Realtime Service as socketService for backward compatibility
export { firebaseRealtimeService as socketService } from './firebaseRealtimeService';
export { firebaseRealtimeService as default } from './firebaseRealtimeService';