/**
 * Auction Animation System
 * Premium esports-style card animations for live auction
 * 
 * Three visual zones:
 * - CENTER: Current player being auctioned (large, glowing)
 * - LEFT STACK: Sold players (stacked, green flash)
 * - RIGHT STACK: Queue/Unsold players (waiting queue)
 */

import React from 'react';
import { Player } from '../types';

// ============================================================
// TYPES & INTERFACES
// ============================================================

export type CardZone = 'center' | 'left' | 'right' | 'entering' | 'exiting';
export type CardStatus = 'PENDING' | 'LIVE' | 'SOLD' | 'UNSOLD' | 'AVAILABLE';

export interface CardPosition {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  zIndex: number;
  blur: number;
}

export interface CardState {
  playerId: string;
  zone: CardZone;
  position: CardPosition;
  status: CardStatus;
  stackIndex: number; // Position within its stack
  isAnimating: boolean;
  animationTarget?: CardPosition;
}

export interface AnimationConfig {
  duration: number;
  easing: string;
  delay?: number;
}

// ============================================================
// ANIMATION EASING CURVES (Premium Physics-like)
// ============================================================

export const EASING = {
  // Spring-like smooth curves
  springSmooth: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  springBounce: 'cubic-bezier(0.68, -0.55, 0.27, 1.55)',
  
  // Smooth ease curves
  easeOutQuart: 'cubic-bezier(0.25, 1, 0.5, 1)',
  easeOutExpo: 'cubic-bezier(0.16, 1, 0.3, 1)',
  easeInOutQuart: 'cubic-bezier(0.76, 0, 0.24, 1)',
  
  // Snappy movement
  snappy: 'cubic-bezier(0.4, 0, 0.2, 1)',
  
  // Card specific
  cardMove: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  cardScale: 'cubic-bezier(0.34, 1.2, 0.64, 1)',
} as const;

// ============================================================
// ANIMATION DURATIONS (ms)
// ============================================================

export const DURATIONS = {
  cardEnter: 500,
  cardMove: 600,
  cardSold: 700,
  cardUnsold: 650,
  stackShift: 400,
  glowPulse: 300,
  scaleTransition: 450,
  fadeTransition: 350,
} as const;

// ============================================================
// ZONE POSITIONS (Relative to viewport center)
// ============================================================

export const ZONE_POSITIONS = {
  center: {
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
    opacity: 1,
    zIndex: 100,
    blur: 0,
  },
  left: {
    baseX: -380,
    baseY: 0,
    scale: 0.7,
    rotation: -3,
    opacity: 0.85,
    zIndex: 50,
    blur: 0.5,
    stackOffsetY: 8,
    stackOffsetX: 4,
    maxVisible: 5,
  },
  right: {
    baseX: 380,
    baseY: 0,
    scale: 0.75,
    rotation: 2,
    opacity: 0.9,
    zIndex: 50,
    blur: 0.3,
    stackOffsetY: 12,
    stackOffsetX: -6,
    maxVisible: 4,
  },
} as const;

// ============================================================
// CARD STATE MANAGER
// ============================================================

export class CardStateManager {
  private states: Map<string, CardState> = new Map();
  private soldStack: string[] = [];
  private queueStack: string[] = [];
  private currentPlayerId: string | null = null;

  constructor() {
    this.states = new Map();
    this.soldStack = [];
    this.queueStack = [];
    this.currentPlayerId = null;
  }

  /**
   * Initialize states from player list
   */
  initializeFromPlayers(players: Player[], currentPlayerId?: string | null): void {
    this.states.clear();
    this.soldStack = [];
    this.queueStack = [];
    this.currentPlayerId = currentPlayerId || null;

    players.forEach((player, index) => {
      const status = this.getPlayerStatus(player);
      let zone: CardZone = 'right';
      let stackIndex = 0;

      if (player.id === currentPlayerId) {
        zone = 'center';
      } else if (status === 'SOLD') {
        zone = 'left';
        this.soldStack.push(player.id);
        stackIndex = this.soldStack.length - 1;
      } else {
        zone = 'right';
        this.queueStack.push(player.id);
        stackIndex = this.queueStack.length - 1;
      }

      this.states.set(player.id, {
        playerId: player.id,
        zone,
        position: this.calculatePosition(zone, stackIndex),
        status,
        stackIndex,
        isAnimating: false,
      });
    });
  }

