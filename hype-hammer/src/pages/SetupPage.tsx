import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { SportType, AuctionConfig, AuctionType } from '../types';
import { SPORT_DEFAULTS, INITIAL_CONFIG } from '../constants';
import { SPORT_THEMES } from '../themes';

interface SetupPageProps {
  sport: SportType;
  onSetup: (sport: SportType) => void;
}

const SetupPage: React.FC<SetupPageProps> = ({ sport, onSetup }) => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<AuctionConfig>({
    ...INITIAL_CONFIG,
    sport
  });

  const theme = SPORT_THEMES[sport.toLowerCase() as keyof typeof SPORT_THEMES] || SPORT_THEMES.cricket;

  const handleStart = () => {
    onSetup(sport);
    navigate(`/auction/${sport}`);
  };

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-10 overflow-hidden relative"
      style={{
        background: `linear-gradient(135deg, ${theme.bg} 0%, rgba(15, 23, 42, 0.8) 100%)`
      }}
    >
      {/* Back Button */}
      <div className="fixed top-8 left-10 z-[60]">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-3 px-5 py-3 rounded-full text-white border-2 backdrop-blur-md transition-all hover:bg-white/10"
          style={{ borderColor: theme.primary }}
        >
          <ArrowLeft size={18} />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Back to Sports</span>
        </button>
      </div>

      <div className="max-w-4xl w-full z-10">
        {/* Title */}
        <div className="text-center mb-12 space-y-4">
          <h1 className="text-8xl font-display font-black tracking-tighter text-white drop-shadow-2xl">
            {sport}
          </h1>
          <p className="text-xs font-black uppercase tracking-[0.5em]" style={{ color: theme.primary }}>
            Auction Setup
          </p>
        </div>

        {/* Setup Form */}
        <div 
          className="border-2 rounded-[3rem] p-12 shadow-2xl backdrop-blur-md"
          style={{ 
            borderColor: theme.primary,
            backgroundColor: 'rgba(15, 23, 42, 0.6)'
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Left Column */}
            <div className="space-y-8">
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.3em] mb-4 block" style={{ color: theme.primary }}>
                  Budget Allocation
                </label>
                <input 
                  type="number" 
                  className="w-full bg-white/5 border-2 rounded-2xl px-6 py-5 text-white font-mono text-xl focus:outline-none transition-all"
                  style={{ borderColor: theme.primary }}
                  value={config.totalBudget} 
                  onChange={(e) => setConfig({ ...config, totalBudget: Number(e.target.value) })} 
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.3em] mb-4 block" style={{ color: theme.primary }}>
                  Auction Format
                </label>
                <select 
                  className="w-full bg-white/5 border-2 rounded-2xl px-6 py-5 text-white font-bold uppercase tracking-wider outline-none appearance-none"
                  style={{ borderColor: theme.primary }}
                  value={config.type} 
                  onChange={(e) => setConfig({ ...config, type: e.target.value as AuctionType })}
                >
                  {Object.values(AuctionType).map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Right Column - Info */}
            <div className="flex flex-col justify-between">
              <div className="space-y-6">
                <div className="p-6 rounded-2xl" style={{ backgroundColor: `${theme.primary}20`, borderLeft: `4px solid ${theme.primary}` }}>
                  <h4 className="font-black uppercase text-white mb-3">Key Details</h4>
                  <ul className="text-sm text-gray-300 space-y-2">
                    <li>• Squad Size: {config.squadSize.min}-{config.squadSize.max}</li>
                    <li>• Total Budget: ${(config.totalBudget / 1000000).toFixed(1)}M</li>
                    <li>• Format: {config.type}</li>
                    <li>• Roles: {config.roles.length} positions</li>
                  </ul>
                </div>
              </div>

              <button 
                onClick={handleStart}
                className="w-full py-6 rounded-2xl mt-12 transition-all shadow-2xl uppercase tracking-[0.3em] text-sm font-black text-white hover:scale-105 active:scale-95"
                style={{
                  background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})`,
                  color: '#fff'
                }}
              >
                Start Auction
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupPage;
