import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Users, Trophy, DollarSign, Activity, AlertCircle, 
  Search, Bell, User, LogOut, Menu, Calendar, Shield, 
  Gavel, UserCheck, TrendingUp, FileText, Settings, Eye,
  Play, Pause, StopCircle, Edit, Trash2, Check, X, Download,
  Clock, Target, Award, Briefcase, ChevronRight, Filter,
  PieChart, LineChart, ArrowUp, ArrowDown, Sparkles, Zap,
  Home, Radio, Lock, Unlock, RotateCcw, Plus, Save, RefreshCw,
  AlertTriangle, CheckCircle, XCircle, Info, Database, History,
  Layers, Gauge, BarChart, TrendingDown, Package, Blocks,
  Timer, Wrench, Server, Code, Upload
} from 'lucide-react';
import { AuctionStatus, MatchData, UserRole, Player, Team } from '../../types';
import { LiveAuctionPage } from './LiveAuctionPage';

interface AdminDashboardPageProps {
  setStatus: (status: AuctionStatus) => void;
  currentMatch: MatchData | null;
  currentUser: { name: string; email: string; role: UserRole };
}

// Interface for System Logs
interface SystemLog {
  id: string;
  type: 'info' | 'warning' | 'error' | 'admin' | 'success';
  message: string;
  timestamp: string;
  actor?: string;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ setStatus, currentMatch, currentUser }) => {
  // Main navigation state
  const [activeSection, setActiveSection] = useState<'overview' | 'settings' | 'players' | 'teams' | 'auctioneers' | 'liveMonitor' | 'analytics' | 'logs' | 'advanced'>('overview');
  
  // Data states
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [auctioneers, setAuctioneers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [playerFilter, setPlayerFilter] = useState<'all' | 'available' | 'sold' | 'unsold'>('all');
  const [teamFilter, setTeamFilter] = useState<'all' | 'active' | 'inactive'>('all');
  
  // Season settings edit state
  const [editingSettings, setEditingSettings] = useState(false);
  const [seasonSettings, setSeasonSettings] = useState({
    name: currentMatch?.name || '',
    sport: currentMatch?.sport || 'Cricket',
    startDate: '',
    duration: 120,
    bidIncrement: 100000,
    maxTeams: 8,
    maxSquadSize: 15,
    baseTeamBudget: 10000000,
  });
  
  // Confirmation modals
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: string; data?: any; message: string } | null>(null);
  
  // Emergency controls
  const [emergencyPaused, setEmergencyPaused] = useState(false);
  
  // System logs
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  
  // Alerts counter
  const [alertsCount, setAlertsCount] = useState(0);

  // Filtered data based on search and filters
  const filteredTeams = teams.filter(team => {
    const matchesSearch = team.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.repName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = teamFilter === 'all' || 
      (teamFilter === 'active' && team.squadSize > 0) ||
      (teamFilter === 'inactive' && team.squadSize === 0);
    return matchesSearch && matchesFilter;
  });
  
  const filteredPlayers = players.filter(player => {
    const matchesSearch = player.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      player.role?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = playerFilter === 'all' ||
      (playerFilter === 'available' && (player.status === 'AVAILABLE' || player.status === 'PENDING')) ||
      (playerFilter === 'sold' && player.status === 'SOLD') ||
      (playerFilter === 'unsold' && player.status === 'UNSOLD');
    return matchesSearch && matchesFilter;
  });
  
  // Add system log
  const addSystemLog = (type: SystemLog['type'], message: string, actor?: string) => {
    const newLog: SystemLog = {
      id: Date.now().toString(),
      type,
      message,
      timestamp: new Date().toLocaleTimeString(),
      actor: actor || currentUser.name
    };
    setSystemLogs(prev => [newLog, ...prev].slice(0, 100)); // Keep last 100 logs
  };
  
  // Season Settings handlers
  const handleSaveSettings = async () => {
    try {
      addSystemLog('admin', `Season settings updated: ${seasonSettings.name}`);
      alert('Settings saved successfully!');
      setEditingSettings(false);
    } catch (error) {
      addSystemLog('error', 'Failed to save season settings');
      alert('Failed to save settings');
    }
  };
  
  const handleLockSeason = () => {
    setConfirmAction({
      type: 'lockSeason',
      message: 'Lock season settings? This will prevent further edits until auction ends.'
    });
    setShowConfirmation(true);
  };
  
  // Emergency controls
  const handleEmergencyPause = async () => {
    try {
      addSystemLog('warning', 'EMERGENCY PAUSE initiated by admin');
      setEmergencyPaused(true);
      alert('Auction paused! Use Resume to continue.');
    } catch (error) {
      addSystemLog('error', 'Emergency pause failed');
    }
  };
  
  const handleExtendTimer = async (seconds: number) => {
    try {
      addSystemLog('admin', `Timer extended by ${seconds}s`);
      alert(`Timer extended by ${seconds} seconds!`);
    } catch (error) {
      addSystemLog('error', 'Failed to extend timer');
    }
  };
  
  const handleForceCloseBidding = () => {
    setConfirmAction({
      type: 'forceClose',
      message: 'Force close current bidding? This will immediately sell to the leading team.'
    });
    setShowConfirmation(true);
  };
  
  const handleRollbackLastAction = () => {
    setConfirmAction({
      type: 'rollback',
      message: 'Rollback last auction action? This cannot be undone.'
    });
    setShowConfirmation(true);
  };
  
  // Player management
  const handleApprovePlayer = async (playerId: string) => {
    try {
      addSystemLog('success', `Player approved: ${players.find(p => p.id === playerId)?.name}`);
      alert('Player approved!');
    } catch (error) {
      addSystemLog('error', 'Failed to approve player');
    }
  };
  
  const handleRejectPlayer = async (playerId: string) => {
    setConfirmAction({
      type: 'rejectPlayer',
      data: playerId,
      message: `Reject player: ${players.find(p => p.id === playerId)?.name}?`
    });
    setShowConfirmation(true);
  };
  
  const handleEditPlayerPrice = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    const newPrice = prompt(`Edit base price for ${player?.name}`, ((player?.basePrice || 0) / 100000).toString());
    if (newPrice) {
      addSystemLog('admin', `Base price updated for ${player?.name}: ₹${newPrice}L`);
      alert('Price updated!');
    }
  };
  
  const handleRemovePlayer = (playerId: string) => {
    setConfirmAction({
      type: 'removePlayer',
      data: playerId,
      message: `Remove player: ${players.find(p => p.id === playerId)?.name}? This is permanent.`
    });
    setShowConfirmation(true);
  };
  
  // Team management
  const handleApproveTeam = async (teamId: string) => {
    try {
      addSystemLog('success', `Team approved: ${teams.find(t => t.id === teamId)?.name}`);
      alert('Team approved!');
    } catch (error) {
      addSystemLog('error', 'Failed to approve team');
    }
  };
  
  const handleRejectTeam = async (teamId: string) => {
    setConfirmAction({
      type: 'rejectTeam',
      data: teamId,
      message: `Reject team: ${teams.find(t => t.id === teamId)?.name}?`
    });
    setShowConfirmation(true);
  };
  
  const handleEditTeamBudget = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    const newBudget = prompt(`Edit budget for ${team?.name}`, ((team?.budget || 0) / 1000000).toString());
    if (newBudget) {
      addSystemLog('admin', `Budget updated for ${team?.name}: ₹${newBudget}M`);
      alert('Budget updated!');
    }
  };
  
  const handleDisableTeam = (teamId: string) => {
    setConfirmAction({
      type: 'disableTeam',
      data: teamId,
      message: `Disable team: ${teams.find(t => t.id === teamId)?.name}? They will be removed from auction.`
    });
    setShowConfirmation(true);
  };

  // Auctioneer approval handlers
  const handleApproveAuctioneer = async (auctioneerId: string) => {
    if (!currentMatch?.id) {
      alert('No active season selected');
      return;
    }
    
    // Check if another auctioneer is already approved
    const alreadyApproved = auctioneers.find(a => a.status === 'approved' && a.id !== auctioneerId);
    if (alreadyApproved) {
      alert(`ERROR: ${alreadyApproved.name} is already approved for this season. Only ONE auctioneer allowed per season.`);
      return;
    }
    
    setConfirmAction({
      type: 'approveAuctioneer',
      data: auctioneerId,
      message: `Approve ${auctioneers.find(a => a.id === auctioneerId)?.name} as THE auctioneer? All other applications will be auto-rejected.`
    });
    setShowConfirmation(true);
  };

  const handleRejectAuctioneer = async (auctioneerId: string) => {
    if (!currentMatch?.id) {
      alert('No active season selected');
      return;
    }
    
    try {
      const response = await fetch('http://localhost:5000/api/auctioneer/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          auctioneerId,
          seasonId: currentMatch.id,
          adminId: currentUser.email
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setAuctioneers(prev => prev.map(a => 
          a.id === auctioneerId ? { ...a, status: 'rejected' } : a
        ));
        addSystemLog('warning', `Auctioneer application rejected: ${auctioneers.find(a => a.id === auctioneerId)?.name}`);
        alert('Auctioneer rejected!');
      } else {
        alert(result.message || 'Failed to reject auctioneer');
      }
    } catch (error) {
      console.error('Error rejecting auctioneer:', error);
      addSystemLog('error', 'Failed to reject auctioneer');
      alert('Failed to reject auctioneer');
    }
  };
  
  // Confirmation modal handler
  const executeConfirmedAction = async () => {
    if (!confirmAction) return;
    
    try {
      switch (confirmAction.type) {
        case 'approveAuctioneer':
          const response = await fetch('http://localhost:5000/api/auctioneer/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              auctioneerId: confirmAction.data,
              seasonId: currentMatch?.id,
              adminId: currentUser.email
            })
          });
          const result = await response.json();
          if (response.ok) {
            setAuctioneers(prev => prev.map(a => 
              a.id === confirmAction.data ? { ...a, status: 'approved' } : 
              a.status === 'pending' ? { ...a, status: 'rejected' } : a
            ));
            addSystemLog('success', `Auctioneer approved: ${auctioneers.find(a => a.id === confirmAction.data)?.name}`);
            alert('Auctioneer approved! All other applications auto-rejected.');
          }
          break;
          
        case 'lockSeason':
          addSystemLog('admin', 'Season settings LOCKED - no further edits allowed');
          alert('Season locked!');
          break;
          
        case 'forceClose':
          addSystemLog('warning', 'Admin FORCE CLOSED current bidding');
          alert('Bidding force closed!');
          break;
          
        case 'rollback':
          addSystemLog('error', 'Admin initiated ROLLBACK of last action');
          alert('Last action rolled back!');
          break;
          
        case 'rejectPlayer':
        case 'removePlayer':
          addSystemLog('warning', `Player removed: ${players.find(p => p.id === confirmAction.data)?.name}`);
          alert('Player removed!');
          break;
          
        case 'rejectTeam':
        case 'disableTeam':
          addSystemLog('warning', `Team disabled: ${teams.find(t => t.id === confirmAction.data)?.name}`);
          alert('Team disabled!');
          break;
      }
    } catch (error) {
      addSystemLog('error', `Action failed: ${confirmAction.type}`);
      alert('Action failed!');
    }
    
    setShowConfirmation(false);
    setConfirmAction(null);
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
        
        // Initialize alerts count
        const pendingApprovals = (data.data || []).filter((a: any) => !a.status || a.status === 'pending').length;
        setAlertsCount(pendingApprovals);
        
        // Add initial log
        addSystemLog('info', 'Admin dashboard loaded');
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        addSystemLog('error', 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentMatch?.id]);

  // Calculate season-specific KPIs
  const totalTeams = teams.length;
  const approvedTeams = teams.filter(t => t.squadSize !== undefined).length;
  const totalPlayers = players.length;
  const soldPlayers = players.filter(p => p.status === 'SOLD').length;
  const unsoldPlayers = players.filter(p => p.status === 'UNSOLD').length;
  const pendingPlayers = players.filter(p => p.status === 'AVAILABLE' || p.status === 'PENDING').length;
  const totalBudget = teams.reduce((acc, team) => acc + (team.budget || 0), 0);
  const remainingBudget = teams.reduce((acc, team) => acc + (team.remainingBudget || 0), 0);
  const spentBudget = totalBudget - remainingBudget;
  const pendingAuctioneers = auctioneers.filter(a => !a.status || a.status === 'pending').length;
  const approvedAuctioneers = auctioneers.filter(a => a.status === 'approved').length;
  
  // Auction readiness calculation (0-100%)
  const auctionReadiness = Math.min(100, Math.round(
    (approvedTeams >= 2 ? 25 : 0) +
    (totalPlayers >= 10 ? 25 : 0) +
    (approvedAuctioneers >= 1 ? 25 : 0) +
    (currentMatch?.status === 'SETUP' ? 25 : 0)
  ));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SETUP': return 'bg-yellow-400';
      case 'ONGOING': case 'LIVE': return 'bg-red-500 animate-pulse';
      case 'PAUSED': return 'bg-orange-500';
      case 'COMPLETED': case 'ENDED': return 'bg-gray-500';
      default: return 'bg-blue-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'SETUP': return 'Draft';
      case 'ONGOING': return '🔴 LIVE';
      case 'LIVE': return '🔴 LIVE';
      case 'PAUSED': return 'Paused';
      case 'COMPLETED': return 'Ended';
      case 'ENDED': return 'Ended';
      default: return 'Upcoming';
    }
  };
  
  const getReadinessColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  const getLogIcon = (type: SystemLog['type']) => {
    switch (type) {
      case 'success': return <CheckCircle size={16} className="text-green-600" />;
      case 'error': return <XCircle size={16} className="text-red-600" />;
      case 'warning': return <AlertTriangle size={16} className="text-yellow-600" />;
      case 'admin': return <Shield size={16} className="text-purple-600" />;
      default: return <Info size={16} className="text-blue-600" />;
    }
  };

  return (
    <>
      <div className="h-screen bg-gradient-to-br from-white via-blue-50 to-purple-50 flex">
        {/* LEFT SIDEBAR - ADMIN POWERS */}
        <div className="w-64 bg-white/90 backdrop-blur-xl border-r-2 border-blue-200 p-6 fixed h-screen overflow-y-auto">
          {/* Logo */}
          <div 
            className="flex items-center gap-3 mb-8 cursor-pointer hover:scale-105 transition-transform"
            onClick={() => setStatus(AuctionStatus.HOME)}
          >
            <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-purple-400 shadow-lg">
              <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-800 uppercase tracking-tight">Admin</h1>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Master Control</p>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-2">
            <button
              onClick={() => setActiveSection('overview')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                activeSection === 'overview' 
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' 
                  : 'text-slate-700 hover:bg-blue-50'
              }`}
            >
              <Home size={18} />
              Overview
            </button>

            <button
              onClick={() => setActiveSection('settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                activeSection === 'settings' 
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' 
                  : 'text-slate-700 hover:bg-blue-50'
              }`}
            >
              <Clock size={18} />
              Season Settings
            </button>

            <button
              onClick={() => setActiveSection('players')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                activeSection === 'players' 
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' 
                  : 'text-slate-700 hover:bg-blue-50'
              }`}
            >
              <Users size={18} />
              Players
            </button>

            <button
              onClick={() => setActiveSection('teams')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                activeSection === 'teams' 
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' 
                  : 'text-slate-700 hover:bg-blue-50'
              }`}
            >
              <Trophy size={18} />
              Teams
            </button>

            <button
              onClick={() => setActiveSection('auctioneers')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                activeSection === 'auctioneers' 
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' 
                  : 'text-slate-700 hover:bg-blue-50'
              }`}
            >
              <Gavel size={18} />
              Auctioneers
              {pendingAuctioneers > 0 && (
                <span className="ml-auto px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {pendingAuctioneers}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveSection('liveMonitor')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                activeSection === 'liveMonitor' 
                  ? 'bg-gradient-to-r from-red-500 to-orange-600 text-white shadow-lg animate-pulse' 
                  : 'text-slate-700 hover:bg-red-50'
              }`}
            >
              <Radio size={18} />
              Live Monitor
            </button>

            <button
              onClick={() => setActiveSection('analytics')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                activeSection === 'analytics' 
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' 
                  : 'text-slate-700 hover:bg-blue-50'
              }`}
            >
              <BarChart size={18} />
              Analytics
            </button>

            <button
              onClick={() => setActiveSection('logs')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                activeSection === 'logs' 
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' 
                  : 'text-slate-700 hover:bg-blue-50'
              }`}
            >
              <History size={18} />
              Logs & Audit
            </button>

            <button
              onClick={() => setActiveSection('advanced')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                activeSection === 'advanced' 
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' 
                  : 'text-slate-700 hover:bg-blue-50'
              }`}
            >
              <Wrench size={18} />
              Advanced
            </button>
          </nav>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="ml-64 flex-1">
          {/* TOP BAR - GLOBAL CONTROL STRIP */}
          <div className="bg-white/90 backdrop-blur-xl border-b-2 border-blue-200 px-8 py-4 sticky top-0 z-40">
            <div className="flex items-center justify-between">
              {/* Season Info */}
              <div className="flex items-center gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-800">
                    {currentMatch?.name || 'No Season Selected'}
                  </h2>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                    {currentMatch?.sport || 'Cricket'} • {currentMatch?.year || new Date().getFullYear()}
                  </p>
                </div>
                <span className={`px-4 py-2 rounded-full text-sm font-black uppercase ${getStatusColor(currentMatch?.status || 'SETUP')} text-white shadow-lg`}>
                  {getStatusLabel(currentMatch?.status || 'SETUP')}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-4">
                {/* Alerts */}
                <button className="relative p-3 rounded-xl bg-white border-2 border-blue-200 hover:border-blue-500 transition-all">
                  <Bell size={20} className="text-orange-600" />
                  {alertsCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {alertsCount}
                    </span>
                  )}
                </button>

                {/* Profile */}
                <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white border-2 border-blue-200">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold">
                    {currentUser.name?.[0] || 'A'}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{currentUser.name}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Season Owner</p>
                  </div>
                </div>

                {/* Logout */}
                <button 
                  onClick={() => setStatus(AuctionStatus.HOME)} 
                  className="px-4 py-2 rounded-xl bg-red-500/10 border-2 border-red-500/20 hover:bg-red-500 hover:text-white transition-all flex items-center gap-2 text-sm font-bold text-red-600"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </div>
          </div>

          {/* DYNAMIC CONTENT SECTIONS */}
          <div className="p-8">
            
            {/* 1️⃣ OVERVIEW SECTION */}
            {activeSection === 'overview' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Teams KPI */}
                  <div className="group relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-blue-600 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity"></div>
                    <div className="relative bg-white/90 backdrop-blur-xl border-2 border-blue-200 rounded-3xl p-6 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-100 rounded-2xl">
                          <Trophy size={28} className="text-blue-600" />
                        </div>
                        <span className="text-xs font-bold text-blue-600">{approvedTeams} Approved</span>
                      </div>
                      <h3 className="text-4xl font-black text-slate-800 mb-2">{totalTeams}</h3>
                      <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">Teams</p>
                    </div>
                  </div>

                  {/* Players KPI */}
                  <div className="group relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-purple-600 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity"></div>
                    <div className="relative bg-white/90 backdrop-blur-xl border-2 border-purple-200 rounded-3xl p-6 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-purple-100 rounded-2xl">
                          <Users size={28} className="text-purple-600" />
                        </div>
                        <span className="text-xs font-bold text-purple-600">{soldPlayers} Sold</span>
                      </div>
                      <h3 className="text-4xl font-black text-slate-800 mb-2">{totalPlayers}</h3>
                      <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">Players</p>
                    </div>
                  </div>

                  {/* Budget KPI */}
                  <div className="group relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-green-600 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity"></div>
                    <div className="relative bg-white/90 backdrop-blur-xl border-2 border-green-200 rounded-3xl p-6 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-100 rounded-2xl">
                          <DollarSign size={28} className="text-green-600" />
                        </div>
                        <span className="text-xs font-bold text-green-600">Pool</span>
                      </div>
                      <h3 className="text-4xl font-black text-slate-800 mb-2">₹{(totalBudget / 1000000).toFixed(0)}M</h3>
                      <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">Total Budget</p>
                    </div>
                  </div>

                  {/* Readiness KPI */}
                  <div className="group relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-red-600 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity"></div>
                    <div className="relative bg-white/90 backdrop-blur-xl border-2 border-orange-200 rounded-3xl p-6 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-orange-100 rounded-2xl">
                          <Gauge size={28} className="text-orange-600" />
                        </div>
                        <span className="text-xs font-bold text-orange-600">Status</span>
                      </div>
                      <h3 className={`text-4xl font-black mb-2 ${getReadinessColor(auctionReadiness)}`}>
                        {auctionReadiness}%
                      </h3>
                      <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">Ready to Launch</p>
                    </div>
                  </div>
                </div>

                {/* Readiness Progress Bar */}
                <div className="bg-white/90 backdrop-blur-xl border-2 border-blue-200 rounded-3xl p-6 shadow-xl">
                  <h3 className="text-xl font-black text-slate-800 mb-4">Auction Readiness</h3>
                  <div className="w-full bg-gray-200 rounded-full h-6 mb-4 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${
                        auctionReadiness >= 80 ? 'bg-green-500' :
                        auctionReadiness >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${auctionReadiness}%` }}
                    ></div>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      {approvedTeams >= 2 ? (
                        <CheckCircle size={18} className="text-green-500" />
                      ) : (
                        <XCircle size={18} className="text-red-500" />
                      )}
                      <span className="font-bold">Teams ({approvedTeams}/2+)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {totalPlayers >= 10 ? (
                        <CheckCircle size={18} className="text-green-500" />
                      ) : (
                        <XCircle size={18} className="text-red-500" />
                      )}
                      <span className="font-bold">Players ({totalPlayers}/10+)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {approvedAuctioneers >= 1 ? (
                        <CheckCircle size={18} className="text-green-500" />
                      ) : (
                        <XCircle size={18} className="text-red-500" />
                      )}
                      <span className="font-bold">Auctioneer ({approvedAuctioneers}/1)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {currentMatch?.status === 'SETUP' ? (
                        <CheckCircle size={18} className="text-green-500" />
                      ) : (
                        <Info size={18} className="text-blue-500" />
                      )}
                      <span className="font-bold">Settings</span>
                    </div>
                  </div>
                </div>

                {/* Quick Action Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <button 
                    onClick={() => setActiveSection('auctioneers')}
                    className="bg-white/90 backdrop-blur-xl border-2 border-cyan-200 hover:border-cyan-400 rounded-3xl p-6 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all text-left group"
                  >
                    <div className="p-3 bg-cyan-100 rounded-2xl inline-flex mb-4">
                      <Gavel size={24} className="text-cyan-600" />
                    </div>
                    <h3 className="text-xl font-black text-slate-800 mb-2">Auctioneer Apps</h3>
                    <p className="text-sm text-slate-600 mb-4">Review and approve applications</p>
                    <span className="px-4 py-2 bg-cyan-600 text-white text-sm font-bold rounded-full inline-flex items-center gap-2">
                      {pendingAuctioneers} Pending
                      <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </span>
                  </button>

                  <button 
                    onClick={() => setActiveSection('analytics')}
                    className="bg-white/90 backdrop-blur-xl border-2 border-purple-200 hover:border-purple-400 rounded-3xl p-6 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all text-left group"
                  >
                    <div className="p-3 bg-purple-100 rounded-2xl inline-flex mb-4">
                      <BarChart size={24} className="text-purple-600" />
                    </div>
                    <h3 className="text-xl font-black text-slate-800 mb-2">Analytics</h3>
                    <p className="text-sm text-slate-600 mb-4">View insights and reports</p>
                    <span className="px-4 py-2 bg-purple-600 text-white text-sm font-bold rounded-full inline-flex items-center gap-2">
                      View Stats
                      <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </span>
                  </button>

                  <button 
                    onClick={() => setActiveSection('settings')}
                    className="bg-white/90 backdrop-blur-xl border-2 border-orange-200 hover:border-orange-400 rounded-3xl p-6 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all text-left group"
                  >
                    <div className="p-3 bg-orange-100 rounded-2xl inline-flex mb-4">
                      <Settings size={24} className="text-orange-600" />
                    </div>
                    <h3 className="text-xl font-black text-slate-800 mb-2">Settings</h3>
                    <p className="text-sm text-slate-600 mb-4">Configure season parameters</p>
                    <span className="px-4 py-2 bg-orange-600 text-white text-sm font-bold rounded-full inline-flex items-center gap-2">
                      Configure
                      <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Remaining sections continue in next replacement... */}
            
            {/* 2️⃣ SEASON SETTINGS SECTION */}
            {activeSection === 'settings' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-3xl font-black text-slate-800">Season Settings</h2>
                  <div className="flex items-center gap-3">
                    {editingSettings ? (
                      <>
                        <button
                          onClick={() => setEditingSettings(false)}
                          className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm transition-all flex items-center gap-2"
                        >
                          <X size={16} />
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveSettings}
                          className="px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold text-sm transition-all flex items-center gap-2"
                        >
                          <Save size={16} />
                          Save
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setEditingSettings(true)}
                          className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm transition-all flex items-center gap-2"
                        >
                          <Edit size={16} />
                          Edit
                        </button>
                        <button
                          onClick={handleLockSeason}
                          className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-all flex items-center gap-2"
                        >
                          <Lock size={16} />
                          Lock
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white/90 backdrop-blur-xl border-2 border-blue-200 rounded-3xl p-6 shadow-xl">
                    <label className="block text-sm font-bold text-slate-600 mb-2 uppercase tracking-wider">Season Name</label>
                    <input
                      type="text"
                      value={seasonSettings.name}
                      onChange={(e) => setSeasonSettings({...seasonSettings, name: e.target.value})}
                      disabled={!editingSettings}
                      className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 focus:border-blue-500 focus:outline-none text-lg font-bold disabled:bg-gray-50"
                    />
                  </div>

                  <div className="bg-white/90 backdrop-blur-xl border-2 border-blue-200 rounded-3xl p-6 shadow-xl">
                    <label className="block text-sm font-bold text-slate-600 mb-2 uppercase tracking-wider">Sport Type</label>
                    <select
                      value={seasonSettings.sport}
                      onChange={(e) => setSeasonSettings({...seasonSettings, sport: e.target.value})}
                      disabled={!editingSettings}
                      className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 focus:border-blue-500 focus:outline-none text-lg font-bold disabled:bg-gray-50"
                    >
                      <option value="Cricket">Cricket</option>
                      <option value="Football">Football</option>
                      <option value="Basketball">Basketball</option>
                      <option value="Kabaddi">Kabaddi</option>
                    </select>
                  </div>

                  <div className="bg-white/90 backdrop-blur-xl border-2 border-blue-200 rounded-3xl p-6 shadow-xl">
                    <label className="block text-sm font-bold text-slate-600 mb-2 uppercase tracking-wider">Auction Duration (minutes)</label>
                    <input
                      type="number"
                      value={seasonSettings.duration}
                      onChange={(e) => setSeasonSettings({...seasonSettings, duration: parseInt(e.target.value)})}
                      disabled={!editingSettings}
                      className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 focus:border-blue-500 focus:outline-none text-lg font-bold disabled:bg-gray-50"
                    />
                  </div>

                  <div className="bg-white/90 backdrop-blur-xl border-2 border-blue-200 rounded-3xl p-6 shadow-xl">
                    <label className="block text-sm font-bold text-slate-600 mb-2 uppercase tracking-wider">Bid Increment (₹)</label>
                    <input
                      type="number"
                      value={seasonSettings.bidIncrement}
                      onChange={(e) => setSeasonSettings({...seasonSettings, bidIncrement: parseInt(e.target.value)})}
                      disabled={!editingSettings}
                      className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 focus:border-blue-500 focus:outline-none text-lg font-bold disabled:bg-gray-50"
                    />
                  </div>

                  <div className="bg-white/90 backdrop-blur-xl border-2 border-blue-200 rounded-3xl p-6 shadow-xl">
                    <label className="block text-sm font-bold text-slate-600 mb-2 uppercase tracking-wider">Max Teams</label>
                    <input
                      type="number"
                      value={seasonSettings.maxTeams}
                      onChange={(e) => setSeasonSettings({...seasonSettings, maxTeams: parseInt(e.target.value)})}
                      disabled={!editingSettings}
                      className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 focus:border-blue-500 focus:outline-none text-lg font-bold disabled:bg-gray-50"
                    />
                  </div>

                  <div className="bg-white/90 backdrop-blur-xl border-2 border-blue-200 rounded-3xl p-6 shadow-xl">
                    <label className="block text-sm font-bold text-slate-600 mb-2 uppercase tracking-wider">Max Squad Size</label>
                    <input
                      type="number"
                      value={seasonSettings.maxSquadSize}
                      onChange={(e) => setSeasonSettings({...seasonSettings, maxSquadSize: parseInt(e.target.value)})}
                      disabled={!editingSettings}
                      className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 focus:border-blue-500 focus:outline-none text-lg font-bold disabled:bg-gray-50"
                    />
                  </div>

                  <div className="bg-white/90 backdrop-blur-xl border-2 border-blue-200 rounded-3xl p-6 shadow-xl md:col-span-2">
                    <label className="block text-sm font-bold text-slate-600 mb-2 uppercase tracking-wider">Base Team Budget (₹)</label>
                    <input
                      type="number"
                      value={seasonSettings.baseTeamBudget}
                      onChange={(e) => setSeasonSettings({...seasonSettings, baseTeamBudget: parseInt(e.target.value)})}
                      disabled={!editingSettings}
                      className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 focus:border-blue-500 focus:outline-none text-lg font-bold disabled:bg-gray-50"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 3️⃣ PLAYERS MANAGEMENT */}
            {activeSection === 'players' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-3xl font-black text-slate-800">Players Management</h2>
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
                    <select
                      value={playerFilter}
                      onChange={(e) => setPlayerFilter(e.target.value as any)}
                      className="px-4 py-3 rounded-xl border-2 border-blue-200 focus:border-blue-500 focus:outline-none text-sm font-bold"
                    >
                      <option value="all">All Players</option>
                      <option value="available">Available</option>
                      <option value="sold">Sold</option>
                      <option value="unsold">Unsold</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4">
                  {filteredPlayers.map((player) => (
                    <div key={player.id} className="bg-white/90 backdrop-blur-xl border-2 border-blue-200 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-black text-2xl overflow-hidden">
                            {player.imageUrl ? (
                              <img src={player.imageUrl} alt={player.name} className="w-full h-full object-cover" />
                            ) : (
                              player.name.charAt(0)
                            )}
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
                                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Team</p>
                                <p className="text-lg font-black text-purple-600">{player.teamName || 'N/A'}</p>
                              </div>
                            </>
                          )}
                          <span className={`px-4 py-2 rounded-full text-xs font-bold uppercase ${
                            player.status === 'SOLD' ? 'bg-green-100 text-green-700' :
                            player.status === 'UNSOLD' ? 'bg-red-100 text-red-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {player.status || 'AVAILABLE'}
                          </span>
                          {currentMatch?.status === 'SETUP' && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditPlayerPrice(player.id)}
                                className="p-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-600 transition-colors"
                                title="Edit Price"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleRemovePlayer(player.id)}
                                className="p-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 transition-colors"
                                title="Remove Player"
                              >
                                <Trash2 size={16} />
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

            {/* Sections 4-9 in next part... */}
          </div>
        </div>
      </div>

      {/* CONFIRMATION MODAL */}
      {showConfirmation && confirmAction && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in duration-200">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <AlertTriangle size={24} className="text-yellow-600" />
              </div>
              <h3 className="text-2xl font-black text-slate-800">Confirm Action</h3>
            </div>
            
            <p className="text-slate-600 font-semibold mb-8 leading-relaxed">
              {confirmAction.message}
            </p>
            
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowConfirmation(false);
                  setConfirmAction(null);
                }}
                className="flex-1 px-6 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm transition-all"
              >
                Cancel
              </button>
              <button
                onClick={executeConfirmedAction}
                className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white font-bold text-sm shadow-lg transition-all"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};