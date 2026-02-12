import React, { useState } from 'react';
import { 
  Timer, Users, Gavel, Mic, MicOff, Play, Pause, Square, 
  TrendingUp, DollarSign, Clock, AlertCircle, CheckCircle2, ArrowLeft, XCircle,
  Zap, Shield, Award, Activity, Radio, Crown, Trophy, Target, Calendar, Hash
} from 'lucide-react';
import { isValidImageUrl } from '../../services/imageUrlValidator';
import { 
  LiveAuctionState, 
  LiveAuctionStatus, 
  UserRole, 
  Player, 
  Team,
  LiveRoomPermissions,
  BidHistoryItem 
} from '../../types';

interface AuctioneerLiveRoomProps {
  auctionState: LiveAuctionState | null;
  currentPlayer: Player | null;
  allPlayers: Player[];
  teams: Team[];
  userId: string;
  userRole: UserRole;
  remainingSeconds: number;
  auctioneerMicOn: boolean;
  permissions: LiveRoomPermissions;
  onStartAuction?: () => void;
  onPauseAuction?: () => void;
  onResumeAuction?: () => void;
  onEndAuction?: () => void;
  onToggleMic?: () => void;
  onClose?: () => void;
  onCloseBidding?: (sold: boolean) => void;
  onMarkUnsold?: () => void;
  onPlaceBid?: (teamId: string, incrementAmount: number) => void;
  onDirectSell?: (teamId: string) => void;
  currentMatch?: { id: string } | null;
}

/**
 * AuctioneerLiveRoom - Game HUD / Broadcast Hybrid Layout
 * FIFA-style player card with esports tournament screen aesthetics
 */
