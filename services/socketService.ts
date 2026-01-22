import { io, Socket } from 'socket.io-client';

/**
 * Real-Time WebSocket Service for Live Auction
 * Handles all server-client communication for bidding, timer, and state updates
 */

class SocketService {
  private socket: Socket | null = null;
  private connected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private currentSeasonId: string | null = null;
  private currentUserId: string | null = null;
  private currentRole: string | null = null;

  /**
   * Initialize WebSocket connection to server
   */
  connect(serverUrl: string = 'http://localhost:5000') {
    if (this.connected && this.socket) {
      console.log('Already connected to server');
      return this.socket;
    }

    console.log('🔌 Connecting to HypeHammer server...');

    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts
    });

    // Connection handlers
    this.socket.on('connect', () => {
      console.log('✅ Connected to server:', this.socket?.id);
      this.connected = true;
      this.reconnectAttempts = 0;

      // Rejoin season if was previously connected
      if (this.currentSeasonId && this.currentUserId && this.currentRole) {
        this.joinSeason(this.currentSeasonId, this.currentUserId, this.currentRole);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server:', reason);
      this.connected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.reconnectAttempts++;
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
      }
    });

    this.socket.on('connection_response', (data) => {
      console.log('Server response:', data.message);
    });

    return this.socket;
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.currentSeasonId = null;
      this.currentUserId = null;
      this.currentRole = null;
    }
  }

  /**
   * Join a season room to receive real-time updates
   */
  joinSeason(seasonId: string, userId: string, role: string) {
    if (!this.socket) {
      console.error('Socket not connected');
      return;
    }

    this.currentSeasonId = seasonId;
    this.currentUserId = userId;
    this.currentRole = role;

    console.log(`📡 Joining season ${seasonId} as ${role}`);

    this.socket.emit('join_season', {
      seasonId,
      userId,
      role
    });
  }

  /**
   * Leave current season room
   */
  leaveSeason(seasonId: string) {
    if (!this.socket) return;

    console.log(`📡 Leaving season ${seasonId}`);

    this.socket.emit('leave_season', { seasonId });
    this.currentSeasonId = null;
  }

  /**
   * Listen to auction state updates
   */
  onAuctionStateUpdate(callback: (state: any) => void) {
    if (!this.socket) return;
    this.socket.on('AUCTION_STATE_UPDATE', callback);
  }

  /**
   * Listen to auction started event
   */
  onAuctionStarted(callback: (data: any) => void) {
    if (!this.socket) return;
    this.socket.on('AUCTION_STARTED', callback);
  }

  /**
   * Listen to auction paused event
   */
  onAuctionPaused(callback: (data: any) => void) {
    if (!this.socket) return;
    this.socket.on('AUCTION_PAUSED', callback);
  }

  /**
   * Listen to auction resumed event
   */
  onAuctionResumed(callback: (data: any) => void) {
    if (!this.socket) return;
    this.socket.on('AUCTION_RESUMED', callback);
  }

  /**
   * Listen to auction ended event
   */
  onAuctionEnded(callback: (data: any) => void) {
    if (!this.socket) return;
    this.socket.on('AUCTION_ENDED', callback);
  }

  /**
   * Listen to timer updates (server-controlled)
   */
  onTimerUpdate(callback: (data: { remainingSeconds: number; serverTime: string }) => void) {
    if (!this.socket) return;
    this.socket.on('AUCTION_TIMER_UPDATE', callback);
  }

  /**
   * Listen to player bidding started event
   */
  onPlayerBiddingStarted(callback: (data: any) => void) {
    if (!this.socket) return;
    this.socket.on('PLAYER_BIDDING_STARTED', callback);
  }

  /**
   * Listen to new bid event (ALL DASHBOARDS SEE THIS)
   */
  onNewBid(callback: (data: any) => void) {
    if (!this.socket) return;
    this.socket.on('NEW_BID', callback);
  }

  /**
   * Listen to player sold event
   */
  onPlayerSold(callback: (data: any) => void) {
    if (!this.socket) return;
    this.socket.on('PLAYER_SOLD', callback);
  }

  /**
   * Listen to player unsold event
   */
  onPlayerUnsold(callback: (data: any) => void) {
    if (!this.socket) return;
    this.socket.on('PLAYER_UNSOLD', callback);
  }

  /**
   * Listen to auctioneer approved event (personal notification)
   */
  onAuctioneerApproved(callback: (data: any) => void) {
    if (!this.socket) return;
    this.socket.on('AUCTIONEER_APPROVED', callback);
  }

  /**
   * Listen to auctioneer rejected event
   */
  onAuctioneerRejected(callback: (data: any) => void) {
    if (!this.socket) return;
    this.socket.on('AUCTIONEER_REJECTED', callback);
  }

  /**
   * Listen to timer extended event
   */
  onTimerExtended(callback: (data: any) => void) {
    if (!this.socket) return;
    this.socket.on('TIMER_EXTENDED', callback);
  }

  /**
   * Listen to auctioneer replaced event
   */
  onAuctioneerReplaced(callback: (data: any) => void) {
    if (!this.socket) return;
    this.socket.on('AUCTIONEER_REPLACED', callback);
  }

  /**
   * Remove all listeners (cleanup on unmount)
   */
  removeAllListeners() {
    if (!this.socket) return;
    this.socket.removeAllListeners();
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected && this.socket !== null;
  }

  /**
   * Get socket instance (for custom events)
   */
  getSocket(): Socket | null {
    return this.socket;
  }
}

// Export singleton instance
export const socketService = new SocketService();
export default socketService;
