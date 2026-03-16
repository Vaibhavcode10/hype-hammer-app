import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, HelpCircle } from 'lucide-react';
import { SportType } from '../types';
import { SPORT_ICONS } from '../themes';

interface HomePageProps {
  onSelectSport: (sport: SportType) => void;
}

const HomePage: React.FC<HomePageProps> = ({ onSelectSport }) => {
  const navigate = useNavigate();

  const handleSportSelect = (sport: SportType) => {
    onSelectSport(sport);
    navigate(`/setup/${sport}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-8 bg-gradient-to-r from-black/60 to-slate-900/60 backdrop-blur-md border-b border-emerald-500/30 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center animate-pulse">
            <span className="text-2xl font-black">⚔️</span>
          </div>
          <div>
            <h2 className="text-2xl font-display font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 uppercase leading-none">HypeHammer</h2>
            <p className="text-[9px] font-bold text-emerald-300 uppercase tracking-[0.3em] mt-1">Auction Drafting System</p>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center pt-20">
        <div className="max-w-5xl space-y-12 animate-in fade-in zoom-in duration-1000">
          <div className="space-y-4">
            <h1 className="text-8xl md:text-9xl font-display font-black tracking-tighter text-white leading-none drop-shadow-2xl uppercase">
              DRAFT THE <br />
              <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent animate-pulse">FUTURE</span>
            </h1>
            <p className="text-emerald-300 text-xs font-black uppercase tracking-[0.5em]">Choose Your Sport & Begin the Auction</p>
          </div>

          {/* Sport Selection Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-16">
            {Object.values(SportType).map((sport) => {
              const sportGradients: { [key: string]: string } = {
                cricket: 'from-emerald-500/80 to-teal-600/80 hover:from-emerald-400 hover:to-teal-500',
                football: 'from-blue-500/80 to-cyan-600/80 hover:from-blue-400 hover:to-cyan-500',
                kabaddi: 'from-red-500/80 to-pink-600/80 hover:from-red-400 hover:to-pink-500',
                esports: 'from-pink-500/80 to-purple-600/80 hover:from-pink-400 hover:to-purple-500',
                custom: 'from-cyan-500/80 to-blue-600/80 hover:from-cyan-400 hover:to-blue-500'
              };
              const gradient = sportGradients[sport.toLowerCase()] || sportGradients.cricket;
              const borderColor: { [key: string]: string } = {
                cricket: 'border-emerald-400',
                football: 'border-blue-400',
                kabaddi: 'border-red-400',
                esports: 'border-pink-400',
                custom: 'border-cyan-400'
              };
              const border = borderColor[sport.toLowerCase()] || borderColor.cricket;

              return (
                <button
                  key={sport}
                  onClick={() => handleSportSelect(sport)}
                  className={`group relative p-6 rounded-2xl border-2 ${border} backdrop-blur-md bg-gradient-to-br ${gradient} transition-all duration-300 active:scale-95 hover:scale-110 shadow-xl hover:shadow-2xl`}
                >
                  <div className="absolute inset-0 rounded-2xl bg-black/20 group-hover:bg-black/10 transition-all"></div>
                  <div className="relative z-10">
                    <div className="text-5xl mb-3 drop-shadow-lg">{SPORT_ICONS[sport.toLowerCase() as keyof typeof SPORT_ICONS]}</div>
                    <p className="text-sm font-black uppercase text-white drop-shadow-md">{sport}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
