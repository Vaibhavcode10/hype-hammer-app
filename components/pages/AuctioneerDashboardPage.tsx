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
  // Track if we're in the middle of auto-advancing to next player to avoid overriding currentPlayerId
  const isAutoAdvancingRef = useRef<boolean>(false);
  // Track page load time to ignore old events
  const pageLoadTimeRef = useRef<number>(Date.now());
  // Track last player switch to prevent rapid consecutive switches
  const lastPlayerSwitchRef = useRef<{ playerId: string; timestamp: number } | null>(null);
  // Track when player_bidding_started event fires for a NEW player
  // This allows bypassing bidding lock for legitimate new bidding sessions
  const newBiddingSessionRef = useRef<{ playerId: string; timestamp: number } | null>(null);

  useEffect(() => {
    auctionStateRef.current = auctionState;
  }, [auctionState]);

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  // Sync currentPlayerName with currentPlayerId - if ID becomes null/invalid, clear name immediately
  // This ensures the UI doesn't show stale player data when switching between players
  useEffect(() => {
    if (!auctionState.currentPlayerId) {
      // If no current player ID, trigger immediate clear
      if (auctionState.currentPlayerName !== null) {
        console.log('🔄 Clearing stale currentPlayerName because currentPlayerId is null');
        setAuctionState(prev => ({
          ...prev,
          currentPlayerName: null,
          currentBid: 0,
          leadingTeamId: null,
          leadingTeamName: null
        }));
      }
    }
  }, [auctionState.currentPlayerId]);

  // Check auctioneer approval status
  useEffect(() => {
    const checkApprovalStatus = async () => {
      try {
        // Fetch all auctioneers with this email
        const auctioneerResponse = await fetch(`${API_BASE}/auctioneers?email=${encodeURIComponent(currentUser.email)}`);
        const auctioneerData = await auctioneerResponse.json();

        if (!auctioneerData.success || !auctioneerData.data || auctioneerData.data.length === 0) {
          console.error('Auctioneer not found for email:', currentUser.email);
          setApprovalStatus('pending');
          setApprovalMessage('Registration not found. Please contact support.');
          return;
        }

        // ✅ FIX: Find the auctioneer for THIS specific match (currentMatch)
        let auctioneer = auctioneerData.data[0];
        
        if (currentMatch?.id && auctioneerData.data.length > 1) {
          // Multiple registrations - find the one for current match
          const matchAuctioneer = auctioneerData.data.find((a: any) => a.matchId === currentMatch.id);
          if (matchAuctioneer) {
            auctioneer = matchAuctioneer;
            console.log('🎯 Found auctioneer for current match:', currentMatch.id);
          } else {
            console.warn('⚠️ No auctioneer found for current match:', currentMatch.id);
            console.log('📋 Available auctioneers:');
            auctioneerData.data.forEach((a: any) => {
              console.log(`   - ID: ${a.id}, matchId: ${a.matchId}, name: ${a.name}`);
            });
            setApprovalStatus('pending');
            setApprovalMessage(`You are not registered as an auctioneer for ${currentMatch.name}. Please contact support.`);
            return;
          }
        }
        
        const fetchedAuctioneerId = auctioneer.id || auctioneer.auctioneerId;
        setAuctioneerId(fetchedAuctioneerId);

        // Get approval status from auctioneer object
        console.log('🔍 Auctioneer data received:', auctioneer);
        console.log('🔍 Auctioneer matchId:', auctioneer.matchId);
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
  }, [currentUser.email, currentMatch?.id, currentMatch?.name]);

  // Fetch data
  const fetchPlayers = async () => {
    if (!currentMatch) return [];
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
        return playersList;
      } else {
        console.error('❌ Players API failed with status:', response.status);
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', errorData);
        return [];
      }
    } catch (error) {
      console.error('Failed to fetch players:', error);
      return [];
    }
  };

  const fetchTeams = async () => {
    if (!currentMatch) return;
    try {
      console.log('Fetching teams for match:', currentMatch.id);
      const response = await fetch(`${API_BASE}/teams?matchId=${currentMatch.id}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Teams fetched from API:',data.data);
        console.log('📊 API Team budgets:');
        data.data.forEach((team: any) => {
          const budget = team.remainingBudget || team.budget || 0;
          console.log(`  - ${team.name}: ₹${(budget / 100000).toFixed(1)}L (playerIds: ${team.playerIds?.length || 0})`);
        });
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

        // IMPORTANT: Use bid history to restore current bid state
        // This ensures auction state is accurate after login/refresh
        if (sortedBids.length > 0) {
          const latestBid = sortedBids[0];
          console.log('📍 Restoring current bid from history:', latestBid.amount, 'by', latestBid.teamName);
          setAuctionState(prev => ({
            ...prev,
            currentBid: latestBid.amount,
            leadingTeamId: latestBid.teamId,
            leadingTeamName: latestBid.teamName
          }));
        }
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
          // CRITICAL: Do NOT restore currentPlayerId from Firestore - it's stale cached data
          // The source of truth is the players collection (who has status='LIVE')
          // Let the players listener set it based on actual real-time data
          currentBid: auctionState.currentBid ?? prev.currentBid,
          leadingTeamId: auctionState.leadingTeamId || prev.leadingTeamId,
          leadingTeamName: auctionState.leadingTeamName || prev.leadingTeamName,
          biddingActive: auctionState.biddingActive !== undefined ? auctionState.biddingActive : prev.biddingActive,
          remainingSeconds: auctionState.remainingSeconds || prev.remainingSeconds
        };
      });
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

    // Flag to track if initial restoration is complete
    let restorationComplete = false;
    let unsubscribers: Array<() => void> = [];

    // First restore state, THEN set up listeners
    // This ensures currentPlayerId is properly set before players updates arrive
    (async () => {
      try {
        await restoreAuctionStateFromFirestore();
        console.log('✅ State restoration completed');
        restorationComplete = true;
        
        // NOW set up listeners after state is restored
        setUpListeners();
      } catch (err) {
        console.error('State restoration error:', err);
        restorationComplete = true;
        // Still set up listeners even if restoration failed
        setUpListeners();
      }
    })();

    function setUpListeners() {
      /**
       * CRITICAL FIX for player flickering bug:
       * 
       * The problem was TWO listeners competing to update currentPlayerId:
       * 1. onAuctionStateUpdate - read currentPlayerId from liveAuctions document (stale)
       * 2. onPlayersUpdate - read player with status='LIVE' from players collection (real-time)
       * 
       * These fired at different times, causing player to switch back and forth.
       * 
       * Solution: Only onPlayersUpdate controls currentPlayerId (source of truth is player.status field)
       * The onAuctionStateUpdate listener now ignores currentPlayerId/currentPlayerName fields.
       */
      
      // Listen to auction state updates from backend
      const stateUnsubscribe = socketService.onAuctionStateUpdate((state) => {
        console.log('Auction state update:', state);
        setAuctionState(prev => {
          // CRITICAL FIX: Do NOT update currentPlayerId and currentPlayerName from this listener
          // These are only updated by the onPlayersUpdate listener which reads the real-time player.status field
          // Allowing both listeners to update currentPlayerId causes flickering/switching between players
          const updated = { ...prev };
          
          // Only update non-player-id fields from liveAuctions document
          if (state.status !== undefined) updated.status = state.status;
          if (state.currentBid !== undefined) updated.currentBid = state.currentBid;
          if (state.leadingTeamId !== undefined) updated.leadingTeamId = state.leadingTeamId;
          if (state.leadingTeamName !== undefined) updated.leadingTeamName = state.leadingTeamName;
          if (state.biddingActive !== undefined) updated.biddingActive = state.biddingActive;
          if (state.remainingSeconds !== undefined) updated.remainingSeconds = state.remainingSeconds;
          
          // CRITICAL: When bidding ends (becomes false), clear stale bypass flag
          // This prevents old bypass windows from blocking new player recognition
          if (state.biddingActive === false && prev.biddingActive === true) {
            console.log('🔄 Bidding ended, clearing stale bypass flag for transition to next player');
            newBiddingSessionRef.current = null;
          }
          
          // NEVER override currentPlayerId and currentPlayerName from this listener
          // Only the onPlayersUpdate listener (which reads player.status='LIVE') is the source of truth
          // This prevents the flickering bug where player keeps switching
          
          return updated;
        });
      });
      unsubscribers.push(stateUnsubscribe);

      // Listen to auction started
      const startedUnsubscribe = socketService.onAuctionStarted((data) => {
        console.log('Auction started!', data);
        setAuctionState(prev => ({ ...prev, status: 'LIVE' }));
        
        setTimeout(async () => {
          const alreadyActive = !!auctionStateRef.current.currentPlayerId || auctionStateRef.current.biddingActive;
          const anyLivePlayer = playersRef.current.some(p => p.status === 'LIVE');
          if (alreadyActive || anyLivePlayer) {
            console.log('⏭️ Skipping auto-start (bidding already active)');
            return;
          }

          // Use backend priority system to get next player (AVAILABLE → UNSOLD)
          try {
            console.log('🔍 Calling /auction/player/next for auto-start...');
            const response = await fetch(`${API_BASE}/auction/player/next`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ seasonId: currentMatch.id })
            });
            const result = await response.json();
            console.log('📋 Auto-start API response:', result);
            
            // Backend already started the player, just let Firebase listeners handle UI updates
            if (result.success && result.data?.playerId) {
              console.log('✅ Next player started with ID:', result.data.playerId);
              // No need to call fetchPlayers - Firebase real-time listener will update
            } else if (result.data?.auctionComplete || result.auctionComplete) {
              console.log('✅ No players to auto-start - auction complete');
            } else {
              console.error('❌ Failed to auto-start. Full response:', result);
            }
          } catch (error) {
            console.error('❌ Error getting first player for auto-start:', error);
          }
        }, 1000);
      });
      unsubscribers.push(startedUnsubscribe);

      // Listen to timer updates
      const timerUnsubscribe = socketService.onTimerUpdate((data) => {
        setAuctionState(prev => ({ ...prev, remainingSeconds: data.remainingSeconds }));
      });
      unsubscribers.push(timerUnsubscribe);

      // Listen to player bidding started
      const biddingUnsubscribe = socketService.onPlayerBiddingStarted((data) => {
        console.log('Player bidding started:', data);
        if (!data?.player) {
          // Clear bid history but don't clear currentPlayerId - let players listener handle it
          setBidHistory([]);
          setAuctionState(prev => ({
            ...prev,
            biddingActive: false,
            currentBid: 0,
            leadingTeamId: null,
            leadingTeamName: null
          }));
          return;
        }

        // 🔓 BYPASS BIDDING LOCK: Mark this as a NEW bidding session
        // Let onPlayersUpdate know it should allow switch to this player even if bidding is active
        const newPlayerId = data.player.id || data.playerId;
        const now = Date.now();
        newBiddingSessionRef.current = {
          playerId: newPlayerId,
          timestamp: now
        };
        console.log('🔓 NEW BIDDING SESSION: Marked player for bypass:', newPlayerId);

        // CRITICAL: If this new player is already in our players list (onPlayersUpdate may have already fired),
        // immediately force switch to them instead of waiting for another onPlayersUpdate
        const playerInList = players.find(p => p.id === newPlayerId);
        if (playerInList && playerInList.status === 'LIVE') {
          console.log('🔓 FORCE SWITCH: New player already in list, forcing switch immediately:', playerInList.name);
          fetchBidHistoryForPlayer(newPlayerId);
          lastPlayerSwitchRef.current = { playerId: newPlayerId, timestamp: now };
          setAuctionState(prev => ({
            ...prev,
            currentPlayerId: newPlayerId,
            currentPlayerName: playerInList.name,
            currentBid: (playerInList.currentBid) || (data.basePrice) || 0,
            leadingTeamId: playerInList.leadingTeamId || null,
            leadingTeamName: playerInList.leadingTeamName || null,
            biddingActive: true,
            status: 'LIVE'
          }));
          auctionStateRef.current = {
            ...auctionStateRef.current,
            currentPlayerId: newPlayerId,
            currentPlayerName: playerInList.name,
            biddingActive: true
          };
          return;
        }
        
        // CRITICAL: Update ref immediately so that when onPlayersUpdate fires,
        // it sees we're waiting for this new player and can use the bypass flag to permit the switch
        // This prevents the lock from blocking when the new player appears
        auctionStateRef.current = {
          ...auctionStateRef.current,
          biddingActive: true
        };

        // CRITICAL: Don't set currentPlayerId from socket event - it contains stale player data
        // The authoritative source is the players collection listener (which has real-time status updates)
        // Only update bid-related metadata from this socket event
        setAuctionState(prev => ({
          ...prev,
          currentBid: data.basePrice ?? 0,
          leadingTeamId: null,
          leadingTeamName: null,
          biddingActive: true
          // currentPlayerId will be set by the players listener, NOT by this event
        }));
        
        // Don't fetch bid history here - the players listener will do it when it updates currentPlayerId
      });
      unsubscribers.push(biddingUnsubscribe);

      // Listen to new bids
      const bidUnsubscribe = socketService.onNewBid((data) => {
        console.log('New bid:', data);
        setAuctionState(prev => ({
          ...prev,
          currentBid: data.amount,
          leadingTeamId: data.teamId,
          leadingTeamName: data.teamName
        }));
        setBidHistory(prev => [data, ...prev]);
      });
      unsubscribers.push(bidUnsubscribe);

      // Listen to player updated
      const playerUpdatedUnsubscribe = socketService.onPlayerUpdated((data) => {
        console.log('Player updated:', data);
        setPlayers(prev => prev.map(p => p.id === data.playerId ? data.player : p));
        fetchTeams();
      });
      unsubscribers.push(playerUpdatedUnsubscribe);

      // Listen to player sold
      const soldUnsubscribe = socketService.onPlayerSold((data) => {
        console.log('🔨 Player sold event received:', data);
        
        // Just update UI to reflect that current player is no longer active
        // Auto-advance is handled by closePlayerBidding callback
        setAuctionState(prev => ({
          ...prev,
          biddingActive: false,
          currentPlayerId: null,
          currentPlayerName: null
        }));
        
        // Refresh teams to show updated budgets
        fetchTeams();
      });
      unsubscribers.push(soldUnsubscribe);

      // Listen to player unsold
      const unsoldUnsubscribe = socketService.onPlayerUnsold((data) => {
        console.log('↩️ Player unsold event received:', data);
        
        // Clear current player when unsold
        setAuctionState(prev => ({
          ...prev,
          biddingActive: false,
          currentPlayerId: null,
          currentPlayerName: null
        }));
        
        // Refresh teams to show updated budgets
        fetchTeams();
      });
      unsubscribers.push(unsoldUnsubscribe);

      // Listen to players collection for live updates
      // DEBOUNCED to prevent rapid flickering
      let playersUpdateTimeout: NodeJS.Timeout | null = null;
      
      const playersUnsubscribe = socketService.onPlayersUpdate(currentMatch.id, (updatedPlayers) => {
        // Debounce rapid updates to prevent flickering - increased to 500ms
        if (playersUpdateTimeout) clearTimeout(playersUpdateTimeout);
        
        playersUpdateTimeout = setTimeout(() => {
          console.log('🔥 Players live update (debounced):', updatedPlayers.length);
          setPlayers(updatedPlayers);

          // CRITICAL: Find ALL players with LIVE status to detect conflicts
          const allLivePlayers = updatedPlayers.filter((p: any) => p.status === 'LIVE');
          
          if (allLivePlayers.length > 1) {
            console.error('🚨 CRITICAL: Multiple players with LIVE status detected!', 
              allLivePlayers.map(p => ({ id: p.id, name: p.name })));
            console.error('🚨 This causes player flickering - backend needs to fix this');
          }
          
          // Find live player - if multiple exist, prefer the one matching currentPlayerId (if set)
          let livePlayer = allLivePlayers.length > 0 ? allLivePlayers[0] : null;
          
          if (allLivePlayers.length > 1 && auctionStateRef.current.currentPlayerId) {
            // Multiple LIVE players detected - prefer the current one
            const currentLivePlayer = allLivePlayers.find(p => p.id === auctionStateRef.current.currentPlayerId);
            if (currentLivePlayer) {
              livePlayer = currentLivePlayer;
              console.log('🎯 Multiple LIVE players - keeping current:', livePlayer.name);
            } else {
              console.warn('⚠️ Multiple LIVE players and current player not in list - using first:', livePlayer?.name);
            }
          }
          
          console.log('🔍 Live player check:', {
            livePlayerExists: !!livePlayer,
            livePlayerId: livePlayer?.id,
            livePlayerName: livePlayer?.name,
            totalLivePlayers: allLivePlayers.length,
            allLivePlayerNames: allLivePlayers.map(p => p.name),
            currentPlayerId: auctionStateRef.current.currentPlayerId,
            areSame: livePlayer?.id === auctionStateRef.current.currentPlayerId,
            biddingActive: auctionStateRef.current.biddingActive
          });
          
          setAuctionState(prev => {
            const now = Date.now();
            
            // LAYER 3: BIDDING-ACTIVE LOCK (with bypass for new bidding sessions)
            // Never switch players during active bidding (prevents disruption)
            // EXCEPT when player_bidding_started event has fired for a different player
            // CRITICAL: Use auctionStateRef.current for comparison since prev can be stale when multiple onPlayersUpdate fires in quick succession
            const currentRefPlayerId = auctionStateRef.current?.currentPlayerId;
            
            if (prev.biddingActive && currentRefPlayerId) {
              if (livePlayer && livePlayer.id !== currentRefPlayerId) {
                // Check if this is a new bidding session (player_bidding_started fired)
                const isNewSession = newBiddingSessionRef.current &&
                  newBiddingSessionRef.current.playerId === livePlayer.id &&
                  (now - newBiddingSessionRef.current.timestamp) < 5000; // 5-second window
                
                console.log('🔍 BYPASS CHECK:', {
                  hasBypassFlag: !!newBiddingSessionRef.current,
                  bypassPlayerId: newBiddingSessionRef.current?.playerId,
                  livePlayerId: livePlayer.id,
                  playersMatch: newBiddingSessionRef.current?.playerId === livePlayer.id,
                  timeSinceBypass: newBiddingSessionRef.current ? (now - newBiddingSessionRef.current.timestamp) : null,
                  isNewSession
                });
                
                if (isNewSession) {
                  console.log(`🔓 BYPASSING LOCK: player_bidding_started event fired for ${livePlayer.name} - FORCING switch from ${currentRefPlayerId}`);
                  // CRITICAL: Update ref immediately so that if another onPlayersUpdate fires before React state updates, it sees the new player ID
                  const newState = {
                    ...prev,
                    currentPlayerId: livePlayer.id,
                    currentPlayerName: livePlayer.name,
                    currentBid: livePlayer.currentBid || livePlayer.basePrice || 0,
                    leadingTeamId: livePlayer.leadingTeamId || null,
                    leadingTeamName: livePlayer.leadingTeamName || null,
                    biddingActive: true,
                    status: 'LIVE' as const
                  };
                  // Update ref IMMEDIATELY (don't wait for React state to commit)
                  auctionStateRef.current = newState;
                  
                  // Clear the bypass flag
                  newBiddingSessionRef.current = null;
                  // Record this player switch
                  lastPlayerSwitchRef.current = { playerId: livePlayer.id, timestamp: now };
                  // Fetch bid history for the new player
                  fetchBidHistoryForPlayer(livePlayer.id);
                  
                  // Return the new state for React to update
                  return newState;
                } else {
                  console.log('🔒 LOCKED: Bidding active on player', currentRefPlayerId, '- blocking switch to different player', livePlayer.id);
                  // Just update bid info, never change currentPlayerId while bidding
                  return {
                    ...prev,
                    currentBid: livePlayer.currentBid || livePlayer.basePrice || prev.currentBid || 0,
                    leadingTeamId: livePlayer.leadingTeamId || prev.leadingTeamId,
                    leadingTeamName: livePlayer.leadingTeamName || prev.leadingTeamName
                  };
                }
              }
            }

            // CRITICAL: If current player is already set and matches the LIVE player, skip update
            // This prevents unnecessary re-renders and flickering
            // IMPORTANT: Use auctionStateRef to handle race condition where prev is stale after force switch in event handler
            const refCurrentPlayerId = auctionStateRef.current?.currentPlayerId || prev.currentPlayerId;
            if (refCurrentPlayerId && livePlayer && livePlayer.id === refCurrentPlayerId) {
              // SAME PLAYER - only update bid/team info, never change currentPlayerId
              console.log('✅ Same LIVE player, updating bid only (no player switch)');
              return {
                ...prev,
                currentBid: livePlayer.currentBid || livePlayer.basePrice || prev.currentBid || 0,
                leadingTeamId: livePlayer.leadingTeamId || prev.leadingTeamId,
                leadingTeamName: livePlayer.leadingTeamName || prev.leadingTeamName,
                biddingActive: true
              };
            }
            
            if (livePlayer) {
              console.log('🔥 Live player found:', livePlayer.name, 'Current bid:', livePlayer.currentBid);
              
              // DIFFERENT PLAYER - only update if we don't have a current player
              // or if bidding is not active (player was closed)
              // IMPORTANT: Use refCurrentPlayerId to handle race condition where prev is stale after force switch
              if (!refCurrentPlayerId || !prev.biddingActive) {
                // RAPID SWITCH GUARD: Prevent switching back and forth rapidly - increased to 1000ms
                const now = Date.now();
                const timeSinceLastSwitch = lastPlayerSwitchRef.current 
                  ? now - lastPlayerSwitchRef.current.timestamp 
                  : Infinity;
                
                // If we switched to a different player within 1000ms, it's a race condition - IGNORE
                if (lastPlayerSwitchRef.current && 
                    lastPlayerSwitchRef.current.playerId !== livePlayer.id && 
                    timeSinceLastSwitch < 1000) {
                  console.log(`🚫 BLOCKED: Rapid switch detected within ${timeSinceLastSwitch}ms - ignoring switch to ${livePlayer.id}`);
                  return prev;
                }
                
                // PAGE LOAD GRACE PERIOD: Don't switch players within first 3 seconds after page load
                // This lets Firebase fully sync and prevents seeing stale LIVE status during reconnection
                const timeSincePageLoad = now - pageLoadTimeRef.current;
                if (refCurrentPlayerId && timeSincePageLoad < 3000 && livePlayer.id !== refCurrentPlayerId) {
                  console.log(`⏳ PAGE LOAD GRACE: Only ${timeSincePageLoad}ms since page load - keeping current player to allow Firebase sync`);
                  return prev;
                }
                
                console.log('🔄 New LIVE player detected, switching to:', livePlayer.name);
                // Record this player switch
                lastPlayerSwitchRef.current = { playerId: livePlayer.id, timestamp: now };

                // Fetch bid history for the LIVE player
                fetchBidHistoryForPlayer(livePlayer.id);
                
                // CRITICAL: Do NOT set biddingActive=true during auto-advance
                // biddingActive should only be true when onPlayerBiddingStarted fires (backend confirms bidding started)
                // Setting it here causes lock to apply when next LIVE player is detected
                return {
                  ...prev,
                  currentPlayerId: livePlayer.id,
                  currentPlayerName: livePlayer.name,
                  currentBid: livePlayer.currentBid || livePlayer.basePrice || 0,
                  leadingTeamId: livePlayer.leadingTeamId || null,
                  leadingTeamName: livePlayer.leadingTeamName || null,
                  // ❌ NOT setting biddingActive: true here - let onPlayerBiddingStarted set it
                  status: 'LIVE'
                };
              } else {
                // We have a different player as current AND bidding is active
                // Don't switch - keep bidding on current player
                console.log('⚠️ Different LIVE player found but keeping current player:', refCurrentPlayerId);
                return prev;
              }
            } else {
              console.log('❌ NO LIVE PLAYER FOUND', {
                hadCurrentPlayerId: !!prev.currentPlayerId,
                currentPlayerId: prev.currentPlayerId,
                isAutoAdvancing: isAutoAdvancingRef.current
              });
              
              // No live player found - if we had one and bidding was active, don't clear it yet
              // The player might just be transitioning
              if (prev.currentPlayerId && prev.biddingActive) {
                console.log('⏳ No LIVE player but keeping current for now (may be transitioning)');
                return prev;
              }
              
              // If bidding is not active and we had a player, it was closed
              if (prev.currentPlayerId && !prev.biddingActive) {
                console.log('✓ Current player was closed, clearing...');
                return {
                  ...prev,
                  currentPlayerId: null,
                  currentPlayerName: null
                };
              }
              
              return prev;
            }
          });
        }, 500); // Debounce rapid updates - wait 500ms
      });

      // Cleanup debounce timer on unmount
      unsubscribers.push(() => {
        if (playersUpdateTimeout) clearTimeout(playersUpdateTimeout);
        playersUnsubscribe();
      });

    // Listen to teams collection for budget updates
    const teamsUnsubscribe = socketService.onTeamsUpdate(currentMatch.id, (updatedTeams) => {
      console.log('🔥 Teams live update:', updatedTeams.length);
      console.log('📊 Team budgets:');
      updatedTeams.forEach(team => {
        const budget = team.remainingBudget || team.budget || 0;
        console.log(`  - ${team.name}: ₹${(budget / 100000).toFixed(1)}L (playerIds: ${team.playerIds?.length || 0})`);
      });
      setTeams(updatedTeams);
    });

      // Store unsubscribers for cleanup
      unsubscribers.push(teamsUnsubscribe);
    }

    // Cleanup listeners on unmount
    return () => {
      console.log('🔥 Cleaning up real-time listeners');
      unsubscribers.forEach(unsub => unsub());
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
        addSystemLog('info', 'Auction started successfully!');
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
    
    // CRITICAL FIX: Set currentPlayerId in local state IMMEDIATELY
    // Don't wait for socket listener - this prevents race conditions on page refresh
    // Find player name from players list
    const playerToStart = players.find(p => p.id === playerId);
    if (playerToStart) {
      setAuctionState(prev => ({
        ...prev,
        currentPlayerId: playerId,
        currentPlayerName: playerToStart.name,
        currentBid: basePrice,
        biddingActive: true,
        leadingTeamId: null,
        leadingTeamName: null
      }));
    }
    
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
        
        // Reset state on failure
        setAuctionState(prev => ({
          ...prev,
          currentPlayerId: null,
          currentPlayerName: null,
          biddingActive: false
        }));
        
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
      
      // Reset state on error
      setAuctionState(prev => ({
        ...prev,
        currentPlayerId: null,
        currentPlayerName: null,
        biddingActive: false
      }));
      
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
      console.log('🔨 Closing player bidding - sold:', sold);
      const response = await fetch(`${API_BASE}/player/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId: currentMatch.id,
          sold
        })
      });
      const data = await response.json();
      console.log('📋 Response:', data);
      
      if (data.success) {
        const statusMsg = sold ? '🔨 Player SOLD!' : '↩️ Player UNSOLD';
        console.log('✅', statusMsg);
        addSystemLog('info', statusMsg);
        alert(statusMsg);
        
        // ✅ AUTO-ADVANCE: After closing player, automatically start the next player
        console.log('⏳ Auto-advancing to next player in 500ms...');
        await new Promise(resolve => setTimeout(resolve, 500));
        await autoAdvanceToNextPlayer();
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

  // Auto-advance to next player using backend's get_next_player which auto-starts the player
  const autoAdvanceToNextPlayer = async (retryCount = 0) => {
    if (!currentMatch) return;
    try {
      console.log('🔍 Calling /auction/player/next to auto-advance...');
      
      const response = await fetch(`${API_BASE}/auction/player/next`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seasonId: currentMatch.id })
      });
      const result = await response.json();
      
      console.log('🔄 Auto-advance response:', result);
      
      if (result.success && result.data?.playerId) {
        console.log('✅ Next player auto-started:', result.data.playerId);
        addSystemLog('info', `✅ Auto-advanced to next player: ${result.data.playerName}`);
        
        // Wait for listeners to update state
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else if (result.data?.auctionComplete || result.auctionComplete) {
        console.log('🏁 Auction complete - no more players');
        setAuctionState(prev => ({ ...prev, status: 'ENDED' }));
        addSystemLog('info', '🏁 Auction Complete! All players have been auctioned.');
        alert('🏁 Auction Complete! All players have been auctioned.');
      } else {
        // Retry on transient errors
        const errorMsg = result.error || 'Unknown error';
        console.error('❌ Auto-advance failed:', errorMsg);
        
        if (retryCount < 2 && !errorMsg.includes('not found')) {
          console.log(`🔄 Retrying auto-advance (attempt ${retryCount + 1}/2)...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          return autoAdvanceToNextPlayer(retryCount + 1);
        }
        
        console.log('⚠️ Could not auto-advance. Full response:', result);
        addSystemLog('warning', '⚠️ Could not find next player to auction');
        alert('⚠️ Could not auto-advance to next player. Please manually start a player.');
      }
    } catch (error) {
      console.error('❌ Error auto-advancing:', error);
      
      // Retry on network errors
      if (retryCount < 2) {
        console.log(`🔄 Retrying due to network error (attempt ${retryCount + 1}/2)...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return autoAdvanceToNextPlayer(retryCount + 1);
      }
      
      addSystemLog('error', `Error auto-advancing: ${error instanceof Error ? error.message : 'Unknown error'}`);
      alert(`❌ Failed to auto-advance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Keep auctionStateRef in sync with auctionState for use in listeners/callbacks
  useEffect(() => {
    auctionStateRef.current = auctionState;
  }, [auctionState]);

  // CRITICAL: When bidding becomes inactive, force sync with actual LIVE player from Firebase
  // This ensures Auctioneer Dashboard shows the same player as all other dashboards
  useEffect(() => {
    if (!auctionState.biddingActive && auctionState.currentPlayerId === null) {
      // Bidding just ended and currentPlayerId is null (from onPlayerSold/onPlayerUnsold)
      // Find the actual LIVE player from our real-time players list
      const livePlayer = players.find(p => p.status === 'LIVE');
      
      console.log('🔄 SYNC CHECK: biddingActive=false, currentPlayerId=null', {
        livePlayerFound: !!livePlayer,
        livePlayerName: livePlayer?.name,
        livePlayerId: livePlayer?.id,
        totalPlayers: players.length,
        playersStatus: players.map(p => ({ name: p.name, status: p.status }))
      });
      
      if (livePlayer) {
        console.log('🔄 SYNCING: Auctioneer Dashboard to real LIVE player:', livePlayer.name);
        setAuctionState(prev => ({
          ...prev,
          currentPlayerId: livePlayer.id,
          currentPlayerName: livePlayer.name,
          currentBid: livePlayer.currentBid || livePlayer.basePrice || 0,
          leadingTeamId: livePlayer.leadingTeamId || null,
          leadingTeamName: livePlayer.leadingTeamName || null,
          biddingActive: livePlayer.currentBid > 0 // Assume bidding started if there's a bid
        }));
        
        // Fetch bid history for the synced player
        fetchBidHistoryForPlayer(livePlayer.id);
        console.log('✅ SYNC COMPLETE:', livePlayer.name, '- all dashboards should now show same player');
      } else {
        console.log('⏳ WAITING: No LIVE player found yet, will retry when players update');
      }
    }
  }, [auctionState.biddingActive, auctionState.currentPlayerId, players]);

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
              {auctionState.biddingActive && auctionState.currentPlayerId && players.find(p => p.id === auctionState.currentPlayerId) ? (
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
                    {auctionState.currentPlayerName || 'Unknown Player'}
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
                                <p className="text-xs text-purple-600 font-bold">₹{(Math.max(0, remainingBudget) / 100000).toFixed(1)}L</p>
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
                ) : (() => {
                  // Get unique player IDs to prevent duplicates
                  const seen = new Set<string>();
                  
                  // CRITICAL FIX: Filter out SOLD and UNSOLD - only show AVAILABLE players
                  // This prevents unsold players from re-appearing in the auction queue
                  const availablePlayers: Player[] = [];
                  players.forEach(p => {
                    if (!seen.has(p.id) && 
                        p.status === 'AVAILABLE' && // Only show AVAILABLE players
                        p.id !== auctionState?.currentPlayerId) { // Exclude current player
                      seen.add(p.id);
                      availablePlayers.push(p);
                    }
                  });

                  console.log('📋 Player Queue:', {
                    total: players.length,
                    available: availablePlayers.length,
                    sold: players.filter(p => p.status === 'SOLD').length,
                    unsold: players.filter(p => p.status === 'UNSOLD').length,
                    current: auctionState?.currentPlayerId
                  });

                  return availablePlayers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      {auctionState?.status === 'LIVE' ? '⏳ No more players available' : 'No players to auction'}
                    </div>
                  ) : (
                    availablePlayers.map((player, index) => (
                      <div
                        key={`available-${player.id}`}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                          auctionState?.currentPlayerId === player.id
                            ? 'bg-white border-green-400 shadow-[0_0_15px_rgba(34,197,94,0.6)]'
                            : index === 0 && auctionState?.status === 'LIVE'
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
                  );
                })()}
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

