import React, { useState, useEffect, useRef } from 'react';
import { Users, Zap, Trophy } from 'lucide-react';
import { Player, Team } from '../../types';

interface SoldCelebrationProps {
  player: Player;
  team: Team;
  price: number;
  onComplete: () => void;
  confettiSize?: 'none' | 'small' | 'normal'; // 'none' = no confetti, 'small' = tiny particles
  compact?: boolean; // Compact mode for spectators - smaller UI
}

// 3D Confetti Particle Component
const Confetti3D: React.FC<{ size?: 'small' | 'normal' }> = ({ size = 'normal' }) => {
  const confettiCount = size === 'small' ? 50 : 20; // More confetti particles
  const colors = ['#FF0066', '#FF6B9D', '#00E6FF', '#FF2D75', '#10B981', '#8B5CF6', '#EC4899', '#FF1493'];
  
  console.log('🎊 Confetti3D rendering with size:', size, 'count:', confettiCount);
  
  return (
    <div className="fixed inset-0 pointer-events-none z-[250] overflow-hidden" style={{ perspective: '1000px' }}>
      {Array.from({ length: confettiCount }).map((_, i) => {
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        const randomDelay = Math.random() * 0.2;
        const randomDuration = 2.5 + Math.random() * 1.5; // Faster, shorter fall
        const randomX = -2 + Math.random() * 4; // Minimal horizontal spread
        const randomRotate = Math.random() * 360 - 180; // Less rotation for cleaner look
        const randomRotateY = Math.random() * 360 - 180;
        const randomSize = size === 'small' ? 12 + Math.random() * 14 : 20 + Math.random() * 16; // Small: 12-26px (increased), Normal: 20-36px
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
              boxShadow: `0 0 ${size === 'small' ? 1 : 8}px ${randomColor}, 0 0 ${size === 'small' ? 0.5 : 4}px rgba(255, 255, 255, 0.3)`, // Very subtle glow for smaller particles
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

export const SoldCelebration: React.FC<SoldCelebrationProps> = ({ player, team, price, onComplete, confettiSize = 'normal', compact = false }) => {
  const [stage, setStage] = useState<'hammer' | 'celebration'>('hammer');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const celebrationAudioRef = useRef<HTMLAudioElement | null>(null);
  
  // Debug logging
  console.log('🎊 SoldCelebration confettiSize:', confettiSize, 'compact:', compact);
  
  // Play hammer sound synchronized with animation
  useEffect(() => {
    const audio = new Audio('/sound.mp3');
    audio.volume = 0.5;
    audio.loop = false;
    audioRef.current = audio;
    
    // Play sound (respects browser autoplay policies since triggered from user interaction flow)
    audio.play().catch(err => console.log('Audio playback prevented:', err));
    
    return () => {
      // Stop and cleanup audio on unmount
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
    };
  }, []);
  
  // Stop audio when transitioning to celebration stage
  useEffect(() => {
    if (stage === 'celebration' && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [stage]);
  
  // Play celebration sound together with confetti effect
  useEffect(() => {
    if (stage === 'celebration' && confettiSize !== 'none') {
      const celebrationAudio = new Audio('/sound1.mp3');
      celebrationAudio.volume = 0.5;
      celebrationAudio.loop = false;
      celebrationAudioRef.current = celebrationAudio;
      
      // Play sound (respects browser autoplay policies since triggered from user interaction flow)
      celebrationAudio.play().catch(err => console.log('Celebration audio playback prevented:', err));
      
      return () => {
        // Stop and cleanup audio on unmount
        if (celebrationAudioRef.current) {
          celebrationAudioRef.current.pause();
          celebrationAudioRef.current.currentTime = 0;
          celebrationAudioRef.current = null;
        }
      };
    }
  }, [stage, confettiSize]);
  
  useEffect(() => {
    const hammerTimer = setTimeout(() => setStage('celebration'), compact ? 2500 : 3500);
    const completeTimer = setTimeout(onComplete, compact ? 5000 : 7000);
    return () => {
      clearTimeout(hammerTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete, compact]);

  const formatCurrency = (amount: number): string => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    return `₹${amount.toLocaleString()}`;
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{
      background: 'radial-gradient(ellipse at center, rgba(10, 10, 30, 0.97) 0%, rgba(5, 5, 15, 0.98) 100%)'
    }}>
      {/* Confetti Animation - Hidden for Auctioneers, Small for Spectators */}
      {stage === 'celebration' && confettiSize !== 'none' && (
        <Confetti3D size={confettiSize as 'small' | 'normal'} />
      )}
      
      {/* Animated Background Rays */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%]" style={{
          background: 'conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(255, 215, 0, 0.1) 60deg, transparent 120deg, rgba(0, 230, 255, 0.1) 180deg, transparent 240deg, rgba(255, 107, 157, 0.1) 300deg, transparent 360deg)',
          animation: 'spin 20s linear infinite'
        }} />
      </div>

      <div className="text-center relative px-6 z-10">
        {stage === 'hammer' && (
          <div className="flex flex-col items-center justify-center animate-in zoom-in duration-300">
            <video
              autoPlay
              muted
              playsInline
              className={`object-contain ${compact ? 'w-56 h-56' : 'w-96 h-96 md:w-[28rem] md:h-[28rem]'}`}
              style={{
                filter: 'drop-shadow(0 0 30px rgba(255, 215, 0, 0.6))',
              }}
            >
              <source src="/ham.webm" type="video/webm" />
            </video>
          </div>
        )}
        
        {stage === 'celebration' && (
          <div className="animate-in zoom-in duration-700">
            {/* SOLD! Header with Trophy */}
            <div className={`relative ${compact ? 'mb-4' : 'mb-8'}`} style={{ animation: 'slideUpFade 0.5s ease-out' }}>
              <div className={`flex items-center justify-center ${compact ? 'gap-2 mb-2' : 'gap-6 mb-4'}`}>
                <Trophy size={compact ? 24 : 64} className="text-pink-400" style={{
                  filter: 'drop-shadow(0 0 20px rgba(255, 0, 102, 1))',
                  animation: 'soldPulse 1.5s ease-in-out infinite'
                }} />
                <h1 className={`font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-pink-200 to-pink-400 uppercase ${compact ? 'text-4xl' : 'text-9xl'}`} style={{
                  textShadow: '0 0 40px rgba(255, 0, 102, 0.8), 0 0 80px rgba(255, 0, 102, 0.5)',
                  WebkitTextStroke: `${compact ? '1px' : '2px'} rgba(255, 0, 102, 0.3)`,
                  animation: 'soldPulse 1.5s ease-in-out infinite'
                }}>
                  SOLD!
                </h1>
                <Trophy size={compact ? 24 : 64} className="text-pink-400" style={{
                  filter: 'drop-shadow(0 0 20px rgba(255, 0, 102, 1))',
                  animation: 'soldPulse 1.5s ease-in-out infinite'
                }} />
              </div>
              
              <div className={`flex items-center justify-center ${compact ? 'gap-1' : 'gap-3'}`}>
                <Zap size={compact ? 16 : 32} className="text-cyan-400" style={{ filter: 'drop-shadow(0 0 10px rgba(0, 230, 255, 0.8))' }} />
                <Zap size={compact ? 16 : 32} className="text-cyan-400" style={{ filter: 'drop-shadow(0 0 10px rgba(0, 230, 255, 0.8))' }} />
                <Zap size={compact ? 16 : 32} className="text-cyan-400" style={{ filter: 'drop-shadow(0 0 10px rgba(0, 230, 255, 0.8))' }} />
              </div>
            </div>

            {/* Player Info */}
            <div className={`relative ${compact ? 'mb-6' : 'mb-12'}`} style={{ animation: 'slideUpFade 0.7s ease-out' }}>
              <div className={`mx-auto rounded-3xl overflow-hidden relative ${compact ? 'w-44 h-44' : 'w-96 h-96'}`} style={{
                border: `${compact ? '4px' : '6px'} solid rgba(255, 215, 0, 0.6)`,
                boxShadow: '0 0 60px rgba(255, 215, 0, 0.8), 0 0 120px rgba(255, 215, 0, 0.4), inset 0 0 80px rgba(255, 215, 0, 0.2)',
                animation: 'sparkleGlow 2s ease-in-out infinite'
              }}>
                {player.imageUrl ? (
                  <img src={player.imageUrl} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-black">
                    <Users size={compact ? 56 : 140} className="text-gray-600" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </div>
              
              <div className={`absolute left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full ${compact ? '-bottom-3 px-4 py-1.5' : '-bottom-7 px-10 py-4'}`} style={{
                boxShadow: '0 0 30px rgba(0, 230, 255, 0.6)'
              }}>
                <p className={`font-black text-white uppercase tracking-wider ${compact ? 'text-sm' : 'text-4xl'}`}>
                  {player.name}
                </p>
              </div>
            </div>

            {/* Sale Details */}
            <div className={`${compact ? 'space-y-2' : 'space-y-6'}`} style={{ animation: 'slideUpFade 0.9s ease-out' }}>
              <div className="flex items-center justify-center gap-4">
                <div className={`bg-gradient-to-r from-transparent to-cyan-400 ${compact ? 'h-0.5 w-10' : 'h-1 w-20'}`} />
                <p className={`font-bold text-white uppercase tracking-widest ${compact ? 'text-sm' : 'text-4xl'}`}>
                  Sold to
                </p>
                <div className={`bg-gradient-to-l from-transparent to-cyan-400 ${compact ? 'h-0.5 w-10' : 'h-1 w-20'}`} />
              </div>
              
              <div className={`flex items-center justify-center ${compact ? 'gap-3' : 'gap-5'}`}>
                {team.logo && (
                  <img src={team.logo} alt={team.name} className={`object-contain ${compact ? 'w-10 h-10' : 'w-20 h-20'}`} style={{
                    filter: 'drop-shadow(0 0 15px rgba(0, 230, 255, 0.8))'
                  }} />
                )}
                <p className={`font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 uppercase tracking-wider ${compact ? 'text-2xl' : 'text-6xl'}`} style={{
                  textShadow: '0 0 30px rgba(0, 230, 255, 0.5)'
                }}>
                  {team.name}
                </p>
              </div>
              
              <div className={`border-t-4 border-pink-400/30 ${compact ? 'mt-3 pt-3' : 'mt-8 pt-8'}`}>
                <p className={`text-pink-400 uppercase tracking-widest font-bold ${compact ? 'text-xs mb-1' : 'text-2xl mb-2'}`}>Final Bid</p>
                <p className={`font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-pink-200 to-pink-400 ${compact ? 'text-3xl' : 'text-7xl'}`} style={{
                  textShadow: '0 0 40px rgba(255, 0, 102, 0.8)',
                  WebkitTextStroke: `${compact ? '0.5px' : '1px'} rgba(255, 0, 102, 0.3)`
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
