import React from 'react';
import { ArrowLeft, Play, BookOpen, Settings as SettingsIcon, Users, Trophy, Gavel, LayoutDashboard } from 'lucide-react';
import { AuctionStatus } from '../../types';

interface HowItWorksPageProps {
  setStatus: (status: AuctionStatus) => void;
}

export const HowItWorksPage: React.FC<HowItWorksPageProps> = ({ setStatus }) => {
  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-orange-50 pointer-events-none"></div>

      <div className="w-full relative z-10 px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => setStatus(AuctionStatus.HOME)}
            className="flex items-center gap-3 bg-white/80 border border-blue-500/20 backdrop-blur-xl px-6 py-3 rounded-full text-blue-600 hover:bg-blue-500 hover:text-white transition-all shadow-lg"
          >
            <ArrowLeft size={18} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Back to Home</span>
          </button>
          
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl overflow-hidden border-2 border-blue-500">
              <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <h2 className="text-xl font-display font-black tracking-widest gold-text uppercase leading-none">HypeHammer</h2>
          </div>
        </div>

        {/* Main Content */}
        <div>
          <h1 className="text-4xl lg:text-5xl font-display font-black text-slate-900 uppercase tracking-widest mb-8">
            How It <span className="gold-text">Works</span>
          </h1>

          {/* Intro and Pro Tips Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* About HypeHammer */}
            <div className="bg-white/50 border-2 border-blue-500/20 rounded-2xl p-6 backdrop-blur-sm">
              <div className="text-center space-y-4">
                <h3 className="text-2xl font-display font-black text-slate-900 uppercase tracking-wider">What is HypeHammer?</h3>
                <p className="text-slate-600 text-base leading-relaxed">
                  HypeHammer is a modern, real-time auction platform designed for fantasy sports, player drafts, and competitive bidding events. Built with live synchronization, AI insights, and comprehensive management tools—all in one powerful dashboard.
                </p>
                <div className="pt-4 space-y-3">
                  <div className="flex items-center gap-3 text-slate-700 font-semibold">
                    <Trophy size={20} className="text-blue-600" />
                    <span>Real-Time Bidding Wars</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-700 font-semibold">
                    <Gavel size={20} className="text-blue-600" />
                    <span>Professional Auction Control</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-700 font-semibold">
                    <Users size={20} className="text-blue-600" />
                    <span>Multi-Team Management</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pro Tips Section */}
            <div className="flex flex-col justify-center">
              <div className="flex items-start gap-4">
                <BookOpen size={28} className="text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-display font-black text-slate-900 mb-3 uppercase tracking-wider text-lg">Pro Tips</h4>
                  <ul className="space-y-3 text-base text-slate-600 leading-relaxed">
                    <li className="flex gap-3">
                      <span className="text-blue-600 font-black">•</span>
                      <span>Team reps can place bids in real-time from the Live Auction Room with instant feedback</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-blue-600 font-black">•</span>
                      <span>Auctioneers control the pace with the timer and bid acceptance to keep events moving smoothly</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-blue-600 font-black">•</span>
                      <span>Browse complete player stats and biographical info on the Players page before bidding</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-blue-600 font-black">•</span>
                      <span>Track team budgets live to strategize bids and avoid running out of funds</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-blue-600 font-black">•</span>
                      <span>Use multiple auction rounds for unsold players to maximize competition</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Step-by-Step Guidelines */}
          <div className="space-y-6">
            <h3 className="text-2xl font-display font-black text-blue-600 uppercase tracking-widest border-b border-2 border-slate-300 pb-4">Step-by-Step Guide</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Step 1 */}
              <div className="flex gap-6 items-start">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-orange-500 flex items-center justify-center flex-shrink-0 font-black text-white text-xl shadow-lg">
                  1
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <SettingsIcon size={20} className="text-blue-600" />
                    <h4 className="font-display font-black text-slate-900 text-xl uppercase">Admin Setup & Approval</h4>
                  </div>
                  <p className="text-base text-slate-600 leading-relaxed mb-4">
                    Admins create and configure new auction seasons. Auctioneers register and await approval before gaining access. 
                    Set up teams with initial budgets, define player roles and base prices, and configure auction parameters.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-[9px] font-black uppercase px-3 py-1 bg-gradient-to-r from-blue-500 to-orange-500/10 text-blue-600 rounded-full border border-blue-500/20">Admin Dashboard</span>
                    <span className="text-[9px] font-black uppercase px-3 py-1 bg-gradient-to-r from-blue-500 to-orange-500/10 text-blue-600 rounded-full border border-blue-500/20">Auctioneer Approval</span>
                    <span className="text-[9px] font-black uppercase px-3 py-1 bg-gradient-to-r from-blue-500 to-orange-500/10 text-blue-600 rounded-full border border-blue-500/20">Season Config</span>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-6 items-start">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-orange-500 flex items-center justify-center flex-shrink-0 font-black text-white text-xl shadow-lg">
                  2
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <Users size={20} className="text-blue-600" />
                    <Trophy size={20} className="text-blue-600" />
                    <h4 className="font-display font-black text-slate-900 text-xl uppercase">Register Teams & Players</h4>
                  </div>
                  <p className="text-base text-slate-600 leading-relaxed mb-4">
                    Team representatives register their teams with budgets and ownership details. Players are added with comprehensive profiles including stats, roles, base prices, and images. 
                    View and verify all registrations before the auction begins.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-[9px] font-black uppercase px-3 py-1 bg-gradient-to-r from-blue-500 to-orange-500/10 text-blue-600 rounded-full border border-blue-500/20">Team Registration</span>
                    <span className="text-[9px] font-black uppercase px-3 py-1 bg-gradient-to-r from-blue-500 to-orange-500/10 text-blue-600 rounded-full border border-blue-500/20">Player Profiles</span>
                    <span className="text-[9px] font-black uppercase px-3 py-1 bg-gradient-to-r from-blue-500 to-orange-500/10 text-blue-600 rounded-full border border-blue-500/20">Budget Tracking</span>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-6 items-start">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-orange-500 flex items-center justify-center flex-shrink-0 font-black text-white text-xl shadow-lg">
                  3
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <Gavel size={20} className="text-blue-600" />
                    <h4 className="font-display font-black text-slate-900 text-xl uppercase">Launch Live Auction</h4>
                  </div>
                  <p className="text-base text-slate-600 leading-relaxed mb-4">
                    Start the auction and enter the live auction room. Auctioneers control the flow—starting player bidding, accepting bids from team reps, and managing timers. 
                    All participants see real-time updates with current bids, leading teams, and auction progress.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-[9px] font-black uppercase px-3 py-1 bg-gradient-to-r from-blue-500 to-orange-500/10 text-blue-600 rounded-full border border-blue-500/20">Live Bidding</span>
                    <span className="text-[9px] font-black uppercase px-3 py-1 bg-gradient-to-r from-blue-500 to-orange-500/10 text-blue-600 rounded-full border border-blue-500/20">Real-Time Sync</span>
                    <span className="text-[9px] font-black uppercase px-3 py-1 bg-gradient-to-r from-blue-500 to-orange-500/10 text-blue-600 rounded-full border border-blue-500/20">Multi-Role Views</span>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-6 items-start">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-orange-500 flex items-center justify-center flex-shrink-0 font-black text-white text-xl shadow-lg">
                  4
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <LayoutDashboard size={20} className="text-blue-600" />
                    <h4 className="font-display font-black text-slate-900 text-xl uppercase">Monitor & Complete</h4>
                  </div>
                  <p className="text-base text-slate-600 leading-relaxed mb-4">
                    View live dashboards showing player status, team rosters, spending patterns, and remaining budgets. 
                    Auctioneers can sell, unsold, or defer players to multiple rounds. Access the complete auction history with all bids and results when finished.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-[9px] font-black uppercase px-3 py-1 bg-gradient-to-r from-blue-500 to-orange-500/10 text-blue-600 rounded-full border border-blue-500/20">Live Dashboard</span>
                    <span className="text-[9px] font-black uppercase px-3 py-1 bg-gradient-to-r from-blue-500 to-orange-500/10 text-blue-600 rounded-full border border-blue-500/20">Team Rosters</span>
                    <span className="text-[9px] font-black uppercase px-3 py-1 bg-gradient-to-r from-blue-500 to-orange-500/10 text-blue-600 rounded-full border border-blue-500/20">Auction History</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <div className="mt-8">
            <button 
              onClick={() => setStatus(AuctionStatus.MARKETPLACE)}
              className="px-12 py-5 gold-gradient text-white rounded-full font-black uppercase tracking-[0.3em] text-sm shadow-2xl hover:brightness-110 transition-all inline-flex items-center gap-3"
            >
              <Gavel size={20} />
              Start Auctioning Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
