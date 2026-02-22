/**
 * useAuctionCountdown Hook
 * Real-time countdown to auction start with Firestore sync
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { firestore } from '../services/firebaseConfig';
import { doc, onSnapshot, updateDoc, collectionGroup, query, where, getDocs } from 'firebase/firestore';

export interface CountdownState {
  // Time remaining
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  
  // Status
  isExpired: boolean;
  isAuctionStarted: boolean;
  statusMessage: string;
  statusColor: 'green' | 'orange' | 'red' | 'blue';
  
  // Raw data
  auctionDateTime: string | null;
  auctionDateTimestamp: number | null;
  
  // Loading state
  loading: boolean;
  error: string | null;
}

export interface UseAuctionCountdownReturn extends CountdownState {
  // Actions
  updateAuctionDate: (newDate: string) => Promise<boolean>;
  refreshCountdown: () => void;
}

const initialState: CountdownState = {
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
  totalSeconds: 0,
  isExpired: false,
  isAuctionStarted: false,
  statusMessage: 'Loading...',
  statusColor: 'blue',
  auctionDateTime: null,
  auctionDateTimestamp: null,
  loading: true,
  error: null,
};

export function useAuctionCountdown(matchId: string | null | undefined): UseAuctionCountdownReturn {
  const [state, setState] = useState<CountdownState>(initialState);
  const [auctionStarted, setAuctionStarted] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Helper to check if two dates are the same day
  const isSameDay = useCallback((date1: Date, date2: Date): boolean => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }, []);

  // Calculate countdown from a target timestamp (date-only mode by default)
  const calculateCountdown = useCallback((targetTimestamp: number, isStarted: boolean): Partial<CountdownState> => {
    const now = new Date();
    const targetDate = new Date(targetTimestamp);
    
    // Check if auction has started (status is ONGOING or COMPLETED)
    if (isStarted) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        totalSeconds: 0,
        isExpired: true,
        isAuctionStarted: true,
        statusMessage: 'LIVE',
        statusColor: 'blue',
      };
    }
    
    // Check if today is the auction day
    if (isSameDay(now, targetDate)) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        totalSeconds: 0,
        isExpired: true,
        isAuctionStarted: false,
        statusMessage: 'Auction is Today',
        statusColor: 'green',
      };
    }
    
    // Calculate days remaining (date-only, ignoring time)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const diffMs = targetStart.getTime() - todayStart.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      // Date has passed but auction hasn't started
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        totalSeconds: 0,
        isExpired: true,
        isAuctionStarted: false,
        statusMessage: 'Auction will start soon',
        statusColor: 'orange',
      };
    }
    
    // Determine status color based on days remaining
    let statusColor: 'green' | 'orange' | 'red' | 'blue' = 'green';
    let statusMessage = `${diffDays} day${diffDays === 1 ? '' : 's'} to go`;
    
    if (diffDays <= 3 && diffDays > 1) {
      statusColor = 'orange';
      statusMessage = `${diffDays} days to go`;
    }
    if (diffDays === 1) {
      statusColor = 'red';
      statusMessage = 'Tomorrow!';
    }
    
    return {
      days: diffDays,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalSeconds: diffDays * 86400,
      isExpired: false,
      isAuctionStarted: false,
      statusMessage,
      statusColor,
    };
  }, [isSameDay]);

  // Update countdown periodically (every minute since we track days)
  const startCountdownInterval = useCallback((targetTimestamp: number, isStarted: boolean) => {
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Initial calculation
    const initial = calculateCountdown(targetTimestamp, isStarted);
    setState(prev => ({ ...prev, ...initial, loading: false }));
    
    // Start interval - check every minute (60000ms) since we're tracking days
    intervalRef.current = setInterval(() => {
      const updated = calculateCountdown(targetTimestamp, isStarted);
      setState(prev => ({ ...prev, ...updated }));
      
      // Stop interval if auction has started
      if (updated.isAuctionStarted && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }, 60000); // Check every minute
  }, [calculateCountdown]);

  // Subscribe to Firestore updates
  useEffect(() => {
    if (!matchId) {
      setState({ ...initialState, loading: false, error: 'No match ID provided' });
      return;
    }

    // Clear previous subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    // API_BASE URL for fallback
    const API_BASE = 'https://us-central1-axilam.cloudfunctions.net/auction';
    
    // Process match data (shared logic for both Firestore and API)
    const processMatchData = (data: any, source: string) => {
      console.log(`📅 useAuctionCountdown - Match data from ${source}:`, {
        matchId,
        auctionDateTime: data?.auctionDateTime,
        matchDate: data?.matchDate,
        status: data?.status
      });
      
      // Check multiple possible date fields (auctionDateTime or matchDate)
      let auctionDateTime = data?.auctionDateTime || null;
      let timestamp: number | null = null;
      
      // If auctionDateTime exists (string format like "2026-02-07T00:00:00")
      if (auctionDateTime && typeof auctionDateTime === 'string') {
        timestamp = new Date(auctionDateTime).getTime();
      }
      // Fall back to matchDate (number timestamp in milliseconds)
      else if (data?.matchDate && typeof data.matchDate === 'number') {
        timestamp = data.matchDate;
        // Convert timestamp to ISO string for display
        auctionDateTime = new Date(data.matchDate).toISOString();
      }
      
      const matchStatus = data?.status || 'SETUP';
      const isStarted = matchStatus === 'ONGOING' || matchStatus === 'COMPLETED';
      
      setAuctionStarted(isStarted);

      if (!timestamp || isNaN(timestamp)) {
        console.warn('📅 No valid auction date found in match document');
        setState({
          ...initialState,
          loading: false,
          statusMessage: 'No auction date set',
          statusColor: 'orange',
          isAuctionStarted: isStarted,
        });
        return;
      }
      
      console.log('📅 Auction date resolved:', { auctionDateTime, timestamp, date: new Date(timestamp).toISOString() });

      // Update state with raw data
      setState(prev => ({
        ...prev,
        auctionDateTime,
        auctionDateTimestamp: timestamp,
        loading: false,
        error: null,
      }));

      // Start countdown
      startCountdownInterval(timestamp, isStarted);
    };

    // Fallback to API if Firestore fails
    const fetchFromAPI = async () => {
      try {
        console.log('📅 useAuctionCountdown - Fetching from API fallback');
        const response = await fetch(`${API_BASE}/matches/${matchId}`);
        if (response.ok) {
          const responseData = await response.json();
          // API returns { success: true, data: matchData }
          const matchData = responseData.data || responseData;
          if (matchData && (matchData.id || matchData.matchDate || matchData.auctionDateTime)) {
            processMatchData(matchData, 'API');
            return true;
          }
        }
      } catch (err) {
        console.error('📅 useAuctionCountdown - API fallback failed:', err);
      }
      return false;
    };

    // Try multiple approaches to find the match document:
    // 1. Top-level 'matches' collection (common structure)
    // 2. Nested 'sports/{sportId}/matches' (via collectionGroup)
    // 3. API fallback if Firestore fails
    
    let matchDocRef: ReturnType<typeof doc> | null = null;

    // First, try to find in nested sports/matches structure using collectionGroup
    const findMatchInNested = async () => {
      try {
        const matchesGroup = collectionGroup(firestore, 'matches');
        const q = query(matchesGroup, where('id', '==', matchId));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const matchDoc = snapshot.docs[0];
          console.log('📅 useAuctionCountdown - Found match in nested structure:', matchDoc.ref.path);
          return matchDoc.ref;
        }
      } catch (err) {
        console.log('📅 useAuctionCountdown - collectionGroup query failed, trying top-level:', err);
      }
      
      // Fall back to top-level matches collection
      return doc(firestore, 'matches', matchId);
    };

    // Set up subscription with API fallback
    const setupSubscription = async () => {
      // First try Firestore
      let firestoreWorked = false;
      
      try {
        matchDocRef = await findMatchInNested();
        
        const unsubscribe = onSnapshot(
          matchDocRef,
          (snapshot) => {
            if (!snapshot.exists()) {
              // If doc doesn't exist in Firestore, try API fallback
              console.log('📅 useAuctionCountdown - Document not found in Firestore, trying API fallback');
              fetchFromAPI().then(success => {
                if (!success) {
                  setState({ ...initialState, loading: false, error: 'Match not found' });
                }
              });
              return;
            }
            
            firestoreWorked = true;
            const data = snapshot.data();
            processMatchData(data, 'Firestore');
          },
          async (error) => {
            console.error('Firestore subscription error:', error);
            // Try API fallback on Firestore error
            const success = await fetchFromAPI();
            if (!success) {
              setState({ ...initialState, loading: false, error: error.message });
            }
          }
        );

        unsubscribeRef.current = unsubscribe;
      } catch (err) {
        console.error('📅 useAuctionCountdown - Firestore setup failed:', err);
        // Final fallback to API
        const success = await fetchFromAPI();
        if (!success) {
          setState({ ...initialState, loading: false, error: 'Failed to load match data' });
        }
      }
    };

    // Call the async setup function
    setupSubscription();

    // Cleanup
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [matchId, startCountdownInterval]);

  // Update auction date in Firestore
  const updateAuctionDate = useCallback(async (newDate: string): Promise<boolean> => {
    if (!matchId) {
      console.error('Cannot update: No match ID');
      return false;
    }

    try {
      const matchDocRef = doc(firestore, 'matches', matchId);
      await updateDoc(matchDocRef, {
        auctionDateTime: newDate,
        updatedAt: new Date().toISOString(),
      });
      return true;
    } catch (error) {
      console.error('Failed to update auction date:', error);
      return false;
    }
  }, [matchId]);

  // Manual refresh
  const refreshCountdown = useCallback(() => {
    if (state.auctionDateTimestamp) {
      startCountdownInterval(state.auctionDateTimestamp, auctionStarted);
    }
  }, [state.auctionDateTimestamp, auctionStarted, startCountdownInterval]);

  return {
    ...state,
    updateAuctionDate,
    refreshCountdown,
  };
}

export default useAuctionCountdown;
