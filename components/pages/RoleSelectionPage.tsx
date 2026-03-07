import React, { useState, useCallback } from 'react';
import { Gavel, Users, User, ArrowLeft, ChevronRight, Link2, Check, Copy } from 'lucide-react';
import { AuctionStatus, UserRole, MatchData, SportData } from '../../types';
import { NeonPageWrapper, GlassCard, NeonButton, NeonDesignStyles } from '../ui/NeonDesignSystem';

interface RoleSelectionPageProps {
  setStatus: (status: AuctionStatus) => void;
  selectedMatch: MatchData | null;
  selectedSport: SportData | null;
  onRoleSelected: (role: UserRole) => void;
  matchId?: string; // For copy link functionality
}

export const RoleSelectionPage: React.FC<RoleSelectionPageProps> = ({
  setStatus,
  selectedMatch,
  selectedSport,
  onRoleSelected,
  matchId
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [copiedRole, setCopiedRole] = useState<UserRole | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Get the matchId from props or from selectedMatch
  const effectiveMatchId = matchId || selectedMatch?.id;

  // Copy registration link to clipboard
  const copyRegistrationLink = useCallback(async (role: UserRole, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card selection
    
    if (!effectiveMatchId) {
      setToastMessage('No match selected');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const rolePathMap: Record<UserRole, string> = {
      [UserRole.AUCTIONEER]: 'auctioneer',
      [UserRole.TEAM_REP]: 'team',
      [UserRole.PLAYER]: 'player',
      [UserRole.ADMIN]: 'admin',
      [UserRole.GUEST]: 'guest'
    };

    const rolePath = rolePathMap[role];
    if (!rolePath || role === UserRole.ADMIN || role === UserRole.GUEST) return;

    const baseUrl = window.location.origin;
    const registrationUrl = `${baseUrl}/register/${rolePath}/${effectiveMatchId}`;
    
    // Create share text with match name
    const matchName = selectedMatch?.name || 'this auction';
    const roleLabel = role === UserRole.AUCTIONEER ? 'an Auctioneer' 
      : role === UserRole.TEAM_REP ? 'a Team' 
      : 'a Player';
    const shareText = `Register as ${roleLabel} for ${matchName}\n${registrationUrl}`;

    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedRole(role);
      setToastMessage(`Registration link copied — ready to share!`);
      setTimeout(() => {
        setCopiedRole(null);
        setToastMessage(null);
      }, 3000);
    } catch (err) {
      console.error('Failed to copy:', err);
      setToastMessage('Failed to copy link');
      setTimeout(() => setToastMessage(null), 3000);
    }
  }, [effectiveMatchId, selectedMatch?.name]);

  const roles = [
    {
      id: UserRole.AUCTIONEER,
      title: 'Auctioneer',
      icon: Gavel,
      description: 'Conduct the live auction bidding process',
      features: [
        'Run live bidding sessions',
        'Control auction flow',
        'Announce player sales'
      ],
      color: 'from-purple-500 to-indigo-500'
    },
    {
      id: UserRole.TEAM_REP,
      title: 'Team Representative',
      icon: Users,
      description: 'Bid on behalf of your team',
      features: [
        'Place bids for players',
        'Manage team budget',
        'Build your squad'
      ],
      color: 'from-blue-500 to-cyan-500'
    },
    {
      id: UserRole.PLAYER,
      title: 'Player',
      icon: User,
      description: 'Register to be drafted in the auction',
      features: [
        'Set your base price',
        'Showcase your profile',
        'Get drafted by teams'
      ],
      color: 'from-green-500 to-emerald-500'
    }
  ];

  return (
    <NeonPageWrapper className="min-h-screen py-4 px-4">
      <NeonDesignStyles />
      {/* Header - Compact */}
      <div className="max-w-7xl mx-auto w-full mb-2">
        <button
          onClick={() => setStatus(AuctionStatus.MARKETPLACE)}
          className="flex items-center gap-2 text-pink-400 hover:text-pink-300 font-black uppercase tracking-wider transition-colors mb-4 text-sm"
        >
          <ArrowLeft size={18} />
          Back to Marketplace
        </button>

        {/* Season Info - More Prominent */}
        {selectedMatch && (
          <GlassCard glow className="p-6 mb-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-3 py-1 font-black uppercase text-xs tracking-wider rounded-full text-white" style={{ background: 'linear-gradient(135deg, #ff0066, #ff4d94)' }}>
                    {selectedSport?.sportType || selectedSport?.customSportName}
                  </span>
                  <h2 className="text-2xl font-black text-pink-100">{selectedMatch.name}</h2>
                </div>
                <p className="text-pink-300/70 text-sm">
                  📅 {new Date(selectedMatch.matchDate || selectedMatch.createdAt).toLocaleDateString()} 
                  {selectedMatch.place && ` • 📍 ${selectedMatch.place}`}
                </p>
              </div>
            </div>
          </GlassCard>
        )}

        <div className="mb-6 text-center">
          <h1 className="text-4xl font-black text-pink-100 mb-2">Choose Your Role</h1>
          <p className="text-pink-300/70 text-base">How would you like to participate in this auction?</p>
        </div>
      </div>

      {/* Main Content - Two Column Layout - Natural Height */}
      <div className="max-w-7xl mx-auto w-full flex gap-8">
        {/* Left: Role Cards */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
          {roles.map((role) => {
            const Icon = role.icon;
            const isSelected = selectedRole === role.id;
            
            return (
              <div
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={`rounded-2xl px-4 py-4 border-2 transition-all text-left cursor-pointer ${
                  isSelected
                    ? 'shadow-2xl scale-105'
                    : 'hover:shadow-lg'
                }`}
                style={{
                  background: 'rgba(255, 0, 102, 0.08)',
                  border: isSelected 
                    ? '2px solid rgba(255, 0, 102, 0.8)' 
                    : '2px solid rgba(255, 0, 102, 0.3)',
                  boxShadow: isSelected ? '0 0 30px rgba(255, 0, 102, 0.4)' : 'none'
                }}
              >
                {/* Icon */}
                <div className={`w-14 h-14 rounded-full bg-gradient-to-r ${role.color} flex items-center justify-center mb-2`}>
                  <Icon size={28} className="text-white" />
                </div>

                {/* Title */}
                <h3 className="text-base font-black text-pink-100 mb-0.5">{role.title}</h3>
                
                {/* Description */}
                <p className="text-sm text-pink-300/70 mb-2 leading-snug">{role.description}</p>

                {/* Features */}
                <ul className="space-y-1">
                  {role.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 text-sm text-pink-300/60">
                      <span className="text-green-400 mt-0.5 flex-shrink-0">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Selected Indicator */}
                {isSelected && (
                  <div className="mt-2 pt-2" style={{ borderTop: '1px solid rgba(255, 0, 102, 0.2)' }}>
                    <span className="text-xs font-black uppercase text-pink-400 tracking-wider">Selected</span>
                  </div>
                )}

                {/* Copy Link Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyRegistrationLink(role.id, e);
                  }}
                  className={`mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    copiedRole === role.id
                      ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                      : 'bg-pink-500/10 text-pink-400 border border-pink-500/30 hover:bg-pink-500/20 hover:border-pink-500/50'
                  }`}
                >
                  {copiedRole === role.id ? (
                    <>
                      <Check size={14} />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      Copy Registration Link
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Right: Info Panel */}
        <div className="w-64">
          {/* Organizer Contact Card */}
          <GlassCard glow className="p-5 mb-3">
            <p className="text-xs font-black uppercase text-pink-400 mb-3 tracking-wider">
              For Enquiries
            </p>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-pink-300/60 mb-1">Match Coordinator</p>
                <p className="text-sm font-semibold text-pink-100 break-words">
                  {selectedMatch?.organizerEmail || 'contact@auction.com'}
                </p>
              </div>
            </div>
          </GlassCard>

          {/* Continue Button - Sticky-like positioning */}
          {selectedRole && (
            <NeonButton
              onClick={() => onRoleSelected(selectedRole)}
              className="w-full uppercase tracking-wider font-black text-sm py-2.5"
            >
              Continue
              <ChevronRight size={18} className="ml-2" />
            </NeonButton>
          )}
        </div>
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

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
          <div className="flex items-center gap-2 px-5 py-3 rounded-xl bg-green-500/20 border border-green-500/40 text-green-400 font-semibold text-sm shadow-lg backdrop-blur-sm">
            <Check size={18} />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </NeonPageWrapper>
  );
};
