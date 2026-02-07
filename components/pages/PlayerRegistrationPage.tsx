import React, { useState } from 'react';
import { User, DollarSign, Upload, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import { SportData, Player, SportType } from '../../types';
import { uploadPlayerPhotoViaAPI, uploadDocumentViaAPI } from '../../services/cloudFunctionUploadService';

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
  const [uploadProgress, setUploadProgress] = useState<{ photo?: number; document?: number }>({});
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const selectedSportData = allSports.find(s => 
    `${s.sportType}-${s.customSportName || ''}` === selectedSport
  );
  
  const selectedMatchData = selectedSportData?.matches.find(m => m.id === selectedMatch);

  // Handle photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadErrors([]);

    try {
      const photoURL = await uploadPlayerPhotoViaAPI(file, (progress) => {
        setUploadProgress(prev => ({ ...prev, photo: progress }));
      });
      setPlayerData(prev => ({ ...prev, imageUrl: photoURL }));
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Photo upload failed';
      setUploadErrors(prev => [...prev, `Photo: ${msg}`]);
    } finally {
      setUploading(false);
      setUploadProgress(prev => ({ ...prev, photo: undefined }));
    }
  };

  // Handle document upload
  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadErrors([]);

    try {
      const documentURL = await uploadDocumentViaAPI(file, (progress) => {
        setUploadProgress(prev => ({ ...prev, document: progress }));
      });
      // Store document URL in a new field
      setPlayerData(prev => ({ ...prev, documentUrl: documentURL }));
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Document upload failed';
      setUploadErrors(prev => [...prev, `Document: ${msg}`]);
    } finally {
      setUploading(false);
      setUploadProgress(prev => ({ ...prev, document: undefined }));
    }
  };

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
          className="flex items-center gap-3 bg-white/80 border border-blue-500/20 backdrop-blur-xl px-6 py-3 rounded-full text-blue-600 hover:bg-blue-500 hover:text-white transition-all shadow-lg mb-8"
        >
          <ArrowLeft size={18} />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Back to Dashboard</span>
        </button>

        <div className="bg-white border border-slate-300 rounded-xl p-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-blue-600 mb-2">Player Registration</h1>
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
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-white focus:border-blue-500 outline-none"
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
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-white focus:border-blue-500 outline-none"
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
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-white focus:border-blue-500 outline-none"
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
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-white focus:border-blue-500 outline-none"
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
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-white focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-300">
                      Role/Position <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={playerData.roleId}
                      onChange={(e) => setPlayerData(prev => ({ ...prev, roleId: e.target.value }))}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-white focus:border-blue-500 outline-none"
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
                      className="w-full pl-12 pr-4 py-3 bg-white border border-slate-300 rounded-lg text-white focus:border-blue-500 outline-none"
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
                      className="w-5 h-5 rounded bg-white border-slate-300 text-blue-600 focus:ring-blue-500"
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
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-white focus:border-blue-500 outline-none"
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
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-white focus:border-blue-500 outline-none resize-none"
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
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-white focus:border-blue-500 outline-none resize-none"
                  />
                </div>

                {/* Upload Errors */}
                {uploadErrors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    {uploadErrors.map((error, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-red-700 text-sm">
                        <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                        <span>{error}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Photo Upload */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <label className="block text-sm font-semibold mb-3 text-gray-700">
                    <Upload size={16} className="inline mr-2" />
                    Player Photo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={uploading}
                    className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:border-blue-500 outline-none cursor-pointer disabled:opacity-50"
                  />
                  <p className="text-xs text-gray-600 mt-2">Supported: JPG, PNG, GIF, WebP (Max 50MB)</p>
                  
                  {uploadProgress.photo !== undefined && (
                    <div className="mt-3">
                      <progress value={uploadProgress.photo} max={100} className="w-full h-2 rounded" />
                      <p className="text-xs text-gray-600 mt-1">{Math.round(uploadProgress.photo)}% uploaded</p>
                    </div>
                  )}
                  
                  {playerData.imageUrl && (
                    <div className="mt-3 flex items-center gap-2 text-green-700">
                      <CheckCircle size={16} />
                      <span className="text-sm">Photo uploaded successfully</span>
                    </div>
                  )}
                </div>

                {/* Document Upload */}
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                  <label className="block text-sm font-semibold mb-3 text-gray-700">
                    <Upload size={16} className="inline mr-2" />
                    Authorization Document (PDF) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleDocumentUpload}
                    disabled={uploading}
                    className="w-full px-4 py-2 border border-orange-300 rounded-lg focus:border-orange-500 outline-none cursor-pointer disabled:opacity-50"
                  />
                  <p className="text-xs text-gray-600 mt-2">PDF only - Authorization letter or government ID (Max 50MB)</p>
                  
                  {uploadProgress.document !== undefined && (
                    <div className="mt-3">
                      <progress value={uploadProgress.document} max={100} className="w-full h-2 rounded" />
                      <p className="text-xs text-gray-600 mt-1">{Math.round(uploadProgress.document)}% uploaded</p>
                    </div>
                  )}
                  
                  {playerData.documentUrl && (
                    <div className="mt-3 flex items-center gap-2 text-green-700">
                      <CheckCircle size={16} />
                      <span className="text-sm">Document uploaded successfully</span>
                    </div>
                  )}
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
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-orange-500 text-white rounded-lg font-semibold hover:brightness-110 transition-all"
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
