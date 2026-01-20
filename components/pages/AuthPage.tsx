import React, { useState } from 'react';
import { ArrowLeft, Mail, Lock, Github, Chrome, Eye, EyeOff, CheckCircle2, User, Gavel, Shield } from 'lucide-react';
import { AuctionStatus, UserRole } from '../../types';

interface AuthPageProps {
  setStatus: (status: AuctionStatus) => void;
  onLogin?: (userData: { name: string; email: string; avatar?: string; role: UserRole }) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ setStatus, onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.AUCTIONEER);
  const [notification, setNotification] = useState<string | null>(null);

  const handleEmailAuth = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setNotification('Please fill in all required fields');
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setNotification('Passwords do not match');
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    // Mock authentication - in production, this would call your backend
    const userData = {
      name: isLogin ? name || email.split('@')[0] : name,
      email: email,
      avatar: undefined,
      role: selectedRole
    };
    
    if (onLogin) {
      onLogin(userData);
    }
    
    setNotification(isLogin ? 'Login successful!' : 'Account created successfully!');
    setTimeout(() => {
      setNotification(null);
      // Route based on role
      if (selectedRole === UserRole.PLAYER) {
        setStatus(AuctionStatus.PLAYER_REGISTRATION);
      } else {
        setStatus(AuctionStatus.SETUP);
      }
    }, 1500);
  };

  const handleOAuthLogin = (provider: 'google' | 'github') => {
    // Mock OAuth - in production, this would redirect to OAuth provider
    const userData = {
      name: provider === 'google' ? 'Google User' : 'GitHub User',
      email: `user@${provider}.com`,
      avatar: undefined,
      role: selectedRole
    };
    
    if (onLogin) {
      onLogin(userData);
    }
    
    setNotification(`Connecting to ${provider === 'google' ? 'Google' : 'GitHub'}...`);
    setTimeout(() => {
      setNotification(null);
      // Route based on role
      if (selectedRole === UserRole.PLAYER) {
        setStatus(AuctionStatus.PLAYER_REGISTRATION);
      } else {
        setStatus(AuctionStatus.SETUP);
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#0d0a09] flex flex-col items-center justify-center p-4 lg:p-8 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1a1410_0%,_#0d0a09_100%)] pointer-events-none"></div>
      <div className="absolute top-20 left-20 w-96 h-96 bg-[#c5a059] opacity-5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-[#c5a059] opacity-5 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Notification */}
      {notification && (
        <div className="fixed top-8 right-8 z-[200] bg-[#c5a059] text-[#0d0a09] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-5">
          <CheckCircle2 size={20} />
          <span className="font-black text-sm uppercase tracking-wider">{notification}</span>
        </div>
      )}

      <div className="w-full max-w-6xl relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => setStatus(AuctionStatus.HOME)}
            className="flex items-center gap-3 bg-[#1a1410]/80 border border-[#c5a059]/20 backdrop-blur-xl px-5 py-3 rounded-full text-[#c5a059] hover:bg-[#c5a059] hover:text-[#0d0a09] transition-all shadow-lg"
          >
            <ArrowLeft size={18} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Back</span>
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-2xl overflow-hidden border-2 border-[#c5a059]">
              <img src="./logo.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <h2 className="text-lg font-display font-black tracking-widest gold-text uppercase leading-none">HypeHammer</h2>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-[#1a1410] border border-[#c5a059]/30 rounded-[3rem] p-8 lg:p-10 shadow-2xl">
          {/* Toggle Login/Signup */}
          <div className="flex gap-2 mb-8 bg-[#0d0a09] rounded-2xl p-1 border border-[#3d2f2b] max-w-md mx-auto">
            <button 
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 rounded-xl font-black uppercase text-[11px] tracking-wider transition-all ${
                isLogin 
                  ? 'bg-[#c5a059] text-[#0d0a09] shadow-lg' 
                  : 'text-[#b4a697] hover:text-[#f5f5dc]'
              }`}
            >
              Login
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 rounded-xl font-black uppercase text-[11px] tracking-wider transition-all ${
                !isLogin 
                  ? 'bg-[#c5a059] text-[#0d0a09] shadow-lg' 
                  : 'text-[#b4a697] hover:text-[#f5f5dc]'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Title */}
          <div className="text-center mb-10">
            <h1 className="text-3xl font-display font-black text-[#f5f5dc] uppercase tracking-tight mb-2">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-[11px] text-[#b4a697] uppercase tracking-wider">
              {isLogin ? 'Access your auction dashboard' : 'Join the auction revolution'}
            </p>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Left Side - Email Form */}
            <form onSubmit={handleEmailAuth} className="space-y-4">
            {/* Role Selection */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-[#c5a059] tracking-wider">
                Select Your Role
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRole(UserRole.AUCTIONEER)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    selectedRole === UserRole.AUCTIONEER
                      ? 'border-[#c5a059] bg-[#c5a059]/20'
                      : 'border-[#3d2f2b] bg-[#0d0a09] hover:border-[#c5a059]/50'
                  }`}
                >
                  <Gavel className="w-6 h-6 mx-auto mb-2 text-[#c5a059]" />
                  <p className="text-[9px] font-black uppercase text-center text-[#f5f5dc]">Auctioneer</p>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole(UserRole.PLAYER)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    selectedRole === UserRole.PLAYER
                      ? 'border-[#c5a059] bg-[#c5a059]/20'
                      : 'border-[#3d2f2b] bg-[#0d0a09] hover:border-[#c5a059]/50'
                  }`}
                >
                  <User className="w-6 h-6 mx-auto mb-2 text-[#c5a059]" />
                  <p className="text-[9px] font-black uppercase text-center text-[#f5f5dc]">Player</p>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole(UserRole.ADMIN)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    selectedRole === UserRole.ADMIN
                      ? 'border-[#c5a059] bg-[#c5a059]/20'
                      : 'border-[#3d2f2b] bg-[#0d0a09] hover:border-[#c5a059]/50'
                  }`}
                >
                  <Shield className="w-6 h-6 mx-auto mb-2 text-[#c5a059]" />
                  <p className="text-[9px] font-black uppercase text-center text-[#f5f5dc]">Admin</p>
                </button>
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[#c5a059] tracking-wider">
                  Full Name
                </label>
                <div className="relative">
                  <input 
                    type="text"
                    className="w-full bg-[#0d0a09] border border-[#3d2f2b] rounded-2xl px-5 py-4 pr-12 text-[#f5f5dc] outline-none focus:ring-1 ring-[#c5a059] placeholder-[#5c4742]"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-[#c5a059] tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-[#b4a697]" size={18} />
                <input 
                  type="email"
                  className="w-full bg-[#0d0a09] border border-[#3d2f2b] rounded-2xl pl-14 pr-5 py-4 text-[#f5f5dc] outline-none focus:ring-1 ring-[#c5a059] placeholder-[#5c4742]"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-[#c5a059] tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-[#b4a697]" size={18} />
                <input 
                  type={showPassword ? 'text' : 'password'}
                  className="w-full bg-[#0d0a09] border border-[#3d2f2b] rounded-2xl pl-14 pr-14 py-4 text-[#f5f5dc] outline-none focus:ring-1 ring-[#c5a059] placeholder-[#5c4742]"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-[#b4a697] hover:text-[#c5a059] transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[#c5a059] tracking-wider">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-[#b4a697]" size={18} />
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    className="w-full bg-[#0d0a09] border border-[#3d2f2b] rounded-2xl pl-14 pr-5 py-4 text-[#f5f5dc] outline-none focus:ring-1 ring-[#c5a059] placeholder-[#5c4742]"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            {isLogin && (
              <div className="flex justify-end">
                <button 
                  type="button"
                  className="text-[10px] font-black uppercase text-[#c5a059] hover:text-[#f5f5dc] transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            <button 
              type="submit"
              className="w-full py-4 gold-gradient rounded-2xl text-[#0d0a09] font-black uppercase tracking-wider text-sm shadow-2xl hover:brightness-110 transition-all"
            >
              {isLogin ? 'Login to Dashboard' : 'Create Account'}
            </button>
          </form>

          {/* Right Side - Vertical Divider & OAuth */}
          <div className="flex items-stretch gap-8">
            {/* Vertical Divider */}
            <div className="hidden lg:flex flex-col items-center gap-3 py-4">
              <div className="flex-1 w-px bg-[#3d2f2b]"></div>
              <span className="text-[9px] font-black uppercase text-[#b4a697] tracking-widest rotate-0">Or</span>
              <div className="flex-1 w-px bg-[#3d2f2b]"></div>
            </div>

            {/* Mobile Horizontal Divider */}
            <div className="lg:hidden flex items-center gap-4 my-6 col-span-full">
              <div className="flex-1 h-px bg-[#3d2f2b]"></div>
              <span className="text-[9px] font-black uppercase text-[#b4a697] tracking-widest">Or</span>
              <div className="flex-1 h-px bg-[#3d2f2b]"></div>
            </div>

            {/* OAuth Options */}
            <div className="flex flex-col justify-center space-y-4 flex-1">
              <div className="text-center mb-2">
                <p className="text-[10px] font-black uppercase text-[#b4a697] tracking-wider">Quick Sign In</p>
              </div>

              <button 
                onClick={() => handleOAuthLogin('google')}
                className="w-full py-4 bg-[#0d0a09] border border-[#c5a059]/20 rounded-2xl text-[#f5f5dc] hover:bg-[#c5a059]/10 hover:border-[#c5a059]/40 transition-all flex items-center justify-center gap-3 group"
              >
                <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                  <Chrome size={14} className="text-[#0d0a09]" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-wider">Continue with Google</span>
              </button>

              <button 
                onClick={() => handleOAuthLogin('github')}
                className="w-full py-4 bg-[#0d0a09] border border-[#c5a059]/20 rounded-2xl text-[#f5f5dc] hover:bg-[#c5a059]/10 hover:border-[#c5a059]/40 transition-all flex items-center justify-center gap-3 group"
              >
                <Github size={18} className="text-[#f5f5dc]" />
                <span className="text-[11px] font-black uppercase tracking-wider">Continue with GitHub</span>
              </button>

              <div className="mt-6 pt-6 border-t border-[#3d2f2b]">
                <p className="text-[10px] text-[#b4a697] text-center uppercase tracking-wider">
                  {isLogin ? "Don't have an account?" : 'Already have an account?'}
                  {' '}
                  <button 
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-[#c5a059] font-black hover:text-[#f5f5dc] transition-colors"
                  >
                    {isLogin ? 'Sign Up' : 'Login'}
                  </button>
                </p>
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* Terms */}
        <div className="mt-6 text-center">
          <p className="text-[9px] text-[#5c4742] uppercase tracking-wider">
            By continuing, you agree to our{' '}
            <span className="text-[#c5a059] cursor-pointer hover:text-[#f5f5dc]">Terms of Service</span>
            {' '}and{' '}
            <span className="text-[#c5a059] cursor-pointer hover:text-[#f5f5dc]">Privacy Policy</span>
          </p>
        </div>
      </div>
    </div>

  );
};
