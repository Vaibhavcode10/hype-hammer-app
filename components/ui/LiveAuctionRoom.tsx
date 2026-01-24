import React, { useEffect, useState } from 'react';
import { 
  Timer, Users, Gavel, Mic, MicOff, Play, Pause, Square, 
  TrendingUp, DollarSign, Clock, AlertCircle, CheckCircle2, ArrowLeft
} from 'lucide-react';
import { 
  LiveAuctionState, 
  LiveAuctionStatus, 
  UserRole, 
  Player, 
  Team,
  LiveRoomPermissions,
  BidHistoryItem 
} from '../../types';

interface LiveAuctionRoomProps {
  // Core state
  auctionState: LiveAuctionState | null;
  currentPlayer: Player | null;
  teams: Team[];
  
  // User context
  userId: string;
  userRole: UserRole;
  userTeamId?: string;
  
  // Permissions
  permissions: LiveRoomPermissions;
  
  // Timer state (server-controlled)
  remainingSeconds: number;
  
  // Audio state
  auctioneerMicOn: boolean;
  audioStream?: MediaStream;
  
  // Action handlers
  onStartBidding?: (playerId: string, basePrice: number) => void;
  onCloseBidding?: (sold: boolean) => void;
  onPlaceBid?: (amount: number) => void;
  onStartAuction?: () => void;
  onPauseAuction?: () => void;
  onResumeAuction?: () => void;
  onEndAuction?: () => void;
  onToggleMic?: () => void;
  onClose?: () => void;
}

/**
 * LiveAuctionRoom - Shared component for all 5 roles
 * 
 * ONE ROOM. ONE TRUTH. DIFFERENT POWERS.
 * 
 * Admin: Sees everything, controls system
 * Auctioneer: Controls bidding, speaks to all
 * Team Rep: Places bids, watches live
 * Player: Watches their status
 * Guest: Read-only spectator
 */
