import React, { useEffect, useState, useCallback } from 'react';
import { LiveAuctionRoom } from '../ui/LiveAuctionRoom';
import { useAuctioneerAudio } from '../../services/useAuctioneerAudio';
import { useAudioListener } from '../../services/useAudioListener';
import socketService from '../../services/socketService';
import { 
  LiveAuctionState, 
  LiveAuctionStatus,
  Player, 
  Team, 
  UserRole,
  LiveRoomPermissions 
} from '../../types';
import apiService from '../../services/apiService';

interface LiveAuctionPageProps {
  seasonId: string;
  userId: string;
  userRole: UserRole;
  userTeamId?: string;
  onClose?: () => void;
}

/**
 * LiveAuctionPage - Complete integration example
 * 
 * This shows how each role integrates the LiveAuctionRoom:
 * - Admin: Full control over auction lifecycle
 * - Auctioneer: Controls bidding + mic
 * - Team Rep: Places bids
 * - Player: Watches own status
 * - Guest: Spectates only
 */
export const LiveAuctionPage: React.FC<LiveAuctionPageProps> = ({
  seasonId,
  userId,
  userRole,
  userTeamId,
  onClose
}) => {
  // State
  const [auctionState, setAuctionState] = useState<LiveAuctionState | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  // Calculate permissions based on role
  const permissions: LiveRoomPermissions = {
    role: userRole,
    canBid: userRole === UserRole.TEAM_REP,
    canSpeak: userRole === UserRole.AUCTIONEER,
    canControl: userRole === UserRole.AUCTIONEER,
    canOverride: userRole === UserRole.ADMIN,
    canViewAll: true
  };

  // Audio hooks
  const auctioneerAudio = useAuctioneerAudio({
    socket: socketService.getSocket(),
    seasonId,
    userId,
    enabled: userRole === UserRole.AUCTIONEER
  });

  const listenerAudio = useAudioListener({
    socket: socketService.getSocket(),
    seasonId,
    userId
  });

  /**
   * Connect to server and join season room
   */
  useEffect(() => {
    const socket = socketService.connect();
    
    socket.on('connect', () => {
      console.log('✅ Connected to server');
      socketService.joinSeason(seasonId, userId, userRole);
    });

    // Load initial data
    loadAuctionData();

    return () => {
      socketService.leaveSeason(seasonId);
    };
  }, [seasonId, userId, userRole]);

  /**
   * Load auction data
   */
  const loadAuctionData = async () => {
    try {
      // Load teams
      const teamsResponse = await apiService.get(`/api/teams?seasonId=${seasonId}`);
      if (teamsResponse.success) {
        setTeams(teamsResponse.data);
      }

      // Load players
      const playersResponse = await apiService.get(`/api/players?seasonId=${seasonId}`);
      if (playersResponse.success) {
        setPlayers(playersResponse.data);
      }

      // Load auction state
      const stateResponse = await apiService.get(`/api/auction/state/${seasonId}`);
      if (stateResponse.success) {
        setAuctionState(stateResponse.data);
        
        // Load current player if bidding is active
        if (stateResponse.data.currentPlayerId) {
          const playerResponse = await apiService.get(`/api/players/${stateResponse.data.currentPlayerId}`);
          if (playerResponse.success) {
            setCurrentPlayer(playerResponse.data);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load auction data:', error);
    }
  };

  /**
   * Socket event listeners
   */
  useEffect(() => {
    // Auction state updates
    socketService.onAuctionStateUpdate((state) => {
      console.log('📡 Auction state updated:', state);
      setAuctionState(prev => ({ ...prev, ...state }));
    });

    // Auction started
    socketService.onAuctionStarted((data) => {
      console.log('🎬 Auction started!');
      setAuctionState(prev => prev ? { ...prev, status: LiveAuctionStatus.LIVE } : null);
    });

    // Auction paused
    socketService.onAuctionPaused((data) => {
      console.log('⏸️ Auction paused');
      setAuctionState(prev => prev ? { ...prev, status: LiveAuctionStatus.PAUSED } : null);
    });

    // Auction resumed
    socketService.onAuctionResumed((data) => {
      console.log('▶️ Auction resumed');
      setAuctionState(prev => prev ? { ...prev, status: LiveAuctionStatus.LIVE } : null);
    });

    // Auction ended
    socketService.onAuctionEnded((data) => {
      console.log('🏁 Auction ended');
      setAuctionState(prev => prev ? { ...prev, status: LiveAuctionStatus.ENDED } : null);
    });

    // Timer updates (server-controlled)
    socketService.onTimerUpdate((data) => {
      setRemainingSeconds(data.remainingSeconds);
    });

    // Player bidding started
    socketService.onPlayerBiddingStarted((data) => {
      console.log('🎯 Bidding started for player:', data.player.name);
      setCurrentPlayer(data.player);
      setAuctionState(prev => prev ? {
        ...prev,
        currentPlayerId: data.player.id,
        currentPlayerName: data.player.name,
        currentBid: data.basePrice,
        leadingTeamId: null,
        leadingTeamName: null,
        biddingActive: true,
        bidHistory: []
      } : null);
    });

    // New bid placed
    socketService.onNewBid((data) => {
      console.log('💰 New bid:', data.teamName, '-', data.amount);
      setAuctionState(prev => {
        if (!prev) return null;
        
        const newHistory = [...(prev.bidHistory || []), {
          teamId: data.teamId,
          teamName: data.teamName,
          amount: data.amount,
          timestamp: data.timestamp
        }];

        return {
          ...prev,
          currentBid: data.amount,
          leadingTeamId: data.teamId,
          leadingTeamName: data.teamName,
          bidHistory: newHistory
        };
      });
    });

    // Player sold
    socketService.onPlayerSold((data) => {
      console.log('✅ Player sold:', data.playerName, 'to', data.teamName);
      
      // Update player status
      setPlayers(prev => prev.map(p => 
        p.id === data.playerId 
          ? { ...p, status: 'SOLD', teamId: data.teamId, soldPrice: data.finalAmount }
          : p
      ));

      // Update team
      setTeams(prev => prev.map(t => 
        t.id === data.teamId
          ? { 
              ...t, 
              players: [...t.players, data.playerId],
              remainingBudget: t.remainingBudget - data.finalAmount
            }
          : t
      ));

      // Reset bidding state
      setCurrentPlayer(null);
      setAuctionState(prev => prev ? {
        ...prev,
        currentPlayerId: null,
        currentPlayerName: null,
        currentBid: 0,
        leadingTeamId: null,
        leadingTeamName: null,
        biddingActive: false,
        bidHistory: []
      } : null);
    });

    // Player unsold
    socketService.onPlayerUnsold((data) => {
      console.log('❌ Player unsold:', data.playerName);
      
      // Update player status
      setPlayers(prev => prev.map(p => 
        p.id === data.playerId 
          ? { ...p, status: 'UNSOLD' }
          : p
      ));

      // Reset bidding state
      setCurrentPlayer(null);
      setAuctionState(prev => prev ? {
        ...prev,
        currentPlayerId: null,
        currentPlayerName: null,
        currentBid: 0,
        leadingTeamId: null,
        leadingTeamName: null,
        biddingActive: false,
        bidHistory: []
      } : null);
    });

    return () => {
      socketService.removeAllListeners();
    };
  }, []);

  /**
   * Action Handlers
   */

  // Admin: Start auction
  const handleStartAuction = useCallback(async () => {
    try {
      await apiService.post('/api/auction/start', { seasonId });
    } catch (error) {
      console.error('Failed to start auction:', error);
    }
  }, [seasonId]);

  // Admin: Pause auction
  const handlePauseAuction = useCallback(async () => {
    try {
      await apiService.post('/api/auction/pause', { seasonId });
    } catch (error) {
      console.error('Failed to pause auction:', error);
    }
  }, [seasonId]);

  // Admin: Resume auction
  const handleResumeAuction = useCallback(async () => {
    try {
      await apiService.post('/api/auction/resume', { seasonId });
    } catch (error) {
      console.error('Failed to resume auction:', error);
    }
  }, [seasonId]);

  // Admin: End auction
  const handleEndAuction = useCallback(async () => {
    try {
      await apiService.post('/api/auction/end', { seasonId });
    } catch (error) {
      console.error('Failed to end auction:', error);
    }
  }, [seasonId]);

  // Auctioneer: Start bidding for player
  const handleStartBidding = useCallback(async (playerId: string, basePrice: number) => {
    try {
      await apiService.post('/api/auction/player/start', {
        seasonId,
        playerId,
        basePrice
      });
    } catch (error) {
      console.error('Failed to start player bidding:', error);
    }
  }, [seasonId]);

  // Auctioneer: Close bidding
  const handleCloseBidding = useCallback(async (sold: boolean) => {
    try {
      await apiService.post('/api/auction/player/close', {
        seasonId,
        sold
      });
    } catch (error) {
      console.error('Failed to close bidding:', error);
    }
  }, [seasonId]);

  // Team: Place bid
  const handlePlaceBid = useCallback(async (amount: number) => {
    if (!userTeamId) {
      console.error('No team ID');
      return;
    }

    try {
      await apiService.post('/api/auction/bid', {
        seasonId,
        teamId: userTeamId,
        amount
      });
    } catch (error) {
      console.error('Failed to place bid:', error);
    }
  }, [seasonId, userTeamId]);

  // Auctioneer: Toggle mic
  const handleToggleMic = useCallback(() => {
    if (auctioneerAudio.isStreaming) {
      auctioneerAudio.toggleMute();
    } else {
      auctioneerAudio.startStreaming();
    }
  }, [auctioneerAudio]);

  return (
    <div className="w-full h-screen">
      <LiveAuctionRoom
        auctionState={auctionState}
        currentPlayer={currentPlayer}
        teams={teams}
        userId={userId}
        userRole={userRole}
        userTeamId={userTeamId}
        permissions={permissions}
        remainingSeconds={remainingSeconds}
        auctioneerMicOn={auctioneerAudio.isStreaming && !auctioneerAudio.isMuted}
        onStartBidding={permissions.canControl ? handleStartBidding : undefined}
        onCloseBidding={permissions.canControl ? handleCloseBidding : undefined}
        onPlaceBid={permissions.canBid ? handlePlaceBid : undefined}
        onStartAuction={permissions.canOverride ? handleStartAuction : undefined}
        onPauseAuction={permissions.canOverride ? handlePauseAuction : undefined}
        onResumeAuction={permissions.canOverride ? handleResumeAuction : undefined}
        onEndAuction={permissions.canOverride ? handleEndAuction : undefined}
        onToggleMic={permissions.canSpeak ? handleToggleMic : undefined}
        onClose={onClose}
      />
    </div>
  );
};
