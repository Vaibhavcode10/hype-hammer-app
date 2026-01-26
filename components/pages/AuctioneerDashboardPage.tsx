import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, Megaphone, AlertCircle, Clock, Trophy, Users, DollarSign, Activity, Bell, User, LogOut, Menu, Zap, CheckCircle, XCircle, Loader, Radio, TrendingUp, Plus, Minus, RotateCcw, ChevronRight, Shield, Timer, Hash, Calendar } from 'lucide-react';
import { AuctionStatus, MatchData, UserRole, Player, Team } from '../../types';
import { socketService } from '../../services/socketService';
import { LiveAuctionPage } from './LiveAuctionPage';
import { PlayersPage } from './PlayersPage';

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

interface BidEntry {
  id: string;
  teamId: string;
  teamName: string;
  amount: number;
  timestamp: number;
  order: number;
}

interface SystemLog {
  id: string;
  type: 'info' | 'warning' | 'error' | 'admin';
  message: string;
  timestamp: number;
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

  const [activeSection, setActiveSection] = useState<'dashboard' | 'liveRoom'>('dashboard');
  const [showPlayersPage, setShowPlayersPage] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [bidHistory, setBidHistory] = useState<BidEntry[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  
  // Bid-on-behalf-of-team state
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [customBidAmount, setCustomBidAmount] = useState<number>(0);
  const [bidUnit, setBidUnit] = useState<'lakh' | 'thousand'>('lakh');
  
  // Selected player for control
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  
  // Confirmation modals
  const [showConfirm, setShowConfirm] = useState<{ action: string; message: string } | null>(null);
  
  // Quick announcements
  const [lastAnnouncement, setLastAnnouncement] = useState<string | null>(null);

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
      
      // Auto-start first player when auction goes LIVE
      console.log('🚀 Auction went LIVE - auto-starting first player');
      setTimeout(() => {
        setPlayers(prev => {
          const pendingPlayers = prev.filter(p => p.status === 'PENDING' || p.status === 'UNSOLD');
          if (pendingPlayers.length > 0) {
            const firstPlayer = pendingPlayers[0];
            console.log('Auto-starting first player:', firstPlayer.name);
            setSelectedPlayerId(firstPlayer.id);
            startPlayerBidding(firstPlayer.id, firstPlayer.basePrice);
          }
          return prev;
        });
      }, 1000);
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

    // Listen to player updated
    socketService.onPlayerUpdated((data) => {
      console.log('Player updated:', data);
      // Update the player in the players list
      setPlayers(prev => prev.map(p => p.id === data.playerId ? data.player : p));
      // Also refetch teams since player assignments may have changed
      fetchTeams();
    });

    // Listen to player sold
    socketService.onPlayerSold(async (data) => {
      console.log('Player sold:', data);
      setAuctionState(prev => ({
        ...prev,
        biddingActive: false,
        currentPlayerId: null,
        currentPlayerName: null
      }));
      // Refresh players list and teams to see updated budgets and player counts
      const [fetchedPlayers] = await Promise.all([fetchPlayers(), fetchTeams()]);
      console.log('Teams refetched after player sold');
      
      // Auto-advance to next pending player
      setTimeout(() => {
        setPlayers(prev => {
          const pendingPlayers = prev.filter(p => p.status === 'PENDING' || p.status === 'UNSOLD');
          if (pendingPlayers.length > 0) {
            const nextPlayer = pendingPlayers[0];
            console.log('🎯 Auto-advancing to next player:', nextPlayer.name);
            setSelectedPlayerId(nextPlayer.id);
            // Auto-start bidding for next player
            startPlayerBidding(nextPlayer.id, nextPlayer.basePrice);
          } else {
            console.log('✅ All players completed!');
          }
          return prev;
        });
      }, 2000);
    });

    // Listen to player unsold
    socketService.onPlayerUnsold(async (data) => {
      console.log('Player unsold:', data);
      setAuctionState(prev => ({
        ...prev,
        biddingActive: false,
        currentPlayerId: null,
        currentPlayerName: null
      }));
      // Refresh players list and teams
      await Promise.all([fetchPlayers(), fetchTeams()]);
      
      // Auto-advance to next pending player
      setTimeout(() => {
        setPlayers(prev => {
          const pendingPlayers = prev.filter(p => p.status === 'PENDING' || p.status === 'UNSOLD');
          if (pendingPlayers.length > 0) {
            const nextPlayer = pendingPlayers[0];
            console.log('🎯 Auto-advancing to next player after unsold:', nextPlayer.name);
            setSelectedPlayerId(nextPlayer.id);
            // Auto-start bidding for next player
            startPlayerBidding(nextPlayer.id, nextPlayer.basePrice);
          } else {
            console.log('✅ All players completed!');
          }
          return prev;
        });
      }, 2000);
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
      console.log('Fetching teams for match:', currentMatch.id);
      const response = await fetch(`http://localhost:5000/api/teams?matchId=${currentMatch.id}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Teams fetched, setting teams:', data.data);
        setTeams(data.data || []);
      } else {
        console.error('Failed to fetch teams, status:', response.status);
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
      // Step 1: Initialize auction state (if not already done)
      const initResponse = await fetch('http://localhost:5000/api/auction/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId: currentMatch.id,
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString() // 4 hours from now
        })
      });
      
      const initData = await initResponse.json();
      if (!initData.success) {
        alert(initData.error || 'Failed to initialize auction');
        return;
      }
      
      // Step 2: Start the auction
      const response = await fetch('http://localhost:5000/api/auction/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seasonId: currentMatch.id })
      });
      const data = await response.json();
      if (data.success) {
        alert('Auction started!');
        setAuctionState({ ...auctionState, status: 'LIVE' });
      } else {
        alert(data.error || 'Failed to start auction');
      }
    } catch (error) {
      console.error('Error starting auction:', error);
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

  // Bid on behalf of teams - Auctioneer places all bids
  const handlePlaceBidForTeam = async (incrementAmount: number) => {
    if (!selectedTeamId || !auctionState.currentPlayerId || !currentMatch) {
      addSystemLog('warning', 'Please select a team before bidding');
      return;
    }

    const selectedTeam = teams.find(t => t.id === selectedTeamId);
    if (!selectedTeam) return;

    const currentPlayer = players.find(p => p.id === auctionState.currentPlayerId);
    if (!currentPlayer) return;

    // Calculate new bid
    const newBidAmount = (auctionState.currentBid || currentPlayer.basePrice) + incrementAmount;

    // Validate team budget
    if (newBidAmount > selectedTeam.budget) {
      alert(`Cannot bid ₹${formatCurrency(newBidAmount)}. ${selectedTeam.name}'s remaining budget is ₹${formatCurrency(selectedTeam.budget)}.`);
      addSystemLog('warning', `Bid rejected - ${selectedTeam.name} has insufficient budget`);
      return;
    }

    // Place bid via API (backend validates and broadcasts)
    const result = await socketService.placeBid(currentMatch.id, selectedTeamId, newBidAmount);

    if (result.success) {
      addSystemLog('info', `✓ Bid placed for ${selectedTeam.name}: ₹${formatCurrency(newBidAmount)}`);
    } else {
      alert(result.message || 'Failed to place bid');
      addSystemLog('error', `Failed to place bid for ${selectedTeam.name}`);
    }
  };

  const handleCustomBid = async () => {
    if (!customBidAmount || customBidAmount <= 0) {
      alert('Please enter a valid bid amount');
      return;
    }

    // Convert to actual amount based on unit
    const multiplier = bidUnit === 'lakh' ? 100000 : 1000;
    const actualAmount = customBidAmount * multiplier;

    // Check if it's higher than current bid
    if (actualAmount <= auctionState.currentBid) {
      alert(`Bid amount must be higher than current bid (${formatCurrency(auctionState.currentBid)})`);
      return;
    }

    await handlePlaceBidForTeam(actualAmount - auctionState.currentBid);
    setCustomBidAmount(0);
  };

  // Timer controls
  const extendTimer = async (seconds: number) => {
    if (!currentMatch || !auctionState.biddingActive) return;
    
    try {
      const response = await fetch('http://localhost:5000/api/auction/timer/extend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId: currentMatch.id,
          seconds
        })
      });
      const data = await response.json();
      if (data.success) {
        addSystemLog('info', `Timer extended by ${seconds}s`);
      }
    } catch (error) {
      console.error('Failed to extend timer:', error);
    }
  };

  // Player controls
  const handleStartPlayerBidding = (player: Player) => {
    setSelectedPlayerId(player.id);
    setShowConfirm({
      action: 'start',
      message: `Start bidding for ${player.name}?`
    });
  };

  const handleSkipPlayer = () => {
    if (!auctionState.currentPlayerId) return;
    setShowConfirm({
      action: 'skip',
      message: `Mark ${auctionState.currentPlayerName} as UNSOLD?`
    });
  };

  const handleCloseBidding = () => {
    if (!auctionState.biddingActive) return;
    setShowConfirm({
      action: 'close',
      message: `Close bidding for ${auctionState.currentPlayerName}?${auctionState.leadingTeamName ? ` (Selling to ${auctionState.leadingTeamName})` : ' (No bids - UNSOLD)'}`
    });
  };

  const handleDirectSell = async () => {
    if (!selectedTeamId || !auctionState.currentPlayerId || !currentMatch) return;
    const team = teams.find(t => t.id === selectedTeamId);
    if (!team) return;
    
    const currentBid = auctionState.currentBid || players.find(p => p.id === auctionState.currentPlayerId)?.basePrice || 0;
    
    if (confirm(`Sell ${auctionState.currentPlayerName} to ${team.name} for ${formatCurrency(currentBid)}?`)) {
      // First, place a final bid from this team to make them the leading team
      console.log('Direct Sell: Placing final bid for team', selectedTeamId);
      const bidResult = await socketService.placeBid(currentMatch.id, selectedTeamId, currentBid);
      console.log('Bid result:', bidResult);
      
      // Give a moment for the bid to be registered, then close bidding
      await new Promise(resolve => setTimeout(resolve, 500));
      await closePlayerBidding(true);
      addSystemLog('info', `${auctionState.currentPlayerName} directly sold to ${team.name} for ${formatCurrency(currentBid)}`);
    }
  };

  const confirmAction = async () => {
    if (!showConfirm || !currentMatch) return;
    
    switch (showConfirm.action) {
      case 'start':
        if (selectedPlayerId) {
          const player = players.find(p => p.id === selectedPlayerId);
          if (player) {
            await startPlayerBidding(player.id, player.basePrice);
            addSystemLog('info', `Started bidding for ${player.name}`);
          }
        }
        break;
      
      case 'skip':
        await closePlayerBidding(false);
        addSystemLog('info', `${auctionState.currentPlayerName} marked as UNSOLD`);
        break;
      
      case 'close':
        await closePlayerBidding(auctionState.leadingTeamId !== null);
        if (auctionState.leadingTeamId) {
          addSystemLog('info', `${auctionState.currentPlayerName} SOLD to ${auctionState.leadingTeamName} for ${formatCurrency(auctionState.currentBid)}`);
        } else {
          addSystemLog('info', `${auctionState.currentPlayerName} marked as UNSOLD`);
        }
        break;
    }
    
    setShowConfirm(null);
    setSelectedPlayerId(null);
  };

  // Quick announcements
  const makeAnnouncement = (text: string) => {
    setLastAnnouncement(text);
    
    // Broadcast announcement
    const socket = socketService.getSocket();
    if (socket && currentMatch) {
      socket.emit('AUCTIONEER_ANNOUNCEMENT', {
        seasonId: currentMatch.id,
        message: text
      });
    }
    
    addSystemLog('info', `Announced: "${text}"`);
    
    // Clear after 3 seconds
    setTimeout(() => setLastAnnouncement(null), 3000);
  };

  // System logs
  const addSystemLog = (type: SystemLog['type'], message: string) => {
    const log: SystemLog = {
      id: Date.now().toString(),
      type,
      message,
      timestamp: Date.now()
    };
    setSystemLogs(prev => [log, ...prev].slice(0, 50)); // Keep last 50
  };

  // Get player status badge
  const getPlayerStatusBadge = (status: string) => {
    switch (status) {
      case 'SOLD':
        return <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">SOLD</span>;
      case 'UNSOLD':
        return <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-bold">UNSOLD</span>;
      case 'PENDING':
        return <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold">PENDING</span>;
      default:
        return <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">{status}</span>;
    }
  };

  // Get auction status display
  const getAuctionStatusDisplay = () => {
    switch (auctionState.status) {
      case 'LIVE':
        return (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-100 border-2 border-red-400 animate-pulse">
            <Radio size={18} className="text-red-600" />
            <span className="text-sm font-black text-red-600 uppercase">LIVE</span>
          </div>
        );
      case 'PAUSED':
        return (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 border-2 border-orange-400">
            <Pause size={18} className="text-orange-600" />
            <span className="text-sm font-black text-orange-600 uppercase">PAUSED</span>
          </div>
        );
      case 'ENDED':
        return (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 border-2 border-blue-400">
            <CheckCircle size={18} className="text-blue-600" />
            <span className="text-sm font-black text-blue-600 uppercase">ENDED</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 border-2 border-gray-400">
            <Clock size={18} className="text-gray-600" />
            <span className="text-sm font-black text-gray-600 uppercase">READY</span>
          </div>
        );
    }
  };

  // Switch to Live Room view
  if (activeSection === 'liveRoom' && currentMatch && approvalStatus === 'approved') {
    return (
      <div className="fixed inset-0 z-50">
        <LiveAuctionPage
          seasonId={currentMatch.id}
          userId={currentUser.email}
          userRole={UserRole.AUCTIONEER}
          onClose={() => setActiveSection('dashboard')}
        />
      </div>
    );
  }

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
    <div className="h-screen bg-gradient-to-br from-white via-blue-50 to-orange-50 flex flex-col overflow-hidden relative">
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
      <div className="h-24 bg-white/95 backdrop-blur-xl border-b-2 border-red-200 shadow-lg flex items-center px-6">
        <div className="w-full flex items-center justify-between">
          {/* Left: Logo + Season */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-red-400 shadow-lg hover:scale-105 transition-transform cursor-pointer" onClick={() => setStatus(AuctionStatus.HOME)}>
              <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 uppercase tracking-wider leading-none">
                AUCTIONEER CONTROL
              </h1>
              <p className="text-xs text-red-600 font-bold">{currentMatch?.name || 'Master Panel'}</p>
            </div>
          </div>

          {/* Center: Status + Timer */}
          <div className="flex items-center gap-4">
            {getAuctionStatusDisplay()}
            
            {auctionState.remainingSeconds > 0 && auctionState.biddingActive && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 ${
                auctionState.remainingSeconds <= 10 
                  ? 'bg-red-100 border-red-400 animate-pulse' 
                  : 'bg-white border-purple-300'
              }`}>
                <Timer size={18} className={auctionState.remainingSeconds <= 10 ? 'text-red-600' : 'text-purple-600'} />
                <span className={`font-mono font-black text-lg ${
                  auctionState.remainingSeconds <= 10 ? 'text-red-600' : 'text-slate-800'
                }`}>
                  {auctionState.remainingSeconds}s
                </span>
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
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
              onClick={() => setStatus(AuctionStatus.HOME)}
              className="p-2 rounded-lg bg-white border-2 border-gray-300 hover:border-red-300 text-gray-700 hover:text-red-600 transition-all"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 px-6 pt-3 pb-3 overflow-hidden">
        <div className="grid grid-cols-12 gap-4 h-full">
          {/* LEFT PANEL: Player Queue + Team Monitor */}
          <div className="col-span-3 flex flex-col gap-4 overflow-hidden pr-2">
            {/* Player Queue */}
            <div className="bg-white rounded-2xl border-2 border-blue-200 shadow-xl flex-1 flex flex-col overflow-hidden">
              <div className="bg-gradient-to-r from-blue-100 to-cyan-100 px-5 py-4 border-b-2 border-blue-200">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Users size={16} className="text-blue-600" />
                  Player Queue ({players.filter(p => p.status === 'PENDING').length})
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader size={24} className="animate-spin text-blue-500" />
                  </div>
                ) : (
                  players
                    .filter(p => p.status === 'PENDING')
                    .map((player, index) => (
                      <div
                        key={player.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                          auctionState.currentPlayerId === player.id
                            ? 'bg-red-50 border-red-300'
                            : 'bg-white border-gray-200 hover:bg-blue-50 cursor-pointer'
                        }`}
                        onClick={() => setSelectedPlayerId(player.id)}
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
                        {auctionState.currentPlayerId === player.id ? (
                          <div className="px-3 py-1.5 rounded-lg bg-green-500 text-white text-xs font-bold flex items-center gap-1">
                            <Radio size={14} className="animate-pulse" />
                            LIVE
                          </div>
                        ) : index === 0 && auctionState.status === 'LIVE' ? (
                          <div className="px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-bold flex items-center gap-1">
                            <Zap size={14} />
                            NEXT
                          </div>
                        ) : null}
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Team Monitor */}
            <div className="bg-white rounded-2xl border-2 border-purple-200 shadow-xl overflow-hidden flex flex-col" style={{ maxHeight: '40%' }}>
              <div className="bg-gradient-to-r from-purple-100 to-pink-100 px-5 py-3 border-b-2 border-purple-200">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Shield size={16} className="text-purple-600" />
                  Team Monitor
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {teams.map(team => (
                  <div key={team.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-6 h-6 rounded-md bg-gray-200 flex-shrink-0 overflow-hidden">
                        {team.logo ? (
                          <img src={team.logo} alt={team.name} className="w-full h-full object-cover" />
                        ) : (
                          <Shield size={14} className="text-gray-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{team.name}</p>
                        <p className="text-xs text-gray-600">{team.playerIds?.length || 0} players</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-purple-600 flex-shrink-0">{formatCurrency(team.remainingBudget || team.budget || 0)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CENTER: Live Auction Stage + Auction Controls */}
          <div className="col-span-6 flex flex-col gap-4 overflow-hidden h-full">
            {/* Live Auction Stage */}
            <div className="bg-white rounded-2xl border-2 border-purple-200 shadow-xl p-6 flex flex-col items-center justify-center flex-1 overflow-y-auto">
              {auctionState.biddingActive && auctionState.currentPlayerId ? (
                <>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 border-2 border-red-400 mb-2">
                    <Radio size={14} className="text-red-600 animate-pulse" />
                    <span className="text-xs font-black text-red-600 uppercase">LIVE BIDDING</span>
                  </div>

                  {/* Current Player - Compact */}
                  <div className="rounded-2xl border-3 border-white shadow-lg mb-3 bg-slate-200 flex items-center justify-center flex-shrink-0">
                    {players.find(p => p.id === auctionState.currentPlayerId)?.imageUrl ? (
                      <img 
                        src={players.find(p => p.id === auctionState.currentPlayerId)?.imageUrl} 
                        alt={auctionState.currentPlayerName || 'Player'}
                        className="h-auto w-auto max-h-[200px] max-w-full rounded-xl"
                      />
                    ) : (
                      <User size={60} className="text-slate-400" />
                    )}
                  </div>

                  <h2 className="text-3xl font-black text-slate-800 uppercase mb-1 text-center leading-tight">
                    {auctionState.currentPlayerName}
                  </h2>
                  
                  {/* Player Details - Compact */}
                  <div className="w-full max-w-sm mb-3 text-center">
                    <p className="text-xs text-gray-600 uppercase tracking-wider font-bold mb-1">
                      {players.find(p => p.id === auctionState.currentPlayerId)?.roleId || 'Player'}
                    </p>
                    <p className="text-sm text-gray-600">
                      Base: {formatCurrency(players.find(p => p.id === auctionState.currentPlayerId)?.basePrice || 0)}
                    </p>
                  </div>

                  {/* Current Bid - Compact */}
                  <div className="w-full max-w-sm">
                    <div className="text-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 mb-2">
                      <p className="text-xs text-gray-600 uppercase tracking-wider font-bold mb-1">Current Highest Bid</p>
                      <p className="text-5xl font-black text-purple-600 mb-2">{formatCurrency(auctionState.currentBid)}</p>
                      {auctionState.leadingTeamName && (
                        <div className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-green-100 border border-green-300 text-xs font-bold text-green-700">
                          <Shield size={12} className="text-green-600" />
                          <span>{auctionState.leadingTeamName} Leading</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <Clock size={48} className="text-slate-400 mb-3 mx-auto" />
                  <h3 className="text-2xl font-black text-slate-800 mb-2">
                    {auctionState.status === 'READY' ? 'Ready to Start' : 'No Active Bidding'}
                  </h3>
                  <p className="text-sm text-gray-600 max-w-md">
                    {auctionState.status === 'READY' 
                      ? 'Select a player from the queue and click Start Bidding'
                      : 'Waiting for next player...'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANEL: Bidding Controls (Compact, No Scroll) */}
          <div className="col-span-3 flex flex-col pl-2 h-full overflow-hidden">
            {/* Bid Control Panel - Place bids on behalf of teams */}
            <div className="bg-white rounded-2xl border-2 border-purple-200 shadow-xl p-4">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                <TrendingUp size={16} className="text-purple-600" />
                Bidding Controls
              </h3>
              {!auctionState.currentPlayerId || auctionState.status !== 'LIVE' ? (
                <div className="text-center py-4">
                  <p className="text-gray-400 text-sm">No active bidding</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Team selector - Compact */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Team:</label>
                    {selectedTeamId && teams.find(t => t.id === selectedTeamId)?.logo && (
                      <div className="mb-2 flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                        <img 
                          src={teams.find(t => t.id === selectedTeamId)!.logo} 
                          alt="Team Logo" 
                          className="w-10 h-10 rounded object-contain"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">{teams.find(t => t.id === selectedTeamId)?.name}</p>
                          <p className="text-xs text-slate-600">₹{(((teams.find(t => t.id === selectedTeamId)?.remainingBudget || teams.find(t => t.id === selectedTeamId)?.budget || 0)) / 100000).toFixed(1)}L left</p>
                        </div>
                      </div>
                    )}
                    <select
                      value={selectedTeamId || ''}
                      onChange={(e) => setSelectedTeamId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border-2 border-gray-300 hover:border-purple-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none font-semibold text-sm bg-white transition-all duration-200"
                    >
                      <option value="">-- Choose Team --</option>
                      {teams.map(team => (
                        <option key={team.id} value={team.id}>
                          {team.name} (₹{((team.remainingBudget || team.budget) / 100000).toFixed(1)}L)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quick bid buttons - Compact 2x2 Grid */}
                  {selectedTeamId && (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handlePlaceBidForTeam(100000)}
                          className="px-4 py-2.5 rounded-lg bg-purple-500 hover:bg-purple-600 text-white font-bold text-sm transition-all shadow-md"
                        >
                          +₹1L
                        </button>
                        <button
                          onClick={() => handlePlaceBidForTeam(500000)}
                          className="px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm transition-all shadow-md"
                        >
                          +₹5L
                        </button>
                        <button
                          onClick={() => handlePlaceBidForTeam(1000000)}
                          className="px-4 py-2.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-bold text-sm transition-all shadow-md"
                        >
                          +₹10L
                        </button>
                        <button
                          onClick={() => handlePlaceBidForTeam(2000000)}
                          className="px-4 py-2.5 rounded-lg bg-purple-800 hover:bg-purple-900 text-white font-bold text-sm transition-all shadow-md"
                        >
                          +₹20L
                        </button>
                      </div>

                      {/* Custom bid amount - Compact */}
                      <div className="pt-2 border-t border-gray-200">
                        <label className="block text-sm font-bold text-slate-700 mb-1">Custom Amount:</label>
                        <div className="flex gap-2 mb-2">
                          <input
                            type="number"
                            value={customBidAmount || ''}
                            onChange={(e) => setCustomBidAmount(Number(e.target.value))}
                            placeholder="Enter amount"
                            className="flex-1 px-3 py-2 rounded-lg border-2 border-gray-300 focus:border-purple-500 focus:outline-none text-sm"
                          />
                          <select
                            value={bidUnit}
                            onChange={(e) => setBidUnit(e.target.value as 'lakh' | 'thousand')}
                            className="w-20 px-2 py-2 rounded-lg border-2 border-gray-300 focus:border-purple-500 focus:outline-none text-xs font-bold bg-white"
                          >
                            <option value="lakh">Lakh</option>
                            <option value="thousand">K</option>
                          </select>
                        </div>
                        <button
                          onClick={handleCustomBid}
                          disabled={!customBidAmount || customBidAmount <= 0}
                          className="w-full px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-bold text-sm transition-all shadow-md"
                        >
                          Bid ₹{customBidAmount || 0} {bidUnit === 'lakh' ? 'L' : 'K'}
                        </button>
                      </div>

                      {/* Direct Sell Button - Compact */}
                      <div className="pt-2 border-t border-gray-200">
                        <button
                          onClick={handleDirectSell}
                          className="w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2"
                        >
                          <CheckCircle size={16} />
                          Sell to {teams.find(t => t.id === selectedTeamId)?.name || 'Team'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Auction Controls - Moved from center */}
            <div className="bg-white rounded-2xl border-2 border-orange-200 shadow-xl p-3 mt-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Zap size={14} className="text-orange-600" />
                  Auction Controls
                </h3>
                {auctionState.status === 'LIVE' && (
                  <div className="px-2 py-1 rounded-md bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center gap-1">
                    <Zap size={10} className="animate-pulse" />
                    AUTO MODE
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {auctionState.status === 'READY' && (
                  <button
                    onClick={startAuction}
                    className="col-span-2 px-3 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-bold text-xs transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <Play size={16} />
                    Start Auction
                  </button>
                )}
                
                {auctionState.status === 'LIVE' && !auctionState.biddingActive && (
                  <button
                    onClick={pauseAuction}
                    className="col-span-2 px-3 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <Pause size={16} />
                    Pause Auction
                  </button>
                )}
                
                {auctionState.status === 'PAUSED' && (
                  <button
                    onClick={resumeAuction}
                    className="col-span-2 px-3 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-bold text-xs transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <Play size={16} />
                    Resume Auction
                  </button>
                )}
                
                {auctionState.biddingActive && (
                  <>
                    <button
                      onClick={handleCloseBidding}
                      className="px-3 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold text-xs transition-all shadow-lg flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle size={14} />
                      Close
                    </button>
                    <button
                      onClick={handleSkipPlayer}
                      className="px-3 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs transition-all shadow-lg flex items-center justify-center gap-1.5"
                    >
                      <SkipForward size={12} />
                      Unsold
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-8 max-w-md border-4 border-red-300 shadow-2xl">
            <h3 className="text-2xl font-black text-slate-800 mb-4">Confirm Action</h3>
            <p className="text-gray-600 mb-6">{showConfirm.message}</p>
            <div className="flex gap-3">
              <button
                onClick={confirmAction}
                className="flex-1 px-6 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold"
              >
                Confirm
              </button>
              <button
                onClick={() => setShowConfirm(null)}
                className="flex-1 px-6 py-3 rounded-xl bg-gray-300 hover:bg-gray-400 text-slate-800 font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
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