  /**
   * Get player status from player object
   */
  private getPlayerStatus(player: Player): CardStatus {
    if (player.status === 'SOLD') return 'SOLD';
    if (player.status === 'UNSOLD') return 'UNSOLD';
    if (player.status === 'PENDING') return 'PENDING';
    if (player.id === this.currentPlayerId) return 'LIVE';
    return 'AVAILABLE';
  }

  /**
   * Calculate position based on zone and stack index
   */
  calculatePosition(zone: CardZone, stackIndex: number = 0): CardPosition {
    switch (zone) {
      case 'center':
        return { ...ZONE_POSITIONS.center };

      case 'left': {
        const cfg = ZONE_POSITIONS.left;
        const visibleIndex = Math.min(stackIndex, cfg.maxVisible - 1);
        return {
          x: cfg.baseX + (visibleIndex * cfg.stackOffsetX),
          y: cfg.baseY + (visibleIndex * cfg.stackOffsetY),
          scale: cfg.scale - (visibleIndex * 0.03),
          rotation: cfg.rotation - (visibleIndex * 0.5),
          opacity: cfg.opacity - (visibleIndex * 0.1),
          zIndex: cfg.zIndex - visibleIndex,
          blur: cfg.blur + (visibleIndex * 0.2),
        };
      }

      case 'right': {
        const cfg = ZONE_POSITIONS.right;
        const visibleIndex = Math.min(stackIndex, cfg.maxVisible - 1);
        return {
          x: cfg.baseX + (visibleIndex * cfg.stackOffsetX),
          y: cfg.baseY + (visibleIndex * cfg.stackOffsetY),
          scale: cfg.scale - (visibleIndex * 0.04),
          rotation: cfg.rotation + (visibleIndex * 0.7),
          opacity: cfg.opacity - (visibleIndex * 0.12),
          zIndex: cfg.zIndex - visibleIndex,
          blur: cfg.blur + (visibleIndex * 0.15),
        };
      }

      case 'entering':
        return {
          x: 600,
          y: 50,
          scale: 0.5,
          rotation: 8,
          opacity: 0,
          zIndex: 10,
          blur: 2,
        };

      case 'exiting':
        return {
          x: -600,
          y: -50,
          scale: 0.4,
          rotation: -10,
          opacity: 0,
          zIndex: 5,
          blur: 3,
        };

      default:
        return { ...ZONE_POSITIONS.center };
    }
  }

  /**
   * Move player to SOLD (left stack)
   */
  moveToSold(playerId: string): CardState | null {
    const state = this.states.get(playerId);
    if (!state) return null;

    // Remove from queue if present
    this.queueStack = this.queueStack.filter(id => id !== playerId);
    
    // Add to front of sold stack (latest first)
    this.soldStack.unshift(playerId);

    // Update state
    state.zone = 'left';
    state.status = 'SOLD';
    state.stackIndex = 0;
    state.isAnimating = true;
    state.animationTarget = this.calculatePosition('left', 0);

    // Reposition other sold cards
    this.soldStack.forEach((id, index) => {
      const cardState = this.states.get(id);
      if (cardState && id !== playerId) {
        cardState.stackIndex = index;
        cardState.animationTarget = this.calculatePosition('left', index);
        cardState.isAnimating = true;
      }
    });

    return state;
  }

