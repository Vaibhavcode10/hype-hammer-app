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
  const [auctioneerPhoto, setAuctioneerPhoto] = useState<File | null>(null);
  const [auctioneerPhotoPreview, setAuctioneerPhotoPreview] = useState<string | null>(null);
  const [isDraggingAuctioneerPhoto, setIsDraggingAuctioneerPhoto] = useState(false);

  // Team Rep fields
  const [teamName, setTeamName] = useState('');
  const [teamShortCode, setTeamShortCode] = useState('');
  const [teamLogo, setTeamLogo] = useState<File | null>(null);
  const [teamLogoPreview, setTeamLogoPreview] = useState<string | null>(null);
  const [homeCity, setHomeCity] = useState('');
  const [roleInTeam, setRoleInTeam] = useState('');
  const [authorizationLetter, setAuthorizationLetter] = useState<File | null>(null);

  // Player fields
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [nationality, setNationality] = useState('');
  const [playerPhoto, setPlayerPhoto] = useState<File | null>(null);
  const [playerPhotoPreview, setPlayerPhotoPreview] = useState<string | null>(null);
  const [playingRole, setPlayingRole] = useState('');
  const [battingStyle, setBattingStyle] = useState('');
  const [bowlingStyle, setBowlingStyle] = useState('');
  const [playerExperience, setPlayerExperience] = useState('');
  const [previousTeams, setPreviousTeams] = useState('');
  const [basePrice, setBasePrice] = useState('500000');
  const [playerCategory, setPlayerCategory] = useState('');
  const [playerAvailability, setPlayerAvailability] = useState('Yes');
  const [playerConsent, setPlayerConsent] = useState(false);

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

  // ─── AUCTIONEER PHOTO HANDLERS ────────────────────────────────────────
  const handleAuctioneerPhotoDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingAuctioneerPhoto(true);
  };

  const handleAuctioneerPhotoDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingAuctioneerPhoto(false);
  };

  const handleAuctioneerPhotoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingAuctioneerPhoto(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      // Check file type - image files only
      if (file.type.startsWith('image/')) {
        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          alert('Image must be less than 10MB');
          return;
        }
        setAuctioneerPhoto(file);
        // Create preview URL
        const reader = new FileReader();
        reader.onload = (loadEvent) => {
          setAuctioneerPhotoPreview(loadEvent.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        alert('Please upload an image file (JPG, JPEG, PNG)');
      }
    }
  };

  const handlePlayerPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('Image must be less than 10MB');
        return;
      }
      setPlayerPhoto(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        setPlayerPhotoPreview(loadEvent.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTeamLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('Image must be less than 10MB');
        return;
      }
      setTeamLogo(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        setTeamLogoPreview(loadEvent.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAuctioneerPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('Image must be less than 10MB');
        return;
      }
      setAuctioneerPhoto(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        setAuctioneerPhotoPreview(loadEvent.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('================== FORM SUBMISSION DEBUG ==================');
    console.log('1️⃣ Form submit initiated for role:', selectedRole);
    console.log('   - governmentId state:', governmentId);
    console.log('   - governmentIdFile state:', governmentIdFile);
    
    // Validate government ID fields for non-guest users
    if (selectedRole !== UserRole.GUEST) {
      console.log('2️⃣ Validating government ID fields...');
      if (!governmentId || governmentId.trim() === '') {
        console.log('❌ Government ID is empty!');
        alert('Please enter your Government ID Number');
        return;
      }
      if (!governmentIdFile) {
        console.log('❌ Government ID file is missing!');
        alert('Please upload your ID Proof document');
        return;
      }
      console.log('✅ Government ID validation passed');
    }
    
    // Ensure government ID fields are not undefined
    const finalGovernmentId = governmentId || '';
    const finalGovernmentIdFile = governmentIdFile || null;
    
    console.log('3️⃣ Building baseData object...');
    const baseData = {
      fullName,
      email,
      phone,
      password,
      role: selectedRole,
      seasonId: selectedMatch?.id,
      governmentId: finalGovernmentId,
      governmentIdFile: finalGovernmentIdFile
    };
    console.log('   - baseData.governmentId:', baseData.governmentId);
    console.log('   - baseData.governmentIdFile:', baseData.governmentIdFile);

    let roleSpecificData = {};

    switch (selectedRole) {
      case UserRole.AUCTIONEER:
        roleSpecificData = {
          experienceLevel,
          languages: languages.split(',').map(l => l.trim()),
          previousAuctions,
          availability,
          auctioneerPhoto
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
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-orange-50 py-4 px-4">
      {/* Header - Single Row Layout */}
      <div className="w-full mb-6">
        {/* Horizontal row with back button on left, centered heading */}
        <div className="flex items-center justify-between px-8">
          {/* Left: Back Button */}
          <button
            onClick={() => setStatus(AuctionStatus.ROLE_SELECTION)}
            className="text-blue-600 hover:text-blue-700 font-semibold transition-colors underline decoration-blue-600 hover:decoration-blue-700 flex items-center gap-2 whitespace-nowrap"
          >
            <ArrowLeft size={18} />
            Back to Role Selection
          </button>

          {/* Center: Title and Match Info */}
          <div className="flex-1 flex flex-col items-center">
            <div className="w-12 h-12 mb-2 rounded-full bg-gradient-to-r from-blue-500 to-orange-500 flex items-center justify-center">
              <Icon size={24} className="text-white" />
            </div>
            <h1 className="text-3xl font-black text-slate-900">{getRoleTitle()} Registration</h1>
            <p className="text-sm text-slate-600 mt-1">
              Register for <strong>{selectedMatch?.name}</strong>
            </p>
          </div>

          {/* Right: Empty spacer for balance */}
          <div className="w-[140px]" />
        </div>
      </div>

      {/* Form */}
      <div className="max-w-7xl mx-auto">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8 border-2 border-slate-200 space-y-4">
          
          {/* Common personal info block removed - each role now has its own integrated layout */}

          {/* AUCTIONEER SECTION - Moved Here */}
          {selectedRole === UserRole.AUCTIONEER && (
            <div>
              {/* Row 1: Photo (Left) + Personal Information (Right) */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                {/* Left: Photo Upload (1 col) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Your Photo</label>
                  <div 
                    className={`border-2 border-dashed rounded-lg p-3 text-center transition-all cursor-pointer min-h-[160px] flex flex-col items-center justify-center ${
                      isDraggingAuctioneerPhoto
                        ? 'border-blue-500 bg-blue-50' 
                        : auctioneerPhoto 
                          ? 'border-green-500 bg-green-50'
                          : 'border-slate-300 hover:border-blue-400'
                    }`}
                    onDragOver={handleAuctioneerPhotoDragOver}
                    onDragLeave={handleAuctioneerPhotoDragLeave}
                    onDrop={handleAuctioneerPhotoDrop}
                  >
                    {auctioneerPhotoPreview ? (
                      <div className="w-full flex flex-col items-center justify-center">
                        <img 
                          src={auctioneerPhotoPreview} 
                          alt="Auctioneer Photo" 
                          className="w-20 h-20 object-cover rounded mb-2"
                        />
                        <p className="text-xs font-bold text-green-700 mb-1">✓ Ready</p>
                        <p className="text-[10px] text-slate-600 truncate max-w-[90px]" title={auctioneerPhoto?.name}>{auctioneerPhoto?.name}</p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setAuctioneerPhoto(null);
                            setAuctioneerPhotoPreview(null);
                          }}
                          className="text-[9px] text-red-600 hover:text-red-800 font-bold mt-1"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <div>
                        <Upload className="mx-auto text-slate-400 mb-2" size={20} />
                        <input
                          type="file"
                          onChange={handleAuctioneerPhotoChange}
                          className="hidden"
                          id="auctioneerPhoto"
                          accept="image/*"
                        />
                        <label htmlFor="auctioneerPhoto" className="cursor-pointer block">
                          <p className="text-xs text-slate-600 font-medium mb-0.5">Upload</p>
                          <p className="text-[9px] text-slate-500">JPG, PNG</p>
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Personal Information (3 cols) */}
                <div className="md:col-span-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Full Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Email <span className="text-red-500">*</span></label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Phone <span className="text-red-500">*</span></label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                        required
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Password <span className="text-red-500">*</span></label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2: Professional Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Experience Level <span className="text-red-500">*</span></label>
                  <select
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value)}
                    className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                    required
                  >
                    <option value="">Select Experience</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Professional">Professional</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Languages Spoken <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={languages}
                    onChange={(e) => setLanguages(e.target.value)}
                    placeholder="English, Hindi, Tamil"
                    className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                    required
                  />
                </div>
              </div>

              {/* Row 3: Previous Auctions */}
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Previous Auctions (Optional)</label>
                <textarea
                  value={previousAuctions}
                  onChange={(e) => setPreviousAuctions(e.target.value)}
                  placeholder="List any previous auction experience..."
                  className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                  rows={2}
                />
              </div>

              {/* Row 4: Availability */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Availability Confirmation <span className="text-red-500">*</span></label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="Yes"
                      checked={availability === 'Yes'}
                      onChange={(e) => setAvailability(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Yes, I'm available</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="No"
                      checked={availability === 'No'}
                      onChange={(e) => setAvailability(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">No</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {selectedRole === UserRole.TEAM_REP && (
            <div>
              {/* Row 1: Team Logo (Left) + Personal Information (Right) */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                {/* Left: Team Logo Upload (1 col) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Team Logo <span className="text-red-500">*</span></label>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-3 text-center hover:border-blue-500 transition-colors cursor-pointer min-h-[160px] flex flex-col items-center justify-center">
                    {teamLogoPreview ? (
                      <div className="w-full flex flex-col items-center justify-center">
                        <img 
                          src={teamLogoPreview} 
                          alt="Team Logo" 
                          className="w-20 h-20 object-cover rounded mb-2"
                        />
                        <p className="text-xs font-bold text-green-700 mb-1">✓ Ready</p>
                        <p className="text-[10px] text-slate-600 truncate max-w-[90px]" title={teamLogo?.name}>{teamLogo?.name}</p>
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); setTeamLogo(null); setTeamLogoPreview(null); }}
                          className="text-[9px] text-red-600 hover:text-red-800 font-bold mt-1"
                        >Change</button>
                      </div>
                    ) : (
                      <div>
                        <Upload className="mx-auto text-slate-400 mb-2" size={20} />
                        <input type="file" onChange={handleTeamLogoChange} className="hidden" id="teamLogo" accept="image/*" required />
                        <label htmlFor="teamLogo" className="cursor-pointer block">
                          <p className="text-xs text-slate-600 font-medium mb-0.5">Upload</p>
                          <p className="text-[9px] text-slate-500">JPG, PNG</p>
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Personal Information (3 cols) */}
                <div className="md:col-span-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Full Name <span className="text-red-500">*</span></label>
                      <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none text-sm" required />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Email <span className="text-red-500">*</span></label>
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none text-sm" required />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Phone <span className="text-red-500">*</span></label>
                      <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none text-sm" required />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Password <span className="text-red-500">*</span></label>
                      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none text-sm" required />
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2: Team Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Team Name <span className="text-red-500">*</span></label>
                  <input type="text" value={teamName} onChange={(e) => setTeamName(e.target.value)} className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none text-sm" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Team Short Code <span className="text-red-500">*</span></label>
                  <input type="text" value={teamShortCode} onChange={(e) => setTeamShortCode(e.target.value.toUpperCase())} maxLength={5} placeholder="e.g., MUM" className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none text-sm" required />
                </div>
              </div>

              {/* Row 3: Location & Role */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Home City / Region <span className="text-red-500">*</span></label>
                  <input type="text" value={homeCity} onChange={(e) => setHomeCity(e.target.value)} className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none text-sm" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Role in Team <span className="text-red-500">*</span></label>
                  <select value={roleInTeam} onChange={(e) => setRoleInTeam(e.target.value)} className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none text-sm" required>
                    <option value="">Select Role</option>
                    <option value="Owner">Owner</option>
                    <option value="Manager">Manager</option>
                    <option value="Captain">Captain</option>
                  </select>
                </div>
              </div>

              {/* Row 4: Authorization Letter */}
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Authorization Letter <span className="text-red-500">*</span></label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-3 text-center hover:border-blue-500 transition-colors cursor-pointer">
                  <Upload className="mx-auto text-slate-400 mb-2" size={20} />
                  <input type="file" onChange={(e) => setAuthorizationLetter(e.target.files?.[0] || null)} className="hidden" id="authLetter" accept=".pdf" required />
                  <label htmlFor="authLetter" className="cursor-pointer">
                    <span className="text-xs text-slate-600">{authorizationLetter ? authorizationLetter.name : 'Upload PDF'}</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {selectedRole === UserRole.PLAYER && (
            <div>
              {/* Row 1: Player Photo (Left) + Personal Information (Right) */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                {/* Left: Player Photo Upload (1 col) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Your Photo <span className="text-red-500">*</span></label>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-3 text-center hover:border-blue-500 transition-colors cursor-pointer min-h-[160px] flex flex-col items-center justify-center">
                    {playerPhotoPreview ? (
                      <div className="w-full flex flex-col items-center justify-center">
                        <img 
                          src={playerPhotoPreview} 
                          alt="Player Photo" 
                          className="w-20 h-20 object-cover rounded mb-2"
                        />
                        <p className="text-xs font-bold text-green-700 mb-1">✓ Ready</p>
                        <p className="text-[10px] text-slate-600 truncate max-w-[90px]" title={playerPhoto?.name}>{playerPhoto?.name}</p>
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); setPlayerPhoto(null); setPlayerPhotoPreview(null); }}
                          className="text-[9px] text-red-600 hover:text-red-800 font-bold mt-1"
                        >Change</button>
                      </div>
                    ) : (
                      <div>
                        <Upload className="mx-auto text-slate-400 mb-2" size={20} />
                        <input type="file" onChange={handlePlayerPhotoChange} className="hidden" id="playerPhoto" accept="image/*" required />
                        <label htmlFor="playerPhoto" className="cursor-pointer block">
                          <p className="text-xs text-slate-600 font-medium mb-0.5">Upload</p>
                          <p className="text-[9px] text-slate-500">JPG, PNG</p>
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Personal Information (3 cols) */}
                <div className="md:col-span-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Full Name <span className="text-red-500">*</span></label>
                      <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none text-sm" required />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Email <span className="text-red-500">*</span></label>
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none text-sm" required />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Phone <span className="text-red-500">*</span></label>
                      <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none text-sm" required />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Password <span className="text-red-500">*</span></label>
                      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none text-sm" required />
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2: Basic Player Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Date of Birth <span className="text-red-500">*</span></label>
                  <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none text-sm" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Gender <span className="text-red-500">*</span></label>
                  <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none text-sm" required>
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Nationality <span className="text-red-500">*</span></label>
                  <input type="text" value={nationality} onChange={(e) => setNationality(e.target.value)} className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none text-sm" required />
                </div>
              </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
                      Playing Role <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={playingRole}
                      onChange={(e) => setPlayingRole(e.target.value)}
                      placeholder="e.g., Batsman, Bowler, All-rounder"
                      className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
                      Experience Level <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={playerExperience}
                      onChange={(e) => setPlayerExperience(e.target.value)}
                      className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
                        Batting Style
                      </label>
                      <input
                        type="text"
                        value={battingStyle}
                        onChange={(e) => setBattingStyle(e.target.value)}
                        placeholder="e.g., Right-hand, Left-hand"
                        className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
                        Bowling Style
                      </label>
                      <input
                        type="text"
                        value={bowlingStyle}
                        onChange={(e) => setBowlingStyle(e.target.value)}
                        placeholder="e.g., Fast, Spin"
                        className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                      />
                    </div>
                  </div>
                )}
                <div className="mb-3">
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
                    Previous Teams (Optional)
                  </label>
                  <textarea
                    value={previousTeams}
                    onChange={(e) => setPreviousTeams(e.target.value)}
                    placeholder="List your previous teams..."
                    className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
                      Base Price (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={basePrice}
                      onChange={(e) => setBasePrice(e.target.value)}
                      className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
                      Player Category
                    </label>
                    <input
                      type="text"
                      value={playerCategory}
                      onChange={(e) => setPlayerCategory(e.target.value)}
                      placeholder="e.g., Elite, Premier"
                      className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
                      Availability <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={playerAvailability}
                      onChange={(e) => setPlayerAvailability(e.target.value)}
                      className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                      required
                    >
                      <option value="Yes">Available</option>
                      <option value="No">Not Available</option>
                    </select>
                  </div>
                </div>
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-3 mb-3">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={playerConsent}
                      onChange={(e) => setPlayerConsent(e.target.checked)}
                      className="mt-1"
                      required
                    />
                    <span className="text-xs text-slate-700">
                      <strong>Player Consent:</strong> I consent to participate in this auction and agree to the terms and conditions.
                    </span>
                  </label>
                </div>
              </div>
          )}

          {/* Verification */}
          <div>
              <h2 className="text-2xl font-black text-slate-900 mb-4">Verification</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
                    Government ID Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={governmentId}
                    onChange={(e) => setGovernmentId(e.target.value)}
                    placeholder="Aadhaar / PAN / Driving License"
                    className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
                    Upload ID Proof <span className="text-red-500">*</span>
                  </label>
                  <div 
                    className={`border-2 border-dashed rounded-lg p-3 text-center transition-all cursor-pointer ${
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
                    <Upload className={`mx-auto mb-2 ${governmentIdFile ? 'text-green-500' : 'text-slate-400'}`} size={20} />
                    <input
                      type="file"
                      onChange={(e) => setGovernmentIdFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="govId"
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                    <label htmlFor="govId" className="cursor-pointer block">
                      {governmentIdFile ? (
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-green-700">✓ File uploaded</p>
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
                          <p className="text-xs text-slate-600 font-medium mb-1">
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

          {/* Submit Button */}
          <div className="pt-4 border-t-2 border-slate-200">
            <button
              type="submit"
              className="w-full py-3 gold-gradient text-white rounded-lg font-bold uppercase tracking-wider hover:brightness-110 transition-all shadow-lg text-sm"
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
