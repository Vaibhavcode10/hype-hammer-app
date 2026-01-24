import React, { useState, useEffect } from 'react';
import { DollarSign, Users, Trophy, TrendingDown, Bell, User, LogOut, Shield, Activity, Clock, Radio, AlertCircle, CheckCircle, XCircle, ChevronDown, X, Calendar, Mail, Award, TrendingUp, Filter, Search, Eye } from 'lucide-react';
import { AuctionStatus, MatchData, UserRole, Team, Player } from '../../types';
import { LiveAuctionPage } from './LiveAuctionPage';
import { socketService } from '../../services/socketService';

const formatCurrency = (num: number): string => {
  return num.toLocaleString('en-IN', { maximumFractionDigits: 0 });
};

interface TeamRepDashboardPageProps {
  setStatus: (status: AuctionStatus) => void;
  currentMatch: MatchData;
  currentUser: { name: string; email: string; role: UserRole; teamName?: string };
}

export const TeamRepDashboardPage: React.FC<TeamRepDashboardPageProps> = ({ setStatus, currentMatch, currentUser }) => {
  const [activeSection, setActiveSection] = useState<'dashboard' | 'liveRoom'>('dashboard');
  const [teamData, setTeamData] = useState<Team | null>(null);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Live auction state
  const [currentBiddingPlayer, setCurrentBiddingPlayer] = useState<Player | null>(null);
  const [currentBid, setCurrentBid] = useState<number>(0);
  const [leadingTeam, setLeadingTeam] = useState<Team | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [auctionStatus, setAuctionStatus] = useState<'upcoming' | 'live' | 'paused' | 'completed'>('upcoming');
  
  // Bidding state (view-only mode - no team bidding allowed)
  const [isLeadingBid, setIsLeadingBid] = useState(false);
  
  // Activity feed
  const [activityFeed, setActivityFeed] = useState<Array<{ id: string; message: string; time: string; type: 'my-bid' | 'other-bid' | 'sold' | 'system' }>>([]);
  
  // Team history
  const [myBids, setMyBids] = useState<Array<{ playerId: string; playerName: string; amount: number; time: string; won: boolean }>>([]);
  
  // UI state
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showPlayerList, setShowPlayerList] = useState(false);
  const [playerFilter, setPlayerFilter] = useState<'all' | 'upcoming' | 'sold'>('all');
  const [notifications, setNotifications] = useState<Array<{ id: string; message: string; time: string; read: boolean }>>([]);

  const userId = currentUser.email;
  const seasonId = currentMatch?.id || '';
  const teamId = teamData?.id || '';

  // Initialize socket connection
  useEffect(() => {
    if (seasonId && userId) {
      socketService.connect();
    }
  }, [seasonId, userId]);

  // View-only mode - teams watch auction, auctioneer controls all bidding
  useEffect(() => {
    if (auctionStatus === 'live') {
      // Real-time bidding updates (view-only)
    }
  }, [auctionStatus]);

  // Fetch team data and players
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch team data for this match - match by user's email
        const teamResponse = await fetch(`http://localhost:5000/api/teams?matchId=${currentMatch.id}`);
        if (teamResponse.ok) {
          const teamDataResponse = await teamResponse.json();
          // Find team where the owner's email matches current user's email
          const team = teamDataResponse.data?.find((t: Team) => t.email === currentUser.email);
          if (team) {
            setTeamData(team);
          }
        }
        
        // Fetch all players
        const playersResponse = await fetch(`http://localhost:5000/api/players?matchId=${currentMatch.id}`);
        if (playersResponse.ok) {
          const playersData = await playersResponse.json();
          setAllPlayers(playersData.data || []);
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
    if (!seasonId || !userId || !teamId) return;

    // Connect to server
    socketService.connect('http://localhost:5000');

    // Join season room
    socketService.joinSeason(seasonId, userId, UserRole.TEAM_REP);

    const socket = socketService.getSocket();
    
    if (!socket) {
      console.error('Socket not available');
      return;
    }

    // Listen for auction state updates (includes current player if auction is in progress)
    socket.on('AUCTION_STATE_UPDATE', (data: any) => {
      console.log('AUCTION_STATE_UPDATE received:', data);
      // If there's a current player being auctioned, set it
      if (data.currentPlayerId && data.biddingActive) {
        const player = allPlayers.find(p => p.id === data.currentPlayerId);
        if (player) {
          setCurrentBiddingPlayer(player);
          setCurrentBid(data.currentBid || player.basePrice || 0);
          setLeadingTeam(data.leadingTeamId || null);
          setIsLeadingBid(data.leadingTeamId === teamId);
          setAuctionStatus('live');
        }
      } else if (!data.biddingActive) {
        setCurrentBiddingPlayer(null);
        setCurrentBid(0);
        setLeadingTeam(null);
        setIsLeadingBid(false);
      }
    });

    // Auction state updates
    socket.on('AUCTION_STARTED', () => {
      setAuctionStatus('live');
      setActivityFeed(prev => [{
        id: Date.now().toString(),
        message: '🚀 Auction has started!',
        time: new Date().toLocaleTimeString(),
        type: 'system'
      }, ...prev]);
    });

    socket.on('AUCTION_PAUSED', () => {
      setAuctionStatus('paused');
      setActivityFeed(prev => [{
        id: Date.now().toString(),
        message: '⏸️ Auction paused',
        time: new Date().toLocaleTimeString(),
        type: 'system'
      }, ...prev]);
    });

    socket.on('AUCTION_RESUMED', () => {
      setAuctionStatus('live');
      setActivityFeed(prev => [{
        id: Date.now().toString(),
        message: '▶️ Auction resumed',
        time: new Date().toLocaleTimeString(),
        type: 'system'
      }, ...prev]);
    });

    // Real-time bidding updates (view-only)

    // Player bidding started
    socket.on('PLAYER_BIDDING_STARTED', (data: { player: Player; basePrice: number }) => {
      console.log('PLAYER_BIDDING_STARTED received:', data);
      setCurrentBiddingPlayer(data.player);
      setCurrentBid(data.basePrice || data.player.basePrice);
      setLeadingTeam(null);
      setIsLeadingBid(false);
      setAuctionStatus('live');
      
      setActivityFeed(prev => [{
        id: Date.now().toString(),
        message: `${data.player.name} is now being auctioned - Base: ₹${((data.basePrice || data.player.basePrice) / 100000).toFixed(1)}L`,
        time: new Date().toLocaleTimeString(),
        type: 'system'
      }, ...prev]);
    });

    // New bid
    socket.on('NEW_BID', (data: { playerId: string; amount: number; teamId: string; teamName: string }) => {
      setCurrentBid(data.amount);
      
      const isMyBid = data.teamId === teamId;
      setIsLeadingBid(isMyBid);
      
      if (isMyBid) {
        setActivityFeed(prev => [{
          id: Date.now().toString(),
          message: `You bid ₹${(data.amount / 100000).toFixed(1)}L`,
          time: new Date().toLocaleTimeString(),
          type: 'my-bid'
        }, ...prev]);
        
        setNotifications(prev => [{
          id: Date.now().toString(),
          message: `You are now leading with ₹${(data.amount / 100000).toFixed(1)}L`,
          time: new Date().toLocaleTimeString(),
          read: false
        }, ...prev]);
      } else {
        setActivityFeed(prev => [{
          id: Date.now().toString(),
          message: `${data.teamName} bid ₹${(data.amount / 100000).toFixed(1)}L`,
          time: new Date().toLocaleTimeString(),
          type: 'other-bid'
        }, ...prev]);
        
        if (isLeadingBid) {
          setNotifications(prev => [{
            id: Date.now().toString(),
            message: `You were outbid by ${data.teamName}!`,
            time: new Date().toLocaleTimeString(),
            read: false
          }, ...prev]);
        }
      }
    });

    // Player sold
    socket.on('PLAYER_SOLD', (data: { player: Player; team: Team; finalPrice: number }) => {
      const wonPlayer = data.team.id === teamId;
      
      const soldMessage = wonPlayer
        ? `🎉 You won ${data.player.name} for ₹${(data.finalPrice / 100000).toFixed(1)}L!`
        : `${data.player.name} sold to ${data.team.name} for ₹${(data.finalPrice / 100000).toFixed(1)}L`;
      
      setActivityFeed(prev => [{
        id: Date.now().toString(),
        message: soldMessage,
        time: new Date().toLocaleTimeString(),
        type: 'sold'
      }, ...prev]);
      
      setNotifications(prev => [{
        id: Date.now().toString(),
        message: soldMessage,
        time: new Date().toLocaleTimeString(),
        read: false
      }, ...prev]);
      
      if (wonPlayer) {
        setMyBids(prev => [{
          playerId: data.player.id,
          playerName: data.player.name,
          amount: data.finalPrice,
          time: new Date().toLocaleTimeString(),
          won: true
        }, ...prev]);
        
        // Update team data
        if (teamData) {
          setTeamData({
            ...teamData,
            budget: teamData.budget - data.finalPrice,
            playerIds: [...(teamData.playerIds || []), data.player.id]
          });
        }
      }
      
      setCurrentBiddingPlayer(null);
      setCurrentBid(0);
      setLeadingTeam(null);
      setIsLeadingBid(false);
    });

    // Player unsold
    socket.on('PLAYER_UNSOLD', (data: { player: Player }) => {
      setActivityFeed(prev => [{
        id: Date.now().toString(),
        message: `${data.player.name} went UNSOLD`,
        time: new Date().toLocaleTimeString(),
        type: 'system'
      }, ...prev]);
      
      setCurrentBiddingPlayer(null);
      setCurrentBid(0);
      setLeadingTeam(null);
      setIsLeadingBid(false);
    });

    // Timer update
    socket.on('TIMER_UPDATE', (data: { timeLeft: number }) => {
      setCountdown(data.timeLeft);
    });

    // Auction status
    socket.on('AUCTION_STARTED', () => {
      setAuctionStatus('live');
    });

    socket.on('AUCTION_PAUSED', () => {
      setAuctionStatus('paused');
    });

    socket.on('AUCTION_COMPLETED', () => {
      setAuctionStatus('completed');
    });

    // Team data updated (budget/players changed)
    socket.on('TEAM_UPDATED', (data: { team: Team }) => {
      if (data.team.id === teamId) {
        setTeamData(data.team);
      }
    });

    return () => {
      // Cleanup event listeners
      socket.off('PLAYER_BIDDING_STARTED');
      socket.off('NEW_BID');
      socket.off('PLAYER_SOLD');
      socket.off('PLAYER_UNSOLD');
      socket.off('TIMER_UPDATE');
      socket.off('AUCTION_STARTED');
      socket.off('AUCTION_PAUSED');
      socket.off('AUCTION_COMPLETED');
      socket.off('TEAM_UPDATED');
      socket.off('AUCTION_STATE_UPDATE');
      socket.off('AUCTION_RESUMED');
    };
  }, [seasonId, userId, teamId, allPlayers]);

  // VIEW-ONLY MODE: Team dashboard is now watch-only
  // All bidding is controlled by auctioneer on their dashboard
  // Teams can only observe bids and track their budget

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
      case 'paused':
        return <span className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 border-2 border-orange-300 text-orange-700 font-bold text-sm">
          <AlertCircle size={16} />
          Paused
        </span>;
      case 'completed':
        return <span className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 border-2 border-blue-300 text-blue-700 font-bold text-sm">
          <CheckCircle size={16} />
          Completed
        </span>;
    }
  };

  const getBudgetPercentage = () => {
    if (!teamData) return 0;
    return ((teamData.budget / (teamData.initialBudget || teamData.budget)) * 100);
  };

  const getBudgetColor = () => {
    const percentage = getBudgetPercentage();
    if (percentage < 20) return 'bg-red-500';
    if (percentage < 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getFilteredPlayers = () => {
    switch (playerFilter) {
      case 'upcoming':
        return allPlayers.filter(p => p.status === 'PENDING');
      case 'sold':
        return allPlayers.filter(p => p.status === 'SOLD');
      default:
        return allPlayers;
    }
  };

  if (activeSection === 'liveRoom') {
    return (
      <div className="fixed inset-0 z-50">
        <LiveAuctionPage
          seasonId={seasonId}
          userId={userId}
          userRole={UserRole.TEAM_REP}
          onClose={() => setActiveSection('dashboard')}
        />
      </div>
    );
  }

  return (
    <>
    <div className="h-screen bg-gradient-to-br from-white via-blue-50 to-purple-50 flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="h-24 bg-white/95 backdrop-blur-md border-b-2 border-purple-200 shadow-lg flex items-center px-6">
        <div className="w-full flex items-center justify-between">
          {/* Left: Logo + Team */}
          <div className="flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-xl overflow-hidden border-2 border-purple-300 shadow-lg hover:scale-105 transition-transform cursor-pointer"
              onClick={() => setStatus(AuctionStatus.HOME)}
            >
              <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 uppercase tracking-wider leading-none">
                {currentMatch?.name || 'Auction Dashboard'}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                {teamData?.logo ? (
                  <img src={teamData.logo} alt={teamData.name} className="w-4 h-4 object-cover rounded" />
                ) : (
                  <Shield size={12} className="text-purple-600" />
                )}
                <p className="text-xs text-purple-600 font-bold">{teamData?.name || 'My Team'}</p>
              </div>
            </div>
          </div>

          {/* Center: Status + Countdown */}
          <div className="flex items-center gap-6">
            {getAuctionStatusBadge()}
            
            {countdown > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border-2 border-purple-300 shadow-md">
                <Clock size={16} className="text-purple-600" />
                <span className="font-mono font-bold text-slate-800 text-sm">{countdown}s</span>
              </div>
            )}
            
            {/* VIEW-ONLY MODE - Watch the auction */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 border-2 border-blue-300 shadow-md">
              <Eye size={16} className="text-blue-600" />
              <span className="text-sm font-bold text-blue-700">Observer Mode</span>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg bg-white border-2 border-purple-300 text-purple-600 hover:bg-purple-50 transition-all"
              >
                <Bell size={18} />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-14 w-96 bg-white rounded-2xl border-2 border-purple-200 shadow-2xl z-50 max-h-96 overflow-y-auto">
                  <div className="bg-gradient-to-r from-purple-100 to-pink-100 px-6 py-4 border-b-2 border-purple-200 flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-800 uppercase">Notifications</h3>
                    <button onClick={() => setShowNotifications(false)}>
                      <X size={18} />
                    </button>
                  </div>
                  <div>
                    {notifications.length === 0 ? (
                      <div className="px-6 py-8 text-center">
                        <Bell size={32} className="mx-auto mb-3 text-gray-300" />
                        <p className="text-gray-400 text-sm">No notifications</p>
                      </div>
                    ) : (
                      notifications.map(notif => (
                        <div key={notif.id} className={`px-6 py-4 border-b hover:bg-purple-50 ${!notif.read ? 'bg-purple-50' : ''}`}>
                          <p className="text-sm text-slate-800 font-semibold">{notif.message}</p>
                          <p className="text-xs text-gray-500 mt-1">{notif.time}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setActiveSection('liveRoom')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-all shadow-lg"
            >
              <Radio size={16} />
              Live Room
            </button>
            
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white border-2 border-purple-200 hover:border-purple-300 transition-all"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center overflow-hidden border-2 border-white shadow-md">
                {teamData?.logo ? (
                  <img src={teamData.logo} alt={teamData.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-bold text-sm">{currentUser.name?.[0] || 'T'}</span>
                )}
              </div>
              <ChevronDown size={16} />
            </button>

            {showProfile && (
              <div className="absolute right-6 top-20 w-80 bg-white rounded-2xl border-2 border-purple-200 shadow-2xl z-50">
                <div className="p-6">
                  <div className="flex flex-col items-center mb-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg mb-3">
                      {teamData?.logo ? (
                        <img src={teamData.logo} alt={teamData.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white font-black text-3xl">{currentUser.name?.[0] || 'T'}</span>
                      )}
                    </div>
                    <h3 className="text-lg font-black text-slate-800">{currentUser.name}</h3>
                    <span className="mt-2 px-3 py-1 rounded-full bg-purple-100 border border-purple-300 text-xs font-bold text-purple-700">
                      TEAM REP
                    </span>
                  </div>
                  <div className="space-y-3 mb-6">
                    <div className="flex items-start gap-3">
                      <Mail size={16} className="text-purple-600 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-600 uppercase font-bold">Email</p>
                        <p className="text-sm text-slate-800 font-semibold">{currentUser.email}</p>
                      </div>
                    </div>
                    <div className="h-px bg-purple-200"></div>
                    <div className="flex items-start gap-3">
                      {teamData?.logo ? (
                        <img src={teamData.logo} alt={teamData.name} className="w-6 h-6 object-cover rounded mt-0.5" />
                      ) : (
                        <Shield size={16} className="text-purple-600 mt-0.5" />
                      )}
                      <div>
                        <p className="text-xs text-gray-600 uppercase font-bold">Team</p>
                        <p className="text-sm text-slate-800 font-semibold">{teamData?.name || 'Not assigned'}</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setStatus(AuctionStatus.HOME)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm"
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

      {/* Main Content */}
      <main className="flex-1 px-4 pt-3 pb-3 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-lg font-bold text-slate-600">Loading team data...</p>
            </div>
          </div>
        ) : !teamData ? (
          <div className="flex items-center justify-center h-full">
            <div className="bg-white/90 rounded-3xl p-12 border-2 border-purple-200 text-center shadow-2xl max-w-lg">
              <AlertCircle size={56} className="mx-auto mb-6 text-slate-400" />
              <p className="text-2xl font-black text-slate-800 mb-3">No Team Assigned</p>
              <p className="text-slate-600">You haven't been assigned to a team yet</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-4 h-full overflow-hidden">
            {/* Left Panel: Team Overview */}
            <div className="col-span-3 flex flex-col gap-4 overflow-y-auto pr-2">
              {/* Budget Card */}
              <div className="bg-white/90 rounded-2xl border-2 border-purple-200 shadow-xl p-6">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <DollarSign size={16} className="text-purple-600" />
                  Budget Overview
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-600 uppercase font-bold mb-2">Remaining Budget</p>
                    <p className="text-3xl font-black text-purple-600">₹{((teamData.budget || 0) / 10000000).toFixed(1)}Cr</p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`${getBudgetColor()} h-3 rounded-full transition-all`}
                      style={{ width: `${getBudgetPercentage()}%` }}
                    ></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-xs text-gray-600 uppercase font-bold">Total</p>
                      <p className="text-sm font-black text-green-600">₹{((teamData.initialBudget || teamData.budget) / 10000000).toFixed(1)}Cr</p>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-xs text-gray-600 uppercase font-bold">Used</p>
                      <p className="text-sm font-black text-red-600">₹{(((teamData.initialBudget || teamData.budget) - teamData.budget) / 10000000).toFixed(1)}Cr</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Squad Card */}
              <div className="bg-white/90 rounded-2xl border-2 border-blue-200 shadow-xl p-6">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Users size={16} className="text-blue-600" />
                  Squad Status
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 uppercase font-bold">Players</span>
                    <span className="text-xl font-black text-blue-600">{teamData.playerIds?.length || 0}</span>
                  </div>
                  <div className="h-px bg-blue-200"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 uppercase font-bold">Max Squad</span>
                    <span className="text-lg font-black text-slate-800">25</span>
                  </div>
                  <div className="h-px bg-blue-200"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 uppercase font-bold">Slots Left</span>
                    <span className="text-lg font-black text-slate-800">{25 - (teamData.playerIds?.length || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Alerts Card */}
              {(getBudgetPercentage() < 30 || isLeadingBid || (teamData.playerIds?.length || 0) > 20) && (
                <div className="bg-white/90 rounded-2xl border-2 border-yellow-200 shadow-xl p-6">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <AlertCircle size={16} className="text-yellow-600" />
                    Alerts
                  </h3>
                  <div className="space-y-2">
                    {getBudgetPercentage() < 30 && (
                      <div className="p-3 bg-red-50 border-2 border-red-300 rounded-lg">
                        <p className="text-xs font-bold text-red-700">⚠️ Low Budget Warning!</p>
                      </div>
                    )}
                    {isLeadingBid && (
                      <div className="p-3 bg-green-50 border-2 border-green-300 rounded-lg">
                        <p className="text-xs font-bold text-green-700">✓ You are leading!</p>
                      </div>
                    )}
                    {(teamData.playerIds?.length || 0) > 20 && (
                      <div className="p-3 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                        <p className="text-xs font-bold text-yellow-700">⚠️ Squad almost full</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Center + Right: Auction & Bid Controls */}
            <div className="col-span-9 grid grid-cols-12 gap-4 overflow-hidden">
              {/* Center: Live Auction */}
              <div className="col-span-7 flex flex-col gap-4 overflow-hidden h-full">
                {currentBiddingPlayer ? (
                  <div className="bg-white/90 rounded-2xl border-2 border-purple-200 shadow-xl p-4 flex flex-col items-center justify-center h-full overflow-hidden">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 border-2 border-red-400 mb-2">
                      <Radio size={14} className="text-red-600 animate-pulse" />
                      <span className="text-xs font-black text-red-600 uppercase">Live Auction</span>
                    </div>

                    <div className="h-[260px] min-h-[260px] flex items-center justify-center bg-slate-200 rounded-2xl border-3 border-white shadow-lg mb-3">
                      {currentBiddingPlayer.imageUrl ? (
                        <img src={currentBiddingPlayer.imageUrl} alt={currentBiddingPlayer.name} className="max-h-full max-w-full object-contain rounded-xl" />
                      ) : (
                        <User size={60} className="text-slate-400" />
                      )}
                    </div>

                    <h2 className="text-3xl font-black text-slate-800 uppercase mb-1 text-center leading-tight">{currentBiddingPlayer.name}</h2>
                    
                    <div className="w-full max-w-sm mb-3 text-center">
                      <p className="text-xs text-gray-600 uppercase tracking-wider font-bold mb-1">{currentBiddingPlayer.roleId}</p>
                      <p className="text-sm text-gray-600">Base: ₹{(currentBiddingPlayer.basePrice / 100000).toFixed(1)}L</p>
                    </div>

                    <div className="w-full max-w-sm">
                      <div className="text-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 mb-2">
                        <p className="text-xs text-gray-600 uppercase tracking-wider font-bold mb-1">Current Bid</p>
                        <p className="text-5xl font-black text-purple-600">₹{(currentBid / 100000).toFixed(1)}L</p>
                        {isLeadingBid && (
                          <div className="mt-2 px-3 py-1 rounded-full bg-green-100 border border-green-300 inline-block">
                            <span className="text-xs font-bold text-green-700">You're Leading!</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/90 rounded-2xl border-2 border-purple-200 shadow-xl p-4 h-full flex items-center justify-center overflow-hidden">
                    <div className="text-center">
                      <Clock size={48} className="text-yellow-400 mb-3 animate-bounce mx-auto" />
                      <h3 className="text-2xl font-black text-slate-800 mb-2">Auction Starting Soon</h3>
                      <p className="text-sm text-gray-600 max-w-md font-semibold mb-4">
                        {auctionStatus === 'completed' 
                          ? 'The auction has been completed.'
                          : 'Get ready! The auctioneer will start the auction shortly.'}
                      </p>
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></div>
                        <span className="text-yellow-600 font-bold text-sm">Waiting for auctioneer to start...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Live Activity Feed + Player Queue */}
              <div className="col-span-5 flex flex-col gap-4 overflow-y-auto">
                {/* Live Activity Feed */}
                <div className="bg-white/90 rounded-2xl border-2 border-green-200 shadow-xl overflow-hidden flex-1">
                  <div className="bg-gradient-to-r from-green-100 to-emerald-100 px-6 py-4 border-b-2 border-green-200">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <Activity size={16} className="text-green-600" />
                      Live Activity Feed
                    </h3>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {activityFeed.length === 0 ? (
                      <div className="flex items-center justify-center py-8">
                        <p className="text-gray-400 text-sm">No activity yet</p>
                      </div>
                    ) : (
                      activityFeed.map(item => (
                        <div
                          key={item.id}
                          className={`flex items-start gap-3 p-3 rounded-xl border-2 ${
                            item.type === 'my-bid'
                              ? 'bg-green-50 border-green-300'
                              : item.type === 'other-bid'
                              ? 'bg-red-50 border-red-300'
                              : item.type === 'sold'
                              ? 'bg-blue-50 border-blue-300'
                              : 'bg-gray-50 border-gray-300'
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full mt-1.5 ${
                            item.type === 'my-bid' ? 'bg-green-500' :
                            item.type === 'other-bid' ? 'bg-red-500' :
                            item.type === 'sold' ? 'bg-blue-500' : 'bg-gray-500'
                          }`}></div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-slate-800">{item.message}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{item.time}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Player Queue */}
                <div className="bg-white/90 rounded-2xl border-2 border-blue-200 shadow-xl overflow-hidden flex-1">
                  <div className="bg-gradient-to-r from-blue-100 to-cyan-100 px-6 py-4 border-b-2 border-blue-200 flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <Users size={16} className="text-blue-600" />
                      Player Queue ({getFilteredPlayers().length})
                    </h3>
                    <select 
                      value={playerFilter}
                      onChange={(e) => setPlayerFilter(e.target.value as any)}
                      className="text-xs font-bold border-2 border-blue-300 rounded-lg px-2 py-1"
                    >
                      <option value="all">All</option>
                      <option value="upcoming">Upcoming</option>
                      <option value="sold">Sold</option>
                    </select>
                  </div>
                  <div className="max-h-96 overflow-y-auto p-4 space-y-2">
                    {getFilteredPlayers().slice(0, 20).map(player => (
                      <div
                        key={player.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                          player.id === currentBiddingPlayer?.id
                            ? 'bg-red-50 border-red-300'
                            : 'bg-white border-gray-200 hover:bg-blue-50'
                        }`}
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
                          <p className="text-xs text-gray-600">{player.roleId} • ₹{(player.basePrice / 100000).toFixed(1)}L</p>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                          player.status === 'SOLD' ? 'bg-green-100 text-green-700' :
                          player.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {player.status}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
    </>
  );
};
