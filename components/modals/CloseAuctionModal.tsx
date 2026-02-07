import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface CloseAuctionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  remainingPlayers: number;
  unsoldPlayers: number;
}

/**
 * CloseAuctionModal - Warning modal for ending auction
 * Shows warnings about remaining/unsold players
 * Red alert design to emphasize the critical action
 */
export const CloseAuctionModal: React.FC<CloseAuctionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  remainingPlayers,
  unsoldPlayers
}) => {
  if (!isOpen) return null;

  const hasWarnings = remainingPlayers > 0 || unsoldPlayers > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full mx-4 overflow-hidden border-4 border-red-500/50 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full p-2 transition-all"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <AlertTriangle size={24} className="text-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">End Auction?</h2>
              <p className="text-red-100 text-sm">This action cannot be undone</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-slate-700 mb-4 font-medium text-base">
            Are you sure you want to end the auction?
          </p>

          {/* Warnings */}
          {hasWarnings && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-2 mb-2">
                <AlertTriangle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm font-bold text-red-700">Warning:</p>
              </div>
              
              <ul className="space-y-2 ml-7">
                {remainingPlayers > 0 && (
                  <li className="text-sm text-red-600">
                    <span className="font-bold">{remainingPlayers}</span> player
{remainingPlayers !== 1 ? 's' : ''} still in queue
                  </li>
                )}
                {unsoldPlayers > 0 && (
                  <li className="text-sm text-red-600">
                    <span className="font-bold">{unsoldPlayers}</span> unsold player
{unsoldPlayers !== 1 ? 's' : ''}
                  </li>
                )}
              </ul>
              
              <p className="text-xs text-red-500 mt-3 font-medium">
                Ending now will stop the auction immediately.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-sm transition-all"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm transition-all shadow-lg hover:shadow-xl"
            >
              End Auction
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
