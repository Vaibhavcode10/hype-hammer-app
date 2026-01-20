import React, { useState } from 'react';
import { Gavel, Users, User, Eye, ArrowLeft, ChevronRight } from 'lucide-react';
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
    },
    {
      id: UserRole.GUEST,
      title: 'Guest',
      icon: Eye,
      description: 'Watch the auction live',
      features: [
        'View live bidding',
        'Follow your favorites',
        'No bidding access'
      ],
      color: 'from-orange-500 to-red-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-orange-50 py-8 px-4">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <button
          onClick={() => setStatus(AuctionStatus.MARKETPLACE)}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Marketplace
        </button>

        {/* Season Info */}
        {selectedMatch && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border-2 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-orange-500 text-white rounded-full text-xs font-black uppercase">
                    {selectedSport?.sportType || selectedSport?.customSportName}
                  </span>
                  <h2 className="text-2xl font-black text-slate-900">{selectedMatch.name}</h2>
                </div>
                <p className="text-slate-600">
                  📅 {new Date(selectedMatch.matchDate || selectedMatch.createdAt).toLocaleDateString()} 
                  {selectedMatch.place && ` • 📍 ${selectedMatch.place}`}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-slate-900 mb-3">Choose Your Role</h1>
          <p className="text-slate-600 text-lg">How would you like to participate in this auction?</p>
        </div>
      </div>

      {/* Role Cards */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {roles.map((role) => {
          const Icon = role.icon;
          const isSelected = selectedRole === role.id;
          
          return (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role.id)}
              className={`bg-white rounded-2xl p-6 border-4 transition-all text-left ${
                isSelected
                  ? 'border-blue-500 shadow-2xl scale-105'
                  : 'border-slate-200 hover:border-blue-300 hover:shadow-xl'
              }`}
            >
              {/* Icon */}
              <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${role.color} flex items-center justify-center mb-4`}>
                <Icon size={32} className="text-white" />
              </div>

              {/* Title */}
              <h3 className="text-xl font-black text-slate-900 mb-2">{role.title}</h3>
              
              {/* Description */}
              <p className="text-sm text-slate-600 mb-4">{role.description}</p>

              {/* Features */}
              <ul className="space-y-2">
                {role.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-slate-500">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Selected Indicator */}
              {isSelected && (
                <div className="mt-4 pt-4 border-t-2 border-blue-200">
                  <span className="text-xs font-bold text-blue-600 uppercase">Selected</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Continue Button */}
      {selectedRole && (
        <div className="max-w-6xl mx-auto text-center">
          <button
            onClick={() => onRoleSelected(selectedRole)}
            className="px-12 py-4 gold-gradient text-white rounded-full font-black uppercase tracking-wider hover:brightness-110 transition-all shadow-2xl text-lg inline-flex items-center gap-3"
          >
            Continue as {roles.find(r => r.id === selectedRole)?.title}
            <ChevronRight size={24} />
          </button>
        </div>
      )}
    </div>
  );
};
