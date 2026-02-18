import React, { useState } from 'react';
import { Gavel, Users, User, ArrowLeft, ChevronRight } from 'lucide-react';
import { AuctionStatus, UserRole, MatchData, SportData } from '../../types';

interface RoleSelectionPageProps {
  setStatus: (status: AuctionStatus) => void;
  selectedMatch: MatchData | null;
  selectedSport: SportData | null;
  onRoleSelected: (role: UserRole) => void;
}

export const RoleSelectionPage: React.FC<RoleSelectionPageProps> = ({
  setStatus,
  selectedMatch,
  selectedSport,
  onRoleSelected
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

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
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-orange-50 py-4 px-4">
      {/* Header - Compact */}
      <div className="max-w-7xl mx-auto w-full mb-2">
        <button
          onClick={() => setStatus(AuctionStatus.MARKETPLACE)}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold transition-colors mb-4"
        >
          <ArrowLeft size={18} />
          Back to Marketplace
        </button>

        {/* Season Info - More Prominent */}
        {selectedMatch && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border-2 border-blue-200">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-orange-500 text-white rounded-full text-xs font-black uppercase">
                    {selectedSport?.sportType || selectedSport?.customSportName}
                  </span>
                  <h2 className="text-2xl font-black text-slate-900">{selectedMatch.name}</h2>
                </div>
                <p className="text-slate-600 text-sm">
                  📅 {new Date(selectedMatch.matchDate || selectedMatch.createdAt).toLocaleDateString()} 
                  {selectedMatch.place && ` • 📍 ${selectedMatch.place}`}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6 text-center">
          <h1 className="text-4xl font-black text-slate-900 mb-2">Choose Your Role</h1>
          <p className="text-slate-600 text-base">How would you like to participate in this auction?</p>
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
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={`bg-white rounded-2xl px-4 py-4 border-4 transition-all text-left ${
                  isSelected
                    ? 'border-blue-500 shadow-2xl scale-105'
                    : 'border-slate-200 hover:border-blue-300 hover:shadow-xl'
                }`}
              >
                {/* Icon */}
                <div className={`w-14 h-14 rounded-full bg-gradient-to-r ${role.color} flex items-center justify-center mb-2`}>
                  <Icon size={28} className="text-white" />
                </div>

                {/* Title */}
                <h3 className="text-base font-black text-slate-900 mb-0.5">{role.title}</h3>
                
                {/* Description */}
                <p className="text-sm text-slate-600 mb-2 leading-snug">{role.description}</p>

                {/* Features */}
                <ul className="space-y-1">
                  {role.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 text-sm text-slate-500">
                      <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Selected Indicator */}
                {isSelected && (
                  <div className="mt-2 pt-2 border-t-2 border-blue-200">
                    <span className="text-xs font-bold text-blue-600 uppercase">Selected</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Right: Info Panel */}
        <div className="w-64">
          {/* Organizer Contact Card */}
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-5 shadow-md mb-3">
            <p className="text-xs font-semibold text-slate-700 mb-3 uppercase tracking-wide">
              For Enquiries
            </p>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-slate-500 mb-1">Match Coordinator</p>
                <p className="text-sm font-semibold text-slate-900 break-words">
                  {selectedMatch?.organizerEmail || 'contact@auction.com'}
                </p>
              </div>
            </div>
          </div>

          {/* Continue Button - Sticky-like positioning */}
          {selectedRole && (
            <button
              onClick={() => onRoleSelected(selectedRole)}
              className="w-full px-4 py-3 gold-gradient text-white rounded-xl font-black uppercase tracking-wider hover:brightness-110 transition-all shadow-lg text-sm inline-flex items-center justify-center gap-2"
            >
              Continue
              <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
