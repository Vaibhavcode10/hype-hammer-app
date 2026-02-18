import React from 'react';
import { ArrowLeft, Trophy, Wallet, Users, TrendingDown, User, Zap, Shield, Globe, Target, Award, IndianRupee } from 'lucide-react';
import { Team, Player } from '../../types';

interface TeamSquadPageProps {
  team: Team;
  players: Player[];
  onBack: () => void;
}

export const TeamSquadPage: React.FC<TeamSquadPageProps> = ({
  team,
  players,
  onBack
}) => {
  // Filter players belonging to this team by soldTo field (set when player is sold)
  const teamPlayers = players.filter(p => p.soldTo === team.id || p.teamId === team.id);
  
  // Debug log to verify data
  console.log(`[TeamSquadPage] Team: ${team.id}, Total players: ${players.length}, Team players: ${teamPlayers.length}`, teamPlayers);
  
  const spent = team.budget - team.remainingBudget;
  const budgetPercentage = Math.round((team.remainingBudget / team.budget) * 100);
  const maxPlayers = 18;
  const squadPercentage = Math.round((teamPlayers.length / maxPlayers) * 100);

  return (
    <div 
      className="flex-1 p-5 pb-12"
    >
      {/* Back Button */}
      <button
        onClick={onBack}
        className="mb-5 px-6 py-3 rounded-full bg-black/50 border border-pink-500/30 text-pink-300 hover:bg-pink-500/15 hover:border-pink-500/50 transition-all flex items-center gap-2.5 text-sm font-bold"
        style={{ boxShadow: '0 0 12px rgba(255,0,102,0.1)' }}
      >
        <ArrowLeft size={20} />
        Back to Teams
      </button>

      {/* Team Header HUD Panel */}
      <div 
        className="rounded-xl overflow-hidden mb-5"
        style={{
          background: 'linear-gradient(145deg, rgba(15, 8, 20, 0.98), rgba(25, 12, 30, 0.95))',
          border: '1px solid rgba(236, 72, 153, 0.35)',
          boxShadow: '0 0 25px rgba(236, 72, 153, 0.12), inset 0 1px 0 rgba(255,255,255,0.03)'
        }}
      >
        {/* Animated Power Bar */}
        <div className="h-[3px] w-full bg-black/60 relative overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-pink-600 via-rose-400 to-pink-500 transition-all duration-1000 relative"
            style={{ 
              width: `${budgetPercentage}%`,
              boxShadow: '0 0 12px rgba(236, 72, 153, 0.6)'
            }}
          >
            {/* Animated shimmer */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" style={{ animationDuration: '2s' }} />
          </div>
        </div>

        <div className="p-5">
          {/* Team Identity Row */}
          <div className="flex items-center gap-4 mb-4">
            {/* Team Logo with glow */}
            <div 
              className="w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 relative group"
              style={{
                background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(180, 50, 120, 0.1))',
                border: '1.5px solid rgba(236, 72, 153, 0.5)',
                boxShadow: '0 0 15px rgba(236, 72, 153, 0.25)'
              }}
            >
              {team.logo ? (
                <img src={team.logo} alt={team.name} className="w-full h-full object-cover" />
              ) : (
                <Trophy size={26} className="text-pink-400" />
              )}
              {/* Pulse ring on hover */}
              <div className="absolute inset-0 rounded-xl opacity-0 hover:opacity-100 transition-opacity" style={{ boxShadow: 'inset 0 0 15px rgba(236, 72, 153, 0.3)' }} />
            </div>

            {/* Team Name & Details */}
            <div className="flex-1 min-w-0">
              <h1 
                className="text-xl font-black text-white truncate leading-tight"
                style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
              >
                {team.name}
              </h1>
              <p className="text-pink-400/50 text-xs">{team.homeCity || 'Franchise HQ'}</p>
            </div>

            {/* Power Badge */}
            <div 
              className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{
                background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(180, 50, 120, 0.1))',
                border: '1px solid rgba(236, 72, 153, 0.35)',
                boxShadow: '0 0 10px rgba(236, 72, 153, 0.15)'
              }}
            >
              <Zap size={14} className="text-pink-400" />
              <span className="text-base font-black text-white">{budgetPercentage}%</span>
            </div>
          </div>

          {/* HUD Separator */}
          <div className="h-[1px] w-full mb-4 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-pink-500/40 to-transparent" />
            <div className="absolute left-1/2 -translate-x-1/2 w-8 h-[1px] bg-pink-400/60" />
          </div>

          {/* Stats Strip - Inline Chips */}
          <div className="flex items-center gap-3">
            {/* Total Budget Chip */}
            <div 
              className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg group hover:scale-[1.02] transition-transform cursor-default"
              style={{
                background: 'rgba(236, 72, 153, 0.06)',
                border: '1px solid rgba(236, 72, 153, 0.15)'
              }}
            >
              <Wallet size={12} className="text-pink-400/60" />
              <span className="text-[9px] font-bold text-pink-400/50 uppercase">TOTAL</span>
              <span className="text-sm font-black text-white ml-auto">₹{(team.budget / 10000000).toFixed(1)}Cr</span>
            </div>

            {/* Spent Chip */}
            <div 
              className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg group hover:scale-[1.02] transition-transform cursor-default"
              style={{
                background: 'rgba(236, 72, 153, 0.06)',
                border: '1px solid rgba(236, 72, 153, 0.15)'
              }}
            >
              <TrendingDown size={12} className="text-pink-400/60" />
              <span className="text-[9px] font-bold text-pink-400/50 uppercase">SPENT</span>
              <span className="text-sm font-black text-pink-200 ml-auto">₹{(spent / 10000000).toFixed(1)}Cr</span>
            </div>

            {/* Remaining Chip */}
            <div 
              className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg group hover:scale-[1.02] transition-transform cursor-default"
              style={{
                background: 'rgba(236, 72, 153, 0.06)',
                border: '1px solid rgba(236, 72, 153, 0.15)'
              }}
            >
              <Wallet size={12} className="text-pink-400/60" />
              <span className="text-[9px] font-bold text-pink-400/50 uppercase">LEFT</span>
              <span className="text-sm font-black text-white ml-auto">₹{(team.remainingBudget / 10000000).toFixed(1)}Cr</span>
            </div>

            {/* Squad Chip */}
            <div 
              className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg group hover:scale-[1.02] transition-transform cursor-default"
              style={{
                background: 'rgba(236, 72, 153, 0.06)',
                border: '1px solid rgba(236, 72, 153, 0.15)'
              }}
            >
              <Users size={12} className="text-pink-400/60" />
              <span className="text-[9px] font-bold text-pink-400/50 uppercase">SQUAD</span>
              <span className="text-sm font-black text-white ml-auto">{teamPlayers.length}/{maxPlayers}</span>
            </div>
          </div>

          {/* Squad Progress Bar */}
          <div className="mt-4">
            <div 
              className="w-full h-1.5 rounded-full overflow-hidden relative"
              style={{
                background: 'rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.03)'
              }}
            >
              <div 
                className="h-full bg-gradient-to-r from-pink-600 via-rose-400 to-pink-500 rounded-full transition-all duration-700 relative"
                style={{ 
                  width: `${squadPercentage}%`,
                  boxShadow: '0 0 8px rgba(236, 72, 153, 0.5)'
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" style={{ animationDuration: '1.5s' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* HUD Section Separator */}
      <div className="flex items-center gap-3 mb-5">
        <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-pink-500/30 to-transparent" />
        <div 
          className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold text-pink-400/70 uppercase tracking-wider"
          style={{
            background: 'rgba(236, 72, 153, 0.06)',
            border: '1px solid rgba(236, 72, 153, 0.2)'
          }}
        >
          <Users size={12} />
          Squad Roster
          <span className="text-pink-400/40">({teamPlayers.length})</span>
        </div>
        <div className="h-[1px] flex-1 bg-gradient-to-r from-pink-500/30 via-transparent to-transparent" />
      </div>

      {/* Roster Grid */}
      {teamPlayers.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4">
          {teamPlayers.map((player) => {
            const soldPrice = player.soldPrice || player.soldAmount || 0;
            const basePrice = player.basePrice || 0;
            const statusText = player.status || 'SOLD';
            const playingRole = player.roleId || player.role || '';
            const isOverseas = (player as any).isOverseas;

            return (
              <div 
                key={player.id}
                className="group relative rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.03] cursor-default"
                style={{
                  background: 'linear-gradient(145deg, rgba(20, 10, 25, 0.95), rgba(30, 15, 35, 0.9))',
                  border: '1px solid rgba(236, 72, 153, 0.2)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)'
                }}
              >
                {/* Status Bar Top */}
                <div 
                  className="h-[3px] w-full"
                  style={{
                    background: statusText === 'SOLD' 
                      ? 'linear-gradient(90deg, rgba(236, 72, 153, 0.8), rgba(244, 114, 182, 0.6))' 
                      : statusText === 'UNSOLD'
                      ? 'linear-gradient(90deg, rgba(239, 68, 68, 0.6), rgba(185, 28, 28, 0.4))'
                      : 'linear-gradient(90deg, rgba(168, 85, 247, 0.6), rgba(139, 92, 246, 0.4))'
                  }}
                />

                {/* Hover Glow */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ boxShadow: 'inset 0 0 20px rgba(236, 72, 153, 0.15)' }}
                />

                {/* Card Content */}
                <div className="p-4">
                  {/* Player Image + Status Badge */}
                  <div className="relative w-16 h-16 mx-auto mb-3">
                    <div 
                      className="w-full h-full rounded-full flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform"
                      style={{
                        background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(180, 50, 120, 0.1))',
                        border: '2px solid rgba(236, 72, 153, 0.35)',
                        boxShadow: '0 4px 12px rgba(236, 72, 153, 0.15)'
                      }}
                    >
                      {player.imageUrl ? (
                        <img src={player.imageUrl} alt={player.name} className="w-full h-full object-cover" />
                      ) : (
                        <User size={26} className="text-pink-400/50" />
                      )}
                    </div>

                  </div>

                  {/* Player Name */}
                  <h4 className="text-base font-bold text-white text-center mb-1.5 truncate leading-snug group-hover:text-pink-200 transition-colors">
                    {player.name}
                  </h4>

                  {/* Playing Role */}
                  <div className="flex justify-center mb-3">
                    <span 
                      className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide"
                      style={{
                        background: 'rgba(236, 72, 153, 0.1)',
                        border: '1px solid rgba(236, 72, 153, 0.25)',
                        color: '#f9a8d4'
                      }}
                    >
                      {playingRole || 'Player'}
                    </span>
                  </div>

                  {/* HUD Divider */}
                  <div className="h-[1px] w-full mb-3 bg-gradient-to-r from-transparent via-pink-500/20 to-transparent" />

                  {/* Price Info Rows */}
                  <div className="space-y-2.5 mb-3">
                    {/* Sold Price */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <IndianRupee size={12} className="text-pink-400/50" />
                        <span className="text-[10px] font-semibold text-pink-400/50 uppercase">Price</span>
                      </div>
                      <span className="text-base font-black text-pink-200">
                        {soldPrice > 0 ? `₹${(soldPrice / 100000).toFixed(1)}L` : '—'}
                      </span>
                    </div>
                    {/* Base Price */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Target size={12} className="text-pink-400/50" />
                        <span className="text-[10px] font-semibold text-pink-400/50 uppercase">Base</span>
                      </div>
                      <span className="text-sm font-bold text-pink-300/70">
                        {basePrice > 0 ? `₹${(basePrice / 100000).toFixed(1)}L` : '—'}
                      </span>
                    </div>
                  </div>

                  {/* HUD Divider */}
                  <div className="h-[1px] w-full mb-3 bg-gradient-to-r from-transparent via-pink-500/15 to-transparent" />

                  {/* Extra Info Chips */}
                  <div className="space-y-2">
                    {/* Nationality / Overseas */}
                    {(player.nationality || isOverseas) && (
                      <div className="flex items-center gap-1.5">
                        <Globe size={11} className="text-pink-400/40" />
                        <span className="text-[10px] text-pink-300/50">
                          {player.nationality || (isOverseas ? 'Overseas' : 'Local')}
                        </span>
                      </div>
                    )}
                    {/* Batting Style */}
                    {player.battingStyle && (
                      <div className="flex items-center gap-1.5">
                        <Award size={11} className="text-pink-400/40" />
                        <span className="text-[10px] text-pink-300/50">Bat: {player.battingStyle}</span>
                      </div>
                    )}
                    {/* Bowling Style */}
                    {player.bowlingStyle && (
                      <div className="flex items-center gap-1.5">
                        <Target size={11} className="text-pink-400/40" />
                        <span className="text-[10px] text-pink-300/50">Bowl: {player.bowlingStyle}</span>
                      </div>
                    )}
                    {/* Experience Level */}
                    {player.experienceLevel && (
                      <div className="flex items-center gap-1.5">
                        <Shield size={11} className="text-pink-400/40" />
                        <span className="text-[10px] text-pink-300/50">{player.experienceLevel}</span>
                      </div>
                    )}
                    {/* Player Category */}
                    {player.playerCategory && (
                      <div className="flex items-center gap-1.5">
                        <Award size={11} className="text-pink-400/40" />
                        <span className="text-[10px] text-pink-300/50">{player.playerCategory}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State - Compact */
        <div 
          className="rounded-lg p-6 text-center"
          style={{
            background: 'linear-gradient(145deg, rgba(15, 8, 20, 0.8), rgba(25, 12, 30, 0.7))',
            border: '1px dashed rgba(236, 72, 153, 0.2)'
          }}
        >
          <div 
            className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center"
            style={{
              background: 'rgba(236, 72, 153, 0.06)',
              border: '1px solid rgba(236, 72, 153, 0.12)'
            }}
          >
            <Users size={20} className="text-pink-400/25" />
          </div>
          <h3 className="text-sm font-bold text-white mb-0.5">No Players Acquired</h3>
          <p className="text-pink-400/30 text-[10px]">Players appear here after auction</p>
        </div>
      )}
    </div>
  );
};
