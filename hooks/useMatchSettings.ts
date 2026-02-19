/**
 * useMatchSettings Hook
 * 
 * Real-time subscription to match settings (Purse Intelligence)
 * with Indian currency formatting and base price validation
 */

import { useState, useEffect, useCallback } from 'react';
import { subscribeToMatchSettings, MatchSettings } from '../services/matchConfigService';
import { 
  formatIndianCurrency, 
  formatIndianCurrencyShort,
  validateBasePrice,
  BasePriceValidation
} from '../services/currencyUtils';

interface UseMatchSettingsResult {
  matchSettings: MatchSettings | null;
  loading: boolean;
  error: Error | null;
  
  // Formatted display values
  formattedPurse: string;
  formattedAvgValue: string;
  formattedMaxBasePrice: string;
  formattedRecommendedMin: string;
  
  // Short form values
  shortPurse: string;
  shortAvgValue: string;
  shortMaxBasePrice: string;
  shortRecommendedMin: string;
  
  // Validation function
  validatePlayerBasePrice: (basePrice: number) => BasePriceValidation;
  
  // Status
  isLocked: boolean;
}

export const useMatchSettings = (matchId: string | null): UseMatchSettingsResult => {
  const [matchSettings, setMatchSettings] = useState<MatchSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!matchId) {
      setLoading(false);
      setMatchSettings(null);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToMatchSettings(
      matchId,
      (settings) => {
        setMatchSettings(settings);
        setLoading(false);
      },
      (err) => {
        console.error('useMatchSettings error:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [matchId]);

  // Formatted display values
  const formattedPurse = matchSettings?.pursePerTeam 
    ? formatIndianCurrency(matchSettings.pursePerTeam) 
    : '₹0';
  
  const formattedAvgValue = matchSettings?.avgPlayerValue 
    ? formatIndianCurrency(matchSettings.avgPlayerValue) 
    : '₹0';
  
  const formattedMaxBasePrice = matchSettings?.maxBasePrice 
    ? formatIndianCurrency(matchSettings.maxBasePrice) 
    : '₹0';
  
  const formattedRecommendedMin = matchSettings?.recommendedMinBase 
    ? formatIndianCurrency(matchSettings.recommendedMinBase) 
    : '₹0';

  // Short form values
  const shortPurse = matchSettings?.pursePerTeam 
    ? formatIndianCurrencyShort(matchSettings.pursePerTeam) 
    : '₹0';
  
  const shortAvgValue = matchSettings?.avgPlayerValue 
    ? formatIndianCurrencyShort(matchSettings.avgPlayerValue) 
    : '₹0';
  
  const shortMaxBasePrice = matchSettings?.maxBasePrice 
    ? formatIndianCurrencyShort(matchSettings.maxBasePrice) 
    : '₹0';
  
  const shortRecommendedMin = matchSettings?.recommendedMinBase 
    ? formatIndianCurrencyShort(matchSettings.recommendedMinBase) 
    : '₹0';

  // Base price validation function
  const validatePlayerBasePrice = useCallback((basePrice: number): BasePriceValidation => {
    if (!matchSettings) {
      return {
        isValid: true,
        hasWarning: false,
        hasError: false,
        warningMessage: null,
        errorMessage: null,
      };
    }
    
    return validateBasePrice(
      basePrice,
      matchSettings.maxBasePrice,
      matchSettings.avgPlayerValue
    );
  }, [matchSettings]);

  return {
    matchSettings,
    loading,
    error,
    formattedPurse,
    formattedAvgValue,
    formattedMaxBasePrice,
    formattedRecommendedMin,
    shortPurse,
    shortAvgValue,
    shortMaxBasePrice,
    shortRecommendedMin,
    validatePlayerBasePrice,
    isLocked: matchSettings?.isLocked || false,
  };
};

export default useMatchSettings;
