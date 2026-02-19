import React, { useMemo, useEffect, useRef } from 'react';
import { Player, UserRole, Team } from '../../types';
import { Users } from 'lucide-react';
import { isValidImageUrl } from '../../services/imageUrlValidator';

interface PlayerQueueCarouselProps {
  allPlayers: Player[];
  currentPlayer: Player | null;
  userRole: string;
  currentBidAmount?: number;
  leadingTeamName?: string;
  leadingTeamLogo?: string;
  teams?: Team[];
  onSoundTrigger?: (event: 'card-move' | 'sold' | 'unsold' | 'new-bid') => void;
}

// Neon Card Stack Carousel - Game Selection Stage Style
const NEON_CAROUSEL_STYLES = `
  @keyframes neonCyanGlow {
    0%, 100% { 
      box-shadow: 
        inset 0 0 0 2px rgba(255, 0, 102, 0.7),
        0 0 30px rgba(255, 0, 102, 0.35),
        0 0 60px rgba(255, 0, 102, 0.18);
    }
    50% { 
      box-shadow: 
        inset 0 0 0 2.5px rgba(255, 0, 102, 1),
        0 0 40px rgba(255, 0, 102, 0.5),
        0 0 80px rgba(255, 0, 102, 0.25);
    }
  }

  @keyframes neonSideEdge {
    0%, 100% { box-shadow: inset 0 0 0 1px rgba(255, 0, 102, 0.35); }
    50% { box-shadow: inset 0 0 0 1.5px rgba(255, 0, 102, 0.55); }
  }

  @keyframes neonShineSweep {
    0% { transform: translateX(-200%) skewX(-20deg); opacity: 0; }
    25% { opacity: 0.5; }
    100% { transform: translateX(300%) skewX(-20deg); opacity: 0; }
  }

  @keyframes logoNeonGlow {
    0%, 100% { filter: drop-shadow(0 0 5px rgba(255, 0, 102, 0.5)); }
    50% { filter: drop-shadow(0 0 15px rgba(255, 0, 102, 0.9)) drop-shadow(0 0 30px rgba(255, 0, 102, 0.6)); }
  }

  @keyframes pinkHudGlow {
    0%, 100% { 
      box-shadow: 
        inset 0 0 0 1.5px rgba(255, 0, 102, 0.6),
        0 0 20px rgba(255, 0, 102, 0.4),
        0 0 40px rgba(255, 0, 102, 0.2);
    }
    50% { 
      box-shadow: 
        inset 0 0 0 2px rgba(255, 0, 102, 1),
        0 0 30px rgba(255, 0, 102, 0.6),
        0 0 60px rgba(255, 0, 102, 0.3);
    }
  }

  @keyframes cyanHudGlow {
    0%, 100% { 
      box-shadow: 
        inset 0 0 0 1.5px rgba(255, 0, 102, 0.65),
        0 0 20px rgba(255, 0, 102, 0.4),
        0 0 40px rgba(255, 0, 102, 0.2);
    }
    50% { 
      box-shadow: 
        inset 0 0 0 2px rgba(255, 0, 102, 1),
        0 0 30px rgba(255, 0, 102, 0.6),
        0 0 60px rgba(255, 0, 102, 0.3);
    }
  }

  @keyframes brightPinkPulse {
    0%, 100% { 
      box-shadow: 
        inset 0 0 0 1.5px rgba(255, 0, 102, 0.8),
        0 0 25px rgba(255, 0, 102, 0.5),
        0 0 50px rgba(255, 0, 102, 0.3);
    }
    50% { 
      box-shadow: 
        inset 0 0 0 2.5px rgba(255, 0, 102, 1),
        0 0 40px rgba(255, 0, 102, 0.8),
        0 0 80px rgba(255, 0, 102, 0.5);
    }
  }

  .neon-center-card { animation: neonCyanGlow 2.5s ease-in-out infinite; }
  .neon-side-card { animation: neonSideEdge 2s ease-in-out infinite; }
  .neon-logo { animation: logoNeonGlow 2.5s ease-in-out infinite; }
  .hud-card-pink { animation: pinkHudGlow 2.5s ease-in-out infinite; }
  .hud-card-cyan { animation: cyanHudGlow 2.5s ease-in-out infinite; }
  .hud-card-pulse { animation: brightPinkPulse 1.5s ease-in-out infinite; }

  .carousel-stage {
    background: radial-gradient(ellipse at center, 
      rgba(25, 10, 50, 1) 0%, 
      rgba(15, 5, 30, 1) 50%, 
      rgba(8, 3, 16, 1) 100%
    );
  }
`;

