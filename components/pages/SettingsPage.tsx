import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, RotateCcw, Download, Upload, Trash2, AlertCircle, CheckCircle2, Gavel, DollarSign, TrendingUp, Users, Trophy, Shield, Database, Activity } from 'lucide-react';
import { AuctionStatus, AuctionConfig, Player, Team, SportType, AuctionType, CurrencyUnit } from '../../types';
import { subscribeToMatchConfig, updateMatchConfig, MatchConfig, validateMatchConfig, ValidationResult, subscribeToCurrencyUnit, updateCurrencyUnit, DEFAULT_CURRENCY_UNIT } from '../../services/matchConfigService';

interface SettingsPageProps {
  config: AuctionConfig;
  setConfig: (config: AuctionConfig) => void;
  players: Player[];
  setPlayers: (players: Player[]) => void;
  teams: Team[];
  setTeams: (teams: Team[]) => void;
  setStatus: (status: AuctionStatus) => void;
  matchId?: string; // Add matchId prop for Firebase sync
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ 
  config, 
  setConfig, 
  players, 
  setPlayers, 
  teams, 
  setTeams, 
  setStatus,
  matchId // Get matchId prop
}) => {
  const [localConfig, setLocalConfig] = useState<AuctionConfig>(config);
  const [saveNotification, setSaveNotification] = useState<string | null>(null);
  const [matchConfig, setMatchConfig] = useState<MatchConfig | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [currencyUnit, setCurrencyUnit] = useState<CurrencyUnit>(DEFAULT_CURRENCY_UNIT);

  // Subscribe to real-time config updates from Firebase
  useEffect(() => {
    if (!matchId) return;

    console.log('🔄 Subscribing to match config for:', matchId);
    
    const unsubscribe = subscribeToMatchConfig(
      matchId,
      (config) => {
        console.log('📥 Received config update:', config);
        setMatchConfig(config);
        
        // Update localConfig with Firebase values
        setLocalConfig(prev => ({
          ...prev,
          totalBudget: config.baseTeamBudget,
          minBidIncrement: config.bidIncrement,
          squadSize: {
            min: config.minSquad,
            max: config.maxSquad
          }
        }));
      },
      (error) => {
        console.error('❌ Config subscription error:', error);
      }
    );

    // Also fetch validation status
    if (matchId) {
      validateMatchConfig(matchId)
        .then(setValidation)
        .catch(err => console.error('Failed to validate:', err));
    }

    return () => {
      console.log('🔌 Unsubscribing from match config');
      unsubscribe();
    };
  }, [matchId]);

  // Subscribe to currency unit changes
  useEffect(() => {
    if (!matchId) return;

    const unsubscribe = subscribeToCurrencyUnit(
      matchId,
      (unit) => {
        console.log('💱 Currency unit updated:', unit);
        setCurrencyUnit(unit);
      },
      (error) => {
        console.error('❌ Currency unit subscription error:', error);
      }
    );

    return () => {
      console.log('🔌 Unsubscribing from currency unit');
      unsubscribe();
    };
  }, [matchId]);

  const handleSave = async () => {
    if (matchId && matchConfig) {
      setIsSaving(true);
      try {
        // Save to Firebase via API
        const configUpdate: Partial<MatchConfig> = {
          baseTeamBudget: localConfig.totalBudget,
          bidIncrement: localConfig.minBidIncrement || 100000,
          maxTeams: matchConfig.maxTeams, // Keep existing maxTeams
          minSquad: localConfig.squadSize.min,
          maxSquad: localConfig.squadSize.max,
        };

        await updateMatchConfig(matchId, configUpdate);
        
        setSaveNotification('✅ Settings saved to Firebase!');
        
        // Re-validate after save
        const newValidation = await validateMatchConfig(matchId);
        setValidation(newValidation);
        
        setTimeout(() => setSaveNotification(null), 3000);
      } catch (error) {
        console.error('Failed to save config:', error);
        setSaveNotification('❌ Failed to save settings');
        setTimeout(() => setSaveNotification(null), 3000);
      } finally {
        setIsSaving(false);
      }
    } else {
      // Fallback to local state update (for backward compatibility)
      setConfig(localConfig);
      setSaveNotification('Settings saved successfully!');
      setTimeout(() => setSaveNotification(null), 3000);
    }
  };

  const handleReset = () => {
    setLocalConfig(config);
    setSaveNotification('Settings reset to last saved state');
    setTimeout(() => setSaveNotification(null), 3000);
  };

  const handleExportData = () => {
    const exportData = {
      config: localConfig,
      players,
      teams,
      exportDate: new Date().toISOString()
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `hypehammer_settings_${new Date().toISOString()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    setSaveNotification('Data exported successfully!');
    setTimeout(() => setSaveNotification(null), 3000);
  };

  const handleImportData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event: any) => {
        try {
          const importedData = JSON.parse(event.target.result);
          if (importedData.config) setLocalConfig(importedData.config);
          if (importedData.players) setPlayers(importedData.players);
          if (importedData.teams) setTeams(importedData.teams);
          setSaveNotification('Data imported successfully!');
          setTimeout(() => setSaveNotification(null), 3000);
        } catch (error) {
          setSaveNotification('Error importing data. Please check the file format.');
          setTimeout(() => setSaveNotification(null), 3000);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleClearAllData = () => {
    if (window.confirm('Are you sure you want to clear all players and teams? This action cannot be undone.')) {
      setPlayers([]);
      setTeams([]);
      setSaveNotification('All data cleared!');
      setTimeout(() => setSaveNotification(null), 3000);
    }
  };

  const addRole = () => {
    const roleName = prompt('Enter new role name:');
    if (roleName && roleName.trim()) {
      setLocalConfig({
        ...localConfig,
        roles: [...localConfig.roles, { id: Math.random().toString(36).substr(2, 9), name: roleName.trim() }]
      });
    }
  };

  const removeRole = (roleId: string) => {
    if (localConfig.roles.length <= 1) {
      alert('Cannot remove the last role. At least one role is required.');
      return;
    }
    setLocalConfig({
      ...localConfig,
      roles: localConfig.roles.filter(r => r.id !== roleId)
    });
  };

  const handleCurrencyUnitChange = async (unit: CurrencyUnit) => {
    if (!matchId) return;
    
    setCurrencyUnit(unit);
    try {
      await updateCurrencyUnit(matchId, unit);
      setSaveNotification(`✅ Currency unit changed to ${unit}`);
      setTimeout(() => setSaveNotification(null), 2000);
    } catch (error) {
      console.error('Failed to update currency unit:', error);
      setSaveNotification('❌ Failed to update currency unit');
      setTimeout(() => setSaveNotification(null), 3000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a0118 0%, #1a0a2e 50%, #16213e 100%)' }}>
      {/* Cinematic Styles */}
      <style>{`
        .settings-hud-card {
          background: linear-gradient(135deg, rgba(255, 20, 100, 0.06) 0%, rgba(139, 0, 50, 0.1) 100%);
          backdrop-filter: blur(28px) saturate(1.4);
          border: 1px solid rgba(255, 0, 102, 0.15);
          box-shadow: 0 8px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 0 60px rgba(255, 0, 102, 0.04);
          transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
          position: relative;
        }
        .settings-hud-card::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent 0%, rgba(255, 0, 102, 0.5) 20%, rgba(255, 100, 163, 0.4) 50%, rgba(255, 0, 102, 0.5) 80%, transparent 100%);
          opacity: 0;
          transition: opacity 0.35s;
        }
        .settings-hud-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5), 0 0 40px rgba(255, 0, 102, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 0, 102, 0.4);
        }
        .settings-hud-card:hover::after { opacity: 1; }
        @keyframes settings-neon-pulse {
          0%, 100% { box-shadow: 0 0 10px rgba(255, 0, 102, 0.5), 0 0 30px rgba(255, 0, 102, 0.25); }
          50% { box-shadow: 0 0 20px rgba(255, 0, 102, 0.7), 0 0 50px rgba(255, 0, 102, 0.4); }
        }
        .settings-neon-pulse { animation: settings-neon-pulse 2s ease-in-out infinite; }
      `}</style>

      {/* Scan lines overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.015]" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(255, 0, 102, 0.12) 4px, rgba(255, 0, 102, 0.12) 5px)' }}></div>

      {/* Notification */}
      {saveNotification && (
        <div className="fixed top-8 right-8 z-[200] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-5" style={{ background: 'linear-gradient(135deg, rgba(255, 0, 102, 0.9), rgba(249, 115, 22, 0.8))', border: '1px solid rgba(255, 100, 163, 0.5)', boxShadow: '0 0 30px rgba(255, 0, 102, 0.4)' }}>
          <CheckCircle2 size={20} className="text-white" />
          <span className="font-black text-sm uppercase tracking-wider text-white">{saveNotification}</span>
        </div>
      )}

      <div className="w-full max-w-7xl mx-auto relative z-10 p-4 lg:p-8">
        {/* TOP COMMAND BAR — Same as Admin Dashboard */}
        <div className="relative rounded-2xl overflow-hidden mb-8" style={{ background: 'linear-gradient(90deg, rgba(26, 10, 10, 0.96), rgba(45, 10, 10, 0.92), rgba(26, 10, 10, 0.96))', border: '1px solid rgba(255, 0, 102, 0.15)', boxShadow: '0 8px 48px rgba(0, 0, 0, 0.5), 0 0 60px rgba(255, 0, 102, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.04)' }}>
          {/* Top edge glow */}
          <div className="absolute top-0 left-[10%] right-[10%] h-[1px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(255, 0, 102, 0.7), rgba(255, 100, 163, 0.5), rgba(255, 0, 102, 0.7), transparent)' }}></div>
          <div className="px-8 py-4 flex items-center justify-between gap-6">
            {/* Left: Back + Title */}
            <div className="flex items-center gap-4 flex-shrink-0">
              <button 
                onClick={() => setStatus(AuctionStatus.READY)}
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all text-pink-300/60 hover:text-pink-400 hover:bg-pink-500/10"
                style={{ border: '1px solid rgba(255, 0, 102, 0.15)' }}
              >
                <ArrowLeft size={18} />
              </button>
              <div className="w-[4px] h-11 rounded-full" style={{ background: 'linear-gradient(180deg, rgba(255, 0, 102, 0.9), rgba(249, 115, 22, 0.7))' }}></div>
              <div>
                <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-red-400 to-orange-400 uppercase tracking-[0.2em] leading-tight">
                  Settings
                </h2>
                <p className="text-xs text-pink-400/40 font-bold uppercase tracking-[0.3em] mt-0.5">
                  {localConfig.sport} <span className="text-red-400/30">|</span> Configuration Panel
                </p>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <button 
                onClick={handleReset}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all text-pink-300/60 hover:text-pink-400"
                style={{ background: 'rgba(255, 0, 102, 0.06)', border: '1px solid rgba(255, 0, 102, 0.15)' }}
              >
                <RotateCcw size={16} />
                <span className="text-xs font-black uppercase tracking-wider">Reset</span>
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white transition-all hover:brightness-110 settings-neon-pulse disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, rgba(255, 0, 102, 0.7), rgba(249, 115, 22, 0.6))', border: '1px solid rgba(255, 0, 102, 0.4)' }}
              >
                <Save size={16} />
                <span className="text-xs font-black uppercase tracking-wider">
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* VALIDATION WARNINGS BANNER */}
        {validation && (validation.teamsExceeded || validation.warnings.length > 0) && (
          <div className="mb-8 rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.1))', border: '1px solid rgba(239, 68, 68, 0.3)', boxShadow: '0 8px 48px rgba(239, 68, 68, 0.2)' }}>
            <div className="px-8 py-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
                  <AlertCircle size={24} className="text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-black text-red-400 uppercase tracking-wider mb-3">Configuration Warnings</h3>
                  
                  {validation.teamsExceeded && (
                    <div className="mb-4 p-4 rounded-xl bg-red-900/20 border border-red-500/30">
                      <p className="text-red-300 font-bold">
                        ⚠️ Teams Limit Exceeded: {validation.registeredTeams}/{validation.maxTeams} teams registered
                      </p>
                      <p className="text-red-400/60 text-sm mt-1">
                        No further team registrations will be allowed until teams are removed or the limit is increased.
                      </p>
                    </div>
                  )}
                  
                  {validation.warnings.length > 0 && (
                    <div className="space-y-2">
                      {validation.warnings.map((warning, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-amber-900/20 border border-amber-500/30">
                          <p className="text-amber-300 text-sm font-semibold">{warning}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* AUCTION CONFIGURATION CARD */}
          <div className="settings-hud-card rounded-2xl overflow-hidden">
            <div className="p-10">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-pink-500/20 border border-pink-500/30">
                  <Gavel size={28} className="text-pink-400" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-pink-100 uppercase tracking-wider">Auction Configuration</h3>
                  <p className="text-xs text-pink-400/40 uppercase tracking-widest mt-1">Core Settings</p>
                </div>
              </div>

              <div className="space-y-7">
                <div>
                  <label className="text-sm font-black uppercase text-pink-400/60 tracking-wider block mb-3">Sport Type</label>
                  <select 
                    className="w-full bg-pink-900/20 border border-pink-500/30 rounded-xl px-6 py-5 text-lg text-pink-100 outline-none focus:border-pink-500 transition-all"
                    value={localConfig.sport}
                    onChange={(e) => setLocalConfig({...localConfig, sport: e.target.value as SportType})}
                  >
                    {Object.values(SportType).map(sport => (
                      <option key={sport} value={sport}>{sport}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-black uppercase text-pink-400/60 tracking-wider block mb-3">Auction Type</label>
                  <select 
                    className="w-full bg-pink-900/20 border border-pink-500/30 rounded-xl px-6 py-5 text-lg text-pink-100 outline-none focus:border-pink-500 transition-all"
                    value={localConfig.type}
                    onChange={(e) => setLocalConfig({...localConfig, type: e.target.value as AuctionType})}
                  >
                    {Object.values(AuctionType).map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-black uppercase text-pink-400/60 tracking-wider block mb-3">Total Budget per Team</label>
                  <input 
                    type="number"
                    className="w-full bg-pink-900/20 border border-pink-500/30 rounded-xl px-6 py-5 text-lg text-pink-100 outline-none focus:border-pink-500 transition-all font-mono"
                    value={localConfig.totalBudget}
                    onChange={(e) => setLocalConfig({...localConfig, totalBudget: Number(e.target.value) || 0})}
                  />
                  <p className="text-sm text-emerald-400/60 mt-2 font-mono">₹{localConfig.totalBudget.toLocaleString()}</p>
                </div>

                <div>
                  <label className="text-sm font-black uppercase text-pink-400/60 tracking-wider block mb-3">Minimum Bid Increment</label>
                  <input 
                    type="number"
                    className="w-full bg-pink-900/20 border border-pink-500/30 rounded-xl px-6 py-5 text-lg text-pink-100 outline-none focus:border-pink-500 transition-all font-mono"
                    value={localConfig.minBidIncrement}
                    onChange={(e) => setLocalConfig({...localConfig, minBidIncrement: Number(e.target.value) || 0})}
                  />
                  <p className="text-sm text-emerald-400/60 mt-2 font-mono">₹{localConfig.minBidIncrement.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* CURRENCY SETTINGS CARD */}
          <div className="settings-hud-card rounded-2xl overflow-hidden">
            <div className="p-10">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-emerald-500/20 border border-emerald-500/30">
                  <DollarSign size={28} className="text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-pink-100 uppercase tracking-wider">Currency Display</h3>
                  <p className="text-xs text-pink-400/40 uppercase tracking-widest mt-1">How Amounts Are Shown</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-sm font-black uppercase text-pink-400/60 tracking-wider block mb-4">Select Currency Unit</label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['K', 'L', 'Cr'] as const).map((unit: CurrencyUnit) => (
                      <button
                        key={unit}
                        onClick={() => handleCurrencyUnitChange(unit)}
                        className={`py-4 px-3 rounded-xl font-black text-lg uppercase transition-all ${
                          currencyUnit === unit
                            ? 'bg-emerald-500/30 border-2 border-emerald-400 text-emerald-100 shadow-lg shadow-emerald-500/20'
                            : 'bg-pink-900/20 border-2 border-pink-500/20 text-pink-300/60 hover:border-emerald-400/40 hover:text-emerald-300'
                        }`}
                      >
                        {unit}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-pink-900/15 border border-pink-500/15 rounded-xl p-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle size={20} className="text-pink-400/60 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-black uppercase text-pink-400/60 mb-2">Current Setting</p>
                      <p className="text-2xl font-black text-emerald-400 font-mono">{currencyUnit}</p>
                      <p className="text-xs text-pink-300/50 mt-2 leading-relaxed">
                        All monetary values will display with this currency unit. Changes apply instantly across all auction views.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* PLAYER ROLES CARD */}
          <div className="settings-hud-card rounded-2xl overflow-hidden">
            <div className="p-10">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-indigo-500/20 border border-indigo-500/30">
                    <Shield size={28} className="text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-pink-100 uppercase tracking-wider">Player Roles</h3>
                    <p className="text-xs text-pink-400/40 uppercase tracking-widest mt-1">{localConfig.roles.length} Role(s) Configured</p>
                  </div>
                </div>
                <button 
                  onClick={addRole}
                  className="flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-black text-blue-400 uppercase transition-all hover:bg-blue-500/20"
                  style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)' }}
                >
                  + Add Role
                </button>
              </div>
              
              <div className="space-y-4 max-h-[350px] overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                {localConfig.roles.map((role) => (
                  <div 
                    key={role.id}
                    className="flex items-center justify-between bg-pink-900/20 border border-pink-500/20 rounded-xl px-6 py-5 group hover:border-pink-500/40 transition-all"
                  >
                    <span className="text-pink-100 font-bold text-lg">{role.name}</span>
                    <button 
                      onClick={() => removeRole(role.id)}
                      className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* DATA OVERVIEW CARD */}
          <div className="settings-hud-card rounded-2xl overflow-hidden">
            <div className="p-10">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-cyan-500/20 border border-cyan-500/30">
                  <Activity size={28} className="text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-pink-100 uppercase tracking-wider">Data Overview</h3>
                  <p className="text-xs text-pink-400/40 uppercase tracking-widest mt-1">Live Statistics</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5 mb-8">
                <div className="bg-pink-900/20 border border-pink-500/20 rounded-xl p-6">
                  <p className="text-sm font-black uppercase text-pink-400/50 tracking-wider mb-2">Total Players</p>
                  <p className="text-5xl font-black text-pink-100">{players.length}</p>
                </div>
                <div className="bg-pink-900/20 border border-pink-500/20 rounded-xl p-6">
                  <p className="text-sm font-black uppercase text-pink-400/50 tracking-wider mb-2">Total Teams</p>
                  <p className="text-5xl font-black text-pink-100">{teams.length}</p>
                </div>
                <div className="bg-emerald-900/20 border border-emerald-500/20 rounded-xl p-6">
                  <p className="text-sm font-black uppercase text-emerald-400/50 tracking-wider mb-2">Sold Players</p>
                  <p className="text-5xl font-black text-emerald-400">{players.filter(p => p.status === 'SOLD').length}</p>
                </div>
                <div className="bg-amber-900/20 border border-amber-500/20 rounded-xl p-6">
                  <p className="text-sm font-black uppercase text-amber-400/50 tracking-wider mb-2">Pending Players</p>
                  <p className="text-5xl font-black text-amber-400">{players.filter(p => p.status === 'PENDING').length}</p>
                </div>
              </div>

              <div className="bg-pink-900/15 border border-pink-500/15 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-pink-400/60 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-black uppercase text-pink-400/60 mb-2">Important</p>
                    <p className="text-base text-pink-300/50 leading-relaxed">
                      Changing the total budget will not affect teams already created. 
                      You'll need to manually update existing team budgets if needed.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* DATA MANAGEMENT CARD */}
          <div className="settings-hud-card rounded-2xl overflow-hidden">
            <div className="p-10">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-blue-500/20 border border-blue-500/30">
                  <Database size={28} className="text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-pink-100 uppercase tracking-wider">Data Management</h3>
                  <p className="text-xs text-pink-400/40 uppercase tracking-widest mt-1">Import / Export / Clear</p>
                </div>
              </div>

              <div className="space-y-5">
                <button 
                  onClick={handleExportData}
                  className="w-full py-5 rounded-xl text-sm font-black uppercase tracking-wider flex items-center justify-center gap-3 transition-all hover:border-blue-500/40"
                  style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', color: 'rgba(147, 197, 253, 0.8)' }}
                >
                  <Download size={20} />
                  Export All Data (JSON)
                </button>

                <button 
                  onClick={handleImportData}
                  className="w-full py-5 rounded-xl text-sm font-black uppercase tracking-wider flex items-center justify-center gap-3 transition-all hover:border-emerald-500/40"
                  style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', color: 'rgba(110, 231, 183, 0.8)' }}
                >
                  <Upload size={20} />
                  Import Data from File
                </button>

                <div className="border-t border-pink-500/10 pt-6 mt-6">
                  <p className="text-sm font-black uppercase text-red-400/60 mb-4 flex items-center gap-2">
                    <AlertCircle size={18} className="text-red-400/60" />
                    Danger Zone
                  </p>
                  <button 
                    onClick={handleClearAllData}
                    className="w-full py-5 rounded-xl text-sm font-black uppercase tracking-wider flex items-center justify-center gap-3 transition-all hover:bg-red-500/15"
                    style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'rgba(252, 165, 165, 0.8)' }}
                  >
                    <Trash2 size={20} />
                    Clear All Players & Teams
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION BUTTONS */}
        <div className="mt-10 flex flex-col sm:flex-row gap-5 justify-center">
          <button 
            onClick={() => setStatus(AuctionStatus.MARKETPLACE)}
            className="px-12 py-5 rounded-xl text-sm font-black uppercase tracking-wider transition-all hover:border-pink-500/40"
            style={{ background: 'rgba(255, 0, 102, 0.06)', border: '1px solid rgba(255, 0, 102, 0.15)', color: 'rgba(244, 114, 182, 0.7)' }}
          >
            Go to Marketplace
          </button>
          <button 
            onClick={() => setStatus(AuctionStatus.READY)}
            className="px-12 py-5 rounded-xl text-sm font-black uppercase tracking-wider text-white transition-all hover:brightness-110 settings-neon-pulse"
            style={{ background: 'linear-gradient(135deg, rgba(255, 0, 102, 0.7), rgba(249, 115, 22, 0.6))', border: '1px solid rgba(255, 0, 102, 0.4)' }}
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};