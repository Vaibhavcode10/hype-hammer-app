import React, { useState } from 'react';
import { ArrowLeft, Mail, Lock, Github, Chrome, Eye, EyeOff, CheckCircle2, User, Gavel, Shield, Users, Phone, MapPin, Briefcase, Award, Zap, Upload, Building2, IdCard, Calendar, Globe, TrendingUp, FileText, Image } from 'lucide-react';
import { AuctionStatus, UserRole, UserRegistration, SportType } from '../../types';

interface AuthPageProps {
  setStatus: (status: AuctionStatus) => void;
  onLogin?: (userData: UserRegistration) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ setStatus, onLogin }) => {
  const [isLogin, setIsLogin] = useState(false); // Changed to default signup
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [notification, setNotification] = useState<string | null>(null);
  const [isOAuthLoading, setIsOAuthLoading] = useState(false);

  // Signup-only state
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [phone, setPhone] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [username, setUsername] = useState('');

  // Admin specific
  const [organizationName, setOrganizationName] = useState('');
  const [designation, setDesignation] = useState('');
  const [adminAuthCode, setAdminAuthCode] = useState('');
  const [governmentId, setGovernmentId] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [adminPermissions, setAdminPermissions] = useState<string[]>([]);

  // Auctioneer specific
  const [auctioneerLicense, setAuctioneerLicense] = useState('');
  const [auctioneerExperience, setAuctioneerExperience] = useState('');
  const [languagesKnown, setLanguagesKnown] = useState('');
  const [previousAuctions, setPreviousAuctions] = useState('');
  const [auctioneerGovtId, setAuctioneerGovtId] = useState('');
  const [assignedAuctionEvent, setAssignedAuctionEvent] = useState('');

  // Team Rep specific
  const [teamName, setTeamName] = useState('');
  const [teamShortCode, setTeamShortCode] = useState('');
  const [teamLogo, setTeamLogo] = useState('');
  const [homeCity, setHomeCity] = useState('');
  const [repFullName, setRepFullName] = useState('');
  const [repEmail, setRepEmail] = useState('');
  const [repMobile, setRepMobile] = useState('');
  const [repPhoto, setRepPhoto] = useState('');
  const [repRole, setRepRole] = useState('');
  const [maxSquadSize, setMaxSquadSize] = useState('');
  const [authorizationLetter, setAuthorizationLetter] = useState('');

  // Player specific
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [playerNationality, setPlayerNationality] = useState('');
  const [playerPhoto, setPlayerPhoto] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMobile, setContactMobile] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [playerSport, setPlayerSport] = useState<SportType>(SportType.CRICKET);
  const [playerRole, setPlayerRole] = useState('');
  const [battingStyle, setBattingStyle] = useState('');
  const [bowlingStyle, setBowlingStyle] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [previousTeams, setPreviousTeams] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [playerCategory, setPlayerCategory] = useState('');
  const [availabilityStatus, setAvailabilityStatus] = useState('available');
  const [sportsId, setSportsId] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);

  // Guest specific
  const [guestOrganization, setGuestOrganization] = useState('');
  const [guestType, setGuestType] = useState('');
  const [favoriteTeam, setFavoriteTeam] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleEmailAuth = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLogin) {
      // Login validation
      if (!email || !password) {
        setNotification('Please fill in all required fields');
        setTimeout(() => setNotification(null), 3000);
        return;
      }

      const userData: UserRegistration = {
        email,
        name: name || email.split('@')[0],
        role: UserRole.ADMIN // Default for login
      };
      
      if (onLogin) {
        onLogin(userData);
      }
      
      setNotification('Login successful!');
      setTimeout(() => {
        setNotification(null);
        setStatus(AuctionStatus.MARKETPLACE);
      }, 1500);
    } else {
      // Signup validation
      if (!email || !password || !name || !selectedRole) {
        setNotification('Please fill in all required fields');
        setTimeout(() => setNotification(null), 3000);
        return;
      }

      if (password !== confirmPassword) {
        setNotification('Passwords do not match');
        setTimeout(() => setNotification(null), 3000);
        return;
      }

      // Role-specific validation
      if (selectedRole === UserRole.ADMIN && adminPermissions.length === 0) {
        setNotification('Please select at least one permission');
        setTimeout(() => setNotification(null), 3000);
        return;
      }

      if (selectedRole === UserRole.AUCTIONEER && !auctioneerExperience) {
        setNotification('Please enter your experience');
        setTimeout(() => setNotification(null), 3000);
        return;
      }

      if (selectedRole === UserRole.TEAM_REP && (!teamName || !teamLogo)) {
        setNotification('Please enter team name and upload team logo');
        setTimeout(() => setNotification(null), 3000);
        return;
      }

      if (selectedRole === UserRole.PLAYER && (!playerRole || !playerPhoto)) {
        setNotification('Please select your player role and upload player photo');
        setTimeout(() => setNotification(null), 3000);
        return;
      }

      // Build user data based on role
      const userData: UserRegistration = {
        email,
        password,
        name,
        role: selectedRole,
        phone,
        profilePhoto,
        username,
        createdAt: Date.now()
      };

      if (selectedRole === UserRole.ADMIN) {
        userData.organizationName = organizationName;
        userData.designation = designation;
        userData.adminAuthCode = adminAuthCode;
        userData.governmentId = governmentId;
        userData.twoFactorEnabled = twoFactorEnabled;
        userData.adminApprovalStatus = 'pending';
        userData.permissions = adminPermissions;
      } else if (selectedRole === UserRole.AUCTIONEER) {
        userData.auctioneerLicense = auctioneerLicense;
        userData.experience = auctioneerExperience;
        userData.languagesKnown = languagesKnown.split(',').map(l => l.trim());
        userData.previousAuctions = previousAuctions;
        userData.auctioneerGovtId = auctioneerGovtId;
        userData.approvedByAdmin = false;
        userData.assignedAuctionEvent = assignedAuctionEvent;
      } else if (selectedRole === UserRole.TEAM_REP) {
        userData.teamName = teamName;
        userData.teamShortCode = teamShortCode;
        userData.teamLogo = teamLogo;
        userData.homeCity = homeCity;
        userData.repFullName = repFullName;
        userData.repEmail = repEmail;
        userData.repMobile = repMobile;
        userData.repPhoto = repPhoto;
        userData.repRole = repRole;
        userData.maxSquadSize = maxSquadSize ? parseInt(maxSquadSize) : undefined;
        userData.authorizationLetter = authorizationLetter;
        userData.teamApprovalStatus = 'pending';
      } else if (selectedRole === UserRole.PLAYER) {
        userData.dateOfBirth = dateOfBirth;
        userData.gender = gender;
        userData.nationality = playerNationality;
        userData.playerPhoto = playerPhoto;
        userData.contactEmail = contactEmail;
        userData.contactMobile = contactMobile;
        userData.city = city;
        userData.state = state;
        userData.sport = playerSport;
        userData.playerRole = playerRole;
        userData.battingStyle = battingStyle;
        userData.bowlingStyle = bowlingStyle;
        userData.experienceLevel = experienceLevel;
        userData.previousTeams = previousTeams;
        userData.basePrice = basePrice ? parseFloat(basePrice) : undefined;
        userData.playerCategory = playerCategory;
        userData.availabilityStatus = availabilityStatus;
        userData.sportsId = sportsId;
        userData.consentGiven = consentGiven;
        userData.playerApprovalStatus = 'pending';
      } else if (selectedRole === UserRole.GUEST) {
        userData.guestOrganization = guestOrganization;
        userData.guestType = guestType;
        userData.favoriteTeam = favoriteTeam;
        userData.notificationsEnabled = notificationsEnabled;
      }

      if (onLogin) {
        onLogin(userData);
      }
      
      setNotification('Account created successfully!');
      setTimeout(() => {
        setNotification(null);
        if (selectedRole === UserRole.PLAYER) {
          setStatus(AuctionStatus.PLAYER_REGISTRATION);
        } else {
          setStatus(AuctionStatus.MARKETPLACE);
        }
      }, 1500);
    }
  };

  const handleOAuthLogin = (provider: 'google' | 'github') => {
    // Mock OAuth - in production, this would redirect to OAuth provider
    const oauthUserData: UserRegistration = {
      name: provider === 'google' ? 'Google User' : 'GitHub User',
      email: `user_${Date.now()}@${provider}.com`,
      isOAuthUser: true,
      profileComplete: true
    };
    
    if (onLogin) {
      onLogin(oauthUserData);
    }
    
    // Go to marketplace for OAuth users
    setStatus(AuctionStatus.MARKETPLACE);
  };

  return (
    <div className="h-screen bg-gradient-to-br from-white via-blue-50 to-orange-50 flex flex-col relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.9)_0%,_rgba(224,242,254,0.5)_100%)] pointer-events-none"></div>
      <div className="absolute top-20 left-20 w-96 h-96 bg-blue-500 opacity-10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-orange-500 opacity-10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Notification */}
      {notification && (
        <div className="fixed top-8 right-8 z-[200] bg-gradient-to-r from-blue-500 to-orange-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-5">
          <CheckCircle2 size={20} />
          <span className="font-black text-sm uppercase tracking-wider">{notification}</span>
        </div>
      )}

      {/* OAuth Loading Overlay */}
      {isOAuthLoading && (
        <div className="fixed inset-0 z-[250] bg-white/95 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-blue-600 font-black text-lg uppercase tracking-wider">Authenticating...</p>
          </div>
        </div>
      )}

      {!isOAuthLoading && (
      <div className="w-full flex flex-col flex-1 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-6 lg:px-12 py-4 border-b-2 border-blue-200">
          <button 
            onClick={() => setStatus(AuctionStatus.HOME)}
            className="flex items-center gap-3 bg-white border-2 border-blue-500 backdrop-blur-xl px-5 py-3 rounded-full text-blue-600 hover:bg-blue-500 hover:text-white transition-all shadow-lg font-bold"
          >
            <ArrowLeft size={18} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Back</span>
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-2xl overflow-hidden border-2 border-blue-500">
              <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <h2 className="text-lg font-display font-black tracking-widest gold-text uppercase leading-none">HypeHammer</h2>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-y-auto px-6 lg:px-12 py-6 smooth-scroll max-h-[calc(100vh-120px)]">
          {isLogin ? (
            // LOGIN VIEW
            <>
              <div className="text-center mb-5">
                <h1 className="text-4xl font-display font-black text-slate-900 uppercase tracking-tight mb-2">
                  Welcome Back
                </h1>
                <p className="text-sm text-slate-600 uppercase tracking-wider mb-4">
                  Access your auction dashboard
                </p>
                <p className="text-xs text-slate-500">
                  New to HypeHammer?{' '}
                  <button 
                    onClick={() => setIsLogin(false)}
                    className="text-blue-600 font-black hover:text-orange-500 transition-colors"
                  >
                    Sign up here
                  </button>
                </p>
              </div>

              <form onSubmit={handleEmailAuth} className="max-w-7xl mx-auto w-full space-y-4">
                {/* Email and Password Section - Two Columns */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                      Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <input 
                        type="email"
                        className="w-full bg-white border-2 border-slate-300 rounded-lg pl-12 pr-4 py-3 text-slate-900 outline-none focus:ring-2 ring-blue-500 focus:border-blue-500 placeholder-slate-400 text-sm shadow-sm"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                      Password *
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <input 
                        type={showPassword ? 'text' : 'password'}
                        className="w-full bg-white border-2 border-slate-300 rounded-lg pl-12 pr-12 py-3 text-slate-900 outline-none focus:ring-2 ring-blue-500 focus:border-blue-500 placeholder-slate-400 text-sm shadow-sm"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-blue-600 transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button 
                    type="button"
                    className="text-xs font-black uppercase text-blue-600 hover:text-orange-500 transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>

                <button 
                  type="submit"
                  className="w-full py-3 gold-gradient rounded-lg text-white font-black uppercase tracking-wider text-base shadow-2xl hover:brightness-110 transition-all"
                >
                  Login to Dashboard
                </button>

                {/* Or Divider */}
                <div className="flex items-center gap-4 my-4">
                  <div className="flex-1 h-px bg-slate-300"></div>
                  <span className="text-xs font-black uppercase text-slate-600 tracking-widest">Or Continue With</span>
                  <div className="flex-1 h-px bg-slate-300"></div>
                </div>

                {/* OAuth Options at Bottom */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <button 
                    type="button"
                    onClick={() => handleOAuthLogin('google')}
                    className="w-full py-3 bg-white border-2 border-blue-300 rounded-lg text-slate-900 hover:bg-blue-50 hover:border-blue-500 transition-all flex items-center justify-center gap-3 group shadow-md"
                  >
                    <div className="w-5 h-5 bg-gradient-to-r from-blue-500 to-orange-500 rounded-full flex items-center justify-center">
                      <Chrome size={14} className="text-white" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-wider">Google</span>
                  </button>

                  <button 
                    type="button"
                    onClick={() => handleOAuthLogin('github')}
                    className="w-full py-3 bg-white border-2 border-slate-300 rounded-lg text-slate-900 hover:bg-slate-50 hover:border-slate-500 transition-all flex items-center justify-center gap-3 group shadow-md"
                  >
                    <Github size={18} className="text-slate-900" />
                    <span className="text-xs font-black uppercase tracking-wider">GitHub</span>
                  </button>
                </div>
              </form>
            </>
          ) : (
            // SIGNUP VIEW
            <>
              <div className="text-center mb-5">
                <h1 className="text-4xl font-display font-black text-slate-900 uppercase tracking-tight mb-2">
                  Create Account
                </h1>
                <p className="text-sm text-slate-500 uppercase tracking-wider mb-4">
                  Join the auction revolution
                </p>
                <p className="text-xs text-slate-500">
                  Already have an account?{' '}
                  <button 
                    onClick={() => setIsLogin(true)}
                    className="text-blue-600 font-black hover:text-orange-500 transition-colors"
                  >
                    Login here
                  </button>
                </p>
              </div>

              <form onSubmit={handleEmailAuth} className="max-w-7xl mx-auto w-full space-y-4">
              
              {/* Role Selection - Only for Signup */}
              {!isLogin && (
                <div className="space-y-3">
                  <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                    Select Your Role *
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { role: UserRole.ADMIN, icon: Shield, label: 'Admin' },
                      { role: UserRole.AUCTIONEER, icon: Gavel, label: 'Auctioneer' },
                      { role: UserRole.TEAM_REP, icon: Users, label: 'Team Rep' },
                      { role: UserRole.PLAYER, icon: User, label: 'Player' },
                      { role: UserRole.GUEST, icon: Zap, label: 'Guest' }
                    ].map(({ role, icon: Icon, label }) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setSelectedRole(role)}
                        className={`p-3 rounded-lg border-2 transition-all shadow-md ${
                          selectedRole === role
                            ? 'border-blue-500 bg-gradient-to-r from-blue-100 to-orange-100'
                            : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-blue-50'
                        }`}
                      >
                        <Icon className={`w-6 h-6 mx-auto mb-1 ${
                          selectedRole === role ? 'text-blue-600' : 'text-slate-600'
                        }`} />
                        <p className="text-[9px] font-black uppercase text-center text-slate-900">{label}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!isLogin && (
                <>
                  {/* Three Column Layout for Basic Fields */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                        Full Name *
                      </label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input 
                          type="text"
                          className="w-full bg-white border-2 border-slate-300 rounded-lg px-4 py-3 pl-12 text-slate-900 outline-none focus:ring-2 ring-blue-500 focus:border-blue-500 placeholder-slate-400 text-sm shadow-sm"
                          placeholder="Enter your name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                        Phone Number *
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input 
                          type="tel"
                          className="w-full bg-white border-2 border-slate-300 rounded-lg px-4 py-3 pl-12 text-slate-900 outline-none focus:ring-2 ring-blue-500 focus:border-blue-500 placeholder-slate-400 text-sm shadow-sm"
                          placeholder="+91 98765 43210"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                        Username *
                      </label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input 
                          type="text"
                          className="w-full bg-white border-2 border-slate-300 rounded-lg px-4 py-3 pl-12 text-slate-900 outline-none focus:ring-2 ring-blue-500 focus:border-blue-500 placeholder-slate-400 text-sm shadow-sm"
                          placeholder="Choose a username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                      Profile Photo
                    </label>
                    <div className="relative">
                      <Image className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <input 
                        type="file"
                        accept="image/*"
                        className="w-full bg-white border-2 border-slate-300 rounded-lg px-4 py-3 pl-12 text-slate-900 outline-none focus:ring-2 ring-blue-500 focus:border-blue-500 placeholder-slate-400 text-sm shadow-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-r file:from-blue-500 file:to-orange-500 file:text-white hover:file:brightness-110"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setProfilePhoto(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Admin Specific Fields */}
                  {selectedRole === UserRole.ADMIN && (
                    <div className="space-y-3 bg-blue-50/50 border-2 border-slate-300 rounded-lg p-4">
                      <h3 className="text-sm font-black uppercase text-blue-600 mb-3">Admin Details</h3>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                            Organization / Tournament Name *
                          </label>
                          <div className="relative">
                            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input 
                              type="text"
                              className="w-full bg-white border-2 border-slate-300 rounded-lg px-4 py-3 pl-12 text-slate-900 outline-none focus:ring-2 ring-blue-500 placeholder-slate-400 text-sm"
                              placeholder="e.g., National Sports League"
                              value={organizationName}
                              onChange={(e) => setOrganizationName(e.target.value)}
                              required
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                            Designation *
                          </label>
                          <select 
                            value={designation}
                            onChange={(e) => setDesignation(e.target.value)}
                            className="w-full bg-white border-2 border-slate-300 rounded-lg px-4 py-3 text-slate-900 outline-none focus:ring-2 ring-blue-500 text-sm"
                            required
                          >
                            <option value="">Select designation</option>
                            <option value="admin">Admin</option>
                            <option value="super-admin">Super Admin</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                            Admin Authorization Code *
                          </label>
                          <div className="relative">
                            <IdCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input 
                              type="text"
                              className="w-full bg-white border-2 border-slate-300 rounded-lg px-4 py-3 pl-12 text-slate-900 outline-none focus:ring-2 ring-blue-500 placeholder-slate-400 text-sm"
                              placeholder="Enter admin code"
                              value={adminAuthCode}
                              onChange={(e) => setAdminAuthCode(e.target.value)}
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                            Government ID *
                          </label>
                          <div className="relative">
                            <Upload className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input 
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              className="w-full bg-white border-2 border-slate-300 rounded-lg px-4 py-3 pl-12 text-slate-900 outline-none focus:ring-2 ring-blue-500 text-sm"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setGovernmentId(file.name);
                                }
                              }}
                              required
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer p-3 bg-white border-2 border-slate-300 rounded-lg hover:border-blue-500/50 transition-all">
                          <input 
                            type="checkbox"
                            checked={twoFactorEnabled}
                            onChange={(e) => setTwoFactorEnabled(e.target.checked)}
                            className="w-4 h-4 rounded"
                          />
                          <span className="text-xs text-slate-900">Enable 2FA / OTP Authentication</span>
                        </label>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                          Admin Permissions *
                        </label>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                          {['Manage Users', 'Manage Auction', 'Control Budget', 'View Reports', 'System Settings', 'Approve Registrations'].map((perm) => (
                            <label key={perm} className="flex items-center gap-2 cursor-pointer p-2 bg-white border-2 border-slate-300 rounded-lg hover:border-blue-500/50 transition-all">
                              <input 
                                type="checkbox"
                                checked={adminPermissions.includes(perm)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setAdminPermissions([...adminPermissions, perm]);
                                  } else {
                                    setAdminPermissions(adminPermissions.filter(p => p !== perm));
                                  }
                                }}
                                className="w-4 h-4 rounded"
                              />
                              <span className="text-xs text-slate-900">{perm}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Auctioneer Specific Fields */}
                  {selectedRole === UserRole.AUCTIONEER && (
                    <div className="space-y-3 bg-blue-50/50 border-2 border-slate-300 rounded-lg p-4">
                      <h3 className="text-sm font-black uppercase text-blue-600 mb-3">Auctioneer Details</h3>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                            Auctioneer ID / License
                          </label>
                          <div className="relative">
                            <IdCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input 
                              type="text"
                              className="w-full bg-white border-2 border-slate-300 rounded-lg px-4 py-3 pl-12 text-slate-900 outline-none focus:ring-2 ring-blue-500 placeholder-slate-400 text-sm"
                              placeholder="e.g., IAA-2024-001"
                              value={auctioneerLicense}
                              onChange={(e) => setAuctioneerLicense(e.target.value)}
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                            Years of Experience *
                          </label>
                          <div className="relative">
                            <TrendingUp className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input 
                              type="text"
                              className="w-full bg-white border-2 border-slate-300 rounded-lg px-4 py-3 pl-12 text-slate-900 outline-none focus:ring-2 ring-blue-500 placeholder-slate-400 text-sm"
                              placeholder="e.g., 5 years in cricket auctions"
                              value={auctioneerExperience}
                              onChange={(e) => setAuctioneerExperience(e.target.value)}
                              required
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                            Languages Known
                          </label>
                          <div className="relative">
                            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input 
                              type="text"
                              className="w-full bg-white border-2 border-slate-300 rounded-lg px-4 py-3 pl-12 text-slate-900 outline-none focus:ring-2 ring-blue-500 placeholder-slate-400 text-sm"
                              placeholder="e.g., English, Hindi, Tamil"
                              value={languagesKnown}
                              onChange={(e) => setLanguagesKnown(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                            Previous Auctions
                          </label>
                          <input 
                            type="text"
                            className="w-full bg-white border-2 border-slate-300 rounded-lg px-4 py-3 text-slate-900 outline-none focus:ring-2 ring-blue-500 placeholder-slate-400 text-sm"
                            placeholder="e.g., IPL 2023, PKL 2024"
                            value={previousAuctions}
                            onChange={(e) => setPreviousAuctions(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                            Government ID Upload *
                          </label>
                          <div className="relative">
                            <Upload className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input 
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              className="w-full bg-white border-2 border-slate-300 rounded-lg px-4 py-3 pl-12 text-slate-900 outline-none focus:ring-2 ring-blue-500 text-sm"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setAuctioneerGovtId(file.name);
                                }
                              }}
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                            Assigned Auction Event
                          </label>
                          <input 
                            type="text"
                            className="w-full bg-white border-2 border-slate-300 rounded-lg px-4 py-3 text-slate-900 outline-none focus:ring-2 ring-blue-500 placeholder-slate-400 text-sm"
                            placeholder="e.g., Cricket Premier League 2026"
                            value={assignedAuctionEvent}
                            onChange={(e) => setAssignedAuctionEvent(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Team Rep Specific Fields */}
                  {selectedRole === UserRole.TEAM_REP && (
                    <div className="space-y-3 bg-blue-50/50 border-2 border-slate-300 rounded-lg p-4">
                      <h3 className="text-sm font-black uppercase text-blue-600 mb-3">Team Details</h3>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                            Team Name *
                          </label>
                          <div className="relative">
                            <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input 
                              type="text"
                              className="w-full bg-white border-2 border-slate-300 rounded-lg px-4 py-3 pl-12 text-slate-900 outline-none focus:ring-2 ring-blue-500 placeholder-slate-400 text-sm"
                              placeholder="e.g., Mumbai Tigers"
                              value={teamName}
                              onChange={(e) => setTeamName(e.target.value)}
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                            Team Short Code *
                          </label>
                          <input 
                            type="text"
                            maxLength={5}
                            className="w-full bg-white border-2 border-slate-300 rounded-lg px-4 py-3 text-slate-900 outline-none focus:ring-2 ring-blue-500 placeholder-slate-400 text-sm uppercase"
                            placeholder="e.g., MT, RCB"
                            value={teamShortCode}
                            onChange={(e) => setTeamShortCode(e.target.value.toUpperCase())}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                            Home City / Region
                          </label>
                          <div className="relative">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input 
                              type="text"
                              className="w-full bg-white border-2 border-slate-300 rounded-lg px-4 py-3 pl-12 text-slate-900 outline-none focus:ring-2 ring-blue-500 placeholder-slate-400 text-sm"
                              placeholder="e.g., Mumbai"
                              value={homeCity}
                              onChange={(e) => setHomeCity(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                          Team Logo * 🛡️
                        </label>
                        <div className="relative">
                          <Upload className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                          <input 
                            type="file"
                            accept="image/*"
                            className="w-full bg-white border-2 border-slate-300 rounded-lg px-4 py-3 pl-12 text-slate-900 outline-none focus:ring-2 ring-blue-500 text-sm"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setTeamLogo(URL.createObjectURL(file));
                              }
                            }}
                            required
                          />
                        </div>
                      </div>

                      <h4 className="text-xs font-black uppercase text-blue-600 mt-4 mb-2">Team Representative Info</h4>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                            Rep Full Name *
                          </label>
                          <input 
                            type="text"
                            className="w-full bg-white border-2 border-slate-300 rounded-lg px-4 py-3 text-slate-900 outline-none focus:ring-2 ring-blue-500 placeholder-slate-400 text-sm"
                            placeholder="Representative's name"
                            value={repFullName}
                            onChange={(e) => setRepFullName(e.target.value)}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                            Rep Email *
                          </label>
                          <input 
                            type="email"
                            className="w-full bg-white border-2 border-slate-300 rounded-lg px-4 py-3 text-slate-900 outline-none focus:ring-2 ring-blue-500 placeholder-slate-400 text-sm"
                            placeholder="rep@email.com"
                            value={repEmail}
                            onChange={(e) => setRepEmail(e.target.value)}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                            Rep Mobile *
                          </label>
                          <input 
                            type="tel"
                            className="w-full bg-white border-2 border-slate-300 rounded-lg px-4 py-3 text-slate-900 outline-none focus:ring-2 ring-blue-500 placeholder-slate-400 text-sm"
                            placeholder="+91 98765 43210"
                            value={repMobile}
                            onChange={(e) => setRepMobile(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                            Rep Role *
                          </label>
                          <select 
                            value={repRole}
                            onChange={(e) => setRepRole(e.target.value)}
                            className="w-full bg-white border-2 border-slate-300 rounded-lg px-4 py-3 text-slate-900 outline-none focus:ring-2 ring-blue-500 text-sm"
                            required
                          >
                            <option value="">Select role</option>
                            <option value="owner">Owner</option>
                            <option value="manager">Manager</option>
                            <option value="captain">Captain</option>
                            <option value="scout">Scout</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                            Rep Photo 📸
                          </label>
                          <input 
                            type="file"
                            accept="image/*"
                            className="w-full bg-white border-2 border-slate-300 rounded-lg px-4 py-3 text-slate-900 outline-none focus:ring-2 ring-blue-500 text-sm"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setRepPhoto(URL.createObjectURL(file));
                              }
                            }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                            Max Squad Size
                          </label>
                          <input 
                            type="number"
                            className="w-full bg-white border-2 border-slate-300 rounded-lg px-4 py-3 text-slate-900 outline-none focus:ring-2 ring-blue-500 placeholder-slate-400 text-sm"
                            placeholder="e.g., 25"
                            value={maxSquadSize}
                            onChange={(e) => setMaxSquadSize(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                            Authorization Letter (PDF)
                          </label>
                          <input 
                            type="file"
                            accept=".pdf"
                            className="w-full bg-white border-2 border-slate-300 rounded-lg px-4 py-3 text-slate-900 outline-none focus:ring-2 ring-blue-500 text-sm"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setAuthorizationLetter(file.name);
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Player Specific Fields */}
                  {selectedRole === UserRole.PLAYER && (
                    <div className="space-y-3 bg-blue-50/50 border-2 border-slate-300 rounded-lg p-4">
                      <h3 className="text-sm font-black uppercase text-blue-600 mb-3">Player Details</h3>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                            Date of Birth *
                          </label>
                          <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input 
                              type="date"
                              className="w-full bg-white border-2 border-slate-300 rounded-lg px-4 py-3 pl-12 text-slate-900 outline-none focus:ring-2 ring-blue-500 text-sm"
                              value={dateOfBirth}
                              onChange={(e) => setDateOfBirth(e.target.value)}
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                            Gender *
                          </label>
                          <select 
                            value={gender}
                            onChange={(e) => setGender(e.target.value)}
                            className="w-full bg-white border-2 border-slate-300 rounded-lg px-4 py-3 text-slate-900 outline-none focus:ring-2 ring-blue-500 text-sm"
                            required
                          >
                            <option value="">Select gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                            Nationality *
                          </label>
                          <div className="relative">
                            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input 
                              type="text"
                              className="w-full bg-white border-2 border-slate-300 rounded-lg px-4 py-3 pl-12 text-slate-900 outline-none focus:ring-2 ring-blue-500 placeholder-slate-400 text-sm"
                              placeholder="e.g., Indian"
                              value={playerNationality}
                              onChange={(e) => setPlayerNationality(e.target.value)}
                              required
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                          Player Photo * 📸
                        </label>
                        <div className="relative">
                          <Upload className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                          <input 
                            type="file"
                            accept="image/*"
                            className="w-full bg-white border-2 border-slate-300 rounded-lg px-4 py-3 pl-12 text-slate-900 outline-none focus:ring-2 ring-blue-500 text-sm"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setPlayerPhoto(URL.createObjectURL(file));
                              }
                            }}
                            required
                          />
                        </div>
                      </div>

                      <h4 className="text-xs font-black uppercase text-blue-600 mt-4 mb-2">Contact Information</h4>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                            Contact Email *
                          </label>
                          <input 
                            type="email"
                            className="w-full bg-white border-2 border-slate-300 rounded-lg px-4 py-3 text-slate-900 outline-none focus:ring-2 ring-blue-500 placeholder-slate-400 text-sm"
                            placeholder="player@email.com"
                            value={contactEmail}
                            onChange={(e) => setContactEmail(e.target.value)}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                            Contact Mobile *
                          </label>
                          <input 
                            type="tel"
                            className="w-full bg-white border-2 border-slate-300 rounded-lg px-4 py-3 text-slate-900 outline-none focus:ring-2 ring-blue-500 placeholder-slate-400 text-sm"
                            placeholder="+91 98765 43210"
                            value={contactMobile}
                            onChange={(e) => setContactMobile(e.target.value)}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                            City
                          </label>
                          <input 
                            type="text"
                            className="w-full bg-white border-2 border-slate-300 rounded-lg px-4 py-3 text-slate-900 outline-none focus:ring-2 ring-blue-500 placeholder-slate-400 text-sm"
                            placeholder="e.g., Mumbai"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                          State
                        </label>
                        <input 
                          type="text"
                          className="w-full bg-white border-2 border-slate-300 rounded-lg px-4 py-3 text-slate-900 outline-none focus:ring-2 ring-blue-500 placeholder-slate-400 text-sm"
                          placeholder="e.g., Maharashtra"
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                        />
                      </div>

                      <h4 className="text-xs font-black uppercase text-blue-600 mt-4 mb-2">Playing Details</h4>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                            Sport Type *
                          </label>
                          <select 
                            value={playerSport}
                            onChange={(e) => setPlayerSport(e.target.value as SportType)}
                            className="w-full bg-white border-2 border-slate-300 rounded-lg px-4 py-3 text-slate-900 outline-none focus:ring-2 ring-blue-500 text-sm"
                            required
                          >
                            {Object.values(SportType).map(sport => (
                              <option key={sport} value={sport}>{sport}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                            Playing Role *
                          </label>
                          <input 
                            type="text"
                            className="w-full bg-white border-2 border-slate-300 rounded-lg px-4 py-3 text-slate-900 outline-none focus:ring-2 ring-blue-500 placeholder-slate-400 text-sm"
                            placeholder="e.g., All-Rounder, Striker, Raider"
                            value={playerRole}
                            onChange={(e) => setPlayerRole(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                            Batting Style
                          </label>
                          <input 
                            type="text"
                            className="w-full bg-white border-2 border-slate-300 rounded-lg px-4 py-3 text-slate-900 outline-none focus:ring-2 ring-blue-500 placeholder-slate-400 text-sm"
                            placeholder="e.g., Right-hand, Left-hand"
                            value={battingStyle}
                            onChange={(e) => setBattingStyle(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                            Bowling Style
                          </label>
                          <input 
                            type="text"
                            className="w-full bg-white border-2 border-slate-300 rounded-lg px-4 py-3 text-slate-900 outline-none focus:ring-2 ring-blue-500 placeholder-slate-400 text-sm"
                            placeholder="e.g., Right-arm Fast, Spin"
                            value={bowlingStyle}
                            onChange={(e) => setBowlingStyle(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                            Experience Level
                          </label>
                          <select 
                            value={experienceLevel}
                            onChange={(e) => setExperienceLevel(e.target.value)}
                            className="w-full bg-white border-2 border-slate-300 rounded-lg px-4 py-3 text-slate-900 outline-none focus:ring-2 ring-blue-500 text-sm"
                          >
                            <option value="">Select level</option>
                            <option value="beginner">Beginner</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="advanced">Advanced</option>
                            <option value="professional">Professional</option>
                            <option value="international">International</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                            Previous Teams
                          </label>
                          <input 
                            type="text"
                            className="w-full bg-white border-2 border-slate-300 rounded-lg px-4 py-3 text-slate-900 outline-none focus:ring-2 ring-blue-500 placeholder-slate-400 text-sm"
                            placeholder="e.g., CSK, Mumbai Indians"
                            value={previousTeams}
                            onChange={(e) => setPreviousTeams(e.target.value)}
                          />
                        </div>
                      </div>

                      <h4 className="text-xs font-black uppercase text-blue-600 mt-4 mb-2">Auction Details</h4>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                            Base Price
                          </label>
                          <input 
                            type="number"
                            className="w-full bg-white border-2 border-slate-300 rounded-lg px-4 py-3 text-slate-900 outline-none focus:ring-2 ring-blue-500 placeholder-slate-400 text-sm"
                            placeholder="e.g., 50000"
                            value={basePrice}
                            onChange={(e) => setBasePrice(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                            Player Category
                          </label>
                          <select 
                            value={playerCategory}
                            onChange={(e) => setPlayerCategory(e.target.value)}
                            className="w-full bg-white border-2 border-slate-300 rounded-lg px-4 py-3 text-slate-900 outline-none focus:ring-2 ring-blue-500 text-sm"
                          >
                            <option value="">Select category</option>
                            <option value="marquee">Marquee</option>
                            <option value="category-a">Category A</option>
                            <option value="category-b">Category B</option>
                            <option value="category-c">Category C</option>
                            <option value="uncapped">Uncapped</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                            Availability Status *
                          </label>
                          <select 
                            value={availabilityStatus}
                            onChange={(e) => setAvailabilityStatus(e.target.value)}
                            className="w-full bg-white border-2 border-slate-300 rounded-lg px-4 py-3 text-slate-900 outline-none focus:ring-2 ring-blue-500 text-sm"
                            required
                          >
                            <option value="available">Available</option>
                            <option value="partial">Partially Available</option>
                            <option value="unavailable">Unavailable</option>
                          </select>
                        </div>
                      </div>

                      <h4 className="text-xs font-black uppercase text-blue-600 mt-4 mb-2">Verification</h4>
                      
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                          Govt ID / Sports ID *
                        </label>
                        <div className="relative">
                          <Upload className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                          <input 
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="w-full bg-white border-2 border-slate-300 rounded-lg px-4 py-3 pl-12 text-slate-900 outline-none focus:ring-2 ring-blue-500 text-sm"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setSportsId(file.name);
                              }
                            }}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer p-3 bg-white border-2 border-slate-300 rounded-lg hover:border-blue-500/50 transition-all">
                          <input 
                            type="checkbox"
                            checked={consentGiven}
                            onChange={(e) => setConsentGiven(e.target.checked)}
                            className="w-4 h-4 rounded"
                            required
                          />
                          <span className="text-xs text-slate-900">I consent to participate in the auction and accept all terms & conditions *</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Guest Specific Fields */}
                  {selectedRole === UserRole.GUEST && (
                    <div className="space-y-3 bg-blue-50/50 border-2 border-slate-300 rounded-lg p-4">
                      <h3 className="text-sm font-black uppercase text-blue-600 mb-3">Guest / Viewer Details</h3>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                            Organization
                          </label>
                          <div className="relative">
                            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input 
                              type="text"
                              className="w-full bg-white border-2 border-slate-300 rounded-lg px-4 py-3 pl-12 text-slate-900 outline-none focus:ring-2 ring-blue-500 placeholder-slate-400 text-sm"
                              placeholder="e.g., Sports Media Network"
                              value={guestOrganization}
                              onChange={(e) => setGuestOrganization(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                            Guest Type
                          </label>
                          <select 
                            value={guestType}
                            onChange={(e) => setGuestType(e.target.value)}
                            className="w-full bg-white border-2 border-slate-300 rounded-lg px-4 py-3 text-slate-900 outline-none focus:ring-2 ring-blue-500 text-sm"
                          >
                            <option value="">Select guest type</option>
                            <option value="media">Media</option>
                            <option value="sponsor">Sponsor</option>
                            <option value="dignitary">Dignitary</option>
                            <option value="observer">Observer</option>
                            <option value="fan">Fan</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                          Favorite Team
                        </label>
                        <div className="relative">
                          <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                          <input 
                            type="text"
                            className="w-full bg-white border-2 border-slate-300 rounded-lg px-4 py-3 pl-12 text-slate-900 outline-none focus:ring-2 ring-blue-500 placeholder-slate-400 text-sm"
                            placeholder="e.g., Mumbai Tigers"
                            value={favoriteTeam}
                            onChange={(e) => setFavoriteTeam(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer p-3 bg-white border-2 border-slate-300 rounded-lg hover:border-blue-500/50 transition-all">
                          <input 
                            type="checkbox"
                            checked={notificationsEnabled}
                            onChange={(e) => setNotificationsEnabled(e.target.checked)}
                            className="w-4 h-4 rounded"
                          />
                          <span className="text-xs text-slate-900">Enable notifications for auction updates</span>
                        </label>
                      </div>

                      <div className="p-3 bg-blue-100 border border-blue-500/30 rounded-lg">
                        <p className="text-[10px] text-blue-600 uppercase font-black">Note:</p>
                        <p className="text-xs text-slate-500 mt-1">Guests can watch the auction but cannot place bids or interact with players.</p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Email and Password Section - Two Columns */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                      type="email"
                      className="w-full bg-white border-2 border-slate-300 rounded-lg pl-12 pr-4 py-3 text-slate-900 outline-none focus:ring-2 ring-blue-500 placeholder-slate-400 text-sm"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                    Password *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                      type={showPassword ? 'text' : 'password'}
                      className="w-full bg-white border-2 border-slate-300 rounded-lg pl-12 pr-12 py-3 text-slate-900 outline-none focus:ring-2 ring-blue-500 placeholder-slate-400 text-sm"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-blue-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              {!isLogin && (
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-blue-600 tracking-wider">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                      type={showPassword ? 'text' : 'password'}
                      className="w-full bg-white border-2 border-slate-300 rounded-lg pl-12 pr-4 py-3 text-slate-900 outline-none focus:ring-2 ring-blue-500 placeholder-slate-400 text-sm"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              {isLogin && (
                <div className="flex justify-end mt-2">
                  <button 
                    type="button"
                    className="text-[10px] font-black uppercase text-blue-600 hover:text-slate-900 transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              <button 
                type="submit"
                className="w-full py-3.5 gold-gradient rounded-lg text-white font-black uppercase tracking-wider text-base shadow-2xl hover:brightness-110 transition-all mt-3"
              >
                {isLogin ? 'Login to Dashboard' : 'Create Account'}
              </button>

              {/* Or Divider */}
              <div className="flex items-center gap-4 my-4">
                <div className="flex-1 h-px bg-[#3d2f2b]"></div>
                <span className="text-xs font-black uppercase text-slate-500 tracking-widest">Or Continue With</span>
                <div className="flex-1 h-px bg-[#3d2f2b]"></div>
              </div>

              {/* OAuth Options at Bottom */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <button 
                  type="button"
                  onClick={() => handleOAuthLogin('google')}
                  className="w-full py-3 bg-white border-2 border-blue-500/20 rounded-lg text-slate-900 hover:bg-blue-100 hover:border-blue-500/40 transition-all flex items-center justify-center gap-3 group"
                >
                  <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                    <Chrome size={14} className="text-white" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider">Google</span>
                </button>

                <button 
                  type="button"
                  onClick={() => handleOAuthLogin('github')}
                  className="w-full py-3 bg-white border-2 border-blue-500/20 rounded-lg text-slate-900 hover:bg-blue-100 hover:border-blue-500/40 transition-all flex items-center justify-center gap-3 group"
                >
                  <Github size={18} className="text-slate-900" />
                  <span className="text-xs font-black uppercase tracking-wider">GitHub</span>
                </button>
              </div>
            </form>
            </>
          )}
        </div>

        {/* Terms - Footer */}
        <div className="px-6 lg:px-12 py-4 border-t border-slate-300 bg-blue-50/50 text-center">
          <p className="text-[9px] text-[#5c4742] uppercase tracking-wider">
            By continuing, you agree to our{' '}
            <span className="text-blue-600 cursor-pointer hover:text-slate-900">Terms of Service</span>
            {' '}and{' '}
            <span className="text-blue-600 cursor-pointer hover:text-slate-900">Privacy Policy</span>
          </p>
        </div>
      </div>
      )}
    </div>

  );
};
