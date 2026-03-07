import React from 'react';
import { AlertTriangle, AlertOctagon, CheckCircle2, X, Users, Trophy, ArrowRight, Shield, IndianRupee } from 'lucide-react';
import type { BidConfig, CurrencyUnit } from '../../types';

export interface PreAuctionValidationData {
  canStart: boolean;
  hasError: boolean;
  hasWarning: boolean;
  errorMessage: string | null;
  warningMessage: string | null;
  stats: {
    maxTeams: number;
    maxPlayersPerTeam: number;
    requiredPlayers: number;
    acceptedTeams: number;
    pendingTeams: number;
    declinedTeams: number;
    totalTeams: number;
    acceptedPlayers: number;
    pendingPlayers: number;
    declinedPlayers: number;
    totalPlayers: number;
  };
  acceptedTeamsList: Array<{ id: string; name: string }>;
  acceptedPlayersList: Array<{ id: string; name: string }>;
}

interface PreAuctionValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartAuction: () => void;
  onGoToTeams: () => void;
  onGoToPlayers: () => void;
  validationData: PreAuctionValidationData | null;
  isLoading?: boolean;
  // Bid config props
  bidConfigInputs?: { increments: string[]; custom: string };
  onBidIncrementChange?: (idx: number, value: string) => void;
  onCustomIncrementChange?: (value: string) => void;
  currencyUnit?: CurrencyUnit;
  bidConfig?: BidConfig | null;
}

/**
 * PreAuctionValidationModal - Pre-auction validation and confirmation
 * Shows validation status before starting an auction
 * Blocks auction if acceptedTeams > maxTeams
 * Warns if acceptedTeams < maxTeams or not enough players
 */
