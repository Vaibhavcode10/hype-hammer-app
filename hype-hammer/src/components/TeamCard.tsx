import React from 'react';
import { Team } from '../types';

interface TeamCardProps {
  team: Team;
  primaryColor: string;
}

const TeamCard: React.FC<TeamCardProps> = ({ team, primaryColor }) => {
  return (
    <div 
      className="p-6 rounded-2xl border-2 backdrop-blur-sm transition-all hover:scale-105 shadow-lg"
      style={{ 
        borderColor: `${primaryColor}50`,
        backgroundColor: `${primaryColor}08`,
        boxShadow: `inset 0 0 10px ${primaryColor}10`
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="text-xl font-black text-white">{team.name}</h4>
          <p className="text-xs text-gray-400">{team.homeCity}</p>
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-bold text-gray-300">Budget</span>
          <span className="text-sm font-mono text-white">${(team.remainingBudget / 1000000).toFixed(1)}M / ${(team.budget / 1000000).toFixed(1)}M</span>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: `${primaryColor}20` }}>
          <div 
            className="h-full transition-all"
            style={{
              width: `${(team.remainingBudget / team.budget) * 100}%`,
              background: `linear-gradient(90deg, ${primaryColor}, #047857)`
            }}
          ></div>
        </div>
        <p className="text-xs text-gray-400">{team.purchasedPlayers?.length || 0} players acquired</p>
      </div>
    </div>
  );
};

export default TeamCard;
