import React, { useState } from 'react';
import { ArrowLeft, Save, RotateCcw, Download, Upload, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AuctionStatus, AuctionConfig, Player, Team, SportType, AuctionType } from '../../types';
import { CommandCard } from '../ui';

interface SettingsPageProps {
  config: AuctionConfig;
  setConfig: (config: AuctionConfig) => void;
  players: Player[];
  setPlayers: (players: Player[]) => void;
  teams: Team[];
  setTeams: (teams: Team[]) => void;
  setStatus: (status: AuctionStatus) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ 
  config, 
  setConfig, 
  players, 
  setPlayers, 
  teams, 
  setTeams, 
  setStatus 
}) => {
  const [localConfig, setLocalConfig] = useState<AuctionConfig>(config);
  const [saveNotification, setSaveNotification] = useState<string | null>(null);

  const handleSave = () => {
    setConfig(localConfig);
    setSaveNotification('Settings saved successfully!');
    setTimeout(() => setSaveNotification(null), 3000);
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

  return (
    <div className="min-h-screen bg-white flex flex-col p-4 lg:p-8 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-orange-50 pointer-events-none"></div>

      {/* Notification */}
      {saveNotification && (
        <div className="fixed top-8 right-8 z-[200] bg-gradient-to-r from-blue-500 to-orange-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-5">
          <CheckCircle2 size={20} />
          <span className="font-black text-sm uppercase tracking-wider">{saveNotification}</span>
        </div>
      )}

      <div className="w-full max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setStatus(AuctionStatus.READY)}
              className="flex items-center gap-3 bg-white/80 border border-blue-500/20 backdrop-blur-xl px-6 py-3 rounded-full text-blue-600 hover:bg-blue-500 hover:text-white transition-all shadow-lg"
            >
              <ArrowLeft size={18} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Back</span>
            </button>
            
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl overflow-hidden border-2 border-blue-500">
                <img src="./logo.jpg" alt="Logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <h2 className="text-2xl font-display font-black tracking-widest gold-text uppercase leading-none">Settings</h2>
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.3em] mt-1">Configuration Panel</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button 
              onClick={handleReset}
              className="px-5 py-3 bg-[#3d2f2b] border border-blue-500/20 rounded-full text-blue-600 hover:bg-blue-500/10 transition-all text-[10px] font-black uppercase tracking-wider flex items-center gap-2"
            >
              <RotateCcw size={14} />
              Reset
            </button>
            <button 
              onClick={handleSave}
              className="px-5 py-3 gold-gradient rounded-full text-white hover:brightness-110 transition-all text-[10px] font-black uppercase tracking-wider flex items-center gap-2 shadow-lg"
            >
              <Save size={14} />
              Save Changes
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Basic Configuration */}
          <CommandCard title="Basic Configuration" className="h-fit">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-blue-600 tracking-wider">Sport Type</label>
                <select 
                  className="w-full bg-white border border-2 border-slate-300 rounded-2xl px-5 py-4 text-slate-900 outline-none focus:ring-1 ring-blue-500"
                  value={localConfig.sport}
                  onChange={(e) => setLocalConfig({...localConfig, sport: e.target.value as SportType})}
                >
                  {Object.values(SportType).map(sport => (
                    <option key={sport} value={sport}>{sport}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-blue-600 tracking-wider">Auction Type</label>
                <select 
                  className="w-full bg-white border border-2 border-slate-300 rounded-2xl px-5 py-4 text-slate-900 outline-none focus:ring-1 ring-blue-500"
                  value={localConfig.type}
                  onChange={(e) => setLocalConfig({...localConfig, type: e.target.value as AuctionType})}
                >
                  {Object.values(AuctionType).map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-blue-600 tracking-wider">Total Budget per Team</label>
                <input 
                  type="number"
                  className="w-full bg-white border border-2 border-slate-300 rounded-2xl px-5 py-4 text-slate-900 outline-none focus:ring-1 ring-blue-500 font-mono"
                  value={localConfig.totalBudget}
                  onChange={(e) => setLocalConfig({...localConfig, totalBudget: Number(e.target.value)})}
                />
                <p className="text-[9px] text-slate-600 italic">Amount: ${localConfig.totalBudget.toLocaleString()}</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-blue-600 tracking-wider">Minimum Bid Increment</label>
                <input 
                  type="number"
                  className="w-full bg-white border border-2 border-slate-300 rounded-2xl px-5 py-4 text-slate-900 outline-none focus:ring-1 ring-blue-500 font-mono"
                  value={localConfig.minBidIncrement}
                  onChange={(e) => setLocalConfig({...localConfig, minBidIncrement: Number(e.target.value)})}
                />
                <p className="text-[9px] text-slate-600 italic">Amount: ${localConfig.minBidIncrement.toLocaleString()}</p>
              </div>
            </div>
          </CommandCard>

          {/* Player Roles */}
          <CommandCard title="Player Roles" className="h-fit">
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <p className="text-[10px] text-slate-600 uppercase tracking-wider">
                  {localConfig.roles.length} role(s) configured
                </p>
                <button 
                  onClick={addRole}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-orange-500/10 border border-blue-500/20 rounded-full text-blue-600 hover:bg-blue-500 hover:text-white transition-all text-[9px] font-black uppercase"
                >
                  + Add Role
                </button>
              </div>
              
              <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                {localConfig.roles.map((role) => (
                  <div 
                    key={role.id}
                    className="flex items-center justify-between bg-white border border-2 border-slate-300 rounded-2xl px-5 py-3 group hover:border-blue-500/20 transition-all"
                  >
                    <span className="text-slate-900 font-bold">{role.name}</span>
                    <button 
                      onClick={() => removeRole(role.id)}
                      className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-[#a65d50]/10 rounded-lg transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </CommandCard>

          {/* Data Statistics */}
          <CommandCard title="Data Overview" className="h-fit">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-2 border-slate-300 rounded-2xl p-5">
                  <p className="text-[9px] font-black uppercase text-slate-600 mb-2">Total Players</p>
                  <p className="text-3xl font-display font-black text-slate-900">{players.length}</p>
                </div>
                <div className="bg-white border border-2 border-slate-300 rounded-2xl p-5">
                  <p className="text-[9px] font-black uppercase text-slate-600 mb-2">Total Teams</p>
                  <p className="text-3xl font-display font-black text-slate-900">{teams.length}</p>
                </div>
                <div className="bg-white border border-2 border-slate-300 rounded-2xl p-5">
                  <p className="text-[9px] font-black uppercase text-slate-600 mb-2">Sold Players</p>
                  <p className="text-3xl font-display font-black text-blue-600">{players.filter(p => p.status === 'SOLD').length}</p>
                </div>
                <div className="bg-white border border-2 border-slate-300 rounded-2xl p-5">
                  <p className="text-[9px] font-black uppercase text-slate-600 mb-2">Pending Players</p>
                  <p className="text-3xl font-display font-black text-slate-900">{players.filter(p => p.status === 'PENDING').length}</p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-500 to-orange-500/5 border border-blue-500/20 rounded-2xl p-5 mt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-black uppercase text-blue-600 mb-1">Important</p>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Changing the total budget will not affect teams already created. 
                      You'll need to manually update existing team budgets if needed.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CommandCard>

          {/* Data Management */}
          <CommandCard title="Data Management" className="h-fit">
            <div className="space-y-4">
              <button 
                onClick={handleExportData}
                className="w-full py-4 bg-white border border-blue-500/20 rounded-2xl text-blue-600 hover:bg-blue-500/10 transition-all text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-3"
              >
                <Download size={16} />
                Export All Data (JSON)
              </button>

              <button 
                onClick={handleImportData}
                className="w-full py-4 bg-white border border-blue-500/20 rounded-2xl text-blue-600 hover:bg-blue-500/10 transition-all text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-3"
              >
                <Upload size={16} />
                Import Data from File
              </button>

              <div className="border-t border-2 border-slate-300 pt-4 mt-6">
                <p className="text-[10px] font-black uppercase text-red-500 mb-3 flex items-center gap-2">
                  <AlertCircle size={14} />
                  Danger Zone
                </p>
                <button 
                  onClick={handleClearAllData}
                  className="w-full py-4 bg-[#a65d50]/10 border border-[#a65d50]/20 rounded-2xl text-red-500 hover:bg-[#a65d50]/20 transition-all text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-3"
                >
                  <Trash2 size={16} />
                  Clear All Players & Teams
                </button>
              </div>
            </div>
          </CommandCard>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <button 
            onClick={() => setStatus(AuctionStatus.SETUP)}
            className="px-8 py-4 bg-white border border-blue-500/20 rounded-full text-blue-600 hover:bg-blue-500/10 transition-all text-[11px] font-black uppercase tracking-wider"
          >
            Go to Setup Page
          </button>
          <button 
            onClick={() => setStatus(AuctionStatus.READY)}
            className="px-8 py-4 gold-gradient rounded-full text-white hover:brightness-110 transition-all text-[11px] font-black uppercase tracking-wider shadow-lg"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
