import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, Trophy, DollarSign, Activity,
  Search, User, Home, Radio, ChevronRight,
  TrendingUp, Star, Eye, Shield, FileText, ArrowLeft
} from 'lucide-react';
import { AuctionStatus, MatchData, UserRole, Player, Team } from '../../types';
import { LiveAuctionPage } from './LiveAuctionPage';
import { GuestPlayersPage } from './GuestPlayersPage';
import { GuestTeamsPage } from './GuestTeamsPage';
import { socketService } from '../../services/socketService';

const API_BASE = 'https://us-central1-axilam.cloudfunctions.net/auction';

interface GuestDashboardPageProps {
  setStatus: (status: AuctionStatus) => void;
  currentMatch: MatchData;
  currentUser: { name: string; email: string; role: UserRole };
}

export const GuestDashboardPage: React.FC<GuestDashboardPageProps> = ({ setStatus, currentMatch, currentUser }) => {
  // Navigation
  const [activeSection, setActiveSection] = useState<'overview' | 'players' | 'teams' | 'liveRoom'>('overview');

  // Data states
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  // Live auction states
  const [currentBiddingPlayer, setCurrentBiddingPlayer] = useState<Player | null>(null);
  const [currentBid, setCurrentBid] = useState<number>(0);
  const [leadingTeamName, setLeadingTeamName] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(0);
  const [liveAuctionStatus, setLiveAuctionStatus] = useState<'READY' | 'LIVE' | 'PAUSED' | 'ENDED'>('READY');

  // Search (view-only, no mutation)
  const [searchQuery, setSearchQuery] = useState('');

  // Use the passed currentMatch directly (no resolving needed for guests)
  const activeMatch = currentMatch;

  // Scroll to top on section change
  useEffect(() => {
    const contentDiv = document.querySelector('.guest-content-scroll');
    if (contentDiv) {
      contentDiv.scrollTop = 0;
    }
  }, [activeSection]);

  // Helper: team stats from sold players
  const getTeamStats = (team: Team) => {
    const soldPlayersForTeam = players.filter(p =>
      p.status === 'SOLD' && (p.soldTo === team.id || p.leadingTeamId === team.id)
    );
    const totalSpent = soldPlayersForTeam.reduce((sum, p) => {
      const amount = p.soldAmount || p.soldPrice || p.finalPrice || p.currentBid || p.basePrice || 0;
      return sum + amount;
    }, 0);
    const initialBudget = team.budget || team.initialBudget || 0;
    return {
      squadSize: soldPlayersForTeam.length,
      spent: totalSpent,
      remaining: initialBudget - totalSpent,
      soldPlayers: soldPlayersForTeam
    };
  };

  // Fetch bid history fallback
  const fetchBidHistoryForCurrentPlayer = async (playerId: string) => {
    if (!activeMatch?.id || !playerId) return;
    try {
      const response = await fetch(`${API_BASE}/bids?seasonId=${activeMatch.id}&playerId=${playerId}`);
      if (response.ok) {
        const data = await response.json();
        const bids = data.data || [];
        const sortedBids = bids.sort((a: any, b: any) => {
          const timeA = new Date(a.timestamp || 0).getTime();
          const timeB = new Date(b.timestamp || 0).getTime();
          return timeB - timeA;
        });
        if (sortedBids.length > 0) {
          setCurrentBid(sortedBids[0].amount);
          setLeadingTeamName(sortedBids[0].teamName);
        }
      }
    } catch (error) {
      console.error('Failed to fetch bid history:', error);
    }
  };

  // Fetch initial data via REST
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!activeMatch?.id) {
          setLoading(false);
          return;
        }
        setLoading(true);
        const matchQuery = `?matchId=${activeMatch.id}`;

        const [teamsRes, playersRes] = await Promise.all([
          fetch(`${API_BASE}/teams${matchQuery}`),
          fetch(`${API_BASE}/players${matchQuery}`)
        ]);

        if (teamsRes.ok) {
          const data = await teamsRes.json();
          const teamsWithSquadSize = (data.data || []).map((team: Team) => ({
            ...team,
            squadSize: team.playerIds?.length || 0
          }));
          setTeams(teamsWithSquadSize);
        }

        if (playersRes.ok) {
          const data = await playersRes.json();
          setPlayers(data.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeMatch?.id]);

  // Real-time listeners (socket + Firebase)
  useEffect(() => {
    if (!currentUser?.email || !activeMatch?.id) return;

    const seasonId = activeMatch.id;
    socketService.connect();
    socketService.joinSeason(seasonId, currentUser.email, UserRole.GUEST);

    const unsubscribers: (() => void)[] = [];

    // Players real-time
    unsubscribers.push(socketService.onPlayersUpdate(seasonId, (updatedPlayers) => {
      setPlayers(updatedPlayers);
      const livePlayer = updatedPlayers.find((p: any) => p.status === 'LIVE' || p.status === 'PENDING');
      if (livePlayer) {
        setCurrentBiddingPlayer(livePlayer);
        setCurrentBid(livePlayer.currentBid || livePlayer.basePrice || 0);
        setLeadingTeamName(livePlayer.leadingTeamName || '');
        setLiveAuctionStatus('LIVE');
      } else {
        const hasProcessed = updatedPlayers.some((p: any) => p.status === 'SOLD' || p.status === 'UNSOLD');
        if (hasProcessed && liveAuctionStatus !== 'ENDED') {
          setCurrentBiddingPlayer(null);
        }
      }
    }));

    // Teams real-time
    unsubscribers.push(socketService.onTeamsUpdate(seasonId, (updatedTeams) => {
      const teamsWithSquadSize = updatedTeams.map((team: Team) => ({
        ...team,
        squadSize: team.playerIds?.length || 0
      }));
      setTeams(teamsWithSquadSize);
    }));

    // Bids
    unsubscribers.push(socketService.onNewBid((bidData) => {
      if (bidData.amount) {
        setCurrentBid(bidData.amount);
        setLeadingTeamName(bidData.teamName);
      }
    }));

    // Auction state
    unsubscribers.push(socketService.onAuctionStateUpdate((data: any) => {
      console.log('[Guest] Auction state update:', data);
      if (data.status) {
        const s = (data.status || '').toUpperCase();
        if (['LIVE', 'PAUSED', 'READY', 'ENDED'].includes(s)) {
          setLiveAuctionStatus(s as any);
        }
      }
      if (data.remainingSeconds !== undefined) setCountdown(data.remainingSeconds);
      
      // If auction is LIVE and we have a currentPlayerId, fetch the player data from API
      if (data.status === 'LIVE' && data.biddingActive && data.currentPlayerId) {
        console.log('[Guest] Fetching player from API:', data.currentPlayerId);
        fetch(`${API_BASE}/players/${data.currentPlayerId}`)
          .then(res => res.json())
          .then(playerData => {
            if (playerData.success && playerData.data) {
              console.log('✅ [Guest] Fetched player from API:', playerData.data.name);
              setCurrentBiddingPlayer(playerData.data);
              setCurrentBid(playerData.data.currentBid || playerData.data.basePrice || 0);
              setLeadingTeamName(playerData.data.leadingTeamName || '');
              setLiveAuctionStatus('LIVE');
            }
          })
          .catch(err => {
            console.error('❌ [Guest] Error fetching player from API:', err);
          });
      }
    }));

    unsubscribers.push(socketService.onAuctionStarted(() => setLiveAuctionStatus('LIVE')));
    unsubscribers.push(socketService.onAuctionPaused(() => setLiveAuctionStatus('PAUSED')));
    unsubscribers.push(socketService.onAuctionResumed(() => setLiveAuctionStatus('LIVE')));
    unsubscribers.push(socketService.onAuctionEnded(() => setLiveAuctionStatus('ENDED')));

    unsubscribers.push(socketService.onPlayerBiddingStarted((data: any) => {
      if (!data || !data.player) {
        setCurrentBiddingPlayer(null);
        return;
      }
      setCurrentBiddingPlayer(data.player);
      setCurrentBid(data.player?.currentBid || data.basePrice || data.player.basePrice || 0);
      setLeadingTeamName(data.player?.leadingTeamName || '');
      setCountdown(data.duration || 120);
      setLiveAuctionStatus('LIVE');
      fetchBidHistoryForCurrentPlayer(data.player.id);
    }));

    unsubscribers.push(socketService.onPlayerSold(() => {
      setCurrentBiddingPlayer(null);
      setCurrentBid(0);
      setLeadingTeamName('');
    }));

    unsubscribers.push(socketService.onPlayerUnsold(() => {
      setCurrentBiddingPlayer(null);
      setCurrentBid(0);
      setLeadingTeamName('');
    }));

    unsubscribers.push(socketService.onTimerUpdate((data: { remainingSeconds: number }) => {
      setCountdown(data.remainingSeconds);
    }));

    return () => {
      unsubscribers.forEach(u => u());
    };
  }, [currentUser?.email, activeMatch?.id]);

  // KPIs
  const totalTeams = teams.length;
  const totalPlayers = players.length;
  const soldPlayers = players.filter(p => p.status === 'SOLD').length;
  const totalBudget = teams.reduce((acc, team) => acc + (team.budget || team.initialBudget || 0), 0);
  const remainingBudget = teams.reduce((acc, team) => acc + (team.remainingBudget || team.budget || team.initialBudget || 0), 0);
  const spentBudget = totalBudget - remainingBudget;

  // ─────────────────────────────────────── RENDER ────────────────────────────
  return (
    <>
      {/* Loading State */}
      {loading && (
        <div className="h-screen w-screen flex items-center justify-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a0a0a 0%, #2d0a0a 25%, #1a0a12 50%, #0d0d1a 100%)' }}>
          <div className="absolute inset-0 opacity-[0.03]" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 0, 102, 0.3) 2px, rgba(255, 0, 102, 0.3) 4px)' }}></div>
          <div className="text-center relative z-10">
            <div className="relative mx-auto mb-6 w-20 h-20">
              <div className="animate-spin rounded-full h-20 w-20 border-4 border-pink-500/20 border-t-pink-500"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Eye size={28} className="text-pink-400/60" />
              </div>
            </div>
            <p className="text-pink-400 text-lg font-black uppercase tracking-wider">Loading Spectator View</p>
            <div className="mt-3 w-48 h-1 mx-auto bg-pink-900/30 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-pink-500 to-red-500 rounded-full" style={{ animation: 'hud-load 2s ease-in-out infinite' }}></div>
            </div>
            <p className="text-pink-400/40 text-xs mt-2 font-semibold">Preparing read-only dashboard...</p>
          </div>
        </div>
      )}

      {/* Main Dashboard */}
      {!loading && activeMatch && (
        <>
          {/* ─── STYLES (same as Admin) ───────────────────────────────────────── */}
          <style>{`
            .custom-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            .custom-scrollbar::-webkit-scrollbar { display: none; }

            @keyframes neon-pulse {
              0%, 100% { box-shadow: 0 0 10px rgba(255, 0, 102, 0.5), 0 0 30px rgba(255, 0, 102, 0.25), 0 0 60px rgba(255, 0, 102, 0.1); }
              50% { box-shadow: 0 0 20px rgba(255, 0, 102, 0.7), 0 0 50px rgba(255, 0, 102, 0.4), 0 0 90px rgba(255, 0, 102, 0.18); }
            }
            @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
            @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
            @keyframes ring-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            @keyframes pulse-glow { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.9; } }
            @keyframes bg-shift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
            @keyframes hud-blink { 0%, 90%, 100% { opacity: 1; } 95% { opacity: 0.2; } }
            @keyframes neon-border-pulse { 0%, 100% { border-color: rgba(255, 0, 102, 0.15); } 50% { border-color: rgba(255, 0, 102, 0.65); } }
            @keyframes hud-load { 0% { width: 0%; } 100% { width: 100%; } }
            @keyframes holographic-ring {
              0% { transform: rotate(0deg) scale(1); opacity: 0.6; }
              50% { transform: rotate(180deg) scale(1.05); opacity: 1; }
              100% { transform: rotate(360deg) scale(1); opacity: 0.6; }
            }
            @keyframes particle-drift {
              0% { transform: translate(0, 0) scale(1); opacity: 0; }
              20% { opacity: 1; }
              80% { opacity: 0.6; }
              100% { transform: translate(var(--dx, 40px), var(--dy, -60px)) scale(0); opacity: 0; }
            }
            @keyframes light-sweep {
              0% { transform: translateX(-100%) skewX(-15deg); }
              100% { transform: translateX(300%) skewX(-15deg); }
            }
            @keyframes data-stream {
              0% { background-position: 0 0; }
              100% { background-position: 0 -200px; }
            }
            @keyframes energy-flow {
              0% { background-position: 0% 0%; }
              100% { background-position: 0% 200%; }
            }
            @keyframes cardReveal {
              0% { opacity: 0; transform: translateY(20px) scale(0.95); }
              100% { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes glitch-flicker {
              0%, 92%, 94%, 96%, 100% { opacity: 1; }
              93%, 95% { opacity: 0.4; transform: translateX(-2px); }
            }
            @keyframes slideExpand {
              0% { transform: scaleX(0); opacity: 0; }
              100% { transform: scaleX(1); opacity: 1; }
            }
            @keyframes pulseGlow {
              0%, 100% { box-shadow: 0 0 20px rgba(255, 0, 102, 0.4); }
              50% { box-shadow: 0 0 40px rgba(255, 0, 102, 0.8), 0 0 60px rgba(255, 0, 102, 0.4); }
            }

            .neon-pulse { animation: neon-pulse 2s ease-in-out infinite; }
            .float { animation: float 6s ease-in-out infinite; }
            .shimmer { background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent); background-size: 200% 100%; animation: shimmer 3s infinite; }
            .animated-bg { background-size: 400% 400%; animation: bg-shift 15s ease infinite; }
            .glitch-flicker { animation: glitch-flicker 4s ease-in-out infinite; }

            .hud-card {
              background: linear-gradient(135deg, rgba(255, 20, 100, 0.06) 0%, rgba(139, 0, 50, 0.1) 100%);
              backdrop-filter: blur(28px) saturate(1.4);
              border: 1px solid rgba(255, 0, 102, 0.15);
              box-shadow: 0 8px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 0 60px rgba(255, 0, 102, 0.04);
              transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
              position: relative;
            }
            .hud-card::after {
              content: '';
              position: absolute;
              top: 0; left: 0; right: 0;
              height: 1px;
              background: linear-gradient(90deg, transparent 0%, rgba(255, 0, 102, 0.5) 20%, rgba(255, 100, 163, 0.4) 50%, rgba(255, 0, 102, 0.5) 80%, transparent 100%);
              opacity: 0;
              transition: opacity 0.35s;
            }
            .hud-card:hover {
              transform: translateY(-3px);
              box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5), 0 0 40px rgba(255, 0, 102, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.08);
              border-color: rgba(255, 0, 102, 0.4);
            }
            .hud-card:hover::after { opacity: 1; }

            .glass-card {
              background: linear-gradient(135deg, rgba(255, 20, 100, 0.08) 0%, rgba(139, 0, 50, 0.12) 100%);
              backdrop-filter: blur(20px);
              border: 1px solid rgba(255, 0, 102, 0.2);
              box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 0 60px rgba(255, 0, 102, 0.05);
            }
            .glass-card:hover {
              border-color: rgba(255, 0, 102, 0.4);
              box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5), 0 0 80px rgba(255, 0, 102, 0.1);
            }

            .capsule-stat {
              background: linear-gradient(135deg, rgba(255, 20, 100, 0.06), rgba(139, 0, 50, 0.1));
              border: 1px solid rgba(255, 0, 102, 0.18);
              border-radius: 28px;
              padding: 28px 32px;
              position: relative;
              overflow: hidden;
              transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
            }
            .capsule-stat::before {
              content: '';
              position: absolute;
              top: 0; left: -100%; width: 60%; height: 100%;
              background: linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent);
              animation: light-sweep 4s ease-in-out infinite;
            }
            .capsule-stat:hover {
              border-color: rgba(255, 0, 102, 0.45);
              box-shadow: 0 12px 40px rgba(255, 0, 102, 0.15);
              transform: translateY(-3px);
            }

            .mission-widget {
              background: linear-gradient(160deg, rgba(255, 20, 100, 0.05) 0%, rgba(139, 0, 50, 0.08) 100%);
              border: 1px solid rgba(255, 0, 102, 0.15);
              border-radius: 24px;
              position: relative;
              overflow: hidden;
            }
            .mission-widget::before {
              content: '';
              position: absolute;
              top: 0; left: 0;
              width: 4px; height: 100%;
              background: linear-gradient(180deg, rgba(255, 0, 102, 0.9), rgba(255, 100, 163, 0.6), transparent);
            }

            .cyber-button {
              position: relative;
              background: linear-gradient(135deg, rgba(255, 0, 102, 0.9) 0%, rgba(180, 0, 80, 0.9) 100%);
              border: none;
              overflow: hidden;
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .cyber-button::before {
              content: '';
              position: absolute;
              top: 0; left: -100%; width: 100%; height: 100%;
              background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
              transition: left 0.5s;
            }
            .cyber-button:hover::before { left: 100%; }
            .cyber-button:hover {
              transform: scale(1.05);
              box-shadow: 0 0 40px rgba(255, 0, 102, 0.6), 0 0 80px rgba(255, 0, 102, 0.3);
            }

            .view-more-btn {
              position: relative;
              background: linear-gradient(135deg, rgba(255, 0, 102, 0.15) 0%, rgba(180, 0, 80, 0.25) 100%);
              border: 1px solid rgba(255, 0, 102, 0.4);
              overflow: hidden;
              transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .view-more-btn::before {
              content: '';
              position: absolute;
              top: 0; left: -100%; width: 100%; height: 100%;
              background: linear-gradient(90deg, transparent, rgba(255, 0, 102, 0.3), transparent);
              transition: left 0.6s ease;
            }
            .view-more-btn:hover::before { left: 100%; }
            .view-more-btn:hover {
              transform: translateX(8px);
              border-color: rgba(255, 0, 102, 0.8);
              box-shadow: 0 0 30px rgba(255, 0, 102, 0.4), 0 0 60px rgba(255, 0, 102, 0.2);
              animation: pulseGlow 1.5s ease-in-out infinite;
            }
            .view-more-btn .arrow-icon { transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
            .view-more-btn:hover .arrow-icon { transform: translateX(5px); }

            .nav-icon {
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .nav-icon:hover {
              transform: scale(1.2);
              filter: drop-shadow(0 0 12px rgba(255, 0, 102, 0.8));
            }
            .nav-icon.active {
              filter: drop-shadow(0 0 15px rgba(255, 0, 102, 1));
            }

            .neon-glow { animation: neon-pulse 2s ease-in-out infinite; }

            .team-card, .player-card {
              animation: cardReveal 0.5s ease-out forwards;
              opacity: 0;
            }
            .team-card:nth-child(1), .player-card:nth-child(1) { animation-delay: 0.1s; }
            .team-card:nth-child(2), .player-card:nth-child(2) { animation-delay: 0.15s; }
            .team-card:nth-child(3), .player-card:nth-child(3) { animation-delay: 0.2s; }
            .team-card:nth-child(4), .player-card:nth-child(4) { animation-delay: 0.25s; }
            .team-card:nth-child(5), .player-card:nth-child(5) { animation-delay: 0.3s; }
            .team-card:nth-child(6), .player-card:nth-child(6) { animation-delay: 0.35s; }

            .data-stream-bg {
              background-image: repeating-linear-gradient(0deg, transparent, transparent 24px, rgba(255, 0, 102, 0.015) 24px, rgba(255, 0, 102, 0.015) 25px);
              animation: data-stream 8s linear infinite;
            }

            .hero-glow {
              position: absolute;
              width: 500px;
              height: 500px;
              border-radius: 50%;
              background: radial-gradient(circle, rgba(255, 0, 102, 0.25) 0%, transparent 70%);
              filter: blur(80px);
              pointer-events: none;
            }

            ::-webkit-scrollbar { width: 6px; }
            ::-webkit-scrollbar-track { background: rgba(255, 0, 102, 0.05); }
            ::-webkit-scrollbar-thumb { background: rgba(255, 0, 102, 0.3); border-radius: 3px; }
            ::-webkit-scrollbar-thumb:hover { background: rgba(255, 0, 102, 0.5); }
          `}</style>

          <div className="h-screen flex overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #1a0a0a 0%, #2d0a0a 25%, #1a0a12 50%, #0d0d1a 100%)' }}>
            {/* Ambient hero glow effects */}
            <div className="hero-glow" style={{ top: '5%', right: '15%' }}></div>
            <div className="hero-glow" style={{ bottom: '15%', left: '8%', opacity: 0.4 }}></div>
            {/* Warm animated background */}
            <div className="absolute inset-0 opacity-25 animated-bg pointer-events-none" style={{ background: 'radial-gradient(ellipse at 20% 50%, rgba(255, 0, 102, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(249, 115, 22, 0.08) 0%, transparent 40%), radial-gradient(ellipse at 50% 80%, rgba(255, 0, 102, 0.06) 0%, transparent 50%)', backgroundSize: '400% 400%' }}></div>
            {/* Subtle scan lines */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.015]" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(255, 0, 102, 0.12) 4px, rgba(255, 0, 102, 0.12) 5px)' }}></div>
            {/* Data stream overlay */}
            <div className="absolute inset-0 pointer-events-none data-stream-bg opacity-30"></div>

            {/* ─── CYBER SIDEBAR — Guest Vertical Spine ─────────────────────────── */}
            <div className="fixed left-8 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center">
              {/* Decorative slash lines — Top */}
              <div className="flex flex-col items-center mb-4">
                <div className="w-0.5 h-16 rounded-full" style={{ background: 'linear-gradient(180deg, transparent, rgba(255, 0, 102, 0.8), transparent)' }}></div>
                <div className="relative h-8 w-12 flex items-center justify-center">
                  <div className="absolute w-[70px] h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(255, 0, 102, 0.6), transparent)', transform: 'rotate(-45deg)' }}></div>
                  <div className="absolute w-[55px] h-[1px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(255, 100, 163, 0.35), transparent)', transform: 'rotate(-45deg)', marginTop: '10px' }}></div>
                </div>
              </div>

              {/* Main Pill Dock */}
              <div className="relative">
                <div className="w-14 py-6 rounded-full glass-card flex flex-col items-center gap-4">
                  {(() => {
                    const navItems = [
                      { id: 'overview', icon: <Home size={20} />, label: 'Home' },
                      { id: 'players', icon: <Users size={20} />, label: 'Players' },
                      { id: 'teams', icon: <Trophy size={20} />, label: 'Teams' },
                      { id: 'liveRoom', icon: <Radio size={20} />, label: 'Live Room' },
                    ];
                    const activeNavIndex = navItems.findIndex(n => n.id === activeSection);
                    return (
                      <>
                        {navItems.map((item) => (
                          <div key={item.id} className="relative">
                            <button
                              onClick={() => setActiveSection(item.id as any)}
                              className={`nav-icon w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                                activeSection === item.id
                                  ? 'active bg-gradient-to-br from-pink-500/40 to-red-600/40 text-pink-400'
                                  : 'text-pink-300/60 hover:text-pink-400 hover:bg-pink-500/10'
                              }`}
                              title={item.label}
                            >
                              {item.icon}
                            </button>
                          </div>
                        ))}
                        {/* Active Indicator Line */}
                        {activeNavIndex >= 0 && (
                          <div
                            className="absolute -right-3 w-1 h-8 bg-gradient-to-b from-pink-500 to-red-500 rounded-full transition-all duration-300 neon-glow"
                            style={{ top: `${24 + activeNavIndex * 56}px` }}
                          ></div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Spectator badge instead of Logout */}
              <div className="mt-4 w-10 h-10 rounded-xl flex items-center justify-center text-pink-400/40" title="Spectator Mode">
                <Eye size={18} />
              </div>

              {/* Decorative slash lines — Bottom */}
              <div className="flex flex-col items-center mt-4">
                <div className="relative h-8 w-12 flex items-center justify-center">
                  <div className="absolute w-[70px] h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(255, 0, 102, 0.6), transparent)', transform: 'rotate(45deg)' }}></div>
                  <div className="absolute w-[55px] h-[1px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(255, 100, 163, 0.35), transparent)', transform: 'rotate(45deg)', marginTop: '-10px' }}></div>
                </div>
                <div className="w-0.5 h-16 rounded-full" style={{ background: 'linear-gradient(180deg, rgba(255, 0, 102, 0.8), transparent)' }}></div>
              </div>
            </div>

            {/* ─── MAIN CONTENT AREA ──────────────────────────────────────────── */}
            <div className="ml-28 min-h-screen flex flex-col flex-1">
              {/* TOP COMMAND BAR */}
              <div className="mx-8 mt-6 sticky top-6 z-20">
                <div className="relative rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(90deg, rgba(26, 10, 10, 0.96), rgba(45, 10, 10, 0.92), rgba(26, 10, 10, 0.96))', border: '1px solid rgba(255, 0, 102, 0.15)', boxShadow: '0 8px 48px rgba(0, 0, 0, 0.5), 0 0 60px rgba(255, 0, 102, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.04)' }}>
                  {/* Top edge glow */}
                  <div className="absolute top-0 left-[10%] right-[10%] h-[1px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(255, 0, 102, 0.7), rgba(255, 100, 163, 0.5), rgba(255, 0, 102, 0.7), transparent)' }}></div>
                  <div className="px-8 py-4 flex items-center justify-between gap-6">
                    {/* Left: Back Button + Title + Status */}
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <button
                        onClick={() => setStatus(AuctionStatus.MARKETPLACE)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-pink-300 hover:text-white hover:bg-pink-500/10 transition-all font-bold text-sm"
                        title="Back to Auctions"
                      >
                        <ArrowLeft size={18} />
                        <span className="hidden sm:inline">Go Back</span>
                      </button>
                      <div className="w-[4px] h-11 rounded-full" style={{ background: 'linear-gradient(180deg, rgba(255, 0, 102, 0.9), rgba(249, 115, 22, 0.7))' }}></div>
                      <div>
                        <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-red-400 to-orange-400 uppercase tracking-[0.2em] leading-tight glitch-flicker">
                          Spectator View
                        </h2>
                        <p className="text-[10px] text-pink-400/40 font-bold uppercase tracking-[0.3em] mt-0.5">
                          {activeMatch?.name || 'No Season'} <span className="text-red-400/30">|</span> {activeMatch?.sport || 'Cricket'} <span className="text-red-400/30">|</span> {activeMatch?.year || new Date().getFullYear()}
                        </p>
                      </div>
                    </div>

                    {/* Center: Search (read-only filtering) */}
                    <div className="flex-1 max-w-lg mx-4">
                      <div className="relative group">
                        <div className="absolute -inset-[1px] rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity" style={{ background: 'linear-gradient(90deg, rgba(255, 0, 102, 0.4), rgba(249, 115, 22, 0.3), rgba(255, 0, 102, 0.4))' }}></div>
                        <div className="relative">
                          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-400/30" />
                          <input
                            type="text"
                            placeholder="Search players, teams..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-5 py-2.5 rounded-xl text-sm font-semibold text-pink-100 placeholder-pink-400/25 transition-all focus:outline-none"
                            style={{ background: 'rgba(255, 0, 102, 0.05)', border: '1px solid rgba(255, 0, 102, 0.12)' }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right: Live Room + Spectator Badge (no profile/auth) */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <button
                        onClick={() => setActiveSection('liveRoom')}
                        className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-sm transition-all ${
                          activeSection === 'liveRoom'
                            ? 'text-white neon-pulse'
                            : 'text-red-400/70 hover:text-red-400'
                        }`}
                        style={{
                          background: activeSection === 'liveRoom' ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.6), rgba(249, 115, 22, 0.5))' : 'rgba(239, 68, 68, 0.06)',
                          border: `1px solid ${activeSection === 'liveRoom' ? 'rgba(239, 68, 68, 0.5)' : 'rgba(239, 68, 68, 0.15)'}`,
                        }}
                      >
                        <Radio size={15} className={liveAuctionStatus === 'LIVE' ? 'animate-pulse' : ''} />
                        <span className="hidden xl:inline">LIVE ROOM</span>
                      </button>

                      {/* Spectator Badge (replaces profile ring) */}
                      <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ background: 'rgba(255, 0, 102, 0.06)', border: '1px solid rgba(255, 0, 102, 0.15)' }}>
                        <Eye size={15} className="text-pink-400/60" />
                        <span className="text-pink-300/60 text-xs font-bold uppercase tracking-wider hidden xl:inline">Spectator</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ─── DYNAMIC CONTENT SECTIONS ─────────────────────────────────── */}
              <div className="px-8 py-8 pb-20 overflow-y-auto h-[calc(100vh-7rem)] guest-content-scroll custom-scrollbar">

                {/* 1. OVERVIEW — Same as Admin Home (view-only) */}
                {activeSection === 'overview' && (
                  <div className="animate-in fade-in duration-500 flex flex-col gap-6">
                    <div className="grid grid-cols-12 gap-6">
                      {/* ROW 1: HERO CARD */}
                      <div className="col-span-8">
                        <div className="h-full glass-card rounded-3xl overflow-hidden relative group transition-all duration-500" style={{ minHeight: '320px' }}>
                          <div className="absolute inset-0 bg-gradient-to-br from-pink-600/20 via-red-900/30 to-purple-900/20"></div>
                          <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
                            <svg className="absolute right-0 top-0 h-full" viewBox="0 0 500 400" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMaxYMid slice" style={{ width: '55%', opacity: 0.9 }}>
                              <polygon points="200,0 500,0 500,400 280,400 160,250" fill="url(#guestHeroGrad1)" />
                              <polygon points="250,0 500,0 500,350 320,400 220,220" fill="url(#guestHeroGrad2)" />
                              <rect x="180" y="0" width="4" height="500" transform="rotate(15 180 0)" fill="rgba(255,0,102,0.4)" />
                              <rect x="210" y="-20" width="2" height="500" transform="rotate(15 210 0)" fill="rgba(255,0,102,0.25)" />
                              <rect x="240" y="-40" width="1.5" height="500" transform="rotate(15 240 0)" fill="rgba(255,0,102,0.15)" />
                              <polygon points="350,30 500,30 500,180 380,200" fill="rgba(255,20,100,0.08)" stroke="rgba(255,0,102,0.2)" strokeWidth="1" />
                              <polygon points="400,180 500,150 500,320 420,340" fill="rgba(200,50,120,0.06)" stroke="rgba(255,0,102,0.15)" strokeWidth="0.5" />
                              <polygon points="420,90 450,60 480,90 450,120" fill="rgba(255,0,102,0.15)" stroke="rgba(255,0,102,0.5)" strokeWidth="1.5" />
                              <polygon points="350,250 370,230 390,250 370,270" fill="rgba(255,0,102,0.1)" stroke="rgba(255,0,102,0.35)" strokeWidth="1" />
                              <polygon points="460,200 475,185 490,200" fill="rgba(255,100,160,0.12)" />
                              <polygon points="300,320 320,300 340,330" fill="rgba(255,100,160,0.08)" />
                              <line x1="260" y1="100" x2="500" y2="100" stroke="rgba(255,0,102,0.12)" strokeWidth="0.5" />
                              <line x1="280" y1="200" x2="500" y2="200" stroke="rgba(255,0,102,0.08)" strokeWidth="0.5" />
                              <line x1="300" y1="300" x2="500" y2="300" stroke="rgba(255,0,102,0.1)" strokeWidth="0.5" />
                              {[320,360,400,440,480].map(x => [60,120,180,240,300,360].map(y => (
                                <circle key={`${x}-${y}`} cx={x} cy={y} r="1" fill="rgba(255,0,102,0.15)" />
                              )))}
                              <defs>
                                <linearGradient id="guestHeroGrad1" x1="200" y1="0" x2="500" y2="400" gradientUnits="userSpaceOnUse">
                                  <stop offset="0%" stopColor="rgba(255,0,102,0.18)" />
                                  <stop offset="50%" stopColor="rgba(180,0,80,0.22)" />
                                  <stop offset="100%" stopColor="rgba(100,0,50,0.28)" />
                                </linearGradient>
                                <linearGradient id="guestHeroGrad2" x1="250" y1="0" x2="500" y2="400" gradientUnits="userSpaceOnUse">
                                  <stop offset="0%" stopColor="rgba(255,20,100,0.1)" />
                                  <stop offset="100%" stopColor="rgba(139,0,50,0.2)" />
                                </linearGradient>
                              </defs>
                            </svg>
                            <div className="absolute -right-10 top-1/2 -translate-y-1/2 w-80 h-80 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,0,102,0.2) 0%, transparent 70%)', filter: 'blur(40px)' }} />
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent" />
                          <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="relative h-full p-8 flex flex-col justify-between z-10">
                            <div>
                              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4 ${
                                liveAuctionStatus === 'ENDED' ? 'bg-green-500/20 border border-green-500/30' :
                                liveAuctionStatus === 'LIVE' ? 'bg-red-500/20 border border-red-500/30' :
                                'bg-pink-500/20 border border-pink-500/30'
                              }`}>
                                <div className={`w-2 h-2 rounded-full animate-pulse ${
                                  liveAuctionStatus === 'ENDED' ? 'bg-green-500' :
                                  liveAuctionStatus === 'LIVE' ? 'bg-red-500' : 'bg-pink-500'
                                }`}></div>
                                <span className={`text-xs font-bold tracking-wider uppercase ${
                                  liveAuctionStatus === 'ENDED' ? 'text-green-300' :
                                  liveAuctionStatus === 'LIVE' ? 'text-red-300' : 'text-pink-300'
                                }`}>
                                  {liveAuctionStatus === 'ENDED' ? 'Auction Ended' : liveAuctionStatus === 'LIVE' ? 'Live Now' : 'Ready to Start'}
                                </span>
                              </div>
                              <h2 className="text-4xl font-black text-white mb-2">{activeMatch?.name || 'No Active Auction'}</h2>
                              <p className="text-pink-200/60 text-lg">{activeMatch?.year || new Date().getFullYear()} Season</p>
                              {activeMatch?.place && (
                                <p className="text-pink-300/50 text-sm mt-1.5 flex items-center gap-1.5">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pink-400/60"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                  {activeMatch.place}
                                </p>
                              )}
                            </div>
                            <div className="flex items-end justify-between">
                              <div className="flex gap-4">
                                {liveAuctionStatus === 'LIVE' ? (
                                  <button onClick={() => setActiveSection('liveRoom')} className="cyber-button px-6 py-3 rounded-full text-white font-black tracking-wider flex items-center gap-2.5 text-sm">
                                    <Radio size={18} /> WATCH LIVE
                                  </button>
                                ) : liveAuctionStatus === 'ENDED' ? (
                                  <button onClick={() => setActiveSection('players')} className="cyber-button px-6 py-3 rounded-full text-white font-black tracking-wider flex items-center gap-2.5 text-sm" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                                    <FileText size={18} /> VIEW RESULTS
                                  </button>
                                ) : (
                                  <button onClick={() => setActiveSection('liveRoom')} className="cyber-button px-6 py-3 rounded-full text-white font-black tracking-wider flex items-center gap-2.5 text-sm">
                                    <Radio size={18} /> OPEN LIVE ROOM
                                  </button>
                                )}
                                <button onClick={() => setActiveSection('teams')} className="px-5 py-3 rounded-full bg-white/5 border border-pink-500/20 text-pink-300 hover:bg-pink-500/10 transition-all font-bold tracking-wider text-sm">
                                  VIEW TEAMS
                                </button>
                              </div>
                              <div className="flex gap-6">
                                <div className="text-right">
                                  <p className="text-pink-400/60 text-xs uppercase tracking-wider">Teams</p>
                                  <p className="text-2xl font-black text-white">{totalTeams}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-pink-400/60 text-xs uppercase tracking-wider">Players</p>
                                  <p className="text-2xl font-black text-white">{totalPlayers}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* LIVE BIDDING PLAYER CARD */}
                      <div className="col-span-4">
                        <div className="rounded-3xl overflow-hidden relative h-full" style={{ minHeight: '320px' }}>
                          {currentBiddingPlayer && liveAuctionStatus === 'LIVE' ? (
                            <>
                              <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: currentBiddingPlayer.imageUrl ? `url(${currentBiddingPlayer.imageUrl})` : 'linear-gradient(135deg, rgba(245, 158, 11, 0.3), rgba(217, 119, 6, 0.3))' }} />
                              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                              <div className="relative h-full flex flex-col justify-between p-5 z-10">
                                <div className="flex justify-between items-start">
                                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/90 border border-red-400 shadow-lg" style={{ boxShadow: '0 0 15px rgba(239, 68, 68, 0.4)' }}>
                                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                    <span className="text-white text-[10px] font-black tracking-wider uppercase">LIVE FOR BIDDING</span>
                                  </div>
                                </div>
                                <div>
                                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/80 border border-amber-400/50 mb-2">
                                    <span className="text-white text-[10px] font-bold tracking-wider uppercase">{currentBiddingPlayer.role || 'PLAYER'}</span>
                                  </div>
                                  <h2 className="text-xl font-black text-white mb-1" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>{currentBiddingPlayer.name}</h2>
                                  <p className="text-amber-300 text-xs font-medium">Base Price: ₹{((currentBiddingPlayer.basePrice || 0) / 100000).toFixed(1)}L</p>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="h-full glass-card rounded-3xl flex flex-col items-center justify-center p-6 border border-amber-500/20" style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(217, 119, 6, 0.05))' }}>
                              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center mb-4 border border-amber-500/30">
                                <Activity size={36} className="text-amber-400/60" />
                              </div>
                              <h3 className="text-lg font-bold text-white mb-2">{liveAuctionStatus === 'ENDED' ? 'Auction Ended' : 'Waiting for Bidding'}</h3>
                              <p className="text-amber-400/60 text-sm text-center">{liveAuctionStatus === 'ENDED' ? 'All players have been auctioned' : liveAuctionStatus === 'LIVE' ? 'Next player loading...' : 'Auction has not started yet'}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ROW 2: REGISTERED TEAMS (view-only, no "Add Team" or "Manage") */}
                      <div className="col-span-8">
                        <div className="glass-card rounded-3xl p-5">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                              <Users size={18} className="text-pink-400" />
                              Registered Teams
                              <span className="text-pink-400/60 text-sm font-normal">({teams.length})</span>
                            </h3>
                            <button
                              onClick={() => setActiveSection('teams')}
                              className="text-pink-400 hover:text-pink-300 text-xs flex items-center gap-1 transition-all font-medium"
                            >
                              View More <ChevronRight size={14} />
                            </button>
                          </div>

                          {teams.length > 0 ? (
                            <div className="grid grid-cols-2 gap-4">
                              {teams.slice(0, 4).map((team) => (
                                <div key={team.id} className="team-card glass-card rounded-2xl p-3 transition-all duration-300 cursor-pointer group border border-pink-500/10 hover:border-pink-500/30">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500/20 to-red-600/20 flex items-center justify-center overflow-hidden border border-pink-500/20 flex-shrink-0">
                                      {team.logo ? (
                                        <img src={team.logo} alt={team.name} className="w-full h-full object-cover" />
                                      ) : (
                                        <Users size={18} className="text-pink-400" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h4 className="text-white font-bold text-sm group-hover:text-pink-300 transition-colors truncate">{team.name}</h4>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs font-medium text-pink-400/80">
                                          ₹{((team.remainingBudget || team.budget || 0) / 10000000).toFixed(1)}Cr
                                        </span>
                                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-pink-500/20 text-pink-400">
                                          {getTeamStats(team).squadSize} Players
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex items-center justify-center py-8">
                              <Users size={32} className="text-pink-400/30 mr-3" />
                              <p className="text-pink-300/60 text-sm">No teams registered</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* QUICK INFO (replaces Admin Quick Actions — view-only, navigation only) */}
                      <div className="col-span-4">
                        <div className="glass-card rounded-3xl p-5 h-full">
                          <h3 className="text-lg font-bold text-white mb-4">Quick Links</h3>
                          <div className="flex flex-col gap-3">
                            {liveAuctionStatus === 'LIVE' ? (
                              <button
                                onClick={() => setActiveSection('liveRoom')}
                                className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-red-500/20 to-rose-600/20 border border-red-500/30 text-red-300 hover:border-red-500/50 hover:bg-red-500/30 transition-all flex items-center justify-center gap-3 font-medium"
                              >
                                <Radio size={18} className="animate-pulse" />
                                Watch Live Auction
                              </button>
                            ) : (
                              <button
                                onClick={() => setActiveSection('liveRoom')}
                                className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-pink-500/20 to-red-600/20 border border-pink-500/30 text-pink-300 hover:border-pink-500/50 hover:bg-pink-500/30 transition-all flex items-center justify-center gap-3 font-medium"
                              >
                                <Radio size={18} />
                                Open Live Room
                              </button>
                            )}
                            <button
                              onClick={() => setActiveSection('players')}
                              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-pink-500/10 text-pink-300/80 hover:border-pink-500/30 hover:bg-white/10 transition-all flex items-center justify-center gap-3 font-medium"
                            >
                              <Users size={18} />
                              Browse Players
                            </button>
                            <button
                              onClick={() => setActiveSection('teams')}
                              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-pink-500/10 text-pink-300/80 hover:border-pink-500/30 hover:bg-white/10 transition-all flex items-center justify-center gap-3 font-medium"
                            >
                              <Trophy size={18} />
                              Browse Teams
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* ROW 3: PLAYERS GRID (view-only) */}
                      <div className="col-span-12 mt-4">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-xl font-bold text-white flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/30 to-red-600/30 flex items-center justify-center">
                              <User size={20} className="text-pink-400" />
                            </div>
                            Registered Players
                            <span className="text-pink-400/60 text-sm font-normal ml-2">
                              ({players.length} total)
                            </span>
                          </h3>
                          <button
                            onClick={() => setActiveSection('players')}
                            className="view-more-btn px-6 py-3 rounded-full text-pink-300 font-bold tracking-wider flex items-center gap-2"
                          >
                            View All Players
                            <ChevronRight size={18} className="arrow-icon" />
                          </button>
                        </div>

                        {players.length > 0 ? (
                          <div className="grid grid-cols-6 gap-4">
                            {players.slice(0, 12).map((player, idx) => (
                              <div key={player.id || idx} className="player-card glass-card rounded-2xl p-4 transition-all duration-300 cursor-pointer group text-center">
                                <div className="relative w-20 h-20 mx-auto mb-3">
                                  <div className="w-full h-full rounded-full bg-gradient-to-br from-pink-500/20 to-red-600/20 flex items-center justify-center overflow-hidden border-2 border-pink-500/30 group-hover:border-pink-500/60 transition-all">
                                    {player.imageUrl ? (
                                      <img src={player.imageUrl} alt={player.name} className="w-full h-full object-cover" />
                                    ) : (
                                      <User size={32} className="text-pink-400" />
                                    )}
                                  </div>
                                  <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                    player.status === 'SOLD'
                                      ? 'bg-green-500 text-white'
                                      : player.status === 'UNSOLD'
                                      ? 'bg-red-500 text-white'
                                      : 'bg-pink-500 text-white'
                                  }`}>
                                    {player.status === 'SOLD' ? '✓' : player.status === 'UNSOLD' ? '✗' : '●'}
                                  </div>
                                </div>
                                <h4 className="text-white font-bold text-sm mb-1 group-hover:text-pink-300 transition-colors truncate">{player.name}</h4>
                                <p className="text-pink-400/60 text-xs mb-2 truncate">{player.role || 'Player'}</p>
                                <div className="flex items-center justify-center gap-1">
                                  <Star size={12} className="text-pink-400" />
                                  <span className="text-pink-300 text-xs font-medium">
                                    ₹{((player.basePrice || 0) / 100000).toFixed(0)}L
                                  </span>
                                </div>
                                {player.status === 'SOLD' && player.soldAmount && (
                                  <div className="mt-2 flex items-center justify-center gap-1 text-green-400">
                                    <TrendingUp size={12} />
                                    <span className="text-xs font-bold">₹{((player.soldAmount || 0) / 100000).toFixed(0)}L</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="glass-card rounded-2xl p-10 text-center">
                            <User size={48} className="text-pink-400/30 mx-auto mb-4" />
                            <p className="text-pink-300/60">No players registered yet</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. PLAYERS — Delegate to GuestPlayersPage (view-only) */}
                {activeSection === 'players' && (
                  <GuestPlayersPage
                    onClose={() => setActiveSection('overview')}
                    currentMatch={currentMatch}
                  />
                )}

                {/* 3. TEAMS — Delegate to GuestTeamsPage (view-only) */}
                {activeSection === 'teams' && (
                  <GuestTeamsPage
                    onClose={() => setActiveSection('overview')}
                    currentMatch={currentMatch}
                  />
                )}

              </div>
            </div>
          </div>

          {/* Full-Screen Live Room — No Sidebar, No Topbar (Spectator Mode) */}
          {activeSection === 'liveRoom' && activeMatch && (
            <div className="fixed inset-0 z-[60] bg-black animate-in fade-in duration-500">
              <LiveAuctionPage
                seasonId={activeMatch.id}
                userId={currentUser.email}
                userRole={UserRole.GUEST}
                onClose={() => setActiveSection('overview')}
              />
              <button
                onClick={() => setActiveSection('overview')}
                className="absolute top-4 left-4 z-10 flex items-center gap-2.5 px-6 py-3 rounded-xl text-white font-black text-sm transition-all hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 0, 102, 0.7), rgba(249, 115, 22, 0.6))',
                  border: '1px solid rgba(255, 0, 102, 0.4)',
                  backdropFilter: 'blur(8px)',
                  boxShadow: '0 4px 20px rgba(255, 0, 102, 0.3)',
                }}
              >
                <ArrowLeft size={20} />
                Back to Dashboard
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
};
