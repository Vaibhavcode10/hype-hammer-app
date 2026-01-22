import React, { useState, useEffect } from 'react';
import { Eye, Trophy, Users, DollarSign, Bell, User, LogOut, Menu, Activity, Star, TrendingUp, Zap } from 'lucide-react';
import { AuctionStatus, MatchData, UserRole, Team, Player } from '../../types';

interface GuestDashboardPageProps {
  setStatus: (status: AuctionStatus) => void;
  currentMatch: MatchData;
  currentUser: { name: string; email: string; role: UserRole };
}

export const GuestDashboardPage: React.FC<GuestDashboardPageProps> = ({ setStatus, currentMatch, currentUser }) => {
  const [activeSection, setActiveSection] = useState<'live' | 'favorites' | 'summary'>('live');
  const [favoriteTeams, setFavoriteTeams] = useState<string[]>([]);
  const [favoritePlayers, setFavoritePlayers] = useState<string[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch real data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch teams for this match
        const teamsResponse = await fetch(`http://localhost:5000/api/teams?matchId=${currentMatch.id}`);
        if (teamsResponse.ok) {
          const teamsData = await teamsResponse.json();
          setTeams(teamsData.data || []);
        }
        
        // Fetch players for this match
        const playersResponse = await fetch(`http://localhost:5000/api/players?matchId=${currentMatch.id}`);
        if (playersResponse.ok) {
          const playersData = await playersResponse.json();
          setPlayers(playersData.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch auction data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (currentMatch?.id) {
      fetchData();
    }
  }, [currentMatch?.id]);

  // Calculate real auction summary
  const auctionSummary = {
    totalPlayers: players.length,
    playersSold: players.filter(p => p.status === 'SOLD').length,
    playersUnsold: players.filter(p => p.status === 'UNSOLD').length,
    totalTeams: teams.length,
    highestBid: players.reduce((max, p) => p.soldPrice && p.soldPrice > max ? p.soldPrice : max, 0),
    topBuy: players
      .filter(p => p.soldPrice)
      .sort((a, b) => (b.soldPrice || 0) - (a.soldPrice || 0))[0]
  };

  const getAuctionStatusColor = (status: string) => {
    switch (status) {
      case 'READY': return 'bg-yellow-500';
      case 'LIVE': return 'bg-green-500';
      case 'PAUSED': return 'bg-orange-500';
      case 'ENDED': return 'bg-gray-500';
      default: return 'bg-blue-500';
    }
  };

  const getAuctionStatusLabel = (status: string) => {
    switch (status) {
      case 'READY': return 'Not Started';
      case 'LIVE': return 'Live';
      case 'PAUSED': return 'Paused';
      case 'ENDED': return 'Ended';
      default: return 'Upcoming';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-orange-50 overflow-hidden">
      {/* Header with integrated navigation */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-white/95 to-transparent backdrop-blur-xl border-b border-cyan-100">
        <div className="flex items-center justify-between px-8 py-6">
          {/* Left: Logo */}
          <div className="flex items-center gap-4 w-1/4">
            <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-cyan-400 shadow-2xl hover:scale-105 transition-transform cursor-pointer" onClick={() => setStatus(AuctionStatus.HOME)}>
                <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-black tracking-widest gold-text uppercase leading-none">Spectator</h1>
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.3em] mt-1">Guest Viewer</p>
            </div>
          </div>

          {/* Center: Navigation Tabs */}
          <div className="flex items-center justify-center gap-2 flex-1">
            <div className="flex items-center gap-1 p-1.5 bg-white/80 backdrop-blur-lg rounded-full border-2 border-cyan-200 shadow-lg">
              <button
                onClick={() => setActiveSection('live')}
                className={`px-4 py-2 rounded-full transition-all font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 ${
                  activeSection === 'live' ? 'bg-cyan-500 text-white shadow-lg' : 'text-slate-600 hover:bg-cyan-50'
                }`}
              >
                <Zap size={14} />
                Live
              </button>
              <button
                onClick={() => setActiveSection('favorites')}
                className={`px-4 py-2 rounded-full transition-all font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 ${
                  activeSection === 'favorites' ? 'bg-cyan-500 text-white shadow-lg' : 'text-slate-600 hover:bg-cyan-50'
                }`}
              >
                <Star size={14} />
                Favorites
              </button>
              <button
                onClick={() => setActiveSection('summary')}
                className={`px-4 py-2 rounded-full transition-all font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 ${
                  activeSection === 'summary' ? 'bg-cyan-500 text-white shadow-lg' : 'text-slate-600 hover:bg-cyan-50'
                }`}
              >
                <TrendingUp size={14} />
                Summary
              </button>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center justify-end gap-4 w-1/4">
            <button className="px-4 py-2 rounded-xl bg-white border-2 border-blue-200 hover:border-cyan-500 transition-all flex items-center gap-2 text-sm font-bold text-slate-700">
              <Bell size={16} className="text-cyan-500" />
              <span className="px-2 py-0.5 rounded-full bg-cyan-500 text-white text-xs">0</span>
            </button>
            
            <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white border-2 border-blue-200">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                {currentUser.name?.[0] || 'G'}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">{currentUser.name}</p>
                <p className="text-[9px] text-slate-500 uppercase tracking-wider">Spectator</p>
              </div>
            </div>

            <button 
              onClick={() => setStatus(AuctionStatus.HOME)} 
              className="px-4 py-2 rounded-xl bg-cyan-500/10 border-2 border-cyan-500/20 hover:bg-cyan-500 hover:text-white transition-all flex items-center gap-2 text-sm font-bold text-cyan-600"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="pt-32 pb-12 px-8 max-w-[1600px] mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-lg font-bold text-slate-600">Loading auction data...</p>
            </div>
          </div>
        ) : activeSection === 'live' && (
          <div className="space-y-8">
            <h1 className="text-4xl font-black uppercase tracking-wider gold-text">Live Auction View</h1>
            
            {players.length === 0 ? (
              <div className="bg-white/80 backdrop-blur-lg rounded-3xl p-12 border-2 border-blue-100 text-center shadow-2xl">
                <Activity size={56} className="mx-auto mb-6 text-slate-400" />
                <p className="text-2xl font-black text-slate-800">No Auction Data Available</p>
                <p className="text-slate-500 mt-3">Waiting for auction to start or players to be added</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Current Player Card */}
                <div className="lg:col-span-2 bg-white/80 backdrop-blur-lg rounded-3xl overflow-hidden border-2 border-cyan-200 shadow-2xl">
                  <div className="h-48 bg-gradient-to-br from-cyan-400 to-blue-500"></div>
                  <div className="relative p-8 -mt-20">
                    <div className="w-40 h-40 rounded-3xl overflow-hidden border-4 border-white shadow-2xl bg-slate-200 flex items-center justify-center">
                      {players[0]?.imageUrl ? (
                        <img src={players[0].imageUrl} alt="Player" className="w-full h-full object-cover" />
                      ) : (
                        <User size={64} className="text-slate-400" />
                      )}
                    </div>
                    <h2 className="text-3xl font-black mt-6 uppercase">{players[0]?.name || 'No Player'}</h2>
                    <p className="text-slate-500 uppercase tracking-wider mt-2">{players[0]?.roleId || 'Unknown Role'}</p>
                    <p className="text-sm text-slate-400 mt-2">Status: {players[0]?.status || 'PENDING'}</p>
                  </div>
                </div>

                {/* Bid Info Card */}
                <div className="bg-white/80 backdrop-blur-lg rounded-3xl p-8 border-2 border-cyan-200 shadow-2xl">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-600 mb-6">
                    {players[0]?.status === 'SOLD' ? 'Final Price' : 'Base Price'}
                  </h3>
                  <p className="text-5xl font-black gold-text mb-8">
                    ₹{((players[0]?.soldPrice || players[0]?.basePrice || 0) / 100000).toFixed(1)}L
                  </p>
                  
                  <div className="space-y-4 pt-4 border-t border-cyan-200">
                    {players[0]?.status === 'SOLD' && players[0]?.teamId && (
                      <div>
                        <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider font-bold">Bought By</p>
                        <p className="text-lg font-black">
                          {teams.find(t => t.id === players[0]?.teamId)?.name || 'Unknown Team'}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider font-bold">Base Price</p>
                      <p className="text-lg font-black text-slate-600">₹{((players[0]?.basePrice || 0) / 100000).toFixed(1)}L</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Live Status */}
            <div className="bg-white/80 backdrop-blur-lg rounded-3xl p-8 border-2 border-cyan-200 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full ${currentMatch.auctionStatus === 'LIVE' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                <span className={`text-lg font-black uppercase tracking-wider ${currentMatch.auctionStatus === 'LIVE' ? 'text-green-600' : 'text-gray-600'}`}>
                  Auction {currentMatch.auctionStatus || 'NOT STARTED'}
                </span>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'favorites' && (
          <div className="space-y-8">
            <h1 className="text-4xl font-black uppercase tracking-wider gold-text">My Favorites</h1>
            
            {favoritePlayers.length === 0 && favoriteTeams.length === 0 ? (
              <div className="bg-white/80 backdrop-blur-lg rounded-3xl p-12 border-2 border-blue-100 text-center shadow-2xl">
                <Star size={56} className="mx-auto mb-6 text-slate-400" />
                <p className="text-2xl font-black text-slate-800">No favorites yet</p>
                <p className="text-slate-500 mt-3">Star your favorite players and teams to track them here</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Favorite Players */}
                {favoritePlayers.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-black uppercase tracking-wider">Favorite Players</h3>
                    {favoritePlayers.map((player, index) => (
                      <div key={index} className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 border-2 border-cyan-100 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                        <p className="font-bold text-slate-800">{player}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Favorite Teams */}
                {favoriteTeams.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-black uppercase tracking-wider">Favorite Teams</h3>
                    {favoriteTeams.map((team, index) => (
                      <div key={index} className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 border-2 border-cyan-100 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                        <p className="font-bold text-slate-800">{team}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeSection === 'summary' && (
          <div className="space-y-8">
            <h1 className="text-4xl font-black uppercase tracking-wider gold-text">Auction Summary</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Total Players */}
              <div className="bg-white/80 backdrop-blur-lg rounded-3xl p-8 border-2 border-cyan-200 shadow-2xl hover:shadow-3xl transition-all hover:-translate-y-1">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-600">Total Players</h3>
                  <Users size={24} className="text-cyan-500" />
                </div>
                <p className="text-4xl font-black">{auctionSummary.totalPlayers}</p>
              </div>

              {/* Players Sold */}
              <div className="bg-white/80 backdrop-blur-lg rounded-3xl p-8 border-2 border-cyan-200 shadow-2xl hover:shadow-3xl transition-all hover:-translate-y-1">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-600">Players Sold</h3>
                  <Trophy size={24} className="text-cyan-500" />
                </div>
                <p className="text-4xl font-black text-green-600">{auctionSummary.playersSold}</p>
              </div>

              {/* Highest Bid */}
              <div className="bg-white/80 backdrop-blur-lg rounded-3xl p-8 border-2 border-cyan-200 shadow-2xl hover:shadow-3xl transition-all hover:-translate-y-1">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-600">Highest Bid</h3>
                  <DollarSign size={24} className="text-cyan-500" />
                </div>
                <p className="text-3xl font-black gold-text">₹{(auctionSummary.highestBid / 100000).toFixed(1)}L</p>
              </div>

              {/* Players Unsold */}
              <div className="bg-white/80 backdrop-blur-lg rounded-3xl p-8 border-2 border-cyan-200 shadow-2xl hover:shadow-3xl transition-all hover:-translate-y-1">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-600">Players Unsold</h3>
                  <Activity size={24} className="text-cyan-500" />
                </div>
                <p className="text-4xl font-black text-orange-600">{auctionSummary.playersUnsold}</p>
              </div>

              {/* Top Buy */}
              <div className="md:col-span-2 bg-white/80 backdrop-blur-lg rounded-3xl p-8 border-2 border-cyan-200 shadow-2xl hover:shadow-3xl transition-all hover:-translate-y-1">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-600">Costliest Buy</h3>
                  <Star size={24} className="text-cyan-500" />
                </div>
                {auctionSummary.topBuy ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Player</p>
                      <p className="text-xl font-black">{auctionSummary.topBuy.name}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Team</p>
                        <p className="text-lg font-black text-slate-800">
                          {teams.find(t => t.id === auctionSummary.topBuy?.teamId)?.name || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Price</p>
                        <p className="text-lg font-black gold-text">
                          ₹{((auctionSummary.topBuy.soldPrice || 0) / 100000).toFixed(1)}L
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-4">No sales yet</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
