import React from 'react';
import { CheckCircle2, FastForward, Timer, Users, Cpu } from 'lucide-react';
import { Player, Team } from '../../types';
import { CommandCard } from '../ui';

interface AuctionRoomPageProps {
  currentPlayerIdx: number | null;
  players: Player[];
  timer: number;
  currentBid: number;
  currentBidderId: string | null;
  teams: Team[];
  auctionRound: number;
  finalizePlayer: (sold: boolean) => void;
  skipPlayer: () => void;
  placeBid: (teamId: string, amount: number) => void;
  handleNextPlayer: () => void;
}

export const AuctionRoomPage: React.FC<AuctionRoomPageProps> = ({
  currentPlayerIdx,
  players,
  timer,
  currentBid,
  currentBidderId,
  teams,
  auctionRound,
  finalizePlayer,
  skipPlayer,
  placeBid,
  handleNextPlayer
}) => {
  return (
    <div className="h-full w-full max-w-[1400px] mx-auto overflow-hidden flex flex-col">
      {currentPlayerIdx !== null ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
          <div className="lg:col-span-3 flex flex-col gap-4">
            <CommandCard title="Individual Data" className="flex-1">
              <div className="p-4 bg-white/60 rounded-2xl border border-2 border-slate-300">
                <p className="text-[11px] text-slate-900 italic leading-relaxed">
                  {players[currentPlayerIdx].stats || 'Analyzing field metrics...'}
                </p>
              </div>
            </CommandCard>
            <div className="flex flex-col gap-4">
              <button 
                onClick={() => finalizePlayer(true)} 
                disabled={!currentBidderId} 
                className={`py-4 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 transition-all ${
                  currentBidderId ? 'bg-[#8b9d77] text-white' : 'bg-[#3d2f2b] text-slate-400 opacity-50'
                }`}
              >
                <CheckCircle2 size={14} /> Sell
              </button>
              <button 
                onClick={skipPlayer} 
                className="py-4 rounded-2xl bg-[#3d2f2b] text-slate-900 font-black uppercase text-[10px] flex items-center justify-center gap-2 transition-all border border-blue-500/10 hover:bg-blue-500/20"
              >
                <FastForward size={14} /> Skip Deferral
              </button>
            </div>
          </div>
          <div className="lg:col-span-6 flex flex-col gap-6 h-full justify-between">
            <div className="bg-white border border-blue-500/30 rounded-[3rem] overflow-hidden shadow-2xl relative flex-1 flex flex-col">
              <div className="absolute top-6 left-6 z-20 flex items-center gap-3 bg-black/60 px-4 py-2 rounded-2xl border border-blue-500/20 backdrop-blur-md">
                <Timer size={16} className={timer < 10 ? 'text-red-500 animate-pulse' : 'text-blue-600'} />
                <span className={`text-xl font-mono font-black ${timer < 10 ? 'text-red-500' : 'text-slate-900'}`}>
                  00:{timer < 10 ? `0${timer}` : timer}
                </span>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_center,_#211a17_0%,_#1a1410_100%)]">
                <div className="w-44 h-44 bg-white border-4 border-blue-500/20 rounded-[3rem] overflow-hidden p-2 mb-6">
                  {players[currentPlayerIdx].imageUrl ? (
                    <img src={players[currentPlayerIdx].imageUrl} className="w-full h-full object-cover rounded-[2.5rem]" />
                  ) : (
                    <Users size={64} className="text-[#3d2f2b] m-10" />
                  )}
                </div>
                <h2 className="text-4xl font-display font-black uppercase text-slate-900 tracking-tighter text-center">
                  {players[currentPlayerIdx].name}
                </h2>
                <div className="mt-4 px-4 py-1.5 rounded-full border border-blue-500/20 bg-blue-50 text-[9px] font-black uppercase text-blue-600 tracking-widest">
                  {players[currentPlayerIdx].status === 'UNSOLD' ? `Round ${auctionRound} (Recycled)` : `Sequence Active`}
                </div>
              </div>
              <div className="p-8 bg-white border-t border-2 border-slate-300 text-center flex-1 flex flex-col justify-center">
                <p className="text-[9px] uppercase font-black text-blue-600 mb-1">Current Engagement</p>
                <p className="text-6xl font-mono font-black text-slate-900 leading-none drop-shadow-md">
                  ${currentBid.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          <div className="lg:col-span-3 flex flex-col h-full overflow-y-auto custom-scrollbar space-y-3">
            {teams.map(t => { 
              const nextBid = currentBidderId === null ? currentBid : currentBid + 500000; 
              const isTop = currentBidderId === t.id; 
              return (
                <div 
                  key={t.id} 
                  className={`p-4 rounded-3xl border transition-all flex flex-col gap-3 ${
                    isTop ? 'bg-gradient-to-r from-blue-500 to-orange-500 border-[#f5f5dc]' : 'bg-white border-2 border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className={`font-black uppercase tracking-widest text-xs truncate ${
                      isTop ? 'text-white' : 'text-slate-900'
                    }`}>
                      {t.name}
                    </span>
                    <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      isTop ? 'bg-white/10 text-white' : 'bg-black text-blue-600'
                    }`}>
                      ${(t.remainingBudget/1000000).toFixed(1)}M
                    </span>
                  </div>
                  <button 
                    disabled={nextBid > t.remainingBudget || isTop} 
                    onClick={() => placeBid(t.id, nextBid)} 
                    className={`w-full py-2 rounded-2xl font-black uppercase text-[10px] transition-all ${
                      isTop ? 'bg-white text-white' : 'bg-slate-100 text-blue-600 border border-blue-500/20'
                    }`}
                  >
                    {isTop ? 'Winning' : `Bid $${(nextBid/1000).toFixed(0)}k`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="h-full flex flex-col items-center justify-center space-y-12 animate-in fade-in duration-700">
          <div className="w-40 h-40 gold-gradient rounded-[3rem] flex items-center justify-center shadow-2xl">
            <Cpu size={64} className="text-white" />
          </div>
          <div className="text-center space-y-6 max-w-xl px-4">
            <h2 className="text-4xl font-display font-black uppercase text-slate-900 tracking-widest">Protocol Staged</h2>
            <p className="text-xs text-slate-600 uppercase tracking-[0.4em] font-medium leading-relaxed">
              Available Units: {players.filter(p => p.status === 'PENDING' || p.status === 'UNSOLD').length} remaining.
            </p>
            <button 
              onClick={() => handleNextPlayer()} 
              className="group relative px-12 py-5 gold-gradient text-white font-black uppercase tracking-[0.4em] rounded-full shadow-2xl text-sm transition-all active:scale-95 hover:brightness-110"
            >
              Launch Selection Cycle
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
