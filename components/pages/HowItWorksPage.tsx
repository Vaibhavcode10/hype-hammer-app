import React from 'react';
import { ArrowLeft, Play, BookOpen, Settings as SettingsIcon, Users, Trophy, Gavel, LayoutDashboard, Zap, Radio, Target, CheckCircle } from 'lucide-react';
import { AuctionStatus } from '../../types';
import { NeonDesignStyles, GlassCard, NeonButton, GradientHeading, NeonPageWrapper } from '../ui/NeonDesignSystem';

interface HowItWorksPageProps {
  setStatus: (status: AuctionStatus) => void;
}

export const HowItWorksPage: React.FC<HowItWorksPageProps> = ({ setStatus }) => {
  return (
    <NeonPageWrapper>
      <NeonDesignStyles />
      
      <div className="w-full relative z-10 px-8 py-6 min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <NeonButton 
            variant="secondary"
            size="sm"
            icon={<ArrowLeft size={18} />}
            onClick={() => setStatus(AuctionStatus.HOME)}
          >
            Back to Home
          </NeonButton>
          
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden" style={{ border: '2px solid rgba(255, 0, 102, 0.5)', boxShadow: '0 0 20px rgba(255, 0, 102, 0.3)' }}>
              <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <h2 className="text-lg font-black tracking-widest neon-text-gradient uppercase leading-none">HypeHammer</h2>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <GradientHeading size="2xl" className="mb-4">How It Works</GradientHeading>
            <p className="text-pink-300/60 text-lg max-w-2xl mx-auto">Your complete guide to mastering the auction arena</p>
          </div>

          {/* Intro and Pro Tips Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {/* About HypeHammer */}
            <GlassCard glow>
              <div className="text-center space-y-4">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto" style={{ background: 'linear-gradient(135deg, rgba(255, 0, 102, 0.3), rgba(180, 0, 80, 0.2))', border: '1px solid rgba(255, 0, 102, 0.4)' }}>
                  <Zap size={28} className="text-pink-400" />
                </div>
                <GradientHeading size="md">What is HypeHammer?</GradientHeading>
                <p className="text-pink-300/70 text-base leading-relaxed">
                  HypeHammer is a modern, real-time auction platform designed for fantasy sports, player drafts, and competitive bidding events. Built with live synchronization, AI insights, and comprehensive management tools—all in one powerful dashboard.
                </p>
                <div className="pt-4 space-y-3 text-left">
                  <div className="flex items-center gap-3 text-pink-200 font-semibold">
                    <Trophy size={20} className="text-pink-400" />
                    <span>Real-Time Bidding Wars</span>
                  </div>
                  <div className="flex items-center gap-3 text-pink-200 font-semibold">
                    <Gavel size={20} className="text-pink-400" />
                    <span>Professional Auction Control</span>
                  </div>
                  <div className="flex items-center gap-3 text-pink-200 font-semibold">
                    <Users size={20} className="text-pink-400" />
                    <span>Multi-Team Management</span>
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Pro Tips Section */}
            <GlassCard>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, rgba(255, 0, 102, 0.3), rgba(180, 0, 80, 0.2))', border: '1px solid rgba(255, 0, 102, 0.4)' }}>
                  <BookOpen size={24} className="text-pink-400" />
                </div>
                <div>
                  <GradientHeading size="sm" className="mb-4">Pro Tips</GradientHeading>
                  <ul className="space-y-3 text-base text-pink-300/70 leading-relaxed">
                    <li className="flex gap-3">
                      <span className="text-pink-400 font-black">•</span>
                      <span>Team reps can place bids in real-time from the Live Auction Room with instant feedback</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-pink-400 font-black">•</span>
                      <span>Auctioneers control the pace with the timer and bid acceptance to keep events moving smoothly</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-pink-400 font-black">•</span>
                      <span>Browse complete player stats and biographical info on the Players page before bidding</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-pink-400 font-black">•</span>
                      <span>Track team budgets live to strategize bids and avoid running out of funds</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-pink-400 font-black">•</span>
                      <span>Use multiple auction rounds for unsold players to maximize competition</span>
                    </li>
                  </ul>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Step-by-Step Guidelines - 4 Glowing Step Cards */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(255, 0, 102, 0.3), rgba(180, 0, 80, 0.2))', border: '1px solid rgba(255, 0, 102, 0.4)' }}>
                <Target size={20} className="text-pink-400" />
              </div>
              <GradientHeading size="lg">Step-by-Step Guide</GradientHeading>
            </div>
            
            {/* Progress Line with Steps */}
            <div className="relative">
              {/* Connecting Line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px hidden lg:block" style={{ background: 'linear-gradient(180deg, rgba(255, 0, 102, 0.5), rgba(255, 0, 102, 0.1))' }} />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Step 1 */}
                <GlassCard glow className="relative">
                  <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full flex items-center justify-center font-black text-xl neon-pulse" style={{ background: 'linear-gradient(135deg, rgba(255, 0, 102, 0.9), rgba(180, 0, 80, 0.8))', color: 'white', boxShadow: '0 0 30px rgba(255, 0, 102, 0.5)' }}>
                    1
                  </div>
                  <div className="pl-4">
                    <div className="flex items-center gap-3 mb-3">
                      <SettingsIcon size={20} className="text-pink-400" />
                      <h4 className="font-black text-white text-lg uppercase tracking-wide">Admin Setup & Approval</h4>
                    </div>
                    <p className="text-sm text-pink-300/70 leading-relaxed mb-4">
                      Admins create and configure new auction seasons. Auctioneers register and await approval before gaining access. 
                      Set up teams with initial budgets, define player roles and base prices, and configure auction parameters.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {['Admin Dashboard', 'Auctioneer Approval', 'Season Config'].map(tag => (
                        <span key={tag} className="text-[9px] font-black uppercase px-3 py-1 rounded-full" style={{ background: 'linear-gradient(135deg, rgba(255, 0, 102, 0.15), rgba(180, 0, 80, 0.1))', border: '1px solid rgba(255, 0, 102, 0.3)', color: '#f472b6' }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </GlassCard>

                {/* Step 2 */}
                <GlassCard glow className="relative">
                  <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full flex items-center justify-center font-black text-xl neon-pulse" style={{ background: 'linear-gradient(135deg, rgba(255, 0, 102, 0.9), rgba(180, 0, 80, 0.8))', color: 'white', boxShadow: '0 0 30px rgba(255, 0, 102, 0.5)' }}>
                    2
                  </div>
                  <div className="pl-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Users size={20} className="text-pink-400" />
                      <Trophy size={20} className="text-pink-400" />
                      <h4 className="font-black text-white text-lg uppercase tracking-wide">Register Teams & Players</h4>
                    </div>
                    <p className="text-sm text-pink-300/70 leading-relaxed mb-4">
                      Team representatives register their teams with budgets and ownership details. Players are added with comprehensive profiles including stats, roles, base prices, and images. 
                      View and verify all registrations before the auction begins.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {['Team Registration', 'Player Profiles', 'Budget Tracking'].map(tag => (
                        <span key={tag} className="text-[9px] font-black uppercase px-3 py-1 rounded-full" style={{ background: 'linear-gradient(135deg, rgba(255, 0, 102, 0.15), rgba(180, 0, 80, 0.1))', border: '1px solid rgba(255, 0, 102, 0.3)', color: '#f472b6' }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </GlassCard>

                {/* Step 3 */}
                <GlassCard glow className="relative">
                  <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full flex items-center justify-center font-black text-xl neon-pulse" style={{ background: 'linear-gradient(135deg, rgba(255, 0, 102, 0.9), rgba(180, 0, 80, 0.8))', color: 'white', boxShadow: '0 0 30px rgba(255, 0, 102, 0.5)' }}>
                    3
                  </div>
                  <div className="pl-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Gavel size={20} className="text-pink-400" />
                      <h4 className="font-black text-white text-lg uppercase tracking-wide">Launch Live Auction</h4>
                    </div>
                    <p className="text-sm text-pink-300/70 leading-relaxed mb-4">
                      Start the auction and enter the live auction room. Auctioneers control the flow—starting player bidding, accepting bids from team reps, and managing timers. 
                      All participants see real-time updates with current bids, leading teams, and auction progress.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {['Live Bidding', 'Real-Time Sync', 'Multi-Role Views'].map(tag => (
                        <span key={tag} className="text-[9px] font-black uppercase px-3 py-1 rounded-full" style={{ background: 'linear-gradient(135deg, rgba(255, 0, 102, 0.15), rgba(180, 0, 80, 0.1))', border: '1px solid rgba(255, 0, 102, 0.3)', color: '#f472b6' }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </GlassCard>

                {/* Step 4 */}
                <GlassCard glow className="relative">
                  <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full flex items-center justify-center font-black text-xl neon-pulse" style={{ background: 'linear-gradient(135deg, rgba(255, 0, 102, 0.9), rgba(180, 0, 80, 0.8))', color: 'white', boxShadow: '0 0 30px rgba(255, 0, 102, 0.5)' }}>
                    4
                  </div>
                  <div className="pl-4">
                    <div className="flex items-center gap-3 mb-3">
                      <LayoutDashboard size={20} className="text-pink-400" />
                      <h4 className="font-black text-white text-lg uppercase tracking-wide">Monitor & Complete</h4>
                    </div>
                    <p className="text-sm text-pink-300/70 leading-relaxed mb-4">
                      View live dashboards showing player status, team rosters, spending patterns, and remaining budgets. 
                      Auctioneers can sell, unsold, or defer players to multiple rounds. Access the complete auction history with all bids and results when finished.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {['Live Dashboard', 'Team Rosters', 'Auction History'].map(tag => (
                        <span key={tag} className="text-[9px] font-black uppercase px-3 py-1 rounded-full" style={{ background: 'linear-gradient(135deg, rgba(255, 0, 102, 0.15), rgba(180, 0, 80, 0.1))', border: '1px solid rgba(255, 0, 102, 0.3)', color: '#f472b6' }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </GlassCard>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <div className="text-center pb-12">
            <NeonButton 
              variant="primary"
              size="lg"
              icon={<Gavel size={20} />}
              onClick={() => setStatus(AuctionStatus.MARKETPLACE)}
              className="neon-pulse"
            >
              Start Auctioning Now
            </NeonButton>
          </div>
        </div>
      </div>
    </NeonPageWrapper>
  );
};
