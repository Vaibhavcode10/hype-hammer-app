import React, { useMemo, useEffect } from 'react';
import { 
  Radio, TrendingUp, Users, DollarSign, Clock, AlertCircle,
  Heart, Target, Zap, Crown, Award, Activity, Shield, ArrowLeft,
  Flame, Dumbbell, CheckCircle, XCircle, User, Globe, MapPin, ShoppingCart
} from 'lucide-react';
import { 
  LiveAuctionState, 
  LiveAuctionStatus, 
  UserRole, 
  Player, 
  Team,
  BidHistoryItem
} from '../../types';
import { PlayerQueueCarousel } from './PlayerQueueCarousel';
import { isValidImageUrl } from '../../services/imageUrlValidator';

// CSS for auto-scrolling ticker animation
const TICKER_STYLES = `
  @keyframes infiniteScroll {
    0% { 
      transform: translateX(0); 
    }
    100% { 
      transform: translateX(-50%);
    }
  }

  .ticker-container {
    width: fit-content;
    animation: infiniteScroll 90s linear infinite;
  }

  .ticker-container:hover {
    animation-play-state: paused;
  }

  .ticker-item {
    flex-shrink: 0;
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 2px;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(245, 158, 11, 0.5);
    border-radius: 2px;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(245, 158, 11, 0.7);
  }
`;

/**
 * SpectatorLiveRoom
 * Viewing layout for players, team reps, and guests
 */
