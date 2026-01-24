/**
 * Audio Service for WebRTC-based Auctioneer Audio Streaming
 * Auctioneer broadcasts audio to all participants in real-time
 */

import { socketService } from './socketService';

class AudioService {
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private localStream: MediaStream | null = null;
  private remoteAudio: HTMLAudioElement | null = null;
  
  // ICE servers for WebRTC (using public STUN servers)
  private iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  /**
   * Auctioneer: Start broadcasting audio
   */
  async startBroadcasting(seasonId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get microphone access
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });

      console.log('✅ Microphone access granted');

      // Notify server that auctioneer mic is ON
      socketService.emitAuctioneerMicOn(seasonId);

      return { success: true };
    } catch (error: any) {
      console.error('❌ Microphone access denied:', error);
      return { 
        success: false, 
        error: error.name === 'NotAllowedError' 
          ? 'Microphone permission denied. Please allow microphone access.' 
          : 'Failed to access microphone'
      };
    }
  }

  /**
   * Auctioneer: Stop broadcasting audio
   */
  stopBroadcasting(seasonId: string) {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Close all peer connections
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();

    // Notify server
    socketService.emitAuctioneerMicOff(seasonId);

    console.log('🎤 Broadcasting stopped');
  }

  /**
   * Auctioneer: Mute/unmute microphone
   */
  toggleMute(seasonId: string, mute: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !mute;
      });

      socketService.emitAuctioneerMicMute(seasonId, mute);
      console.log(mute ? '🔇 Microphone muted' : '🔊 Microphone unmuted');
    }
  }

  /**
   * Auctioneer: Create WebRTC connection for a new listener
   */
  async createBroadcastConnection(seasonId: string, listenerId: string): Promise<void> {
    if (!this.localStream) {
      console.error('No local stream available');
      return;
    }

    const peerConnection = new RTCPeerConnection({ iceServers: this.iceServers });

    // Add local audio track
    this.localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, this.localStream!);
    });

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socketService.emitAudioIceCandidate(seasonId, listenerId, event.candidate.toJSON());
      }
    };

    // Create and send offer
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    socketService.emitAudioOffer(seasonId, offer);

    // Store connection
    this.peerConnections.set(listenerId, peerConnection);
  }

  /**
   * Listener: Start receiving auctioneer audio
   */
  async startListening(seasonId: string, userId: string, role: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Create audio element for playback
      if (!this.remoteAudio) {
        this.remoteAudio = new Audio();
        this.remoteAudio.autoplay = true;
      }

      // Notify server that we want to listen
      socketService.joinAsAudioListener(seasonId, userId, role);

      // Setup WebRTC listeners
      this.setupListenerHandlers(seasonId);

      console.log('👂 Listening for auctioneer audio...');
      return { success: true };
    } catch (error: any) {
      console.error('❌ Failed to start listening:', error);
      return { success: false, error: 'Failed to initialize audio listener' };
    }
  }

  /**
   * Listener: Setup handlers for incoming audio
   */
  private setupListenerHandlers(seasonId: string) {
    // Handle incoming audio offer from auctioneer
    socketService.onAudioOffer(async (data) => {
      const { offer, auctioneerId } = data;

      const peerConnection = new RTCPeerConnection({ iceServers: this.iceServers });

      // Handle incoming audio track
      peerConnection.ontrack = (event) => {
        console.log('🎧 Receiving audio stream from auctioneer');
        if (this.remoteAudio && event.streams[0]) {
          this.remoteAudio.srcObject = event.streams[0];
        }
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socketService.emitAudioIceCandidate(seasonId, auctioneerId, event.candidate.toJSON());
        }
      };

      // Set remote description (offer) and create answer
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      // Send answer back to auctioneer
      socketService.emitAudioAnswer(seasonId, auctioneerId, answer);

      // Store connection
      this.peerConnections.set(auctioneerId, peerConnection);
    });

    // Handle incoming ICE candidates
    socketService.onAudioIceCandidate(async (data) => {
      const { candidate } = data;
      
      // Add ICE candidate to all peer connections
      for (const pc of this.peerConnections.values()) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
      }
    });

    // Handle answer from listener (if auctioneer)
    socketService.onAudioAnswer(async (data) => {
      const { answer } = data;
      
      for (const pc of this.peerConnections.values()) {
        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
      }
    });
  }

  /**
   * Listener: Stop listening
   */
  stopListening() {
    if (this.remoteAudio) {
      this.remoteAudio.pause();
      this.remoteAudio.srcObject = null;
    }

    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();

    console.log('🔇 Stopped listening');
  }

  /**
   * Check if currently broadcasting
   */
  isBroadcasting(): boolean {
    return this.localStream !== null && this.localStream.getTracks().length > 0;
  }

  /**
   * Check if currently listening
   */
  isListening(): boolean {
    return this.peerConnections.size > 0;
  }

  /**
   * Get local stream (for testing/visualization)
   */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /**
   * Cleanup all connections
   */
  cleanup() {
    this.stopBroadcasting('');
    this.stopListening();
  }
}

export const audioService = new AudioService();
export default audioService;
