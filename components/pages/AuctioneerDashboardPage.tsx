import React, { useState } from 'react';
import { Play, Pause, SkipForward, Megaphone, AlertCircle, Clock, Trophy, Users, DollarSign, Activity, Bell, User, LogOut, Menu, Zap } from 'lucide-react';
import { AuctionStatus, MatchData, UserRole } from '../../types';

interface AuctioneerDashboardPageProps {
  setStatus: (status: AuctionStatus) => void;
  currentMatch: MatchData;
  currentUser: { name: string; email: string; role: UserRole };
}

export const AuctioneerDashboardPage: React.FC<AuctioneerDashboardPageProps> = ({ setStatus, currentMatch, currentUser }) => {
  const [activeSection, setActiveSection] = useState<'overview' | 'queue' | 'live' | 'announcements' | 'logs'>('overview');

  // Mock data - replace with actual data
  const auctionStats = {
    totalPlayers: currentMatch.players?.length || 0,
    soldPlayers: currentMatch.players?.filter((p: any) => p.status === 'sold').length || 0,
    unsoldPlayers: currentMatch.players?.filter((p: any) => p.status === 'unsold').length || 0,
    activeTeams: currentMatch.teams?.length || 0,
    currentBidValue: 0,
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
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-white/95 to-transparent backdrop-blur-xl border-b border-blue-100">
        <div className="flex items-center justify-between px-8 py-6">
          {/* Left: Logo */}
          <div className="flex items-center gap-4 w-1/4">
            <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-red-400 shadow-2xl hover:scale-105 transition-transform cursor-pointer" onClick={() => setStatus(AuctionStatus.HOME)}>
              <img src="./logo.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-black tracking-widest gold-text uppercase leading-none">Auctioneer</h1>
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.3em] mt-1">{currentMatch.name}</p>
            </div>
          </div>

          {/* Center: Navigation Tabs */}
          <div className="flex items-center justify-center gap-2 flex-1">
            <div className="flex items-center gap-1 p-1.5 bg-white/80 backdrop-blur-lg rounded-full border-2 border-red-200 shadow-lg">
              <button
                onClick={() => setActiveSection('overview')}
                className={`px-4 py-2 rounded-full transition-all font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 ${
                  activeSection === 'overview' ? 'bg-red-500 text-white shadow-lg' : 'text-slate-600 hover:bg-red-50'
                }`}
              >
                <Activity size={14} />
                Overview
              </button>
              <button
                onClick={() => setActiveSection('queue')}
                className={`px-4 py-2 rounded-full transition-all font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 ${
                  activeSection === 'queue' ? 'bg-red-500 text-white shadow-lg' : 'text-slate-600 hover:bg-red-50'
                }`}
              >
                <Users size={14} />
                Queue
              </button>
              <button
                onClick={() => setActiveSection('live')}
                className={`px-4 py-2 rounded-full transition-all font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 ${
                  activeSection === 'live' ? 'bg-red-500 text-white shadow-lg' : 'text-slate-600 hover:bg-red-50'
                }`}
              >
                <Zap size={14} />
                Live
              </button>
              <button
                onClick={() => setActiveSection('announcements')}
                className={`px-4 py-2 rounded-full transition-all font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 ${
                  activeSection === 'announcements' ? 'bg-red-500 text-white shadow-lg' : 'text-slate-600 hover:bg-red-50'
                }`}
              >
                <Megaphone size={14} />
                Announce
              </button>
              <button
                onClick={() => setActiveSection('logs')}
                className={`px-4 py-2 rounded-full transition-all font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 ${
                  activeSection === 'logs' ? 'bg-red-500 text-white shadow-lg' : 'text-slate-600 hover:bg-red-50'
                }`}
              >
                <Clock size={14} />
                Logs
              </button>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center justify-end gap-4 w-1/4">
            <button className="px-4 py-2 rounded-xl bg-white border-2 border-blue-200 hover:border-red-500 transition-all flex items-center gap-2 text-sm font-bold text-slate-700">
              <Bell size={16} className="text-red-500" />
              <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-xs">2</span>
            </button>
            
            <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white border-2 border-blue-200">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-red-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                {currentUser.name?.[0] || 'A'}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">{currentUser.name}</p>
                <p className="text-[9px] text-slate-500 uppercase tracking-wider">Auctioneer</p>
              </div>
            </div>

            <button 
              onClick={() => setStatus(AuctionStatus.HOME)} 
              className="px-4 py-2 rounded-xl bg-red-500/10 border-2 border-red-500/20 hover:bg-red-500 hover:text-white transition-all flex items-center gap-2 text-sm font-bold text-red-600"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="pt-32 pb-12 px-8 max-w-[1600px] mx-auto">
        <div className="flex-1 p-8 overflow-auto">
          {activeSection === 'overview' && (
            <div className="space-y-6">
              <h2 className="text-xl font-black uppercase tracking-wide">Command Center</h2>
              
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-6 border-2 border-gray-100 hover:border-blue-500 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <Users size={24} className="text-blue-500" />
                    <span className="text-2xl font-black">{auctionStats.totalPlayers}</span>
                  </div>
                  <p className="text-sm font-bold text-gray-600">Total Players</p>
                </div>

                <div className="bg-white rounded-2xl p-6 border-2 border-gray-100 hover:border-green-500 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <Trophy size={24} className="text-green-500" />
                    <span className="text-2xl font-black">{auctionStats.soldPlayers}</span>
                  </div>
                  <p className="text-sm font-bold text-gray-600">Players Sold</p>
                </div>

                <div className="bg-white rounded-2xl p-6 border-2 border-gray-100 hover:border-orange-500 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <AlertCircle size={24} className="text-orange-500" />
                    <span className="text-2xl font-black">{auctionStats.unsoldPlayers}</span>
                  </div>
                  <p className="text-sm font-bold text-gray-600">Unsold Players</p>
                </div>

                <div className="bg-white rounded-2xl p-6 border-2 border-gray-100 hover:border-purple-500 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <Users size={24} className="text-purple-500" />
                    <span className="text-2xl font-black">{auctionStats.activeTeams}</span>
                  </div>
                  <p className="text-sm font-bold text-gray-600">Active Teams</p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-2xl p-6 border-2 border-gray-100">
                <h3 className="text-lg font-black uppercase mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl hover:brightness-110 transition-all font-bold">
                    <Play size={20} />
                    <span>Start Auction</span>
                  </button>
                  <button className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:brightness-110 transition-all font-bold">
                    <Pause size={20} />
                    <span>Pause Auction</span>
                  </button>
                  <button className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:brightness-110 transition-all font-bold">
                    <Megaphone size={20} />
                    <span>Make Announcement</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'queue' && (
            <div className="space-y-6">
              <h2 className="text-xl font-black uppercase tracking-wide">Player Queue</h2>
              <div className="bg-white rounded-2xl p-6 border-2 border-gray-100">
                <p className="text-gray-500">Player queue will appear here</p>
              </div>
            </div>
          )}

          {activeSection === 'live' && (
            <div className="space-y-6">
              <h2 className="text-xl font-black uppercase tracking-wide">Live Bidding Panel</h2>
              <div className="bg-white rounded-2xl p-6 border-2 border-gray-100">
                <p className="text-gray-500">Live bidding controls will appear here when auction is active</p>
              </div>
            </div>
          )}

          {activeSection === 'announcements' && (
            <div className="space-y-6">
              <h2 className="text-xl font-black uppercase tracking-wide">Announcements & Control</h2>
              <div className="bg-white rounded-2xl p-6 border-2 border-gray-100">
                <p className="text-gray-500">Announcement controls will appear here</p>
              </div>
            </div>
          )}

          {activeSection === 'logs' && (
            <div className="space-y-6">
              <h2 className="text-xl font-black uppercase tracking-wide">Activity Logs</h2>
              <div className="bg-white rounded-2xl p-6 border-2 border-gray-100">
                <p className="text-gray-500">Activity logs will appear here</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
