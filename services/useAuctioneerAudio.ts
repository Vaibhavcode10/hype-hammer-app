import { useState, useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';

/**
 * WebRTC Audio Hook for Auctioneer
 * 
 * Handles:
 * - Microphone access
 * - WebRTC peer connections
 * - Audio streaming to all listeners
 * - Signaling through Socket.IO
 */

interface UseAuctioneerAudioProps {
  socket: Socket | null;
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
  socket,
  seasonId,
  userId,
  enabled
}: UseAuctioneerAudioProps): UseAuctioneerAudioReturn => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  /**
   * Start audio streaming
   */
  const startStreaming = useCallback(async () => {
    if (!enabled || !socket) {
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

      // Notify server that auctioneer is live
      socket.emit('auctioneer_audio_start', {
        seasonId,
        userId
      });

      console.log('🎙️ Auctioneer audio streaming started');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access microphone';
      setError(errorMessage);
      console.error('Microphone access error:', err);
    }
  }, [enabled, socket, seasonId, userId]);

  /**
   * Stop audio streaming
   */
  const stopStreaming = useCallback(() => {
    // Stop all tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // Close all peer connections
    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();

    setIsStreaming(false);
    setIsMuted(false);

    // Notify server
    if (socket) {
      socket.emit('auctioneer_audio_stop', {
        seasonId,
        userId
      });
    }

    console.log('🎙️ Auctioneer audio streaming stopped');
  }, [socket, seasonId, userId]);

  /**
   * Toggle mute
   */
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);

        // Notify server
        if (socket) {
          socket.emit('auctioneer_audio_mute', {
            seasonId,
            userId,
            muted: !audioTrack.enabled
          });
        }
      }
    }
  }, [socket, seasonId, userId]);

  /**
   * Handle WebRTC signaling for new listener
   */
  const handleNewListener = useCallback(async (listenerId: string) => {
    if (!localStreamRef.current || !socket) return;

    try {
      // Create peer connection
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      // Add audio track
      localStreamRef.current.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStreamRef.current!);
      });

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('audio_ice_candidate', {
            seasonId,
            to: listenerId,
            candidate: event.candidate
          });
        }
      };

      // Create offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      // Send offer to listener
      socket.emit('audio_offer', {
        seasonId,
        to: listenerId,
        offer: peerConnection.localDescription
      });

      peerConnectionsRef.current.set(listenerId, peerConnection);
    } catch (err) {
      console.error('Failed to create peer connection:', err);
    }
  }, [socket, seasonId]);

  /**
   * Handle answer from listener
   */
  const handleAnswer = useCallback(async (data: { from: string; answer: RTCSessionDescriptionInit }) => {
    const peerConnection = peerConnectionsRef.current.get(data.from);
    if (peerConnection) {
      try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
      } catch (err) {
        console.error('Failed to set remote description:', err);
      }
    }
  }, []);

  /**
   * Handle ICE candidate from listener
   */
  const handleIceCandidate = useCallback(async (data: { from: string; candidate: RTCIceCandidateInit }) => {
    const peerConnection = peerConnectionsRef.current.get(data.from);
    if (peerConnection) {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (err) {
        console.error('Failed to add ICE candidate:', err);
      }
    }
  }, []);

  /**
   * Socket event listeners
   */
  useEffect(() => {
    if (!socket || !isStreaming) return;

    socket.on('audio_listener_joined', handleNewListener);
    socket.on('audio_answer', handleAnswer);
    socket.on('audio_ice_candidate_listener', handleIceCandidate);

    return () => {
      socket.off('audio_listener_joined', handleNewListener);
      socket.off('audio_answer', handleAnswer);
      socket.off('audio_ice_candidate_listener', handleIceCandidate);
    };
  }, [socket, isStreaming, handleNewListener, handleAnswer, handleIceCandidate]);

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
