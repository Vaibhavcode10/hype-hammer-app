import React, { useMemo, useState, useEffect } from 'react';
import { Users, TrendingUp, TrendingDown, User, ArrowLeft, Search, Filter, X as FilterX, Shield, Trophy, Target, IndianRupee } from 'lucide-react';
import type { MatchData, Player as AppPlayer, Team as AppTeam } from '../../types';
import { formatIndianCurrencyShort } from '../../services/currencyUtils';

const API_BASE = 'https://us-central1-axilam.cloudfunctions.net/auction';

type Player = AppPlayer & {
  soldTimestamp?: unknown;
  updatedAt?: unknown;
  createdAt?: unknown;
};

type Team = AppTeam;

interface GuestPlayersPageProps {
  onClose: () => void;
  currentMatch: MatchData | null;
}

export const GuestPlayersPage: React.FC<GuestPlayersPageProps> = ({ onClose, currentMatch }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'sold' | 'unsold' | 'available'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string>('');

  useEffect(() => {
    if (currentMatch?.id) {
      fetchData();
    }
  }, [currentMatch?.id]);

  const fetchData = async () => {
    if (!currentMatch) return;
    
    try {
      setLoading(true);
      // CRITICAL: Guest views must ONLY see ACCEPTED players and teams
      // Use API-level filter for efficiency - no client-side filtering needed
      const approvedQuery = `matchId=${currentMatch.id}&approvalStatus=accepted`;
      
      console.log('📊 GuestPlayersPage: Fetching APPROVED data only for match:', currentMatch.id);
      
      const [playersRes, teamsRes] = await Promise.all([
        fetch(`${API_BASE}/players?${approvedQuery}`),
        fetch(`${API_BASE}/teams?${approvedQuery}`)
      ]);

      if (playersRes.ok) {
        const playersData = await playersRes.json();
        const approvedPlayers = playersData.data || [];
        console.log('📊 GuestPlayersPage: Approved players:', approvedPlayers.length);
        setPlayers(approvedPlayers);
      }

      if (teamsRes.ok) {
        const teamsData = await teamsRes.json();
        const approvedTeams = teamsData.data || [];
        console.log('📊 GuestPlayersPage: Approved teams:', approvedTeams.length);
        setTeams(approvedTeams);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTeamName = (teamId?: string) => {
    if (!teamId) return 'N/A';
    const team = teams.find(t => t.id === teamId);
    return team?.name || 'Unknown Team';
  };

  const getTeamLogo = (teamId?: string) => {
    if (!teamId) return null;
    const team = teams.find(t => t.id === teamId);
    return team?.logo;
  };

  const getSoldAmount = (player: Player) => {
    return (
      (player.soldAmount as number | undefined) ??
      (player.currentBid as number | undefined) ??
      (player.soldPrice as number | undefined) ??
      ((player as any).finalPrice as number | undefined) ??
      0
    );
  };

  const getSoldTeamId = (player: Player) => {
    return (player.soldTo as string | undefined) ?? (player.teamId as string | undefined);
  };

  const getSoldTeamDisplayName = (player: Player) => {
    const explicitName = (player.teamName as string | undefined) ?? ((player as any).leadingTeamName as string | undefined);
    if (explicitName) return explicitName;
    return getTeamName(getSoldTeamId(player));
  };

  const soldPlayers = useMemo(() => players.filter(p => p.status === 'SOLD'), [players]);
  const unsoldPlayers = useMemo(() => players.filter(p => p.status === 'UNSOLD'), [players]);
  const availablePlayers = useMemo(() => players.filter(p => p.status === 'AVAILABLE' || p.status === 'PENDING' || !p.status), [players]);

  const filteredAllPlayers = players.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         p.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const filteredSoldPlayers = soldPlayers.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         p.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const teamId = getSoldTeamId(p);
    const matchesTeam = !selectedTeam || teamId === selectedTeam;
    return matchesSearch && matchesTeam;
  });

  const filteredUnsoldPlayers = unsoldPlayers.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         p.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const filteredAvailablePlayers = availablePlayers.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         p.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-pink-500/30 border-t-pink-500 mx-auto mb-4"></div>
          <p className="text-lg font-bold text-pink-400">Loading Players...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 pr-6 pb-12">
      {/* Gaming Theme Styles */}
      <style>{`
        @keyframes neon-pulse {
          0%, 100% { box-shadow: 0 0 5px rgba(236, 72, 153, 0.3), 0 0 20px rgba(236, 72, 153, 0.2); }
          50% { box-shadow: 0 0 10px rgba(236, 72, 153, 0.5), 0 0 30px rgba(236, 72, 153, 0.3); }
        }
        .neon-pulse { animation: neon-pulse 2s ease-in-out infinite; }
        .glass-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(236, 72, 153, 0.15);
        }
        .custom-scrollbar::-webkit-scrollbar { display: none; }
        .custom-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.2), rgba(180, 50, 120, 0.15))',
              border: '1px solid rgba(236, 72, 153, 0.4)',
              boxShadow: '0 0 15px rgba(236, 72, 153, 0.2)'
            }}
          >
            <Shield size={20} className="text-pink-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Players</h1>
            <p className="text-pink-400/50 text-xs">{currentMatch?.name || 'Current Season'} — {players.length} registered</p>
          </div>
        </div>

        {/* Search Bar + Exit Button */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-pink-400/50" />
            <input
              type="text"
              placeholder="Search players..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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

      {/* Spacer between header and content */}
      <div className="mt-6" />

      {/* Stats Bar */}
      <div className="mb-4">
        <div className="grid grid-cols-4 gap-4">
          <div 
            className="rounded-xl p-4"
            style={{
              background: 'linear-gradient(145deg, rgba(20, 10, 25, 0.95), rgba(30, 15, 35, 0.9))',
              border: '1px solid rgba(236, 72, 153, 0.2)',
              borderLeft: '3px solid rgba(236, 72, 153, 0.6)'
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-pink-600/30 to-red-600/30 flex items-center justify-center border border-pink-500/20">
                <Users size={20} className="text-pink-400" />
              </div>
              <div>
                <p className="text-[10px] text-pink-400/50 uppercase font-bold">Total Players</p>
                <p className="text-xl font-black text-white">{players.length}</p>
              </div>
            </div>
          </div>
          
          <div 
            className="rounded-xl p-4"
            style={{
              background: 'linear-gradient(145deg, rgba(20, 10, 25, 0.95), rgba(30, 15, 35, 0.9))',
              border: '1px solid rgba(236, 72, 153, 0.2)',
              borderLeft: '3px solid rgba(34, 197, 94, 0.6)'
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-green-600/30 to-emerald-600/30 flex items-center justify-center border border-green-500/20">
                <TrendingUp size={20} className="text-green-400" />
              </div>
              <div>
                <p className="text-[10px] text-pink-400/50 uppercase font-bold">Sold</p>
                <p className="text-xl font-black text-green-300">{soldPlayers.length}</p>
              </div>
            </div>
          </div>
          
          <div 
            className="rounded-xl p-4"
            style={{
              background: 'linear-gradient(145deg, rgba(20, 10, 25, 0.95), rgba(30, 15, 35, 0.9))',
              border: '1px solid rgba(236, 72, 153, 0.2)',
              borderLeft: '3px solid rgba(249, 115, 22, 0.6)'
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-orange-600/30 to-red-600/30 flex items-center justify-center border border-orange-500/20">
                <TrendingDown size={20} className="text-orange-400" />
              </div>
              <div>
                <p className="text-[10px] text-pink-400/50 uppercase font-bold">Unsold</p>
                <p className="text-xl font-black text-orange-300">{unsoldPlayers.length}</p>
              </div>
            </div>
          </div>

          <div 
            className="rounded-xl p-4"
            style={{
              background: 'linear-gradient(145deg, rgba(20, 10, 25, 0.95), rgba(30, 15, 35, 0.9))',
              border: '1px solid rgba(236, 72, 153, 0.2)',
              borderLeft: '3px solid rgba(236, 72, 153, 0.6)'
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-pink-600/30 to-red-600/30 flex items-center justify-center border border-pink-500/20">
                <Target size={20} className="text-pink-400" />
              </div>
              <div>
                <p className="text-[10px] text-pink-400/50 uppercase font-bold">Available</p>
                <p className="text-xl font-black text-pink-300">{availablePlayers.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs + Controls */}
      <div className="mb-4 flex items-center gap-4">
        {/* Tabs */}
        <div 
          className="rounded-xl p-1 inline-flex"
          style={{
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(236, 72, 153, 0.15)'
          }}
        >
          <button
            onClick={() => setActiveTab('all')}
            className={`px-5 py-2 rounded-lg font-bold text-sm transition-all ${
              activeTab === 'all'
                ? 'text-white'
                : 'text-pink-300/60 hover:bg-pink-500/10'
            }`}
            style={activeTab === 'all' ? {
              background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.3), rgba(180, 50, 120, 0.2))',
              border: '1px solid rgba(236, 72, 153, 0.4)',
              boxShadow: '0 0 12px rgba(236, 72, 153, 0.15)'
            } : {}}
          >
            All ({players.length})
          </button>
          <button
            onClick={() => setActiveTab('sold')}
            className={`px-5 py-2 rounded-lg font-bold text-sm transition-all ${
              activeTab === 'sold'
                ? 'text-white'
                : 'text-pink-300/60 hover:bg-pink-500/10'
            }`}
            style={activeTab === 'sold' ? {
              background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.3), rgba(180, 50, 120, 0.2))',
              border: '1px solid rgba(236, 72, 153, 0.4)',
              boxShadow: '0 0 12px rgba(236, 72, 153, 0.15)'
            } : {}}
          >
            Sold ({soldPlayers.length})
          </button>
          <button
            onClick={() => setActiveTab('unsold')}
            className={`px-5 py-2 rounded-lg font-bold text-sm transition-all ${
              activeTab === 'unsold'
                ? 'text-white'
                : 'text-pink-300/60 hover:bg-pink-500/10'
            }`}
            style={activeTab === 'unsold' ? {
              background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.3), rgba(180, 50, 120, 0.2))',
              border: '1px solid rgba(236, 72, 153, 0.4)',
              boxShadow: '0 0 12px rgba(236, 72, 153, 0.15)'
            } : {}}
          >
            Unsold ({unsoldPlayers.length})
          </button>
          <button
            onClick={() => setActiveTab('available')}
            className={`px-5 py-2 rounded-lg font-bold text-sm transition-all ${
              activeTab === 'available'
                ? 'text-white'
                : 'text-pink-300/60 hover:bg-pink-500/10'
            }`}
            style={activeTab === 'available' ? {
              background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.3), rgba(180, 50, 120, 0.2))',
              border: '1px solid rgba(236, 72, 153, 0.4)',
              boxShadow: '0 0 12px rgba(236, 72, 153, 0.15)'
            } : {}}
          >
            Available ({availablePlayers.length})
          </button>
        </div>

        {/* Right Controls - View-only: only team filter, no export */}
        <div className="flex items-center gap-3 ml-auto">
          {(activeTab === 'sold' || activeTab === 'all') && (
            <div className="relative">
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="pl-4 pr-10 py-2.5 rounded-xl text-sm text-white appearance-none cursor-pointer focus:outline-none"
                style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(236, 72, 153, 0.25)'
                }}
              >
                <option value="">All Teams</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
              <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-pink-400/50 pointer-events-none" />
            </div>
          )}

          {(searchTerm || selectedTeam) && (
            <button
              onClick={() => { setSearchTerm(''); setSelectedTeam(''); }}
              className="p-2.5 rounded-xl text-pink-300 transition-all hover:bg-pink-500/10"
              style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(236, 72, 153, 0.2)' }}
              title="Clear filters"
            >
              <FilterX size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Player Cards Grid */}
      <div className="pb-6">
        {/* All Players Grid */}
        {activeTab === 'all' && (
          filteredAllPlayers.length === 0 ? (
            <div 
              className="rounded-xl p-8 text-center"
              style={{
                background: 'linear-gradient(145deg, rgba(15, 8, 20, 0.8), rgba(25, 12, 30, 0.7))',
                border: '1px dashed rgba(236, 72, 153, 0.2)'
              }}
            >
              <Users size={32} className="text-pink-400/25 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white mb-1">{searchTerm ? 'No players match search' : 'No players'}</h3>
              <p className="text-pink-400/30 text-xs">Players will appear here</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {filteredAllPlayers.map((player) => {
                const basePrice = player.basePrice || 0;
                const playingRole = player.roleId || player.role || '';
                let statusColor = 'rgba(236, 72, 153, 0.15)';
                let statusBg = 'rgba(236, 72, 153, 0.08)';
                let statusBorder = 'rgba(236, 72, 153, 0.2)';
                let statusTextColor = '#f9a8d4';
                let statusText = 'AVAILABLE';

                if (player.status === 'SOLD') {
                  statusColor = 'rgba(34, 197, 94, 0.15)';
                  statusBg = 'rgba(34, 197, 94, 0.08)';
                  statusBorder = 'rgba(34, 197, 94, 0.2)';
                  statusTextColor = '#86efac';
                  statusText = 'SOLD';
                } else if (player.status === 'UNSOLD') {
                  statusColor = 'rgba(107, 114, 128, 0.15)';
                  statusBg = 'rgba(107, 114, 128, 0.08)';
                  statusBorder = 'rgba(107, 114, 128, 0.2)';
                  statusTextColor = '#d1d5db';
                  statusText = 'UNSOLD';
                }

                return (
                  <div 
                    key={player.id}
                    className="group relative rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] cursor-default"
                    style={{
                      background: 'linear-gradient(145deg, rgba(20, 10, 25, 0.95), rgba(30, 15, 35, 0.9))',
                      border: '1px solid ' + statusColor,
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)'
                    }}
                  >
                    <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, ${statusColor}, ${statusBorder})` }} />
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ boxShadow: `inset 0 0 20px ${statusColor}` }} />

                    <div className="p-4">
                      <div className="relative w-16 h-16 mx-auto mb-3">
                        <div 
                          className="w-full h-full rounded-full flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform"
                          style={{
                            background: `linear-gradient(135deg, ${statusBg}, rgba(180, 50, 120, 0.06))`,
                            border: `2px solid ${statusBorder}`,
                            boxShadow: `0 4px 12px ${statusColor}`
                          }}
                        >
                          {player.imageUrl ? (
                            <img src={player.imageUrl} alt={player.name} className="w-full h-full object-cover" />
                          ) : (
                            <User size={26} className="text-pink-400/40" />
                          )}
                        </div>
                      </div>

                      <h4 className="text-base font-bold text-white text-center mb-1.5 truncate leading-snug group-hover:text-pink-200 transition-colors">
                        {player.name}
                      </h4>

                      <div className="flex justify-center mb-3">
                        <span 
                          className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide"
                          style={{ background: statusBg, border: `1px solid ${statusBorder}`, color: statusTextColor }}
                        >
                          {statusText}
                        </span>
                      </div>

                      <div className="flex justify-center mb-3">
                        <span 
                          className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide"
                          style={{ background: 'rgba(236, 72, 153, 0.08)', border: '1px solid rgba(236, 72, 153, 0.2)', color: '#f9a8d4' }}
                        >
                          {playingRole || 'Player'}
                        </span>
                      </div>

                      <div className="h-[1px] w-full mb-3 bg-gradient-to-r from-transparent via-pink-500/15 to-transparent" />

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Target size={12} className="text-pink-400/50" />
                          <span className="text-[10px] font-semibold text-pink-400/50 uppercase">Base</span>
                        </div>
                        <span className="text-base font-black text-pink-200">
                          {basePrice > 0 ? formatIndianCurrencyShort(basePrice) : '—'}
                        </span>
                      </div>

                      {player.status === 'SOLD' && (
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1.5">
                            <Trophy size={12} className="text-green-400/50" />
                            <span className="text-[10px] font-semibold text-green-400/50 uppercase">Sold</span>
                          </div>
                          <span className="text-base font-black text-green-200">
                            {formatIndianCurrencyShort(getSoldAmount(player))}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* Sold Players Grid */}
        {activeTab === 'sold' && (
          filteredSoldPlayers.length === 0 ? (
            <div 
              className="rounded-xl p-8 text-center"
              style={{
                background: 'linear-gradient(145deg, rgba(15, 8, 20, 0.8), rgba(25, 12, 30, 0.7))',
                border: '1px dashed rgba(236, 72, 153, 0.2)'
              }}
            >
              <Users size={32} className="text-pink-400/25 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white mb-1">{searchTerm || selectedTeam ? 'No players match filters' : 'No sold players yet'}</h3>
              <p className="text-pink-400/30 text-xs">Sold players will appear here after the auction</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {filteredSoldPlayers.map((player) => {
                const soldAmount = getSoldAmount(player);
                const basePrice = player.basePrice || 0;
                const teamId = getSoldTeamId(player);
                const teamName = getSoldTeamDisplayName(player);
                const teamLogo = getTeamLogo(teamId);
                const playingRole = player.roleId || player.role || '';

                return (
                  <div 
                    key={player.id}
                    className="group relative rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] cursor-default"
                    style={{
                      background: 'linear-gradient(145deg, rgba(20, 10, 25, 0.95), rgba(30, 15, 35, 0.9))',
                      border: '1px solid rgba(236, 72, 153, 0.2)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)'
                    }}
                  >
                    <div className="h-[3px] w-full" style={{ background: 'linear-gradient(90deg, rgba(236, 72, 153, 0.8), rgba(244, 114, 182, 0.5))' }} />
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ boxShadow: 'inset 0 0 20px rgba(236, 72, 153, 0.12)' }} />

                    <div className="p-4">
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

                      <h4 className="text-base font-bold text-white text-center mb-1.5 truncate leading-snug group-hover:text-pink-200 transition-colors">
                        {player.name}
                      </h4>

                      <div className="flex justify-center mb-3">
                        <span 
                          className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide"
                          style={{ background: 'rgba(236, 72, 153, 0.1)', border: '1px solid rgba(236, 72, 153, 0.25)', color: '#f9a8d4' }}
                        >
                          {playingRole || 'Player'}
                        </span>
                      </div>

                      <div className="h-[1px] w-full mb-3 bg-gradient-to-r from-transparent via-pink-500/20 to-transparent" />

                      {teamId && (
                        <div className="flex items-center gap-2 mb-3 px-1">
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(180, 50, 120, 0.06))', border: '1px solid rgba(236, 72, 153, 0.2)' }}
                          >
                            {teamLogo ? (
                              <img src={teamLogo} alt={teamName} className="w-full h-full object-cover" />
                            ) : (
                              <Trophy size={14} className="text-pink-400/40" />
                            )}
                          </div>
                          <span className="text-xs font-semibold text-pink-200 truncate">{teamName}</span>
                        </div>
                      )}

                      <div className="h-[1px] w-full mb-3 bg-gradient-to-r from-transparent via-pink-500/15 to-transparent" />

                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <IndianRupee size={12} className="text-pink-400/50" />
                            <span className="text-[10px] font-semibold text-pink-400/50 uppercase">Price</span>
                          </div>
                          <span className="text-base font-black text-pink-200">
                            {soldAmount > 0 ? formatIndianCurrencyShort(soldAmount) : '—'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Target size={12} className="text-pink-400/50" />
                            <span className="text-[10px] font-semibold text-pink-400/50 uppercase">Base</span>
                          </div>
                          <span className="text-sm font-bold text-pink-300/70">
                            {basePrice > 0 ? formatIndianCurrencyShort(basePrice) : '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* Unsold Players Grid */}
        {activeTab === 'unsold' && (
          filteredUnsoldPlayers.length === 0 ? (
            <div 
              className="rounded-xl p-8 text-center"
              style={{
                background: 'linear-gradient(145deg, rgba(15, 8, 20, 0.8), rgba(25, 12, 30, 0.7))',
                border: '1px dashed rgba(236, 72, 153, 0.2)'
              }}
            >
              <Users size={32} className="text-pink-400/25 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white mb-1">{searchTerm ? 'No players match search' : 'No unsold players'}</h3>
              <p className="text-pink-400/30 text-xs">Unsold players will appear here</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {filteredUnsoldPlayers.map((player) => {
                const basePrice = player.basePrice || 0;
                const playingRole = player.roleId || player.role || '';

                return (
                  <div 
                    key={player.id}
                    className="group relative rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] cursor-default"
                    style={{
                      background: 'linear-gradient(145deg, rgba(20, 10, 25, 0.95), rgba(30, 15, 35, 0.9))',
                      border: '1px solid rgba(236, 72, 153, 0.15)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)'
                    }}
                  >
                    <div className="h-[3px] w-full" style={{ background: 'linear-gradient(90deg, rgba(236, 72, 153, 0.3), rgba(244, 114, 182, 0.15))' }} />
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ boxShadow: 'inset 0 0 20px rgba(236, 72, 153, 0.1)' }} />

                    <div className="p-4">
                      <div className="relative w-16 h-16 mx-auto mb-3">
                        <div 
                          className="w-full h-full rounded-full flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform"
                          style={{
                            background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(180, 50, 120, 0.06))',
                            border: '2px solid rgba(236, 72, 153, 0.2)',
                            boxShadow: '0 4px 12px rgba(236, 72, 153, 0.08)'
                          }}
                        >
                          {player.imageUrl ? (
                            <img src={player.imageUrl} alt={player.name} className="w-full h-full object-cover" />
                          ) : (
                            <User size={26} className="text-pink-400/40" />
                          )}
                        </div>
                      </div>

                      <h4 className="text-base font-bold text-white text-center mb-1.5 truncate leading-snug group-hover:text-pink-200 transition-colors">
                        {player.name}
                      </h4>

                      <div className="flex justify-center mb-3">
                        <span 
                          className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide"
                          style={{ background: 'rgba(236, 72, 153, 0.08)', border: '1px solid rgba(236, 72, 153, 0.2)', color: '#f9a8d4' }}
                        >
                          {playingRole || 'Player'}
                        </span>
                      </div>

                      <div className="h-[1px] w-full mb-3 bg-gradient-to-r from-transparent via-pink-500/15 to-transparent" />

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Target size={12} className="text-pink-400/50" />
                          <span className="text-[10px] font-semibold text-pink-400/50 uppercase">Base</span>
                        </div>
                        <span className="text-base font-black text-pink-200">
                          {basePrice > 0 ? formatIndianCurrencyShort(basePrice) : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* Available Players Grid */}
        {activeTab === 'available' && (
          filteredAvailablePlayers.length === 0 ? (
            <div 
              className="rounded-xl p-8 text-center"
              style={{
                background: 'linear-gradient(145deg, rgba(15, 8, 20, 0.8), rgba(25, 12, 30, 0.7))',
                border: '1px dashed rgba(236, 72, 153, 0.2)'
              }}
            >
              <Users size={32} className="text-pink-400/25 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white mb-1">{searchTerm ? 'No players match search' : 'No available players'}</h3>
              <p className="text-pink-400/30 text-xs">Players awaiting auction will appear here</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {filteredAvailablePlayers.map((player) => {
                const basePrice = player.basePrice || 0;
                const playingRole = player.roleId || player.role || '';

                return (
                  <div 
                    key={player.id}
                    className="group relative rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] cursor-default"
                    style={{
                      background: 'linear-gradient(145deg, rgba(20, 10, 25, 0.95), rgba(30, 15, 35, 0.9))',
                      border: '1px solid rgba(236, 72, 153, 0.2)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)'
                    }}
                  >
                    <div className="h-[3px] w-full" style={{ background: 'linear-gradient(90deg, rgba(236, 72, 153, 0.6), rgba(244, 114, 182, 0.3))' }} />
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ boxShadow: 'inset 0 0 20px rgba(236, 72, 153, 0.1)' }} />

                    <div className="p-4">
                      <div className="relative w-16 h-16 mx-auto mb-3">
                        <div 
                          className="w-full h-full rounded-full flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform"
                          style={{
                            background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.12), rgba(180, 50, 120, 0.08))',
                            border: '2px solid rgba(236, 72, 153, 0.25)',
                            boxShadow: '0 4px 12px rgba(236, 72, 153, 0.1)'
                          }}
                        >
                          {player.imageUrl ? (
                            <img src={player.imageUrl} alt={player.name} className="w-full h-full object-cover" />
                          ) : (
                            <User size={26} className="text-pink-400/45" />
                          )}
                        </div>
                      </div>

                      <h4 className="text-base font-bold text-white text-center mb-1.5 truncate leading-snug group-hover:text-pink-200 transition-colors">
                        {player.name}
                      </h4>

                      <div className="flex justify-center mb-3">
                        <span 
                          className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide"
                          style={{ background: 'rgba(236, 72, 153, 0.08)', border: '1px solid rgba(236, 72, 153, 0.2)', color: '#f9a8d4' }}
                        >
                          {playingRole || 'Player'}
                        </span>
                      </div>

                      <div className="flex justify-center mb-3">
                        <span 
                          className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide"
                          style={{ background: 'rgba(236, 72, 153, 0.12)', border: '1px solid rgba(236, 72, 153, 0.3)', color: '#f472b6' }}
                        >
                          Available
                        </span>
                      </div>

                      <div className="h-[1px] w-full mb-3 bg-gradient-to-r from-transparent via-pink-500/15 to-transparent" />

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Target size={12} className="text-pink-400/50" />
                          <span className="text-[10px] font-semibold text-pink-400/50 uppercase">Base</span>
                        </div>
                        <span className="text-base font-black text-pink-200">
                          {basePrice > 0 ? formatIndianCurrencyShort(basePrice) : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
};
