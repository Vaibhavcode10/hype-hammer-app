import React, { useState, useEffect } from 'react';
import { 
  Eye, Trophy, Users, DollarSign, Bell, User, LogOut, Clock, 
  Zap, Radio, Shield, Timer,
  CheckCircle, XCircle, Loader, Mic, 
  Calendar, MapPin, Mail, ChevronDown, X
} from 'lucide-react';
import { AuctionStatus, MatchData, UserRole, Team, Player } from '../../types';
import { LiveAuctionPage } from './LiveAuctionPage';
import { PlayersPage } from './PlayersPage';
import { useAudioListener } from '../../services/useAudioListener';
import socketService from '../../services/socketService';

interface GuestDashboardPageProps {
  setStatus: (status: AuctionStatus) => void;
  currentMatch: MatchData;
  currentUser: { name: string; email: string; role: UserRole };
}

export const GuestDashboardPage: React.FC<GuestDashboardPageProps> = ({ setStatus, currentMatch, currentUser }) => {
  const [activeSection, setActiveSection] = useState<'dashboard' | 'liveRoom'>('dashboard');
  const [showPlayersPage, setShowPlayersPage] = useState(false);
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
  const [showProfile, setShowProfile] = useState(false);
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

    const socket = socketService.getSocket();
    
    if (!socket) {
      console.error('Socket not available');
      return;
    }

    console.log('✅ Guest setting up socket listeners for season:', currentMatch.id);

    // Listen for timer updates from backend
    socket.on('AUCTION_TIMER_UPDATE', (data: any) => {
      setCountdown(data.remainingSeconds);
    });

    // Listen for auction state updates
    socket.on('AUCTION_STATE_UPDATE', (data: any) => {
      console.log('📡 AUCTION_STATE_UPDATE received:', data);
      if (data.status) {
        console.log('   → Setting auction status to:', data.status);
        setAuctionStatus(data.status);
      }
      if (data.remainingSeconds !== undefined) {
        setCountdown(data.remainingSeconds);
      }
      // If there's a current player being auctioned, set it
      if (data.currentPlayerId && data.biddingActive) {
        console.log('   → Looking for player:', data.currentPlayerId);
        const player = players.find(p => p.id === data.currentPlayerId);
        
        if (player) {
          console.log('   → Setting current bidding player:', player.name);
          setCurrentBiddingPlayer(player);
          setCurrentBid(data.currentBid || player.basePrice || 0);
          setLeadingTeam(data.leadingTeamId || '');
        } else {
          console.error('   ✗ Player not found:', data.currentPlayerId);
        }
      } else if (!data.biddingActive) {
        console.log('   → No active bidding, clearing current player');
        setCurrentBiddingPlayer(null);
        setCurrentBid(0);
        setLeadingTeam('');
      }
    });

    // Listen for auctioneer mic events
    socket.on('AUCTIONEER_MIC_ON', () => {
      setAuctioneerMicOn(true);
    });

    socket.on('AUCTIONEER_MIC_OFF', () => {
      setAuctioneerMicOn(false);
    });

    // Auction state updates
    socket.on('AUCTION_STARTED', (data: any) => {
      console.log('🚀 AUCTION_STARTED received:', data);
      setAuctionStatus('LIVE');
      addActivity('🚀 Auction has started!', 'bid');
    });

    socket.on('AUCTION_PAUSED', (data: any) => {
      console.log('⏸️ AUCTION_PAUSED received:', data);
      setAuctionStatus('PAUSED');
      addActivity('⏸️ Auction paused', 'bid');
    });

    socket.on('AUCTION_RESUMED', (data: any) => {
      console.log('▶️ AUCTION_RESUMED received:', data);
      setAuctionStatus('LIVE');
      addActivity('▶️ Auction resumed', 'bid');
    });

    socket.on('AUCTION_ENDED', (data: any) => {
      console.log('🏁 AUCTION_ENDED received:', data);
      setAuctionStatus('ENDED');
      addActivity('🏁 Auction has ended', 'bid');
    });

    // Listen for bidding events
    socket.on('PLAYER_BIDDING_STARTED', (data: any) => {
      console.log('🔨 PLAYER_BIDDING_STARTED received:', data);
      console.log('   → Player object:', data.player);
      console.log('   → Base price:', data.basePrice);
      // Backend sends { player: {...}, basePrice: number }
      if (data.player) {
        console.log('   → Setting current bidding player to:', data.player.name);
        setCurrentBiddingPlayer(data.player);
        setCurrentBid(data.basePrice || data.player.basePrice || 0);
        setLeadingTeam('');
        setAuctionStatus('LIVE'); // Ensure status is set to LIVE
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
    });

    // Player updated (live changes from auctioneer)
    socket.on('PLAYER_UPDATED', (data: { playerId: string; player: Player }) => {
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
    });

    socket.on('NEW_BID', (data: any) => {
      console.log('💰 NEW_BID received:', data);
      console.log('   → Updating current bid to:', data.amount);
      setCurrentBid(data.amount);
      setLeadingTeam(data.teamId);
      // Use team name from data instead of finding from teams array
      const bidMessage = `📈 ${data.teamName || 'Team'} bid ${formatCurrency(data.amount)}`;
      addActivity(bidMessage, 'bid');
    });

    socket.on('PLAYER_SOLD', async (data: any) => {
      // Use team name from data instead of finding from teams array
      addActivity(`✅ ${data.playerName} sold to ${data.teamName || 'Team'} for ${formatCurrency(data.finalAmount)}`, 'sold');
      
      // Refetch player and team data to get live updates
      try {
        const playersResponse = await fetch(`http://localhost:5000/api/players?matchId=${currentMatch.id}`);
        if (playersResponse.ok) {
          const playersData = await playersResponse.json();
          setPlayers(playersData.data || []);
        }
        
        const teamsResponse = await fetch(`http://localhost:5000/api/teams?matchId=${currentMatch.id}`);
        if (teamsResponse.ok) {
          const teamsData = await teamsResponse.json();
          setTeams(teamsData.data || []);
        }
      } catch (error) {
        console.error('Failed to refetch data:', error);
      }
      
      setCurrentBiddingPlayer(null);
      setCurrentBid(0);
      setLeadingTeam('');
    });

    socket.on('PLAYER_UNSOLD', async (data: any) => {
      addActivity(`❌ ${data.playerName} went unsold`, 'unsold');
      
      // Refetch player data to get live updates
      try {
        const playersResponse = await fetch(`http://localhost:5000/api/players?matchId=${currentMatch.id}`);
        if (playersResponse.ok) {
          const playersData = await playersResponse.json();
          setPlayers(playersData.data || []);
        }
      } catch (error) {
        console.error('Failed to refetch data:', error);
      }
      
      setCurrentBiddingPlayer(null);
      setCurrentBid(0);
      setLeadingTeam('');
    });

    return () => {
      if (currentMatch?.id) {
        socketService.leaveSeason(currentMatch.id);
      }
      // Clean up all socket listeners
      socket.off('AUCTION_TIMER_UPDATE');
      socket.off('AUCTION_STATE_UPDATE');
      socket.off('AUCTIONEER_MIC_ON');
      socket.off('AUCTIONEER_MIC_OFF');
      socket.off('AUCTION_STARTED');
      socket.off('AUCTION_PAUSED');
      socket.off('AUCTION_RESUMED');
      socket.off('AUCTION_ENDED');
      socket.off('PLAYER_BIDDING_STARTED');
      socket.off('PLAYER_UPDATED');
      socket.off('NEW_BID');
      socket.off('PLAYER_SOLD');
      socket.off('PLAYER_UNSOLD');
    };
  }, [currentMatch?.id, currentUser.email, players]);

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

  // Fetch real data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch teams for this match
        const teamsResponse = await fetch(`http://localhost:5000/api/teams?matchId=${currentMatch.id}`);
        const teamsData = teamsResponse.ok ? await teamsResponse.json() : { data: [] };
        setTeams(teamsData.data || []);
        
        // Fetch players for this match
        const playersResponse = await fetch(`http://localhost:5000/api/players?matchId=${currentMatch.id}`);
        const playersData = playersResponse.ok ? await playersResponse.json() : { data: [] };
        const fetchedPlayers = playersData.data || [];
        setPlayers(fetchedPlayers);

        // Fetch auction state with timer from backend
        const auctionStateResponse = await fetch(`http://localhost:5000/api/auction/state/${currentMatch.id}`);
        if (auctionStateResponse.ok) {
          const auctionStateData = await auctionStateResponse.json();
          const state = auctionStateData.data;
          
          if (state) {
            console.log('📊 Initial auction state:', state);
            
            // Set timer countdown
            if (state.endTime) {
              const endTime = new Date(state.endTime).getTime();
              const now = Date.now();
              const remainingSeconds = Math.max(0, Math.floor((endTime - now) / 1000));
              setCountdown(remainingSeconds);
            }
            
            // Set auction status
            if (state.status) {
              console.log('   → Setting auction status to:', state.status);
              setAuctionStatus(state.status);
            }
            
            // Set current bidding player if active
            if (state.currentPlayerId && state.biddingActive) {
              const player = fetchedPlayers.find((p: Player) => p.id === state.currentPlayerId);
              if (player) {
                console.log('🎯 Setting initial current bidding player:', player.name);
                console.log('   → Current bid:', state.currentBid);
                console.log('   → Leading team:', state.leadingTeamId);
                setCurrentBiddingPlayer(player);
                setCurrentBid(state.currentBid || player.basePrice || 0);
                setLeadingTeam(state.leadingTeamId || '');
              } else {
                console.log('⚠️ Player not found in players list:', state.currentPlayerId);
              }
            } else {
              console.log('   → No active bidding (biddingActive:', state.biddingActive, ')');
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch auction data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (currentMatch?.id) {
      fetchData();
    }
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

  const getPlayerStatusBadge = (player: Player) => {
    if (currentBiddingPlayer?.id === player.id) {
      return <span className="px-2 py-1 bg-red-500 text-white text-xs font-black rounded-full flex items-center gap-1"><Zap size={10} />LIVE</span>;
    }
    switch (player.status) {
      case 'SOLD':
        return <span className="px-2 py-1 bg-green-500 text-white text-xs font-black rounded-full flex items-center gap-1"><CheckCircle size={10} />SOLD</span>;
      case 'UNSOLD':
        return <span className="px-2 py-1 bg-gray-500 text-white text-xs font-black rounded-full flex items-center gap-1"><XCircle size={10} />UNSOLD</span>;
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
                  setShowProfile(false);
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

            {/* Players Button */}
            <button
              onClick={() => setShowPlayersPage(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-bold text-sm transition-all shadow-lg"
            >
              <Users size={16} />
              Players
            </button>

            {/* Live Room Toggle */}
            <button
              onClick={() => setActiveSection(activeSection === 'dashboard' ? 'liveRoom' : 'dashboard')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white font-bold text-sm transition-all shadow-lg"
            >
              <Radio size={16} />
              {activeSection === 'dashboard' ? 'Live Room' : 'Dashboard'}
            </button>
            
            {/* Profile */}
            <button
              onClick={() => {
                setShowProfile(!showProfile);
                setShowNotifications(false);
              }}
              className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white border-2 border-cyan-200 hover:border-cyan-300 transition-all"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                {currentUser.name?.[0] || 'G'}
              </div>
              <ChevronDown size={16} />
            </button>

            {showProfile && (
              <div className="absolute right-6 top-20 w-80 bg-white rounded-2xl border-2 border-cyan-200 shadow-2xl z-[999]">
                <div className="p-6">
                  <div className="flex flex-col items-center mb-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center text-white font-black text-3xl border-4 border-white shadow-lg mb-3">
                      {currentUser.name?.[0] || 'G'}
                    </div>
                    <h3 className="text-lg font-black text-slate-800">{currentUser.name}</h3>
                    <span className="mt-2 px-3 py-1 rounded-full bg-cyan-100 border border-cyan-300 text-xs font-bold text-cyan-700">
                      GUEST SPECTATOR
                    </span>
                  </div>
                  <div className="space-y-3 mb-6">
                    <div className="flex items-start gap-3">
                      <Mail size={16} className="text-cyan-600 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-600 uppercase font-bold">Email</p>
                        <p className="text-sm text-slate-800 font-semibold">{currentUser.email}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Eye size={16} className="text-cyan-600 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-600 uppercase font-bold">Access</p>
                        <p className="text-sm text-slate-800 font-semibold">Read-Only Observer</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setStatus(AuctionStatus.HOME)}
                    className="w-full px-4 py-3 bg-red-100 hover:bg-red-500 border-2 border-red-300 hover:border-red-500 text-red-600 hover:text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              </div>
            )}
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
              ) : (
                players.map((player) => (
                  <div 
                    key={player.id}
                    className={`bg-white hover:bg-blue-50 rounded-xl p-3 border-2 transition-all cursor-pointer ${
                      currentBiddingPlayer?.id === player.id 
                        ? 'border-red-400 bg-red-50' 
                        : 'border-cyan-100'
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
                ))
              )}
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
