import React, { useState } from 'react';
import { DollarSign, Users, Trophy, TrendingDown, Bell, User, LogOut, Menu, Shield, Activity, History, Zap } from 'lucide-react';
import { AuctionStatus, MatchData, UserRole } from '../../types';

interface TeamRepDashboardPageProps {
  setStatus: (status: AuctionStatus) => void;
  currentMatch: MatchData;
  currentUser: { name: string; email: string; role: UserRole; teamName?: string };
}

export const TeamRepDashboardPage: React.FC<TeamRepDashboardPageProps> = ({ setStatus, currentMatch, currentUser }) => {
  const [activeSection, setActiveSection] = useState<'overview' | 'live' | 'squad' | 'budget' | 'activity'>('overview');
  const [bidAmount, setBidAmount] = useState('');

  // Mock team data - replace with actual data
  const teamData = {
    name: currentUser.teamName || 'My Team',
    logo: './logo.jpg',
    totalBudget: currentMatch.budget || 1000000,
    remainingBudget: 750000,
    playersBought: 8,
    squadLimit: 15,
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

  const handlePlaceBid = () => {
    if (bidAmount && parseInt(bidAmount) <= teamData.remainingBudget) {
      console.log('Bid placed:', bidAmount);
      setBidAmount('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-orange-50 overflow-hidden">
      {/* Header with integrated navigation */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-white/95 to-transparent backdrop-blur-xl border-b border-blue-100">
        <div className="flex items-center justify-between px-8 py-6">
          {/* Left: Logo */}
          <div className="flex items-center gap-4 w-1/4">
            <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-purple-400 shadow-2xl hover:scale-105 transition-transform cursor-pointer" onClick={() => setStatus(AuctionStatus.HOME)}>
              <img src="./logo.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-black tracking-widest gold-text uppercase leading-none">Team Rep</h1>
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.3em] mt-1">{teamData.name}</p>
            </div>
          </div>

          {/* Center: Navigation Tabs */}
          <div className="flex items-center justify-center gap-2 flex-1">
            <div className="flex items-center gap-1 p-1.5 bg-white/80 backdrop-blur-lg rounded-full border-2 border-purple-200 shadow-lg">
              <button
                onClick={() => setActiveSection('overview')}
                className={`px-4 py-2 rounded-full transition-all font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 ${
                  activeSection === 'overview' ? 'bg-purple-500 text-white shadow-lg' : 'text-slate-600 hover:bg-purple-50'
                }`}
              >
                <Activity size={14} />
                Overview
              </button>
              <button
                onClick={() => setActiveSection('live')}
                className={`px-4 py-2 rounded-full transition-all font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 ${
                  activeSection === 'live' ? 'bg-purple-500 text-white shadow-lg' : 'text-slate-600 hover:bg-purple-50'
                }`}
              >
                <Zap size={14} />
                Live Bid
              </button>
              <button
                onClick={() => setActiveSection('squad')}
                className={`px-4 py-2 rounded-full transition-all font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 ${
                  activeSection === 'squad' ? 'bg-purple-500 text-white shadow-lg' : 'text-slate-600 hover:bg-purple-50'
                }`}
              >
                <Users size={14} />
                Squad
              </button>
              <button
                onClick={() => setActiveSection('budget')}
                className={`px-4 py-2 rounded-full transition-all font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 ${
                  activeSection === 'budget' ? 'bg-purple-500 text-white shadow-lg' : 'text-slate-600 hover:bg-purple-50'
                }`}
              >
                <DollarSign size={14} />
                Budget
              </button>
              <button
                onClick={() => setActiveSection('activity')}
                className={`px-4 py-2 rounded-full transition-all font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 ${
                  activeSection === 'activity' ? 'bg-purple-500 text-white shadow-lg' : 'text-slate-600 hover:bg-purple-50'
                }`}
              >
                <History size={14} />
                Activity
              </button>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center justify-end gap-4 w-1/4">
            <button className="px-4 py-2 rounded-xl bg-white border-2 border-blue-200 hover:border-purple-500 transition-all flex items-center gap-2 text-sm font-bold text-slate-700">
              <Bell size={16} className="text-purple-500" />
              <span className="px-2 py-0.5 rounded-full bg-purple-500 text-white text-xs">1</span>
            </button>
            
            <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white border-2 border-blue-200">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                {currentUser.name?.[0] || 'T'}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">{currentUser.name}</p>
                <p className="text-[9px] text-slate-500 uppercase tracking-wider">Team Rep</p>
              </div>
            </div>

            <button 
              onClick={() => setStatus(AuctionStatus.HOME)} 
              className="px-4 py-2 rounded-xl bg-purple-500/10 border-2 border-purple-500/20 hover:bg-purple-500 hover:text-white transition-all flex items-center gap-2 text-sm font-bold text-purple-600"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="pt-32 pb-12 px-8 max-w-[1600px] mx-auto">
        {activeSection === 'overview' && (
            <div className="space-y-6">
              <h2 className="text-xl font-black uppercase tracking-wide">Team Overview</h2>
              
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-6 border-2 border-gray-100 hover:border-green-500 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <DollarSign size={24} className="text-green-500" />
                    <span className="text-2xl font-black">₹{(teamData.remainingBudget / 100000).toFixed(1)}L</span>
                  </div>
                  <p className="text-sm font-bold text-gray-600">Remaining Budget</p>
                  <div className="mt-2 bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-blue-500 h-full"
                      style={{ width: `${(teamData.remainingBudget / teamData.totalBudget) * 100}%` }}
                    ></div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border-2 border-gray-100 hover:border-blue-500 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <Users size={24} className="text-blue-500" />
                    <span className="text-2xl font-black">{teamData.playersBought}</span>
                  </div>
                  <p className="text-sm font-bold text-gray-600">Players Bought</p>
                </div>

                <div className="bg-white rounded-2xl p-6 border-2 border-gray-100 hover:border-purple-500 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <Trophy size={24} className="text-purple-500" />
                    <span className="text-2xl font-black">{teamData.squadLimit - teamData.playersBought}</span>
                  </div>
                  <p className="text-sm font-bold text-gray-600">Spots Left</p>
                </div>

                <div className="bg-white rounded-2xl p-6 border-2 border-gray-100 hover:border-orange-500 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingDown size={24} className="text-orange-500" />
                    <span className="text-2xl font-black">₹{((teamData.totalBudget - teamData.remainingBudget) / 100000).toFixed(1)}L</span>
                  </div>
                  <p className="text-sm font-bold text-gray-600">Total Spent</p>
                </div>
              </div>

              {/* Team Info Card */}
              <div className="bg-white rounded-2xl p-6 border-2 border-gray-100">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-blue-500">
                    <img src={teamData.logo} alt="Team Logo" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black uppercase">{teamData.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">Total Budget: ₹{(teamData.totalBudget / 100000).toFixed(1)} Lakhs</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'live' && (
            <div className="space-y-6">
              <h2 className="text-xl font-black uppercase tracking-wide">Live Auction Room</h2>
              
              {currentMatch.status === 'LIVE' ? (
                <div className="space-y-4">
                  {/* Current Player Card */}
                  <div className="bg-white rounded-2xl p-6 border-2 border-green-500">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                      <span className="text-sm font-bold text-green-600">LIVE NOW</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-xl font-black mb-2">Current Player</h3>
                        <p className="text-gray-600">Player Name</p>
                        <p className="text-sm text-gray-500">Base Price: ₹5,00,000</p>
                      </div>
                      <div>
                        <h3 className="text-xl font-black mb-2">Current Bid</h3>
                        <p className="text-3xl font-black gold-text">₹7,50,000</p>
                        <p className="text-sm text-gray-500">Leading: Team XYZ</p>
                      </div>
                    </div>

                    {/* Bid Input */}
                    <div className="mt-6 flex gap-4">
                      <input
                        type="number"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        placeholder="Enter bid amount"
                        className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                      />
                      <button
                        onClick={handlePlaceBid}
                        disabled={!bidAmount || parseInt(bidAmount) > teamData.remainingBudget}
                        className="px-8 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl font-bold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Place Bid
                      </button>
                    </div>
                  </div>

                  {/* Bid History */}
                  <div className="bg-white rounded-2xl p-6 border-2 border-gray-100">
                    <h3 className="text-lg font-black uppercase mb-4">Bid History</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-bold">Team XYZ</span>
                        <span className="text-sm font-black">₹7,50,000</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-bold">Team ABC</span>
                        <span className="text-sm font-black">₹7,00,000</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-12 border-2 border-gray-100 text-center">
                  <Shield size={48} className="mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-bold text-gray-600">Auction is not live yet</p>
                  <p className="text-sm text-gray-500 mt-2">You'll be able to bid when the auction starts</p>
                </div>
              )}
            </div>
          )}

          {activeSection === 'squad' && (
            <div className="space-y-6">
              <h2 className="text-xl font-black uppercase tracking-wide">My Squad</h2>
              <div className="bg-white rounded-2xl p-6 border-2 border-gray-100">
                <p className="text-gray-500">Your bought players will appear here</p>
              </div>
            </div>
          )}

          {activeSection === 'budget' && (
            <div className="space-y-6">
              <h2 className="text-xl font-black uppercase tracking-wide">Budget History</h2>
              <div className="bg-white rounded-2xl p-6 border-2 border-gray-100">
                <p className="text-gray-500">Budget and spending history will appear here</p>
              </div>
            </div>
          )}

          {activeSection === 'activity' && (
            <div className="space-y-6">
              <h2 className="text-xl font-black uppercase tracking-wide">Team Activity</h2>
              <div className="bg-white rounded-2xl p-6 border-2 border-gray-100">
                <p className="text-gray-500">Activity notifications will appear here</p>
              </div>
            </div>
          )}
      </div>
    </div>
  );
};
