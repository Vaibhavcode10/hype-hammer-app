import React, { useState, useEffect } from 'react';
import { Search, Users, Trophy, Shield, ArrowLeft } from 'lucide-react';
import { Team, Player, MatchData } from '../../types';
import { TeamHUDCard } from '../ui/TeamHUDCard';
import { TeamSquadPage } from './TeamSquadPage';

const API_BASE = 'https://us-central1-axilam.cloudfunctions.net/auction';

interface GuestTeamsPageProps {
  onClose: () => void;
  currentMatch: MatchData | null;
}

export const GuestTeamsPage: React.FC<GuestTeamsPageProps> = ({ onClose, currentMatch }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [showTeamDetail, setShowTeamDetail] = useState(false);

  useEffect(() => {
    if (currentMatch?.id) {
      fetchData();
    }
  }, [currentMatch?.id]);

  const fetchData = async () => {
    if (!currentMatch) return;
    try {
      setLoading(true);
      const [teamsRes, playersRes] = await Promise.all([
        fetch(`${API_BASE}/teams?matchId=${currentMatch.id}`),
        fetch(`${API_BASE}/players?matchId=${currentMatch.id}`)
      ]);

      if (teamsRes.ok) {
        const teamsData = await teamsRes.json();
        setTeams(teamsData.data || []);
      }

      if (playersRes.ok) {
        const playersData = await playersRes.json();
        setPlayers(playersData.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTeamPlayerCount = (teamId: string) => {
    return players.filter(p => p.teamId === teamId || p.soldTo === teamId).length;
  };

  const filteredTeams = teams.filter(team => {
    if (!teamSearchQuery.trim()) return true;
    const query = teamSearchQuery.toLowerCase();
    return team.name.toLowerCase().includes(query) || 
           (team.homeCity && team.homeCity.toLowerCase().includes(query));
  });

  // Show team detail (squad) view
  if (showTeamDetail && selectedTeamId) {
    const selectedTeam = teams.find(t => t.id === selectedTeamId);
    if (!selectedTeam) {
      return (
        <div className="flex-1 p-6 pr-8 pb-16">
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => setShowTeamDetail(false)}
              className="px-5 py-2.5 rounded-full bg-white/5 border border-pink-500/20 text-pink-300 hover:bg-pink-500/10 hover:border-pink-500/40 transition-all flex items-center gap-2 text-sm font-semibold"
            >
              <ArrowLeft size={16} />
              Back to Teams
            </button>
          </div>
          <div className="text-center py-20">
            <Trophy size={48} className="text-pink-400/30 mx-auto mb-4" />
            <p className="text-pink-300/60 text-lg">Team not found</p>
          </div>
        </div>
      );
    }
    return (
      <TeamSquadPage
        team={selectedTeam}
        players={players}
        onBack={() => setShowTeamDetail(false)}
      />
    );
  }

  return (
    <div className="flex-1 p-6 pr-8 pb-16">
      {/* Header - Game HUD Style (same as Admin) */}
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.25), rgba(180, 50, 120, 0.2))',
              border: '1px solid rgba(236, 72, 153, 0.4)',
              boxShadow: '0 0 20px rgba(236, 72, 153, 0.25)'
            }}
          >
            <Shield size={24} className="text-pink-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Team Command Center</h1>
            <p className="text-pink-400/50 text-sm mt-1">{currentMatch?.name || 'All Teams'} &mdash; {filteredTeams.length} franchise{filteredTeams.length !== 1 ? 's' : ''} registered</p>
          </div>
        </div>
        
        {/* Search Bar + Exit Button (NO Add Team button) */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-pink-400/50" />
            <input
              type="text"
              value={teamSearchQuery}
              onChange={(e) => setTeamSearchQuery(e.target.value)}
              placeholder="Search teams..."
              className="w-64 pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-pink-400/40 transition-all duration-300 focus:w-80 focus:outline-none"
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(236, 72, 153, 0.25)',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
              }}
              onFocus={(e) => {
                e.target.style.border = '1px solid rgba(236, 72, 153, 0.6)';
                e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2), 0 0 15px rgba(236, 72, 153, 0.15)';
              }}
              onBlur={(e) => {
                e.target.style.border = '1px solid rgba(236, 72, 153, 0.25)';
                e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2)';
              }}
            />
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-full bg-white/5 border border-pink-500/20 text-pink-300 hover:bg-pink-500/10 hover:border-pink-500/40 transition-all flex items-center gap-2 text-sm font-semibold"
          >
            <ArrowLeft size={16} />
            Exit
          </button>
        </div>
      </div>

      {/* Teams Grid - Using TeamHUDCard (same as Admin, view-only) */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="rounded-xl p-5 h-64" style={{ background: 'linear-gradient(145deg, rgba(20, 10, 25, 0.95), rgba(30, 15, 35, 0.9))', border: '1px solid rgba(236, 72, 153, 0.2)' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="animate-pulse bg-pink-500/15 w-14 h-14 rounded-lg"></div>
                <div className="flex-1">
                  <div className="animate-pulse bg-pink-500/15 w-3/4 h-4 rounded mb-2"></div>
                  <div className="animate-pulse bg-pink-500/10 w-1/2 h-3 rounded"></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="animate-pulse bg-pink-500/10 h-14 rounded-lg"></div>
                <div className="animate-pulse bg-pink-500/10 h-14 rounded-lg"></div>
              </div>
              <div className="animate-pulse bg-pink-500/10 w-full h-2.5 rounded-full"></div>
            </div>
          ))}
        </div>
      ) : filteredTeams.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTeams.map((team) => (
            <TeamHUDCard
              key={team.id}
              team={team}
              playerCount={getTeamPlayerCount(team.id)}
              maxPlayers={18}
              onClick={() => {
                setSelectedTeamId(team.id);
                setShowTeamDetail(true);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl p-12 text-center" style={{ background: 'linear-gradient(145deg, rgba(20, 10, 25, 0.7), rgba(30, 15, 35, 0.6))', border: '1px dashed rgba(236, 72, 153, 0.25)' }}>
          <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(236, 72, 153, 0.08)', border: '1px solid rgba(236, 72, 153, 0.15)' }}>
            <Users size={32} className="text-pink-400/30" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No Teams Found</h3>
          <p className="text-pink-400/40 text-sm">No teams have been registered for this auction yet.</p>
        </div>
      )}
    </div>
  );
};
