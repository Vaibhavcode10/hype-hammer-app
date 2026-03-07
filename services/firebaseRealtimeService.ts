/**
 * Firebase Firestore Real-time Service
 * Uses Firestore onSnapshot for live updates - replaces WebSocket functionality
 */

import { 
  doc, 
  collection,
  onSnapshot,
  setDoc,
  updateDoc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  Unsubscribe,
  Timestamp
} from 'firebase/firestore';
import { firestore } from './firebaseConfig';

/**
 * Firebase Realtime Service for Live Auction
 * Handles all real-time communication using Firestore listeners
 */
class FirebaseRealtimeService {
  private currentSeasonId: string | null = null;
  private currentUserId: string | null = null;
  private currentRole: string | null = null;
  private listeners: Map<string, Unsubscribe> = new Map();

  /**
   * Initialize connection (Firebase connects automatically)
   */
  connect(_serverUrl?: string) {
    console.log('🔌 Firebase Firestore ready for real-time updates');
    return this;
  }

  /**
   * Disconnect and cleanup all listeners
   */
  disconnect() {
    this.removeAllListeners();
    this.currentSeasonId = null;
    this.currentUserId = null;
    this.currentRole = null;
    console.log('❌ Disconnected from Firebase');
  }

  /**
   * Join a season to receive real-time updates
   */
  async joinSeason(seasonId: string, userId: string, role: string) {
    this.currentSeasonId = seasonId;
    this.currentUserId = userId;
    this.currentRole = role;

    console.log(`📡 Joining season ${seasonId} as ${role}`);

    // Store user session in Firestore
    try {
      const sessionRef = doc(firestore, 'liveAuctions', seasonId, 'sessions', userId);
      await setDoc(sessionRef, {
        userId,
        role,
        joinedAt: Timestamp.now(),
        lastActive: Timestamp.now()
      }, { merge: true });
    } catch (e) {
      console.log('Session tracking optional:', e);
    }
  }

  /**
   * Leave current season
   */
  async leaveSeason(seasonId: string) {
    console.log(`📡 Leaving season ${seasonId}`);
    // IMPORTANT: this service is a singleton shared across multiple React components.
    // Do not remove global listeners or clear currentSeasonId here; doing so can break
    // other components that are still mounted and subscribed.
    // Each caller should clean up using the Unsubscribe functions returned by on* methods.
  }

