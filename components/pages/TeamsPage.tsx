import React, { useState, useMemo } from 'react';
import { Search, Plus, Edit2, Trash2, Users, Trophy, Wallet, TrendingUp, Zap, Check, X, Clock, Ban } from 'lucide-react';
import { Team, AuctionConfig, ApprovalStatus } from '../../types';

const API_BASE = 'https://us-central1-axilam.cloudfunctions.net/auction';

// Moderation filter type
type ModerationFilter = 'all' | 'accepted' | 'pending' | 'declined';

interface TeamsPageProps {
  filteredTeams: Team[];
  teamSearch: string;
  setTeamSearch: (search: string) => void;
  config: AuctionConfig;
  setEditingTeamId: (id: string | null) => void;
  setNewTeam: (team: any) => void;
  setIsTeamModalOpen: (isOpen: boolean) => void;
  setViewingSquadTeamId: (id: string) => void;
  setIsSquadModalOpen: (isOpen: boolean) => void;
  setTeams: React.Dispatch<React.SetStateAction<Team[]>>;
  handleEditTeam: (team: Team) => void;
}

export const TeamsPage: React.FC<TeamsPageProps> = ({ 
  filteredTeams, 
  teamSearch, 
  setTeamSearch,
  config,
  setEditingTeamId,
  setNewTeam,
  setIsTeamModalOpen,
  setViewingSquadTeamId,
  setIsSquadModalOpen,
  setTeams,
  handleEditTeam
}) => {
  const [moderationFilter, setModerationFilter] = useState<ModerationFilter>('all');
  const [updatingApproval, setUpdatingApproval] = useState<string | null>(null);

  // Calculate budget percentage for progress bar
  const getBudgetPercentage = (team: Team) => {
    return Math.round((team.remainingBudget / team.budget) * 100);
  };

  // Get budget bar color based on remaining percentage
  const getBudgetBarColor = (percentage: number) => {
    if (percentage > 60) return 'from-green-400 to-emerald-500';
    if (percentage > 30) return 'from-amber-400 to-orange-500';
    return 'from-red-400 to-rose-500';
  };

  // ============================================
  // MODERATION FUNCTIONS
  // ============================================
  
  const getApprovalStatus = (team: Team): ApprovalStatus => {
    return team.approvalStatus || 'pending';
  };

  const handleUpdateApproval = async (teamId: string, status: 'accepted' | 'declined') => {
    setUpdatingApproval(teamId);
    try {
      const response = await fetch(`${API_BASE}/teams/${teamId}/${status === 'accepted' ? 'approve' : 'decline'}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        // Update local state
        setTeams(prev => prev.map(t => 
          t.id === teamId ? { ...t, approvalStatus: status } : t
        ));
      } else {
        console.error('Failed to update approval status');
      }
    } catch (error) {
      console.error('Error updating approval:', error);
    } finally {
      setUpdatingApproval(null);
    }
  };

  // Sort teams by approval status: accepted first, then pending, then declined
  const sortByApprovalStatus = (a: Team, b: Team): number => {
    const order: Record<ApprovalStatus, number> = { accepted: 0, pending: 1, declined: 2 };
    const statusA = getApprovalStatus(a);
    const statusB = getApprovalStatus(b);
    return order[statusA] - order[statusB];
  };

  // Filter and sort teams by moderation status
  const processedTeams = useMemo(() => {
    let teams = [...filteredTeams];
    
    // Apply moderation filter
    if (moderationFilter !== 'all') {
      teams = teams.filter(t => getApprovalStatus(t) === moderationFilter);
    }
    
    // Sort: accepted first, then pending, then declined
    teams.sort(sortByApprovalStatus);
    
    return teams;
  }, [filteredTeams, moderationFilter]);

  // Approval status counts
  const acceptedTeams = useMemo(() => filteredTeams.filter(t => getApprovalStatus(t) === 'accepted'), [filteredTeams]);
  const pendingTeams = useMemo(() => filteredTeams.filter(t => getApprovalStatus(t) === 'pending'), [filteredTeams]);
  const declinedTeams = useMemo(() => filteredTeams.filter(t => getApprovalStatus(t) === 'declined'), [filteredTeams]);

  return (
    <div className="min-h-screen p-6 pb-20" style={{ background: 'linear-gradient(135deg, #1a0a0a 0%, #2d0a0a 25%, #1a0a12 50%, #0d0d1a 100%)' }}>
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/30 to-red-600/30 flex items-center justify-center border border-pink-500/30">
            <Trophy size={20} className="text-pink-400" />
          </div>
          <h1 className="text-3xl font-black text-white">Team Command Center</h1>
        </div>
        <p className="text-pink-300/60 text-sm ml-13">Manage franchises and monitor auction performance</p>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-pink-400/50" size={20} />
          <input 
            type="text" 
            placeholder="Search franchises..." 
            className="w-full bg-black/40 border border-pink-500/20 rounded-full pl-14 pr-6 py-4 text-white placeholder-pink-300/40 focus:outline-none focus:border-pink-500/50 focus:shadow-[0_0_20px_rgba(255,0,102,0.2)] transition-all" 
            value={teamSearch} 
            onChange={(e) => setTeamSearch(e.target.value)} 
          />
        </div>
        <button 
          onClick={() => { 
            setEditingTeamId(null); 
            setNewTeam({ name: '', budget: config.totalBudget }); 
            setIsTeamModalOpen(true); 
          }} 
          className="px-6 py-4 bg-gradient-to-r from-pink-500 to-red-600 text-white rounded-full font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg hover:shadow-[0_0_30px_rgba(255,0,102,0.4)] transition-all"
          style={{ boxShadow: '0 0 20px rgba(255, 0, 102, 0.3)' }}
        >
          <Plus size={16} /> Add Franchise
        </button>
      </div>

      {/* Moderation Filter Tabs */}
      <div className="mb-6">
        <div 
          className="rounded-xl p-1 inline-flex"
          style={{
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(59, 130, 246, 0.15)'
          }}
        >
          <button
            onClick={() => setModerationFilter('all')}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${
              moderationFilter === 'all'
                ? 'text-white'
                : 'text-blue-300/60 hover:bg-blue-500/10'
            }`}
            style={moderationFilter === 'all' ? {
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(37, 99, 235, 0.2))',
              border: '1px solid rgba(59, 130, 246, 0.4)',
            } : {}}
          >
            All ({filteredTeams.length})
          </button>
          <button
            onClick={() => setModerationFilter('accepted')}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 ${
              moderationFilter === 'accepted'
                ? 'text-white'
                : 'text-green-300/60 hover:bg-green-500/10'
            }`}
            style={moderationFilter === 'accepted' ? {
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(22, 163, 74, 0.2))',
              border: '1px solid rgba(34, 197, 94, 0.4)',
            } : {}}
          >
            <Check size={12} />
            Accepted ({acceptedTeams.length})
          </button>
          <button
            onClick={() => setModerationFilter('pending')}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 ${
              moderationFilter === 'pending'
                ? 'text-white'
                : 'text-amber-300/60 hover:bg-amber-500/10'
            }`}
            style={moderationFilter === 'pending' ? {
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.3), rgba(217, 119, 6, 0.2))',
              border: '1px solid rgba(245, 158, 11, 0.4)',
            } : {}}
          >
            <Clock size={12} />
            Pending ({pendingTeams.length})
          </button>
          <button
            onClick={() => setModerationFilter('declined')}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 ${
              moderationFilter === 'declined'
                ? 'text-white'
                : 'text-red-300/60 hover:bg-red-500/10'
            }`}
            style={moderationFilter === 'declined' ? {
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(220, 38, 38, 0.2))',
              border: '1px solid rgba(239, 68, 68, 0.4)',
            } : {}}
          >
            <Ban size={12} />
            Declined ({declinedTeams.length})
          </button>
        </div>
      </div>

      {/* Team Grid - Game HUD Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {processedTeams.map(team => {
          const budgetPercentage = getBudgetPercentage(team);
          const spent = team.budget - team.remainingBudget;
          const playerCount = team.players?.length || 0;
          const maxPlayers = 18; // Default max squad size
          const approvalStatus = getApprovalStatus(team);

          return (
            <div 
              key={team.id} 
              className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02]"
              onClick={() => { setViewingSquadTeamId(team.id); setIsSquadModalOpen(true); }}
              style={{
                background: 'linear-gradient(145deg, rgba(30, 15, 30, 0.9), rgba(15, 10, 25, 0.95))',
                border: approvalStatus === 'accepted' ? '1px solid rgba(34, 197, 94, 0.3)' : 
                        approvalStatus === 'declined' ? '1px solid rgba(239, 68, 68, 0.3)' : 
                        '1px solid rgba(236, 72, 153, 0.2)',
                boxShadow: '0 4px 30px rgba(0, 0, 0, 0.3)',
              }}
            >
              {/* Hover Glow Effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" 
                style={{ 
                  background: 'radial-gradient(ellipse at center, rgba(236, 72, 153, 0.15) 0%, transparent 70%)',
                  boxShadow: 'inset 0 0 30px rgba(236, 72, 153, 0.1)'
                }} 
              />

              {/* Top Accent Line - Color based on approval status */}
              <div className="absolute top-0 left-0 right-0 h-1 opacity-60 group-hover:opacity-100 transition-opacity"
                style={{
                  background: approvalStatus === 'accepted' ? 'linear-gradient(90deg, #22c55e, #16a34a)' :
                              approvalStatus === 'declined' ? 'linear-gradient(90deg, #ef4444, #dc2626)' :
                              'linear-gradient(90deg, rgba(236, 72, 153, 1), rgba(220, 38, 38, 1), rgba(236, 72, 153, 1))'
                }}
              />

              {/* Card Content */}
              <div className="relative p-5">
                {/* Team Header - Logo & Name */}
                <div className="flex items-start gap-4 mb-5">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-pink-500/20 to-red-600/20 flex items-center justify-center overflow-hidden border border-pink-500/30 flex-shrink-0 group-hover:border-pink-500/50 transition-all">
                    {team.logo ? (
                      <img src={team.logo} alt={team.name} className="w-full h-full object-cover" />
                    ) : (
                      <Trophy size={28} className="text-pink-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-black text-white truncate group-hover:text-pink-200 transition-colors">{team.name}</h3>
                    <p className="text-pink-400/60 text-xs truncate">{team.homeCity || 'Unknown Location'}</p>
                    {/* Approval Status Badge */}
                    <div className="mt-1">
                      {approvalStatus === 'accepted' && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-green-500/15 border border-green-500/30 text-green-400 inline-flex items-center gap-1">
                          <Check size={8} /> Accepted
                        </span>
                      )}
                      {approvalStatus === 'pending' && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-amber-500/15 border border-amber-500/30 text-amber-400 inline-flex items-center gap-1">
                          <Clock size={8} /> Pending
                        </span>
                      )}
                      {approvalStatus === 'declined' && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-red-500/15 border border-red-500/30 text-red-400 inline-flex items-center gap-1">
                          <Ban size={8} /> Declined
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Action Buttons */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleEditTeam(team); }} 
                      className="p-2 rounded-lg bg-pink-500/10 text-pink-400 hover:bg-pink-500/20 transition-all"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setTeams(prev => prev.filter(t => t.id !== team.id)); }} 
                      className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {/* Budget Remaining */}
                  <div className="bg-black/30 rounded-xl p-3 border border-pink-500/10">
                    <div className="flex items-center gap-2 mb-1">
                      <Wallet size={12} className="text-green-400" />
                      <span className="text-[10px] font-bold text-green-400/80 uppercase tracking-wider">Budget</span>
                    </div>
                    <p className="text-xl font-black text-white">₹{(team.remainingBudget / 10000000).toFixed(1)}<span className="text-xs text-pink-400/60">Cr</span></p>
                  </div>
                  {/* Players Count */}
                  <div className="bg-black/30 rounded-xl p-3 border border-pink-500/10">
                    <div className="flex items-center gap-2 mb-1">
                      <Users size={12} className="text-cyan-400" />
                      <span className="text-[10px] font-bold text-cyan-400/80 uppercase tracking-wider">Squad</span>
                    </div>
                    <p className="text-xl font-black text-white">{playerCount}<span className="text-xs text-pink-400/60">/{maxPlayers}</span></p>
                  </div>
                </div>

                {/* Budget Progress Bar - Power Bar Style */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold text-pink-400/60 uppercase tracking-wider flex items-center gap-1">
                      <Zap size={10} className="text-amber-400" />
                      Budget Power
                    </span>
                    <span className="text-xs font-bold text-white">{budgetPercentage}%</span>
                  </div>
                  <div className="w-full h-3 bg-black/50 rounded-full overflow-hidden border border-pink-500/20">
                    <div 
                      className={`h-full bg-gradient-to-r ${getBudgetBarColor(budgetPercentage)} rounded-full transition-all duration-500 relative`}
                      style={{ width: `${budgetPercentage}%` }}
                    >
                      {/* Animated shine effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                    </div>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[9px] text-pink-400/40">Spent: ₹{(spent / 10000000).toFixed(1)}Cr</span>
                    <span className="text-[9px] text-pink-400/40">Total: ₹{(team.budget / 10000000).toFixed(1)}Cr</span>
                  </div>
                </div>

                {/* View Roster Button */}
                <button 
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500/10 to-red-600/10 border border-pink-500/30 text-pink-300 text-xs font-bold uppercase tracking-wider hover:from-pink-500/20 hover:to-red-600/20 hover:border-pink-500/50 transition-all flex items-center justify-center gap-2 group-hover:shadow-[0_0_15px_rgba(236,72,153,0.2)]"
                >
                  <TrendingUp size={14} />
                  View Roster
                </button>
                
                {/* Moderation Actions */}
                <div className="flex gap-2 mt-2">
                  {approvalStatus !== 'accepted' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateApproval(team.id, 'accepted');
                      }}
                      disabled={updatingApproval === team.id}
                      className="flex-1 py-2 rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-600/20 border border-green-500/40 text-green-300 text-xs font-bold hover:from-green-500/30 hover:to-emerald-600/30 hover:border-green-500/60 transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      <Check size={12} />
                      Accept
                    </button>
                  )}
                  {approvalStatus !== 'declined' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateApproval(team.id, 'declined');
                      }}
                      disabled={updatingApproval === team.id}
                      className="flex-1 py-2 rounded-lg bg-gradient-to-r from-red-500/20 to-rose-600/20 border border-red-500/40 text-red-300 text-xs font-bold hover:from-red-500/30 hover:to-rose-600/30 hover:border-red-500/60 transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      <X size={12} />
                      Decline
                    </button>
                  )}
                </div>
              </div>

              {/* Corner Accent */}
              <div className="absolute bottom-0 right-0 w-20 h-20 opacity-20 group-hover:opacity-40 transition-opacity"
                style={{ background: 'radial-gradient(circle at bottom right, rgba(236, 72, 153, 0.5), transparent 70%)' }}
              />
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {processedTeams.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-500/20 to-red-600/20 flex items-center justify-center mb-6 border border-pink-500/30">
            <Trophy size={40} className="text-pink-400/50" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Franchises Found</h3>
          <p className="text-pink-400/60 text-sm mb-6">Add your first franchise to get started</p>
          <button 
            onClick={() => { 
              setEditingTeamId(null); 
              setNewTeam({ name: '', budget: config.totalBudget }); 
              setIsTeamModalOpen(true); 
            }}
            className="px-6 py-3 bg-gradient-to-r from-pink-500 to-red-600 text-white rounded-full font-bold text-sm flex items-center gap-2"
          >
            <Plus size={16} /> Create Franchise
          </button>
        </div>
      )}
    </div>
  );
};
