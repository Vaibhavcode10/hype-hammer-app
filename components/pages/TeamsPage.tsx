import React from 'react';
import { Search, Plus, Edit2, Trash2, Users, Trophy, Wallet, TrendingUp, Zap } from 'lucide-react';
import { Team, AuctionConfig } from '../../types';

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
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
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

      {/* Team Grid - Game HUD Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredTeams.map(team => {
          const budgetPercentage = getBudgetPercentage(team);
          const spent = team.budget - team.remainingBudget;
          const playerCount = team.players?.length || 0;
          const maxPlayers = 18; // Default max squad size

          return (
            <div 
              key={team.id} 
              className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02]"
              onClick={() => { setViewingSquadTeamId(team.id); setIsSquadModalOpen(true); }}
              style={{
                background: 'linear-gradient(145deg, rgba(30, 15, 30, 0.9), rgba(15, 10, 25, 0.95))',
                border: '1px solid rgba(236, 72, 153, 0.2)',
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

              {/* Top Accent Line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 via-red-500 to-pink-500 opacity-60 group-hover:opacity-100 transition-opacity" />

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
      {filteredTeams.length === 0 && (
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
