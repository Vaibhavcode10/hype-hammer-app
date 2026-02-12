import React, { useState, useEffect } from 'react';
import { 
  Eye, Trophy, Users, DollarSign, Bell, User, LogOut, Clock, 
  Zap, Shield, Timer, Radio,
  CheckCircle, XCircle, Loader, Mic, 
  Calendar, MapPin, Mail, X, ArrowLeft
} from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { firestore } from '../../services/firebaseConfig';
import { AuctionStatus, MatchData, UserRole, Team, Player } from '../../types';
import { LiveAuctionPage } from './LiveAuctionPage';
import { useAudioListener } from '../../services/useAudioListener';
import socketService from '../../services/socketService';
import firebaseRealtimeService from '../../services/firebaseRealtimeService';

interface GuestDashboardPageProps {
  setStatus: (status: AuctionStatus) => void;
  currentMatch: MatchData;
  currentUser: { name: string; email: string; role: UserRole };
}

export const GuestDashboardPage: React.FC<GuestDashboardPageProps> = ({ setStatus, currentMatch, currentUser }) => {
  const [activeSection, setActiveSection] = useState<'dashboard' | 'liveRoom'>('dashboard');
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentBiddingPlayer, setCurrentBiddingPlayer] = useState<Player | null>(null);
  const [currentBid, setCurrentBid] = useState<number>(0);
  const [leadingTeam, setLeadingTeam] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(0);
  const [auctionStatus, setAuctionStatus] = useState<'READY' | 'LIVE' | 'PAUSED' | 'ENDED'>('READY');
  const [activityFeed, setActivityFeed] = useState<Array<{ id: string; message: string; timestamp: Date; type: 'bid' | 'sold' | 'unsold' }>>([]);
  const [auctioneerMicOn, setAuctioneerMicOn] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; message: string; time: string; read: boolean }>>([]);

  // Audio listener for auctioneer mic
  const audioListener = useAudioListener({
    socket: socketService.getSocket(),
    seasonId: currentMatch?.id || '',
    userId: currentUser.email
  });

  // Connect to socket and listen for auction events
  useEffect(() => {
    if (!currentMatch?.id || !currentUser?.email) {
      return;
    }

    // Connect to server
    socketService.connect('http://localhost:5000');

    // Join season room
    socketService.joinSeason(currentMatch.id, currentUser.email, UserRole.GUEST);

    // Store unsubscribe functions for cleanup
    const unsubscribers: (() => void)[] = [];

    console.log('✅ Guest setting up socket listeners for season:', currentMatch.id);

    // Listen for timer updates from backend
    unsubscribers.push(socketService.onTimerUpdate((data: { remainingSeconds: number }) => {
      setCountdown(data.remainingSeconds);
    }));

    // Listen for auction state updates
    unsubscribers.push(socketService.onAuctionStateUpdate((data: any) => {
      console.log('📡 AUCTION_STATE_UPDATE received:', data);
      if (data.status) {
        console.log('   → Setting auction status to:', data.status);
        setAuctionStatus(data.status);
      }
      if (data.remainingSeconds !== undefined) {
        setCountdown(data.remainingSeconds);
      }
      // Current player + bid are driven by the Firestore players listener.
      // Keeping this handler minimal avoids stale state bugs and re-subscribe loops.
    }));

    // Listen for auctioneer mic events (stubs for compatibility)
    unsubscribers.push(socketService.onAuctioneerMicOn(() => {
      setAuctioneerMicOn(true);
    }));

    unsubscribers.push(socketService.onAuctioneerMicOff(() => {
      setAuctioneerMicOn(false);
    }));

    // Auction state updates
    unsubscribers.push(socketService.onAuctionStarted((data: any) => {
      console.log('🚀 AUCTION_STARTED received:', data);
      setAuctionStatus('LIVE');
      addActivity('🚀 Auction has started!', 'bid');
    }));

    unsubscribers.push(socketService.onAuctionPaused((data: any) => {
      console.log('⏸️ AUCTION_PAUSED received:', data);
      setAuctionStatus('PAUSED');
      addActivity('⏸️ Auction paused', 'bid');
    }));

    unsubscribers.push(socketService.onAuctionResumed((data: any) => {
      console.log('▶️ AUCTION_RESUMED received:', data);
      setAuctionStatus('LIVE');
      addActivity('▶️ Auction resumed', 'bid');
    }));

    unsubscribers.push(socketService.onAuctionEnded((data: any) => {
      console.log('🏁 AUCTION_ENDED received:', data);
      setAuctionStatus('ENDED');
      addActivity('🏁 Auction has ended', 'bid');
    }));

    // Listen for bidding events
    unsubscribers.push(socketService.onPlayerBiddingStarted((data: any) => {
      console.log('🔨 PLAYER_BIDDING_STARTED received:', data);
      console.log('   → Player object:', data?.player);
      console.log('   → Base price:', data?.basePrice);
      // Backend sends { player: {...}, basePrice: number }
      if (!data || !data.player) {
        setCurrentBiddingPlayer(null);
        setCurrentBid(0);
        setLeadingTeam('');
        return;
      }
      if (data.player) {
        console.log('   → Setting current bidding player to:', data.player.name);
        setCurrentBiddingPlayer(data.player);
        setCurrentBid(data.player?.currentBid || data.basePrice || data.player.basePrice || 0);
        setLeadingTeam('');
        setAuctionStatus('LIVE'); // Ensure status is set to LIVE
        
        //Fetch actual bid history to get accurate current bid and leading team
        fetchBidHistoryForCurrentPlayer(data.player.id);
        
        addActivity(`🔨 Bidding started for ${data.player.name}`, 'bid');
        
        // Update players list if player exists
        setPlayers(prev => {
          const exists = prev.some(p => p.id === data.player.id);
          if (exists) {
            return prev.map(p => p.id === data.player.id ? data.player : p);
          } else {
            return [...prev, data.player];
          }
        });
      } else {
        console.error('   ❌ No player object in PLAYER_BIDDING_STARTED event!');
      }
    }));

    // Player updated (live changes from auctioneer)
    unsubscribers.push(socketService.onPlayerUpdated((data: { playerId: string; player: Player }) => {
      console.log('PLAYER_UPDATED received:', data);
      
      // Update in players list
      setPlayers(prev => prev.map(p => p.id === data.playerId ? data.player : p));
      
      // If this player is currently being auctioned, update the bidding player
      setCurrentBiddingPlayer(prev => {
        if (prev && data.playerId === prev.id) {
          return data.player;
        }
        return prev;
      });
    }));

    unsubscribers.push(socketService.onNewBid((data: any) => {
      console.log('💰 NEW_BID received:', data);
      console.log('   → Updating current bid to:', data.amount);
      setCurrentBid(data.amount);
      setLeadingTeam(data.teamId);
      // Use team name from data instead of finding from teams array
      const bidMessage = `📈 ${data.teamName || 'Team'} bid ${formatCurrency(data.amount)}`;
      addActivity(bidMessage, 'bid');
    }));

    unsubscribers.push(socketService.onPlayerSold(async (data: any) => {
      // Use team name from data instead of finding from teams array
      addActivity(`✅ ${data.playerName} sold to ${data.teamName || 'Team'} for ${formatCurrency(data.finalAmount)}`, 'sold');
      
      // Firebase listeners will automatically update players and teams
      // No need to refetch - just clear current bidding player
      setCurrentBiddingPlayer(null);
      setCurrentBid(0);
      setLeadingTeam('');
    }));

    unsubscribers.push(socketService.onPlayerUnsold((data: any) => {
      console.log('🔴 Guest: Player unsold event received:', data);
      addActivity(`❌ ${data.playerName} went unsold`, 'unsold');
      
      // Clear current bidding player - onPlayersUpdate listener will refresh the list
      setCurrentBiddingPlayer(null);
      setCurrentBid(0);
      setLeadingTeam('');
    }));

    return () => {
      // Clean up all socket listeners
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [currentMatch?.id, currentUser.email]);

  // Set up Firebase real-time listeners
  useEffect(() => {
    if (!currentMatch?.id) return;

    console.log('🔥 Guest: Setting up real-time listeners');

    // Listen to players collection
    const playersUnsubscribe = socketService.onPlayersUpdate(currentMatch.id, (updatedPlayers) => {
      console.log('🔥 Guest: Players updated, count:', updatedPlayers.length);
      console.log('🔥 Guest: All player statuses:', updatedPlayers.map(p => `${p.name}: ${p.status}`).join(', '));
      setPlayers(updatedPlayers);

      // Find player with status 'PENDING' or 'LIVE' (currently being auctioned)
      const livePlayer = updatedPlayers.find((p: any) => p.status === 'PENDING' || p.status === 'LIVE');
      if (livePlayer) {
        console.log('🎯 Guest: Found live player:', livePlayer.name, 'status:', livePlayer.status);
        console.log('   → Current bid:', livePlayer.currentBid);
        console.log('   → Base price:', livePlayer.basePrice);
        console.log('   → Leading team:', livePlayer.leadingTeamId);
        setCurrentBiddingPlayer(livePlayer);
        setCurrentBid(livePlayer.currentBid || livePlayer.basePrice || 0);
        if (livePlayer.leadingTeamId) {
          setLeadingTeam(livePlayer.leadingTeamId);
        }
      } else {
        console.log('⚠️ Guest: No LIVE/PENDING player found. Clearing current bidding player.');
        // Only clear if auction is not LIVE, otherwise keep showing last player
        if (auctionStatus !== 'LIVE') {
          setCurrentBiddingPlayer(null);
        }
      }
    });

    // Listen to teams collection
    const teamsUnsubscribe = socketService.onTeamsUpdate(currentMatch.id, (updatedTeams) => {
      // Enrich teams with calculated squadSize from playerIds array
      const teamsWithSquadSize = updatedTeams.map((team: any) => ({
        ...team,
        players: team.playerIds || team.players || [], // Normalize to players array
        squadSize: (team.playerIds?.length || team.players?.length || 0)
      }));
      console.log('🔥 Guest: Teams updated with squadSize:', teamsWithSquadSize.map(t => `${t.name}: ${t.squadSize} players`));
      setTeams(teamsWithSquadSize);
    });

    // Listen to bid events
    const bidUnsubscribe = socketService.onNewBid((bidData) => {
      console.log('🔥 Guest: New bid:', bidData);
      setCurrentBid(bidData.amount);
      addActivity(`${bidData.teamName} bid ₹${(bidData.amount / 100000).toFixed(1)}L`, 'bid');
    });

    return () => {
      playersUnsubscribe();
      teamsUnsubscribe();
      bidUnsubscribe();
    };
  }, [currentMatch?.id]);

  // Add activity to feed
  const addActivity = (message: string, type: 'bid' | 'sold' | 'unsold') => {
    const newActivity = {
      id: Date.now().toString(),
      message,
      timestamp: new Date(),
      type
    };
    setActivityFeed(prev => [...prev, newActivity]);
    
    // Also add as notification
    setNotifications(prev => [...prev, {
      id: Date.now().toString(),
      message,
      time: new Date().toLocaleTimeString(),
      read: false
    }]);
  };

  // Get auction date and time
  const auctionDate = currentMatch?.startDate ? new Date(currentMatch.startDate) : new Date();
  const formattedDate = auctionDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const formattedTime = auctionDate.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  const unreadNotifications = notifications.filter(n => !n.read).length;

  // Firebase listeners provide all real-time data - no need for initial REST API fetch
  // Just set loading to false once component mounts
  useEffect(() => {
    console.log('🔥 Guest: Component mounted, waiting for Firebase listeners to populate data');
    // Give Firebase listeners a moment to populate data
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [currentMatch?.id]);

  // Debug: Monitor currentBiddingPlayer state
  useEffect(() => {
    console.log('🔍 Current Bidding Player State Changed:', currentBiddingPlayer);
    console.log('   → Current Bid:', currentBid);
    console.log('   → Leading Team:', leadingTeam);
    console.log('   → Auction Status:', auctionStatus);
  }, [currentBiddingPlayer, currentBid, leadingTeam, auctionStatus]);

  // Helper functions
  const formatCurrency = (amount: number): string => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    return `₹${amount.toLocaleString()}`;
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Fetch bid history for current player to get actual current bid and leading team
  const fetchBidHistoryForCurrentPlayer = async (playerId: string) => {
    if (!currentMatch?.id || !playerId) return;
    try {
      const API_BASE = 'https://us-central1-axilam.cloudfunctions.net/auction';
      console.log('📋 Fetching bid history for player:', playerId);
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
        
        // Use the latest bid to set actual current bid and leading team
        if (sortedBids.length > 0) {
          const latestBid = sortedBids[0];
          console.log('📍 Restoring current bid from history:', latestBid.amount, 'by', latestBid.teamName);
          setCurrentBid(latestBid.amount);
          setLeadingTeam(latestBid.teamName);
        }
      }
    } catch (error) {
      console.error('Failed to fetch bid history:', error);
    }
  };

  const getPlayerStatusBadge = (player: Player) => {
    if (currentBiddingPlayer?.id === player.id) {
      return <span className="px-2 py-1 bg-red-500 text-white text-xs font-black rounded-full flex items-center gap-1"><Zap size={10} />LIVE</span>;
    }
    switch (player.status) {
      case 'SOLD':
        return <span className="px-2 py-1 bg-green-500 text-white text-xs font-black rounded-full flex items-center gap-1"><CheckCircle size={10} />SOLD</span>;
      case 'UNSOLD':
        return <span className="px-2 py-1 bg-orange-500 text-white text-xs font-black rounded-full flex items-center gap-1"><XCircle size={10} />UNSOLD</span>;
      default:
        return <span className="px-2 py-1 bg-blue-500 text-white text-xs font-black rounded-full">UPCOMING</span>;
    }
  };

  const getTeamStatus = (team: Team) => {
    if ((team.remainingBudget || 0) < 100000) {
      return <span className="text-red-500 font-bold">🔴 Budget Low</span>;
    }
    return <span className="text-green-500 font-bold">🟢 Active</span>;
  };

  // Guard clause - don't render if currentMatch is not available
  if (!currentMatch) {
    return (
      <div className="h-screen bg-gradient-to-br from-white via-blue-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-cyan-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-800 font-bold">Loading auction...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-white via-blue-50 to-orange-50 flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="relative z-40 h-24 bg-white/95 backdrop-blur-md border-b-2 border-cyan-200 shadow-lg flex items-center px-6">
        <div className="w-full flex items-center justify-between">
          {/* Left: Logo + Auction */}
          <div className="flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-xl overflow-hidden border-2 border-cyan-400 shadow-lg hover:scale-105 transition-transform cursor-pointer"
              onClick={() => setStatus(AuctionStatus.HOME)}
            >
              <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 uppercase tracking-wider leading-none">
                {currentMatch?.seasonName || 'Auction'}
              </h1>
              <p className="text-xs text-cyan-600 uppercase tracking-wider font-bold mt-0.5">Guest Spectator</p>
            </div>
          </div>

          {/* Center: Status + Timer */}
          <div className="flex items-center gap-6">
            {/* LIVE Status */}
            <div className={`px-6 py-2 rounded-full font-black uppercase text-sm tracking-wider flex items-center gap-2 ${
              auctionStatus === 'LIVE' 
                ? 'bg-red-100 text-red-600 border-2 border-red-300 animate-pulse' 
                : 'bg-gray-100 text-gray-600 border-2 border-gray-300'
            }`}>
              {auctionStatus === 'LIVE' ? (
                <>
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  LIVE AUCTION
                </>
              ) : (
                <>
                  <Clock size={14} />
                  {auctionStatus === 'READY' ? 'READY' : auctionStatus === 'PAUSED' ? 'PAUSED' : auctionStatus === 'ENDED' ? 'ENDED' : 'NOT STARTED'}
                </>
              )}
            </div>

            {/* Auctioneer Mic Indicator */}
            {auctioneerMicOn && (
              <div className="px-4 py-2 bg-green-100 border-2 border-green-300 rounded-full flex items-center gap-2 animate-pulse">
                <Mic size={16} className="text-green-600" />
                <span className="text-xs font-black text-green-700 uppercase tracking-wider">Auctioneer Speaking</span>
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                }}
                className="relative p-2 rounded-lg bg-white border-2 border-cyan-300 text-cyan-600 hover:bg-cyan-50 transition-all"
              >
                <Bell size={18} />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {unreadNotifications}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-14 w-96 bg-white rounded-2xl border-2 border-cyan-200 shadow-2xl z-[999] max-h-96 overflow-y-auto">
                  <div className="bg-gradient-to-r from-cyan-100 to-blue-100 px-6 py-4 border-b-2 border-cyan-200 flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-800 uppercase">Notifications</h3>
                    <button onClick={() => setShowNotifications(false)}>
                      <X size={18} />
                    </button>
                  </div>
                  
                  {/* Auction Info */}
                  <div className="p-4 bg-blue-50 border-b-2 border-blue-200">
                    <div className="flex items-center gap-3 mb-3">
                      <Calendar size={16} className="text-blue-600" />
                      <div>
                        <p className="text-xs text-gray-600 uppercase tracking-wider font-bold">Auction Date</p>
                        <p className="text-slate-800 font-bold">{formattedDate}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                      <Clock size={16} className="text-blue-600" />
                      <div>
                        <p className="text-xs text-gray-600 uppercase tracking-wider font-bold">Start Time</p>
                        <p className="text-slate-800 font-bold">{formattedTime}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Timer size={16} className="text-cyan-600" />
                      <div>
                        <p className="text-xs text-gray-600 uppercase tracking-wider font-bold">Time Remaining</p>
                        <p className="text-cyan-600 font-mono font-black">{formatTime(countdown)}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    {notifications.length === 0 ? (
                      <div className="px-6 py-8 text-center">
                        <Bell size={32} className="mx-auto mb-3 text-gray-300" />
                        <p className="text-gray-400 text-sm">No notifications</p>
                      </div>
                    ) : (
                      notifications.map(notif => (
                        <div key={notif.id} className={`px-6 py-4 border-b hover:bg-cyan-50 ${!notif.read ? 'bg-cyan-50' : ''}`}>
                          <p className="text-sm text-slate-800 font-semibold">{notif.message}</p>
                          <p className="text-xs text-gray-500 mt-1">{notif.time}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Live Room Button */}
            <button
              onClick={() => setActiveSection('liveRoom')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-all shadow-lg"
            >
              <Radio size={16} />
              Live Room
            </button>

            {/* Go Back Button */}
            <button
              onClick={() => setStatus(AuctionStatus.MARKETPLACE)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-700 hover:bg-gray-800 text-white font-bold text-sm transition-all shadow-lg"
            >
              <ArrowLeft size={16} />
              Go Back
            </button>
          </div>
        </div>
      </div>
      {/* Main Content - Four Quadrant Layout */}
      {activeSection === 'dashboard' ? (
        <main className="flex-1 p-4 overflow-hidden">
          <div className="h-full grid grid-cols-12 grid-rows-12 gap-4">
          {/* Top Left: Players List (All Players) */}
          <div className="col-span-3 row-span-12 bg-white/90 backdrop-blur-lg rounded-2xl border-2 border-cyan-200 overflow-hidden flex flex-col shadow-xl">
            <div className="bg-gradient-to-r from-cyan-100 to-blue-100 border-b-2 border-cyan-200 p-4">
              <h2 className="text-lg font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Users size={20} className="text-cyan-600" />
                All Players ({players.length})
              </h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader className="w-8 h-8 text-cyan-600 animate-spin" />
                </div>
              ) : players.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                  <Users size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="font-bold">No players yet</p>
                </div>
              ) : (() => {
                const sorted = [...players].sort((a, b) => {
                  if (a.status === 'UNSOLD' && b.status !== 'UNSOLD') return 1;
                  if (a.status !== 'UNSOLD' && b.status === 'UNSOLD') return -1;
                  return 0;
                });
                const unsoldCount = sorted.filter(p => p.status === 'UNSOLD').length;
                const regularCount = sorted.length - unsoldCount;
                console.log('📊 Player list sorting:', {
                  total: sorted.length,
                  unsoldCount,
                  regularCount,
                  unsoldPlayers: sorted.filter(p => p.status === 'UNSOLD').map(p => p.name)
                });
                return sorted.map((player, index) => (
                  <React.Fragment key={player.id}>
                    {index === regularCount && unsoldCount > 0 && (
                      <div className="py-2 px-2 flex items-center gap-2 text-xs font-bold text-orange-600">
                        <div className="flex-1 h-px bg-orange-200"></div>
                        <span>Re-Auction</span>
                        <div className="flex-1 h-px bg-orange-200"></div>
                      </div>
                    )}
                    <div 
                      className={`bg-white hover:bg-blue-50 rounded-xl p-3 border-2 transition-all cursor-pointer ${
                        currentBiddingPlayer?.id === player.id 
                          ? 'border-red-400 bg-red-50' 
                          : player.status === 'UNSOLD' ? 'border-orange-300 hover:bg-orange-50' : 'border-cyan-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-200 flex items-center justify-center flex-shrink-0 border-2 border-cyan-200">
                          {player.imageUrl ? (
                            <img src={player.imageUrl} alt={player.name} className="w-full h-full object-cover" />
                          ) : (
                            <User size={20} className="text-gray-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-slate-800 font-bold text-sm truncate">{player.name}</p>
                          <p className="text-cyan-600 text-xs uppercase tracking-wider">{player.roleId || 'Player'}</p>
                          <p className="text-gray-600 text-xs mt-1">Base: {formatCurrency(player.basePrice || 0)}</p>
                        </div>
                        <div className="flex-shrink-0">
                          {getPlayerStatusBadge(player)}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                ))
              })()}
            </div>
          </div>

          {/* Top Right: Live Auction Room (Current Player + Bids) */}
          <div className="col-span-6 row-span-12 bg-white/90 backdrop-blur-lg rounded-2xl border-2 border-cyan-200 overflow-hidden flex flex-col shadow-xl">
            <div className="bg-gradient-to-r from-red-100 to-orange-100 border-b-2 border-red-200 p-4">
              <h2 className="text-lg font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Zap size={20} className="text-red-600" />
                Live Auction
              </h2>
            </div>
            
            <div className="flex-1 p-4 flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50 overflow-hidden">
              {currentBiddingPlayer ? (
                <div className="text-center w-full max-w-sm">
                  {/* Player Image */}
                  <div className="h-[260px] min-h-[260px] flex items-center justify-center bg-slate-200 rounded-2xl border-3 border-white shadow-lg mb-3 mx-auto">
                    {currentBiddingPlayer.imageUrl ? (
                      <img src={currentBiddingPlayer.imageUrl} alt={currentBiddingPlayer.name} className="max-h-full max-w-full object-contain rounded-xl" />
                    ) : (
                      <User size={60} className="text-gray-500" />
                    )}
                  </div>

                  {/* Player Info */}
                  <h3 className="text-3xl font-black text-slate-800 mb-1 uppercase leading-tight">{currentBiddingPlayer.name}</h3>
                  <p className="text-cyan-600 text-xs uppercase tracking-wider font-bold mb-3">{currentBiddingPlayer.roleId || 'Player'}</p>

                  {/* Current Bid */}
                  <div className="bg-white border-3 border-red-400 rounded-xl p-4 mb-2 shadow-lg w-full max-w-sm">
                    <p className="text-xs text-gray-600 uppercase tracking-wider font-bold mb-1">Current Bid</p>
                    <p className="text-5xl font-black text-slate-800 mb-2">{formatCurrency(currentBid || currentBiddingPlayer.basePrice || 0)}</p>
                    {leadingTeam && (
                      <p className="text-cyan-600 text-sm font-bold">Leading: {teams.find(t => t.id === leadingTeam)?.name || leadingTeam}</p>
                    )}
                  </div>

                  {/* Base Price */}
                  <p className="text-gray-600 text-xs">Base: {formatCurrency(currentBiddingPlayer.basePrice || 0)}</p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-white border-3 border-cyan-200 flex items-center justify-center shadow-lg">
                    {auctionStatus === 'LIVE' ? (
                      <Radio size={40} className="text-orange-500 animate-pulse" />
                    ) : auctionStatus === 'PAUSED' ? (
                      <Clock size={40} className="text-yellow-500" />
                    ) : auctionStatus === 'ENDED' ? (
                      <Trophy size={40} className="text-green-500" />
                    ) : (
                      <Zap size={40} className="text-gray-400" />
                    )}
                  </div>
                  <p className="text-lg font-black text-gray-600 mb-1">
                    {auctionStatus === 'LIVE' ? 'Auction is Live!' : 
                     auctionStatus === 'PAUSED' ? 'Auction Paused' :
                     auctionStatus === 'ENDED' ? 'Auction Ended' : 
                     'No Active Bidding'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {auctionStatus === 'LIVE' ? 'Waiting for next player...' :
                     auctionStatus === 'PAUSED' ? 'Auction is paused by the auctioneer' :
                     auctionStatus === 'ENDED' ? 'All players have been auctioned' :
                     'Waiting for auction to start'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Far Right: Teams Panel */}
          <div className="col-span-3 row-span-12 bg-white/90 backdrop-blur-lg rounded-2xl border-2 border-cyan-200 overflow-hidden flex flex-col shadow-xl">
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 border-b-2 border-purple-200 p-4">
              <h2 className="text-lg font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Shield size={20} className="text-purple-600" />
                Teams ({teams.length})
              </h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader className="w-8 h-8 text-purple-600 animate-spin" />
                </div>
              ) : teams.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                  <Shield size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="font-bold">No teams yet</p>
                </div>
              ) : (
                teams.map((team) => (
                  <div 
                    key={team.id}
                    className="bg-white hover:bg-purple-50 rounded-xl p-4 border-2 border-purple-100 transition-all shadow-md hover:shadow-lg"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-md overflow-hidden">
                        {team.logo ? (
                          <img src={team.logo} alt={team.name} className="w-full h-full object-cover" />
                        ) : (
                          <Shield size={24} className="text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-800 font-black text-sm truncate">{team.name}</p>
                        <p className="text-xs">{getTeamStatus(team)}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
                        <p className="text-gray-600 uppercase tracking-wider font-bold mb-1">Budget Left</p>
                        <p className="text-cyan-600 font-black">{formatCurrency(team.remainingBudget || 0)}</p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
                        <p className="text-gray-600 uppercase tracking-wider font-bold mb-1">Players</p>
                        <p className="text-slate-800 font-black">{team.players?.length || 0}/{team.maxPlayers || 11}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        </main>
      ) : (
        /* Live Room Full Screen */
        <div className="fixed inset-0 z-40 bg-black">
          <LiveAuctionPage
            seasonId={currentMatch?.id || ''}
            userId={currentUser.email}
            userRole={UserRole.GUEST}
            onClose={() => setActiveSection('dashboard')}
          />
        </div>
      )}
    </div>
  );
};
