import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, Megaphone, AlertCircle, Clock, Trophy, Users, DollarSign, Activity, Bell, User, LogOut, Menu, Zap, CheckCircle, XCircle, Loader, Radio, TrendingUp, Plus, Minus, RotateCcw, ChevronRight, Shield, Timer, Hash, Calendar, Maximize2, Minimize2 } from 'lucide-react';
import { AuctionStatus, MatchData, UserRole, Player, Team } from '../../types';
import { socketService } from '../../services/socketService';
import { LiveAuctionPage } from './LiveAuctionPage';
import { PlayersPage } from './PlayersPage';

const API_BASE = 'https://us-central1-axilam.cloudfunctions.net/auction';

interface AuctioneerDashboardPageProps {
  setStatus: (status: AuctionStatus) => void;
  currentMatch: MatchData | null;
  currentUser: { name: string; email: string; role: UserRole };
}

interface AuctionState {
  status: 'READY' | 'LIVE' | 'PAUSED' | 'ENDED';
  currentPlayerId: string | null;
  currentPlayerName: string | null;
  currentBid: number;
  leadingTeamId: string | null;
  leadingTeamName: string | null;
  biddingActive: boolean;
  remainingSeconds: number;
}

interface BidEntry {
  id: string;
  teamId: string;
  teamName: string;
  amount: number;
  timestamp: number;
  order: number;
}

interface SystemLog {
  id: string;
  type: 'info' | 'warning' | 'error' | 'admin';
  message: string;
  timestamp: number;
}