export const AuctioneerLiveRoom: React.FC<AuctioneerLiveRoomProps> = ({
  auctionState,
  currentPlayer,
  allPlayers,
  teams,
  userId,
  userRole,
  remainingSeconds,
  auctioneerMicOn,
  permissions,
  onStartAuction,
  onPauseAuction,
  onResumeAuction,
  onEndAuction,
  onToggleMic,
  onClose,
  onCloseBidding,
  onMarkUnsold,
  onPlaceBid,
  onDirectSell,
  currentMatch
}) => {
  // Custom bid state per team
  const [customBidAmounts, setCustomBidAmounts] = useState<Record<string, string>>({});

  const handleCustomBidChange = (teamId: string, value: string) => {
    // Allow only numbers and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setCustomBidAmounts(prev => ({ ...prev, [teamId]: value }));
    }
  };

  const handleCustomBidSubmit = (teamId: string, remainingBudget: number, currentBid: number) => {
    const bidValue = parseFloat(customBidAmounts[teamId] || '0');
    if (!bidValue || bidValue <= 0) {
      alert('Please enter a valid increment amount (e.g., 1 for +₹1L, 5 for +₹5L)');
      return;
    }

    // Convert lakhs to actual increment amount (e.g., 1 = ₹1,00,000 increment)
    const incrementAmount = bidValue * 100000;
    
    // Calculate new total bid
    const newTotalBid = currentBid + incrementAmount;
    
    // Check if team can afford the new total bid
    if (newTotalBid > remainingBudget) {
      alert(`Team cannot afford ₹${(newTotalBid / 100000).toFixed(1)}L (₹${newTotalBid.toLocaleString()})\nCurrent Bid: ₹${(currentBid / 100000).toFixed(1)}L\nIncrement: +₹${bidValue}L\nRemaining Budget: ₹${(remainingBudget / 100000).toFixed(1)}L`);
      return;
    }

    console.log(`✅ Placing custom bid increment: +₹${bidValue}L → New bid: ₹${(newTotalBid / 100000).toFixed(1)}L (₹${newTotalBid.toLocaleString()}) for team ${teamId}`);
    onPlaceBid?.(teamId, incrementAmount);
    setCustomBidAmounts(prev => ({ ...prev, [teamId]: '' }));
  };
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatBudget = (amount: number): string => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    return `₹${amount.toLocaleString()}`;
  };

  const formatCurrency = (amount: number): string => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    return `₹${amount.toLocaleString()}`;
  };

  // Calculate stats
  const remainingPlayers = allPlayers.filter(p => p.status !== 'SOLD').length;
  const soldPlayers = allPlayers.filter(p => p.status === 'SOLD').length;
  const leadingTeam = auctionState?.leadingTeamId 
    ? teams.find(t => t.id === auctionState.leadingTeamId)
    : null;
  const currentBid = auctionState?.currentBid || auctionState?.currentBidAmount || currentPlayer?.basePrice || 0;
  const maxBudget = Math.max(...teams.map(t => t.remainingBudget || 0));

  // Calculate dynamic card width based on total players to fit in screen
  const totalBottomPlayers = allPlayers.filter(p => p.status === 'UNSOLD' || p.status === 'AVAILABLE').length;
  const calculateCardWidth = () => {
    if (totalBottomPlayers === 0) return 140;
    // Return fixed size for visibility
    return 140; // Optimized card width
  };

  // Ref for scrolling player cards
  const playerCardsRef = React.useRef<HTMLDivElement>(null);
  
  const scrollPlayerCards = (direction: 'left' | 'right') => {
    if (playerCardsRef.current) {
      const scrollAmount = 300;
      playerCardsRef.current.scrollBy({
        left: direction === 'right' ? scrollAmount : -scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="w-full h-screen overflow-hidden relative bg-black">
      {/* Premium Dark Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-black to-gray-900">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-900/5 via-transparent to-transparent"></div>
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)',
        }}></div>
      </div>

      {/* Back Button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-50 flex items-center gap-2 px-3 py-1.5 
                     bg-black/90 backdrop-blur-sm border border-red-500/40 rounded
                     text-red-400 hover:text-red-300 hover:border-red-400/60
                     transition-all duration-200 text-sm font-semibold
                     shadow-[0_0_12px_rgba(239,68,68,0.15)]"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
      )}

      <div className="relative z-10 h-full flex flex-col">
        
        {/* 🥇 1️⃣ TOP HEADER BAR - Full Width Tournament Banner */}
        <div className="flex items-center justify-between px-6 py-3 
                        bg-gradient-to-r from-black/95 via-black/90 to-black/95 backdrop-blur-sm
                        border-b border-red-500/30 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
          
          {/* Left: Auction Branding */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-red-600/90 rounded border border-red-400/50 
                            shadow-[0_0_15px_rgba(239,68,68,0.4)]">
              <Radio size={14} className="animate-pulse" />
              <span className="text-white text-xs font-bold tracking-wider">LIVE</span>
            </div>
            <div>
              <div className="text-red-400 font-black text-lg tracking-wider uppercase 
                              drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]">
                IPL Player Auction 2026
              </div>
              <div className="text-gray-500 text-xs font-semibold tracking-wide">
                Premium Player Bidding
              </div>
            </div>
          </div>

          {/* Right: Meta Stats */}
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
                Available Players
              </div>
              <div className="text-red-400 font-black text-xl tabular-nums">
                {remainingPlayers}
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
                Available Teams
              </div>
              <div className="text-red-400 font-black text-xl tabular-nums">
                {teams.length}
              </div>
            </div>
            
          </div>
        </div>

        {currentPlayer ? (
          <div className="flex-1 flex flex-col min-h-0 relative">
            
            {/* 🧍 2️⃣ MAIN PLAYER PROFILE ZONE - 3-Column Layout */}
            <div className="flex-1 flex gap-4 px-6 py-6 pr-[560px] min-h-0">
              
              {/* Left: Player Visual Identity (Square Card) - Compact */}
              <div className="flex flex-col items-center justify-center gap-4 w-64 flex-shrink-0">
                <div className="relative w-full aspect-[11/12]">
                  {/* Glow Effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 via-transparent to-red-500/20 
                                  blur-xl scale-110"></div>
                  
                  {/* Player Card Frame - Rounded Rectangle */}
                  <div className="relative w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-black
                                  border-2 border-red-500/60 rounded-2xl overflow-hidden
                                  shadow-[0_0_30px_rgba(239,68,68,0.3)]">
                    
                    {/* Player Image */}
                    <img
                      src={currentPlayer.imageUrl || `/api/placeholder/300/400`}
                      alt={currentPlayer.name}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                    
                    {/* Player Name Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-center">
                      <h1 className="text-2xl font-black text-white mb-1 tracking-tight
                                     drop-shadow-[0_0_20px_rgba(0,0,0,0.9)]">
                        {currentPlayer.name}
                      </h1>
                      <div className="flex items-center justify-center gap-2 text-red-300">
                        <Shield size={14} />
                        <span className="font-bold text-sm">{currentPlayer.role || 'Player'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* UNSOLD BUTTON - Alert/Warning Terminal */}
                {auctionState?.biddingActive && onCloseBidding && (
                  <button
                    onClick={() => onCloseBidding(false)}
                    className="group relative
                               hover:scale-[1.05] active:scale-95
                               transition-all duration-300"
                    style={{
                      width: '160px',
                      height: '80px',
                      filter: 'drop-shadow(0 4px 20px rgba(239, 68, 68, 0.5))'
                    }}
                  >
                    {/* Outer Danger Glow */}
                    <div className="absolute -inset-2 bg-gradient-to-r from-red-500/40 via-orange-500/40 to-red-500/40 blur-xl animate-pulse rounded-lg" />
                    
                    {/* Main Angular Frame */}
                    <div 
                      className="absolute inset-0"
                      style={{
                        background: 'linear-gradient(135deg, rgba(25, 5, 5, 0.98) 0%, rgba(40, 10, 5, 0.96) 50%, rgba(25, 5, 5, 0.98) 100%)',
                        clipPath: 'polygon(16px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 16px), calc(100% - 16px) 100%, 8px 100%, 0 calc(100% - 8px), 0 16px)',
                        border: '3px solid rgba(239, 68, 68, 0.8)',
                        boxShadow: '0 0 40px rgba(239, 68, 68, 0.7), inset 0 0 30px rgba(239, 68, 68, 0.15), inset 0 -5px 20px rgba(0, 0, 0, 0.6)'
                      }}
                    />
                    
                    {/* Danger Stripes Animation */}
                    <div 
                      className="absolute inset-0 opacity-15"
                      style={{
                        backgroundImage: 'repeating-linear-gradient(45deg, transparent 0px, transparent 8px, rgba(239, 68, 68, 0.4) 8px, rgba(239, 68, 68, 0.4) 16px)',
                        clipPath: 'polygon(16px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 16px), calc(100% - 16px) 100%, 8px 100%, 0 calc(100% - 8px), 0 16px)',
                        animation: 'stripeMove 1s linear infinite'
                      }}
                    />
                    
                    {/* LED Accent Strips */}
                    <div className="absolute top-0 left-8 right-8 h-1 bg-gradient-to-r from-transparent via-red-400 to-transparent animate-pulse" 
                         style={{ boxShadow: '0 0 10px rgba(239, 68, 68, 0.9)' }} />
                    <div className="absolute bottom-0 left-8 right-8 h-1 bg-gradient-to-r from-transparent via-orange-400 to-transparent animate-pulse" 
                         style={{ boxShadow: '0 0 10px rgba(239, 68, 68, 0.9)', animationDelay: '0.5s' }} />
                    <div className="absolute left-0 top-8 bottom-8 w-1 bg-gradient-to-b from-transparent via-red-400 to-transparent animate-pulse" 
                         style={{ boxShadow: '0 0 10px rgba(239, 68, 68, 0.9)', animationDelay: '0.25s' }} />
                    <div className="absolute right-0 top-8 bottom-8 w-1 bg-gradient-to-b from-transparent via-orange-400 to-transparent animate-pulse" 
                         style={{ boxShadow: '0 0 10px rgba(239, 68, 68, 0.9)', animationDelay: '0.75s' }} />
                    
                    {/* Corner Cutouts */}
                    <div className="absolute top-0 left-0 w-5 h-5 border-l-[3px] border-t-[3px] border-red-300 animate-pulse" 
                         style={{ boxShadow: '0 0 15px rgba(239, 68, 68, 0.9)' }} />
                    <div className="absolute top-0 right-0 w-4 h-4 border-r-[3px] border-t-[3px] border-orange-300 animate-pulse" 
                         style={{ boxShadow: '0 0 15px rgba(239, 68, 68, 0.9)', animationDelay: '0.2s' }} />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-l-[3px] border-b-[3px] border-red-300 animate-pulse" 
                         style={{ boxShadow: '0 0 15px rgba(239, 68, 68, 0.9)', animationDelay: '0.4s' }} />
                    <div className="absolute bottom-0 right-0 w-5 h-5 border-r-[3px] border-b-[3px] border-orange-300 animate-pulse" 
                         style={{ boxShadow: '0 0 15px rgba(239, 68, 68, 0.9)', animationDelay: '0.6s' }} />
                    
                    {/* Content Container */}
                    <div className="relative h-full flex flex-col items-center justify-center gap-2 px-3">
                      {/* Alert Icon */}
                      <div className="relative">
                        <div className="absolute inset-0 bg-red-500/30 blur-xl rounded-full" />
                        <XCircle size={24} className="relative text-red-300 animate-pulse" 
                                 style={{ 
                                   filter: 'drop-shadow(0 0 12px rgba(239, 68, 68, 1)) drop-shadow(0 0 24px rgba(239, 68, 68, 0.6))',
                                   strokeWidth: 2.5
                                 }} />
                      </div>
                      
                      {/* Warning Label */}
                      <div className="px-4 py-1.5 rounded-lg"
                           style={{
                             background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.4) 0%, rgba(249, 115, 22, 0.6) 50%, rgba(239, 68, 68, 0.4) 100%)',
                             border: '2px solid rgba(239, 68, 68, 0.6)',
                             boxShadow: '0 0 20px rgba(239, 68, 68, 0.8), inset 0 0 15px rgba(255, 255, 255, 0.1)'
                           }}>
                        <span className="text-red-100 font-black text-sm uppercase tracking-[0.25em]"
                              style={{ 
                                textShadow: '0 0 15px rgba(255, 255, 255, 0.8), 0 0 30px rgba(239, 68, 68, 0.9), 0 2px 10px rgba(0, 0, 0, 1)',
                                fontFamily: 'monospace'
                              }}>
                          UNSOLD
                        </span>
                      </div>
                    </div>
                    
                    {/* Warning Pulse Overlay */}
                    <div 
                      className="absolute inset-0 opacity-20 pointer-events-none"
                      style={{
                        background: 'radial-gradient(circle at center, rgba(239, 68, 68, 0.3) 0%, transparent 70%)',
                        animation: 'dangerPulse 2s ease-in-out infinite',
                        clipPath: 'polygon(16px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 16px), calc(100% - 16px) 100%, 8px 100%, 0 calc(100% - 8px), 0 16px)'
                      }}
                    />
                  </button>
                )}
              </div>

              {/* Center: Player Data Blocks (Info Panels) */}
              <div className="flex-1 flex flex-col gap-4 overflow-y-auto hide-scrollbar min-w-0">
                
                {/* Info Panels Grid */}
                <div className="grid grid-cols-2 gap-4">
                  
                  {/* History Panel */}
                  <div className="p-5 bg-gradient-to-br from-red-900/20 to-black/90 backdrop-blur-sm
                                  border border-red-400/40 rounded-lg
                                  shadow-[0_0_20px_rgba(239,68,68,0.15)]">
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-red-400/30">
                      <Trophy size={18} className="text-red-400" />
                      <h3 className="text-red-300 font-black text-sm uppercase tracking-wider">
                        Player Profile
                      </h3>
                    </div>
                    <div className="space-y-3 text-sm">
                      {currentPlayer.age && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Age</span>
                          <span className="text-gray-200 font-semibold">{currentPlayer.age} years</span>
                        </div>
                      )}
                      {currentPlayer.gender && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Gender</span>
                          <span className="text-gray-200 font-semibold">{currentPlayer.gender}</span>
                        </div>
                      )}
                      {currentPlayer.nationality && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Nationality</span>
                          <span className="text-gray-200 font-semibold">{currentPlayer.nationality}</span>
                        </div>
                      )}
                      {currentPlayer.isOverseas !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Player Type</span>
                          <span className="text-red-400 font-bold">{currentPlayer.isOverseas ? 'International' : 'Domestic'}</span>
                        </div>
                      )}
                      {!(currentPlayer.age || currentPlayer.gender || currentPlayer.nationality || currentPlayer.isOverseas !== undefined) && (
                        <div className="text-center py-2">
                          <span className="text-gray-500 text-xs">No profile data available</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Achievements Panel */}
                  <div className="p-5 bg-gradient-to-br from-red-900/20 to-black/90 backdrop-blur-sm
                                  border border-red-400/40 rounded-lg
                                  shadow-[0_0_20px_rgba(239,68,68,0.15)]">
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-red-400/30">
                      <Award size={18} className="text-red-400" />
                      <h3 className="text-red-300 font-black text-sm uppercase tracking-wider">
                        Playing Style
                      </h3>
                    </div>
                    <div className="space-y-3 text-sm">
                      {currentPlayer.battingStyle && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Batting</span>
                          <span className="text-gray-200 font-semibold">{currentPlayer.battingStyle}</span>
                        </div>
                      )}
                      {currentPlayer.bowlingStyle && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Bowling</span>
                          <span className="text-gray-200 font-semibold">{currentPlayer.bowlingStyle}</span>
                        </div>
                      )}
                      {currentPlayer.experienceLevel && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Experience</span>
                          <span className="text-red-400 font-bold">{currentPlayer.experienceLevel}</span>
                        </div>
                      )}
                      {currentPlayer.playerCategory && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Category</span>
                          <span className="text-red-400 font-bold">{currentPlayer.playerCategory}</span>
                        </div>
                      )}
                      {!(currentPlayer.battingStyle || currentPlayer.bowlingStyle || currentPlayer.experienceLevel || currentPlayer.playerCategory) && (
                        <div className="text-center py-2">
                          <span className="text-gray-500 text-xs">No style data available</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3 COMPACT HUD CARDS - Gaming Style */}
                <div className="flex items-center justify-center gap-6 mt-8">
                  
                  {/* CARD 1: BASE PRICE - Red HUD Style */}
                  <div 
                    className="relative overflow-hidden"
                    style={{
                      width: '165px',
                      height: '105px',
                      background: 'linear-gradient(135deg, rgba(20, 5, 5, 0.95) 0%, rgba(35, 10, 10, 0.95) 100%)',
                      clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)',
                      border: '1.5px solid rgba(239, 68, 68, 0.4)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '14px'
                    }}
                  >
                    <span style={{ fontSize: '9px', color: 'rgba(239, 68, 68, 0.7)', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase' }}>
                      BASE PRICE
                    </span>
                    <span style={{ fontSize: '18px', color: '#EF4444', fontWeight: '900', marginTop: '6px', textShadow: '0 0 10px rgba(239, 68, 68, 0.6)' }}>
                      {formatCurrency(currentPlayer.basePrice || 0)}
                    </span>
                  </div>

                  {/* CARD 2: TEAM - Center with Logo */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    {leadingTeam?.logo && isValidImageUrl(leadingTeam.logo) ? (
                      <img 
                        src={leadingTeam.logo} 
                        alt={leadingTeam.name} 
                        className="h-12 w-auto object-contain"
                        style={{ filter: 'drop-shadow(0 0 10px rgba(239, 68, 68, 0.5))' }}
                      />
                    ) : (
                      <Crown size={32} className="text-red-400" style={{ filter: 'drop-shadow(0 0 10px rgba(239, 68, 68, 0.5))' }} />
                    )}
                    <span style={{ fontSize: '13px', color: 'rgba(239, 68, 68, 0.9)', fontWeight: '700', letterSpacing: '0.5px', textAlign: 'center' }}>
                      {leadingTeam?.name || 'NO TEAM'}
                    </span>
                  </div>

                  {/* CARD 3: CURRENT BID - Red Pulsing HUD */}
                  <div 
                    className="relative overflow-hidden"
                    style={{
                      width: '165px',
                      height: '105px',
                      background: 'linear-gradient(135deg, rgba(30, 10, 10, 0.98) 0%, rgba(40, 15, 15, 0.98) 100%)',
                      clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)',
                      border: '1.5px solid rgba(239, 68, 68, 0.6)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '14px'
                    }}
                  >
                    <span style={{ fontSize: '9px', color: 'rgba(239, 68, 68, 0.8)', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                      LIVE BID
                    </span>
                    <span style={{ fontSize: '18px', color: '#EF4444', fontWeight: '900', marginTop: '6px', textShadow: '0 0 15px rgba(239, 68, 68, 0.8), 0 0 30px rgba(239, 68, 68, 0.5)' }}>
                      {formatCurrency(currentBid)}
                    </span>
                  </div>

                </div>
              </div>

              {/* Right: AUCTION WAR ROOM - Championship Bidding Console */}
              <div className="absolute top-0 right-0 bottom-0 w-[540px] flex flex-col gap-3 px-6 py-6">
                {/* SOLD TO Button - Premium Esports Championship Style */}
                {auctionState?.biddingActive && onCloseBidding && (
                  <button
                    onClick={() => onCloseBidding(true)}
                    className="group relative w-full
                               hover:scale-[1.02] active:scale-95
                               transition-all duration-300"
                    style={{
                      height: '50px',
                      filter: 'drop-shadow(0 4px 20px rgba(34, 197, 94, 0.5))'
                    }}
                  >
                    {/* Outer Glow Pulse */}
                    <div className="absolute -inset-2 bg-gradient-to-r from-red-500/40 via-red-400/40 to-red-500/40 blur-xl animate-pulse rounded-lg" />
                    
                    {/* Main Angular Frame */}
                    <div 
                      className="absolute inset-0"
                      style={{
                        background: 'linear-gradient(135deg, rgba(20, 5, 10, 0.98) 0%, rgba(25, 10, 15, 0.96) 50%, rgba(20, 5, 10, 0.98) 100%)',
                        clipPath: 'polygon(20px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 20px), calc(100% - 20px) 100%, 8px 100%, 0 calc(100% - 8px), 0 20px)',
                        border: '3px solid rgba(239, 68, 68, 0.8)',
                        boxShadow: '0 0 40px rgba(239, 68, 68, 0.7), inset 0 0 30px rgba(239, 68, 68, 0.15), inset 0 -5px 20px rgba(0, 0, 0, 0.6)'
                      }}
                    />
                    
                    {/* Animated Scan Lines */}
                    <div 
                      className="absolute inset-0 opacity-20"
                      style={{
                        backgroundImage: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(239, 68, 68, 0.3) 2px, rgba(239, 68, 68, 0.3) 4px)',
                        clipPath: 'polygon(20px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 20px), calc(100% - 20px) 100%, 8px 100%, 0 calc(100% - 8px), 0 20px)',
                        animation: 'scan 2s linear infinite'
                      }}
                    />
                    
                    {/* LED Accent Strips */}
                    <div className="absolute top-0 left-8 right-8 h-1 bg-gradient-to-r from-transparent via-red-400 to-transparent" 
                         style={{ boxShadow: '0 0 10px rgba(239, 68, 68, 0.9)' }} />
                    <div className="absolute bottom-0 left-8 right-8 h-1 bg-gradient-to-r from-transparent via-red-400 to-transparent" 
                         style={{ boxShadow: '0 0 10px rgba(239, 68, 68, 0.9)' }} />
                    <div className="absolute left-0 top-8 bottom-8 w-1 bg-gradient-to-b from-transparent via-red-400 to-transparent" 
                         style={{ boxShadow: '0 0 10px rgba(239, 68, 68, 0.9)' }} />
                    <div className="absolute right-0 top-8 bottom-8 w-1 bg-gradient-to-b from-transparent via-red-400 to-transparent" 
                         style={{ boxShadow: '0 0 10px rgba(239, 68, 68, 0.9)' }} />
                    
                    {/* Corner Cutouts */}
                    <div className="absolute top-0 left-0 w-6 h-6 border-l-[3px] border-t-[3px] border-red-300" 
                         style={{ boxShadow: '0 0 15px rgba(239, 68, 68, 0.9)' }} />
                    <div className="absolute top-0 right-0 w-4 h-4 border-r-[3px] border-t-[3px] border-red-300" 
                         style={{ boxShadow: '0 0 15px rgba(239, 68, 68, 0.9)' }} />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-l-[3px] border-b-[3px] border-red-300" 
                         style={{ boxShadow: '0 0 15px rgba(239, 68, 68, 0.9)' }} />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-r-[3px] border-b-[3px] border-red-300" 
                         style={{ boxShadow: '0 0 15px rgba(239, 68, 68, 0.9)' }} />
                    
                    {/* Content - Single Row */}
                    <div className="relative h-full flex items-center justify-center gap-3 px-6">
                      <CheckCircle2 size={18} className="text-white animate-pulse" 
                                    style={{ filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 1))' }} />
                      <span className="text-white font-black text-lg uppercase tracking-wider"
                            style={{ 
                              textShadow: '0 0 15px rgba(255, 255, 255, 1), 0 0 30px rgba(34, 197, 94, 0.8), 0 2px 10px rgba(0, 0, 0, 1)',
                              fontFamily: 'monospace'
                            }}>
                        SELL TO
                      </span>
                      {leadingTeam?.logo && isValidImageUrl(leadingTeam.logo) ? (
                        <img 
                          src={leadingTeam.logo} 
                          alt={leadingTeam.name}
                          className="w-7 h-7 object-contain"
                          style={{ filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.9))' }}
                        />
                      ) : (
                        <Crown size={20} className="text-green-300" style={{ filter: 'drop-shadow(0 0 8px rgba(34, 197, 94, 1))' }} />
                      )}
                      <span className="text-green-100 font-black text-base uppercase tracking-wider truncate"
                            style={{ textShadow: '0 0 10px rgba(34, 197, 94, 1), 0 2px 8px rgba(0, 0, 0, 0.9)' }}>
                        {leadingTeam?.name || 'NO TEAM'}
                      </span>
                    </div>
                    
                    {/* Holographic Overlay */}
                    <div 
                      className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay"
                      style={{
                        background: 'linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.1) 50%, transparent 70%)',
                        backgroundSize: '200% 200%',
                        animation: 'shimmer 3s linear infinite',
                        clipPath: 'polygon(20px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 20px), calc(100% - 20px) 100%, 8px 100%, 0 calc(100% - 8px), 0 20px)'
                      }}
                    />
                  </button>
                )}
                
                {/* Team Battle Strips - Esports Power Hierarchy */}
                <div className="flex-1 overflow-y-auto hide-scrollbar space-y-2">
                  {teams.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center">
                        <Users size={48} className="text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm font-semibold">No teams available</p>
                      </div>
                    </div>
                  ) : (
                    teams
                      .sort((a, b) => {
                        // Leading team to top
                        if (a.id === auctionState?.leadingTeamId) return -1;
                        if (b.id === auctionState?.leadingTeamId) return 1;
                        return 0;
                      })
                      .map((team, index) => {
                      const remainingBudget = team.remainingBudget || team.budget || 0;
                      const isLeadingTeam = auctionState?.leadingTeamId === team.id;
                      const isTop3 = index < 3;
                      const canAfford = remainingBudget >= (auctionState?.currentBid || auctionState?.currentBidAmount || currentPlayer?.basePrice || 0);
                      const currentBid = auctionState?.currentBid || auctionState?.currentBidAmount || currentPlayer?.basePrice || 0;
                      
                      if (isLeadingTeam) {
                        // Leading Team - Simple Display
                        return (
                          <div
                            key={team.id}
                            className="relative h-16 overflow-hidden rounded-lg
                                       transform hover:scale-[1.02] transition-all duration-200"
                          >
                            {/* Background */}
                            <div className="absolute inset-0 bg-gradient-to-r from-red-900/60 via-red-800/50 to-red-900/60 rounded-lg"></div>

                            {/* Border */}
                            <div className="absolute inset-0 border-2 border-red-500/60 pointer-events-none rounded-lg" />

                            {/* Content Layer */}
                            <div className="relative h-full flex items-center gap-2.5 px-3">
                              
                              {/* Rank Badge */}
                              <div className="relative w-10 h-10 flex-shrink-0">
                                <div className="relative w-full h-full bg-gradient-to-br from-red-400 to-red-600
                                                flex items-center justify-center rounded-lg
                                                border-2 border-red-300">
                                  <Crown size={16} className="text-white" />
                                </div>
                              </div>

                              {/* Team Identity */}
                              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <div className="w-10 h-10 bg-black/60 border-2 border-red-500/60 flex-shrink-0 overflow-hidden rounded-md">
                                  {team.logo ? (
                                    <img src={team.logo} alt={team.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <Shield size={20} className="text-red-400 m-auto" />
                                  )}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <div className="text-sm font-black text-red-100 truncate uppercase tracking-[0.08em]">
                                      {team.name}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-red-300 tracking-wider tabular-nums">
                                      ₹{(remainingBudget / 100000).toFixed(1)}L
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Bid Buttons */}
                              <div className="flex gap-1.5 flex-shrink-0 items-center">
                                {[
                                  { amount: 100000, label: '+1L', gradient: 'from-red-600 to-red-700' },
                                  { amount: 500000, label: '+5L', gradient: 'from-red-700 to-red-800' },
                                  { amount: 1000000, label: '+10L', gradient: 'from-red-800 to-red-900' }
                                ].map(({ amount, label, gradient }) => (
                                  <button
                                    key={label}
                                    onClick={() => onPlaceBid?.(team.id, amount)}
                                    disabled={!onPlaceBid || remainingBudget < (currentBid + amount)}
                                    className={`px-2.5 py-1.5 bg-gradient-to-b ${gradient}
                                               border border-red-400/80 text-red-50 text-[10px] font-black uppercase rounded-md
                                               hover:scale-105 
                                               disabled:from-gray-700 disabled:to-gray-800 disabled:border-gray-600
                                               disabled:text-gray-500 disabled:cursor-not-allowed
                                               active:scale-95 transition-all duration-150`}
                                  >
                                    {label}
                                  </button>
                                ))}
                                {/* Custom Bid Input */}
                                <div className="flex gap-0.5 items-center" title="Enter increment in Lakhs (e.g., 2 = +₹2L, 5 = +₹5L)">
                                  <input
                                    type="text"
                                    value={customBidAmounts[team.id] || ''}
                                    onChange={(e) => handleCustomBidChange(team.id, e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleCustomBidSubmit(team.id, remainingBudget, currentBid);
                                      }
                                    }}
                                    placeholder="+"
                                    className="w-14 px-1 py-1.5 bg-black/60 border border-red-500/60 rounded text-red-100 text-[10px] font-bold text-center
                                               focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400"
                                  />
                                  <span className="text-red-400 text-[9px] font-bold">L</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      } else {
                        // 🔥 CHALLENGER STRIPS - Tactical Warfare
                        return (
                          <div
                            key={team.id}
                            className="relative h-14 overflow-hidden
                                       hover:scale-[1.01] transition-all duration-150"
                            style={{
                              clipPath: isTop3 
                                ? 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))'
                                : 'polygon(0 0, 100% 0, 100% 100%, 6px 100%, 0 calc(100% - 6px))'
                            }}
                          >
                            {/* Background Layer */}
                            <div className={`absolute inset-0 ${
                              isTop3
                                ? 'bg-gradient-to-r from-blue-950/50 via-cyan-950/30 to-blue-950/50'
                                : canAfford
                                ? 'bg-gradient-to-r from-gray-950/70 via-gray-900/50 to-gray-950/70'
                                : 'bg-gradient-to-r from-red-950/40 via-gray-950/50 to-red-950/40'
                            }`}>
                              {/* Subtle Noise */}
                              <div className="absolute inset-0 opacity-[0.08]"
                                   style={{
                                     backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'1.2\' numOctaves=\'3\' /%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' /%3E%3C/svg%3E")',
                                     backgroundSize: '64px 64px'
                                   }} />

                              {/* Tactical Lines */}
                              {isTop3 && (
                                <div className="absolute inset-0 opacity-15">
                                  {[...Array(5)].map((_, i) => (
                                    <div
                                      key={i}
                                      className="absolute h-full w-px bg-gradient-to-b from-transparent via-cyan-400 to-transparent"
                                      style={{
                                        left: `${i * 20}%`,
                                        transform: 'skewX(-20deg)'
                                      }}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Sharp Border */}
                            <div className={`absolute inset-0 border pointer-events-none ${
                              isTop3 ? 'border-cyan-500/40' : 'border-gray-700/40'
                            }`}
                                 style={{
                                   clipPath: isTop3 
                                     ? 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))'
                                     : 'polygon(0 0, 100% 0, 100% 100%, 6px 100%, 0 calc(100% - 6px))'
                                 }} />

                            {/* Rank Edge Stripe */}
                            <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${
                              isTop3 
                                ? 'bg-gradient-to-b from-cyan-400 via-blue-500 to-cyan-600' 
                                : 'bg-gradient-to-b from-gray-600 to-gray-800'
                            }`} />

                            {/* Content */}
                            <div className="relative h-full flex items-center gap-2 px-2">
                              
                              {/* Team Identity - Tactical */}
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div className={`w-9 h-9 border flex-shrink-0 overflow-hidden
                                                ${isTop3 ? 'border-cyan-500/50 bg-black/60' : 'border-gray-700/50 bg-gray-900/50'}`}
                                     style={{ clipPath: 'polygon(20% 0%, 80% 0%, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0% 80%, 0% 20%)' }}>
                                  {team.logo ? (
                                    <img src={team.logo} alt={team.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <Shield size={14} className="text-gray-500 m-auto" />
                                  )}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <p className={`text-xs font-black truncate uppercase tracking-wider leading-tight
                                                ${isTop3 ? 'text-cyan-100' : 'text-gray-300'}`}>
                                    {team.name}
                                  </p>
                                  <p className={`text-[10px] font-bold tracking-wider leading-tight tabular-nums
                                                ${canAfford ? 'text-cyan-400' : 'text-red-400'}`}>
                                    ₹{(remainingBudget / 100000).toFixed(1)}L {!canAfford && '⚠'}
                                  </p>
                                </div>
                              </div>

                              {/* Tactical Bid Controls */}
                              <div className="flex gap-1 flex-shrink-0 items-center">
                                {[
                                  { amount: 100000, label: '+1L' },
                                  { amount: 500000, label: '+5L' },
                                  { amount: 1000000, label: '+10L' },
                                  { amount: 2000000, label: '+20L' }
                                ].map(({ amount, label }) => (
                                  <button
                                    key={label}
                                    onClick={() => onPlaceBid?.(team.id, amount)}
                                    disabled={!onPlaceBid || remainingBudget < (currentBid + amount)}
                                    className="px-2.5 py-1.5 bg-gradient-to-b from-purple-700 to-purple-900
                                               border border-purple-500/50 text-white text-[10px] font-black uppercase
                                               hover:from-purple-600 hover:to-purple-800 hover:scale-110
                                               disabled:from-gray-900 disabled:to-black disabled:border-gray-800
                                               disabled:text-gray-700 disabled:cursor-not-allowed
                                               active:scale-95 transition-all duration-150
                                               shadow-[0_2px_0_rgba(0,0,0,0.4)]"
                                    style={{
                                      clipPath: 'polygon(10% 0%, 90% 0%, 100% 100%, 0% 100%)'
                                    }}
                                  >
                                    {label}
                                  </button>
                                ))}
                                {/* Custom Bid Input */}
                                <div className="flex gap-0.5 items-center" title="Enter increment in Lakhs (e.g., 2 = +₹2L, 5 = +₹5L)">
                                  <input
                                    type="text"
                                    value={customBidAmounts[team.id] || ''}
                                    onChange={(e) => handleCustomBidChange(team.id, e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleCustomBidSubmit(team.id, remainingBudget, currentBid);
                                      }
                                    }}
                                    placeholder="+"
                                    className="w-14 px-1 py-1.5 bg-black/60 border border-purple-500/60 rounded text-purple-100 text-[10px] font-bold text-center
                                               focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400
                                               shadow-[0_2px_0_rgba(0,0,0,0.4)]"
                                  />
                                  <span className="text-purple-300 text-[9px] font-bold">L</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }
                    })
                  )}
                </div>

                {/* ⚡ CHAMPIONSHIP ACTION - Instant Victory */}
                {auctionState?.leadingTeamId && onDirectSell && (
                  <button
                    onClick={() => onDirectSell(auctionState.leadingTeamId!)}
                    className="relative px-5 py-3.5 bg-gradient-to-r from-green-600 via-emerald-600 to-green-600
                               border-2 border-green-400 rounded-lg overflow-hidden
                               text-white font-black text-sm uppercase tracking-[0.15em]
                               hover:scale-105 active:scale-95 transition-all
                               shadow-[0_0_30px_rgba(34,197,94,0.5)]
                               group"
                  >
                    {/* Energy Pulse Background */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent 
                                    translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    
                    <div className="relative flex items-center justify-center gap-2">
                      <CheckCircle2 size={18} className="animate-pulse" />
                      <span>CONFIRM SALE - {teams.find(t => t.id === auctionState.leadingTeamId)?.name}</span>
                      <Zap size={16} className="text-yellow-300" />
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* 📊 ALL PLAYERS BOTTOM TICKER - SINGLE ROW */}
            <div 
              className="relative overflow-hidden flex items-center"
              style={{ 
                height: '220px',
                background: 'linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.4) 100%)',
                display: 'flex',
                width: 'calc(100% - 560px)'
              }}
            >
              {/* Left Scroll Button - Small Blurry */}
              <button
                onClick={() => scrollPlayerCards('left')}
                className="absolute left-0 top-1/2 transform -translate-y-1/2 z-20 flex items-center justify-center
                           opacity-70 hover:opacity-100 hover:backdrop-blur-lg
                           transition-all duration-200"
                style={{
                  width: '40px',
                  height: '40px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  backdropFilter: 'blur(4px)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '6px'
                }}
                title="Scroll to previous players"
              >
                <span className="text-red-300 font-black text-lg">&lt;</span>
              </button>
              
              <div 
                ref={playerCardsRef}
                className="flex gap-3 px-20 overflow-x-auto hide-scrollbar flex-1"
                style={{ 
                  justifyContent: 'flex-start'
                }}
              >
                {/* UNSOLD PLAYERS (Left) - Static */}
                {allPlayers.filter(p => p.status === 'UNSOLD').map((player, idx) => (
                  <div 
                    key={`unsold-${player.id}-${idx}`}
                    className="relative flex-shrink-0 flex flex-col"
                    style={{
                      width: `${calculateCardWidth()}px`,
                      background: 'linear-gradient(135deg, rgba(80, 0, 0, 0.9) 0%, rgba(40, 10, 10, 0.9) 100%)',
                      border: '2px solid rgba(255, 100, 100, 0.6)',
                      boxShadow: '0 0 20px rgba(255, 100, 100, 0.4)',
                      borderRadius: '8px',
                      padding: '8px',
                      backdropFilter: 'blur(10px)',
                      height: '100%'
                    }}
                  >
                      {/* Image on top */}
                      {player.imageUrl && isValidImageUrl(player.imageUrl) ? (
                        <img 
                          src={player.imageUrl}
                          alt={player.name}
                          className="w-full h-16 object-cover rounded-md border border-red-400/50 flex-shrink-0"
                          style={{ filter: 'drop-shadow(0 0 8px rgba(255, 100, 100, 0.6))' }}
                        />
                      ) : (
                        <div className="w-full h-16 rounded-md bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center flex-shrink-0">
                          <Users size={24} className="text-white" />
                        </div>
                      )}
                      
                      {/* Status badge */}
                      <div className="px-1.5 py-0.5 bg-red-600/80 rounded text-[7px] font-black text-white uppercase tracking-wider mb-1 inline-block">
                        UNSOLD
                      </div>
                      
                      {/* Player name */}
                      <h3 className="text-[11px] font-black text-white uppercase tracking-wide leading-tight mb-1 line-clamp-2">
                        {player.name}
                      </h3>

                      {/* Details */}
                      <div className="flex flex-col gap-0.5 text-[8px]">
                        {player.basePrice && (
                          <span className="font-black text-red-300">
                            ₹{formatBudget(player.basePrice).replace(/₹/g, '').trim()}
                          </span>
                        )}
                        {player.playerCategory && (
                          <span className="font-bold text-gray-300 truncate">{player.playerCategory}</span>
                        )}
                      </div>
                    </div>
                ))}

                {/* AVAILABLE PLAYERS (Right) - Static */}
                {allPlayers.filter(p => p.status === 'AVAILABLE').map((player, idx) => (
                  <div 
                    key={`available-${player.id}-${idx}`}
                    className="relative flex-shrink-0 flex flex-col"
                    style={{
                      width: `${calculateCardWidth()}px`,
                      background: 'linear-gradient(135deg, rgba(0, 40, 80, 0.9) 0%, rgba(10, 30, 60, 0.9) 100%)',
                      border: '2px solid rgba(100, 150, 255, 0.6)',
                      boxShadow: '0 0 20px rgba(100, 150, 255, 0.4)',
                      borderRadius: '8px',
                      padding: '8px',
                      backdropFilter: 'blur(10px)',
                      height: '100%'
                    }}
                  >
                      {/* Image on top */}
                      {player.imageUrl && isValidImageUrl(player.imageUrl) ? (
                        <img 
                          src={player.imageUrl}
                          alt={player.name}
                          className="w-full h-16 object-cover rounded-md border border-blue-400/50 flex-shrink-0"
                          style={{ filter: 'drop-shadow(0 0 8px rgba(100, 150, 255, 0.6))' }}
                        />
                      ) : (
                        <div className="w-full h-16 rounded-md bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
                          <Users size={24} className="text-white" />
                        </div>
                      )}
                      
                      {/* Status badge */}
                      <div className="px-1.5 py-0.5 bg-blue-600/80 rounded text-[7px] font-black text-white uppercase tracking-wider mb-1 inline-block">
                        UPCOMING
                      </div>
                      
                      {/* Player name */}
                      <h3 className="text-[11px] font-black text-white uppercase tracking-wide leading-tight mb-1 line-clamp-2">
                        {player.name}
                      </h3>

                      {/* Details */}
                      <div className="flex flex-col gap-0.5 text-[8px]">
                        {player.basePrice && (
                          <span className="font-black text-blue-300">
                            ₹{formatBudget(player.basePrice).replace(/₹/g, '').trim()}
                          </span>
                        )}
                        {player.playerCategory && (
                          <span className="font-bold text-gray-300 truncate">{player.playerCategory}</span>
                        )}
                      </div>
                    </div>
                ))}
              </div>
              
              {/* Right Scroll Button - Small Blurry */}
              <button
                onClick={() => scrollPlayerCards('right')}
                className="absolute right-0 top-1/2 transform -translate-y-1/2 z-20 flex items-center justify-center
                           opacity-70 hover:opacity-100 hover:backdrop-blur-lg
                           transition-all duration-200"
                style={{
                  width: '40px',
                  height: '40px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  backdropFilter: 'blur(4px)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '6px'
                }}
                title="Scroll to next players"
              >
                <span className="text-red-300 font-black text-lg">&gt;</span>
              </button>
            </div>
          </div>
        ) : (
          // No Player Selected State
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-amber-500/10 blur-2xl"></div>
                <Gavel size={80} className="relative text-amber-600/40" />
              </div>
              <h2 className="text-3xl font-black text-gray-500 tracking-wide mb-3">
                Ready to Start Auction
              </h2>
              <p className="text-gray-600 text-lg mb-8">
                Select a player to begin the bidding process
              </p>
              
              {onStartAuction && (
                <button
                  onClick={onStartAuction}
                  className="flex items-center gap-3 px-10 py-4 mx-auto
                             bg-gradient-to-r from-amber-600 to-amber-500
                             border border-amber-400/60 rounded-lg
                             text-black font-black uppercase tracking-wider text-lg
                             hover:scale-105 active:scale-95
                             transition-all duration-200
                             shadow-[0_0_30px_rgba(251,191,36,0.4)]"
                >
                  <Play size={24} />
                  <span>Start Auction</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Scrollbar Styles + Custom Animations */}
      <style>{`
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }

        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }

        @keyframes energySweep {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }

        @keyframes scan {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(10px);
          }
        }

        @keyframes stripeMove {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: 32px 32px;
          }
        }

        @keyframes dangerPulse {
          0%, 100% {
            opacity: 0.2;
          }
          50% {
            opacity: 0.4;
          }
        }
      `}</style>
    </div>
  );
};
