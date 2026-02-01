import { useState, useEffect, useRef, useCallback } from 'react';
import { firebaseRealtimeService } from './firebaseRealtimeService';

/**
 * WebRTC Audio Listener Hook
 * 
 * Handles:
 * - Receiving auctioneer's audio stream
 * - WebRTC peer connection setup
 * - Audio playback
 * - Signaling through Firebase Realtime Database
 */

interface UseAudioListenerProps {
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
  seasonId,
  userId
}: UseAudioListenerProps): UseAudioListenerReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolumeState] = useState(1.0);
  const [error, setError] = useState<string | null>(null);
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const unsubscribesRef = useRef<Array<() => void>>([]);

  // Setup ICE server configuration
  const iceServers = [
    { urls: ['stun:stun.l.google.com:19302'] },
    { urls: ['stun:stun1.l.google.com:19302'] }
  ];

  const setupPeerConnection = useCallback(async () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    const peerConnection = new RTCPeerConnection({
      iceServers
    });

    peerConnection.ontrack = (event: RTCTrackEvent) => {
      console.log('🎙️ Received audio track');
      if (audioElementRef.current) {
        audioElementRef.current.srcObject = new MediaStream([event.track]);
        audioElementRef.current.play().catch(e => console.error('Failed to play audio:', e));
        setIsConnected(true);
      }
    };

    peerConnection.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      if (event.candidate) {
        firebaseRealtimeService.emitAudioIceCandidate(seasonId, userId, event.candidate);
      }
    };

    peerConnection.onconnectionstatechange = () => {
      console.log('📡 Connection state:', peerConnection.connectionState);
      if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'disconnected') {
        setError('Connection lost');
        setIsConnected(false);
      }
    };

    peerConnectionRef.current = peerConnection;
  }, [seasonId, userId]);

  const handleOffer = useCallback(async (offerData: any) => {
    try {
      if (!peerConnectionRef.current) {
        await setupPeerConnection();
      }

      const offer = offerData.offer as RTCSessionDescriptionInit;
      await peerConnectionRef.current!.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await peerConnectionRef.current!.createAnswer();
      await peerConnectionRef.current!.setLocalDescription(answer);

      await firebaseRealtimeService.emitAudioAnswer(seasonId, offerData.auctioneerId, answer);
      console.log('✅ Audio answer sent');
    } catch (err) {
      console.error('Error handling offer:', err);
      setError('Failed to establish audio connection');
    }
  }, [seasonId, setupPeerConnection]);

  const handleIceCandidate = useCallback(async (candidateData: any) => {
    try {
      if (peerConnectionRef.current && candidateData.candidate) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidateData.candidate));
      }
    } catch (err) {
      console.error('Error adding ICE candidate:', err);
    }
  }, []);

  const handleAuctioneerStart = useCallback(() => {
    console.log('🎙️ Auctioneer started streaming');
    setError(null);
  }, []);

  const handleAuctioneerStop = useCallback(() => {
    console.log('🎙️ Auctioneer stopped streaming');
    setIsConnected(false);
    if (audioElementRef.current) {
      audioElementRef.current.srcObject = null;
    }
  }, []);

  const handleAuctioneerMute = useCallback((data: any) => {
    console.log('🎙️ Auctioneer muted:', data.muted);
  }, []);

  // Setup listeners
  useEffect(() => {
    // Join as audio listener
    firebaseRealtimeService.joinAsAudioListener(seasonId, userId, 'listener');

    // Setup peer connection
    setupPeerConnection();

    // Setup Firebase listeners
    const unsubscribes: Array<() => void> = [];

    if (firebaseRealtimeService.isConnected()) {
      const audioOfferUnsub = firebaseRealtimeService.onAudioOffer(handleOffer);
      const iceCandidateUnsub = firebaseRealtimeService.onAudioIceCandidate(handleIceCandidate);
      const audioStartUnsub = firebaseRealtimeService.onAuctioneerMicOn(handleAuctioneerStart);
      const audioStopUnsub = firebaseRealtimeService.onAuctioneerMicOff(handleAuctioneerStop);
      const audioMuteUnsub = firebaseRealtimeService.onAuctioneerMicMute(handleAuctioneerMute);

      unsubscribes.push(audioOfferUnsub, iceCandidateUnsub, audioStartUnsub, audioStopUnsub, audioMuteUnsub);
    }

    unsubscribesRef.current = unsubscribes;

    return () => {
      unsubscribes.forEach(unsub => unsub());
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (audioElementRef.current) {
        audioElementRef.current.srcObject = null;
      }
    };
  }, [seasonId, userId, setupPeerConnection, handleOffer, handleIceCandidate, handleAuctioneerStart, handleAuctioneerStop, handleAuctioneerMute]);

  // Setup audio element
  useEffect(() => {
    if (!audioElementRef.current) {
      const audioElement = document.createElement('audio');
      audioElement.autoplay = true;
      audioElement.controls = false;
      document.body.appendChild(audioElement);
      audioElementRef.current = audioElement;
    }

    return () => {
      if (audioElementRef.current && audioElementRef.current.parentElement) {
        audioElementRef.current.parentElement.removeChild(audioElementRef.current);
        audioElementRef.current = null;
      }
    };
  }, []);

  // Update volume
  const setVolume = useCallback((newVolume: number) => {
    setVolumeState(newVolume);
    if (audioElementRef.current) {
      audioElementRef.current.volume = newVolume;
    }
  }, []);

  // Toggle playback
  const togglePlayback = useCallback(() => {
    setIsPlaying(!isPlaying);
    if (audioElementRef.current) {
      if (isPlaying) {
        audioElementRef.current.pause();
      } else {
        audioElementRef.current.play().catch(e => console.error('Failed to play:', e));
      }
    }
  }, [isPlaying]);

  return {
    isConnected,
    isPlaying,
    volume,
    error,
    setVolume,
    togglePlayback
  };
};
