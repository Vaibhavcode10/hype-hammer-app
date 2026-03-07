import React, { useState, useMemo } from 'react';
import { 
  Timer, Users, Gavel, Mic, MicOff, Play, Pause, Square, 
  TrendingUp, DollarSign, Clock, AlertCircle, CheckCircle2, ArrowLeft, XCircle,
  Zap, Shield, Award, Activity, Radio, Crown, Trophy, Target, Calendar, Hash, AlertTriangle,
  Wallet, UserCheck, PieChart, AlertOctagon, Settings
} from 'lucide-react';
import { isValidImageUrl } from '../../services/imageUrlValidator';
import { 
  LiveAuctionState, 
  LiveAuctionStatus, 
  UserRole, 
  Player, 
  Team,
  LiveRoomPermissions,
  BidHistoryItem,
  BidConfig,
  CurrencyUnit
} from '../../types';
import { MatchConfig, generateBidButtons, updateBidConfig, updateCurrencyUnit, DEFAULT_BID_INCREMENTS, formatBidIncrementLabel, DEFAULT_CURRENCY_UNIT } from '../../services/matchConfigService';
import { formatWithUnit, formatBidButtonLabel } from '../../services/currencyUtils';
import { 
  calculateTeamPurseInsights, 
  validateBidAgainstPurse, 
  formatCurrencyShort, 
  getWarningLevel,
  TeamPurseInsights 
} from '../../services/purseIntelligenceService';

interface AuctioneerLiveRoomProps {
  auctionState: LiveAuctionState | null;
  currentPlayer: Player | null;
  allPlayers: Player[];
  teams: Team[];
  userId: string;
  userRole: UserRole;
  remainingSeconds: number;
  auctioneerMicOn: boolean;
  permissions: LiveRoomPermissions;
  isInitialLoading?: boolean;
  onStartAuction?: () => void;
  onPauseAuction?: () => void;
  onResumeAuction?: () => void;
  onEndAuction?: () => void;
  onToggleMic?: () => void;
  onClose?: () => void;
  onCloseBidding?: (sold: boolean) => void;
  onMarkUnsold?: () => void;
  onPlaceBid?: (teamId: string, incrementAmount: number) => void;
  onDirectSell?: (teamId: string) => void;
  onSwitchPlayer?: (playerId: string) => void;
  currentMatch?: { id: string } | null;
  matchConfig?: MatchConfig | null;
  bidConfig?: BidConfig | null;
  onBidConfigUpdate?: (config: BidConfig) => void;
  currencyUnit?: CurrencyUnit;
  onCurrencyUnitChange?: (unit: CurrencyUnit) => void;
}

/**
 * AuctioneerLiveRoom - Game HUD / Broadcast Hybrid Layout
 * FIFA-style player card with esports tournament screen aesthetics
 */
