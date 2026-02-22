/**
 * AuctionDateSettings Component
 * Dedicated settings card for auction date configuration
 * Date-only picker with save functionality
 */

import React, { useState, useEffect } from 'react';
import { Calendar, Save, CheckCircle, Loader2, Clock, AlertCircle, Radio } from 'lucide-react';
import { useAuctionCountdown } from '../../hooks/useAuctionCountdown';

interface AuctionDateSettingsProps {
  matchId: string | null | undefined;
  canEdit?: boolean;
  onSaveSuccess?: () => void;
}

export const AuctionDateSettings: React.FC<AuctionDateSettingsProps> = ({
  matchId,
  canEdit = true,
  onSaveSuccess,
}) => {
  const countdown = useAuctionCountdown(matchId);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize selected date from countdown data
  useEffect(() => {
    if (countdown.auctionDateTime) {
      // Extract just the date part (YYYY-MM-DD) from the stored datetime
      const dateOnly = countdown.auctionDateTime.split('T')[0];
      setSelectedDate(dateOnly);
      setHasChanges(false);
    }
  }, [countdown.auctionDateTime]);

  // Handle date change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setSelectedDate(newDate);
    setSaveSuccess(false);
    
    // Check if date has changed from stored value
    const storedDate = countdown.auctionDateTime?.split('T')[0] || '';
    setHasChanges(newDate !== storedDate);
  };

  // Save auction date
  const handleSave = async () => {
    if (!selectedDate || !hasChanges) return;

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      // Store as ISO date string with midnight time
      const dateToSave = `${selectedDate}T00:00:00`;
      const success = await countdown.updateAuctionDate(dateToSave);
      
      if (success) {
        setSaveSuccess(true);
        setHasChanges(false);
        onSaveSuccess?.();
        
        // Reset success state after 3 seconds
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Failed to save auction date:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Get status display info
  const getStatusDisplay = () => {
    if (countdown.loading) {
      return { icon: Loader2, text: 'Loading...', color: 'text-pink-400/60', animate: true };
    }
    if (countdown.isAuctionStarted) {
      return { icon: Radio, text: 'LIVE', color: 'text-blue-400', animate: true };
    }
    if (countdown.statusMessage === 'Auction is Today') {
      return { icon: Calendar, text: 'Auction is Today', color: 'text-green-400', animate: false };
    }
    if (countdown.days > 0) {
      return { 
        icon: Clock, 
        text: countdown.statusMessage, 
        color: countdown.statusColor === 'red' ? 'text-red-400' : 
               countdown.statusColor === 'orange' ? 'text-orange-400' : 'text-green-400',
        animate: false 
      };
    }
    if (!countdown.auctionDateTime) {
      return { icon: AlertCircle, text: 'No date set', color: 'text-orange-400/60', animate: false };
    }
    return { icon: Clock, text: countdown.statusMessage, color: 'text-orange-400', animate: false };
  };

  const status = getStatusDisplay();
  const StatusIcon = status.icon;

  // Format display date
  const formatDisplayDate = (dateStr: string): string => {
    if (!dateStr) return 'Not set';
    try {
      const date = new Date(dateStr + 'T00:00:00');
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Get minimum date (today)
  const getMinDate = (): string => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  return (
    <div className="hud-card rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/20 to-red-500/20 flex items-center justify-center border border-pink-500/30">
            <Calendar size={18} className="text-pink-400" />
          </div>
          <div>
            <h3 className="text-sm font-black text-pink-100 uppercase tracking-wider">Auction Date</h3>
            <p className="text-[10px] text-pink-400/50">When will the auction take place</p>
          </div>
        </div>
        
        {/* Status Badge */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
          countdown.isAuctionStarted ? 'bg-blue-500/20 border border-blue-500/30' :
          countdown.statusColor === 'green' ? 'bg-green-500/20 border border-green-500/30' :
          countdown.statusColor === 'orange' ? 'bg-orange-500/20 border border-orange-500/30' :
          countdown.statusColor === 'red' ? 'bg-red-500/20 border border-red-500/30' :
          'bg-pink-500/10 border border-pink-500/20'
        }`}>
          <StatusIcon size={12} className={`${status.color} ${status.animate ? 'animate-pulse' : ''}`} />
          <span className={`text-xs font-bold ${status.color}`}>{status.text}</span>
        </div>
      </div>

      {/* Current Date Display */}
      <div className="mb-5 p-4 rounded-xl bg-black/30 border border-pink-500/10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black uppercase text-pink-400/40 tracking-wider mb-1">Scheduled Date</p>
            <p className="text-lg font-bold text-pink-100">
              {countdown.auctionDateTime ? formatDisplayDate(countdown.auctionDateTime.split('T')[0]) : 'Not set yet'}
            </p>
          </div>
          {countdown.days > 0 && !countdown.isExpired && (
            <div className="text-right">
              <p className="text-3xl font-black text-pink-400">{countdown.days}</p>
              <p className="text-[9px] font-bold uppercase text-pink-400/50 tracking-wider">days left</p>
            </div>
          )}
        </div>
      </div>

      {/* Date Picker (only show if can edit and auction hasn't started) */}
      {canEdit && !countdown.isAuctionStarted ? (
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase text-pink-400/50 tracking-wider block mb-2">
              Select New Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              min={getMinDate()}
              className="w-full px-4 py-3 rounded-xl bg-pink-900/20 border border-pink-500/20 text-pink-100 font-bold 
                       focus:border-pink-500/50 focus:outline-none focus:ring-1 focus:ring-pink-500/30 transition-all
                       [color-scheme:dark]"
            />
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving || !selectedDate}
            className={`w-full py-3 rounded-xl font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
              saveSuccess
                ? 'bg-green-500/20 border border-green-500/40 text-green-400'
                : hasChanges && selectedDate
                  ? 'bg-gradient-to-r from-pink-500/30 to-red-500/30 border border-pink-500/40 text-pink-100 hover:from-pink-500/40 hover:to-red-500/40'
                  : 'bg-pink-500/10 border border-pink-500/10 text-pink-400/30 cursor-not-allowed'
            }`}
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : saveSuccess ? (
              <>
                <CheckCircle size={16} />
                Saved Successfully
              </>
            ) : (
              <>
                <Save size={16} />
                Save Auction Date
              </>
            )}
          </button>

          {/* Helper Text */}
          <p className="text-[10px] text-pink-400/40 text-center">
            The auctioneer will manually start the auction on this date
          </p>
        </div>
      ) : countdown.isAuctionStarted ? (
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-center gap-2 text-blue-400">
            <Radio size={14} className="animate-pulse" />
            <span className="text-sm font-bold">Auction is currently live</span>
          </div>
          <p className="text-[10px] text-blue-400/60 mt-1">Date cannot be changed while auction is in progress</p>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-pink-500/5 border border-pink-500/10">
          <p className="text-[10px] text-pink-400/40 text-center">
            Only administrators and auctioneers can modify the auction date
          </p>
        </div>
      )}
    </div>
  );
};

export default AuctionDateSettings;
