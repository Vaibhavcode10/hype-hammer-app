import React, { useState } from 'react';
import { 
  ArrowLeft, User, Settings as SettingsIcon, Trophy, Database, 
  Users, Palette, Bell, Shield, HelpCircle, Info, History,
  Save, RotateCcw, Download, Upload, Trash2, CheckCircle2,
  Plus, Eye, EyeOff, Mail, Lock, Camera
} from 'lucide-react';
import { AuctionStatus, AuctionConfig, Player, Team, SportType, AuctionType } from '../../types';

interface SettingsLayoutPageProps {
  config: AuctionConfig;
  setConfig: (config: AuctionConfig) => void;
  players: Player[];
  setPlayers: (players: Player[]) => void;
  teams: Team[];
  setTeams: (teams: Team[]) => void;
  currentUser: {
    name: string;
    email: string;
    avatar?: string;
  };
  setCurrentUser: (user: { name: string; email: string; avatar?: string }) => void;
  setStatus: (status: AuctionStatus) => void;
}

export const SettingsLayoutPage: React.FC<SettingsLayoutPageProps> = ({ 
  config, 
  setConfig, 
  players, 
  setPlayers, 
  teams, 
  setTeams,
  currentUser,
  setCurrentUser,
  setStatus 
}) => {
  const [activeSection, setActiveSection] = useState<string>('general');
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

  const menuItems = [
    { id: 'profile', icon: <User size={18} />, label: 'Profile' },
    { id: 'general', icon: <SettingsIcon size={18} />, label: 'General' },
    { id: 'match', icon: <Trophy size={18} />, label: 'Match Config' },
    { id: 'data', icon: <Database size={18} />, label: 'Data Management' },
    { id: 'teams', icon: <Users size={18} />, label: 'Teams & Players' },
    { id: 'appearance', icon: <Palette size={18} />, label: 'Appearance' },
    { id: 'notifications', icon: <Bell size={18} />, label: 'Notifications' },
    { id: 'privacy', icon: <Shield size={18} />, label: 'Privacy' },
    { id: 'history', icon: <History size={18} />, label: 'History' },
    { id: 'help', icon: <HelpCircle size={18} />, label: 'Help' },
    { id: 'about', icon: <Info size={18} />, label: 'About' },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-display font-black text-blue-600 uppercase mb-2">Profile Settings</h2>
              <p className="text-sm text-slate-600">Manage your account information</p>
            </div>

            <div className="space-y-8">
              <div>
                <h3 className="text-sm font-black uppercase text-blue-600 tracking-wider mb-4">Profile Information</h3>
                <div className="space-y-6">
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#c5a059] to-[#d4af6a] flex items-center justify-center overflow-hidden">
                        {currentUser.avatar ? (
                          <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                        ) : (
                          <User size={48} className="text-white" />
                        )}
                      </div>
                      <button className="absolute bottom-0 right-0 p-2 bg-gradient-to-r from-blue-500 to-orange-500 rounded-lg hover:brightness-110 transition-all">
                        <Camera size={16} className="text-white" />
                      </button>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-slate-600 mb-2">Profile Picture</p>
                      <button className="text-xs font-black uppercase text-blue-600 hover:text-[#d4af6a] transition-colors">
                        Change Avatar
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-blue-600 tracking-wider">Full Name</label>
                    <input 
                      type="text"
                      className="w-full bg-white border border-slate-300 rounded-2xl px-5 py-4 text-slate-900 outline-none focus:ring-1 ring-blue-500"
                      value={currentUser.name}
                      onChange={(e) => setCurrentUser({ ...currentUser, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-blue-600 tracking-wider">Email Address</label>
                    <input 
                      type="email"
                      className="w-full bg-white border border-slate-300 rounded-2xl px-5 py-4 text-slate-900 outline-none focus:ring-1 ring-blue-500"
                      value={currentUser.email}
                      onChange={(e) => setCurrentUser({ ...currentUser, email: e.target.value })}
                    />
                  </div>

                  <button 
                    onClick={() => {
                      setSaveNotification('Profile updated successfully!');
                      setTimeout(() => setSaveNotification(null), 3000);
                    }}
                    className="px-6 py-3 gold-gradient rounded-xl text-white font-black uppercase text-xs tracking-wider hover:brightness-110 transition-all"
                  >
                    Update Profile
                  </button>
                </div>
              </div>

              <div className="border-t border-slate-300 pt-8">
                <h3 className="text-sm font-black uppercase text-blue-600 tracking-wider mb-4">Security</h3>
                <div className="space-y-3">
                  <button className="w-full px-5 py-4 bg-white border border-slate-300 rounded-2xl hover:border-blue-500/40 transition-all flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <Lock size={18} className="text-blue-600" />
                      <span className="text-sm font-bold text-slate-900">Change Password</span>
                    </div>
                    <ArrowLeft size={16} className="text-slate-600 rotate-180 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button className="w-full px-5 py-4 bg-white border border-slate-300 rounded-2xl hover:border-blue-500/40 transition-all flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <Shield size={18} className="text-blue-600" />
                      <span className="text-sm font-bold text-slate-900">Two-Factor Authentication</span>
                    </div>
                    <ArrowLeft size={16} className="text-slate-600 rotate-180 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'general':
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-display font-black text-blue-600 uppercase mb-2">General Settings</h2>
              <p className="text-sm text-slate-600">Basic configuration and preferences</p>
            </div>

            <div>
              <h3 className="text-sm font-black uppercase text-blue-600 tracking-wider mb-4">Basic Configuration</h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-blue-600 tracking-wider">Sport Type</label>
                  <select 
                    className="w-full bg-white border border-slate-300 rounded-2xl px-5 py-4 text-slate-900 outline-none focus:ring-1 ring-blue-500"
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
                    className="w-full bg-white border border-slate-300 rounded-2xl px-5 py-4 text-slate-900 outline-none focus:ring-1 ring-blue-500"
                    value={localConfig.type}
                    onChange={(e) => setLocalConfig({...localConfig, type: e.target.value as AuctionType})}
                  >
                    {Object.values(AuctionType).map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        );

      case 'match':
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-display font-black text-blue-600 uppercase mb-2">Match Configuration</h2>
              <p className="text-sm text-slate-600">Configure sport settings, budget, and roles</p>
            </div>

            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-sm font-black uppercase text-blue-600 tracking-wider mb-4">Budget Settings</h3>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-blue-600 tracking-wider">Total Budget per Team</label>
                    <input 
                      type="number"
                      className="w-full bg-white border border-slate-300 rounded-2xl px-5 py-4 text-slate-900 outline-none focus:ring-1 ring-blue-500"
                      value={localConfig.totalBudget}
                      onChange={(e) => setLocalConfig({...localConfig, totalBudget: Number(e.target.value)})}
                    />
                    <p className="text-[9px] text-slate-600">${localConfig.totalBudget.toLocaleString()}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-black uppercase text-blue-600 tracking-wider mb-4">Squad Size</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-blue-600 tracking-wider">Minimum</label>
                      <input 
                        type="number"
                        className="w-full bg-white border border-slate-300 rounded-2xl px-5 py-4 text-slate-900 outline-none focus:ring-1 ring-blue-500"
                        value={localConfig.squadSize.min}
                        onChange={(e) => setLocalConfig({...localConfig, squadSize: {...localConfig.squadSize, min: Number(e.target.value)}})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-blue-600 tracking-wider">Maximum</label>
                      <input 
                        type="number"
                        className="w-full bg-white border border-slate-300 rounded-2xl px-5 py-4 text-slate-900 outline-none focus:ring-1 ring-blue-500"
                        value={localConfig.squadSize.max}
                        onChange={(e) => setLocalConfig({...localConfig, squadSize: {...localConfig.squadSize, max: Number(e.target.value)}})}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-300 pt-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black uppercase text-blue-600 tracking-wider">Player Roles</h3>
                  <button 
                    onClick={addRole}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-orange-500 text-white rounded-lg font-bold text-xs uppercase hover:brightness-110 transition-all flex items-center gap-2"
                  >
                    <Plus size={14} />
                    Add Role
                  </button>
                </div>
                <div className="space-y-2">
                  {localConfig.roles.map(role => (
                    <div key={role.id} className="flex items-center justify-between bg-white border border-slate-300 rounded-xl px-5 py-3 group hover:border-blue-500/40 transition-all">
                      <span className="text-slate-900 font-bold">{role.name}</span>
                      <button 
                        onClick={() => removeRole(role.id)}
                        className="opacity-0 group-hover:opacity-100 p-2 text-[#a65d50] hover:bg-[#a65d50]/10 rounded-lg transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'data':
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-display font-black text-blue-600 uppercase mb-2">Data Management</h2>
              <p className="text-sm text-slate-600">Import, export, and manage your auction data</p>
            </div>

            <div>
              <h3 className="text-sm font-black uppercase text-blue-600 tracking-wider mb-4">Data Operations</h3>
              <div className="space-y-3">
                <button 
                  onClick={handleExportData}
                  className="w-full px-6 py-4 bg-white border border-blue-500/30 rounded-2xl hover:bg-blue-50 hover:border-blue-500/50 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <Download size={20} className="text-blue-600" />
                    <div className="text-left">
                      <p className="text-sm font-black text-slate-900 uppercase">Export Data</p>
                      <p className="text-xs text-slate-600">Download all settings and data as JSON</p>
                    </div>
                  </div>
                  <ArrowLeft size={16} className="text-blue-600 rotate-180 group-hover:translate-x-1 transition-transform" />
                </button>

                <button 
                  onClick={handleImportData}
                  className="w-full px-6 py-4 bg-white border border-blue-500/30 rounded-2xl hover:bg-blue-50 hover:border-blue-500/50 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <Upload size={20} className="text-blue-600" />
                    <div className="text-left">
                      <p className="text-sm font-black text-slate-900 uppercase">Import Data</p>
                      <p className="text-xs text-slate-600">Load settings and data from JSON file</p>
                    </div>
                  </div>
                  <ArrowLeft size={16} className="text-blue-600 rotate-180 group-hover:translate-x-1 transition-transform" />
                </button>

                <button 
                  onClick={handleClearAllData}
                  className="w-full px-6 py-4 bg-[#a65d50]/10 border border-[#a65d50]/30 rounded-2xl hover:bg-[#a65d50]/20 hover:border-[#a65d50]/50 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <Trash2 size={20} className="text-[#a65d50]" />
                    <div className="text-left">
                      <p className="text-sm font-black text-[#a65d50] uppercase">Clear All Data</p>
                      <p className="text-xs text-slate-600">Remove all players and teams (irreversible)</p>
                    </div>
                  </div>
                  <ArrowLeft size={16} className="text-[#a65d50] rotate-180 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            <div className="border-t border-slate-300 pt-8">
              <h3 className="text-sm font-black uppercase text-blue-600 tracking-wider mb-4">Statistics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-slate-300 rounded-2xl p-5">
                  <p className="text-[9px] font-black uppercase text-slate-600 mb-2">Total Players</p>
                  <p className="text-3xl font-display font-black text-slate-900">{players.length}</p>
                </div>
                <div className="bg-white border border-slate-300 rounded-2xl p-5">
                  <p className="text-[9px] font-black uppercase text-slate-600 mb-2">Total Teams</p>
                  <p className="text-3xl font-display font-black text-slate-900">{teams.length}</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-display font-black text-blue-600 uppercase mb-2">Appearance</h2>
              <p className="text-sm text-slate-600">Customize the look and feel</p>
            </div>

            <div>
              <h3 className="text-sm font-black uppercase text-blue-600 tracking-wider mb-4">Theme</h3>
              <p className="text-xs text-slate-600">Theme customization coming soon...</p>
            </div>
          </div>
        );

      case 'about':
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-display font-black text-blue-600 uppercase mb-2">About HypeHammer</h2>
              <p className="text-sm text-slate-600">Version and information</p>
            </div>

            <div>
              <div className="text-center py-8">
                <div className="w-24 h-24 mx-auto mb-6 rounded-2xl flex items-center justify-center shadow-2xl overflow-hidden border-2 border-blue-500">
                  <img src="./logo.jpg" alt="Logo" className="w-full h-full object-cover" />
                </div>
                <h3 className="text-3xl font-display font-black text-blue-600 uppercase mb-3">HypeHammer</h3>
                <p className="text-base text-slate-600 mb-2">Universal Sports Auction Platform</p>
                <p className="text-sm text-[#5c4742]">Version 1.0.0</p>
              </div>
              <div className="border-t border-slate-300 pt-8">
                <p className="text-sm text-slate-600 leading-relaxed">
                  A sport-agnostic auction management system for professional leagues, local tournaments, and esports drafts.
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-display font-black text-blue-600 uppercase mb-2">{activeSection}</h2>
              <p className="text-sm text-slate-600">Content coming soon...</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-orange-50 flex relative">
      {/* Notification */}
      {saveNotification && (
        <div className="fixed top-8 right-8 z-[200] bg-gradient-to-r from-blue-500 to-orange-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-5">
          <CheckCircle2 size={20} />
          <span className="font-black text-sm uppercase tracking-wider">{saveNotification}</span>
        </div>
      )}

      {/* Sidebar */}
      <div className="w-72 bg-white border-r border-blue-500/20 flex flex-col overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="p-6 border-b border-blue-500/20">
          <button 
            onClick={() => setStatus(AuctionStatus.READY)}
            className="flex items-center gap-3 text-blue-600 hover:text-[#d4af6a] transition-colors mb-6"
          >
            <ArrowLeft size={18} />
            <span className="text-xs font-black uppercase tracking-wider">Back to Dashboard</span>
          </button>
          <h1 className="text-2xl font-display font-black text-blue-600 uppercase tracking-wider">Settings</h1>
        </div>

        {/* Menu */}
        <div className="p-4 flex-1">
          <nav className="space-y-1">
            {menuItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeSection === item.id
                    ? 'bg-blue-200 border border-blue-500/40 text-blue-600'
                    : 'text-slate-600 hover:bg-blue-50 hover:text-slate-900'
                }`}
              >
                {item.icon}
                <span className="text-sm font-bold">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-blue-500/20 space-y-2">
          <button 
            onClick={handleReset}
            className="w-full px-4 py-3 bg-[#3d2f2b] border border-blue-500/20 rounded-xl text-blue-600 hover:bg-blue-100 transition-all text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2"
          >
            <RotateCcw size={14} />
            Reset
          </button>
          <button 
            onClick={handleSave}
            className="w-full px-4 py-3 gold-gradient rounded-xl text-white hover:brightness-110 transition-all text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg"
          >
            <Save size={14} />
            Save Changes
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-5xl mx-auto p-8">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};
