import React, { useState } from 'react';
import { Gavel, Users, User, Upload, ArrowLeft, CheckCircle, X } from 'lucide-react';
import { AuctionStatus, UserRole, SportType, MatchData, SportData } from '../../types';

interface RoleBasedRegistrationPageProps {
  setStatus: (status: AuctionStatus) => void;
  selectedRole: UserRole;
  selectedMatch: MatchData | null;
  selectedSport: SportData | null;
  onRegister: (registrationData: any) => Promise<boolean | void>;
}

export const RoleBasedRegistrationPage: React.FC<RoleBasedRegistrationPageProps> = ({
  setStatus,
  selectedRole,
  selectedMatch,
  selectedSport,
  onRegister
}) => {
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // Common fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // Auctioneer fields
  const [experienceLevel, setExperienceLevel] = useState('');
  const [languages, setLanguages] = useState('');
  const [previousAuctions, setPreviousAuctions] = useState('');
  const [availability, setAvailability] = useState('Yes');

  // Team Rep fields
  const [teamName, setTeamName] = useState('');
  const [teamShortCode, setTeamShortCode] = useState('');
  const [teamLogo, setTeamLogo] = useState<File | null>(null);
  const [homeCity, setHomeCity] = useState('');
  const [roleInTeam, setRoleInTeam] = useState('');
  const [authorizationLetter, setAuthorizationLetter] = useState<File | null>(null);

  // Player fields
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [nationality, setNationality] = useState('');
  const [playerPhoto, setPlayerPhoto] = useState<File | null>(null);
  const [playingRole, setPlayingRole] = useState('');
  const [battingStyle, setBattingStyle] = useState('');
  const [bowlingStyle, setBowlingStyle] = useState('');
  const [playerExperience, setPlayerExperience] = useState('');
  const [previousTeams, setPreviousTeams] = useState('');
  const [basePrice, setBasePrice] = useState('500000');
  const [playerCategory, setPlayerCategory] = useState('');
  const [playerAvailability, setPlayerAvailability] = useState('Yes');
  const [playerConsent, setPlayerConsent] = useState(false);

  // Guest fields
  const [favoriteSport, setFavoriteSport] = useState('');
  const [favoriteTeam, setFavoriteTeam] = useState('');

  // Common verification
  const [governmentId, setGovernmentId] = useState('');
  const [governmentIdFile, setGovernmentIdFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      // Check file type
      const validTypes = ['.pdf', '.jpg', '.jpeg', '.png'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (validTypes.includes(fileExtension)) {
        setGovernmentIdFile(file);
      } else {
        alert('Please upload a PDF or image file (JPG, JPEG, PNG)');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const baseData = {
      fullName,
      email,
      phone,
      password,
      role: selectedRole,
      seasonId: selectedMatch?.id,
      governmentId,
      governmentIdFile
    };

    let roleSpecificData = {};

    switch (selectedRole) {
      case UserRole.AUCTIONEER:
        roleSpecificData = {
          experienceLevel,
          languages: languages.split(',').map(l => l.trim()),
          previousAuctions,
          availability
        };
        break;
      
      case UserRole.TEAM_REP:
        roleSpecificData = {
          teamName,
          teamShortCode,
          teamLogo,
          homeCity,
          roleInTeam,
          authorizationLetter
        };
        break;
      
      case UserRole.PLAYER:
        roleSpecificData = {
          dateOfBirth,
          gender,
          nationality,
          playerPhoto,
          sport: selectedSport?.sportType,
          playingRole,
          battingStyle,
          bowlingStyle,
          experienceLevel: playerExperience,
          previousTeams,
          basePrice: parseInt(basePrice),
          playerCategory,
          availability: playerAvailability,
          consent: playerConsent
        };
        break;
      
      case UserRole.GUEST:
        roleSpecificData = {
          favoriteSport,
          favoriteTeam
        };
        break;
    }

    const success = await onRegister({ ...baseData, ...roleSpecificData });
    if (success !== false) {
      setShowSuccessModal(true);
    }
  };

  const getRoleTitle = () => {
    switch (selectedRole) {
      case UserRole.AUCTIONEER: return 'Auctioneer';
      case UserRole.TEAM_REP: return 'Team Representative';
      case UserRole.PLAYER: return 'Player';
      case UserRole.GUEST: return 'Guest';
      default: return 'User';
    }
  };

  const getRoleIcon = () => {
    switch (selectedRole) {
      case UserRole.AUCTIONEER: return Gavel;
      case UserRole.TEAM_REP: return Users;
      case UserRole.PLAYER: return User;
      default: return User;
    }
  };

  const Icon = getRoleIcon();

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-orange-50 py-8 px-4">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <button
          onClick={() => setStatus(AuctionStatus.ROLE_SELECTION)}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Role Selection
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-500 to-orange-500 flex items-center justify-center">
            <Icon size={32} className="text-white" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 mb-2">{getRoleTitle()} Registration</h1>
          <p className="text-slate-600">
            Register for <strong>{selectedMatch?.name}</strong>
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8 border-2 border-slate-200 space-y-8">
          
          {/* Common Fields */}
          <div>
            <h2 className="text-2xl font-black text-slate-900 mb-6">Personal Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
            </div>
          </div>

          {/* Role-Specific Fields */}
          {selectedRole === UserRole.AUCTIONEER && (
            <div>
              <h2 className="text-2xl font-black text-slate-900 mb-6">Professional Information</h2>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Experience Level <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={experienceLevel}
                      onChange={(e) => setExperienceLevel(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                      required
                    >
                      <option value="">Select Experience</option>
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Professional">Professional</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Languages Spoken <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={languages}
                      onChange={(e) => setLanguages(e.target.value)}
                      placeholder="English, Hindi, Tamil"
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Previous Auctions (Optional)
                  </label>
                  <textarea
                    value={previousAuctions}
                    onChange={(e) => setPreviousAuctions(e.target.value)}
                    placeholder="List any previous auction experience..."
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Availability Confirmation <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value="Yes"
                        checked={availability === 'Yes'}
                        onChange={(e) => setAvailability(e.target.value)}
                        className="w-4 h-4"
                      />
                      <span>Yes, I'm available</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value="No"
                        checked={availability === 'No'}
                        onChange={(e) => setAvailability(e.target.value)}
                        className="w-4 h-4"
                      />
                      <span>No</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedRole === UserRole.TEAM_REP && (
            <div>
              <h2 className="text-2xl font-black text-slate-900 mb-6">Team Details</h2>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Team Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Team Short Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={teamShortCode}
                      onChange={(e) => setTeamShortCode(e.target.value.toUpperCase())}
                      maxLength={5}
                      placeholder="e.g., MUM"
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Home City / Region <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={homeCity}
                      onChange={(e) => setHomeCity(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Role in Team <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={roleInTeam}
                      onChange={(e) => setRoleInTeam(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                      required
                    >
                      <option value="">Select Role</option>
                      <option value="Owner">Owner</option>
                      <option value="Manager">Manager</option>
                      <option value="Captain">Captain</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Team Logo <span className="text-red-500">*</span>
                    </label>
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:border-blue-500 transition-colors cursor-pointer">
                      <Upload className="mx-auto text-slate-400 mb-2" size={24} />
                      <input
                        type="file"
                        onChange={(e) => setTeamLogo(e.target.files?.[0] || null)}
                        className="hidden"
                        id="teamLogo"
                        accept="image/*"
                        required
                      />
                      <label htmlFor="teamLogo" className="cursor-pointer">
                        <span className="text-sm text-slate-600">
                          {teamLogo ? teamLogo.name : 'Upload Team Logo'}
                        </span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Authorization Letter <span className="text-red-500">*</span>
                    </label>
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:border-blue-500 transition-colors cursor-pointer">
                      <Upload className="mx-auto text-slate-400 mb-2" size={24} />
                      <input
                        type="file"
                        onChange={(e) => setAuthorizationLetter(e.target.files?.[0] || null)}
                        className="hidden"
                        id="authLetter"
                        accept=".pdf"
                        required
                      />
                      <label htmlFor="authLetter" className="cursor-pointer">
                        <span className="text-sm text-slate-600">
                          {authorizationLetter ? authorizationLetter.name : 'Upload PDF'}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedRole === UserRole.PLAYER && (
            <div>
              <h2 className="text-2xl font-black text-slate-900 mb-6">Player Profile</h2>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Date of Birth <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Gender <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                      required
                    >
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Nationality <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={nationality}
                      onChange={(e) => setNationality(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Player Photo <span className="text-red-500">*</span>
                  </label>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer">
                    <Upload className="mx-auto text-slate-400 mb-2" size={32} />
                    <input
                      type="file"
                      onChange={(e) => setPlayerPhoto(e.target.files?.[0] || null)}
                      className="hidden"
                      id="playerPhoto"
                      accept="image/*"
                      required
                    />
                    <label htmlFor="playerPhoto" className="cursor-pointer">
                      <span className="text-sm text-slate-600">
                        {playerPhoto ? playerPhoto.name : 'Upload Your Photo'}
                      </span>
                    </label>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Playing Role <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={playingRole}
                      onChange={(e) => setPlayingRole(e.target.value)}
                      placeholder="e.g., Batsman, Bowler, All-rounder"
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Experience Level <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={playerExperience}
                      onChange={(e) => setPlayerExperience(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                      required
                    >
                      <option value="">Select</option>
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Professional">Professional</option>
                    </select>
                  </div>
                </div>
                {(selectedSport?.sportType === SportType.CRICKET || selectedSport?.sportType === 'Cricket') && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Batting Style
                      </label>
                      <input
                        type="text"
                        value={battingStyle}
                        onChange={(e) => setBattingStyle(e.target.value)}
                        placeholder="e.g., Right-hand, Left-hand"
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Bowling Style
                      </label>
                      <input
                        type="text"
                        value={bowlingStyle}
                        onChange={(e) => setBowlingStyle(e.target.value)}
                        placeholder="e.g., Fast, Spin"
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Previous Teams (Optional)
                  </label>
                  <textarea
                    value={previousTeams}
                    onChange={(e) => setPreviousTeams(e.target.value)}
                    placeholder="List your previous teams..."
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Base Price (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={basePrice}
                      onChange={(e) => setBasePrice(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Player Category
                    </label>
                    <input
                      type="text"
                      value={playerCategory}
                      onChange={(e) => setPlayerCategory(e.target.value)}
                      placeholder="e.g., Elite, Premier"
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Availability <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={playerAvailability}
                      onChange={(e) => setPlayerAvailability(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                      required
                    >
                      <option value="Yes">Available</option>
                      <option value="No">Not Available</option>
                    </select>
                  </div>
                </div>
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={playerConsent}
                      onChange={(e) => setPlayerConsent(e.target.checked)}
                      className="mt-1"
                      required
                    />
                    <span className="text-sm text-slate-700">
                      <strong>Player Consent:</strong> I consent to participate in this auction and agree to the terms and conditions.
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {selectedRole === UserRole.GUEST && (
            <div>
              <h2 className="text-2xl font-black text-slate-900 mb-6">Preferences (Optional)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Favorite Sport
                  </label>
                  <select
                    value={favoriteSport}
                    onChange={(e) => setFavoriteSport(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Select Sport</option>
                    {Object.values(SportType).map((sport) => (
                      <option key={sport} value={sport}>{sport}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Favorite Team
                  </label>
                  <input
                    type="text"
                    value={favoriteTeam}
                    onChange={(e) => setFavoriteTeam(e.target.value)}
                    placeholder="Your favorite team"
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mt-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> As a guest, you can watch all auctions live but cannot place bids or participate in the auction process.
                </p>
              </div>
            </div>
          )}

          {/* Verification (for non-guest roles) */}
          {selectedRole !== UserRole.GUEST && (
            <div>
              <h2 className="text-2xl font-black text-slate-900 mb-6">Verification</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Government ID Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={governmentId}
                    onChange={(e) => setGovernmentId(e.target.value)}
                    placeholder="Aadhaar / PAN / Driving License"
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Upload ID Proof <span className="text-red-500">*</span>
                  </label>
                  <div 
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer ${
                      isDragging 
                        ? 'border-blue-500 bg-blue-50' 
                        : governmentIdFile 
                          ? 'border-green-500 bg-green-50'
                          : 'border-slate-300 hover:border-blue-400'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <Upload className={`mx-auto mb-2 ${governmentIdFile ? 'text-green-500' : 'text-slate-400'}`} size={32} />
                    <input
                      type="file"
                      onChange={(e) => setGovernmentIdFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="govId"
                      accept=".pdf,.jpg,.jpeg,.png"
                      required
                    />
                    <label htmlFor="govId" className="cursor-pointer block">
                      {governmentIdFile ? (
                        <div className="space-y-2">
                          <p className="text-sm font-bold text-green-700">✓ File uploaded</p>
                          <p className="text-xs text-slate-600 truncate">{governmentIdFile.name}</p>
                          <p className="text-xs text-slate-500">({(governmentIdFile.size / 1024 / 1024).toFixed(2)} MB)</p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setGovernmentIdFile(null);
                            }}
                            className="text-xs text-red-600 hover:text-red-800 font-bold mt-2"
                          >
                            Remove file
                          </button>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm text-slate-600 font-medium mb-1">
                            Click to upload or drag and drop
                          </p>
                          <p className="text-xs text-slate-500">
                            PDF, JPG, JPEG or PNG (Max 10MB)
                          </p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-6 border-t-2 border-slate-200">
            <button
              type="submit"
              className="w-full py-4 gold-gradient text-white rounded-lg font-bold uppercase tracking-wider hover:brightness-110 transition-all shadow-lg text-lg"
            >
              Submit Registration
            </button>
          </div>
        </form>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in duration-300">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-green-400 to-green-600 flex items-center justify-center animate-bounce">
                <CheckCircle size={48} className="text-white" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-3">
                Registration Successful! 🎉
              </h2>
              <p className="text-slate-600 mb-6 leading-relaxed">
                You have successfully registered as <strong>{getRoleTitle()}</strong> for <strong>{selectedMatch?.matchName}</strong>. Redirecting to your dashboard...
              </p>
              <button
                onClick={() => {
                  // Redirect to appropriate dashboard based on role
                  switch (selectedRole) {
                    case UserRole.AUCTIONEER:
                      setStatus(AuctionStatus.AUCTIONEER_DASHBOARD);
                      break;
                    case UserRole.TEAM_REP:
                      setStatus(AuctionStatus.TEAM_REP_DASHBOARD);
                      break;
                    case UserRole.PLAYER:
                      setStatus(AuctionStatus.PLAYER_DASHBOARD);
                      break;
                    case UserRole.GUEST:
                      setStatus(AuctionStatus.GUEST_DASHBOARD);
                      break;
                    default:
                      setStatus(AuctionStatus.MARKETPLACE);
                  }
                }}
                className="w-full px-8 py-4 gold-gradient text-white rounded-lg font-bold uppercase tracking-wider hover:brightness-110 transition-all shadow-lg"
              >
                Go to My Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
