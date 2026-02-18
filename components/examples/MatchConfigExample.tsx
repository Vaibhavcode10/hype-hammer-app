/**
 * Example: Using Match Config System in Admin Dashboard
 * 
 * This example demonstrates how to:
 * 1. Subscribe to real-time config updates
 * 2. Display validation warnings
 * 3. Update config values
 * 4. Show config info to users
 */

import React from 'react';
import { useMatchConfig } from '../../hooks/useMatchConfig';
import { ConfigWarningBanner } from '../../components/ui';
import { DollarSign, Users, TrendingUp } from 'lucide-react';

interface ExampleDashboardProps {
  matchId: string;
}

export const ExampleDashboard: React.FC<ExampleDashboardProps> = ({ matchId }) => {
  const { config, validation, isLoading, updateConfig } = useMatchConfig(matchId);

  if (isLoading) {
    return <div>Loading configuration...</div>;
  }

  if (!config) {
    return <div>No configuration found</div>;
  }

  const handleIncreaseTeamLimit = async () => {
    try {
      await updateConfig({ maxTeams: (config.maxTeams || 8) + 2 });
      alert('Team limit increased!');
    } catch (error) {
      alert('Failed to update config');
    }
  };

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>

      {/* Real-time Validation Warnings */}
      <ConfigWarningBanner matchId={matchId} refreshInterval={30000} />

      {/* Configuration Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Team Budget Card */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-blue-200">
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="text-blue-500" size={24} />
            <h3 className="text-lg font-bold">Team Budget</h3>
          </div>
          <p className="text-3xl font-black text-blue-600">
            ₹{(config.baseTeamBudget / 100000).toFixed(1)}L
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Base budget per team
          </p>
        </div>

        {/* Bid Increment Card */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-emerald-200">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="text-emerald-500" size={24} />
            <h3 className="text-lg font-bold">Bid Increment</h3>
          </div>
          <p className="text-3xl font-black text-emerald-600">
            ₹{(config.bidIncrement / 100000).toFixed(1)}L
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Minimum bid increase
          </p>
        </div>

        {/* Teams Limit Card */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-purple-200">
          <div className="flex items-center gap-3 mb-4">
            <Users className="text-purple-500" size={24} />
            <h3 className="text-lg font-bold">Teams</h3>
          </div>
          <p className="text-3xl font-black text-purple-600">
            {validation?.registeredTeams || 0} / {config.maxTeams}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Registered teams
            {validation?.teamsExceeded && (
              <span className="ml-2 text-red-500 font-bold">⚠️ EXCEEDED</span>
            )}
          </p>
        </div>
      </div>

      {/* Squad Size Info */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <h3 className="text-xl font-bold mb-4">Squad Size Rules</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Minimum Players</p>
            <p className="text-2xl font-bold text-gray-800">{config.minSquad}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Maximum Players</p>
            <p className="text-2xl font-bold text-gray-800">{config.maxSquad}</p>
          </div>
        </div>
      </div>

      {/* Squad Violations (if any) */}
      {validation && validation.squadViolations.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-6">
          <h3 className="text-lg font-bold text-amber-800 mb-4">
            ⚠️ Squad Size Violations
          </h3>
          <div className="space-y-3">
            {validation.squadViolations.map((violation, idx) => (
              <div key={idx} className="bg-white p-4 rounded-lg border border-amber-200">
                <p className="font-bold text-gray-800">{violation.teamName}</p>
                <p className="text-sm text-gray-600">
                  {violation.squadSize} players - {violation.issue}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {validation?.teamsExceeded && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-6">
          <h3 className="text-lg font-bold text-red-800 mb-4">
            🚨 Action Required: Team Limit Exceeded
          </h3>
          <p className="text-gray-700 mb-4">
            You have {validation.registeredTeams} teams registered but the limit is {config.maxTeams}.
            You can either remove teams or increase the limit.
          </p>
          <button
            onClick={handleIncreaseTeamLimit}
            className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
          >
            Increase Limit to {config.maxTeams + 2}
          </button>
        </div>
      )}

      {/* All Clear Status */}
      {validation?.valid && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-6">
          <h3 className="text-lg font-bold text-emerald-800">
            ✅ All Configuration Rules Met
          </h3>
          <p className="text-gray-700 mt-2">
            Your match configuration is valid and all teams are within limits.
          </p>
        </div>
      )}
    </div>
  );
};

/**
 * Example: Simple Config Display in any page
 */
export const ConfigDisplay: React.FC<{ matchId: string }> = ({ matchId }) => {
  const { config, isLoading } = useMatchConfig(matchId, false); // No auto-validation

  if (isLoading || !config) return null;

  return (
    <div className="inline-flex items-center gap-4 text-sm">
      <span className="text-gray-600">
        Budget: <strong className="text-blue-600">₹{config.baseTeamBudget / 100000}L</strong>
      </span>
      <span className="text-gray-400">•</span>
      <span className="text-gray-600">
        Teams: <strong className="text-purple-600">{config.maxTeams}</strong>
      </span>
      <span className="text-gray-400">•</span>
      <span className="text-gray-600">
        Squad: <strong className="text-emerald-600">{config.minSquad}-{config.maxSquad}</strong>
      </span>
    </div>
  );
};