  /**
   * Move player to UNSOLD (end of right queue)
   */
  moveToUnsold(playerId: string): CardState | null {
    const state = this.states.get(playerId);
    if (!state) return null;

    // Add to END of queue (will come again last)
    this.queueStack.push(playerId);

    // Update state
    state.zone = 'right';
    state.status = 'UNSOLD';
    state.stackIndex = this.queueStack.length - 1;
    state.isAnimating = true;
    state.animationTarget = this.calculatePosition('right', state.stackIndex);

    return state;
  }

  /**
   * Move player to CENTER (current auction)
   */
  moveToCenter(playerId: string): CardState | null {
    const state = this.states.get(playerId);
    if (!state) return null;

    // Remove from queue
    this.queueStack = this.queueStack.filter(id => id !== playerId);
    this.currentPlayerId = playerId;

    // Update state
    state.zone = 'center';
    state.status = 'LIVE';
    state.stackIndex = 0;
    state.isAnimating = true;
    state.animationTarget = this.calculatePosition('center', 0);

    // Reposition queue cards
    this.queueStack.forEach((id, index) => {
      const cardState = this.states.get(id);
      if (cardState) {
        cardState.stackIndex = index;
        cardState.animationTarget = this.calculatePosition('right', index);
        cardState.isAnimating = true;
      }
    });

    return state;
  }

  /**
   * Get next player from queue
   */
  getNextInQueue(): string | null {
    return this.queueStack.length > 0 ? this.queueStack[0] : null;
  }

  /**
   * Get all card states
   */
  getAllStates(): CardState[] {
    return Array.from(this.states.values());
  }

  /**
   * Get state for specific player
   */
  getState(playerId: string): CardState | undefined {
    return this.states.get(playerId);
  }

  /**
   * Mark animation complete
   */
  completeAnimation(playerId: string): void {
    const state = this.states.get(playerId);
    if (state) {
      if (state.animationTarget) {
        state.position = state.animationTarget;
        state.animationTarget = undefined;
      }
      state.isAnimating = false;
    }
  }

  /**
   * Get stacks for rendering
   */
  getStacks() {
    return {
      sold: this.soldStack.map(id => this.states.get(id)!).filter(Boolean),
      queue: this.queueStack.map(id => this.states.get(id)!).filter(Boolean),
      current: this.currentPlayerId ? this.states.get(this.currentPlayerId) : null,
    };
  }
}

// ============================================================
// ANIMATION CONTROLLER
// ============================================================

export class AnimationController {
  private animationFrameId: number | null = null;
  private activeAnimations: Map<string, { 
    start: CardPosition; 
    end: CardPosition; 
    startTime: number;
    duration: number;
    onComplete?: () => void;
  }> = new Map();

  /**
   * Animate card from current to target position
   */
  animateCard(
    cardId: string,
    from: CardPosition,
    to: CardPosition,
    duration: number = DURATIONS.cardMove,
    onComplete?: () => void
  ): void {
    this.activeAnimations.set(cardId, {
      start: { ...from },
      end: { ...to },
      startTime: performance.now(),
      duration,
      onComplete,
    });

    if (!this.animationFrameId) {
      this.startAnimationLoop();
    }
  }

  /**
   * Cubic bezier interpolation for smooth curves
   */
  private easeOutQuart(t: number): number {
    return 1 - Math.pow(1 - t, 4);
  }

  /**
   * Spring-like ease with slight overshoot
   */
  private springEase(t: number): number {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 
      : t === 1 ? 1 
      : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }

  /**
   * Interpolate between positions
   */
  private interpolate(from: CardPosition, to: CardPosition, progress: number): CardPosition {
    const ease = this.easeOutQuart(progress);
    const springProgress = this.springEase(Math.min(progress * 1.1, 1));

    return {
      x: from.x + (to.x - from.x) * ease,
      y: from.y + (to.y - from.y) * ease,
      scale: from.scale + (to.scale - from.scale) * springProgress,
      rotation: from.rotation + (to.rotation - from.rotation) * ease,
      opacity: from.opacity + (to.opacity - from.opacity) * ease,
      zIndex: progress > 0.5 ? to.zIndex : from.zIndex,
      blur: from.blur + (to.blur - from.blur) * ease,
    };
  }

