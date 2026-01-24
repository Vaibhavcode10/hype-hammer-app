/**
 * React Hook for Listening to Auctioneer Audio
 * Use in Team, Player, Guest, Admin dashboards
 */

import { useEffect, useState } from 'react';
import { audioService } from '../services/audioService';
import { socketService } from '../services/socketService';

interface UseAudioListenerOptions {
  seasonId: string | null;
  userId: string;
  role: string;
  enabled?: boolean; // Set to false to disable listening
}

interface AudioListenerState {
  isListening: boolean;
  auctioneerId: string | null;
  micStatus: 'on' | 'off' | 'muted';
  error: string | null;
  latestAnnouncement: string | null;
}

export const useAudioListener = (options: UseAudioListenerOptions) => {
  const { seasonId, userId, role, enabled = true } = options;

  const [state, setState] = useState<AudioListenerState>({
    isListening: false,
    auctioneerId: null,
    micStatus: 'off',
    error: null,
    latestAnnouncement: null
  });

  useEffect(() => {
    if (!seasonId || !enabled) return;

    let mounted = true;

    // Start listening to auctioneer
    const startListening = async () => {
      const result = await audioService.startListening(seasonId, userId, role);
      
      if (mounted) {
        if (result.success) {
          setState(prev => ({ ...prev, isListening: true, error: null }));
        } else {
          setState(prev => ({ ...prev, error: result.error || 'Failed to connect' }));
        }
      }
    };

    // Setup socket listeners
    socketService.onAuctioneerMicOn((data) => {
      console.log('🎤 Auctioneer microphone is ON');
      if (mounted) {
        setState(prev => ({ 
          ...prev, 
          micStatus: 'on',
          auctioneerId: data.auctioneerId 
        }));
      }
    });

    socketService.onAuctioneerMicOff(() => {
      console.log('🎤 Auctioneer microphone is OFF');
      if (mounted) {
        setState(prev => ({ ...prev, micStatus: 'off' }));
      }
    });

    socketService.onAuctioneerMicMute((data) => {
      console.log(`🎤 Auctioneer microphone ${data.muted ? 'MUTED' : 'UNMUTED'}`);
      if (mounted) {
        setState(prev => ({ 
          ...prev, 
          micStatus: data.muted ? 'muted' : 'on' 
        }));
      }
    });

    socketService.onAuctioneerAnnouncement((data) => {
      console.log('📢 Auctioneer announcement:', data.message);
      if (mounted) {
        setState(prev => ({ ...prev, latestAnnouncement: data.message }));

        // Clear announcement after 3 seconds
        setTimeout(() => {
          if (mounted) {
            setState(prev => ({ ...prev, latestAnnouncement: null }));
          }
        }, 3000);
      }
    });

    startListening();

    // Cleanup
    return () => {
      mounted = false;
      audioService.stopListening();
    };
  }, [seasonId, userId, role, enabled]);

  return state;
};
