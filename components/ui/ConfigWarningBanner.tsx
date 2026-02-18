/**
 * ConfigWarningBanner Component
 * Displays real-time validation warnings for match configuration
 */

import React, { useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, XCircle } from 'lucide-react';
import { validateMatchConfig, ValidationResult } from '../../services/matchConfigService';

interface ConfigWarningBannerProps {
  matchId: string;
  refreshInterval?: number; // in milliseconds, default 30000 (30 seconds)
  className?: string;
}

export const ConfigWarningBanner: React.FC<ConfigWarningBannerProps> = ({
  matchId,
  refreshInterval = 30000,
  className = ''
}) => {
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!matchId) return;

    const fetchValidation = async () => {
      try {
        const result = await validateMatchConfig(matchId);
        setValidation(result);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to validate match config:', error);
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchValidation();

    // Set up periodic refresh
    const intervalId = setInterval(fetchValidation, refreshInterval);

    return () => clearInterval(intervalId);
  }, [matchId, refreshInterval]);

  // Don't render if no warnings/errors
  if (isLoading || !validation) return null;
  if (!validation.teamsExceeded && validation.warnings.length === 0 && validation.errors.length === 0) {
    return null;
  }

  return (
    <div className={`rounded-2xl overflow-hidden ${className}`} 
         style={{ 
           background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.1))', 
           border: '1px solid rgba(239, 68, 68, 0.3)', 
           boxShadow: '0 8px 48px rgba(239, 68, 68, 0.2)' 
         }}>
      <div className="px-6 py-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" 
               style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
            <AlertCircle size={20} className="text-red-400" />
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-black text-red-400 uppercase tracking-wider mb-2">
              Configuration Warnings
            </h3>
            
            {/* Critical Errors */}
            {validation.errors.length > 0 && (
              <div className="mb-3">
                {validation.errors.map((error, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-3 rounded-lg bg-red-900/30 border border-red-500/40 mb-2">
                    <XCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-red-300 font-bold text-sm">{error}</p>
                  </div>
                ))}
              </div>
            )}
            
            {/* Teams Limit Warning */}
            {validation.teamsExceeded && (
              <div className="mb-3 p-4 rounded-xl bg-red-900/20 border border-red-500/30">
                <p className="text-red-300 font-bold">
                  ⚠️ Teams Limit Exceeded: {validation.registeredTeams}/{validation.maxTeams} teams registered
                </p>
                <p className="text-red-400/60 text-sm mt-1">
                  No further team registrations will be allowed until teams are removed or the limit is increased.
                </p>
              </div>
            )}
            
            {/* Squad Warnings */}
            {validation.warnings.length > 0 && (
              <div className="space-y-2">
                {validation.warnings.slice(0, 5).map((warning, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-3 rounded-lg bg-amber-900/20 border border-amber-500/30">
                    <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-amber-300 text-sm font-semibold">{warning}</p>
                  </div>
                ))}
                {validation.warnings.length > 5 && (
                  <p className="text-amber-400/60 text-xs italic ml-6">
                    + {validation.warnings.length - 5} more warnings
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Compact version for dashboard cards
 */
export const ConfigWarningPill: React.FC<ConfigWarningBannerProps> = ({
  matchId,
  refreshInterval = 30000,
  className = ''
}) => {
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  useEffect(() => {
    if (!matchId) return;

    const fetchValidation = async () => {
      try {
        const result = await validateMatchConfig(matchId);
        setValidation(result);
      } catch (error) {
        console.error('Failed to validate match config:', error);
      }
    };

    fetchValidation();
    const intervalId = setInterval(fetchValidation, refreshInterval);
    return () => clearInterval(intervalId);
  }, [matchId, refreshInterval]);

  if (!validation || (!validation.teamsExceeded && validation.warnings.length === 0)) {
    return null;
  }

  const totalIssues = validation.errors.length + (validation.teamsExceeded ? 1 : 0) + validation.warnings.length;

  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${className}`}
         style={{ 
           background: 'rgba(239, 68, 68, 0.15)', 
           border: '1px solid rgba(239, 68, 68, 0.3)' 
         }}>
      <AlertCircle size={14} className="text-red-400" />
      <span className="text-xs font-bold text-red-400">
        {totalIssues} {totalIssues === 1 ? 'Warning' : 'Warnings'}
      </span>
    </div>
  );
};