export const LiveAuctionRoom: React.FC<LiveAuctionRoomProps> = ({
  auctionState,
  currentPlayer,
  teams,
  userId,
  userRole,
  userTeamId,
  permissions,
  remainingSeconds,
  auctioneerMicOn,
  audioStream,
  onStartBidding,
  onCloseBidding,
  onPlaceBid,
  onStartAuction,
  onPauseAuction,
  onResumeAuction,
  onEndAuction,
  onToggleMic,
  onClose
}) => {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [bidAmount, setBidAmount] = useState<number>(0);

  // Bid increments (controlled, not typed)
  const bidIncrements = [
    { label: '+1L', value: 100000 },
    { label: '+5L', value: 500000 },
    { label: '+10L', value: 1000000 },
    { label: '+25L', value: 2500000 },
    { label: '+50L', value: 5000000 }
  ];

  // Format currency
  const formatCurrency = (amount: number): string => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    return `₹${amount.toLocaleString()}`;
  };

  // Format timer
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get user's team
  const userTeam = teams.find(t => t.id === userTeamId);

  // Can user bid?
  const canBid = permissions.canBid && 
                 auctionState?.biddingActive && 
                 auctionState?.status === LiveAuctionStatus.LIVE &&
                 userTeam &&
                 userTeam.remainingBudget > (auctionState?.currentBid || 0);

  return (
    <div className="h-full w-full bg-gradient-to-br from-white via-blue-50 to-cyan-50 text-slate-800 overflow-hidden">
      {/* Header: Timer + Status */}
      <div className="bg-white/95 backdrop-blur-md border-b-2 border-cyan-200 p-4 shadow-lg">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          {/* Left: Status */}
          <div className="flex items-center gap-4">
            {/* Back to Dashboard Button */}
            {onClose && (
              <button
                onClick={onClose}
                className="px-3 py-2 bg-white hover:bg-blue-50 border-2 border-cyan-300 rounded-full flex items-center gap-2 transition-all shadow-md hover:shadow-lg"
              >
                <ArrowLeft size={16} className="text-cyan-600" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Dashboard</span>
              </button>
            )}
            
            <div className={`px-4 py-2 rounded-full font-black uppercase text-xs tracking-wider flex items-center gap-2 ${
              auctionState?.status === LiveAuctionStatus.LIVE ? 'bg-red-100 text-red-600 border-2 border-red-300' :
              auctionState?.status === LiveAuctionStatus.PAUSED ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-300' :
              auctionState?.status === LiveAuctionStatus.READY ? 'bg-blue-100 text-blue-600 border-2 border-blue-300' :
              'bg-gray-100 text-gray-600 border-2 border-gray-300'
            }`}>
              {auctionState?.status === LiveAuctionStatus.LIVE && (
                <>
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  LIVE
                </>
              )}
              {auctionState?.status === LiveAuctionStatus.PAUSED && (
                <>
                  <Pause size={12} />
                  PAUSED
                </>
              )}
              {auctionState?.status === LiveAuctionStatus.READY && (
                <>
                  <Clock size={12} />
                  READY
                </>
              )}
              {auctionState?.status === LiveAuctionStatus.ENDED && (
                <>
                  <CheckCircle2 size={12} />
                  ENDED
                </>
              )}
            </div>

            {/* Auctioneer Mic Indicator */}
            {auctioneerMicOn && (
              <div className="px-3 py-2 bg-green-100 border-2 border-green-300 rounded-full flex items-center gap-2 animate-pulse">
                <Mic size={14} className="text-green-600 animate-pulse" />
                <span className="text-[10px] font-black text-green-700">AUCTIONEER LIVE</span>
              </div>
            )}

            {/* Role Badge */}
            <div className="px-3 py-1.5 bg-cyan-100 border border-cyan-300 rounded-full text-[9px] font-bold text-cyan-700 uppercase tracking-wider">
              {userRole.replace('_', ' ')}
            </div>
          </div>

          {/* Center: Timer */}
          <div className="flex items-center gap-3 bg-white border-2 border-cyan-300 px-6 py-3 rounded-2xl shadow-lg">
            <Timer size={20} className={remainingSeconds < 60 ? 'text-red-500 animate-pulse' : 'text-cyan-600'} />
            <span className={`text-2xl font-mono font-black ${remainingSeconds < 60 ? 'text-red-500' : 'text-slate-800'}`}>
              {formatTime(remainingSeconds)}
            </span>
          </div>

          {/* Right: Admin/Auctioneer Controls */}
          <div className="flex items-center gap-2">
            {/* Admin Controls */}
            {userRole === UserRole.ADMIN && (
              <>
                {auctionState?.status === LiveAuctionStatus.READY && (
                  <button 
                    onClick={onStartAuction}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-bold text-xs flex items-center gap-2 transition-all"
                  >
                    <Play size={14} />
                    START AUCTION
                  </button>
                )}
                {auctionState?.status === LiveAuctionStatus.LIVE && (
                  <button 
                    onClick={onPauseAuction}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg font-bold text-xs flex items-center gap-2 transition-all"
                  >
                    <Pause size={14} />
                    PAUSE
                  </button>
                )}
                {auctionState?.status === LiveAuctionStatus.PAUSED && (
                  <button 
                    onClick={onResumeAuction}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-bold text-xs flex items-center gap-2 transition-all"
                  >
                    <Play size={14} />
                    RESUME
                  </button>
                )}
                <button 
                  onClick={onEndAuction}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold text-xs flex items-center gap-2 transition-all shadow-md"
                >
                  <Square size={14} />
                  END
                </button>
              </>
            )}

            {/* Auctioneer Mic Control */}
            {userRole === UserRole.AUCTIONEER && permissions.canSpeak && (
              <button 
                onClick={onToggleMic}
                className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all shadow-md ${
                  auctioneerMicOn 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
                }`}
              >
                {auctioneerMicOn ? <MicOff size={14} /> : <Mic size={14} />}
                {auctioneerMicOn ? 'MUTE' : 'UNMUTE'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-[1600px] mx-auto h-[calc(100%-80px)] grid grid-cols-12 gap-6 p-6">
        {/* Left Sidebar: Player Info / Activity */}
        <div className="col-span-3 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
          {/* Current Player Card */}
          {currentPlayer && auctionState?.biddingActive && (
            <div className="bg-white rounded-2xl border-2 border-cyan-200 p-6 shadow-xl">
              <h3 className="text-[10px] font-black uppercase text-cyan-600 mb-4 tracking-wider">Current Player</h3>
              
              <div className="w-full aspect-square bg-slate-200 rounded-xl overflow-hidden mb-4 border-2 border-cyan-200">
                {currentPlayer.imageUrl ? (
                  <img src={currentPlayer.imageUrl} alt={currentPlayer.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Users size={48} className="text-slate-500" />
                  </div>
                )}
              </div>

              <h2 className="text-2xl font-black text-slate-800 mb-2">{currentPlayer.name}</h2>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-4">{currentPlayer.roleId}</p>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-400 uppercase">Base Price</span>
                  <span className="text-sm font-bold text-blue-400">{formatCurrency(currentPlayer.basePrice)}</span>
                </div>
                {currentPlayer.nationality && (
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 uppercase">Nationality</span>
                    <span className="text-sm font-bold text-slate-700">{currentPlayer.nationality}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bid History / Activity Feed */}
          <div className="bg-white rounded-2xl border-2 border-cyan-200 p-4 flex-1 shadow-lg">
            <h3 className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-wider flex items-center gap-2">
              <TrendingUp size={12} />
              Live Activity
            </h3>
            
            <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
              {auctionState?.bidHistory && auctionState.bidHistory.length > 0 ? (
                auctionState.bidHistory.slice().reverse().map((bid, idx) => (
                  <div key={idx} className="bg-blue-50 rounded-lg p-3 border border-cyan-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-800">{bid.teamName}</span>
                      <span className="text-xs font-black text-green-400">{formatCurrency(bid.amount)}</span>
                    </div>
                    <div className="text-[9px] text-slate-500">
                      {new Date(bid.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <AlertCircle size={24} className="text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">No bids yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center: Main Bidding Panel */}
        <div className="col-span-6 flex flex-col">
          {auctionState?.biddingActive && currentPlayer ? (
            /* Active Bidding */
            <div className="flex-1 bg-gradient-to-br from-white via-cyan-50 to-blue-100 rounded-3xl border-4 border-cyan-300 p-8 flex flex-col justify-between shadow-2xl">
              {/* Current Bid Display */}
              <div className="text-center">
                <p className="text-sm font-black uppercase text-blue-400 mb-2 tracking-wider">Current Bid</p>
                <div className="text-8xl font-black text-slate-800 mb-4 drop-shadow-2xl tracking-tight">
                  {formatCurrency(auctionState.currentBid)}
                </div>
                
                {auctionState.leadingTeamName && (
                  <div className="inline-block px-6 py-2 bg-green-500/20 border border-green-500/30 rounded-full">
                    <span className="text-lg font-bold text-green-400">{auctionState.leadingTeamName}</span>
                  </div>
                )}
              </div>

              {/* Team Rep: Bid Controls */}
              {userRole === UserRole.TEAM_REP && canBid && (
                <div className="mt-8">
                  <div className="grid grid-cols-5 gap-3 mb-6">
                    {bidIncrements.map(inc => {
                      const nextBid = auctionState.currentBid + inc.value;
                      const canAfford = userTeam && userTeam.remainingBudget >= nextBid;
                      
                      return (
                        <button
                          key={inc.label}
                          onClick={() => onPlaceBid && onPlaceBid(nextBid)}
                          disabled={!canAfford}
                          className={`py-4 rounded-xl font-black text-sm transition-all ${
                            canAfford
                              ? 'bg-cyan-500 hover:bg-cyan-600 text-white shadow-lg hover:shadow-xl hover:scale-105'
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          {inc.label}
                        </button>
                      );
                    })}
                  </div>

                  {userTeam && (
                    <div className="bg-white rounded-xl p-4 border-2 border-cyan-200 shadow-md">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400 uppercase">Remaining Budget</span>
                        <span className="text-lg font-black text-slate-800">{formatCurrency(userTeam.remainingBudget)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Auctioneer: Close Controls */}
              {userRole === UserRole.AUCTIONEER && permissions.canControl && (
                <div className="mt-8 grid grid-cols-2 gap-4">
                  <button
                    onClick={() => onCloseBidding && onCloseBidding(true)}
                    disabled={!auctionState.leadingTeamId}
                    className="py-4 bg-green-500 hover:bg-green-600 text-white disabled:bg-gray-200 disabled:text-gray-400 rounded-xl font-black uppercase text-sm transition-all flex items-center justify-center gap-2 shadow-md"
                  >
                    <Gavel size={16} />
                    SOLD
                  </button>
                  <button
                    onClick={() => onCloseBidding && onCloseBidding(false)}
                    className="py-4 bg-yellow-600 hover:bg-yellow-700 rounded-xl font-black uppercase text-sm transition-all"
                  >
                    UNSOLD
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Waiting State */
            <div className="flex-1 bg-white rounded-3xl border-4 border-dashed border-cyan-200 flex items-center justify-center shadow-lg">
              <div className="text-center">
                <Gavel size={64} className="text-slate-600 mx-auto mb-4" />
                <h3 className="text-2xl font-black text-slate-400 mb-2">Waiting for Bidding</h3>
                <p className="text-sm text-slate-500">
                  {userRole === UserRole.AUCTIONEER ? 'Start bidding for a player' : 'Auctioneer will start soon'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Teams */}
        <div className="col-span-3 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Teams</h3>
          
          {teams.map(team => {
            const isLeading = team.id === auctionState?.leadingTeamId;
            const isUserTeam = team.id === userTeamId;
            
            return (
              <div
                key={team.id}
                className={`bg-slate-800/80 rounded-xl p-4 border transition-all ${
                  isLeading ? 'border-green-500/50 shadow-lg shadow-green-500/20' :
                  isUserTeam ? 'border-blue-500/50' :
                  'border-slate-700/30'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  {team.logo ? (
                    <img src={team.logo} alt={team.name} className="w-10 h-10 rounded-lg" />
                  ) : (
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
                      <Users size={20} className="text-slate-500" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-slate-800">{team.name}</h4>
                    {isLeading && (
                      <span className="text-[9px] font-black text-green-400 uppercase">Leading</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Budget</span>
                    <span className="font-bold text-slate-800">{formatCurrency(team.remainingBudget)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Players</span>
                    <span className="font-bold text-slate-800">{team.players.length}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
