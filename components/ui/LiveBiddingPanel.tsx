import React, { useEffect, useState } from 'react';
import { Gavel, TrendingUp, Users, Clock, Trophy, Zap } from 'lucide-react';
import socketService from '../../services/socketService';

/**
 * LiveBiddingPanel - Universal component for ALL 5 dashboards
 * Shows real-time bidding synchronized across all roles
 * 
 * Role-based behavior:
 * - Admin: View only, can see everything
 * - Auctioneer: View only, controls bidding flow
 * - Team Rep: View + CAN BID
 * - Player: View only (their own auction)
 * - Guest: View only (public feed)
 */

interface LiveBiddingPanelProps {
  seasonId: string;
  userId: string;
  userRole: 'ADMIN' | 'AUCTIONEER' | 'TEAM_REP' | 'PLAYER' | 'GUEST';
  teamId?: string; // For team reps
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

export const LiveBiddingPanel: React.FC<LiveBiddingPanelProps> = ({
  seasonId,
  userId,
  userRole,
  teamId
}) => {
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

  const [bidHistory, setBidHistory] = useState<any[]>([]);
  const [teamBudget, setTeamBudget] = useState<number>(0);
  const [bidding, setBidding] = useState(false);
  const [celebrationVisible, setCelebrationVisible] = useState(false);

  // Connect to WebSocket
  useEffect(() => {
    if (!socketService.isConnected()) {
      socketService.connect('http://localhost:5000');
    }

    // Join season room
    socketService.joinSeason(seasonId, userId, userRole);

    // Listen to auction state updates
    socketService.onAuctionStateUpdate((state) => {
      setAuctionState(prev => ({ ...prev, ...state }));
    });

    // Listen to timer updates
    socketService.onTimerUpdate((data) => {
      setAuctionState(prev => ({ ...prev, remainingSeconds: data.remainingSeconds }));
    });

    // Listen to player bidding started
    socketService.onPlayerBiddingStarted((data) => {
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

    // Listen to new bids - EVERYONE SEES THE SAME BID
    socketService.onNewBid((data) => {
      console.log('🔨 New bid received:', data);
      setAuctionState(prev => ({
        ...prev,
        currentBid: data.amount,
        leadingTeamId: data.teamId,
        leadingTeamName: data.teamName
      }));
      setBidHistory(prev => [data, ...prev]);

      // Show animation
      if (userRole === 'TEAM_REP' && data.teamId !== teamId) {
        // Outbid notification for team reps
        showOutbidNotification();
      }
    });

    // Listen to player sold
    socketService.onPlayerSold((data) => {
      console.log('✅ Player sold:', data);
      setAuctionState(prev => ({
        ...prev,
        biddingActive: false,
        currentPlayerId: null,
        currentPlayerName: null
      }));
      setCelebrationVisible(true);
      setTimeout(() => setCelebrationVisible(false), 3000);
    });

    // Listen to player unsold
    socketService.onPlayerUnsold((data) => {
      console.log('❌ Player unsold:', data);
      setAuctionState(prev => ({
        ...prev,
        biddingActive: false,
        currentPlayerId: null,
        currentPlayerName: null
      }));
    });

    return () => {
      socketService.leaveSeason(seasonId);
    };
  }, [seasonId, userId, userRole, teamId]);

  // Fetch team budget (for team reps)
  useEffect(() => {
    if (userRole === 'TEAM_REP' && teamId) {
      fetchTeamBudget();
    }
  }, [userRole, teamId]);

  const fetchTeamBudget = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/teams/${teamId}`);
      if (response.ok) {
        const data = await response.json();
        setTeamBudget(data.data.remainingBudget || 0);
      }
    } catch (error) {
      console.error('Failed to fetch team budget:', error);
    }
  };

  const placeBid = async (increment: number) => {
    if (!teamId || bidding) return;

    const newBidAmount = auctionState.currentBid + increment;

    // Validate budget
    if (newBidAmount > teamBudget) {
      alert('❌ Insufficient budget!');
      return;
    }

    setBidding(true);

    try {
      const response = await fetch('http://localhost:5000/api/auction/bid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId,
          teamId,
          amount: newBidAmount
        })
      });

      const data = await response.json();
      
      if (!data.success) {
        alert(`❌ ${data.error}`);
      } else {
        // Bid successful - server will broadcast to all
        console.log('✅ Bid placed successfully');
      }
    } catch (error) {
      console.error('Failed to place bid:', error);
      alert('❌ Failed to place bid');
    } finally {
      setBidding(false);
    }
  };

  const showOutbidNotification = () => {
    // Play sound or show notification
    const audio = new Audio('/sounds/outbid.mp3');
    audio.play().catch(() => {});
  };

  const formatCurrency = (amount: number) => {
    return `₹${(amount / 100000).toFixed(1)}L`;
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  const canBid = userRole === 'TEAM_REP' && auctionState.biddingActive && auctionState.status === 'LIVE';
  const isLeading = userRole === 'TEAM_REP' && auctionState.leadingTeamId === teamId;

  // No active bidding
  if (!auctionState.biddingActive) {
    return (
      <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl p-12 text-center border-4 border-gray-300">
        <div className="w-20 h-20 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-6">
          <Gavel size={40} className="text-gray-500" />
        </div>
        <h3 className="text-2xl font-black text-gray-600 mb-2">No Active Bidding</h3>
        <p className="text-gray-500">Waiting for auctioneer to start...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Bidding Card */}
      <div className={`rounded-3xl p-8 shadow-2xl border-4 transition-all ${
        isLeading 
          ? 'bg-gradient-to-br from-green-500 via-blue-500 to-purple-500 border-green-300' 
          : 'bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 border-orange-300'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-lg rounded-full flex items-center justify-center">
              <Trophy size={24} />
            </div>
            <div>
              <p className="text-sm font-bold opacity-90 uppercase tracking-wider">Now Bidding</p>
              <h2 className="text-3xl font-black">{auctionState.currentPlayerName}</h2>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold opacity-90 uppercase tracking-wider">Current Bid</p>
            <p className="text-5xl font-black">{formatCurrency(auctionState.currentBid)}</p>
          </div>
        </div>

        {/* Leading Team */}
        {auctionState.leadingTeamName && (
          <div className="bg-white/20 backdrop-blur-xl rounded-2xl p-6 mb-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users size={24} />
                <div>
                  <p className="text-sm font-bold opacity-90 uppercase">Leading Team</p>
                  <p className="text-2xl font-black">{auctionState.leadingTeamName}</p>
                </div>
              </div>
              {isLeading && (
                <div className="px-6 py-3 bg-green-500 rounded-full font-black uppercase text-sm animate-pulse">
                  You're Leading! 🎯
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bidding Controls (Team Reps Only) */}
        {canBid && (
          <div className="grid grid-cols-3 gap-4">
            {[500000, 1000000, 2000000].map((increment) => {
              const newAmount = auctionState.currentBid + increment;
              const canAfford = newAmount <= teamBudget;
              
              return (
                <button
                  key={increment}
                  onClick={() => placeBid(increment)}
                  disabled={bidding || !canAfford}
                  className={`py-6 rounded-2xl font-black text-2xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                    canAfford 
                      ? 'bg-white text-purple-600 hover:bg-yellow-300' 
                      : 'bg-gray-400 text-gray-600'
                  }`}
                >
                  +{formatCurrency(increment)}
                </button>
              );
            })}
          </div>
        )}

        {/* Budget Display (Team Reps) */}
        {userRole === 'TEAM_REP' && (
          <div className="mt-6 bg-white/10 backdrop-blur-lg rounded-xl p-4 text-white">
            <div className="flex items-center justify-between">
              <span className="font-bold opacity-90">Your Remaining Budget</span>
              <span className="text-2xl font-black">{formatCurrency(teamBudget)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Bid History */}
      <div className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-black flex items-center gap-2">
            <TrendingUp size={20} className="text-blue-500" />
            Live Bid History
          </h3>
          <span className="text-sm font-bold text-gray-500">{bidHistory.length} bids</span>
        </div>

        <div className="space-y-3 max-h-80 overflow-y-auto">
          {bidHistory.length > 0 ? (
            bidHistory.map((bid, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                  index === 0 
                    ? 'bg-blue-50 border-blue-300 scale-105' 
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  {index === 0 && <Zap size={16} className="text-yellow-500 animate-pulse" />}
                  <span className="font-black text-gray-800">{bid.teamName}</span>
                </div>
                <span className="text-2xl font-black text-blue-600">{formatCurrency(bid.amount)}</span>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-400">
              <p className="font-bold">No bids yet</p>
              <p className="text-sm">Be the first to bid!</p>
            </div>
          )}
        </div>
      </div>

      {/* Celebration Overlay */}
      {celebrationVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-none">
          <div className="bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-3xl p-12 text-center animate-bounce">
            <h2 className="text-6xl font-black text-white mb-4">🔨 SOLD! 🔨</h2>
            <p className="text-3xl font-black text-white">{auctionState.currentPlayerName}</p>
            <p className="text-2xl font-bold text-white opacity-90 mt-2">
              {formatCurrency(auctionState.currentBid)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveBiddingPanel;
