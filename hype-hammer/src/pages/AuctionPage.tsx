import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Plus } from 'lucide-react';
import { SportType, Player, Team } from '../types';
import { SPORT_THEMES } from '../themes';
import Header from '../components/Header';
import PlayerCard from '../components/PlayerCard';
import TeamCard from '../components/TeamCard';
import DashboardStatsSection from '../components/DashboardStatsSection';
import NavigationBar from '../components/NavigationBar';

interface AuctionPageProps {
  sport: SportType;
  theme: typeof SPORT_THEMES.cricket;
  onBack: () => void;
}

const AuctionPage: React.FC<AuctionPageProps> = ({ sport, theme, onBack }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'players' | 'teams' | 'auction'>('dashboard');
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch sport-specific data every 5 seconds
  useEffect(() => {
    let mounted = true;
    const sportFolder = sport.toLowerCase();

    const fetchData = async () => {
      try {
        const [pRes, tRes] = await Promise.all([
          fetch(`/data/${sportFolder}/players.json`),
          fetch(`/data/${sportFolder}/teams.json`)
        ]);

        if (!mounted) return;

        if (pRes.ok) {
          const pdata = await pRes.json();
          if (Array.isArray(pdata)) setPlayers(pdata);
        }
        if (tRes.ok) {
          const tdata = await tRes.json();
          if (Array.isArray(tdata)) setTeams(tdata);
        }
        setLoading(false);
      } catch (e) {
        console.warn('Failed to fetch sport data:', e);
        setLoading(false);
      }
    };

    fetchData();
    const id = setInterval(fetchData, 5000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [sport]);

  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: theme.bg }}
      >
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-4 border-white/20 border-t-white animate-spin mx-auto mb-4" style={{ borderTopColor: theme.primary }}></div>
          <p className="text-white font-bold uppercase tracking-widest">Loading {sport} Auction...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"
      style={{ backgroundColor: theme.bg }}
    >
      {/* Header Component */}
      <div className="fixed top-0 left-0 right-0 z-50 pt-8">
        <Header 
          title={sport} 
          subtitle="Auction Live"
          showBack={true}
          primaryColor={theme.primary}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 pt-24 pb-20 px-6 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <h2 className="text-4xl font-display font-black text-white uppercase tracking-wider">Dashboard</h2>
              
              {/* Stats Cards Component */}
              <DashboardStatsSection 
                players={players}
                teams={teams}
                primaryColor={theme.primary}
              />

              {/* Teams Overview */}
              <div className="mt-12">
                <h3 className="text-2xl font-black text-white uppercase mb-6" style={{ color: theme.primary }}>Teams Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {teams.map((team) => (
                    <TeamCard 
                      key={team.id}
                      team={team}
                      primaryColor={theme.primary}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Players Tab */}
          {activeTab === 'players' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-display font-black text-white uppercase">Players</h2>
                <button 
                  className="px-6 py-3 rounded-full font-black uppercase text-[10px] flex items-center gap-2 transition-all hover:scale-105 text-white shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})`
                  }}
                >
                  <Plus size={16} /> Add Player
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {players.map((player) => (
                  <PlayerCard 
                    key={player.id}
                    player={player}
                    primaryColor={theme.primary}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Teams Tab */}
          {activeTab === 'teams' && (
            <div className="space-y-6">
              <h2 className="text-3xl font-display font-black text-white uppercase">Teams</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {teams.map((team) => (
                  <TeamCard 
                    key={team.id}
                    team={team}
                    primaryColor={theme.primary}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Auction Tab */}
          {activeTab === 'auction' && (
            <div className="text-center py-20">
              <div className="text-6xl mb-6">🔨</div>
              <h2 className="text-3xl font-black text-white uppercase mb-4">Auction Room</h2>
              <p className="text-gray-400 text-lg">Select a player and start bidding</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Bar Component */}
      <NavigationBar 
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as 'dashboard' | 'players' | 'teams' | 'auction')}
        primaryColor={theme.primary}
      />
    </div>
  );
};

export default AuctionPage;
