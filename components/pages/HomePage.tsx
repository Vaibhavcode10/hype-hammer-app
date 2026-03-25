import React, { useState } from 'react';
import { Eye,Lock,EyeOff,Play, HelpCircle, Trophy, LogIn, X, Mail, Loader2, AlertCircle, CheckCircle2, Activity, TrendingUp, Users } from 'lucide-react';
import { AuctionStatus, UserRole } from '../../types';
import { NeonDesignStyles, GlassCard, NeonButton, GradientHeading, NeonPageWrapper, NeonInput, StatBlock } from '../ui/NeonDesignSystem';

interface HomePageProps {
  setStatus: (status: AuctionStatus) => void;
  onLogin?: (user: { email: string; password: string; role: UserRole }) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ setStatus, onLogin }) => {
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.ADMIN);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [forgotPasswordError, setForgotPasswordError] = useState<string | null>(null);
  const [showOtpForm, setShowOtpForm] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [showNewPasswordForm, setShowNewPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    
    try {
      // Try Firebase API first
      const response = await fetch('https://us-central1-axilam.cloudfunctions.net/auction/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });

      if (response.ok) {
        const data = await response.json();
        const user = data.data.user;
        
        // Auto-detect role from Firebase user data
        // Email might be in different fields depending on user type
        const userEmail = user.email || user.organizerEmail || user.adminEmail || loginEmail;
        
        const authenticatedUser = {
          email: userEmail,
          password: loginPassword,
          role: user.role as UserRole,
        };
        
        setShowLoginModal(false);
        
        if (onLogin) {
          onLogin(authenticatedUser);
        } else {
          setStatus(AuctionStatus.MARKETPLACE);
        }
        setLoginLoading(false);
        return;
      } else {
        // Firebase returned error - stop loading but continue to fallback
        setLoginLoading(false);
      }
    } catch (err) {
      console.error('Firebase login error:', err);
      // Continue to localStorage fallback
    }

    // Fallback to localStorage for demo users
    const storedUsers = localStorage.getItem('hypehammer_users');
    
    if (!storedUsers) {
      setLoginError('No users found. Please register first or refresh the page to seed demo users.');
      setLoginLoading(false);
      return;
    }

    try {
      const users = JSON.parse(storedUsers);
      const user = users.find((u: any) => 
        u.email.toLowerCase() === loginEmail.toLowerCase() && 
        u.password === loginPassword
      );

      if (!user) {
        setLoginError('Invalid email or password. Please check your credentials and try again.');
        setLoginLoading(false);
        return;
      }

      // Auto-detect role from stored user data
      const authenticatedUser = {
        email: user.email,
        password: user.password,
        role: user.role as UserRole,
      };
      
      setShowLoginModal(false);
      setLoginLoading(false);
      
      if (onLogin) {
        onLogin(authenticatedUser);
      } else {
        setStatus(AuctionStatus.MARKETPLACE);
      }
    } catch (err) {
      setLoginError('Error validating credentials. Please try again.');
      setLoginLoading(false);
      console.error('Login error:', err);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!forgotPasswordEmail.trim()) {
      setForgotPasswordError('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forgotPasswordEmail)) {
      setForgotPasswordError('Please enter a valid email address');
      return;
    }

    setForgotPasswordLoading(true);
    setForgotPasswordError(null);

    try {
      // Check if user exists and send OTP
      const response = await fetch('https://us-central1-axilam.cloudfunctions.net/auction/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotPasswordEmail.trim() })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        // OTP sent, show OTP form
        setShowOtpForm(true);
        setForgotPasswordError(null);
      } else {
        setForgotPasswordError(data.error || 'No account found with this email address. Please sign up first.');
      }
    } catch (error: any) {
      console.error('Password reset check error:', error);
      setForgotPasswordError('Failed to send verification code. Please try again.');
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!otp.trim() || otp.length !== 6) {
      setForgotPasswordError('Please enter a valid 6-digit code');
      return;
    }

    setForgotPasswordLoading(true);
    setForgotPasswordError(null);

    try {
      const response = await fetch('https://us-central1-axilam.cloudfunctions.net/auction/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotPasswordEmail.trim(), otp: otp.trim() })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        // OTP verified, show new password form
        setOtpVerified(true);
        setShowOtpForm(false);
        setShowNewPasswordForm(true);
        setForgotPasswordError(null);
      } else {
        setForgotPasswordError(data.error || 'Invalid verification code. Please try again.');
      }
    } catch (error: any) {
      console.error('OTP verification error:', error);
      setForgotPasswordError('Failed to verify code. Please try again.');
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || !confirmNewPassword) {
      setForgotPasswordError('Please fill in all fields');
      return;
    }

    if (newPassword.length < 6) {
      setForgotPasswordError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setForgotPasswordError('Passwords do not match');
      return;
    }

    setForgotPasswordLoading(true);
    setForgotPasswordError(null);

    try {
      const response = await fetch('https://us-central1-axilam.cloudfunctions.net/auction/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: forgotPasswordEmail.trim(), 
          newPassword: newPassword,
          otp: otp.trim()
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setForgotPasswordSuccess(true);
        setShowNewPasswordForm(false);
      } else {
        setForgotPasswordError(data.error || 'Failed to reset password. Please try again.');
      }
    } catch (error: any) {
      console.error('Password reset error:', error);
      setForgotPasswordError('Failed to reset password. Please try again.');
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const closeForgotPasswordModal = () => {
    setShowForgotPassword(false);
    setForgotPasswordEmail('');
    setForgotPasswordSuccess(false);
    setForgotPasswordError(null);
    setShowOtpForm(false);
    setOtp('');
    setOtpVerified(false);
    setShowNewPasswordForm(false);
    setNewPassword('');
    setConfirmNewPassword('');
  };

  return (
    <NeonPageWrapper>
      <NeonDesignStyles />
      
      {/* Header with Logo and Navigation */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 md:px-8" style={{ background: 'linear-gradient(180deg, rgba(26, 10, 10, 0.95) 0%, rgba(26, 10, 10, 0.8) 60%, transparent 100%)', backdropFilter: 'blur(10px)' }}>
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
            <img src="/logo.jpg" alt="HypeHammer Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h2 className="text-sm font-black tracking-widest text-white uppercase leading-none">HypeHammer</h2>
            <p className="text-[8px] font-semibold text-pink-400/70 uppercase tracking-[0.2em] mt-0.5">Sports Arena</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <NeonButton 
            variant="primary"
            size="sm"
            icon={<Play size={14} fill="currentColor" />}
            onClick={() => setStatus(AuctionStatus.MARKETPLACE)} 
          >
            Explore Auctions
          </NeonButton>
          <NeonButton 
            variant="outline"
            size="sm"
            icon={<HelpCircle size={14} />}
            onClick={() => setStatus(AuctionStatus.HOW_IT_WORKS)} 
          >
            How It Works
          </NeonButton>
          <NeonButton 
            variant="secondary"
            size="sm"
            icon={<LogIn size={14} />}
            onClick={() => setShowLoginModal(true)} 
          >
            Login
          </NeonButton>
        </div>
      </div>

      {/* Hero Section */}
      <div className="hero-grid pt-16">
        {/* Left Side - Full Image with directional fade */}
        <div className="relative overflow-hidden">
          {/* Image - fully visible */}
          <img 
            src="/pic1.png" 
            alt="HypeHammer Auction Platform" 
            className="w-full h-full object-cover object-left"
            style={{ 
              transform: 'scale(1.02)',
              maskImage: 'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0.6) 75%, rgba(0,0,0,0) 100%)',
              WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0.6) 75%, rgba(0,0,0,0) 100%)'
            }}
          />
        </div>

        {/* Right Side - Text Content */}
        <div className="flex flex-col justify-center px-10 lg:px-16 py-16 lg:py-0">
          <div className="max-w-md space-y-7">
            

            {/* Main Heading with Crisp Neon Glow */}
            <h1 className="text-5xl lg:text-6xl xl:text-7xl font-black tracking-tight leading-[0.95] uppercase">
              <span className="text-white">WHERE TEAMS BID</span><br />
              <span className="neon-text-crisp">FOR PLAYERS</span>
            </h1>

            {/* Description */}
            <p className="text-base text-[#a8a8a8] font-normal leading-[1.9]" style={{ letterSpacing: '0.01em' }}>
              A live sports auction arena where teams bid, players rise, and champions are built.
            </p>

            {/* CTA Buttons with Gaming Glow */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <NeonButton 
                variant="primary"
                size="lg"
                icon={<Play size={18} fill="currentColor" />}
                onClick={() => setStatus(AuctionStatus.MARKETPLACE)} 
                className="gaming-btn"
              >
                Explore Auctions
              </NeonButton>
              <NeonButton 
                variant="secondary"
                size="lg"
                icon={<Trophy size={18} />}
                onClick={() => setStatus(AuctionStatus.ADMIN_REGISTRATION)} 
                className="gaming-btn"
              >
                Organize Your Season
              </NeonButton>
            </div>
            <p className="text-xs text-pink-300/50 font-semibold">Create and manage your own sports auction</p>
          </div>
        </div>
      </div>

      {/* Stats & Screenshots Container */}
      <div className="px-6 pb-16">
        

        {/* Platform Walkthrough - 4 Cinematic Rows */}
        <div className="max-w-7xl mx-auto w-full py-16 px-4">
          <h3 className="text-sm font-black uppercase tracking-[0.3em] text-pink-400/80 mb-20 text-center">Platform Walkthrough</h3>
          
          {/* 4 Alternating Rows */}
          <div className="flex flex-col gap-24">
            
            {/* ROW 1: Text Left / Image Right */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="flex flex-col justify-center space-y-6 px-4 lg:px-8">
                <h4 className="text-2xl lg:text-3xl font-black uppercase text-white leading-tight">Post-Auction Visibility</h4>
                <p className="text-lg text-[#a8a8a8] leading-relaxed">
                  View Players in Teams after auction and also during live auction once the player is sold
                </p>
                <div className="w-16 h-1 bg-gradient-to-r from-pink-500 to-transparent rounded-full"></div>
              </div>
              <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255, 0, 102, 0.2)' }}>
                <img 
                  src="/pic2.png" 
                  alt="Players in Teams View" 
                  className="w-full h-auto object-contain"
                />
              </div>
            </div>

            {/* ROW 2: Image Left / Text Right */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="rounded-2xl overflow-hidden order-2 lg:order-1" style={{ border: '1px solid rgba(255, 0, 102, 0.2)' }}>
                <img 
                  src="/pic3.png" 
                  alt="Registration System" 
                  className="w-full h-auto object-contain"
                />
              </div>
              <div className="flex flex-col justify-center space-y-6 px-4 lg:px-8 order-1 lg:order-2">
                <h4 className="text-2xl lg:text-3xl font-black uppercase text-white leading-tight">Complete Registration</h4>
                <p className="text-lg text-[#a8a8a8] leading-relaxed">
                  Register teams, players, auctioneers, and matches
                </p>
                <div className="w-16 h-1 bg-gradient-to-r from-pink-500 to-transparent rounded-full"></div>
              </div>
            </div>

            {/* ROW 3: Text Left / Image Right */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="flex flex-col justify-center space-y-6 px-4 lg:px-8">
                <h4 className="text-2xl lg:text-3xl font-black uppercase text-white leading-tight">Role-Based Dashboards</h4>
                <p className="text-lg text-[#a8a8a8] leading-relaxed">
                  Professional dashboards with complete insights for Admin, Auctioneer, and Guest roles
                </p>
                <div className="w-16 h-1 bg-gradient-to-r from-pink-500 to-transparent rounded-full"></div>
              </div>
              <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255, 0, 102, 0.2)' }}>
                <img 
                  src="/pic4.png" 
                  alt="Professional Dashboards" 
                  className="w-full h-auto object-contain"
                />
              </div>
            </div>

            {/* ROW 4: Image Left / Text Right */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="rounded-2xl overflow-hidden order-2 lg:order-1" style={{ border: '1px solid rgba(255, 0, 102, 0.2)' }}>
                <img 
                  src="/pic5.png" 
                  alt="Live Auction Room" 
                  className="w-full h-auto object-contain"
                />
              </div>
              <div className="flex flex-col justify-center space-y-6 px-4 lg:px-8 order-1 lg:order-2">
                <h4 className="text-2xl lg:text-3xl font-black uppercase text-white leading-tight">Live Auction Room</h4>
                <p className="text-lg text-[#a8a8a8] leading-relaxed">
                  Auctioneer's Live Room where the real-time bidding is conducted
                </p>
                <div className="w-16 h-1 bg-gradient-to-r from-pink-500 to-transparent rounded-full"></div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Brand Trust Line */}
      <div className="pb-8 text-center">
        <p className="text-xs text-pink-300/40 font-medium">
          Built for transparent, real-time sports auctions.
        </p>
      </div>

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

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] p-4" style={{ background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(8px)' }}>
          <GlassCard glow className="max-w-md w-full relative">
            <button 
              onClick={() => setShowLoginModal(false)} 
              className="absolute top-4 right-4 text-pink-300/60 hover:text-pink-300 transition-colors"
            >
              <X size={24} />
            </button>
            
            <div className="flex flex-col items-center mb-6">
              <div className="w-16 h-16 rounded-xl overflow-hidden mb-4" style={{ border: '2px solid rgba(255, 0, 102, 0.5)', boxShadow: '0 0 30px rgba(255, 0, 102, 0.3)' }}>
                <img src="/logo.jpg" alt="HypeHammer Logo" className="w-full h-full object-cover" />
              </div>
              <GradientHeading size="md">Login</GradientHeading>
              <p className="text-sm text-pink-300/60 mt-1">Access your account</p>
            </div>

          <form onSubmit={handleLogin} className="space-y-4">
  <NeonInput
    type="email"
    label="Email Address"
    icon={<Mail size={18} />}
    value={loginEmail}
    onChange={(e) => setLoginEmail(e.target.value)}
    placeholder="your.email@example.com"
    required
  />

  {/* Password with show/hide toggle */}
  <div className="space-y-2">
    <label className="text-xs font-black uppercase text-pink-400 tracking-wider">
      Password
    </label>
    <div className="relative">
      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-400/60" size={18} />
      <input
        type={showLoginPassword ? 'text' : 'password'}
        className="w-full rounded-lg pl-12 pr-12 py-3 text-pink-100 outline-none placeholder-pink-300/40 text-sm transition-all"
        style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
        onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 0, 102, 0.6)'; e.currentTarget.style.boxShadow = '0 0 15px rgba(255, 0, 102, 0.2)'; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 0, 102, 0.3)'; e.currentTarget.style.boxShadow = 'none'; }}
        placeholder="Enter your password"
        value={loginPassword}
        onChange={(e) => setLoginPassword(e.target.value)}
        required
      />
      <button
        type="button"
        onClick={() => setShowLoginPassword(!showLoginPassword)}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-pink-400/60 hover:text-pink-400 transition-colors"
      >
        {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  </div>

  {/* Error Message */}
  {loginError && (
    <div className="p-4 rounded-xl flex items-center gap-3" style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
      <AlertCircle size={18} className="text-red-400" />
      <p className="text-sm text-red-300 font-bold">{loginError}</p>
    </div>
  )}

  <div className="flex justify-end">
    <button
      type="button"
      onClick={() => {
        setForgotPasswordEmail(loginEmail);
        setShowForgotPassword(true);
      }}
      className="text-xs font-bold uppercase text-pink-400 hover:text-pink-300 transition-colors"
      disabled={loginLoading}
    >
      Forgot Password?
    </button>
  </div>

  {/* Login Button with Premium Loading State */}
  <button
    type="submit"
    disabled={loginLoading}
    className="relative w-full overflow-hidden rounded-xl py-4 font-black text-sm uppercase tracking-wider transition-all duration-300 disabled:cursor-not-allowed"
    style={{
      background: loginLoading 
        ? 'linear-gradient(135deg, rgba(75, 0, 50, 0.9), rgba(50, 0, 35, 0.9))'
        : 'linear-gradient(135deg, rgba(255, 0, 102, 0.8), rgba(249, 115, 22, 0.7))',
      border: '1px solid rgba(255, 0, 102, 0.5)',
      boxShadow: loginLoading 
        ? '0 0 20px rgba(255, 0, 102, 0.2)' 
        : '0 0 30px rgba(255, 0, 102, 0.4), inset 0 0 20px rgba(255, 0, 102, 0.1)',
      color: loginLoading ? 'rgba(255, 200, 220, 0.8)' : 'white'
    }}
  >
    {loginLoading && (
      <div 
        className="absolute inset-0 animate-pulse"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255, 0, 102, 0.3) 50%, transparent 100%)',
          animation: 'shimmer 1.5s ease-in-out infinite'
        }}
      />
    )}
    
    {loginLoading && (
      <div 
        className="absolute inset-0 rounded-xl"
        style={{
          border: '2px solid rgba(255, 0, 102, 0.6)',
          animation: 'pulse 1.5s ease-in-out infinite'
        }}
      />
    )}

    <div className="relative flex items-center justify-center gap-3">
      {loginLoading ? (
        <>
          <div className="relative">
            <Loader2 
              size={20} 
              className="animate-spin"
              style={{ 
                filter: 'drop-shadow(0 0 8px rgba(255, 0, 102, 1))',
                color: 'rgba(255, 150, 200, 1)'
              }} 
            />
            <div 
              className="absolute inset-0 rounded-full animate-ping"
              style={{
                border: '1px solid rgba(255, 0, 102, 0.5)',
                animationDuration: '1.5s'
              }}
            />
          </div>
          <span style={{ textShadow: '0 0 10px rgba(255, 0, 102, 0.8)' }}>
            Authenticating...
          </span>
        </>
      ) : (
        <span style={{ textShadow: '0 0 10px rgba(255, 255, 255, 0.3)' }}>
          Sign In
        </span>
      )}
    </div>
  </button>

  <div className="text-center text-sm text-pink-300/60 mt-4">
    Don't have an account?{' '}
    <button
      type="button"
      onClick={() => {
        setShowLoginModal(false);
        setStatus(AuctionStatus.MARKETPLACE);
      }}
      className="text-pink-400 hover:text-pink-300 font-bold"
    >
      Explore Auctions & Register
    </button>
  </div>
