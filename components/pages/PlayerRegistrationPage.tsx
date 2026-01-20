import React, { useState } from 'react';
import { User, DollarSign, Upload, ArrowLeft } from 'lucide-react';
import { SportData, Player, SportType } from '../../types';

interface PlayerRegistrationPageProps {
  allSports: SportData[];
  currentUser: {
    name: string;
    email: string;
  };
  onRegister: (sportId: string, matchId: string, playerData: Partial<Player>) => void;
  onBack: () => void;
}

export const PlayerRegistrationPage: React.FC<PlayerRegistrationPageProps> = ({
  allSports,
  currentUser,
  onRegister,
  onBack
}) => {
  const [selectedSport, setSelectedSport] = useState('');
  const [selectedMatch, setSelectedMatch] = useState('');
  const [playerData, setPlayerData] = useState<Partial<Player>>({
    name: currentUser.name,
    age: 25,
    nationality: '',
    roleId: '',
    basePrice: 500000,
    isOverseas: false,
    imageUrl: '',
    bio: '',
    stats: ''
  });

  const selectedSportData = allSports.find(s => 
    `${s.sportType}-${s.customSportName || ''}` === selectedSport
  );
  
  const selectedMatchData = selectedSportData?.matches.find(m => m.id === selectedMatch);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatch || !playerData.roleId) return;
    
    onRegister(selectedSport, selectedMatch, playerData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0d0a09] via-[#1a1410] to-[#0d0a09] text-white p-8">
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={onBack}
          className="flex items-center gap-3 bg-[#1a1410]/80 border border-[#c5a059]/20 backdrop-blur-xl px-6 py-3 rounded-full text-[#c5a059] hover:bg-[#c5a059] hover:text-[#0d0a09] transition-all shadow-lg mb-8"
        >
          <ArrowLeft size={18} />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Back to Dashboard</span>
        </button>

        <div className="bg-[#1a1410] border border-[#2a2016] rounded-xl p-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-[#c5a059] mb-2">Player Registration</h1>
            <p className="text-gray-400">Register yourself for upcoming auctions</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Sport Selection */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-300">
                Select Sport <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedSport}
                onChange={(e) => {
                  setSelectedSport(e.target.value);
                  setSelectedMatch('');
                  setPlayerData(prev => ({ ...prev, roleId: '' }));
                }}
                className="w-full px-4 py-3 bg-[#0d0a09] border border-[#2a2016] rounded-lg text-white focus:border-[#c5a059] outline-none"
                required
              >
                <option value="">Choose a sport...</option>
                {allSports.map(sport => (
                  <option 
                    key={`${sport.sportType}-${sport.customSportName || ''}`}
                    value={`${sport.sportType}-${sport.customSportName || ''}`}
                  >
                    {sport.customSportName || sport.sportType}
                  </option>
                ))}
              </select>
            </div>

            {/* Match Selection */}
            {selectedSport && (
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-300">
                  Select Match <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedMatch}
                  onChange={(e) => setSelectedMatch(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0d0a09] border border-[#2a2016] rounded-lg text-white focus:border-[#c5a059] outline-none"
                  required
                >
                  <option value="">Choose a match...</option>
                  {selectedSportData?.matches.map(match => (
                    <option key={match.id} value={match.id}>
                      {match.name} - {match.place || 'TBD'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Player Details */}
            {selectedMatch && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-300">
                      Player Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={playerData.name}
                      onChange={(e) => setPlayerData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-3 bg-[#0d0a09] border border-[#2a2016] rounded-lg text-white focus:border-[#c5a059] outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-300">
                      Age
                    </label>
                    <input
                      type="number"
                      value={playerData.age}
                      onChange={(e) => setPlayerData(prev => ({ ...prev, age: parseInt(e.target.value) }))}
                      className="w-full px-4 py-3 bg-[#0d0a09] border border-[#2a2016] rounded-lg text-white focus:border-[#c5a059] outline-none"
                      min="15"
                      max="60"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-300">
                      Nationality
                    </label>
                    <input
                      type="text"
                      value={playerData.nationality}
                      onChange={(e) => setPlayerData(prev => ({ ...prev, nationality: e.target.value }))}
                      placeholder="e.g., Indian, Australian"
                      className="w-full px-4 py-3 bg-[#0d0a09] border border-[#2a2016] rounded-lg text-white focus:border-[#c5a059] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-300">
                      Role/Position <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={playerData.roleId}
                      onChange={(e) => setPlayerData(prev => ({ ...prev, roleId: e.target.value }))}
                      className="w-full px-4 py-3 bg-[#0d0a09] border border-[#2a2016] rounded-lg text-white focus:border-[#c5a059] outline-none"
                      required
                    >
                      <option value="">Select your role...</option>
                      {selectedMatchData?.config.roles.map(role => (
                        <option key={role.id} value={role.id}>{role.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-300">
                    Base Price (Your Asking Price) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="number"
                      value={playerData.basePrice}
                      onChange={(e) => setPlayerData(prev => ({ ...prev, basePrice: parseInt(e.target.value) }))}
                      className="w-full pl-12 pr-4 py-3 bg-[#0d0a09] border border-[#2a2016] rounded-lg text-white focus:border-[#c5a059] outline-none"
                      min="50000"
                      step="50000"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Current: ${(playerData.basePrice! / 1000000).toFixed(2)}M (Minimum starting bid)
                  </p>
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={playerData.isOverseas}
                      onChange={(e) => setPlayerData(prev => ({ ...prev, isOverseas: e.target.checked }))}
                      className="w-5 h-5 rounded bg-[#0d0a09] border-[#2a2016] text-[#c5a059] focus:ring-[#c5a059]"
                    />
                    <span className="text-sm font-semibold text-gray-300">Overseas Player</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-300">
                    Profile Image URL
                  </label>
                  <input
                    type="url"
                    value={playerData.imageUrl}
                    onChange={(e) => setPlayerData(prev => ({ ...prev, imageUrl: e.target.value }))}
                    placeholder="https://example.com/your-photo.jpg"
                    className="w-full px-4 py-3 bg-[#0d0a09] border border-[#2a2016] rounded-lg text-white focus:border-[#c5a059] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-300">
                    Bio/About
                  </label>
                  <textarea
                    value={playerData.bio}
                    onChange={(e) => setPlayerData(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Tell teams about yourself..."
                    rows={3}
                    className="w-full px-4 py-3 bg-[#0d0a09] border border-[#2a2016] rounded-lg text-white focus:border-[#c5a059] outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-300">
                    Stats/Achievements
                  </label>
                  <textarea
                    value={playerData.stats}
                    onChange={(e) => setPlayerData(prev => ({ ...prev, stats: e.target.value }))}
                    placeholder="e.g., 500+ runs, 50 wickets, MVP 2023"
                    rows={3}
                    className="w-full px-4 py-3 bg-[#0d0a09] border border-[#2a2016] rounded-lg text-white focus:border-[#c5a059] outline-none resize-none"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={onBack}
                    className="flex-1 px-6 py-3 bg-[#2a2016] text-gray-300 rounded-lg font-semibold hover:bg-[#3a3026] transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-[#c5a059] text-[#0d0a09] rounded-lg font-semibold hover:bg-[#d4af6a] transition-all"
                  >
                    Register for Auction
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
