/**
 * useMatchData Hook
 * React hook for fetching and using match data in components
 */

import { useEffect, useState } from 'react';
import { fetchMatchData, getPursePerTeam, MatchData } from '../services/matchDataService';

interface UseMatchDataResult {
  matchData: MatchData | null;
  pursePerTeam: number;
  isLoading: boolean;
  error: string | null;
}

const hookCache = new Map<string, UseMatchDataResult>();

export function useMatchData(matchId: string | null): UseMatchDataResult {
  const [state, setState] = useState<UseMatchDataResult>({
    matchData: null,
    pursePerTeam: 0,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    if (!matchId) {
      setState({
        matchData: null,
        pursePerTeam: 0,
        isLoading: false,
        error: 'No match ID provided',
      });
      return;
    }

    // Check hook cache first
    if (hookCache.has(matchId)) {
      setState(hookCache.get(matchId)!);
      return;
    }

    const loadMatchData = async () => {
      try {
        const data = await fetchMatchData(matchId);
        const purse = getPursePerTeam(data);
        
        const result: UseMatchDataResult = {
          matchData: data,
          pursePerTeam: purse,
          isLoading: false,
          error: data ? null : 'Failed to load match data',
        };

        hookCache.set(matchId, result);
        setState(result);
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Unknown error';
        const result: UseMatchDataResult = {
          matchData: null,
          pursePerTeam: 0,
          isLoading: false,
          error,
        };
        setState(result);
      }
    };

    loadMatchData();
  }, [matchId]);

  return state;
}
