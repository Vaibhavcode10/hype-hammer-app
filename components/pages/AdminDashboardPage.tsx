import React, { useState } from 'react';
import { 
  BarChart3, Users, Trophy, DollarSign, Activity, AlertCircle, 
  Search, Bell, User, LogOut, Menu, Calendar, Shield, 
  Gavel, UserCheck, TrendingUp, FileText, Settings, Eye,
  Play, Pause, StopCircle, Edit, Trash2, Check, X, Download,
  Clock, Target, Award, Briefcase, ChevronRight, Filter,
  PieChart, LineChart, ArrowUp, ArrowDown, Sparkles, Zap,
  Home
} from 'lucide-react';
import { AuctionStatus, SportData, UserRole } from '../../types';

interface AdminDashboardPageProps {
  setStatus: (status: AuctionStatus) => void;
  allSports: SportData[];
  currentUser: { name: string; email: string; role: UserRole };
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ setStatus, allSports, currentUser }) => {
  const [activeSection, setActiveSection] = useState<'overview' | 'seasons' | 'users'>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate platform-wide KPIs
  const totalSeasons = allSports.reduce((acc, sport) => acc + sport.matches.length, 0);
  const activeAuctions = allSports.reduce((acc, sport) => 
    acc + sport.matches.filter(m => m.status === 'LIVE' || m.status === 'PAUSED').length, 0
  );
  const totalTeams = allSports.reduce((acc, sport) => 
    acc + sport.matches.reduce((sum, m) => sum + (m.teams?.length || 0), 0), 0
  );
  const totalPlayers = allSports.reduce((acc, sport) => 
    acc + sport.matches.reduce((sum, m) => sum + (m.players?.length || 0), 0), 0
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SETUP': return 'bg-yellow-400';
      case 'ONGOING': case 'LIVE': return 'bg-green-500 animate-pulse';
      case 'PAUSED': return 'bg-orange-500';
      case 'COMPLETED': case 'ENDED': return 'bg-gray-400';
      default: return 'bg-blue-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'SETUP': return 'Draft';
      case 'ONGOING': return 'Live';
      case 'LIVE': return 'Live';
      case 'PAUSED': return 'Paused';
      case 'COMPLETED': return 'Completed';
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
            <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-yellow-400 shadow-2xl hover:scale-105 transition-transform cursor-pointer" onClick={() => setStatus(AuctionStatus.HOME)}>
              <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-black tracking-widest gold-text uppercase leading-none">Super Admin</h1>
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.3em] mt-1">Command Center</p>
            </div>
          </div>

          {/* Center: Navigation Tabs */}
          <div className="flex items-center justify-center gap-2 flex-1">
            <div className="flex items-center gap-2 p-2 bg-white/80 backdrop-blur-lg rounded-full border-2 border-blue-200 shadow-lg">
              <button
                onClick={() => setActiveSection('overview')}
                className={`px-6 py-3 rounded-full transition-all font-bold text-sm uppercase tracking-wider flex items-center gap-2 ${
                  activeSection === 'overview' ? 'gold-gradient text-white shadow-lg' : 'text-slate-600 hover:bg-blue-50'
                }`}
              >
                <Sparkles size={16} />
                Overview
              </button>
              <button
                onClick={() => setActiveSection('seasons')}
                className={`px-6 py-3 rounded-full transition-all font-bold text-sm uppercase tracking-wider flex items-center gap-2 ${
                  activeSection === 'seasons' ? 'gold-gradient text-white shadow-lg' : 'text-slate-600 hover:bg-blue-50'
                }`}
              >
                <Trophy size={16} />
                Seasons
              </button>
              <button
                onClick={() => setActiveSection('users')}
                className={`px-6 py-3 rounded-full transition-all font-bold text-sm uppercase tracking-wider flex items-center gap-2 ${
                  activeSection === 'users' ? 'gold-gradient text-white shadow-lg' : 'text-slate-600 hover:bg-blue-50'
                }`}
              >
                <Users size={16} />
                Users
              </button>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center justify-end gap-4 w-1/4">
            <button className="px-4 py-2 rounded-xl bg-white border-2 border-blue-200 hover:border-blue-500 transition-all flex items-center gap-2 text-sm font-bold text-slate-700">
              <Bell size={16} className="text-orange-500" />
              <span className="px-2 py-0.5 rounded-full bg-orange-500 text-white text-xs">3</span>
            </button>
            
            <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white border-2 border-blue-200">
              <div className="w-8 h-8 rounded-full gold-gradient flex items-center justify-center text-white font-bold text-sm">
                {currentUser.name?.[0] || 'A'}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">{currentUser.name}</p>
                <p className="text-[9px] text-slate-500 uppercase tracking-wider">{currentUser.role}</p>
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
        
        {/* OVERVIEW SECTION */}
        {activeSection === 'overview' && (
          <div className="space-y-8 animate-in fade-in duration-700">
            {/* Hero KPI Cards - Floating Design */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Seasons Card */}
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-blue-600 rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                <div className="relative bg-white/90 backdrop-blur-xl border-2 border-blue-200 rounded-3xl p-6 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-blue-100 rounded-2xl">
                      <Trophy size={28} className="text-blue-600" />
                    </div>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full uppercase">Active</span>
                  </div>
                  <h3 className="text-4xl font-black text-slate-800 mb-2">{totalSeasons}</h3>
                  <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">Total Seasons</p>
                  <div className="mt-4 flex items-center gap-2 text-xs text-green-600 font-bold">
                    <ArrowUp size={14} />
                    <span>+12% from last month</span>
                  </div>
                </div>
              </div>

              {/* Live Auctions Card */}
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-600 rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                <div className="relative bg-white/90 backdrop-blur-xl border-2 border-green-200 rounded-3xl p-6 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-green-100 rounded-2xl">
                      <Zap size={28} className="text-green-600 animate-pulse" />
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full uppercase animate-pulse">Live</span>
                  </div>
                  <h3 className="text-4xl font-black text-slate-800 mb-2">{activeAuctions}</h3>
                  <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">Live Auctions</p>
                  <div className="mt-4 flex items-center gap-2 text-xs text-green-600 font-bold">
                    <Activity size={14} />
                    <span>Real-time bidding active</span>
                  </div>
                </div>
              </div>

              {/* Total Teams Card */}
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-pink-600 rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                <div className="relative bg-white/90 backdrop-blur-xl border-2 border-purple-200 rounded-3xl p-6 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-purple-100 rounded-2xl">
                      <Users size={28} className="text-purple-600" />
                    </div>
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full uppercase">Registered</span>
                  </div>
                  <h3 className="text-4xl font-black text-slate-800 mb-2">{totalTeams}</h3>
                  <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">Registered Teams</p>
                  <div className="mt-4 flex items-center gap-2 text-xs text-purple-600 font-bold">
                    <TrendingUp size={14} />
                    <span>+8 new this week</span>
                  </div>
                </div>
              </div>

              {/* Total Players Card */}
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-red-600 rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                <div className="relative bg-white/90 backdrop-blur-xl border-2 border-orange-200 rounded-3xl p-6 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-orange-100 rounded-2xl">
                      <User size={28} className="text-orange-600" />
                    </div>
                    <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full uppercase">Pool</span>
                  </div>
                  <h3 className="text-4xl font-black text-slate-800 mb-2">{totalPlayers}</h3>
                  <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">Player Pool</p>
                  <div className="mt-4 flex items-center gap-2 text-xs text-orange-600 font-bold">
                    <Award size={14} />
                    <span>+15 new approvals</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions - Floating Buttons */}
            <div className="bg-white/80 backdrop-blur-xl border-2 border-blue-200 rounded-3xl p-6 shadow-xl">
              <h3 className="text-lg font-black uppercase tracking-wider text-slate-800 mb-6 flex items-center gap-2">
                <Sparkles size={20} className="text-yellow-500" />
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl blur opacity-50 group-hover:opacity-75 transition-opacity"></div>
                  <div className="relative flex flex-col items-center gap-3 p-6 bg-white border-2 border-blue-200 rounded-2xl hover:border-blue-500 transition-all hover:-translate-y-1">
                    <div className="p-3 bg-blue-100 rounded-xl">
                      <Trophy size={24} className="text-blue-600" />
                    </div>
                    <span className="text-sm font-bold text-slate-700 text-center">Create Season</span>
                  </div>
                </button>

                <button className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl blur opacity-50 group-hover:opacity-75 transition-opacity"></div>
                  <div className="relative flex flex-col items-center gap-3 p-6 bg-white border-2 border-green-200 rounded-2xl hover:border-green-500 transition-all hover:-translate-y-1">
                    <div className="p-3 bg-green-100 rounded-xl">
                      <UserCheck size={24} className="text-green-600" />
                    </div>
                    <span className="text-sm font-bold text-slate-700 text-center">Approve Users</span>
                  </div>
                </button>

                <button className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl blur opacity-50 group-hover:opacity-75 transition-opacity"></div>
                  <div className="relative flex flex-col items-center gap-3 p-6 bg-white border-2 border-purple-200 rounded-2xl hover:border-purple-500 transition-all hover:-translate-y-1">
                    <div className="p-3 bg-purple-100 rounded-xl">
                      <BarChart3 size={24} className="text-purple-600" />
                    </div>
                    <span className="text-sm font-bold text-slate-700 text-center">View Analytics</span>
                  </div>
                </button>

                <button className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl blur opacity-50 group-hover:opacity-75 transition-opacity"></div>
                  <div className="relative flex flex-col items-center gap-3 p-6 bg-white border-2 border-orange-200 rounded-2xl hover:border-orange-500 transition-all hover:-translate-y-1">
                    <div className="p-3 bg-orange-100 rounded-xl">
                      <Download size={24} className="text-orange-600" />
                    </div>
                    <span className="text-sm font-bold text-slate-700 text-center">Export Data</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SEASONS SECTION */}
        {activeSection === 'seasons' && (
          <div className="space-y-6 animate-in fade-in duration-700">
            <div className="bg-white/80 backdrop-blur-xl border-2 border-blue-200 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black uppercase tracking-wider text-slate-800">All Seasons</h2>
                <button className="px-6 py-3 gold-gradient text-white rounded-full font-bold text-sm uppercase tracking-wider shadow-lg hover:brightness-110 transition-all flex items-center gap-2">
                  <Trophy size={16} />
                  Create New Season
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {allSports.map((sport, sportIdx) => (
                  <div key={sportIdx}>
                    {sport.matches.map((match, matchIdx) => (
                      <div key={matchIdx} className="bg-gradient-to-r from-white to-blue-50 border-2 border-blue-200 rounded-2xl p-6 hover:shadow-lg transition-all group">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-4 bg-blue-100 rounded-xl group-hover:scale-110 transition-transform">
                              <Trophy size={24} className="text-blue-600" />
                            </div>
                            <div>
                              <h3 className="text-lg font-black text-slate-800">{match.name}</h3>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-sm text-slate-600 font-bold">{sport.sportType || 'Custom'}</span>
                                <span className="text-slate-400">•</span>
                                <span className="text-sm text-slate-600">{match.place}</span>
                                <span className="text-slate-400">•</span>
                                <span className="text-sm text-slate-600">{new Date(match.matchDate).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <span className={`px-4 py-2 rounded-full text-white text-xs font-bold uppercase flex items-center gap-2 ${getStatusColor(match.status)}`}>
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                              {getStatusLabel(match.status)}
                            </span>
                            
                            <div className="flex items-center gap-2">
                              <button className="p-2 hover:bg-blue-100 rounded-lg transition-all" title="View Details">
                                <Eye size={18} className="text-blue-600" />
                              </button>
                              <button className="p-2 hover:bg-yellow-100 rounded-lg transition-all" title="Edit">
                                <Edit size={18} className="text-yellow-600" />
                              </button>
                              <button className="p-2 hover:bg-red-100 rounded-lg transition-all" title="Delete">
                                <Trash2 size={18} className="text-red-600" />
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-blue-100">
                          <div className="text-center">
                            <p className="text-2xl font-black text-slate-800">{match.teams?.length || 0}</p>
                            <p className="text-xs text-slate-600 uppercase font-bold">Teams</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-black text-slate-800">{match.players?.length || 0}</p>
                            <p className="text-xs text-slate-600 uppercase font-bold">Players</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-black text-slate-800">{match.history?.length || 0}</p>
                            <p className="text-xs text-slate-600 uppercase font-bold">Bids</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* USERS SECTION */}
        {activeSection === 'users' && (
          <div className="space-y-6 animate-in fade-in duration-700">
            <div className="bg-white/80 backdrop-blur-xl border-2 border-blue-200 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black uppercase tracking-wider text-slate-800">User Management</h2>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:outline-none text-sm"
                    />
                  </div>
                  <button className="p-2 border-2 border-blue-200 rounded-xl hover:bg-blue-50 transition-all">
                    <Filter size={18} className="text-slate-600" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {['Admin', 'Auctioneer', 'Team Rep', 'Player', 'Guest'].map((role, idx) => (
                  <div key={idx} className="bg-gradient-to-r from-white to-blue-50 border-2 border-blue-200 rounded-2xl p-4 hover:shadow-lg transition-all group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full gold-gradient flex items-center justify-center text-white font-black text-lg shadow-lg">
                          {role[0]}
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-800">{role} User {idx + 1}</h4>
                          <p className="text-xs text-slate-600">{role.toLowerCase().replace(' ', '')}@hypehammer.com</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full uppercase">
                          Active
                        </span>
                        <button className="px-4 py-2 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-all text-xs font-bold uppercase">
                          View Profile
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
