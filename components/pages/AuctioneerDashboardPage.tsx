import React, { useState, useEffect, useMemo } from 'react';
import { LogOut, Radio, ArrowLeft, Zap, Users, Trophy, Activity, Settings, Home, Play, ChevronRight, ChevronDown, ChevronUp, User, UserCheck, Wallet, Star, TrendingUp, FileText, BarChart3, Clock, CheckCircle, XCircle, AlertCircle, Square, Shield, Search, Download, Filter, X, IndianRupee, Target, History, Plus, Upload, Loader2, FileText as FileIcon, Image, Ban, Check } from 'lucide-react';
import { AuctionStatus, MatchData, UserRole, Team, Player, ApprovalStatus } from '../../types';
import { LiveAuctionPage } from './LiveAuctionPage';
import { PlayersPage } from './PlayersPage';
import { PlayerApplicationsPage } from './PlayerApplicationsPage';
import { AuctionResultsPage } from './AuctionResultsPage';
import { TeamSquadPage } from './TeamSquadPage';
import { TeamHUDCard } from '../ui/TeamHUDCard';
import { AuctionCountdown } from '../ui/AuctionCountdown';
import { AuctionDateSettings } from '../ui/AuctionDateSettings';
import { BackupRestoreSection } from '../ui/BackupRestoreSection';
import { socketService } from '../../services/socketService';
import { registerTeam, registerPlayer } from '../../services/apiService';
import { uploadTeamLogo, uploadDocument, uploadPlayerPhoto } from '../../services/firebaseStorageService';
import { firestore } from '../../services/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

const API_BASE = 'https://us-central1-axilam.cloudfunctions.net/auction';

// ─── Bidding History Page ────────────────────────────────────────────────────
interface BidRecord {
  id: string;
  teamName: string;
  teamId: string;
  amount: number;
  timestamp: string;
  playerName?: string;
}

