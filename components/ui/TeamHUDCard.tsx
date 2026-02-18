import React from 'react';
import { Trophy, Wallet, Users } from 'lucide-react';
import { Team } from '../../types';

interface TeamHUDCardProps {
  team: Team;
  playerCount: number;
  maxPlayers?: number;
  onClick: () => void;
}

export const TeamHUDCard: React.FC<TeamHUDCardProps> = ({
  team,
  playerCount,
  maxPlayers = 18,
  onClick
}) => {
  // Calculate budget percentage for power bar
  const budgetPercentage = Math.round((team.remainingBudget / team.budget) * 100);
  const spent = team.budget - team.remainingBudget;

  return (
    <div 
      onClick={onClick}
      className="group relative cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:z-10"
    >
      {/* Main Card Container */}
      <div 
        className="relative rounded-xl overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, rgba(20, 10, 25, 0.95), rgba(30, 15, 35, 0.9))',
          border: '1px solid rgba(236, 72, 153, 0.25)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
        }}
      >
        {/* Animated Border Glow on Hover */}
        <div 
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            boxShadow: 'inset 0 0 25px rgba(236, 72, 153, 0.15)'
          }}
        />

        {/* Top Power Indicator Bar */}
        <div className="h-1 w-full bg-black/50">
          <div 
            className="h-full bg-gradient-to-r from-pink-500 via-rose-400 to-pink-600 transition-all duration-500"
            style={{ 
              width: `${budgetPercentage}%`,
              boxShadow: '0 0 8px rgba(236, 72, 153, 0.5)'
            }}
          />
        </div>

        {/* Card Content */}
        <div className="p-5">
          {/* Hero Section: Logo + Name */}
          <div className="flex items-center gap-4 mb-5">
            {/* Team Logo */}
            <div 
              className="w-14 h-14 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 transition-all duration-300 group-hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(180, 50, 120, 0.1))',
                border: '1px solid rgba(236, 72, 153, 0.35)',
                boxShadow: '0 2px 10px rgba(236, 72, 153, 0.15)'
              }}
            >
              {team.logo ? (
                <img src={team.logo} alt={team.name} className="w-full h-full object-cover" />
              ) : (
                <Trophy size={24} className="text-pink-400" />
              )}
            </div>

            {/* Team Name & Location */}
            <div className="flex-1 min-w-0">
              <h3 
                className="text-base font-bold text-white truncate group-hover:text-pink-200 transition-colors"
                style={{ textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}
              >
                {team.name}
              </h3>
              <p className="text-pink-400/50 text-xs truncate">{team.homeCity || 'Franchise HQ'}</p>
            </div>

            {/* Power % */}
            <div className="text-right flex-shrink-0">
              <span className="text-xl font-black text-white">{budgetPercentage}%</span>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            {/* Budget */}
            <div 
              className="rounded-lg p-2.5"
              style={{
                background: 'rgba(236, 72, 153, 0.06)',
                border: '1px solid rgba(236, 72, 153, 0.15)'
              }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Wallet size={11} className="text-pink-400/60" />
                <span className="text-[8px] font-bold text-pink-400/50 uppercase tracking-wider">BUDGET</span>
              </div>
              <p className="text-lg font-black text-white leading-none">
                ₹{(team.remainingBudget / 10000000).toFixed(1)}
                <span className="text-[9px] font-bold text-pink-400/40 ml-0.5">Cr</span>
              </p>
            </div>

            {/* Squad */}
            <div 
              className="rounded-lg p-2.5"
              style={{
                background: 'rgba(236, 72, 153, 0.06)',
                border: '1px solid rgba(236, 72, 153, 0.15)'
              }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Users size={11} className="text-pink-400/60" />
                <span className="text-[8px] font-bold text-pink-400/50 uppercase tracking-wider">SQUAD</span>
              </div>
              <p className="text-lg font-black text-white leading-none">
                {playerCount}
                <span className="text-[9px] font-bold text-pink-400/40 ml-0.5">/{maxPlayers}</span>
              </p>
            </div>
          </div>

          {/* Power Bar */}
          <div className="mb-5">
            <div 
              className="w-full h-2 rounded-full overflow-hidden"
              style={{
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.05)'
              }}
            >
              <div 
                className="h-full bg-gradient-to-r from-pink-500 via-rose-400 to-pink-600 rounded-full transition-all duration-700"
                style={{ 
                  width: `${budgetPercentage}%`,
                  boxShadow: '0 0 8px rgba(236, 72, 153, 0.4)'
                }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[8px] text-pink-400/40">Spent: ₹{(spent / 10000000).toFixed(1)}Cr</span>
              <span className="text-[8px] text-pink-400/40">Total: ₹{(team.budget / 10000000).toFixed(1)}Cr</span>
            </div>
          </div>

          {/* View Squad Button */}
          <button 
            className="w-full py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2"
            style={{
              background: 'rgba(236, 72, 153, 0.1)',
              border: '1px solid rgba(236, 72, 153, 0.3)',
              color: '#f9a8d4'
            }}
          >
            <Users size={11} />
            VIEW SQUAD
          </button>
        </div>

        {/* Corner Accent Glow */}
        <div 
          className="absolute -bottom-6 -right-6 w-24 h-24 opacity-20 group-hover:opacity-35 transition-opacity pointer-events-none"
          style={{ 
            background: 'radial-gradient(circle, rgba(236, 72, 153, 0.4) 0%, transparent 70%)'
          }}
        />
      </div>
    </div>
  );
};
