import React, { useEffect, useState } from 'react';
import { 
  Timer, Users, Gavel, Mic, MicOff, Play, Pause, Square, 
  TrendingUp, DollarSign, Clock, AlertCircle, CheckCircle2, ArrowLeft, XCircle,
  Zap, Shield, Award, Activity, Radio, Crown
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
import { isValidImageUrl, createImageErrorHandler } from '../../services/imageUrlValidator';

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
  onMarkUnsold?: () => void;
}

/**
 * LiveAuctionRoom - Sports Broadcast Style Auction Experience
 * 
 * ONE ROOM. ONE TRUTH. DIFFERENT POWERS.
 * 
 * Design: IPL Auction + Esports Dashboard + FIFA Ultimate Team Hybrid
 * Theme: Dark with Neon Pink (#FF2D75) accents
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
  onClose,
  onMarkUnsold
}) => {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [bidPulse, setBidPulse] = useState(false);

  // Trigger pulse animation on bid change
  useEffect(() => {
    if (auctionState?.currentBid) {
      setBidPulse(true);
      const timer = setTimeout(() => setBidPulse(false), 500);
      return () => clearTimeout(timer);
    }
  }, [auctionState?.currentBid]);

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

  // CSS for custom animations and styles
  const customStyles = `
    @keyframes pulseGlow {
      0%, 100% { box-shadow: 0 0 20px rgba(255, 45, 117, 0.4), 0 0 40px rgba(255, 45, 117, 0.2); }
      50% { box-shadow: 0 0 30px rgba(255, 45, 117, 0.6), 0 0 60px rgba(255, 45, 117, 0.3); }
    }
    @keyframes bidFlash {
      0% { transform: scale(1); }
      50% { transform: scale(1.02); }
      100% { transform: scale(1); }
    }
    @keyframes floatUp {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-5px); }
    }
    @keyframes shimmer {
      0% { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
    @keyframes spotlight {
      0%, 100% { opacity: 0.3; }
      50% { opacity: 0.5; }
    }
    @keyframes timerRing {
      0% { stroke-dashoffset: 0; }
      100% { stroke-dashoffset: 283; }
    }
    .pulse-glow { animation: pulseGlow 2s ease-in-out infinite; }
    .bid-flash { animation: bidFlash 0.3s ease-out; }
    .float-animation { animation: floatUp 3s ease-in-out infinite; }
    .shimmer-bg {
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
      background-size: 200% 100%;
      animation: shimmer 2s infinite;
    }
    .neon-border {
      box-shadow: 0 0 10px rgba(255, 45, 117, 0.3), inset 0 0 10px rgba(255, 45, 117, 0.1);
    }
    .glass-panel {
      background: rgba(15, 15, 25, 0.8);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .neon-text {
      text-shadow: 0 0 10px rgba(255, 45, 117, 0.5), 0 0 20px rgba(255, 45, 117, 0.3);
    }
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 45, 117, 0.4); border-radius: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 45, 117, 0.6); }
  `;

  return (
    <div className="h-full w-full overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #0B0B12 0%, #1a1a2e 50%, #16213e 100%)' }}>
      <style>{customStyles}</style>
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Spotlight rays from center */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px]" style={{ opacity: 0.1 }}>
          <div className="absolute inset-0" style={{
            background: 'conic-gradient(from 0deg, transparent, rgba(255, 45, 117, 0.3), transparent, rgba(100, 200, 255, 0.3), transparent)',
            animation: 'spin 20s linear infinite'
          }}></div>
        </div>
        {/* Top gradient */}
        <div className="absolute top-0 left-0 right-0 h-48" style={{ background: 'linear-gradient(180deg, rgba(255, 45, 117, 0.08) 0%, transparent 100%)' }}></div>
        {/* Bottom gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-32" style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.5) 0%, transparent 100%)' }}></div>
      </div>

      {/* Header: Timer + Status */}
      <div className="relative z-20 glass-panel border-b border-white/10 px-6 py-3">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between">
          {/* Left: Status */}
          <div className="flex items-center gap-4">
            {/* Back to Dashboard Button */}
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl flex items-center gap-2 transition-all duration-300 hover:scale-105"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <ArrowLeft size={16} className="text-gray-300" />
                <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Exit</span>
              </button>
            )}
            
            {/* Live Status Badge */}
            <div className={`px-5 py-2 rounded-full font-black uppercase text-xs tracking-widest flex items-center gap-2 transition-all ${
              auctionState?.status === LiveAuctionStatus.LIVE 
                ? 'neon-border' 
                : ''
            }`} style={{
              background: auctionState?.status === LiveAuctionStatus.LIVE 
                ? 'linear-gradient(135deg, rgba(255, 45, 117, 0.3), rgba(255, 100, 150, 0.2))' 
                : auctionState?.status === LiveAuctionStatus.PAUSED 
                ? 'rgba(234, 179, 8, 0.2)' 
                : 'rgba(255,255,255,0.05)',
              border: auctionState?.status === LiveAuctionStatus.LIVE 
                ? '2px solid #FF2D75' 
                : '1px solid rgba(255,255,255,0.1)'
            }}>
              {auctionState?.status === LiveAuctionStatus.LIVE && (
                <>
                  <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: '#FF2D75', boxShadow: '0 0 10px #FF2D75' }} />
                  <span style={{ color: '#FF2D75' }}>LIVE</span>
                </>
              )}
              {auctionState?.status === LiveAuctionStatus.PAUSED && (
                <>
                  <Pause size={12} className="text-yellow-400" />
                  <span className="text-yellow-400">PAUSED</span>
                </>
              )}
              {auctionState?.status === LiveAuctionStatus.READY && (
                <>
                  <Clock size={12} className="text-blue-400" />
                  <span className="text-blue-400">READY</span>
                </>
              )}
              {auctionState?.status === LiveAuctionStatus.ENDED && (
                <>
                  <CheckCircle2 size={12} className="text-green-400" />
                  <span className="text-green-400">ENDED</span>
                </>
              )}
            </div>

            {/* Auctioneer Mic Indicator */}
            {auctioneerMicOn && (
              <div className="px-4 py-2 rounded-full flex items-center gap-2 animate-pulse" style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(16, 185, 129, 0.1))',
                border: '1px solid rgba(16, 185, 129, 0.5)'
              }}>
                <Radio size={14} className="text-emerald-400 animate-pulse" />
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">AUCTIONEER LIVE</span>
              </div>
            )}

            {/* Role Badge */}
            <div className="px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{
              background: 'rgba(255, 45, 117, 0.15)',
              border: '1px solid rgba(255, 45, 117, 0.3)',
              color: '#FF6B9D'
            }}>
              {userRole.replace('_', ' ')}
            </div>
          </div>

          {/* Center: Timer */}
          <div className="flex items-center gap-4 px-8 py-3 rounded-2xl" style={{
            background: 'rgba(0,0,0,0.4)',
            border: remainingSeconds < 60 ? '2px solid #FF2D75' : '1px solid rgba(255,255,255,0.1)',
            boxShadow: remainingSeconds < 60 ? '0 0 20px rgba(255, 45, 117, 0.3)' : 'none'
          }}>
            <Timer size={22} className={remainingSeconds < 60 ? 'text-pink-500 animate-pulse' : 'text-gray-400'} />
            <span className={`text-3xl font-mono font-black tracking-wider ${remainingSeconds < 60 ? 'neon-text' : ''}`} style={{
              color: remainingSeconds < 60 ? '#FF2D75' : '#E5E7EB'
            }}>
              {formatTime(remainingSeconds)}
            </span>
          </div>

          {/* Right: Admin/Auctioneer Controls */}
          <div className="flex items-center gap-3">
            {/* Close Auction Button - Admin & Auctioneer Only */}
            {(userRole === UserRole.ADMIN || userRole === UserRole.AUCTIONEER) && onEndAuction && (
              <button 
                onClick={onEndAuction}
                className="px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all duration-300 hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, #DC2626, #B91C1C)',
                  boxShadow: '0 4px 15px rgba(220, 38, 38, 0.3)'
                }}
              >
                <Square size={14} className="text-white" />
                <span className="text-white">CLOSE AUCTION</span>
              </button>
            )}
            
            {/* Admin Controls */}
            {userRole === UserRole.ADMIN && (
              <>
                {auctionState?.status === LiveAuctionStatus.READY && (
                  <button 
                    onClick={onStartAuction}
                    className="px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all duration-300 hover:scale-105 text-white"
                    style={{
                      background: 'linear-gradient(135deg, #10B981, #059669)',
                      boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
                    }}
                  >
                    <Play size={14} />
                    START AUCTION
                  </button>
                )}
                {auctionState?.status === LiveAuctionStatus.LIVE && (
                  <button 
                    onClick={onPauseAuction}
                    className="px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all duration-300 hover:scale-105 text-white"
                    style={{
                      background: 'linear-gradient(135deg, #EAB308, #CA8A04)',
                      boxShadow: '0 4px 15px rgba(234, 179, 8, 0.3)'
                    }}
                  >
                    <Pause size={14} />
                    PAUSE
                  </button>
                )}
                {auctionState?.status === LiveAuctionStatus.PAUSED && (
                  <button 
                    onClick={onResumeAuction}
                    className="px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all duration-300 hover:scale-105 text-white"
                    style={{
                      background: 'linear-gradient(135deg, #10B981, #059669)',
                      boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
                    }}
                  >
                    <Play size={14} />
                    RESUME
                  </button>
                )}
              </>
            )}

            {/* Auctioneer Mic Control */}
            {userRole === UserRole.AUCTIONEER && permissions.canSpeak && (
              <button 
                onClick={onToggleMic}
                className="px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all duration-300 hover:scale-105"
                style={{
                  background: auctioneerMicOn 
                    ? 'linear-gradient(135deg, #DC2626, #B91C1C)' 
                    : 'rgba(255,255,255,0.1)',
                  border: auctioneerMicOn ? 'none' : '1px solid rgba(255,255,255,0.2)',
                  boxShadow: auctioneerMicOn ? '0 4px 15px rgba(220, 38, 38, 0.3)' : 'none'
                }}
              >
                {auctioneerMicOn ? <MicOff size={14} className="text-white" /> : <Mic size={14} className="text-gray-300" />}
                <span className={auctioneerMicOn ? 'text-white' : 'text-gray-300'}>{auctioneerMicOn ? 'MUTE' : 'UNMUTE'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="relative z-10 max-w-[1800px] mx-auto h-[calc(100%-80px)] grid grid-cols-12 gap-5 p-5">
        {/* Left Sidebar: Activity Feed */}
        <div className="col-span-3 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
          {/* Bid History / Activity Feed */}
          <div className="glass-panel rounded-2xl p-5 flex-1 neon-border">
            <h3 className="text-[11px] font-black uppercase mb-4 tracking-widest flex items-center gap-2" style={{ color: '#FF2D75' }}>
              <Activity size={14} />
              LIVE ACTIVITY
            </h3>
            
            <div className="space-y-3 max-h-[calc(100vh-220px)] overflow-y-auto custom-scrollbar pr-2">
              {auctionState?.bidHistory && auctionState.bidHistory.length > 0 ? (
                auctionState.bidHistory.slice().reverse().map((bid, idx) => (
                  <div 
                    key={idx} 
                    className={`rounded-xl p-4 transition-all duration-300 hover:scale-[1.02] ${idx === 0 ? 'bid-flash' : ''}`}
                    style={{
                      background: idx === 0 
                        ? 'linear-gradient(135deg, rgba(255, 45, 117, 0.2), rgba(255, 100, 150, 0.1))' 
                        : 'rgba(255,255,255,0.03)',
                      border: idx === 0 ? '1px solid rgba(255, 45, 117, 0.4)' : '1px solid rgba(255,255,255,0.05)'
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-gray-200">{bid.teamName}</span>
                      <span className="text-sm font-black" style={{ color: '#FF2D75' }}>{formatCurrency(bid.amount)}</span>
                    </div>
                    <div className="text-[10px] text-gray-500 flex items-center gap-1">
                      <Clock size={10} />
                      {new Date(bid.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(255, 45, 117, 0.1)' }}>
                    <Gavel size={28} className="text-gray-500" />
                  </div>
                  <p className="text-sm text-gray-500 font-medium">Waiting for bids...</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center: Main Auction Stage - Player Focus */}
        <div className="col-span-6 flex flex-col">
          {auctionState?.biddingActive && currentPlayer ? (
            /* Active Bidding - Player on Stage */
            <div className="flex-1 rounded-3xl p-6 flex flex-col relative overflow-hidden" style={{
              background: 'linear-gradient(180deg, rgba(15, 15, 25, 0.9) 0%, rgba(30, 20, 40, 0.95) 100%)',
              border: '2px solid rgba(255, 45, 117, 0.3)',
              boxShadow: '0 0 60px rgba(255, 45, 117, 0.15), inset 0 0 60px rgba(255, 45, 117, 0.05)'
            }}>
              {/* Spotlight Effect */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[400px] pointer-events-none" style={{
                background: 'radial-gradient(ellipse at center, rgba(255, 45, 117, 0.15) 0%, transparent 70%)',
                animation: 'spotlight 3s ease-in-out infinite'
              }}></div>
              
              {/* Stage Floor Reflection */}
              <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none" style={{
                background: 'linear-gradient(0deg, rgba(255, 45, 117, 0.1) 0%, transparent 100%)'
              }}></div>

              {/* Player Image - Center Stage with Glowing Frame */}
              <div className="relative flex-1 flex flex-col items-center justify-center">
                {/* Hexagonal Glow Frame */}
                <div className={`relative mb-6 ${auctionState.leadingTeamId ? 'float-animation' : ''}`}>
                  <div className="absolute -inset-3 rounded-full opacity-60" style={{
                    background: 'linear-gradient(135deg, #FF2D75, #FF6B9D, #FF2D75)',
                    filter: 'blur(20px)',
                    animation: 'pulseGlow 2s ease-in-out infinite'
                  }}></div>
                  <div className="absolute -inset-1 rounded-full" style={{
                    background: 'linear-gradient(135deg, #FF2D75, #FF6B9D)',
                    padding: '3px'
                  }}></div>
                  <div className="relative w-44 h-44 rounded-full overflow-hidden" style={{
                    background: 'linear-gradient(135deg, #1a1a2e, #0B0B12)',
                    border: '4px solid rgba(255, 45, 117, 0.5)'
                  }}>
                    {currentPlayer?.imageUrl && isValidImageUrl(currentPlayer.imageUrl) ? (
                      <img 
                        src={currentPlayer.imageUrl} 
                        alt={currentPlayer.name}
                        className="w-full h-full object-cover"
                        onError={createImageErrorHandler('player image', currentPlayer.imageUrl)}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Users size={60} className="text-gray-600" />
                      </div>
                    )}
                  </div>
                  
                  {/* Live Badge */}
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider animate-pulse" style={{
                    background: 'linear-gradient(135deg, #FF2D75, #FF6B9D)',
                    boxShadow: '0 0 15px rgba(255, 45, 117, 0.5)'
                  }}>
                    <span className="text-white flex items-center gap-1">
                      <Zap size={10} /> LIVE
                    </span>
                  </div>
                </div>

                {/* Player Name & Role */}
                <h2 className="text-3xl font-black text-white mb-2 text-center tracking-wide uppercase" style={{
                  textShadow: '0 0 20px rgba(255, 45, 117, 0.5)'
                }}>
                  {currentPlayer.name}
                </h2>
                <div className="flex items-center gap-3 mb-6">
                  <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider" style={{
                    background: 'rgba(100, 200, 255, 0.15)',
                    border: '1px solid rgba(100, 200, 255, 0.3)',
                    color: '#64C8FF'
                  }}>
                    {currentPlayer.roleId}
                  </span>
                  {currentPlayer.status === 'UNSOLD' && currentPlayer.unsoldCount && currentPlayer.unsoldCount > 0 && (
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase" style={{
                      background: 'rgba(234, 179, 8, 0.2)',
                      border: '1px solid rgba(234, 179, 8, 0.4)',
                      color: '#EAB308'
                    }}>
                      Re-Auction ({currentPlayer.unsoldCount}x)
                    </span>
                  )}
                </div>

                {/* Current Bid Display */}
                <div className={`text-center mb-6 ${bidPulse ? 'bid-flash' : ''}`}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#FF6B9D' }}>CURRENT BID</p>
                  <div className="text-7xl font-black tracking-tight" style={{
                    background: 'linear-gradient(135deg, #FF2D75, #FF6B9D, #FFB6C1)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    textShadow: '0 0 40px rgba(255, 45, 117, 0.3)'
                  }}>
                    {formatCurrency(auctionState.currentBid)}
                  </div>
                </div>

                {/* Leading Team Badge */}
                {auctionState.leadingTeamName && (
                  <div className="px-6 py-3 rounded-2xl flex items-center gap-3" style={{
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.1))',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    boxShadow: '0 0 20px rgba(16, 185, 129, 0.2)'
                  }}>
                    <Crown size={18} className="text-emerald-400" />
                    <span className="text-lg font-bold text-emerald-400">{auctionState.leadingTeamName}</span>
                  </div>
                )}
              </div>

              {/* Team Rep: Bid Controls */}
              {userRole === UserRole.TEAM_REP && canBid && (
                <div className="mt-6 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <div className="grid grid-cols-5 gap-3 mb-5">
                    {bidIncrements.map(inc => {
                      const nextBid = auctionState.currentBid + inc.value;
                      const canAfford = userTeam && userTeam.remainingBudget >= nextBid;
                      
                      return (
                        <button
                          key={inc.label}
                          onClick={() => onPlaceBid && onPlaceBid(nextBid)}
                          disabled={!canAfford}
                          className="py-4 rounded-xl font-black text-sm transition-all duration-300 hover:scale-105"
                          style={{
                            background: canAfford 
                              ? 'linear-gradient(135deg, #FF2D75, #FF6B9D)' 
                              : 'rgba(255,255,255,0.05)',
                            color: canAfford ? 'white' : '#666',
                            boxShadow: canAfford ? '0 4px 20px rgba(255, 45, 117, 0.4)' : 'none',
                            cursor: canAfford ? 'pointer' : 'not-allowed'
                          }}
                        >
                          {inc.label}
                        </button>
                      );
                    })}
                  </div>

                  {userTeam && (
                    <div className="rounded-xl p-4" style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-400 uppercase tracking-wider">Your Budget</span>
                        <span className="text-xl font-black text-white">{formatCurrency(userTeam.remainingBudget)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Auctioneer: Close Controls */}
              {userRole === UserRole.AUCTIONEER && permissions.canControl && (
                <div className="mt-6 pt-6 grid grid-cols-2 gap-4" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <button
                    onClick={() => onCloseBidding && onCloseBidding(true)}
                    disabled={!auctionState.leadingTeamId}
                    className="py-4 rounded-xl font-black uppercase text-sm transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
                    style={{
                      background: auctionState.leadingTeamId 
                        ? 'linear-gradient(135deg, #10B981, #059669)' 
                        : 'rgba(255,255,255,0.05)',
                      color: auctionState.leadingTeamId ? 'white' : '#666',
                      boxShadow: auctionState.leadingTeamId ? '0 4px 20px rgba(16, 185, 129, 0.4)' : 'none',
                      cursor: auctionState.leadingTeamId ? 'pointer' : 'not-allowed'
                    }}
                  >
                    <Gavel size={18} />
                    SOLD
                  </button>
                  <button
                    onClick={() => onMarkUnsold && onMarkUnsold()}
                    className="py-4 rounded-xl font-black uppercase text-sm transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2 text-white"
                    style={{
                      background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                      boxShadow: '0 4px 20px rgba(245, 158, 11, 0.4)'
                    }}
                  >
                    <XCircle size={18} />
                    UNSOLD
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Waiting State - Stylish Empty Stage */
            <div className="flex-1 rounded-3xl flex items-center justify-center relative overflow-hidden" style={{
              background: 'linear-gradient(180deg, rgba(15, 15, 25, 0.9) 0%, rgba(30, 20, 40, 0.95) 100%)',
              border: '2px dashed rgba(255, 45, 117, 0.3)'
            }}>
              {/* Subtle spotlight effect */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] pointer-events-none" style={{
                background: 'radial-gradient(ellipse at center, rgba(255, 45, 117, 0.08) 0%, transparent 70%)'
              }}></div>
              
              <div className="text-center relative z-10">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center" style={{
                  background: 'linear-gradient(135deg, rgba(255, 45, 117, 0.1), rgba(255, 100, 150, 0.05))',
                  border: '2px solid rgba(255, 45, 117, 0.2)'
                }}>
                  <Gavel size={40} style={{ color: '#FF6B9D' }} />
                </div>
                <h3 className="text-2xl font-black text-gray-300 mb-3 tracking-wide">AWAITING PLAYER</h3>
                <p className="text-sm text-gray-500 max-w-xs mx-auto">
                  {userRole === UserRole.AUCTIONEER ? 'Select a player to begin bidding' : 'The auctioneer will start bidding soon'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Teams Panel */}
        <div className="col-span-3 flex flex-col gap-4 overflow-hidden">
          <div className="glass-panel rounded-2xl p-5 flex-1 neon-border overflow-hidden flex flex-col">
            <h3 className="text-[11px] font-black uppercase mb-4 tracking-widest flex items-center gap-2 flex-shrink-0" style={{ color: '#FF2D75' }}>
              <Shield size={14} />
              TEAMS ({teams.length})
            </h3>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
              {teams.map(team => {
                const isLeading = team.id === auctionState?.leadingTeamId;
                const isUserTeam = team.id === userTeamId;
                const initialBudget = team.budget || team.initialBudget || 0;
                const remainingBudget = team.remainingBudget ?? initialBudget;
                const budgetPercentage = initialBudget > 0 ? (remainingBudget / initialBudget) * 100 : 100;
                const squadSlots = team.maxPlayers || 11;
                const filledSlots = team.players?.length || team.playerIds?.length || 0;
                
                return (
                  <div
                    key={team.id}
                    className={`rounded-xl p-4 transition-all duration-300 hover:scale-[1.02] ${isLeading ? 'pulse-glow' : ''}`}
                    style={{
                      background: isLeading 
                        ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05))'
                        : isUserTeam 
                        ? 'linear-gradient(135deg, rgba(100, 200, 255, 0.1), rgba(100, 200, 255, 0.05))'
                        : 'rgba(255,255,255,0.03)',
                      border: isLeading 
                        ? '1px solid rgba(16, 185, 129, 0.5)'
                        : isUserTeam 
                        ? '1px solid rgba(100, 200, 255, 0.3)'
                        : '1px solid rgba(255,255,255,0.05)'
                    }}
                  >
                    {/* Team Header */}
                    <div className="flex items-center gap-3 mb-3">
                      {/* Logo with neon ring */}
                      <div className="relative">
                        <div className="absolute -inset-1 rounded-xl opacity-50" style={{
                          background: isLeading 
                            ? 'linear-gradient(135deg, #10B981, #059669)' 
                            : 'linear-gradient(135deg,#FF2D75, #FF6B9D)',
                          filter: 'blur(4px)'
                        }}></div>
                        {team.logo && isValidImageUrl(team.logo) ? (
                          <img 
                            src={team.logo} 
                            alt={team.name} 
                            className="relative w-11 h-11 rounded-lg object-cover" 
                            style={{
                              border: '2px solid rgba(255,255,255,0.2)'
                            }}
                            onError={createImageErrorHandler('team logo', team.logo)}
                          />
                        ) : (
                          <div className="relative w-11 h-11 rounded-lg flex items-center justify-center" style={{
                            background: 'linear-gradient(135deg, #FF2D75, #FF6B9D)',
                            border: '2px solid rgba(255,255,255,0.2)'
                          }}>
                            <Shield size={20} className="text-white" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-gray-200 truncate">{team.name}</h4>
                        {isLeading && (
                          <span className="text-[9px] font-black uppercase flex items-center gap-1" style={{ color: '#10B981' }}>
                            <Crown size={10} /> LEADING
                          </span>
                        )}
                        {isUserTeam && !isLeading && (
                          <span className="text-[9px] font-bold uppercase" style={{ color: '#64C8FF' }}>YOUR TEAM</span>
                        )}
                      </div>
                    </div>

                    {/* Budget Bar */}
                    <div className="mb-3">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider">Budget</span>
                        <span className="text-xs font-bold text-gray-300">{formatCurrency(remainingBudget)}</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${budgetPercentage}%`,
                            background: budgetPercentage > 50 
                              ? 'linear-gradient(90deg, #10B981, #34D399)' 
                              : budgetPercentage > 25 
                              ? 'linear-gradient(90deg, #F59E0B, #FBBF24)'
                              : 'linear-gradient(90deg, #EF4444, #F87171)'
                          }}
                        ></div>
                      </div>
                    </div>

                    {/* Squad Slots */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider">Squad</span>
                        <span className="text-[10px] font-bold text-gray-400">{filledSlots}/{squadSlots}</span>
                      </div>
                      <div className="flex gap-1">
                        {Array.from({ length: squadSlots }).map((_, idx) => (
                          <div 
                            key={idx}
                            className="flex-1 h-1.5 rounded-full transition-all duration-300"
                            style={{
                              background: idx < filledSlots 
                                ? 'linear-gradient(90deg, #FF2D75, #FF6B9D)' 
                                : 'rgba(255,255,255,0.1)'
                            }}
                          ></div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
