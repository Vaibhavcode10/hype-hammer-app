import React, { useState, useEffect, useRef } from 'react';
import { DollarSign, Users, Trophy, TrendingDown, Bell, User, LogOut, Shield, Activity, Clock, Radio, AlertCircle, CheckCircle, XCircle, ChevronDown, X, Calendar, Mail, Award, TrendingUp, Filter, Search, Eye } from 'lucide-react';
import { AuctionStatus, MatchData, UserRole, Team, Player } from '../../types';
import { LiveAuctionPage } from './LiveAuctionPage';
import { PlayersPage } from './PlayersPage';
import { socketService } from '../../services/socketService';
import { firebaseRealtimeService } from '../../services/firebaseRealtimeService';

const API_BASE = 'https://us-central1-axilam.cloudfunctions.net/auction';

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
  const [showPlayersPage, setShowPlayersPage] = useState(false);
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
  const allPlayersRef = useRef<Player[]>([]);
  const seasonId = currentMatch?.id || '';
  const teamId = teamData?.id || '';

  // Initialize socket connection
  useEffect(() => {
    if (seasonId && userId) {
      socketService.connect();
    }
  }, [seasonId, userId]);

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
          setLeadingTeam({ id: latestBid.teamId, name: latestBid.teamName } as any);
        }
      }
    } catch (error) {
      console.error('Failed to fetch bid history:', error);
    }
  };

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
        const teamResponse = await fetch(`${API_BASE}/teams?matchId=${currentMatch.id}`);
        if (teamResponse.ok) {
          const teamDataResponse = await teamResponse.json();
          console.log('📊 Fetched teams data:', teamDataResponse.data);
          // Find team where the owner's email matches current user's email
          const team = teamDataResponse.data?.find((t: Team) => t.email === currentUser.email);
          if (team) {
            console.log('✅ Found my team:', team);
            console.log('   → Budget:', team.budget);
            console.log('   → Remaining Budget:', team.remainingBudget);
            console.log('   → Initial Budget:', team.initialBudget);
            setTeamData(team);
          }
        }
        
        // Fetch all players
        const playersResponse = await fetch(`${API_BASE}/players?matchId=${currentMatch.id}`);
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

  // Fetch initial auction state on mount for page refresh
  useEffect(() => {
    if (!currentMatch?.id) return;

    const fetchInitialState = async () => {
      try {
        // Fetch current auction state
        const auctionStateDoc = await firebaseRealtimeService.getAuctionState(currentMatch.id);
        if (auctionStateDoc && auctionStateDoc.status === 'LIVE' && auctionStateDoc.biddingActive) {
          setAuctionStatus('live');
          console.log('✅ Initial auction state: LIVE, currentPlayerId:', auctionStateDoc.currentPlayerId);

          // If there's a current player, fetch from API (same approach as listener)
          if (auctionStateDoc.currentPlayerId) {
            const API_BASE = 'https://us-central1-axilam.cloudfunctions.net/auction';
            const res = await fetch(`${API_BASE}/players/${auctionStateDoc.currentPlayerId}`);
            const playerData = await res.json();
            if (playerData.success && playerData.data) {
              console.log('✅ Found initial player:', playerData.data.name);
              setCurrentBiddingPlayer(playerData.data);
              setCurrentBid(playerData.data.currentBid || playerData.data.basePrice || auctionStateDoc.currentBid || 0);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching initial auction state:', err);
      }
    };

    fetchInitialState();
  }, [currentMatch?.id]);

  // Real-time Firestore listeners for live updates
  useEffect(() => {
    if (!currentMatch?.id || !teamData?.id) return;

    console.log('🔥 Setting up real-time listeners for Team Rep dashboard');

    // Join season (AWAIT THIS to ensure currentSeasonId is set)
    socketService.joinSeason(currentMatch.id, teamData.id, UserRole.TEAM_REP)
      .then(() => {
        console.log('✅ Successfully joined season:', currentMatch.id);
      })
      .catch(err => {
        console.error('❌ Error joining season:', err);
      });

    // Listen to players for live bidding updates
    const playersUnsubscribe = socketService.onPlayersUpdate(currentMatch.id, (updatedPlayers) => {
      console.log('🔥 Players live update:', updatedPlayers.length);
      setAllPlayers(updatedPlayers);
      allPlayersRef.current = updatedPlayers;

      // IMPORTANT: Do NOT use this listener to clear currentBiddingPlayer
      // The onAuctionStateUpdate listener is the authoritative source for that
      // This listener only updates the player data if we're already showing someone
      
      // If we currently have a bidding player, find their updated data and refresh it
      setCurrentBiddingPlayer(prev => {
        if (prev) {
          const updatedPlayer = updatedPlayers.find((p: any) => p.id === prev.id);
          if (updatedPlayer) {
            console.log('   → Updating currentBiddingPlayer data for:', updatedPlayer.name);
            return updatedPlayer;
          }
        }
        return prev;
      });
    });

    // Listen to teams for budget updates
    const teamsUnsubscribe = socketService.onTeamsUpdate(currentMatch.id, (updatedTeams) => {
      console.log('🔥 Teams live update:', updatedTeams.length);
      const myTeam = updatedTeams.find((t: any) => t.id === teamData.id);
      if (myTeam) {
        console.log('🔥 My team budget updated:', myTeam.budget);
        setTeamData(myTeam);
      }
    });

    // Listen to bid events
    const bidUnsubscribe = socketService.onNewBid((bidData) => {
      console.log('🔥 New bid event:', bidData);
      
      if (!bidData.amount) {
        console.error('❌ Bid missing amount:', bidData);
        return;
      }
      
      setCurrentBid(bidData.amount);
      setLeadingTeam(bidData.teamId);
      setIsLeadingBid(bidData.teamId === teamData.id);
      
      // Add to activity feed
      setActivityFeed(prev => [{
        id: `${Date.now()}-${Math.random()}`,
        message: `${bidData.teamName} bid ₹${(bidData.amount / 100000).toFixed(1)}L for ${bidData.playerName}`,
        time: new Date().toLocaleTimeString(),
        type: bidData.teamId === teamData.id ? 'success' : 'info'
      }, ...prev].slice(0, 50));
    });

    return () => {
      console.log('🔥 Cleaning up Team Rep real-time listeners');
      playersUnsubscribe();
      teamsUnsubscribe();
      bidUnsubscribe();
    };
  }, [currentMatch?.id, teamData?.id]);

  // Socket connection and listeners
  useEffect(() => {
    if (!seasonId || !userId || !teamId) return;

    // Join season room
    socketService.joinSeason(seasonId, userId, UserRole.TEAM_REP);

    // Store unsubscribe functions for cleanup
    const unsubscribers: (() => void)[] = [];

    // Listen for auction state updates (includes current player if auction is in progress)
    unsubscribers.push(socketService.onAuctionStateUpdate((data: any) => {
      console.log('AUCTION_STATE_UPDATE received:', data);
      
      // Update auction status based on state
      if (data.status === 'LIVE' && data.biddingActive) {
        setAuctionStatus('live');
        
        // If there's a current player being auctioned, fetch it from the API
        // This is the same approach used in PlayerDashboardPage and works reliably
        if (data.currentPlayerId) {
          console.log('   → Fetching player from API:', data.currentPlayerId);
          const API_BASE = 'https://us-central1-axilam.cloudfunctions.net/auction';
          fetch(`${API_BASE}/players/${data.currentPlayerId}`)
            .then(res => res.json())
            .then(playerData => {
              if (playerData.success && playerData.data) {
                console.log('✅ Fetched player from API:', playerData.data.name);
                setCurrentBiddingPlayer(playerData.data);
                setCurrentBid(playerData.data.currentBid || playerData.data.basePrice || data.currentBid || 0);
                setLeadingTeam(playerData.data.leadingTeamId ? { id: playerData.data.leadingTeamId, name: playerData.data.leadingTeamName } as Team : null);
                setIsLeadingBid(playerData.data.leadingTeamId === teamId);
              } else {
                console.log('⚠️ API fetch failed or no player data:', playerData);
              }
            })
            .catch(err => {
              console.error('🚨 Error fetching player from API:', err);
            });
        }
      } else if (data.status === 'PAUSED' || !data.biddingActive) {
        console.log('   → Setting currentBiddingPlayer to NULL (auction paused)');
        setAuctionStatus('paused');
        setCurrentBiddingPlayer(null);
        setCurrentBid(0);
      } else if (data.status === 'COMPLETED') {
        console.log('   → Setting currentBiddingPlayer to NULL (auction completed)');
        setAuctionStatus('completed');
        setCurrentBiddingPlayer(null);
      }
    }));

    // Auction state updates
    unsubscribers.push(socketService.onAuctionStarted((data: any) => {
      console.log('🚀 AUCTION_STARTED received:', data);
      setAuctionStatus('live');
      setActivityFeed(prev => [{
        id: Date.now().toString(),
        message: '🚀 Auction has started!',
        time: new Date().toLocaleTimeString(),
        type: 'system'
      }, ...prev]);
    }));

    unsubscribers.push(socketService.onAuctionPaused((data: any) => {
      console.log('⏸️ AUCTION_PAUSED received:', data);
      setAuctionStatus('paused');
      setActivityFeed(prev => [{
        id: Date.now().toString(),
        message: '⏸️ Auction paused',
        time: new Date().toLocaleTimeString(),
        type: 'system'
      }, ...prev]);
    }));

    unsubscribers.push(socketService.onAuctionResumed((data: any) => {
      console.log('▶️ AUCTION_RESUMED received:', data);
      setAuctionStatus('live');
      setActivityFeed(prev => [{
        id: Date.now().toString(),
        message: '▶️ Auction resumed',
        time: new Date().toLocaleTimeString(),
        type: 'system'
      }, ...prev]);
    }));

    // Real-time bidding updates (view-only)

    // Player updated (live changes from auctioneer)
    unsubscribers.push(socketService.onPlayerUpdated((data: { playerId: string; player: Player }) => {
      console.log('PLAYER_UPDATED received:', data);
      
      // Update in allPlayers list
      setAllPlayers(prev => prev.map(p => p.id === data.playerId ? data.player : p));
      
      // If this player is currently being auctioned, update the bidding player
      if (currentBiddingPlayer && data.playerId === currentBiddingPlayer.id) {
        console.log('   → Updating currentBiddingPlayer to:', data.player.name);
        setCurrentBiddingPlayer(data.player);
      }
    }));

    // Player bidding started
    unsubscribers.push(socketService.onPlayerBiddingStarted((data: { player: Player; basePrice: number } | null) => {
      console.log('PLAYER_BIDDING_STARTED received:', data);
      if (!data || !(data as any)?.player) {
        console.log('   → Setting currentBiddingPlayer to NULL (no data)');
        setCurrentBiddingPlayer(null);
        setCurrentBid(0);
        setLeadingTeam(null);
        setIsLeadingBid(false);
        setAuctionStatus('upcoming');
        return;
      }
      console.log('   → Setting currentBiddingPlayer to:', data.player.name);
      setCurrentBiddingPlayer(data.player);
      setCurrentBid((data.player as any)?.currentBid || data.basePrice || data.player.basePrice || 0);
      setLeadingTeam(null);
      setIsLeadingBid(false);
      setAuctionStatus('live');
      
      // Fetch actual bid history to get accurate current bid and leading team
      fetchBidHistoryForCurrentPlayer(data.player.id);
      
      setActivityFeed(prev => [{
        id: Date.now().toString(),
        message: `${data.player.name} is now being auctioned - Base: ₹${((data.basePrice || data.player.basePrice) / 100000).toFixed(1)}L`,
        time: new Date().toLocaleTimeString(),
        type: 'system'
      }, ...prev]);
    }));

    // New bid
    unsubscribers.push(socketService.onNewBid((data: { playerId: string; amount: number; teamId: string; teamName: string }) => {
      console.log('💰 NEW_BID received:', data);
      console.log('   → Updating current bid to:', data.amount);
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
    }));

    // Player sold
    unsubscribers.push(socketService.onPlayerSold(async (data: { playerId: string; playerName: string; teamId: string; teamName: string; finalAmount: number }) => {
      const wonPlayer = data.teamId === teamId;
      
      const soldMessage = wonPlayer
        ? `🎉 You won ${data.playerName} for ₹${(data.finalAmount / 100000).toFixed(1)}L!`
        : `${data.playerName} sold to ${data.teamName} for ₹${(data.finalAmount / 100000).toFixed(1)}L`;
      
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
          playerId: data.playerId,
          playerName: data.playerName,
          amount: data.finalAmount,
          time: new Date().toLocaleTimeString(),
          won: true
        }, ...prev]);
      }
      
      // Firebase listeners will automatically update team and player data
      // No need to refetch
      
      setCurrentBiddingPlayer(null);
      setCurrentBid(0);
      setLeadingTeam(null);
      setIsLeadingBid(false);
    }));

    // Player unsold
    unsubscribers.push(socketService.onPlayerUnsold(async (data: { playerId: string; playerName: string }) => {
      setActivityFeed(prev => [{
        id: Date.now().toString(),
        message: `${data.playerName} went UNSOLD`,
        time: new Date().toLocaleTimeString(),
        type: 'system'
      }, ...prev]);
      
      // Firebase listeners will automatically update player data
      // No need to refetch
      
      setCurrentBiddingPlayer(null);
      setCurrentBid(0);
      setLeadingTeam(null);
      setIsLeadingBid(false);
    }));

    // Timer update
    unsubscribers.push(socketService.onTimerUpdate((data: { remainingSeconds: number }) => {
      setCountdown(data.remainingSeconds);
    }));

    // Auction ended
    unsubscribers.push(socketService.onAuctionEnded(() => {
      setAuctionStatus('completed');
    }));

    // Team data updated (budget/players changed)
    unsubscribers.push(socketService.onTeamUpdated((data: { teamId?: string; team: Team }) => {
      console.log('💰 TEAM_UPDATED received:', data);
      // Check if this update is for the current team
      if (data.team.id === teamId || data.teamId === teamId) {
        console.log('   → Updating team data:', data.team);
        setTeamData(data.team);
      }
    }));

    return () => {
      // Cleanup all event listeners
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [seasonId, userId, teamId, allPlayers]);

  // Debug effect: log when currentBiddingPlayer changes
  useEffect(() => {
    console.log('📊 currentBiddingPlayer state updated:', currentBiddingPlayer?.name || 'NULL', currentBiddingPlayer?.id || 'NO-ID');
  }, [currentBiddingPlayer]);

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
    // ALWAYS use 10Cr default, never fall back to teamData.budget (which could be negative)
    const initialBudget = (teamData as any).initialBudget || 10000000;
    const currentBudget = teamData.remainingBudget !== undefined ? teamData.remainingBudget : initialBudget;
    if (initialBudget === 0) return 0;
    // Clamp percentage between 0-100
    const percentage = Math.max(0, Math.min(100, (currentBudget / initialBudget) * 100));
    return percentage;
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
                  
                  {/* Alerts Section */}
                  {(getBudgetPercentage() < 30 || isLeadingBid || (teamData.playerIds?.length || 0) > 20) && (
                    <div className="px-6 py-4 border-b-2 border-yellow-200 bg-yellow-50">
                      <h4 className="text-xs font-black text-slate-800 uppercase mb-3 flex items-center gap-2">
                        <AlertCircle size={14} className="text-yellow-600" />
                        Alerts
                      </h4>
                      <div className="space-y-2">
                        {getBudgetPercentage() < 30 && (
                          <div className="p-2 bg-red-50 border border-red-300 rounded-lg">
                            <p className="text-xs font-bold text-red-700">⚠️ Low Budget Warning!</p>
                          </div>
                        )}
                        {isLeadingBid && (
                          <div className="p-2 bg-green-50 border border-green-300 rounded-lg">
                            <p className="text-xs font-bold text-green-700">✓ You are leading!</p>
                          </div>
                        )}
                        {(teamData.playerIds?.length || 0) > 20 && (
                          <div className="p-2 bg-yellow-50 border border-yellow-300 rounded-lg">
                            <p className="text-xs font-bold text-yellow-700">⚠️ Squad almost full</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Notifications List */}
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
                    onClick={() => {
                      sessionStorage.clear();
                      localStorage.clear();
                      setStatus(AuctionStatus.HOME);
                    }}
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
          <div className="flex items-center justify-center h-full rounded-2xl" style={{ background: 'linear-gradient(135deg, #1a0a0a 0%, #2d0a0a 25%, #1a0a12 50%, #0d0d1a 100%)' }}>
            <div className="text-center">
              <style>{`
                @keyframes neon-spin {
                  from { transform: rotate(0deg); }
                  to { transform: rotate(360deg); }
                }
                .neon-spinner {
                  animation: neon-spin 2s linear infinite;
                  box-shadow: 0 0 10px rgba(236, 72, 153, 0.5), 0 0 20px rgba(236, 72, 153, 0.3);
                }
              `}</style>
              <div className="w-16 h-16 border-4 border-pink-500/30 border-t-pink-500 rounded-full neon-spinner mx-auto mb-4"></div>
              <p className="text-lg font-bold text-pink-400">Loading team data...</p>
              <p className="text-xs text-pink-400/60 mt-2">Fetching your team information...</p>
            </div>
          </div>
        ) : !teamData ? (
          <div className="flex items-center justify-center h-full rounded-2xl" style={{ background: 'linear-gradient(135deg, #1a0a0a 0%, #2d0a0a 25%, #1a0a12 50%, #0d0d1a 100%)' }}>
            <div className="glass-card rounded-3xl p-12 border-2 text-center max-w-lg" style={{ border: '2px solid rgba(236, 72, 153, 0.3)' }}>
              <AlertCircle size={56} className="mx-auto mb-6 text-pink-400" />
              <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-red-400 mb-3">No Team Assigned</p>
              <p className="text-pink-300/70">You haven't been assigned to a team yet. Contact your administrator.</p>
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
                    <p className="text-3xl font-black text-purple-600">{formatCurrency(Math.max(0, teamData.remainingBudget !== undefined ? teamData.remainingBudget : ((teamData as any).initialBudget || teamData.budget || 0)))}</p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`${getBudgetColor()} h-3 rounded-full transition-all`}
                      style={{ width: `${getBudgetPercentage()}%` }}
                    ></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs text-gray-600 uppercase font-bold">Initial Purse</p>
                      <p className="text-sm font-black text-blue-600">{formatCurrency((teamData as any).initialBudget || 10000000)}</p>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-xs text-gray-600 uppercase font-bold">Spent</p>
                      <p className="text-sm font-black text-red-600">{formatCurrency(Math.max(0, ((teamData as any).initialBudget || 10000000) - Math.max(0, teamData.remainingBudget !== undefined ? teamData.remainingBudget : 0)))}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Activity Feed */}
              <div className="bg-white/90 rounded-2xl border-2 border-green-200 shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-green-100 to-emerald-100 px-6 py-4 border-b-2 border-green-200">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Activity size={16} className="text-green-600" />
                    Live Activity Feed
                  </h3>
                </div>
                <div className="overflow-y-auto p-4 space-y-2 h-64">
                  {activityFeed.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                      <p className="text-gray-400 text-sm">No activity yet</p>
                    </div>
                  ) : (
                    activityFeed.map((item, index) => (
                      <div
                        key={`${item.id}-${index}`}
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
                      {auctionStatus === 'live' ? (
                        <>
                          <Radio size={48} className="text-green-500 mb-3 animate-pulse mx-auto" />
                          <h3 className="text-2xl font-black text-green-600 mb-2">Auction is Live!</h3>
                          <p className="text-sm text-gray-600 max-w-md font-semibold mb-4">
                            The auction is running. Waiting for next player to be auctioned...
                          </p>
                          <div className="flex items-center justify-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                            <span className="text-green-600 font-bold text-sm">Ready to bid</span>
                          </div>
                        </>
                      ) : auctionStatus === 'paused' ? (
                        <>
                          <Clock size={48} className="text-orange-400 mb-3 mx-auto" />
                          <h3 className="text-2xl font-black text-orange-600 mb-2">Auction Paused</h3>
                          <p className="text-sm text-gray-600 max-w-md font-semibold mb-4">
                            The auctioneer has temporarily paused the auction.
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
                            The auction has been completed. Review your squad below.
                          </p>
                        </>
                      ) : (
                        <>
                          <Clock size={48} className="text-yellow-400 mb-3 animate-bounce mx-auto" />
                          <h3 className="text-2xl font-black text-slate-800 mb-2">Auction Starting Soon</h3>
                          <p className="text-sm text-gray-600 max-w-md font-semibold mb-4">
                            Get ready! The auctioneer will start the auction shortly.
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

              {/* Right: Squad Status + Player Queue */}
              <div className="col-span-5 flex flex-col gap-4 overflow-y-auto">
                {/* Squad Status */}
                <div className="bg-white/90 rounded-2xl border-2 border-blue-200 shadow-xl p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Users size={14} className="text-blue-600" />
                      Squad Status
                    </h3>
                    <span className="text-xs text-gray-600">Max: 25</span>
                  </div>
                  <div className="flex items-center justify-around mt-3">
                    <div className="text-center">
                      <p className="text-xs text-gray-600">Players</p>
                      <p className="text-xl font-bold text-blue-600">{teamData.playerIds?.length || 0}</p>
                    </div>
                    <div className="h-8 w-px bg-gray-300"></div>
                    <div className="text-center">
                      <p className="text-xs text-gray-600">Slots Left</p>
                      <p className="text-xl font-bold text-slate-800">{25 - (teamData.playerIds?.length || 0)}</p>
                    </div>
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
                    {(() => {
                      const filtered = getFilteredPlayers().slice(0, 20);
                      const sorted = [...filtered].sort((a, b) => {
                        if (a.status === 'UNSOLD' && b.status !== 'UNSOLD') return 1;
                        if (a.status !== 'UNSOLD' && b.status === 'UNSOLD') return -1;
                        return 0;
                      });
                      const unsoldCount = sorted.filter(p => p.status === 'UNSOLD').length;
                      const regularCount = sorted.length - unsoldCount;
                      
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
                          className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                            player.id === currentBiddingPlayer?.id
                              ? 'bg-red-50 border-red-300'
                              : player.status === 'UNSOLD' 
                                ? 'bg-orange-50 border-orange-300 hover:bg-orange-100'
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
                          player.status === 'UNSOLD' ? 'bg-orange-100 text-orange-700' :
                          player.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                          player.status === 'AVAILABLE' ? 'bg-blue-100 text-blue-700' :
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
    </>
  );
};
