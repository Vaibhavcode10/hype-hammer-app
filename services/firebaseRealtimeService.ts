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
   */
  onAuctionStarted(callback: (data: any) => void): Unsubscribe {
    if (!this.currentSeasonId) return () => {};

    const eventsRef = doc(firestore, 'liveAuctions', this.currentSeasonId, 'events', 'started');
    const unsubscribe = onSnapshot(eventsRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data());
      }
    });

    this.listeners.set('AUCTION_STARTED', unsubscribe);
    return unsubscribe;
  }

  onAuctionPaused(callback: (data: any) => void): Unsubscribe {
    if (!this.currentSeasonId) return () => {};

    const eventsRef = doc(firestore, 'liveAuctions', this.currentSeasonId, 'events', 'paused');
    const unsubscribe = onSnapshot(eventsRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data());
      }
    });

    this.listeners.set('AUCTION_PAUSED', unsubscribe);
    return unsubscribe;
  }

  onAuctionResumed(callback: (data: any) => void): Unsubscribe {
    if (!this.currentSeasonId) return () => {};

    const eventsRef = doc(firestore, 'liveAuctions', this.currentSeasonId, 'events', 'resumed');
    const unsubscribe = onSnapshot(eventsRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data());
      }
    });

    this.listeners.set('AUCTION_RESUMED', unsubscribe);
    return unsubscribe;
  }

  onAuctionEnded(callback: (data: any) => void): Unsubscribe {
    if (!this.currentSeasonId) return () => {};

    const eventsRef = doc(firestore, 'liveAuctions', this.currentSeasonId, 'events', 'ended');
    const unsubscribe = onSnapshot(eventsRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data());
      }
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
   */
  onPlayersUpdate(matchId: string, callback: (players: any[]) => void): Unsubscribe {
    const playersRef = collection(firestore, 'players');
    const unsubscribe = onSnapshot(playersRef, (snapshot) => {
      const players = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((p: any) => p.matchId === matchId);
      
      console.log(`🔥 Players updated for match ${matchId}:`, players.length);
      callback(players);
    }, (error) => {
      console.error('Players listener error:', error);
    });

    this.listeners.set('PLAYERS_UPDATE', unsubscribe);
    return unsubscribe;
  }

  /**
   * Listen to all teams in a match for budget changes
   */
  onTeamsUpdate(matchId: string, callback: (teams: any[]) => void): Unsubscribe {
    const teamsRef = collection(firestore, 'teams');
    const unsubscribe = onSnapshot(teamsRef, (snapshot) => {
      const teams = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((t: any) => t.matchId === matchId);
      
      console.log(`🔥 Teams updated for match ${matchId}:`, teams.length);
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
}

// Export singleton instance
export const firebaseRealtimeService = new FirebaseRealtimeService();
export default firebaseRealtimeService;
