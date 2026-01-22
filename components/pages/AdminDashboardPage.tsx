import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Users, Trophy, DollarSign, Activity, AlertCircle, 
  Search, Bell, User, LogOut, Menu, Calendar, Shield, 
  Gavel, UserCheck, TrendingUp, FileText, Settings, Eye,
  Play, Pause, StopCircle, Edit, Trash2, Check, X, Download,
  Clock, Target, Award, Briefcase, ChevronRight, Filter,
  PieChart, LineChart, ArrowUp, ArrowDown, Sparkles, Zap,
  Home
} from 'lucide-react';
import { AuctionStatus, MatchData, UserRole, Player, Team } from '../../types';

interface AdminDashboardPageProps {
  setStatus: (status: AuctionStatus) => void;
  currentMatch: MatchData | null;
  currentUser: { name: string; email: string; role: UserRole };
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ setStatus, currentMatch, currentUser }) => {
  const [activeSection, setActiveSection] = useState<'overview' | 'teams' | 'players' | 'auctioneers'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [auctioneers, setAuctioneers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtered data based on search
  const filteredTeams = teams.filter(team => 
    team.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.repName?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredPlayers = players.filter(player => 
    player.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    player.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Approval handlers
  const handleApproveAuctioneer = async (auctioneerId: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/auctioneers/${auctioneerId}/approve`, {
        method: 'POST'
      });
      if (response.ok) {
        setAuctioneers(prev => prev.map(a => 
          a.id === auctioneerId ? { ...a, status: 'approved' } : a
        ));
        alert('Auctioneer approved successfully!');
      }
    } catch (error) {
      console.error('Error approving auctioneer:', error);
      alert('Failed to approve auctioneer');
    }
  };

  const handleRejectAuctioneer = async (auctioneerId: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/auctioneers/${auctioneerId}/reject`, {
        method: 'POST'
      });
      if (response.ok) {
        setAuctioneers(prev => prev.map(a => 
          a.id === auctioneerId ? { ...a, status: 'rejected' } : a
        ));
        alert('Auctioneer rejected!');
      }
    } catch (error) {
      console.error('Error rejecting auctioneer:', error);
      alert('Failed to reject auctioneer');
    }
  };

  // Fetch season-specific data from API
  useEffect(() => {
    const fetchData = async () => {
      if (!currentMatch?.id) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const [teamsRes, playersRes, auctioneersRes] = await Promise.all([
          fetch(`http://localhost:5000/api/teams?matchId=${currentMatch.id}`),
          fetch(`http://localhost:5000/api/players?matchId=${currentMatch.id}`),
          fetch(`http://localhost:5000/api/auctioneers?matchId=${currentMatch.id}`)
        ]);

        if (teamsRes.ok) {
          const data = await teamsRes.json();
          setTeams(data.data || []);
        }

        if (playersRes.ok) {
          const data = await playersRes.json();
          setPlayers(data.data || []);
        }

        if (auctioneersRes.ok) {
          const data = await auctioneersRes.json();
          setAuctioneers(data.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentMatch?.id]);

  // Calculate season-specific KPIs
  const totalTeams = teams.length;
  const totalPlayers = players.length;
  const soldPlayers = players.filter(p => p.status === 'SOLD').length;
  const unsoldPlayers = players.filter(p => p.status === 'UNSOLD').length;
  const pendingPlayers = players.filter(p => p.status === 'AVAILABLE' || p.status === 'PENDING').length;
  const totalBudget = teams.reduce((acc, team) => acc + (team.budget || 0), 0);
  const remainingBudget = teams.reduce((acc, team) => acc + (team.remainingBudget || 0), 0);
  const spentBudget = totalBudget - remainingBudget;
  const pendingAuctioneers = auctioneers.filter(a => !a.status || a.status === 'pending').length;
  const approvedAuctioneers = auctioneers.filter(a => a.status === 'approved').length;

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
            <div className="flex items-center gap-1 p-1.5 bg-white/80 backdrop-blur-lg rounded-full border-2 border-blue-200 shadow-lg">
              <button
                onClick={() => setActiveSection('overview')}
                className={`px-4 py-2 rounded-full transition-all font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 ${
                  activeSection === 'overview' ? 'gold-gradient text-white shadow-lg' : 'text-slate-600 hover:bg-blue-50'
                }`}
              >
                <Sparkles size={14} />
                Overview
              </button>
              <button
                onClick={() => setActiveSection('teams')}
                className={`px-4 py-2 rounded-full transition-all font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 ${
                  activeSection === 'teams' ? 'gold-gradient text-white shadow-lg' : 'text-slate-600 hover:bg-blue-50'
                }`}
              >
                <Trophy size={14} />
                Teams
              </button>
              <button
                onClick={() => setActiveSection('players')}
                className={`px-4 py-2 rounded-full transition-all font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 ${
                  activeSection === 'players' ? 'gold-gradient text-white shadow-lg' : 'text-slate-600 hover:bg-blue-50'
                }`}
              >
                <Users size={14} />
                Players
              </button>
              <button
                onClick={() => setActiveSection('auctioneers')}
                className={`px-4 py-2 rounded-full transition-all font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 ${
                  activeSection === 'auctioneers' ? 'gold-gradient text-white shadow-lg' : 'text-slate-600 hover:bg-blue-50'
                }`}
              >
                <Gavel size={14} />
                Auctioneers
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
              {/* Registered Teams Card */}
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-blue-600 rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                <div className="relative bg-white/90 backdrop-blur-xl border-2 border-blue-200 rounded-3xl p-6 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-blue-100 rounded-2xl">
                      <Trophy size={28} className="text-blue-600" />
                    </div>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full uppercase">Teams</span>
                  </div>
                  <h3 className="text-4xl font-black text-slate-800 mb-2">{totalTeams}</h3>
                  <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">Registered Teams</p>
                  <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 font-bold">
                    <span>{currentMatch?.name || 'No Season Selected'}</span>
                  </div>
                </div>
              </div>

              {/* Active Auctions Card */}
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-green-600 rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                <div className="relative bg-white/90 backdrop-blur-xl border-2 border-green-200 rounded-3xl p-6 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-green-100 rounded-2xl">
                      <Activity size={28} className="text-green-600" />
                    </div>
                    <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase ${getStatusColor(currentMatch?.status || 'SETUP')}`}>
                      {getStatusLabel(currentMatch?.status || 'SETUP')}
                    </span>
                  </div>
                  <h3 className="text-4xl font-black text-slate-800 mb-2">{soldPlayers}/{totalPlayers}</h3>
                  <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">Players Sold</p>
                  <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 font-bold">
                    <span>{pendingPlayers} Available</span>
                  </div>
                </div>
              </div>

              {/* Total Teams Card */}
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-purple-600 rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                <div className="relative bg-white/90 backdrop-blur-xl border-2 border-purple-200 rounded-3xl p-6 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-purple-100 rounded-2xl">
                      <Users size={28} className="text-purple-600" />
                    </div>
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full uppercase">Pool</span>
                  </div>
                  <h3 className="text-4xl font-black text-slate-800 mb-2">{totalPlayers}</h3>
                  <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">Player Pool</p>
                  <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 font-bold">
                    <span>{unsoldPlayers} Unsold</span>
                  </div>
                </div>
              </div>

              {/* Total Players Card */}
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-orange-600 rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                <div className="relative bg-white/90 backdrop-blur-xl border-2 border-orange-200 rounded-3xl p-6 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-orange-100 rounded-2xl">
                      <DollarSign size={28} className="text-orange-600" />
                    </div>
                    <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full uppercase">Budget</span>
                  </div>
                  <h3 className="text-4xl font-black text-slate-800 mb-2">₹{(spentBudget / 1000000).toFixed(1)}M</h3>
                  <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">Total Spent</p>
                  <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 font-bold">
                    <span>₹{(remainingBudget / 1000000).toFixed(1)}M Remaining</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <button className="group relative bg-white/90 backdrop-blur-xl border-2 border-cyan-200 hover:border-cyan-400 rounded-3xl p-6 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all text-left">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="p-3 bg-cyan-100 rounded-2xl inline-flex mb-4">
                      <Gavel size={24} className="text-cyan-600" />
                    </div>
                    <h3 className="text-xl font-black text-slate-800 mb-2">Approve Auctioneers</h3>
                    <p className="text-sm text-slate-600 mb-4">Review pending auctioneer applications</p>
                    <span className="px-4 py-2 bg-cyan-600 text-white text-sm font-bold rounded-full uppercase inline-flex items-center gap-2">
                      {pendingAuctioneers} Pending
                      <ChevronRight size={16} />
                    </span>
                  </div>
                </div>
              </button>

              <button className="group relative bg-white/90 backdrop-blur-xl border-2 border-purple-200 hover:border-purple-400 rounded-3xl p-6 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all text-left">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="p-3 bg-purple-100 rounded-2xl inline-flex mb-4">
                      <FileText size={24} className="text-purple-600" />
                    </div>
                    <h3 className="text-xl font-black text-slate-800 mb-2">Generate Reports</h3>
                    <p className="text-sm text-slate-600 mb-4">Export season analytics and insights</p>
                    <span className="px-4 py-2 bg-purple-600 text-white text-sm font-bold rounded-full uppercase inline-flex items-center gap-2">
                      Export
                      <Download size={16} />
                    </span>
                  </div>
                </div>
              </button>

              <button className="group relative bg-white/90 backdrop-blur-xl border-2 border-orange-200 hover:border-orange-400 rounded-3xl p-6 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all text-left">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="p-3 bg-orange-100 rounded-2xl inline-flex mb-4">
                      <Settings size={24} className="text-orange-600" />
                    </div>
                    <h3 className="text-xl font-black text-slate-800 mb-2">Season Settings</h3>
                    <p className="text-sm text-slate-600 mb-4">Configure auction parameters</p>
                    <span className="px-4 py-2 bg-orange-600 text-white text-sm font-bold rounded-full uppercase inline-flex items-center gap-2">
                      Configure
                      <ChevronRight size={16} />
                    </span>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* TEAMS SECTION */}
        {activeSection === 'teams' && (
          <div className="space-y-6 animate-in fade-in duration-700">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-black text-slate-800">Teams - {currentMatch?.name || 'No Season'}</h2>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search teams..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 pr-6 py-3 rounded-2xl border-2 border-blue-200 focus:border-blue-500 focus:outline-none text-sm font-semibold"
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              {filteredTeams.map((team) => (
                <div key={team.id} className="bg-white/90 backdrop-blur-xl border-2 border-blue-200 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-black text-2xl">
                        {team.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-800">{team.name}</h3>
                        <p className="text-sm text-slate-600">Rep: {team.repName || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Budget</p>
                        <p className="text-lg font-black text-slate-800">₹{((team.budget || 0) / 1000000).toFixed(1)}M</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Remaining</p>
                        <p className="text-lg font-black text-green-600">₹{((team.remainingBudget || 0) / 1000000).toFixed(1)}M</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Squad Size</p>
                        <p className="text-lg font-black text-purple-600">{team.squadSize || 0}/{team.maxSquadSize || 0}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PLAYERS SECTION */}
        {activeSection === 'players' && (
          <div className="space-y-6 animate-in fade-in duration-700">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-black text-slate-800">Players - {currentMatch?.name || 'No Season'}</h2>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search players..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 pr-6 py-3 rounded-2xl border-2 border-blue-200 focus:border-blue-500 focus:outline-none text-sm font-semibold"
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              {filteredPlayers.map((player) => (
                <div key={player.id} className="bg-white/90 backdrop-blur-xl border-2 border-blue-200 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-black text-2xl">
                        {player.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-800">{player.name}</h3>
                        <p className="text-sm text-slate-600">{player.role || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Base Price</p>
                        <p className="text-lg font-black text-slate-800">₹{((player.basePrice || 0) / 100000).toFixed(1)}L</p>
                      </div>
                      {player.status === 'SOLD' && (
                        <>
                          <div className="text-right">
                            <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Sold Price</p>
                            <p className="text-lg font-black text-green-600">₹{((player.soldPrice || 0) / 100000).toFixed(1)}L</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Bought By</p>
                            <p className="text-lg font-black text-purple-600">{player.teamName || 'N/A'}</p>
                          </div>
                        </>
                      )}
                      <div>
                        <span className={`px-4 py-2 rounded-full text-xs font-bold uppercase ${
                          player.status === 'SOLD' ? 'bg-green-100 text-green-700' :
                          player.status === 'UNSOLD' ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {player.status || 'AVAILABLE'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AUCTIONEERS SECTION */}
        {activeSection === 'auctioneers' && (
          <div className="space-y-6 animate-in fade-in duration-700">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-black text-slate-800">Auctioneers - {currentMatch?.name || 'No Season'}</h2>
              <div className="flex items-center gap-4">
                <span className="px-4 py-2 bg-yellow-100 text-yellow-700 text-sm font-bold rounded-full">
                  {pendingAuctioneers} Pending Approval
                </span>
                <span className="px-4 py-2 bg-green-100 text-green-700 text-sm font-bold rounded-full">
                  {approvedAuctioneers} Approved
                </span>
              </div>
            </div>

            <div className="grid gap-4">
              {auctioneers.map((auctioneer) => (
                <div key={auctioneer.id} className="bg-white/90 backdrop-blur-xl border-2 border-blue-200 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-black text-2xl">
                        {auctioneer.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-800">{auctioneer.name}</h3>
                        <p className="text-sm text-slate-600">{auctioneer.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`px-4 py-2 rounded-full text-xs font-bold uppercase ${
                        auctioneer.status === 'approved' ? 'bg-green-100 text-green-700' :
                        auctioneer.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {auctioneer.status || 'PENDING'}
                      </span>
                      {(!auctioneer.status || auctioneer.status === 'pending') && (
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleApproveAuctioneer(auctioneer.id)}
                            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-colors"
                          >
                            <Check size={16} />
                            Approve
                          </button>
                          <button 
                            onClick={() => handleRejectAuctioneer(auctioneer.id)}
                            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-colors"
                          >
                            <X size={16} />
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
