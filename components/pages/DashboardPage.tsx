import React from 'react';
import { Zap, TrendingUp, Wallet, Trophy, BarChart3 } from 'lucide-react';
import { Player, Team, Bid } from '../../types';
import { StatCard, CommandCard } from '../ui';

interface DashboardPageProps {
  players: Player[];
  teams: Team[];
  history: Bid[];
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ players, teams, history }) => {
  const totalValueSold = history.reduce((acc, b) => acc + b.amount, 0);
  const totalAvailableBudget = teams.reduce((acc, t) => acc + t.budget, 0);
  const avgPlayerPrice = history.length > 0 ? totalValueSold / history.length : 0;
  const topSpentTeam = [...teams].sort((a, b) => (b.budget - b.remainingBudget) - (a.budget - a.remainingBudget))[0];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 pb-20">
      <div className="lg:col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Draft Progress" 
          value={`${players.length > 0 ? Math.round((players.filter(p => p.status === 'SOLD').length / players.length) * 100) : 0}%`} 
          icon={<Zap />} 
          subValue={`${players.filter(p => p.status === 'SOLD').length} of ${players.length} registered`} 
        />
        <StatCard 
          label="Total Market Value" 
          value={`$${(totalValueSold / 1000000).toFixed(2)}M`} 
          icon={<TrendingUp />} 
          subValue={`Avg. Price: $${(avgPlayerPrice/1000000).toFixed(2)}M`} 
        />
        <StatCard 
          label="Capital Utilization" 
          value={`${totalAvailableBudget > 0 ? Math.round((totalValueSold / totalAvailableBudget) * 100) : 0}%`} 
          icon={<Wallet />} 
          subValue={`Spent: $${(totalValueSold/1000000).toFixed(1)}M / Total: $${(totalAvailableBudget/1000000).toFixed(1)}M`} 
        />
        <StatCard 
          label="Top Tier Franchise" 
          value={topSpentTeam?.name || '—'} 
          icon={<Trophy />} 
          subValue={`Spent $${((topSpentTeam?.budget - topSpentTeam?.remainingBudget) / 1000000).toFixed(1)}M so far`} 
        />
      </div>
      <div className="lg:col-span-12 mt-6">
        <CommandCard title="Strategic Liquidity" icon={<BarChart3 size={16}/>}>
          <div className="h-[300px] flex items-end justify-between gap-4 px-4 pb-4 border-b border-slate-300">
            {teams.map(t => (
              <div key={t.id} className="flex-1 flex flex-col items-center gap-3 group relative">
                <div 
                  className="w-full gold-gradient rounded-t-xl transition-all group-hover:brightness-125" 
                  style={{ height: `${((t.budget - t.remainingBudget) / t.budget) * 200 + 10}px` }}
                ></div>
                <span className="text-[10px] font-black uppercase text-slate-600 truncate w-full text-center">{t.name}</span>
                <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-all bg-gradient-to-r from-blue-500 to-orange-500 text-white px-3 py-1 rounded-lg text-[10px] font-black">
                  ${((t.budget-t.remainingBudget)/1000000).toFixed(1)}M
                </div>
              </div>
            ))}
          </div>
        </CommandCard>
      </div>
    </div>
  );
};
