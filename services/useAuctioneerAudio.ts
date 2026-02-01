import { useState, useEffect, useRef, useCallback } from 'react';
import { firebaseRealtimeService } from './firebaseRealtimeService';

/**
 * WebRTC Audio Hook for Auctioneer
 * 
 * Note: Audio streaming functionality is currently disabled as the platform
 * migrated from Socket.IO to Firebase. WebRTC signaling through Firebase
 * would require additional implementation.
 * 
 * This hook provides stub functionality for backward compatibility.
 */

interface UseAuctioneerAudioProps {
  socket?: any; // Kept for backward compatibility
  seasonId: string;
  userId: string;
  enabled: boolean;
}

interface UseAuctioneerAudioReturn {
  isStreaming: boolean;
  isMuted: boolean;
  error: string | null;
  startStreaming: () => Promise<void>;
  stopStreaming: () => void;
  toggleMute: () => void;
}

export const useAuctioneerAudio = ({
  seasonId,
  userId,
  enabled
}: UseAuctioneerAudioProps): UseAuctioneerAudioReturn => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const localStreamRef = useRef<MediaStream | null>(null);

  /**
   * Start audio streaming
   * Note: Full WebRTC implementation pending Firebase migration
   */
  const startStreaming = useCallback(async () => {
    if (!enabled) {
      setError('Not authorized to stream audio');
      return;
    }

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        },
        video: false
      });

      localStreamRef.current = stream;
      setIsStreaming(true);
      setError(null);

      // Notify via Firebase that auctioneer mic is on
      await firebaseRealtimeService.emitAuctioneerMicOn(seasonId);

      console.log('🎙️ Auctioneer audio streaming started (local only)');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access microphone';
      setError(errorMessage);
      console.error('Microphone access error:', err);
    }
  }, [enabled, seasonId, userId]);

  /**
   * Stop audio streaming
   */
  const stopStreaming = useCallback(() => {
    // Stop all tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    setIsStreaming(false);
    setIsMuted(false);

    // Notify via Firebase that auctioneer mic is off
    firebaseRealtimeService.emitAuctioneerMicOff(seasonId);

    console.log('🎙️ Auctioneer audio streaming stopped');
  }, [seasonId, userId]);

  /**
   * Toggle mute
   */
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);

        // Notify via Firebase
        firebaseRealtimeService.emitAuctioneerMicMute(seasonId, !audioTrack.enabled);
      }
    }
  }, [seasonId, userId]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopStreaming();
    };
  }, [stopStreaming]);

  return {
    isStreaming,
    isMuted,
    error,
    startStreaming,
    stopStreaming,
    toggleMute
  };
};
