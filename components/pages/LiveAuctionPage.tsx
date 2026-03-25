import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { LiveAuctionRoom } from '../ui/LiveAuctionRoom';
import { AuctioneerLiveRoom } from '../ui/AuctioneerLiveRoom';
import { SpectatorLiveRoom } from '../ui/SpectatorLiveRoom';
import { CloseAuctionModal } from '../modals/CloseAuctionModal';
import { PreAuctionValidationModal } from '../modals/PreAuctionValidationModal';
import { SoldCelebration } from '../ui/SoldCelebration';
import { useAuctioneerAudio } from '../../services/useAuctioneerAudio';
import { useAudioListener } from '../../services/useAudioListener';
import { useMatchConfigReadOnly } from '../../hooks/useMatchConfig';
import { subscribeToBidConfig, subscribeToCurrencyUnit, DEFAULT_CURRENCY_UNIT } from '../../services/matchConfigService';
import socketService from '../../services/socketService';
import { 
  LiveAuctionState, 
  LiveAuctionStatus,
  Player, 
  Team, 
  UserRole,
  LiveRoomPermissions,
  BidConfig,
  CurrencyUnit
} from '../../types';
import apiService from '../../services/apiService';

interface LiveAuctionPageProps {
  seasonId: string;
  userId: string;
  userRole: UserRole;
  userTeamId?: string;
  onClose?: () => void;
  onAuctionEnd?: () => void;
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
  onClose,
  onAuctionEnd
}) => {
  // State
  // CRITICAL: Do NOT accept props for player info - always discover from real-time listeners
  // This ensures Live Room shows actual LIVE player, not stale Dashboard state
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true); // Loading until Firebase confirms state
  const [auctionState, setAuctionState] = useState<LiveAuctionState | null>({
    status: LiveAuctionStatus.READY,
    currentPlayerId: null, // Always start fresh - let real-time systems sync
    currentPlayerName: null,
    currentBid: 0,
    leadingTeamId: null,
    leadingTeamName: null,
    biddingActive: false,
    bidHistory: []
  });
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  /**
   * CRITICAL: Filter players to only include APPROVED players
   * This is the SINGLE SOURCE OF TRUTH for auction-eligible players.
   * A declined or pending player must NEVER enter the auction flow.
   * 
   * STRICT: Only count players with approvalStatus === 'accepted'
   * This must match the Players page logic exactly.
   */
  const approvedPlayers = useMemo(() => {
    const approved = players.filter(p => p.approvalStatus === 'accepted');
    console.log('📊 LiveAuctionPage: Approved players:', approved.length, '/', players.length, 'Players breakdown:', players.map(p => ({ name: p.name, status: p.approvalStatus })));
    return approved;
  }, [players]);

  /**
   * CRITICAL: Filter teams to only include APPROVED teams
   * This is the SINGLE SOURCE OF TRUTH for auction-eligible teams.
   * A declined or pending team must NEVER enter the auction flow.
   * 
   * STRICT: Only count teams with approvalStatus === 'accepted'
   * This must match the Teams page logic exactly.
   */
  const approvedTeams = useMemo(() => {
    const approved = teams.filter(t => t.approvalStatus === 'accepted');
    console.log('📊 LiveAuctionPage: Approved teams:', approved.length, '/', teams.length);
    return approved;
  }, [teams]);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [soldAnimationData, setSoldAnimationData] = useState<{ player: Player; team: Team; price: number } | null>(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationData, setValidationData] = useState<{
    acceptedTeams: number;
    maxTeams: number;
    acceptedPlayers: number;
    requiredPlayers: number;
    canStart: boolean;
    errors: string[];
    warnings: string[];
  } | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Refs for real-time updates
  const playersRef = useRef<Player[]>([]);
  const teamsRef = useRef<Team[]>([]);
  const auctionStateRef = useRef<LiveAuctionState | null>(auctionState);
  const isAutoAdvancingRef = useRef<boolean>(false);
  const pageLoadTimeRef = useRef<number>(Date.now());
  const lastPlayerSwitchRef = useRef<{ playerId: string; timestamp: number } | null>(null);
  // Track when player_bidding_started event fires for a NEW player
  const newBiddingSessionRef = useRef<{ playerId: string; timestamp: number } | null>(null);
  // Track last player ID we loaded bid history for (prevents duplicate API calls)
  const lastBidHistoryPlayerIdRef = useRef<string | null>(null);

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
    seasonId,
    userId
  });

  // 💰 Match config for purse intelligence (real-time sync)
  const { config: matchConfig } = useMatchConfigReadOnly(seasonId);

  // 🎯 Bid config for dynamic increments (real-time sync)
  const [bidConfig, setBidConfig] = useState<BidConfig | null>(null);
  
  // 💱 Currency unit for display formatting (real-time sync)
  const [currencyUnit, setCurrencyUnit] = useState<CurrencyUnit>(DEFAULT_CURRENCY_UNIT);
  
  // Subscribe to bidConfig updates
  useEffect(() => {
    if (!seasonId) return;
    
    console.log('📊 [LiveAuction] Subscribing to bidConfig for season:', seasonId);
    const unsubscribe = subscribeToBidConfig(
      seasonId,
      (config) => {
        console.log('📊 [LiveAuction] BidConfig updated:', config);
        setBidConfig(config);
      },
      (error) => {
        console.error('📊 [LiveAuction] BidConfig error:', error);
      }
    );
    
    return () => unsubscribe();
  }, [seasonId]);
  
  // Subscribe to currencyUnit updates
  useEffect(() => {
    if (!seasonId) return;
    
    console.log('💱 [LiveAuction] Subscribing to currencyUnit for season:', seasonId);
    const unsubscribe = subscribeToCurrencyUnit(
      seasonId,
      (unit) => {
        console.log('💱 [LiveAuction] CurrencyUnit updated:', unit);
        setCurrencyUnit(unit);
      },
      (error) => {
        console.error('💱 [LiveAuction] CurrencyUnit error:', error);
      }
    );
    
    return () => unsubscribe();
  }, [seasonId]);

  /**
   * Connect to Firebase and join season room
   */
  useEffect(() => {
    console.log('🔄 LiveAuctionPage mounted - initializing...');
    
    // Join season room
    socketService.joinSeason(seasonId, userId, userRole);

    // Load initial data
    loadAuctionData();
    
    // Timeout fallback: Clear loading after 5 seconds if Firebase hasn't responded
    const loadingTimeout = setTimeout(() => {
      setIsInitialLoading(false);
      console.log('⏱️ Loading timeout reached - clearing loading state');
    }, 5000);
    
    console.log('✅ LiveAuctionPage initialization complete');
    
    return () => clearTimeout(loadingTimeout);
  }, [seasonId, userId, userRole]);

  /**
   * Handle F5 and CTRL+R refresh - reload live room data only, not entire page
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F5 or CTRL+R or CTRL+SHIFT+R
      if (e.key === 'F5' || (e.ctrlKey && (e.key === 'r' || e.key === 'R')) || (e.ctrlKey && e.shiftKey && (e.key === 'r' || e.key === 'R'))) {
        e.preventDefault();
        console.log('🔄 Soft refresh triggered - reloading Live Room data only');
        loadAuctionData();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [seasonId]); // Re-attach if seasonId changes

  // Keep playersRef in sync with APPROVED players state
  // CRITICAL: Use approvedPlayers (not raw players) so that declined players are NEVER in the refs
  useEffect(() => {
    playersRef.current = approvedPlayers;
  }, [approvedPlayers]);

  // Keep teamsRef in sync with teams state
  useEffect(() => {
    teamsRef.current = teams;
  }, [teams]);

  // Keep auctionStateRef in sync with auctionState
  useEffect(() => {
    auctionStateRef.current = auctionState;
  }, [auctionState]);

  // Sync currentPlayerName with currentPlayerId - if ID becomes null/invalid, clear name immediately
  useEffect(() => {
    if (auctionState && !auctionState.currentPlayerId && auctionState.currentPlayerName) {
      console.log('🔄 Clearing stale currentPlayerName because currentPlayerId is null');
      setAuctionState(prev => prev ? {
        ...prev,
        currentPlayerName: null,
        currentBid: 0,
        leadingTeamId: null,
        leadingTeamName: null
      } : null);
    }
  }, [auctionState?.currentPlayerId]);

  // CRITICAL: When bidding becomes inactive, force sync with actual LIVE player from Firebase
  // This ensures Live Rooms show the same player as Auctioneer Dashboard
  // CRITICAL: When bidding ends (currentPlayerId = null), find the LIVE player
  // BUT only run this during ACTUAL transitions, not when socket just updated with a new player
  useEffect(() => {
    // ONLY sync if:
    // 1. Bidding is NOT active
    // 2. currentPlayerId is NULL (transition state)
    // 3. We have players to check
    if (auctionState && !auctionState.biddingActive && auctionState.currentPlayerId === null && playersRef.current.length > 0) {
      // CRITICAL FIX: Only find players with status === 'LIVE' (NOT PENDING)
      // PENDING means "waiting to be auctioned", LIVE means "currently being auctioned"
      const livePlayer = playersRef.current.find(p => p.status === 'LIVE');
      
      console.log('🔄 SYNC CHECK (LiveRoom): biddingActive=false, currentPlayerId=null', {
        livePlayerFound: !!livePlayer,
        livePlayerName: livePlayer?.name,
        livePlayerId: livePlayer?.id,
        totalPlayers: playersRef.current.length
      });
      
      if (livePlayer) {
        console.log('🔄 SYNCING (LiveRoom): to real LIVE player:', livePlayer.name);
        setCurrentPlayer(livePlayer);
        setAuctionState(prev => prev ? {
          ...prev,
          currentPlayerId: livePlayer.id,
          currentPlayerName: livePlayer.name,
          currentBid: livePlayer.currentBid || livePlayer.basePrice || 0,
          leadingTeamId: livePlayer.leadingTeamId || null,
          leadingTeamName: livePlayer.leadingTeamName || null,
          biddingActive: livePlayer.currentBid > 0 // Assume bidding started if there's a bid
        } : prev);
        console.log('✅ SYNC COMPLETE (LiveRoom):', livePlayer.name, '- all dashboards should now show same player');
      } else {
        console.log('⏳ WAITING (LiveRoom): No LIVE player found yet, will retry when players update');
      }
    }
  }, [auctionState?.biddingActive, auctionState?.currentPlayerId]);

  // Update currentPlayer object when auctionState.currentPlayerId changes (from parent sync)
  // This ensures AuctioneerLiveRoom always has the correct player object to display
  // Track last synced player ID to prevent redundant updates
  const lastSyncedPlayerIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (auctionState?.currentPlayerId && playersRef.current.length > 0) {
      // Find player in our real-time players list
      const playerInList = playersRef.current.find(p => p.id === auctionState.currentPlayerId);
      if (playerInList) {
        // CRITICAL: Only log and set if player ID actually changed (prevents infinite re-renders)
        if (lastSyncedPlayerIdRef.current !== playerInList.id) {
          console.log('🎯 Updating current player from list:', playerInList.name);
          lastSyncedPlayerIdRef.current = playerInList.id;
          setCurrentPlayer(playerInList);
        }
      } else {
        // Player not in list yet - don't make async API calls (causes race conditions)
        // Real-time listener will bring the updated player soon
        console.log('⏳ Parent synced to player not yet in list:', auctionState.currentPlayerId);
      }
    }
  }, [auctionState?.currentPlayerId]); // Only re-run when currentPlayerId changes, NOT when players array changes

  // Load bid history whenever current player changes
  // This ensures bid history is restored when re-entering Live Room or when player changes
  useEffect(() => {
    if (auctionState?.currentPlayerId && seasonId) {
      // CRITICAL: Only load if we haven't already loaded for this player (prevents duplicate API calls)
      if (auctionState.currentPlayerId !== lastBidHistoryPlayerIdRef.current) {
        console.log('💰 Loading bid history for current player:', auctionState.currentPlayerId);
        lastBidHistoryPlayerIdRef.current = auctionState.currentPlayerId;
        loadBidHistory(auctionState.currentPlayerId, seasonId);
      }
    } else if (!auctionState?.currentPlayerId) {
      // No current player, clear bid history and reset ref
      console.log('🧹 Clearing bid history (no current player)');
      lastBidHistoryPlayerIdRef.current = null;
      setAuctionState(prev => prev ? { ...prev, bidHistory: [] } : null);
    }
  }, [auctionState?.currentPlayerId, seasonId]);

  // AUTO-RECOVERY: When auction is LIVE but stuck with no current player, auto-fetch next player
  // This handles the case where UNSOLD happened but next player wasn't fetched (e.g., network issue)
  useEffect(() => {
    // Only for auctioneers - they control the flow
    if (userRole !== UserRole.AUCTIONEER) return;
    
    // Only trigger when:
    // 1. Auction status is LIVE
    // 2. No current player
    // 3. Bidding is not active
    // 4. We have players loaded (initialization complete)
    // 5. Haven't already attempted auto-advance
    const isStuckState = 
      auctionState?.status === LiveAuctionStatus.LIVE &&
      !auctionState?.currentPlayerId &&
      !auctionState?.biddingActive &&
      approvedPlayers.length > 0 &&
      !isAutoAdvancingRef.current;
    
    if (!isStuckState) return;
    
    // Check if there are any available APPROVED players left
    // CRITICAL: Only select from approvedPlayers (never from raw players)
    // CRITICAL FIX: Include PENDING status - players can have either before auction
    const availableApprovedPlayers = approvedPlayers.filter(p => p.status === 'AVAILABLE' || p.status === 'PENDING' || p.status === 'UNSOLD' || !p.status);
    if (availableApprovedPlayers.length === 0) {
      console.log('✅ No available approved players left - auction complete');
      return;
    }
    
    // Delay to ensure page is fully initialized and this isn't a transient state
    const autoAdvanceTimeout = setTimeout(async () => {
      // Double-check conditions haven't changed
      if (auctionStateRef.current?.currentPlayerId || auctionStateRef.current?.biddingActive) {
        console.log('⏭️ State changed during delay, skipping auto-advance');
        return;
      }
      
      console.log('🔄 AUTO-RECOVERY: Auction is LIVE but stuck with no player, fetching next player...');
      isAutoAdvancingRef.current = true;
      
      try {
        const nextResult = await apiService.post('/api/auction/player/next', {
          seasonId
        });
        
        if (nextResult.success) {
          console.log('✅ AUTO-RECOVERY: Successfully fetched next player:', nextResult.data);
        } else if (nextResult.data?.auctionComplete) {
          console.log('✅ AUTO-RECOVERY: Auction complete - no more players');
        } else {
          console.warn('⚠️ AUTO-RECOVERY: Failed to fetch next player:', nextResult.error);
        }
      } catch (error) {
        console.error('❌ AUTO-RECOVERY: Error fetching next player:', error);
      } finally {
        // Reset flag after a delay to allow retry if needed
        setTimeout(() => {
          isAutoAdvancingRef.current = false;
        }, 5000);
      }
    }, 2000); // 2 second delay to ensure initialization is complete
    
    return () => clearTimeout(autoAdvanceTimeout);
  }, [auctionState?.status, auctionState?.currentPlayerId, auctionState?.biddingActive, approvedPlayers.length, userRole, seasonId]);

  /**
   * Normalize team data to ensure consistent structure
   */
  const normalizeTeams = (teamsData: any[]): Team[] => {
    return teamsData.map((team: any) => ({
      ...team,
      players: team.playerIds || team.players || [],
      squadSize: team.playerIds?.length || team.players?.length || 0,
      remainingBudget: team.remainingBudget ?? team.budget ?? team.initialBudget ?? 0
    }));
  };

  /**
   * Load teams for this season
   * CRITICAL FIX for Issue #1: Ensures teams are fetched from database
   */
  const loadTeamsData = async () => {
    try {
      console.log('📥 [LiveAuctionPage] Fetching teams for seasonId:', seasonId);
      const teamsResponse = await apiService.get(`/api/teams?seasonId=${seasonId}`);
      if (teamsResponse.success && teamsResponse.data) {
        console.log('✅ [LiveAuctionPage] Loaded', teamsResponse.data.length, 'teams');
        teamsResponse.data.forEach(t => {
          console.log(`   - ${t.name} (approvalStatus: ${t.approvalStatus || 'undefined'}, remainingBudget: ${t.remainingBudget || 'undefined'})`);
        });
        const normalizedTeams = normalizeTeams(teamsResponse.data);
        setTeams(normalizedTeams);
      } else {
        console.warn('⚠️ [LiveAuctionPage] Failed to load teams:', teamsResponse.error);
      }
    } catch (error) {
      console.error('❌ [LiveAuctionPage] Failed to load teams:', error);
    }
  };

  /**
   * Load auction data with live bidding info
   * CRITICAL FIX for Issue #1: Live Room shows no teams/players
   * 
   * Ensures we fetch teams AND players from the database on page load,
   * and sets initial state so they can be displayed in the Live Room.
   */
  const loadAuctionData = async () => {
    try {
      console.log('📥 [LiveAuctionPage] Starting auction data load...');
      
      // Load all players for this season
      console.log('📥 [LiveAuctionPage] Fetching players for seasonId:', seasonId);
      const playersResponse = await apiService.get(`/api/players?seasonId=${seasonId}`);
      if (playersResponse.success) {
        const playersData = playersResponse.data || [];
        console.log('✅ [LiveAuctionPage] Loaded', playersData.length, 'players');
        playersData.forEach(p => {
          console.log(`   - ${p.name} (approvalStatus: ${p.approvalStatus || 'undefined'}, status: ${p.status})`);
        });
        setPlayers(playersData);
      } else {
        console.warn('⚠️ [LiveAuctionPage] Failed to load players:', playersResponse.error);
      }

      // ALWAYS load teams (remove conditional skip)
      console.log('📥 [LiveAuctionPage] Fetching teams for seasonId:', seasonId);
      await loadTeamsData();

      console.log('✅ [LiveAuctionPage] Initial auction data load complete');
      
      // SKIP loading auction state from API - socket updates provide it
      // Real-time listeners will sync currentPlayerId and bid info
      // This prevents stale state loads when re-entering Live Room
    } catch (error) {
      console.error('❌ [LiveAuctionPage] Failed to load auction data:', error);
    }
  };

  /**
   * Load bid history for current player
   * OPTIMIZATION: Checks if already loaded for this player to prevent duplicate API calls
   */
  const loadBidHistory = async (playerId: string, auctionId: string, force: boolean = false) => {
    // Skip if we've already loaded for this player (unless force=true)
    if (!force && playerId === lastBidHistoryPlayerIdRef.current) {
      console.log('⏭️ Skipping bid history load - already loaded for:', playerId);
      return;
    }
    
    lastBidHistoryPlayerIdRef.current = playerId;
    
    try {
      console.log('Fetching bid history for player:', playerId);
      const bidsResponse = await apiService.get(`/api/bids?seasonId=${auctionId}&playerId=${playerId}`);
      if (bidsResponse.success && bidsResponse.data) {
        const bids = bidsResponse.data || [];
        // Sort bids by timestamp descending (most recent first)
        const sortedBids = bids.sort((a: any, b: any) => {
          const timeA = new Date(a.timestamp || 0).getTime();
          const timeB = new Date(b.timestamp || 0).getTime();
          return timeB - timeA;
        });
        console.log('✓ Fetched bid history:', sortedBids.length, 'bids');
        
        // Convert bids to bid history format
        const bidHistory = sortedBids.map((bid: any) => ({
          teamId: bid.teamId,
          teamName: bid.teamName,
          amount: bid.amount,
          timestamp: bid.timestamp
        }));
        
        // IMPORTANT: Use bid history to restore current bid state
        // This ensures auction state is accurate after login/refresh
        if (sortedBids.length > 0) {
          const latestBid = sortedBids[0];
          console.log('📍 Restoring current bid from history:', latestBid.amount, 'by', latestBid.teamName);
          setAuctionState(prev => prev ? {
            ...prev,
            bidHistory: bidHistory,
            currentBid: latestBid.amount,
            leadingTeamId: latestBid.teamId,
            leadingTeamName: latestBid.teamName
          } : null);
        } else {
          setAuctionState(prev => prev ? {
            ...prev,
            bidHistory: bidHistory
          } : null);
        }
      }
    } catch (error) {
      console.error('Failed to load bid history:', error);
    }
  };

  /**
   * Restore auction state from Firestore with retry logic
   */
  const restoreAuctionStateFromFirestore = async (retryCount = 0) => {
    if (!seasonId) return;
    try {
      console.log('🔄 Restoring auction state from Firestore (attempt', retryCount + 1, ')...');
      // Fetch the live auction state document
      const response = await fetch(`https://us-central1-axilam.cloudfunctions.net/auction/matches/${seasonId}`);
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
        if (!prev) return prev;
        const hasChanges =
          (auctionState.status && auctionState.status !== prev.status) ||
          (auctionState.currentPlayerId && auctionState.currentPlayerId !== prev.currentPlayerId) ||
          (auctionState.currentBid && auctionState.currentBid !== prev.currentBid) ||
          (auctionState.leadingTeamId && auctionState.leadingTeamId !== prev.leadingTeamId);
        
        if (!hasChanges) {
          console.log('✓ Data unchanged, skipping update');
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

  /**
   * Socket event listeners with setupListeners pattern
   */
  useEffect(() => {
    if (!seasonId) return;

    console.log('🔥 Setting up real-time listeners for season:', seasonId);

    // Join season to set up context
    socketService.joinSeason(seasonId, userId, userRole);

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
        setupListeners();
      } catch (err) {
        console.error('State restoration error:', err);
        restorationComplete = true;
        // Still set up listeners even if restoration failed
        setupListeners();
      }
    })();

    function setupListeners() {
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
      
      // Listen to audit state updates from backend
      const stateUnsubscribe = socketService.onAuctionStateUpdate((state) => {
        console.log('📡 Auction state updated:', state);
        
        // 🔄 LOADING STATE: Clear initial loading once Firebase confirms state
        setIsInitialLoading(false);
        
        setAuctionState(prev => {
          // CRITICAL FIX: Do NOT update currentPlayerId and currentPlayerName from this listener
          // These are only updated by the onPlayersUpdate listener which reads the real-time player.status field
          // Allowing both listeners to update currentPlayerId causes flickering/switching between players
          const updated = { ...(prev || {}) };
          
          // Only update non-player-id fields from liveAuctions document
          if (state.status !== undefined) updated.status = state.status;
          if (state.currentBid !== undefined) updated.currentBid = state.currentBid;
          if (state.leadingTeamId !== undefined) updated.leadingTeamId = state.leadingTeamId;
          if (state.leadingTeamName !== undefined) updated.leadingTeamName = state.leadingTeamName;
          if (state.biddingActive !== undefined) updated.biddingActive = state.biddingActive;
          if (state.remainingSeconds !== undefined) updated.remainingSeconds = state.remainingSeconds;
          
          // CRITICAL: When bidding ends (becomes false), clear stale bypass flag
          // This prevents old bypass windows from blocking new player recognition
          if (state.biddingActive === false && prev?.biddingActive === true) {
            console.log('🔄 Bidding ended, clearing stale bypass flag for transition to next player');
            newBiddingSessionRef.current = null;
          }
          
          // CRITICAL: Update ref IMMEDIATELY so onPlayersUpdate sees the change
          auctionStateRef.current = {
            ...auctionStateRef.current,
            ...updated
          };
          
          // CRITICAL: Sync parent's player decision (if present)
          // This is how parent tells LiveRoom which player to show
          if (state.currentPlayerId && state.currentPlayerId !== (prev?.currentPlayerId)) {
            console.log('🔄 LiveRoom syncing player change from parent:', state.currentPlayerId, 'from:', prev?.currentPlayerId);
            updated.currentPlayerId = state.currentPlayerId;
            updated.currentPlayerName = state.currentPlayerName || updated.currentPlayerName;
            // Clear bypass flag since we just accepted a new player
            newBiddingSessionRef.current = null;
            
            // Update ref for the new player
            auctionStateRef.current = {
              ...auctionStateRef.current,
              currentPlayerId: state.currentPlayerId,
              currentPlayerName: state.currentPlayerName
            };
          }
          
          // NEVER override currentPlayerId and currentPlayerName from this listener unless parent sends it
          // Only the onPlayersUpdate listener (which reads player.status='LIVE') is the source of truth
          // This prevents the flickering bug where player keeps switching
          
          return updated;
        });
      });
      unsubscribers.push(stateUnsubscribe);

      // Listen to auction started
      const startedUnsubscribe = socketService.onAuctionStarted((data) => {
        console.log('🎬 Auction started!');
        setAuctionState(prev => ({ ...(prev || {}), status: LiveAuctionStatus.LIVE }));
      });
      unsubscribers.push(startedUnsubscribe);

      // Listen to auction ended
      const endedUnsubscribe = socketService.onAuctionEnded((data) => {
        console.log('🏁 Auction ended!');
        setAuctionState(prev => ({ ...(prev || {}), status: LiveAuctionStatus.ENDED }));
        // Exit live room when auction ends (for admin/auctioneer)
        if ((userRole === UserRole.ADMIN || userRole === UserRole.AUCTIONEER) && onClose) {
          onClose();
        }
      });
      unsubscribers.push(endedUnsubscribe);

      // Listen to timer updates
      const timerUnsubscribe = socketService.onTimerUpdate((data) => {
        setAuctionState(prev => ({ ...(prev || {}), remainingSeconds: data.remainingSeconds }));
      });
      unsubscribers.push(timerUnsubscribe);

      // Listen to player bidding started
      const biddingUnsubscribe = socketService.onPlayerBiddingStarted((data) => {
        console.log('Player bidding started:', data);
        if (!data?.player) {
          // Clear bid history but don't clear currentPlayerId - let players listener handle it
          setAuctionState(prev => ({
            ...(prev || {}),
            biddingActive: false,
            currentBid: 0,
            leadingTeamId: null,
            leadingTeamName: null,
            bidHistory: []
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
        // Use playersRef.current (not players state) because this listener was created once
        // and captures stale players. playersRef is kept in sync via useEffect.
        const playerInList = playersRef.current.find(p => p.id === newPlayerId);
        if (playerInList && playerInList.status === 'LIVE') {
          console.log('🔓 FORCE SWITCH: New player already in list, forcing switch immediately:', playerInList.name);
          loadBidHistory(newPlayerId, seasonId);
          lastPlayerSwitchRef.current = { playerId: newPlayerId, timestamp: now };
          
          // CRITICAL FIX: Also set currentPlayer directly so SpectatorLiveRoom displays correctly
          setCurrentPlayer(playerInList);
          
          setAuctionState(prev => ({
            ...(prev || {}),
            currentPlayerId: newPlayerId,
            currentPlayerName: playerInList.name,
            currentBid: (playerInList.currentBid) || (data.basePrice) || 0,
            leadingTeamId: playerInList.leadingTeamId || null,
            leadingTeamName: playerInList.leadingTeamName || null,
            biddingActive: true,
            status: LiveAuctionStatus.LIVE
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

        // CRITICAL FIX: If we have player data from the event, use it to set currentPlayer
        // This ensures SpectatorLiveRoom displays the player immediately without waiting for onPlayersUpdate
        if (data.player) {
          console.log('🎯 Setting current player from event data:', data.player.name || newPlayerId);
          // Create player object from event data
          const playerFromEvent: Player = {
            id: newPlayerId,
            name: data.player.name || data.playerName || 'Unknown',
            basePrice: data.basePrice || data.player.basePrice || 0,
            status: 'LIVE',
            matchId: seasonId,
            // Required fields with defaults
            team: '',
            role: data.player.role || '',
            imageUrl: data.player.imageUrl || '',
            photoUrl: data.player.photoUrl || '',
            playerCategory: data.player.playerCategory || '',
            nationality: data.player.nationality || '',
            age: data.player.age || 0,
            gender: data.player.gender || '',
            currentBid: data.basePrice || data.player.basePrice || 0,
            leadingTeamId: null,
            leadingTeamName: null
          } as Player;
          
          setCurrentPlayer(playerFromEvent);
          
          // Also set currentPlayerId in auctionState
          setAuctionState(prev => ({
            ...(prev || {}),
            currentPlayerId: newPlayerId,
            currentPlayerName: playerFromEvent.name,
            currentBid: data.basePrice ?? 0,
            leadingTeamId: null,
            leadingTeamName: null,
            biddingActive: true,
            status: LiveAuctionStatus.LIVE
          }));
          
          // Load bid history
          loadBidHistory(newPlayerId, seasonId);
        } else {
          // No player data in event - let onPlayersUpdate handle it
          console.log('⏳ No player data in event, waiting for onPlayersUpdate...');
          setAuctionState(prev => ({
            ...(prev || {}),
            currentBid: data.basePrice ?? 0,
            leadingTeamId: null,
            leadingTeamName: null,
            biddingActive: true
            // currentPlayerId will be set by the players listener, NOT by this event
          }));
        }
        
        // Don't fetch bid history here - the players listener will do it when it updates currentPlayerId
      });
      unsubscribers.push(biddingUnsubscribe);

      // Listen to player switch events (when auctioneer manually switches players)
      const playerSwitchUnsubscribe = socketService.onPlayerSwitched((switchData) => {
        console.log('🔄 PLAYER SWITCHED EVENT RECEIVED:', switchData);
        
        if (!switchData?.newPlayerId) return;
        
        const newPlayerId = switchData.newPlayerId;
        const newPlayerName = switchData.newPlayerName;
        const basePrice = switchData.basePrice || 0;
        
        // Update refs for lock mechanism
        const now = Date.now();
        lastPlayerSwitchRef.current = { playerId: newPlayerId, timestamp: now };
        auctionStateRef.current = {
          ...auctionStateRef.current,
          currentPlayerId: newPlayerId,
          currentPlayerName: newPlayerName,
          biddingActive: true
        };
        
        // CRITICAL: Use playersRef.current (not players state) because this listener was created once
        // and captures stale players. playersRef is kept in sync via useEffect.
        const newPlayer = playersRef.current.find(p => p.id === newPlayerId);
        
        if (newPlayer) {
          console.log('🔄 PLAYER SWITCHED: Full player data found, updating UI to:', newPlayerName);
          setCurrentPlayer(newPlayer);
        } else {
          // Player not in list yet - create a partial object with essential data
          // The real player will be added to the list when players listener fires
          console.log('🔄 PLAYER SWITCHED: Using partial player data, full data will arrive shortly. Players in ref:', playersRef.current.length);
          setCurrentPlayer({
            id: newPlayerId,
            name: newPlayerName,
            basePrice: basePrice,
            status: 'LIVE',
            matchId: seasonId,
            // Add minimal required fields
            team: '',
            role: '',
            imageUrl: '',
            photoUrl: '',
            playerCategory: '',
            nationality: '',
            age: 0,
            gender: ''
          } as Player);
        }
        
        // Immediately update auction state with new player details
        setAuctionState(prev => ({
          ...(prev || {}),
          currentPlayerId: newPlayerId,
          currentPlayerName: newPlayerName,
          currentBid: basePrice,
          leadingTeamId: null,
          leadingTeamName: null,
          biddingActive: true,
          status: LiveAuctionStatus.LIVE,
          bidHistory: []
        }));
        
        // Load bid history for new player
        loadBidHistory(newPlayerId, seasonId);
      });
      unsubscribers.push(playerSwitchUnsubscribe);

      // Listen to new bids
      const bidUnsubscribe = socketService.onNewBid((data) => {
        console.log('New bid:', data);
        setAuctionState(prev => {
          if (!prev || !data) return prev;
          
          const newHistory = [...(prev?.bidHistory || [])];
          newHistory.unshift(data);
          const trimmedHistory = newHistory.slice(0, 20);

          return {
            ...(prev || {}),
            currentBid: data.amount,
            leadingTeamId: data.teamId,
            leadingTeamName: data.teamName,
            bidHistory: trimmedHistory
          };
        });
      });
      unsubscribers.push(bidUnsubscribe);

      // Listen to player updated
      const playerUpdatedUnsubscribe = socketService.onPlayerUpdated((data) => {
        console.log('Player updated:', data);
        setPlayers(prev => prev.map(p => p.id === data.playerId ? data.player : p));
      });
      unsubscribers.push(playerUpdatedUnsubscribe);

      // Listen to player sold
      const soldUnsubscribe = socketService.onPlayerSold(async (data) => {
        console.log('🔨 Player sold event received:', data);
        
        // ✅ FIX: Ignore stale events from before page load (prevents old celebrations on Live Room entry)
        const eventTimestamp = data.timestamp?.toMillis ? data.timestamp.toMillis() : Date.now();
        const timeSincePageLoad = Date.now() - pageLoadTimeRef.current;
        const eventAge = Date.now() - eventTimestamp;
        
        if (eventAge > 5000 && timeSincePageLoad < 10000) {
          console.log('⏭️ IGNORING stale player_sold event from before page load:', {
            eventAge: `${eventAge}ms ago`,
            timeSincePageLoad: `${timeSincePageLoad}ms`,
            playerName: data.playerName
          });
          return;
        }
        
        // Find player and team for celebration
        const soldPlayer = playersRef.current.find(p => p.id === data.playerId);
        const buyingTeam = teamsRef.current.find(t => t.id === data.teamId);
        
        // Trigger celebration animation
        if (soldPlayer && buyingTeam) {
          console.log('🎉 Triggering sold celebration for:', soldPlayer.name);
          setSoldAnimationData({ 
            player: soldPlayer, 
            team: buyingTeam, 
            price: data.finalAmount 
          });
        }
        
        // Update UI to reflect that current player is no longer active
        setAuctionState(prev => ({
          ...(prev || {}),
          biddingActive: false,
          currentPlayerId: null,
          currentPlayerName: null,
          bidHistory: []
        }));
        
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
                players: [...(t.players || []), data.playerId],
                remainingBudget: (t.remainingBudget || 0) - data.finalAmount
              }
            : t
        ));
        
        // ❌ REMOVED: Auto-advance handled by AuctioneerDashboardPage to prevent duplicate calls
        // (LiveAuctionPage receives same events, causing race conditions)
      });
      unsubscribers.push(soldUnsubscribe);

      // Listen to player unsold
      const unsoldUnsubscribe = socketService.onPlayerUnsold((data) => {
        console.log('↩️ Player unsold event received:', data);
        
        // ✅ FIX: Ignore stale events from before page load
        const eventTimestamp = data.timestamp?.toMillis ? data.timestamp.toMillis() : Date.now();
        const timeSincePageLoad = Date.now() - pageLoadTimeRef.current;
        const eventAge = Date.now() - eventTimestamp;
        
        if (eventAge > 5000 && timeSincePageLoad < 10000) {
          console.log('⏭️ IGNORING stale player_unsold event from before page load:', {
            eventAge: `${eventAge}ms ago`,
            timeSincePageLoad: `${timeSincePageLoad}ms`,
            playerName: data.playerName
          });
          return;
        }
        
        // Clear current player when unsold
        setAuctionState(prev => ({
          ...(prev || {}),
          biddingActive: false,
          currentPlayerId: null,
          currentPlayerName: null,
          bidHistory: []
        }));
        
        // Update player status
        setPlayers(prev => prev.map(p => 
          p.id === data.playerId 
            ? { ...p, status: 'UNSOLD', unsoldCount: (p.unsoldCount || 0) + 1 }
            : p
        ));
        
        // ❌ REMOVED: Auto-advance handled by AuctioneerDashboardPage to prevent duplicate calls
        // (LiveAuctionPage receives same events, causing race conditions)
      });
      unsubscribers.push(unsoldUnsubscribe);

      // Listen to players collection for live updates
      // DEBOUNCED to prevent rapid flickering
      let playersUpdateTimeout: NodeJS.Timeout | null = null;
      
      const playersUnsubscribe = socketService.onPlayersUpdate(seasonId, (updatedPlayers) => {
        // Debounce rapid updates to prevent flickering - increased to 500ms
        if (playersUpdateTimeout) clearTimeout(playersUpdateTimeout);
        
        playersUpdateTimeout = setTimeout(() => {
          console.log('🔥 Players live update (debounced):', updatedPlayers.length);
          
          /**
           * CRITICAL FIX: Filter out DECLINED players BEFORE any processing
           * A declined player must NEVER be considered for LIVE status.
           * This is the FIRST line of defense.
           */
          const approvedUpdatedPlayers = updatedPlayers.filter((p: any) => 
            p.approvalStatus === 'accepted' || 
            p.approvalStatus === undefined || 
            p.approvalStatus === null
          );
          
          // Update state with ALL players (for display purposes like total counts)
          setPlayers(updatedPlayers);

          // CRITICAL: Find ALL players with LIVE status from APPROVED players only
          const allLivePlayers = approvedUpdatedPlayers.filter((p: any) => p.status === 'LIVE');
          
          if (allLivePlayers.length > 1) {
            console.error('🚨 CRITICAL: Multiple players with LIVE status detected!', 
              allLivePlayers.map(p => ({ id: p.id, name: p.name })));
            console.error('🚨 This causes player flickering - backend needs to fix this');
          }
          
          // Find live player - if multiple exist, prefer the one matching currentPlayerId (if set)
          let livePlayer = allLivePlayers.length > 0 ? allLivePlayers[0] : null;
          
          // CRITICAL GUARD: Verify livePlayer is APPROVED before proceeding
          if (livePlayer && livePlayer.approvalStatus === 'declined') {
            console.error('🚫 BLOCKING: Live player is DECLINED - skipping:', livePlayer.name);
            livePlayer = null;
          }
          
          if (allLivePlayers.length > 1 && auctionStateRef.current?.currentPlayerId) {
            // Multiple LIVE players detected - prefer the current one
            const currentLivePlayer = allLivePlayers.find(p => p.id === auctionStateRef.current?.currentPlayerId);
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
            currentPlayerId: auctionStateRef.current?.currentPlayerId,
            areSame: livePlayer?.id === auctionStateRef.current?.currentPlayerId,
            biddingActive: auctionStateRef.current?.biddingActive
          });
          
          setAuctionState(prev => {
            const now = Date.now();
            
            // LAYER 3: BIDDING-ACTIVE LOCK (with bypass for new bidding sessions)
            // Never switch players during active bidding (prevents disruption)
            // EXCEPT when player_bidding_started event has fired for a different player
            // CRITICAL: Use auctionStateRef.current for comparison since prev can be stale when multiple onPlayersUpdate fires in quick succession
            const currentRefPlayerId = auctionStateRef.current?.currentPlayerId;
            
            if (prev?.biddingActive && currentRefPlayerId) {
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
                    ...(prev || {}),
                    currentPlayerId: livePlayer.id,
                    currentPlayerName: livePlayer.name,
                    currentBid: livePlayer.currentBid || livePlayer.basePrice || 0,
                    leadingTeamId: livePlayer.leadingTeamId || null,
                    leadingTeamName: livePlayer.leadingTeamName || null,
                    biddingActive: true,
                    status: LiveAuctionStatus.LIVE
                  };
                  // Update ref IMMEDIATELY (don't wait for React state to commit)
                  auctionStateRef.current = newState;
                  
                  // CRITICAL FIX: Also set currentPlayer directly so SpectatorLiveRoom displays correctly
                  setCurrentPlayer(livePlayer);
                  
                  // Clear the bypass flag
                  newBiddingSessionRef.current = null;
                  // Record this player switch
                  lastPlayerSwitchRef.current = { playerId: livePlayer.id, timestamp: now };
                  // Fetch bid history for the new player
                  loadBidHistory(livePlayer.id, seasonId);
                  
                  // Return the new state for React to update
                  return newState;
                } else {
                  console.log('🔒 LOCKED: Bidding active on player', currentRefPlayerId, '- blocking switch to different player', livePlayer.id);
                  // Just update bid info, never change currentPlayerId while bidding
                  return {
                    ...(prev || {}),
                    currentBid: livePlayer.currentBid || livePlayer.basePrice || prev?.currentBid || 0,
                    leadingTeamId: livePlayer.leadingTeamId || prev?.leadingTeamId,
                    leadingTeamName: livePlayer.leadingTeamName || prev?.leadingTeamName
                  };
                }
              }
            }

            // CRITICAL: If current player is already set and matches the LIVE player, skip update
            // This prevents unnecessary re-renders and flickering
            // IMPORTANT: Use auctionStateRef to handle race condition where prev is stale after force switch in event handler
            const refCurrentPlayerId = auctionStateRef.current?.currentPlayerId || prev?.currentPlayerId;
            if (refCurrentPlayerId && livePlayer && livePlayer.id === refCurrentPlayerId) {
              // SAME PLAYER - only update bid/team info, never change currentPlayerId
              console.log('✅ Same LIVE player, updating bid only (no player switch)');
              return {
                ...(prev || {}),
                currentBid: livePlayer.currentBid || livePlayer.basePrice || prev?.currentBid || 0,
                leadingTeamId: livePlayer.leadingTeamId || prev?.leadingTeamId,
                leadingTeamName: livePlayer.leadingTeamName || prev?.leadingTeamName,
                biddingActive: true
              };
            }
            
            if (livePlayer) {
              console.log('🔥 Live player found:', livePlayer.name, 'Current bid:', livePlayer.currentBid);
              
              // DIFFERENT PLAYER - only update if we don't have a current player
              // or if bidding is not active (player was closed)
              // IMPORTANT: Use refCurrentPlayerId to handle race condition where prev is stale after force switch
              if (!refCurrentPlayerId || !prev?.biddingActive) {
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
                  return prev || {};
                }
                
                // PAGE LOAD GRACE PERIOD: Don't switch players within first 3 seconds after page load
                // This lets Firebase fully sync and prevents seeing stale LIVE status during reconnection
                const timeSincePageLoad = now - pageLoadTimeRef.current;
                if (refCurrentPlayerId && timeSincePageLoad < 3000 && livePlayer.id !== refCurrentPlayerId) {
                  console.log(`⏳ PAGE LOAD GRACE: Only ${timeSincePageLoad}ms since page load - keeping current player to allow Firebase sync`);
                  return prev || {};
                }
                
                console.log('🔄 New LIVE player detected, switching to:', livePlayer.name);
                // Record this player switch
                lastPlayerSwitchRef.current = { playerId: livePlayer.id, timestamp: now };

                // CRITICAL FIX: Also set currentPlayer directly so SpectatorLiveRoom displays correctly
                setCurrentPlayer(livePlayer);

                // Fetch bid history for the LIVE player
                loadBidHistory(livePlayer.id, seasonId);
                
                // CRITICAL: Do NOT set biddingActive=true during auto-advance
                // biddingActive should only be true when onPlayerBiddingStarted fires (backend confirms bidding started)
                // Setting it here causes lock to apply when next LIVE player is detected
                return {
                  ...(prev || {}),
                  currentPlayerId: livePlayer.id,
                  currentPlayerName: livePlayer.name,
                  currentBid: livePlayer.currentBid || livePlayer.basePrice || 0,
                  leadingTeamId: livePlayer.leadingTeamId || null,
                  leadingTeamName: livePlayer.leadingTeamName || null,
                  // ❌ NOT setting biddingActive: true here - let onPlayerBiddingStarted set it
                  status: LiveAuctionStatus.LIVE
                };
              } else {
                // We have a different player as current AND bidding is active
                // Don't switch - keep bidding on current player
                console.log('⚠️ Different LIVE player found but keeping current player:', refCurrentPlayerId);
                return prev || {};
              }
            } else {
              console.log('❌ NO LIVE PLAYER FOUND', {
                hadCurrentPlayerId: !!prev?.currentPlayerId,
                currentPlayerId: prev?.currentPlayerId
              });
              
              // No live player found - if we had one and bidding was active, don't clear it yet
              // The player might just be transitioning
              if (prev?.currentPlayerId && prev?.biddingActive) {
                console.log('⏳ No LIVE player but keeping current for now (may be transitioning)');
                return prev || {};
              }
              
              // If bidding is not active and we had a player, it was closed
              if (prev?.currentPlayerId && !prev?.biddingActive) {
                console.log('✓ Current player was closed, clearing...');
                return {
                  ...(prev || {}),
                  currentPlayerId: null,
                  currentPlayerName: null
                };
              }
              
              return prev || {};
            }
          });
        }, 500); // Debounce rapid updates - wait 500ms
      });

      // Cleanup debounce timer on unmount
      unsubscribers.push(() => {
        if (playersUpdateTimeout) clearTimeout(playersUpdateTimeout);
        playersUnsubscribe();
      });

      // Listen to teams collection for live updates (budget changes, new teams, etc.)
      const teamsUnsubscribe = socketService.onTeamsUpdate(seasonId, (updatedTeams) => {
        console.log('🔥 Teams live update:', updatedTeams.length);
        
        // Update teams state with normalized data
        const normalizedTeams = normalizeTeams(updatedTeams);
        setTeams(normalizedTeams);
      });
      unsubscribers.push(teamsUnsubscribe);
    }

    // Cleanup listeners on unmount
    return () => {
      console.log('🔥 Cleaning up real-time listeners');
      unsubscribers.forEach(unsub => unsub());
    };
  }, [seasonId]);

  /**
   * Action Handlers
   */

  // Admin: Start auction - with pre-validation
  const handleStartAuction = useCallback(async () => {
    try {
      setIsValidating(true);
      // Fetch validation data before starting
      const response = await apiService.get(`/matches/${seasonId}/pre-auction-validation`);
      const validation = response.data || response;
      setValidationData(validation);
      setShowValidationModal(true);
    } catch (error) {
      console.error('Failed to validate auction:', error);
      // If validation fails, show error but allow override attempt
      setValidationData({
        acceptedTeams: 0,
        maxTeams: matchConfig?.maxTeams || 8,
        acceptedPlayers: 0,
        requiredPlayers: (matchConfig?.maxTeams || 8) * (matchConfig?.maxPlayersPerTeam || 15),
        canStart: false,
        errors: ['Failed to fetch validation data. Please try again.'],
        warnings: []
      });
      setShowValidationModal(true);
    } finally {
      setIsValidating(false);
    }
  }, [seasonId, matchConfig]);

  // Admin: Confirm start auction after validation
  const handleConfirmStartAuction = useCallback(async () => {
    try {
      setShowValidationModal(false);
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

  // Admin/Auctioneer: End auction with confirmation modal
  const handleEndAuction = useCallback(async () => {
    setShowCloseModal(true);
  }, []);

  const confirmEndAuction = useCallback(async () => {
    try {
      await apiService.post('/api/auction/end', { seasonId });
      setShowCloseModal(false);
      // Set status to ENDED immediately for UI
      setAuctionState(prev => ({ ...(prev || {}), status: LiveAuctionStatus.ENDED }));
      // Clear current player
      setCurrentPlayer(null);
      // Notify parent
      if (onAuctionEnd) {
        onAuctionEnd();
      }
      // Exit live room after ending auction
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Failed to end auction:', error);
    }
  }, [seasonId, onClose, onAuctionEnd]);

  // Auctioneer: Start bidding for player (DIRECT FIREBASE WRITE - NO API LATENCY)
  const handleStartBidding = useCallback(async (playerId: string, basePrice: number) => {
    try {
      // Find the player in our local state to get full data
      const player = playersRef.current.find(p => p.id === playerId);
      if (!player) {
        console.error('Player not found in local state:', playerId);
        // Fallback to API if player not found locally
        await apiService.post('/api/auction/player/start', { seasonId, playerId, basePrice });
        return;
      }
      
      console.log('🎯 [REALTIME] Starting bidding via direct Firebase write for:', player.name);
      const result = await socketService.startPlayerBidding(seasonId, {
        id: playerId,
        name: player.name,
        basePrice: basePrice
      });
      
      if (!result.success) {
        console.error('Failed to start player bidding:', result.message);
        alert(result.message || 'Failed to start bidding');
      } else {
        console.log('✅ [REALTIME] Bidding started instantly via direct Firebase write');
      }
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

  // Auctioneer: Switch to different player (DIRECT FIREBASE WRITE - NO API LATENCY)
  const handleSwitchPlayer = useCallback(async (playerId: string) => {
    try {
      // Find the player in our local state to get full data
      const player = playersRef.current.find(p => p.id === playerId);
      if (!player) {
        console.error('Player not found in local state:', playerId);
        // Fallback to API if player not found locally
        await apiService.post('/api/auction/player/switch', { seasonId, playerId });
        return;
      }
      
      console.log('🔄 [REALTIME] Switching player via direct Firebase write to:', player.name);
      const result = await socketService.switchPlayer(seasonId, playerId, {
        id: playerId,
        name: player.name,
        basePrice: player.basePrice || 0
      });
      
      if (!result.success) {
        console.error('Failed to switch player:', result.message);
        alert(result.message || 'Failed to switch player. Please try again.');
      } else {
        console.log('✅ [REALTIME] Player switched instantly via direct Firebase write');
      }
    } catch (error) {
      console.error('Failed to switch player:', error);
      alert('Failed to switch player. Please try again.');
    }
  }, [seasonId]);

  // Place bid - works for both auctioneers and team reps
  // Signature: (teamId, incrementAmount) for auctioneer, or (amount) for team rep
  const handlePlaceBid = useCallback(async (teamIdOrAmount: string | number, incrementAmount?: number) => {
    // Determine if this is auctioneer mode (teamId as string) or team rep mode (amount as number)
    let bidTeamId: string;
    let bidAmount: number;

    if (typeof teamIdOrAmount === 'string' && incrementAmount !== undefined) {
      // Auctioneer mode: (teamId, incrementAmount)
      bidTeamId = teamIdOrAmount;
      const currentBid = auctionState?.currentBid || 0;
      bidAmount = currentBid + incrementAmount;

      // Validate team budget
      const team = teamsRef.current.find(t => t.id === bidTeamId);
      if (!team) {
        console.error('Team not found:', bidTeamId);
        return;
      }

      const remainingBudget = team.remainingBudget || team.budget || 0;
      if (bidAmount > remainingBudget) {
        alert(`Cannot bid ₹${bidAmount.toLocaleString()}. ${team.name}'s remaining budget is ₹${remainingBudget.toLocaleString()}.`);
        return;
      }
    } else if (typeof teamIdOrAmount === 'number') {
      // Team rep mode: (amount)
      if (!userTeamId) {
        console.error('No team ID');
        return;
      }
      bidTeamId = userTeamId;
      bidAmount = teamIdOrAmount;
    } else {
      console.error('Invalid parameters for handlePlaceBid');
      return;
    }

    try {
      const result = await socketService.placeBid(seasonId, bidTeamId, bidAmount);
      if (!result.success) {
        console.error('Bid failed:', result.message);
        alert(result.message || 'Failed to place bid');
      }
    } catch (error) {
      console.error('Failed to place bid:', error);
      alert('Failed to place bid');
    }
  }, [seasonId, userTeamId, auctionState?.currentBid]);

  // Auctioneer: Toggle mic
  const handleToggleMic = useCallback(() => {
    if (auctioneerAudio.isStreaming) {
      auctioneerAudio.toggleMute();
    } else {
      auctioneerAudio.startStreaming();
    }
  }, [auctioneerAudio]);

  // Auctioneer: Mark player as unsold and auto-advance to next player
  const handleMarkUnsold = useCallback(async () => {
    try {
      console.log('🔄 Marking player as UNSOLD and auto-advancing to next player...');
      
      // Step 1: Mark current player as UNSOLD
      const unsoldResult = await apiService.post('/api/auction/player/unsold', {
        seasonId
      });
      
      if (!unsoldResult.success) {
        console.error('Failed to mark player as unsold:', unsoldResult.error);
        return;
      }
      
      console.log('✅ Player marked as UNSOLD, fetching next player...');
      
      // Step 2: Auto-advance to next player (small delay for UI update)
      setTimeout(async () => {
        try {
          const nextResult = await apiService.post('/api/auction/player/next', {
            seasonId
          });
          
          if (nextResult.success) {
            console.log('✅ Auto-advanced to next player:', nextResult.data);
          } else if (nextResult.data?.auctionComplete) {
            console.log('✅ Auction complete - no more players available');
          } else {
            console.warn('⚠️ Failed to auto-advance:', nextResult.error);
          }
        } catch (nextError) {
          console.error('Failed to auto-advance to next player:', nextError);
        }
      }, 500); // 500ms delay to allow UI to update
      
    } catch (error) {
      console.error('Failed to mark player as unsold:', error);
    }
  }, [seasonId]);

  // Calculate stats for modal
  const totalPlayers = players.length;
  const completedPlayers = auctionState?.completedPlayers?.length || 0;
  const unsoldCount = auctionState?.unsoldPlayers?.length || 0;
  const remainingPlayers = Math.max(0, totalPlayers - completedPlayers);

  // Check if user is auctioneer
  const isAuctioneer = userRole === UserRole.AUCTIONEER;

  // Handle celebration complete - just clear the animation
  // The auctioneer dashboard will handle starting the next player
  const handleCelebrationComplete = useCallback(async () => {
    console.log('🎉 Celebration complete, waiting for next player from auctioneer...');
    setSoldAnimationData(null);
    // Don't call next player API - let the auctioneer control the flow
  }, [userRole]);

  // Determine confetti size based on user role
  const getConfettiSize = (): 'none' | 'small' | 'normal' => {
    const size = userRole === UserRole.AUCTIONEER ? 'none' : 'small';
    console.log('🎊 LiveAuctionPage getConfettiSize - userRole:', userRole, '-> confettiSize:', size);
    return size;
  };

  return (
    <div className="w-full h-screen">
      {/* Sold Celebration Animation - Only for non-auctioneers */}
      {soldAnimationData && userRole !== UserRole.AUCTIONEER && (
        <SoldCelebration 
          player={soldAnimationData.player} 
          team={soldAnimationData.team} 
          price={soldAnimationData.price} 
          onComplete={handleCelebrationComplete}
          confettiSize={getConfettiSize()}
          compact={true}
        />
      )}
      
      <CloseAuctionModal
        isOpen={showCloseModal}
        onClose={() => setShowCloseModal(false)}
        onConfirm={confirmEndAuction}
        remainingPlayers={remainingPlayers}
        unsoldPlayers={unsoldCount}
      />

      {/* Pre-Auction Validation Modal */}
      {validationData && (
        <PreAuctionValidationModal
          isOpen={showValidationModal}
          onClose={() => setShowValidationModal(false)}
          onConfirm={validationData.canStart ? handleConfirmStartAuction : undefined}
          onNavigateToPlayers={() => {
            setShowValidationModal(false);
            // Navigate to players page - caller should handle this
            window.location.href = `/players?matchId=${seasonId}`;
          }}
          onNavigateToTeams={() => {
            setShowValidationModal(false);
            // Navigate to teams page - caller should handle this
            window.location.href = `/teams?matchId=${seasonId}`;
          }}
          acceptedTeams={validationData.acceptedTeams}
          maxTeams={validationData.maxTeams}
          acceptedPlayers={validationData.acceptedPlayers}
          requiredPlayers={validationData.requiredPlayers}
          canStart={validationData.canStart}
          errors={validationData.errors}
          warnings={validationData.warnings}
        />
      )}
      
      {isAuctioneer ? (
        // Auctioneer Layout - Full controls
        // CRITICAL: Pass approvedPlayers and approvedTeams (not raw arrays) to prevent declined entries from appearing
        <AuctioneerLiveRoom
          auctionState={auctionState}
          currentPlayer={currentPlayer}
          allPlayers={approvedPlayers}
          teams={approvedTeams}
          userId={userId}
          userRole={userRole}
          remainingSeconds={remainingSeconds}
          auctioneerMicOn={auctioneerAudio.isStreaming && !auctioneerAudio.isMuted}
          permissions={permissions}
          isInitialLoading={isInitialLoading}
          onStartAuction={permissions.canOverride ? handleStartAuction : undefined}
          onPauseAuction={permissions.canOverride ? handlePauseAuction : undefined}
          onResumeAuction={permissions.canOverride ? handleResumeAuction : undefined}
          onEndAuction={(userRole === UserRole.ADMIN || userRole === UserRole.AUCTIONEER) ? handleEndAuction : undefined}
          onToggleMic={permissions.canSpeak ? handleToggleMic : undefined}
          onClose={onClose}
          onCloseBidding={permissions.canControl ? handleCloseBidding : undefined}
          onMarkUnsold={permissions.canControl ? handleMarkUnsold : undefined}
          onPlaceBid={permissions.canControl ? handlePlaceBid : undefined}
          onSwitchPlayer={permissions.canControl ? handleSwitchPlayer : undefined}
          matchConfig={matchConfig}
          bidConfig={bidConfig}
          onBidConfigUpdate={setBidConfig}
          currentMatch={{ id: seasonId }}
          currencyUnit={currencyUnit}
          onCurrencyUnitChange={setCurrencyUnit}
        />
      ) : (
        // Spectator Layout - Players, Team Reps, Guests
        // CRITICAL: Pass approvedPlayers and approvedTeams (not raw arrays) to prevent declined entries from appearing
        <SpectatorLiveRoom
          auctionState={auctionState}
          currentPlayer={currentPlayer}
          allPlayers={approvedPlayers}
          teams={approvedTeams}
          userId={userId}
          userRole={userRole}
          remainingSeconds={remainingSeconds}
          matchConfig={matchConfig}
          bidConfig={bidConfig}
          currencyUnit={currencyUnit}
          isInitialLoading={isInitialLoading}
          onClose={onClose}
        />
      )}
    </div>
  );
};
