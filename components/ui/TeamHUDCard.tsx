import React from 'react';
import { Trophy, Wallet, Users, Check, Clock, Ban, X, FileText, ExternalLink, Lock } from 'lucide-react';
import { Team, ApprovalStatus } from '../../types';

interface TeamHUDCardProps {
  team: Team;
  playerCount: number;
  maxPlayers?: number;
  onClick: () => void;
  // Budget from match settings (backend source of truth)
  basePurse?: number;
  // Moderation props (optional)
  showModeration?: boolean;
  onApprove?: (teamId: string) => void;
  onDecline?: (teamId: string) => void;
  isUpdating?: boolean;
}

export const TeamHUDCard: React.FC<TeamHUDCardProps> = ({
  team,
  playerCount,
  maxPlayers = 18,
  onClick,
  basePurse,
  showModeration = false,
  onApprove,
  onDecline,
  isUpdating = false
}) => {
  // Use team's budget and remainingBudget directly from the backend (source of truth)
  // These are stored as actual numeric values: budget=100000, remainingBudget=100000
  const totalBudget = team.budget || basePurse || 0;
  const remainingBudget = team.remainingBudget ?? totalBudget;
  const totalSpent = totalBudget - remainingBudget;
  // Clamp percentage to 0-100% to handle edge cases
  const rawPercentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
  const budgetPercentage = Math.max(0, Math.min(100, rawPercentage));
  const approvalStatus: ApprovalStatus = team.approvalStatus || 'pending';
  
  // Format currency for display - detect if we need Cr (crores) or L (lakhs)
  const formatBudget = (value: number) => {
    if (value >= 10000000) {
      return { amount: (value / 10000000).toFixed(1), suffix: 'Cr' };
    } else if (value >= 100000) {
      return { amount: (value / 100000).toFixed(1), suffix: 'L' };
    } else if (value >= 1000) {
      return { amount: (value / 1000).toFixed(1), suffix: 'K' };
    }
    return { amount: value.toString(), suffix: '' };
  };
  
  const remainingFormatted = formatBudget(remainingBudget);
  const spentFormatted = formatBudget(totalSpent);
  const totalFormatted = formatBudget(totalBudget);

  // Get border color based on approval status
  const getBorderColor = () => {
    if (!showModeration) return 'rgba(236, 72, 153, 0.25)';
    switch (approvalStatus) {
      case 'accepted': return 'rgba(34, 197, 94, 0.35)';
      case 'declined': return 'rgba(239, 68, 68, 0.35)';
      default: return 'rgba(236, 72, 153, 0.25)';
    }
  };

  return (
    <div 
      onClick={onClick}
      className="group relative cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:z-10"
    >
      {/* Main Card Container */}
      <div 
        className="relative rounded-xl overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, rgba(20, 10, 25, 0.95), rgba(30, 15, 35, 0.9))',
          border: `1px solid ${getBorderColor()}`,
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
        }}
      >
        {/* Animated Border Glow on Hover */}
        <div 
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            boxShadow: 'inset 0 0 25px rgba(236, 72, 153, 0.15)'
          }}
        />

        {/* Top Power Indicator Bar */}
        <div className="h-1 w-full bg-black/50">
          <div 
            className="h-full bg-gradient-to-r from-pink-500 via-rose-400 to-pink-600 transition-all duration-500"
            style={{ 
              width: `${budgetPercentage}%`,
              boxShadow: '0 0 8px rgba(236, 72, 153, 0.5)'
            }}
          />
        </div>

        {/* Card Content */}
        <div className="p-5">
          {/* Hero Section: Logo + Name */}
          <div className="flex items-center gap-4 mb-5">
            {/* Team Logo */}
            <div 
              className="w-14 h-14 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 transition-all duration-300 group-hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(180, 50, 120, 0.1))',
                border: '1px solid rgba(236, 72, 153, 0.35)',
                boxShadow: '0 2px 10px rgba(236, 72, 153, 0.15)'
              }}
            >
              {team.logo ? (
                <img src={team.logo} alt={team.name} className="w-full h-full object-cover" />
              ) : (
                <Trophy size={24} className="text-pink-400" />
              )}
            </div>

            {/* Team Name & Location */}
            <div className="flex-1 min-w-0">
              <h3 
                className="text-base font-bold text-white truncate group-hover:text-pink-200 transition-colors"
                style={{ textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}
              >
                {team.name}
              </h3>
              <p className="text-pink-400/50 text-xs truncate">{team.homeCity || 'Franchise HQ'}</p>
              {/* Approval Status Badge */}
              {showModeration && (
                <div className="mt-1">
                  {approvalStatus === 'accepted' && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-green-500/15 border border-green-500/30 text-green-400 inline-flex items-center gap-1">
                      <Check size={8} /> Accepted
                    </span>
                  )}
                  {approvalStatus === 'pending' && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-amber-500/15 border border-amber-500/30 text-amber-400 inline-flex items-center gap-1">
                      <Clock size={8} /> Pending
                    </span>
                  )}
                  {approvalStatus === 'declined' && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-red-500/15 border border-red-500/30 text-red-400 inline-flex items-center gap-1">
                      <Ban size={8} /> Declined
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Remaining Budget Display */}
            <div className="text-right flex-shrink-0">
              <span className="text-base font-black text-emerald-400">₹{remainingFormatted.amount}<span className="text-xs text-emerald-400/60">{remainingFormatted.suffix}</span></span>
              <p className="text-[8px] text-pink-400/40 uppercase tracking-wider">Left</p>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            {/* Budget */}
            <div 
              className="rounded-lg p-2.5"
              style={{
                background: 'rgba(236, 72, 153, 0.06)',
                border: '1px solid rgba(236, 72, 153, 0.15)'
              }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Wallet size={11} className="text-pink-400/60" />
                <span className="text-[8px] font-bold text-pink-400/50 uppercase tracking-wider">BUDGET</span>
              </div>
              <p className="text-lg font-black text-white leading-none">
                ₹{remainingFormatted.amount}
                <span className="text-[9px] font-bold text-pink-400/40 ml-0.5">{remainingFormatted.suffix}</span>
              </p>
            </div>

            {/* Squad */}
            <div 
              className="rounded-lg p-2.5"
              style={{
                background: 'rgba(236, 72, 153, 0.06)',
                border: '1px solid rgba(236, 72, 153, 0.15)'
              }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Users size={11} className="text-pink-400/60" />
                <span className="text-[8px] font-bold text-pink-400/50 uppercase tracking-wider">SQUAD</span>
              </div>
              <p className="text-lg font-black text-white leading-none">
                {playerCount}
                <span className="text-[9px] font-bold text-pink-400/40 ml-0.5">/{maxPlayers}</span>
              </p>
            </div>
          </div>

          {/* Power Bar */}
          <div className="mb-5">
            <div 
              className="w-full h-2 rounded-full overflow-hidden"
              style={{
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.05)'
              }}
            >
              <div 
                className="h-full bg-gradient-to-r from-pink-500 via-rose-400 to-pink-600 rounded-full transition-all duration-700"
                style={{ 
                  width: `${budgetPercentage}%`,
                  boxShadow: '0 0 8px rgba(236, 72, 153, 0.4)'
                }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[8px] text-pink-400/40">Spent: ₹{spentFormatted.amount}{spentFormatted.suffix}</span>
              <span className="text-[8px] text-pink-400/40">Total: ₹{totalFormatted.amount}{totalFormatted.suffix}</span>
            </div>
          </div>

          {/* Government ID Section */}
          {(team.governmentId || team.governmentIdURL) && (
            <div 
              className="rounded-lg p-2.5 mb-3"
              style={{
                background: 'rgba(79, 70, 229, 0.06)',
                border: '1px solid rgba(79, 70, 229, 0.15)'
              }}
            >
              {team.governmentId && (
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={11} className="text-indigo-400/60 flex-shrink-0" />
                  <span className="text-[8px] font-bold text-indigo-400/50 uppercase tracking-wider">GOV ID</span>
                  <span className="text-xs font-semibold text-indigo-300/80 ml-auto">{team.governmentId}</span>
                </div>
              )}
              {team.governmentIdURL && (
                <a 
                  href={team.governmentIdURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-indigo-400/70 hover:text-indigo-300 transition-colors text-[8px] font-bold uppercase tracking-wider"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink size={11} className="flex-shrink-0" />
                  View ID Proof
                </a>
              )}
            </div>
          )}

          {/* View Squad Button - Approval-based Access Control */}
          {approvalStatus !== 'declined' && (
            <div className="relative group/squad">
              <button 
                onClick={approvalStatus === 'accepted' ? onClick : undefined}
                disabled={approvalStatus !== 'accepted'}
                className={`w-full py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${
                  approvalStatus === 'accepted' 
                    ? 'cursor-pointer hover:bg-pink-500/20' 
                    : 'cursor-not-allowed opacity-60'
                }`}
                style={{
                  background: approvalStatus === 'accepted' ? 'rgba(236, 72, 153, 0.1)' : 'rgba(120, 120, 120, 0.1)',
                  border: approvalStatus === 'accepted' ? '1px solid rgba(236, 72, 153, 0.3)' : '1px solid rgba(120, 120, 120, 0.3)',
                  color: approvalStatus === 'accepted' ? '#f9a8d4' : '#999'
                }}
              >
                {approvalStatus === 'pending' ? (
                  <>
                    <Lock size={11} />
                    TEAM NOT APPROVED YET
                  </>
                ) : (
                  <>
                    <Users size={11} />
                    VIEW SQUAD
                  </>
                )}
              </button>
              {/* Tooltip for pending teams */}
              {approvalStatus === 'pending' && (
                <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 opacity-0 group-hover/squad:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                  <div className="bg-gray-900 text-xs text-gray-200 px-3 py-1.5 rounded-lg border border-gray-700 shadow-lg">
                    Team must be approved before viewing squad
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Moderation Actions */}
          {showModeration && (
            <div className="flex gap-2 mt-2">
              {approvalStatus !== 'accepted' && onApprove && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onApprove(team.id);
                  }}
                  disabled={isUpdating}
                  className="flex-1 py-2 rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-600/20 border border-green-500/40 text-green-300 text-xs font-bold hover:from-green-500/30 hover:to-emerald-600/30 hover:border-green-500/60 transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <Check size={12} />
                  Accept
                </button>
              )}
              {approvalStatus !== 'declined' && onDecline && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDecline(team.id);
                  }}
                  disabled={isUpdating}
                  className="flex-1 py-2 rounded-lg bg-gradient-to-r from-red-500/20 to-rose-600/20 border border-red-500/40 text-red-300 text-xs font-bold hover:from-red-500/30 hover:to-rose-600/30 hover:border-red-500/60 transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <X size={12} />
                  Decline
                </button>
              )}
            </div>
          )}
        </div>

        {/* Corner Accent Glow */}
        <div 
          className="absolute -bottom-6 -right-6 w-24 h-24 opacity-20 group-hover:opacity-35 transition-opacity pointer-events-none"
          style={{ 
            background: 'radial-gradient(circle, rgba(236, 72, 153, 0.4) 0%, transparent 70%)'
          }}
        />
      </div>
    </div>
  );
};
