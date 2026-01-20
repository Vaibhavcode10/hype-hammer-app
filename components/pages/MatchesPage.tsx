import React, { useState } from 'react';
import { Plus, Trophy, Calendar, Users, ArrowLeft, Play, Trash2, Edit } from 'lucide-react';
import { AuctionStatus, SportType, MatchData, SportData } from '../../types';

interface MatchesPageProps {
  sportData: SportData;
  setStatus: (status: AuctionStatus) => void;
  onCreateMatch: (matchName: string, matchDate?: number, place?: string) => void;
  onUpdateMatch: (matchId: string, matchName: string, matchDate?: number, place?: string) => void;
  onSelectMatch: (matchId: string) => void;
  onDeleteMatch: (matchId: string) => void;
  onBackToSetup: () => void;
}

export const MatchesPage: React.FC<MatchesPageProps> = ({
  sportData,
  setStatus,
  onCreateMatch,
  onUpdateMatch,
  onSelectMatch,
  onDeleteMatch,
  onBackToSetup
}) => {
  const [showNewMatchModal, setShowNewMatchModal] = useState(false);
  const [showEditMatchModal, setShowEditMatchModal] = useState(false);
  const [newMatchName, setNewMatchName] = useState('');
  const [newMatchDate, setNewMatchDate] = useState('');
  const [newMatchPlace, setNewMatchPlace] = useState('');
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [editMatchName, setEditMatchName] = useState('');
  const [editMatchDate, setEditMatchDate] = useState('');
  const [editMatchPlace, setEditMatchPlace] = useState('');

  const handleCreateMatch = () => {
    if (newMatchName.trim()) {
      const matchDate = newMatchDate ? new Date(newMatchDate).getTime() : undefined;
      onCreateMatch(newMatchName.trim(), matchDate, newMatchPlace.trim() || undefined);
      setNewMatchName('');
      setNewMatchDate('');
      setNewMatchPlace('');
      setShowNewMatchModal(false);
    }
  };

  const handleEditMatch = (match: MatchData) => {
    setEditingMatchId(match.id);
    setEditMatchName(match.name);
    setEditMatchDate(match.matchDate ? new Date(match.matchDate).toISOString().split('T')[0] : '');
    setEditMatchPlace(match.place || '');
    setShowEditMatchModal(true);
  };

  const handleUpdateMatch = () => {
    if (editMatchName.trim() && editingMatchId) {
      const matchDate = editMatchDate ? new Date(editMatchDate).getTime() : undefined;
      onUpdateMatch(editingMatchId, editMatchName.trim(), matchDate, editMatchPlace.trim() || undefined);
      setEditingMatchId(null);
      setEditMatchName('');
      setEditMatchDate('');
      setEditMatchPlace('');
      setShowEditMatchModal(false);
    }
  };

  const getSportDisplayName = () => {
    if (sportData.sportType === SportType.CUSTOM && sportData.customSportName) {
      return sportData.customSportName;
    }
    return sportData.sportType;
  };

  const getMatchStatusColor = (status: string) => {
    switch (status) {
      case 'SETUP': return 'text-gray-400';
      case 'ONGOING': return 'text-yellow-500';
      case 'COMPLETED': return 'text-green-500';
      default: return 'text-gray-400';
    }
  };

  const getMatchStatusLabel = (status: string) => {
    switch (status) {
      case 'SETUP': return 'Not Started';
      case 'ONGOING': return 'In Progress';
      case 'COMPLETED': return 'Completed';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-orange-50 text-slate-900 p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <button 
            onClick={() => setStatus(AuctionStatus.HOME)}
            className="flex items-center gap-3 bg-white/80 border border-blue-500/20 backdrop-blur-xl px-6 py-3 rounded-full text-blue-600 hover:bg-blue-500 hover:text-white transition-all shadow-lg"
            >
                <ArrowLeft size={18} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Back to Sport Selection</span>
        </button>

        <div className="flex items-center justify-between mt-12 mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 text-blue-600">
              {getSportDisplayName()} Matches
            </h1>
            <p className="text-gray-400">
              Manage multiple matches for {getSportDisplayName().toLowerCase()}
            </p>
          </div>
          <button
            onClick={() => setShowNewMatchModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-orange-500 text-white rounded-lg font-semibold hover:brightness-110 transition-all"
          >
            <Plus className="w-5 h-5" />
            New Match
          </button>
        </div>

        {/* Matches Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sportData.matches.length === 0 ? (
            <div className="col-span-full text-center py-20">
              <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <h3 className="text-xl font-semibold mb-2 text-gray-400">No Matches Yet</h3>
              <p className="text-gray-500 mb-6">Create your first match to get started</p>
              <button
                onClick={() => setShowNewMatchModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-orange-500 text-white rounded-lg font-semibold hover:brightness-110 transition-all"
              >
                Create Match
              </button>
            </div>
          ) : (
            sportData.matches.map((match) => (
              <div
                key={match.id}
                className="bg-white border border-slate-300 rounded-xl p-6 hover:border-blue-500 transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-1 text-blue-600">{match.name}</h3>
                    <p className={`text-sm ${getMatchStatusColor(match.status)}`}>
                      {getMatchStatusLabel(match.status)}
                    </p>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={() => handleEditMatch(match)}
                      className="text-blue-600 hover:text-orange-500 transition-all p-2"
                      title="Edit Match"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => onDeleteMatch(match.id)}
                      className="text-red-500 hover:text-red-400 transition-all p-2"
                      title="Delete Match"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Calendar className="w-4 h-4" />
                    {match.matchDate ? new Date(match.matchDate).toLocaleDateString() : new Date(match.createdAt).toLocaleDateString()}
                  </div>
                  {match.place && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Trophy className="w-4 h-4" />
                      {match.place}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Users className="w-4 h-4" />
                    {match.teams.length} Teams • {match.players.length} Players
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Trophy className="w-4 h-4" />
                    {match.history.length} Players Sold
                  </div>
                </div>

                <button
                  onClick={() => onSelectMatch(match.id)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-200 text-blue-600 border border-blue-500 rounded-lg font-semibold hover:bg-blue-500 hover:text-white transition-all"
                >
                  <Play className="w-4 h-4" />
                  {match.status === 'COMPLETED' ? 'View Match' : 'Continue Match'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* New Match Modal */}
      {showNewMatchModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-blue-500 rounded-xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6 text-blue-600">Create New Match</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2 text-gray-300">
                Match Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newMatchName}
                onChange={(e) => setNewMatchName(e.target.value)}
                placeholder="e.g., Premier League 2024, Season 1"
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-white focus:border-blue-500 outline-none"
                autoFocus
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2 text-gray-300">
                Match Date
              </label>
              <input
                type="date"
                value={newMatchDate}
                onChange={(e) => setNewMatchDate(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-white focus:border-blue-500 outline-none"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2 text-gray-300">
                Place/Venue
              </label>
              <input
                type="text"
                value={newMatchPlace}
                onChange={(e) => setNewMatchPlace(e.target.value)}
                placeholder="e.g., Wankhede Stadium, Mumbai"
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-white focus:border-blue-500 outline-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowNewMatchModal(false);
                  setNewMatchName('');
                  setNewMatchDate('');
                  setNewMatchPlace('');
                }}
                className="flex-1 px-4 py-3 bg-slate-200 text-gray-300 rounded-lg font-semibold hover:bg-slate-300 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateMatch}
                disabled={!newMatchName.trim()}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-orange-500 text-white rounded-lg font-semibold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Match Modal */}
      {showEditMatchModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-blue-500 rounded-xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6 text-blue-600">Edit Match</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2 text-gray-300">
                Match Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={editMatchName}
                onChange={(e) => setEditMatchName(e.target.value)}
                placeholder="e.g., Premier League 2024, Season 1"
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-white focus:border-blue-500 outline-none"
                autoFocus
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2 text-gray-300">
                Match Date
              </label>
              <input
                type="date"
                value={editMatchDate}
                onChange={(e) => setEditMatchDate(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-white focus:border-blue-500 outline-none"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2 text-gray-300">
                Place/Venue
              </label>
              <input
                type="text"
                value={editMatchPlace}
                onChange={(e) => setEditMatchPlace(e.target.value)}
                placeholder="e.g., Wankhede Stadium, Mumbai"
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-white focus:border-blue-500 outline-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowEditMatchModal(false);
                  setEditingMatchId(null);
                  setEditMatchName('');
                  setEditMatchDate('');
                  setEditMatchPlace('');
                }}
                className="flex-1 px-4 py-3 bg-slate-200 text-gray-300 rounded-lg font-semibold hover:bg-slate-300 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateMatch}
                disabled={!editMatchName.trim()}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-orange-500 text-white rounded-lg font-semibold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