export const AuctioneerLiveRoom: React.FC<AuctioneerLiveRoomProps> = ({
  auctionState,
  currentPlayer,
  allPlayers,
  teams,
  userId,
  userRole,
  remainingSeconds,
  auctioneerMicOn,
  permissions,
  isInitialLoading = false,
  onStartAuction,
  onPauseAuction,
  onResumeAuction,
  onEndAuction,
  onToggleMic,
  onClose,
  onCloseBidding,
  onMarkUnsold,
  onPlaceBid,
  onDirectSell,
  onSwitchPlayer,
  currentMatch,
  matchConfig,
  bidConfig,
  onBidConfigUpdate,
  currencyUnit: currencyUnitProp = DEFAULT_CURRENCY_UNIT,
  onCurrencyUnitChange
}) => {
  // Use currency unit from props
  const currencyUnit: CurrencyUnit = currencyUnitProp;
  
  // Custom bid state per team
  const [customBidAmounts, setCustomBidAmounts] = useState<Record<string, string>>({});
  const [switchPlayerModal, setSwitchPlayerModal] = useState<{ show: boolean; player: Player | null }>({ show: false, player: null });
  
  // Settings panel state
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  
  // Bid config editing state (Recovery Mode)
  const [showBidConfigModal, setShowBidConfigModal] = useState(false);
  const [editingIncrements, setEditingIncrements] = useState<string[]>(['', '', '', '']);
  const [editingCustom, setEditingCustom] = useState('');
  const [savingBidConfig, setSavingBidConfig] = useState(false);
  const [bidConfigMessage, setBidConfigMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Purse warning modal state
  const [purseWarningModal, setPurseWarningModal] = useState<{
    show: boolean;
    teamId: string | null;
    teamName: string;
    incrementAmount: number;
    warningMessage: string;
    safeMaxBid: number;
    newTotalBid: number;
  }>({
    show: false,
    teamId: null,
    teamName: '',
    incrementAmount: 0,
    warningMessage: '',
    safeMaxBid: 0,
    newTotalBid: 0
  });

  const handleCustomBidChange = (teamId: string, value: string) => {
    // Allow only numbers and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setCustomBidAmounts(prev => ({ ...prev, [teamId]: value }));
    }
  };

  const handleCustomBidSubmit = (teamId: string, remainingBudget: number, currentBid: number) => {
    const bidValue = parseFloat(customBidAmounts[teamId] || '0');
    if (!bidValue || bidValue <= 0) {
      alert('Please enter a valid increment amount (e.g., 1 for +₹1L, 5 for +₹5L)');
      return;
    }

    // Convert lakhs to actual increment amount (e.g., 1 = ₹1,00,000 increment)
    const incrementAmount = bidValue * 100000;
    
    // Calculate new total bid
    const newTotalBid = currentBid + incrementAmount;
    
    // Check if team can afford the new total bid
    if (newTotalBid > remainingBudget) {
      alert(`Team cannot afford ₹${(newTotalBid / 100000).toFixed(1)}L (₹${newTotalBid.toLocaleString()})\nCurrent Bid: ₹${(currentBid / 100000).toFixed(1)}L\nIncrement: +₹${bidValue}L\nRemaining Budget: ₹${(remainingBudget / 100000).toFixed(1)}L`);
      return;
    }

    console.log(`✅ Placing custom bid increment: +₹${bidValue}L → New bid: ₹${(newTotalBid / 100000).toFixed(1)}L (₹${newTotalBid.toLocaleString()}) for team ${teamId}`);
    onPlaceBid?.(teamId, incrementAmount);
    setCustomBidAmounts(prev => ({ ...prev, [teamId]: '' }));
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // BID CONFIG RECOVERY MODE HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  /**
   * Open bid config edit modal (Recovery Mode)
   * Can be used even when auction is ONGOING
   */
  const handleOpenBidConfigEdit = () => {
    // Pre-populate with current values
    if (bidConfig && bidConfig.increments) {
      const values = bidConfig.increments.map(v => {
        if (v >= 100000) return String(v / 100000);
        if (v >= 1000) return String(v / 1000) + 'K';
        return String(v);
      });
      while (values.length < 4) values.push('');
      setEditingIncrements(values);
      setEditingCustom(bidConfig.custom ? String(bidConfig.custom / 100000) : '');
    } else {
      setEditingIncrements(DEFAULT_BID_INCREMENTS.map(v => String(v / 100000)));
      setEditingCustom('');
    }
    setBidConfigMessage(null);
    setShowBidConfigModal(true);
  };
  
  /**
   * Parse input value to rupees based on currencyUnit
   * K → 1000, L → 100000, Cr → 10000000
   */
  const parseIncrementInput = (value: string): number => {
    if (!value || value.trim() === '') return 0;
    const cleaned = value.toString().trim().toUpperCase();
    
    // Handle explicit K suffix
    if (cleaned.endsWith('K')) {
      const num = parseFloat(cleaned.slice(0, -1));
      return isNaN(num) ? 0 : num * 1000;
    }
    // Handle explicit L suffix
    if (cleaned.endsWith('L')) {
      const num = parseFloat(cleaned.slice(0, -1));
      return isNaN(num) ? 0 : num * 100000;
    }
    // Handle explicit CR suffix
    if (cleaned.endsWith('CR')) {
      const num = parseFloat(cleaned.slice(0, -2));
      return isNaN(num) ? 0 : num * 10000000;
    }
    
    // No suffix: use currencyUnit to determine multiplier
    const num = parseFloat(cleaned);
    if (isNaN(num)) return 0;
    
    const multiplier = currencyUnit === 'K' ? 1000 : currencyUnit === 'Cr' ? 10000000 : 100000;
    return num * multiplier;
  };
  
  /**
   * Save bid config from recovery mode
   */
  const handleSaveBidConfigFromLiveRoom = async () => {
    if (!currentMatch?.id) return;
    
    setSavingBidConfig(true);
    setBidConfigMessage(null);
    
    try {
      const increments = editingIncrements
        .map(v => parseIncrementInput(v))
        .filter(v => v > 0);
      
      if (increments.length === 0) {
        setBidConfigMessage({ type: 'error', text: 'At least one increment is required' });
        setSavingBidConfig(false);
        return;
      }
      
      const sortedIncrements = [...increments].sort((a, b) => a - b);
      const uniqueIncrements = [...new Set(sortedIncrements)];
      
      if (uniqueIncrements.length !== increments.length) {
        setBidConfigMessage({ type: 'error', text: 'Duplicate values not allowed' });
        setSavingBidConfig(false);
        return;
      }
      
      const custom = parseIncrementInput(editingCustom);
      
      // Save with fromLiveRoom = true (bypasses lock)
      const result = await updateBidConfig(
        currentMatch.id,
        {
          increments: sortedIncrements,
          custom: custom > 0 ? custom : null, // Use null, not undefined (Firestore rejects undefined)
        },
        userId,
        true // FROM LIVE ROOM - bypasses lock!
      );
      
      if (result.success) {
        setBidConfigMessage({ type: 'success', text: 'Bid increments updated!' });
        // Notify parent to refresh bidConfig
        if (onBidConfigUpdate) {
          onBidConfigUpdate({
            increments: sortedIncrements,
            custom: custom > 0 ? custom : null, // Use null, not undefined
            isLocked: true,
            updatedAt: new Date().toISOString(),
            updatedBy: userId,
          });
        }
        setTimeout(() => {
          setShowBidConfigModal(false);
          setBidConfigMessage(null);
        }, 1500);
      } else {
        setBidConfigMessage({ type: 'error', text: result.message || 'Failed to save' });
      }
    } catch (error) {
      console.error('[LiveRoom] Error saving bid config:', error);
      setBidConfigMessage({ type: 'error', text: String(error) });
    } finally {
      setSavingBidConfig(false);
    }
  };

  /**
   * CRITICAL GUARD: Filter to only APPROVED players for auction display
   * A declined or pending player must NEVER appear in the Live Room.
   * This is defense-in-depth - LiveAuctionPage should already pass only approved players.
   * 
   * STRICT: Only count players with approvalStatus === 'accepted'
   * This must match the Players page logic exactly.
   */
  const approvedPlayersOnly = useMemo(() => {
    const approved = allPlayers.filter(p => p.approvalStatus === 'accepted');
    console.log('📊 AuctioneerLiveRoom: Approved players:', approved.length, '/', allPlayers.length,
      'All players:', allPlayers.map(p => ({ name: p.name, status: p.approvalStatus })));
    return approved;
  }, [allPlayers]);

  /**
   * CRITICAL GUARD: Filter to only APPROVED teams for auction display
   * A declined or pending team must NEVER appear in the Live Room.
   * This is defense-in-depth - LiveAuctionPage should already pass only approved teams.
   * 
   * STRICT: Only count teams with approvalStatus === 'accepted'
   * This must match the Teams page logic exactly.
   */
  const approvedTeamsOnly = useMemo(() => {
    const approved = teams.filter(t => t.approvalStatus === 'accepted');
    console.log('📊 AuctioneerLiveRoom: Approved teams:', approved.length, '/', teams.length,
      'All teams:', teams.map(t => ({ name: t.name, status: t.approvalStatus })));
    return approved;
  }, [teams]);

  const handlePlayerCardClick = (player: Player) => {
    // Don't allow switching to the same player
    if (currentPlayer && player.id === currentPlayer.id) {
      return;
    }
    
    // Only allow switching if there's an active player
    if (currentPlayer && auctionState?.biddingActive) {
      setSwitchPlayerModal({ show: true, player });
    }
  };

  const confirmPlayerSwitch = () => {
    if (switchPlayerModal.player && onSwitchPlayer) {
      onSwitchPlayer(switchPlayerModal.player.id);
      setSwitchPlayerModal({ show: false, player: null });
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Currency-unit-aware formatting
  const formatBudget = (amount: number): string => formatWithUnit(amount, currencyUnit);
  const formatCurrency = (amount: number): string => formatWithUnit(amount, currencyUnit);
  
  // Generate bid button labels with current currency unit
  const bidButtonsWithLabels = useMemo(() => {
    const buttons = generateBidButtons(bidConfig || null);
    return buttons.map(btn => ({
      ...btn,
      label: formatBidButtonLabel(btn.amount, currencyUnit)
    }));
  }, [bidConfig, currencyUnit]);

  // Calculate stats - CRITICAL: Use approvedPlayersOnly to exclude declined players
  const remainingPlayers = approvedPlayersOnly.filter(p => p.status !== 'SOLD').length;
  const soldPlayers = approvedPlayersOnly.filter(p => p.status === 'SOLD').length;
  const currentBid = auctionState?.currentBid || auctionState?.currentBidAmount || currentPlayer?.basePrice || 0;
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // AUCTION END STATE CALCULATIONS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  // All players processed = no AVAILABLE/PENDING players left (all are either SOLD or UNSOLD)
  // AND auction must be in ENDED status OR actually have processed players
  // CRITICAL FIX: Include PENDING status - players can have either before auction
  const availablePlayers = approvedPlayersOnly.filter(p => p.status === 'AVAILABLE' || p.status === 'PENDING' || !p.status);
  const unsoldPlayers = approvedPlayersOnly.filter(p => p.status === 'UNSOLD');
  const soldPlayersCount = approvedPlayersOnly.filter(p => p.status === 'SOLD').length;
  const hasProcessedPlayers = soldPlayersCount > 0 || unsoldPlayers.length > 0;
  // CRITICAL FIX: Only show auction complete if:
  // 1. Auction status is ENDED, OR
  // 2. No available players AND we've actually processed some players (not just before auction starts)
  const allPlayersProcessed = (
    (auctionState?.status === LiveAuctionStatus.ENDED) ||
    (availablePlayers.length === 0 && !currentPlayer && hasProcessedPlayers)
  );
  
  // CRITICAL: Get max squad size from match config (single source of truth)
  const maxSquadFromConfig = matchConfig?.maxSquad || matchConfig?.squadSize?.max || 15;
  
  // Calculate team fill status - CRITICAL: Use approvedTeamsOnly and matchConfig
  const teamsWithSlotInfo = useMemo(() => {
    return approvedTeamsOnly.map(team => {
      const currentSquadSize = team.players?.length || team.playerIds?.length || 0;
      // CRITICAL: Use matchConfig.maxSquad as single source of truth
      const maxSize = maxSquadFromConfig || team.maxSquadSize || team.squadSize || 11;
      const remainingSlots = Math.max(0, maxSize - currentSquadSize);
      const isFull = currentSquadSize >= maxSize;
      return { ...team, currentSquadSize, maxSize, remainingSlots, isFull };
    });
  }, [approvedTeamsOnly, maxSquadFromConfig]);
  
  const allTeamsFull = teamsWithSlotInfo.every(t => t.isFull);
  const filledTeamsCount = teamsWithSlotInfo.filter(t => t.isFull).length;
  const teamsWithUnfilledSlots = teamsWithSlotInfo.filter(t => !t.isFull);
  const totalUnfilledSlots = teamsWithUnfilledSlots.reduce((sum, t) => sum + t.remainingSlots, 0);
  
  // Warning conditions:
  // 1. All players processed but teams have unfilled slots
  const showTeamsUnfilledWarning = allPlayersProcessed && !allTeamsFull && teamsWithUnfilledSlots.length > 0;
  
  // 2. All teams full but players are still remaining
  const showPlayersRemainingWarning = allTeamsFull && (availablePlayers.length > 0 || unsoldPlayers.length > 0);
  
  // Enable End Auction button when either warning condition is met OR all is complete
  const canEndAuction = allPlayersProcessed || allTeamsFull;
  
  // Calculate actual remaining budget for each team - memoized for performance
  // CRITICAL: Use approvedTeamsOnly to exclude pending/declined teams
  const teamsWithRemainingBudget = useMemo(() => {
    return approvedTeamsOnly.map(team => {
      // If remainingBudget is explicitly set and valid, use it
      if (team.remainingBudget !== undefined && team.remainingBudget !== null && team.remainingBudget > 0) {
        return team;
      }
      
      // Otherwise calculate from initial budget minus player costs
      const initialBudget = team.budget || 0;
      const soldPlayersForTeam = approvedPlayersOnly.filter(p => p.status === 'SOLD' && p.buyingTeamId === team.id);
      const totalSpent = soldPlayersForTeam.reduce((sum, p) => sum + (p.soldPrice || 0), 0);
      const calculatedRemaining = initialBudget - totalSpent;
      
      console.log(`💰 Budget calc for ${team.name}: initial=${initialBudget/100000}L, spent=${totalSpent/100000}L (${soldPlayersForTeam.length} players), remaining=${calculatedRemaining/100000}L`);
      
      return {
        ...team,
        remainingBudget: Math.max(0, calculatedRemaining)
      };
    });
  }, [approvedTeamsOnly, approvedPlayersOnly]);
  
  const leadingTeam = auctionState?.leadingTeamId 
    ? teamsWithRemainingBudget.find(t => t.id === auctionState.leadingTeamId)
    : null;
  
  const maxBudget = Math.max(...teamsWithRemainingBudget.map(t => t.remainingBudget || 0));

  // Calculate purse insights for leading team
  const leadingTeamInsights = useMemo(() => {
    if (!leadingTeam || !matchConfig) return null;
    return calculateTeamPurseInsights(leadingTeam, allPlayers, matchConfig);
  }, [leadingTeam, allPlayers, matchConfig]);

  // Handle bid - directly place bid without purse warning popup
  // Purse validation is still done server-side; this just removes the client-side warning modal
  const handleBidWithPurseCheck = (teamId: string, incrementAmount: number) => {
    // Place bid directly without showing purse warning modal
    onPlaceBid?.(teamId, incrementAmount);
  };

  // Confirm bid despite warning
  const confirmBidDespiteWarning = () => {
    if (purseWarningModal.teamId) {
      onPlaceBid?.(purseWarningModal.teamId, purseWarningModal.incrementAmount);
    }
    setPurseWarningModal({ show: false, teamId: null, teamName: '', incrementAmount: 0, warningMessage: '', safeMaxBid: 0, newTotalBid: 0 });
  };

  // Cancel bid
  const cancelBidWarning = () => {
    setPurseWarningModal({ show: false, teamId: null, teamName: '', incrementAmount: 0, warningMessage: '', safeMaxBid: 0, newTotalBid: 0 });
  };

  // Calculate dynamic card width based on total players to fit in screen
  // CRITICAL: Use approvedPlayersOnly
  const totalBottomPlayers = approvedPlayersOnly.filter(p => p.status === 'UNSOLD' || p.status === 'AVAILABLE' || p.status === 'PENDING' || !p.status).length;
  const calculateCardWidth = () => {
    if (totalBottomPlayers === 0) return 140;
    // Return fixed size for visibility
    return 140; // Optimized card width
  };

  // Ref for scrolling player cards
  const playerCardsRef = React.useRef<HTMLDivElement>(null);
  
  const scrollPlayerCards = (direction: 'left' | 'right') => {
    if (playerCardsRef.current) {
      const scrollAmount = 300;
      playerCardsRef.current.scrollBy({
        left: direction === 'right' ? scrollAmount : -scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="w-full h-screen overflow-hidden relative bg-black">
      {/* Premium Dark Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-black to-gray-900">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-pink-900/5 via-transparent to-transparent"></div>
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)',
        }}></div>
      </div>

      {/* Back Button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-50 flex items-center gap-2 px-3 py-1.5 
                     bg-black/90 backdrop-blur-sm border border-red-500/40 rounded
                     text-red-400 hover:text-red-300 hover:border-red-400/60
                     transition-all duration-200 text-sm font-semibold
                     shadow-[0_0_12px_rgba(239,68,68,0.15)]"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {/* INITIAL LOADING OVERLAY - Shown until Firebase confirms auction state */}
      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {isInitialLoading && (
        <div className="absolute inset-0 z-[150] flex items-center justify-center bg-black/95 backdrop-blur-md">
          <div className="text-center">
            {/* Glowing Spinner Ring */}
            <div className="relative w-24 h-24 mx-auto mb-8">
              {/* Outer glow ring */}
              <div className="absolute inset-0 rounded-full border-4 border-pink-500/20 animate-ping" style={{ animationDuration: '2s' }} />
              
              {/* Spinning gradient ring */}
              <div 
                className="absolute inset-0 rounded-full animate-spin"
                style={{
                  background: 'conic-gradient(from 0deg, rgba(236, 72, 153, 0) 0%, rgba(236, 72, 153, 0.8) 50%, rgba(236, 72, 153, 0) 100%)',
                  animationDuration: '1.5s',
                  mask: 'radial-gradient(farthest-side, transparent calc(100% - 6px), white calc(100% - 6px))',
                  WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 6px), white calc(100% - 6px))'
                }}
              />
              
              {/* Center icon */}
              <div className="absolute inset-4 rounded-full bg-black/80 flex items-center justify-center">
                <Gavel size={32} className="text-pink-400" style={{ filter: 'drop-shadow(0 0 10px rgba(236, 72, 153, 0.8))' }} />
              </div>
            </div>
            
            <h3 className="text-2xl font-black text-white uppercase tracking-wider mb-2"
                style={{ textShadow: '0 0 20px rgba(236, 72, 153, 0.5)' }}>
              Loading Auction Room
            </h3>
            <p className="text-pink-300/60 text-sm">Connecting to live auction...</p>
            
            {/* Shimmer bar */}
            <div className="w-48 h-1 mx-auto mt-6 rounded-full bg-gray-800 overflow-hidden">
              <div 
                className="h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-pink-500 to-transparent"
                style={{ animation: 'shimmer 1.5s ease-in-out infinite' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {/* AUCTION ENDED OVERLAY - Shown when auction status is ENDED */}
      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {auctionState?.status === LiveAuctionStatus.ENDED && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md">
          <div className="text-center p-16 rounded-3xl border-2 border-red-500/30 max-w-2xl mx-4" style={{
            background: 'linear-gradient(135deg, rgba(20, 5, 15, 0.98), rgba(30, 8, 20, 0.98))',
            boxShadow: '0 0 80px rgba(239, 68, 68, 0.3), inset 0 0 40px rgba(239, 68, 68, 0.05)'
          }}>
            <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-gradient-to-br from-red-500/30 to-red-600/30 flex items-center justify-center border-2 border-red-500/40">
              <Square size={48} className="text-red-400" />
            </div>
            
            <h2 className="text-5xl font-black text-white mb-4 tracking-wide uppercase">
              LIVE AUCTION ENDED
            </h2>
            <p className="text-red-300/70 text-xl mb-10">
              The auction has been officially closed. No further bidding is possible.
            </p>
            
            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-6 mb-10">
              <div 
                className="p-6 rounded-xl"
                style={{
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.3)'
                }}
              >
                <div className="text-4xl font-black text-green-400 mb-2">
                  {approvedPlayersOnly.filter(p => p.status === 'SOLD').length}
                </div>
                <div className="text-sm text-gray-400 uppercase tracking-wider">Players Sold</div>
              </div>
              <div 
                className="p-6 rounded-xl"
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)'
                }}
              >
                <div className="text-4xl font-black text-red-400 mb-2">
                  {approvedPlayersOnly.filter(p => p.status === 'UNSOLD').length}
                </div>
                <div className="text-sm text-gray-400 uppercase tracking-wider">Unsold</div>
              </div>
              <div 
                className="p-6 rounded-xl"
                style={{
                  background: 'rgba(147, 51, 234, 0.1)',
                  border: '1px solid rgba(147, 51, 234, 0.3)'
                }}
              >
                <div className="text-4xl font-black text-purple-400 mb-2">
                  {approvedTeamsOnly.filter(t => (t.players?.length || t.playerIds?.length || 0) >= maxSquadFromConfig).length}/{approvedTeamsOnly.length}
                </div>
                <div className="text-sm text-gray-400 uppercase tracking-wider">Teams Filled</div>
              </div>
            </div>
            
            {onClose && (
              <button
                onClick={onClose}
                className="px-10 py-4 rounded-xl text-white font-bold tracking-wider flex items-center gap-3 mx-auto transition-all hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.8), rgba(220, 38, 38, 0.8))',
                  boxShadow: '0 4px 20px rgba(239, 68, 68, 0.4)',
                  border: '1px solid rgba(239, 68, 68, 0.5)'
                }}
              >
                <ArrowLeft size={20} />
                Back to Dashboard
              </button>
            )}
          </div>
        </div>
      )}

      <div className="relative z-10 h-full flex flex-col">
        
        {/* 🥇 1️⃣ TOP HEADER BAR - Full Width Tournament Banner */}
        <div className="flex items-center justify-between px-6 py-3 
                        bg-gradient-to-r from-black/95 via-black/90 to-black/95 backdrop-blur-sm
                        border-b border-red-500/30 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
          
          {/* Left: Auction Branding */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-red-600/90 rounded border border-red-400/50 
                            shadow-[0_0_15px_rgba(239,68,68,0.4)]">
              <Radio size={14} className="animate-pulse" />
              <span className="text-white text-xs font-bold tracking-wider">LIVE</span>
            </div>
            <div>
              <div className="text-red-400 font-black text-lg tracking-wider uppercase 
                              drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]">
                IPL Player Auction 2026
              </div>
              <div className="text-gray-500 text-xs font-semibold tracking-wide">
                Premium Player Bidding
              </div>
            </div>
          </div>

          {/* CENTER: Diagonal Separating Line */}
          <div className="relative mx-6 h-12 flex items-center">
            <div 
              className="absolute"
              style={{
                width: '2px',
                height: '56px',
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.3) 0%, rgba(239, 68, 68, 0.6) 50%, rgba(239, 68, 68, 0.3) 100%)',
                transform: 'skewX(-20deg)',
                boxShadow: '0 0 12px rgba(239, 68, 68, 0.5)',
              }}
            />
          </div>

          {/* Right: Auction Statistics - CRITICAL: Use approvedPlayersOnly */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-gray-400 text-[11px] font-semibold uppercase tracking-wider mb-1">
                Total Players
              </div>
              <div className="text-red-400 font-black text-xl tabular-nums">
                {approvedPlayersOnly.length}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-gray-400 text-[11px] font-semibold uppercase tracking-wider mb-1">
                Sold Players
              </div>
              <div className="text-red-400 font-black text-xl tabular-nums">
                {approvedPlayersOnly.filter(p => p.status === 'SOLD').length}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-gray-400 text-[11px] font-semibold uppercase tracking-wider mb-1">
                Unsold Players
              </div>
              <div className="text-red-400 font-black text-xl tabular-nums">
                {approvedPlayersOnly.filter(p => p.status === 'UNSOLD').length}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-gray-400 text-[11px] font-semibold uppercase tracking-wider mb-1">
                Filled Teams
              </div>
              <div className="text-red-400 font-black text-xl tabular-nums">
                {approvedTeamsOnly.filter(t => (t.players?.length || t.playerIds?.length || 0) >= maxSquadFromConfig).length}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-gray-400 text-[11px] font-semibold uppercase tracking-wider mb-1">
                Total Teams
              </div>
              <div className="text-red-400 font-black text-xl tabular-nums">
                {approvedTeamsOnly.length}
              </div>
            </div>
            
            {/* Settings Icon - Opens Settings Panel */}
            <div className="relative">
              <button
                onClick={() => {
                  console.log('⚙️ Settings button clicked, current state:', showSettingsPanel);
                  setShowSettingsPanel(!showSettingsPanel);
                }}
                className={`ml-2 p-2.5 rounded-lg border transition-all group relative
                           ${showSettingsPanel 
                             ? 'bg-yellow-500/30 border-yellow-500/60 text-yellow-400' 
                             : 'bg-gray-800/80 border-gray-700/50 hover:bg-yellow-500/20 hover:border-yellow-500/50'}`}
                title="Auction Settings"
              >
                <Settings size={18} className={`transition-colors ${showSettingsPanel ? 'text-yellow-400' : 'text-gray-400 group-hover:text-yellow-400'}`} />
              </button>
            </div>
          </div>
        </div>
        
        {/* Settings Panel - Rendered outside header to avoid overflow clipping */}
        {showSettingsPanel && (
          <>
            {/* Backdrop to close panel */}
            <div 
              className="fixed inset-0 z-[998]" 
              onClick={() => setShowSettingsPanel(false)}
            />
            {/* Settings Panel */}
            <div className="fixed top-16 right-6 w-80 bg-gray-900/98 border border-gray-700/80 
                            rounded-xl shadow-2xl z-[999] overflow-hidden backdrop-blur-sm">
              <div className="px-4 py-3 border-b border-gray-700/50 bg-gray-800/50">
                <h3 className="text-white font-bold text-sm">Auction Settings</h3>
              </div>
              
              <div className="p-4 space-y-4">
                {/* Currency Unit Selector */}
                <div>
                  <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
                    Currency Display Unit
                  </label>
                  <div className="flex gap-2">
                    {(['K', 'L', 'Cr'] as CurrencyUnit[]).map((unit) => (
                      <button
                        key={unit}
                        onClick={async () => {
                          if (currentMatch?.id && onCurrencyUnitChange) {
                            onCurrencyUnitChange(unit);
                            await updateCurrencyUnit(currentMatch.id, unit, userId);
                          }
                        }}
                        className={`flex-1 px-4 py-2 rounded-lg font-bold text-sm transition-all
                                   ${currencyUnit === unit
                                     ? 'bg-yellow-500 text-black'
                                     : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white border border-gray-700'}`}
                      >
                        {unit}
                        <span className="block text-[10px] font-normal opacity-70">
                          {unit === 'K' ? 'Thousands' : unit === 'L' ? 'Lakhs' : 'Crores'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Edit Bid Increments Button */}
                <div>
                  <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
                    Bid Increments
                  </label>
                  <button
                    onClick={() => {
                      setShowSettingsPanel(false);
                      handleOpenBidConfigEdit();
                    }}
                    className="w-full px-4 py-2.5 rounded-lg flex items-center justify-center gap-2
                               bg-gradient-to-r from-yellow-600/20 to-orange-600/20
                               border border-yellow-500/30 text-yellow-400
                               hover:bg-yellow-500/20 hover:border-yellow-500/50 
                               transition-all text-sm font-bold"
                  >
                    <Gavel size={16} />
                    <span>Edit Bid Increments</span>
                    <span className="text-xs text-yellow-300/60">(Recovery Mode)</span>
                  </button>
                </div>
                
                {/* Current Bid Buttons Preview */}
                <div>
                  <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
                    Active Bid Buttons
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {bidButtonsWithLabels.map((btn, idx) => (
                      <span key={idx} className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-300 border border-gray-700">
                        {btn.label}
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* DANGER ZONE - End Live Auction */}
                {onEndAuction && (
                  <div className="pt-4 mt-4 border-t border-red-500/20">
                    <label className="block text-red-400 text-xs font-semibold uppercase tracking-wider mb-2">
                      ⚠️ Danger Zone
                    </label>
                    <button
                      onClick={() => {
                        setShowSettingsPanel(false);
                        onEndAuction();
                      }}
                      className="w-full px-4 py-3 rounded-lg flex items-center justify-center gap-2
                                 bg-gradient-to-r from-red-600/20 to-red-700/30
                                 border-2 border-red-500/50 text-red-400
                                 hover:bg-red-600/30 hover:border-red-500/80 hover:text-red-300
                                 transition-all text-sm font-bold"
                    >
                      <AlertTriangle size={18} />
                      <span>END LIVE AUCTION</span>
                    </button>
                    <p className="text-[10px] text-red-400/50 text-center mt-2">
                      Stops auction for all users immediately
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {currentPlayer ? (
          <>
            <div className="flex-1 flex flex-col min-h-0 relative">
            
            {/* 🧍 2️⃣ MAIN PLAYER PROFILE ZONE - 3-Column Layout */}
            <div className="flex-1 flex gap-4 px-6 py-6 pr-[560px] min-h-0">
              
              {/* Left: Player Visual Identity (Square Card) - Compact */}
              <div className="flex flex-col items-center justify-center gap-4 w-64 flex-shrink-0">
                <div className="relative w-full aspect-[11/12]">
                  {/* Glow Effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 via-transparent to-red-500/20 
                                  blur-xl scale-110"></div>
                  
                  {/* Player Card Frame - Rounded Rectangle */}
                  <div className="relative w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-black
                                  border-2 border-red-500/60 rounded-2xl overflow-hidden
                                  shadow-[0_0_30px_rgba(239,68,68,0.3)]">
                    
                    {/* Player Image */}
                    <img
                      key={currentPlayer?.id}
                      src={currentPlayer?.imageUrl || `/api/placeholder/300/400`}
                      alt={currentPlayer?.name}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                    
                    {/* Player Name Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-center">
                      <h1 className="text-2xl font-black text-white mb-1 tracking-tight
                                     drop-shadow-[0_0_20px_rgba(0,0,0,0.9)]">
                        {currentPlayer.name}
                      </h1>
                      <div className="flex items-center justify-center gap-2 text-red-300">
                        <Shield size={14} />
                        <span className="font-bold text-sm">{currentPlayer.role || 'Player'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* UNSOLD BUTTON - Alert/Warning Terminal */}
                {auctionState?.biddingActive && onCloseBidding && (
                  <button
                    onClick={() => onCloseBidding(false)}
                    className="group relative
                               hover:scale-[1.05] active:scale-95
                               transition-all duration-300"
                    style={{
                      width: '160px',
                      height: '80px',
                      filter: 'drop-shadow(0 4px 20px rgba(239, 68, 68, 0.5))'
                    }}
                  >
                    {/* Outer Danger Glow */}
                    <div className="absolute -inset-2 bg-gradient-to-r from-red-500/40 via-orange-500/40 to-red-500/40 blur-xl animate-pulse rounded-lg" />
                    
                    {/* Main Angular Frame */}
                    <div 
                      className="absolute inset-0"
                      style={{
                        background: 'linear-gradient(135deg, rgba(25, 5, 5, 0.98) 0%, rgba(40, 10, 5, 0.96) 50%, rgba(25, 5, 5, 0.98) 100%)',
                        clipPath: 'polygon(16px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 16px), calc(100% - 16px) 100%, 8px 100%, 0 calc(100% - 8px), 0 16px)',
                        border: '3px solid rgba(239, 68, 68, 0.8)',
                        boxShadow: '0 0 40px rgba(239, 68, 68, 0.7), inset 0 0 30px rgba(239, 68, 68, 0.15), inset 0 -5px 20px rgba(0, 0, 0, 0.6)'
                      }}
                    />
                    
                    {/* Danger Stripes Animation */}
                    <div 
                      className="absolute inset-0 opacity-15"
                      style={{
                        backgroundImage: 'repeating-linear-gradient(45deg, transparent 0px, transparent 8px, rgba(239, 68, 68, 0.4) 8px, rgba(239, 68, 68, 0.4) 16px)',
                        clipPath: 'polygon(16px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 16px), calc(100% - 16px) 100%, 8px 100%, 0 calc(100% - 8px), 0 16px)',
                        animation: 'stripeMove 1s linear infinite'
                      }}
                    />
                    
                    {/* LED Accent Strips */}
                    <div className="absolute top-0 left-8 right-8 h-1 bg-gradient-to-r from-transparent via-red-400 to-transparent animate-pulse" 
                         style={{ boxShadow: '0 0 10px rgba(239, 68, 68, 0.9)' }} />
                    <div className="absolute bottom-0 left-8 right-8 h-1 bg-gradient-to-r from-transparent via-orange-400 to-transparent animate-pulse" 
                         style={{ boxShadow: '0 0 10px rgba(239, 68, 68, 0.9)', animationDelay: '0.5s' }} />
                    <div className="absolute left-0 top-8 bottom-8 w-1 bg-gradient-to-b from-transparent via-red-400 to-transparent animate-pulse" 
                         style={{ boxShadow: '0 0 10px rgba(239, 68, 68, 0.9)', animationDelay: '0.25s' }} />
                    <div className="absolute right-0 top-8 bottom-8 w-1 bg-gradient-to-b from-transparent via-orange-400 to-transparent animate-pulse" 
                         style={{ boxShadow: '0 0 10px rgba(239, 68, 68, 0.9)', animationDelay: '0.75s' }} />
                    
                    {/* Corner Cutouts */}
                    <div className="absolute top-0 left-0 w-5 h-5 border-l-[3px] border-t-[3px] border-red-300 animate-pulse" 
                         style={{ boxShadow: '0 0 15px rgba(239, 68, 68, 0.9)' }} />
                    <div className="absolute top-0 right-0 w-4 h-4 border-r-[3px] border-t-[3px] border-orange-300 animate-pulse" 
                         style={{ boxShadow: '0 0 15px rgba(239, 68, 68, 0.9)', animationDelay: '0.2s' }} />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-l-[3px] border-b-[3px] border-red-300 animate-pulse" 
                         style={{ boxShadow: '0 0 15px rgba(239, 68, 68, 0.9)', animationDelay: '0.4s' }} />
                    <div className="absolute bottom-0 right-0 w-5 h-5 border-r-[3px] border-b-[3px] border-orange-300 animate-pulse" 
                         style={{ boxShadow: '0 0 15px rgba(239, 68, 68, 0.9)', animationDelay: '0.6s' }} />
                    
                    {/* Content Container */}
                    <div className="relative h-full flex flex-col items-center justify-center gap-2 px-3">
                      {/* Alert Icon */}
                      <div className="relative">
                        <div className="absolute inset-0 bg-red-500/30 blur-xl rounded-full" />
                        <XCircle size={24} className="relative text-red-300 animate-pulse" 
                                 style={{ 
                                   filter: 'drop-shadow(0 0 12px rgba(239, 68, 68, 1)) drop-shadow(0 0 24px rgba(239, 68, 68, 0.6))',
                                   strokeWidth: 2.5
                                 }} />
                      </div>
                      
                      {/* Warning Label */}
                      <div className="px-4 py-1.5 rounded-lg"
                           style={{
                             background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.4) 0%, rgba(249, 115, 22, 0.6) 50%, rgba(239, 68, 68, 0.4) 100%)',
                             border: '2px solid rgba(239, 68, 68, 0.6)',
                             boxShadow: '0 0 20px rgba(239, 68, 68, 0.8), inset 0 0 15px rgba(255, 255, 255, 0.1)'
                           }}>
                        <span className="text-red-100 font-black text-sm uppercase tracking-[0.25em]"
                              style={{ 
                                textShadow: '0 0 15px rgba(255, 255, 255, 0.8), 0 0 30px rgba(239, 68, 68, 0.9), 0 2px 10px rgba(0, 0, 0, 1)',
                                fontFamily: 'monospace'
                              }}>
                          UNSOLD
                        </span>
                      </div>
                    </div>
                    
                    {/* Warning Pulse Overlay */}
                    <div 
                      className="absolute inset-0 opacity-20 pointer-events-none"
                      style={{
                        background: 'radial-gradient(circle at center, rgba(239, 68, 68, 0.3) 0%, transparent 70%)',
                        animation: 'dangerPulse 2s ease-in-out infinite',
                        clipPath: 'polygon(16px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 16px), calc(100% - 16px) 100%, 8px 100%, 0 calc(100% - 8px), 0 16px)'
                      }}
                    />
                  </button>
                )}
              </div>

              {/* Center: Player Data Blocks (Info Panels) */}
              <div className="flex-1 flex flex-col gap-4 overflow-y-auto hide-scrollbar min-w-0">
                
                {/* Info Panels Grid */}
                <div className="grid grid-cols-2 gap-4">
                  
                  {/* History Panel */}
                  <div className="p-5 bg-gradient-to-br from-red-900/20 to-black/90 backdrop-blur-sm
                                  border border-red-400/40 rounded-lg
                                  shadow-[0_0_20px_rgba(239,68,68,0.15)]">
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-red-400/30">
                      <Trophy size={18} className="text-red-400" />
                      <h3 className="text-red-300 font-black text-sm uppercase tracking-wider">
                        Player Profile
                      </h3>
                    </div>
                    <div className="space-y-3 text-sm">
                      {currentPlayer.age && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Age</span>
                          <span className="text-gray-200 font-semibold">{currentPlayer.age} years</span>
                        </div>
                      )}
                      {currentPlayer.gender && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Gender</span>
                          <span className="text-gray-200 font-semibold">{currentPlayer.gender}</span>
                        </div>
                      )}
                      {currentPlayer.nationality && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Nationality</span>
                          <span className="text-gray-200 font-semibold">{currentPlayer.nationality}</span>
                        </div>
                      )}
                      {currentPlayer.isOverseas !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Player Type</span>
                          <span className="text-red-400 font-bold">{currentPlayer.isOverseas ? 'International' : 'Domestic'}</span>
                        </div>
                      )}
                      {!(currentPlayer.age || currentPlayer.gender || currentPlayer.nationality || currentPlayer.isOverseas !== undefined) && (
                        <div className="text-center py-2">
                          <span className="text-gray-500 text-xs">No profile data available</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Achievements Panel */}
                  <div className="p-5 bg-gradient-to-br from-red-900/20 to-black/90 backdrop-blur-sm
                                  border border-red-400/40 rounded-lg
                                  shadow-[0_0_20px_rgba(239,68,68,0.15)]">
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-red-400/30">
                      <Award size={18} className="text-red-400" />
                      <h3 className="text-red-300 font-black text-sm uppercase tracking-wider">
                        Playing Style
                      </h3>
                    </div>
                    <div className="space-y-3 text-sm">
                      {currentPlayer.battingStyle && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Batting</span>
                          <span className="text-gray-200 font-semibold">{currentPlayer.battingStyle}</span>
                        </div>
                      )}
                      {currentPlayer.bowlingStyle && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Bowling</span>
                          <span className="text-gray-200 font-semibold">{currentPlayer.bowlingStyle}</span>
                        </div>
                      )}
                      {currentPlayer.experienceLevel && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Experience</span>
                          <span className="text-red-400 font-bold">{currentPlayer.experienceLevel}</span>
                        </div>
                      )}
                      {currentPlayer.playerCategory && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Category</span>
                          <span className="text-red-400 font-bold">{currentPlayer.playerCategory}</span>
                        </div>
                      )}
                      {!(currentPlayer.battingStyle || currentPlayer.bowlingStyle || currentPlayer.experienceLevel || currentPlayer.playerCategory) && (
                        <div className="text-center py-2">
                          <span className="text-gray-500 text-xs">No style data available</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3 COMPACT HUD CARDS - Gaming Style */}
                <div className="flex items-center justify-center gap-6 mt-8">
                  
                  {/* CARD 1: BASE PRICE - Red HUD Style */}
                  <div 
                    className="relative overflow-hidden transition-all duration-300"
                    style={{
                      width: '165px',
                      height: '105px',
                      background: 'linear-gradient(135deg, rgba(20, 5, 5, 0.95) 0%, rgba(35, 10, 10, 0.95) 100%)',
                      clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)',
                      border: '1.5px solid rgba(239, 68, 68, 0.4)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '14px'
                    }}
                  >
                    <span style={{ fontSize: '9px', color: 'rgba(239, 68, 68, 0.7)', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase' }}>
                      BASE PRICE
                    </span>
                    <span 
                      className="transition-all duration-300"
                      style={{ fontSize: '18px', color: '#EF4444', fontWeight: '900', marginTop: '6px', textShadow: '0 0 10px rgba(239, 68, 68, 0.6)' }}
                    >
                      {formatCurrency(currentPlayer.basePrice || 0)}
                    </span>
                  </div>

                  {/* CARD 2: TEAM - Center with Logo - ✅ ALWAYS RENDERED */}
                  <div 
                    className="transition-all duration-300"
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '6px', 
                      minHeight: '80px', 
                      minWidth: '120px',
                      opacity: leadingTeam ? 1 : 0,
                      pointerEvents: leadingTeam ? 'auto' : 'none'
                    }}
                  >
                    {leadingTeam && (
                      <>
                        {leadingTeam.logo && isValidImageUrl(leadingTeam.logo) ? (
                          <img 
                            src={leadingTeam.logo} 
                            alt={leadingTeam.name} 
                            className="h-12 w-auto object-contain transition-all duration-300"
                            style={{ filter: 'drop-shadow(0 0 10px rgba(239, 68, 68, 0.5))' }}
                          />
                        ) : (
                          <Crown 
                            size={32} 
                            className="text-red-400 transition-all duration-300" 
                            style={{ filter: 'drop-shadow(0 0 10px rgba(239, 68, 68, 0.5))' }} 
                          />
                        )}
                        <span 
                          className="transition-all duration-300"
                          style={{ fontSize: '13px', color: 'rgba(239, 68, 68, 0.9)', fontWeight: '700', letterSpacing: '0.5px', textAlign: 'center' }}
                        >
                          {leadingTeam.name}
                        </span>
                      </>
                    )}
                  </div>

                  {/* CARD 3: CURRENT BID - Red Pulsing HUD */}
                  <div 
                    className="relative overflow-hidden transition-all duration-300"
                    style={{
                      width: '165px',
                      height: '105px',
                      background: 'linear-gradient(135deg, rgba(30, 10, 10, 0.98) 0%, rgba(40, 15, 15, 0.98) 100%)',
                      clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)',
                      border: '1.5px solid rgba(239, 68, 68, 0.6)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '14px'
                    }}
                  >
                    <span style={{ fontSize: '9px', color: 'rgba(239, 68, 68, 0.8)', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                      LIVE BID
                    </span>
                    <span 
                      className="transition-all duration-300"
                      style={{ fontSize: '18px', color: '#EF4444', fontWeight: '900', marginTop: '6px', textShadow: '0 0 15px rgba(239, 68, 68, 0.8), 0 0 30px rgba(239, 68, 68, 0.5)' }}
                    >
                      {formatCurrency(currentBid)}
                    </span>
                  </div>

                </div>

                {/* PURSE INTELLIGENCE PANEL - Only show when we have leading team insights */}
                {leadingTeamInsights && leadingTeam && auctionState?.biddingActive && (
                  <div className="flex justify-center mt-6">
                    <div 
                      className="relative overflow-hidden"
                      style={{
                        background: 'linear-gradient(135deg, rgba(15, 15, 25, 0.95) 0%, rgba(25, 20, 35, 0.95) 100%)',
                        border: `1.5px solid ${getWarningLevel(leadingTeamInsights.safeMaxBid, currentBid) === 'danger' 
                          ? 'rgba(239, 68, 68, 0.6)' 
                          : getWarningLevel(leadingTeamInsights.safeMaxBid, currentBid) === 'warning'
                          ? 'rgba(245, 158, 11, 0.6)'
                          : 'rgba(34, 197, 94, 0.4)'}`,
                        borderRadius: '12px',
                        padding: '12px 20px',
                        minWidth: '400px',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)'
                      }}
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between mb-3 pb-2" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                        <div className="flex items-center gap-2">
                          <Wallet size={14} className="text-pink-400" />
                          <span style={{ fontSize: '10px', color: 'rgba(236, 72, 153, 0.9)', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                            PURSE INTELLIGENCE
                          </span>
                        </div>
                        <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)' }}>
                          {leadingTeam.name}
                        </span>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-4 gap-3">
                        {/* Remaining Budget */}
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <DollarSign size={10} className="text-green-400" />
                            <span style={{ fontSize: '8px', color: 'rgba(34, 197, 94, 0.8)', fontWeight: '600', textTransform: 'uppercase' }}>Remaining</span>
                          </div>
                          <span style={{ fontSize: '14px', color: '#22C55E', fontWeight: '800' }}>
                            {formatCurrencyShort(leadingTeamInsights.remainingBudget)}
                          </span>
                        </div>

                        {/* Players Left */}
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <UserCheck size={10} className="text-blue-400" />
                            <span style={{ fontSize: '8px', color: 'rgba(59, 130, 246, 0.8)', fontWeight: '600', textTransform: 'uppercase' }}>Need</span>
                          </div>
                          <span style={{ fontSize: '14px', color: '#3B82F6', fontWeight: '800' }}>
                            {leadingTeamInsights.playersLeft} Players
                          </span>
                        </div>

                        {/* Safe Max Bid */}
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Shield size={10} className={currentBid > leadingTeamInsights.safeMaxBid ? 'text-red-400' : 'text-amber-400'} />
                            <span style={{ fontSize: '8px', color: currentBid > leadingTeamInsights.safeMaxBid ? 'rgba(239, 68, 68, 0.8)' : 'rgba(245, 158, 11, 0.8)', fontWeight: '600', textTransform: 'uppercase' }}>Safe Max</span>
                          </div>
                          <span style={{ 
                            fontSize: '14px', 
                            color: currentBid > leadingTeamInsights.safeMaxBid ? '#EF4444' : '#F59E0B', 
                            fontWeight: '800' 
                          }}>
                            {formatCurrencyShort(leadingTeamInsights.safeMaxBid)}
                          </span>
                        </div>

                        {/* Squad Progress */}
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <PieChart size={10} className="text-purple-400" />
                            <span style={{ fontSize: '8px', color: 'rgba(147, 51, 234, 0.8)', fontWeight: '600', textTransform: 'uppercase' }}>Squad</span>
                          </div>
                          <span style={{ fontSize: '14px', color: '#9333EA', fontWeight: '800' }}>
                            {leadingTeamInsights.playersBought}/{leadingTeamInsights.squadSizeRequired}
                          </span>
                        </div>
                      </div>

                      {/* Warning Message - Show only when over safe max */}
                      {currentBid > leadingTeamInsights.safeMaxBid && (
                        <div 
                          className="mt-3 pt-2 flex items-center justify-center gap-2"
                          style={{ borderTop: '1px solid rgba(239, 68, 68, 0.3)' }}
                        >
                          <AlertOctagon size={14} className="text-red-400 animate-pulse" />
                          <span style={{ fontSize: '11px', color: '#EF4444', fontWeight: '600' }}>
                            ⚠️ Current bid exceeds safe maximum!
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>

              {/* Right: AUCTION WAR ROOM - Championship Bidding Console */}
              <div className="absolute top-0 right-0 bottom-0 w-[540px] flex flex-col gap-3 px-6 py-6">
                {/* SOLD TO Button - Premium Esports Championship Style */}
                {auctionState?.biddingActive && onCloseBidding && (
                  <button
                    onClick={() => onCloseBidding(true)}
                    className="group relative w-full
                               hover:scale-[1.02] active:scale-95
                               transition-all duration-300"
                    style={{
                      height: '50px',
                      filter: 'drop-shadow(0 4px 20px rgba(34, 197, 94, 0.5))'
                    }}
                  >
                    {/* Outer Glow Pulse */}
                    <div className="absolute -inset-2 bg-gradient-to-r from-red-500/40 via-red-400/40 to-red-500/40 blur-xl animate-pulse rounded-lg" />
                    
                    {/* Main Angular Frame */}
                    <div 
                      className="absolute inset-0"
                      style={{
                        background: 'linear-gradient(135deg, rgba(20, 5, 10, 0.98) 0%, rgba(25, 10, 15, 0.96) 50%, rgba(20, 5, 10, 0.98) 100%)',
                        clipPath: 'polygon(20px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 20px), calc(100% - 20px) 100%, 8px 100%, 0 calc(100% - 8px), 0 20px)',
                        border: '3px solid rgba(239, 68, 68, 0.8)',
                        boxShadow: '0 0 40px rgba(239, 68, 68, 0.7), inset 0 0 30px rgba(239, 68, 68, 0.15), inset 0 -5px 20px rgba(0, 0, 0, 0.6)'
                      }}
                    />
                    
                    {/* Animated Scan Lines */}
                    <div 
                      className="absolute inset-0 opacity-20"
                      style={{
                        backgroundImage: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(239, 68, 68, 0.3) 2px, rgba(239, 68, 68, 0.3) 4px)',
                        clipPath: 'polygon(20px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 20px), calc(100% - 20px) 100%, 8px 100%, 0 calc(100% - 8px), 0 20px)',
                        animation: 'scan 2s linear infinite'
                      }}
                    />
                    
                    {/* LED Accent Strips */}
                    <div className="absolute top-0 left-8 right-8 h-1 bg-gradient-to-r from-transparent via-red-400 to-transparent" 
                         style={{ boxShadow: '0 0 10px rgba(239, 68, 68, 0.9)' }} />
                    <div className="absolute bottom-0 left-8 right-8 h-1 bg-gradient-to-r from-transparent via-red-400 to-transparent" 
                         style={{ boxShadow: '0 0 10px rgba(239, 68, 68, 0.9)' }} />
                    <div className="absolute left-0 top-8 bottom-8 w-1 bg-gradient-to-b from-transparent via-red-400 to-transparent" 
                         style={{ boxShadow: '0 0 10px rgba(239, 68, 68, 0.9)' }} />
                    <div className="absolute right-0 top-8 bottom-8 w-1 bg-gradient-to-b from-transparent via-red-400 to-transparent" 
                         style={{ boxShadow: '0 0 10px rgba(239, 68, 68, 0.9)' }} />
                    
                    {/* Corner Cutouts */}
                    <div className="absolute top-0 left-0 w-6 h-6 border-l-[3px] border-t-[3px] border-red-300" 
                         style={{ boxShadow: '0 0 15px rgba(239, 68, 68, 0.9)' }} />
                    <div className="absolute top-0 right-0 w-4 h-4 border-r-[3px] border-t-[3px] border-red-300" 
                         style={{ boxShadow: '0 0 15px rgba(239, 68, 68, 0.9)' }} />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-l-[3px] border-b-[3px] border-red-300" 
                         style={{ boxShadow: '0 0 15px rgba(239, 68, 68, 0.9)' }} />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-r-[3px] border-b-[3px] border-red-300" 
                         style={{ boxShadow: '0 0 15px rgba(239, 68, 68, 0.9)' }} />
                    
                    {/* Content - Single Row */}
                    <div className="relative h-full flex items-center justify-center gap-3 px-6">
                      <CheckCircle2 size={18} className="text-white animate-pulse" 
                                    style={{ filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 1))' }} />
                      <span className="text-white font-black text-lg uppercase tracking-wider"
                            style={{ 
                              textShadow: '0 0 15px rgba(255, 255, 255, 1), 0 0 30px rgba(34, 197, 94, 0.8), 0 2px 10px rgba(0, 0, 0, 1)',
                              fontFamily: 'monospace'
                            }}>
                        SELL TO
                      </span>
                      <div className="flex items-center justify-center transition-all duration-300" style={{ minWidth: '28px', minHeight: '28px' }}>
                        {leadingTeam?.logo && isValidImageUrl(leadingTeam.logo) ? (
                          <img 
                            key={leadingTeam.id}
                            src={leadingTeam.logo} 
                            alt={leadingTeam.name}
                            className="w-7 h-7 object-contain"
                            style={{ filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.9))' }}
                          />
                        ) : (
                          <Crown size={20} className="text-green-300" style={{ filter: 'drop-shadow(0 0 8px rgba(34, 197, 94, 1))' }} />
                        )}
                      </div>
                      <span className="text-green-100 font-black text-base uppercase tracking-wider truncate transition-all duration-300"
                            style={{ textShadow: '0 0 10px rgba(34, 197, 94, 1), 0 2px 8px rgba(0, 0, 0, 0.9)' }}>
                        {leadingTeam?.name || 'NO TEAM'}
                      </span>
                    </div>
                    
                    {/* Holographic Overlay */}
                    <div 
                      className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay"
                      style={{
                        background: 'linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.1) 50%, transparent 70%)',
                        backgroundSize: '200% 200%',
                        animation: 'shimmer 3s linear infinite',
                        clipPath: 'polygon(20px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 20px), calc(100% - 20px) 100%, 8px 100%, 0 calc(100% - 8px), 0 20px)'
                      }}
                    />
                  </button>
                )}
                
                {/* Team Battle Strips - Esports Power Hierarchy */}
                <div className="flex-1 overflow-y-auto hide-scrollbar space-y-2">
                  {teamsWithRemainingBudget.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center">
                        <Users size={48} className="text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm font-semibold">No teams available</p>
                      </div>
                    </div>
                  ) : (
                    teamsWithRemainingBudget
                      .map((team, index) => {
                      const remainingBudget = team.remainingBudget || 0;
                      const isLeadingTeam = auctionState?.leadingTeamId === team.id;
                      const isTop3 = index < 3;
                      const canAfford = remainingBudget >= (auctionState?.currentBid || auctionState?.currentBidAmount || currentPlayer?.basePrice || 0);
                      const currentBid = auctionState?.currentBid || auctionState?.currentBidAmount || currentPlayer?.basePrice || 0;
                      
                      // 🎯 UNIFIED TEAM STRIP with Smooth Transitions
                      return (
                        <div
                          key={team.id}
                          className={`relative h-14 overflow-hidden rounded-lg
                                     hover:scale-[1.01] transition-all duration-500 ease-out`}
                          style={{
                            // Smooth box-shadow transition for leading highlight
                            boxShadow: isLeadingTeam 
                              ? '0 0 20px rgba(239, 68, 68, 0.4), 0 0 40px rgba(239, 68, 68, 0.2), inset 0 0 15px rgba(239, 68, 68, 0.1)'
                              : '0 0 0 rgba(239, 68, 68, 0), 0 0 0 rgba(239, 68, 68, 0)',
                            transition: 'box-shadow 500ms cubic-bezier(0.4, 0, 0.2, 1), transform 150ms ease-out'
                          }}
                        >
                          {/* Background Layer - Smooth Color Transition */}
                          <div 
                            className="absolute inset-0 rounded-lg transition-all duration-500 ease-out"
                            style={{
                              background: isLeadingTeam
                                ? 'linear-gradient(to right, rgba(127, 29, 29, 0.5), rgba(153, 27, 27, 0.4), rgba(127, 29, 29, 0.5))'
                                : isTop3
                                  ? 'linear-gradient(to right, rgba(23, 37, 84, 0.5), rgba(22, 78, 99, 0.3), rgba(23, 37, 84, 0.5))'
                                  : canAfford
                                    ? 'linear-gradient(to right, rgba(3, 7, 18, 0.7), rgba(17, 24, 39, 0.5), rgba(3, 7, 18, 0.7))'
                                    : 'linear-gradient(to right, rgba(69, 10, 10, 0.4), rgba(3, 7, 18, 0.5), rgba(69, 10, 10, 0.4))'
                            }}
                          >
                            {/* Subtle Noise */}
                            <div className="absolute inset-0 opacity-[0.08] rounded-lg"
                                 style={{
                                   backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'1.2\' numOctaves=\'3\' /%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' /%3E%3C/svg%3E")',
                                   backgroundSize: '64px 64px'
                                 }} />
                          </div>

                          {/* Border - Smooth Color Transition */}
                          <div 
                            className="absolute inset-0 pointer-events-none rounded-lg transition-all duration-500 ease-out"
                            style={{
                              border: isLeadingTeam
                                ? '2px solid rgba(239, 68, 68, 0.5)'
                                : isTop3 
                                  ? '1px solid rgba(6, 182, 212, 0.4)' 
                                  : '1px solid rgba(55, 65, 81, 0.4)'
                            }}
                          />

                          {/* Left Edge Stripe - Smooth Color Transition */}
                          <div 
                            className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg transition-all duration-500 ease-out"
                            style={{
                              background: isLeadingTeam
                                ? 'linear-gradient(to bottom, rgb(248, 113, 113), rgb(220, 38, 38), rgb(185, 28, 28))'
                                : isTop3 
                                  ? 'linear-gradient(to bottom, rgb(34, 211, 238), rgb(59, 130, 246), rgb(6, 182, 212))' 
                                  : 'linear-gradient(to bottom, rgb(75, 85, 99), rgb(31, 41, 55))'
                            }}
                          />

                          {/* Content */}
                          <div 
                            className="relative h-full flex items-center gap-2 px-2 transition-all duration-500 ease-out"
                          >
                            {/* Team Identity */}
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div 
                                className="w-9 h-9 flex-shrink-0 overflow-hidden rounded-md transition-all duration-500 ease-out"
                                style={{
                                  border: isLeadingTeam 
                                    ? '2px solid rgba(239, 68, 68, 0.6)' 
                                    : isTop3 
                                      ? '1px solid rgba(6, 182, 212, 0.5)' 
                                      : '1px solid rgba(55, 65, 81, 0.5)',
                                  background: isLeadingTeam ? 'rgba(0, 0, 0, 0.6)' : isTop3 ? 'rgba(0, 0, 0, 0.6)' : 'rgba(17, 24, 39, 0.5)'
                                }}
                              >
                                {team.logo ? (
                                  <img src={team.logo} alt={team.name} className="w-full h-full object-cover" />
                                ) : (
                                  <Shield size={14} className={`m-auto transition-colors duration-500 ${isLeadingTeam ? 'text-red-400' : 'text-gray-500'}`} />
                                )}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs font-black truncate uppercase tracking-wider leading-tight transition-colors duration-500
                                              ${isLeadingTeam ? 'text-red-100' : isTop3 ? 'text-cyan-100' : 'text-gray-300'}`}>
                                  {team.name}
                                </p>
                                <p className={`text-[10px] font-bold tracking-wider leading-tight tabular-nums transition-colors duration-500
                                              ${isLeadingTeam ? 'text-red-300' : canAfford ? 'text-cyan-400' : 'text-red-400'}`}>
                                  {formatBudget(remainingBudget)} {!canAfford && '⚠'}
                                </p>
                              </div>
                            </div>

                            {/* Bid Controls - Color adapts to leading state */}
                            <div className="flex gap-1 flex-shrink-0 items-center">
                              {bidButtonsWithLabels.map(({ amount, label }, idx) => (
                                <button
                                  key={`${team.id}-${amount}-${idx}`}
                                  onClick={() => handleBidWithPurseCheck(team.id, amount)}
                                  disabled={!onPlaceBid || remainingBudget < (currentBid + amount)}
                                  className={`px-2.5 py-1.5 text-[10px] font-black uppercase rounded-md
                                             hover:scale-105 active:scale-95 transition-all duration-150
                                             disabled:from-gray-900 disabled:to-black disabled:border-gray-800
                                             disabled:text-gray-700 disabled:cursor-not-allowed
                                             ${label.includes('★') ? 'ring-1 ring-yellow-400/50' : ''}`}
                                  style={{
                                    background: isLeadingTeam 
                                      ? 'linear-gradient(to bottom, rgb(239, 68, 68), rgb(185, 28, 28))'
                                      : 'linear-gradient(to bottom, rgb(126, 34, 206), rgb(88, 28, 135))',
                                    border: isLeadingTeam 
                                      ? '1px solid rgba(248, 113, 113, 0.8)'
                                      : '1px solid rgba(168, 85, 247, 0.5)',
                                    color: isLeadingTeam ? 'rgb(254, 226, 226)' : 'white',
                                    transition: 'background 300ms ease-out, border-color 300ms ease-out'
                                  }}
                                >
                                  {label}
                                </button>
                              ))}
                              {/* Custom Bid Input */}
                              <div className="flex gap-0.5 items-center" title="Enter increment in Lakhs (e.g., 2 = +₹2L, 5 = +₹5L)">
                                <input
                                  type="text"
                                  value={customBidAmounts[team.id] || ''}
                                  onChange={(e) => handleCustomBidChange(team.id, e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleCustomBidSubmit(team.id, remainingBudget, currentBid);
                                    }
                                  }}
                                  placeholder="+"
                                  className="w-14 px-1 py-1.5 bg-black/60 rounded text-[10px] font-bold text-center
                                             focus:outline-none focus:ring-1 transition-all duration-300"
                                  style={{
                                    border: isLeadingTeam ? '1px solid rgba(239, 68, 68, 0.6)' : '1px solid rgba(168, 85, 247, 0.6)',
                                    color: isLeadingTeam ? 'rgb(254, 202, 202)' : 'rgb(233, 213, 255)'
                                  }}
                                />
                                <span className={`text-[9px] font-bold transition-colors duration-300 ${isLeadingTeam ? 'text-red-400' : 'text-purple-300'}`}>L</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* ⚡ CHAMPIONSHIP ACTION - Instant Victory */}
                {auctionState?.leadingTeamId && onDirectSell && (
                  <button
                    onClick={() => onDirectSell(auctionState.leadingTeamId!)}
                    className="relative px-5 py-3.5 bg-gradient-to-r from-green-600 via-emerald-600 to-green-600
                               border-2 border-green-400 rounded-lg overflow-hidden
                               text-white font-black text-sm uppercase tracking-[0.15em]
                               hover:scale-105 active:scale-95 transition-all
                               shadow-[0_0_30px_rgba(34,197,94,0.5)]
                               group"
                  >
                    {/* Energy Pulse Background */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent 
                                    translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    
                    <div className="relative flex items-center justify-center gap-2">
                      <CheckCircle2 size={18} className="animate-pulse" />
                      <span>CONFIRM SALE - {approvedTeamsOnly.find(t => t.id === auctionState.leadingTeamId)?.name}</span>
                      <Zap size={16} className="text-yellow-300" />
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* 📊 ALL PLAYERS BOTTOM TICKER - SINGLE ROW */}
            <div 
              className="relative overflow-hidden flex items-center"
              style={{ 
                height: '220px',
                background: 'linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.4) 100%)',
                display: 'flex',
                width: 'calc(100% - 560px)'
              }}
            >
              {/* Left Scroll Button - Small Blurry */}
              <button
                onClick={() => scrollPlayerCards('left')}
                className="absolute left-0 top-1/2 transform -translate-y-1/2 z-20 flex items-center justify-center
                           opacity-70 hover:opacity-100 hover:backdrop-blur-lg
                           transition-all duration-200"
                style={{
                  width: '40px',
                  height: '40px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  backdropFilter: 'blur(4px)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '6px'
                }}
                title="Scroll to previous players"
              >
                <span className="text-red-300 font-black text-lg">&lt;</span>
              </button>
              
              <div 
                ref={playerCardsRef}
                className="flex gap-3 px-20 overflow-x-auto hide-scrollbar flex-1"
                style={{ 
                  justifyContent: 'flex-start'
                }}
              >
                {/* UNSOLD PLAYERS (Left) - Static - CRITICAL: Use approvedPlayersOnly */}
                {approvedPlayersOnly.filter(p => p.status === 'UNSOLD').map((player, idx) => (
                  <div 
                    key={`unsold-${player.id}-${idx}`}
                    onClick={() => handlePlayerCardClick(player)}
                    className="relative flex-shrink-0 flex flex-col cursor-pointer hover:scale-105 transition-transform"
                    style={{
                      width: `${calculateCardWidth()}px`,
                      background: 'linear-gradient(135deg, rgba(80, 0, 0, 0.9) 0%, rgba(40, 10, 10, 0.9) 100%)',
                      border: '2px solid rgba(255, 100, 100, 0.6)',
                      boxShadow: '0 0 20px rgba(255, 100, 100, 0.4)',
                      borderRadius: '8px',
                      padding: '8px',
                      backdropFilter: 'blur(10px)',
                      height: '100%'
                    }}
                  >
                      {/* Image on top */}
                      {player.imageUrl && isValidImageUrl(player.imageUrl) ? (
                        <img 
                          src={player.imageUrl}
                          alt={player.name}
                          className="w-full h-16 object-cover rounded-md border border-red-400/50 flex-shrink-0"
                          style={{ filter: 'drop-shadow(0 0 8px rgba(255, 100, 100, 0.6))' }}
                        />
                      ) : (
                        <div className="w-full h-16 rounded-md bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center flex-shrink-0">
                          <Users size={24} className="text-white" />
                        </div>
                      )}
                      
                      {/* Status badge */}
                      <div className="px-1.5 py-0.5 bg-red-600/80 rounded text-[7px] font-black text-white uppercase tracking-wider mb-1 inline-block">
                        UNSOLD
                      </div>
                      
                      {/* Player name */}
                      <h3 className="text-[11px] font-black text-white uppercase tracking-wide leading-tight mb-1 line-clamp-2">
                        {player.name}
                      </h3>

                      {/* Details */}
                      <div className="flex flex-col gap-0.5 text-[8px]">
                        {player.basePrice && (
                          <span className="font-black text-red-300">
                            ₹{formatBudget(player.basePrice).replace(/₹/g, '').trim()}
                          </span>
                        )}
                        {player.playerCategory && (
                          <span className="font-bold text-gray-300 truncate">{player.playerCategory}</span>
                        )}
                      </div>
                    </div>
                ))}

                {/* AVAILABLE PLAYERS (Right) - Static - CRITICAL: Use approvedPlayersOnly */}
                {approvedPlayersOnly.filter(p => p.status === 'AVAILABLE' || p.status === 'PENDING' || !p.status).map((player, idx) => (
                  <div 
                    key={`available-${player.id}-${idx}`}
                    onClick={() => handlePlayerCardClick(player)}
                    className="relative flex-shrink-0 flex flex-col cursor-pointer hover:scale-105 transition-transform"
                    style={{
                      width: `${calculateCardWidth()}px`,
                      background: 'linear-gradient(135deg, rgba(0, 40, 80, 0.9) 0%, rgba(10, 30, 60, 0.9) 100%)',
                      border: '2px solid rgba(100, 150, 255, 0.6)',
                      boxShadow: '0 0 20px rgba(100, 150, 255, 0.4)',
                      borderRadius: '8px',
                      padding: '8px',
                      backdropFilter: 'blur(10px)',
                      height: '100%'
                    }}
                  >
                      {/* Image on top */}
                      {player.imageUrl && isValidImageUrl(player.imageUrl) ? (
                        <img 
                          src={player.imageUrl}
                          alt={player.name}
                          className="w-full h-16 object-cover rounded-md border border-blue-400/50 flex-shrink-0"
                          style={{ filter: 'drop-shadow(0 0 8px rgba(100, 150, 255, 0.6))' }}
                        />
                      ) : (
                        <div className="w-full h-16 rounded-md bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
                          <Users size={24} className="text-white" />
                        </div>
                      )}
                      
                      {/* Status badge */}
                      <div className="px-1.5 py-0.5 bg-blue-600/80 rounded text-[7px] font-black text-white uppercase tracking-wider mb-1 inline-block">
                        UPCOMING
                      </div>
                      
                      {/* Player name */}
                      <h3 className="text-[11px] font-black text-white uppercase tracking-wide leading-tight mb-1 line-clamp-2">
                        {player.name}
                      </h3>

                      {/* Details */}
                      <div className="flex flex-col gap-0.5 text-[8px]">
                        {player.basePrice && (
                          <span className="font-black text-blue-300">
                            ₹{formatBudget(player.basePrice).replace(/₹/g, '').trim()}
                          </span>
                        )}
                        {player.playerCategory && (
                          <span className="font-bold text-gray-300 truncate">{player.playerCategory}</span>
                        )}
                      </div>
                    </div>
                ))}
              </div>
              
              {/* Right Scroll Button - Small Blurry */}
              <button
                onClick={() => scrollPlayerCards('right')}
                className="absolute right-0 top-1/2 transform -translate-y-1/2 z-20 flex items-center justify-center
                           opacity-70 hover:opacity-100 hover:backdrop-blur-lg
                           transition-all duration-200"
                style={{
                  width: '40px',
                  height: '40px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  backdropFilter: 'blur(4px)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '6px'
                }}
                title="Scroll to next players"
              >
                <span className="text-red-300 font-black text-lg">&gt;</span>
              </button>
            </div>
          </div>
          
          {/* ═══════════════════════════════════════════════════════════════════════════════ */}
          {/* AUCTION END WARNINGS & END AUCTION BUTTON */}
          {/* ═══════════════════════════════════════════════════════════════════════════════ */}
          
          {/* Warning: All Players Processed but Teams Have Unfilled Slots */}
          {showTeamsUnfilledWarning && (
            <div 
              className="mx-6 mb-4 p-4 rounded-xl flex items-start gap-4"
              style={{
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.1) 100%)',
                border: '2px solid rgba(245, 158, 11, 0.5)',
                boxShadow: '0 0 30px rgba(245, 158, 11, 0.2)'
              }}
            >
              <div className="p-2 rounded-full bg-amber-500/20 flex-shrink-0">
                <AlertTriangle size={24} className="text-amber-400 animate-pulse" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-black text-amber-400 uppercase tracking-wide mb-2">
                  ⚠️ All Players Processed - Teams Not Full
                </h3>
                <p className="text-sm text-gray-300 mb-3">
                  All players have been auctioned but <span className="font-bold text-amber-300">{teamsWithUnfilledSlots.length} team(s)</span> still have unfilled slots.
                  Total unfilled slots: <span className="font-bold text-amber-300">{totalUnfilledSlots}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {teamsWithUnfilledSlots.slice(0, 5).map(team => (
                    <div 
                      key={team.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2"
                      style={{
                        background: 'rgba(245, 158, 11, 0.15)',
                        border: '1px solid rgba(245, 158, 11, 0.4)'
                      }}
                    >
                      {team.logo && (
                        <img src={team.logo} alt={team.name} className="w-4 h-4 rounded object-cover" />
                      )}
                      <span className="text-amber-200">{team.name}</span>
                      <span className="text-amber-400">{team.currentSquadSize}/{team.maxSize}</span>
                    </div>
                  ))}
                  {teamsWithUnfilledSlots.length > 5 && (
                    <span className="px-3 py-1.5 text-xs text-amber-400 font-bold">
                      +{teamsWithUnfilledSlots.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Warning: All Teams Full but Players Still Remaining */}
          {showPlayersRemainingWarning && (
            <div 
              className="mx-6 mb-4 p-4 rounded-xl flex items-start gap-4"
              style={{
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)',
                border: '2px solid rgba(239, 68, 68, 0.5)',
                boxShadow: '0 0 30px rgba(239, 68, 68, 0.2)'
              }}
            >
              <div className="p-2 rounded-full bg-red-500/20 flex-shrink-0">
                <XCircle size={24} className="text-red-400 animate-pulse" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-black text-red-400 uppercase tracking-wide mb-2">
                  ⚠️ All Teams Full - Players Remaining
                </h3>
                <p className="text-sm text-gray-300 mb-3">
                  All teams have reached maximum capacity but <span className="font-bold text-red-300">
                    {availablePlayers.length + unsoldPlayers.length} player(s)
                  </span> are still not part of any team.
                </p>
                <div className="flex items-center gap-4 text-sm">
                  {availablePlayers.length > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="text-gray-400">Available: <span className="text-blue-400 font-bold">{availablePlayers.length}</span></span>
                    </div>
                  )}
                  {unsoldPlayers.length > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span className="text-gray-400">Unsold: <span className="text-red-400 font-bold">{unsoldPlayers.length}</span></span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          

          
          {/* End Auction Button - Always at Bottom for Auctioneer */}
          {onEndAuction && canEndAuction && (
            <div className="mx-6 mb-4">
              <button
                onClick={onEndAuction}
                className="w-full relative overflow-hidden px-8 py-4 rounded-xl
                           hover:scale-[1.02] active:scale-95
                           transition-all duration-300"
                style={{
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.9) 0%, rgba(220, 38, 38, 0.9) 100%)',
                  border: '2px solid rgba(239, 68, 68, 0.8)',
                  boxShadow: '0 0 40px rgba(239, 68, 68, 0.4), inset 0 0 20px rgba(255, 255, 255, 0.1)'
                }}
              >
                {/* Animated gradient overlay */}
                <div 
                  className="absolute inset-0 opacity-30"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 2s infinite'
                  }}
                />
                
                <div className="relative flex items-center justify-center gap-3">
                  <Square size={20} className="text-white" />
                  <span className="text-white font-black text-lg uppercase tracking-wider">
                    End Auction
                  </span>
                  <AlertCircle size={18} className="text-white/70" />
                </div>
              </button>
            </div>
          )}
          </>
        ) : (
          // No Player Selected State - Show different UI based on auction state
          <div className="flex-1 flex items-center justify-center">
            {allPlayersProcessed ? (
              // ═══════════════════════════════════════════════════════════════════════════════
              // AUCTION COMPLETE STATE - All Players Have Been Processed
              // ═══════════════════════════════════════════════════════════════════════════════
              <div className="text-center max-w-2xl mx-auto px-6">
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 bg-green-500/20 blur-3xl"></div>
                  <CheckCircle2 size={100} className="relative text-green-500" style={{ filter: 'drop-shadow(0 0 20px rgba(34, 197, 94, 0.6))' }} />
                </div>
                
                <h2 className="text-4xl font-black text-white tracking-wide mb-3 uppercase">
                  Auction Complete
                </h2>
                <p className="text-gray-400 text-lg mb-8">
                  All players have been processed. Review the results below.
                </p>
                
                {/* Stats Summary */}
                <div className="grid grid-cols-3 gap-6 mb-8">
                  <div 
                    className="p-6 rounded-xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(22, 163, 74, 0.1) 100%)',
                      border: '1px solid rgba(34, 197, 94, 0.3)'
                    }}
                  >
                    <div className="text-4xl font-black text-green-400 mb-2">{soldPlayers}</div>
                    <div className="text-sm text-gray-400 uppercase tracking-wider">Players Sold</div>
                  </div>
                  <div 
                    className="p-6 rounded-xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)',
                      border: '1px solid rgba(239, 68, 68, 0.3)'
                    }}
                  >
                    <div className="text-4xl font-black text-red-400 mb-2">{unsoldPlayers.length}</div>
                    <div className="text-sm text-gray-400 uppercase tracking-wider">Unsold</div>
                  </div>
                  <div 
                    className="p-6 rounded-xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.1) 0%, rgba(126, 34, 206, 0.1) 100%)',
                      border: '1px solid rgba(147, 51, 234, 0.3)'
                    }}
                  >
                    <div className="text-4xl font-black text-purple-400 mb-2">{filledTeamsCount}/{approvedTeamsOnly.length}</div>
                    <div className="text-sm text-gray-400 uppercase tracking-wider">Teams Filled</div>
                  </div>
                </div>
                
                {/* Warnings */}
                {showTeamsUnfilledWarning && (
                  <div 
                    className="p-4 rounded-xl mb-6 flex items-start gap-4 text-left"
                    style={{
                      background: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid rgba(245, 158, 11, 0.4)'
                    }}
                  >
                    <AlertTriangle size={24} className="text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-amber-300 font-bold mb-1">Teams Not Fully Filled</p>
                      <p className="text-sm text-gray-400">
                        {teamsWithUnfilledSlots.length} team(s) have {totalUnfilledSlots} unfilled slot(s) remaining.
                      </p>
                    </div>
                  </div>
                )}
                
                {showPlayersRemainingWarning && (
                  <div 
                    className="p-4 rounded-xl mb-6 flex items-start gap-4 text-left"
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.4)'
                    }}
                  >
                    <XCircle size={24} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-red-300 font-bold mb-1">Players Could Not Be Placed</p>
                      <p className="text-sm text-gray-400">
                        All teams are full but {availablePlayers.length + unsoldPlayers.length} player(s) remain unassigned.
                      </p>
                    </div>
                  </div>
                )}
                
                {/* End Auction Button */}
                {onEndAuction && (
                  <button
                    onClick={onEndAuction}
                    className="relative overflow-hidden px-12 py-5 rounded-xl mx-auto
                               hover:scale-105 active:scale-95
                               transition-all duration-300"
                    style={{
                      background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.9) 0%, rgba(220, 38, 38, 0.9) 100%)',
                      border: '2px solid rgba(239, 68, 68, 0.8)',
                      boxShadow: '0 0 50px rgba(239, 68, 68, 0.5), inset 0 0 20px rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    <div 
                      className="absolute inset-0 opacity-30"
                      style={{
                        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)',
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 2s infinite'
                      }}
                    />
                    <div className="relative flex items-center justify-center gap-3">
                      <Square size={22} className="text-white" />
                      <span className="text-white font-black text-xl uppercase tracking-wider">
                        End Auction & Close
                      </span>
                    </div>
                  </button>
                )}
              </div>
            ) : (
              // Ready to Start State - Show Overview
              <div className="text-center px-6">
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 bg-pink-500/10 blur-2xl"></div>
                  <Gavel size={80} className="relative text-pink-600/40" />
                </div>
                <h2 className="text-3xl font-black text-gray-500 tracking-wide mb-3">
                  Ready to Start Auction
                </h2>
                <p className="text-gray-600 text-lg mb-6">
                  Select a player to begin the bidding process
                </p>

                {/* Stats Preview */}
                <div className="grid grid-cols-3 gap-6 mb-8 max-w-2xl mx-auto">
                  <div className="p-6 rounded-xl" style={{
                    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(22, 163, 74, 0.1) 100%)',
                    border: '1px solid rgba(34, 197, 94, 0.3)'
                  }}>
                    <div className="text-4xl font-black text-green-400 mb-2">{approvedPlayersOnly.length}</div>
                    <div className="text-sm text-gray-400 uppercase tracking-wider">Total Players</div>
                  </div>
                  <div className="p-6 rounded-xl" style={{
                    background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.1) 0%, rgba(126, 34, 206, 0.1) 100%)',
                    border: '1px solid rgba(147, 51, 234, 0.3)'
                  }}>
                    <div className="text-4xl font-black text-purple-400 mb-2">{approvedTeamsOnly.length}</div>
                    <div className="text-sm text-gray-400 uppercase tracking-wider">Teams</div>
                  </div>
                  <div className="p-6 rounded-xl" style={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%)',
                    border: '1px solid rgba(59, 130, 246, 0.3)'
                  }}>
                    <div className="text-4xl font-black text-blue-400 mb-2">{maxSquadFromConfig}</div>
                    <div className="text-sm text-gray-400 uppercase tracking-wider">Squad Size</div>
                  </div>
                </div>
                
                {onStartAuction && (
                  <button
                    onClick={onStartAuction}
                    className="flex items-center gap-3 px-10 py-4 mx-auto
                               bg-gradient-to-r from-pink-600 to-pink-500
                               border border-pink-400/60 rounded-lg
                               text-white font-black uppercase tracking-wider text-lg
                               hover:scale-105 active:scale-95
                               transition-all duration-200
                               shadow-[0_0_30px_rgba(236,72,153,0.4)]"
                  >
                    <Play size={24} />
                    <span>Start Auction</span>
                  </button>
                )}

                {/* Teams Preview - Show first few teams */}
                {approvedTeamsOnly.length > 0 && (
                  <div className="mt-12 max-w-4xl mx-auto">
                    <h3 className="text-lg font-black text-gray-400 mb-4 uppercase tracking-wider">Participating Teams</h3>
                    <div className="grid grid-cols-5 gap-4">
                      {approvedTeamsOnly.slice(0, 10).map(team => (
                        <div
                          key={team.id}
                          className="p-3 rounded-lg"
                          style={{
                            background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(219, 39, 119, 0.1) 100%)',
                            border: '1px solid rgba(236, 72, 153, 0.3)'
                          }}
                        >
                          {team.logo ? (
                            <img src={team.logo} alt={team.name} className="w-12 h-12 mx-auto mb-2 rounded-full object-cover" />
                          ) : (
                            <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-pink-500/20 flex items-center justify-center">
                              <Trophy size={20} className="text-pink-400" />
                            </div>
                          )}
                          <p className="text-xs font-bold text-white text-center truncate">{team.name}</p>
                          <p className="text-[10px] text-gray-400 text-center">{formatBudget(team.remainingBudget || team.budget || 0)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Scrollbar Styles + Custom Animations */}
      <style>{`
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }

        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }

        @keyframes energySweep {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }

        @keyframes scan {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(10px);
          }
        }

        @keyframes stripeMove {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: 32px 32px;
          }
        }

        @keyframes dangerPulse {
          0%, 100% {
            opacity: 0.2;
          }
          50% {
            opacity: 0.4;
          }
        }
      `}</style>

      {/* Player Switch Confirmation Modal */}
      {switchPlayerModal.show && switchPlayerModal.player && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setSwitchPlayerModal({ show: false, player: null })}
          />
          
          {/* Modal - Compact & Rounded */}
          <div 
            className="relative z-10 w-[380px] rounded-2xl overflow-hidden animate-in zoom-in duration-200"
            style={{
              background: 'linear-gradient(135deg, rgba(20, 20, 30, 0.95) 0%, rgba(30, 15, 15, 0.95) 100%)',
              border: '1.5px solid rgba(239, 68, 68, 0.4)',
              boxShadow: '0 0 40px rgba(239, 68, 68, 0.3)'
            }}
          >
            {/* Modal Body - Compact */}
            <div className="px-5 py-6">
              {/* Icon + Title */}
              <div className="flex items-center gap-3 mb-4">
                <div 
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    boxShadow: '0 0 15px rgba(239, 68, 68, 0.3)'
                  }}
                >
                  <AlertTriangle className="text-red-400" size={18} />
                </div>
                <h3 className="text-lg font-black text-red-400 uppercase tracking-wide">
                  Switch Player?
                </h3>
              </div>

              {/* Player Info - Compact */}
              <div 
                className="flex items-center gap-3 p-3 rounded-xl mb-3"
                style={{
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(220, 38, 38, 0.08) 100%)',
                  border: '1px solid rgba(239, 68, 68, 0.2)'
                }}
              >
                {switchPlayerModal.player.photoUrl && (
                  <img
                    src={switchPlayerModal.player.photoUrl}
                    alt={switchPlayerModal.player.name}
                    className="w-12 h-12 rounded-full object-cover border border-red-400/50"
                  />
                )}
                <div className="flex flex-col">
                  <span className="text-lg font-black text-white">
                    {switchPlayerModal.player.name}
                  </span>
                  <span className="text-xs text-gray-400">
                    {switchPlayerModal.player.playerCategory || 'Player'}
                  </span>
                </div>
              </div>
              
              <p className="text-xs text-gray-400 text-center mb-4">
                Current player returns to AVAILABLE
              </p>

              {/* Action Buttons - Compact */}
              <div className="flex gap-3">
                <button
                  onClick={() => setSwitchPlayerModal({ show: false, player: null })}
                  className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm text-gray-300
                             bg-gray-800/50 border border-gray-600/50 hover:bg-gray-700/50
                             transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmPlayerSwitch}
                  className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm text-white uppercase
                             hover:scale-105 active:scale-95
                             transition-all duration-200"
                  style={{
                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.85) 0%, rgba(220, 38, 38, 0.85) 100%)',
                    border: '1px solid rgba(239, 68, 68, 0.5)',
                    boxShadow: '0 0 20px rgba(239, 68, 68, 0.3)'
                  }}
                >
                  Switch
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {/* BID CONFIG EDIT MODAL - Recovery Mode */}
      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {showBidConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div 
            className="relative max-w-lg w-full mx-4 rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(30, 30, 50, 0.98) 0%, rgba(20, 20, 35, 0.98) 100%)',
              border: '2px solid rgba(234, 179, 8, 0.4)',
              boxShadow: '0 0 60px rgba(234, 179, 8, 0.2)'
            }}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-yellow-500/20 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Gavel size={20} className="text-yellow-400" />
                Edit Bid Increments
                <span className="text-xs text-yellow-400/60 font-normal">(Recovery Mode)</span>
              </h3>
              <button
                onClick={() => setShowBidConfigModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <XCircle size={20} />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6 space-y-4">
              <p className="text-yellow-300/70 text-sm">
                Update bid increment buttons. Changes take effect immediately for all users.
              </p>
              
              {/* Increment Inputs */}
              <div className="grid grid-cols-2 gap-3">
                {[0, 1, 2, 3].map((idx) => (
                  <div key={idx} className="space-y-1">
                    <label className="text-yellow-300/60 text-xs">Increment {idx + 1}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-400/60 text-sm">+₹</span>
                      <input
                        type="text"
                        value={editingIncrements[idx] || ''}
                        onChange={(e) => {
                          const newVals = [...editingIncrements];
                          newVals[idx] = e.target.value;
                          setEditingIncrements(newVals);
                        }}
                        disabled={savingBidConfig}
                        placeholder={idx === 0 ? '0.1' : idx === 1 ? '0.25' : idx === 2 ? '0.5' : '1'}
                        className="w-full bg-black/40 border border-yellow-500/30 rounded-lg px-4 py-2.5 pl-9
                                   text-white placeholder-yellow-300/30 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-yellow-300/40 text-xs">{currencyUnit || 'L'}</span>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Unit Conversion Guide */}
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
                <p className="text-yellow-300/80 text-xs leading-relaxed">
                  <span className="font-bold text-yellow-400">Unit Conversion:</span> Values without suffix use the selected unit ({currencyUnit || 'L'}).<br/>
                  <span className="text-yellow-300/60">Examples: 1K = ₹1,000 | 1L = ₹1,00,000 | 1Cr = ₹1,00,00,000</span>
                </p>
              </div>
              
              {/* Custom Increment */}
              <div className="space-y-1">
                <label className="text-yellow-300/60 text-xs flex items-center gap-1">
                  Custom Increment <span className="text-yellow-400">★</span>
                  <span className="text-yellow-300/40">(Optional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-400/60 text-sm">+₹</span>
                  <input
                    type="text"
                    value={editingCustom}
                    onChange={(e) => setEditingCustom(e.target.value)}
                    disabled={savingBidConfig}
                    placeholder="e.g. 0.15 or 15K"
                    className="w-full bg-black/40 border border-yellow-500/30 rounded-lg px-4 py-2.5 pl-9
                               text-white placeholder-yellow-300/30 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-yellow-300/40 text-xs">{currencyUnit || 'L'}</span>
                </div>
              </div>
              
              {/* Messages */}
              {bidConfigMessage && (
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${
                  bidConfigMessage.type === 'error' 
                    ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                    : 'bg-green-500/10 border border-green-500/20 text-green-400'
                }`}>
                  {bidConfigMessage.type === 'error' ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
                  {bidConfigMessage.text}
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 border-t border-yellow-500/20 flex gap-3">
              <button
                onClick={() => setShowBidConfigModal(false)}
                disabled={savingBidConfig}
                className="flex-1 px-4 py-2.5 rounded-lg bg-gray-800/50 border border-gray-600/50 
                           text-gray-300 font-medium hover:bg-gray-700/50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBidConfigFromLiveRoom}
                disabled={savingBidConfig}
                className="flex-1 px-4 py-2.5 rounded-lg font-bold text-white flex items-center justify-center gap-2
                           bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400
                           disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {savingBidConfig ? (
                  <>
                    <Activity size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    Save & Apply
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
