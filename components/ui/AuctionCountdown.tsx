/**
 * AuctionCountdown Component
 * Real-time countdown display with edit capability for Admin/Auctioneer
 */

import React, { useState } from 'react';
import { Clock, Calendar, Edit2, X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useAuctionCountdown } from '../../hooks/useAuctionCountdown';

interface AuctionCountdownProps {
  matchId: string | null | undefined;
  canEdit?: boolean;
  variant?: 'card' | 'inline' | 'compact';
  showEditButton?: boolean;
  className?: string;
}

// Date Edit Modal
const EditDateModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  currentDate: string | null;
  onSave: (newDate: string) => Promise<boolean>;
}> = ({ isOpen, onClose, currentDate, onSave }) => {
  const [newDate, setNewDate] = useState(currentDate || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen && currentDate) {
      // Convert to datetime-local format
      const date = new Date(currentDate);
      if (!isNaN(date.getTime())) {
        const localDateTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setNewDate(localDateTime);
      }
    }
  }, [isOpen, currentDate]);

  const handleSave = async () => {
    if (!newDate) {
      setError('Please select a date and time');
      return;
    }

    const selectedDate = new Date(newDate);
    if (selectedDate <= new Date()) {
      setError('Please select a future date and time');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const success = await onSave(newDate);
      if (success) {
        onClose();
      } else {
        setError('Failed to update date. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Calendar size={20} className="text-blue-400" />
            </div>
            <h3 className="text-lg font-bold text-white">Edit Auction Date</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Auction Date & Time
            </label>
            <input
              type="datetime-local"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertCircle size={16} className="text-red-400" />
              <span className="text-sm text-red-400">{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check size={18} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Time Unit Display
const TimeUnit: React.FC<{
  value: number;
  label: string;
  variant: 'card' | 'inline' | 'compact';
}> = ({ value, label, variant }) => {
  if (variant === 'compact') {
    return (
      <span className="text-white font-mono font-bold">
        {String(value).padStart(2, '0')}
      </span>
    );
  }

  if (variant === 'inline') {
    return (
      <div className="text-center">
        <span className="text-xl font-bold text-white font-mono">
          {String(value).padStart(2, '0')}
        </span>
        <span className="text-xs text-slate-400 ml-1">{label}</span>
      </div>
    );
  }

  // Card variant
  return (
    <div className="flex flex-col items-center">
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center">
        <span className="text-2xl sm:text-3xl font-bold text-white font-mono">
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="text-xs text-slate-400 mt-2 uppercase tracking-wide">{label}</span>
    </div>
  );
};

export const AuctionCountdown: React.FC<AuctionCountdownProps> = ({
  matchId,
  canEdit = false,
  variant = 'card',
  showEditButton = true,
  className = '',
}) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const countdown = useAuctionCountdown(matchId);

  const {
    days,
    hours,
    minutes,
    seconds,
    isExpired,
    isAuctionStarted,
    statusMessage,
    statusColor,
    auctionDateTime,
    loading,
    error,
    updateAuctionDate,
  } = countdown;

  // Get status color classes
  const getStatusColorClasses = () => {
    switch (statusColor) {
      case 'green':
        return {
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/30',
          text: 'text-emerald-400',
          glow: 'shadow-emerald-500/20',
        };
      case 'orange':
        return {
          bg: 'bg-orange-500/10',
          border: 'border-orange-500/30',
          text: 'text-orange-400',
          glow: 'shadow-orange-500/20',
        };
      case 'red':
        return {
          bg: 'bg-red-500/10',
          border: 'border-red-500/30',
          text: 'text-red-400',
          glow: 'shadow-red-500/20',
        };
      case 'blue':
      default:
        return {
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/30',
          text: 'text-blue-400',
          glow: 'shadow-blue-500/20',
        };
    }
  };

  const colors = getStatusColorClasses();

  // Format the date for display
  const formattedDate = auctionDateTime
    ? new Date(auctionDateTime).toLocaleString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Not set';

  // Loading state
  if (loading) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <Loader2 className="animate-spin text-slate-400" size={24} />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-xl ${className}`}>
        <AlertCircle size={18} className="text-red-400" />
        <span className="text-sm text-red-400">{error}</span>
      </div>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Clock size={14} className={colors.text} />
        {isExpired ? (
          <span className={`text-sm font-medium ${colors.text}`}>{statusMessage}</span>
        ) : (
          <span className="text-sm font-mono text-white">
            {days > 0 && <span>{days}d </span>}
            <TimeUnit value={hours} label="h" variant="compact" />:
            <TimeUnit value={minutes} label="m" variant="compact" />:
            <TimeUnit value={seconds} label="s" variant="compact" />
          </span>
        )}
        {canEdit && showEditButton && (
          <button
            onClick={() => setShowEditModal(true)}
            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <Edit2 size={12} />
          </button>
        )}
        <EditDateModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          currentDate={auctionDateTime}
          onSave={updateAuctionDate}
        />
      </div>
    );
  }

  // Inline variant
  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-4 ${className}`}>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${colors.bg} ${colors.border} border`}>
          <Clock size={14} className={colors.text} />
          <span className={`text-xs font-medium ${colors.text}`}>{statusMessage}</span>
        </div>
        
        {!isExpired && (
          <div className="flex items-center gap-3">
            {days > 0 && <TimeUnit value={days} label="d" variant="inline" />}
            <TimeUnit value={hours} label="h" variant="inline" />
            <span className="text-slate-500">:</span>
            <TimeUnit value={minutes} label="m" variant="inline" />
            <span className="text-slate-500">:</span>
            <TimeUnit value={seconds} label="s" variant="inline" />
          </div>
        )}

        {canEdit && showEditButton && (
          <button
            onClick={() => setShowEditModal(true)}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <Edit2 size={16} />
          </button>
        )}

        <EditDateModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          currentDate={auctionDateTime}
          onSave={updateAuctionDate}
        />
      </div>
    );
  }

  // Card variant (default)
  return (
    <div 
      className={`relative overflow-hidden rounded-2xl border ${colors.border} ${colors.bg} p-6 ${className}`}
      style={{ boxShadow: `0 0 40px ${colors.glow}` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center border ${colors.border}`}>
            <Clock size={20} className={colors.text} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Auction Countdown</h3>
            <p className="text-sm text-slate-400">{formattedDate}</p>
          </div>
        </div>

        {canEdit && showEditButton && (
          <button
            onClick={() => setShowEditModal(true)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg ${colors.bg} border ${colors.border} ${colors.text} hover:bg-opacity-80 transition-colors text-sm font-medium`}
          >
            <Edit2 size={14} />
            Edit
          </button>
        )}
      </div>

      {/* Status Message */}
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${colors.bg} border ${colors.border} mb-6`}>
        <span className={`w-2 h-2 rounded-full ${isAuctionStarted ? 'bg-blue-500 animate-pulse' : colors.text.replace('text-', 'bg-')}`} />
        <span className={`text-sm font-medium ${colors.text}`}>{statusMessage}</span>
      </div>

      {/* Countdown Display */}
      {!isExpired ? (
        <div className="flex justify-center gap-3 sm:gap-4">
          {days > 0 && <TimeUnit value={days} label="Days" variant="card" />}
          <TimeUnit value={hours} label="Hours" variant="card" />
          <TimeUnit value={minutes} label="Minutes" variant="card" />
          <TimeUnit value={seconds} label="Seconds" variant="card" />
        </div>
      ) : (
        <div className="flex justify-center">
          <div className={`text-center py-8 px-12 rounded-xl ${colors.bg} border ${colors.border}`}>
            <p className={`text-xl font-bold ${colors.text}`}>
              {isAuctionStarted ? '🎯 Auction in Progress' : '⏳ Waiting for Auctioneer'}
            </p>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <EditDateModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        currentDate={auctionDateTime}
        onSave={updateAuctionDate}
      />
    </div>
  );
};

export default AuctionCountdown;