/**
 * PlayerQueueCarousel - Sports Broadcast Style Auction Display
 * 
 * Designed to feel like:
 * - IPL Mega Auction Broadcast
 * - Esports Team Draft Screen
 * - Sports Draft Table
 * 
 * NOT: SaaS dashboard, admin panel UI
 */
export const PlayerQueueCarousel: React.FC<PlayerQueueCarouselProps> = ({
  allPlayers,
  currentPlayer,
  userRole,
  currentBidAmount,
  leadingTeamName,
  leadingTeamLogo,
  teams,
  onSoundTrigger
}) => {
  const previousPlayerIdRef = useRef<string | null>(null);
  const previousStatusesRef = useRef<Map<string, string>>(new Map());

  // Inject sports broadcast styles
  useEffect(() => {
    const styleId = 'neon-carousel-styles';
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement('style');
      styleEl.id = styleId;
      styleEl.textContent = NEON_CAROUSEL_STYLES;
      document.head.appendChild(styleEl);
    }
  }, []);

  // Build 5-slot carousel array (ALWAYS 5 cards visible)
  const carouselSlots = useMemo(() => {
    // CRITICAL GUARD: Filter to only APPROVED players before building carousel
    // A declined player must NEVER appear in the auction carousel
    const approvedPlayersOnly = allPlayers.filter(p => 
      p.approvalStatus === 'accepted' || 
      p.approvalStatus === undefined || 
      p.approvalStatus === null
    );
    
    // Get available players for carousel
    const availablePlayers = approvedPlayersOnly.length > 0 ? approvedPlayersOnly : [];
    
    // Find center player index
    const centerIndex = currentPlayer 
      ? availablePlayers.findIndex(p => p.id === currentPlayer.id)
      : 0;
    
    // Build 5-slot array: [-2, -1, 0, 1, 2]
    const slots: (Player | null)[] = [];
    
    if (availablePlayers.length === 0) {
      // No players - fill with nulls
      return [null, null, null, null, null];
    }
    
    if (availablePlayers.length === 1) {
      // Only 1 player - duplicate to fill all slots
      const player = availablePlayers[0];
      return [player, player, player, player, player];
    }
    
    if (availablePlayers.length === 2) {
      // 2 players - alternate to fill slots
      const [p1, p2] = availablePlayers;
      return [p1, p2, currentPlayer || p1, p1, p2];
    }
    
    // 3+ players - use carousel logic with wrapping
    for (let offset = -2; offset <= 2; offset++) {
      let index = centerIndex + offset;
      
      // Wrap around if needed
      while (index < 0) index += availablePlayers.length;
      while (index >= availablePlayers.length) index -= availablePlayers.length;
      
      slots.push(availablePlayers[index]);
    }
    
    return slots;
  }, [allPlayers, currentPlayer]);
  
  // Get sold/queue counts for status display
  // CRITICAL: Only count APPROVED players
  const { soldCount, queueCount } = useMemo(() => {
    let sold = 0;
    let queue = 0;
    allPlayers.forEach(player => {
      // Skip declined players entirely
      if (player.approvalStatus === 'declined') return;
      
      if (player.status === 'SOLD') sold++;
      else if (player.status !== 'SOLD' && player.id !== currentPlayer?.id) queue++;
    });
    return { soldCount: sold, queueCount: queue };
  }, [allPlayers, currentPlayer]);

  // Find leading team logo
  const currentTeamLogo = useMemo(() => {
    if (leadingTeamLogo) return leadingTeamLogo;
    if (teams && leadingTeamName) {
      const team = teams.find(t => t.name === leadingTeamName);
      return team?.logo;
    }
    return null;
  }, [leadingTeamLogo, leadingTeamName, teams]);

  // Detect status changes for sound triggers
  useEffect(() => {
    allPlayers.forEach(player => {
      const prevStatus = previousStatusesRef.current.get(player.id);
      const currentStatus = player.status;

      if (prevStatus && prevStatus !== currentStatus) {
        if (currentStatus === 'SOLD') onSoundTrigger?.('sold');
        else if (currentStatus === 'UNSOLD') onSoundTrigger?.('unsold');
      }
      previousStatusesRef.current.set(player.id, currentStatus || 'PENDING');
    });

    if (currentPlayer?.id !== previousPlayerIdRef.current) {
      if (currentPlayer) onSoundTrigger?.('card-move');
      previousPlayerIdRef.current = currentPlayer?.id || null;
    }
  }, [allPlayers, currentPlayer, onSoundTrigger]);

  // Format currency
  const formatCurrency = (amount: number): string => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    return `₹${amount.toLocaleString()}`;
  };

  return (
    <div className="relative w-full h-full overflow-hidden carousel-stage" style={{ minHeight: '480px' }}>
      {/* Neon spotlight effect */}
      <div className="absolute inset-0 pointer-events-none">
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] opacity-15"
          style={{ background: 'radial-gradient(ellipse at top, rgba(255, 0, 102, 0.25) 0%, transparent 70%)' }}
        />
      </div>

      {/* 5-SLOT FORCED CAROUSEL STAGE - Top Center Position */}
      <div 
        className="absolute -top-8 left-1/2 -translate-x-1/2"
        style={{ 
          perspective: '1200px', 
          perspectiveOrigin: 'center center',
          width: '100%',
          maxWidth: '1200px'
        }}
      >
        <div 
          className="relative"
          style={{ 
            transformStyle: 'preserve-3d',
            height: '450px',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {carouselSlots.map((player, index) => {
            const slotPosition = index - 2; // Convert to: -2, -1, 0, 1, 2
            return (
              <StageCard
                key={player?.id || `slot-${index}`}
                player={player}
                slotPosition={slotPosition}
                isCenter={slotPosition === 0}
                currentBidAmount={slotPosition === 0 ? (currentBidAmount || player?.basePrice || 0) : (player?.basePrice || 0)}
                teamLogo={slotPosition === 0 ? currentTeamLogo : null}
                formatCurrency={formatCurrency}
              />
            );
          })}
        </div>
      </div>

      {/* 3 SEPARATE HUD CARDS - BELOW PLAYER CAROUSEL */}
      <div className="absolute w-full flex items-center justify-center gap-8" style={{ top: '350px' }}>
        
        {/* CARD 1: BASE PRICE - Pink HUD Style */}
        <div 
          className="hud-card-pink relative overflow-hidden"
          style={{
            width: '165px',
            height: '105px',
            background: 'linear-gradient(135deg, rgba(20, 5, 15, 0.95) 0%, rgba(35, 5, 25, 0.95) 100%)',
            clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)',
            border: '1.5px solid rgba(255, 0, 102, 0.4)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '14px'
          }}
        >
          <span style={{ fontSize: '9px', color: 'rgba(255, 0, 102, 0.7)', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase' }}>
            BASE PRICE
          </span>
          <span style={{ fontSize: '18px', color: '#FF0066', fontWeight: '900', marginTop: '6px', textShadow: '0 0 10px rgba(255, 0, 102, 0.6)' }}>
            {formatCurrency(currentPlayer?.basePrice || 0)}
          </span>
        </div>

        {/* TEAM: Text + Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          {currentTeamLogo && isValidImageUrl(currentTeamLogo) ? (
            <img 
              src={currentTeamLogo} 
              alt={leadingTeamName} 
              className="h-12 w-auto object-contain"
              style={{ filter: 'drop-shadow(0 0 10px rgba(255, 0, 102, 0.5))' }}
            />
          ) : null}
          <span style={{ fontSize: '13px', color: 'rgba(255, 0, 102, 0.9)', fontWeight: '700', letterSpacing: '0.5px', textAlign: 'center' }}>
            {leadingTeamName || 'NO TEAM'}
          </span>
        </div>

        {/* CARD 3: CURRENT BID - Bright Cyan Pulsing HUD (SAME SIZE AS BASE PRICE) */}
        <div 
          className="hud-card-pulse relative overflow-hidden"
          style={{
            width: '165px',
            height: '105px',
            background: 'linear-gradient(135deg, rgba(50, 20, 20, 0.98) 0%, rgba(60, 25, 25, 0.98) 100%)',
            clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)',
            border: '1.5px solid rgba(239, 68, 68, 0.7)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '14px'
          }}
        >
          <span style={{ fontSize: '9px', color: 'rgba(255, 0, 102, 0.8)', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
            LIVE BID
          </span>
          <span style={{ fontSize: '18px', color: '#FF0066', fontWeight: '900', marginTop: '6px', textShadow: '0 0 15px rgba(255, 0, 102, 0.8), 0 0 30px rgba(255, 0, 102, 0.5)' }}>
            {formatCurrency(currentBidAmount || 0)}
          </span>
        </div>

      </div>
    </div>
  );
};

// ============================================================
// STAGE CARD - Unified 5-slot carousel card
// Positions: -2 (LEFT FAR), -1 (LEFT NEAR), 0 (CENTER), 1 (RIGHT NEAR), 2 (RIGHT FAR)
// ============================================================
interface StageCardProps {
  player: Player | null;
  slotPosition: number; // -2 to +2
  isCenter: boolean;
  currentBidAmount: number;
  teamLogo?: string | null;
  formatCurrency: (n: number) => string;
}

const StageCard: React.FC<StageCardProps> = ({ 
  player, 
  slotPosition, 
  isCenter, 
  currentBidAmount, 
  teamLogo, 
  formatCurrency 
}) => {
  if (!player) {
    return (
      <div 
        className="absolute"
        style={{
          opacity: 0.2,
          transform: `translateX(${slotPosition * 200}px) scale(0.7)`,
          zIndex: 50 - Math.abs(slotPosition)
        }}
      >
        <div className="w-80 h-[520px] rounded-md bg-gray-900/20 border border-gray-800" />
      </div>
    );
  }

  const hasValidImage = isValidImageUrl(player.imageUrl);
  const hasValidTeamLogo = isCenter && teamLogo && isValidImageUrl(teamLogo);

  const getCategoryDisplay = (role?: string) => {
    const r = role?.toLowerCase() || '';
    if (r.includes('bat')) return 'BATSMAN';
    if (r.includes('bowl')) return 'BOWLER';
    if (r.includes('all')) return 'ALL-ROUNDER';
    if (r.includes('keep') || r.includes('wick')) return 'KEEPER';
    return '';
  };

  // Calculate position-based values - WIDE STAGE SPREAD for cinematic depth
  const getTransformValues = () => {
    switch (slotPosition) {
      case -2: // LEFT FAR - Wide spread, clearly visible
        return {
          translateX: -280,
          translateY: 20,
          translateZ: -100,
          scale: 0.75,
          opacity: 0.4,
          rotateY: 18,
          zIndex: 10,
          blur: 1.5
        };
      case -1: // LEFT NEAR - Visible beside center
        return {
          translateX: -140,
          translateY: 10,
          translateZ: -50,
          scale: 0.85,
          opacity: 0.7,
          rotateY: 12,
          zIndex: 20,
          blur: 0.5
        };
      case 0: // CENTER - Front and center
        return {
          translateX: 0,
          translateY: 0,
          translateZ: 0,
          scale: 1.0,
          opacity: 1.0,
          rotateY: 0,
          zIndex: 100,
          blur: 0
        };
      case 1: // RIGHT NEAR - Visible beside center
        return {
          translateX: 140,
          translateY: 10,
          translateZ: -50,
          scale: 0.85,
          opacity: 0.7,
          rotateY: -12,
          zIndex: 20,
          blur: 0.5
        };
      case 2: // RIGHT FAR - Wide spread, clearly visible
        return {
          translateX: 280,
          translateY: 20,
          translateZ: -100,
          scale: 0.75,
          opacity: 0.4,
          rotateY: -18,
          zIndex: 10,
          blur: 1.5
        };
      default:
        return {
          translateX: 0,
          translateY: 0,
          translateZ: -200,
          scale: 0.5,
          opacity: 0.2,
          rotateY: 0,
          zIndex: 1,
          blur: 3
        };
    }
  };

  const { translateX, translateY, translateZ, scale, opacity, rotateY, zIndex, blur } = getTransformValues();
  const isNearCard = Math.abs(slotPosition) === 1;

  // ALL CARDS USE SAME FULL COMPONENT - Only transform differs
  return (
    <div 
      className="absolute transition-all duration-500 ease-out"
      style={{ 
        transform: `translateX(${translateX}px) translateY(${translateY}px) translateZ(${translateZ}px) scale(${scale}) rotateY(${rotateY}deg)`,
        opacity,
        zIndex,
        transformStyle: 'preserve-3d',
        filter: isCenter 
          ? 'drop-shadow(0px 8px 30px rgba(0,0,0,0.7)) drop-shadow(0px 0px 40px rgba(255,0,102,0.3))'
          : blur > 0 
            ? `blur(${blur}px) drop-shadow(0px ${Math.abs(slotPosition) * 4}px ${Math.abs(slotPosition) * 8}px rgba(0,0,0,0.6))` 
            : 'drop-shadow(0px 4px 12px rgba(0,0,0,0.4))',
        pointerEvents: isCenter ? 'auto' : 'none'
      }}
    >
      <div 
        className={isCenter ? 'relative w-80 neon-center-card' : `relative w-80 ${isNearCard ? 'neon-side-card' : ''}`}
        style={{ 
          borderRadius: '6px', 
          overflow: 'hidden', 
          background: 'linear-gradient(180deg, rgba(12, 6, 18, 0.98) 0%, rgba(18, 8, 28, 0.96) 100%)',
          boxShadow: isCenter ? undefined : isNearCard 
            ? 'inset 0 0 0 1px rgba(120, 80, 180, 0.6)' 
            : 'inset 0 0 0 1px rgba(120, 80, 180, 0.3)'
        }}
      >
        {/* Shine sweep - only on center */}
        {isCenter && (
          <div className="absolute inset-0 z-30 pointer-events-none overflow-hidden">
            <div 
              className="absolute top-0 left-0 w-24 h-full bg-gradient-to-r from-transparent via-white/8 to-transparent"
              style={{ animation: 'neonShineSweep 8s ease-in-out infinite' }}
            />
          </div>
        )}

        {/* LIVE badge - only on center */}
        {isCenter && (
          <div className="absolute top-2 right-2 z-20">
            <div 
              className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-white"
              style={{ background: '#FF0066', borderRadius: '3px' }}
            >
              LIVE
            </div>
          </div>
        )}

        {/* Player image - SAME SIZE FOR ALL CARDS */}
        <div className="relative h-56 overflow-hidden">
          {hasValidImage ? (
            <img 
              src={player.imageUrl} 
              alt={player.name} 
              className="w-full h-full object-cover object-top"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-gray-900 to-black">
              <Users size={56} className="text-gray-800" />
            </div>
          )}
          <div 
            className="absolute bottom-0 left-0 right-0 h-16"
            style={{ background: 'linear-gradient(to top, rgba(12, 6, 18, 1), transparent)' }}
          />
        </div>

        {/* Name + Category - SAME FOR ALL CARDS */}
        <div className="px-3 py-3">
          <h2 className="text-lg font-black text-white leading-none truncate">
            {player.name}
          </h2>
          <div 
            className="inline-block mt-1.5 px-2 py-0.5 text-[9px] font-bold tracking-wide"
            style={{ 
              background: 'rgba(255, 0, 102, 0.15)', 
              color: '#FF0066', 
              borderRadius: '2px',
              border: '1px solid rgba(255, 0, 102, 0.3)'
            }}
          >
            {getCategoryDisplay(player.role)}
          </div>
        </div>


      </div>
    </div>
  );
};

export default PlayerQueueCarousel;