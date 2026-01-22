import React, { useState, useEffect } from 'react';
import { User, Trophy, Clock, DollarSign, Bell, LogOut, Menu, Activity, History, Award, Zap } from 'lucide-react';
import { AuctionStatus, MatchData, UserRole, Player } from '../../types';

interface PlayerDashboardPageProps {
  setStatus: (status: AuctionStatus) => void;
  currentMatch: MatchData;
  currentUser: { name: string; email: string; role: UserRole; playerRole?: string; basePrice?: number };
}

export const PlayerDashboardPage: React.FC<PlayerDashboardPageProps> = ({ setStatus, currentMatch, currentUser }) => {
  const [activeSection, setActiveSection] = useState<'profile' | 'status' | 'result' | 'history'>('profile');
  const [playerData, setPlayerData] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch player data from API
  useEffect(() => {
    const fetchPlayerData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:5000/api/players?matchId=${currentMatch.id}&email=${currentUser.email}`);
        if (response.ok) {
          const data = await response.json();
          const player = data.data?.find((p: Player) => p.email === currentUser.email);
          if (player) {
            setPlayerData(player);
          }
        }
      } catch (error) {
        console.error('Failed to fetch player data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (currentMatch?.id && currentUser?.email) {
      fetchPlayerData();
    }
  }, [currentMatch?.id, currentUser?.email]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'live': return 'bg-green-500 animate-pulse';
      case 'sold': return 'bg-blue-500';
      case 'unsold': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Awaiting Turn';
      case 'live': return 'Live Now';
      case 'sold': return 'Sold';
      case 'unsold': return 'Unsold';
      default: return 'Unknown';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-orange-50 overflow-hidden">
      {/* Header with integrated navigation */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-white/95 to-transparent backdrop-blur-xl border-b border-green-100">
        <div className="flex items-center justify-between px-8 py-6">
          {/* Left: Logo */}
          <div className="flex items-center gap-4 w-1/4">
            <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-green-400 shadow-2xl hover:scale-105 transition-transform cursor-pointer" onClick={() => setStatus(AuctionStatus.HOME)}>
              <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-black tracking-widest gold-text uppercase leading-none">Player</h1>
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.3em] mt-1">{playerData?.roleId || currentUser.playerRole || 'Player'}</p>
            </div>
          </div>

          {/* Center: Navigation Tabs */}
          <div className="flex items-center justify-center gap-2 flex-1">
            <div className="flex items-center gap-1 p-1.5 bg-white/80 backdrop-blur-lg rounded-full border-2 border-green-200 shadow-lg">
              <button
                onClick={() => setActiveSection('profile')}
                className={`px-4 py-2 rounded-full transition-all font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 ${
                  activeSection === 'profile' ? 'bg-green-500 text-white shadow-lg' : 'text-slate-600 hover:bg-green-50'
                }`}
              >
                <User size={14} />
                Profile
              </button>
              <button
                onClick={() => setActiveSection('status')}
                className={`px-4 py-2 rounded-full transition-all font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 ${
                  activeSection === 'status' ? 'bg-green-500 text-white shadow-lg' : 'text-slate-600 hover:bg-green-50'
                }`}
              >
                <Zap size={14} />
                Status
              </button>
              <button
                onClick={() => setActiveSection('result')}
                className={`px-4 py-2 rounded-full transition-all font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 ${
                  activeSection === 'result' ? 'bg-green-500 text-white shadow-lg' : 'text-slate-600 hover:bg-green-50'
                }`}
              >
                <Trophy size={14} />
                Result
              </button>
              <button
                onClick={() => setActiveSection('history')}
                className={`px-4 py-2 rounded-full transition-all font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 ${
                  activeSection === 'history' ? 'bg-green-500 text-white shadow-lg' : 'text-slate-600 hover:bg-green-50'
                }`}
              >
                <History size={14} />
                History
              </button>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center justify-end gap-4 w-1/4">
            <button className="px-4 py-2 rounded-xl bg-white border-2 border-blue-200 hover:border-green-500 transition-all flex items-center gap-2 text-sm font-bold text-slate-700">
              <Bell size={16} className="text-green-500" />
              <span className="px-2 py-0.5 rounded-full bg-green-500 text-white text-xs">0</span>
            </button>
            
            <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white border-2 border-blue-200">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-teal-500 flex items-center justify-center text-white font-bold text-sm">
                {currentUser.name?.[0] || 'P'}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">{currentUser.name}</p>
                <p className="text-[9px] text-slate-500 uppercase tracking-wider">Player</p>
              </div>
            </div>

            <button 
              onClick={() => setStatus(AuctionStatus.HOME)} 
              className="px-4 py-2 rounded-xl bg-green-500/10 border-2 border-green-500/20 hover:bg-green-500 hover:text-white transition-all flex items-center gap-2 text-sm font-bold text-green-600"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="pt-32 pb-12 px-8 max-w-[1600px] mx-auto">
        {activeSection === 'profile' && (
          <div className="space-y-8">
            <h1 className="text-4xl font-black uppercase tracking-wider gold-text">My Profile</h1>
            
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-lg font-bold text-slate-600">Loading player data...</p>
                </div>
              </div>
            ) : !playerData ? (
              <div className="bg-white/80 backdrop-blur-lg rounded-3xl p-12 border-2 border-green-100 text-center shadow-2xl">
                <User size={56} className="mx-auto mb-6 text-slate-400" />
                <p className="text-2xl font-black text-slate-800">No Player Profile Found</p>
                <p className="text-slate-500 mt-3">Your player registration might be pending</p>
              </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Player Card */}
              <div className="bg-white/80 backdrop-blur-lg rounded-3xl overflow-hidden border-2 border-green-200 shadow-2xl hover:shadow-3xl transition-all hover:-translate-y-1">
                <div className="h-40 bg-gradient-to-br from-green-400 to-teal-500"></div>
                <div className="relative p-8 -mt-12">
                  <div className="w-32 h-32 rounded-2xl overflow-hidden border-4 border-white shadow-2xl mx-auto bg-slate-200 flex items-center justify-center">
                    {playerData?.imageUrl ? (
                      <img src={playerData.imageUrl} alt="Player" className="w-full h-full object-cover" />
                    ) : (
                      <User size={48} className="text-slate-400" />
                    )}
                  </div>
                  <h3 className="text-2xl font-black text-center mt-6 uppercase">{playerData.name}</h3>
                  <p className="text-sm text-slate-500 text-center uppercase tracking-wider">{playerData.roleId}</p>
                  <div className="mt-6 flex items-center justify-center gap-2">
                    <div className={`w-4 h-4 rounded-full ${getStatusColor(playerData.status?.toLowerCase() || 'pending')} shadow-lg`}></div>
                    <span className="text-sm font-bold text-slate-600">{getStatusLabel(playerData.status?.toLowerCase() || 'pending')}</span>
                  </div>
                </div>
              </div>

              {/* Base Price Card */}
              <div className="bg-white/80 backdrop-blur-lg rounded-3xl p-8 border-2 border-green-200 shadow-2xl hover:shadow-3xl transition-all hover:-translate-y-1">
                <p className="text-xs text-slate-500 mb-3 uppercase tracking-wider font-bold">Base Price</p>
                <p className="text-4xl font-black gold-text mb-6">₹{((playerData.basePrice || 0) / 100000).toFixed(1)}L</p>
                <div className="p-4 bg-green-50 rounded-2xl border-2 border-green-100">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    This is your estimated value. Teams will bid against this base price during the auction.
                  </p>
                </div>
              </div>

              {/* Stats Card */}
              <div className="bg-white/80 backdrop-blur-lg rounded-3xl p-8 border-2 border-green-200 shadow-2xl hover:shadow-3xl transition-all hover:-translate-y-1">
                <h3 className="font-black text-slate-800 mb-6 uppercase tracking-wider text-sm">Quick Stats</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-600 uppercase tracking-wider font-bold">Matches</span>
                    <span className="font-black text-lg">25</span>
                  </div>
                  <div className="h-1 bg-gray-200 rounded-full"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-600 uppercase tracking-wider font-bold">Runs/Points</span>
                    <span className="font-black text-lg">1,250</span>
                  </div>
                  <div className="h-1 bg-gray-200 rounded-full"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-600 uppercase tracking-wider font-bold">Avg. Rating</span>
                    <span className="font-black text-lg">8.2/10</span>
                  </div>
                </div>
              </div>
            </div>
            )}
          </div>
        )}

        {activeSection === 'status' && (
          <div className="space-y-8">
            <h1 className="text-4xl font-black uppercase tracking-wider gold-text">Auction Status</h1>
            
            {!playerData ? (
              <div className="bg-white/80 backdrop-blur-lg rounded-3xl p-12 text-center border-2 border-green-100 shadow-2xl">
                <p className="text-slate-500">No player data available</p>
              </div>
            ) : playerData.status?.toLowerCase() === 'live' ? (
              <div className="bg-white/80 backdrop-blur-lg rounded-3xl p-10 border-2 border-green-500 shadow-2xl">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-5 h-5 rounded-full bg-green-500 animate-pulse shadow-lg"></div>
                  <span className="text-2xl font-black text-green-600 uppercase tracking-wider">YOU'RE LIVE NOW!</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <p className="text-xs text-slate-500 mb-3 uppercase tracking-wider font-bold">Current Bid</p>
                    <p className="text-5xl font-black gold-text">₹8.5 Lakhs</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-3 uppercase tracking-wider font-bold">Leading Team</p>
                    <p className="text-3xl font-black text-slate-800">Team Champions</p>
                  </div>
                </div>
                <div className="mt-8 p-6 bg-green-50 rounded-2xl border-2 border-green-200">
                  <p className="text-sm text-slate-700 leading-relaxed">
                    <strong className="text-slate-800">Note:</strong> You cannot interact with bidding. Teams are competing for you!
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white/80 backdrop-blur-lg rounded-3xl p-12 border-2 border-blue-100 text-center shadow-2xl">
                <Clock size={56} className="mx-auto mb-6 text-slate-400" />
                <p className="text-2xl font-black text-slate-800">Your turn is coming up</p>
                <p className="text-slate-500 mt-3">Please wait while other players are being auctioned</p>
              </div>
            )}
          </div>
        )}

        {activeSection === 'result' && (
          <div className="space-y-8">
            <h1 className="text-4xl font-black uppercase tracking-wider gold-text">Auction Result</h1>
            
            {!playerData ? (
              <div className="bg-white/80 backdrop-blur-lg rounded-3xl p-12 text-center border-2 border-green-100 shadow-2xl">
                <p className="text-slate-500">No player data available</p>
              </div>
            ) : playerData.teamId && playerData.soldPrice ? (
              <div className="bg-white/80 backdrop-blur-lg rounded-3xl p-10 border-2 border-green-500 shadow-2xl">
                <div className="text-center mb-8">
                  <Trophy size={72} className="mx-auto mb-6 text-green-500" />
                  <h3 className="text-4xl font-black uppercase mb-3">Congratulations!</h3>
                  <p className="text-slate-600 text-lg">You've been successfully sold</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="text-center p-4 bg-white rounded-2xl border-2 border-green-100">
                    <p className="text-xs text-slate-500 mb-3 uppercase tracking-wider font-bold">Sold To Team</p>
                    <p className="text-xl font-black">Team #{playerData.teamId}</p>
                  </div>
                  <div className="text-center p-4 bg-white rounded-2xl border-2 border-green-100">
                    <p className="text-xs text-slate-500 mb-3 uppercase tracking-wider font-bold">Final Price</p>
                    <p className="text-xl font-black gold-text">₹{((playerData.soldPrice || 0) / 100000).toFixed(1)} Lakhs</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white/80 backdrop-blur-lg rounded-3xl p-12 border-2 border-blue-100 text-center shadow-2xl">
                <Trophy size={56} className="mx-auto mb-6 text-slate-400" />
                <p className="text-2xl font-black text-slate-800">Results will appear here</p>
                <p className="text-slate-500 mt-3">Check back after the auction completes</p>
              </div>
            )}
          </div>
        )}

        {activeSection === 'history' && (
          <div className="space-y-8">
            <h1 className="text-4xl font-black uppercase tracking-wider gold-text">Past Seasons</h1>
            <div className="bg-white/80 backdrop-blur-lg rounded-3xl p-10 border-2 border-blue-100 shadow-2xl">
              <p className="text-slate-500 text-lg">Your auction history will appear here</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
