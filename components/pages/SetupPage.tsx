import React, { useState } from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import { AuctionStatus, AuctionConfig, AuctionType, SportType } from '../../types';
import { SPORT_DEFAULTS } from '../../constants';

interface SetupPageProps {
  config: AuctionConfig;
  setConfig: (config: AuctionConfig) => void;
  onSelectSport: (sportType: SportType, customName?: string) => void;
  setStatus: (status: AuctionStatus) => void;
}

export const SetupPage: React.FC<SetupPageProps> = ({ config, setConfig, onSelectSport, setStatus }) => {
  const [customSportName, setCustomSportName] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handleSportSelect = (s: SportType) => {
    if (s === SportType.CUSTOM) {
      setShowCustomInput(true);
      setConfig({ 
        ...config, 
        sport: s, 
        roles: SPORT_DEFAULTS[s].roles || [], 
        squadSize: SPORT_DEFAULTS[s].squadSize || config.squadSize, 
        totalBudget: SPORT_DEFAULTS[s].totalBudget || config.totalBudget 
      });
    } else {
      setShowCustomInput(false);
      setCustomSportName('');
      setConfig({ 
        ...config, 
        sport: s, 
        roles: SPORT_DEFAULTS[s].roles || [], 
        squadSize: SPORT_DEFAULTS[s].squadSize || config.squadSize, 
        totalBudget: SPORT_DEFAULTS[s].totalBudget || config.totalBudget 
      });
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col p-8 overflow-hidden relative">
      <div className="fixed top-8 left-10 z-[60]">
        <button 
          onClick={() => setStatus(AuctionStatus.HOME)} 
          className="flex items-center gap-3 bg-white/80 border border-blue-500/20 backdrop-blur-xl px-5 py-3 rounded-full text-blue-600 hover:bg-blue-500 hover:text-white transition-all shadow-lg"
        >
          <ArrowLeft size={18} />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Exit To Home</span>
        </button>
      </div>

      <div className="w-full max-w-7xl mx-auto z-10 mt-20">
        <div className="text-center mb-8 space-y-3">
          <h1 className="text-5xl font-display font-black tracking-tighter text-slate-900 drop-shadow-2xl">
            HYPE<span className="gold-text">HAMMER</span>
          </h1>
          <p className="text-blue-600 text-xs font-black uppercase tracking-[0.5em]">Setup Protocol</p>
        </div>

        <div className="bg-white border border-blue-500/30 rounded-[3rem] p-8 shadow-[0_0_80px_rgba(0,0,0,0.8)]">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left - Sport Selection */}
            <div className="lg:col-span-2 space-y-6">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">Global Discipline</label>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {Object.values(SportType).map((s) => (
                  <button 
                    key={s} 
                    onClick={() => handleSportSelect(s)} 
                    className={`p-3 rounded-xl border transition-all duration-500 text-center relative overflow-hidden group ${
                      config.sport === s 
                        ? 'border-blue-500 bg-blue-100' 
                        : 'border-2 border-slate-300 bg-white hover:border-[#5c4742]'
                    }`}
                  >
                    {s === SportType.CUSTOM ? (
                      <div className="flex flex-col items-center gap-1">
                        <Plus size={16} className={config.sport === s ? 'text-blue-600' : 'text-slate-600'} />
                        <span className={`font-display font-bold text-[10px] uppercase ${
                          config.sport === s ? 'text-slate-900' : 'text-slate-600'
                        }`}>
                          {s}
                        </span>
                      </div>
                    ) : (
                      <span className={`font-display font-bold text-xs uppercase ${
                        config.sport === s ? 'text-slate-900' : 'text-slate-600'
                      }`}>
                        {s}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Custom Sport Input */}
              {showCustomInput && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-5">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600">Custom Sport Name</label>
                  <input 
                    type="text" 
                    className="w-full bg-white border border-blue-500/30 rounded-2xl px-5 py-4 text-slate-900 font-bold focus:ring-1 ring-blue-500 outline-none" 
                    placeholder="Enter your sport name..."
                    value={customSportName} 
                    onChange={(e) => setCustomSportName(e.target.value)} 
                  />
                  {customSportName && (
                    <p className="text-[9px] text-blue-600 italic">Custom sport: {customSportName}</p>
                  )}
                </div>
              )}
            </div>

            {/* Right - Configuration */}
            <div className="flex flex-col justify-between space-y-6">
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">Capital Limit</label>
                  <input 
                    type="number" 
                    className="w-full bg-white border border-2 border-slate-300 rounded-2xl px-5 py-4 text-slate-900 font-mono text-lg focus:ring-1 ring-blue-500 outline-none" 
                    value={config.totalBudget} 
                    onChange={(e) => setConfig({ ...config, totalBudget: Number(e.target.value) })} 
                  />
                  <p className="text-[9px] text-slate-600 italic">${config.totalBudget.toLocaleString()}</p>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">Framework</label>
                  <select 
                    className="w-full bg-white border border-2 border-slate-300 rounded-2xl px-5 py-4 text-slate-900 font-bold uppercase tracking-wider outline-none appearance-none" 
                    value={config.type} 
                    onChange={(e) => setConfig({ ...config, type: e.target.value as AuctionType })}
                  >
                    {Object.values(AuctionType).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <button 
                onClick={() => {
                  // Validate and navigate to matches
                  if (config.sport === SportType.CUSTOM && customSportName.trim()) {
                    setConfig({ ...config, customSportName: customSportName.trim() });
                    onSelectSport(SportType.CUSTOM, customSportName.trim());
                  } else if (config.sport && config.sport !== SportType.CUSTOM) {
                    onSelectSport(config.sport);
                  } else {
                    alert('Please select a sport or enter a custom sport name');
                  }
                }}
                disabled={!config.sport || (config.sport === SportType.CUSTOM && !customSportName.trim())}
                className="gold-gradient hover:brightness-110 text-white font-black py-5 rounded-2xl transition-all shadow-2xl uppercase tracking-[0.3em] text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue to Matches
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
