import React, { useState } from 'react';
import { Eye, Trophy, Users, DollarSign, Bell, User, LogOut, Menu, Activity, Star, TrendingUp, Zap } from 'lucide-react';
import { AuctionStatus, MatchData, UserRole } from '../../types';

interface GuestDashboardPageProps {
  setStatus: (status: AuctionStatus) => void;
  currentMatch: MatchData;
  currentUser: { name: string; email: string; role: UserRole };
}

export const GuestDashboardPage: React.FC<GuestDashboardPageProps> = ({ setStatus, currentMatch, currentUser }) => {
  const [activeSection, setActiveSection] = useState<'live' | 'favorites' | 'summary'>('live');
  const [favoriteTeams, setFavoriteTeams] = useState<string[]>([]);
  const [favoritePlayers, setFavoritePlayers] = useState<string[]>([]);

  // Mock live data
  const liveData = {
    currentPlayer: {
      name: 'Virat Sharma',
      role: 'Batsman',
      photo: './logo.jpg',
    },
    currentBid: 1250000,
    leadingTeam: 'Mumbai Warriors',
    basePrice: 500000,
  };

  const auctionSummary = {
    totalPlayers: currentMatch.players?.length || 0,
    playersSold: 45,
    playersUnsold: 5,
    highestBid: 2500000,
    topBuy: { player: 'MS Kumar', team: 'Chennai Kings', price: 2500000 },
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
              <img src="./logo.jpg" alt="Logo" className="w-full h-full object-cover" />
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
        {activeSection === 'live' && (
          <div className="space-y-8">
            <h1 className="text-4xl font-black uppercase tracking-wider gold-text">Live Auction View</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Current Player Card */}
              <div className="lg:col-span-2 bg-white/80 backdrop-blur-lg rounded-3xl overflow-hidden border-2 border-cyan-200 shadow-2xl">
                <div className="h-48 bg-gradient-to-br from-cyan-400 to-blue-500"></div>
                <div className="relative p-8 -mt-20">
                  <div className="w-40 h-40 rounded-3xl overflow-hidden border-4 border-white shadow-2xl">
                    <img src={liveData.currentPlayer.photo} alt="Player" className="w-full h-full object-cover" />
                  </div>
                  <h2 className="text-3xl font-black mt-6 uppercase">{liveData.currentPlayer.name}</h2>
                  <p className="text-slate-500 uppercase tracking-wider mt-2">{liveData.currentPlayer.role}</p>
                </div>
              </div>

              {/* Bid Info Card */}
              <div className="bg-white/80 backdrop-blur-lg rounded-3xl p-8 border-2 border-cyan-200 shadow-2xl">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-600 mb-6">Current Bid</h3>
                <p className="text-5xl font-black gold-text mb-8">₹{(liveData.currentBid / 100000).toFixed(1)}L</p>
                
                <div className="space-y-4 pt-4 border-t border-cyan-200">
                  <div>
                    <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider font-bold">Leading Team</p>
                    <p className="text-lg font-black">{liveData.leadingTeam}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider font-bold">Base Price</p>
                    <p className="text-lg font-black text-slate-600">₹{(liveData.basePrice / 100000).toFixed(1)}L</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Status */}
            <div className="bg-white/80 backdrop-blur-lg rounded-3xl p-8 border-2 border-cyan-200 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-lg font-black text-green-600 uppercase tracking-wider">Auction LIVE</span>
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
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Player</p>
                    <p className="text-xl font-black">{auctionSummary.topBuy.player}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Team</p>
                      <p className="text-lg font-black text-slate-800">{auctionSummary.topBuy.team}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Price</p>
                      <p className="text-lg font-black gold-text">₹{(auctionSummary.topBuy.price / 100000).toFixed(1)}L</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
