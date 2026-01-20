import React from 'react';
import { User, Trophy, Calendar, DollarSign, Edit, CheckCircle, Clock } from 'lucide-react';
import { Player, SportData } from '../../types';

interface PlayerDashboardPageProps {
  currentUser: {
    name: string;
    email: string;
    playerId?: string;
  };
  allSports: SportData[];
  onEditProfile: () => void;
}

export const PlayerDashboardPage: React.FC<PlayerDashboardPageProps> = ({
  currentUser,
  allSports,
  onEditProfile
}) => {
  // Find player profile across all sports
  const findPlayerProfile = () => {
    for (const sport of allSports) {
      for (const match of sport.matches) {
        const player = match.players.find(p => p.id === currentUser.playerId);
        if (player) {
          return { player, sport, match };
        }
      }
    }
    return null;
  };

  const playerData = findPlayerProfile();

  if (!playerData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0d0a09] via-[#1a1410] to-[#0d0a09] text-white p-8 flex items-center justify-center">
        <div className="text-center">
          <User className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <h3 className="text-xl font-semibold mb-2 text-gray-400">Profile Not Found</h3>
          <p className="text-gray-500 mb-6">You haven't registered as a player yet</p>
          <button
            onClick={onEditProfile}
            className="px-6 py-3 bg-[#c5a059] text-[#0d0a09] rounded-lg font-semibold hover:bg-[#d4af6a] transition-all"
          >
            Register Now
          </button>
        </div>
      </div>
    );
  }

  const { player, sport, match } = playerData;
  const statusColor = player.status === 'SOLD' ? 'text-green-500' : player.status === 'UNSOLD' ? 'text-red-500' : 'text-yellow-500';
  const statusLabel = player.status === 'SOLD' ? 'Sold' : player.status === 'UNSOLD' ? 'Unsold' : 'Pending Auction';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0d0a09] via-[#1a1410] to-[#0d0a09] text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-[#c5a059] mb-2">Player Dashboard</h1>
            <p className="text-gray-400">Welcome back, {currentUser.name}</p>
          </div>
          <button
            onClick={onEditProfile}
            className="flex items-center gap-2 px-4 py-2 bg-[#2a2016] text-[#c5a059] border border-[#c5a059] rounded-lg font-semibold hover:bg-[#c5a059] hover:text-[#0d0a09] transition-all"
          >
            <Edit className="w-4 h-4" />
            Edit Profile
          </button>
        </div>

        {/* Player Profile Card */}
        <div className="bg-[#1a1410] border border-[#2a2016] rounded-xl p-8 mb-6">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-[#c5a059] to-[#d4af6a] flex items-center justify-center overflow-hidden">
              {player.imageUrl ? (
                <img src={player.imageUrl} alt={player.name} className="w-full h-full object-cover" />
              ) : (
                <User size={48} className="text-[#0d0a09]" />
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-3xl font-bold text-[#c5a059] mb-2">{player.name}</h2>
                  <p className="text-gray-400">{player.nationality || 'Not specified'}</p>
                </div>
                <div className={`px-4 py-2 rounded-lg font-semibold ${statusColor} bg-[#2a2016]`}>
                  {player.status === 'SOLD' ? <CheckCircle className="w-5 h-5 inline mr-2" /> : <Clock className="w-5 h-5 inline mr-2" />}
                  {statusLabel}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#0d0a09] border border-[#2a2016] rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-1">Base Price</p>
                  <p className="text-lg font-bold text-[#c5a059]">${(player.basePrice / 1000000).toFixed(2)}M</p>
                </div>
                {player.soldPrice && (
                  <div className="bg-[#0d0a09] border border-[#2a2016] rounded-lg p-4">
                    <p className="text-xs text-gray-400 mb-1">Sold Price</p>
                    <p className="text-lg font-bold text-green-500">${(player.soldPrice / 1000000).toFixed(2)}M</p>
                  </div>
                )}
                <div className="bg-[#0d0a09] border border-[#2a2016] rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-1">Age</p>
                  <p className="text-lg font-bold text-white">{player.age || 'N/A'}</p>
                </div>
                <div className="bg-[#0d0a09] border border-[#2a2016] rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-1">Role</p>
                  <p className="text-lg font-bold text-white">{match.config.roles.find(r => r.id === player.roleId)?.name || 'N/A'}</p>
                </div>
              </div>

              {player.bio && (
                <div className="mt-4 p-4 bg-[#0d0a09] border border-[#2a2016] rounded-lg">
                  <p className="text-sm text-gray-300">{player.bio}</p>
                </div>
              )}

              {player.stats && (
                <div className="mt-4 p-4 bg-[#0d0a09] border border-[#2a2016] rounded-lg">
                  <p className="text-xs text-gray-400 mb-2">Stats</p>
                  <p className="text-sm text-gray-300">{player.stats}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Match Info */}
        <div className="bg-[#1a1410] border border-[#2a2016] rounded-xl p-6">
          <h3 className="text-xl font-bold text-[#c5a059] mb-4">Match Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <Trophy className="w-5 h-5 text-[#c5a059]" />
              <div>
                <p className="text-xs text-gray-400">Sport</p>
                <p className="text-sm font-semibold">{sport.customSportName || sport.sportType}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-[#c5a059]" />
              <div>
                <p className="text-xs text-gray-400">Match</p>
                <p className="text-sm font-semibold">{match.name}</p>
              </div>
            </div>
            {player.teamId && (
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-xs text-gray-400">Team</p>
                  <p className="text-sm font-semibold">{match.teams.find(t => t.id === player.teamId)?.name || 'Unknown'}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Auction Status */}
        {player.status === 'PENDING' && (
          <div className="mt-6 bg-[#c5a059]/10 border border-[#c5a059]/30 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 text-[#c5a059]" />
              <div>
                <h4 className="text-lg font-bold text-[#c5a059]">Waiting for Auction</h4>
                <p className="text-sm text-gray-300">Your profile is registered and will be called for bidding soon</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
