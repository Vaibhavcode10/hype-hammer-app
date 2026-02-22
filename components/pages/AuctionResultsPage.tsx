import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Trophy, User, DollarSign, Clock, Medal, Crown, Star, TrendingUp, Sparkles } from 'lucide-react';
import { Player, Team, MatchData } from '../../types';

const API_BASE = 'https://us-central1-axilam.cloudfunctions.net/auction';

interface AuctionResultsPageProps {
  onClose: () => void;
  currentMatch: MatchData;
}

interface SoldPlayerWithTeam extends Player {
  teamLogo?: string;
  teamName?: string;
  rank?: number;
}

export const AuctionResultsPage: React.FC<AuctionResultsPageProps> = ({
  onClose,
  currentMatch
}) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAnimation, setShowAnimation] = useState(false);

  // Fetch players and teams from backend
  useEffect(() => {
    const fetchData = async () => {
      if (!currentMatch?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const matchQuery = `?matchId=${currentMatch.id}`;

        const [playersRes, teamsRes] = await Promise.all([
          fetch(`${API_BASE}/players${matchQuery}`),
          fetch(`${API_BASE}/teams${matchQuery}`)
        ]);

        if (playersRes.ok) {
          const data = await playersRes.json();
          setPlayers(data.data || []);
        }

        if (teamsRes.ok) {
          const data = await teamsRes.json();
          setTeams(data.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch results data:', error);
      } finally {
        setLoading(false);
        // Trigger animation after data loads
        setTimeout(() => setShowAnimation(true), 100);
      }
    };

    fetchData();
  }, [currentMatch?.id]);

  // Create a map of team ID to team info for quick lookup
  const teamMap = useMemo(() => {
    const map = new Map<string, Team>();
    teams.forEach(team => map.set(team.id, team));
    return map;
  }, [teams]);

  // Get sold players sorted by highest price (backend-driven data, sorted on frontend for display)
  const sortedSoldPlayers: SoldPlayerWithTeam[] = useMemo(() => {
    const soldPlayers = players.filter(p => p.status === 'SOLD');
    
    // Sort by sold price (highest first)
    const sorted = soldPlayers.sort((a, b) => {
      const priceA = a.soldAmount || a.soldPrice || a.finalPrice || a.currentBid || 0;
      const priceB = b.soldAmount || b.soldPrice || b.finalPrice || b.currentBid || 0;
      return priceB - priceA;
    });

    // Add team info and rank
    return sorted.map((player, index) => {
      const teamId = player.soldTo || player.leadingTeamId || player.teamId;
      const team = teamId ? teamMap.get(teamId) : undefined;
      return {
        ...player,
        teamLogo: team?.logo,
        teamName: team?.name || player.teamName || 'Unknown Team',
        rank: index + 1
      };
    });
  }, [players, teamMap]);

  // Format price for display
  const formatPrice = (amount: number): string => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)} L`;
    } else if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(0)} K`;
    }
    return `₹${amount}`;
  };

  // Format time for display
  const formatSoldTime = (timestamp: string | undefined): string => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Get rank medal/badge
  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="relative">
            <div className="absolute inset-0 animate-pulse bg-yellow-400/30 rounded-full blur-xl"></div>
            <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-500 flex items-center justify-center shadow-lg shadow-yellow-500/50 border-2 border-yellow-300">
              <Crown className="w-7 h-7 text-yellow-900" />
            </div>
            <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-yellow-300 animate-pulse" />
          </div>
        );
      case 2:
        return (
          <div className="relative">
            <div className="absolute inset-0 animate-pulse bg-slate-300/30 rounded-full blur-lg"></div>
            <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 flex items-center justify-center shadow-lg shadow-slate-400/50 border-2 border-slate-200">
              <Medal className="w-6 h-6 text-slate-700" />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="relative">
            <div className="absolute inset-0 animate-pulse bg-amber-600/20 rounded-full blur-lg"></div>
            <div className="relative w-11 h-11 rounded-full bg-gradient-to-br from-amber-500 via-amber-600 to-orange-700 flex items-center justify-center shadow-lg shadow-amber-600/50 border-2 border-amber-400">
              <Medal className="w-5 h-5 text-amber-100" />
            </div>
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-600/20 flex items-center justify-center border border-pink-500/30">
            <span className="text-pink-300 font-black text-sm">#{rank}</span>
          </div>
        );
    }
  };

  // Get row glow class based on rank
  const getRowGlow = (rank: number): string => {
    switch (rank) {
      case 1:
        return 'gold-glow';
      case 2:
        return 'silver-glow';
      case 3:
        return 'bronze-glow';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0a0a0f 0%, #1a0a1a 50%, #0d0d1a 100%)' }}>
        <div className="text-center">
          <div className="relative mx-auto mb-6 w-24 h-24">
            <div className="animate-spin rounded-full h-24 w-24 border-4 border-pink-500/20 border-t-pink-500"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Trophy size={36} className="text-pink-400/60" />
            </div>
          </div>
          <p className="text-pink-400 text-xl font-black uppercase tracking-wider">Loading Results</p>
          <div className="mt-4 w-64 h-1 mx-auto bg-pink-900/30 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full" style={{ animation: 'hud-load 2s ease-in-out infinite' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a0a0f 0%, #1a0a1a 50%, #0d0d1a 100%)' }}>
      {/* Animated Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating particles */}
        <div className="absolute top-20 left-10 w-2 h-2 bg-pink-500 rounded-full animate-ping opacity-60"></div>
        <div className="absolute top-40 right-20 w-3 h-3 bg-purple-500 rounded-full animate-ping opacity-40" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute bottom-40 left-1/4 w-2 h-2 bg-cyan-400 rounded-full animate-ping opacity-50" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-20 right-1/3 w-2 h-2 bg-yellow-400 rounded-full animate-ping opacity-60" style={{ animationDelay: '1.5s' }}></div>
        
        {/* Gradient orbs */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-pink-500/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[80px]"></div>
        
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.02]" style={{ 
          backgroundImage: 'linear-gradient(rgba(255, 0, 102, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 0, 102, 0.3) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }}></div>
        
        {/* Scanlines */}
        <div className="absolute inset-0 opacity-[0.015]" style={{ 
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 0, 102, 0.1) 2px, rgba(255, 0, 102, 0.1) 4px)'
        }}></div>
      </div>

      {/* Custom Styles */}
      <style>{`
        @keyframes hud-load {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        
        @keyframes slideInFromRight {
          0% { opacity: 0; transform: translateX(100px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        
        @keyframes fadeInUp {
          0% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.4); }
          50% { box-shadow: 0 0 40px rgba(255, 215, 0, 0.8), 0 0 60px rgba(255, 215, 0, 0.4); }
        }
        
        @keyframes silverPulse {
          0%, 100% { box-shadow: 0 0 15px rgba(192, 192, 192, 0.3); }
          50% { box-shadow: 0 0 30px rgba(192, 192, 192, 0.6), 0 0 50px rgba(192, 192, 192, 0.3); }
        }
        
        @keyframes bronzePulse {
          0%, 100% { box-shadow: 0 0 15px rgba(205, 127, 50, 0.3); }
          50% { box-shadow: 0 0 30px rgba(205, 127, 50, 0.6), 0 0 50px rgba(205, 127, 50, 0.3); }
        }
        
        .gold-glow {
          animation: glowPulse 2s ease-in-out infinite;
          background: linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 165, 0, 0.1) 100%);
          border: 1px solid rgba(255, 215, 0, 0.4) !important;
        }
        
        .silver-glow {
          animation: silverPulse 2.5s ease-in-out infinite;
          background: linear-gradient(135deg, rgba(192, 192, 192, 0.12) 0%, rgba(128, 128, 128, 0.08) 100%);
          border: 1px solid rgba(192, 192, 192, 0.35) !important;
        }
        
        .bronze-glow {
          animation: bronzePulse 3s ease-in-out infinite;
          background: linear-gradient(135deg, rgba(205, 127, 50, 0.12) 0%, rgba(165, 100, 40, 0.08) 100%);
          border: 1px solid rgba(205, 127, 50, 0.35) !important;
        }
        
        .result-row {
          animation: slideInFromRight 0.5s ease-out forwards;
          opacity: 0;
        }
        
        .result-row:nth-child(1) { animation-delay: 0.1s; }
        .result-row:nth-child(2) { animation-delay: 0.15s; }
        .result-row:nth-child(3) { animation-delay: 0.2s; }
        .result-row:nth-child(4) { animation-delay: 0.25s; }
        .result-row:nth-child(5) { animation-delay: 0.3s; }
        .result-row:nth-child(6) { animation-delay: 0.35s; }
        .result-row:nth-child(7) { animation-delay: 0.4s; }
        .result-row:nth-child(8) { animation-delay: 0.45s; }
        .result-row:nth-child(9) { animation-delay: 0.5s; }
        .result-row:nth-child(10) { animation-delay: 0.55s; }
        
        .header-animate {
          animation: fadeInUp 0.6s ease-out forwards;
        }
        
        .leaderboard-card {
          background: linear-gradient(135deg, rgba(255, 20, 100, 0.06) 0%, rgba(139, 0, 50, 0.1) 100%);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 0, 102, 0.15);
        }
        
        .leaderboard-card:hover {
          border-color: rgba(255, 0, 102, 0.4);
          transform: translateX(8px);
          box-shadow: 0 8px 40px rgba(255, 0, 102, 0.15);
        }
      `}</style>

      {/* Header */}
      <div className="relative z-10 sticky top-0 backdrop-blur-xl border-b border-pink-500/20" style={{ background: 'rgba(10, 10, 15, 0.85)' }}>
        <div className="max-w-7xl mx-auto px-8 py-5">
          <div className="flex items-center justify-between">
            {/* Back Button & Title */}
            <div className="flex items-center gap-6">
              <button
                onClick={onClose}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-pink-300 hover:text-white hover:bg-pink-500/20 transition-all font-bold text-sm border border-pink-500/20 hover:border-pink-500/40"
              >
                <ArrowLeft size={18} />
                <span>Back</span>
              </button>
              <div className="w-[3px] h-12 rounded-full bg-gradient-to-b from-pink-500 via-purple-500 to-cyan-500"></div>
              <div>
                <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 uppercase tracking-wider">
                  🏆 Auction Results
                </h1>
                <p className="text-pink-400/50 text-sm font-semibold uppercase tracking-[0.2em] mt-1">
                  {currentMatch?.name || 'Season'} • {currentMatch?.sportType || 'Cricket'}
                </p>
              </div>
            </div>

            {/* Stats Summary */}
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-pink-400/50 text-xs uppercase tracking-wider">Total Sold</p>
                <p className="text-2xl font-black text-white">{sortedSoldPlayers.length}</p>
              </div>
              <div className="w-px h-10 bg-pink-500/20"></div>
              <div className="text-right">
                <p className="text-pink-400/50 text-xs uppercase tracking-wider">Highest Bid</p>
                <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-500">
                  {sortedSoldPlayers[0] ? formatPrice(sortedSoldPlayers[0].soldAmount || sortedSoldPlayers[0].soldPrice || 0) : '₹0'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-8 py-8">
        {sortedSoldPlayers.length === 0 ? (
          <div className="text-center py-20">
            <Trophy size={80} className="mx-auto mb-6 text-pink-500/30" />
            <h3 className="text-2xl font-black text-white mb-2">No Results Yet</h3>
            <p className="text-pink-400/60">No players have been sold in this auction.</p>
          </div>
        ) : (
          <>
            {/* Podium Section for Top 3 */}
            {sortedSoldPlayers.length >= 3 && (
              <div className="mb-12 header-animate">
                <h2 className="text-center text-lg font-black text-pink-400/60 uppercase tracking-[0.3em] mb-8">
                  <Star className="inline-block w-5 h-5 mr-2 text-yellow-400" />
                  Top Acquisitions
                  <Star className="inline-block w-5 h-5 ml-2 text-yellow-400" />
                </h2>
                <div className="flex items-end justify-center gap-4">
                  {/* 2nd Place */}
                  <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '0.2s' }}>
                    <div className="relative mb-4">
                      <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-slate-300/20 to-slate-500/20 border-2 border-slate-400/40 flex items-center justify-center overflow-hidden shadow-lg shadow-slate-400/20">
                        {sortedSoldPlayers[1].imageUrl ? (
                          <img src={sortedSoldPlayers[1].imageUrl} alt={sortedSoldPlayers[1].name} className="w-full h-full object-cover" />
                        ) : (
                          <User size={40} className="text-slate-400" />
                        )}
                      </div>
                      <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-400 flex items-center justify-center border-2 border-white shadow-lg">
                        <span className="text-slate-800 font-black text-sm">2</span>
                      </div>
                    </div>
                    <div className="w-32 h-28 rounded-t-xl bg-gradient-to-b from-slate-400/30 to-slate-500/20 flex flex-col items-center justify-center border border-slate-400/30 border-b-0">
                      <p className="text-white font-bold text-sm text-center px-2 truncate w-full">{sortedSoldPlayers[1].name}</p>
                      <p className="text-slate-300 text-xl font-black mt-1">{formatPrice(sortedSoldPlayers[1].soldAmount || sortedSoldPlayers[1].soldPrice || 0)}</p>
                    </div>
                  </div>

                  {/* 1st Place */}
                  <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '0.1s' }}>
                    <div className="relative mb-4">
                      <div className="absolute -inset-2 bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-400 rounded-2xl opacity-50 blur-lg animate-pulse"></div>
                      <div className="relative w-32 h-32 rounded-2xl bg-gradient-to-br from-yellow-300/30 to-amber-500/30 border-2 border-yellow-400/60 flex items-center justify-center overflow-hidden shadow-xl shadow-yellow-500/30">
                        {sortedSoldPlayers[0].imageUrl ? (
                          <img src={sortedSoldPlayers[0].imageUrl} alt={sortedSoldPlayers[0].name} className="w-full h-full object-cover" />
                        ) : (
                          <User size={50} className="text-yellow-400" />
                        )}
                      </div>
                      <div className="absolute -top-3 -right-3">
                        <Crown className="w-10 h-10 text-yellow-400 drop-shadow-lg" />
                      </div>
                    </div>
                    <div className="w-40 h-36 rounded-t-xl bg-gradient-to-b from-yellow-400/30 to-amber-500/20 flex flex-col items-center justify-center border border-yellow-400/40 border-b-0">
                      <p className="text-white font-bold text-base text-center px-2 truncate w-full">{sortedSoldPlayers[0].name}</p>
                      <p className="text-yellow-300 text-2xl font-black mt-1">{formatPrice(sortedSoldPlayers[0].soldAmount || sortedSoldPlayers[0].soldPrice || 0)}</p>
                      <p className="text-yellow-400/60 text-xs mt-1">🔥 MVP</p>
                    </div>
                  </div>

                  {/* 3rd Place */}
                  <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '0.3s' }}>
                    <div className="relative mb-4">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-600/20 to-orange-700/20 border-2 border-amber-600/40 flex items-center justify-center overflow-hidden shadow-lg shadow-amber-600/20">
                        {sortedSoldPlayers[2].imageUrl ? (
                          <img src={sortedSoldPlayers[2].imageUrl} alt={sortedSoldPlayers[2].name} className="w-full h-full object-cover" />
                        ) : (
                          <User size={36} className="text-amber-500" />
                        )}
                      </div>
                      <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center border-2 border-white shadow-lg">
                        <span className="text-white font-black text-xs">3</span>
                      </div>
                    </div>
                    <div className="w-28 h-24 rounded-t-xl bg-gradient-to-b from-amber-600/30 to-orange-700/20 flex flex-col items-center justify-center border border-amber-600/30 border-b-0">
                      <p className="text-white font-bold text-sm text-center px-2 truncate w-full">{sortedSoldPlayers[2].name}</p>
                      <p className="text-amber-400 text-lg font-black mt-1">{formatPrice(sortedSoldPlayers[2].soldAmount || sortedSoldPlayers[2].soldPrice || 0)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Full Leaderboard */}
            <div>
              <h2 className="text-lg font-black text-pink-400/60 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                <TrendingUp className="w-5 h-5" />
                Complete Leaderboard
              </h2>

              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 px-6 py-3 mb-4 text-pink-400/60 text-xs font-bold uppercase tracking-wider">
                <div className="col-span-1">Rank</div>
                <div className="col-span-4">Player</div>
                <div className="col-span-3">Sold To</div>
                <div className="col-span-2 text-right">Final Price</div>
                <div className="col-span-2 text-right">Sold At</div>
              </div>

              {/* Player Rows */}
              <div className="space-y-3">
                {sortedSoldPlayers.map((player, index) => (
                  <div
                    key={player.id}
                    className={`result-row leaderboard-card grid grid-cols-12 gap-4 items-center px-6 py-4 rounded-2xl transition-all duration-300 ${getRowGlow(player.rank || index + 1)}`}
                  >
                    {/* Rank */}
                    <div className="col-span-1 flex justify-center">
                      {getRankBadge(player.rank || index + 1)}
                    </div>

                    {/* Player Info */}
                    <div className="col-span-4 flex items-center gap-4">
                      <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-600/20 flex items-center justify-center overflow-hidden border border-pink-500/30">
                        {player.imageUrl ? (
                          <img src={player.imageUrl} alt={player.name} className="w-full h-full object-cover" />
                        ) : (
                          <User size={24} className="text-pink-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-white font-bold text-base">{player.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-pink-400/60 text-xs">ID: {player.id.slice(0, 8)}...</span>
                          {player.role && (
                            <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-400 text-[10px] font-bold uppercase">
                              {player.role}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Sold To (Team) */}
                    <div className="col-span-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden border border-white/10">
                        {player.teamLogo ? (
                          <img src={player.teamLogo} alt={player.teamName} className="w-full h-full object-contain" />
                        ) : (
                          <Trophy size={18} className="text-pink-400/60" />
                        )}
                      </div>
                      <span className="text-white/80 font-medium text-sm truncate">{player.teamName}</span>
                    </div>

                    {/* Final Price */}
                    <div className="col-span-2 text-right">
                      <span className={`font-black text-lg ${
                        (player.rank || index + 1) === 1 ? 'text-yellow-400' :
                        (player.rank || index + 1) === 2 ? 'text-slate-300' :
                        (player.rank || index + 1) === 3 ? 'text-amber-500' :
                        'text-emerald-400'
                      }`}>
                        {formatPrice(player.soldAmount || player.soldPrice || player.finalPrice || 0)}
                      </span>
                    </div>

                    {/* Sold Time */}
                    <div className="col-span-2 text-right">
                      {player.soldAt ? (
                        <div className="flex items-center justify-end gap-2 text-pink-400/60">
                          <Clock size={14} />
                          <span className="text-sm">{formatSoldTime(player.soldAt)}</span>
                        </div>
                      ) : (
                        <span className="text-pink-400/30 text-sm">—</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
