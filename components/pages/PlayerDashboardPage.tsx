import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { User, Trophy, Clock, DollarSign, Bell, LogOut, Users, Activity, Award, Radio, Shield, AlertCircle, CheckCircle, XCircle, ChevronDown, X, Calendar, MapPin, Mail } from 'lucide-react';
import { AuctionStatus, MatchData, UserRole, Player, Team } from '../../types';
import { LiveAuctionPage } from './LiveAuctionPage';
import { PlayersPage } from './PlayersPage';
import { socketService } from '../../services/socketService';
import { useAudioListener } from '../../services/useAudioListener';

const API_BASE = 'https://us-central1-axilam.cloudfunctions.net/auction';

interface PlayerDashboardPageProps {
  setStatus: (status: AuctionStatus) => void;
  currentMatch: MatchData | null;
  currentUser: { name: string; email: string; role: UserRole; playerRole?: string; basePrice?: number };
}

export const PlayerDashboardPage: React.FC<PlayerDashboardPageProps> = ({ setStatus, currentMatch, currentUser }) => {
  const [activeSection, setActiveSection] = useState<'dashboard' | 'liveRoom'>('dashboard');
  const [playerData, setPlayerData] = useState<Player | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const teamsRef = useRef<Team[]>([]);
  const activityFeedIdRef = useRef<number>(0);
  
  // Live auction state
  const [currentBiddingPlayer, setCurrentBiddingPlayer] = useState<Player | null>(null);
  const [currentBid, setCurrentBid] = useState<number>(0);
  const [leadingTeam, setLeadingTeam] = useState<Team | null>(null);
  const currentPlayerIdRef = useRef<string | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [auctionStatus, setAuctionStatus] = useState<'upcoming' | 'live' | 'paused' | 'completed'>('upcoming');
  
  // Queue information
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [totalPlayers, setTotalPlayers] = useState<number>(0);
  const [estimatedTime, setEstimatedTime] = useState<number>(0);
  
  // Activity feed
  const [activityFeed, setActivityFeed] = useState<Array<{ id: string; message: string; time: string; type: 'system' | 'bid' | 'sold' | 'unsold' }>>([]);
  
  // Audio
  const [auctioneerMicOn, setAuctioneerMicOn] = useState(false);
  
  // Result state
  const [finalResult, setFinalResult] = useState<{ sold: boolean; teamName?: string; price?: number; time?: string } | null>(null);
  
  // UI state
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showPlayersPage, setShowPlayersPage] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; message: string; time: string; read: boolean }>>([]);

  const userId = currentUser.email;

  const [resolvedMatchId, setResolvedMatchId] = useState<string>('');
  const [resolvedMatchName, setResolvedMatchName] = useState<string>('');
  const seasonId = resolvedMatchId || currentMatch?.id || '';

  // Resolve matchId for players when App doesn't have currentMatch loaded.
  useEffect(() => {
    if (seasonId || !currentUser?.email) return;

    let cancelled = false;
    const resolve = async () => {
      try {
        setLoading(true);
        const playersRes = await fetch(`${API_BASE}/players`);
        const playersJson = await playersRes.json().catch(() => ({}));
        const allPlayers: Player[] = playersJson.data || [];
        const me = allPlayers.find(p => p.email === currentUser.email);
        const matchId = (me as any)?.matchId;
        if (!cancelled && matchId) {
          setResolvedMatchId(matchId);
          // Best-effort match name (optional)
          fetch(`${API_BASE}/matches/${matchId}`)
            .then(r => r.json())
            .then(j => {
              if (!cancelled && j?.success && j?.data?.name) setResolvedMatchName(j.data.name);
            })
            .catch(() => {});
        }
      } catch (e) {
        console.error('Failed to resolve player match:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    resolve();
    return () => {
      cancelled = true;
    };
  }, [seasonId, currentUser?.email]);

  useEffect(() => {
    teamsRef.current = teams;
  }, [teams]);

  // Helper function to generate unique activity feed IDs
  const generateActivityId = () => {
    return `${Date.now()}-${++activityFeedIdRef.current}`;
  };

  // Fetch bid history for current player to get actual current bid and leading team
  const fetchBidHistoryForCurrentPlayer = async (playerId: string) => {
    if (!seasonId || !playerId) return;
    try {
      console.log('📋 Fetching bid history for player:', playerId);
      const response = await fetch(`${API_BASE}/bids?seasonId=${seasonId}&playerId=${playerId}`);
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
        
        // Use the latest bid to set actual current bid and leading team
        if (sortedBids.length > 0) {
          const latestBid = sortedBids[0];
          console.log('📍 Restoring current bid from history:', latestBid.amount, 'by', latestBid.teamName);
          setCurrentBid(latestBid.amount);
          const team = teamsRef.current.find(t => t.id === latestBid.teamId);
          setLeadingTeam(team || ({ id: latestBid.teamId, name: latestBid.teamName } as any));
        }
      }
    } catch (error) {
      console.error('Failed to fetch bid history:', error);
    }
  };

  useEffect(() => {
    currentPlayerIdRef.current = currentBiddingPlayer?.id || null;
  }, [currentBiddingPlayer?.id]);

  // Initialize socket connection early
  useEffect(() => {
    if (seasonId && userId) {
      socketService.connect();
    }
  }, [seasonId, userId]);

  // Audio listener
  useAudioListener({ socket: socketService.getSocket(), seasonId, userId });

  // Fetch player data and teams
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const fetchJsonWithTimeout = async (url: string, timeoutMs = 12000) => {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), timeoutMs);
          try {
            const res = await fetch(url, { signal: controller.signal });
            const json = await res.json().catch(() => ({}));
            return { ok: res.ok, status: res.status, json };
          } finally {
            clearTimeout(timeout);
          }
        };
        
        const [playersResp, teamsResp] = await Promise.all([
          fetchJsonWithTimeout(`${API_BASE}/players?matchId=${seasonId}`),
          fetchJsonWithTimeout(`${API_BASE}/teams?matchId=${seasonId}`)
        ]);

        if (teamsResp.ok) {
          setTeams(teamsResp.json.data || []);
        }

        if (playersResp.ok) {
          const allPlayers = playersResp.json.data || [];
          setTotalPlayers(allPlayers.length);

          const player = allPlayers.find((p: Player) => p.email === currentUser.email);
          if (player) {
            setPlayerData(player);
          }

          // Calculate queue position (best-effort): players not yet SOLD before this player
          const remainingPlayers = allPlayers.filter((p: Player) => (p.status || '').toUpperCase() !== 'SOLD');
          const playerIndex = remainingPlayers.findIndex((p: Player) => p.email === currentUser.email);
          if (playerIndex !== -1) {
            setQueuePosition(playerIndex + 1);
            setEstimatedTime(playerIndex * 3);
          }
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (currentMatch?.id && currentUser?.email) {
      fetchData();
    }
  }, [currentMatch?.id, currentUser?.email]);

  // Socket connection and listeners
  useEffect(() => {
    if (!seasonId || !userId) return;

    // Connect to server (keep for local dev if needed, disabled for Cloud deployment)
    // socketService.connect('http://localhost:5000');

    // Join season room
    socketService.joinSeason(seasonId, userId, UserRole.PLAYER);

    // Store unsubscribe functions for cleanup
    const unsubscribers: (() => void)[] = [];

    // Listen for auction state updates (includes current player if auction is in progress)
    unsubscribers.push(socketService.onAuctionStateUpdate((data: any) => {
      console.log('AUCTION_STATE_UPDATE received:', data);
      // If there's a current player being auctioned, set it
      if (data.currentPlayerId && data.biddingActive) {
        // We need to fetch the player data from the backend
        const API_BASE = 'https://us-central1-axilam.cloudfunctions.net/auction';
        fetch(`${API_BASE}/players/${data.currentPlayerId}`)
          .then(res => res.json())
          .then(playerData => {
            if (playerData.success && playerData.data) {
              setCurrentBiddingPlayer(playerData.data);
              currentPlayerIdRef.current = playerData.data.id;
              setCurrentBid(data.currentBid || playerData.data.currentBid || playerData.data.basePrice || 0);
              setLeadingTeam(teamsRef.current.find(t => t.id === data.leadingTeamId) || null);
              setAuctionStatus('live');
            }
          })
          .catch(err => console.error('Failed to fetch current player:', err));
      } else if (!data.biddingActive) {
        setCurrentBiddingPlayer(null);
        setCurrentBid(0);
        setLeadingTeam(null);
        currentPlayerIdRef.current = null;
      }
    }));

    // Auction state updates
    unsubscribers.push(socketService.onAuctionStarted((data: any) => {
      console.log('🚀 AUCTION_STARTED received:', data);
      setAuctionStatus('live');
      setActivityFeed(prev => [{
        id: generateActivityId(),
        message: '🚀 Auction has started!',
        time: new Date().toLocaleTimeString(),
        type: 'system'
      }, ...prev]);
    }));

    unsubscribers.push(socketService.onAuctionPaused((data: any) => {
      console.log('⏸️ AUCTION_PAUSED received:', data);
      setAuctionStatus('paused');
      setActivityFeed(prev => [{
        id: generateActivityId(),
        message: '⏸️ Auction paused',
        time: new Date().toLocaleTimeString(),
        type: 'system'
      }, ...prev]);
    }));

    unsubscribers.push(socketService.onAuctionResumed((data: any) => {
      console.log('▶️ AUCTION_RESUMED received:', data);
      setAuctionStatus('live');
      setActivityFeed(prev => [{
        id: generateActivityId(),
        message: '▶️ Auction resumed',
        time: new Date().toLocaleTimeString(),
        type: 'system'
      }, ...prev]);
    }));

    // Auctioneer mic status (stubs for compatibility)
    unsubscribers.push(socketService.onAuctioneerMicOn(() => {
      setAuctioneerMicOn(true);
    }));

    unsubscribers.push(socketService.onAuctioneerMicOff(() => {
      setAuctioneerMicOn(false);
    }));

    // Player bidding started
    unsubscribers.push(socketService.onPlayerBiddingStarted((data: { player: Player; basePrice: number } | null) => {
      console.log('PLAYER_BIDDING_STARTED received:', data);
      if (!data || !(data as any)?.player) {
        setCurrentBiddingPlayer(null);
        setCurrentBid(0);
        setLeadingTeam(null);
        currentPlayerIdRef.current = null;
        return;
      }

      setCurrentBiddingPlayer(data.player);
      currentPlayerIdRef.current = data.player.id;
      const hydratedBid = (data.player as any)?.currentBid || data.basePrice || data.player.basePrice || 0;
      setCurrentBid(hydratedBid);
      const hydratedLeadingTeamId = (data.player as any)?.leadingTeamId;
      setLeadingTeam(hydratedLeadingTeamId ? (teamsRef.current.find(t => t.id === hydratedLeadingTeamId) || null) : null);
      setAuctionStatus('live');
      
      // Fetch actual bid history to get accurate current bid and leading team
      fetchBidHistoryForCurrentPlayer(data.player.id);
      
      // Check if it's this player
      if (data.player.email === currentUser.email) {
        setActivityFeed(prev => [{
          id: generateActivityId(),
          message: `Your bidding has started! Base price: ₹${((data.basePrice || data.player.basePrice) / 100000).toFixed(1)}L`,
          time: new Date().toLocaleTimeString(),
          type: 'bid'
        }, ...prev]);
      } else {
        setActivityFeed(prev => [{
          id: generateActivityId(),
          message: `${data.player.name} is now being auctioned`,
          time: new Date().toLocaleTimeString(),
          type: 'bid'
        }, ...prev]);
      }
    }));

    // New bid
    unsubscribers.push(socketService.onNewBid((data: { playerId: string; amount: number; teamId: string; teamName: string; seasonId?: string }) => {
      console.log('💰 NEW_BID received:', data);
      console.log('   → Updating current bid to:', data.amount);

      // Ignore stale latestEvent bids from other players/seasons
      if (!currentPlayerIdRef.current) return;
      if (data.seasonId && seasonId && data.seasonId !== seasonId) return;
      if (currentPlayerIdRef.current && data.playerId && data.playerId !== currentPlayerIdRef.current) return;

      setCurrentBid(data.amount);
      const team = teamsRef.current.find(t => t.id === data.teamId);
      setLeadingTeam(team || ({ id: data.teamId, name: data.teamName } as any));
      
      setActivityFeed(prev => [{
        id: generateActivityId(),
        message: `${data.teamName} bid ₹${(data.amount / 100000).toFixed(1)}L`,
        time: new Date().toLocaleTimeString(),
        type: 'bid'
      }, ...prev]);
    }));

    // Player updated (live changes from auctioneer)
    unsubscribers.push(socketService.onPlayerUpdated(async (data: { playerId: string; player: Player }) => {
      console.log('PLAYER_UPDATED received:', data);
      
      // If this is the current user's player data, update it
      if (data.player.email === currentUser.email) {
        setPlayerData(data.player);
        
        // Add notification about the update
        setNotifications(prev => [{
          id: generateActivityId(),
          message: `Your player profile was updated`,
          time: new Date().toLocaleTimeString(),
          read: false
        }, ...prev]);
      }
      
      // If this player is currently being auctioned, update the bidding player
      if (currentBiddingPlayer && data.playerId === currentBiddingPlayer.id) {
        setCurrentBiddingPlayer(data.player);
      }
    }));
    
    // Player sold
    unsubscribers.push(socketService.onPlayerSold(async (data: { playerId: string; playerName: string; sold?: boolean; finalAmount: number; teamId: string; teamName: string }) => {
      const soldMessage = `${data.playerName} SOLD to ${data.teamName} for ₹${(data.finalAmount / 100000).toFixed(1)}L`;
      
      setActivityFeed(prev => [{
        id: generateActivityId(),
        message: soldMessage,
        time: new Date().toLocaleTimeString(),
        type: 'sold'
      }, ...prev]);
      
      // Add to notifications
      setNotifications(prev => [{
        id: generateActivityId(),
        message: soldMessage,
        time: new Date().toLocaleTimeString(),
        read: false
      }, ...prev]);
      
      // Firebase listeners will automatically update player data
      // Check if it's this player and update final result
      if (data.playerId === playerData?.id) {
        setFinalResult({
          sold: true,
          teamName: data.teamName,
          price: data.finalAmount,
          time: new Date().toLocaleTimeString()
        });
      }
      
      setCurrentBiddingPlayer(null);
      setCurrentBid(0);
      setLeadingTeam(null);
    }));

    // Player unsold
    unsubscribers.push(socketService.onPlayerUnsold(async (data: { playerId: string; playerName: string }) => {
      setActivityFeed(prev => [{
        id: generateActivityId(),
        message: `${data.playerName} went UNSOLD`,
        time: new Date().toLocaleTimeString(),
        type: 'unsold'
      }, ...prev]);
      
      // Firebase listeners will automatically update player data
      // Check if it's this player and update final result
      if (data.playerId === playerData?.id) {
        setFinalResult({
          sold: false,
          time: new Date().toLocaleTimeString()
        });
      }
      
      setCurrentBiddingPlayer(null);
      setCurrentBid(0);
      setLeadingTeam(null);
    }));

    // Timer update
    unsubscribers.push(socketService.onTimerUpdate((data: { remainingSeconds: number }) => {
      setCountdown(data.remainingSeconds);
    }));

    // Auction ended
    unsubscribers.push(socketService.onAuctionEnded(() => {
      setAuctionStatus('completed');
    }));

    return () => {
      // Cleanup all event listeners
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [seasonId, userId, currentUser.email]);

  // Set up Firebase real-time listeners
  useEffect(() => {
    if (!seasonId) return;

    console.log('🔥 Player: Setting up real-time listeners');

    // Listen to player status changes
    const playersUnsubscribe = socketService.onPlayersUpdate(seasonId, (updatedPlayers) => {
      // Store all players for queue display
      setPlayers(updatedPlayers);

      // Find if I'm being auctioned
      const myPlayer = updatedPlayers.find((p: any) => p.email === currentUser.email);
      if (myPlayer && myPlayer.status === 'LIVE') {
        setCurrentBiddingPlayer(myPlayer);
        setCurrentBid(myPlayer.currentBid || myPlayer.basePrice);
      }

      // Check for live player
      const livePlayer = updatedPlayers.find((p: any) => p.status === 'LIVE');
      if (livePlayer) {
        setCurrentBiddingPlayer(livePlayer);
        setAuctionStatus('live');
      }
    });

    // Listen to bid events
    const bidUnsubscribe = socketService.onNewBid((bidData) => {
      console.log('🔥 Player: New bid:', bidData);
      if (!currentPlayerIdRef.current) return;
      if (bidData?.seasonId && seasonId && bidData.seasonId !== seasonId) return;
      if (currentPlayerIdRef.current && bidData?.playerId && bidData.playerId !== currentPlayerIdRef.current) return;
      setCurrentBid(bidData.amount);
    });

    return () => {
      playersUnsubscribe();
      bidUnsubscribe();
    };
  }, [seasonId, currentUser.email]);

  const getPlayerStatus = (player: Player | null): { label: string; color: string; icon: React.ReactNode } => {
    if (!player) return { label: 'Waiting', color: 'bg-gray-100 text-gray-600 border-gray-300', icon: <Clock size={14} /> };
    
    const status = player.status?.toLowerCase() || 'pending';
    
    if (status === 'live' || (currentBiddingPlayer && currentBiddingPlayer.email === player.email)) {
      return { label: 'Live Now', color: 'bg-red-100 text-red-600 border-red-300 animate-pulse', icon: <Radio size={14} /> };
    } else if (status === 'sold' || player.teamId) {
      return { label: 'Sold', color: 'bg-green-100 text-green-600 border-green-300', icon: <CheckCircle size={14} /> };
    } else if (status === 'unsold') {
      return { label: 'Unsold', color: 'bg-gray-100 text-gray-600 border-gray-300', icon: <XCircle size={14} /> };
    } else {
      return { label: 'Waiting', color: 'bg-yellow-100 text-yellow-600 border-yellow-300', icon: <Clock size={14} /> };
    }
  };

  const getAuctionStatusBadge = () => {
    switch (auctionStatus) {
      case 'upcoming':
        return <span className="flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-100 border-2 border-yellow-300 text-yellow-700 font-bold text-sm">
          <Clock size={16} />
          Upcoming
        </span>;
      case 'live':
        return <span className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-100 border-2 border-red-300 text-red-600 font-bold text-sm animate-pulse">
          <Radio size={16} />
          Live
        </span>;
      case 'completed':
        return <span className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 border-2 border-blue-300 text-blue-700 font-bold text-sm">
          <CheckCircle size={16} />
          Completed
        </span>;
    }
  };

  const isMyTurn = currentBiddingPlayer && currentBiddingPlayer.email === currentUser.email;

  if (activeSection === 'liveRoom') {
    return (
      <div className="fixed inset-0 z-50">
        <LiveAuctionPage
          seasonId={seasonId}
          userId={userId}
          userRole={UserRole.PLAYER}
          onClose={() => setActiveSection('dashboard')}
        />
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-white via-blue-50 to-purple-50 flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="h-24 bg-white/95 backdrop-blur-md border-b-2 border-cyan-200 shadow-lg flex items-center px-6">
        <div className="w-full flex items-center justify-between">
          {/* Left: Logo + Season */}
          <div className="flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-xl overflow-hidden border-2 border-cyan-300 shadow-lg hover:scale-105 transition-transform cursor-pointer"
              onClick={() => setStatus(AuctionStatus.HOME)}
            >
              <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 uppercase tracking-wider leading-none">
                {currentMatch?.name || 'Player Dashboard'}
              </h1>
              <p className="text-xs text-gray-600 font-semibold mt-0.5">Season {new Date().getFullYear()}</p>
            </div>
          </div>

          {/* Center: Status + Countdown */}
          <div className="flex items-center gap-6">
            {getAuctionStatusBadge()}
            
            {countdown > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border-2 border-cyan-300 shadow-md">
                <Clock size={16} className="text-cyan-600" />
                <span className="font-mono font-bold text-slate-800 text-sm">{countdown}s</span>
              </div>
            )}
            
            {auctioneerMicOn && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 border-2 border-green-300 shadow-md animate-pulse">
                <Mic size={16} className="text-green-600" />
                <span className="text-sm font-bold text-green-700">Auctioneer Live</span>
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg bg-white border-2 border-cyan-300 text-cyan-600 hover:bg-cyan-50 transition-all"
              >
                <Bell size={18} />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 top-14 w-96 bg-white rounded-2xl border-2 border-cyan-200 shadow-2xl z-50 overflow-hidden">
                  <div className="bg-gradient-to-r from-cyan-100 to-blue-100 px-6 py-4 border-b-2 border-cyan-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Notifications</h3>
                      <button onClick={() => setShowNotifications(false)} className="text-slate-600 hover:text-slate-800">
                        <X size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Auction Info Section */}
                  <div className="px-6 py-4 bg-blue-50 border-b border-cyan-200">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 text-sm">
                        <Calendar size={16} className="text-cyan-600" />
                        <span className="text-slate-700 font-semibold">
                          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Clock size={16} className="text-cyan-600" />
                        <span className="text-slate-700 font-semibold">{new Date().toLocaleTimeString()}</span>
                      </div>
                      {countdown > 0 && (
                        <div className="flex items-center gap-3 text-sm">
                          <Clock size={16} className="text-red-600" />
                          <span className="text-red-600 font-bold">Timer: {countdown}s</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notifications List */}
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-6 py-8 text-center">
                        <Bell size={32} className="mx-auto mb-3 text-gray-300" />
                        <p className="text-gray-400 text-sm">No notifications yet</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {notifications.map(notif => (
                          <div
                            key={notif.id}
                            className={`px-6 py-4 hover:bg-blue-50 transition-colors ${!notif.read ? 'bg-cyan-50' : ''}`}
                          >
                            <p className="text-sm text-slate-800 font-semibold mb-1">{notif.message}</p>
                            <p className="text-xs text-gray-500">{notif.time}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowPlayersPage(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-bold text-sm transition-all shadow-lg"
            >
              <Users size={16} />
              Players
            </button>

            <button
              onClick={() => setActiveSection('liveRoom')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-all shadow-lg hover:shadow-xl"
            >
              <Radio size={16} />
              Live Room
            </button>
            
            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowProfile(!showProfile)}
                className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white border-2 border-cyan-200 hover:border-cyan-300 transition-all"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center overflow-hidden border-2 border-white shadow-md">
                  {playerData?.imageUrl ? (
                    <img src={playerData.imageUrl} alt={currentUser.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-bold text-sm">{currentUser.name?.[0] || 'P'}</span>
                  )}
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-800">{currentUser.name}</p>
                  <p className="text-[9px] text-gray-600 uppercase tracking-wider">Player</p>
                </div>
                <ChevronDown size={16} className="text-gray-400" />
              </button>

              {/* Profile Dropdown Panel - Rendered in Portal */}
              {showProfile && ReactDOM.createPortal(
                <div className="fixed top-24 right-6 w-80 bg-white rounded-2xl border-2 border-cyan-200 shadow-2xl z-50 overflow-hidden">
                  <div className="bg-gradient-to-r from-cyan-100 to-blue-100 px-6 py-4 border-b-2 border-cyan-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Profile</h3>
                      <button onClick={() => setShowProfile(false)} className="text-slate-600 hover:text-slate-800">
                        <X size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="p-6">
                    {/* Avatar */}
                    <div className="flex flex-col items-center mb-6">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg mb-3">
                        {playerData?.imageUrl ? (
                          <img src={playerData.imageUrl} alt={currentUser.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white font-black text-3xl">{currentUser.name?.[0] || 'P'}</span>
                        )}
                      </div>
                      <h3 className="text-lg font-black text-slate-800">{currentUser.name}</h3>
                      <div className="mt-2 px-3 py-1 rounded-full bg-cyan-100 border border-cyan-300">
                        <span className="text-xs font-bold text-cyan-700 uppercase">Player</span>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="space-y-3 mb-6">
                      <div className="flex items-start gap-3">
                        <Mail size={16} className="text-cyan-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-[10px] text-gray-600 uppercase tracking-wider font-bold mb-0.5">Email</p>
                          <p className="text-sm text-slate-800 font-semibold break-all">{currentUser.email}</p>
                        </div>
                      </div>
                      <div className="h-px bg-cyan-200"></div>
                      <div className="flex items-start gap-3">
                        <Trophy size={16} className="text-cyan-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-[10px] text-gray-600 uppercase tracking-wider font-bold mb-0.5">Season</p>
                          <p className="text-sm text-slate-800 font-semibold">{currentMatch?.name || 'Current Season'}</p>
                        </div>
                      </div>
                      <div className="h-px bg-cyan-200"></div>
                      <div className="flex items-start gap-3">
                        <Award size={16} className="text-cyan-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-[10px] text-gray-600 uppercase tracking-wider font-bold mb-0.5">Role</p>
                          <p className="text-sm text-slate-800 font-semibold">{playerData?.roleId || currentUser.playerRole || 'Player'}</p>
                        </div>
                      </div>
                      <div className="h-px bg-cyan-200"></div>
                      <div className="flex items-start gap-3">
                        <DollarSign size={16} className="text-cyan-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-[10px] text-gray-600 uppercase tracking-wider font-bold mb-0.5">Base Price</p>
                          <p className="text-sm text-slate-800 font-semibold">₹{((playerData?.basePrice || 0) / 100000).toFixed(1)} Lakhs</p>
                        </div>
                      </div>
                    </div>

                    {/* Logout Button */}
                    <button
                      onClick={() => {
                        sessionStorage.clear();
                        localStorage.clear();
                        setStatus(AuctionStatus.HOME);
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-all shadow-lg"
                    >
                      <LogOut size={16} />
                      Logout
                    </button>
                  </div>
                </div>,
                document.body
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 px-4 pt-3 pb-3 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-lg font-bold text-slate-600">Loading player data...</p>
            </div>
          </div>
        ) : !playerData ? (
          <div className="flex items-center justify-center h-full">
            <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-12 border-2 border-cyan-200 text-center shadow-2xl max-w-lg">
              <AlertCircle size={56} className="mx-auto mb-6 text-slate-400" />
              <p className="text-2xl font-black text-slate-800 mb-3">No Player Profile Found</p>
              <p className="text-slate-600">Your player registration might be pending approval</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-4 h-full overflow-hidden">
            {/* Players Queue - Left (col-span-3) */}
            <div className="col-span-3 flex flex-col gap-3 h-full overflow-hidden">
              <div className="bg-white/90 backdrop-blur-lg rounded-2xl border-2 border-blue-200 shadow-xl overflow-hidden flex flex-col flex-1">
                <div className="bg-gradient-to-r from-blue-100 to-cyan-100 px-4 py-3 border-b-2 border-blue-200">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Users size={14} className="text-blue-600" />
                    Queue ({players.length})
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {(() => {
                    const sorted = [...players].sort((a, b) => {
                      if (a.status === 'UNSOLD' && b.status !== 'UNSOLD') return 1;
                      if (a.status !== 'UNSOLD' && b.status === 'UNSOLD') return -1;
                      return 0;
                    });
                    const unsoldCount = sorted.filter(p => p.status === 'UNSOLD').length;
                    const regularCount = sorted.length - unsoldCount;

                    return sorted.map((player, index) => (
                      <React.Fragment key={player.id}>
                        {index === regularCount && unsoldCount > 0 && (
                          <div className="py-1 px-2 flex items-center gap-2 text-xs font-bold text-orange-600">
                            <div className="flex-1 h-px bg-orange-200"></div>
                            <span>Re-Auction</span>
                            <div className="flex-1 h-px bg-orange-200"></div>
                          </div>
                        )}
                        <div
                          className={`flex items-center gap-2 p-2 rounded-lg border-2 transition-all ${
                            player.id === currentBiddingPlayer?.id
                              ? 'bg-red-50 border-red-300'
                              : player.status === 'UNSOLD'
                                ? 'bg-orange-50 border-orange-300 hover:bg-orange-100'
                                : player.status === 'SOLD'
                                ? 'bg-green-50 border-green-300'
                                : 'bg-white border-gray-200 hover:bg-blue-50'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
                            {player.imageUrl ? (
                              <img src={player.imageUrl} alt={player.name} className="w-full h-full object-cover rounded-lg" />
                            ) : (
                              <User size={18} className="text-slate-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm text-slate-800 truncate">{player.name}</h4>
                            <p className="text-xs text-gray-600 truncate">{player.roleId}</p>
                          </div>
                          <div className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${
                            player.status === 'SOLD' ? 'bg-green-100 text-green-700' :
                            player.status === 'UNSOLD' ? 'bg-orange-100 text-orange-700' :
                            player.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                            player.status === 'AVAILABLE' ? 'bg-blue-100 text-blue-700' :
                            player.status === 'LIVE' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {player.status}
                          </div>
                        </div>
                      </React.Fragment>
                    ))
                  })()}
                </div>
              </div>
            </div>

            {/* Left-Mid Panel: Player Profile + Queue Info + Activity Feed (col-span-3) */}
            <div className="col-span-3 flex flex-col gap-3 overflow-y-auto pr-2">
              {/* Player Profile */}
              <div className="bg-white/90 backdrop-blur-lg rounded-2xl border-2 border-cyan-200 shadow-xl overflow-hidden">
                <div className="h-16 bg-gradient-to-br from-cyan-100 via-blue-100 to-purple-100"></div>
                <div className="relative px-4 pb-3 -mt-8">
                  <div className="w-16 h-16 rounded-xl overflow-hidden border-3 border-white shadow-xl mx-auto bg-slate-200 flex items-center justify-center">
                    {playerData.imageUrl ? (
                      <img src={playerData.imageUrl} alt="Player" className="w-full h-full object-cover" />
                    ) : (
                      <User size={24} className="text-slate-400" />
                    )}
                  </div>
                  <h3 className="text-lg font-black text-center mt-2 text-slate-800 uppercase leading-tight">{playerData.name}</h3>
                  <p className="text-sm text-gray-600 text-center uppercase tracking-wider font-bold">{playerData.roleId}</p>
                  
                  {/* Status Badge */}
                  <div className="mt-2 flex items-center justify-center">
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border-2 ${getPlayerStatus(playerData).color}`}>
                      {getPlayerStatus(playerData).icon}
                      <span className="text-xs font-bold uppercase">{getPlayerStatus(playerData).label}</span>
                    </div>
                  </div>
                  
                  {/* Sold Information */}
                  {(playerData.status?.toLowerCase() === 'sold' || playerData.soldTo) && playerData.soldTo && (
                    <div className="mt-2 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-center">
                          <p className="text-xs text-gray-600 uppercase font-bold">Sold To</p>
                          <p className="text-sm font-black text-green-600 truncate">{teams.find(t => t.id === playerData.soldTo)?.name || 'Team'}</p>
                        </div>
                        {playerData.soldAmount && (
                          <div className="text-center">
                            <p className="text-xs text-gray-600 uppercase font-bold">Price</p>
                            <p className="text-sm font-black text-green-600">₹{((playerData.soldAmount || 0) / 100000).toFixed(1)}L</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Base Price - Show only when not sold */}
                  {!(playerData.status?.toLowerCase() === 'sold' || playerData.soldTo) && (
                    <div className="mt-2 p-3 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg border border-cyan-200">
                      <p className="text-xs text-gray-600 uppercase tracking-wider font-bold text-center">Base Price</p>
                      <p className="text-lg font-black text-center text-cyan-600">₹{((playerData.basePrice || 0) / 100000).toFixed(1)}L</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Queue Position */}
              {queuePosition && queuePosition > 0 && (
                <div className="bg-white/90 backdrop-blur-lg rounded-2xl border-2 border-purple-200 shadow-xl p-4">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Users size={14} className="text-purple-600" />
                    Queue Position
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 uppercase font-bold">Position</span>
                      <span className="text-2xl font-black text-purple-600">#{queuePosition}</span>
                    </div>
                    <div className="h-px bg-purple-200"></div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 uppercase font-bold">Total</span>
                      <span className="text-lg font-black text-slate-800">{totalPlayers}</span>
                    </div>
                    {estimatedTime > 0 && (
                      <>
                        <div className="h-px bg-purple-200"></div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 uppercase font-bold">Est. Time</span>
                          <span className="text-lg font-black text-slate-800">~{estimatedTime} min</span>
                        </div>
                      </>
                    )}
                    {queuePosition === 1 && (
                      <div className="mt-2 p-3 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                        <p className="text-sm font-bold text-yellow-700 text-center uppercase">🔥 You're Next!</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Live Activity Feed */}
              <div className="bg-white/90 rounded-2xl border-2 border-green-200 shadow-xl overflow-hidden flex-1 flex flex-col">
                <div className="bg-gradient-to-r from-green-100 to-emerald-100 px-4 py-3 border-b-2 border-green-200">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Activity size={14} className="text-green-600" />
                    Activity Feed
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {activityFeed.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                      <p className="text-gray-400 text-sm">No activity yet</p>
                    </div>
                  ) : (
                    activityFeed.map(item => (
                      <div
                        key={item.id}
                        className={`flex items-start gap-2 p-3 rounded-lg border-2 text-sm ${
                          item.type === 'bid'
                            ? 'bg-blue-50 border-blue-300'
                            : item.type === 'sold'
                            ? 'bg-green-50 border-green-300'
                            : item.type === 'unsold'
                            ? 'bg-orange-50 border-orange-300'
                            : 'bg-gray-50 border-gray-300'
                        }`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0 ${
                          item.type === 'bid' ? 'bg-blue-500' :
                          item.type === 'sold' ? 'bg-green-500' :
                          item.type === 'unsold' ? 'bg-orange-500' :
                          'bg-gray-500'
                        }`}></div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-slate-800 break-words">{item.message}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{item.time}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Center: Live Auction Room - col-span-3 */}
            <div className="col-span-3 flex flex-col gap-4 overflow-hidden">
              {finalResult ? (
                /* Result Panel */
                <div className="bg-white/90 backdrop-blur-lg rounded-2xl border-2 border-cyan-200 shadow-xl h-full flex flex-col items-center justify-center p-8">
                  {finalResult.sold ? (
                    <>
                      <Trophy size={64} className="text-green-500 mb-6" />
                      <h2 className="text-4xl font-black text-slate-800 uppercase mb-2">Congratulations!</h2>
                      <p className="text-lg text-gray-600 mb-6">You've been successfully sold</p>
                      <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                        <div className="text-center p-4 bg-green-50 rounded-xl border-2 border-green-200">
                          <p className="text-xs text-gray-600 uppercase tracking-wider font-bold mb-2">Sold To</p>
                          <p className="text-xl font-black text-green-600">{finalResult.teamName}</p>
                        </div>
                        <div className="text-center p-4 bg-cyan-50 rounded-xl border-2 border-cyan-200">
                          <p className="text-xs text-gray-600 uppercase tracking-wider font-bold mb-2">Final Price</p>
                          <p className="text-xl font-black text-cyan-600">₹{((finalResult.price || 0) / 100000).toFixed(1)}L</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mt-6">Time: {finalResult.time}</p>
                    </>
                  ) : (
                    <>
                      <XCircle size={64} className="text-gray-400 mb-6" />
                      <h2 className="text-3xl font-black text-slate-800 uppercase mb-2">Unsold</h2>
                      <p className="text-gray-600 mb-4">You went unsold in this round</p>
                      <div className="p-4 bg-blue-50 rounded-xl border-2 border-blue-200 max-w-md">
                        <p className="text-sm text-gray-700 text-center">
                          You may be re-listed if the admin decides to run another round
                        </p>
                      </div>
                      <p className="text-sm text-gray-500 mt-6">Time: {finalResult.time}</p>
                    </>
                  )}
                </div>
              ) : isMyTurn ? (
                /* My Turn - Highlighted View */
                <div className="bg-gradient-to-br from-red-50 via-white to-orange-50 rounded-2xl border-4 border-red-400 shadow-2xl h-full flex flex-col items-center justify-center p-8 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-red-500 animate-pulse"></div>
                  
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-100 border-2 border-red-400 mb-4">
                      <Radio size={16} className="text-red-600 animate-pulse" />
                      <span className="text-sm font-black text-red-600 uppercase">You're Live Now!</span>
                    </div>
                  </div>

                  <div className="h-[280px] min-h-[280px] w-full max-w-[280px] rounded-3xl overflow-hidden border-4 border-white shadow-2xl mb-6 bg-slate-200 flex items-center justify-center">
                    {playerData.imageUrl ? (
                      <img src={playerData.imageUrl} alt="You" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <User size={80} className="text-slate-400" />
                    )}
                  </div>

                  <h2 className="text-4xl font-black text-slate-800 uppercase mb-2">{playerData.name}</h2>
                  <p className="text-lg text-gray-600 uppercase tracking-wider font-bold mb-8">{playerData.roleId}</p>

                  <div className="grid grid-cols-2 gap-6 w-full max-w-lg">
                    <div className="text-center p-6 bg-white rounded-2xl border-2 border-cyan-200 shadow-lg">
                      <p className="text-xs text-gray-600 uppercase tracking-wider font-bold mb-2">Current Bid</p>
                      <p className="text-4xl font-black text-cyan-600">₹{(currentBid / 100000).toFixed(1)}L</p>
                    </div>
                    <div className="text-center p-6 bg-white rounded-2xl border-2 border-purple-200 shadow-lg">
                      <p className="text-xs text-gray-600 uppercase tracking-wider font-bold mb-2">Leading Team</p>
                      <p className="text-xl font-black text-purple-600">{leadingTeam?.name || (currentBiddingPlayer as any)?.leadingTeamName || 'None Yet'}</p>
                    </div>
                  </div>

                  <div className="mt-8 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-xl max-w-md">
                    <p className="text-sm text-yellow-800 text-center font-semibold">
                      ⚠️ You cannot interact with bidding. Teams are competing for you!
                    </p>
                  </div>
                </div>
              ) : currentBiddingPlayer ? (
                /* Someone Else's Turn - Read-only View */
                <div className="bg-white/90 backdrop-blur-lg rounded-2xl border-2 border-cyan-200 shadow-xl h-full flex flex-col items-center justify-center p-4 overflow-hidden">
                  <div className="text-center mb-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 border-2 border-blue-300 mb-2">
                      <Activity size={14} className="text-blue-600" />
                      <span className="text-xs font-black text-blue-600 uppercase">Current Auction</span>
                    </div>
                  </div>

                  <div className="h-[260px] min-h-[260px] flex items-center justify-center bg-slate-200 rounded-2xl border-3 border-white shadow-lg mb-3">
                    {currentBiddingPlayer.imageUrl ? (
                      <img src={currentBiddingPlayer.imageUrl} alt={currentBiddingPlayer.name} className="max-h-full max-w-full object-contain rounded-xl" />
                    ) : (
                      <User size={60} className="text-slate-400" />
                    )}
                  </div>

                  <h3 className="text-2xl font-black text-slate-800 uppercase mb-1 text-center leading-tight">{currentBiddingPlayer.name}</h3>
                  <p className="text-xs text-gray-600 uppercase tracking-wider font-bold mb-3">{currentBiddingPlayer.roleId}</p>

                  <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
                    <div className="text-center p-3 bg-cyan-50 rounded-lg border-2 border-cyan-200">
                      <p className="text-xs text-gray-600 uppercase tracking-wider font-bold mb-1">Current Bid</p>
                      <p className="text-lg font-black text-cyan-600">₹{(currentBid / 100000).toFixed(1)}L</p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg border-2 border-purple-200">
                      <p className="text-xs text-gray-600 uppercase tracking-wider font-bold mb-1">Leading Team</p>
                      <p className="text-sm font-black text-purple-600">{leadingTeam?.name || (currentBiddingPlayer as any)?.leadingTeamName || 'None'}</p>
                    </div>
                  </div>
                </div>
              ) : (
                /* No Active Auction */
                <div className="bg-white/90 rounded-2xl border-2 border-cyan-200 shadow-xl h-full flex items-center justify-center overflow-hidden">
                  <div className="text-center">
                    {auctionStatus === 'live' ? (
                      <>
                        <Radio size={48} className="text-green-500 mb-3 animate-pulse mx-auto" />
                        <h3 className="text-2xl font-black text-green-600 mb-2">Auction is Live!</h3>
                        <p className="text-sm text-gray-600 max-w-md font-semibold mb-4">
                          The auction is running. Waiting for next player...
                        </p>
                        <div className="flex items-center justify-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                          <span className="text-green-600 font-bold text-sm">Ready for bidding</span>
                        </div>
                      </>
                    ) : auctionStatus === 'paused' ? (
                      <>
                        <Clock size={48} className="text-orange-400 mb-3 mx-auto" />
                        <h3 className="text-2xl font-black text-orange-600 mb-2">Auction Paused</h3>
                        <p className="text-sm text-gray-600 max-w-md font-semibold mb-4">
                          The auctioneer has paused the auction temporarily.
                        </p>
                        <div className="flex items-center justify-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></div>
                          <span className="text-orange-600 font-bold text-sm">Waiting to resume...</span>
                        </div>
                      </>
                    ) : auctionStatus === 'completed' ? (
                      <>
                        <Trophy size={48} className="text-blue-500 mb-3 mx-auto" />
                        <h3 className="text-2xl font-black text-blue-600 mb-2">Auction Completed</h3>
                        <p className="text-sm text-gray-600 max-w-md font-semibold mb-4">
                          The auction has been completed. Check results below.
                        </p>
                      </>
                    ) : (
                      <>
                        <Clock size={48} className="text-yellow-400 mb-3 animate-bounce mx-auto" />
                        <h3 className="text-2xl font-black text-slate-800 mb-2">Auction Starting Soon</h3>
                        <p className="text-sm text-gray-600 max-w-md font-semibold mb-4">
                          Get ready! The auctioneer is preparing to start the auction.
                        </p>
                        <div className="flex items-center justify-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></div>
                          <span className="text-yellow-600 font-bold text-sm">Waiting for auctioneer to start...</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Teams Panel + Auction Info - col-span-3 */}
            <div className="col-span-3 flex flex-col gap-3 h-full overflow-hidden">
              {/* All Teams (Scrollable) */}
              <div className="bg-white/90 backdrop-blur-lg rounded-2xl border-2 border-purple-200 shadow-xl overflow-hidden flex flex-col flex-1">
                <div className="bg-gradient-to-r from-purple-100 via-pink-100 to-purple-100 px-4 py-3 border-b-2 border-purple-200">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Shield size={14} className="text-purple-600" />
                    Teams ({teams.length})
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {teams.map(team => (
                    <div
                      key={team.id}
                      className="bg-white hover:bg-purple-50 rounded-lg p-3 border-2 border-purple-100 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {team.logo ? (
                            <img src={team.logo} alt={team.name} className="w-full h-full object-cover" />
                          ) : (
                            <Shield size={16} className="text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-black text-slate-800 text-xs uppercase truncate">{team.name}</h4>
                          <p className="text-[9px] text-gray-600 uppercase tracking-wider font-bold">
                            {team.budget > 0 ? 'Active' : 'Empty'}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-1 mt-2">
                        <div className="text-center p-1.5 bg-green-50 rounded border border-green-200">
                          <p className="text-[8px] text-gray-600 uppercase font-bold">Budget</p>
                          <p className="text-xs font-black text-green-600">₹{(team.budget / 100000).toFixed(1)}L</p>
                        </div>
                        <div className="text-center p-1.5 bg-blue-50 rounded border border-blue-200">
                          <p className="text-[8px] text-gray-600 uppercase font-bold">Players</p>
                          <p className="text-xs font-black text-blue-600">{team.playerIds?.length || 0}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Auction Info (Fixed at bottom) */}
              <div className="bg-green-50 rounded-xl border-2 border-green-200 p-4 shadow-lg">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Trophy size={14} className="text-green-600" />
                  Auction Info
                </h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-[9px] text-gray-600 uppercase tracking-wider font-bold mb-0.5">Teams Registered</p>
                    <p className="text-sm font-black text-slate-800">{teams.length} Teams</p>
                  </div>
                  <div className="h-px bg-green-300"></div>
                  <div>
                    <p className="text-[9px] text-gray-600 uppercase tracking-wider font-bold mb-0.5">Total Prize Pool</p>
                    <p className="text-sm font-black text-green-600">₹50 Crores</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Players Page Overlay */}
      {showPlayersPage && (
        <PlayersPage 
          onClose={() => setShowPlayersPage(false)} 
          currentMatch={currentMatch}
        />
      )}
    </div>
  );
};