export const PreAuctionValidationModal: React.FC<PreAuctionValidationModalProps> = ({
  isOpen,
  onClose,
  onStartAuction,
  onGoToTeams,
  onGoToPlayers,
  validationData,
  isLoading = false,
  bidConfigInputs,
  onBidIncrementChange,
  onCustomIncrementChange,
  currencyUnit = 'L',
  bidConfig
}) => {
  if (!isOpen) return null;

  const canStart = validationData?.canStart ?? false;
  const hasError = validationData?.hasError ?? false;
  const hasWarning = validationData?.hasWarning ?? false;
  const stats = validationData?.stats;

  // Determine header color based on status
  const getHeaderGradient = () => {
    if (hasError) return 'from-red-500 to-red-600';
    if (hasWarning) return 'from-amber-500 to-orange-600';
    return 'from-green-500 to-emerald-600';
  };

  const getHeaderIcon = () => {
    if (hasError) return <AlertOctagon size={24} className="text-white" />;
    if (hasWarning) return <AlertTriangle size={24} className="text-white animate-pulse" />;
    return <CheckCircle2 size={24} className="text-white" />;
  };

  const getHeaderTitle = () => {
    if (hasError) return 'Cannot Start Auction';
    if (hasWarning) return 'Review Before Starting';
    return 'Ready to Start';
  };

  const getHeaderSubtitle = () => {
    if (hasError) return 'Please resolve the issues below';
    if (hasWarning) return 'Some warnings to review';
    return 'All validations passed';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div 
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden animate-in fade-in zoom-in duration-200"
        style={{
          border: hasError ? '4px solid rgba(239, 68, 68, 0.5)' : hasWarning ? '4px solid rgba(245, 158, 11, 0.5)' : '4px solid rgba(34, 197, 94, 0.5)'
        }}
      >
        {/* Header */}
        <div className={`bg-gradient-to-r ${getHeaderGradient()} p-6 relative`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full p-2 transition-all"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              {isLoading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/30 border-t-white"></div>
              ) : (
                getHeaderIcon()
              )}
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">{getHeaderTitle()}</h2>
              <p className="text-white/80 text-sm">{getHeaderSubtitle()}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-500/30 border-t-pink-500 mx-auto mb-4"></div>
              <p className="text-slate-600 font-medium">Validating auction requirements...</p>
            </div>
          ) : (
            <>
              {/* Stats Grid */}
              {stats && (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {/* Teams Stats */}
                  <div className={`rounded-xl p-4 border-2 ${
                    hasError ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy size={16} className={hasError ? 'text-red-500' : 'text-pink-500'} />
                      <span className="text-xs font-bold text-slate-500 uppercase">Teams</span>
                    </div>
                    <p className={`text-2xl font-black ${hasError ? 'text-red-600' : 'text-slate-800'}`}>
                      {stats.acceptedTeams} <span className="text-base font-medium text-slate-400">/ {stats.maxTeams}</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Accepted / Max Allowed
                    </p>
                    {stats.pendingTeams > 0 && (
                      <p className="text-xs text-amber-600 mt-1">
                        {stats.pendingTeams} pending approval
                      </p>
                    )}
                  </div>

                  {/* Players Stats */}
                  <div className="rounded-xl p-4 bg-slate-50 border-2 border-slate-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Users size={16} className="text-blue-500" />
                      <span className="text-xs font-bold text-slate-500 uppercase">Players</span>
                    </div>
                    <p className="text-2xl font-black text-slate-800">
                      {stats.acceptedPlayers} <span className="text-base font-medium text-slate-400">/ {stats.requiredPlayers}</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Accepted / Required
                    </p>
                    {stats.pendingPlayers > 0 && (
                      <p className="text-xs text-amber-600 mt-1">
                        {stats.pendingPlayers} pending approval
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Error Message */}
              {hasError && validationData?.errorMessage && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertOctagon size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-red-700 mb-1">Error</p>
                      <p className="text-sm text-red-600">{validationData.errorMessage}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Warning Message */}
              {hasWarning && validationData?.warningMessage && !hasError && (
                <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={20} className="text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-amber-700 mb-1">Warning</p>
                      <p className="text-sm text-amber-600">{validationData.warningMessage}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {!hasError && !hasWarning && (
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={20} className="text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-green-700 mb-1">All Good!</p>
                      <p className="text-sm text-green-600">
                        You have {stats?.acceptedTeams} accepted teams and {stats?.acceptedPlayers} accepted players ready for auction.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Auction Info */}
              <div className="bg-slate-100 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield size={16} className="text-slate-500" />
                  <span className="text-xs font-bold text-slate-500 uppercase">Auction Rules</span>
                </div>
                <ul className="text-xs text-slate-600 space-y-1">
                  <li>• Only <strong>accepted</strong> teams and players participate in the auction</li>
                  <li>• Pending and declined entries are excluded</li>
                  <li>• Max {stats?.maxPlayersPerTeam || 0} players per team allowed</li>
                </ul>
              </div>

              {/* Bid Increment Settings */}
              {bidConfigInputs && onBidIncrementChange && onCustomIncrementChange && (
                <div className="bg-gradient-to-br from-pink-50 to-rose-50 border-2 border-pink-200 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-red-500 rounded-lg flex items-center justify-center">
                      <IndianRupee size={16} className="text-white" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-slate-700">Bid Increment Settings</span>
                      <p className="text-xs text-slate-500">Configure bid buttons for the auction</p>
                    </div>
                  </div>
                  
                  <div className="bg-white/60 border border-pink-200 rounded-lg px-3 py-2 mb-3">
                    <p className="text-slate-600 text-xs leading-relaxed">
                      <span className="font-bold text-pink-600">Unit:</span> Values use the selected unit ({currencyUnit}).
                      <span className="text-slate-400 ml-1">1K=₹1,000 | 1L=₹1,00,000 | 1Cr=₹1,00,00,000</span>
                    </p>
                  </div>
                  
                  {/* Increment Inputs */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {[0, 1, 2, 3].map((idx) => (
                      <div key={idx} className="space-y-1">
                        <label className="text-slate-500 text-xs font-medium">
                          Increment {idx + 1}
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-pink-500 text-xs">+₹</span>
                          <input
                            type="text"
                            value={bidConfigInputs.increments[idx] || ''}
                            onChange={(e) => onBidIncrementChange(idx, e.target.value)}
                            disabled={bidConfig?.isLocked}
                            placeholder={idx === 0 ? '0.1' : idx === 1 ? '0.25' : idx === 2 ? '0.5' : '1'}
                            className={`w-full bg-white border rounded-lg px-3 py-2 pl-7 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition-all ${
                              bidConfig?.isLocked 
                                ? 'border-slate-200 opacity-60 cursor-not-allowed' 
                                : 'border-pink-200 hover:border-pink-400'
                            }`}
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">{currencyUnit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Custom Increment */}
                  <div className="space-y-1">
                    <label className="text-slate-500 text-xs font-medium flex items-center gap-1">
                      Custom Increment <span className="text-pink-500">★</span>
                      <span className="text-slate-400 text-xs">(Optional)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-pink-500 text-xs">+₹</span>
                      <input
                        type="text"
                        value={bidConfigInputs.custom}
                        onChange={(e) => onCustomIncrementChange(e.target.value)}
                        disabled={bidConfig?.isLocked}
                        placeholder="e.g. 0.15 or 15K"
                        className={`w-full bg-white border rounded-lg px-3 py-2 pl-7 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition-all ${
                          bidConfig?.isLocked 
                            ? 'border-slate-200 opacity-60 cursor-not-allowed' 
                            : 'border-pink-200 hover:border-pink-400'
                        }`}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">{currencyUnit}</span>
                    </div>
                  </div>
                  
                  {bidConfig?.isLocked && (
                    <div className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                      <Shield size={12} />
                      Bid config is locked after auction starts
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                {hasError ? (
                  <>
                    <button
                      onClick={onGoToTeams}
                      className="w-full px-6 py-3 bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                    >
                      <Trophy size={16} />
                      Go to Teams Page
                      <ArrowRight size={16} />
                    </button>
                    <button
                      onClick={onClose}
                      className="w-full px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-sm transition-all"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <div className="flex gap-3">
                    <button
                      onClick={onClose}
                      className="flex-1 px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-sm transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={onStartAuction}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                    >
                      {hasWarning ? 'Start Anyway' : 'Start Auction'}
                      <ArrowRight size={16} />
                    </button>
                  </div>
                )}

                {/* Quick navigation buttons when there are pending items */}
                {(stats?.pendingTeams || 0) > 0 || (stats?.pendingPlayers || 0) > 0 ? (
                  <div className="flex gap-2 mt-2">
                    {(stats?.pendingTeams || 0) > 0 && (
                      <button
                        onClick={onGoToTeams}
                        className="flex-1 px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1"
                      >
                        <Trophy size={12} />
                        Review Teams ({stats?.pendingTeams})
                      </button>
                    )}
                    {(stats?.pendingPlayers || 0) > 0 && (
                      <button
                        onClick={onGoToPlayers}
                        className="flex-1 px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1"
                      >
                        <Users size={12} />
                        Review Players ({stats?.pendingPlayers})
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