export const SpectatorLiveRoom: React.FC<SpectatorLiveRoomProps> = ({
  auctionState,
  currentPlayer,
  allPlayers,
  teams,
  userId,
  userRole,
  remainingSeconds
}) => {
  // Inject ticker styles
  useEffect(() => {
    const styleId = 'ticker-styles';
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement('style');
      styleEl.id = styleId;
      styleEl.textContent = TICKER_STYLES;
      document.head.appendChild(styleEl);
    }
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (amount: number): string => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    return `₹${amount.toLocaleString()}`;
  };

  const formatBudget = (amount: number): string => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    return `₹${amount.toLocaleString()}`;
  };

  // Get players bought by each team (players with status SOLD and a teamId)
  const getTeamPlayers = (teamId: string): Player[] => {
    return allPlayers.filter(p => p.teamId === teamId && p.status === 'SOLD');
  };

  // Build extended team data with live updates
  const teamsWithPlayers = useMemo(() => {
    return teams.map(team => {
      const boughtPlayers = getTeamPlayers(team.id);
      // Use team.players or team.playerIds for total squad size
      const totalSquadSize = team.players?.length || team.playerIds?.length || team.squadSize || 0;
      const remainingSlots = Math.max(0, (team.squadSize || 15) - (team.players?.length || 0));
      
      return {
        ...team,
        boughtPlayers,
        totalSquadSize,
        remainingSlots,
        remainingBudget: team.remainingBudget || 0
      };
    });
  }, [teams, allPlayers]);

  // Get player role badge color
  const getPlayerRoleColor = (role?: string) => {
    if (!role) return { bg: 'from-amber-600 to-amber-500', text: 'text-white', label: 'ATHLETE' };
    const r = role.toLowerCase();
    if (r.includes('bat')) return { bg: 'from-amber-500 to-amber-600', text: 'text-white', label: 'BATSMAN' };
    if (r.includes('bowl')) return { bg: 'from-amber-600 to-amber-500', text: 'text-white', label: 'BOWLER' };
    if (r.includes('all')) return { bg: 'from-amber-600 to-amber-500', text: 'text-white', label: 'ALL-ROUNDER' };
    if (r.includes('keep') || r.includes('wick')) return { bg: 'from-amber-600 to-amber-500', text: 'text-white', label: 'KEEPER' };
    return { bg: 'from-amber-500 to-amber-600', text: 'text-white', label: role.toUpperCase() };
  };

  // Navigate to appropriate dashboard based on user role
  const handleBackToDashboard = () => {
    const dashboardRoutes: { [key: string]: string } = {
      'admin': '/admin/dashboard',
      'auctioneer': '/auctioneer/dashboard',
      'player': '/player/dashboard',
      'team': '/team-rep/dashboard',
      'team-rep': '/team-rep/dashboard',
      'guest': '/dashboard'
    };
    
    const route = dashboardRoutes[userRole?.toLowerCase() || 'guest'] || '/dashboard';
    window.location.href = route;
  };

  return (
    <div className="w-full h-full flex flex-col bg-black overflow-hidden">
      {/* TOPBAR - Status and Counts */}
      <div className="h-16 bg-gray-900/80 border-b border-amber-400/50 flex items-center justify-between px-6 z-40" style={{
        background: 'linear-gradient(to right, rgba(20, 15, 5, 0.95), rgba(30, 20, 5, 0.95))',
        boxShadow: '0 4px 20px rgba(245, 158, 11, 0.1)'
      }}>
        {/* Left Side - Back Button */}
        <button
          onClick={handleBackToDashboard}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/30 hover:bg-amber-500/50 text-amber-300 hover:text-amber-100 transition-colors border border-amber-400/40"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-semibold">Back to Dashboard</span>
        </button>
        
        {/* Right Side - Players and Teams Count */}
        <div className="flex items-center gap-8">
          {/* Players Count */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-400/40">
              <Users size={20} className="text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Players</p>
              <p className="text-xl font-black text-amber-300">{allPlayers.length}</p>
            </div>
          </div>
          
          {/* Teams Count */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-400/40">
              <Award size={20} className="text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Teams</p>
              <p className="text-xl font-black text-amber-300">{teams.length}</p>
            </div>
          </div>
          
          {/* Live Status Indicator */}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" style={{
              boxShadow: '0 0 10px rgba(245, 158, 11, 0.8)'
            }} />
            <span className="text-sm font-bold text-amber-300">LIVE</span>
          </div>
        </div>
      </div>

      {/* LEFT SIDE CARDS - BIDDING HISTORY & UNSOLD PLAYERS */}
      <div className="absolute top-24 left-2 bottom-48 z-50 w-80 flex flex-col gap-8">
        {/* BIDDING HISTORY & NOTIFICATIONS CARD */}
        <div className="flex-1 min-h-0">
          <div className="h-full relative">
            {/* Corner Brackets */}
            <div className="absolute top-0 left-0 w-4 h-4 pointer-events-none border-t-[2px] border-l-[2px]" style={{
              borderColor: '#F59E0B',
              boxShadow: '0 0 10px rgba(245, 158, 11, 0.7)'
            }} />
            <div className="absolute top-0 right-0 w-4 h-4 pointer-events-none border-t-[2px] border-r-[2px]" style={{
              borderColor: '#F59E0B',
              boxShadow: '0 0 10px rgba(245, 158, 11, 0.7)'
            }} />
            <div className="absolute bottom-0 left-0 w-4 h-4 pointer-events-none border-b-[2px] border-l-[2px]" style={{
              borderColor: '#F59E0B',
              boxShadow: '0 0 10px rgba(245, 158, 11, 0.7)'
            }} />
            <div className="absolute bottom-0 right-0 w-4 h-4 pointer-events-none border-b-[2px] border-r-[2px]" style={{
              borderColor: '#F59E0B',
              boxShadow: '0 0 10px rgba(245, 158, 11, 0.7)'
            }} />

            {/* Main panel */}
            <div className="h-full border border-amber-400/60 rounded-lg overflow-hidden flex flex-col" style={{
              background: 'linear-gradient(135deg, rgba(0, 8, 20, 0.96) 0%, rgba(0, 15, 35, 0.94) 50%, rgba(0, 5, 15, 0.96) 100%)',
              boxShadow: '0 0 30px rgba(245, 158, 11, 0.3), inset 0 0 40px rgba(245, 158, 11, 0.05)'
            }}>
              {/* Header */}
              <div className="px-4 py-3 border-b border-amber-400/30" style={{
                background: 'linear-gradient(to right, rgba(245, 158, 11, 0.15), transparent)'
              }}>
                <div className="flex items-center gap-2">
                  <Activity size={18} className="text-amber-400" style={{filter: 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.8))'}} />
                  <h3 className="text-sm font-black uppercase tracking-wider text-amber-50" style={{
                    textShadow: '0 0 10px rgba(245, 158, 11, 0.8)'
                  }}>Bidding Activity</h3>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 custom-scrollbar">
                {auctionState?.bidHistory && auctionState.bidHistory.length > 0 ? (
                  [...auctionState.bidHistory].reverse().slice(0, 20).map((bid, idx) => (
                    <div 
                      key={`${bid.timestamp}-${idx}`}
                      className="py-2 px-3 rounded-lg border-l-2" 
                      style={{
                        background: 'linear-gradient(to right, rgba(245, 158, 11, 0.1), transparent)',
                        borderLeftColor: 'rgba(245, 158, 11, 0.6)',
                        boxShadow: '0 0 8px rgba(245, 158, 11, 0.2)'
                      }}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <span className="text-xs font-bold text-amber-100">{bid.teamName}</span>
                        <span className="text-[10px] text-amber-400/70">
                          {new Date(bid.timestamp).toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingUp size={12} className="text-amber-400" />
                        <span className="text-sm font-black text-amber-300">
                          {formatCurrency(bid.amount)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <AlertCircle size={32} className="text-gray-600 mb-2" />
                    <p className="text-xs text-gray-500">No bids yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* UNSOLD PLAYERS CARD */}
        <div className="h-64 flex-shrink-0">
          <div className="h-full relative">
            {/* Corner Brackets */}
            <div className="absolute top-0 left-0 w-4 h-4 pointer-events-none border-t-[2px] border-l-[2px]" style={{
              borderColor: '#F59E0B',
              boxShadow: '0 0 10px rgba(245, 158, 11, 0.7)'
            }} />
            <div className="absolute top-0 right-0 w-4 h-4 pointer-events-none border-t-[2px] border-r-[2px]" style={{
              borderColor: '#F59E0B',
              boxShadow: '0 0 10px rgba(245, 158, 11, 0.7)'
            }} />
            <div className="absolute bottom-0 left-0 w-4 h-4 pointer-events-none border-b-[2px] border-l-[2px]" style={{
              borderColor: '#F59E0B',
              boxShadow: '0 0 10px rgba(245, 158, 11, 0.7)'
            }} />
            <div className="absolute bottom-0 right-0 w-4 h-4 pointer-events-none border-b-[2px] border-r-[2px]" style={{
              borderColor: '#F59E0B',
              boxShadow: '0 0 10px rgba(245, 158, 11, 0.7)'
            }} />

            {/* Main panel */}
            <div className="h-full border border-amber-400/60 rounded-lg overflow-hidden flex flex-col" style={{
              background: 'linear-gradient(135deg, rgba(20, 0, 0, 0.96) 0%, rgba(35, 5, 5, 0.94) 50%, rgba(15, 0, 0, 0.96) 100%)',
              boxShadow: '0 0 30px rgba(245, 158, 11, 0.3), inset 0 0 40px rgba(245, 158, 11, 0.05)'
            }}>
              {/* Header */}
              <div className="px-4 py-3 border-b border-amber-400/30" style={{
                background: 'linear-gradient(to right, rgba(245, 158, 11, 0.15), transparent)'
              }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle size={18} className="text-amber-400" style={{filter: 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.8))'}} />
                    <h3 className="text-sm font-black uppercase tracking-wider text-amber-50" style={{
                      textShadow: '0 0 10px rgba(245, 158, 11, 0.8)'
                    }}>Unsold</h3>
                  </div>
                  <span className="text-lg font-black text-amber-300" style={{
                    textShadow: '0 0 10px rgba(245, 158, 11, 0.8)'
                  }}>
                    {allPlayers.filter(p => p.status === 'UNSOLD').length}
                  </span>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 custom-scrollbar">
                {allPlayers.filter(p => p.status === 'UNSOLD').map((player) => (
                  <div 
                    key={player.id}
                    className="py-1.5 px-3 rounded border-l-2" 
                    style={{
                      background: 'linear-gradient(to right, rgba(245, 158, 11, 0.1), transparent)',
                      borderLeftColor: 'rgba(245, 158, 11, 0.6)'
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-amber-100 truncate">{player.name}</p>
                        <p className="text-[10px] text-amber-300/70">{player.role || 'Player'}</p>
                      </div>
                      {player.basePrice && (
                        <span className="text-[10px] text-amber-300 font-bold ml-2">
                          {formatCurrency(player.basePrice)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {allPlayers.filter(p => p.status === 'UNSOLD').length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <CheckCircle size={32} className="text-gray-600 mb-2" />
                    <p className="text-xs text-gray-500">No unsold players</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LIVE PLAYER INFO PANEL - GAMING HUD OVERLAY */}
      {currentPlayer && (
        <div className="absolute top-24 right-2 bottom-48 z-50 w-80\">
          {/* Outer Frame Container */}
          <div className="relative h-full">
            {/* Corner accent brackets - Gaming Style */}
            <div className="absolute top-0 left-0 w-5 h-5 pointer-events-none border-t-[3px] border-l-[3px]" style={{
              borderColor: '#F59E0B',
              boxShadow: '0 0 15px rgba(245, 158, 11, 0.8), inset 0 0 10px rgba(245, 158, 11, 0.3)'
            }} />
            <div className="absolute top-0 right-0 w-5 h-5 pointer-events-none border-t-[3px] border-r-[3px]" style={{
              borderColor: '#F59E0B',
              boxShadow: '0 0 15px rgba(245, 158, 11, 0.8), inset 0 0 10px rgba(245, 158, 11, 0.3)'
            }} />
            <div className="absolute bottom-0 left-0 w-5 h-5 pointer-events-none border-b-[3px] border-l-[3px]" style={{
              borderColor: '#F59E0B',
              boxShadow: '0 0 15px rgba(245, 158, 11, 0.8), inset 0 0 10px rgba(245, 158, 11, 0.3)'
            }} />
            <div className="absolute bottom-0 right-0 w-5 h-5 pointer-events-none border-b-[3px] border-r-[3px]" style={{
              borderColor: '#F59E0B',
              boxShadow: '0 0 15px rgba(245, 158, 11, 0.8), inset 0 0 10px rgba(245, 158, 11, 0.3)'
            }} />

            {/* Main panel frame */}
            <div 
              className="h-full border-2 overflow-hidden flex flex-col"
              style={{
                background: 'linear-gradient(135deg, rgba(0, 8, 20, 0.98) 0%, rgba(0, 15, 35, 0.96) 50%, rgba(0, 5, 15, 0.98) 100%)',
                borderColor: 'rgba(245, 158, 11, 0.65)',
                boxShadow: '0 0 50px rgba(245, 158, 11, 0.45), inset 0 0 60px rgba(245, 158, 11, 0.08), inset 0 -2px 30px rgba(0, 0, 0, 0.6)',
                clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)'
              }}
            >
              {/* Top Accent Strip */}
              <div className="h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent" style={{
                boxShadow: '0 0 25px rgba(245, 158, 11, 1), 0 2px 40px rgba(245, 158, 11, 0.7)'
              }} />

              {/* Vertical Side Accent */}
              <div className="absolute left-0 top-3 bottom-3 w-0.5" style={{
                background: 'linear-gradient(to bottom, rgba(245, 158, 11, 0.9), rgba(245, 158, 11, 0.7), rgba(245, 158, 11, 0.9))',
                boxShadow: '0 0 15px rgba(245, 158, 11, 0.9), inset 0 0 8px rgba(245, 158, 11, 0.5)'
              }} />

              {/* Full Height Content Layout */}
              <div className="flex-1 overflow-y-auto flex flex-col px-4 pl-6 py-3 custom-scrollbar">

                {/* ========== TOP: PRIMARY AGE STAT ========== */}
                {currentPlayer.age && (
                  <div className="flex-none pb-3 mb-3" style={{
                    borderBottom: '2px solid rgba(245, 158, 11, 0.3)',
                    boxShadow: '0 2px 10px rgba(245, 158, 11, 0.4)'
                  }}>
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="flex items-baseline gap-2 mb-1">
                          <div className="w-1 h-4 bg-amber-400" style={{boxShadow: '0 0 8px rgba(245, 158, 11, 0.8)'}} />
                          <p className="text-[8px] text-amber-400 font-black uppercase tracking-[0.2em] opacity-70">PLAYER AGE</p>
                        </div>
                        <p className="text-4xl font-black text-amber-50 leading-none" style={{
                          textShadow: '0 0 20px rgba(245, 158, 11, 1), 0 0 40px rgba(245, 158, 11, 0.8), 2px 2px 0 rgba(0, 0, 0, 0.5)',
                          fontFamily: 'system-ui, -apple-system, sans-serif',
                          letterSpacing: '-0.05em'
                        }}>{currentPlayer.age}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] text-amber-300/50 font-bold uppercase tracking-wider mb-1">YRS</p>
                        {currentPlayer.gender && (
                          <div className="px-2.5 py-1 rounded-lg bg-gradient-to-br from-amber-500/30 to-amber-600/30 border-2 border-amber-400/50" style={{
                            boxShadow: '0 0 10px rgba(245, 158, 11, 0.4)'
                          }}>
                            <p className="text-base font-black text-amber-50" style={{textShadow: '0 0 8px rgba(245, 158, 11, 0.8)'}}>{currentPlayer.gender === 'Male' ? 'M' : 'F'}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ========== STYLE STATS SECTION ========== */}
                {(currentPlayer.battingStyle || currentPlayer.bowlingStyle) && (
                  <div className="flex-none space-y-2 pb-3 mb-3" style={{
                    borderBottom: '1px solid rgba(245, 158, 11, 0.25)',
                    boxShadow: '0 1px 8px rgba(245, 158, 11, 0.3)'
                  }}>
                    {currentPlayer.battingStyle && (
                      <div className="flex items-center justify-between py-1.5 px-3 rounded" style={{
                        background: 'linear-gradient(to right, rgba(245, 158, 11, 0.15), transparent)',
                        borderLeft: '3px solid rgba(245, 158, 11, 0.7)',
                        boxShadow: '0 0 10px rgba(245, 158, 11, 0.3)'
                      }}>
                        <div className="flex items-center gap-3">
                          <Zap size={20} className="text-amber-400" style={{filter: 'drop-shadow(0 0 4px rgba(245, 158, 11, 0.8))'}} />
                          <div>
                            <p className="text-[8px] text-amber-400 font-black uppercase tracking-wider opacity-60">BATTING</p>
                            <p className="text-base font-bold text-amber-100">{currentPlayer.battingStyle}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {currentPlayer.bowlingStyle && (
                      <div className="flex items-center justify-between py-1.5 px-3 rounded" style={{
                        background: 'linear-gradient(to right, rgba(245, 158, 11, 0.15), transparent)',
                        borderLeft: '3px solid rgba(245, 158, 11, 0.7)',
                        boxShadow: '0 0 10px rgba(245, 158, 11, 0.3)'
                      }}>
                        <div className="flex items-center gap-3">
                          <Target size={20} className="text-amber-400" style={{filter: 'drop-shadow(0 0 4px rgba(245, 158, 11, 0.8))'}} />
                          <div>
                            <p className="text-[8px] text-amber-400 font-black uppercase tracking-wider opacity-60">BOWLING</p>
                            <p className="text-base font-bold text-amber-100">{currentPlayer.bowlingStyle}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ========== EXPERIENCE & LOCATION ========== */}
                {(currentPlayer.experienceLevel || currentPlayer.nationality || currentPlayer.isOverseas !== undefined) && (
                  <div className="flex-none space-y-2.5 pb-3 mb-3" style={{
                    borderBottom: '1px solid rgba(245, 158, 11, 0.25)',
                    boxShadow: '0 1px 8px rgba(245, 158, 11, 0.3)'
                  }}>
                    {currentPlayer.experienceLevel && (
                      <div className="flex items-center gap-3 py-1 px-3 rounded" style={{
                        background: 'linear-gradient(to right, rgba(245, 158, 11, 0.12), transparent)',
                        borderLeft: '3px solid rgba(245, 158, 11, 0.7)'
                      }}>
                        <Award size={20} className="text-amber-400" style={{filter: 'drop-shadow(0 0 4px rgba(245, 158, 11, 0.8))'}} />
                        <div className="flex-1">
                          <p className="text-[8px] text-amber-400 font-black uppercase tracking-wider opacity-60">EXPERIENCE</p>
                          <p className="text-base font-bold text-amber-100">{currentPlayer.experienceLevel}</p>
                        </div>
                      </div>
                    )}
                    {currentPlayer.nationality && (
                      <div className="flex items-center gap-3 py-1 px-3 rounded" style={{
                        background: 'linear-gradient(to right, rgba(245, 158, 11, 0.12), transparent)',
                        borderLeft: '3px solid rgba(245, 158, 11, 0.7)'
                      }}>
                        <Globe size={20} className="text-amber-400" style={{filter: 'drop-shadow(0 0 4px rgba(245, 158, 11, 0.8))'}} />
                        <div className="flex-1">
                          <p className="text-[8px] text-amber-400 font-black uppercase tracking-wider opacity-60">NATIONALITY</p>
                          <p className="text-sm font-bold text-amber-100 line-clamp-1">{currentPlayer.nationality}</p>
                        </div>
                      </div>
                    )}
                    {currentPlayer.isOverseas !== undefined && (
                      <div className="flex items-center gap-3 py-1.5 px-3 rounded" style={{
                        background: currentPlayer.isOverseas 
                          ? 'linear-gradient(to right, rgba(245, 158, 11, 0.15), transparent)'
                          : 'linear-gradient(to right, rgba(245, 158, 11, 0.15), transparent)',
                        borderLeft: `3px solid ${currentPlayer.isOverseas ? 'rgba(245, 158, 11, 0.7)' : 'rgba(245, 158, 11, 0.7)'}`
                      }}>
                        <MapPin size={20} style={{
                          color: '#F59E0B',
                          filter: 'drop-shadow(0 0 4px rgba(245, 158, 11, 0.8))'
                        }} />
                        <div className="flex-1">
                          <p className="text-[8px] font-black uppercase tracking-wider opacity-60" style={{
                            color: '#F59E0B'
                          }}>PLAYER TYPE</p>
                          <p className="text-sm font-bold" style={{
                            color: '#F59E0B'
                          }}>
                            {currentPlayer.isOverseas ? 'INTERNATIONAL' : 'DOMESTIC'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ========== CATEGORY & TEAMS ========== */}
                {(currentPlayer.playerCategory || currentPlayer.previousTeams) && (
                  <div className="flex-none space-y-2 pb-3 mb-3" style={{
                    borderBottom: '1px solid rgba(245, 158, 11, 0.25)'
                  }}>
                    {currentPlayer.playerCategory && (
                      <div className="py-1 px-3" style={{
                        background: 'linear-gradient(to right, rgba(245, 158, 11, 0.12), transparent)',
                        borderLeft: '2px solid rgba(245, 158, 11, 0.6)'
                      }}>
                        <p className="text-[8px] text-amber-400 font-black uppercase tracking-wider opacity-60 mb-0.5">CATEGORY</p>
                        <p className="text-sm font-bold text-amber-100">{currentPlayer.playerCategory}</p>
                      </div>
                    )}
                    {currentPlayer.previousTeams && (
                      <div className="py-1 px-3" style={{
                        background: 'linear-gradient(to right, rgba(255, 150, 0, 0.12), transparent)',
                        borderLeft: '2px solid rgba(255, 180, 0, 0.6)'
                      }}>
                        <p className="text-[8px] text-amber-400 font-black uppercase tracking-wider opacity-60 mb-0.5">PREV TEAMS</p>
                        <p className="text-xs font-bold text-amber-100 line-clamp-2 leading-tight">{currentPlayer.previousTeams}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* ========== SPACER ========== */}
                <div className="flex-1" />

                {/* ========== BIO SECTION ========== */}
                {currentPlayer.bio && (
                  <div className="flex-none py-2 px-3 mb-3 rounded" style={{
                    background: 'rgba(100, 150, 200, 0.08)',
                    border: '1px solid rgba(100, 150, 200, 0.2)'
                  }}>
                    <p className="text-[8px] text-slate-400 font-black uppercase tracking-wider opacity-50 mb-1.5">PLAYER BIO</p>
                    <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-3">{currentPlayer.bio}</p>
                  </div>
                )}

                {/* ========== BOTTOM: STATUS & TEAM ========== */}
                {currentPlayer.status && (
                  <div className="flex-none pt-3" style={{
                    borderTop: '2px solid rgba(245, 158, 11, 0.4)',
                    boxShadow: '0 -2px 15px rgba(245, 158, 11, 0.3)'
                  }}>
                    {/* STATUS BADGE - Prominent */}
                    <div className="mb-3 py-3 px-4 rounded-lg flex items-center justify-center" style={{
                      background: currentPlayer.status === 'SOLD' 
                        ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(245, 158, 11, 0.2))'
                        : currentPlayer.status === 'UNSOLD'
                        ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(245, 158, 11, 0.2))'
                        : 'linear-gradient(135deg, rgba(245, 158, 11, 0.3), rgba(245, 158, 11, 0.25))',
                      border: `2px solid ${currentPlayer.status === 'SOLD'
                        ? 'rgba(245, 158, 11, 0.8)'
                        : currentPlayer.status === 'UNSOLD'
                        ? 'rgba(245, 158, 11, 0.8)'
                        : 'rgba(245, 158, 11, 0.9)'}`,
                      boxShadow: currentPlayer.status === 'SOLD'
                        ? '0 0 20px rgba(245, 158, 11, 0.6), inset 0 0 15px rgba(245, 158, 11, 0.15)'
                        : currentPlayer.status === 'UNSOLD'
                        ? '0 0 20px rgba(245, 158, 11, 0.6), inset 0 0 15px rgba(245, 158, 11, 0.15)'
                        : '0 0 25px rgba(245, 158, 11, 0.7), inset 0 0 20px rgba(245, 158, 11, 0.2)'
                    }}>
                      <div className="flex items-center gap-2">
                        {currentPlayer.status === 'SOLD' ? (
                          <CheckCircle size={16} className="text-amber-300" style={{filter: 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.9))'}} />
                        ) : currentPlayer.status === 'UNSOLD' ? (
                          <XCircle size={16} className="text-amber-300" style={{filter: 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.9))'}} />
                        ) : (
                          <Flame size={16} className="text-amber-300 animate-pulse" style={{filter: 'drop-shadow(0 0 8px rgba(245, 158, 11, 1))'}} />
                        )}
                        <span className="font-black uppercase text-sm tracking-wider" style={{
                          color: '#F59E0B',
                          textShadow: '0 0 15px rgba(245, 158, 11, 1), 0 0 30px rgba(245, 158, 11, 0.6)'
                        }}>
                          {currentPlayer.status === 'SOLD' ? 'SOLD' : currentPlayer.status === 'UNSOLD' ? 'UNSOLD' : 'LIVE'}
                        </span>
                      </div>
                    </div>

                    {/* TEAM INFO if Sold */}
                    {currentPlayer.status === 'SOLD' && currentPlayer.teamName && (
                      <div className="py-2 px-3 rounded-lg" style={{
                        background: 'linear-gradient(to right, rgba(245, 158, 11, 0.2), rgba(245, 158, 11, 0.15))',
                        border: '1px solid rgba(245, 158, 11, 0.5)',
                        boxShadow: '0 0 15px rgba(245, 158, 11, 0.4)'
                      }}>
                        <div className="flex items-center gap-2 mb-2">
                          <ShoppingCart size={16} className="text-amber-400" />
                          <p className="text-[8px] text-amber-400 font-black uppercase tracking-wider opacity-70">PURCHASED BY</p>
                        </div>
                        <p className="text-xl font-black text-amber-50 mb-1" style={{
                          textShadow: '0 0 15px rgba(245, 158, 11, 0.9)',
                          letterSpacing: '-0.02em'
                        }}>{currentPlayer.teamName}</p>
                        {currentPlayer.soldPrice && (
                          <p className="text-sm text-amber-200 font-bold">
                            ₹ {formatBudget(currentPlayer.soldPrice).replace(/₹/g, '').trim()}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Accent Strip */}
              <div className="h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent" style={{
                boxShadow: '0 0 25px rgba(245, 158, 11, 1), 0 -2px 40px rgba(245, 158, 11, 0.7)'
              }} />
            </div>
          </div>
        </div>
      )}
      {/* Minimal Stage: Full-page gradient background with floating carousel */}
      <div 
        className="relative w-full h-full" 
        style={{
          background: 'radial-gradient(ellipse at center, rgba(25, 10, 50, 1) 0%, rgba(15, 5, 30, 1) 40%, rgba(8, 3, 16, 1) 100%)'
        }}
      >
        {currentPlayer ? (
          <PlayerQueueCarousel 
            allPlayers={allPlayers}
            currentPlayer={currentPlayer}
            userRole={userRole}
            currentBidAmount={auctionState?.currentBidAmount || auctionState?.currentBid}
            leadingTeamName={auctionState?.leadingTeamName}
            teams={teams}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <Radio size={48} className="text-gray-600 mx-auto mb-4 animate-pulse" />
              <p className="text-lg font-bold text-gray-400">Waiting for live auction to start...</p>
            </div>
          </div>
        )}

        {/* TEAMS AUTO-SCROLL TICKER - BOTTOM */}
        <div 
          className="absolute bottom-0 left-0 right-0 overflow-hidden"
          style={{ 
            height: '160px',
            background: 'linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.4) 100%)',
            display: 'flex',
            alignItems: 'flex-end'
          }}
        >
          <div 
            className="ticker-container flex gap-4"
            style={{ 
              width: 'fit-content',
              paddingBottom: '16px',
              paddingLeft: '24px',
              paddingRight: '24px'
            }}
          >
            {/* Duplicate teams for continuous loop effect */}
            {[...teamsWithPlayers, ...teamsWithPlayers].map((team, idx) => (
              <div 
                key={`${team.id}-${idx}`}
                className="ticker-item relative"
                style={{
                  minWidth: '320px',
                  background: 'linear-gradient(135deg, rgba(140, 90, 20, 0.7) 0%, rgba(120, 75, 15, 0.7) 100%)',
                  border: '1.5px solid rgba(245, 158, 11, 0.5)',
                  boxShadow: '0 0 25px rgba(245, 158, 11, 0.3), inset 0 0 15px rgba(245, 158, 11, 0.1)',
                  borderRadius: '8px',
                  padding: '12px',
                  backdropFilter: 'blur(10px)'
                }}
              >
                {/* Header: Logo + Team Name + Budget */}
                <div className="flex items-center gap-3 mb-3 pb-2 border-b border-amber-500/30">
                  {team.logo && isValidImageUrl(team.logo) ? (
                    <img 
                      src={team.logo}
                      alt={team.name}
                      className="w-10 h-10 object-contain flex-shrink-0"
                      style={{ filter: 'drop-shadow(0 0 10px rgba(245, 158, 11, 0.6))' }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center flex-shrink-0">
                      <Award size={18} className="text-white" />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-black text-white uppercase tracking-wide truncate leading-tight">
                      {team.name}
                    </h3>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-[11px] font-bold text-amber-300">
                        ₹ {formatBudget(team.remainingBudget).replace(/₹/g, '').trim()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Players Grid - Show capacity vs filled as dots/lines */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] text-amber-300 font-bold uppercase tracking-wider">Squad</span>
                    <span className="text-[10px] font-black text-amber-300">
                      {team.boughtPlayers.length}/{team.totalSquadSize || 15}
                    </span>
                  </div>
                  
                  {/* Capacity Indicator - Horizontal lines */}
                  <div className="flex flex-wrap gap-1">
                    {/* Filled slots - Bright cyan */}
                    {Array.from({ length: team.boughtPlayers.length }).map((_, i) => (
                      <div 
                        key={`filled-${i}`}
                        className="flex-shrink-0 w-6 h-1.5 rounded-full"
                        style={{
                          background: 'linear-gradient(90deg, #F59E0B 0%, #F59E0B 100%)',
                          boxShadow: '0 0 6px rgba(245, 158, 11, 0.8)'
                        }}
                      />
                    ))}
                    
                    {/* Empty slots - Dim yellow */}
                    {Array.from({ length: Math.max(0, (team.totalSquadSize || 15) - team.boughtPlayers.length) }).map((_, i) => (
                      <div 
                        key={`empty-${i}`}
                        className="flex-shrink-0 w-6 h-1.5 rounded-full"
                        style={{
                          background: 'rgba(245, 158, 11, 0.3)',
                          border: '1px solid rgba(245, 158, 11, 0.4)'
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Budget Status */}
                <div className="flex items-center justify-between pt-2 border-t border-amber-500/30">
                  <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">Purse</span>
                  <span className="text-[10px] font-black text-amber-300">
                    ₹ {formatBudget(team.remainingBudget).replace(/₹/g, '').trim()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
