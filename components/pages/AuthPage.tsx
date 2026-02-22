import React, { useState } from 'react';
import { ArrowLeft, Mail, Lock, Github, Chrome, Eye, EyeOff, CheckCircle2, User, Gavel, Shield, Users, Phone, MapPin, Briefcase, Award, Zap, Upload, Building2, IdCard, Calendar, Globe, TrendingUp, FileText, Image, X, Loader2, AlertCircle } from 'lucide-react';
import { AuctionStatus, UserRole, UserRegistration, SportType } from '../../types';
import { sendPasswordResetEmail, fetchSignInMethodsForEmail } from 'firebase/auth';
import { auth } from '../../services/firebaseConfig';
import { NeonDesignStyles, GlassCard, NeonButton, GradientHeading, NeonPageWrapper, NeonInput, RoleSelector } from '../ui/NeonDesignSystem';

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

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [forgotPasswordError, setForgotPasswordError] = useState<string | null>(null);

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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!forgotPasswordEmail.trim()) {
      setForgotPasswordError('Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forgotPasswordEmail)) {
      setForgotPasswordError('Please enter a valid email address');
      return;
    }

    setForgotPasswordLoading(true);
    setForgotPasswordError(null);

    try {
      // First check if the user exists
      const signInMethods = await fetchSignInMethodsForEmail(auth, forgotPasswordEmail.trim());
      console.log('Sign-in methods for email:', signInMethods);
      
      if (signInMethods.length === 0) {
        setForgotPasswordError('No account found with this email address. Please sign up first.');
        setForgotPasswordLoading(false);
        return;
      }
      
      // Send password reset email with action code settings
      await sendPasswordResetEmail(auth, forgotPasswordEmail.trim(), {
        url: 'https://hype-hammer.web.app',
        handleCodeInApp: false,
      });
      console.log('Password reset email sent successfully to:', forgotPasswordEmail.trim());
      setForgotPasswordSuccess(true);
    } catch (error: any) {
      console.error('Password reset error:', error.code, error.message);
      
      // Handle specific Firebase errors
      switch (error.code) {
        case 'auth/user-not-found':
          setForgotPasswordError('No account found with this email address');
          break;
        case 'auth/invalid-email':
          setForgotPasswordError('Invalid email address format');
          break;
        case 'auth/too-many-requests':
          setForgotPasswordError('Too many requests. Please try again later');
          break;
        default:
          setForgotPasswordError(`Failed to send reset email: ${error.message || 'Please try again'}`);
      }
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const closeForgotPasswordModal = () => {
    setShowForgotPassword(false);
    setForgotPasswordEmail('');
    setForgotPasswordSuccess(false);
    setForgotPasswordError(null);
  };

  return (
    <NeonPageWrapper className="h-screen flex flex-col overflow-hidden">
      <NeonDesignStyles />

      {/* Notification */}
      {notification && (
        <div className="fixed top-8 right-8 z-[200] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-5" style={{ background: 'linear-gradient(135deg, rgba(255, 0, 102, 0.9), rgba(180, 0, 80, 0.9))', boxShadow: '0 0 30px rgba(255, 0, 102, 0.5)' }}>
          <CheckCircle2 size={20} className="text-white" />
          <span className="font-black text-sm uppercase tracking-wider text-white">{notification}</span>
        </div>
      )}

      {/* OAuth Loading Overlay */}
      {isOAuthLoading && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1a0a0a 0%, #2d0a0a 50%, #0d0d1a 100%)' }}>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ border: '4px solid rgba(255, 0, 102, 0.3)', borderTop: '4px solid #ff0066', animation: 'spin 1s linear infinite' }}></div>
            <p className="text-pink-400 font-black text-lg uppercase tracking-wider">Authenticating...</p>
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center" style={{ background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(8px)' }}>
          <GlassCard glow className="max-w-md w-full mx-4 relative animate-in fade-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={closeForgotPasswordModal}
              className="absolute top-4 right-4 text-pink-300/60 hover:text-pink-300 transition-colors"
            >
              <X size={20} />
            </button>

            {!forgotPasswordSuccess ? (
              <>
                {/* Header */}
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg, rgba(255, 0, 102, 0.3), rgba(180, 0, 80, 0.2))', border: '2px solid rgba(255, 0, 102, 0.5)' }}>
                    <Mail className="text-pink-400" size={28} />
                  </div>
                  <GradientHeading size="md">Reset Password</GradientHeading>
                  <p className="text-sm text-pink-300/60 mt-2">
                    Enter your email address and we'll send you a link to reset your password.
                  </p>
                </div>

                {/* Error Message */}
                {forgotPasswordError && (
                  <div className="mb-4 p-3 rounded-lg flex items-center gap-2" style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                    <AlertCircle size={18} className="text-red-400" />
                    <span className="text-sm font-medium text-red-300">{forgotPasswordError}</span>
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <NeonInput
                    type="email"
                    label="Email Address"
                    icon={<Mail size={18} />}
                    placeholder="your@email.com"
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    autoFocus
                    disabled={forgotPasswordLoading}
                  />

                  <NeonButton type="submit" fullWidth variant="primary" disabled={forgotPasswordLoading}>
                    {forgotPasswordLoading ? (
                      <><Loader2 className="animate-spin" size={18} /> Sending...</>
                    ) : (
                      'Send Reset Link'
                    )}
                  </NeonButton>
                </form>

                {/* Back to Login */}
                <div className="mt-4 text-center">
                  <button 
                    onClick={closeForgotPasswordModal}
                    className="text-xs font-black uppercase text-pink-300/60 hover:text-pink-300 transition-colors"
                  >
                    Back to Login
                  </button>
                </div>
              </>
            ) : (
              /* Success State */
              <div className="text-center py-4">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-300" style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(22, 163, 74, 0.2))', border: '2px solid rgba(34, 197, 94, 0.5)', boxShadow: '0 0 30px rgba(34, 197, 94, 0.3)' }}>
                  <CheckCircle2 className="text-green-400" size={40} />
                </div>
                <GradientHeading size="lg">Email Sent!</GradientHeading>
                <p className="text-sm text-pink-300/70 mt-4 mb-4">
                  We've sent a password reset link to<br />
                  <span className="font-black text-pink-300">{forgotPasswordEmail}</span>
                </p>
                <p className="text-xs text-pink-300/50 mb-6">
                  Check your inbox and follow the instructions to reset your password. 
                  If you don't see the email, check your spam folder.
                </p>
                <NeonButton onClick={closeForgotPasswordModal} fullWidth variant="secondary">
                  Back to Login
                </NeonButton>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {!isOAuthLoading && (
      <div className="w-full flex flex-col flex-1 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-6 lg:px-12 py-4" style={{ borderBottom: '1px solid rgba(255, 0, 102, 0.2)' }}>
          <button 
            onClick={() => setStatus(AuctionStatus.HOME)}
            className="flex items-center gap-3 px-5 py-3 rounded-full transition-all font-bold"
            style={{ background: 'linear-gradient(135deg, rgba(255, 0, 102, 0.15), rgba(180, 0, 80, 0.1))', border: '1px solid rgba(255, 0, 102, 0.3)' }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 0, 102, 0.25), rgba(180, 0, 80, 0.2))'; e.currentTarget.style.boxShadow = '0 0 20px rgba(255, 0, 102, 0.3)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 0, 102, 0.15), rgba(180, 0, 80, 0.1))'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <ArrowLeft size={18} className="text-pink-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-300">Back</span>
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-2xl overflow-hidden" style={{ border: '2px solid rgba(255, 0, 102, 0.5)', boxShadow: '0 0 15px rgba(255, 0, 102, 0.3)' }}>
              <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <h2 className="text-lg font-display font-black tracking-widest uppercase leading-none" style={{ background: 'linear-gradient(135deg, #ff0066, #ff4d94, #ff0066)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>HypeHammer</h2>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-y-auto px-6 lg:px-12 py-6 smooth-scroll max-h-[calc(100vh-120px)]">
          {isLogin ? (
            // LOGIN VIEW
            <>
              <div className="text-center mb-5">
                <GradientHeading size="xl">Welcome Back</GradientHeading>
                <p className="text-sm text-pink-300/70 uppercase tracking-wider mt-2 mb-4">
                  Access your auction dashboard
                </p>
                <p className="text-xs text-pink-300/50">
                  New to HypeHammer?{' '}
                  <button 
                    onClick={() => setIsLogin(false)}
                    className="text-pink-400 font-black hover:text-pink-300 transition-colors"
                  >
                    Sign up here
                  </button>
                </p>
              </div>

              <form onSubmit={handleEmailAuth} className="max-w-7xl mx-auto w-full space-y-4">
                {/* Email and Password Section - Two Columns */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <NeonInput
                    type="email"
                    label="Email Address *"
                    icon={<Mail size={18} />}
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-pink-400 tracking-wider">
                      Password *
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-400/60" size={18} />
                      <input 
                        type={showPassword ? 'text' : 'password'}
                        className="w-full rounded-lg pl-12 pr-12 py-3 text-pink-100 outline-none placeholder-pink-300/40 text-sm transition-all"
                        style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 0, 102, 0.6)'; e.currentTarget.style.boxShadow = '0 0 15px rgba(255, 0, 102, 0.2)'; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 0, 102, 0.3)'; e.currentTarget.style.boxShadow = 'none'; }}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-pink-400/60 hover:text-pink-400 transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button 
                    type="button"
                    onClick={() => {
                      setForgotPasswordEmail(email); // Pre-fill with login email if entered
                      setShowForgotPassword(true);
                    }}
                    className="text-xs font-black uppercase text-pink-400 hover:text-pink-300 transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>

                <NeonButton type="submit" fullWidth variant="primary">
                  Login to Dashboard
                </NeonButton>

                {/* Or Divider */}
                <div className="flex items-center gap-4 my-4">
                  <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255, 0, 102, 0.3), transparent)' }}></div>
                  <span className="text-xs font-black uppercase text-pink-300/60 tracking-widest">Or Continue With</span>
                  <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255, 0, 102, 0.3), transparent)' }}></div>
                </div>

                {/* OAuth Options at Bottom */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <button 
                    type="button"
                    onClick={() => handleOAuthLogin('google')}
                    className="w-full py-3 rounded-lg text-pink-100 transition-all flex items-center justify-center gap-3 group"
                    style={{ background: 'linear-gradient(135deg, rgba(255, 0, 102, 0.1), rgba(180, 0, 80, 0.05))', border: '1px solid rgba(255, 0, 102, 0.3)' }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 0, 102, 0.2), rgba(180, 0, 80, 0.1))'; e.currentTarget.style.boxShadow = '0 0 15px rgba(255, 0, 102, 0.2)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 0, 102, 0.1), rgba(180, 0, 80, 0.05))'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #ff0066, #ff4d94)' }}>
                      <Chrome size={14} className="text-white" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-wider text-pink-300">Google</span>
                  </button>

                  <button 
                    type="button"
                    onClick={() => handleOAuthLogin('github')}
                    className="w-full py-3 rounded-lg text-pink-100 transition-all flex items-center justify-center gap-3 group"
                    style={{ background: 'linear-gradient(135deg, rgba(255, 0, 102, 0.1), rgba(180, 0, 80, 0.05))', border: '1px solid rgba(255, 0, 102, 0.3)' }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 0, 102, 0.2), rgba(180, 0, 80, 0.1))'; e.currentTarget.style.boxShadow = '0 0 15px rgba(255, 0, 102, 0.2)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 0, 102, 0.1), rgba(180, 0, 80, 0.05))'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <Github size={18} className="text-pink-400" />
                    <span className="text-xs font-black uppercase tracking-wider text-pink-300">GitHub</span>
                  </button>
                </div>
              </form>
            </>
          ) : (
            // SIGNUP VIEW
            <>
              <div className="text-center mb-5">
                <GradientHeading size="xl">Create Account</GradientHeading>
                <p className="text-sm text-pink-300/70 uppercase tracking-wider mt-2 mb-4">
                  Join the auction revolution
                </p>
                <p className="text-xs text-pink-300/50">
                  Already have an account?{' '}
                  <button 
                    onClick={() => setIsLogin(true)}
                    className="text-pink-400 font-black hover:text-pink-300 transition-colors"
                  >
                    Login here
                  </button>
                </p>
              </div>

              <form onSubmit={handleEmailAuth} className="max-w-7xl mx-auto w-full space-y-4">
              
              {/* Role Selection - Only for Signup */}
              {!isLogin && (
                <div className="space-y-3">
                  <label className="text-xs font-black uppercase text-pink-400 tracking-wider">
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
                        className="p-3 rounded-lg transition-all"
                        style={{ 
                          background: selectedRole === role 
                            ? 'linear-gradient(135deg, rgba(255, 0, 102, 0.25), rgba(180, 0, 80, 0.15))' 
                            : 'linear-gradient(135deg, rgba(255, 0, 102, 0.08), rgba(180, 0, 80, 0.05))',
                          border: selectedRole === role 
                            ? '2px solid rgba(255, 0, 102, 0.6)' 
                            : '1px solid rgba(255, 0, 102, 0.25)',
                          boxShadow: selectedRole === role ? '0 0 20px rgba(255, 0, 102, 0.3)' : 'none'
                        }}
                      >
                        <Icon className={`w-6 h-6 mx-auto mb-1 ${
                          selectedRole === role ? 'text-pink-400' : 'text-pink-300/60'
                        }`} />
                        <p className={`text-[9px] font-black uppercase text-center ${selectedRole === role ? 'text-pink-300' : 'text-pink-300/60'}`}>{label}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!isLogin && (
                <>
                  {/* Three Column Layout for Basic Fields */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <NeonInput
                      type="text"
                      label="Full Name *"
                      icon={<User size={18} />}
                      placeholder="Enter your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />

                    <NeonInput
                      type="tel"
                      label="Phone Number *"
                      icon={<Phone size={18} />}
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />

                    <NeonInput
                      type="text"
                      label="Username *"
                      icon={<User size={18} />}
                      placeholder="Choose a username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-pink-400 tracking-wider">
                      Profile Photo
                    </label>
                    <div className="relative">
                      <Image className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-400/60" size={18} />
                      <input 
                        type="file"
                        accept="image/*"
                        className="w-full rounded-lg px-4 py-3 pl-12 text-pink-100 outline-none placeholder-pink-300/40 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:text-white"
                        style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
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
                    <GlassCard className="space-y-3">
                      <h3 className="text-sm font-black uppercase text-pink-400 mb-3">Admin Details</h3>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <NeonInput
                          type="text"
                          label="Organization / Tournament Name *"
                          icon={<Building2 size={18} />}
                          placeholder="e.g., National Sports League"
                          value={organizationName}
                          onChange={(e) => setOrganizationName(e.target.value)}
                          required
                        />
                        
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-pink-400 tracking-wider">
                            Designation *
                          </label>
                          <select 
                            value={designation}
                            onChange={(e) => setDesignation(e.target.value)}
                            className="w-full rounded-lg px-4 py-3 text-pink-100 outline-none text-sm"
                            style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
                            required
                          >
                            <option value="" className="bg-[#1a0a0a] text-pink-300">Select designation</option>
                            <option value="admin" className="bg-[#1a0a0a] text-pink-300">Admin</option>
                            <option value="super-admin" className="bg-[#1a0a0a] text-pink-300">Super Admin</option>
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
                          <label className="text-xs font-black uppercase text-pink-400 tracking-wider">
                            Government ID *
                          </label>
                          <div className="relative">
                            <Upload className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-400/60" size={18} />
                            <input 
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              className="w-full rounded-lg px-4 py-3 pl-12 text-pink-100 outline-none text-sm"
                              style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
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
                        <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg transition-all" style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}>
                          <input 
                            type="checkbox"
                            checked={twoFactorEnabled}
                            onChange={(e) => setTwoFactorEnabled(e.target.checked)}
                            className="w-4 h-4 rounded accent-pink-500"
                          />
                          <span className="text-xs text-pink-300">Enable 2FA / OTP Authentication</span>
                        </label>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-pink-400 tracking-wider">
                          Admin Permissions *
                        </label>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                          {['Manage Users', 'Manage Auction', 'Control Budget', 'View Reports', 'System Settings', 'Approve Registrations'].map((perm) => (
                            <label key={perm} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg transition-all" style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}>
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
                                className="w-4 h-4 rounded accent-pink-500"
                              />
                              <span className="text-xs text-pink-300">{perm}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </GlassCard>
                  )}

                  {/* Auctioneer Specific Fields */}
                  {selectedRole === UserRole.AUCTIONEER && (
                    <GlassCard className="space-y-3">
                      <h3 className="text-sm font-black uppercase text-pink-400 mb-3">Auctioneer Details</h3>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <NeonInput
                          type="text"
                          label="Auctioneer ID / License"
                          icon={<IdCard size={18} />}
                          placeholder="e.g., IAA-2024-001"
                          value={auctioneerLicense}
                          onChange={(e) => setAuctioneerLicense(e.target.value)}
                        />
                        
                        <NeonInput
                          type="text"
                          label="Years of Experience *"
                          icon={<TrendingUp size={18} />}
                          placeholder="e.g., 5 years in cricket auctions"
                          value={auctioneerExperience}
                          onChange={(e) => setAuctioneerExperience(e.target.value)}
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <NeonInput
                          type="text"
                          label="Languages Known"
                          icon={<Globe size={18} />}
                          placeholder="e.g., English, Hindi, Tamil"
                          value={languagesKnown}
                          onChange={(e) => setLanguagesKnown(e.target.value)}
                        />

                        <NeonInput
                          type="text"
                          label="Previous Auctions"
                          placeholder="e.g., IPL 2023, PKL 2024"
                          value={previousAuctions}
                          onChange={(e) => setPreviousAuctions(e.target.value)}
                        />
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-pink-400 tracking-wider">
                            Government ID Upload *
                          </label>
                          <div className="relative">
                            <Upload className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-400/60" size={18} />
                            <input 
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              className="w-full rounded-lg px-4 py-3 pl-12 text-pink-100 outline-none text-sm"
                              style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
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
                          <label className="text-xs font-black uppercase text-pink-400 tracking-wider">
                            Assigned Auction Event
                          </label>
                          <input 
                            type="text"
                            className="w-full rounded-lg px-4 py-3 text-pink-100 outline-none placeholder-pink-300/40 text-sm"
                            style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
                            placeholder="e.g., Cricket Premier League 2026"
                            value={assignedAuctionEvent}
                            onChange={(e) => setAssignedAuctionEvent(e.target.value)}
                          />
                        </div>
                      </div>
                    </GlassCard>
                  )}

                  {/* Team Rep Specific Fields */}
                  {selectedRole === UserRole.TEAM_REP && (
                    <GlassCard className="space-y-3">
                      <h3 className="text-sm font-black uppercase text-pink-400 mb-3">Team Details</h3>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <NeonInput
                          type="text"
                          label="Team Name *"
                          icon={<Users size={18} />}
                          placeholder="e.g., Mumbai Tigers"
                          value={teamName}
                          onChange={(e) => setTeamName(e.target.value)}
                          required
                        />

                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-pink-400 tracking-wider">
                            Team Short Code *
                          </label>
                          <input 
                            type="text"
                            maxLength={5}
                            className="w-full rounded-lg px-4 py-3 text-pink-100 outline-none placeholder-pink-300/40 text-sm uppercase"
                            style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
                            placeholder="e.g., MT, RCB"
                            value={teamShortCode}
                            onChange={(e) => setTeamShortCode(e.target.value.toUpperCase())}
                            required
                          />
                        </div>

                        <NeonInput
                          type="text"
                          label="Home City / Region"
                          icon={<MapPin size={18} />}
                          placeholder="e.g., Mumbai"
                          value={homeCity}
                          onChange={(e) => setHomeCity(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-pink-400 tracking-wider">
                          Team Logo * 🛡️
                        </label>
                        <div className="relative">
                          <Upload className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-400/60" size={18} />
                          <input 
                            type="file"
                            accept="image/*"
                            className="w-full rounded-lg px-4 py-3 pl-12 text-pink-100 outline-none text-sm"
                            style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
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

                      <h4 className="text-xs font-black uppercase text-pink-400 mt-4 mb-2">Team Representative Info</h4>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <NeonInput
                          type="text"
                          label="Rep Full Name *"
                          placeholder="Representative's name"
                          value={repFullName}
                          onChange={(e) => setRepFullName(e.target.value)}
                          required
                        />

                        <NeonInput
                          type="email"
                          label="Rep Email *"
                          placeholder="rep@email.com"
                          value={repEmail}
                          onChange={(e) => setRepEmail(e.target.value)}
                          required
                        />

                        <NeonInput
                          type="tel"
                          label="Rep Mobile *"
                          placeholder="+91 98765 43210"
                          value={repMobile}
                          onChange={(e) => setRepMobile(e.target.value)}
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-pink-400 tracking-wider">
                            Rep Role *
                          </label>
                          <select 
                            value={repRole}
                            onChange={(e) => setRepRole(e.target.value)}
                            className="w-full rounded-lg px-4 py-3 text-pink-100 outline-none text-sm"
                            style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
                            required
                          >
                            <option value="" className="bg-[#1a0a0a] text-pink-300">Select role</option>
                            <option value="owner" className="bg-[#1a0a0a] text-pink-300">Owner</option>
                            <option value="manager" className="bg-[#1a0a0a] text-pink-300">Manager</option>
                            <option value="captain" className="bg-[#1a0a0a] text-pink-300">Captain</option>
                            <option value="scout" className="bg-[#1a0a0a] text-pink-300">Scout</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-pink-400 tracking-wider">
                            Rep Photo 📸
                          </label>
                          <input 
                            type="file"
                            accept="image/*"
                            className="w-full rounded-lg px-4 py-3 text-pink-100 outline-none text-sm"
                            style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
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
                          <label className="text-xs font-black uppercase text-pink-400 tracking-wider">
                            Max Squad Size
                          </label>
                          <input 
                            type="number"
                            className="w-full rounded-lg px-4 py-3 text-pink-100 outline-none placeholder-pink-300/40 text-sm"
                            style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
                            placeholder="e.g., 25"
                            value={maxSquadSize}
                            onChange={(e) => setMaxSquadSize(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-pink-400 tracking-wider">
                            Authorization Letter (PDF)
                          </label>
                          <input 
                            type="file"
                            accept=".pdf"
                            className="w-full rounded-lg px-4 py-3 text-pink-100 outline-none text-sm"
                            style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setAuthorizationLetter(file.name);
                              }
                            }}
                          />
                        </div>
                      </div>
                    </GlassCard>
                  )}

                  {/* Player Specific Fields */}
                  {selectedRole === UserRole.PLAYER && (
                    <GlassCard className="space-y-3">
                      <h3 className="text-sm font-black uppercase text-pink-400 mb-3">Player Details</h3>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-pink-400 tracking-wider">
                            Date of Birth *
                          </label>
                          <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-400/60" size={18} />
                            <input 
                              type="date"
                              className="w-full rounded-lg px-4 py-3 pl-12 text-pink-100 outline-none text-sm"
                              style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
                              value={dateOfBirth}
                              onChange={(e) => setDateOfBirth(e.target.value)}
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-pink-400 tracking-wider">
                            Gender *
                          </label>
                          <select 
                            value={gender}
                            onChange={(e) => setGender(e.target.value)}
                            className="w-full rounded-lg px-4 py-3 text-pink-100 outline-none text-sm"
                            style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
                            required
                          >
                            <option value="" className="bg-[#1a0a0a] text-pink-300">Select gender</option>
                            <option value="male" className="bg-[#1a0a0a] text-pink-300">Male</option>
                            <option value="female" className="bg-[#1a0a0a] text-pink-300">Female</option>
                            <option value="other" className="bg-[#1a0a0a] text-pink-300">Other</option>
                          </select>
                        </div>

                        <NeonInput
                          type="text"
                          label="Nationality *"
                          icon={<Globe size={18} />}
                          placeholder="e.g., Indian"
                          value={playerNationality}
                          onChange={(e) => setPlayerNationality(e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-pink-400 tracking-wider">
                          Player Photo * 📸
                        </label>
                        <div className="relative">
                          <Upload className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-400/60" size={18} />
                          <input 
                            type="file"
                            accept="image/*"
                            className="w-full rounded-lg px-4 py-3 pl-12 text-pink-100 outline-none text-sm"
                            style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
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

                      <h4 className="text-xs font-black uppercase text-pink-400 mt-4 mb-2">Contact Information</h4>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <NeonInput
                          type="email"
                          label="Contact Email *"
                          placeholder="player@email.com"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          required
                        />

                        <NeonInput
                          type="tel"
                          label="Contact Mobile *"
                          placeholder="+91 98765 43210"
                          value={contactMobile}
                          onChange={(e) => setContactMobile(e.target.value)}
                          required
                        />

                        <NeonInput
                          type="text"
                          label="City"
                          placeholder="e.g., Mumbai"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                        />
                      </div>

                      <NeonInput
                        type="text"
                        label="State"
                        placeholder="e.g., Maharashtra"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                      />

                      <h4 className="text-xs font-black uppercase text-pink-400 mt-4 mb-2">Playing Details</h4>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-pink-400 tracking-wider">
                            Sport Type *
                          </label>
                          <select 
                            value={playerSport}
                            onChange={(e) => setPlayerSport(e.target.value as SportType)}
                            className="w-full rounded-lg px-4 py-3 text-pink-100 outline-none text-sm"
                            style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
                            required
                          >
                            {Object.values(SportType).map(sport => (
                              <option key={sport} value={sport} className="bg-[#1a0a0a] text-pink-300">{sport}</option>
                            ))}
                          </select>
                        </div>

                        <NeonInput
                          type="text"
                          label="Playing Role *"
                          placeholder="e.g., All-Rounder, Striker, Raider"
                          value={playerRole}
                          onChange={(e) => setPlayerRole(e.target.value)}
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <NeonInput
                          type="text"
                          label="Batting Style"
                          placeholder="e.g., Right-hand, Left-hand"
                          value={battingStyle}
                          onChange={(e) => setBattingStyle(e.target.value)}
                        />

                        <NeonInput
                          type="text"
                          label="Bowling Style"
                          placeholder="e.g., Right-arm Fast, Spin"
                          value={bowlingStyle}
                          onChange={(e) => setBowlingStyle(e.target.value)}
                        />
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-pink-400 tracking-wider">
                            Experience Level
                          </label>
                          <select 
                            value={experienceLevel}
                            onChange={(e) => setExperienceLevel(e.target.value)}
                            className="w-full rounded-lg px-4 py-3 text-pink-100 outline-none text-sm"
                            style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
                          >
                            <option value="" className="bg-[#1a0a0a] text-pink-300">Select level</option>
                            <option value="beginner" className="bg-[#1a0a0a] text-pink-300">Beginner</option>
                            <option value="intermediate" className="bg-[#1a0a0a] text-pink-300">Intermediate</option>
                            <option value="advanced" className="bg-[#1a0a0a] text-pink-300">Advanced</option>
                            <option value="professional" className="bg-[#1a0a0a] text-pink-300">Professional</option>
                            <option value="international" className="bg-[#1a0a0a] text-pink-300">International</option>
                          </select>
                        </div>

                        <NeonInput
                          type="text"
                          label="Previous Teams"
                          placeholder="e.g., CSK, Mumbai Indians"
                          value={previousTeams}
                          onChange={(e) => setPreviousTeams(e.target.value)}
                        />
                      </div>

                      <h4 className="text-xs font-black uppercase text-pink-400 mt-4 mb-2">Auction Details</h4>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <NeonInput
                          type="number"
                          label="Base Price"
                          placeholder="e.g., 50000"
                          value={basePrice}
                          onChange={(e) => setBasePrice(e.target.value)}
                        />

                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-pink-400 tracking-wider">
                            Player Category
                          </label>
                          <select 
                            value={playerCategory}
                            onChange={(e) => setPlayerCategory(e.target.value)}
                            className="w-full rounded-lg px-4 py-3 text-pink-100 outline-none text-sm"
                            style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
                          >
                            <option value="" className="bg-[#1a0a0a] text-pink-300">Select category</option>
                            <option value="marquee" className="bg-[#1a0a0a] text-pink-300">Marquee</option>
                            <option value="category-a" className="bg-[#1a0a0a] text-pink-300">Category A</option>
                            <option value="category-b" className="bg-[#1a0a0a] text-pink-300">Category B</option>
                            <option value="category-c" className="bg-[#1a0a0a] text-pink-300">Category C</option>
                            <option value="uncapped" className="bg-[#1a0a0a] text-pink-300">Uncapped</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-pink-400 tracking-wider">
                            Availability Status *
                          </label>
                          <select 
                            value={availabilityStatus}
                            onChange={(e) => setAvailabilityStatus(e.target.value)}
                            className="w-full rounded-lg px-4 py-3 text-pink-100 outline-none text-sm"
                            style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
                            required
                          >
                            <option value="available" className="bg-[#1a0a0a] text-pink-300">Available</option>
                            <option value="partial" className="bg-[#1a0a0a] text-pink-300">Partially Available</option>
                            <option value="unavailable" className="bg-[#1a0a0a] text-pink-300">Unavailable</option>
                          </select>
                        </div>
                      </div>

                      <h4 className="text-xs font-black uppercase text-pink-400 mt-4 mb-2">Verification</h4>
                      
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-pink-400 tracking-wider">
                          Govt ID / Sports ID *
                        </label>
                        <div className="relative">
                          <Upload className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-400/60" size={18} />
                          <input 
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="w-full rounded-lg px-4 py-3 pl-12 text-pink-100 outline-none text-sm"
                            style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
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
                        <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg transition-all" style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}>
                          <input 
                            type="checkbox"
                            checked={consentGiven}
                            onChange={(e) => setConsentGiven(e.target.checked)}
                            className="w-4 h-4 rounded accent-pink-500"
                            required
                          />
                          <span className="text-xs text-pink-300">I consent to participate in the auction and accept all terms & conditions *</span>
                        </label>
                      </div>
                    </GlassCard>
                  )}

                  {/* Guest Specific Fields */}
                  {selectedRole === UserRole.GUEST && (
                    <GlassCard className="space-y-3">
                      <h3 className="text-sm font-black uppercase text-pink-400 mb-3">Guest / Viewer Details</h3>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <NeonInput
                          type="text"
                          label="Organization"
                          icon={<Building2 size={18} />}
                          placeholder="e.g., Sports Media Network"
                          value={guestOrganization}
                          onChange={(e) => setGuestOrganization(e.target.value)}
                        />
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-pink-400 tracking-wider">
                            Guest Type
                          </label>
                          <select 
                            value={guestType}
                            onChange={(e) => setGuestType(e.target.value)}
                            className="w-full rounded-lg px-4 py-3 text-pink-100 outline-none text-sm"
                            style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
                          >
                            <option value="" className="bg-[#1a0a0a] text-pink-300">Select guest type</option>
                            <option value="media" className="bg-[#1a0a0a] text-pink-300">Media</option>
                            <option value="sponsor" className="bg-[#1a0a0a] text-pink-300">Sponsor</option>
                            <option value="dignitary" className="bg-[#1a0a0a] text-pink-300">Dignitary</option>
                            <option value="observer" className="bg-[#1a0a0a] text-pink-300">Observer</option>
                            <option value="fan" className="bg-[#1a0a0a] text-pink-300">Fan</option>
                          </select>
                        </div>
                      </div>

                      <NeonInput
                        type="text"
                        label="Favorite Team"
                        icon={<Users size={18} />}
                        placeholder="e.g., Mumbai Tigers"
                        value={favoriteTeam}
                        onChange={(e) => setFavoriteTeam(e.target.value)}
                      />

                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg transition-all" style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}>
                          <input 
                            type="checkbox"
                            checked={notificationsEnabled}
                            onChange={(e) => setNotificationsEnabled(e.target.checked)}
                            className="w-4 h-4 rounded accent-pink-500"
                          />
                          <span className="text-xs text-pink-300">Enable notifications for auction updates</span>
                        </label>
                      </div>

                      <div className="p-3 rounded-lg" style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                        <p className="text-[10px] text-blue-400 uppercase font-black">Note:</p>
                        <p className="text-xs text-pink-300/70 mt-1">Guests can watch the auction but cannot place bids or interact with players.</p>
                      </div>
                    </GlassCard>
                  )}
                </>
              )}

              {/* Email and Password Section - Two Columns */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <NeonInput
                  type="email"
                  label="Email Address *"
                  icon={<Mail size={18} />}
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-pink-400 tracking-wider">
                    Password *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-400/60" size={18} />
                    <input 
                      type={showPassword ? 'text' : 'password'}
                      className="w-full rounded-lg pl-12 pr-12 py-3 text-pink-100 outline-none placeholder-pink-300/40 text-sm transition-all"
                      style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 0, 102, 0.6)'; e.currentTarget.style.boxShadow = '0 0 15px rgba(255, 0, 102, 0.2)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 0, 102, 0.3)'; e.currentTarget.style.boxShadow = 'none'; }}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-pink-400/60 hover:text-pink-400 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              {!isLogin && (
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-pink-400 tracking-wider">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-400/60" size={18} />
                    <input 
                      type={showPassword ? 'text' : 'password'}
                      className="w-full rounded-lg pl-12 pr-4 py-3 text-pink-100 outline-none placeholder-pink-300/40 text-sm transition-all"
                      style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 0, 102, 0.6)'; e.currentTarget.style.boxShadow = '0 0 15px rgba(255, 0, 102, 0.2)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 0, 102, 0.3)'; e.currentTarget.style.boxShadow = 'none'; }}
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
                    className="text-[10px] font-black uppercase text-pink-400 hover:text-pink-300 transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              <NeonButton type="submit" fullWidth variant="primary" className="mt-3">
                {isLogin ? 'Login to Dashboard' : 'Create Account'}
              </NeonButton>

              {/* Or Divider */}
              <div className="flex items-center gap-4 my-4">
                <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255, 0, 102, 0.3), transparent)' }}></div>
                <span className="text-xs font-black uppercase text-pink-300/60 tracking-widest">Or Continue With</span>
                <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255, 0, 102, 0.3), transparent)' }}></div>
              </div>

              {/* OAuth Options at Bottom */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <button 
                  type="button"
                  onClick={() => handleOAuthLogin('google')}
                  className="w-full py-3 rounded-lg text-pink-100 transition-all flex items-center justify-center gap-3 group"
                  style={{ background: 'linear-gradient(135deg, rgba(255, 0, 102, 0.1), rgba(180, 0, 80, 0.05))', border: '1px solid rgba(255, 0, 102, 0.3)' }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 0, 102, 0.2), rgba(180, 0, 80, 0.1))'; e.currentTarget.style.boxShadow = '0 0 15px rgba(255, 0, 102, 0.2)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 0, 102, 0.1), rgba(180, 0, 80, 0.05))'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #ff0066, #ff4d94)' }}>
                    <Chrome size={14} className="text-white" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider text-pink-300">Google</span>
                </button>

                <button 
                  type="button"
                  onClick={() => handleOAuthLogin('github')}
                  className="w-full py-3 rounded-lg text-pink-100 transition-all flex items-center justify-center gap-3 group"
                  style={{ background: 'linear-gradient(135deg, rgba(255, 0, 102, 0.1), rgba(180, 0, 80, 0.05))', border: '1px solid rgba(255, 0, 102, 0.3)' }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 0, 102, 0.2), rgba(180, 0, 80, 0.1))'; e.currentTarget.style.boxShadow = '0 0 15px rgba(255, 0, 102, 0.2)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 0, 102, 0.1), rgba(180, 0, 80, 0.05))'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <Github size={18} className="text-pink-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-pink-300">GitHub</span>
                </button>
              </div>
            </form>
            </>
          )}
        </div>

        {/* Terms - Footer */}
        <div className="px-6 lg:px-12 py-4 text-center" style={{ borderTop: '1px solid rgba(255, 0, 102, 0.2)', background: 'rgba(255, 0, 102, 0.03)' }}>
          <p className="text-[9px] text-pink-300/50 uppercase tracking-wider">
            By continuing, you agree to our{' '}
            <span className="text-pink-400 cursor-pointer hover:text-pink-300">Terms of Service</span>
            {' '}and{' '}
            <span className="text-pink-400 cursor-pointer hover:text-pink-300">Privacy Policy</span>
          </p>
        </div>

        {/* Support Footer */}
        <div className="py-6 text-center">
          <p className="text-xs text-pink-300/50 font-medium">
            Support{' '}
            <span className="mx-2 text-pink-300/30">•</span>
            <a href="mailto:hypehammer.mail@gmail.com" className="text-pink-400/70 hover:text-pink-400 transition-colors">
              hypehammer.mail@gmail.com
            </a>
          </p>
        </div>
      </div>
      )}
    </NeonPageWrapper>

  );
};