export const AuctioneerDashboardPage: React.FC<AuctioneerDashboardPageProps> = ({ setStatus, currentMatch, currentUser }) => {
  // Approval state
  const [approvalStatus, setApprovalStatus] = useState<'checking' | 'pending' | 'approved' | 'rejected'>('checking');
  const [approvalMessage, setApprovalMessage] = useState('');
  const [auctioneerId, setAuctioneerId] = useState<string | null>(null);

  // Auction state
  const [auctionState, setAuctionState] = useState<AuctionState>({
    status: 'READY',
    currentPlayerId: null,
    currentPlayerName: null,
    currentBid: 0,
    leadingTeamId: null,
    leadingTeamName: null,
    biddingActive: false,
    remainingSeconds: 0
  });

  const [activeSection, setActiveSection] = useState<'dashboard' | 'liveRoom'>('dashboard');
  const [showPlayersPage, setShowPlayersPage] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [bidHistory, setBidHistory] = useState<BidEntry[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  
  // Bid-on-behalf-of-team state
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [customBidAmount, setCustomBidAmount] = useState<number>(0);
  const [bidUnit, setBidUnit] = useState<'lakh' | 'thousand'>('lakh');
  
  // Selected player for control
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  
  // Confirmation modals
  const [showConfirm, setShowConfirm] = useState<{ action: string; message: string } | null>(null);
  
  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Resizable columns state
  const [columnWidths, setColumnWidths] = useState({
    left: 33,    // 33%
    middle: 44,  // 44%
    right: 23    // 23%
  });
  const resizeRef = useRef<{ column: 'left' | 'middle' | 'right'; startX: number; startLeft: number; startMiddle: number; startRight: number } | null>(null);
  const columnWidthsRef = useRef(columnWidths);

  useEffect(() => {
    columnWidthsRef.current = columnWidths;
  }, [columnWidths]);
  
  // Quick announcements
  const [lastAnnouncement, setLastAnnouncement] = useState<string | null>(null);

  const auctionStateRef = useRef<AuctionState>(auctionState);
  const playersRef = useRef<Player[]>(players);

  useEffect(() => {
    auctionStateRef.current = auctionState;
  }, [auctionState]);

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  // Check auctioneer approval status
  useEffect(() => {
    const checkApprovalStatus = async () => {
      try {
        // Fetch auctioneer by email to get approval status
        const auctioneerResponse = await fetch(`${API_BASE}/auctioneers?email=${encodeURIComponent(currentUser.email)}`);
        const auctioneerData = await auctioneerResponse.json();

        if (!auctioneerData.success || !auctioneerData.data || auctioneerData.data.length === 0) {
          console.error('Auctioneer not found for email:', currentUser.email);
          setApprovalStatus('pending');
          setApprovalMessage('Registration not found. Please contact support.');
          return;
        }

        const auctioneer = auctioneerData.data[0];
        const fetchedAuctioneerId = auctioneer.id || auctioneer.auctioneerId;
        setAuctioneerId(fetchedAuctioneerId);

        // Get approval status from auctioneer object
        console.log('🔍 Auctioneer data received:', auctioneer);
        console.log('🔍 Raw approvalStatus field:', auctioneer.approvalStatus);
        console.log('🔍 Raw status field:', auctioneer.status);
        
        // Check both 'approvalStatus' and 'status' fields (database uses 'status')
        const statusField = auctioneer.approvalStatus || auctioneer.status || 'pending';
        const status = statusField.toLowerCase();
        console.log('✅ Final approval status:', status);
        setApprovalStatus(status);

        if (status === 'pending') {
          const matchName = currentMatch?.name || 'this season';
          setApprovalMessage(`Your application for ${matchName} is under review. You will get access once the organizer approves.`);
        } else if (status === 'rejected') {
          setApprovalMessage('Your application was not approved. Please contact the organizer for more details.');
        }
      } catch (error) {
        console.error('Failed to check approval status:', error);
        setApprovalStatus('pending');
        setApprovalMessage('Unable to check approval status. Please try again later.');
      }
    };

    checkApprovalStatus();
  }, [currentUser.email, currentMatch?.name]);

  // Connect to WebSocket and join season
  useEffect(() => {
    if (approvalStatus !== 'approved' || !auctioneerId || !currentMatch) return;

    // Connect to server
    // socketService.connect('http://localhost:5000'); // Disabled: Cloud Functions don't support WebSocket

    // Join season room
    socketService.joinSeason(currentMatch.id, auctioneerId, currentUser.role);

    const unsubscribers: Array<() => void> = [];

    // Listen to auction state updates
    unsubscribers.push(socketService.onAuctionStateUpdate((state) => {
      console.log('Auction state update:', state);
      setAuctionState(prev => ({ ...prev, ...state }));
    }));

    // Listen to auction started
    unsubscribers.push(socketService.onAuctionStarted((data) => {
      console.log('Auction started!', data);
      setAuctionState(prev => ({ ...prev, status: 'LIVE' }));
      
      // Auto-start first player when auction goes LIVE
      console.log('🚀 Auction went LIVE - auto-starting first player');
      setTimeout(() => {
        const alreadyActive = !!auctionStateRef.current.currentPlayerId || auctionStateRef.current.biddingActive;
        const anyLivePlayer = playersRef.current.some(p => p.status === 'LIVE');
        if (alreadyActive || anyLivePlayer) {
          console.log('⏭️ Skipping auto-start (bidding already active)');
          return;
        }

        const remainingPlayers = playersRef.current.filter(p => p.status !== 'SOLD');
        if (remainingPlayers.length > 0) {
          const firstPlayer = remainingPlayers[0];
          console.log('Auto-starting first player:', firstPlayer.name);
          setSelectedPlayerId(firstPlayer.id);
          startPlayerBidding(firstPlayer.id, firstPlayer.basePrice);
        }
      }, 1000);
    }));

    // Listen to timer updates
    unsubscribers.push(socketService.onTimerUpdate((data) => {
      setAuctionState(prev => ({ ...prev, remainingSeconds: data.remainingSeconds }));
    }));

    // Listen to player bidding started
    unsubscribers.push(socketService.onPlayerBiddingStarted((data) => {
      console.log('Player bidding started:', data);
      if (!data || !(data as any)?.player) {
        setAuctionState(prev => ({
          ...prev,
          biddingActive: false,
          currentPlayerId: null,
          currentPlayerName: null,
          currentBid: 0,
          leadingTeamId: null,
          leadingTeamName: null
        }));
        setBidHistory([]);
        return;
      }

      const playerId = data.player.id;
      setAuctionState(prev => ({
        ...prev,
        currentPlayerId: data.player.id,
        currentPlayerName: data.player.name,
        currentBid: data.player?.currentBid ?? data.basePrice ?? data.player.basePrice ?? 0,
        leadingTeamId: data.player?.leadingTeamId ?? null,
        leadingTeamName: data.player?.leadingTeamName ?? null,
        biddingActive: true
      }));
      
      // Fetch bid history for this player (restores state on page refresh)
      fetchBidHistoryForPlayer(playerId);
    }));

    // Listen to new bids
    unsubscribers.push(socketService.onNewBid((data) => {
      console.log('New bid:', data);
      setAuctionState(prev => ({
        ...prev,
        currentBid: data.amount,
        leadingTeamId: data.teamId,
        leadingTeamName: data.teamName
      }));
      setBidHistory(prev => [data, ...prev]);
    }));

    // Listen to player updated
    unsubscribers.push(socketService.onPlayerUpdated((data) => {
      console.log('Player updated:', data);
      // Update the player in the players list
      setPlayers(prev => prev.map(p => p.id === data.playerId ? data.player : p));
      // Also refetch teams since player assignments may have changed
      fetchTeams();
    }));

    // Listen to player sold
    unsubscribers.push(socketService.onPlayerSold(async (data) => {
      console.log('Player sold:', data);
      setAuctionState(prev => ({
        ...prev,
        biddingActive: false,
        currentPlayerId: null,
        currentPlayerName: null
      }));
      // Refresh players list and teams to see updated budgets and player counts
      const [fetchedPlayers] = await Promise.all([fetchPlayers(), fetchTeams()]);
      console.log('Teams refetched after player sold');
      
      // Auto-advance to next pending player
      setTimeout(() => {
        setPlayers(prev => {
          const remainingPlayers = prev.filter(p => p.status !== 'SOLD');
          if (remainingPlayers.length > 0) {
            const nextPlayer = remainingPlayers[0];
            console.log('🎯 Auto-advancing to next player:', nextPlayer.name);
            setSelectedPlayerId(nextPlayer.id);
            // Auto-start bidding for next player
            startPlayerBidding(nextPlayer.id, nextPlayer.basePrice);
          } else {
            console.log('✅ All players completed!');
          }
          return prev;
        });
      }, 2000);
    }));

    // Listen to player unsold
    unsubscribers.push(socketService.onPlayerUnsold(async (data) => {
      console.log('Player unsold:', data);
      setAuctionState(prev => ({
        ...prev,
        biddingActive: false,
        currentPlayerId: null,
        currentPlayerName: null
      }));
      // Refresh players list and teams
      await Promise.all([fetchPlayers(), fetchTeams()]);
      
      // Auto-advance to next pending player
      setTimeout(() => {
        setPlayers(prev => {
          const remainingPlayers = prev.filter(p => p.status !== 'SOLD');
          if (remainingPlayers.length > 0) {
            const nextPlayer = remainingPlayers[0];
            console.log('🎯 Auto-advancing to next player after unsold:', nextPlayer.name);
            setSelectedPlayerId(nextPlayer.id);
            // Auto-start bidding for next player
            startPlayerBidding(nextPlayer.id, nextPlayer.basePrice);
          } else {
            console.log('✅ All players completed!');
          }
          return prev;
        });
      }, 2000);
    }));

    // Listen to approval events
    unsubscribers.push(socketService.onAuctioneerApproved((data) => {
      setApprovalStatus('approved');
      alert('🎉 Your application has been approved! You can now access the auction dashboard.');
    }));

    unsubscribers.push(socketService.onAuctioneerRejected((data) => {
      setApprovalStatus('rejected');
      setApprovalMessage(data.reason || 'Application not approved');
    }));

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [approvalStatus, auctioneerId, currentMatch?.id, currentUser.role]);

  // Fetch data
  const fetchPlayers = async () => {
    if (!currentMatch) return;
    try {
      const response = await fetch(`${API_BASE}/players?matchId=${currentMatch.id}`);
      if (response.ok) {
        const data = await response.json();
        const playersList = data.data || [];
        
        // Analyze player statuses
        const statusCounts = playersList.reduce((acc: any, p: Player) => {
          const status = p.status || 'NO_STATUS';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {});
        
        // Find remaining players (not SOLD and not LIVE)
        const remainingPlayers = playersList.filter((p: Player) => p.status !== 'SOLD' && p.status !== 'LIVE');
        
        console.log('🎯 Players API Response:', {
          url: `${API_BASE}/players?matchId=${currentMatch.id}`,
          status: response.status,
          total_players: playersList.length,
          status_breakdown: statusCounts,
          remaining_players_count: remainingPlayers.length,
          remaining_players: remainingPlayers.map(p => ({
            id: p.id,
            name: p.name,
            status: p.status,
            basePrice: p.basePrice,
            roleId: p.roleId,
            imageUrl: p.imageUrl ? '✓' : '✗'
          }))
        });
        
        setPlayers(playersList);
      } else {
        console.error('❌ Players API failed with status:', response.status);
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', errorData);
      }
    } catch (error) {
      console.error('Failed to fetch players:', error);
    }
  };

  const fetchTeams = async () => {
    if (!currentMatch) return;
    try {
      console.log('Fetching teams for match:', currentMatch.id);
      const response = await fetch(`${API_BASE}/teams?matchId=${currentMatch.id}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Teams fetched, setting teams:', data.data);
        setTeams(data.data || []);
      } else {
        console.error('Failed to fetch teams, status:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch teams:', error);
    }
  };

  const fetchBidHistoryForPlayer = async (playerId: string) => {
    if (!currentMatch) return;
    try {
      console.log('Fetching bid history for player:', playerId);
      const response = await fetch(`${API_BASE}/bids?seasonId=${currentMatch.id}&playerId=${playerId}`);
      if (response.ok) {
        const data = await response.json();
        const bids = data.data || [];
        // Sort bids by timestamp descending (most recent first)
        const sortedBids = bids.sort((a: any, b: any) => {
          const timeA = new Date(a.timestamp || 0).getTime();
          const timeB = new Date(b.timestamp || 0).getTime();
          return timeB - timeA;
        });
        console.log('✓ Fetched bid history:', sortedBids.length, 'bids');
        setBidHistory(sortedBids);
      } else {
        console.error('Failed to fetch bid history, status:', response.status);
        setBidHistory([]);
      }
    } catch (error) {
      console.error('Failed to fetch bid history:', error);
      setBidHistory([]);
    }
  };

  const restoreAuctionStateFromFirestore = async (retryCount = 0) => {
    if (!currentMatch) return;
    try {
      console.log('🔄 Restoring auction state from Firestore (attempt', retryCount + 1, ')...');
      // Fetch the live auction state document
      const response = await fetch(`${API_BASE}/matches/${currentMatch.id}`);
      if (!response.ok) {
        console.warn('Failed to fetch auction state, status:', response.status);
        // Retry up to 3 times on failure
        if (retryCount < 3) {
          console.log('⏳ Retrying state restoration...');
          await new Promise(resolve => setTimeout(resolve, 500));
          return restoreAuctionStateFromFirestore(retryCount + 1);
        }
        return;
      }
      
      const data = await response.json();
      if (!data.success || !data.data) {
        console.warn('No auction state found in response');
        return;
      }
      
      const auctionState = data.data;
      console.log('✓ Restored auction state from Firestore:', auctionState);
      
      // IMPORTANT: Only update state if values are actually different to avoid re-renders
      setAuctionState(prev => {
        const hasChanges =
          (auctionState.status && auctionState.status !== prev.status) ||
          (auctionState.currentPlayerId && auctionState.currentPlayerId !== prev.currentPlayerId) ||
          (auctionState.currentBid && auctionState.currentBid !== prev.currentBid) ||
          (auctionState.leadingTeamId && auctionState.leadingTeamId !== prev.leadingTeamId);
        
        if (!hasChanges) {
          console.log('✓ Auction state unchanged, skipping update');
          return prev;
        }
        
        return {
          ...prev,
          status: auctionState.status || prev.status,
          currentPlayerId: auctionState.currentPlayerId || prev.currentPlayerId,
          currentPlayerName: auctionState.currentPlayerName || prev.currentPlayerName,
          currentBid: auctionState.currentBid || prev.currentBid,
          leadingTeamId: auctionState.leadingTeamId || prev.leadingTeamId,
          leadingTeamName: auctionState.leadingTeamName || prev.leadingTeamName,
          biddingActive: auctionState.biddingActive !== undefined ? auctionState.biddingActive : prev.biddingActive,
          remainingSeconds: auctionState.remainingSeconds || prev.remainingSeconds
        };
      });
      
      // If there's a current player, fetch bid history
      if (auctionState.currentPlayerId) {
        console.log('📋 Current player found:', auctionState.currentPlayerName, 'Current bid:', auctionState.currentBid);
        await fetchBidHistoryForPlayer(auctionState.currentPlayerId);
      }
    } catch (error) {
      console.error('Failed to restore auction state:', error);
      // Retry on network errors
      if (retryCount < 3) {
        console.log('⏳ Retrying due to network error...');
        await new Promise(resolve => setTimeout(resolve, 500));
        return restoreAuctionStateFromFirestore(retryCount + 1);
      }
    }
  };

  useEffect(() => {
    if (approvalStatus === 'approved' && currentMatch?.id) {
      setLoading(true);
      Promise.all([fetchPlayers(), fetchTeams()])
        .finally(() => setLoading(false));
    }
  }, [approvalStatus, currentMatch?.id]);

  // Set up real-time Firestore listeners for live updates
  useEffect(() => {
    if (approvalStatus !== 'approved' || !currentMatch?.id) return;

    console.log('🔥 Setting up real-time listeners for match:', currentMatch.id);

    // Join season to set up context
    socketService.joinSeason(currentMatch.id, auctioneerId || currentUser.email, currentUser.role);

    // Immediately restore auction state from Firestore on mount/reconnect
    // This handles logout/login and tab switching scenarios
    // Do NOT wait for this to complete - set it up as a fire-and-forget with proper error handling
    const restorePromise = restoreAuctionStateFromFirestore();
    
    // Log when restoration completes (for debugging)
    if (restorePromise instanceof Promise) {
      restorePromise.then(() => {
        console.log('✅ State restoration completed');
      }).catch(err => {
        console.error('State restoration error (non-blocking):', err);
      });
    }

    // Listen to players collection for live updates
    const playersUnsubscribe = socketService.onPlayersUpdate(currentMatch.id, (updatedPlayers) => {
      console.log('🔥 Players live update:', updatedPlayers.length);
      setPlayers(updatedPlayers);

      // Safety check: if we have a LIVE player but auctionState shows base price only, 
      // it means state restoration may have failed. Try again.
      const livePlayer = updatedPlayers.find((p: any) => p.status === 'LIVE');
      setAuctionState(prev => {
        if (livePlayer && prev.currentBid === 0 && livePlayer.currentBid > 0) {
          console.log('⚠️ Detected stale auction state! Current bid is 0 but player has bid. Re-restoring...');
          // Trigger restoration in background
          restoreAuctionStateFromFirestore();
        }
        
        if (livePlayer) {
          console.log('🔥 Live player found:', livePlayer.name, 'Current bid:', livePlayer.currentBid);
          return {
            ...prev,
            currentPlayerId: livePlayer.id,
            currentPlayerName: livePlayer.name,
            currentBid: livePlayer.currentBid || livePlayer.basePrice || 0,
            leadingTeamId: livePlayer.leadingTeamId || null,
            leadingTeamName: livePlayer.leadingTeamName || null,
            biddingActive: true,
            status: 'LIVE'
          };
        } else {
          // If no live player, check if auction has started
          const hasProcessedPlayers = updatedPlayers.some((p: any) => p.status === 'SOLD' || p.status === 'UNSOLD');
          if (hasProcessedPlayers) {
            // Keep auction active but clear current player
            return {
              ...prev,
              currentPlayerId: null,
              currentPlayerName: '',
              biddingActive: false
              // Preserve status and last bid values
            };
          }
          return prev;
        }
      });
    });

    // Listen to teams collection for budget updates
    const teamsUnsubscribe = socketService.onTeamsUpdate(currentMatch.id, (updatedTeams) => {
      console.log('🔥 Teams live update:', updatedTeams.length);
      setTeams(updatedTeams);
    });

    // Cleanup listeners on unmount
    return () => {
      console.log('🔥 Cleaning up real-time listeners');
      playersUnsubscribe();
      teamsUnsubscribe();
    };
  }, [approvalStatus, currentMatch?.id]);

  // Auction controls
  const startAuction = async () => {
    if (!currentMatch) return;
    try {
      // Step 1: Initialize auction state (if not already done)
      const initResponse = await fetch(`${API_BASE}/auction/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId: currentMatch.id,
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString() // 4 hours from now
        })
      });
      
      const initData = await initResponse.json();
      if (!initData.success) {
        alert(initData.error || 'Failed to initialize auction');
        return;
      }
      
      // Step 2: Start the auction
      const response = await fetch(`${API_BASE}/auction/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seasonId: currentMatch.id })
      });
      const data = await response.json();
      if (data.success) {
        alert('Auction started!');
        setAuctionState(prev => ({ ...prev, status: 'LIVE' }));
        addSystemLog('success', 'Auction started successfully!');
      } else {
        alert(data.error || 'Failed to start auction');
      }
    } catch (error) {
      console.error('Error starting auction:', error);
      alert('Failed to start auction');
    }
  };

  const pauseAuction = async () => {
    if (!currentMatch) return;
    try {
      // Optimistic update
      setAuctionState(prev => ({ ...prev, status: 'PAUSED' }));
      
      await fetch(`${API_BASE}/auction/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seasonId: currentMatch.id })
      });
    } catch (error) {
      console.error('Failed to pause auction:', error);
      // Revert on error
      setAuctionState(prev => ({ ...prev, status: 'LIVE' }));
    }
  };

  const resumeAuction = async () => {
    if (!currentMatch) return;
    try {
      // Optimistic update
      setAuctionState(prev => ({ ...prev, status: 'LIVE' }));
      
      await fetch(`${API_BASE}/auction/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seasonId: currentMatch.id })
      });
    } catch (error) {
      console.error('Failed to resume auction:', error);
      // Revert on error
      setAuctionState(prev => ({ ...prev, status: 'PAUSED' }));
    }
  };

  const startPlayerBidding = async (playerId: string, basePrice: number, retryCount = 0) => {
    if (!currentMatch) return;
    try {
      const response = await fetch(`${API_BASE}/player/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId: currentMatch.id,
          playerId,
          basePrice
        })
      });
      const data = await response.json();
      if (!data.success) {
        const errorMsg = data.error || 'Failed to start bidding';
        console.error('❌ Start bidding failed:', errorMsg);
        
        // Retry logic: attempt up to 2 retries for transient errors
        if (retryCount < 2 && !errorMsg.includes('not found')) {
          console.log(`🔄 Retrying start bidding (attempt ${retryCount + 1}/2)...`);
          addSystemLog('warning', `Retrying to start bidding for ${playerId}...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
          return startPlayerBidding(playerId, basePrice, retryCount + 1);
        }
        
        addSystemLog('error', `Failed to start bidding: ${errorMsg}`);
        alert(`❌ Failed to start bidding: ${errorMsg}`);
      } else {
        addSystemLog('info', `✓ Started bidding for player ${playerId}`);
      }
    } catch (error) {
      console.error('❌ Start bidding error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Network error';
      
      // Retry on network errors
      if (retryCount < 2) {
        console.log(`🔄 Retrying due to network error (attempt ${retryCount + 1}/2)...`);
        addSystemLog('warning', `Network error, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return startPlayerBidding(playerId, basePrice, retryCount + 1);
      }
      
      addSystemLog('error', `Failed to start player bidding: ${errorMsg}`);
      alert(`❌ Failed to start player bidding: ${errorMsg}`);
    }
  };

  const closePlayerBidding = async (sold: boolean, retryCount = 0) => {
    if (!currentMatch) return;
    try {
      const response = await fetch(`${API_BASE}/player/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId: currentMatch.id,
          sold
        })
      });
      const data = await response.json();
      if (data.success) {
        const statusMsg = sold ? '🔨 Player SOLD!' : '↩️ Player UNSOLD';
        addSystemLog('info', statusMsg);
        alert(statusMsg);
      } else {
        const errorMsg = data.error || 'Failed to close bidding';
        console.error('❌ Close bidding failed:', errorMsg);
        
        // Retry on transient errors
        if (retryCount < 2 && !errorMsg.includes('not found')) {
          console.log(`🔄 Retrying close bidding (attempt ${retryCount + 1}/2)...`);
          addSystemLog('warning', 'Retrying to close bidding...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          return closePlayerBidding(sold, retryCount + 1);
        }
        
        addSystemLog('error', `Failed to close bidding: ${errorMsg}`);
        alert(`❌ Failed to close bidding: ${errorMsg}`);
      }
    } catch (error) {
      console.error('❌ Close bidding error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Network error';
      
      // Retry on network errors
      if (retryCount < 2) {
        console.log(`🔄 Retrying due to network error (attempt ${retryCount + 1}/2)...`);
        addSystemLog('warning', 'Network error, retrying to close bidding...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        return closePlayerBidding(sold, retryCount + 1);
      }
      
      addSystemLog('error', `Failed to close bidding: ${errorMsg}`);
      alert(`❌ Failed to close bidding: ${errorMsg}`);
    }
  };

  // Calculate stats
  const auctionStats = {
    totalPlayers: players.length,
    soldPlayers: players.filter(p => p.status === 'SOLD').length,
    unsoldPlayers: players.filter(p => p.status === 'UNSOLD').length,
    activeTeams: teams.length,
    currentBidValue: auctionState.currentBid,
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const formatCurrency = (amount: number) => {
    if (!amount || amount === 0) return '₹0.0L';
    return `₹${(amount / 100000).toFixed(1)}L`;
  };

  // Resize handlers for column widths
  const handleResizeStart = (column: 'left' | 'middle', e: React.MouseEvent) => {
    e.preventDefault();
    resizeRef.current = {
      column,
      startX: e.clientX,
      startLeft: columnWidthsRef.current.left,
      startMiddle: columnWidthsRef.current.middle,
      startRight: columnWidthsRef.current.right
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;

      const diff = e.clientX - resizeRef.current.startX;
      const mainWidth = window.innerWidth - 100; // Account for padding
      const percentDiff = (diff / mainWidth) * 100;

      if (resizeRef.current.column === 'left') {
        // Adjust left and middle, keep right constant
        const newLeft = Math.max(20, Math.min(60, resizeRef.current.startLeft + percentDiff));
        const newMiddle = resizeRef.current.startMiddle - (newLeft - resizeRef.current.startLeft);
        const constrainedMiddle = Math.max(20, Math.min(60, newMiddle));
        
        setColumnWidths({
          left: newLeft,
          middle: constrainedMiddle,
          right: resizeRef.current.startRight
        });
      } else if (resizeRef.current.column === 'middle') {
        // Adjust middle and right, keep left constant
        const newMiddle = Math.max(20, Math.min(60, resizeRef.current.startMiddle + percentDiff));
        const newRight = resizeRef.current.startRight - (newMiddle - resizeRef.current.startMiddle);
        const constrainedRight = Math.max(20, Math.min(60, newRight));
        
        setColumnWidths({
          left: resizeRef.current.startLeft,
          middle: newMiddle,
          right: constrainedRight
        });
      }
    };

    const handleMouseUp = () => {
      resizeRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Bid on behalf of teams - Auctioneer places all bids
  const handlePlaceBidForTeam = async (incrementAmount: number, teamIdOverride?: string) => {
    const teamIdToBid = teamIdOverride || selectedTeamId;
    if (!teamIdToBid || !auctionState.currentPlayerId || !currentMatch) {
      addSystemLog('warning', 'Please select a team before bidding');
      return;
    }

    const selectedTeam = teams.find(t => t.id === teamIdToBid);
    if (!selectedTeam) return;

    const currentPlayer = players.find(p => p.id === auctionState.currentPlayerId);
    if (!currentPlayer) return;

    // Calculate new bid
    const baseAmount = auctionState.currentBid || currentPlayer.basePrice || 0;
    const newBidAmount = baseAmount + incrementAmount;

    // Validate team budget
    const teamRemainingBudget = (selectedTeam as any).remainingBudget || selectedTeam.budget || (selectedTeam as any).initialBudget || 0;
    if (newBidAmount > teamRemainingBudget) {
      alert(`Cannot bid ₹${formatCurrency(newBidAmount)}. ${selectedTeam.name}'s remaining budget is ₹${formatCurrency(teamRemainingBudget)}.`);
      addSystemLog('warning', `Bid rejected - ${selectedTeam.name} has insufficient budget`);
      return;
    }

    // Place bid via API (backend validates and broadcasts)
    const result = await socketService.placeBid(currentMatch.id, teamIdToBid, newBidAmount);

    if (result.success) {
      addSystemLog('info', `✓ Bid placed for ${selectedTeam.name}: ₹${formatCurrency(newBidAmount)}`);
    } else {
      alert(result.message || 'Failed to place bid');
      addSystemLog('error', `Failed to place bid for ${selectedTeam.name}`);
    }
  };

  const handleCustomBid = async () => {
    if (!customBidAmount || customBidAmount <= 0) {
      alert('Please enter a valid bid amount');
      return;
    }

    // Convert to actual amount based on unit
    const multiplier = bidUnit === 'lakh' ? 100000 : 1000;
    const actualAmount = customBidAmount * multiplier;

    // Check if it's higher than current bid
    if (actualAmount <= auctionState.currentBid) {
      alert(`Bid amount must be higher than current bid (${formatCurrency(auctionState.currentBid)})`);
      return;
    }

    await handlePlaceBidForTeam(actualAmount - auctionState.currentBid);
    setCustomBidAmount(0);
  };

  // Timer controls
  const extendTimer = async (seconds: number) => {
    if (!currentMatch || !auctionState.biddingActive) return;
    
    try {
      const response = await fetch(`${API_BASE}/auction/timer/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId: currentMatch.id,
          seconds
        })
      });
      const data = await response.json();
      if (data.success) {
        addSystemLog('info', `Timer extended by ${seconds}s`);
      }
    } catch (error) {
      console.error('Failed to extend timer:', error);
    }
  };

  // Player controls
  const handleStartPlayerBidding = (player: Player) => {
    setSelectedPlayerId(player.id);
    setShowConfirm({
      action: 'start',
      message: `Start bidding for ${player.name}?`
    });
  };

  const handleSkipPlayer = () => {
    if (!auctionState.currentPlayerId) return;
    setShowConfirm({
      action: 'skip',
      message: `Mark ${auctionState.currentPlayerName} as UNSOLD?`
    });
  };

  const handleCloseBidding = () => {
    if (!auctionState.biddingActive) return;
    setShowConfirm({
      action: 'close',
      message: `Close bidding for ${auctionState.currentPlayerName}?${auctionState.leadingTeamName ? ` (Selling to ${auctionState.leadingTeamName})` : ' (No bids - UNSOLD)'}`
    });
  };

  const handleDirectSell = async () => {
    if (!selectedTeamId || !auctionState.currentPlayerId || !currentMatch) return;
    const team = teams.find(t => t.id === selectedTeamId);
    if (!team) return;
    
    const currentBid = auctionState.currentBid || players.find(p => p.id === auctionState.currentPlayerId)?.basePrice || 0;
    
    if (confirm(`Sell ${auctionState.currentPlayerName} to ${team.name} for ${formatCurrency(currentBid)}?`)) {
      // First, place a final bid from this team to make them the leading team
      console.log('Direct Sell: Placing final bid for team', selectedTeamId);
      const bidResult = await socketService.placeBid(currentMatch.id, selectedTeamId, currentBid);
      console.log('Bid result:', bidResult);
      
      // Give a moment for the bid to be registered, then close bidding
      await new Promise(resolve => setTimeout(resolve, 500));
      await closePlayerBidding(true);
      addSystemLog('info', `${auctionState.currentPlayerName} directly sold to ${team.name} for ${formatCurrency(currentBid)}`);
    }
  };

  const confirmAction = async () => {
    if (!showConfirm || !currentMatch) return;
    
    switch (showConfirm.action) {
      case 'start':
        if (selectedPlayerId) {
          const player = players.find(p => p.id === selectedPlayerId);
          if (player) {
            await startPlayerBidding(player.id, player.basePrice);
            addSystemLog('info', `Started bidding for ${player.name}`);
          }
        }
        break;
      
      case 'skip':
        await closePlayerBidding(false);
        addSystemLog('info', `${auctionState.currentPlayerName} marked as UNSOLD`);
        break;
      
      case 'close':
        await closePlayerBidding(auctionState.leadingTeamId !== null);
        if (auctionState.leadingTeamId) {
          addSystemLog('info', `${auctionState.currentPlayerName} SOLD to ${auctionState.leadingTeamName} for ${formatCurrency(auctionState.currentBid)}`);
        } else {
          addSystemLog('info', `${auctionState.currentPlayerName} marked as UNSOLD`);
        }
        break;
    }
    
    setShowConfirm(null);
    setSelectedPlayerId(null);
  };

  // Quick announcements
  const makeAnnouncement = (text: string) => {
    setLastAnnouncement(text);
    
    // Announcements are logged locally (audio streaming is handled separately)
    addSystemLog('info', `Announced: "${text}"`);
    
    // Clear after 3 seconds
    setTimeout(() => setLastAnnouncement(null), 3000);
  };

  // System logs
  const addSystemLog = (type: SystemLog['type'], message: string) => {
    const log: SystemLog = {
      id: Date.now().toString(),
      type,
      message,
      timestamp: Date.now()
    };
    setSystemLogs(prev => [log, ...prev].slice(0, 50)); // Keep last 50
  };

  // Get player status badge
  const getPlayerStatusBadge = (status: string) => {
    switch (status) {
      case 'SOLD':
        return <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">SOLD</span>;
      case 'UNSOLD':
        return <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-bold">UNSOLD</span>;
      case 'PENDING':
        return <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold">PENDING</span>;
      default:
        return <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">{status}</span>;
    }
  };

  // Get auction status display
  const getAuctionStatusDisplay = () => {
    switch (auctionState.status) {
      case 'LIVE':
        return (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-100 border-2 border-red-400 animate-pulse">
            <Radio size={18} className="text-red-600" />
            <span className="text-sm font-black text-red-600 uppercase">LIVE</span>
          </div>
        );
      case 'PAUSED':
        return (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 border-2 border-orange-400">
            <Pause size={18} className="text-orange-600" />
            <span className="text-sm font-black text-orange-600 uppercase">PAUSED</span>
          </div>
        );
      case 'ENDED':
        return (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 border-2 border-blue-400">
            <CheckCircle size={18} className="text-blue-600" />
            <span className="text-sm font-black text-blue-600 uppercase">ENDED</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 border-2 border-gray-400">
            <Clock size={18} className="text-gray-600" />
            <span className="text-sm font-black text-gray-600 uppercase">READY</span>
          </div>
        );
    }
  };

  // Switch to Live Room view
  if (activeSection === 'liveRoom' && currentMatch && approvalStatus === 'approved') {
    return (
      <div className="fixed inset-0 z-50">
        <LiveAuctionPage
          seasonId={currentMatch.id}
          userId={currentUser.email}
          userRole={UserRole.AUCTIONEER}
          onClose={() => setActiveSection('dashboard')}
        />
      </div>
    );
  }

  // BLUR STATE - BEFORE APPROVAL
  if (approvalStatus === 'checking') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <Loader size={48} className="animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-lg font-bold text-gray-600">Checking approval status...</p>
        </div>
      </div>
    );
  }

  const showBlurOverlay = approvalStatus === 'pending' || approvalStatus === 'rejected';

  // APPROVED - SHOW FULL DASHBOARD
  return (
    <div className={`h-screen bg-gradient-to-br from-white via-blue-50 to-orange-50 flex flex-col overflow-hidden relative ${isFullscreen ? '!h-screen !bg-black/95' : ''}`}>
      <style>{`
        .hide-scrollbar {
          -ms-overflow-style: none; /* IE and Edge */
          scrollbar-width: none; /* Firefox */
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none; /* Chrome, Safari, Opera */
        }
      `}</style>
      {/* Blur overlay if not approved */}
      {showBlurOverlay && (
        <>
          {/* Backdrop blur */}
          <div className="absolute inset-0 backdrop-blur-lg bg-white/30 z-40"></div>
          
          {/* Message overlay */}
          <div className="absolute inset-0 z-50 flex items-center justify-center p-8">
            <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl border-4 border-orange-400 p-10">
              <div className="text-center">
                {approvalStatus === 'pending' ? (
                  <>
                    <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Clock size={48} className="text-yellow-500" />
                    </div>
                    <h2 className="text-3xl font-black mb-4 text-gray-900">Application Under Review</h2>
                    <p className="text-lg text-gray-600 mb-8">{approvalMessage}</p>
                    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 mb-8">
                      <p className="font-bold text-yellow-900 mb-3">⏳ Your dashboard will be enabled once the season organizer approves your application.</p>
                      <p className="text-sm text-yellow-700">You'll receive access to auction controls, live data, and management tools.</p>
                    </div>
                    <button
                      onClick={() => setStatus(AuctionStatus.HOME)}
                      className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-bold hover:brightness-110 transition-all shadow-lg"
                    >
                      Return to Home
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <XCircle size={48} className="text-red-500" />
                    </div>
                    <h2 className="text-3xl font-black mb-4 text-gray-900">Application Not Approved</h2>
                    <p className="text-lg text-gray-600 mb-8">{approvalMessage}</p>
                    <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 mb-8">
                      <p className="font-bold text-red-900 mb-2">❌ Your application was rejected</p>
                      <p className="text-sm text-red-700">Please contact the season organizer for more details or reapply for a different role.</p>
                    </div>
                    <button
                      onClick={() => setStatus(AuctionStatus.HOME)}
                      className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-bold hover:brightness-110 transition-all shadow-lg"
                    >
                      Return to Home
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Header */}
      <div className={`h-24 bg-white/95 backdrop-blur-xl border-b-2 border-red-200 shadow-lg flex items-center px-6 ${isFullscreen ? 'hidden' : ''}`}>
        <div className="w-full flex items-center justify-between">
          {/* Left: Logo + Season */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-red-400 shadow-lg hover:scale-105 transition-transform cursor-pointer" onClick={() => setStatus(AuctionStatus.HOME)}>
              <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 uppercase tracking-wider leading-none">
                AUCTIONEER CONTROL
              </h1>
              <p className="text-xs text-red-600 font-bold">{currentMatch?.name || 'Master Panel'}</p>
            </div>
          </div>

          {/* Center: Status + Timer */}
          <div className="flex items-center gap-4">
            {getAuctionStatusDisplay()}
            
            {auctionState.remainingSeconds > 0 && auctionState.biddingActive && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 ${
                auctionState.remainingSeconds <= 10 
                  ? 'bg-red-100 border-red-400 animate-pulse' 
                  : 'bg-white border-purple-300'
              }`}>
                <Timer size={18} className={auctionState.remainingSeconds <= 10 ? 'text-red-600' : 'text-purple-600'} />
                <span className={`font-mono font-black text-lg ${
                  auctionState.remainingSeconds <= 10 ? 'text-red-600' : 'text-slate-800'
                }`}>
                  {auctionState.remainingSeconds}s
                </span>
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPlayersPage(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-bold text-sm transition-all shadow-lg"
            >
              <Users size={16} />
              Players
            </button>
            <button
              onClick={() => setActiveSection('liveRoom')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-all shadow-lg"
            >
              <Radio size={16} />
              Live Room
            </button>
            <button
              onClick={() => {
                sessionStorage.clear();
                localStorage.clear();
                setStatus(AuctionStatus.HOME);
              }}
              className="p-2 rounded-lg bg-white border-2 border-gray-300 hover:border-red-300 text-gray-700 hover:text-red-600 transition-all"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className={`flex-1 px-6 pt-3 pb-3 overflow-hidden ${isFullscreen ? '!px-0 !pt-0 !pb-0' : ''}`}>
        <div className="flex h-full gap-0">
          {/* LEFT PANEL: Live Auction Stage */}
          <div style={{ flex: `0 0 ${columnWidths.left}%` }} className="flex flex-col gap-4 overflow-hidden h-full pr-2">
            {/* Live Auction Stage */}
            <div className="bg-white rounded-2xl border-2 border-purple-200 shadow-xl p-6 flex flex-col items-center justify-center flex-1 overflow-y-auto hide-scrollbar">
              {auctionState.biddingActive && auctionState.currentPlayerId ? (
                <>
                  {/* Current Player - Compact */}
                  <div className="rounded-2xl border-3 border-white shadow-lg mb-3 bg-slate-200 flex items-center justify-center flex-shrink-0">
                    {players.find(p => p.id === auctionState.currentPlayerId)?.imageUrl ? (
                      <img 
                        src={players.find(p => p.id === auctionState.currentPlayerId)?.imageUrl} 
                        alt={auctionState.currentPlayerName || 'Player'}
                        className="h-auto w-auto max-h-[220px] max-w-full rounded-xl"
                      />
                    ) : (
                      <User size={60} className="text-slate-400" />
                    )}
                  </div>

                  <h2 className="text-3xl font-black text-slate-800 uppercase mb-1 text-center leading-tight">
                    {auctionState.currentPlayerName}
                  </h2>
                  
                  {/* Player Details - Compact */}
                  <div className="w-full max-w-sm mb-3 text-center">
                    <p className="text-xs text-gray-600 uppercase tracking-wider font-bold mb-1">
                      {players.find(p => p.id === auctionState.currentPlayerId)?.roleId || 'Player'}
                    </p>
                    <p className="text-sm text-gray-600">
                      Base: {formatCurrency(players.find(p => p.id === auctionState.currentPlayerId)?.basePrice || 0)}
                    </p>
                  </div>

                  {/* Current Bid - Compact */}
                  <div className="w-full max-w-sm">
                    <div className="text-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 mb-3">
                      <p className="text-xs text-gray-600 uppercase tracking-wider font-bold mb-1">Current Highest Bid</p>
                      <p className="text-5xl font-black text-purple-600">{formatCurrency(auctionState.currentBid)}</p>
                    </div>

                    {/* Leading Team Info at Bottom */}
                    {auctionState.leadingTeamId && (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-300 p-3">
                        <div className="flex items-center justify-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-white shadow-md flex items-center justify-center overflow-hidden flex-shrink-0">
                            {teams.find(t => t.id === auctionState.leadingTeamId)?.logo ? (
                              <img 
                                src={teams.find(t => t.id === auctionState.leadingTeamId)?.logo} 
                                alt={auctionState.leadingTeamName || 'Team'}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Shield size={20} className="text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-xs text-green-700 font-bold uppercase tracking-wider mb-0.5">Leading Team</p>
                            <p className="text-sm font-black text-slate-800">{auctionState.leadingTeamName}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <Clock size={48} className="text-slate-400 mb-3 mx-auto" />
                  <h3 className="text-2xl font-black text-slate-800 mb-2">
                    {auctionState.status === 'READY' ? 'Ready to Start' : 'No Active Bidding'}
                  </h3>
                  <p className="text-sm text-gray-600 max-w-md">
                    {auctionState.status === 'READY' 
                      ? 'Select a player from the queue and click Start Bidding'
                      : 'Waiting for next player...'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* RESIZABLE DIVIDER 1 */}
          <div
            onMouseDown={(e) => handleResizeStart('left', e)}
            className="w-2 bg-gray-300 hover:bg-blue-500 cursor-col-resize transition-colors duration-200 flex-shrink-0 group hover:shadow-lg"
            title="Drag to resize"
          >
            <div className="w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-1 h-8 bg-white rounded-full"></div>
            </div>
          </div>

          {/* MIDDLE: Team Monitor & Bidding Controls */}
          <div style={{ flex: `0 0 ${columnWidths.middle}%` }} className="flex flex-col overflow-hidden h-full px-2">
            {/* Combined Team Monitor & Bidding Panel */}
            <div className="bg-white rounded-2xl border-2 border-purple-200 shadow-xl flex-1 flex flex-col overflow-hidden">
              <div className="bg-gradient-to-r from-purple-100 to-pink-100 px-5 py-4 border-b-2 border-purple-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Shield size={16} className="text-purple-600" />
                    Team Monitor & Bidding
                  </h3>
                  {auctionState.leadingTeamId && (
                    <button
                      onClick={() => {
                        setSelectedTeamId(auctionState.leadingTeamId);
                        setTimeout(() => handleDirectSell(), 100);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold text-xs transition-all shadow-md"
                    >
                      <CheckCircle size={14} />
                      Sell to {auctionState.leadingTeamName}
                    </button>
                  )}
                </div>
              </div>
              
              {!auctionState.currentPlayerId || auctionState.status !== 'LIVE' ? (
                <div className="flex-1 flex items-center justify-center p-8">
                  <div className="text-center">
                    <Clock size={48} className="text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">No active bidding</p>
                    <p className="text-gray-300 text-xs mt-1">Start a player to begin</p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {teams
                    .sort((a, b) => {
                      // Sort leading team to top
                      if (a.id === auctionState.leadingTeamId) return -1;
                      if (b.id === auctionState.leadingTeamId) return 1;
                      return 0;
                    })
                    .map(team => {
                      const remainingBudget = team.remainingBudget || team.budget || (team as any).initialBudget || 0;
                      const isSelectedTeam = selectedTeamId === team.id;
                      const isLeadingTeam = auctionState.leadingTeamId === team.id;
                      
                      return (
                        <div 
                          key={team.id} 
                          className={`rounded-xl border-2 p-3 transition-all ${
                            isLeadingTeam 
                              ? 'bg-green-50 border-green-300 shadow-lg' 
                              : isSelectedTeam
                              ? 'bg-purple-50 border-purple-300 shadow-md'
                              : 'bg-white border-gray-200 hover:border-purple-200'
                          }`}
                        >
                          {/* Team Header and Bidding Controls - All in One Row */}
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 flex-shrink-0 min-w-max">
                              <div className="w-8 h-8 rounded-md bg-gray-200 flex-shrink-0 overflow-hidden">
                                {team.logo ? (
                                  <img src={team.logo} alt={team.name} className="w-full h-full object-cover" />
                                ) : (
                                  <Shield size={16} className="text-gray-400" />
                                )}
                              </div>
                              <div className="flex-shrink-0">
                                <p className="text-sm font-black text-slate-800 leading-tight">{team.name}</p>
                                <p className="text-xs text-purple-600 font-bold">₹{(remainingBudget / 100000).toFixed(1)}L</p>
                              </div>
                              {isLeadingTeam && (
                                <div className="px-1.5 py-0.5 rounded-sm bg-green-500 text-white text-[10px] font-bold flex items-center gap-0.5 flex-shrink-0">
                                  <Trophy size={10} />
                                  Lead
                                </div>
                              )}
                            </div>

                            {/* Bidding Controls in Row */}
                            <div className="flex gap-1.5 flex-shrink-0">
                              <button
                                onClick={() => {
                                  setSelectedTeamId(team.id);
                                  handlePlaceBidForTeam(100000, team.id);
                                }}
                                disabled={remainingBudget < (auctionState.currentBid + 100000)}
                                className="px-2 py-1.5 rounded-sm bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-xs transition-all whitespace-nowrap"
                              >
                                +1L
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedTeamId(team.id);
                                  handlePlaceBidForTeam(500000, team.id);
                                }}
                                disabled={remainingBudget < (auctionState.currentBid + 500000)}
                                className="px-2 py-1.5 rounded-sm bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-xs transition-all whitespace-nowrap"
                              >
                                +5L
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedTeamId(team.id);
                                  handlePlaceBidForTeam(1000000, team.id);
                                }}
                                disabled={remainingBudget < (auctionState.currentBid + 1000000)}
                                className="px-2 py-1.5 rounded-sm bg-purple-700 hover:bg-purple-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-xs transition-all whitespace-nowrap"
                              >
                                +10L
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedTeamId(team.id);
                                  handlePlaceBidForTeam(2000000, team.id);
                                }}
                                disabled={remainingBudget < (auctionState.currentBid + 2000000)}
                                className="px-2 py-1.5 rounded-sm bg-purple-800 hover:bg-purple-900 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-xs transition-all whitespace-nowrap"
                              >
                                +20L
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                }
                </div>
              )}
            </div>
          </div>

          {/* RESIZABLE DIVIDER 2 */}
          <div
            onMouseDown={(e) => handleResizeStart('middle', e)}
            className="w-2 bg-gray-300 hover:bg-blue-500 cursor-col-resize transition-colors duration-200 flex-shrink-0 group hover:shadow-lg"
            title="Drag to resize"
          >
            <div className="w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-1 h-8 bg-white rounded-full"></div>
            </div>
          </div>

          {/* RIGHT PANEL: Player Queue */}
          <div style={{ flex: `0 0 ${columnWidths.right}%` }} className="flex flex-col gap-4 overflow-hidden h-full pl-2">
            {/* Player Queue */}
            <div className="bg-white rounded-2xl border-2 border-blue-200 shadow-xl flex-1 flex flex-col overflow-hidden">
              <div className="bg-gradient-to-r from-blue-100 to-cyan-100 px-5 py-4 border-b-2 border-blue-200">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Users size={16} className="text-blue-600" />
                  Player Queue ({players.filter(p => p.status !== 'SOLD' && p.id !== auctionState.currentPlayerId).length} remaining)
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 hide-scrollbar">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader size={24} className="animate-spin text-blue-500" />
                  </div>
                ) : (
                  players
                    .filter(p => p.status !== 'SOLD' && p.id !== auctionState.currentPlayerId)
                    .map((player, index) => (
                      <div
                        key={player.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                          auctionState.currentPlayerId === player.id
                            ? 'bg-white border-green-400 shadow-[0_0_15px_rgba(34,197,94,0.6)]'
                            : index === 0 && auctionState.status === 'LIVE'
                            ? 'bg-white border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.6)]'
                            : 'bg-white border-gray-200 hover:bg-blue-50 cursor-pointer'
                        }`}
                        onClick={() => handleStartPlayerBidding(player)}
                      >
                        <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
                          {player.imageUrl ? (
                            <img src={player.imageUrl} alt={player.name} className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <User size={20} className="text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-black text-sm text-slate-800 truncate">{player.name}</h4>
                          <p className="text-xs text-gray-600">
                            {player.roleId || '—'} • ₹{typeof player.basePrice === 'number' && Number.isFinite(player.basePrice) && player.basePrice > 0
                              ? (player.basePrice / 100000).toFixed(1)
                              : '—'}L
                          </p>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Auction Controls */}
            <div className="bg-white rounded-2xl border-2 border-orange-200 shadow-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Zap size={14} className="text-orange-600" />
                  Auction Controls
                </h3>
                {auctionState.status === 'LIVE' && (
                  <div className="px-2 py-1 rounded-md bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center gap-1">
                    <Zap size={10} className="animate-pulse" />
                    AUTO MODE
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {auctionState.status === 'READY' && (
                  <button
                    onClick={startAuction}
                    className="col-span-2 px-3 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-bold text-xs transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <Play size={16} />
                    Start Auction
                  </button>
                )}
                
                {auctionState.status === 'LIVE' && !auctionState.biddingActive && (
                  <button
                    onClick={pauseAuction}
                    className="col-span-2 px-3 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <Pause size={16} />
                    Pause Auction
                  </button>
                )}
                
                {auctionState.status === 'PAUSED' && (
                  <button
                    onClick={resumeAuction}
                    className="col-span-2 px-3 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-bold text-xs transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <Play size={16} />
                    Resume Auction
                  </button>
                )}
                
                {auctionState.biddingActive && (
                  <>
                    <button
                      onClick={handleCloseBidding}
                      className="px-3 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold text-xs transition-all shadow-lg flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle size={14} />
                      Close
                    </button>
                    <button
                      onClick={handleSkipPlayer}
                      className="px-3 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs transition-all shadow-lg flex items-center justify-center gap-1.5"
                    >
                      <SkipForward size={12} />
                      Unsold
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-8 max-w-md border-4 border-red-300 shadow-2xl">
            <h3 className="text-2xl font-black text-slate-800 mb-4">Confirm Action</h3>
            <p className="text-gray-600 mb-6">{showConfirm.message}</p>
            <div className="flex gap-3">
              <button
                onClick={confirmAction}
                className="flex-1 px-6 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold"
              >
                Confirm
              </button>
              <button
                onClick={() => setShowConfirm(null)}
                className="flex-1 px-6 py-3 rounded-xl bg-gray-300 hover:bg-gray-400 text-slate-800 font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Button - Bottom Left */}
      <button
        onClick={() => setIsFullscreen(!isFullscreen)}
        className={`fixed bottom-4 left-4 z-30 p-3 rounded-full shadow-lg transition-all hover:scale-110 ${
          isFullscreen 
            ? 'bg-white text-slate-800 hover:bg-gray-100' 
            : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700'
        }`}
        title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
      >
        {isFullscreen ? (
          <Minimize2 size={20} />
        ) : (
          <Maximize2 size={20} />
        )}
      </button>

      {/* Players Page Overlay */}
      {showPlayersPage && (
        <PlayersPage 
          onClose={() => setShowPlayersPage(false)} 
          currentMatch={currentMatch}
        />
      )}
    </div>

  );
}
