/**
 * CountdownDisplay Component
 * Lightweight countdown display for match cards (no Firestore subscription)
 * Uses static date and local timer only
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Clock } from 'lucide-react';

interface CountdownDisplayProps {
  targetDate: string | number | null | undefined;
  auctionStatus: 'SETUP' | 'ONGOING' | 'COMPLETED';
  className?: string;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

export const CountdownDisplay: React.FC<CountdownDisplayProps> = ({
  targetDate,
  auctionStatus,
  className = '',
}) => {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  });

  const calculateTimeRemaining = useCallback((): TimeRemaining => {
    if (!targetDate) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
    }

    const target = typeof targetDate === 'number' 
      ? targetDate 
      : new Date(targetDate).getTime();
    
    if (isNaN(target)) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
    }

    const now = Date.now();
    const diff = target - now;

    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
    }

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return { days, hours, minutes, seconds, isExpired: false };
  }, [targetDate]);

  useEffect(() => {
    // Initial calculation
    setTimeRemaining(calculateTimeRemaining());

    // Update every second
    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining();
      setTimeRemaining(remaining);
      
      // Stop interval if expired
      if (remaining.isExpired) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [calculateTimeRemaining]);

  // If auction is completed, show completed message
  if (auctionStatus === 'COMPLETED') {
    return (
      <div className={`flex items-center gap-1.5 text-xs font-medium text-gray-500 ${className}`}>
        <Clock className="w-3 h-3" />
        <span>Auction Completed</span>
      </div>
    );
  }

  // If auction is ongoing, show live status
  if (auctionStatus === 'ONGOING') {
    return (
      <div className={`flex items-center gap-1.5 text-xs font-bold text-green-600 ${className}`}>
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span>Auction in Progress</span>
      </div>
    );
  }

  // No date set
  if (!targetDate) {
    return (
      <div className={`flex items-center gap-1.5 text-xs font-medium text-orange-500 ${className}`}>
        <Clock className="w-3 h-3" />
        <span>Date TBD</span>
      </div>
    );
  }

  // Time expired but auction not started
  if (timeRemaining.isExpired) {
    return (
      <div className={`flex items-center gap-1.5 text-xs font-bold text-emerald-600 ${className}`}>
        <Clock className="w-3 h-3" />
        <span>Starting Soon</span>
      </div>
    );
  }

  // Format countdown
  const { days, hours, minutes, seconds } = timeRemaining;

  // Different display based on how much time remains
  let countdownText = '';
  let colorClass = 'text-blue-600';

  if (days > 0) {
    countdownText = `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    countdownText = `${hours}h ${minutes}m ${seconds}s`;
    colorClass = 'text-orange-600';
  } else {
    countdownText = `${minutes}m ${seconds}s`;
    colorClass = 'text-red-600';
  }

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <Clock className={`w-3 h-3 ${colorClass}`} />
      <span className={`text-xs font-bold font-mono ${colorClass}`}>
        {countdownText}
      </span>
    </div>
  );
};

export default CountdownDisplay;