  /**
   * Start animation loop
   */
  private startAnimationLoop(): void {
    const animate = (currentTime: number) => {
      const toRemove: string[] = [];

      this.activeAnimations.forEach((anim, cardId) => {
        const elapsed = currentTime - anim.startTime;
        const progress = Math.min(elapsed / anim.duration, 1);

        if (progress >= 1) {
          toRemove.push(cardId);
          if (anim.onComplete) anim.onComplete();
        }
      });

      toRemove.forEach(id => this.activeAnimations.delete(id));

      if (this.activeAnimations.size > 0) {
        this.animationFrameId = requestAnimationFrame(animate);
      } else {
        this.animationFrameId = null;
      }
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  /**
   * Get current interpolated position for a card
   */
  getCurrentPosition(cardId: string, basePosition: CardPosition): CardPosition {
    const anim = this.activeAnimations.get(cardId);
    if (!anim) return basePosition;

    const elapsed = performance.now() - anim.startTime;
    const progress = Math.min(elapsed / anim.duration, 1);
    return this.interpolate(anim.start, anim.end, progress);
  }

  /**
   * Check if card is animating
   */
  isAnimating(cardId: string): boolean {
    return this.activeAnimations.has(cardId);
  }

  /**
   * Cancel all animations
   */
  cancelAll(): void {
    this.activeAnimations.clear();
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}

// ============================================================
// CSS ANIMATION KEYFRAMES (inject into document)
// ============================================================

export const ANIMATION_STYLES = `
  @keyframes auctionNeonPulse {
    0%, 100% { 
      box-shadow: 
        0 0 20px rgba(255, 45, 117, 0.5),
        0 0 40px rgba(255, 45, 117, 0.3),
        0 0 60px rgba(255, 45, 117, 0.2),
        inset 0 0 20px rgba(255, 45, 117, 0.1);
    }
    50% { 
      box-shadow: 
        0 0 30px rgba(255, 45, 117, 0.7),
        0 0 60px rgba(255, 45, 117, 0.4),
        0 0 100px rgba(255, 45, 117, 0.3),
        inset 0 0 30px rgba(255, 45, 117, 0.15);
    }
  }

  @keyframes auctionSoldFlash {
    0% { 
      box-shadow: 0 0 0 rgba(16, 185, 129, 0);
      border-color: rgba(16, 185, 129, 0);
    }
    30% { 
      box-shadow: 
        0 0 40px rgba(16, 185, 129, 0.8),
        0 0 80px rgba(16, 185, 129, 0.5);
      border-color: rgba(16, 185, 129, 1);
    }
    100% { 
      box-shadow: 0 0 15px rgba(16, 185, 129, 0.3);
      border-color: rgba(16, 185, 129, 0.5);
    }
  }

  @keyframes auctionUnsoldPulse {
    0%, 100% { 
      box-shadow: 0 0 15px rgba(245, 158, 11, 0.4);
      border-color: rgba(245, 158, 11, 0.6);
    }
    50% { 
      box-shadow: 0 0 30px rgba(245, 158, 11, 0.7);
      border-color: rgba(245, 158, 11, 1);
    }
  }

  @keyframes auctionCardEnter {
    0% {
      opacity: 0;
      transform: translateX(100px) scale(0.7) rotate(10deg);
    }
    100% {
      opacity: 1;
      transform: translateX(0) scale(1) rotate(0deg);
    }
  }

  @keyframes auctionCardFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  }

  @keyframes auctionParticleDust {
    0% {
      opacity: 1;
      transform: translate(0, 0) scale(1);
    }
    100% {
      opacity: 0;
      transform: translate(var(--dust-x, 20px), var(--dust-y, -30px)) scale(0);
    }
  }

  @keyframes auctionGradientShift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  @keyframes auctionScaleIn {
    0% {
      opacity: 0;
      transform: scale(0.8);
    }
    60% {
      transform: scale(1.05);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes auctionSlideLeft {
    0% {
      transform: translateX(0) scale(1);
    }
    40% {
      transform: translateX(-50px) scale(0.9) rotate(-2deg);
    }
    100% {
      transform: translateX(-380px) scale(0.7) rotate(-3deg);
    }
  }

  @keyframes auctionSlideRight {
    0% {
      transform: translateX(0) scale(1);
    }
    40% {
      transform: translateX(50px) scale(0.9) rotate(2deg);
    }
    100% {
      transform: translateX(380px) scale(0.75) rotate(2deg);
    }
  }

  .auction-card-live {
    animation: auctionNeonPulse 2s ease-in-out infinite;
  }

  .auction-card-sold {
    animation: auctionSoldFlash 500ms ease-out forwards;
  }

  .auction-card-unsold {
    animation: auctionUnsoldPulse 1s ease-in-out 3;
  }

  .auction-card-enter {
    animation: auctionCardEnter 600ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }

  .auction-card-float {
    animation: auctionCardFloat 3s ease-in-out infinite;
  }

  .auction-gradient-bg {
    background: linear-gradient(
      135deg,
      rgba(20, 10, 30, 1) 0%,
      rgba(40, 20, 50, 1) 25%,
      rgba(30, 15, 45, 1) 50%,
      rgba(25, 12, 40, 1) 75%,
      rgba(20, 10, 30, 1) 100%
    );
    background-size: 400% 400%;
    animation: auctionGradientShift 15s ease infinite;
  }
`;

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Generate CSS transform string from position
 */
export function positionToTransform(pos: CardPosition): string {
  return `translate(${pos.x}px, ${pos.y}px) scale(${pos.scale}) rotate(${pos.rotation}deg)`;
}

/**
 * Generate CSS style object from position
 */
export function positionToStyle(pos: CardPosition): React.CSSProperties {
  return {
    transform: positionToTransform(pos),
    opacity: pos.opacity,
    zIndex: pos.zIndex,
    filter: pos.blur > 0 ? `blur(${pos.blur}px)` : undefined,
    transition: `transform ${DURATIONS.cardMove}ms ${EASING.cardMove}, opacity ${DURATIONS.fadeTransition}ms ease`,
  };
}

/**
 * Get glow style based on status
 */
export function getStatusGlow(status: CardStatus): string {
  switch (status) {
    case 'LIVE':
      return '0 0 30px rgba(255, 45, 117, 0.6), 0 0 60px rgba(255, 45, 117, 0.3)';
    case 'SOLD':
      return '0 0 20px rgba(16, 185, 129, 0.5), 0 0 40px rgba(16, 185, 129, 0.3)';
    case 'UNSOLD':
      return '0 0 20px rgba(245, 158, 11, 0.5), 0 0 40px rgba(245, 158, 11, 0.3)';
    case 'PENDING':
      return '0 0 15px rgba(147, 51, 234, 0.4), 0 0 30px rgba(147, 51, 234, 0.2)';
    default:
      return '0 0 10px rgba(255, 255, 255, 0.1)';
  }
}

/**
 * Get border color based on status
 */
export function getStatusBorder(status: CardStatus): string {
  switch (status) {
    case 'LIVE':
      return 'rgba(255, 45, 117, 0.8)';
    case 'SOLD':
      return 'rgba(16, 185, 129, 0.7)';
    case 'UNSOLD':
      return 'rgba(245, 158, 11, 0.7)';
    case 'PENDING':
      return 'rgba(147, 51, 234, 0.5)';
    default:
      return 'rgba(255, 255, 255, 0.2)';
  }
}

// Export singleton instances
export const cardStateManager = new CardStateManager();
export const animationController = new AnimationController();
