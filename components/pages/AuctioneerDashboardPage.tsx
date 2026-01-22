import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipForward, Megaphone, AlertCircle, Clock, Trophy, Users, DollarSign, Activity, Bell, User, LogOut, Menu, Zap, CheckCircle, XCircle, Loader } from 'lucide-react';
import { AuctionStatus, MatchData, UserRole, Player, Team } from '../../types';
import socketService from '../../services/socketService';

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

  const [activeSection, setActiveSection] = useState<'overview' | 'queue' | 'live' | 'announcements' | 'logs'>('overview');
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [bidHistory, setBidHistory] = useState<any[]>([]);

  // Check auctioneer approval status
  useEffect(() => {
    const checkApprovalStatus = async () => {
      try {
        // Fetch auctioneer by email first to get ID
        const auctioneerResponse = await fetch(`http://localhost:5000/api/auctioneers?email=${encodeURIComponent(currentUser.email)}`);
        const auctioneerData = await auctioneerResponse.json();

        if (!auctioneerData.success || !auctioneerData.data || auctioneerData.data.length === 0) {
          console.error('Auctioneer not found for email:', currentUser.email);
          setApprovalStatus('pending');
          setApprovalMessage('Registration not found. Please contact support.');
          return;
        }

        const auctioneer = auctioneerData.data[0];
        const fetchedAuctioneerId = auctioneer.id || auctioneer.auctioneerId;
        setAuctioneerId(fetchedAuctioneerId);

        // Now fetch approval status
        const statusResponse = await fetch(`http://localhost:5000/api/auctioneer/status/${fetchedAuctioneerId}`);
        const statusData = await statusResponse.json();

        if (statusData.success) {
          const status = statusData.data.status || 'pending';
          setApprovalStatus(status);

          if (status === 'pending') {
            const matchName = currentMatch?.name || 'this season';
            setApprovalMessage(`Your application for ${matchName} is under review. You will get access once the organizer approves.`);
          } else if (status === 'rejected') {
            setApprovalMessage('Your application was not approved. Please contact the organizer for more details.');
          }
        }
      } catch (error) {
        console.error('Failed to check approval status:', error);
        setApprovalStatus('pending');
        setApprovalMessage('Unable to check approval status. Please try again later.');
      }
    };

    checkApprovalStatus();
  }, [currentUser.email, currentMatch?.name]);

  // Connect to WebSocket and join season
  useEffect(() => {
    if (approvalStatus !== 'approved' || !auctioneerId || !currentMatch) return;

    // Connect to server
    socketService.connect('http://localhost:5000');

    // Join season room
    socketService.joinSeason(currentMatch.id, auctioneerId, currentUser.role);

    // Listen to auction state updates
    socketService.onAuctionStateUpdate((state) => {
      console.log('Auction state update:', state);
      setAuctionState(prev => ({ ...prev, ...state }));
    });

    // Listen to auction started
    socketService.onAuctionStarted((data) => {
      console.log('Auction started!', data);
      setAuctionState(prev => ({ ...prev, status: 'LIVE' }));
    });

    // Listen to timer updates
    socketService.onTimerUpdate((data) => {
      setAuctionState(prev => ({ ...prev, remainingSeconds: data.remainingSeconds }));
    });

    // Listen to player bidding started
    socketService.onPlayerBiddingStarted((data) => {
      console.log('Player bidding started:', data);
      setAuctionState(prev => ({
        ...prev,
        currentPlayerId: data.player.id,
        currentPlayerName: data.player.name,
        currentBid: data.basePrice,
        leadingTeamId: null,
        leadingTeamName: null,
        biddingActive: true
      }));
      setBidHistory([]);
    });

    // Listen to new bids
    socketService.onNewBid((data) => {
      console.log('New bid:', data);
      setAuctionState(prev => ({
        ...prev,
        currentBid: data.amount,
        leadingTeamId: data.teamId,
        leadingTeamName: data.teamName
      }));
      setBidHistory(prev => [data, ...prev]);
    });

    // Listen to player sold
    socketService.onPlayerSold((data) => {
      console.log('Player sold:', data);
      setAuctionState(prev => ({
        ...prev,
        biddingActive: false,
        currentPlayerId: null,
        currentPlayerName: null
      }));
      // Refresh players list
      fetchPlayers();
    });

    // Listen to approval events
    socketService.onAuctioneerApproved((data) => {
      setApprovalStatus('approved');
      alert('🎉 Your application has been approved! You can now access the auction dashboard.');
    });

    socketService.onAuctioneerRejected((data) => {
      setApprovalStatus('rejected');
      setApprovalMessage(data.reason || 'Application not approved');
    });

    return () => {
      if (currentMatch) {
        socketService.leaveSeason(currentMatch.id);
      }
      socketService.removeAllListeners();
    };
  }, [approvalStatus, auctioneerId, currentMatch?.id, currentUser.role]);

  // Fetch data
  const fetchPlayers = async () => {
    if (!currentMatch) return;
    try {
      const response = await fetch(`http://localhost:5000/api/players?matchId=${currentMatch.id}`);
      if (response.ok) {
        const data = await response.json();
        setPlayers(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch players:', error);
    }
  };

  const fetchTeams = async () => {
    if (!currentMatch) return;
    try {
      const response = await fetch(`http://localhost:5000/api/teams?matchId=${currentMatch.id}`);
      if (response.ok) {
        const data = await response.json();
        setTeams(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch teams:', error);
    }
  };

  useEffect(() => {
    if (approvalStatus === 'approved' && currentMatch?.id) {
      setLoading(true);
      Promise.all([fetchPlayers(), fetchTeams()])
        .finally(() => setLoading(false));
    }
  }, [approvalStatus, currentMatch?.id]);

  // Auction controls
  const startAuction = async () => {
    if (!currentMatch) return;
    try {
      const response = await fetch('http://localhost:5000/api/auction/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seasonId: currentMatch.id })
      });
      const data = await response.json();
      if (data.success) {
        alert('Auction started!');
      } else {
        alert(data.error || 'Failed to start auction');
      }
    } catch (error) {
      alert('Failed to start auction');
    }
  };

  const pauseAuction = async () => {
    if (!currentMatch) return;
    try {
      await fetch('http://localhost:5000/api/auction/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seasonId: currentMatch.id })
      });
    } catch (error) {
      console.error('Failed to pause auction:', error);
    }
  };

  const resumeAuction = async () => {
    if (!currentMatch) return;
    try {
      await fetch('http://localhost:5000/api/auction/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seasonId: currentMatch.id })
      });
    } catch (error) {
      console.error('Failed to resume auction:', error);
    }
  };

  const startPlayerBidding = async (playerId: string, basePrice: number) => {
    if (!currentMatch) return;
    try {
      const response = await fetch('http://localhost:5000/api/auction/player/start', {
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
        alert(data.error || 'Failed to start bidding');
      }
    } catch (error) {
      alert('Failed to start player bidding');
    }
  };

  const closePlayerBidding = async (sold: boolean) => {
    if (!currentMatch) return;
    try {
      const response = await fetch('http://localhost:5000/api/auction/player/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId: currentMatch.id,
          sold
        })
      });
      const data = await response.json();
      if (data.success) {
        alert(sold ? '🔨 Player SOLD!' : 'Player UNSOLD');
      }
    } catch (error) {
      alert('Failed to close bidding');
    }
  };

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
    return `₹${(amount / 100000).toFixed(1)}L`;
  };

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
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-orange-50 overflow-hidden relative">
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
      <div className="fixed top-0 left-0 right-0 z-30 bg-gradient-to-b from-white/95 to-transparent backdrop-blur-xl border-b border-blue-100">
        <div className="flex items-center justify-between px-8 py-6">
          {/* Left: Logo */}
          <div className="flex items-center gap-4 w-1/4">
            <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-red-400 shadow-2xl hover:scale-105 transition-transform cursor-pointer" onClick={() => setStatus(AuctionStatus.HOME)}>
              <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-black tracking-widest gold-text uppercase leading-none">Auctioneer</h1>
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.3em] mt-1">{currentMatch.name}</p>
            </div>
          </div>

          {/* Center: Navigation Tabs */}
          <div className="flex items-center justify-center gap-2 flex-1">
            <div className="flex items-center gap-1 p-1.5 bg-white/80 backdrop-blur-lg rounded-full border-2 border-red-200 shadow-lg">
              {[
                { id: 'overview', label: 'Overview', icon: Activity },
                { id: 'live', label: 'Live Control', icon: Zap },
                { id: 'queue', label: 'Queue', icon: Users },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveSection(id as any)}
                  className={`px-4 py-2 rounded-full transition-all font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 ${
                    activeSection === id ? 'bg-red-500 text-white shadow-lg' : 'text-slate-600 hover:bg-red-50'
                  }`}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Status & User */}
          <div className="flex items-center gap-4 w-1/4 justify-end">
            <div className={`px-4 py-2 rounded-full font-bold text-xs uppercase flex items-center gap-2 ${
              auctionState.status === 'LIVE' ? 'bg-green-500 text-white' :
              auctionState.status === 'PAUSED' ? 'bg-orange-500 text-white' :
              'bg-gray-200 text-gray-700'
            }`}>
              <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
              {auctionState.status}
            </div>
            <button className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-lg hover:scale-105 transition-transform">
              {currentUser.name.charAt(0).toUpperCase()}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-32 px-8 pb-20">
        {/* Timer Banner */}
        {auctionState.status === 'LIVE' && (
          <div className="mb-8 bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 rounded-2xl p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Clock size={32} />
                <div>
                  <p className="text-sm font-bold opacity-90">Time Remaining</p>
                  <p className="text-3xl font-black">{formatTime(auctionState.remainingSeconds)}</p>
                </div>
              </div>
              {auctionState.biddingActive && (
                <div className="text-right">
                  <p className="text-sm font-bold opacity-90">Current Player</p>
                  <p className="text-2xl font-black">{auctionState.currentPlayerName}</p>
                  <p className="text-lg font-bold">Bid: {formatCurrency(auctionState.currentBid)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Overview Section */}
        {activeSection === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-2xl p-6 border-2 border-gray-100 hover:border-blue-500 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <Trophy size={24} className="text-blue-500" />
                  <span className="text-2xl font-black">{auctionStats.totalPlayers}</span>
                </div>
                <p className="text-sm font-bold text-gray-600">Total Players</p>
              </div>

              <div className="bg-white rounded-2xl p-6 border-2 border-gray-100 hover:border-green-500 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign size={24} className="text-green-500" />
                  <span className="text-2xl font-black">{auctionStats.soldPlayers}</span>
                </div>
                <p className="text-sm font-bold text-gray-600">Sold Players</p>
              </div>

              <div className="bg-white rounded-2xl p-6 border-2 border-gray-100 hover:border-red-500 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <XCircle size={24} className="text-red-500" />
                  <span className="text-2xl font-black">{auctionStats.unsoldPlayers}</span>
                </div>
                <p className="text-sm font-bold text-gray-600">Unsold Players</p>
              </div>

              <div className="bg-white rounded-2xl p-6 border-2 border-gray-100 hover:border-purple-500 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <Users size={24} className="text-purple-500" />
                  <span className="text-2xl font-black">{auctionStats.activeTeams}</span>
                </div>
                <p className="text-sm font-bold text-gray-600">Active Teams</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl p-6 border-2 border-gray-100">
              <h3 className="text-lg font-black uppercase mb-4">Auction Controls</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={startAuction}
                  disabled={auctionState.status === 'LIVE'}
                  className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl hover:brightness-110 transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play size={20} />
                  <span>Start Auction</span>
                </button>
                
                {auctionState.status === 'LIVE' ? (
                  <button
                    onClick={pauseAuction}
                    className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:brightness-110 transition-all font-bold"
                  >
                    <Pause size={20} />
                    <span>Pause Auction</span>
                  </button>
                ) : auctionState.status === 'PAUSED' ? (
                  <button
                    onClick={resumeAuction}
                    className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl hover:brightness-110 transition-all font-bold"
                  >
                    <Play size={20} />
                    <span>Resume Auction</span>
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Live Control Section */}
        {activeSection === 'live' && (
          <div className="space-y-6">
            {auctionState.biddingActive ? (
              <>
                {/* Current Player Card */}
                <div className="bg-gradient-to-br from-blue-500 to-purple-500 rounded-3xl p-8 text-white shadow-2xl">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-sm font-bold opacity-90">NOW BIDDING</p>
                      <h2 className="text-4xl font-black">{auctionState.currentPlayerName}</h2>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold opacity-90">Current Bid</p>
                      <p className="text-5xl font-black">{formatCurrency(auctionState.currentBid)}</p>
                    </div>
                  </div>

                  {auctionState.leadingTeamName && (
                    <div className="bg-white/20 backdrop-blur-lg rounded-xl p-4 mb-6">
                      <p className="text-sm font-bold opacity-90">Leading Team</p>
                      <p className="text-2xl font-black">{auctionState.leadingTeamName}</p>
                    </div>
                  )}

                  {/* Close Bidding Controls */}
                  <div className="flex gap-4">
                    <button
                      onClick={() => closePlayerBidding(true)}
                      className="flex-1 py-4 bg-green-600 hover:bg-green-700 rounded-xl font-black text-xl transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={24} />
                      SOLD!
                    </button>
                    <button
                      onClick={() => closePlayerBidding(false)}
                      className="flex-1 py-4 bg-red-600 hover:bg-red-700 rounded-xl font-black text-xl transition-all flex items-center justify-center gap-2"
                    >
                      <XCircle size={24} />
                      UNSOLD
                    </button>
                  </div>
                </div>

                {/* Bid History */}
                <div className="bg-white rounded-2xl p-6 border-2 border-gray-100">
                  <h3 className="text-lg font-black uppercase mb-4">Live Bid History</h3>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {bidHistory.length > 0 ? (
                      bidHistory.map((bid, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border-2 border-blue-200"
                        >
                          <span className="font-bold text-blue-900">{bid.teamName}</span>
                          <span className="text-xl font-black text-blue-600">{formatCurrency(bid.amount)}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-8">No bids yet</p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-2xl p-12 border-2 border-gray-100 text-center">
                <AlertCircle size={48} className="text-gray-400 mx-auto mb-4" />
                <p className="text-xl font-bold text-gray-600">No active bidding</p>
                <p className="text-gray-500 mt-2">Start bidding for a player from the queue</p>
              </div>
            )}
          </div>
        )}

        {/* Queue Section */}
        {activeSection === 'queue' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border-2 border-gray-100">
              <h3 className="text-lg font-black uppercase mb-4">Available Players</h3>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {players
                  .filter(p => p.status === 'AVAILABLE')
                  .map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border-2 border-gray-200 hover:border-blue-500 transition-all"
                    >
                      <div>
                        <p className="font-black text-lg">{player.name}</p>
                        <p className="text-sm text-gray-600">{player.role} • Base: {formatCurrency(player.basePrice)}</p>
                      </div>
                      <button
                        onClick={() => startPlayerBidding(player.id, player.basePrice)}
                        disabled={auctionState.biddingActive || auctionState.status !== 'LIVE'}
                        className="px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl font-bold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Start Bidding
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
