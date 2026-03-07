import React from 'react';
import { Player, Team } from '../../types';
import { Modal } from '../ui';
import { Trophy, Wallet, Users, TrendingDown, User, Star, X } from 'lucide-react';
import { formatIndianCurrencyShort } from '../../services/currencyUtils';

interface SquadModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewingSquadTeamId: string | null;
  teams: Team[];
  players: Player[];
  maxPlayers?: number; // Squad limit from backend
}

export const SquadModal: React.FC<SquadModalProps> = ({
  isOpen,
  onClose,
  viewingSquadTeamId,
  teams,
  players,
  maxPlayers = 12
}) => {
  const team = teams.find(t => t.id === viewingSquadTeamId);
  const teamPlayers = players.filter(p => p.teamId === viewingSquadTeamId);
  const spent = team ? (team.budget - team.remainingBudget) : 0;
  // Clamp percentage to 0-100% to handle edge cases
  const rawPercentage = team ? Math.round((team.remainingBudget / team.budget) * 100) : 0;
  const budgetPercentage = Math.max(0, Math.min(100, rawPercentage));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div 
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl"
        style={{ 
          background: 'linear-gradient(145deg, #1a0a0a 0%, #2d0a0a 50%, #1a0a12 100%)',
          border: '1px solid rgba(236, 72, 153, 0.3)',
          boxShadow: '0 0 50px rgba(236, 72, 153, 0.2)'
        }}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/50 border border-pink-500/30 flex items-center justify-center text-pink-400 hover:bg-pink-500/20 transition-all"
        >
          <X size={20} />
        </button>

        {viewingSquadTeamId && team && (
          <div className="p-6">
            {/* Team Header */}
            <div className="flex items-center gap-6 mb-8 pb-6 border-b border-pink-500/20">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-pink-500/20 to-red-600/20 flex items-center justify-center overflow-hidden border-2 border-pink-500/30">
                {team.logo ? (
                  <img src={team.logo} alt={team.name} className="w-full h-full object-cover" />
                ) : (
                  <Trophy size={40} className="text-pink-400" />
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-3xl font-black text-white mb-1">{team.name}</h2>
                <p className="text-pink-400/60 text-sm">{team.homeCity || 'Team Roster'}</p>
              </div>
            </div>

            {/* Stats Panel */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              {/* Total Budget */}
              <div className="bg-black/40 rounded-xl p-4 border border-pink-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet size={14} className="text-pink-400" />
                  <span className="text-[10px] font-bold text-pink-400/80 uppercase tracking-wider">Total Budget</span>
                </div>
                <p className="text-2xl font-black text-white">₹{(team.budget / 10000000).toFixed(1)}<span className="text-xs text-pink-400/60">Cr</span></p>
              </div>
              {/* Spent */}
              <div className="bg-black/40 rounded-xl p-4 border border-pink-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown size={14} className="text-red-400" />
                  <span className="text-[10px] font-bold text-red-400/80 uppercase tracking-wider">Spent</span>
                </div>
                <p className="text-2xl font-black text-red-300">₹{(spent / 10000000).toFixed(1)}<span className="text-xs text-red-400/60">Cr</span></p>
              </div>
              {/* Remaining */}
              <div className="bg-black/40 rounded-xl p-4 border border-pink-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Star size={14} className="text-green-400" />
                  <span className="text-[10px] font-bold text-green-400/80 uppercase tracking-wider">Remaining</span>
                </div>
                <p className="text-2xl font-black text-green-300">₹{(team.remainingBudget / 10000000).toFixed(1)}<span className="text-xs text-green-400/60">Cr</span></p>
              </div>
              {/* Player Count */}
              <div className="bg-black/40 rounded-xl p-4 border border-pink-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Users size={14} className="text-cyan-400" />
                  <span className="text-[10px] font-bold text-cyan-400/80 uppercase tracking-wider">Squad Size</span>
                </div>
                <p className="text-2xl font-black text-cyan-300">{teamPlayers.length}<span className="text-xs text-cyan-400/60">/{maxPlayers}</span></p>
              </div>
            </div>

            {/* Budget Bar */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-pink-400/60 uppercase tracking-wider">Budget Utilization</span>
                <span className="text-sm font-black text-emerald-400">{team ? formatIndianCurrencyShort(team.remainingBudget) : '₹0'} left</span>
              </div>
              <div className="w-full h-4 bg-black/50 rounded-full overflow-hidden border border-pink-500/20">
                <div 
                  className={`h-full rounded-full transition-all duration-500 relative ${
                    budgetPercentage > 60 ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                    budgetPercentage > 30 ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
                    'bg-gradient-to-r from-red-400 to-rose-500'
                  }`}
                  style={{ width: `${budgetPercentage}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                </div>
              </div>
            </div>

            {/* Roster Section */}
            <div>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Users size={18} className="text-pink-400" />
                Team Roster
              </h3>
              
              {teamPlayers.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {teamPlayers.map(player => (
                    <div 
                      key={player.id} 
                      className="bg-black/40 rounded-xl p-4 border border-pink-500/10 hover:border-pink-500/30 transition-all group"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        {/* Player Image */}
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-500/20 to-red-600/20 flex items-center justify-center overflow-hidden border border-pink-500/30 flex-shrink-0">
                          {player.imageUrl ? (
                            <img src={player.imageUrl} alt={player.name} className="w-full h-full object-cover" />
                          ) : (
                            <User size={24} className="text-pink-400" />
                          )}
                        </div>
                        {/* Player Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white font-bold text-sm truncate group-hover:text-pink-200 transition-colors">{player.name}</h4>
                          <p className="text-pink-400/60 text-xs truncate">{player.role || player.roleId || 'Player'}</p>
                        </div>
                      </div>
                      {/* Price Tag */}
                      <div className="flex items-center justify-between bg-black/30 rounded-lg px-3 py-2">
                        <span className="text-[10px] font-bold text-pink-400/60 uppercase">Acquired</span>
                        <span className="text-sm font-black text-green-400">
                          ₹{((player.soldPrice || player.soldAmount || 0) / 100000).toFixed(1)}L
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 bg-black/20 rounded-xl border border-pink-500/10">
                  <Users size={48} className="text-pink-400/30 mb-4" />
                  <p className="text-pink-400/60 text-sm">No players acquired yet</p>
                  <p className="text-pink-400/40 text-xs mt-1">Players will appear here after purchase</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
