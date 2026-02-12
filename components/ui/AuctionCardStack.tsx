import React, { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import { Player, UserRole } from '../../types';
import { Users, Shield, Award, Zap, TrendingUp, Star } from 'lucide-react';
import { isValidImageUrl } from '../../services/imageUrlValidator';
import {
  CardStateManager,
  AnimationController,
  CardState,
  CardPosition,
  CardStatus,
  ANIMATION_STYLES,
  DURATIONS,
  EASING,
  positionToTransform,
  getStatusGlow,
  getStatusBorder,
} from '../../services/auctionAnimations';

interface AuctionCardStackProps {
  allPlayers: Player[];
  currentPlayer: Player | null;
  currentBidAmount?: number;
  leadingTeamName?: string;
  userRole: UserRole;
  onSoundTrigger?: (event: 'card-move' | 'sold' | 'unsold' | 'new-bid') => void;
}

interface ParticleProps {
  isActive: boolean;
  color: string;
  originX: number;
  originY: number;
}

/**
 * Premium Auction Card Stack
 * IPL/Esports-style player card carousel with smooth animations
 * 
 * Three zones:
 * - LEFT: Sold players (stacked, green glow)
 * - CENTER: Current auction player (large, pink neon)
 * - RIGHT: Queue/Unsold players (waiting)
 */
export const AuctionCardStack: React.FC<AuctionCardStackProps> = ({
  allPlayers,
  currentPlayer,
  currentBidAmount,
  leadingTeamName,
  userRole,
  onSoundTrigger,
}) => {
  // State managers
  const cardStateManagerRef = useRef<CardStateManager>(new CardStateManager());
  const animationControllerRef = useRef<AnimationController>(new AnimationController());
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Component state
  const [renderKey, setRenderKey] = useState(0);
  const [particles, setParticles] = useState<ParticleProps[]>([]);
  const previousPlayerRef = useRef<string | null>(null);
  const previousStatusRef = useRef<Map<string, string>>(new Map());

  // Inject animation styles
  useEffect(() => {
    const styleId = 'auction-animation-styles';
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement('style');
      styleEl.id = styleId;
      styleEl.textContent = ANIMATION_STYLES;
      document.head.appendChild(styleEl);
    }
  }, []);

  // Calculate player stacks
  const { soldPlayers, queuePlayers, centerPlayer } = useMemo(() => {
    const sold: Player[] = [];
    const queue: Player[] = [];
    let center: Player | null = currentPlayer;

    allPlayers.forEach(player => {
      if (player.id === currentPlayer?.id) {
        center = player;
      } else if (player.status === 'SOLD') {
        sold.unshift(player); // Latest sold first
      } else {
        queue.push(player);
      }
    });

    return { soldPlayers: sold, queuePlayers: queue, centerPlayer: center };
  }, [allPlayers, currentPlayer]);

  // Detect status changes and trigger animations
  useEffect(() => {
    allPlayers.forEach(player => {
      const prevStatus = previousStatusRef.current.get(player.id);
      const currentStatus = player.status;

      if (prevStatus && prevStatus !== currentStatus) {
        // Status changed - trigger animation
        if (currentStatus === 'SOLD') {
          onSoundTrigger?.('sold');
          triggerParticles('sold');
        } else if (currentStatus === 'UNSOLD') {
          onSoundTrigger?.('unsold');
          triggerParticles('unsold');
        }
      }

      previousStatusRef.current.set(player.id, currentStatus || 'PENDING');
    });

    // Check if current player changed
    if (currentPlayer?.id !== previousPlayerRef.current) {
      if (currentPlayer) {
        onSoundTrigger?.('card-move');
      }
      previousPlayerRef.current = currentPlayer?.id || null;
    }
  }, [allPlayers, currentPlayer, onSoundTrigger]);

  // Trigger particle effect
  const triggerParticles = useCallback((type: 'sold' | 'unsold') => {
    const color = type === 'sold' ? 'rgba(16, 185, 129, 0.8)' : 'rgba(245, 158, 11, 0.8)';
    const newParticles: ParticleProps[] = Array.from({ length: 12 }, (_, i) => ({
      isActive: true,
      color,
      originX: Math.random() * 60 - 30,
      originY: Math.random() * 60 - 30,
    }));
    setParticles(newParticles);
    setTimeout(() => setParticles([]), 800);
  }, []);

  // Format currency
  const formatCurrency = (amount: number): string => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    return `₹${amount.toLocaleString()}`;
  };

  // Get role badge color
  const getRoleBadgeColor = (role?: string): string => {
    switch (role?.toLowerCase()) {
      case 'batsman':
      case 'batter':
        return 'from-blue-500 to-blue-600';
      case 'bowler':
        return 'from-green-500 to-green-600';
      case 'all-rounder':
      case 'allrounder':
        return 'from-purple-500 to-purple-600';
      case 'wicket-keeper':
      case 'keeper':
        return 'from-orange-500 to-orange-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-hidden auction-gradient-bg"
      style={{ minHeight: '500px' }}
    >
      {/* Background ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-30"
          style={{
            background: 'radial-gradient(ellipse, rgba(255, 45, 117, 0.3) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        <div 
          className="absolute top-1/3 left-1/4 w-[300px] h-[300px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(147, 51, 234, 0.4) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
        <div 
          className="absolute bottom-1/4 right-1/4 w-[250px] h-[250px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
      </div>

      {/* Particle effects */}
      {particles.map((particle, idx) => (
        <div
          key={idx}
          className="absolute top-1/2 left-1/2 w-3 h-3 rounded-full pointer-events-none"
          style={{
            background: particle.color,
            boxShadow: `0 0 10px ${particle.color}`,
            animation: `auctionParticleDust 600ms ease-out forwards`,
            '--dust-x': `${particle.originX}px`,
            '--dust-y': `${particle.originY}px`,
          } as React.CSSProperties}
        />
      ))}

      {/* Main card container - flex layout for 3 zones */}
      <div className="absolute inset-0 flex items-center justify-center gap-8 px-8">
        
        {/* LEFT ZONE: Sold Players Stack */}
        <div className="relative flex-shrink-0 w-[200px] h-[400px]">
          <div className="absolute top-0 left-0 right-0 text-center mb-4">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-center gap-2">
              <Shield size={12} />
              Sold ({soldPlayers.length})
            </span>
          </div>
          
          <div className="relative mt-8 h-[360px]">
            {soldPlayers.slice(0, 5).map((player, index) => (
              <SoldCard
                key={player.id}
                player={player}
                stackIndex={index}
                totalInStack={Math.min(soldPlayers.length, 5)}
              />
            ))}
            
            {soldPlayers.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center opacity-40">
                  <Shield size={32} className="mx-auto mb-2 text-gray-600" />
                  <p className="text-xs text-gray-500">No players sold yet</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CENTER ZONE: Current Auction Player */}
        <div className="relative flex-1 max-w-[400px] h-[500px] flex items-center justify-center">
          {centerPlayer ? (
            <CenterCard
              player={centerPlayer}
              currentBidAmount={currentBidAmount || centerPlayer.basePrice}
              leadingTeamName={leadingTeamName}
              formatCurrency={formatCurrency}
              getRoleBadgeColor={getRoleBadgeColor}
            />
          ) : (
            <div className="text-center">
              <div 
                className="w-64 h-80 rounded-3xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(30, 20, 40, 0.8), rgba(40, 25, 55, 0.6))',
                  border: '2px dashed rgba(255, 45, 117, 0.3)',
                }}
              >
                <div className="text-center">
                  <Zap size={48} className="mx-auto mb-4 text-pink-500/50" />
                  <p className="text-gray-400 font-bold">Waiting for next player...</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT ZONE: Queue Players Stack */}
        <div className="relative flex-shrink-0 w-[200px] h-[400px]">
          <div className="absolute top-0 left-0 right-0 text-center mb-4">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center justify-center gap-2">
              <TrendingUp size={12} />
              Queue ({queuePlayers.length})
            </span>
          </div>
          
          <div className="relative mt-8 h-[360px]">
            {queuePlayers.slice(0, 4).map((player, index) => (
              <QueueCard
                key={player.id}
                player={player}
                stackIndex={index}
                totalInStack={Math.min(queuePlayers.length, 4)}
                isNext={index === 0}
              />
            ))}
            
            {queuePlayers.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center opacity-40">
                  <TrendingUp size={32} className="mx-auto mb-2 text-gray-600" />
                  <p className="text-xs text-gray-500">Queue empty</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom info bar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-6 px-6 py-3 rounded-full"
        style={{
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-xs text-gray-300">Sold: {soldPlayers.length}</span>
        </div>
        <div className="w-px h-4 bg-gray-600" />
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-400" />
          <span className="text-xs text-gray-300">Queue: {queuePlayers.length}</span>
        </div>
        <div className="w-px h-4 bg-gray-600" />
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
          <span className="text-xs text-gray-300">Live</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// CENTER CARD (Current Auction Player)
// ============================================================

interface CenterCardProps {
  player: Player;
  currentBidAmount: number;
  leadingTeamName?: string;
  formatCurrency: (amount: number) => string;
  getRoleBadgeColor: (role?: string) => string;
}

const CenterCard: React.FC<CenterCardProps> = ({
  player,
  currentBidAmount,
  leadingTeamName,
  formatCurrency,
  getRoleBadgeColor,
}) => {
  const hasValidImage = isValidImageUrl(player.imageUrl);

  return (
    <div
      className="relative w-72 auction-card-live auction-card-float"
      style={{
        animation: 'auctionScaleIn 500ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards, auctionCardFloat 3s ease-in-out infinite 0.5s',
      }}
    >
      {/* Glow effect behind card */}
      <div 
        className="absolute inset-0 -z-10 rounded-3xl"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(255, 45, 117, 0.4) 0%, transparent 70%)',
          filter: 'blur(30px)',
          transform: 'scale(1.3)',
        }}
      />

      {/* Main card */}
      <div
        className="relative rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, rgba(25, 15, 35, 0.95) 0%, rgba(40, 20, 55, 0.9) 100%)',
          border: '3px solid rgba(255, 45, 117, 0.6)',
          boxShadow: getStatusGlow('LIVE'),
        }}
      >
        {/* NOW badge */}
        <div className="absolute top-4 right-4 z-20">
          <div 
            className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider"
            style={{
              background: 'linear-gradient(135deg, #FF2D75, #FF6B9D)',
              boxShadow: '0 0 20px rgba(255, 45, 117, 0.5)',
            }}
          >
            NOW
          </div>
        </div>

        {/* Player image */}
        <div className="relative h-56 overflow-hidden">
          {hasValidImage ? (
            <img
              src={player.imageUrl}
              alt={player.name}
              className="w-full h-full object-cover object-top"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
              <Users size={64} className="text-gray-600" />
            </div>
          )}
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          
          {/* Role badge */}
          {player.role && (
            <div className="absolute bottom-3 left-3">
              <span className={`px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${getRoleBadgeColor(player.role)} text-white`}>
                {player.role}
              </span>
            </div>
          )}
        </div>

        {/* Player info */}
        <div className="p-5">
          <h3 className="text-xl font-black text-white mb-1 truncate">
            {player.name}
          </h3>
          
          {player.team && (
            <p className="text-sm text-gray-400 mb-4">{player.team}</p>
          )}

          {/* Current bid */}
          <div 
            className="p-4 rounded-xl mb-3"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 45, 117, 0.2), rgba(255, 100, 150, 0.1))',
              border: '1px solid rgba(255, 45, 117, 0.3)',
            }}
          >
            <div className="text-xs text-pink-300/70 uppercase font-bold mb-1">Current Bid</div>
            <div className="text-2xl font-black" style={{ color: '#FF2D75' }}>
              {formatCurrency(currentBidAmount)}
            </div>
            {leadingTeamName && (
              <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                <Award size={10} />
                {leadingTeamName}
              </div>
            )}
          </div>

          {/* Base price */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Base Price</span>
            <span className="text-gray-300 font-bold">{formatCurrency(player.basePrice)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// SOLD CARD (Left Stack)
// ============================================================

interface SoldCardProps {
  player: Player;
  stackIndex: number;
  totalInStack: number;
}

const SoldCard: React.FC<SoldCardProps> = ({ player, stackIndex, totalInStack }) => {
  const hasValidImage = isValidImageUrl(player.imageUrl);
  
  // Calculate position properties
  const offsetY = stackIndex * 12;
  const offsetX = stackIndex * 4;
  const scale = 0.85 - (stackIndex * 0.04);
  const opacity = 0.95 - (stackIndex * 0.12);
  const rotation = -3 - (stackIndex * 0.8);
  const zIndex = totalInStack - stackIndex;

  return (
    <div
      className={`absolute left-0 right-0 ${stackIndex === 0 ? 'auction-card-sold' : ''}`}
      style={{
        transform: `translateY(${offsetY}px) translateX(${offsetX}px) scale(${scale}) rotate(${rotation}deg)`,
        opacity,
        zIndex,
        transition: `all ${DURATIONS.stackShift}ms ${EASING.cardMove}`,
      }}
    >
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, rgba(20, 30, 25, 0.95), rgba(25, 40, 30, 0.9))',
          border: `2px solid ${getStatusBorder('SOLD')}`,
          boxShadow: stackIndex === 0 ? getStatusGlow('SOLD') : '0 4px 20px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* Compact card layout */}
        <div className="flex items-center gap-3 p-3">
          {/* Thumbnail */}
          <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-800">
            {hasValidImage ? (
              <img src={player.imageUrl} alt={player.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Users size={20} className="text-gray-600" />
              </div>
            )}
          </div>
          
          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{player.name}</p>
            <p className="text-xs text-emerald-400 font-bold">
              {player.finalPrice ? `₹${(player.finalPrice / 100000).toFixed(1)}L` : 'Sold'}
            </p>
          </div>

          {/* Sold badge */}
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Shield size={12} className="text-emerald-400" />
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// QUEUE CARD (Right Stack)
// ============================================================

interface QueueCardProps {
  player: Player;
  stackIndex: number;
  totalInStack: number;
  isNext: boolean;
}

const QueueCard: React.FC<QueueCardProps> = ({ player, stackIndex, totalInStack, isNext }) => {
  const hasValidImage = isValidImageUrl(player.imageUrl);
  const isUnsold = player.status === 'UNSOLD';
  
  // Calculate position properties
  const offsetY = stackIndex * 14;
  const offsetX = -(stackIndex * 5);
  const scale = 0.88 - (stackIndex * 0.05);
  const opacity = 0.95 - (stackIndex * 0.15);
  const rotation = 2 + (stackIndex * 0.6);
  const zIndex = totalInStack - stackIndex;

  return (
    <div
      className={`absolute left-0 right-0 ${isUnsold && stackIndex === totalInStack - 1 ? 'auction-card-unsold' : ''}`}
      style={{
        transform: `translateY(${offsetY}px) translateX(${offsetX}px) scale(${scale}) rotate(${rotation}deg)`,
        opacity,
        zIndex,
        transition: `all ${DURATIONS.stackShift}ms ${EASING.cardMove}`,
      }}
    >
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: isUnsold 
            ? 'linear-gradient(145deg, rgba(40, 30, 15, 0.95), rgba(50, 35, 20, 0.9))'
            : 'linear-gradient(145deg, rgba(25, 20, 40, 0.95), rgba(35, 25, 55, 0.9))',
          border: `2px solid ${isUnsold ? getStatusBorder('UNSOLD') : 'rgba(147, 51, 234, 0.4)'}`,
          boxShadow: isNext ? '0 0 25px rgba(147, 51, 234, 0.3)' : '0 4px 20px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* Next badge */}
        {isNext && (
          <div className="absolute top-2 right-2 z-10">
            <span 
              className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase"
              style={{
                background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
              }}
            >
              NEXT
            </span>
          </div>
        )}

        {/* Compact card layout */}
        <div className="flex items-center gap-3 p-3">
          {/* Thumbnail */}
          <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-800">
            {hasValidImage ? (
              <img src={player.imageUrl} alt={player.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Users size={20} className="text-gray-600" />
              </div>
            )}
          </div>
          
          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{player.name}</p>
            <p className="text-xs text-purple-400">
              ₹{(player.basePrice / 100000).toFixed(1)}L
            </p>
          </div>

          {/* Status indicator */}
          <div className={`w-2 h-2 rounded-full ${isUnsold ? 'bg-amber-400 animate-pulse' : 'bg-purple-400'}`} />
        </div>

        {/* Unsold indicator */}
        {isUnsold && (
          <div className="px-3 pb-2">
            <span className="text-[10px] text-amber-400/70 uppercase font-bold">Returns later</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuctionCardStack;
