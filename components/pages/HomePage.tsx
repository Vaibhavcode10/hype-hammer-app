import React, { useState } from 'react';
import { Play, HelpCircle, Gavel, Users, User, Eye, Trophy, LogIn, X } from 'lucide-react';
import { AuctionStatus, UserRole } from '../../types';

interface HomePageProps {
  setStatus: (status: AuctionStatus) => void;
  onLogin?: (user: { email: string; password: string; role: UserRole }) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ setStatus, onLogin }) => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.ADMIN);
  const [loginError, setLoginError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    try {
      // Try Firebase API first
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });

      if (response.ok) {
        const data = await response.json();
        const user = data.data.user;
        
        // Auto-detect role from Firebase user data
        const authenticatedUser = {
          email: user.email,
          password: loginPassword,
          role: user.role as UserRole,
        };
        
        setShowLoginModal(false);
        
        if (onLogin) {
          onLogin(authenticatedUser);
        } else {
          setStatus(AuctionStatus.MARKETPLACE);
        }
        return;
      }
    } catch (err) {
      console.error('Firebase login error:', err);
    }

    // Fallback to localStorage for demo users
    const storedUsers = localStorage.getItem('hypehammer_users');
    
    if (!storedUsers) {
      setLoginError('No users found. Please register first or refresh the page to seed demo users.');
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
        return;
      }

      // Auto-detect role from stored user data
      const authenticatedUser = {
        email: user.email,
        password: user.password,
        role: user.role as UserRole,
      };
      
      setShowLoginModal(false);
      
      if (onLogin) {
        onLogin(authenticatedUser);
      } else {
        setStatus(AuctionStatus.MARKETPLACE);
      }
    } catch (err) {
      setLoginError('Error validating credentials. Please try again.');
      console.error('Login error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-orange-50 flex flex-col overflow-hidden">
      {/* Header with Logo and How It Works */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-8 bg-gradient-to-b from-white/90 to-transparent backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-blue-500 shadow-2xl">
            <img src="/logo.jpg" alt="HypeHammer Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h2 className="text-xl font-display font-black tracking-widest gold-text uppercase leading-none">HypeHammer</h2>
            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.3em] mt-1">Sports Arena</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setStatus(AuctionStatus.MARKETPLACE)} 
            className="flex items-center gap-2 gold-gradient text-white backdrop-blur-xl px-6 py-3 rounded-full hover:brightness-110 transition-all shadow-lg font-bold"
          >
            <Play size={16} fill="currentColor" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Explore Auctions</span>
          </button>
          <button 
            onClick={() => setStatus(AuctionStatus.HOW_IT_WORKS)} 
            className="flex items-center gap-2 bg-white/90 border-2 border-blue-500 backdrop-blur-xl px-6 py-3 rounded-full text-blue-600 hover:bg-blue-500 hover:text-white transition-all shadow-lg font-bold"
          >
            <HelpCircle size={16} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">How It Works</span>
          </button>
          <button 
            onClick={() => setShowLoginModal(true)} 
            className="flex items-center gap-2 bg-white/90 border-2 border-green-500 backdrop-blur-xl px-6 py-3 rounded-full text-green-600 hover:bg-green-500 hover:text-white transition-all shadow-lg font-bold"
          >
            <LogIn size={16} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Login</span>
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center pt-32">
        <div className="max-w-5xl space-y-16 animate-in fade-in zoom-in duration-1000">
          {/* Main Hero */}
          <div className="space-y-6">
            <h1 className="text-8xl md:text-9xl font-display font-black tracking-tighter text-slate-900 leading-none drop-shadow-2xl uppercase">
              WHERE TEAMS BID<br />
              <span className="gold-text">FOR PLAYERS</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-700 font-semibold max-w-3xl mx-auto leading-relaxed">
              A live sports auction arena where teams bid, players rise, and champions are built.
            </p>
          </div>

          {/* CTA Button */}
          <div className="space-y-4">
            <button 
              onClick={() => setStatus(AuctionStatus.ADMIN_REGISTRATION)} 
              className="group relative px-12 py-6 bg-white border-4 border-blue-500 text-blue-600 font-black uppercase tracking-[0.3em] rounded-full shadow-2xl text-sm hover:scale-105 active:scale-95 transition-all hover:bg-blue-500 hover:text-white"
            >
              <span className="relative z-10 flex items-center gap-3">
                <Trophy size={18} /> Organize Your Season
              </span>
            </button>
            <p className="text-xs text-slate-500 font-semibold">Create and manage your own sports auction</p>
          </div>

          {/* Who Participates Section */}
          <div className="pt-8">
            <h3 className="text-sm font-black uppercase tracking-[0.3em] text-slate-600 mb-8">Who Participates?</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 max-w-5xl mx-auto">
              {/* Admin/Organizer */}
              <div className="bg-white/80 backdrop-blur-sm border-2 border-blue-200 rounded-2xl p-6 hover:border-blue-500 hover:shadow-xl transition-all group">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-r from-blue-500 to-orange-500 flex items-center justify-center">
                  <Trophy size={24} className="text-white" />
                </div>
                <h4 className="font-black text-sm uppercase text-slate-900 mb-2">Organizer</h4>
                <p className="text-xs text-slate-600 leading-relaxed">Creates & manages seasons</p>
              </div>

              {/* Auctioneer */}
              <div className="bg-white/80 backdrop-blur-sm border-2 border-blue-200 rounded-2xl p-6 hover:border-blue-500 hover:shadow-xl transition-all group">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-r from-blue-500 to-orange-500 flex items-center justify-center">
                  <Gavel size={24} className="text-white" />
                </div>
                <h4 className="font-black text-sm uppercase text-slate-900 mb-2">Auctioneer</h4>
                <p className="text-xs text-slate-600 leading-relaxed">Controls the bidding process</p>
              </div>

              {/* Teams */}
              <div className="bg-white/80 backdrop-blur-sm border-2 border-blue-200 rounded-2xl p-6 hover:border-blue-500 hover:shadow-xl transition-all group">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-r from-blue-500 to-orange-500 flex items-center justify-center">
                  <Users size={24} className="text-white" />
                </div>
                <h4 className="font-black text-sm uppercase text-slate-900 mb-2">Teams</h4>
                <p className="text-xs text-slate-600 leading-relaxed">Bid strategically within budgets</p>
              </div>

              {/* Players */}
              <div className="bg-white/80 backdrop-blur-sm border-2 border-blue-200 rounded-2xl p-6 hover:border-blue-500 hover:shadow-xl transition-all group">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-r from-blue-500 to-orange-500 flex items-center justify-center">
                  <User size={24} className="text-white" />
                </div>
                <h4 className="font-black text-sm uppercase text-slate-900 mb-2">Players</h4>
                <p className="text-xs text-slate-600 leading-relaxed">Get drafted based on skill & value</p>
              </div>

              {/* Guests */}
              <div className="bg-white/80 backdrop-blur-sm border-2 border-blue-200 rounded-2xl p-6 hover:border-blue-500 hover:shadow-xl transition-all group">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-r from-blue-500 to-orange-500 flex items-center justify-center">
                  <Eye size={24} className="text-white" />
                </div>
                <h4 className="font-black text-sm uppercase text-slate-900 mb-2">Guests</h4>
                <p className="text-xs text-slate-600 leading-relaxed">Watch live auctions</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Brand Trust Line */}
      <div className="pb-8 text-center">
        <p className="text-xs text-slate-500 font-medium">
          Built for transparent, real-time sports auctions.
        </p>
      </div>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full relative border-2 border-blue-500">
            <button 
              onClick={() => setShowLoginModal(false)} 
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
            
            <div className="flex flex-col items-center mb-6">
              <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-blue-500 shadow-lg mb-4">
                <img src="/logo.jpg" alt="HypeHammer Logo" className="w-full h-full object-cover" />
              </div>
              <h2 className="text-2xl font-display font-black tracking-wide gold-text uppercase">Login</h2>
              <p className="text-sm text-gray-600 mt-1">Access your account</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  placeholder="your.email@example.com"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Password</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Error Message */}
              {loginError && (
                <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                  <p className="text-sm text-red-700 font-bold">{loginError}</p>
                </div>
              )}

              <button
                type="submit"
                className="w-full gold-gradient text-white py-3 rounded-xl font-bold text-sm uppercase tracking-wider hover:brightness-110 transition-all shadow-lg"
              >
                Sign In
              </button>

              <div className="text-center text-sm text-gray-600 mt-4">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setShowLoginModal(false);
                    setStatus(AuctionStatus.MARKETPLACE);
                  }}
                  className="text-blue-600 hover:text-blue-700 font-bold"
                >
                  Explore Auctions & Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
