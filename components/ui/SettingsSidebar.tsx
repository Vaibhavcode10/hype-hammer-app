import React from 'react';
import { 
  X, User, LogOut, Settings as SettingsIcon, Trophy, 
  Database, FileJson, Download, Upload, History, 
  Users, Palette, Bell, Shield, HelpCircle, Info
} from 'lucide-react';
import { AuctionStatus, SportData, MatchData } from '../../types';

interface SettingsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: {
    name: string;
    email: string;
    avatar?: string;
  };
  allSports: SportData[];
  currentSport: string | null;
  currentMatchId: string | null;
  onSelectMatch: (matchId: string, sportIdentifier: string) => void;
  onNavigateToSettings: (section?: string) => void;
  onLogout: () => void;
}

export const SettingsSidebar: React.FC<SettingsSidebarProps> = ({
  isOpen,
  onClose,
  currentUser,
  allSports,
  currentSport,
  currentMatchId,
  onSelectMatch,
  onNavigateToSettings,
  onLogout
}) => {
  if (!isOpen) return null;

  const getSportDisplayName = (sport: SportData) => {
    return sport.customSportName || sport.sportType;
  };

  const getMatchStatusBadge = (status: string) => {
    const colors = {
      SETUP: 'bg-gray-600',
      ONGOING: 'bg-yellow-600',
      COMPLETED: 'bg-green-600'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-600';
  };

  const settingsSections = [
    { 
      id: 'general', 
      icon: <SettingsIcon size={16} />, 
      label: 'General Settings',
      description: 'Basic configuration & preferences'
    },
    { 
      id: 'match', 
      icon: <Trophy size={16} />, 
      label: 'Match Configuration',
      description: 'Sport type, budget, roles'
    },
    { 
      id: 'data', 
      icon: <Database size={16} />, 
      label: 'Data Management',
      description: 'Import/Export, backup, clear data'
    },
    { 
      id: 'teams', 
      icon: <Users size={16} />, 
      label: 'Teams & Players',
      description: 'Manage participants'
    },
    { 
      id: 'appearance', 
      icon: <Palette size={16} />, 
      label: 'Appearance',
      description: 'Theme, colors, display'
    },
    { 
      id: 'notifications', 
      icon: <Bell size={16} />, 
      label: 'Notifications',
      description: 'Alerts & updates'
    },
    { 
      id: 'privacy', 
      icon: <Shield size={16} />, 
      label: 'Privacy & Security',
      description: 'Account security settings'
    },
    { 
      id: 'history', 
      icon: <History size={16} />, 
      label: 'Auction History',
      description: 'View past transactions'
    },
    { 
      id: 'help', 
      icon: <HelpCircle size={16} />, 
      label: 'Help & Support',
      description: 'Documentation & support'
    },
    { 
      id: 'about', 
      icon: <Info size={16} />, 
      label: 'About HypeHammer',
      description: 'Version & credits'
    }
  ];

  return (
    <>
      {/* Sidebar */}
      <div className="fixed top-0 right-0 h-full w-full sm:w-96 bg-white border-l border-blue-500/30 z-[100] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 rounded-l-3xl">
        {/* Header */}
        <div className="bg-slate-50 border-b border-blue-500/20 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-display font-black text-blue-600 uppercase tracking-wider">
              Menu
            </h2>
            <button 
              onClick={onClose}
              className="p-2 rounded-lg text-slate-600 hover:bg-blue-100 hover:text-blue-600 transition-all"
            >
              <X size={20} />
            </button>
          </div>

          {/* User Profile */}
          <div className="bg-white border border-blue-500/20 rounded-2xl p-4 group hover:border-blue-500/40 transition-all cursor-pointer"
            onClick={() => {
              onNavigateToSettings('profile');
              onClose();
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#c5a059] to-[#d4af6a] flex items-center justify-center overflow-hidden">
                {currentUser.avatar ? (
                  <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                ) : (
                  <User size={24} className="text-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-slate-900 truncate uppercase tracking-wide">
                  {currentUser.name}
                </p>
                <p className="text-[10px] text-slate-600 truncate">
                  {currentUser.email}
                </p>
              </div>
              <SettingsIcon size={16} className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Active Matches */}
          {allSports.length > 0 && (
            <div className="p-6 border-b border-slate-300">
              <h3 className="text-[10px] font-black uppercase text-slate-600 tracking-wider mb-4">
                Your Matches
              </h3>
              <div className="space-y-3">
                {allSports.map(sport => (
                  <div key={`${sport.sportType}-${sport.customSportName}`}>
                    <p className="text-[9px] font-black uppercase text-blue-600 mb-2 tracking-wider">
                      {getSportDisplayName(sport)}
                    </p>
                    {sport.matches.length === 0 ? (
                      <p className="text-[10px] text-[#5c4742] italic ml-2">No matches yet</p>
                    ) : (
                      <div className="space-y-2">
                        {sport.matches.map(match => (
                          <button
                            key={match.id}
                            onClick={() => {
                              const sportId = sport.customSportName || sport.sportType;
                              onSelectMatch(match.id, sportId);
                              onClose();
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg transition-all group ${
                              match.id === currentMatchId
                                ? 'bg-blue-200 border border-blue-500/40'
                                : 'bg-slate-50 border border-slate-300 hover:border-blue-500/30'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-bold text-slate-900 truncate">
                                  {match.name}
                                </p>
                                <p className="text-[9px] text-slate-600">
                                  {match.teams.length} teams • {match.players.length} players
                                </p>
                              </div>
                              <div className={`w-2 h-2 rounded-full ${getMatchStatusBadge(match.status)} ml-2`}></div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Settings Sections */}
          <div className="p-6">
            <h3 className="text-[10px] font-black uppercase text-slate-600 tracking-wider mb-4">
              Settings
            </h3>
            <div className="space-y-2">
              {settingsSections.map(section => (
                <button
                  key={section.id}
                  onClick={() => {
                    onNavigateToSettings(section.id);
                    onClose();
                  }}
                  className="w-full text-left px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 hover:border-blue-500/40 hover:bg-blue-50 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-blue-600 mt-0.5">
                      {section.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black text-slate-900 uppercase tracking-wide mb-0.5">
                        {section.label}
                      </p>
                      <p className="text-[9px] text-slate-600">
                        {section.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="p-6 border-t border-slate-300">
            <h3 className="text-[10px] font-black uppercase text-slate-600 tracking-wider mb-4">
              Quick Actions
            </h3>
            <div className="space-y-2">
              <button 
                onClick={() => {
                  onNavigateToSettings('export');
                  onClose();
                }}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 hover:border-blue-500/40 transition-all flex items-center gap-3 text-left"
              >
                <Download size={16} className="text-blue-600" />
                <span className="text-[11px] font-black text-slate-900 uppercase tracking-wide">
                  Export Data
                </span>
              </button>
              <button 
                onClick={() => {
                  onNavigateToSettings('import');
                  onClose();
                }}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 hover:border-blue-500/40 transition-all flex items-center gap-3 text-left"
              >
                <Upload size={16} className="text-blue-600" />
                <span className="text-[11px] font-black text-slate-900 uppercase tracking-wide">
                  Import Data
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer - Logout */}
        <div className="bg-slate-50 border-t border-blue-500/20 p-6">
          <button 
            onClick={() => {
              if (window.confirm('Are you sure you want to logout?')) {
                onLogout();
                onClose();
              }
            }}
            className="w-full px-4 py-3 rounded-xl bg-[#a65d50]/10 border border-[#a65d50]/30 hover:bg-[#a65d50]/20 hover:border-[#a65d50]/50 transition-all flex items-center justify-center gap-3"
          >
            <LogOut size={16} className="text-[#a65d50]" />
            <span className="text-[11px] font-black text-[#a65d50] uppercase tracking-wide">
              Logout
            </span>
          </button>
        </div>
      </div>
    </>
  );
};
