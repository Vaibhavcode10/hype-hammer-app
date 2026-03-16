import React from 'react';
import { Player, Team } from '../types';
import StatCard from './StatCard';

interface DashboardStatsSectionProps {
  players: Player[];
  teams: Team[];
  primaryColor: string;
}

const DashboardStatsSection: React.FC<DashboardStatsSectionProps> = ({ 
  players, 
  teams, 
  primaryColor 
}) => {
  const totalPlayers = players.length;
  const soldPlayers = players.filter(p => p.status === 'SOLD').length;
  const pendingPlayers = players.filter(p => p.status === 'PENDING').length;
  const totalTeams = teams.length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <StatCard 
        label="Total Players" 
        value={totalPlayers} 
        icon="👥"
        primaryColor={primaryColor}
      />
      <StatCard 
        label="Total Teams" 
        value={totalTeams} 
        icon="🏆"
        primaryColor={primaryColor}
      />
      <StatCard 
        label="Sold" 
        value={soldPlayers} 
        icon="✓"
        primaryColor={primaryColor}
      />
      <StatCard 
        label="Pending" 
        value={pendingPlayers} 
        icon="⏳"
        primaryColor={primaryColor}
      />
    </div>
  );
};

export default DashboardStatsSection;
