import React, { useState, useEffect } from 'react';
import { Gavel, Users, Zap, Trophy } from 'lucide-react';
import { Player, Team } from '../../types';

interface SoldCelebrationProps {
  player: Player;
  team: Team;
  price: number;
  onComplete: () => void;
}

// 3D Confetti Particle Component
const Confetti3D: React.FC = () => {
  const confettiCount = 12; // Very compact effect with fewer particles
  const colors = ['#FFD700', '#FF6B9D', '#00E6FF', '#FF2D75', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899'];
  
  return (
    <div className="fixed inset-0 pointer-events-none z-[250] overflow-hidden" style={{ perspective: '1000px' }}>
      {Array.from({ length: confettiCount }).map((_, i) => {
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        const randomDelay = Math.random() * 0.2;
        const randomDuration = 2.5 + Math.random() * 1.5; // Faster, shorter fall
        const randomX = -2 + Math.random() * 4; // Minimal horizontal spread
        const randomRotate = Math.random() * 360 - 180; // Less rotation for cleaner look
        const randomRotateY = Math.random() * 360 - 180;
        const randomSize = 12 + Math.random() * 8; // Large visible particles: 12-20px
        const shape = Math.random() > 0.5 ? 'rect' : 'circle';
        
        return (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${Math.random() * 100}%`,
              top: '-20px',
              width: `${randomSize}px`,
              height: `${randomSize}px`,
              backgroundColor: randomColor,
              borderRadius: shape === 'circle' ? '50%' : '1px',
              animation: `confettiFall3D ${randomDuration}s ease-out ${randomDelay}s forwards`,
              transform: 'translateZ(0)',
              boxShadow: `0 0 8px ${randomColor}, 0 0 4px rgba(255, 255, 255, 0.3)`, // Enhanced glow for larger particles
              '--random-x': `${randomX}vw`,
              '--random-rotate': `${randomRotate}deg`,
              '--random-rotate-y': `${randomRotateY}deg`,
            } as any}
          />
        );
      })}
      
      <style>{`
        @keyframes confettiFall3D {
          0% {
            transform: translateY(0) translateX(0) rotateZ(0deg) rotateY(0deg) scale(1);
            opacity: 1;
          }
          80% {
            opacity: 0.8;
          }
          100% {
            transform: translateY(35vh) translateX(var(--random-x)) rotateZ(var(--random-rotate)) rotateY(var(--random-rotate-y)) scale(0.2);
            opacity: 0;
          }
        }
        
        @keyframes sparkleGlow {
          0%, 100% { 
            box-shadow: 0 0 40px rgba(255, 215, 0, 0.8), 0 0 80px rgba(255, 215, 0, 0.5), inset 0 0 60px rgba(255, 215, 0, 0.3);
          }
          50% { 
            box-shadow: 0 0 60px rgba(255, 215, 0, 1), 0 0 120px rgba(255, 215, 0, 0.8), inset 0 0 80px rgba(255, 215, 0, 0.5);
          }
        }
        
        @keyframes soldPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        @keyframes slideUpFade {
          0% { transform: translateY(30px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export const SoldCelebration: React.FC<SoldCelebrationProps> = ({ player, team, price, onComplete }) => {
  const [stage, setStage] = useState<'hammer' | 'celebration'>('hammer');
  
  useEffect(() => {
    const hammerTimer = setTimeout(() => setStage('celebration'), 1200);
    const completeTimer = setTimeout(onComplete, 5000);
    return () => {
      clearTimeout(hammerTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  const formatCurrency = (amount: number): string => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    return `₹${amount.toLocaleString()}`;
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{
      background: 'radial-gradient(ellipse at center, rgba(10, 10, 30, 0.97) 0%, rgba(5, 5, 15, 0.98) 100%)'
    }}>
      {/* 3D Confetti Animation */}
      {stage === 'celebration' && <Confetti3D />}
      
      {/* Animated Background Rays */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%]" style={{
          background: 'conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(255, 215, 0, 0.1) 60deg, transparent 120deg, rgba(0, 230, 255, 0.1) 180deg, transparent 240deg, rgba(255, 107, 157, 0.1) 300deg, transparent 360deg)',
          animation: 'spin 20s linear infinite'
        }} />
      </div>

      <div className="text-center relative px-6 z-10">
        {stage === 'hammer' && (
          <div className="flex flex-col items-center animate-in zoom-in duration-300">
            <div className="w-56 h-56 bg-gradient-to-br from-yellow-400/20 to-orange-500/20 rounded-full flex items-center justify-center border-4 border-yellow-500/40 mb-8 relative" style={{
              animation: 'sparkleGlow 1.5s ease-in-out infinite'
            }}>
              <Gavel size={100} className="text-yellow-400" style={{
                filter: 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.8))',
                animation: 'soldPulse 0.6s ease-in-out 2'
              }} />
            </div>
            <h2 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-200 to-yellow-400 uppercase tracking-widest" style={{
              textShadow: '0 0 30px rgba(255, 215, 0, 0.5)',
              animation: 'soldPulse 1s ease-in-out infinite'
            }}>
              GOING... GOING...
            </h2>
          </div>
        )}
        
        {stage === 'celebration' && (
          <div className="animate-in zoom-in duration-700">
            {/* SOLD! Header with Trophy */}
            <div className="mb-8 relative" style={{ animation: 'slideUpFade 0.5s ease-out' }}>
              <div className="flex items-center justify-center gap-6 mb-4">
                <Trophy size={64} className="text-yellow-400" style={{
                  filter: 'drop-shadow(0 0 20px rgba(255, 215, 0, 1))',
                  animation: 'soldPulse 1.5s ease-in-out infinite'
                }} />
                <h1 className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-200 to-yellow-400 uppercase" style={{
                  textShadow: '0 0 40px rgba(255, 215, 0, 0.8), 0 0 80px rgba(255, 215, 0, 0.5)',
                  WebkitTextStroke: '2px rgba(255, 215, 0, 0.3)',
                  animation: 'soldPulse 1.5s ease-in-out infinite'
                }}>
                  SOLD!
                </h1>
                <Trophy size={64} className="text-yellow-400" style={{
                  filter: 'drop-shadow(0 0 20px rgba(255, 215, 0, 1))',
                  animation: 'soldPulse 1.5s ease-in-out infinite'
                }} />
              </div>
              
              <div className="flex items-center justify-center gap-3">
                <Zap size={32} className="text-cyan-400" style={{ filter: 'drop-shadow(0 0 10px rgba(0, 230, 255, 0.8))' }} />
                <Zap size={32} className="text-cyan-400" style={{ filter: 'drop-shadow(0 0 10px rgba(0, 230, 255, 0.8))' }} />
                <Zap size={32} className="text-cyan-400" style={{ filter: 'drop-shadow(0 0 10px rgba(0, 230, 255, 0.8))' }} />
              </div>
            </div>

            {/* Player Info */}
            <div className="relative mb-10" style={{ animation: 'slideUpFade 0.7s ease-out' }}>
              <div className="w-80 h-80 mx-auto rounded-3xl overflow-hidden relative" style={{
                border: '6px solid rgba(255, 215, 0, 0.6)',
                boxShadow: '0 0 60px rgba(255, 215, 0, 0.8), 0 0 120px rgba(255, 215, 0, 0.4), inset 0 0 80px rgba(255, 215, 0, 0.2)',
                animation: 'sparkleGlow 2s ease-in-out infinite'
              }}>
                {player.imageUrl ? (
                  <img src={player.imageUrl} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-black">
                    <Users size={120} className="text-gray-600" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </div>
              
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-500 to-blue-600 px-8 py-3 rounded-full" style={{
                boxShadow: '0 0 30px rgba(0, 230, 255, 0.6)'
              }}>
                <p className="text-3xl font-black text-white uppercase tracking-wider">
                  {player.name}
                </p>
              </div>
            </div>

            {/* Sale Details */}
            <div className="space-y-6" style={{ animation: 'slideUpFade 0.9s ease-out' }}>
              <div className="flex items-center justify-center gap-4">
                <div className="h-1 w-20 bg-gradient-to-r from-transparent to-cyan-400" />
                <p className="text-4xl font-bold text-white uppercase tracking-widest">
                  Sold to
                </p>
                <div className="h-1 w-20 bg-gradient-to-l from-transparent to-cyan-400" />
              </div>
              
              <div className="flex items-center justify-center gap-4">
                {team.logo && (
                  <img src={team.logo} alt={team.name} className="w-16 h-16 object-contain" style={{
                    filter: 'drop-shadow(0 0 15px rgba(0, 230, 255, 0.8))'
                  }} />
                )}
                <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 uppercase tracking-wider" style={{
                  textShadow: '0 0 30px rgba(0, 230, 255, 0.5)'
                }}>
                  {team.name}
                </p>
              </div>
              
              <div className="mt-8 pt-8 border-t-4 border-yellow-400/30">
                <p className="text-2xl text-yellow-400 uppercase tracking-widest mb-2 font-bold">Final Bid</p>
                <p className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-200 to-yellow-400" style={{
                  textShadow: '0 0 40px rgba(255, 215, 0, 0.8)',
                  WebkitTextStroke: '1px rgba(255, 215, 0, 0.3)'
                }}>
                  {formatCurrency(price)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes spin {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
