/**
 * useMatchConfig Hook
 * Provides real-time match configuration with validation
 */

import { useState, useEffect } from 'react';
import { 
  subscribeToMatchConfig, 
  validateMatchConfig, 
  updateMatchConfig,
  MatchConfig, 
  ValidationResult 
} from '../services/matchConfigService';

interface UseMatchConfigReturn {
  config: MatchConfig | null;
  validation: ValidationResult | null;
  isLoading: boolean;
  error: Error | null;
  updateConfig: (updates: Partial<MatchConfig>) => Promise<void>;
  refreshValidation: () => Promise<void>;
}

/**
 * Hook to manage match configuration with real-time sync
 * 
 * @param matchId - The match ID to subscribe to
 * @param autoValidate - Whether to auto-validate on mount (default: true)
 * @returns Match config, validation, and update functions
 * 
 * @example
 * ```tsx
 * const { config, validation, updateConfig } = useMatchConfig(matchId);
 * 
 * if (validation?.teamsExceeded) {
 *   return <Alert>Teams limit exceeded!</Alert>;
 * }
 * 
 * return (
 *   <div>
 *     <p>Max Teams: {config?.maxTeams}</p>
 *     <button onClick={() => updateConfig({ maxTeams: 10 })}>
 *       Increase Limit
 *     </button>
 *   </div>
 * );
 * ```
 */
export const useMatchConfig = (
  matchId: string | null | undefined,
  autoValidate: boolean = true
): UseMatchConfigReturn => {
  const [config, setConfig] = useState<MatchConfig | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Subscribe to config updates
  useEffect(() => {
    if (!matchId) {
      setIsLoading(false);
      return;
    }

    console.log('🔄 useMatchConfig: Subscribing to', matchId);
    setIsLoading(true);
    setError(null);

    const unsubscribe = subscribeToMatchConfig(
      matchId,
      (newConfig) => {
        console.log('📥 useMatchConfig: Config updated', newConfig);
        setConfig(newConfig);
        setIsLoading(false);
      },
      (err) => {
        console.error('❌ useMatchConfig: Error', err);
        setError(err);
        setIsLoading(false);
      }
    );

    return () => {
      console.log('🔌 useMatchConfig: Unsubscribing');
      unsubscribe();
    };
  }, [matchId]);

  // Auto-validate on mount and when config changes
  useEffect(() => {
    if (!matchId || !autoValidate || !config) return;

    const validate = async () => {
      try {
        const result = await validateMatchConfig(matchId);
        setValidation(result);
      } catch (err) {
        console.error('Failed to validate config:', err);
      }
    };

    validate();
  }, [matchId, config, autoValidate]);

  // Update config function
  const updateConfig = async (updates: Partial<MatchConfig>) => {
    if (!matchId) {
      throw new Error('No match ID provided');
    }

    try {
      await updateMatchConfig(matchId, updates);
      // Config will auto-update via listener
      
      // Re-validate after update
      if (autoValidate) {
        const result = await validateMatchConfig(matchId);
        setValidation(result);
      }
    } catch (err) {
      console.error('Failed to update config:', err);
      throw err;
    }
  };

  // Manual refresh validation
  const refreshValidation = async () => {
    if (!matchId) {
      throw new Error('No match ID provided');
    }

    try {
      const result = await validateMatchConfig(matchId);
      setValidation(result);
    } catch (err) {
      console.error('Failed to refresh validation:', err);
      throw err;
    }
  };

  return {
    config,
    validation,
    isLoading,
    error,
    updateConfig,
    refreshValidation,
  };
};

/**
 * Hook for simplified config reading only (no validation)
 * Use when you only need to display config values
 */
export const useMatchConfigReadOnly = (matchId: string | null | undefined) => {
  const [config, setConfig] = useState<MatchConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!matchId) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = subscribeToMatchConfig(
      matchId,
      (newConfig) => {
        setConfig(newConfig);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [matchId]);

  return { config, isLoading };
};