  /**
   * Listen to auction state updates
   */
  onAuctionStateUpdate(callback: (state: any) => void): Unsubscribe {
    if (!this.currentSeasonId) return () => {};

    const stateRef = doc(firestore, 'liveAuctions', this.currentSeasonId);
    const unsubscribe = onSnapshot(stateRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data());
      }
    }, (error) => {
      console.error('Auction state listener error:', error);
    });

    this.listeners.set('AUCTION_STATE_UPDATE', unsubscribe);
    return unsubscribe;
  }

  /**
   * Listen to auction events (started, paused, resumed, ended)
   * CRITICAL: These event listeners should only fire for NEW events, not for existing/stale documents
   * We track the last seen timestamp to avoid firing callbacks for old events on initial snapshot
   */
  private eventTimestamps: Map<string, number> = new Map();

  /**
   * Helper: Check if this is a new event (not a stale document from previous session)
   * Returns true if the event should trigger the callback
   */
  private isNewEvent(eventName: string, eventData: any): boolean {
    const now = Date.now();
    const eventTime = eventData?.timestamp || eventData?.triggeredAt || eventData?.endedAt || eventData?.startedAt;
    
    // If event has a timestamp, check if it's recent (within last 5 minutes)
    if (eventTime) {
      const eventTimestamp = new Date(eventTime).getTime();
      const ageMs = now - eventTimestamp;
      const maxAge = 5 * 60 * 1000; // 5 minutes
      
      if (ageMs > maxAge) {
        console.log(`⏰ Ignoring stale ${eventName} event (age: ${Math.round(ageMs / 1000)}s)`);
        return false;
      }
    }
    
    // Check if we've seen this exact event before
    const lastSeen = this.eventTimestamps.get(eventName);
    if (lastSeen && eventTime) {
      const eventTs = new Date(eventTime).getTime();
      if (eventTs <= lastSeen) {
        console.log(`⏰ Ignoring duplicate ${eventName} event`);
        return false;
      }
    }
    
    // Update last seen timestamp
    if (eventTime) {
      this.eventTimestamps.set(eventName, new Date(eventTime).getTime());
    }
    
    return true;
  }

  onAuctionStarted(callback: (data: any) => void): Unsubscribe {
    if (!this.currentSeasonId) return () => {};

    const eventsRef = doc(firestore, 'liveAuctions', this.currentSeasonId, 'events', 'started');
    let isInitialSnapshot = true;
    const unsubscribe = onSnapshot(eventsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        // Only fire for new events, not stale data on initial load
        if (!isInitialSnapshot || this.isNewEvent('started', data)) {
          callback(data);
        }
      }
      isInitialSnapshot = false;
    });

    this.listeners.set('AUCTION_STARTED', unsubscribe);
    return unsubscribe;
  }

  onAuctionPaused(callback: (data: any) => void): Unsubscribe {
    if (!this.currentSeasonId) return () => {};

    const eventsRef = doc(firestore, 'liveAuctions', this.currentSeasonId, 'events', 'paused');
    let isInitialSnapshot = true;
    const unsubscribe = onSnapshot(eventsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (!isInitialSnapshot || this.isNewEvent('paused', data)) {
          callback(data);
        }
      }
      isInitialSnapshot = false;
    });

    this.listeners.set('AUCTION_PAUSED', unsubscribe);
    return unsubscribe;
  }

  onAuctionResumed(callback: (data: any) => void): Unsubscribe {
    if (!this.currentSeasonId) return () => {};

    const eventsRef = doc(firestore, 'liveAuctions', this.currentSeasonId, 'events', 'resumed');
    let isInitialSnapshot = true;
    const unsubscribe = onSnapshot(eventsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (!isInitialSnapshot || this.isNewEvent('resumed', data)) {
          callback(data);
        }
      }
      isInitialSnapshot = false;
    });

    this.listeners.set('AUCTION_RESUMED', unsubscribe);
    return unsubscribe;
  }

  onAuctionEnded(callback: (data: any) => void): Unsubscribe {
    if (!this.currentSeasonId) return () => {};

    const eventsRef = doc(firestore, 'liveAuctions', this.currentSeasonId, 'events', 'ended');
    let isInitialSnapshot = true;
    const unsubscribe = onSnapshot(eventsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        // CRITICAL: Only fire for new ended events, not stale data from previous auctions
        if (!isInitialSnapshot || this.isNewEvent('ended', data)) {
          callback(data);
        }
      }
      isInitialSnapshot = false;
    });

    this.listeners.set('AUCTION_ENDED', unsubscribe);
    return unsubscribe;
  }

  /**
   * Listen to timer updates
   */
  onTimerUpdate(callback: (data: { remainingSeconds: number; serverTime: string }) => void): Unsubscribe {
    if (!this.currentSeasonId) return () => {};

    const timerRef = doc(firestore, 'liveAuctions', this.currentSeasonId, 'timer', 'current');
    const unsubscribe = onSnapshot(timerRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as { remainingSeconds: number; serverTime: string });
      }
    });

    this.listeners.set('AUCTION_TIMER_UPDATE', unsubscribe);
    return unsubscribe;
  }

  /**
   * Listen to player bidding started event
   */
  onPlayerBiddingStarted(callback: (data: any) => void): Unsubscribe {
    if (!this.currentSeasonId) return () => {};

    const playerRef = doc(firestore, 'liveAuctions', this.currentSeasonId, 'currentPlayer', 'active');
    const unsubscribe = onSnapshot(playerRef, (snapshot) => {
      callback(snapshot.exists() ? snapshot.data() : null);
    });

    this.listeners.set('PLAYER_BIDDING_STARTED', unsubscribe);
    return unsubscribe;
  }

  /**
   * Listen to new bid event
   */
  onNewBid(callback: (data: any) => void): Unsubscribe {
    if (!this.currentSeasonId) return () => {};

    // Listen to the latestEvent document in the events subcollection
    // Path: liveAuctions/{seasonId}/events/latestEvent (4 segments - valid)
    const latestEventRef = doc(firestore, 'liveAuctions', this.currentSeasonId, 'events', 'latestEvent');
    const unsubscribe = onSnapshot(latestEventRef, (snapshot) => {
      if (snapshot.exists()) {
        const eventData = snapshot.data();
        console.log('🔥 Latest event detected:', eventData);
        // Only process bid_placed events
        if (eventData.type === 'bid_placed' && eventData.data) {
          console.log('🔥 New bid event:', eventData.data);
          callback(eventData.data);
        }
      }
    }, (error) => {
      console.error('Bid listener error:', error);
    });

    this.listeners.set('NEW_BID', unsubscribe);
    return unsubscribe;
  }

  /**
   * Listen to player switched events (when auctioneer manually switches players)
   */
  onPlayerSwitched(callback: (data: any) => void): Unsubscribe {
    if (!this.currentSeasonId) return () => {};

    // Listen to the latestEvent document in the events subcollection
    const latestEventRef = doc(firestore, 'liveAuctions', this.currentSeasonId, 'events', 'latestEvent');
    const unsubscribe = onSnapshot(latestEventRef, (snapshot) => {
      if (snapshot.exists()) {
        const eventData = snapshot.data();
        console.log('🔥 Latest event detected:', eventData);
        // Only process player_switched events
        if (eventData.type === 'player_switched') {
          console.log('🔄 Player switched event received:', eventData);
          callback(eventData);
        }
      }
    }, (error) => {
      console.error('Player switched listener error:', error);
    });

    this.listeners.set('PLAYER_SWITCHED', unsubscribe);
    return unsubscribe;
  }

  /**
   * Listen to live player changes (currentBid, leadingTeam updates)
   */
  onLivePlayerUpdate(playerId: string, callback: (playerData: any) => void): Unsubscribe {
    const playerRef = doc(firestore, 'players', playerId);
    const unsubscribe = onSnapshot(playerRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        console.log('🔥 Live player updated:', data);
        callback({ id: snapshot.id, ...data });
      }
    }, (error) => {
      console.error('Live player listener error:', error);
    });

    const key = `LIVE_PLAYER_${playerId}`;
    this.listeners.set(key, unsubscribe);
    return unsubscribe;
  }

  /**
   * Listen to all players in a match for status changes
   * @param matchId - The match ID to filter by
   * @param callback - Callback receiving the filtered players array
   * @param approvedOnly - If true, only return players with approvalStatus === 'accepted'
   */
  onPlayersUpdate(matchId: string, callback: (players: any[]) => void, approvedOnly: boolean = false): Unsubscribe {
    const playersRef = collection(firestore, 'players');
    const unsubscribe = onSnapshot(playersRef, (snapshot) => {
      let players = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((p: any) => p.matchId === matchId);
      
      // CRITICAL: For guest/spectator views, only show approved players
      if (approvedOnly) {
        players = players.filter((p: any) => p.approvalStatus === 'accepted');
        console.log(`🔥 [APPROVED ONLY] Players updated for match ${matchId}:`, players.length);
      } else {
        console.log(`🔥 Players updated for match ${matchId}:`, players.length);
      }
      
      callback(players);
    }, (error) => {
      console.error('Players listener error:', error);
    });

    this.listeners.set('PLAYERS_UPDATE', unsubscribe);
    return unsubscribe;
  }

  /**
   * Listen to all teams in a match for budget changes
   * @param matchId - The match ID to filter by
   * @param callback - Callback receiving the filtered teams array
   * @param approvedOnly - If true, only return teams with approvalStatus === 'accepted'
   */
  onTeamsUpdate(matchId: string, callback: (teams: any[]) => void, approvedOnly: boolean = false): Unsubscribe {
    const teamsRef = collection(firestore, 'teams');
    const unsubscribe = onSnapshot(teamsRef, (snapshot) => {
      let teams = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((t: any) => t.matchId === matchId);
      
      // CRITICAL: For guest/spectator views, only show approved teams
      if (approvedOnly) {
        teams = teams.filter((t: any) => t.approvalStatus === 'accepted');
        console.log(`🔥 [APPROVED ONLY] Teams updated for match ${matchId}:`, teams.length);
      } else {
        console.log(`🔥 Teams updated for match ${matchId}:`, teams.length);
      }
      
      callback(teams);
    }, (error) => {
      console.error('Teams listener error:', error);
    });

    this.listeners.set('TEAMS_UPDATE', unsubscribe);
    return unsubscribe;
  }

  /**
   * Listen to player updated event
   */
  onPlayerUpdated(callback: (data: any) => void): Unsubscribe {
    if (!this.currentSeasonId) return () => {};

    const eventRef = doc(firestore, 'liveAuctions', this.currentSeasonId, 'events', 'playerUpdated');
    const unsubscribe = onSnapshot(eventRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data());
      }
    });

    this.listeners.set('PLAYER_UPDATED', unsubscribe);
    return unsubscribe;
  }

  /**
   * Listen to player sold event
   */
  onPlayerSold(callback: (data: any) => void): Unsubscribe {
    if (!this.currentSeasonId) return () => {};

    const eventRef = doc(firestore, 'liveAuctions', this.currentSeasonId, 'events', 'playerSold');
    const unsubscribe = onSnapshot(eventRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data());
      }
    });

    this.listeners.set('PLAYER_SOLD', unsubscribe);
    return unsubscribe;
  }

  /**
   * Listen to player unsold event
   */
  onPlayerUnsold(callback: (data: any) => void): Unsubscribe {
    if (!this.currentSeasonId) return () => {};

    const eventRef = doc(firestore, 'liveAuctions', this.currentSeasonId, 'events', 'playerUnsold');
    const unsubscribe = onSnapshot(eventRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data());
      }
    });

    this.listeners.set('PLAYER_UNSOLD', unsubscribe);
    return unsubscribe;
  }

  /**
   * Listen to team updated event
   */
  onTeamUpdated(callback: (data: any) => void): Unsubscribe {
    if (!this.currentSeasonId) return () => {};

    const eventRef = doc(firestore, 'liveAuctions', this.currentSeasonId, 'events', 'teamUpdated');
    const unsubscribe = onSnapshot(eventRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data());
      }
    });

    this.listeners.set('TEAM_UPDATED', unsubscribe);
    return unsubscribe;
  }

  /**
   * Listen to auctioneer approved event
   */
  onAuctioneerApproved(callback: (data: any) => void): Unsubscribe {
    if (!this.currentUserId) return () => {};

    const eventRef = doc(firestore, 'userEvents', this.currentUserId, 'notifications', 'approved');
    const unsubscribe = onSnapshot(eventRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data());
      }
    });

    this.listeners.set('AUCTIONEER_APPROVED', unsubscribe);
    return unsubscribe;
  }

  /**
   * Listen to auctioneer rejected event
   */
  onAuctioneerRejected(callback: (data: any) => void): Unsubscribe {
    if (!this.currentUserId) return () => {};

    const eventRef = doc(firestore, 'userEvents', this.currentUserId, 'notifications', 'rejected');
    const unsubscribe = onSnapshot(eventRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data());
      }
    });

    this.listeners.set('AUCTIONEER_REJECTED', unsubscribe);
    return unsubscribe;
  }

  /**
   * Listen to timer extended event
   */
  onTimerExtended(callback: (data: any) => void): Unsubscribe {
    if (!this.currentSeasonId) return () => {};

    const eventRef = doc(firestore, 'liveAuctions', this.currentSeasonId, 'events', 'timerExtended');
    const unsubscribe = onSnapshot(eventRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data());
      }
    });

    this.listeners.set('TIMER_EXTENDED', unsubscribe);
    return unsubscribe;
  }

  /**
   * Listen to auctioneer replaced event
   */
  onAuctioneerReplaced(callback: (data: any) => void): Unsubscribe {
    if (!this.currentSeasonId) return () => {};

    const eventRef = doc(firestore, 'liveAuctions', this.currentSeasonId, 'events', 'auctioneerReplaced');
    const unsubscribe = onSnapshot(eventRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data());
      }
    });

    this.listeners.set('AUCTIONEER_REPLACED', unsubscribe);
    return unsubscribe;
  }

  /**
   * Listen to match status updates
   */
  onMatchStatusUpdated(callback: (data: { matchId: string; status: string; timestamp: string }) => void): Unsubscribe {
    if (!this.currentSeasonId) return () => {};

    const matchRef = doc(firestore, 'matches', this.currentSeasonId);
    const unsubscribe = onSnapshot(matchRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        callback({
          matchId: snapshot.id,
          status: data.status,
          timestamp: data.updatedAt || new Date().toISOString()
        });
      }
    });

    this.listeners.set('MATCH_STATUS_UPDATED', unsubscribe);
    return unsubscribe;
  }

  // Audio-related methods (stubs for compatibility)
  onAuctioneerMicOn(callback: (data: any) => void): Unsubscribe { return () => {}; }
  onAuctioneerMicOff(callback: (data: any) => void): Unsubscribe { return () => {}; }
  onAuctioneerMicMute(callback: (data: any) => void): Unsubscribe { return () => {}; }
  onAuctioneerAnnouncement(callback: (data: any) => void): Unsubscribe { return () => {}; }
  onAudioOffer(callback: (data: any) => void): Unsubscribe { return () => {}; }
  onAudioAnswer(callback: (data: any) => void): Unsubscribe { return () => {}; }
  onAudioIceCandidate(callback: (data: any) => void): Unsubscribe { return () => {}; }
  
  async emitAudioOffer(seasonId: string, offer: RTCSessionDescriptionInit) {}
  async emitAudioAnswer(seasonId: string, auctioneerId: string, answer: RTCSessionDescriptionInit) {}
  async emitAudioIceCandidate(seasonId: string, targetId: string, candidate: RTCIceCandidateInit) {}
  async emitAuctioneerMicOn(seasonId: string) {}
  async emitAuctioneerMicOff(seasonId: string) {}
  async emitAuctioneerMicMute(seasonId: string, muted: boolean) {}
  async joinAsAudioListener(seasonId: string, userId: string, role: string) {}

  /**
   * Place a bid (Team Rep action) - calls REST API
   */
  async placeBid(seasonId: string, teamId: string, amount: number): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await fetch('https://us-central1-axilam.cloudfunctions.net/auction/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seasonId, teamId, amount })
      });

      const result = await response.json();
      return { success: response.ok, message: result.message || result.error };
    } catch (error) {
      console.error('Failed to place bid:', error);
      return { success: false, message: 'Network error' };
    }
  }

  /**
   * Switch to a different player during live auction (DIRECT FIREBASE WRITE - NO API LATENCY)
   * Updates:
   * 1. Previous player status -> AVAILABLE (in players collection)
   * 2. New player status -> LIVE (in players collection)
   * 3. currentPlayer/active document (for all listeners)
   * 4. latestEvent document (triggers onPlayerSwitched listeners)
   * 5. liveAuctions state document (for general state sync)
   */
  async switchPlayer(seasonId: string, newPlayerId: string, newPlayer: { id: string; name: string; basePrice: number }): Promise<{ success: boolean; message?: string; previousPlayerId?: string }> {
    try {
      console.log(`🔄 [DIRECT WRITE] Switching to player ${newPlayer.name} (${newPlayerId})`);

      // Step 1: Get current player from canonical doc
      let currentPlayerId: string | null = null;
      let currentPlayerName: string | null = null;
      try {
        const currentPlayerDoc = await getDoc(doc(firestore, 'liveAuctions', seasonId, 'currentPlayer', 'active'));
        if (currentPlayerDoc.exists()) {
          const cp = currentPlayerDoc.data();
          currentPlayerId = cp.playerId || cp.player?.id || null;
          currentPlayerName = cp.player?.name || cp.playerName || null;
          console.log(`✓ Found current player: ${currentPlayerName} (${currentPlayerId})`);
        }
      } catch (e) {
        console.log(`⚠ Failed to fetch current player doc:`, e);
      }

      // Prevent switching to same player
      if (currentPlayerId === newPlayerId) {
        return { success: false, message: 'Cannot switch to the same player' };
      }

      // Step 2: Mark current player as AVAILABLE (if exists)
      if (currentPlayerId) {
        try {
          const currentPlayerRef = doc(firestore, 'players', currentPlayerId);
          await updateDoc(currentPlayerRef, {
            status: 'AVAILABLE',
            updatedAt: new Date().toISOString()
          });
          console.log(`✓ Marked previous player ${currentPlayerId} as AVAILABLE`);
        } catch (e) {
          console.log(`⚠ Warning marking previous player as AVAILABLE:`, e);
        }
      }

      // Step 3: Mark new player as LIVE with reset bid info
      try {
        const newPlayerRef = doc(firestore, 'players', newPlayerId);
        await updateDoc(newPlayerRef, {
          status: 'LIVE',
          currentBid: newPlayer.basePrice || 0,
          leadingTeamId: null,
          leadingTeamName: null,
          updatedAt: new Date().toISOString()
        });
        console.log(`✓ Marked new player ${newPlayerId} as LIVE`);
      } catch (e) {
        console.error(`❌ Failed to update new player status:`, e);
        return { success: false, message: 'Failed to update player status' };
      }

      // Step 4: Update the canonical currentPlayer/active document
      const timestamp = new Date().toISOString();
      try {
        const currentPlayerActiveRef = doc(firestore, 'liveAuctions', seasonId, 'currentPlayer', 'active');
        await setDoc(currentPlayerActiveRef, {
          seasonId,
          playerId: newPlayerId,
          playerName: newPlayer.name,
          player: {
            id: newPlayerId,
            name: newPlayer.name,
            basePrice: newPlayer.basePrice
          },
          basePrice: newPlayer.basePrice,
          duration: 120,
          timestamp: Timestamp.now(),
          createdAt: timestamp
        });
        console.log(`✓ Updated currentPlayer/active document`);
      } catch (e) {
        console.error(`❌ Failed to update currentPlayer doc:`, e);
        return { success: false, message: 'Failed to update current player document' };
      }

      // Step 5: Update the liveAuctions state document
      try {
        const liveAuctionRef = doc(firestore, 'liveAuctions', seasonId);
        await updateDoc(liveAuctionRef, {
          status: 'LIVE',
          currentPlayerId: newPlayerId,
          currentPlayerName: newPlayer.name,
          currentBid: newPlayer.basePrice,
          leadingTeamId: null,
          leadingTeamName: null,
          biddingActive: true,
          updatedAt: timestamp
        });
        console.log(`✓ Updated liveAuctions state document`);
      } catch (e) {
        // Try to create if doesn't exist
        try {
          const liveAuctionRef = doc(firestore, 'liveAuctions', seasonId);
          await setDoc(liveAuctionRef, {
            status: 'LIVE',
            currentPlayerId: newPlayerId,
            currentPlayerName: newPlayer.name,
            currentBid: newPlayer.basePrice,
            leadingTeamId: null,
            leadingTeamName: null,
            biddingActive: true,
            updatedAt: timestamp
          }, { merge: true });
          console.log(`✓ Created/merged liveAuctions state document`);
        } catch (e2) {
          console.error(`❌ Failed to update/create liveAuctions state:`, e2);
        }
      }

      // Step 6: Emit player_switched event to latestEvent document
      try {
        const latestEventRef = doc(firestore, 'liveAuctions', seasonId, 'events', 'latestEvent');
        await setDoc(latestEventRef, {
          type: 'player_switched',
          previousPlayerId: currentPlayerId,
          previousPlayerName: currentPlayerName || 'Unknown',
          newPlayerId: newPlayerId,
          newPlayerName: newPlayer.name,
          basePrice: newPlayer.basePrice,
          timestamp: timestamp
        });
        console.log(`✓ Emitted player_switched event`);
      } catch (e) {
        console.warn(`⚠ Warning emitting player_switched event:`, e);
      }

      console.log(`✅ [DIRECT WRITE] Successfully switched to player ${newPlayer.name}`);
      return { 
        success: true, 
        message: 'Player switched successfully',
        previousPlayerId: currentPlayerId || undefined
      };
    } catch (error) {
      console.error('❌ [DIRECT WRITE] Failed to switch player:', error);
      return { success: false, message: 'Failed to switch player' };
    }
  }

  /**
   * Start bidding for a player (DIRECT FIREBASE WRITE - NO API LATENCY)
   * This is used when starting bidding for the first player or resuming
   */
  async startPlayerBidding(seasonId: string, player: { id: string; name: string; basePrice: number }): Promise<{ success: boolean; message?: string }> {
    try {
      console.log(`🎯 [DIRECT WRITE] Starting bidding for player ${player.name} (${player.id})`);
      const timestamp = new Date().toISOString();

      // Step 1: Clear any existing LIVE players (ensure only one LIVE at a time)
      try {
        const playersRef = collection(firestore, 'players');
        const livePlayersQuery = query(
          playersRef,
          where('matchId', '==', seasonId),
          where('status', '==', 'LIVE')
        );
        const livePlayersSnap = await getDocs(livePlayersQuery);
        for (const docSnap of livePlayersSnap.docs) {
          if (docSnap.id !== player.id) {
            await updateDoc(doc(firestore, 'players', docSnap.id), {
              status: 'AVAILABLE',
              updatedAt: timestamp
            });
            console.log(`✓ Cleared LIVE status from previous player: ${docSnap.id}`);
          }
        }
      } catch (e) {
        console.log(`⚠ Warning clearing previous LIVE players:`, e);
      }

      // Step 2: Mark this player as LIVE
      try {
        const playerRef = doc(firestore, 'players', player.id);
        await updateDoc(playerRef, {
          status: 'LIVE',
          currentBid: player.basePrice,
          leadingTeamId: null,
          leadingTeamName: null,
          updatedAt: timestamp
        });
        console.log(`✓ Marked player ${player.id} as LIVE`);
      } catch (e) {
        console.error(`❌ Failed to update player status:`, e);
        return { success: false, message: 'Failed to update player status' };
      }

      // Step 3: Update the canonical currentPlayer/active document
      try {
        const currentPlayerActiveRef = doc(firestore, 'liveAuctions', seasonId, 'currentPlayer', 'active');
        await setDoc(currentPlayerActiveRef, {
          seasonId,
          playerId: player.id,
          playerName: player.name,
          player: {
            id: player.id,
            name: player.name,
            basePrice: player.basePrice
          },
          basePrice: player.basePrice,
          duration: 120,
          timestamp: Timestamp.now(),
          createdAt: timestamp
        });
        console.log(`✓ Updated currentPlayer/active document`);
      } catch (e) {
        console.error(`❌ Failed to update currentPlayer doc:`, e);
        return { success: false, message: 'Failed to update current player document' };
      }

      // Step 4: Update the liveAuctions state document
      try {
        const liveAuctionRef = doc(firestore, 'liveAuctions', seasonId);
        await setDoc(liveAuctionRef, {
          status: 'LIVE',
          currentPlayerId: player.id,
          currentPlayerName: player.name,
          currentBid: player.basePrice,
          leadingTeamId: null,
          leadingTeamName: null,
          biddingActive: true,
          updatedAt: timestamp
        }, { merge: true });
        console.log(`✓ Updated liveAuctions state document`);
      } catch (e) {
        console.error(`❌ Failed to update liveAuctions state:`, e);
      }

      // Step 5: Emit player_bidding_started event
      try {
        const latestEventRef = doc(firestore, 'liveAuctions', seasonId, 'events', 'latestEvent');
        await setDoc(latestEventRef, {
          type: 'player_bidding_started',
          playerId: player.id,
          playerName: player.name,
          basePrice: player.basePrice,
          timestamp: timestamp,
          data: {
            player: {
              id: player.id,
              name: player.name,
              basePrice: player.basePrice
            },
            playerId: player.id,
            basePrice: player.basePrice,
            seasonId: seasonId
          }
        });
        console.log(`✓ Emitted player_bidding_started event`);
      } catch (e) {
        console.warn(`⚠ Warning emitting player_bidding_started event:`, e);
      }

      console.log(`✅ [DIRECT WRITE] Successfully started bidding for ${player.name}`);
      return { success: true, message: 'Player bidding started' };
    } catch (error) {
      console.error('❌ [DIRECT WRITE] Failed to start player bidding:', error);
      return { success: false, message: 'Failed to start player bidding' };
    }
  }

  /**
   * Remove all listeners (cleanup on unmount)
   */
  removeAllListeners() {
    this.listeners.forEach((unsubscribe) => unsubscribe());
    this.listeners.clear();
  }

  /**
   * Check if connected (always true for Firestore)
   */
  isConnected(): boolean {
    return true;
  }

  /**
   * Get socket (returns null - no socket needed)
   */
  getSocket(): null {
    return null;
  }

  getCurrentSeasonId(): string | null {
    return this.currentSeasonId;
  }

  getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  /**
   * Get current auction state for a match
   */
  async getAuctionState(seasonId: string): Promise<any> {
    try {
      const docRef = doc(firestore, 'liveAuctions', seasonId);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? docSnap.data() : null;
    } catch (err) {
      console.error('Error getting auction state:', err);
      return null;
    }
  }

  /**
   * Get all players for a match
   */
  async getPlayers(seasonId: string): Promise<any[]> {
    try {
      const q = query(collection(firestore, 'players'), where('seasonId', '==', seasonId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    } catch (err) {
      console.error('Error getting players:', err);
      return [];
    }
  }
}

// Export singleton instance
export const firebaseRealtimeService = new FirebaseRealtimeService();
export default firebaseRealtimeService;
