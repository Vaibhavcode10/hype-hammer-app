import React, { useState, useEffect } from 'react';
import { Gavel, Users } from 'lucide-react';
import { Player, Team } from '../../types';

interface SoldCelebrationProps {
  player: Player;
  team: Team;
  price: number;
  onComplete: () => void;
}

export const SoldCelebration: React.FC<SoldCelebrationProps> = ({ player, team, price, onComplete }) => {
  const [stage, setStage] = useState<'hammer' | 'sparkle'>('hammer');
  
  useEffect(() => {
    const hammerTimer = setTimeout(() => setStage('sparkle'), 1200);
    const completeTimer = setTimeout(onComplete, 3500);
    return () => {
      clearTimeout(hammerTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center celebration-overlay animate-in fade-in duration-500 backdrop-blur-sm">
      <div className="text-center relative px-6">
        {stage === 'hammer' && (
          <div className="flex flex-col items-center animate-in zoom-in duration-300">
            <div className="w-48 h-48 bg-blue-100 rounded-full flex items-center justify-center border border-blue-500/30 mb-8 relative">
              <Gavel size={80} className="text-blue-600 hammer-strike" />
              <div className="absolute inset-0 shimmer-gold rounded-full opacity-30"></div>
            </div>
            <h2 className="text-5xl font-display font-black text-blue-600 uppercase tracking-[0.4em] animate-pulse">GOING ONCE... TWICE...</h2>
          </div>
        )}
        {stage === 'sparkle' && (
          <div className="animate-in zoom-in duration-500">
            <div className="relative mb-12">
               <div className="w-64 h-64 mx-auto rounded-[3rem] overflow-hidden border-4 border-blue-500 shadow-[0_0_80px_rgba(197,160,89,0.6)] relative z-10">
                 {player.imageUrl ? (
                   <img src={player.imageUrl} className="w-full h-full object-cover" />
                 ) : (
                   <Users size={100} className="text-[#3d2f2b] m-14" />
                 )}
                 <div className="absolute inset-0 shimmer-gold opacity-50"></div>
               </div>
            </div>
            <div className="space-y-4">
              <h1 className="text-7xl font-display font-black gold-text uppercase tracking-tighter drop-shadow-[0_0_20px_rgba(197,160,89,0.5)]">SOLD!</h1>
              <p className="text-3xl font-display font-bold text-slate-900 uppercase tracking-widest">To <span className="text-blue-600">{team.name}</span></p>
              <p className="text-5xl font-mono font-black text-slate-900 border-t border-blue-500/20 pt-6 mt-6">${price.toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
