import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Gavel, Users, User, Upload, ArrowLeft, CheckCircle, X, Info, AlertTriangle, Loader2 } from 'lucide-react';
import { AuctionStatus, UserRole, SportType, MatchData, SportData } from '../../types';
import { useMatchSettings } from '../../hooks/useMatchSettings';
import { formatIndianCurrency } from '../../services/currencyUtils';
import { PhoneOtpVerification } from '../ui/PhoneOtpVerification';
import { NeonDesignStyles, GlassCard, NeonButton, GradientHeading, NeonPageWrapper, NeonInput } from '../ui/NeonDesignSystem';
import { getMatchById } from '../../services/apiService';

interface RoleBasedRegistrationPageProps {
  setStatus: (status: AuctionStatus) => void;
  selectedRole: UserRole;
  selectedMatch: MatchData | null;
  selectedSport: SportData | null;
  onRegister: (registrationData: any) => Promise<boolean | void>;
  matchId?: string; // For deep link support - matchId from URL
  hideBackButton?: boolean; // Hide back button when used in dashboard context
}

export const RoleBasedRegistrationPage: React.FC<RoleBasedRegistrationPageProps> = ({
  setStatus,
  selectedRole,
  selectedMatch,
  selectedSport,
  onRegister,
  matchId: urlMatchId,
  hideBackButton = false
}) => {
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deep link support - fetch match data if not provided
  const [fetchedMatch, setFetchedMatch] = useState<MatchData | null>(null);
  // Start loading if we have a URL matchId but no selectedMatch (deep link scenario)
  const [matchLoading, setMatchLoading] = useState<boolean>(!selectedMatch && !!urlMatchId);
  const [matchError, setMatchError] = useState<string | null>(null);

  // Effective match: use selectedMatch if available, otherwise use fetched match
  const effectiveMatch = selectedMatch || fetchedMatch;
  const effectiveMatchId = effectiveMatch?.id || urlMatchId || null;

  // Fetch match data when accessed via deep link (no selectedMatch but have urlMatchId)
  useEffect(() => {
    const fetchMatchForDeepLink = async () => {
      // Only fetch if we don't have a match but we have a matchId from URL
      if (!selectedMatch && urlMatchId && !fetchedMatch) {
        console.log('🔗 Deep link detected - fetching match:', urlMatchId);
        setMatchLoading(true);
        setMatchError(null);
        
        try {
          const response = await getMatchById(urlMatchId);
          console.log('📦 Match fetch response:', response);
          
          // apiCall returns data directly (not wrapped in {success, data})
          // So response IS the match data if successful, or null if failed
          if (response && response.id) {
            setFetchedMatch(response as MatchData);
            console.log('✅ Match fetched successfully:', response.name);
          } else if (response && (response as any).success && (response as any).data) {
            // Handle case where response is wrapped (backward compatibility)
            setFetchedMatch((response as any).data);
            console.log('✅ Match fetched successfully (wrapped):', (response as any).data.name);
          } else {
            setMatchError('Invalid or expired registration link');
            console.error('❌ Match not found or invalid response:', urlMatchId, response);
          }
        } catch (error: any) {
          console.error('❌ Error fetching match:', error);
          setMatchError('Invalid or expired registration link');
        } finally {
          setMatchLoading(false);
        }
      }
    };

    fetchMatchForDeepLink();
  }, [selectedMatch, urlMatchId, fetchedMatch]);

  // Auto-close success modal after 3 seconds
  useEffect(() => {
    if (showSuccessModal) {
      const timer = setTimeout(() => {
        setShowSuccessModal(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessModal]);
  
  // Common fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const passwordsMatch = !confirmPassword || password === confirmPassword;
  const passwordOk = !!(password && confirmPassword && password === confirmPassword);


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

  // ─── PURSE INTELLIGENCE HOOK ───────────────────────────────────────────
  // Use effective matchId (from selectedMatch or URL)
  const matchIdForSettings = effectiveMatchId;
  
  const {
    matchSettings,
    loading: settingsLoading,
    formattedPurse,
    formattedAvgValue,
    formattedMaxBasePrice,
    formattedRecommendedMin,
    shortMaxBasePrice,
    shortAvgValue,
    validatePlayerBasePrice,
    isLocked
  } = useMatchSettings(matchIdForSettings);

  // DEBUG: Log matchSettings state
  console.log('🔍 [PURSE INTELLIGENCE DEBUG]');
  console.log('   matchId:', matchIdForSettings);
  console.log('   effectiveMatch:', effectiveMatch?.name);
  console.log('   matchSettings:', matchSettings);
  console.log('   settingsLoading:', settingsLoading);

  // Base price validation - runs on every basePrice change
  const basePriceValidation = useMemo(() => {
    const price = Number(basePrice) || 0;
    const result = validatePlayerBasePrice(price);
    console.log('   basePriceValidation:', { price, result });
    return result;
  }, [basePrice, validatePlayerBasePrice]);

  // Computed validation message for display
  const validationMessage = basePriceValidation.errorMessage || basePriceValidation.warningMessage || null;

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
    setIsSubmitting(true);
    
    console.log('================== FORM SUBMISSION DEBUG ==================');
    console.log('1️⃣ Form submit initiated for role:', selectedRole);
    console.log('   - governmentId state:', governmentId);
    console.log('   - governmentIdFile state:', governmentIdFile);

    // HARD BLOCK: Phone must be verified
    if (!phoneVerified) {
      alert('Please verify your phone number before submitting.');
      return;
    }

    // Password validation - required for all roles that need backend auth
    if (selectedRole === UserRole.AUCTIONEER && !password) {
      alert('Please enter a password.');
      return;
    }
    
    if (selectedRole === UserRole.AUCTIONEER && password !== confirmPassword) {
      alert('Passwords do not match.');
      return;
    }

    // HARD BLOCK: Validate base price for players
    if (selectedRole === UserRole.PLAYER && basePriceValidation.hasError) {
      console.log('❌ Base price validation FAILED:', basePriceValidation.errorMessage);
      alert(`Invalid Base Price: ${basePriceValidation.errorMessage}`);
      return;
    }
    
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
      phoneVerified: true,
      password,  // Include password in payload
      role: selectedRole,
      seasonId: effectiveMatchId, // Use effectiveMatchId for deep link support
      governmentId: finalGovernmentId,
      governmentIdFile: finalGovernmentIdFile
    };
    console.log('   - baseData.governmentId:', baseData.governmentId);
    console.log('   - baseData.governmentIdFile:', baseData.governmentIdFile);
    console.log('   - baseData.seasonId:', baseData.seasonId);

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
        // Get budget from match settings (set by admin)
        const budgetFromMatch = matchSettings?.pursePerTeam || 0;
        if (!budgetFromMatch || budgetFromMatch <= 0) {
          alert('Match budget is not configured. Please contact the admin.');
          return;
        }
        roleSpecificData = {
          teamName,
          teamShortCode,
          teamLogo,
          homeCity,
          roleInTeam,
          budget: budgetFromMatch  // Automatically from match settings
        };
        break;
      
      case UserRole.PLAYER:
        roleSpecificData = {
          dateOfBirth,
          gender,
          nationality,
          playerPhoto,
          sport: selectedSport?.sportType || effectiveMatch?.sportType || effectiveMatch?.sport,
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
    setIsSubmitting(false);
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

  // Helper function to get dynamic header text
  const getHeaderText = () => {
    const matchName = effectiveMatch?.name || 'this auction';
    switch (selectedRole) {
      case UserRole.AUCTIONEER: return `Register as an Auctioneer for ${matchName}`;
      case UserRole.TEAM_REP: return `Register as a Team for ${matchName}`;
      case UserRole.PLAYER: return `Register as a Player for ${matchName}`;
      default: return `Register for ${matchName}`;
    }
  };

  // Show error state for invalid deep link
  if (matchError) {
    return (
      <NeonPageWrapper className="min-h-screen flex items-center justify-center py-4 px-4">
        <NeonDesignStyles />
        <GlassCard glow className="p-8 max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertTriangle size={32} className="text-red-400" />
          </div>
          <h2 className="text-2xl font-black text-pink-100 mb-2">Invalid Registration Link</h2>
          <p className="text-pink-300/70 mb-6">
            This registration link is invalid or has expired. Please request a new link from the match organizer.
          </p>
          <NeonButton
            onClick={() => setStatus(AuctionStatus.MARKETPLACE)}
            className="w-full uppercase tracking-wider font-black text-sm py-2.5"
          >
            <ArrowLeft size={18} className="mr-2" />
            Go to Marketplace
          </NeonButton>
        </GlassCard>
      </NeonPageWrapper>
    );
  }

  // Show loading state while fetching match data for deep link
  if (matchLoading) {
    return (
      <NeonPageWrapper className="min-h-screen flex items-center justify-center py-4 px-4">
        <NeonDesignStyles />
        <GlassCard glow className="p-8 max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-pink-500/20 flex items-center justify-center">
            <Loader2 size={32} className="text-pink-400 animate-spin" />
          </div>
          <h2 className="text-2xl font-black text-pink-100 mb-2">Loading Registration</h2>
          <p className="text-pink-300/70">
            Fetching match details...
          </p>
        </GlassCard>
      </NeonPageWrapper>
    );
  }

  return (
    <NeonPageWrapper className="min-h-screen py-4 px-4">
      <NeonDesignStyles />
      
      {/* Header - Single Row Layout */}
      <div className="w-full mb-6">
        {/* Horizontal row with back button on left, centered heading */}
        <div className="flex items-center justify-between px-8">
          {/* Left: Back Button - adaptive based on how user arrived (hidden in dashboard mode) */}
          {!hideBackButton && (
            <button
              onClick={() => {
                // If came via deep link (no selectedMatch), go to marketplace
                // Otherwise go to role selection as normal
                if (!selectedMatch && urlMatchId) {
                  setStatus(AuctionStatus.MARKETPLACE);
                } else {
                  setStatus(AuctionStatus.ROLE_SELECTION);
                }
              }}
              className="text-pink-400 hover:text-pink-300 font-semibold transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <ArrowLeft size={18} />
              {!selectedMatch && urlMatchId ? 'Go to Marketplace' : 'Back to Role Selection'}
            </button>
          )}
          
          {/* Left spacer when back button is hidden */}
          {hideBackButton && <div className="w-[140px]" />}

          {/* Center: Title and Match Info */}
          <div className="flex-1 flex flex-col items-center">
            <div className="w-12 h-12 mb-2 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #ff0066, #ff4d94)', boxShadow: '0 0 20px rgba(255, 0, 102, 0.4)' }}>
              <Icon size={24} className="text-white" />
            </div>
            <GradientHeading size="xl">{getRoleTitle().toUpperCase()} REGISTRATION</GradientHeading>
            <p className="text-sm text-pink-300/70 mt-1">
              {getHeaderText()}
            </p>
          </div>

          {/* Right: Empty spacer for balance */}
          <div className="w-[140px]" />
        </div>
      </div>

      {/* Form */}
      <div className="max-w-7xl mx-auto">
        <GlassCard glow className="p-8 space-y-4">
          {/* Loading/Error Alert when match is not available */}
          {!effectiveMatch && !matchLoading && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6 flex items-start gap-3">
              <AlertTriangle size={20} className="text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-200 font-semibold">Loading match data...</p>
                <p className="text-yellow-200/70 text-sm mt-1">
                  The match information is being loaded. Please wait or refresh the page if this persists.
                </p>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
          {/* Common personal info block removed - each role now has its own integrated layout */}

          {/* AUCTIONEER SECTION - Moved Here */}
          {selectedRole === UserRole.AUCTIONEER && (
            <div>
              {/* Row 1: Photo (Left) + Personal Information (Right) */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                {/* Left: Photo Upload (1 col) */}
                <div>
                  <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-2">Your Photo</label>
                  <div 
                    className={`border-2 border-dashed rounded-lg p-3 text-center transition-all cursor-pointer min-h-[160px] flex flex-col items-center justify-center ${
                      isDraggingAuctioneerPhoto
                        ? 'border-pink-500' 
                        : auctioneerPhoto 
                          ? 'border-green-500'
                          : 'border-pink-500/30 hover:border-pink-400'
                    }`}
                    style={{ background: 'rgba(255, 0, 102, 0.08)' }}
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
                        <p className="text-xs font-bold text-green-400 mb-1">✓ Ready</p>
                        <p className="text-[10px] text-pink-300/70 truncate max-w-[90px]" title={auctioneerPhoto?.name}>{auctioneerPhoto?.name}</p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setAuctioneerPhoto(null);
                            setAuctioneerPhotoPreview(null);
                          }}
                          className="text-[9px] text-red-400 hover:text-red-300 font-bold mt-1"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <div>
                        <Upload className="mx-auto text-pink-400/50 mb-2" size={20} />
                        <input
                          type="file"
                          onChange={handleAuctioneerPhotoChange}
                          className="hidden"
                          id="auctioneerPhoto"
                          accept="image/*"
                        />
                        <label htmlFor="auctioneerPhoto" className="cursor-pointer block">
                          <p className="text-xs text-pink-300/70 font-medium mb-0.5">Upload</p>
                          <p className="text-[9px] text-pink-300/50">JPG, PNG</p>
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Personal Information (3 cols) */}
                <div className="md:col-span-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-2">Full Name <span className="text-red-400">*</span></label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg text-pink-100 placeholder-pink-300/40 text-sm focus:outline-none"
                        style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-2">Email <span className="text-red-400">*</span></label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg text-pink-100 placeholder-pink-300/40 text-sm focus:outline-none"
                        style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
                        required
                      />
                    </div>
                    <div className="md:col-span-3">
                      <PhoneOtpVerification
                        phone={phone}
                        setPhone={setPhone}
                        phoneVerified={phoneVerified}
                        setPhoneVerified={setPhoneVerified}
                        compact
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Password Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-2">Password <span className="text-red-400">*</span></label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2.5 rounded-lg text-pink-100 placeholder-pink-300/40 text-sm focus:outline-none" style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }} placeholder="••••••••" required />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-2">Re-enter Password <span className="text-red-400">*</span></label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={`w-full px-3 py-2.5 rounded-lg text-pink-100 placeholder-pink-300/40 text-sm focus:outline-none transition-colors`} style={{ background: 'rgba(255, 0, 102, 0.08)', border: !confirmPassword ? '1px solid rgba(255, 0, 102, 0.3)' : passwordsMatch ? '1px solid #22c55e' : '1px solid #f87171' }} placeholder="••••••••" required />
                  {confirmPassword && (
                    <p className={`mt-1 text-xs font-medium ${passwordsMatch ? 'text-green-400' : 'text-red-400'}`}>
                      {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                    </p>
                  )}
                </div>
              </div>

              {/* Row 2: Professional Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-2">Experience Level <span className="text-red-400">*</span></label>
                  <select
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg text-pink-100 text-sm focus:outline-none"
                    style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
                    required
                  >
                    <option value="" className="bg-[#1a0a0a] text-pink-300">Select Experience</option>
                    <option value="Beginner" className="bg-[#1a0a0a] text-pink-300">Beginner</option>
                    <option value="Intermediate" className="bg-[#1a0a0a] text-pink-300">Intermediate</option>
                    <option value="Professional" className="bg-[#1a0a0a] text-pink-300">Professional</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-2">Languages Spoken <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={languages}
                    onChange={(e) => setLanguages(e.target.value)}
                    placeholder="English, Hindi, Tamil"
                    className="w-full px-3 py-2.5 rounded-lg text-pink-100 placeholder-pink-300/40 text-sm focus:outline-none"
                    style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
                    required
                  />
                </div>
              </div>

              {/* Row 3: Previous Auctions */}
              <div className="mb-4">
                <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-2">Previous Auctions (Optional)</label>
                <textarea
                  value={previousAuctions}
                  onChange={(e) => setPreviousAuctions(e.target.value)}
                  placeholder="List any previous auction experience..."
                  className="w-full px-3 py-2.5 rounded-lg text-pink-100 placeholder-pink-300/40 text-sm focus:outline-none"
                  style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
                  rows={2}
                />
              </div>

              {/* Row 4: Availability */}
              <div>
                <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-2">Availability Confirmation <span className="text-red-400">*</span></label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="Yes"
                      checked={availability === 'Yes'}
                      onChange={(e) => setAvailability(e.target.value)}
                      className="w-4 h-4 accent-pink-500"
                    />
                    <span className="text-sm text-pink-200">Yes, I'm available</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="No"
                      checked={availability === 'No'}
                      onChange={(e) => setAvailability(e.target.value)}
                      className="w-4 h-4 accent-pink-500"
                    />
                    <span className="text-sm text-pink-200">No</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {selectedRole === UserRole.TEAM_REP && (
            <div>
              {/* Purse Intelligence Info for Team Reps */}
              {settingsLoading && (
                <div className="rounded-lg p-4 mb-4 animate-pulse" style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 bg-pink-500/30 rounded"></div>
                    <span className="text-sm font-bold text-pink-300/50">Loading purse information...</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="rounded-lg p-3" style={{ background: 'rgba(255, 0, 102, 0.12)', border: '1px solid rgba(255, 0, 102, 0.2)' }}>
                        <div className="h-3 bg-pink-500/20 rounded w-20 mb-2"></div>
                        <div className="h-6 bg-pink-500/20 rounded w-16"></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!settingsLoading && !matchSettings && (
                <div className="rounded-lg p-4 mb-4" style={{ background: 'rgba(251, 146, 60, 0.1)', border: '1px solid rgba(251, 146, 60, 0.3)' }}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-400" />
                    <span className="text-sm font-medium text-orange-300">Purse settings not available for this match</span>
                  </div>
                  <p className="text-xs text-orange-400/70 mt-1">Match ID: {matchId || 'Not selected'}</p>
                </div>
              )}
              {!settingsLoading && matchSettings && (
                <div className="rounded-lg p-4 mb-4" style={{ background: 'linear-gradient(135deg, rgba(255, 0, 102, 0.12), rgba(147, 51, 234, 0.12))', border: '1px solid rgba(255, 0, 102, 0.3)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Info className="w-5 h-5 text-pink-400" />
                    <span className="text-sm font-bold text-pink-300">Purse Information</span>
                    {isLocked && (
                      <span className="ml-auto text-xs bg-orange-500/20 text-orange-300 px-2 py-1 rounded-full font-medium border border-orange-500/30">
                        Settings Locked
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="rounded-lg p-3" style={{ background: 'rgba(255, 0, 102, 0.1)', border: '1px solid rgba(255, 0, 102, 0.2)' }}>
                      <p className="text-xs text-pink-400/70 uppercase font-medium">Total Purse</p>
                      <p className="text-lg font-bold text-pink-300">{formattedPurse}</p>
                    </div>
                    <div className="rounded-lg p-3" style={{ background: 'rgba(255, 0, 102, 0.1)', border: '1px solid rgba(255, 0, 102, 0.2)' }}>
                      <p className="text-xs text-pink-400/70 uppercase font-medium">Players to Buy</p>
                      <p className="text-lg font-bold text-pink-200">{matchSettings.maxPlayersPerTeam}</p>
                    </div>
                    <div className="rounded-lg p-3" style={{ background: 'rgba(255, 0, 102, 0.1)', border: '1px solid rgba(255, 0, 102, 0.2)' }}>
                      <p className="text-xs text-pink-400/70 uppercase font-medium">Avg Value/Player</p>
                      <p className="text-lg font-bold text-green-400">{formattedAvgValue}</p>
                    </div>
                    <div className="rounded-lg p-3" style={{ background: 'rgba(255, 0, 102, 0.1)', border: '1px solid rgba(255, 0, 102, 0.2)' }}>
                      <p className="text-xs text-pink-400/70 uppercase font-medium">Max Base Price</p>
                      <p className="text-lg font-bold text-purple-400">{formattedMaxBasePrice}</p>
                    </div>
                  </div>
                  {matchSettings && !matchSettings.avgPlayerValue ? (
                    <p className="text-xs text-orange-300/80 mt-2 bg-orange-500/10 border border-orange-500/30 rounded px-2 py-1">
                      ℹ️ Purse information is being calculated. Please refresh the page if values don't update shortly.
                    </p>
                  ) : null
                  }
                </div>
              )}

              {/* Row 1: Team Logo (Left) + Personal Information (Right) */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                {/* Left: Team Logo Upload (1 col) */}
                <div>
                  <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-2">Team Logo <span className="text-red-400">*</span></label>
                  <div className="border-2 border-dashed border-pink-500/30 rounded-lg p-3 text-center hover:border-pink-400 transition-colors cursor-pointer min-h-[160px] flex flex-col items-center justify-center" style={{ background: 'rgba(255, 0, 102, 0.08)' }}>
                    {teamLogoPreview ? (
                      <div className="w-full flex flex-col items-center justify-center">
                        <img 
                          src={teamLogoPreview} 
                          alt="Team Logo" 
                          className="w-20 h-20 object-cover rounded mb-2"
                        />
                        <p className="text-xs font-bold text-green-400 mb-1">✓ Ready</p>
                        <p className="text-[10px] text-pink-300/70 truncate max-w-[90px]" title={teamLogo?.name}>{teamLogo?.name}</p>
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); setTeamLogo(null); setTeamLogoPreview(null); }}
                          className="text-[9px] text-red-400 hover:text-red-300 font-bold mt-1"
                        >Change</button>
                      </div>
                    ) : (
                      <div>
                        <Upload className="mx-auto text-pink-400/50 mb-2" size={20} />
                        <input type="file" onChange={handleTeamLogoChange} className="hidden" id="teamLogo" accept="image/*" required />
                        <label htmlFor="teamLogo" className="cursor-pointer block">
                          <p className="text-xs text-pink-300/70 font-medium mb-0.5">Upload</p>
                          <p className="text-[9px] text-pink-300/50">JPG, PNG</p>
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Personal Information (3 cols) */}
                <div className="md:col-span-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-2">Full Name <span className="text-red-400">*</span></label>
                      <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-3 py-2.5 rounded-lg text-pink-100 placeholder-pink-300/40 text-sm focus:outline-none" style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }} required />
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-2">Email <span className="text-red-400">*</span></label>
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2.5 rounded-lg text-pink-100 placeholder-pink-300/40 text-sm focus:outline-none" style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }} required />
                    </div>
                    <div className="md:col-span-3">
                      <PhoneOtpVerification
                        phone={phone}
                        setPhone={setPhone}
                        phoneVerified={phoneVerified}
                        setPhoneVerified={setPhoneVerified}
                        compact
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Password Row - COMMENTED OUT FOR TEAMS */}
              {/* 
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-2">Password <span className="text-red-400">*</span></label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2.5 rounded-lg text-pink-100 placeholder-pink-300/40 text-sm focus:outline-none" style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }} placeholder="••••••••" required />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-2">Re-enter Password <span className="text-red-400">*</span></label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-3 py-2.5 rounded-lg text-pink-100 placeholder-pink-300/40 text-sm focus:outline-none transition-colors" style={{ background: 'rgba(255, 0, 102, 0.08)', border: !confirmPassword ? '1px solid rgba(255, 0, 102, 0.3)' : passwordsMatch ? '1px solid #22c55e' : '1px solid #f87171' }} placeholder="••••••••" required />
                  {confirmPassword && (
                    <p className={`mt-1 text-xs font-medium ${passwordsMatch ? 'text-green-400' : 'text-red-400'}`}>
                      {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                    </p>
                  )}
                </div>
              </div>
              */}

              {/* Row 2: Team Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-2">Team Name <span className="text-red-400">*</span></label>
                  <input type="text" value={teamName} onChange={(e) => setTeamName(e.target.value)} className="w-full px-3 py-2.5 rounded-lg text-pink-100 placeholder-pink-300/40 text-sm focus:outline-none" style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }} required />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-2">Team Short Code <span className="text-red-400">*</span></label>
                  <input type="text" value={teamShortCode} onChange={(e) => setTeamShortCode(e.target.value.toUpperCase())} maxLength={5} placeholder="e.g., MUM" className="w-full px-3 py-2.5 rounded-lg text-pink-100 placeholder-pink-300/40 text-sm focus:outline-none" style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }} required />
                </div>
              </div>

              {/* Row 3: Location & Role */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-2">Home City / Region <span className="text-red-400">*</span></label>
                  <input type="text" value={homeCity} onChange={(e) => setHomeCity(e.target.value)} className="w-full px-3 py-2.5 rounded-lg text-pink-100 placeholder-pink-300/40 text-sm focus:outline-none" style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }} required />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-2">Role in Team <span className="text-red-400">*</span></label>
                  <select value={roleInTeam} onChange={(e) => setRoleInTeam(e.target.value)} className="w-full px-3 py-2.5 rounded-lg text-pink-100 text-sm focus:outline-none" style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }} required>
                    <option value="" className="bg-[#1a0a0a] text-pink-300">Select Role</option>
                    <option value="Owner" className="bg-[#1a0a0a] text-pink-300">Owner</option>
                    <option value="Manager" className="bg-[#1a0a0a] text-pink-300">Manager</option>
                    <option value="Captain" className="bg-[#1a0a0a] text-pink-300">Captain</option>
                  </select>
                </div>
              </div>

            </div>
          )}

          {selectedRole === UserRole.PLAYER && (
            <div>
              {/* Purse Intelligence Info for Players */}
              {settingsLoading && (
                <div className="rounded-lg p-4 mb-4 animate-pulse" style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 bg-pink-500/30 rounded"></div>
                    <span className="text-sm font-bold text-pink-300/50">Loading base price guidelines...</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="rounded-lg p-3" style={{ background: 'rgba(255, 0, 102, 0.12)', border: '1px solid rgba(255, 0, 102, 0.2)' }}>
                        <div className="h-3 bg-pink-500/20 rounded w-20 mb-2"></div>
                        <div className="h-6 bg-pink-500/20 rounded w-16"></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!settingsLoading && !matchSettings && (
                <div className="rounded-lg p-4 mb-4" style={{ background: 'rgba(251, 146, 60, 0.1)', border: '1px solid rgba(251, 146, 60, 0.3)' }}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-400" />
                    <span className="text-sm font-medium text-orange-300">Base price guidelines not available</span>
                  </div>
                  <p className="text-xs text-orange-400/70 mt-1">Match ID: {matchId || 'Not selected'}</p>
                </div>
              )}
              {!settingsLoading && matchSettings && (
                <div className="rounded-lg p-4 mb-4" style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.12), rgba(16, 185, 129, 0.12))', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Info className="w-5 h-5 text-green-400" />
                    <span className="text-sm font-bold text-green-300">Base Price Guidelines</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="rounded-lg p-3" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                      <p className="text-xs text-green-400/70 uppercase font-medium">Recommended Min</p>
                      <p className="text-lg font-bold text-green-300">{formattedRecommendedMin}</p>
                    </div>
                    <div className="rounded-lg p-3" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                      <p className="text-xs text-green-400/70 uppercase font-medium">Avg Value</p>
                      <p className="text-lg font-bold text-pink-300">{formattedAvgValue}</p>
                    </div>
                    <div className="rounded-lg p-3" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                      <p className="text-xs text-green-400/70 uppercase font-medium">Max Allowed</p>
                      <p className="text-lg font-bold text-purple-400">{formattedMaxBasePrice}</p>
                    </div>
                  </div>
                  {matchSettings && !matchSettings.avgPlayerValue ? (
                    <p className="text-xs text-orange-300/80 mt-2 bg-orange-500/10 border border-orange-500/30 rounded px-2 py-1">
                      ℹ️ Base price guidelines are being calculated. Please refresh the page if values don't update shortly. (Purse: {matchSettings.pursePerTeam}, Players: {matchSettings.maxPlayersPerTeam})
                    </p>
                  ) : (
                    <p className="text-xs text-green-300/70 mt-2">
                      Set your base price between the recommended minimum and maximum allowed values.
                    </p>
                  )}
                </div>
              )}

              {/* Row 1: Player Photo (Left) + Personal Information (Right) */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                {/* Left: Player Photo Upload (1 col) */}
                <div>
                  <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-2">Your Photo <span className="text-red-400">*</span></label>
                  <div className="border-2 border-dashed border-pink-500/30 rounded-lg p-3 text-center hover:border-pink-400 transition-colors cursor-pointer min-h-[160px] flex flex-col items-center justify-center" style={{ background: 'rgba(255, 0, 102, 0.08)' }}>
                    {playerPhotoPreview ? (
                      <div className="w-full flex flex-col items-center justify-center">
                        <img 
                          src={playerPhotoPreview} 
                          alt="Player Photo" 
                          className="w-20 h-20 object-cover rounded mb-2"
                        />
                        <p className="text-xs font-bold text-green-400 mb-1">✓ Ready</p>
                        <p className="text-[10px] text-pink-300/70 truncate max-w-[90px]" title={playerPhoto?.name}>{playerPhoto?.name}</p>
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); setPlayerPhoto(null); setPlayerPhotoPreview(null); }}
                          className="text-[9px] text-red-400 hover:text-red-300 font-bold mt-1"
                        >Change</button>
                      </div>
                    ) : (
                      <div>
                        <Upload className="mx-auto text-pink-400/50 mb-2" size={20} />
                        <input type="file" onChange={handlePlayerPhotoChange} className="hidden" id="playerPhoto" accept="image/*" required />
                        <label htmlFor="playerPhoto" className="cursor-pointer block">
                          <p className="text-xs text-pink-300/70 font-medium mb-0.5">Upload</p>
                          <p className="text-[9px] text-pink-300/50">JPG, PNG</p>
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Personal Information (3 cols) */}
                <div className="md:col-span-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-2">Full Name <span className="text-red-400">*</span></label>
                      <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-3 py-2.5 rounded-lg text-pink-100 placeholder-pink-300/40 text-sm focus:outline-none" style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }} required />
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-2">Email <span className="text-red-400">*</span></label>
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2.5 rounded-lg text-pink-100 placeholder-pink-300/40 text-sm focus:outline-none" style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }} required />
                    </div>
                    <div className="md:col-span-3">
                      <PhoneOtpVerification
                        phone={phone}
                        setPhone={setPhone}
                        phoneVerified={phoneVerified}
                        setPhoneVerified={setPhoneVerified}
                        compact
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Password Row - COMMENTED OUT FOR PLAYERS */}
              {/* 
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-2">Password <span className="text-red-400">*</span></label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2.5 rounded-lg text-pink-100 placeholder-pink-300/40 text-sm focus:outline-none" style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }} placeholder="••••••••" required />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-2">Re-enter Password <span className="text-red-400">*</span></label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-3 py-2.5 rounded-lg text-pink-100 placeholder-pink-300/40 text-sm focus:outline-none transition-colors" style={{ background: 'rgba(255, 0, 102, 0.08)', border: !confirmPassword ? '1px solid rgba(255, 0, 102, 0.3)' : passwordsMatch ? '1px solid #22c55e' : '1px solid #f87171' }} placeholder="••••••••" required />
                  {confirmPassword && (
                    <p className={`mt-1 text-xs font-medium ${passwordsMatch ? 'text-green-400' : 'text-red-400'}`}>
                      {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                    </p>
                  )}
                </div>
              </div>
              */}

              {/* Row 2: Basic Player Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-2">Date of Birth <span className="text-red-400">*</span></label>
                  <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="w-full px-3 py-2.5 rounded-lg text-pink-100 text-sm focus:outline-none" style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }} required />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-2">Gender <span className="text-red-400">*</span></label>
                  <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full px-3 py-2.5 rounded-lg text-pink-100 text-sm focus:outline-none" style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }} required>
                    <option value="" className="bg-[#1a0a0a] text-pink-300">Select</option>
                    <option value="Male" className="bg-[#1a0a0a] text-pink-300">Male</option>
                    <option value="Female" className="bg-[#1a0a0a] text-pink-300">Female</option>
                    <option value="Other" className="bg-[#1a0a0a] text-pink-300">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-2">Nationality <span className="text-red-400">*</span></label>
                  <input type="text" value={nationality} onChange={(e) => setNationality(e.target.value)} className="w-full px-3 py-2.5 rounded-lg text-pink-100 placeholder-pink-300/40 text-sm focus:outline-none" style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }} required />
                </div>
              </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-2">
                      Playing Role <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={playingRole}
                      onChange={(e) => setPlayingRole(e.target.value)}
                      placeholder="e.g., Batsman, Bowler, All-rounder"
                      className="w-full px-3 py-2.5 rounded-lg text-pink-100 placeholder-pink-300/40 text-sm focus:outline-none"
                      style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-2">
                      Experience Level <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={playerExperience}
                      onChange={(e) => setPlayerExperience(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg text-pink-100 text-sm focus:outline-none"
                      style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
                      required
                    >
                      <option value="" className="bg-[#1a0a0a] text-pink-300">Select</option>
                      <option value="Beginner" className="bg-[#1a0a0a] text-pink-300">Beginner</option>
                      <option value="Intermediate" className="bg-[#1a0a0a] text-pink-300">Intermediate</option>
                      <option value="Professional" className="bg-[#1a0a0a] text-pink-300">Professional</option>
                    </select>
                  </div>
                </div>
                {/* Show cricket-specific fields based on sport type */}
                {(selectedSport?.sportType === SportType.CRICKET || 
                  selectedSport?.sportType === 'Cricket' ||
                  effectiveMatch?.sportType === SportType.CRICKET ||
                  effectiveMatch?.sportType === 'Cricket' ||
                  effectiveMatch?.sport === 'Cricket') && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-2">
                        Batting Style
                      </label>
                      <input
                        type="text"
                        value={battingStyle}
                        onChange={(e) => setBattingStyle(e.target.value)}
                        placeholder="e.g., Right-hand, Left-hand"
                        className="w-full px-3 py-2.5 rounded-lg text-pink-100 placeholder-pink-300/40 text-sm focus:outline-none"
                        style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-2">
                        Bowling Style
                      </label>
                      <input
                        type="text"
                        value={bowlingStyle}
                        onChange={(e) => setBowlingStyle(e.target.value)}
                        placeholder="e.g., Fast, Spin"
                        className="w-full px-3 py-2.5 rounded-lg text-pink-100 placeholder-pink-300/40 text-sm focus:outline-none"
                        style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
                      />
                    </div>
                  </div>
                )}
                <div className="mb-3">
                  <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-2">
                    Previous Teams (Optional)
                  </label>
                  <textarea
                    value={previousTeams}
                    onChange={(e) => setPreviousTeams(e.target.value)}
                    placeholder="List your previous teams..."
                    className="w-full px-3 py-2.5 rounded-lg text-pink-100 placeholder-pink-300/40 text-sm focus:outline-none"
                    style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-2">
                      Base Price (₹) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      value={basePrice}
                      onChange={(e) => setBasePrice(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg text-pink-100 text-sm focus:outline-none"
                      style={{ 
                        background: 'rgba(255, 0, 102, 0.08)', 
                        border: basePriceValidation.hasError
                          ? '1px solid #f87171'
                          : basePriceValidation.hasWarning 
                            ? '1px solid #fbbf24'
                            : basePriceValidation.isValid && matchSettings && Number(basePrice) > 0
                              ? '1px solid #22c55e'
                              : '1px solid rgba(255, 0, 102, 0.3)'
                      }}
                      required
                    />
                    {/* Base Price Validation Feedback */}
                    {validationMessage && (
                      <div className={`flex items-center gap-1 mt-1 text-xs ${
                        basePriceValidation.hasError
                          ? 'text-red-400'
                          : basePriceValidation.hasWarning 
                            ? 'text-amber-400' 
                            : 'text-green-400'
                      }`}>
                        {basePriceValidation.hasError ? (
                          <AlertTriangle className="w-3 h-3" />
                        ) : basePriceValidation.hasWarning ? (
                          <AlertTriangle className="w-3 h-3" />
                        ) : (
                          <CheckCircle className="w-3 h-3" />
                        )}
                        <span>{validationMessage}</span>
                      </div>
                    )}
                    {/* Show valid message when all good */}
                    {!validationMessage && matchSettings && Number(basePrice) > 0 && basePriceValidation.isValid && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-green-400">
                        <CheckCircle className="w-3 h-3" />
                        <span>Base price is within allowed range</span>
                      </div>
                    )}
                    {/* Formatted display of entered amount */}
                    {basePrice && parseInt(basePrice) > 0 && (
                      <p className="text-xs text-pink-300/50 mt-1">
                        = {formatIndianCurrency(parseInt(basePrice))}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-2">
                      Player Category
                    </label>
                    <input
                      type="text"
                      value={playerCategory}
                      onChange={(e) => setPlayerCategory(e.target.value)}
                      placeholder="e.g., Elite, Premier"
                      className="w-full px-3 py-2.5 rounded-lg text-pink-100 placeholder-pink-300/40 text-sm focus:outline-none"
                      style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-2">
                      Availability <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={playerAvailability}
                      onChange={(e) => setPlayerAvailability(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg text-pink-100 text-sm focus:outline-none"
                      style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
                      required
                    >
                      <option value="Yes" className="bg-[#1a0a0a] text-pink-300">Available</option>
                      <option value="No" className="bg-[#1a0a0a] text-pink-300">Not Available</option>
                    </select>
                  </div>
                </div>
                <div className="rounded-lg p-3 mb-3" style={{ background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={playerConsent}
                      onChange={(e) => setPlayerConsent(e.target.checked)}
                      className="mt-1 accent-pink-500"
                      required
                    />
                    <span className="text-xs text-amber-200">
                      <strong className="text-amber-300">Player Consent:</strong> I consent to participate in this auction and agree to the terms and conditions.
                    </span>
                  </label>
                </div>
              </div>
          )}

          {/* Verification */}
          <div>
              <h2 className="text-2xl font-black text-pink-300 mb-4">Verification</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-2">
                    Government ID Number <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={governmentId}
                    onChange={(e) => setGovernmentId(e.target.value)}
                    placeholder="Aadhaar / PAN / Driving License"
                    className="w-full px-3 py-2.5 rounded-lg text-pink-100 placeholder-pink-300/40 text-sm focus:outline-none"
                    style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-2">
                    Upload ID Proof <span className="text-red-400">*</span>
                  </label>
                  <div 
                    className={`border-2 border-dashed rounded-lg p-3 text-center transition-all cursor-pointer ${
                      isDragging 
                        ? 'border-pink-500' 
                        : governmentIdFile 
                          ? 'border-green-500'
                          : 'border-pink-500/30 hover:border-pink-400'
                    }`}
                    style={{ background: 'rgba(255, 0, 102, 0.08)' }}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <Upload className={`mx-auto mb-2 ${governmentIdFile ? 'text-green-400' : 'text-pink-400/50'}`} size={20} />
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
                          <p className="text-xs font-bold text-green-400">✓ File uploaded</p>
                          <p className="text-xs text-pink-300/70 truncate">{governmentIdFile.name}</p>
                          <p className="text-xs text-pink-300/50">({(governmentIdFile.size / 1024 / 1024).toFixed(2)} MB)</p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setGovernmentIdFile(null);
                            }}
                            className="text-xs text-red-400 hover:text-red-300 font-bold mt-2"
                          >
                            Remove file
                          </button>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs text-pink-300/70 font-medium mb-1">
                            Click to upload or drag and drop
                          </p>
                          <p className="text-xs text-pink-300/50">
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
          <div className="pt-4 space-y-3" style={{ borderTop: '1px solid rgba(255, 0, 102, 0.2)' }}>
            {!phoneVerified && (
              <p className="text-center text-xs text-amber-300 rounded-lg px-4 py-2 font-medium" style={{ background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
                ⚠ Please verify your phone number before submitting.
              </p>
            )}
            <button
              type="submit"
              disabled={!phoneVerified || isSubmitting}
              className={`w-full py-3 rounded-lg font-bold uppercase tracking-wider transition-all text-sm ${
                phoneVerified && !isSubmitting
                  ? 'text-white hover:brightness-110'
                  : 'text-pink-300/40 cursor-not-allowed'
              }`}
              style={{
                background: phoneVerified && !isSubmitting
                  ? 'linear-gradient(135deg, #ff0066, #ff4d94)' 
                  : 'rgba(255, 0, 102, 0.2)',
                boxShadow: phoneVerified && !isSubmitting
                  ? '0 0 20px rgba(255, 0, 102, 0.4)' 
                  : 'none'
              }}
            >
              {isSubmitting ? (
                <>
                  <span className="inline-block mr-2">⏳</span>
                  Submitting Application...
                </>
              ) : (
                'Submit Registration'
              )}
            </button>
          </div>
        </form>
        </GlassCard>
      </div>

      {/* Loading Modal - Submitting Application */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-40 p-4">
          <div className="rounded-2xl max-w-md w-full p-8" style={{ background: 'linear-gradient(135deg, rgba(26, 10, 10, 0.98), rgba(45, 10, 10, 0.98))', border: '1px solid rgba(255, 0, 102, 0.4)', boxShadow: '0 0 40px rgba(255, 0, 102, 0.3)' }}>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center animate-spin" style={{ background: 'linear-gradient(135deg, rgba(255,0,102,0.3), rgba(200,50,120,0.2))', border: '2px solid rgba(255, 0, 102, 0.5)' }}>
                <div className="w-12 h-12 rounded-full" style={{ background: 'linear-gradient(135deg, #ff0066, #ff4d94)' }}></div>
              </div>
              <h3 className="text-xl font-black text-pink-100 mb-3">Submitting Application</h3>
              <p className="text-pink-300/70 text-sm">Please wait while we process your registration...</p>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl max-w-md w-full p-8 animate-in zoom-in duration-300" style={{ background: 'linear-gradient(135deg, rgba(26, 10, 10, 0.98), rgba(45, 10, 10, 0.98))', border: '1px solid rgba(255, 0, 102, 0.4)', boxShadow: '0 0 40px rgba(255, 0, 102, 0.3)' }}>
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center animate-bounce" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 0 20px rgba(34, 197, 94, 0.4)' }}>
                <CheckCircle size={48} className="text-white" />
              </div>
              <h2 className="text-2xl font-black text-green-300 mb-2">
                ✓ Submitted Successfully!
              </h2>
              <h3 className="text-xl font-bold text-pink-100 mb-4">
                Registration Successful! 🎉
              </h3>
              <p className="text-pink-300/70 mb-6 leading-relaxed">
                You have successfully registered as <strong className="text-pink-200">{getRoleTitle()}</strong> for <strong className="text-pink-200">{effectiveMatch?.name || 'this auction'}</strong>. Your application is under review.
              </p>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full px-8 py-4 text-white rounded-lg font-bold uppercase tracking-wider hover:brightness-110 transition-all"
                style={{ background: 'linear-gradient(135deg, #ff0066, #ff4d94)', boxShadow: '0 0 20px rgba(255, 0, 102, 0.4)' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Support Footer */}
      <div className="py-8 text-center" style={{ borderTop: '1px solid rgba(255, 0, 102, 0.1)' }}>
        <p className="text-xs text-pink-300/50 font-medium">
          Support{' '}
          <span className="mx-2 text-pink-300/30">•</span>
          <a href="mailto:hypehammer.mail@gmail.com" className="text-pink-400/70 hover:text-pink-400 transition-colors">
            hypehammer.mail@gmail.com
          </a>
        </p>
      </div>
    </NeonPageWrapper>
  );
};