</form>
          </GlassCard>
        </div>
      )}

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(8px)' }}>
          <GlassCard glow className="max-w-md w-full mx-4 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={closeForgotPasswordModal}
              className="absolute top-4 right-4 text-pink-300/60 hover:text-pink-300 transition-colors"
            >
              <X size={20} />
            </button>

            {forgotPasswordSuccess ? (
              /* Success State */
              <div className="text-center py-4">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-300" style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(22, 163, 74, 0.2))', border: '2px solid rgba(34, 197, 94, 0.5)', boxShadow: '0 0 30px rgba(34, 197, 94, 0.3)' }}>
                  <CheckCircle2 className="text-green-400" size={40} />
                </div>
                <GradientHeading size="lg">Password Reset!</GradientHeading>
                <p className="text-sm text-pink-300/70 mt-4 mb-6">
                  Your password has been successfully reset for<br />
                  <span className="font-bold text-pink-300">{forgotPasswordEmail}</span>
                </p>
                <p className="text-xs text-pink-300/50 mb-6">
                  You can now login with your new password.
                </p>
                <NeonButton onClick={closeForgotPasswordModal} fullWidth variant="secondary">
                  Back to Login
                </NeonButton>
              </div>
            ) : showNewPasswordForm ? (
              /* Step 3: New Password Form */
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(22, 163, 74, 0.2))', border: '2px solid rgba(34, 197, 94, 0.5)' }}>
                    <CheckCircle2 className="text-green-400" size={28} />
                  </div>
                  <GradientHeading size="md">Set New Password</GradientHeading>
                  <p className="text-sm text-pink-300/60 mt-2">
                    Enter your new password for <span className="font-bold text-pink-300">{forgotPasswordEmail}</span>
                  </p>
                </div>

                {forgotPasswordError && (
                  <div className="mb-4 p-3 rounded-lg flex items-center gap-2" style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                    <AlertCircle size={18} className="text-red-400" />
                    <span className="text-sm font-medium text-red-300">{forgotPasswordError}</span>
                  </div>
                )}

                <form onSubmit={handleResetPassword} className="space-y-4">
                  <NeonInput
                    type="password"
                    label="New Password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoFocus
                    disabled={forgotPasswordLoading}
                  />
                  <NeonInput
                    type="password"
                    label="Confirm Password"
                    placeholder="Confirm new password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    disabled={forgotPasswordLoading}
                  />

                  <NeonButton type="submit" fullWidth variant="primary" disabled={forgotPasswordLoading}>
                    {forgotPasswordLoading ? (
                      <><Loader2 className="animate-spin" size={18} /> Resetting...</>
                    ) : (
                      'Reset Password'
                    )}
                  </NeonButton>
                </form>
              </>
            ) : showOtpForm ? (
              /* Step 2: OTP Verification Form */
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg, rgba(255, 0, 102, 0.3), rgba(180, 0, 80, 0.2))', border: '2px solid rgba(255, 0, 102, 0.5)' }}>
                    <Mail className="text-pink-400" size={28} />
                  </div>
                  <GradientHeading size="md">Verify Email</GradientHeading>
                  <p className="text-sm text-pink-300/60 mt-2">
                    We've sent a 6-digit code to<br />
                    <span className="font-bold text-pink-300">{forgotPasswordEmail}</span>
                  </p>
                </div>

                {forgotPasswordError && (
                  <div className="mb-4 p-3 rounded-lg flex items-center gap-2" style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                    <AlertCircle size={18} className="text-red-400" />
                    <span className="text-sm font-medium text-red-300">{forgotPasswordError}</span>
                  </div>
                )}

                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-black uppercase text-pink-300/70 tracking-wider">Verification Code</label>
                    <input 
                      type="text"
                      maxLength={6}
                      className="w-full px-4 py-4 rounded-xl text-center text-2xl font-bold tracking-[0.5em] uppercase outline-none transition-all text-white placeholder-pink-300/40"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255, 20, 100, 0.08), rgba(200, 50, 120, 0.05))',
                        border: '1px solid rgba(255, 0, 102, 0.2)'
                      }}
                      placeholder="000000"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      autoFocus
                      disabled={forgotPasswordLoading}
                    />
                    <p className="text-xs text-pink-300/50 text-center">
                      Check your email inbox and spam folder
                    </p>
                  </div>

                  <NeonButton type="submit" fullWidth variant="primary" disabled={forgotPasswordLoading || otp.length !== 6}>
                    {forgotPasswordLoading ? (
                      <><Loader2 className="animate-spin" size={18} /> Verifying...</>
                    ) : (
                      'Verify Code'
                    )}
                  </NeonButton>
                </form>

                <div className="mt-4 text-center space-y-2">
                  <button 
                    onClick={() => { setShowOtpForm(false); setOtp(''); setForgotPasswordError(null); }}
                    className="text-xs font-bold uppercase text-pink-300/60 hover:text-pink-300 transition-colors"
                  >
                    Change Email
                  </button>
                  <p className="text-xs text-pink-300/40">
                    Didn't receive the code?{' '}
                    <button onClick={handleForgotPassword} className="text-pink-400 hover:text-pink-300 font-bold" disabled={forgotPasswordLoading}>
                      Resend
                    </button>
                  </p>
                </div>
              </>
            ) : (
              /* Step 1: Email Entry Form */
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg, rgba(255, 0, 102, 0.3), rgba(180, 0, 80, 0.2))', border: '2px solid rgba(255, 0, 102, 0.5)' }}>
                    <Mail className="text-pink-400" size={28} />
                  </div>
                  <GradientHeading size="md">Reset Password</GradientHeading>
                  <p className="text-sm text-pink-300/60 mt-2">
                    Enter your email to receive a verification code.
                  </p>
                </div>

                {forgotPasswordError && (
                  <div className="mb-4 p-3 rounded-lg flex items-center gap-2" style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                    <AlertCircle size={18} className="text-red-400" />
                    <span className="text-sm font-medium text-red-300">{forgotPasswordError}</span>
                  </div>
                )}

                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <NeonInput
                    type="email"
                    label="Email Address"
                    icon={<Mail size={18} />}
                    placeholder="your.email@example.com"
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    autoFocus
                    disabled={forgotPasswordLoading}
                  />

                  <NeonButton type="submit" fullWidth variant="primary" disabled={forgotPasswordLoading}>
                    {forgotPasswordLoading ? (
                      <><Loader2 className="animate-spin" size={18} /> Sending Code...</>
                    ) : (
                      'Send Verification Code'
                    )}
                  </NeonButton>
                </form>

                <div className="mt-4 text-center">
                  <button 
                    onClick={closeForgotPasswordModal}
                    className="text-xs font-bold uppercase text-pink-300/60 hover:text-pink-300 transition-colors"
                  >
                    Back to Login
                  </button>
                </div>
              </>
            )}
          </GlassCard>
        </div>
      )}

    </NeonPageWrapper>
  );
};
