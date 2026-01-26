import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, TrendingDown, User, Download, ArrowLeft, Search, Filter, X as FilterX } from 'lucide-react';
import { MatchData } from '../../types';

interface Player {
  id: string;
  name: string;
  email?: string;
  roleId?: string;
  basePrice: number;
  status: 'SOLD' | 'UNSOLD' | 'AVAILABLE';
  soldTo?: string;
  soldAmount?: number;
  soldAt?: string;
  imageUrl?: string;
  matchId?: string;
}

interface Team {
  id: string;
  name: string;
  logo?: string;
}

interface PlayersPageProps {
  onClose: () => void;
  currentMatch: MatchData | null;
}

export const PlayersPage: React.FC<PlayersPageProps> = ({ onClose, currentMatch }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'sold' | 'unsold'>('sold');
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
      const [playersRes, teamsRes] = await Promise.all([
        fetch(`http://localhost:5000/api/players?matchId=${currentMatch.id}`),
        fetch(`http://localhost:5000/api/teams?matchId=${currentMatch.id}`)
      ]);

      if (playersRes.ok) {
        const playersData = await playersRes.json();
        setPlayers(playersData.data || []);
      }

      if (teamsRes.ok) {
        const teamsData = await teamsRes.json();
        setTeams(teamsData.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const soldPlayers = players.filter(p => p.status === 'SOLD');
  const unsoldPlayers = players.filter(p => p.status === 'UNSOLD');

  // Apply search and team filters
  const filteredSoldPlayers = soldPlayers.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         p.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTeam = !selectedTeam || p.soldTo === selectedTeam;
    return matchesSearch && matchesTeam;
  });

  const filteredUnsoldPlayers = unsoldPlayers.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         p.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

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

  const formatCurrency = (amount: number) => {
    return `₹${(amount / 100000).toFixed(1)}L`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const exportToCSV = () => {
    const dataToExport = activeTab === 'sold' ? filteredSoldPlayers : filteredUnsoldPlayers;
    
    if (dataToExport.length === 0) {
      alert('No data to export');
      return;
    }

    let csvContent = '';
    
    if (activeTab === 'sold') {
      csvContent = 'Player Name,Email,Role,Base Price,Sold Price,Profit/Loss,Sold To Team,Sold At\n';
      dataToExport.forEach(player => {
        const difference = (player.soldAmount || 0) - player.basePrice;
        const basePrice = (player.basePrice / 100000).toFixed(1);
        const soldPrice = ((player.soldAmount || 0) / 100000).toFixed(1);
        const profitLoss = (Math.abs(difference) / 100000).toFixed(1);
        const teamName = getTeamName(player.soldTo);
        
        csvContent += `"${player.name}","${player.email || ''}","${player.roleId || ''}","₹${basePrice}L","₹${soldPrice}L","₹${profitLoss}L","${teamName}","${formatDate(player.soldAt)}"`;
        csvContent += '\n';
      });
    } else {
      csvContent = 'Player Name,Email,Role,Base Price,Status\n';
      dataToExport.forEach(player => {
        const basePrice = (player.basePrice / 100000).toFixed(1);
        csvContent += `"${player.name}","${player.email || ''}","${player.roleId || ''}","₹${basePrice}L","UNSOLD"`;
        csvContent += '\n';
      });
    }

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent));
    element.setAttribute('download', `${currentMatch?.name || 'players'}_${activeTab}_players.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 z-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
          <p className="text-lg font-bold text-slate-800">Loading Players...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 z-50 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-white border-b-2 border-purple-200 shadow-lg">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users size={32} className="text-purple-600" />
            <div>
              <h1 className="text-2xl font-black text-slate-800">Players Directory</h1>
              <p className="text-sm text-gray-600">{currentMatch?.name || 'Current Season'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold text-sm transition-all shadow-lg"
          >
            <ArrowLeft size={18} />
            Go Back to Dashboard
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border-2 border-purple-200 p-4 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                <Users size={24} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-600 uppercase font-bold">Total Players</p>
                <p className="text-2xl font-black text-slate-800">{players.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border-2 border-green-200 p-4 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
                <TrendingUp size={24} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-600 uppercase font-bold">Sold Players</p>
                <p className="text-2xl font-black text-slate-800">{soldPlayers.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border-2 border-orange-200 p-4 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center">
                <TrendingDown size={24} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-600 uppercase font-bold">Unsold Players</p>
                <p className="text-2xl font-black text-slate-800">{unsoldPlayers.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs and Controls */}
      <div className="px-6 mb-4 flex items-center gap-4">
        {/* Left: Tabs */}
        <div className="bg-white rounded-xl border-2 border-purple-200 p-2 inline-flex shadow-md">
          <button
            onClick={() => setActiveTab('sold')}
            className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${
              activeTab === 'sold'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                : 'text-slate-600 hover:bg-gray-100'
            }`}
          >
            Sold Players ({soldPlayers.length})
          </button>
          <button
            onClick={() => setActiveTab('unsold')}
            className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${
              activeTab === 'unsold'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                : 'text-slate-600 hover:bg-gray-100'
            }`}
          >
            Unsold Players ({unsoldPlayers.length})
          </button>
        </div>

        {/* Right: Search, Filter, and Export */}
        <div className="flex items-center gap-3 ml-auto">
          {/* Search Bar */}
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-lg border-2 border-blue-200 focus:border-blue-400 focus:outline-none text-sm w-56"
            />
          </div>

          {/* Team Filter - Only show on Sold Players tab */}
          {activeTab === 'sold' && (
            <div className="relative">
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="pl-4 pr-10 py-2 rounded-lg border-2 border-purple-200 focus:border-purple-400 focus:outline-none text-sm appearance-none bg-white cursor-pointer"
              >
                <option value="">All Teams</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
              <Filter size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          )}

          {/* Clear Filters Button */}
          {(searchTerm || selectedTeam) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedTeam('');
              }}
              className="p-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 transition-all"
              title="Clear filters"
            >
              <FilterX size={18} />
            </button>
          )}

          {/* Export Button */}
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold text-sm transition-all shadow-lg whitespace-nowrap"
          >
            <Download size={18} />
            Export to CSV
          </button>
        </div>
      </div>

      {/* Table Container - Full Width */}
      <div className="flex-1 px-6 pb-6 overflow-hidden">
        <div className="bg-white rounded-2xl border-2 border-purple-200 shadow-xl overflow-hidden h-full">
          <div className="overflow-x-auto overflow-y-auto h-full">
            {activeTab === 'sold' ? (
              <table className="w-full">
                <thead className="bg-gradient-to-r from-purple-100 to-pink-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-black text-slate-800 uppercase tracking-wider">Player</th>
                    <th className="px-4 py-3 text-left text-xs font-black text-slate-800 uppercase tracking-wider">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-black text-slate-800 uppercase tracking-wider">Base Price</th>
                    <th className="px-4 py-3 text-left text-xs font-black text-slate-800 uppercase tracking-wider">Sold Price</th>
                    <th className="px-4 py-3 text-left text-xs font-black text-slate-800 uppercase tracking-wider">Profit/Loss</th>
                    <th className="px-4 py-3 text-left text-xs font-black text-slate-800 uppercase tracking-wider">Sold To Team</th>
                    <th className="px-4 py-3 text-left text-xs font-black text-slate-800 uppercase tracking-wider">Sold At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredSoldPlayers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        {searchTerm || selectedTeam ? 'No players match the filters' : 'No sold players yet'}
                      </td>
                    </tr>
                  ) : (
                    filteredSoldPlayers.map((player, index) => {
                      const difference = (player.soldAmount || 0) - player.basePrice;
                      const isProfit = difference > 0;
                      
                      return (
                        <tr key={player.id} className={`hover:bg-purple-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                                {player.imageUrl ? (
                                  <img src={player.imageUrl} alt={player.name} className="w-full h-full object-cover" />
                                ) : (
                                  <User size={20} className="text-slate-400" />
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-sm text-slate-800">{player.name}</p>
                                <p className="text-xs text-gray-500">{player.email || 'N/A'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-block px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
                              {player.roleId || 'N/A'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-slate-700">{formatCurrency(player.basePrice)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-purple-600">{formatCurrency(player.soldAmount || 0)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                              isProfit ? 'bg-green-100 text-green-700' : difference === 0 ? 'bg-gray-100 text-gray-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {isProfit ? <TrendingUp size={12} /> : difference < 0 ? <TrendingDown size={12} /> : null}
                              {formatCurrency(Math.abs(difference))}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {getTeamLogo(player.soldTo) && (
                                <img src={getTeamLogo(player.soldTo)!} alt="Team" className="w-6 h-6 rounded object-contain" />
                              )}
                              <span className="font-semibold text-sm text-slate-800">{getTeamName(player.soldTo)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-gray-600">{formatDate(player.soldAt)}</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full">
                <thead className="bg-gradient-to-r from-orange-100 to-red-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-black text-slate-800 uppercase tracking-wider">Player</th>
                    <th className="px-4 py-3 text-left text-xs font-black text-slate-800 uppercase tracking-wider">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-black text-slate-800 uppercase tracking-wider">Base Price</th>
                    <th className="px-4 py-3 text-left text-xs font-black text-slate-800 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredUnsoldPlayers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                        {searchTerm ? 'No players match the search' : 'No unsold players'}
                      </td>
                    </tr>
                  ) : (
                    filteredUnsoldPlayers.map((player, index) => (
                      <tr key={player.id} className={`hover:bg-orange-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                              {player.imageUrl ? (
                                <img src={player.imageUrl} alt={player.name} className="w-full h-full object-cover" />
                              ) : (
                                <User size={20} className="text-slate-400" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-sm text-slate-800">{player.name}</p>
                              <p className="text-xs text-gray-500">{player.email || 'N/A'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-block px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
                            {player.roleId || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-slate-700">{formatCurrency(player.basePrice)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-block px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">
                            UNSOLD
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