const BiddingHistoryPage: React.FC<{
  player: Player;
  seasonId: string;
  onBack: () => void;
}> = ({ player, seasonId, onBack }) => {
  const [bids, setBids] = React.useState<BidRecord[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchBids = async () => {
      try {
        const res = await fetch(`${API_BASE}/bids?seasonId=${seasonId}&playerId=${player.id}`);
        if (res.ok) {
          const data = await res.json();
          const list: BidRecord[] = data.data || data || [];
          list.sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));
          setBids(list);
        }
      } catch (e) {
        console.error('Failed to fetch bid history:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchBids();
  }, [player.id, seasonId]);

  const fmtCurrency = (v: number) => `₹${((v || 0) / 100000).toFixed(1)}L`;

  const fmtTime = (ts: string) => {
    if (!ts) return '—';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Group bids by team
  const bidsByTeam = React.useMemo(() => {
    const map = new Map<string, BidRecord[]>();
    bids.forEach(bid => {
      const key = bid.teamName || bid.teamId || 'Unknown';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(bid);
    });
    return Array.from(map.entries());
  }, [bids]);

  const soldAmt = (player as any).soldAmount || (player as any).soldPrice || (player as any).currentBid || 0;
  const role = (player as any).roleId || (player as any).role || '';
  const highestBid = bids.length > 0 ? Math.max(...bids.map(b => b.amount)) : 0;

  return (
    <div className="flex-1 p-6 pr-8 pb-14">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(255,20,100,0.25), rgba(200,50,120,0.2))', border: '1px solid rgba(255,0,102,0.5)', boxShadow: '0 0 20px rgba(255,0,102,0.25)' }}
          >
            <History size={22} className="text-pink-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Bidding History</h1>
            <p className="text-pink-300/60 text-sm font-medium mt-0.5">{player.name} — Full Timeline</p>
          </div>
        </div>
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-full text-pink-300 hover:text-white transition-all flex items-center gap-2 text-sm font-bold"
          style={{ background: 'linear-gradient(135deg, rgba(255,20,100,0.12), rgba(200,50,120,0.08))', border: '1px solid rgba(255,0,102,0.3)', boxShadow: '0 0 12px rgba(255,0,102,0.1)' }}
        >
          <ArrowLeft size={16} />
          Back to Reports
        </button>
      </div>

      {/* Player Info Card */}
      <div
        className="rounded-2xl p-6 mb-8 flex items-center gap-5"
        style={{ background: 'linear-gradient(135deg, rgba(255,20,100,0.1), rgba(200,50,120,0.06))', border: '1px solid rgba(255,0,102,0.25)', boxShadow: '0 4px 24px rgba(255,0,102,0.08)' }}
      >
        <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(255,20,100,0.15), rgba(200,50,120,0.1))', border: '2px solid rgba(255,0,102,0.3)' }}>
          {(player as any).imageUrl ? (
            <img src={(player as any).imageUrl} alt={player.name} className="w-full h-full rounded-xl object-cover" />
          ) : (
            <User size={28} className="text-pink-400/60" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-black text-white">{player.name}</h2>
          <div className="flex items-center gap-3 mt-1.5">
            {role && <span className="text-xs text-pink-300/60 uppercase font-bold tracking-wide">{role}</span>}
            <span
              className="px-3 py-1 rounded-full text-xs font-bold uppercase"
              style={
                player.status === 'SOLD'
                  ? { background: 'rgba(255,20,100,0.15)', border: '1px solid rgba(255,0,102,0.3)', color: '#f472b6' }
                  : player.status === 'UNSOLD'
                  ? { background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }
                  : { background: 'rgba(255,20,100,0.1)', border: '1px solid rgba(255,0,102,0.2)', color: '#f9a8d4' }
              }
            >
              {player.status || 'Available'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-8 flex-shrink-0">
          <div className="text-right">
            <p className="text-xs text-pink-300/50 uppercase font-bold tracking-wide">Base Price</p>
            <p className="text-lg font-bold text-pink-300 mt-0.5">{fmtCurrency(player.basePrice)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-pink-300/50 uppercase font-bold tracking-wide">Sold For</p>
            <p className="text-lg font-black text-white mt-0.5">{soldAmt > 0 ? fmtCurrency(soldAmt) : '—'}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-pink-300/50 uppercase font-bold tracking-wide">Total Bids</p>
            <p className="text-lg font-black text-white mt-0.5">{bids.length}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-pink-500/30 border-t-pink-500" />
        </div>
      ) : bids.length === 0 ? (
        <div className="rounded-2xl p-20 text-center" style={{ background: 'linear-gradient(135deg, rgba(255,20,100,0.06), rgba(200,50,120,0.04))', border: '1px dashed rgba(255,0,102,0.2)' }}>
          <History size={48} className="text-pink-400/20 mx-auto mb-4" />
          <p className="text-pink-300/50 text-base font-medium">No bidding history found for this player</p>
        </div>
      ) : (
        <>
          {/* Chronological Timeline */}
          <div className="mb-10">
            <h3 className="text-base font-bold text-pink-300/70 uppercase tracking-wider mb-5 flex items-center gap-2">
              <Clock size={16} className="text-pink-400" />
              Full Timeline · {bids.length} Bid{bids.length !== 1 ? 's' : ''}
            </h3>
            <div className="space-y-3">
              {bids.map((bid, idx) => {
                const isHighest = bid.amount === highestBid;
                const isLast = idx === bids.length - 1;
                return (
                  <div
                    key={bid.id || idx}
                    className="flex items-center gap-5 p-4 rounded-xl transition-all"
                    style={{
                      background: isLast
                        ? 'linear-gradient(135deg, rgba(255,20,100,0.12), rgba(200,50,120,0.08))'
                        : 'linear-gradient(135deg, rgba(255,20,100,0.06), rgba(200,50,120,0.03))',
                      border: isLast ? '1px solid rgba(255,0,102,0.35)' : '1px solid rgba(255,0,102,0.12)',
                      boxShadow: isLast ? '0 0 15px rgba(255,0,102,0.1)' : 'none',
                    }}
                  >
                    {/* Sequence # */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
                      style={{
                        background: isLast
                          ? 'linear-gradient(135deg, rgba(255,0,102,0.3), rgba(200,50,120,0.2))'
                          : 'rgba(255,20,100,0.12)',
                        color: isLast ? '#f472b6' : '#f9a8d4',
                        border: isLast ? '2px solid rgba(255,0,102,0.4)' : '1px solid rgba(255,0,102,0.2)',
                        boxShadow: isLast ? '0 0 12px rgba(255,0,102,0.2)' : 'none',
                      }}
                    >
                      {idx + 1}
                    </div>
                    {/* Team */}
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold text-white truncate">{bid.teamName || 'Unknown Team'}</p>
                      <p className="text-xs text-pink-300/40 mt-0.5">{fmtTime(bid.timestamp)}</p>
                    </div>
                    {/* Amount */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <IndianRupee size={15} className={isHighest ? 'text-red-400/80' : 'text-pink-400/50'} />
                      <span className={`text-lg font-black ${isLast ? 'text-pink-300' : isHighest ? 'text-red-300' : 'text-white/90'}`}>
                        {fmtCurrency(bid.amount)}
                      </span>
                    </div>
                    {/* Tags */}
                    {isLast && (
                      <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, rgba(255,0,102,0.25), rgba(200,50,120,0.15))', border: '1px solid rgba(255,0,102,0.4)', color: '#f472b6' }}>
                        Winner
                      </span>
                    )}
                    {isHighest && !isLast && (
                      <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase flex-shrink-0"
                        style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>
                        Highest
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Team-wise Breakdown */}
          {bidsByTeam.length > 1 && (
            <div>
              <h3 className="text-base font-bold text-pink-300/70 uppercase tracking-wider mb-5 flex items-center gap-2">
                <Trophy size={16} className="text-pink-400" />
                Team-wise Breakdown
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bidsByTeam.map(([teamName, teamBids]) => {
                  const maxBid = Math.max(...teamBids.map(b => b.amount));
                  return (
                    <div
                      key={teamName}
                      className="rounded-xl p-5"
                      style={{ background: 'linear-gradient(135deg, rgba(255,20,100,0.07), rgba(200,50,120,0.04))', border: '1px solid rgba(255,0,102,0.15)' }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-base font-bold text-white">{teamName}</p>
                        <span className="text-xs text-pink-300/50 font-medium">{teamBids.length} bid{teamBids.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="space-y-2.5">
                        {teamBids.map((bid, idx) => (
                          <div key={bid.id || idx} className="flex items-center justify-between py-1">
                            <span className="text-sm text-pink-200/50">{fmtTime(bid.timestamp)}</span>
                            <span className={`text-sm font-bold ${bid.amount === maxBid ? 'text-red-300' : 'text-white/70'}`}>
                              {fmtCurrency(bid.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 pt-3 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,0,102,0.12)' }}>
                        <span className="text-xs text-pink-300/50 uppercase font-bold">Max Bid</span>
                        <span className="text-base font-black text-red-300 flex items-center gap-1">
                          <IndianRupee size={12} />
                          {fmtCurrency(maxBid)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ─── Report Section ──────────────────────────────────────────────────────────
interface ReportTeam extends Team {
  acquiredPlayers: Player[];
  totalSpent: number;
}

const ReportSection: React.FC<{
  teams: ReportTeam[];
  unassignedPlayers: Player[];
  players: Player[];
  currentMatch: MatchData | null;
  soldPlayersCount: number;
  unsoldPlayersCount: number;
  pendingPlayersCount: number;
  totalAmountSpent: number;
  auctionStatus: 'READY' | 'LIVE' | 'PAUSED' | 'ENDED';
  currentBiddingPlayer: Player | null;
  onNavigateHistory: (player: Player) => void;
}> = ({ teams, unassignedPlayers, players, currentMatch, soldPlayersCount, unsoldPlayersCount, pendingPlayersCount, totalAmountSpent, auctionStatus, currentBiddingPlayer, onNavigateHistory }) => {
  const [reportSearch, setReportSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'sold' | 'unsold' | 'available' | 'live'>('all');
  const [teamFilter, setTeamFilter] = React.useState('');
  const [expandedTeams, setExpandedTeams] = React.useState<Record<string, boolean>>({});

  const fmtCurrency = (v: number) => `₹${((v || 0) / 100000).toFixed(1)}L`;
  const fmtCr = (v: number) => `₹${((v || 0) / 10000000).toFixed(2)}Cr`;

  const isLive = auctionStatus === 'LIVE' || auctionStatus === 'PAUSED';
  const isEnded = auctionStatus === 'ENDED';

  const toggleTeam = (id: string) => setExpandedTeams(prev => ({ ...prev, [id]: !prev[id] }));

  // Current highest bid (player with max sold amount among all SOLD players)
  const highestSoldPlayer = React.useMemo(() => {
    let best: Player | null = null;
    let bestAmt = 0;
    players.forEach(p => {
      const amt = (p as any).soldAmount || (p as any).soldPrice || (p as any).currentBid || 0;
      if (amt > bestAmt) { bestAmt = amt; best = p; }
    });
    return best ? { player: best, amount: bestAmt, teamName: teams.find(t => t.acquiredPlayers.some(ap => ap.id === (best as Player).id))?.name || '' } : null;
  }, [players, teams]);

  const auctionedCount = players.filter(p => p.status === 'SOLD' || p.status === 'UNSOLD').length;
  const liveCount = players.filter(p => (p.status as string) === 'LIVE' || p.status === 'PENDING').length;

  // Filter teams
  const filteredTeams = teams.filter(t => {
    if (teamFilter && t.id !== teamFilter) return false;
    if (reportSearch) {
      const q = reportSearch.toLowerCase();
      const nameMatch = t.name.toLowerCase().includes(q);
      const playerMatch = t.acquiredPlayers.some(p => p.name.toLowerCase().includes(q));
      if (!nameMatch && !playerMatch) return false;
    }
    return true;
  });

  // Filter players within a team
  const filterPlayers = (list: Player[]) => {
    return list.filter(p => {
      if (statusFilter === 'sold' && p.status !== 'SOLD') return false;
      if (statusFilter === 'unsold' && p.status !== 'UNSOLD') return false;
      if (statusFilter === 'available' && p.status !== 'AVAILABLE' && p.status !== 'PENDING') return false;
      if (statusFilter === 'live' && (p.status as string) !== 'LIVE') return false;
      if (reportSearch) {
        const q = reportSearch.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !(p.email || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  };

  // CSV export
  const exportCSV = () => {
    try {
      let csv = 'Team,Player,Role,Base Price,Sold Price,Status\n';
      
      // Export filtered teams and players
      const teamsToExport = teamFilter ? teams.filter(t => t.id === teamFilter) : teams;
      
      teamsToExport.forEach(t => {
        const filteredPlayers = filterPlayers(t.acquiredPlayers);
        filteredPlayers.forEach(p => {
          const soldAmt = (p as any).soldAmount || (p as any).soldPrice || (p as any).currentBid || 0;
          csv += `"${t.name}","${p.name}","${(p as any).roleId || ''}","₹${(p.basePrice / 100000).toFixed(1)}L","₹${(soldAmt / 100000).toFixed(1)}L","${p.status}"\n`;
        });
      });
      
      // Export filtered unassigned players
      const filteredUnassigned = filterPlayers(unassignedPlayers);
      filteredUnassigned.forEach(p => {
        csv += `"—","${p.name}","${(p as any).roleId || ''}","₹${(p.basePrice / 100000).toFixed(1)}L","—","${p.status || 'AVAILABLE'}"\n`;
      });
      
      // If no data to export
      if (csv === 'Team,Player,Role,Base Price,Sold Price,Status\n') {
        alert('No players match the current filters.');
        return;
      }
      
      const el = document.createElement('a');
      el.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
      el.setAttribute('download', `${currentMatch?.name || 'report'}_auction_report${isLive ? '_live' : ''}.csv`);
      el.style.display = 'none';
      document.body.appendChild(el);
      el.click();
      document.body.removeChild(el);
    } catch (error) {
      console.error('CSV export error:', error);
      alert('Failed to export CSV. Please try again.');
    }
  };

  // Status pill styling — neon pink palette
  const statusStyle = (status: string) => {
    switch (status) {
      case 'SOLD': return { background: 'rgba(255,20,100,0.18)', border: '1px solid rgba(255,0,102,0.35)', color: '#f472b6' };
      case 'UNSOLD': return { background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' };
      case 'LIVE': return { background: 'rgba(255,0,102,0.12)', border: '1px solid rgba(255,0,102,0.3)', color: '#fb7185' };
      default: return { background: 'rgba(255,20,100,0.08)', border: '1px solid rgba(255,0,102,0.2)', color: '#f9a8d4' };
    }
  };

  return (
    <div className="flex-1 p-6 pr-8 pb-14">
      {/* ─── A. Page Title ─── */}
      <div className="flex items-center justify-between mb-7">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(255,20,100,0.25), rgba(200,50,120,0.2))', border: '1px solid rgba(255,0,102,0.5)', boxShadow: '0 0 20px rgba(255,0,102,0.25)' }}
          >
            <BarChart3 size={22} className="text-pink-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Auction Reports</h1>
            <p className="text-pink-300/60 text-sm font-medium flex items-center gap-2 mt-0.5">
              {isLive ? (
                <><span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Live Auction Report</>
              ) : isEnded ? (
                <><CheckCircle size={13} className="text-pink-400/60" /> Final Auction Report</>
              ) : (
                <>{activeMatch?.name || 'Auction'} — Pre-Auction Overview</>
              )}
            </p>
          </div>
        </div>
        {isLive && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(255,0,102,0.1))', border: '1px solid rgba(239,68,68,0.3)' }}>
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-300 text-xs font-bold uppercase tracking-wider">Live</span>
          </div>
        )}
      </div>

      {/* ─── Top Controls ─── */}
      <div className="flex items-center gap-4 flex-wrap mb-7">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-400/50" />
          <input
            type="text"
            placeholder="Search teams or players..."
            value={reportSearch}
            onChange={(e) => setReportSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl text-sm text-white placeholder-pink-300/40 transition-all duration-300 focus:outline-none"
            style={{ background: 'linear-gradient(135deg, rgba(255,20,100,0.08), rgba(200,50,120,0.05))', border: '1px solid rgba(255,0,102,0.2)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)' }}
            onFocus={(e) => { e.target.style.border = '1px solid rgba(255,0,102,0.5)'; e.target.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.1), 0 0 15px rgba(255,0,102,0.1)'; }}
            onBlur={(e) => { e.target.style.border = '1px solid rgba(255,0,102,0.2)'; e.target.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.1)'; }}
          />
        </div>
        <div className="relative">
          <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)}
            className="pl-4 pr-10 py-3 rounded-xl text-sm text-white appearance-none cursor-pointer focus:outline-none"
            style={{ background: 'linear-gradient(135deg, rgba(255,20,100,0.08), rgba(200,50,120,0.05))', border: '1px solid rgba(255,0,102,0.2)' }}>
            <option value="">All Teams</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-pink-400/50 pointer-events-none" />
        </div>
        <div className="relative">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}
            className="pl-4 pr-10 py-3 rounded-xl text-sm text-white appearance-none cursor-pointer focus:outline-none"
            style={{ background: 'linear-gradient(135deg, rgba(255,20,100,0.08), rgba(200,50,120,0.05))', border: '1px solid rgba(255,0,102,0.2)' }}>
            <option value="all">All Status</option>
            <option value="sold">Sold</option>
            <option value="unsold">Unsold</option>
            <option value="available">Available</option>
            {isLive && <option value="live">Live (Bidding)</option>}
          </select>
          <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-pink-400/50 pointer-events-none" />
        </div>
        <button onClick={exportCSV}
          className="flex items-center gap-2 px-5 py-3 rounded-xl text-white font-bold text-sm transition-all ml-auto"
          style={{ background: 'linear-gradient(135deg, rgba(255,20,100,0.2), rgba(200,50,120,0.15))', border: '1px solid rgba(255,0,102,0.35)', boxShadow: '0 0 12px rgba(255,0,102,0.1)' }}>
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {/* ─── B. Live Summary Stats ─── */}
      <div className="grid grid-cols-7 gap-3 mb-7">
        {[
          { label: 'Total Teams', value: teams.length, accent: false },
          { label: 'Auctioned', value: auctionedCount, accent: false },
          { label: 'Sold', value: soldPlayersCount, accent: true },
          { label: 'Unsold', value: unsoldPlayersCount, accent: false },
          { label: 'Available', value: pendingPlayersCount + liveCount, accent: false },
          { label: 'Total Spent', value: fmtCr(totalAmountSpent), accent: true, raw: true },
          { label: 'Avg Price', value: soldPlayersCount > 0 ? fmtCurrency(totalAmountSpent / soldPlayersCount) : '—', accent: false, raw: true },
        ].map((s: any, i) => (
          <div key={i} className="rounded-xl p-4"
            style={{
              background: s.accent
                ? 'linear-gradient(135deg, rgba(255,20,100,0.15), rgba(200,50,120,0.1))'
                : 'linear-gradient(135deg, rgba(255,20,100,0.07), rgba(200,50,120,0.04))',
              border: s.accent ? '1px solid rgba(255,0,102,0.35)' : '1px solid rgba(255,0,102,0.15)',
              borderLeft: `3px solid ${s.accent ? 'rgba(255,0,102,0.7)' : 'rgba(255,0,102,0.35)'}`,
            }}>
            <p className="text-[11px] text-pink-300/60 uppercase font-bold tracking-wide">{s.label}</p>
            <p className={`text-xl font-black mt-1 ${s.accent ? 'text-pink-300' : 'text-white'}`}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* ─── Current Highest Bid Banner ─── */}
      {highestSoldPlayer && (
        <div className="rounded-xl p-5 mb-7 flex items-center gap-5"
          style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(255,0,102,0.08))', border: '1px solid rgba(239,68,68,0.25)', boxShadow: '0 0 15px rgba(255,0,102,0.06)' }}>
          <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(255,0,102,0.15))', border: '1px solid rgba(239,68,68,0.35)' }}>
            <Target size={18} className="text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-red-300/60 uppercase font-bold tracking-wide">
              {isLive ? 'Current Highest Bid' : 'Highest Sale'}
            </p>
            <p className="text-base text-white font-bold truncate mt-0.5">
              {(highestSoldPlayer.player as Player).name}
              {highestSoldPlayer.teamName && <span className="text-pink-300/50 font-normal"> → {highestSoldPlayer.teamName}</span>}
            </p>
          </div>
          <p className="text-xl font-black text-red-300 flex items-center gap-1.5 flex-shrink-0">
            <IndianRupee size={16} className="text-red-400/60" />
            {fmtCurrency(highestSoldPlayer.amount)}
          </p>
        </div>
      )}

      {/* ─── Live Bidding Indicator (only when LIVE) ─── */}
      {isLive && currentBiddingPlayer && (
        <div className="rounded-xl p-5 mb-7 flex items-center gap-5"
          style={{ background: 'linear-gradient(135deg, rgba(255,20,100,0.1), rgba(200,50,120,0.06))', border: '1px solid rgba(255,0,102,0.25)' }}>
          <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, rgba(255,0,102,0.2), rgba(200,50,120,0.15))', border: '1px solid rgba(255,0,102,0.35)' }}>
            <Activity size={18} className="text-pink-400 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-pink-300/60 uppercase font-bold tracking-wide">Currently Bidding</p>
            <p className="text-base text-white font-bold truncate mt-0.5">{currentBiddingPlayer.name}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-pink-300/50 uppercase font-bold">Base Price</p>
            <p className="text-base font-bold text-pink-300 mt-0.5">{fmtCurrency(currentBiddingPlayer.basePrice)}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-pink-300/50 uppercase font-bold">Current Bid</p>
            <p className="text-base font-black text-white mt-0.5">{fmtCurrency((currentBiddingPlayer as any).currentBid || currentBiddingPlayer.basePrice)}</p>
          </div>
        </div>
      )}

      {/* ─── C. Team Performance ─── */}
      <h3 className="text-base font-bold text-pink-300/70 uppercase tracking-wider mb-4 flex items-center gap-2">
        <Trophy size={16} className="text-pink-400" />
        Team Performance
      </h3>
      <div className="space-y-4 mb-8">
        {filteredTeams.map(team => {
          const isExpanded = expandedTeams[team.id] !== false;
          const teamFilteredPlayers = filterPlayers(team.acquiredPlayers);
          if (statusFilter !== 'all' && teamFilteredPlayers.length === 0) return null;
          const budget = (team as any).budget || (team as any).totalBudget || 0;
          const utilization = budget > 0 ? Math.min((team.totalSpent / budget) * 100, 100) : 0;
          const highestPurchase = team.acquiredPlayers.reduce((max, p) => {
            const amt = (p as any).soldAmount || (p as any).soldPrice || (p as any).currentBid || 0;
            return amt > max.amount ? { player: p, amount: amt } : max;
          }, { player: null as Player | null, amount: 0 });

          return (
            <div key={team.id} className="rounded-xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(255,20,100,0.06), rgba(200,50,120,0.03))', border: '1px solid rgba(255,0,102,0.15)' }}>
              <button onClick={() => toggleTeam(team.id)}
                className="w-full flex items-center gap-4 p-5 hover:bg-pink-500/[0.04] transition-all text-left">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, rgba(255,20,100,0.12), rgba(200,50,120,0.08))', border: '1px solid rgba(255,0,102,0.2)' }}>
                  {team.logo ? (
                    <img src={team.logo} alt={team.name} className="w-full h-full object-cover" />
                  ) : (
                    <Trophy size={20} className="text-pink-400/50" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-white">{team.name}</p>
                  <p className="text-sm text-pink-300/50 mt-0.5">{team.homeCity || ''} · {teamFilteredPlayers.length} bought · Spent {fmtCr(team.totalSpent)}</p>
                </div>
                {/* Budget utilization bar */}
                <div className="w-32 flex-shrink-0 mr-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] text-pink-300/50 uppercase font-bold">Budget</span>
                    <span className="text-[11px] font-bold text-pink-300/60">{utilization.toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,0,102,0.08)' }}>
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${utilization}%`,
                        background: utilization > 80 ? 'linear-gradient(90deg, #ef4444, #f87171)' : utilization > 50 ? 'linear-gradient(90deg, #ec4899, #f472b6)' : 'linear-gradient(90deg, #f472b6, #f9a8d4)' }} />
                  </div>
                </div>
                <div className="text-right mr-3 flex-shrink-0">
                  <p className="text-base font-bold text-pink-300">{fmtCr(team.remainingBudget || 0)}</p>
                  <p className="text-xs text-pink-300/40">remaining</p>
                </div>
                {isExpanded ? <ChevronUp size={18} className="text-pink-400/40" /> : <ChevronDown size={18} className="text-pink-400/40" />}
              </button>

              {/* Expanded: Highest purchase + players */}
              {isExpanded && (
                <div className="border-t" style={{ borderColor: 'rgba(255,0,102,0.1)' }}>
                  {highestPurchase.player && highestPurchase.amount > 0 && (
                    <div className="px-5 py-3 flex items-center gap-3" style={{ background: 'rgba(239,68,68,0.05)' }}>
                      <Target size={14} className="text-red-400/60" />
                      <span className="text-xs text-red-300/60 uppercase font-bold">Top Buy:</span>
                      <span className="text-sm text-white/80 font-bold">{highestPurchase.player.name}</span>
                      <span className="text-sm text-red-300 font-black ml-auto">{fmtCurrency(highestPurchase.amount)}</span>
                    </div>
                  )}
                  {teamFilteredPlayers.length > 0 ? teamFilteredPlayers.map((player, pIdx) => {
                    const soldAmt = (player as any).soldAmount || (player as any).soldPrice || (player as any).currentBid || 0;
                    const role = (player as any).roleId || (player as any).role || '';
                    return (
                      <div key={player.id || pIdx}
                        className="flex items-center gap-4 px-5 py-4 hover:bg-pink-500/[0.03] transition-all"
                        style={{ borderBottom: '1px solid rgba(255,0,102,0.06)' }}>
                        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
                          style={{ background: 'linear-gradient(135deg, rgba(255,20,100,0.1), rgba(200,50,120,0.06))', border: '1px solid rgba(255,0,102,0.15)' }}>
                          {(player as any).imageUrl ? (
                            <img src={(player as any).imageUrl} alt={player.name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <User size={15} className="text-pink-400/40" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] font-bold text-white truncate">{player.name}</p>
                          {role && <p className="text-xs text-pink-300/40 uppercase mt-0.5">{role}</p>}
                        </div>
                        <div className="text-right flex-shrink-0 w-24">
                          <p className="text-[11px] text-pink-300/40 uppercase font-bold">Base</p>
                          <p className="text-sm font-bold text-pink-300/60 mt-0.5">{fmtCurrency(player.basePrice)}</p>
                        </div>
                        <div className="text-right flex-shrink-0 w-24">
                          <p className="text-[11px] text-pink-300/40 uppercase font-bold">Sold</p>
                          <p className="text-sm font-black text-white mt-0.5">{soldAmt > 0 ? fmtCurrency(soldAmt) : '—'}</p>
                        </div>
                        <span className="px-3 py-1.5 rounded-full text-xs font-bold uppercase flex-shrink-0"
                          style={statusStyle(player.status || '')}>
                          {(player.status as string) === 'LIVE' ? '● LIVE' : player.status || 'Available'}
                        </span>
                        <button onClick={() => onNavigateHistory(player)}
                          className="flex-shrink-0 px-4 py-2 rounded-lg text-xs font-bold transition-all"
                          style={{ color: '#f472b6', background: 'rgba(255,20,100,0.06)', border: '1px solid rgba(255,0,102,0.15)' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,20,100,0.15)'; e.currentTarget.style.borderColor = 'rgba(255,0,102,0.3)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,20,100,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,0,102,0.15)'; }}>
                          History
                        </button>
                      </div>
                    );
                  }) : (
                    <div className="px-5 py-8 text-center">
                      <p className="text-pink-300/30 text-sm">No players match current filters</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ─── D. All Players (flat list) ─── */}
      <h3 className="text-base font-bold text-pink-300/70 uppercase tracking-wider mb-4 flex items-center gap-2">
        <Users size={16} className="text-pink-400" />
        Player Outcomes {isLive && <span className="text-xs text-pink-400/50 normal-case font-normal ml-2">· updating live</span>}
      </h3>
      <div className="rounded-xl overflow-hidden mb-6" style={{ background: 'linear-gradient(135deg, rgba(255,20,100,0.05), rgba(200,50,120,0.03))', border: '1px solid rgba(255,0,102,0.12)' }}>
        {/* Column headers */}
        <div className="flex items-center gap-4 px-5 py-3" style={{ background: 'rgba(255,20,100,0.06)', borderBottom: '1px solid rgba(255,0,102,0.1)' }}>
          <div className="w-9 flex-shrink-0" />
          <p className="flex-1 text-[11px] text-pink-300/60 uppercase font-bold tracking-wide">Player</p>
          <p className="w-20 text-[11px] text-pink-300/60 uppercase font-bold text-right">Base</p>
          <p className="w-20 text-[11px] text-pink-300/60 uppercase font-bold text-right">Sold</p>
          <p className="w-28 text-[11px] text-pink-300/60 uppercase font-bold text-center">Status</p>
          <p className="w-32 text-[11px] text-pink-300/60 uppercase font-bold text-center">Team</p>
          <div className="w-20 flex-shrink-0" />
        </div>
        {players.filter(p => {
          if (statusFilter === 'sold' && p.status !== 'SOLD') return false;
          if (statusFilter === 'unsold' && p.status !== 'UNSOLD') return false;
          if (statusFilter === 'available' && p.status !== 'AVAILABLE' && p.status !== 'PENDING') return false;
          if (statusFilter === 'live' && (p.status as string) !== 'LIVE') return false;
          if (teamFilter) {
            const pTeam = (p as any).soldTo || (p as any).teamId || (p as any).buyingTeamId || '';
            if (pTeam !== teamFilter) return false;
          }
          if (reportSearch) {
            const q = reportSearch.toLowerCase();
            if (!p.name.toLowerCase().includes(q)) return false;
          }
          return true;
        }).map((player, pIdx) => {
          const soldAmt = (player as any).soldAmount || (player as any).soldPrice || (player as any).currentBid || 0;
          const role = (player as any).roleId || (player as any).role || '';
          const pTeamId = (player as any).soldTo || (player as any).teamId || (player as any).buyingTeamId;
          const pTeam = pTeamId ? teams.find(t => t.id === pTeamId) : null;
          const isCurrentLive = currentBiddingPlayer?.id === player.id;
          return (
            <div key={player.id || pIdx}
              className={`flex items-center gap-4 px-5 py-3.5 transition-all ${isCurrentLive ? '' : 'hover:bg-pink-500/[0.03]'}`}
              style={{
                borderBottom: '1px solid rgba(255,0,102,0.06)',
                ...(isCurrentLive ? { background: 'rgba(255,20,100,0.1)', borderLeft: '3px solid rgba(255,0,102,0.5)' } : {})
              }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
                style={{ background: 'linear-gradient(135deg, rgba(255,20,100,0.1), rgba(200,50,120,0.06))', border: '1px solid rgba(255,0,102,0.15)' }}>
                {(player as any).imageUrl ? (
                  <img src={(player as any).imageUrl} alt={player.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <User size={15} className="text-pink-400/40" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold text-white truncate">{player.name}</p>
                {role && <p className="text-xs text-pink-300/40 uppercase">{role}</p>}
              </div>
              <p className="w-20 text-sm font-bold text-pink-300/50 text-right">{fmtCurrency(player.basePrice)}</p>
              <p className="w-20 text-sm font-black text-white text-right">{soldAmt > 0 ? fmtCurrency(soldAmt) : '—'}</p>
              <div className="w-28 flex justify-center">
                <span className="px-3 py-1.5 rounded-full text-xs font-bold uppercase"
                  style={statusStyle(player.status || '')}>
                  {(player.status as string) === 'LIVE' ? '● LIVE' : player.status || 'Available'}
                </span>
              </div>
              <p className="w-32 text-sm text-pink-300/50 text-center truncate">{pTeam?.name || '—'}</p>
              <button onClick={() => onNavigateHistory(player)}
                className="flex-shrink-0 w-20 text-center px-3 py-2 rounded-lg text-xs font-bold transition-all"
                style={{ color: '#f472b6', background: 'rgba(255,20,100,0.06)', border: '1px solid rgba(255,0,102,0.15)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,20,100,0.15)'; e.currentTarget.style.borderColor = 'rgba(255,0,102,0.3)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,20,100,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,0,102,0.15)'; }}>
                History
              </button>
            </div>
          );
        })}
        {players.length === 0 && (
          <div className="px-5 py-14 text-center">
            <User size={32} className="text-pink-400/15 mx-auto mb-3" />
            <p className="text-pink-300/40 text-base">No players registered yet</p>
          </div>
        )}
      </div>

      {/* No results */}
      {filteredTeams.length === 0 && (teamFilter || reportSearch) && (
        <div className="rounded-xl p-14 text-center" style={{ background: 'linear-gradient(135deg, rgba(255,20,100,0.06), rgba(200,50,120,0.03))', border: '1px dashed rgba(255,0,102,0.2)' }}>
          <Search size={32} className="text-pink-400/20 mx-auto mb-3" />
          <p className="text-pink-300/40 text-base">No teams or players match your search</p>
        </div>
      )}
    </div>
  );
};

interface AuctioneerDashboardPageProps {
  setStatus: (status: AuctionStatus) => void;
  currentMatch: MatchData | null;
  currentUser: { name: string; email: string; role: UserRole };
}

export const AuctioneerDashboardPage: React.FC<AuctioneerDashboardPageProps> = ({ setStatus, currentMatch, currentUser }) => {
  // ─── RESOLVED MATCH STATE (fallback fetch if currentMatch is null) ─────────────
  const [resolvedMatch, setResolvedMatch] = useState<MatchData | null>(currentMatch);
  const [matchLoading, setMatchLoading] = useState(!currentMatch);
  
  // Fallback: Fetch match directly if currentMatch prop is null
  useEffect(() => {
    if (currentMatch) {
      console.log('🔒 AUCTIONEER: Using provided currentMatch:', activeMatch.id, activeMatch.name);
      setResolvedMatch(currentMatch);
      setMatchLoading(false);
      return;
    }

    // currentMatch is null — try to fetch using sessionStorage matchId or auctioneer's matchId
    const savedMatchId = sessionStorage.getItem('hypehammer_current_match_id');
    console.log('🔍 AUCTIONEER: currentMatch is null, savedMatchId:', savedMatchId);
    
    const fetchMatch = async () => {
      setMatchLoading(true);
      
      // First try sessionStorage matchId
      let matchIdToFetch = savedMatchId;
      
      // If no savedMatchId, try fetching auctioneer's assigned matchId
      if (!matchIdToFetch && currentUser.email) {
        try {
          console.log('🔍 Fetching auctioneer registration for:', currentUser.email);
          const auctioneerRes = await fetch(`${API_BASE}/auctioneers?email=${encodeURIComponent(currentUser.email)}`);
          const auctioneerData = await auctioneerRes.json();
          console.log('📡 Auctioneer API response:', auctioneerData);
          
          if (auctioneerData.success && auctioneerData.data && auctioneerData.data.length > 0) {
            matchIdToFetch = auctioneerData.data[0].matchId;
            console.log('✅ Found auctioneer matchId:', matchIdToFetch);
            // Save to sessionStorage for consistency
            if (matchIdToFetch) {
              sessionStorage.setItem('hypehammer_current_match_id', matchIdToFetch);
            }
          } else {
            console.warn('⚠️ No auctioneer registration found');
          }
        } catch (err) {
          console.error('❌ Error fetching auctioneer registration:', err);
        }
      }
      
      if (!matchIdToFetch) {
        console.warn('⚠️ No matchId available to fetch');
        setMatchLoading(false);
        return;
      }
      
      try {
        console.log('📡 Fetching match from API:', `${API_BASE}/matches/${matchIdToFetch}`);
        const response = await fetch(`${API_BASE}/matches/${matchIdToFetch}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('📡 Match API response:', data);
          const matchData = data.data || data;
          if (matchData && matchData.id) {
            console.log('✅ Loaded match from API:', matchData.name, matchData.id);
            setResolvedMatch(matchData);
          } else {
            console.error('⚠️ Match not found for ID:', matchIdToFetch);
            setResolvedMatch(null);
          }
        } else {
          console.error('❌ Failed to fetch match:', response.status);
          setResolvedMatch(null);
        }
      } catch (error) {
        console.error('❌ Error fetching match:', error);
        setResolvedMatch(null);
      } finally {
        setMatchLoading(false);
      }
    };
    
    fetchMatch();
  }, [currentMatch, currentUser.email]);

  // Use resolvedMatch for all operations
  const activeMatch = resolvedMatch;

  const [activeSection, setActiveSection] = useState<'dashboard' | 'liveRoom' | 'teams' | 'players' | 'playerApplications' | 'settings' | 'report' | 'teamDetail' | 'history' | 'addTeam' | 'addPlayer' | 'results'>('dashboard');
  const [activeNav, setActiveNav] = useState(0);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  const [historyPlayer, setHistoryPlayer] = useState<Player | null>(null);
  const [addTeamLoading, setAddTeamLoading] = useState(false);
  const [addTeamError, setAddTeamError] = useState('');
  
  // Add Team Form State
  const [teamName, setTeamName] = useState('');
  const [teamShortCode, setTeamShortCode] = useState('');
  const [homeCity, setHomeCity] = useState('');
  const [roleInTeam, setRoleInTeam] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [teamEmail, setTeamEmail] = useState('');
  const [teamPhone, setTeamPhone] = useState('');
  const [teamPassword, setTeamPassword] = useState('');
  const [governmentId, setGovernmentId] = useState('');
  
  // File uploads
  const [teamLogoFile, setTeamLogoFile] = useState<File | null>(null);
  const [teamLogoPreviewUrl, setTeamLogoPreviewUrl] = useState<string | null>(null);
  const [authLetterFile, setAuthLetterFile] = useState<File | null>(null);
  const [govIdFile, setGovIdFile] = useState<File | null>(null);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const [isDraggingAuth, setIsDraggingAuth] = useState(false);
  const [isDraggingGovId, setIsDraggingGovId] = useState(false);

  // Add Player Form State
  const [playerName, setPlayerName] = useState('');
  const [playerEmail, setPlayerEmail] = useState('');
  const [playerPhone, setPlayerPhone] = useState('');
  const [playerPassword, setPlayerPassword] = useState('');
  const [playerAge, setPlayerAge] = useState('25');
  const [playerGender, setPlayerGender] = useState('');
  const [playerNationality, setPlayerNationality] = useState('');
  const [playerRoleId, setPlayerRoleId] = useState('');
  const [playerBasePrice, setPlayerBasePrice] = useState('500000');
  const [playerIsOverseas, setPlayerIsOverseas] = useState(false);
  const [playerBio, setPlayerBio] = useState('');
  const [playerExperience, setPlayerExperience] = useState('');
  const [playerBattingStyle, setPlayerBattingStyle] = useState('');
  const [playerBowlingStyle, setPlayerBowlingStyle] = useState('');
  const [playerPreviousTeams, setPlayerPreviousTeams] = useState('');
  const [playerCategory, setPlayerCategory] = useState('');
  const [playerGovId, setPlayerGovId] = useState('');
  const [playerPhotoFile, setPlayerPhotoFile] = useState<File | null>(null);
  const [playerPhotoPreviewUrl, setPlayerPhotoPreviewUrl] = useState<string | null>(null);
  const [playerGovIdFile, setPlayerGovIdFile] = useState<File | null>(null);
  const [isDraggingPlayerPhoto, setIsDraggingPlayerPhoto] = useState(false);
  const [isDraggingPlayerGovId, setIsDraggingPlayerGovId] = useState(false);
  const [addPlayerLoading, setAddPlayerLoading] = useState(false);
  const [addPlayerError, setAddPlayerError] = useState('');

  const [navSearchQuery, setNavSearchQuery] = useState('');
  const [navSearchFocused, setNavSearchFocused] = useState(false);
  
  // Real data states
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  
  // Auction status state
  const [liveAuctionStatus, setLiveAuctionStatus] = useState<'READY' | 'LIVE' | 'PAUSED' | 'ENDED'>('READY');
  const [startingAuction, setStartingAuction] = useState(false);
  
  // Team moderation state
  type TeamModerationFilter = 'all' | 'accepted' | 'pending' | 'declined';
  const [teamModerationFilter, setTeamModerationFilter] = useState<TeamModerationFilter>('all');
  const [updatingTeamApproval, setUpdatingTeamApproval] = useState<string | null>(null);
  
  // Current bidding player state
  const [currentBiddingPlayer, setCurrentBiddingPlayer] = useState<Player | null>(null);
  // Whether the first real-time snapshot has arrived and been filtered.
  // Prevents the card from rendering any player until socket data is resolved.
  const [livePlayerResolved, setLivePlayerResolved] = useState(false);
  
  // Auctioneer profile state
  const [auctioneerProfile, setAuctioneerProfile] = useState<{
    auctioneerPhoto?: string;
    name?: string;
    email?: string;
    phone?: string;
    experienceLevel?: string;
    experience?: number;
    languages?: string[];
    availability?: string;
    auctioneerLicense?: string;
    previousAuctions?: string;
    governmentId?: string;
    governmentIdFile?: string;
    status?: string;
    approvedAt?: string;
    profileComplete?: boolean;
  }>({});

  // Fetch teams and players for current match only
  useEffect(() => {
    const fetchData = async () => {
      if (!activeMatch?.id) {
        console.log('⏳ Waiting for activeMatch to load...');
        setLoadingTeams(false);
        setLoadingPlayers(false);
        return;
      }

      console.log('📡 Fetching teams and players for match:', activeMatch.id);
      
      try {
        // Fetch teams for this match
        const teamsRes = await fetch(`${API_BASE}/teams?matchId=${activeMatch.id}`);
        if (teamsRes.ok) {
          const teamsData = await teamsRes.json();
          if (teamsData.data && Array.isArray(teamsData.data)) {
            setTeams(teamsData.data);
          } else if (Array.isArray(teamsData)) {
            setTeams(teamsData);
          }
        }
        setLoadingTeams(false);

        // Fetch players for this match
        const playersRes = await fetch(`${API_BASE}/players?matchId=${activeMatch.id}`);
        if (playersRes.ok) {
          const playersData = await playersRes.json();
          if (playersData.data && Array.isArray(playersData.data)) {
            setPlayers(playersData.data);
          } else if (Array.isArray(playersData)) {
            setPlayers(playersData);
          }
        }
        setLoadingPlayers(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoadingTeams(false);
        setLoadingPlayers(false);
      }
    };

    fetchData();
  }, [activeMatch?.id]);

  // Fetch auctioneer profile from backend
  useEffect(() => {
    const fetchAuctioneerProfile = async () => {
      try {
        if (!currentUser?.email) {
          console.log('[Dashboard] No email available');
          return;
        }
        
        console.log('[Dashboard] Fetching auctioneer profile for:', currentUser.email);
        
        // Use existing /auctioneers endpoint with email filter
        const url = `${API_BASE}/auctioneers?email=${encodeURIComponent(currentUser.email)}`;
        console.log('[Dashboard] Calling URL:', url);
        
        const response = await fetch(url);
        console.log('[Dashboard] Response status:', response.status);
        
        if (response.ok) {
          const result = await response.json();
          console.log('[Dashboard] Response data:', result);
          
          // get_auctioneers returns array in result.data
          if (result?.data && Array.isArray(result.data) && result.data.length > 0) {
            const profile = result.data[0];
            console.log('[Dashboard] Setting auctioneer profile:', profile.name);
            
            // Store all fields except password
            setAuctioneerProfile({
              auctioneerPhoto: profile.auctioneerPhoto,
              name: profile.name,
              email: profile.email,
              phone: profile.phone,
              experienceLevel: profile.experienceLevel,
              experience: profile.experience,
              languages: profile.languages,
              availability: profile.availability,
              auctioneerLicense: profile.auctioneerLicense,
              previousAuctions: profile.previousAuctions,
              governmentId: profile.governmentId,
              governmentIdFile: profile.governmentIdFile,
              status: profile.status,
              approvedAt: profile.approvedAt,
              profileComplete: profile.profileComplete
            });
          } else {
            console.log('[Dashboard] No auctioneer data found');
          }
        } else {
          console.warn('[Dashboard] Fetch failed with status:', response.status);
          try {
            const errorText = await response.text();
            console.warn('[Dashboard] Error response:', errorText);
          } catch (e) {
            console.warn('[Dashboard] Could not read error response');
          }
        }
      } catch (error) {
        console.error('[Dashboard] Error fetching auctioneer profile:', error);
      }
    };

    // Don't fetch during test/initial render
    const timer = setTimeout(fetchAuctioneerProfile, 500);
    return () => clearTimeout(timer);
  }, [currentUser?.email]);

  // Subscribe to auction status changes via Firebase
  useEffect(() => {
    if (!activeMatch?.id) return;

    // Initialize socket service with current season
    const seasonId = activeMatch.id;
    
    // Connect to Firebase
    socketService.connect();
    
    // Join the season
    socketService.joinSeason(seasonId, currentUser.email, UserRole.AUCTIONEER);

    const unsubscribers: (() => void)[] = [];

    // Listen to players collection for real-time updates
    unsubscribers.push(socketService.onPlayersUpdate(seasonId, (updatedPlayers) => {
      console.log('[Auctioneer] Players updated:', updatedPlayers.length);
      
      // ONLY consider players that are accepted — never show declined players in live card
      const acceptedPlayers = updatedPlayers.filter((p: any) => p.approvalStatus === 'accepted');
      // Find the LIVE player among accepted players only
      const livePlayer = acceptedPlayers.find((p: any) => p.status === 'LIVE' || p.status === 'PENDING');
      if (livePlayer) {
        console.log('[Auctioneer] Found live player:', livePlayer.name);
        setCurrentBiddingPlayer(livePlayer);
      } else {
        console.log('[Auctioneer] No LIVE/PENDING accepted player found');
        setCurrentBiddingPlayer(null);
      }
      // Mark that we have received at least one snapshot — safe to render
      setLivePlayerResolved(true);
    }));

    // Listen for auction state updates (PRIMARY SOURCE - gets current status on mount)
    unsubscribers.push(socketService.onAuctionStateUpdate((data: any) => {
      console.log('[Auctioneer] Auction state update:', data);
      console.log('   → Status:', data.status);
      console.log('   → Current Player ID:', data.currentPlayerId);
      console.log('   → Bidding Active:', data.biddingActive);
      
      if (data.status) {
        const normalizedStatus = (data.status || '').toUpperCase();
        if (normalizedStatus === 'LIVE' || normalizedStatus === 'PAUSED' || normalizedStatus === 'READY' || normalizedStatus === 'ENDED') {
          setLiveAuctionStatus(normalizedStatus as 'READY' | 'LIVE' | 'PAUSED' | 'ENDED');
        }
      }
      
      // If auction is LIVE and we have a currentPlayerId, fetch the player data from API
      if (data.status === 'LIVE' && data.biddingActive && data.currentPlayerId) {
        console.log('   → Fetching player from API:', data.currentPlayerId);
        fetch(`${API_BASE}/players/${data.currentPlayerId}`)
          .then(res => res.json())
          .then(playerData => {
            if (playerData.success && playerData.data) {
              console.log('✅ [Auctioneer] Fetched player from API:', playerData.data.name);
              setCurrentBiddingPlayer(playerData.data);
              setLiveAuctionStatus('LIVE');
            }
          })
          .catch(err => {
            console.error('❌ [Auctioneer] Error fetching player from API:', err);
          });
      }
    }));

    // Listen for auction started
    unsubscribers.push(socketService.onAuctionStarted((data: any) => {
      console.log('[Auctioneer] Auction started:', data);
      setLiveAuctionStatus('LIVE');
    }));

    // Listen for auction ended
    unsubscribers.push(socketService.onAuctionEnded((data: any) => {
      console.log('[Auctioneer] Auction ended:', data);
      setLiveAuctionStatus('ENDED');
      setCurrentBiddingPlayer(null);
    }));

    // Listen for auction paused
    unsubscribers.push(socketService.onAuctionPaused((data: any) => {
      console.log('[Auctioneer] Auction paused:', data);
      setLiveAuctionStatus('PAUSED');
    }));

    // Listen for auction resumed
    unsubscribers.push(socketService.onAuctionResumed((data: any) => {
      console.log('[Auctioneer] Auction resumed:', data);
      setLiveAuctionStatus('LIVE');
    }));

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [activeMatch?.id]);

  /**
   * CRITICAL: Filter out declined players for all auction-related displays and stats
   * Declined players should ONLY appear in admin review sections
   * This is the SINGLE SOURCE OF TRUTH for auction-eligible players in Auctioneer Dashboard
   */
  const eligiblePlayers = useMemo(() => {
    return players.filter(p => p.approvalStatus !== 'declined');
  }, [players]);

  /**
   * CRITICAL: Filter out declined teams for all auction-related displays and stats
   * Declined teams should ONLY appear in admin review sections
   * This is the SINGLE SOURCE OF TRUTH for auction-eligible teams in Auctioneer Dashboard
   */
  const eligibleTeams = useMemo(() => {
    return teams.filter(t => t.approvalStatus !== 'declined');
  }, [teams]);

  // Handle Add Team submission
  const handleAddTeam = async () => {
    // Validate required fields
    if (!teamName.trim()) {
      setAddTeamError('Team Name is required');
      return;
    }
    if (!teamShortCode.trim()) {
      setAddTeamError('Team Short Code is required');
      return;
    }
    if (!homeCity.trim()) {
      setAddTeamError('Home City is required');
      return;
    }
    if (!roleInTeam) {
      setAddTeamError('Role in Team is required');
      return;
    }
    if (!ownerName.trim()) {
      setAddTeamError('Owner/Representative Name is required');
      return;
    }
    if (!teamEmail.trim()) {
      setAddTeamError('Email is required');
      return;
    }
    if (!teamPassword.trim()) {
      setAddTeamError('Password is required');
      return;
    }
    if (!teamLogoFile) {
      setAddTeamError('Team Logo is required');
      return;
    }
    if (!authLetterFile) {
      setAddTeamError('Authorization Letter is required');
      return;
    }
    if (!governmentId.trim()) {
      setAddTeamError('Government ID Number is required');
      return;
    }
    if (!govIdFile) {
      setAddTeamError('Government ID Proof document is required');
      return;
    }
    if (!activeMatch?.id) {
      setAddTeamError('No match selected.');
      return;
    }

    setAddTeamLoading(true);
    setAddTeamError('');

    try {
      console.log('================== TEAM REGISTRATION START ==================');
      console.log('📦 Uploading files to Firebase Storage...');

      // Get match name for folder organization - ensure we have the actual match name
      const matchName = activeMatch?.name || activeMatch?.seasonName || activeMatch?.id || 'Auctioneer_Team';

      // Upload Team Logo
      console.log('📤 Uploading team logo...');
      const tempTeamId = `team_${Date.now()}`;
      const logoUrl = await uploadTeamLogo(teamLogoFile, tempTeamId, matchName);
      console.log('✅ Team logo uploaded:', logoUrl);

      // Upload Authorization Letter
      console.log('📤 Uploading authorization letter...');
      const authLetterUrl = await uploadDocument(authLetterFile, 'authorization-letters', tempTeamId, matchName);
      console.log('✅ Authorization letter uploaded:', authLetterUrl);

      // Upload Government ID
      console.log('📤 Uploading government ID...');
      const govIdUrl = await uploadDocument(govIdFile, 'government-ids', tempTeamId, matchName);
      console.log('✅ Government ID uploaded:', govIdUrl);

      // Prepare registration payload
      const registrationData = {
        fullName: ownerName,
        email: teamEmail,
        password: teamPassword,
        phone: teamPhone,
        seasonId: activeMatch.id,
        teamName: teamName,
        teamShortCode: teamShortCode,
        homeCity: homeCity,
        roleInTeam: roleInTeam,
        teamLogo: logoUrl,
        authorizationLetter: authLetterUrl,
        governmentId: governmentId,
        governmentIdFile: govIdUrl,
        role: 'TEAM_REP'
      };

      console.log('📡 Calling registerTeam API...');
      const result = await registerTeam(registrationData);

      if (result) {
        console.log('✅ Team registered successfully');
        // Refresh teams list
        const teamsRes = await fetch(`${API_BASE}/teams?matchId=${activeMatch.id}`);
        if (teamsRes.ok) {
          const teamsData = await teamsRes.json();
          if (teamsData.data && Array.isArray(teamsData.data)) {
            setTeams(teamsData.data);
          } else if (Array.isArray(teamsData)) {
            setTeams(teamsData);
          }
        }
        // Reset form and close modal
        resetAddTeamForm();
        setActiveSection('teams');
      }
    } catch (err: any) {
      console.error('❌ Team registration failed:', err);
      setAddTeamError(err?.message || 'Failed to register team. Please try again.');
    } finally {
      setAddTeamLoading(false);
    }
  };

  // Reset Add Team form
  const resetAddTeamForm = () => {
    setTeamName('');
    setTeamShortCode('');
    setHomeCity('');
    setRoleInTeam('');
    setOwnerName('');
    setTeamEmail('');
    setTeamPhone('');
    setTeamPassword('');
    setGovernmentId('');
    // Revoke preview URL to free memory
    if (teamLogoPreviewUrl) {
      URL.revokeObjectURL(teamLogoPreviewUrl);
    }
    setTeamLogoFile(null);
    setTeamLogoPreviewUrl(null);
    setAuthLetterFile(null);
    setGovIdFile(null);
    setAddTeamError('');
  };

  // File upload handlers
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setAddTeamError('Team logo file size must be less than 10MB');
        return;
      }
      // Revoke previous preview URL if exists
      if (teamLogoPreviewUrl) {
        URL.revokeObjectURL(teamLogoPreviewUrl);
      }
      // Create instant preview URL
      const previewUrl = URL.createObjectURL(file);
      setTeamLogoFile(file);
      setTeamLogoPreviewUrl(previewUrl);
      setAddTeamError('');
    }
  };

  const handleAuthLetterUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setAddTeamError('Authorization letter file size must be less than 10MB');
        return;
      }
      setAuthLetterFile(file);
      setAddTeamError('');
    }
  };

  const handleGovIdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setAddTeamError('Government ID file size must be less than 10MB');
        return;
      }
      setGovIdFile(file);
      setAddTeamError('');
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent, type: 'logo' | 'auth' | 'govId') => {
    e.preventDefault();
    if (type === 'logo') setIsDraggingLogo(true);
    else if (type === 'auth') setIsDraggingAuth(true);
    else setIsDraggingGovId(true);
  };

  const handleDragLeave = (e: React.DragEvent, type: 'logo' | 'auth' | 'govId') => {
    e.preventDefault();
    if (type === 'logo') setIsDraggingLogo(false);
    else if (type === 'auth') setIsDraggingAuth(false);
    else setIsDraggingGovId(false);
  };

  const handleDrop = (e: React.DragEvent, type: 'logo' | 'auth' | 'govId') => {
    e.preventDefault();
    if (type === 'logo') setIsDraggingLogo(false);
    else if (type === 'auth') setIsDraggingAuth(false);
    else setIsDraggingGovId(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.size > 10 * 1024 * 1024) {
        setAddTeamError('File size must be less than 10MB');
        return;
      }

      if (type === 'logo') {
        if (!file.type.startsWith('image/')) {
          setAddTeamError('Team logo must be an image file');
          return;
        }
        // Revoke previous preview URL if exists
        if (teamLogoPreviewUrl) {
          URL.revokeObjectURL(teamLogoPreviewUrl);
        }
        // Create instant preview URL
        const previewUrl = URL.createObjectURL(file);
        setTeamLogoFile(file);
        setTeamLogoPreviewUrl(previewUrl);
      } else if (type === 'auth') {
        if (file.type !== 'application/pdf') {
          setAddTeamError('Authorization letter must be a PDF file');
          return;
        }
        setAuthLetterFile(file);
      } else {
        const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        if (!validTypes.includes(file.type)) {
          setAddTeamError('Government ID must be PDF, JPG, JPEG, or PNG');
          return;
        }
        setGovIdFile(file);
      }
      setAddTeamError('');
    }
  };

  // ─── ADD PLAYER FORM HANDLERS ──────────────────────────────────────────
  const resetAddPlayerForm = () => {
    setPlayerName(''); setPlayerEmail(''); setPlayerPhone(''); setPlayerPassword('');
    setPlayerAge('25'); setPlayerGender(''); setPlayerNationality(''); setPlayerRoleId('');
    setPlayerBasePrice('500000'); setPlayerIsOverseas(false); setPlayerBio('');
    setPlayerExperience(''); setPlayerBattingStyle(''); setPlayerBowlingStyle('');
    setPlayerPreviousTeams(''); setPlayerCategory(''); setPlayerGovId('');
    if (playerPhotoPreviewUrl) URL.revokeObjectURL(playerPhotoPreviewUrl);
    setPlayerPhotoFile(null); setPlayerPhotoPreviewUrl(null);
    setPlayerGovIdFile(null); setAddPlayerError('');
  };

  const handlePlayerPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { setAddPlayerError('Photo must be less than 10MB'); return; }
      if (!file.type.startsWith('image/')) { setAddPlayerError('File must be an image'); return; }
      if (playerPhotoPreviewUrl) URL.revokeObjectURL(playerPhotoPreviewUrl);
      setPlayerPhotoFile(file);
      setPlayerPhotoPreviewUrl(URL.createObjectURL(file));
      setAddPlayerError('');
    }
  };

  const handlePlayerGovIdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { setAddPlayerError('File must be less than 10MB'); return; }
      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!validTypes.includes(file.type)) { setAddPlayerError('Must be PDF, JPG, or PNG'); return; }
      setPlayerGovIdFile(file);
      setAddPlayerError('');
    }
  };

  const handlePlayerDragOver = (e: React.DragEvent, type: 'photo' | 'govId') => {
    e.preventDefault();
    if (type === 'photo') setIsDraggingPlayerPhoto(true);
    else setIsDraggingPlayerGovId(true);
  };

  const handlePlayerDragLeave = (e: React.DragEvent, type: 'photo' | 'govId') => {
    e.preventDefault();
    if (type === 'photo') setIsDraggingPlayerPhoto(false);
    else setIsDraggingPlayerGovId(false);
  };

  const handlePlayerDrop = (e: React.DragEvent, type: 'photo' | 'govId') => {
    e.preventDefault();
    if (type === 'photo') setIsDraggingPlayerPhoto(false);
    else setIsDraggingPlayerGovId(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.size > 10 * 1024 * 1024) { setAddPlayerError('File must be less than 10MB'); return; }
      if (type === 'photo') {
        if (!file.type.startsWith('image/')) { setAddPlayerError('Must be an image file'); return; }
        if (playerPhotoPreviewUrl) URL.revokeObjectURL(playerPhotoPreviewUrl);
        setPlayerPhotoFile(file);
        setPlayerPhotoPreviewUrl(URL.createObjectURL(file));
      } else {
        const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        if (!validTypes.includes(file.type)) { setAddPlayerError('Must be PDF, JPG, or PNG'); return; }
        setPlayerGovIdFile(file);
      }
      setAddPlayerError('');
    }
  };

  const handleAddPlayer = async () => {
    // Validation
    if (!playerName.trim()) { setAddPlayerError('Player Name is required'); return; }
    if (!playerEmail.trim()) { setAddPlayerError('Email is required'); return; }
    if (!playerPassword.trim()) { setAddPlayerError('Password is required'); return; }
    if (!playerGender) { setAddPlayerError('Gender is required'); return; }
    if (!playerNationality.trim()) { setAddPlayerError('Nationality is required'); return; }
    if (!playerRoleId) { setAddPlayerError('Playing Role is required'); return; }
    if (!playerBasePrice || parseInt(playerBasePrice) < 50000) { setAddPlayerError('Base Price must be at least ₹50,000'); return; }
    if (!playerPhotoFile) { setAddPlayerError('Player Photo is required'); return; }
    if (!playerGovId.trim()) { setAddPlayerError('Government ID Number is required'); return; }
    if (!playerGovIdFile) { setAddPlayerError('Government ID Proof is required'); return; }
    if (!activeMatch?.id) { setAddPlayerError('No match selected.'); return; }

    setAddPlayerLoading(true);
    setAddPlayerError('');

    try {
      console.log('================== PLAYER REGISTRATION START ==================');
      
      // Get match name for folder organization - ensure we have the actual match name
      const matchName = activeMatch?.name || activeMatch?.seasonName || activeMatch?.id || 'Auctioneer_Player';
      
      // Upload player photo
      console.log('📤 Uploading player photo...');
      const tempPlayerId = `player_${Date.now()}`;
      const photoUrl = await uploadPlayerPhoto(playerPhotoFile, tempPlayerId, matchName);
      console.log('✅ Player photo uploaded:', photoUrl);

      // Upload government ID
      console.log('📤 Uploading government ID...');
      const govIdUrl = await uploadDocument(playerGovIdFile, 'government-ids', tempPlayerId, matchName);
      console.log('✅ Government ID uploaded:', govIdUrl);

      // Build payload matching RoleBasedRegistrationPage
      const registrationData = {
        fullName: playerName,
        email: playerEmail,
        phone: playerPhone,
        password: playerPassword,
        role: 'PLAYER',
        seasonId: activeMatch.id,
        governmentId: playerGovId,
        governmentIdFile: govIdUrl,
        dateOfBirth: '', // age-based
        age: parseInt(playerAge) || 25,
        gender: playerGender,
        nationality: playerNationality,
        playerPhoto: photoUrl,
        imageUrl: photoUrl,
        sport: activeMatch.config?.sport || 'CRICKET',
        playingRole: playerRoleId,
        roleId: playerRoleId,
        battingStyle: playerBattingStyle,
        bowlingStyle: playerBowlingStyle,
        experienceLevel: playerExperience,
        previousTeams: playerPreviousTeams,
        basePrice: parseInt(playerBasePrice) || 500000,
        playerCategory: playerCategory,
        availability: 'Yes',
        consent: true,
        isOverseas: playerIsOverseas,
        bio: playerBio,
        name: playerName,
      };

      console.log('📡 Calling registerPlayer API...');
      const result = await registerPlayer(registrationData);

      if (result) {
        console.log('✅ Player registered successfully');
        // Refresh players list
        const playersRes = await fetch(`${API_BASE}/players?matchId=${activeMatch.id}`);
        if (playersRes.ok) {
          const playersData = await playersRes.json();
          if (playersData.data && Array.isArray(playersData.data)) {
            setPlayers(playersData.data);
          } else if (Array.isArray(playersData)) {
            setPlayers(playersData);
          }
        }
        resetAddPlayerForm();
        setActiveSection('players');
      } else {
        setAddPlayerError('Registration failed. The API returned no data — please check if the player already exists.');
      }
    } catch (err: any) {
      console.error('❌ Player registration failed:', err);
      setAddPlayerError(err?.message || 'Failed to register player. Please try again.');
    } finally {
      setAddPlayerLoading(false);
    }
  };

  // Display limited items for preview (quick view on dashboard)
  const displayedTeams = teams.slice(0, 4);
  const displayedPlayers = players.slice(0, 6);

  // Helper: Calculate player count for a team from players data
  const getTeamPlayerCount = useMemo(() => {
    const playerCountMap: Record<string, number> = {};
    players.forEach(player => {
      const teamId = (player as any).soldTo || player.teamId;
      if (teamId && player.status === 'SOLD') {
        playerCountMap[teamId] = (playerCountMap[teamId] || 0) + 1;
      }
    });
    return (teamId: string) => playerCountMap[teamId] || 0;
  }, [players]);

  // ============================================
  // TEAM MODERATION FUNCTIONS
  // ============================================
  
  const getTeamApprovalStatus = (team: Team): ApprovalStatus => {
    return team.approvalStatus || 'pending';
  };

  const handleUpdateTeamApproval = async (teamId: string, status: 'accepted' | 'declined') => {
    setUpdatingTeamApproval(teamId);
    try {
      const response = await fetch(`${API_BASE}/teams/${teamId}/${status === 'accepted' ? 'approve' : 'decline'}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        // Update local state
        setTeams(prev => prev.map(t => 
          t.id === teamId ? { ...t, approvalStatus: status } : t
        ));
      } else {
        console.error('Failed to update team approval status');
      }
    } catch (error) {
      console.error('Error updating team approval:', error);
    } finally {
      setUpdatingTeamApproval(null);
    }
  };

  // Sort teams by approval status: accepted first, then pending, then declined
  const sortTeamsByApprovalStatus = (a: Team, b: Team): number => {
    const order: Record<ApprovalStatus, number> = { accepted: 0, pending: 1, declined: 2 };
    const statusA = getTeamApprovalStatus(a);
    const statusB = getTeamApprovalStatus(b);
    return order[statusA] - order[statusB];
  };

  // Approval status counts for teams
  const acceptedTeamsCount = useMemo(() => teams.filter(t => getTeamApprovalStatus(t) === 'accepted').length, [teams]);
  const pendingTeamsCount = useMemo(() => teams.filter(t => getTeamApprovalStatus(t) === 'pending').length, [teams]);
  const declinedTeamsCount = useMemo(() => teams.filter(t => getTeamApprovalStatus(t) === 'declined').length, [teams]);

  // Handle logout with confirmation
  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout? You will be redirected to the Explore Auctions page.')) {
      localStorage.removeItem('savedUser');
      sessionStorage.removeItem('hypehammer_current_user');
      sessionStorage.removeItem('hypehammer_current_status');
      sessionStorage.removeItem('hypehammer_current_sport');
      sessionStorage.removeItem('hypehammer_current_match_id');
      sessionStorage.setItem('hypehammer_explicit_exit', 'true');
      setStatus(AuctionStatus.HOME);
    }
  };

  // Handle back to explore auctions
  const handleBackToExplore = () => {
    sessionStorage.removeItem('hypehammer_current_status');
    sessionStorage.removeItem('hypehammer_current_sport');
    sessionStorage.removeItem('hypehammer_current_match_id');
    sessionStorage.setItem('hypehammer_explicit_exit', 'true');
    setStatus(AuctionStatus.HOME);
  };

  // Handle go to live room
  const handleGoToLiveRoom = () => {
    setActiveSection('liveRoom');
  };

  // Handle start auction - calls API and enters live room
  const handleStartAuction = async () => {
    if (!activeMatch?.id || startingAuction) return;
    
    setStartingAuction(true);
    try {
      // Start the auction
      const response = await fetch(`${API_BASE}/api/auction/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seasonId: activeMatch.id })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('[Auctioneer] Auction started:', data);
        setLiveAuctionStatus('LIVE');
        
        // Get first APPROVED player in queue and start bidding
        // CRITICAL: Only select from players with approvalStatus === 'accepted' (or undefined for backwards compat)
        const availableApprovedPlayers = eligiblePlayers.filter(p => 
          p.status === 'AVAILABLE' && 
          (p.approvalStatus === 'accepted' || p.approvalStatus === undefined || p.approvalStatus === null)
        );
        if (availableApprovedPlayers.length > 0) {
          const firstPlayer = availableApprovedPlayers[0];
          // Start bidding for first player
          await fetch(`${API_BASE}/api/auction/player/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              seasonId: activeMatch.id,
              playerId: firstPlayer.id,
              basePrice: firstPlayer.basePrice || 200000
            })
          });
        }
        
        // Navigate to live room
        setActiveSection('liveRoom');
      } else {
        console.error('[Auctioneer] Failed to start auction');
      }
    } catch (error) {
      console.error('[Auctioneer] Error starting auction:', error);
    } finally {
      setStartingAuction(false);
    }
  };

  // Handle go to teams page
  const handleGoToTeams = () => {
    setActiveSection('teams');
    setActiveNav(2);
  };

  // Handle go to players page
  const handleGoToPlayers = () => {
    setActiveSection('players');
    setActiveNav(3);
  };

  // Handle go to player applications page
  const handleGoToPlayerApplications = () => {
    setActiveSection('playerApplications');
    setActiveNav(4);
  };

  // Handle go to report page
  const handleGoToReport = () => {
    setActiveSection('report');
    setActiveNav(5);
  };

  // Handle go to settings page
  const handleGoToSettings = () => {
    setActiveSection('settings');
    setActiveNav(6);
  };

  // Handle go to results page (auction ended state)
  const handleGoToResults = () => {
    setActiveSection('results');
    setActiveNav(7);
  };

  // Switch to Live Room view
  if (activeSection === 'liveRoom' && activeMatch) {
    return (
      <div className="fixed inset-0 z-50">
        <LiveAuctionPage
          seasonId={activeMatch.id}
          userId={currentUser.email}
          userRole={UserRole.AUCTIONEER}
          onClose={() => setActiveSection('dashboard')}
        />
      </div>
    );
  }

  // navIcons defined early so it's available for sidebar
  const navIcons = [
    { icon: Home, label: 'Home' },
    { icon: Radio, label: 'Live Room' },
    { icon: Users, label: 'Teams' },
    { icon: User, label: 'Players' },
    { icon: UserCheck, label: 'Applications' },
    { icon: FileText, label: 'Report' },
    { icon: Settings, label: 'Settings' },
    ...(liveAuctionStatus === 'ENDED' ? [{ icon: Trophy, label: 'Results' }] : []),
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Global navigation search pages
  const navSearchPages = [
    { label: 'Home', section: 'dashboard' as const, navIdx: 0, icon: Home },
    { label: 'Live Room', section: 'liveRoom' as const, navIdx: 1, icon: Radio },
    { label: 'Teams', section: 'teams' as const, navIdx: 2, icon: Users },
    { label: 'Players', section: 'players' as const, navIdx: 3, icon: User },
    { label: 'Applications', section: 'playerApplications' as const, navIdx: 4, icon: UserCheck },
    { label: 'Report', section: 'report' as const, navIdx: 5, icon: FileText },
    { label: 'Settings', section: 'settings' as const, navIdx: 6, icon: Settings },
    ...(liveAuctionStatus === 'ENDED' ? [{ label: 'Results', section: 'results' as const, navIdx: 7, icon: Trophy }] : []),
  ];

  const filteredNavPages = navSearchQuery.trim()
    ? navSearchPages.filter(p => p.label.toLowerCase().includes(navSearchQuery.toLowerCase()))
    : [];

  const handleNavSearchSelect = (page: typeof navSearchPages[0]) => {
    if (page.section === 'liveRoom') {
      handleGoToLiveRoom();
    } else {
      setActiveSection(page.section);
      setActiveNav(page.navIdx);
    }
    setNavSearchQuery('');
    setNavSearchFocused(false);
  };

  // Calculate report statistics
  const soldPlayersCount = eligiblePlayers.filter(p => p.status === 'SOLD').length;
  const unsoldPlayersCount = eligiblePlayers.filter(p => p.status === 'UNSOLD').length;
  const pendingPlayersCount = eligiblePlayers.filter(p => p.status === 'PENDING' || p.status === 'AVAILABLE').length;
  const totalAmountSpent = eligiblePlayers.filter(p => p.status === 'SOLD').reduce((sum, p) => {
    return sum + ((p as any).soldAmount || p.soldPrice || p.currentBid || 0);
  }, 0);

  // Render content based on active section
  const renderContent = () => {
    switch (activeSection) {
      case 'players':
        return (
          <PlayersPage
            onClose={() => setActiveSection('dashboard')}
            currentMatch={activeMatch}
            onAddPlayer={() => { resetAddPlayerForm(); setActiveSection('addPlayer'); }}
          />
        );

      case 'playerApplications':
        return (
          <PlayerApplicationsPage
            onClose={() => setActiveSection('dashboard')}
            currentMatch={activeMatch}
          />
        );

      case 'teams':
        // Filter teams by search query and moderation filter, then sort by approval status
        const searchFilteredTeams = teams.filter(team => {
          if (!teamSearchQuery.trim()) return true;
          const query = teamSearchQuery.toLowerCase();
          return team.name.toLowerCase().includes(query) || 
                 (team.homeCity && team.homeCity.toLowerCase().includes(query));
        });
        
        // Apply moderation filter
        const moderationFilteredTeams = teamModerationFilter === 'all' 
          ? searchFilteredTeams 
          : searchFilteredTeams.filter(t => getTeamApprovalStatus(t) === teamModerationFilter);
        
        // Sort by approval status: accepted first, then pending, then declined
        const processedTeams = [...moderationFilteredTeams].sort(sortTeamsByApprovalStatus);
        
        return (
          <div className="flex-1 p-6 pr-8 pb-16">
            {/* Header - Game HUD Style */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                {/* Teams Icon */}
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.25), rgba(180, 50, 120, 0.2))',
                    border: '1px solid rgba(236, 72, 153, 0.4)',
                    boxShadow: '0 0 20px rgba(236, 72, 153, 0.25)'
                  }}
                >
                  <Shield size={24} className="text-pink-400" />
                </div>
                <div>
                  <h1 className="text-3xl font-black text-white tracking-tight">Team Command Center</h1>
                  <p className="text-pink-400/50 text-sm mt-1">{activeMatch?.name || 'All Teams'} &mdash; {processedTeams.length} franchise{processedTeams.length !== 1 ? 's' : ''} registered</p>
                </div>
              </div>
              
              {/* Search Bar + Add Team + Exit Button */}
              <div className="flex items-center gap-3">
                {/* Search Bar - Game HUD Style */}
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-pink-400/50" />
                  <input
                    type="text"
                    value={teamSearchQuery}
                    onChange={(e) => setTeamSearchQuery(e.target.value)}
                    placeholder="Search teams..."
                    className="w-64 pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-pink-400/40 transition-all duration-300 focus:w-80 focus:outline-none"
                    style={{
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(236, 72, 153, 0.25)',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                    }}
                    onFocus={(e) => {
                      e.target.style.border = '1px solid rgba(236, 72, 153, 0.6)';
                      e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2), 0 0 15px rgba(236, 72, 153, 0.15)';
                    }}
                    onBlur={(e) => {
                      e.target.style.border = '1px solid rgba(236, 72, 153, 0.25)';
                      e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2)';
                    }}
                  />
                </div>
                {/* Add Team Button */}
                <button
                  onClick={() => { resetAddTeamForm(); setActiveSection('addTeam'); }}
                  className="px-5 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 transition-all duration-300 hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, #ec4899, #e11d48)',
                    color: '#fff',
                    boxShadow: '0 0 20px rgba(236, 72, 153, 0.35)',
                    border: '1px solid rgba(236, 72, 153, 0.6)'
                  }}
                >
                  <Plus size={16} />
                  Add Team
                </button>
                <button
                  onClick={() => setActiveSection('dashboard')}
                  className="px-5 py-2.5 rounded-full bg-white/5 border border-pink-500/20 text-pink-300 hover:bg-pink-500/10 hover:border-pink-500/40 transition-all flex items-center gap-2 text-sm font-semibold"
                >
                  <ArrowLeft size={16} />
                  Exit
                </button>
              </div>
            </div>

            {/* Moderation Filter Tabs */}
            <div className="mb-6">
              <div 
                className="rounded-xl p-1 inline-flex"
                style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(236, 72, 153, 0.15)'
                }}
              >
                <button
                  onClick={() => setTeamModerationFilter('all')}
                  className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${
                    teamModerationFilter === 'all'
                      ? 'text-white'
                      : 'text-pink-300/60 hover:bg-pink-500/10'
                  }`}
                  style={teamModerationFilter === 'all' ? {
                    background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.3), rgba(220, 38, 38, 0.2))',
                    border: '1px solid rgba(236, 72, 153, 0.4)',
                  } : {}}
                >
                  All ({teams.length})
                </button>
                <button
                  onClick={() => setTeamModerationFilter('accepted')}
                  className={`px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 ${
                    teamModerationFilter === 'accepted'
                      ? 'text-white'
                      : 'text-green-300/60 hover:bg-green-500/10'
                  }`}
                  style={teamModerationFilter === 'accepted' ? {
                    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(22, 163, 74, 0.2))',
                    border: '1px solid rgba(34, 197, 94, 0.4)',
                  } : {}}
                >
                  <Check size={12} />
                  Accepted ({acceptedTeamsCount})
                </button>
                <button
                  onClick={() => setTeamModerationFilter('pending')}
                  className={`px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 ${
                    teamModerationFilter === 'pending'
                      ? 'text-white'
                      : 'text-amber-300/60 hover:bg-amber-500/10'
                  }`}
                  style={teamModerationFilter === 'pending' ? {
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.3), rgba(217, 119, 6, 0.2))',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                  } : {}}
                >
                  <Clock size={12} />
                  Pending ({pendingTeamsCount})
                </button>
                <button
                  onClick={() => setTeamModerationFilter('declined')}
                  className={`px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 ${
                    teamModerationFilter === 'declined'
                      ? 'text-white'
                      : 'text-red-300/60 hover:bg-red-500/10'
                  }`}
                  style={teamModerationFilter === 'declined' ? {
                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(220, 38, 38, 0.2))',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                  } : {}}
                >
                  <Ban size={12} />
                  Declined ({declinedTeamsCount})
                </button>
              </div>
            </div>

            {/* Teams Grid - Using TeamHUDCard */}
            {loadingTeams ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="rounded-xl p-5 h-64" style={{ background: 'linear-gradient(145deg, rgba(20, 10, 25, 0.95), rgba(30, 15, 35, 0.9))', border: '1px solid rgba(236, 72, 153, 0.2)' }}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="animate-pulse bg-pink-500/15 w-14 h-14 rounded-lg"></div>
                      <div className="flex-1">
                        <div className="animate-pulse bg-pink-500/15 w-3/4 h-4 rounded mb-2"></div>
                        <div className="animate-pulse bg-pink-500/10 w-1/2 h-3 rounded"></div>

                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="animate-pulse bg-pink-500/10 h-14 rounded-lg"></div>
                      <div className="animate-pulse bg-pink-500/10 h-14 rounded-lg"></div>
                    </div>
                    <div className="animate-pulse bg-pink-500/10 w-full h-2.5 rounded-full"></div>
                  </div>
                ))}
              </div>
            ) : processedTeams.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {processedTeams.map((team) => (
                  <TeamHUDCard
                    key={team.id}
                    team={team}
                    playerCount={getTeamPlayerCount(team.id)}
                    maxPlayers={18}
                    onClick={() => {
                      setSelectedTeamId(team.id);
                      setActiveSection('teamDetail');
                    }}
                    showModeration={true}
                    onApprove={(teamId) => handleUpdateTeamApproval(teamId, 'accepted')}
                    onDecline={(teamId) => handleUpdateTeamApproval(teamId, 'declined')}
                    isUpdating={updatingTeamApproval === team.id}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl p-12 text-center" style={{ background: 'linear-gradient(145deg, rgba(20, 10, 25, 0.7), rgba(30, 15, 35, 0.6))', border: '1px dashed rgba(236, 72, 153, 0.25)' }}>
                <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(236, 72, 153, 0.08)', border: '1px solid rgba(236, 72, 153, 0.15)' }}>
                  <Users size={32} className="text-pink-400/30" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">No Teams Registered</h3>
                <p className="text-pink-400/40 text-sm mb-6">No teams have registered for this auction yet.</p>
                <button
                  onClick={() => { resetAddTeamForm(); setActiveSection('addTeam'); }}
                  className="px-6 py-3 rounded-full font-bold text-sm inline-flex items-center gap-2 transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #ec4899, #e11d48)',
                    color: '#fff',
                    boxShadow: '0 0 20px rgba(236, 72, 153, 0.35)'
                  }}
                >
                  <Plus size={16} />
                  Add First Team
                </button>
              </div>
            )}
          </div>
        );

      case 'addTeam':
        return (
          <div className="flex-1 p-6 pr-8 pb-16">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(236, 72, 153, 0.15)', border: '1px solid rgba(236, 72, 153, 0.3)' }}>
                  <Plus size={24} className="text-pink-400" />
                </div>
                <div>
                  <h1 className="text-3xl font-black text-white tracking-tight">Register New Team</h1>
                  <p className="text-pink-400/50 text-sm mt-1">Complete all required fields to add a franchise to {activeMatch?.name || 'this auction'}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveSection('teams')}
                className="px-5 py-2.5 rounded-full bg-white/5 border border-pink-500/20 text-pink-300 hover:bg-pink-500/10 hover:border-pink-500/40 transition-all flex items-center gap-2 text-sm font-semibold"
              >
                <ArrowLeft size={16} />
                Back to Teams
              </button>
            </div>

            {/* Error Message */}
            {addTeamError && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm mb-6" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5' }}>
                <AlertCircle size={16} />
                {addTeamError}
              </div>
            )}

            {/* Form Content */}
            <div className="max-w-7xl space-y-5">
              {/* Row 1: Upload Logo + Personal Information */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Left: Upload Logo with Preview */}
                <div className="lg:col-span-3">
                  <div className="glass-card rounded-2xl p-5 h-full">
                    <h3 className="text-sm font-black text-pink-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Image size={16} />
                      Team Logo
                    </h3>
                    <div 
                      className="relative rounded-xl cursor-pointer transition-all h-[150px] flex items-center justify-center overflow-hidden"
                      style={{ 
                        background: isDraggingLogo ? 'rgba(236, 72, 153, 0.15)' : teamLogoPreviewUrl ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.3)',
                        border: `2px dashed ${isDraggingLogo ? 'rgba(236, 72, 153, 0.6)' : teamLogoFile ? 'rgba(34, 197, 94, 0.5)' : 'rgba(236, 72, 153, 0.25)'}`
                      }}
                      onDragOver={e => handleDragOver(e, 'logo')}
                      onDragLeave={e => handleDragLeave(e, 'logo')}
                      onDrop={e => handleDrop(e, 'logo')}
                      onClick={() => document.getElementById('teamLogoInput')?.click()}
                    >
                      <input type="file" id="teamLogoInput" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                      {teamLogoPreviewUrl ? (
                        <div className="relative w-full h-full">
                          <img src={teamLogoPreviewUrl} alt="Team Logo Preview" className="w-full h-full object-contain p-4" />
                          <div className="absolute top-2 right-2 flex items-center gap-2">
                            <CheckCircle size={20} className="text-green-400" />
                          </div>
                          <button 
                            type="button" 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              if (teamLogoPreviewUrl) URL.revokeObjectURL(teamLogoPreviewUrl);
                              setTeamLogoFile(null);
                              setTeamLogoPreviewUrl(null);
                            }} 
                            className="absolute bottom-1 left-1/2 -translate-x-1/2 px-3 py-1 rounded-lg bg-red-500/20 border border-red-400/40 text-red-300 hover:bg-red-500/30 text-[10px] font-semibold transition-all"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="text-center px-3 py-2">
                          <Image size={32} className="mx-auto mb-1 text-pink-400/60" />
                          <p className="text-xs font-bold text-white mb-1">Upload Logo</p>
                          <p className="text-[10px] text-pink-400/70">Click or drag</p>
                          <p className="text-[10px] text-pink-400/40">(JPG, PNG)</p>
                        </div>
                      )}
                    </div>
                    {teamLogoFile && (
                      <div className="mt-1 text-center">
                        <p className="text-[10px] text-green-400 font-semibold truncate">✓ {teamLogoFile.name}</p>
                        <p className="text-[10px] text-pink-400/50">{(teamLogoFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Personal Information */}
                <div className="lg:col-span-9">
                  <div className="glass-card rounded-2xl p-5 h-full">
                    <h3 className="text-sm font-black text-pink-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <User size={16} />
                      Personal Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-pink-400/70 mb-2">Full Name <span className="text-red-400">*</span></label>
                        <input type="text" value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="Representative Full Name" className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-pink-300/30 focus:outline-none transition-all" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(236,72,153,0.2)' }} onFocus={e => { e.target.style.borderColor = 'rgba(236,72,153,0.5)'; }} onBlur={e => { e.target.style.borderColor = 'rgba(236,72,153,0.2)'; }} />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-pink-400/70 mb-2">Email <span className="text-red-400">*</span></label>
                        <input type="email" value={teamEmail} onChange={e => setTeamEmail(e.target.value)} placeholder="email@example.com" className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-pink-300/30 focus:outline-none transition-all" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(236,72,153,0.2)' }} onFocus={e => { e.target.style.borderColor = 'rgba(236,72,153,0.5)'; }} onBlur={e => { e.target.style.borderColor = 'rgba(236,72,153,0.2)'; }} />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-pink-400/70 mb-2">Phone</label>
                        <input type="tel" value={teamPhone} onChange={e => setTeamPhone(e.target.value)} placeholder="+91 1234567890" className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-pink-300/30 focus:outline-none transition-all" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(236,72,153,0.2)' }} onFocus={e => { e.target.style.borderColor = 'rgba(236,72,153,0.5)'; }} onBlur={e => { e.target.style.borderColor = 'rgba(236,72,153,0.2)'; }} />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-pink-400/70 mb-2">Password <span className="text-red-400">*</span></label>
                        <input type="password" value={teamPassword} onChange={e => setTeamPassword(e.target.value)} placeholder="••••••••" className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-pink-300/30 focus:outline-none transition-all" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(236,72,153,0.2)' }} onFocus={e => { e.target.style.borderColor = 'rgba(236,72,153,0.5)'; }} onBlur={e => { e.target.style.borderColor = 'rgba(236,72,153,0.2)'; }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2: Team Details (Left Side Only) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-12">
                  <div className="glass-card rounded-2xl p-5">
                    <h3 className="text-sm font-black text-pink-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Trophy size={16} />
                      Team Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-pink-400/70 mb-2">Team Name <span className="text-red-400">*</span></label>
                        <input type="text" value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="e.g., Mumbai Warriors" className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-pink-300/30 focus:outline-none transition-all" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(236,72,153,0.2)' }} onFocus={e => { e.target.style.borderColor = 'rgba(236,72,153,0.5)'; }} onBlur={e => { e.target.style.borderColor = 'rgba(236,72,153,0.2)'; }} />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-pink-400/70 mb-2">Team Short Code <span className="text-red-400">*</span></label>
                        <input type="text" value={teamShortCode} onChange={e => setTeamShortCode(e.target.value.toUpperCase())} maxLength={5} placeholder="e.g., MUM" className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-pink-300/30 uppercase focus:outline-none transition-all" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(236,72,153,0.2)' }} onFocus={e => { e.target.style.borderColor = 'rgba(236,72,153,0.5)'; }} onBlur={e => { e.target.style.borderColor = 'rgba(236,72,153,0.2)'; }} />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-pink-400/70 mb-2">Home City <span className="text-red-400">*</span></label>
                        <input type="text" value={homeCity} onChange={e => setHomeCity(e.target.value)} placeholder="e.g., Mumbai" className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-pink-300/30 focus:outline-none transition-all" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(236,72,153,0.2)' }} onFocus={e => { e.target.style.borderColor = 'rgba(236,72,153,0.5)'; }} onBlur={e => { e.target.style.borderColor = 'rgba(236,72,153,0.2)'; }} />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-pink-400/70 mb-2">Role in Team <span className="text-red-400">*</span></label>
                        <select value={roleInTeam} onChange={e => setRoleInTeam(e.target.value)} className="w-full px-4 py-3 rounded-xl text-sm text-white focus:outline-none transition-all" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(236,72,153,0.2)' }} onFocus={e => { e.target.style.borderColor = 'rgba(236,72,153,0.5)'; }} onBlur={e => { e.target.style.borderColor = 'rgba(236,72,153,0.2)'; }}>
                          <option value="" style={{ background: '#1a0a1e', color: '#fff' }}>Select Role</option>
                          <option value="Owner" style={{ background: '#1a0a1e', color: '#fff' }}>Owner</option>
                          <option value="Manager" style={{ background: '#1a0a1e', color: '#fff' }}>Manager</option>
                          <option value="Captain" style={{ background: '#1a0a1e', color: '#fff' }}>Captain</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 3: Required Documents & Verification */}
              <div className="glass-card rounded-2xl p-5">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Left: Required Documents */}
                  <div>
                    <h3 className="text-sm font-black text-pink-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Upload size={16} />
                      Required Documents
                    </h3>
                    <div className="space-y-4">
                          <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-pink-400/70 mb-2">Authorization Letter <span className="text-red-400">*</span></label>
                        <div 
                          className="relative rounded-xl p-4 cursor-pointer transition-all"
                          style={{ 
                            background: isDraggingAuth ? 'rgba(236, 72, 153, 0.15)' : authLetterFile ? 'rgba(34, 197, 94, 0.1)' : 'rgba(0,0,0,0.3)',
                            border: `2px dashed ${isDraggingAuth ? 'rgba(236, 72, 153, 0.6)' : authLetterFile ? 'rgba(34, 197, 94, 0.5)' : 'rgba(236, 72, 153, 0.25)'}`
                          }}
                          onDragOver={e => handleDragOver(e, 'auth')}
                          onDragLeave={e => handleDragLeave(e, 'auth')}
                          onDrop={e => handleDrop(e, 'auth')}
                          onClick={() => document.getElementById('authLetterInput')?.click()}
                        >
                          <input type="file" id="authLetterInput" accept=".pdf" onChange={handleAuthLetterUpload} className="hidden" />
                          <div className="text-center">
                            {authLetterFile ? (
                              <>
                                <CheckCircle size={28} className="mx-auto mb-2 text-green-400" />
                                <p className="text-sm font-bold text-green-300 mb-1">✓ Letter Uploaded</p>
                                <p className="text-xs text-pink-300/60 truncate">{authLetterFile.name}</p>
                                <p className="text-xs text-pink-400/40 mt-1">({(authLetterFile.size / 1024 / 1024).toFixed(2)} MB)</p>
                                <button type="button" onClick={(e) => { e.stopPropagation(); setAuthLetterFile(null); }} className="mt-2 text-xs text-red-400 hover:text-red-300 font-semibold">Remove</button>
                              </>
                            ) : (
                              <>
                                <FileIcon size={24} className="mx-auto mb-2 text-pink-400/60" />
                                <p className="text-xs font-semibold text-white mb-1">Auth Letter</p>
                                <p className="text-[10px] text-pink-400/50">Click or drag PDF</p>
                                <p className="text-[10px] text-pink-400/30 mt-0.5">(Max 10MB)</p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Verification */}
                  <div>
                    <h3 className="text-sm font-black text-pink-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Shield size={16} />
                      Verification
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-pink-400/70 mb-2">Government ID Number <span className="text-red-400">*</span></label>
                        <input type="text" value={governmentId} onChange={e => setGovernmentId(e.target.value)} placeholder="Aadhaar / PAN / Driving License Number" className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-pink-300/30 focus:outline-none transition-all" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(236,72,153,0.2)' }} onFocus={e => { e.target.style.borderColor = 'rgba(236,72,153,0.5)'; }} onBlur={e => { e.target.style.borderColor = 'rgba(236,72,153,0.2)'; }} />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-pink-400/70 mb-2">Upload ID Proof <span className="text-red-400">*</span></label>
                        <div 
                          className="relative rounded-xl p-4 cursor-pointer transition-all"
                          style={{ 
                            background: isDraggingGovId ? 'rgba(236, 72, 153, 0.15)' : govIdFile ? 'rgba(34, 197, 94, 0.1)' : 'rgba(0,0,0,0.3)',
                            border: `2px dashed ${isDraggingGovId ? 'rgba(236, 72, 153, 0.6)' : govIdFile ? 'rgba(34, 197, 94, 0.5)' : 'rgba(236, 72, 153, 0.25)'}`
                          }}
                          onDragOver={e => handleDragOver(e, 'govId')}
                          onDragLeave={e => handleDragLeave(e, 'govId')}
                          onDrop={e => handleDrop(e, 'govId')}
                          onClick={() => document.getElementById('govIdInput')?.click()}
                        >
                          <input type="file" id="govIdInput" accept=".pdf,.jpg,.jpeg,.png" onChange={handleGovIdUpload} className="hidden" />
                          <div className="text-center">
                            {govIdFile ? (
                              <>
                                <CheckCircle size={28} className="mx-auto mb-2 text-green-400" />
                                <p className="text-sm font-bold text-green-300 mb-1">✓ ID Uploaded</p>
                                <p className="text-xs text-pink-300/60 truncate">{govIdFile.name}</p>
                                <p className="text-xs text-pink-400/40 mt-1">({(govIdFile.size / 1024 / 1024).toFixed(2)} MB)</p>
                                <button type="button" onClick={(e) => { e.stopPropagation(); setGovIdFile(null); }} className="mt-2 text-xs text-red-400 hover:text-red-300 font-semibold">Remove</button>
                              </>
                            ) : (
                              <>
                                <Upload size={24} className="mx-auto mb-2 text-pink-400/60" />
                                <p className="text-xs font-semibold text-white mb-1">ID Proof</p>
                                <p className="text-[10px] text-pink-400/50">Click or drag file</p>
                                <p className="text-[10px] text-pink-400/30 mt-0.5">(PDF, JPG, PNG)</p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => { setActiveSection('teams'); resetAddTeamForm(); }}
                  disabled={addTeamLoading}
                  className="px-6 py-3 rounded-xl text-sm font-semibold text-pink-300/70 hover:text-white hover:bg-white/5 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddTeam}
                  disabled={addTeamLoading}
                  className="px-10 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all duration-300 disabled:opacity-50 hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, #ec4899, #e11d48)',
                    color: '#fff',
                    boxShadow: '0 0 20px rgba(236, 72, 153, 0.3)'
                  }}
                >
                  {addTeamLoading ? <><Loader2 size={18} className="animate-spin" /> Registering Team...</> : <><Plus size={18} /> Register Team</>}
                </button>
              </div>
            </div>
          </div>
        );

      case 'addPlayer':
        return (
          <div className="flex-1 p-6 pr-8 pb-16">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(236, 72, 153, 0.15)', border: '1px solid rgba(236, 72, 153, 0.3)' }}>
                  <Plus size={24} className="text-pink-400" />
                </div>
                <div>
                  <h1 className="text-3xl font-black text-white tracking-tight">Register New Player</h1>
                  <p className="text-pink-400/50 text-sm mt-1">Complete all required fields to add a player to {activeMatch?.name || 'this auction'}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveSection('players')}
                className="px-5 py-2.5 rounded-full bg-white/5 border border-pink-500/20 text-pink-300 hover:bg-pink-500/10 hover:border-pink-500/40 transition-all flex items-center gap-2 text-sm font-semibold"
              >
                <ArrowLeft size={16} />
                Back to Players
              </button>
            </div>

            {/* Error Message */}
            {addPlayerError && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm mb-6" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5' }}>
                <AlertCircle size={16} />
                {addPlayerError}
              </div>
            )}

            {/* Form Content */}
            <div className="max-w-7xl space-y-5">
              {/* Row 1: Player Photo + Personal Information */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Left: Player Photo with Preview */}
                <div className="lg:col-span-3">
                  <div className="glass-card rounded-2xl p-5 h-full">
                    <h3 className="text-sm font-black text-pink-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Image size={16} />
                      Player Photo
                    </h3>
                    <div 
                      className="relative rounded-xl cursor-pointer transition-all h-[150px] flex items-center justify-center overflow-hidden"
                      style={{ 
                        background: isDraggingPlayerPhoto ? 'rgba(236, 72, 153, 0.15)' : playerPhotoPreviewUrl ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.3)',
                        border: `2px dashed ${isDraggingPlayerPhoto ? 'rgba(236, 72, 153, 0.6)' : playerPhotoFile ? 'rgba(34, 197, 94, 0.5)' : 'rgba(236, 72, 153, 0.25)'}`
                      }}
                      onDragOver={e => handlePlayerDragOver(e, 'photo')}
                      onDragLeave={e => handlePlayerDragLeave(e, 'photo')}
                      onDrop={e => handlePlayerDrop(e, 'photo')}
                      onClick={() => document.getElementById('playerPhotoInput')?.click()}
                    >
                      <input type="file" id="playerPhotoInput" accept="image/*" onChange={handlePlayerPhotoUpload} className="hidden" />
                      {playerPhotoPreviewUrl ? (
                        <div className="relative w-full h-full">
                          <img src={playerPhotoPreviewUrl} alt="Player Photo Preview" className="w-full h-full object-contain p-4" />
                          <div className="absolute top-2 right-2 flex items-center gap-2">
                            <CheckCircle size={20} className="text-green-400" />
                          </div>
                          <button 
                            type="button" 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              if (playerPhotoPreviewUrl) URL.revokeObjectURL(playerPhotoPreviewUrl);
                              setPlayerPhotoFile(null);
                              setPlayerPhotoPreviewUrl(null);
                            }} 
                            className="absolute bottom-1 left-1/2 -translate-x-1/2 px-3 py-1 rounded-lg bg-red-500/20 border border-red-400/40 text-red-300 hover:bg-red-500/30 text-[10px] font-semibold transition-all"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="text-center px-3 py-2">
                          <Image size={32} className="mx-auto mb-1 text-pink-400/60" />
                          <p className="text-xs font-bold text-white mb-1">Upload Photo</p>
                          <p className="text-[10px] text-pink-400/70">Click or drag</p>
                          <p className="text-[10px] text-pink-400/40">(JPG, PNG)</p>
                        </div>
                      )}
                    </div>
                    {playerPhotoFile && (
                      <div className="mt-1 text-center">
                        <p className="text-[10px] text-green-400 font-semibold truncate">✓ {playerPhotoFile.name}</p>
                        <p className="text-[10px] text-pink-400/50">{(playerPhotoFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Personal Information */}
                <div className="lg:col-span-9">
                  <div className="glass-card rounded-2xl p-5 h-full">
                    <h3 className="text-sm font-black text-pink-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <User size={16} />
                      Personal Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-pink-400/70 mb-2">Full Name <span className="text-red-400">*</span></label>
                        <input type="text" value={playerName} onChange={e => setPlayerName(e.target.value)} placeholder="Player Full Name" className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-pink-300/30 focus:outline-none transition-all" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(236,72,153,0.2)' }} onFocus={e => { e.target.style.borderColor = 'rgba(236,72,153,0.5)'; }} onBlur={e => { e.target.style.borderColor = 'rgba(236,72,153,0.2)'; }} />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-pink-400/70 mb-2">Email <span className="text-red-400">*</span></label>
                        <input type="email" value={playerEmail} onChange={e => setPlayerEmail(e.target.value)} placeholder="email@example.com" className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-pink-300/30 focus:outline-none transition-all" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(236,72,153,0.2)' }} onFocus={e => { e.target.style.borderColor = 'rgba(236,72,153,0.5)'; }} onBlur={e => { e.target.style.borderColor = 'rgba(236,72,153,0.2)'; }} />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-pink-400/70 mb-2">Phone</label>
                        <input type="tel" value={playerPhone} onChange={e => setPlayerPhone(e.target.value)} placeholder="+91 1234567890" className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-pink-300/30 focus:outline-none transition-all" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(236,72,153,0.2)' }} onFocus={e => { e.target.style.borderColor = 'rgba(236,72,153,0.5)'; }} onBlur={e => { e.target.style.borderColor = 'rgba(236,72,153,0.2)'; }} />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-pink-400/70 mb-2">Password <span className="text-red-400">*</span></label>
                        <input type="password" value={playerPassword} onChange={e => setPlayerPassword(e.target.value)} placeholder="••••••••" className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-pink-300/30 focus:outline-none transition-all" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(236,72,153,0.2)' }} onFocus={e => { e.target.style.borderColor = 'rgba(236,72,153,0.5)'; }} onBlur={e => { e.target.style.borderColor = 'rgba(236,72,153,0.2)'; }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2: Player Details */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-12">
                  <div className="glass-card rounded-2xl p-5">
                    <h3 className="text-sm font-black text-pink-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Activity size={16} />
                      Player Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-pink-400/70 mb-2">Playing Role <span className="text-red-400">*</span></label>
                        <select value={playerRoleId} onChange={e => setPlayerRoleId(e.target.value)} className="w-full px-4 py-3 rounded-xl text-sm text-white focus:outline-none transition-all" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(236,72,153,0.2)' }} onFocus={e => { e.target.style.borderColor = 'rgba(236,72,153,0.5)'; }} onBlur={e => { e.target.style.borderColor = 'rgba(236,72,153,0.2)'; }}>
                          <option value="" style={{ background: '#1a0a1e', color: '#fff' }}>Select Role</option>
                          {(activeMatch?.config?.roles || []).map((role: any) => (
                            <option key={role.id} value={role.id} style={{ background: '#1a0a1e', color: '#fff' }}>{role.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-pink-400/70 mb-2">Base Price (₹) <span className="text-red-400">*</span></label>
                        <input type="number" value={playerBasePrice} onChange={e => setPlayerBasePrice(e.target.value)} placeholder="500000" min={50000} className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-pink-300/30 focus:outline-none transition-all" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(236,72,153,0.2)' }} onFocus={e => { e.target.style.borderColor = 'rgba(236,72,153,0.5)'; }} onBlur={e => { e.target.style.borderColor = 'rgba(236,72,153,0.2)'; }} />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-pink-400/70 mb-2">Age</label>
                        <input type="number" value={playerAge} onChange={e => setPlayerAge(e.target.value)} placeholder="25" min={14} max={60} className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-pink-300/30 focus:outline-none transition-all" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(236,72,153,0.2)' }} onFocus={e => { e.target.style.borderColor = 'rgba(236,72,153,0.5)'; }} onBlur={e => { e.target.style.borderColor = 'rgba(236,72,153,0.2)'; }} />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-pink-400/70 mb-2">Gender <span className="text-red-400">*</span></label>
                        <select value={playerGender} onChange={e => setPlayerGender(e.target.value)} className="w-full px-4 py-3 rounded-xl text-sm text-white focus:outline-none transition-all" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(236,72,153,0.2)' }} onFocus={e => { e.target.style.borderColor = 'rgba(236,72,153,0.5)'; }} onBlur={e => { e.target.style.borderColor = 'rgba(236,72,153,0.2)'; }}>
                          <option value="" style={{ background: '#1a0a1e', color: '#fff' }}>Select Gender</option>
                          <option value="Male" style={{ background: '#1a0a1e', color: '#fff' }}>Male</option>
                          <option value="Female" style={{ background: '#1a0a1e', color: '#fff' }}>Female</option>
                          <option value="Other" style={{ background: '#1a0a1e', color: '#fff' }}>Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-pink-400/70 mb-2">Nationality <span className="text-red-400">*</span></label>
                        <input type="text" value={playerNationality} onChange={e => setPlayerNationality(e.target.value)} placeholder="e.g., Indian" className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-pink-300/30 focus:outline-none transition-all" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(236,72,153,0.2)' }} onFocus={e => { e.target.style.borderColor = 'rgba(236,72,153,0.5)'; }} onBlur={e => { e.target.style.borderColor = 'rgba(236,72,153,0.2)'; }} />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-pink-400/70 mb-2">Batting Style</label>
                        <select value={playerBattingStyle} onChange={e => setPlayerBattingStyle(e.target.value)} className="w-full px-4 py-3 rounded-xl text-sm text-white focus:outline-none transition-all" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(236,72,153,0.2)' }} onFocus={e => { e.target.style.borderColor = 'rgba(236,72,153,0.5)'; }} onBlur={e => { e.target.style.borderColor = 'rgba(236,72,153,0.2)'; }}>
                          <option value="" style={{ background: '#1a0a1e', color: '#fff' }}>Select Style</option>
                          <option value="Right-hand Bat" style={{ background: '#1a0a1e', color: '#fff' }}>Right-hand Bat</option>
                          <option value="Left-hand Bat" style={{ background: '#1a0a1e', color: '#fff' }}>Left-hand Bat</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-pink-400/70 mb-2">Bowling Style</label>
                        <select value={playerBowlingStyle} onChange={e => setPlayerBowlingStyle(e.target.value)} className="w-full px-4 py-3 rounded-xl text-sm text-white focus:outline-none transition-all" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(236,72,153,0.2)' }} onFocus={e => { e.target.style.borderColor = 'rgba(236,72,153,0.5)'; }} onBlur={e => { e.target.style.borderColor = 'rgba(236,72,153,0.2)'; }}>
                          <option value="" style={{ background: '#1a0a1e', color: '#fff' }}>Select Style</option>
                          <option value="Right-arm Fast" style={{ background: '#1a0a1e', color: '#fff' }}>Right-arm Fast</option>
                          <option value="Left-arm Fast" style={{ background: '#1a0a1e', color: '#fff' }}>Left-arm Fast</option>
                          <option value="Right-arm Medium" style={{ background: '#1a0a1e', color: '#fff' }}>Right-arm Medium</option>
                          <option value="Left-arm Medium" style={{ background: '#1a0a1e', color: '#fff' }}>Left-arm Medium</option>
                          <option value="Off-spin" style={{ background: '#1a0a1e', color: '#fff' }}>Off-spin</option>
                          <option value="Leg-spin" style={{ background: '#1a0a1e', color: '#fff' }}>Leg-spin</option>
                          <option value="Left-arm Spin" style={{ background: '#1a0a1e', color: '#fff' }}>Left-arm Spin</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-pink-400/70 mb-2">Experience Level</label>
                        <select value={playerExperience} onChange={e => setPlayerExperience(e.target.value)} className="w-full px-4 py-3 rounded-xl text-sm text-white focus:outline-none transition-all" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(236,72,153,0.2)' }} onFocus={e => { e.target.style.borderColor = 'rgba(236,72,153,0.5)'; }} onBlur={e => { e.target.style.borderColor = 'rgba(236,72,153,0.2)'; }}>
                          <option value="" style={{ background: '#1a0a1e', color: '#fff' }}>Select Level</option>
                          <option value="Beginner" style={{ background: '#1a0a1e', color: '#fff' }}>Beginner</option>
                          <option value="Intermediate" style={{ background: '#1a0a1e', color: '#fff' }}>Intermediate</option>
                          <option value="Advanced" style={{ background: '#1a0a1e', color: '#fff' }}>Advanced</option>
                          <option value="Professional" style={{ background: '#1a0a1e', color: '#fff' }}>Professional</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 3: Additional Info + Overseas */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-8">
                  <div className="glass-card rounded-2xl p-5 h-full">
                    <h3 className="text-sm font-black text-pink-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <FileText size={16} />
                      Additional Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-pink-400/70 mb-2">Previous Teams</label>
                        <input type="text" value={playerPreviousTeams} onChange={e => setPlayerPreviousTeams(e.target.value)} placeholder="e.g., Mumbai XI, Delhi Kings" className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-pink-300/30 focus:outline-none transition-all" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(236,72,153,0.2)' }} onFocus={e => { e.target.style.borderColor = 'rgba(236,72,153,0.5)'; }} onBlur={e => { e.target.style.borderColor = 'rgba(236,72,153,0.2)'; }} />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-pink-400/70 mb-2">Player Category</label>
                        <select value={playerCategory} onChange={e => setPlayerCategory(e.target.value)} className="w-full px-4 py-3 rounded-xl text-sm text-white focus:outline-none transition-all" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(236,72,153,0.2)' }} onFocus={e => { e.target.style.borderColor = 'rgba(236,72,153,0.5)'; }} onBlur={e => { e.target.style.borderColor = 'rgba(236,72,153,0.2)'; }}>
                          <option value="" style={{ background: '#1a0a1e', color: '#fff' }}>Select Category</option>
                          <option value="A+" style={{ background: '#1a0a1e', color: '#fff' }}>A+ (Elite)</option>
                          <option value="A" style={{ background: '#1a0a1e', color: '#fff' }}>A (Star)</option>
                          <option value="B" style={{ background: '#1a0a1e', color: '#fff' }}>B (Regular)</option>
                          <option value="C" style={{ background: '#1a0a1e', color: '#fff' }}>C (Emerging)</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-pink-400/70 mb-2">Bio / Description</label>
                        <textarea value={playerBio} onChange={e => setPlayerBio(e.target.value)} placeholder="Brief description of the player's career, specialties, achievements..." rows={3} className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-pink-300/30 focus:outline-none transition-all resize-none" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(236,72,153,0.2)' }} onFocus={e => { e.target.style.borderColor = 'rgba(236,72,153,0.5)'; }} onBlur={e => { e.target.style.borderColor = 'rgba(236,72,153,0.2)'; }} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-4">
                  <div className="glass-card rounded-2xl p-5 h-full flex flex-col justify-center">
                    <h3 className="text-sm font-black text-pink-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Target size={16} />
                      Classification
                    </h3>
                    <label className="flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all hover:bg-white/5" style={{ background: playerIsOverseas ? 'rgba(236, 72, 153, 0.1)' : 'rgba(0,0,0,0.2)', border: `1px solid ${playerIsOverseas ? 'rgba(236, 72, 153, 0.4)' : 'rgba(236,72,153,0.15)'}` }}>
                      <input type="checkbox" checked={playerIsOverseas} onChange={e => setPlayerIsOverseas(e.target.checked)} className="sr-only peer" />
                      <div className="w-10 h-6 rounded-full relative transition-all peer-checked:bg-pink-500/60" style={{ background: playerIsOverseas ? 'rgba(236, 72, 153, 0.6)' : 'rgba(255,255,255,0.1)' }}>
                        <div className="absolute w-4 h-4 bg-white rounded-full top-1 transition-all" style={{ left: playerIsOverseas ? '22px' : '4px' }} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Overseas Player</p>
                        <p className="text-[10px] text-pink-400/50">Mark if the player is a foreign national</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Row 4: Documents & Verification */}
              <div className="glass-card rounded-2xl p-5">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Left: Verification */}
                  <div>
                    <h3 className="text-sm font-black text-pink-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Shield size={16} />
                      Verification
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-pink-400/70 mb-2">Government ID Number <span className="text-red-400">*</span></label>
                        <input type="text" value={playerGovId} onChange={e => setPlayerGovId(e.target.value)} placeholder="Aadhaar / PAN / Passport Number" className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-pink-300/30 focus:outline-none transition-all" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(236,72,153,0.2)' }} onFocus={e => { e.target.style.borderColor = 'rgba(236,72,153,0.5)'; }} onBlur={e => { e.target.style.borderColor = 'rgba(236,72,153,0.2)'; }} />
                      </div>
                    </div>
                  </div>

                  {/* Right: Upload ID Proof */}
                  <div>
                    <h3 className="text-sm font-black text-pink-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Upload size={16} />
                      ID Proof Document
                    </h3>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-pink-400/70 mb-2">Upload ID Proof <span className="text-red-400">*</span></label>
                      <div 
                        className="relative rounded-xl p-4 cursor-pointer transition-all"
                        style={{ 
                          background: isDraggingPlayerGovId ? 'rgba(236, 72, 153, 0.15)' : playerGovIdFile ? 'rgba(34, 197, 94, 0.1)' : 'rgba(0,0,0,0.3)',
                          border: `2px dashed ${isDraggingPlayerGovId ? 'rgba(236, 72, 153, 0.6)' : playerGovIdFile ? 'rgba(34, 197, 94, 0.5)' : 'rgba(236, 72, 153, 0.25)'}`
                        }}
                        onDragOver={e => handlePlayerDragOver(e, 'govId')}
                        onDragLeave={e => handlePlayerDragLeave(e, 'govId')}
                        onDrop={e => handlePlayerDrop(e, 'govId')}
                        onClick={() => document.getElementById('playerGovIdInput')?.click()}
                      >
                        <input type="file" id="playerGovIdInput" accept=".pdf,.jpg,.jpeg,.png" onChange={handlePlayerGovIdUpload} className="hidden" />
                        <div className="text-center">
                          {playerGovIdFile ? (
                            <>
                              <CheckCircle size={28} className="mx-auto mb-2 text-green-400" />
                              <p className="text-sm font-bold text-green-300 mb-1">✓ ID Uploaded</p>
                              <p className="text-xs text-pink-300/60 truncate">{playerGovIdFile.name}</p>
                              <p className="text-xs text-pink-400/40 mt-1">({(playerGovIdFile.size / 1024 / 1024).toFixed(2)} MB)</p>
                              <button type="button" onClick={(e) => { e.stopPropagation(); setPlayerGovIdFile(null); }} className="mt-2 text-xs text-red-400 hover:text-red-300 font-semibold">Remove</button>
                            </>
                          ) : (
                            <>
                              <Upload size={24} className="mx-auto mb-2 text-pink-400/60" />
                              <p className="text-xs font-semibold text-white mb-1">ID Proof</p>
                              <p className="text-[10px] text-pink-400/50">Click or drag file</p>
                              <p className="text-[10px] text-pink-400/30 mt-0.5">(PDF, JPG, PNG)</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => { setActiveSection('players'); resetAddPlayerForm(); }}
                  disabled={addPlayerLoading}
                  className="px-6 py-3 rounded-xl text-sm font-semibold text-pink-300/70 hover:text-white hover:bg-white/5 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddPlayer}
                  disabled={addPlayerLoading}
                  className="px-10 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all duration-300 disabled:opacity-50 hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, #ec4899, #e11d48)',
                    color: '#fff',
                    boxShadow: '0 0 20px rgba(236, 72, 153, 0.3)'
                  }}
                >
                  {addPlayerLoading ? <><Loader2 size={18} className="animate-spin" /> Registering Player...</> : <><Plus size={18} /> Register Player</>}
                </button>
              </div>
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="flex-1 p-6 pr-8 pb-16">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-black text-white">Settings</h1>
                <p className="text-pink-400/60 text-sm">{activeMatch?.name || 'Auction'} Configuration</p>
              </div>
              <button
                onClick={() => setActiveSection('dashboard')}
                className="px-4 py-2.5 rounded-full bg-white/5 border border-pink-500/20 text-pink-300 hover:bg-pink-500/10 hover:border-pink-500/40 transition-all flex items-center gap-2 text-sm font-medium"
              >
                <ArrowLeft size={16} />
                Exit
              </button>
            </div>

            {/* Settings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Auctioneer Profile - Complete */}
              <div className="glass-card rounded-2xl p-6 md:col-span-3">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <User size={18} className="text-pink-400" />
                  Auctioneer Profile
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Profile Photo & Basic Info */}
                  <div className="space-y-4">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-pink-500 to-red-600 p-1">
                        <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-pink-400 font-bold text-3xl overflow-hidden">
                          {auctioneerProfile.auctioneerPhoto ? (
                            <img src={auctioneerProfile.auctioneerPhoto} alt={auctioneerProfile.name || currentUser.name} className="w-full h-full object-cover rounded-full" />
                          ) : (
                            (auctioneerProfile.name || currentUser.name).charAt(0).toUpperCase()
                          )}
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-white font-bold text-xl">{auctioneerProfile.name || currentUser.name}</p>
                        <p className="text-pink-400/60 text-sm mt-1">{currentUser.role}</p>
                        {auctioneerProfile.status && (
                          <div className="mt-2">
                            {auctioneerProfile.status === 'approved' ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-bold">
                                <CheckCircle size={12} />
                                Verified
                              </span>
                            ) : auctioneerProfile.status === 'pending' ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-bold">
                                <Clock size={12} />
                                Pending
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-bold">
                                <XCircle size={12} />
                                {auctioneerProfile.status}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contact & Experience Info */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-pink-300/70 uppercase tracking-wide mb-3">Contact & Experience</h4>
                    <div className="flex flex-col gap-1">
                      <span className="text-pink-300/60 text-xs">Email</span>
                      <span className="text-white text-sm font-medium">{auctioneerProfile.email || currentUser.email}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-pink-300/60 text-xs">Phone</span>
                      <span className="text-white text-sm font-medium">{auctioneerProfile.phone || 'N/A'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-pink-300/60 text-xs">Experience Level</span>
                      <span className="text-white text-sm font-medium">{auctioneerProfile.experienceLevel || 'N/A'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-pink-300/60 text-xs">Years of Experience</span>
                      <span className="text-white text-sm font-medium">{auctioneerProfile.experience !== undefined && auctioneerProfile.experience !== null ? auctioneerProfile.experience : 'N/A'} years</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-pink-300/60 text-xs">Availability</span>
                      <span className="text-white text-sm font-medium">{auctioneerProfile.availability || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Professional Info */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-pink-300/70 uppercase tracking-wide mb-3">Professional Details</h4>
                    <div className="flex flex-col gap-1">
                      <span className="text-pink-300/60 text-xs">Languages</span>
                      <span className="text-white text-sm font-medium">
                        {auctioneerProfile.languages && auctioneerProfile.languages.length > 0 
                          ? auctioneerProfile.languages.join(', ') 
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-pink-300/60 text-xs">License Number</span>
                      <span className="text-white text-sm font-medium">{auctioneerProfile.auctioneerLicense || 'N/A'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-pink-300/60 text-xs">Previous Auctions</span>
                      <span className="text-white text-sm font-medium">{auctioneerProfile.previousAuctions || 'None'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-pink-300/60 text-xs">Government ID</span>
                      <span className="text-white text-sm font-medium font-mono">
                        {auctioneerProfile.governmentId 
                          ? `****-****-${auctioneerProfile.governmentId.slice(-4)}` 
                          : 'N/A'}
                      </span>
                    </div>
                    {auctioneerProfile.governmentIdFile && (
                      <a 
                        href={auctioneerProfile.governmentIdFile} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-300 hover:bg-pink-500/20 transition-all text-xs font-medium"
                      >
                        <Shield size={14} />
                        View ID Document
                      </a>
                    )}
                    {auctioneerProfile.approvedAt && (
                      <div className="pt-2 border-t border-pink-500/10">
                        <span className="text-pink-300/60 text-xs">Verified On</span>
                        <p className="text-white text-sm font-medium">{new Date(auctioneerProfile.approvedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Auction Date Settings */}
              {activeMatch && (
                <div className="glass-card rounded-2xl p-6 md:col-span-3">
                  <AuctionDateSettings 
                    matchId={activeMatch.id} 
                    canEdit={true}
                  />
                </div>
              )}

              {/* Quick Actions */}
              <div className="glass-card rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Settings size={18} className="text-pink-400" />
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  <button 
                    onClick={handleGoToLiveRoom}
                    className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-pink-500/20 to-red-600/20 border border-pink-500/30 text-pink-300 hover:border-pink-500/50 hover:bg-pink-500/30 transition-all flex items-center gap-3 font-medium"
                  >
                    <Radio size={18} />
                    Go to Live Room
                  </button>
                  <button 
                    onClick={handleGoToReport}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-pink-500/10 text-pink-300/80 hover:border-pink-500/30 hover:bg-white/10 transition-all flex items-center gap-3 font-medium"
                  >
                    <FileText size={18} />
                    View Report
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:border-red-500/40 hover:bg-red-500/20 transition-all flex items-center gap-3 font-medium"
                  >
                    <LogOut size={18} />
                    Logout
                  </button>
                </div>
              </div>

              {/* Auction Stats Summary */}
              <div className="glass-card rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <BarChart3 size={18} className="text-pink-400" />
                  Quick Stats
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/20 rounded-xl p-4 border border-pink-500/10">
                    <p className="text-pink-400/60 text-xs uppercase mb-1">Players</p>
                    <p className="text-2xl font-bold text-white">{eligiblePlayers.length}</p>
                  </div>
                  <div className="bg-black/20 rounded-xl p-4 border border-pink-500/10">
                    <p className="text-pink-400/60 text-xs uppercase mb-1">Teams</p>
                    <p className="text-2xl font-bold text-white">{teams.length}</p>
                  </div>
                  <div className="bg-black/20 rounded-xl p-4 border border-green-500/10">
                    <p className="text-green-400/60 text-xs uppercase mb-1">Sold</p>
                    <p className="text-2xl font-bold text-green-400">{soldPlayersCount}</p>
                  </div>
                  <div className="bg-black/20 rounded-xl p-4 border border-red-500/10">
                    <p className="text-red-400/60 text-xs uppercase mb-1">Unsold</p>
                    <p className="text-2xl font-bold text-red-400">{unsoldPlayersCount}</p>
                  </div>
                </div>
              </div>

              {/* Auction Information */}
              <div className="glass-card rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Trophy size={18} className="text-pink-400" />
                  Auction Info
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-pink-400/60 text-xs uppercase mb-1">Auction Name</p>
                    <p className="text-white font-semibold">{activeMatch?.name || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-pink-400/60 text-xs uppercase mb-1">Match ID</p>
                    <p className="text-white/70 text-sm font-mono">{activeMatch?.id || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-pink-400/60 text-xs uppercase mb-1">Status</p>
                    <span className="inline-block px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium">
                      Active
                    </span>
                  </div>
                  <div>
                    <p className="text-pink-400/60 text-xs uppercase mb-1">Total Teams</p>
                    <p className="text-white font-bold text-xl">{teams.length}</p>
                  </div>
                </div>
              </div>

              {/* Data Backup & Restore */}
              <div className="glass-card rounded-2xl p-6 md:col-span-3">
                <BackupRestoreSection currentMatch={activeMatch} currentUser={currentUser} />
              </div>
            </div>
          </div>
        );

      case 'teamDetail':
        const selectedTeam = teams.find(t => t.id === selectedTeamId);
        if (!selectedTeam) {
          return (
            <div className="flex-1 p-6 flex items-center justify-center">
              <div className="text-center">
                <Users size={64} className="text-pink-400/30 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Team Not Found</h3>
                <button 
                  onClick={() => setActiveSection('teams')}
                  className="mt-4 px-6 py-3 rounded-full bg-pink-500/20 border border-pink-500/30 text-pink-300 hover:bg-pink-500/30 transition-all"
                >
                  Back to Teams
                </button>
              </div>
            </div>
          );
        }
        return (
          <TeamSquadPage
            team={selectedTeam}
            players={eligiblePlayers}
            onBack={() => setActiveSection('teams')}
          />
        );

      case 'report':
        // Build team→player mapping for report
        const reportTeams = teams.map(team => {
          const teamPlayers = eligiblePlayers.filter(p => 
            (p as any).soldTo === team.id || (p as any).teamId === team.id || (p as any).buyingTeamId === team.id
          );
          const spent = teamPlayers.reduce((sum, p) => sum + ((p as any).soldAmount || (p as any).soldPrice || (p as any).currentBid || 0), 0);
          return { ...team, acquiredPlayers: teamPlayers, totalSpent: spent };
        });

        // Unsold/available players (no team)
        const unassignedPlayers = eligiblePlayers.filter(p => {
          const hasTeam = (p as any).soldTo || (p as any).teamId || (p as any).buyingTeamId;
          return !hasTeam && (p.status === 'UNSOLD' || p.status === 'AVAILABLE' || p.status === 'PENDING' || !p.status);
        });

        return (
          <ReportSection
            teams={reportTeams}
            unassignedPlayers={unassignedPlayers}
            players={eligiblePlayers}
            currentMatch={activeMatch}
            soldPlayersCount={soldPlayersCount}
            unsoldPlayersCount={unsoldPlayersCount}
            pendingPlayersCount={pendingPlayersCount}
            totalAmountSpent={totalAmountSpent}
            auctionStatus={liveAuctionStatus}
            currentBiddingPlayer={currentBiddingPlayer}
            onNavigateHistory={(player) => {
              setHistoryPlayer(player);
              setActiveSection('history');
            }}
          />
        );

      case 'history':
        if (!historyPlayer || !activeMatch?.id) {
          setActiveSection('report');
          return null;
        }
        return (
          <BiddingHistoryPage
            player={historyPlayer}
            seasonId={activeMatch.id}
            onBack={() => setActiveSection('report')}
          />
        );

      // Auction Results Page (leaderboard style)
      case 'results':
        return (
          <AuctionResultsPage
            onClose={() => setActiveSection('dashboard')}
            currentMatch={activeMatch!}
          />
        );

      // Dashboard (default)
      default:
        return (
          <div className="flex-1 flex flex-col p-6 pr-8 pb-16">
            {/* TOP BAR */}
            <div className="flex items-center justify-between mb-8 sticky top-0 z-40 py-4 -mx-6 px-6" style={{ background: 'linear-gradient(to bottom, #1a0a0a 0%, transparent 100%)' }}>
              {/* Greeting */}
              <div>
                <p className="text-pink-400/60 text-sm font-medium tracking-wider uppercase">Welcome back</p>
                <h1 className="text-3xl font-black text-white mt-1">
                  {getGreeting()}, <span className="shimmer-text">Auctioneer</span>
                </h1>
              </div>

              {/* Search & Profile */}
              <div className="flex items-center gap-4">
                {/* Global Navigation Search */}
                <div className="relative">
                  <input 
                    type="text"
                    value={navSearchQuery}
                    onChange={(e) => setNavSearchQuery(e.target.value)}
                    onFocus={() => setNavSearchFocused(true)}
                    onBlur={() => setTimeout(() => setNavSearchFocused(false), 200)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && filteredNavPages.length > 0) {
                        handleNavSearchSelect(filteredNavPages[0]);
                      }
                      if (e.key === 'Escape') {
                        setNavSearchQuery('');
                        setNavSearchFocused(false);
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    placeholder="Go to page..." 
                    className="w-64 px-5 py-3 rounded-full bg-black/30 border border-pink-500/20 text-white placeholder-pink-300/40 focus:outline-none focus:border-pink-500/50 focus:shadow-[0_0_20px_rgba(255,0,102,0.2)] transition-all"
                  />
                  <Search size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-pink-400/60" />
                  {/* Dropdown */}
                  {navSearchFocused && filteredNavPages.length > 0 && (
                    <div className="absolute top-full mt-2 left-0 w-full bg-black/90 backdrop-blur-xl border border-pink-500/30 rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(255,0,102,0.2)] z-50">
                      {filteredNavPages.map((page) => (
                        <button
                          key={page.label}
                          onMouseDown={() => handleNavSearchSelect(page)}
                          className="w-full flex items-center gap-3 px-5 py-3 text-left text-pink-200 hover:bg-pink-500/15 hover:text-white transition-all"
                        >
                          <page.icon size={16} className="text-pink-400/70" />
                          <span className="text-sm font-medium">{page.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Profile */}
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-red-600 p-0.5">
                    <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-pink-400 font-bold overflow-hidden">
                      {auctioneerProfile.auctioneerPhoto ? (
                        <img src={auctioneerProfile.auctioneerPhoto} alt={currentUser.name} className="w-full h-full object-cover rounded-full" />
                      ) : (
                        currentUser.name.charAt(0).toUpperCase()
                      )}
                    </div>
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-slate-900"></div>
                </div>

                {/* Back Button */}
                <button
                  onClick={handleBackToExplore}
                  className="px-4 py-2.5 rounded-full bg-white/5 border border-pink-500/20 text-pink-300 hover:bg-pink-500/10 hover:border-pink-500/40 transition-all flex items-center gap-2 text-sm font-medium"
                >
                  <ArrowLeft size={16} />
                  Exit
                </button>
              </div>
            </div>

            {/* MAIN GRID */}
            <div className="flex-1 grid grid-cols-12 gap-6 max-w-full">
              {/* ROW 1: HERO CARD + LIVE FOR BIDDING */}
              {/* HERO CARD - Featured Section */}
              <div className="col-span-8">
                <div className="h-full glass-card rounded-3xl overflow-hidden relative group transition-all duration-500" style={{ minHeight: '320px' }}>
                  {/* ── Layer 0: Base gradient background ── */}
                  <div className="absolute inset-0 bg-gradient-to-br from-pink-600/20 via-red-900/30 to-purple-900/20"></div>

                  {/* ── Layer 1: Right-side hero artwork (SVG-based abstract shapes) ── */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
                    <svg className="absolute right-0 top-0 h-full" viewBox="0 0 500 400" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMaxYMid slice" style={{ width: '55%', opacity: 0.9 }}>
                      {/* Large angular hero silhouette shape */}
                      <polygon points="200,0 500,0 500,400 280,400 160,250" fill="url(#heroGrad1)" />
                      <polygon points="250,0 500,0 500,350 320,400 220,220" fill="url(#heroGrad2)" />
                      {/* Diagonal slash accents */}
                      <rect x="180" y="0" width="4" height="500" transform="rotate(15 180 0)" fill="rgba(255,0,102,0.4)" />
                      <rect x="210" y="-20" width="2" height="500" transform="rotate(15 210 0)" fill="rgba(255,0,102,0.25)" />
                      <rect x="240" y="-40" width="1.5" height="500" transform="rotate(15 240 0)" fill="rgba(255,0,102,0.15)" />
                      {/* Geometric overlay panels */}
                      <polygon points="350,30 500,30 500,180 380,200" fill="rgba(255,20,100,0.08)" stroke="rgba(255,0,102,0.2)" strokeWidth="1" />
                      <polygon points="400,180 500,150 500,320 420,340" fill="rgba(200,50,120,0.06)" stroke="rgba(255,0,102,0.15)" strokeWidth="0.5" />
                      {/* Glowing diamond accent */}
                      <polygon points="420,90 450,60 480,90 450,120" fill="rgba(255,0,102,0.15)" stroke="rgba(255,0,102,0.5)" strokeWidth="1.5" />
                      <polygon points="350,250 370,230 390,250 370,270" fill="rgba(255,0,102,0.1)" stroke="rgba(255,0,102,0.35)" strokeWidth="1" />
                      {/* Small detail triangles */}
                      <polygon points="460,200 475,185 490,200" fill="rgba(255,100,160,0.12)" />
                      <polygon points="300,320 320,300 340,330" fill="rgba(255,100,160,0.08)" />
                      {/* Horizontal scan lines */}
                      <line x1="260" y1="100" x2="500" y2="100" stroke="rgba(255,0,102,0.12)" strokeWidth="0.5" />
                      <line x1="280" y1="200" x2="500" y2="200" stroke="rgba(255,0,102,0.08)" strokeWidth="0.5" />
                      <line x1="300" y1="300" x2="500" y2="300" stroke="rgba(255,0,102,0.1)" strokeWidth="0.5" />
                      {/* Dot grid pattern */}
                      {[320,360,400,440,480].map(x => [60,120,180,240,300,360].map(y => (
                        <circle key={`${x}-${y}`} cx={x} cy={y} r="1" fill="rgba(255,0,102,0.15)" />
                      )))}
                      <defs>
                        <linearGradient id="heroGrad1" x1="200" y1="0" x2="500" y2="400" gradientUnits="userSpaceOnUse">
                          <stop offset="0%" stopColor="rgba(255,0,102,0.18)" />
                          <stop offset="50%" stopColor="rgba(180,0,80,0.22)" />
                          <stop offset="100%" stopColor="rgba(100,0,50,0.28)" />
                        </linearGradient>
                        <linearGradient id="heroGrad2" x1="250" y1="0" x2="500" y2="400" gradientUnits="userSpaceOnUse">
                          <stop offset="0%" stopColor="rgba(255,20,100,0.1)" />
                          <stop offset="100%" stopColor="rgba(139,0,50,0.2)" />
                        </linearGradient>
                      </defs>
                    </svg>
                    {/* Radial glow behind artwork */}
                    <div className="absolute -right-10 top-1/2 -translate-y-1/2 w-80 h-80 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,0,102,0.2) 0%, transparent 70%)', filter: 'blur(40px)' }} />
                  </div>

                  {/* ── Layer 2: Left readability gradient (cleans up left side for text) ── */}
                  <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-black/60 to-transparent" />

                  {/* ── Layer 3: Content ── */}
                  <div className="relative h-full p-8 flex flex-col justify-between z-10">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4 ${
                          liveAuctionStatus === 'ENDED' 
                            ? 'bg-green-500/20 border border-green-500/30' 
                            : liveAuctionStatus === 'LIVE' 
                            ? 'bg-red-500/20 border border-red-500/30'
                            : 'bg-pink-500/20 border border-pink-500/30'
                        }`}>
                          <div className={`w-2 h-2 rounded-full animate-pulse ${
                            liveAuctionStatus === 'ENDED' 
                              ? 'bg-green-500' 
                              : liveAuctionStatus === 'LIVE' 
                              ? 'bg-red-500'
                              : 'bg-pink-500'
                          }`}></div>
                          <span className={`text-xs font-bold tracking-wider uppercase ${
                            liveAuctionStatus === 'ENDED' 
                              ? 'text-green-300' 
                              : liveAuctionStatus === 'LIVE' 
                              ? 'text-red-300'
                              : 'text-pink-300'
                          }`}>
                            {liveAuctionStatus === 'ENDED' ? 'Auction Ended' : liveAuctionStatus === 'LIVE' ? 'Live Now' : 'Ready to Start'}
                          </span>
                        </div>
                        <h2 className="text-4xl font-black text-white mb-2">{activeMatch?.name || 'No Active Auction'}</h2>
                        <p className="text-pink-200/60 text-lg">{activeMatch?.year} Season</p>
                        {activeMatch?.place && (
                          <p className="text-pink-300/50 text-sm mt-1.5 flex items-center gap-1.5">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pink-400/60"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                            {activeMatch.place}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* CTA Section */}
                    <div className="flex items-end justify-between">
                      <div className="flex gap-4">
                        {liveAuctionStatus === 'ENDED' ? (
                          <>
                            <button
                              onClick={handleGoToResults}
                              className="cyber-button px-6 py-3 rounded-full text-white font-black tracking-wider flex items-center gap-2.5 text-sm"
                              style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}
                            >
                              <Trophy size={18} />
                              VIEW RESULTS
                            </button>
                            <button
                              onClick={() => { setActiveSection('report'); setActiveNav(5); }}
                              className="cyber-button px-6 py-3 rounded-full text-white font-black tracking-wider flex items-center gap-2.5 text-sm"
                              style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
                            >
                              <FileText size={18} />
                              VIEW REPORT
                            </button>
                          </>
                        ) : liveAuctionStatus === 'LIVE' ? (
                          <button
                            onClick={handleGoToLiveRoom}
                            className="cyber-button px-6 py-3 rounded-full text-white font-black tracking-wider flex items-center gap-2.5 text-sm"
                          >
                            <Radio size={18} />
                            ENTER LIVE ROOM
                          </button>
                        ) : (
                          <button
                            onClick={handleStartAuction}
                            disabled={startingAuction || !activeMatch?.id}
                            className="cyber-button px-6 py-3 rounded-full text-white font-black tracking-wider flex items-center gap-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Play size={18} fill="white" />
                            {startingAuction ? 'STARTING...' : 'START AUCTION'}
                          </button>
                        )}
                        <button
                          onClick={() => { setActiveSection('report'); setActiveNav(5); }}
                          className="px-5 py-3 rounded-full bg-white/5 border border-pink-500/20 text-pink-300 hover:bg-pink-500/10 transition-all font-bold tracking-wider text-sm"
                        >
                          VIEW DETAILS
                        </button>
                      </div>

                      {/* Quick Stats */}
                      <div className="flex gap-6">
                        <div className="text-right">
                          <p className="text-pink-400/60 text-xs uppercase tracking-wider">Teams</p>
                          <p className="text-2xl font-black text-white">{loadingTeams ? '...' : teams.length}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-pink-400/60 text-xs uppercase tracking-wider">Players</p>
                          <p className="text-2xl font-black text-white">{loadingPlayers ? '...' : eligiblePlayers.length}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* LIVE BIDDING PLAYER CARD - Right side of Row 1 */}
              <div className="col-span-4">
                <div className="rounded-3xl overflow-hidden relative h-full" style={{ minHeight: '320px' }}>
                  {!livePlayerResolved ? (
                    /* Skeleton: waiting for first socket snapshot — prevents flicker of stale/declined player */
                    <div className="h-full glass-card rounded-3xl flex flex-col items-center justify-center p-6 border border-pink-500/20" style={{ background: 'linear-gradient(135deg, rgba(255, 0, 102, 0.08), rgba(219, 39, 119, 0.05))' }}>
                      <div className="w-20 h-20 rounded-full skeleton-pulse mb-4" style={{ background: 'rgba(255,0,102,0.12)' }} />
                      <div className="h-4 w-32 rounded skeleton-pulse mb-2" style={{ background: 'rgba(255,0,102,0.1)' }} />
                      <div className="h-3 w-24 rounded skeleton-pulse" style={{ background: 'rgba(255,0,102,0.07)' }} />
                    </div>
                  ) : currentBiddingPlayer && liveAuctionStatus === 'LIVE' ? (
                    /* Live Player Card with Image Background */
                    <>
                      {/* Full Card Background Image */}
                      <div 
                        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                        style={{ 
                          backgroundImage: currentBiddingPlayer.imageUrl 
                            ? `url(${currentBiddingPlayer.imageUrl})` 
                            : 'linear-gradient(135deg, rgba(245, 158, 11, 0.3), rgba(217, 119, 6, 0.3))',
                        }}
                      />
                      
                      {/* Dark Gradient Overlay for Text Readability */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                      
                      {/* Content Overlay */}
                      <div className="relative h-full flex flex-col justify-between p-5 z-10">
                        {/* Top: Live Status Badge */}
                        <div className="flex justify-between items-start">
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/90 border border-red-400 shadow-lg" style={{ boxShadow: '0 0 15px rgba(239, 68, 68, 0.4)' }}>
                            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            <span className="text-white text-[10px] font-black tracking-wider uppercase">LIVE FOR BIDDING</span>
                          </div>
                        </div>
                        
                        {/* Bottom: Player Info */}
                        <div>
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/80 border border-pink-400/50 mb-2">
                            <span className="text-white text-[10px] font-bold tracking-wider uppercase">
                              {currentBiddingPlayer.role || currentBiddingPlayer.roleId || 'PLAYER'}
                            </span>
                          </div>
                          <h2 className="text-xl font-black text-white mb-1" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
                            {currentBiddingPlayer.name}
                          </h2>
                          <p className="text-pink-300 text-xs font-medium">
                            Base Price: ₹{((currentBiddingPlayer.basePrice || 0) / 100000).toFixed(1)}L
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Placeholder: Auction Not Started or No Active Player */
                    <div className="h-full glass-card rounded-3xl flex flex-col items-center justify-center p-6 border border-pink-500/20" style={{ background: 'linear-gradient(135deg, rgba(255, 0, 102, 0.08), rgba(219, 39, 119, 0.05))' }}>
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500/20 to-pink-600/10 flex items-center justify-center mb-4 border border-pink-500/30">
                        {liveAuctionStatus === 'ENDED' ? (
                          <Trophy size={36} className="text-amber-400/80" />
                        ) : (
                          <Activity size={36} className="text-pink-400/60" />
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">
                        {liveAuctionStatus === 'ENDED' ? 'Auction Ended' : 'Waiting for Bidding'}
                      </h3>
                      <p className="text-pink-400/60 text-sm text-center mb-4">
                        {liveAuctionStatus === 'ENDED' 
                          ? 'All players have been auctioned' 
                          : liveAuctionStatus === 'LIVE' 
                          ? 'Next player loading...' 
                          : 'Start the auction to see live bidding'}
                      </p>
                      {liveAuctionStatus === 'ENDED' && (
                        <button
                          onClick={handleGoToResults}
                          className="px-6 py-2.5 rounded-full text-white font-bold text-sm flex items-center gap-2.5 transition-all hover:scale-105"
                          style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}
                        >
                          <Trophy size={16} />
                          View Results
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ROW 2: REGISTERED TEAMS + QUICK ACTIONS */}
              {/* REGISTERED TEAMS - Left side */}
              <div className="col-span-8">
                <div className="glass-card rounded-3xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Users size={18} className="text-pink-400" />
                      Registered Teams
                      <span className="text-pink-400/60 text-sm font-normal">({teams.length})</span>
                    </h3>
                    <button 
                      onClick={handleGoToTeams}
                      className="text-pink-400 hover:text-pink-300 text-xs flex items-center gap-1 transition-all font-medium"
                    >
                      View More <ChevronRight size={14} />
                    </button>
                  </div>

                  {loadingTeams ? (
                    <div className="grid grid-cols-2 gap-4">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="glass-card rounded-2xl p-3 border border-amber-500/20" style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.05), rgba(217, 119, 6, 0.05))' }}>
                          <div className="flex items-center gap-3">
                            <div className="animate-pulse bg-gradient-to-r from-amber-500/30 to-amber-600/20 w-10 h-10 rounded-lg" style={{ boxShadow: '0 0 15px rgba(245, 158, 11, 0.15)' }}></div>
                            <div className="flex-1">
                              <div className="animate-pulse bg-gradient-to-r from-amber-500/25 to-amber-600/15 w-3/4 h-3 rounded mb-1"></div>
                              <div className="animate-pulse bg-gradient-to-r from-amber-500/20 to-amber-600/10 w-1/2 h-2 rounded"></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : teams.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      {teams.slice(0, 4).map((team) => (
                        <div key={team.id} className="team-card glass-card rounded-2xl p-3 transition-all duration-300 cursor-pointer group border border-pink-500/10 hover:border-pink-500/30">
                          <div className="flex items-center gap-3">
                            {/* Team Logo */}
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500/20 to-red-600/20 flex items-center justify-center overflow-hidden border border-pink-500/20 flex-shrink-0">
                              {team.logo ? (
                                <img src={team.logo} alt={team.name} className="w-full h-full object-cover" />
                              ) : (
                                <Users size={18} className="text-pink-400" />
                              )}
                            </div>
                            {/* Team Info */}
                            <div className="flex-1 min-w-0">
                              <h4 className="text-white font-bold text-sm group-hover:text-pink-300 transition-colors truncate">{team.name}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs font-medium text-pink-400/80">
                                  ₹{((team.remainingBudget || team.budget || 0) / 10000000).toFixed(1)}Cr
                                </span>
                                <span className="text-xs px-1.5 py-0.5 rounded-full bg-pink-500/20 text-pink-400">
                                  {getTeamPlayerCount(team.id)} Players
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

              {/* QUICK ACTIONS - Right side of Row 2 */}
              <div className="col-span-4">
                <div className="glass-card rounded-3xl p-5 h-full">
                  <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
                  <div className="flex flex-col gap-3">
                    {liveAuctionStatus === 'ENDED' ? (
                      <>
                        <button 
                          onClick={handleGoToResults}
                          className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-600/20 border border-amber-500/30 text-amber-300 hover:border-amber-500/50 hover:bg-amber-500/30 transition-all flex items-center justify-center gap-3 font-medium"
                        >
                          <Trophy size={18} />
                          View Auction Results
                        </button>
                        <button 
                          onClick={() => { setActiveSection('report'); setActiveNav(5); }}
                          className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-600/20 border border-green-500/30 text-green-300 hover:border-green-500/50 hover:bg-green-500/30 transition-all flex items-center justify-center gap-3 font-medium"
                        >
                          <FileText size={18} />
                          View Auction Report
                        </button>
                      </>
                    ) : liveAuctionStatus === 'LIVE' ? (
                      <button 
                        onClick={handleGoToLiveRoom}
                        className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-red-500/20 to-rose-600/20 border border-red-500/30 text-red-300 hover:border-red-500/50 hover:bg-red-500/30 transition-all flex items-center justify-center gap-3 font-medium"
                      >
                        <Radio size={18} className="animate-pulse" />
                        Enter Live Room
                      </button>
                    ) : (
                      <button 
                        onClick={handleStartAuction}
                        disabled={startingAuction || !activeMatch?.id}
                        className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-pink-500/20 to-red-600/20 border border-pink-500/30 text-pink-300 hover:border-pink-500/50 hover:bg-pink-500/30 transition-all flex items-center justify-center gap-3 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Play size={18} />
                        {startingAuction ? 'Starting...' : 'Start Auction'}
                      </button>
                    )}
                    <button 
                      onClick={handleGoToTeams}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-pink-500/10 text-pink-300/80 hover:border-pink-500/30 hover:bg-white/10 transition-all flex items-center justify-center gap-3 font-medium"
                    >
                      <Users size={18} />
                      Manage Teams
                    </button>
                    <button 
                      onClick={handleGoToSettings}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-pink-500/10 text-pink-300/80 hover:border-pink-500/30 hover:bg-white/10 transition-all flex items-center justify-center gap-3 font-medium"
                    >
                      <Settings size={18} />
                      Auction Settings
                    </button>
                  </div>
                </div>
              </div>

              {/* PLAYERS SECTION - Full Width */}
              <div className="col-span-12 mt-4">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/30 to-red-600/30 flex items-center justify-center">
                      <User size={20} className="text-pink-400" />
                    </div>
                    Registered Players
                    <span className="text-pink-400/60 text-sm font-normal ml-2">
                      ({eligiblePlayers.length} total)
                    </span>
                  </h3>
                  <button 
                    onClick={handleGoToPlayers}
                    className="view-more-btn px-6 py-3 rounded-full text-pink-300 font-bold tracking-wider flex items-center gap-2"
                  >
                    View All Players
                    <ChevronRight size={18} className="arrow-icon" />
                  </button>
                </div>

                {loadingPlayers ? (
                  <div className="grid grid-cols-6 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="glass-card rounded-2xl p-4 h-48 border border-pink-500/20" style={{ background: 'linear-gradient(135deg, rgba(255, 0, 102, 0.05), rgba(219, 39, 119, 0.05))' }}>
                        <div className="animate-pulse bg-gradient-to-r from-pink-500/30 to-pink-600/20 w-20 h-20 rounded-full mx-auto mb-3" style={{ boxShadow: '0 0 20px rgba(255, 0, 102, 0.2)' }}></div>
                        <div className="animate-pulse bg-gradient-to-r from-pink-500/25 to-pink-600/15 w-3/4 h-4 rounded mx-auto mb-2"></div>
                        <div className="animate-pulse bg-gradient-to-r from-pink-500/20 to-pink-600/10 w-1/2 h-3 rounded mx-auto"></div>
                      </div>
                    ))}
                  </div>
                ) : eligiblePlayers.length > 0 ? (
                  <div className="grid grid-cols-6 gap-4">
                    {displayedPlayers.map((player, idx) => (
                      <div key={player.id || idx} className="player-card glass-card rounded-2xl p-4 transition-all duration-300 cursor-pointer group text-center">
                        {/* Player Photo */}
                        <div className="relative w-20 h-20 mx-auto mb-3">
                          <div className="w-full h-full rounded-full bg-gradient-to-br from-pink-500/20 to-red-600/20 flex items-center justify-center overflow-hidden border-2 border-pink-500/30 group-hover:border-pink-500/60 transition-all">
                            {player.imageUrl ? (
                              <img src={player.imageUrl} alt={player.name} className="w-full h-full object-cover" />
                            ) : (
                              <User size={32} className="text-pink-400" />
                            )}
                          </div>
                          {/* Status Badge */}
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
                        <p className="text-pink-400/60 text-xs mb-2 truncate">{player.role || player.roleId || 'Player'}</p>
                        <div className="flex items-center justify-center gap-1">
                          <Star size={12} className="text-pink-400" />
                          <span className="text-pink-300 text-xs font-medium">
                            ₹{((player.basePrice || 0) / 100000).toFixed(0)}L
                          </span>
                        </div>
                        {player.status === 'SOLD' && player.soldPrice && (
                          <div className="mt-2 flex items-center justify-center gap-1 text-green-400">
                            <TrendingUp size={12} />
                            <span className="text-xs font-bold">₹{((player.soldPrice || (player as any).soldAmount || 0) / 100000).toFixed(0)}L</span>
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
        );
    }
  };

  // Main Dashboard View - Premium Gaming Theme with Static Sidebar
  return (
    <div className="min-h-screen w-full overflow-y-auto relative" style={{ background: 'linear-gradient(135deg, #1a0a0a 0%, #2d0a0a 25%, #1a0a12 50%, #0d0d1a 100%)' }}>
      <style>{`
        @keyframes neon-pulse {
          0%, 100% { 
            filter: drop-shadow(0 0 8px rgba(255, 0, 102, 0.8)) drop-shadow(0 0 20px rgba(255, 0, 102, 0.4));
          }
          50% { 
            filter: drop-shadow(0 0 15px rgba(255, 0, 102, 1)) drop-shadow(0 0 30px rgba(255, 0, 102, 0.6));
          }
        }

        @keyframes glow-breathe {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }

        @keyframes ring-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }

        @keyframes slideExpand {
          0% { transform: scaleX(0); opacity: 0; }
          100% { transform: scaleX(1); opacity: 1; }
        }

        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(255, 0, 102, 0.4); }
          50% { box-shadow: 0 0 40px rgba(255, 0, 102, 0.8), 0 0 60px rgba(255, 0, 102, 0.4); }
        }

        @keyframes cardReveal {
          0% { opacity: 0; transform: translateY(20px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }

        .neon-glow {
          animation: neon-pulse 2s ease-in-out infinite;
        }

        .float-card {
          animation: float 4s ease-in-out infinite;
        }

        .glass-card {
          background: linear-gradient(135deg, rgba(255, 20, 100, 0.08) 0%, rgba(139, 0, 50, 0.12) 100%);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 0, 102, 0.2);
          box-shadow: 
            0 8px 32px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.05),
            0 0 60px rgba(255, 0, 102, 0.05);
        }

        .glass-card:hover {
          border-color: rgba(255, 0, 102, 0.4);
          box-shadow: 
            0 12px 40px rgba(0, 0, 0, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.08),
            0 0 80px rgba(255, 0, 102, 0.1);
          transform: translateY(-4px) scale(1.01);
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
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
          transition: left 0.5s;
        }

        .cyber-button:hover::before {
          left: 100%;
        }

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
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 0, 102, 0.3), transparent);
          transition: left 0.6s ease;
        }

        .view-more-btn:hover::before {
          left: 100%;
        }

        .view-more-btn:hover {
          transform: translateX(8px);
          border-color: rgba(255, 0, 102, 0.8);
          box-shadow: 0 0 30px rgba(255, 0, 102, 0.4), 0 0 60px rgba(255, 0, 102, 0.2);
          animation: pulseGlow 1.5s ease-in-out infinite;
        }

        .view-more-btn .arrow-icon {
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .view-more-btn:hover .arrow-icon {
          transform: translateX(5px);
        }

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

        .stat-ring {
          animation: ring-rotate 20s linear infinite;
        }

        .shimmer-text {
          background: linear-gradient(90deg, #ff0066, #ff66a3, #ff0066);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 3s linear infinite;
        }

        .hero-glow {
          position: absolute;
          width: 400px;
          height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255, 0, 102, 0.3) 0%, transparent 70%);
          filter: blur(60px);
          pointer-events: none;
        }

        .slash-line {
          position: absolute;
          height: 2px;
          background: linear-gradient(90deg, rgba(255, 0, 102, 0.8), transparent);
        }

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

        .skeleton-pulse {
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }

        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(255, 0, 102, 0.05);
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255, 0, 102, 0.3);
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 0, 102, 0.5);
        }
      `}</style>

      {/* Ambient Glow Effects */}
      <div className="hero-glow" style={{ top: '10%', right: '20%' }}></div>
      <div className="hero-glow" style={{ bottom: '20%', left: '10%', opacity: 0.5 }}></div>

      {/* CYBER SIDEBAR - Vertical Spine with Slash Lines */}
      <div className="fixed left-8 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center">
        {/* Top Slash Lines */}
        <div className="relative w-full h-20 mb-2">
          <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-0.5 h-12 bg-gradient-to-t from-pink-500/80 to-transparent"></div>
          <div className="slash-line" style={{ width: '60px', top: '0', left: '50%', transform: 'translateX(-100%) rotate(-45deg)', transformOrigin: 'right center' }}></div>
          <div className="slash-line" style={{ width: '50px', top: '8px', left: '50%', transform: 'translateX(-100%) rotate(-45deg)', transformOrigin: 'right center', opacity: 0.5 }}></div>
        </div>

        {/* Main Vertical Spine */}
        <div className="relative">
          <div className="w-14 py-6 rounded-full glass-card flex flex-col items-center gap-4">
            {navIcons.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setActiveNav(idx);
                  if (idx === 0) setActiveSection('dashboard');
                  else if (idx === 1) handleGoToLiveRoom();
                  else if (idx === 2) handleGoToTeams();
                  else if (idx === 3) handleGoToPlayers();
                  else if (idx === 4) handleGoToPlayerApplications();
                  else if (idx === 5) handleGoToReport();
                  else if (idx === 6) handleGoToSettings();
                  else if (idx === 7) handleGoToResults();
                }}
                className={`nav-icon w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  activeNav === idx 
                    ? 'active bg-gradient-to-br from-pink-500/40 to-red-600/40 text-pink-400' 
                    : 'text-pink-300/60 hover:text-pink-400 hover:bg-pink-500/10'
                }`}
              >
                <item.icon size={20} />
              </button>
            ))}
          </div>

          {/* Active Indicator Line */}
          <div 
            className="absolute -right-3 w-1 h-8 bg-gradient-to-b from-pink-500 to-red-500 rounded-full transition-all duration-300 neon-glow"
            style={{ top: `${24 + activeNav * 56}px` }}
          ></div>
        </div>

        {/* Bottom Slash Lines */}
        <div className="relative w-full h-20 mt-2">
          <div className="absolute left-1/2 -translate-x-1/2 top-0 w-0.5 h-12 bg-gradient-to-b from-pink-500/80 to-transparent"></div>
          <div className="slash-line" style={{ width: '60px', bottom: '0', left: '50%', transform: 'translateX(-100%) rotate(45deg)', transformOrigin: 'right center' }}></div>
          <div className="slash-line" style={{ width: '50px', bottom: '8px', left: '50%', transform: 'translateX(-100%) rotate(45deg)', transformOrigin: 'right center', opacity: 0.5 }}></div>
        </div>

        {/* Logout at bottom */}
        <button
          onClick={handleLogout}
          className="nav-icon mt-4 w-10 h-10 rounded-xl flex items-center justify-center text-red-400/60 hover:text-red-400 hover:bg-red-500/20 transition-all"
        >
          <LogOut size={18} />
        </button>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="ml-28 min-h-screen flex flex-col">
        {renderContent()}
      </div>
    </div>
  );
};

