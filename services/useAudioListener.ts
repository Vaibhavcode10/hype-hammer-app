import { useState, useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';

/**
 * WebRTC Audio Listener Hook
 * 
 * Handles:
 * - Receiving auctioneer's audio stream
 * - WebRTC peer connection setup
 * - Audio playback
 * - Signaling through Socket.IO
 */

interface UseAudioListenerProps {
  socket: Socket | null;
  seasonId: string;
  userId: string;
}

interface UseAudioListenerReturn {
  isConnected: boolean;
  isPlaying: boolean;
  volume: number;
  error: string | null;
  setVolume: (volume: number) => void;
  togglePlayback: () => void;
}

export const useAudioListener = ({
  socket,
  seasonId,
  userId
}: UseAudioListenerProps): UseAudioListenerReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolumeState] = useState(1.0);
  const [error, setError] = useState<string | null>(null);
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  /**
   * Initialize audio element
   */
  useEffect(() => {
    if (!audioElementRef.current) {
      audioElementRef.current = new Audio();
      audioElementRef.current.autoplay = true;
    }
    return () => {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.srcObject = null;
      }
    };
  }, []);

  /**
   * Set volume
   */
  const setVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clampedVolume);
    if (audioElementRef.current) {
      audioElementRef.current.volume = clampedVolume;
    }
  }, []);

  /**
   * Toggle playback
   */
  const togglePlayback = useCallback(() => {
    if (audioElementRef.current) {
      if (isPlaying) {
        audioElementRef.current.pause();
      } else {
        audioElementRef.current.play().catch(err => {
          console.error('Failed to play audio:', err);
        });
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  /**
   * Handle audio offer from auctioneer
   */
  const handleOffer = useCallback(async (data: { from: string; offer: RTCSessionDescriptionInit }) => {
    if (!socket) return;

    try {
      // Create peer connection
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      peerConnectionRef.current = peerConnection;

      // Handle incoming audio track
      peerConnection.ontrack = (event) => {
        console.log('📻 Received audio track from auctioneer');
        const [remoteStream] = event.streams;
        remoteStreamRef.current = remoteStream;

        if (audioElementRef.current) {
          audioElementRef.current.srcObject = remoteStream;
          audioElementRef.current.volume = volume;
          setIsConnected(true);
          setError(null);
        }
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('audio_ice_candidate', {
            seasonId,
            to: data.from,
            candidate: event.candidate
          });
        }
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', peerConnection.connectionState);
        if (peerConnection.connectionState === 'disconnected' || 
            peerConnection.connectionState === 'failed') {
          setIsConnected(false);
          setError('Audio connection lost');
        }
      };

      // Set remote description and create answer
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      // Send answer back to auctioneer
      socket.emit('audio_answer', {
        seasonId,
        to: data.from,
        answer: peerConnection.localDescription
      });

    } catch (err) {
      console.error('Failed to handle audio offer:', err);
      setError('Failed to connect to audio stream');
    }
  }, [socket, seasonId, volume]);

  /**
   * Handle ICE candidate from auctioneer
   */
  const handleIceCandidate = useCallback(async (data: { from: string; candidate: RTCIceCandidateInit }) => {
    if (peerConnectionRef.current) {
      try {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (err) {
        console.error('Failed to add ICE candidate:', err);
      }
    }
  }, []);

  /**
   * Handle auctioneer audio start
   */
  const handleAuctioneerStart = useCallback(() => {
    console.log('🎙️ Auctioneer started streaming');
    setError(null);
    
    // Request to join as listener
    if (socket) {
      socket.emit('audio_listener_join', {
        seasonId,
        userId
      });
    }
  }, [socket, seasonId, userId]);

  /**
   * Handle auctioneer audio stop
   */
  const handleAuctioneerStop = useCallback(() => {
    console.log('🎙️ Auctioneer stopped streaming');
    setIsConnected(false);
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    if (audioElementRef.current) {
      audioElementRef.current.srcObject = null;
    }
  }, []);

  /**
   * Handle auctioneer mute/unmute
   */
  const handleAuctioneerMute = useCallback((data: { muted: boolean }) => {
    console.log(`🎙️ Auctioneer ${data.muted ? 'muted' : 'unmuted'}`);
    // Audio track will automatically be enabled/disabled
  }, []);

  /**
   * Socket event listeners
   */
  useEffect(() => {
    if (!socket) return;

    socket.on('audio_offer', handleOffer);
    socket.on('audio_ice_candidate_auctioneer', handleIceCandidate);
    socket.on('auctioneer_audio_started', handleAuctioneerStart);
    socket.on('auctioneer_audio_stopped', handleAuctioneerStop);
    socket.on('auctioneer_audio_muted', handleAuctioneerMute);

    // Request current audio state
    socket.emit('audio_check_status', { seasonId });

    return () => {
      socket.off('audio_offer', handleOffer);
      socket.off('audio_ice_candidate_auctioneer', handleIceCandidate);
      socket.off('auctioneer_audio_started', handleAuctioneerStart);
      socket.off('auctioneer_audio_stopped', handleAuctioneerStop);
      socket.off('auctioneer_audio_muted', handleAuctioneerMute);
    };
  }, [socket, handleOffer, handleIceCandidate, handleAuctioneerStart, handleAuctioneerStop, handleAuctioneerMute, seasonId]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.srcObject = null;
      }
    };
  }, []);

  return {
    isConnected,
    isPlaying,
    volume,
    error,
    setVolume,
    togglePlayback
  };
};
