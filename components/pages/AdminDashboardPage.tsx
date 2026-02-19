import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, Users, Trophy, DollarSign, Activity, AlertCircle, 
  Search, Bell, User, LogOut, Menu, Calendar, Shield, Mail,
  Gavel, UserCheck, TrendingUp, FileText, Settings, Eye,
  Play, Pause, StopCircle, Edit, Trash2, Check, X, Download,
  Clock, Target, Award, Briefcase, ChevronRight, Filter,
  PieChart, LineChart, ArrowUp, ArrowDown, ArrowLeft, Sparkles, Zap,
  Home, Radio, Lock, Unlock, RotateCcw, Plus, Save, RefreshCw,
  AlertTriangle, CheckCircle, XCircle, Info, History,
  Layers, Gauge, BarChart, TrendingDown, Star, ChevronDown, ChevronUp,
  Wallet, Square, IndianRupee, Upload, Loader2, FileText as FileIcon, Image, Ban
} from 'lucide-react';
import { AuctionStatus, MatchData, UserRole, Player, Team, ApprovalStatus } from '../../types';
import { LiveAuctionPage } from './LiveAuctionPage';
import { PlayersPage } from './PlayersPage';
import { PlayerApplicationsPage } from './PlayerApplicationsPage';
import { TeamSquadPage } from './TeamSquadPage';
import { TeamHUDCard } from '../ui/TeamHUDCard';
import { socketService } from '../../services/socketService';
import { registerTeam, registerPlayer } from '../../services/apiService';
import { uploadTeamLogo, uploadDocument, uploadPlayerPhoto, uploadProfilePicture } from '../../services/firebaseStorageService';
import { firestore } from '../../services/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { useMatchSettings } from '../../hooks/useMatchSettings';
import { formatIndianCurrency, formatIndianCurrencyShort } from '../../services/currencyUtils';

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
          className="px-6 py-3 rounded-full text-pink-300 hover:text-white transition-all flex items-center gap-2.5 text-sm font-black"
          style={{ background: 'linear-gradient(135deg, rgba(255,20,100,0.12), rgba(200,50,120,0.08))', border: '1px solid rgba(255,0,102,0.3)', boxShadow: '0 0 12px rgba(255,0,102,0.15)' }}
        >
          <ArrowLeft size={20} />
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
    let csv = 'Team,Player,Role,Base Price,Sold Price,Status\n';
    teams.forEach(t => {
      t.acquiredPlayers.forEach(p => {
        const soldAmt = (p as any).soldAmount || (p as any).soldPrice || (p as any).currentBid || 0;
        csv += `"${t.name}","${p.name}","${(p as any).roleId || ''}","₹${(p.basePrice / 100000).toFixed(1)}L","₹${(soldAmt / 100000).toFixed(1)}L","${p.status}"\n`;
      });
    });
    unassignedPlayers.forEach(p => {
      csv += `"—","${p.name}","${(p as any).roleId || ''}","₹${(p.basePrice / 100000).toFixed(1)}L","—","${p.status || 'AVAILABLE'}"\n`;
    });
    const el = document.createElement('a');
    el.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
    el.setAttribute('download', `${currentMatch?.name || 'report'}_auction_report${isLive ? '_live' : ''}.csv`);
    el.style.display = 'none';
    document.body.appendChild(el);
    el.click();
    document.body.removeChild(el);
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
                <>{currentMatch?.name || 'Auction'} — Pre-Auction Overview</>
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

interface AdminDashboardPageProps {
  setStatus: (status: AuctionStatus) => void;
  currentMatch: MatchData | null;
  currentUser: { name: string; email: string; role: UserRole };
}

// Interface for System Logs
interface SystemLog {
  id: string;
  type: 'info' | 'warning' | 'error' | 'admin' | 'success';
  message: string;
  timestamp: string;
  actor?: string;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ setStatus, currentMatch, currentUser }) => {
  // Main navigation state
  const [activeSection, setActiveSection] = useState<'overview' | 'settings' | 'players' | 'playerApplications' | 'teams' | 'auctioneers' | 'liveMonitor' | 'liveRoom' | 'reports' | 'addTeam' | 'addPlayer' | 'teamDetail' | 'report' | 'history'>('overview');
  
  // Resolved match state - if currentMatch is undefined, we'll fetch the first available match
  const [resolvedMatch, setResolvedMatch] = useState<MatchData | null>(currentMatch);
  
  // ─── PURSE INTELLIGENCE: Real-time match settings subscription ─────────────
  const matchId = resolvedMatch?.id || currentMatch?.id || null;
  const {
    matchSettings,
    formattedPurse,
    formattedAvgValue,
    formattedMaxBasePrice,
    formattedRecommendedMin,
    shortPurse,
    shortMaxBasePrice,
    shortRecommendedMin,
    validatePlayerBasePrice,
    isLocked: isMatchSettingsLocked,
    loading: matchSettingsLoading,
  } = useMatchSettings(matchId);
  
  // Data states
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [auctioneers, setAuctioneers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [playerFilter, setPlayerFilter] = useState<'all' | 'available' | 'sold' | 'unsold'>('all');
  const [teamFilter, setTeamFilter] = useState<'all' | 'active' | 'inactive'>('all');
  
  // Season settings edit state
  const [editingSettings, setEditingSettings] = useState(false);
  const [seasonSettings, setSeasonSettings] = useState({
    name: currentMatch?.name || '',
    sport: currentMatch?.sport || 'Cricket',
    startDate: '',
    duration: 120,
    bidIncrement: 100000,
    maxTeams: 8,
    minSquadSize: 11,
    maxSquadSize: 15,
    baseTeamBudget: 10000000,
  });
  
  // Account settings edit state
  const [editingAccount, setEditingAccount] = useState(false);
  const [accountSettings, setAccountSettings] = useState({
    name: '',
    email: '',
    phone: '',
    organizationName: '',
    organizationType: '',
    designation: '',
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'account' | 'platform' | 'media'>('account');
  
  // Confirmation modals
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: string; data?: any; message: string } | null>(null);
  
  // Emergency controls
  const [emergencyPaused, setEmergencyPaused] = useState(false);
  
  // System logs
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  
  // Alerts counter
  const [alertsCount, setAlertsCount] = useState(0);
  
  // Auctioneer detail modal
  const [selectedAuctioneer, setSelectedAuctioneer] = useState<any>(null);
  const [showAuctioneerDetail, setShowAuctioneerDetail] = useState(false);
  
  // Reports page states
  const [biddingHistory, setBiddingHistory] = useState<{ [playerId: string]: any[] }>({});
  const [expandedPlayers, setExpandedPlayers] = useState<Set<string>>(new Set());
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSearchQuery, setReportSearchQuery] = useState('');
  
  // Live Monitor states
  const [currentBiddingPlayer, setCurrentBiddingPlayer] = useState<Player | null>(null);
  const [currentBid, setCurrentBid] = useState<number>(0);
  const [leadingTeamName, setLeadingTeamName] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(0);
  const [liveAuctionStatus, setLiveAuctionStatus] = useState<'READY' | 'LIVE' | 'PAUSED' | 'ENDED'>('READY');
  const [showLiveAuctionPage, setShowLiveAuctionPage] = useState(false);
  
  // Live notifications for bidding activity
  const [liveNotifications, setLiveNotifications] = useState<Array<{
    id: string;
    message: string;
    type: 'bid' | 'sold' | 'unsold' | 'start' | 'info';
    timestamp: number;
  }>>([]);
  
  // Sidebar collapse state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // ─── Team/Player Registration State (copied from Auctioneer) ──────────────
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  
  // Team moderation state
  type TeamModerationFilter = 'all' | 'accepted' | 'pending' | 'declined';
  const [teamModerationFilter, setTeamModerationFilter] = useState<TeamModerationFilter>('all');
  const [updatingTeamApproval, setUpdatingTeamApproval] = useState<string | null>(null);
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
  
  // ─── BASE PRICE VALIDATION STATE (Purse Intelligence) ─────────────
  const [basePriceWarning, setBasePriceWarning] = useState<string | null>(null);
  const [basePriceError, setBasePriceError] = useState<string | null>(null);

  // Tracks whether match resolution has fully completed (success or failure).
  // The data-fetch effect must NOT run until this is true, preventing the
  // premature "Match Data Not Found" error state on refresh.
  const [matchResolved, setMatchResolved] = useState(false);

  // LOCKED MATCH CONTEXT — Only use the match passed from App.tsx (derived from sessionStorage matchId)
  // Never auto-fetch or switch to a different match by email scanning
  useEffect(() => {
    if (currentMatch) {
      console.log('🔒 LOCKED: Using provided currentMatch:', currentMatch.id, currentMatch.name);
      setResolvedMatch(currentMatch);
      setMatchResolved(true);
      setLoading(false);
      return;
    }

    // currentMatch is null — try to fetch the SPECIFIC match from sessionStorage matchId
    const savedMatchId = sessionStorage.getItem('hypehammer_current_match_id');
    if (savedMatchId) {
      console.log('🔒 currentMatch is null but sessionStorage has matchId:', savedMatchId, '— fetching it directly');
      const fetchSpecificMatch = async () => {
        setLoading(true);
        try {
          console.log('📡 Fetching match from API:', `${API_BASE}/matches/${savedMatchId}`);
          const response = await fetch(`${API_BASE}/matches/${savedMatchId}`);
          console.log('📡 API Response status:', response.status, response.statusText);
          
          if (response.ok) {
            const data = await response.json();
            console.log('📡 API Response data:', data);
            const matchData = data.data || data;
            if (matchData && matchData.id) {
              console.log('🔒 ✅ Loaded locked match from API:', matchData.name, matchData.id);
              setResolvedMatch(matchData);
            } else {
              console.error('⚠️ ❌ Match not found for saved ID:', savedMatchId, 'Response:', data);
              setResolvedMatch(null);
            }
          } else {
            const errorText = await response.text();
            console.error('❌ Failed to fetch match:', savedMatchId, 'Status:', response.status, 'Error:', errorText);
            setResolvedMatch(null);
          }
        } catch (error) {
          console.error('❌ Error fetching locked match:', error);
          console.error('❌ Error details:', {
            name: (error as Error).name,
            message: (error as Error).message,
            stack: (error as Error).stack
          });
          setResolvedMatch(null);
        } finally {
          setMatchResolved(true);
          setLoading(false);
        }
      };
      fetchSpecificMatch();
    } else {
      console.warn('🔒 ⚠️ No match provided and no matchId in sessionStorage. Admin must select a match.');
      setResolvedMatch(null);
      setMatchResolved(true);
      setLoading(false);
    }
  }, [currentMatch]);

  // Use resolvedMatch for all operations
  const activeMatch = resolvedMatch;

  /**
   * CRITICAL: Filter out declined players for all auction-related displays and stats
   * Declined players should ONLY appear in the Applied Players / Review section
   * This is the SINGLE SOURCE OF TRUTH for auction-eligible players in Admin Dashboard
   */
  const eligiblePlayers = useMemo(() => {
    return players.filter(p => p.approvalStatus !== 'declined');
  }, [players]);

  /**
   * CRITICAL: Filter out declined teams for all auction-related displays and stats
   * Declined teams should ONLY appear in the Applied Teams / Review section
   * This is the SINGLE SOURCE OF TRUTH for auction-eligible teams in Admin Dashboard
   */
  const eligibleTeams = useMemo(() => {
    return teams.filter(t => t.approvalStatus !== 'declined');
  }, [teams]);

  // Scroll to top when section changes
  useEffect(() => {
    const contentDiv = document.querySelector('.admin-content-scroll');
    if (contentDiv) {
      contentDiv.scrollTop = 0;
    }
  }, [activeSection]);

  // ─── BASE PRICE VALIDATION: Real-time validation against matchSettings ─────
  useEffect(() => {
    if (!playerBasePrice || !matchSettings) {
      setBasePriceWarning(null);
      setBasePriceError(null);
      return;
    }
    
    const basePriceNum = parseInt(playerBasePrice, 10);
    if (isNaN(basePriceNum)) {
      setBasePriceWarning(null);
      setBasePriceError(null);
      return;
    }
    
    const validation = validatePlayerBasePrice(basePriceNum);
    
    if (validation.hasError) {
      setBasePriceError(validation.errorMessage);
      setBasePriceWarning(null);
    } else if (validation.hasWarning) {
      setBasePriceWarning(validation.warningMessage);
      setBasePriceError(null);
    } else {
      setBasePriceWarning(null);
      setBasePriceError(null);
    }
  }, [playerBasePrice, matchSettings, validatePlayerBasePrice]);

  // Filtered data based on search and filters
  const filteredTeams = teams.filter(team => {
    const matchesSearch = team.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.repName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = teamFilter === 'all' || 
      (teamFilter === 'active' && team.squadSize > 0) ||
      (teamFilter === 'inactive' && team.squadSize === 0);
    return matchesSearch && matchesFilter;
  });
  
  const filteredPlayers = eligiblePlayers.filter(player => {
    const matchesSearch = player.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      player.role?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = playerFilter === 'all' ||
      (playerFilter === 'available' && (player.status === 'AVAILABLE' || player.status === 'PENDING')) ||
      (playerFilter === 'sold' && player.status === 'SOLD') ||
      (playerFilter === 'unsold' && player.status === 'UNSOLD');
    return matchesSearch && matchesFilter;
  });

  // Helper function to calculate team stats based on sold players
  const getTeamStats = (team: Team) => {
    const soldPlayersForTeam = eligiblePlayers.filter(p => 
      p.status === 'SOLD' && (p.soldTo === team.id || p.leadingTeamId === team.id)
    );
    
    const totalSpent = soldPlayersForTeam.reduce((sum, p) => {
      const amount = p.soldAmount || p.soldPrice || p.finalPrice || p.currentBid || p.basePrice || 0;
      console.log(`💰 ${team.name} - ${p.name}: sold=${p.soldAmount}, price=${p.soldPrice}, final=${p.finalPrice}, current=${p.currentBid}, base=${p.basePrice} → using: ${amount}`);
      return sum + amount;
    }, 0);
    
    const initialBudget = team.budget || team.initialBudget || 0;
    const remainingBudget = initialBudget - totalSpent;
    
    console.log(`📊 ${team.name}: Budget=${initialBudget}, Spent=${totalSpent}, Remaining=${remainingBudget}`);
    
    return {
      squadSize: soldPlayersForTeam.length,
      spent: totalSpent,
      remaining: remainingBudget,
      soldPlayers: soldPlayersForTeam
    };
  };
  
  // Add system log
  const addSystemLog = (type: SystemLog['type'], message: string, actor?: string) => {
    const newLog: SystemLog = {
      id: Date.now().toString(),
      type,
      message,
      timestamp: new Date().toLocaleTimeString(),
      actor: actor || currentUser.name
    };
    setSystemLogs(prev => [newLog, ...prev].slice(0, 100)); // Keep last 100 logs
  };
  
  // Remove live notification
  const removeLiveNotification = (notificationId: string) => {
    setLiveNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  // Fetch bid history for current player to get actual current bid and leading team
  const fetchBidHistoryForCurrentPlayer = async (playerId: string) => {
    if (!activeMatch?.id || !playerId) return;
    try {
      console.log('📋 Fetching bid history for player:', playerId);
      const response = await fetch(`${API_BASE}/bids?seasonId=${activeMatch.id}&playerId=${playerId}`);
      if (response.ok) {
        const data = await response.json();
        const bids = data.data || [];
        // Sort bids by timestamp descending (most recent first)
        const sortedBids = bids.sort((a: any, b: any) => {
          const timeA = new Date(a.timestamp || 0).getTime();
          const timeB = new Date(b.timestamp || 0).getTime();
          return timeB - timeA;
        });
        console.log('✓ Fetched bid history:', sortedBids.length, 'bids');
        
        // Use the latest bid to set actual current bid and leading team
        if (sortedBids.length > 0) {
          const latestBid = sortedBids[0];
          console.log('📍 Restoring current bid from history:', latestBid.amount, 'by', latestBid.teamName);
          setCurrentBid(latestBid.amount);
          setLeadingTeamName(latestBid.teamName);
        }
      }
    } catch (error) {
      console.error('Failed to fetch bid history:', error);
    }
  };
  
  // Season Settings handlers
  const handleSaveSettings = async () => {
    try {
      const matchId = resolvedMatch?.id || currentMatch?.id;
      if (!matchId) {
        alert('No match/season selected');
        return;
      }

      const response = await fetch(`${API_BASE}/matches/${matchId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: seasonSettings.name,
          sport: seasonSettings.sport,
          // Top-level fields (match registration format)
          maxTeams: seasonSettings.maxTeams,
          maxPlayersPerTeam: seasonSettings.maxSquadSize,
          baseBudgetPerTeam: seasonSettings.baseTeamBudget,
          // Nested config (for consistency with config readers)
          config: {
            sport: seasonSettings.sport,
            duration: seasonSettings.duration,
            bidIncrement: seasonSettings.bidIncrement,
            maxTeams: seasonSettings.maxTeams,
            totalBudget: seasonSettings.baseTeamBudget,
            squadSize: {
              min: seasonSettings.minSquadSize,
              max: seasonSettings.maxSquadSize,
            },
          }
        }),
      });

      if (response.ok) {
        const result = await response.json();
        addSystemLog('admin', `Season settings updated: ${seasonSettings.name}`);
        alert('Settings saved successfully!');
        setEditingSettings(false);
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Save settings error:', error);
      addSystemLog('error', 'Failed to save season settings');
      alert('Failed to save settings');
    }
  };
  
  const handleLockSeason = () => {
    setConfirmAction({
      type: 'lockSeason',
      message: 'Lock season settings? This will prevent further edits until auction ends.'
    });
    setShowConfirmation(true);
  };
  
  // Emergency controls
  const handleEmergencyPause = async () => {
    try {
      addSystemLog('warning', 'EMERGENCY PAUSE initiated by admin');
      setEmergencyPaused(true);
      alert('Auction paused! Use Resume to continue.');
    } catch (error) {
      addSystemLog('error', 'Emergency pause failed');
    }
  };
  
  const handleExtendTimer = async (seconds: number) => {
    try {
      addSystemLog('admin', `Timer extended by ${seconds}s`);
      alert(`Timer extended by ${seconds} seconds!`);
    } catch (error) {
      addSystemLog('error', 'Failed to extend timer');
    }
  };
  
  const handleForceCloseBidding = () => {
    setConfirmAction({
      type: 'forceClose',
      message: 'Force close current bidding? This will immediately sell to the leading team.'
    });
    setShowConfirmation(true);
  };
  
  const handleRollbackLastAction = () => {
    setConfirmAction({
      type: 'rollback',
      message: 'Rollback last auction action? This cannot be undone.'
    });
    setShowConfirmation(true);
  };
  
  // Player management
  const handleApprovePlayer = async (playerId: string) => {
    try {
      addSystemLog('success', `Player approved: ${players.find(p => p.id === playerId)?.name}`);
      alert('Player approved!');
    } catch (error) {
      addSystemLog('error', 'Failed to approve player');
    }
  };
  
  const handleRejectPlayer = async (playerId: string) => {
    setConfirmAction({
      type: 'rejectPlayer',
      data: playerId,
      message: `Reject player: ${players.find(p => p.id === playerId)?.name}?`
    });
    setShowConfirmation(true);
  };
  
  const handleEditPlayerPrice = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    const newPrice = prompt(`Edit base price for ${player?.name}`, ((player?.basePrice || 0) / 100000).toString());
    if (newPrice) {
      addSystemLog('admin', `Base price updated for ${player?.name}: ₹${newPrice}L`);
      alert('Price updated!');
    }
  };
  
  const handleRemovePlayer = (playerId: string) => {
    setConfirmAction({
      type: 'removePlayer',
      data: playerId,
      message: `Remove player: ${players.find(p => p.id === playerId)?.name}? This is permanent.`
    });
    setShowConfirmation(true);
  };
  
  // Team management
  const handleApproveTeam = async (teamId: string) => {
    try {
      addSystemLog('success', `Team approved: ${teams.find(t => t.id === teamId)?.name}`);
      alert('Team approved!');
    } catch (error) {
      addSystemLog('error', 'Failed to approve team');
    }
  };
  
  const handleRejectTeam = async (teamId: string) => {
    setConfirmAction({
      type: 'rejectTeam',
      data: teamId,
      message: `Reject team: ${teams.find(t => t.id === teamId)?.name}?`
    });
    setShowConfirmation(true);
  };
  
  const handleEditTeamBudget = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    const newBudget = prompt(`Edit budget for ${team?.name}`, ((team?.budget || 0) / 1000000).toString());
    if (newBudget) {
      addSystemLog('admin', `Budget updated for ${team?.name}: ₹${newBudget}M`);
      alert('Budget updated!');
    }
  };
  
  const handleDisableTeam = (teamId: string) => {
    setConfirmAction({
      type: 'disableTeam',
      data: teamId,
      message: `Disable team: ${teams.find(t => t.id === teamId)?.name}? They will be removed from auction.`
    });
    setShowConfirmation(true);
  };

  // Auctioneer approval handlers
  const handleApproveAuctioneer = async (auctioneerId: string) => {
    if (!activeMatch?.id) {
      alert('No active season selected');
      return;
    }
    
    // Check if another auctioneer is already approved
    const alreadyApproved = auctioneers.find(a => a.status === 'approved' && a.id !== auctioneerId);
    if (alreadyApproved) {
      alert(`ERROR: ${alreadyApproved.name} is already approved for this season. Only ONE auctioneer allowed per season.`);
      return;
    }
    
    setConfirmAction({
      type: 'approveAuctioneer',
      data: auctioneerId,
      message: `Approve ${auctioneers.find(a => a.id === auctioneerId)?.name} as THE auctioneer? All other applications will be auto-rejected.`
    });
    setShowConfirmation(true);
  };

  const handleRejectAuctioneer = async (auctioneerId: string) => {
    if (!activeMatch?.id) {
      alert('No active season selected');
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE}/auctioneer/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: auctioneerId
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setAuctioneers(prev => prev.map(a => 
          a.id === auctioneerId ? { ...a, status: 'rejected' } : a
        ));
        addSystemLog('warning', `Auctioneer application rejected: ${auctioneers.find(a => a.id === auctioneerId)?.name}`);
        alert('Auctioneer rejected!');
      } else {
        alert(result.message || 'Failed to reject auctioneer');
      }
    } catch (error) {
      console.error('Error rejecting auctioneer:', error);
      addSystemLog('error', 'Failed to reject auctioneer');
      alert('Failed to reject auctioneer');
    }
  };
  
  // Confirmation modal handler
  const executeConfirmedAction = async () => {
    if (!confirmAction) return;
    
    try {
      switch (confirmAction.type) {
        case 'approveAuctioneer':
          const response = await fetch(`${API_BASE}/auctioneer/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: confirmAction.data
            })
          });
          const result = await response.json();
          if (response.ok) {
            setAuctioneers(prev => prev.map(a => 
              a.id === confirmAction.data ? { ...a, status: 'approved' } : 
              a.status === 'pending' ? { ...a, status: 'rejected' } : a
            ));
            addSystemLog('success', `Auctioneer approved: ${auctioneers.find(a => a.id === confirmAction.data)?.name}`);
            alert('Auctioneer approved! All other applications auto-rejected.');
          }
          break;
          
        case 'lockSeason':
          addSystemLog('admin', 'Season settings LOCKED - no further edits allowed');
          alert('Season locked!');
          break;
          
        case 'forceClose':
          addSystemLog('warning', 'Admin FORCE CLOSED current bidding');
          alert('Bidding force closed!');
          break;
          
        case 'rollback':
          addSystemLog('error', 'Admin initiated ROLLBACK of last action');
          alert('Last action rolled back!');
          break;
          
        case 'rejectPlayer':
        case 'removePlayer':
          addSystemLog('warning', `Player removed: ${players.find(p => p.id === confirmAction.data)?.name}`);
          alert('Player removed!');
          break;
          
        case 'rejectTeam':
        case 'disableTeam':
          addSystemLog('warning', `Team disabled: ${teams.find(t => t.id === confirmAction.data)?.name}`);
          alert('Team disabled!');
          break;
      }
    } catch (error) {
      addSystemLog('error', `Action failed: ${confirmAction.type}`);
      alert('Action failed!');
    }
    
    setShowConfirmation(false);
    setConfirmAction(null);
  };

  // Fetch season-specific data from API
  useEffect(() => {
    // Do not run until match resolution is fully complete.
    // Without this guard, the effect would call setLoading(false) immediately
    // (because activeMatch is still null during resolution), which would
    // prematurely render the "Match Data Not Found" error state.
    if (!matchResolved) return;

    const fetchData = async () => {
      try {
        // Only fetch if we have an active match
        if (!activeMatch?.id) {
          console.log('⏸️ Skipping data fetch - no activeMatch (resolution finished with no match)');
          // loading was already set to false by the match resolution effect
          return;
        }
        
        console.log('🔄 AdminDashboard: Starting data fetch, activeMatch:', activeMatch?.id);
        setLoading(true);
        
        // Build query params - ALWAYS filter by matchId
        const matchQuery = `?matchId=${activeMatch.id}`;
        
        console.log('📡 Fetching from:', `${API_BASE}/teams${matchQuery}`);
        
        const [teamsRes, playersRes, auctioneersRes] = await Promise.all([
          fetch(`${API_BASE}/teams${matchQuery}`),
          fetch(`${API_BASE}/players${matchQuery}`),
          fetch(`${API_BASE}/auctioneers${matchQuery}`)
        ]);

        console.log('📊 Response status - Teams:', teamsRes.status, 'Players:', playersRes.status, 'Auctioneers:', auctioneersRes.status);

        if (teamsRes.ok) {
          const data = await teamsRes.json();
          console.log('✅ Teams data:', data.data?.length || 0, 'teams');
          // Calculate squadSize from playerIds array length
          const teamsWithSquadSize = (data.data || []).map((team: Team) => ({
            ...team,
            squadSize: team.playerIds?.length || 0
          }));
          setTeams(teamsWithSquadSize);
        } else {
          console.error('❌ Teams fetch failed:', teamsRes.status, await teamsRes.text());
        }

        if (playersRes.ok) {
          const data = await playersRes.json();
          console.log('✅ Players data:', data.data?.length || 0, 'players');
          setPlayers(data.data || []);
        } else {
          console.error('❌ Players fetch failed:', playersRes.status, await playersRes.text());
        }

        if (auctioneersRes.ok) {
          const data = await auctioneersRes.json();
          console.log('✅ Auctioneers data:', data.data?.length || 0, 'auctioneers');
          setAuctioneers(data.data || []);
          
          // Initialize alerts count from auctioneers data
          const pendingApprovals = (data.data || []).filter((a: any) => !a.status || a.status === 'pending').length;
          setAlertsCount(pendingApprovals);
        } else {
          console.error('❌ Auctioneers fetch failed:', auctioneersRes.status, await auctioneersRes.text());
        }
        
        // Add initial log
        addSystemLog('info', 'Admin dashboard loaded');
        console.log('✅ AdminDashboard: Data fetch complete');
      } catch (error) {
        console.error('❌ Failed to fetch dashboard data:', error);
        addSystemLog('error', 'Failed to load dashboard data');
      } finally {
        setLoading(false);
        console.log('✅ AdminDashboard: Loading state set to false');
      }
    };

    fetchData();
  }, [activeMatch?.id, matchResolved]);

  // Initialize season settings from active match
  useEffect(() => {
    if (activeMatch) {
      setSeasonSettings({
        name: activeMatch.name || '',
        sport: activeMatch.sport || activeMatch.sportType || activeMatch.config?.sport || 'Cricket',
        startDate: activeMatch.matchDate ? new Date(activeMatch.matchDate).toISOString().split('T')[0] : '',
        duration: activeMatch.config?.duration || 120,
        bidIncrement: activeMatch.config?.bidIncrement || 100000,
        maxTeams: activeMatch.maxTeams || activeMatch.config?.maxTeams || 8,
        minSquadSize: activeMatch.config?.squadSize?.min || 11,
        maxSquadSize: activeMatch.maxPlayersPerTeam || activeMatch.config?.squadSize?.max || activeMatch.config?.maxSquadSize || 15,
        baseTeamBudget: activeMatch.baseBudgetPerTeam || activeMatch.config?.totalBudget || activeMatch.config?.baseTeamBudget || 10000000,
      });
    }
  }, [activeMatch]);

  // Initialize account settings from active match
  useEffect(() => {
    if (activeMatch) {
      setAccountSettings({
        name: activeMatch.organizerName || currentUser.name || '',
        email: activeMatch.organizerEmail || activeMatch.adminEmail || currentUser.email || '',
        phone: activeMatch.organizerPhone || '',
        organizationName: activeMatch.organizationName || '',
        organizationType: activeMatch.organizationType || '',
        designation: activeMatch.designation || '',
      });
    }
  }, [activeMatch]);

  // Profile photo upload handler
  const handleProfilePhotoUpload = async (file: File) => {
    const matchId = resolvedMatch?.id || currentMatch?.id;
    if (!matchId) return;
    setUploadingPhoto(true);
    try {
      const photoUrl = await uploadProfilePicture(file, matchId);
      // Save URL to match document
      const res = await fetch(`${API_BASE}/matches/${matchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profilePhotoURL: photoUrl }),
      });
      if (res.ok) {
        setResolvedMatch(prev => prev ? { ...prev, profilePhotoURL: photoUrl } : null);
        addSystemLog('admin', 'Profile photo updated');
      }
    } catch (err) {
      console.error('Profile photo upload error:', err);
      addSystemLog('error', 'Failed to upload profile photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Save account settings handler
  const handleSaveAccountSettings = async () => {
    const matchId = resolvedMatch?.id || currentMatch?.id;
    if (!matchId) { alert('No match/season selected'); return; }
    try {
      const res = await fetch(`${API_BASE}/matches/${matchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizerName: accountSettings.name,
          organizerEmail: accountSettings.email,
          organizerPhone: accountSettings.phone,
          organizationName: accountSettings.organizationName,
          organizationType: accountSettings.organizationType,
          designation: accountSettings.designation,
        }),
      });
      if (res.ok) {
        setResolvedMatch(prev => prev ? {
          ...prev,
          organizerName: accountSettings.name,
          organizerEmail: accountSettings.email,
          organizerPhone: accountSettings.phone,
          organizationName: accountSettings.organizationName,
          organizationType: accountSettings.organizationType,
          designation: accountSettings.designation as any,
        } : null);
        addSystemLog('admin', 'Account settings updated');
        alert('Account settings saved!');
        setEditingAccount(false);
      } else {
        throw new Error('Failed to save');
      }
    } catch (err) {
      console.error('Save account settings error:', err);
      alert('Failed to save account settings');
    }
  };

  // CONSOLIDATED Firebase real-time listeners (matches other working dashboards)
  useEffect(() => {
    if (!currentUser?.email || !activeMatch?.id) {
      console.log('⏸️ Admin: Waiting for activeMatch to set up listeners...');
      return;
    }

    const seasonId = activeMatch.id;
    
    console.log('🔥 Admin: Firebase listeners useEffect triggered');
    console.log('   → Current user:', currentUser.email);
    console.log('   → Active match ID:', seasonId);    console.log('🔥 Admin: Setting up real-time listeners for seasonId:', seasonId);

    // Initialize realtime connection
    socketService.connect();

    // Join season room
    socketService.joinSeason(seasonId, currentUser.email, UserRole.ADMIN);

    // Store unsubscribe functions for cleanup
    const unsubscribers: (() => void)[] = [];

    // Listen to players collection
    const playersMatchId = activeMatch.id;
    unsubscribers.push(socketService.onPlayersUpdate(playersMatchId, (updatedPlayers) => {
      console.log('🔥 Admin: Players updated:', updatedPlayers.length);
      console.log('🔥 Admin: All player statuses:', updatedPlayers.map(p => `${p.name}: ${p.status}`).join(', '));
      setPlayers(updatedPlayers);

      // Check for live player being auctioned (check both LIVE and PENDING)
      const livePlayer = updatedPlayers.find((p: any) => p.status === 'LIVE' || p.status === 'PENDING');
      if (livePlayer) {
        console.log('🔥 Admin: Found live player:', livePlayer.name, 'status:', livePlayer.status);
        console.log('   → Current bid:', livePlayer.currentBid);
        console.log('   → Base price:', livePlayer.basePrice);
        console.log('   → Leading team ID:', livePlayer.leadingTeamId);
        console.log('   → Image URL:', livePlayer.imageUrl);
        setCurrentBiddingPlayer(livePlayer);
        setCurrentBid(livePlayer.currentBid || livePlayer.basePrice || 0);
        setLeadingTeamName(livePlayer.leadingTeamName || '');
        setLiveAuctionStatus('LIVE');
      } else {
        console.log('⚠️ Admin: No LIVE/PENDING player found. All statuses:', updatedPlayers.map(p => `${p.name}:${p.status}`).join(', '));
        // If there are sold/unsold players, auction is in progress
        const hasProcessedPlayers = updatedPlayers.some((p: any) => p.status === 'SOLD' || p.status === 'UNSOLD');
        if (hasProcessedPlayers && liveAuctionStatus !== 'ENDED') {
          // Keep auction status as LIVE but clear current player
          setCurrentBiddingPlayer(null);
          console.log('🔥 Admin: No live player, but auction in progress');
        }
      }
    }));

    // Listen to teams collection
    const teamsMatchId = activeMatch.id;
    unsubscribers.push(socketService.onTeamsUpdate(teamsMatchId, (updatedTeams) => {
      console.log('🔥 Admin: Teams updated:', updatedTeams.length);
      console.log('🔥 Admin: Teams with logos:', updatedTeams.map((t: any) => ({ name: t.name, logo: t.logo })));
      // Calculate squadSize from playerIds array length (same as initial fetch)
      const teamsWithSquadSize = updatedTeams.map((team: Team) => ({
        ...team,
        squadSize: team.playerIds?.length || 0
      }));
      setTeams(teamsWithSquadSize);
    }));

    // Listen to bid events
    unsubscribers.push(socketService.onNewBid((bidData) => {
      console.log('🔥 Admin: New bid:', bidData);
      
      if (!bidData.amount) {
        console.error('❌ Admin: Bid missing amount:', bidData);
        return;
      }
      
      setCurrentBid(bidData.amount);
      setLeadingTeamName(bidData.teamName);
      addSystemLog('info', `Bid: ${bidData.teamName} - ₹${(bidData.amount / 100000).toFixed(1)}L`);
    }));

    // AUCTION STATE UPDATE - PRIMARY SOURCE OF TRUTH FOR AUCTION STATUS ONLY
    // Do NOT use this for bid data - use onPlayersUpdate instead
    unsubscribers.push(socketService.onAuctionStateUpdate((data: any) => {
      console.log('🚨 Admin: AUCTION_STATE_UPDATE received:', data);
      console.log('   → Status:', data.status);
      console.log('   → Current Player ID:', data.currentPlayerId);
      console.log('   → Bidding Active:', data.biddingActive);
      
      if (data.status) {
        const normalizedStatus = (data.status || '').toUpperCase();
        console.log('   → Setting liveAuctionStatus to:', normalizedStatus);
        if (normalizedStatus === 'LIVE' || normalizedStatus === 'PAUSED' || normalizedStatus === 'READY' || normalizedStatus === 'ENDED') {
          setLiveAuctionStatus(normalizedStatus as 'READY' | 'LIVE' | 'PAUSED' | 'ENDED');
        }
      }
      
      if (data.remainingSeconds !== undefined) {
        setCountdown(data.remainingSeconds);
      }
      
      // If auction is LIVE and we have a currentPlayerId, fetch the player data from API
      // This acts as a fallback if onPlayersUpdate hasn't updated the LIVE status yet
      if (data.status === 'LIVE' && data.biddingActive && data.currentPlayerId) {
        console.log('   → Fetching player from API:', data.currentPlayerId);
        fetch(`${API_BASE}/players/${data.currentPlayerId}`)
          .then(res => res.json())
          .then(playerData => {
            if (playerData.success && playerData.data) {
              console.log('✅ Admin: Fetched player from API:', playerData.data.name);
              setCurrentBiddingPlayer(playerData.data);
              setCurrentBid(playerData.data.currentBid || playerData.data.basePrice || data.currentBid || 0);
              setLeadingTeamName(playerData.data.leadingTeamName || '');
              setLiveAuctionStatus('LIVE');
            }
          })
          .catch(err => {
            console.error('❌ Admin: Error fetching player from API:', err);
          });
      }
    }));

    // Auction lifecycle events
    unsubscribers.push(socketService.onAuctionStarted((data: any) => {
      console.log('🚀 Admin: AUCTION_STARTED');
      setLiveAuctionStatus('LIVE');
      addSystemLog('info', 'Auction has started');
    }));

    unsubscribers.push(socketService.onAuctionPaused((data: any) => {
      console.log('⏸️ Admin: AUCTION_PAUSED');
      setLiveAuctionStatus('PAUSED');
      addSystemLog('warning', 'Auction paused');
    }));

    unsubscribers.push(socketService.onAuctionResumed((data: any) => {
      console.log('▶️ Admin: AUCTION_RESUMED');
      setLiveAuctionStatus('LIVE');
      addSystemLog('info', 'Auction resumed');
    }));

    unsubscribers.push(socketService.onAuctionEnded((data: any) => {
      console.log('🏁 Admin: AUCTION_ENDED');
      setLiveAuctionStatus('ENDED');
      addSystemLog('info', 'Auction has ended');
    }));

    // Player bidding events
    unsubscribers.push(socketService.onPlayerBiddingStarted((data: any) => {
      console.log('🎯 Admin: PLAYER_BIDDING_STARTED', data);
      
      if (!data || !data.player) {
        // IMPORTANT: When currentPlayer/active is null/empty, DO NOT clear the bid!
        // This happens when auctioneer logs out mid-auction.
        // The player document in Firestore still has currentBid and leadingTeamName.
        // The onPlayersUpdate listener will keep the bid display up-to-date.
        // Only clear the player itself, not the bid display.
        setCurrentBiddingPlayer(null);
        // DO NOT set currentBid to 0 - let onPlayersUpdate handle it
        // DO NOT set leadingTeamName to '' - let onPlayersUpdate handle it
        return;
      }
      
      setCurrentBiddingPlayer(data.player);
      setCurrentBid(data.player?.currentBid || data.basePrice || data.player.basePrice || 0);
      setLeadingTeamName(data.player?.leadingTeamName || '');
      setCountdown(data.duration || 120);
      setLiveAuctionStatus('LIVE');
      
      // Fetch actual bid history to get accurate current bid and leading team
      fetchBidHistoryForCurrentPlayer(data.player.id);
      
      addSystemLog('info', `Bidding started for ${data.player.name}`);
    }));

    unsubscribers.push(socketService.onPlayerSold(async (data: any) => {
      console.log('✅ Admin: PLAYER_SOLD', data);
      
      setCurrentBiddingPlayer(null);
      setCurrentBid(0);
      setLeadingTeamName('');
      addSystemLog('success', `Player ${data.playerName} sold to ${data.teamName} for ₹${(data.finalAmount / 100000).toFixed(1)}L`);
      
      // Clear bidding history cache for this player so Reports section refreshes
      setBiddingHistory(prev => {
        const updated = { ...prev };
        delete updated[data.playerId];
        return updated;
      });
      
      // Firebase listeners (onPlayersUpdate and onTeamsUpdate) will automatically update all data
    }));

    unsubscribers.push(socketService.onPlayerUnsold(async (data: any) => {
      console.log('❌ Admin: PLAYER_UNSOLD', data);
      setCurrentBiddingPlayer(null);
      setCurrentBid(0);
      setLeadingTeamName('');
      addSystemLog('warning', `${data.playerName} went unsold`);
      
      // Clear bidding history cache for this player so Reports section refreshes
      setBiddingHistory(prev => {
        const updated = { ...prev };
        delete updated[data.playerId];
        return updated;
      });
      
      // Firebase listeners (onPlayersUpdate and onTeamsUpdate) will automatically update all data
    }));

    // Timer updates
    unsubscribers.push(socketService.onTimerUpdate((data: { remainingSeconds: number }) => {
      setCountdown(data.remainingSeconds);
    }));

    return () => {
      console.log('🔥 Admin: Cleaning up real-time listeners');
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [currentUser?.email, activeMatch?.id]);

  // Calculate season-specific KPIs - USE eligiblePlayers (not raw players) for auction stats
  const totalTeams = teams.length;
  const approvedTeams = teams.filter(t => t.squadSize !== undefined && t.squadSize > 0).length;
  const totalPlayers = eligiblePlayers.length;
  const soldPlayers = eligiblePlayers.filter(p => p.status === 'SOLD').length;
  const unsoldPlayers = eligiblePlayers.filter(p => p.status === 'UNSOLD').length;
  const pendingPlayers = eligiblePlayers.filter(p => p.status === 'AVAILABLE' || p.status === 'PENDING').length;
  const totalBudget = teams.reduce((acc, team) => acc + (team.budget || team.initialBudget || 0), 0);
  const remainingBudget = teams.reduce((acc, team) => acc + (team.remainingBudget || team.budget || team.initialBudget || 0), 0);
  const spentBudget = totalBudget - remainingBudget;
  const pendingAuctioneers = auctioneers.filter(a => !a.status || a.status === 'pending').length;
  const approvedAuctioneers = auctioneers.filter(a => a.status === 'approved').length;
  
  // Auction readiness calculation (0-100%)
  const auctionReadiness = Math.min(100, Math.round(
    (approvedTeams >= 2 ? 25 : 0) +
    (totalPlayers >= 10 ? 25 : 0) +
    (approvedAuctioneers >= 1 ? 25 : 0) +
    (currentMatch?.status === 'SETUP' ? 25 : 0)
  ));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SETUP': return 'bg-yellow-400';
      case 'ONGOING': case 'LIVE': return 'bg-red-500 animate-pulse';
      case 'PAUSED': return 'bg-orange-500';
      case 'COMPLETED': case 'ENDED': return 'bg-gray-500';
      default: return 'bg-blue-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'SETUP': return 'Draft';
      case 'ONGOING': return '🔴 LIVE';
      case 'LIVE': return '🔴 LIVE';
      case 'PAUSED': return 'Paused';
      case 'COMPLETED': return 'Ended';
      case 'ENDED': return 'Ended';
      default: return 'Upcoming';
    }
  };
  
  const getReadinessColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  const getLogIcon = (type: SystemLog['type']) => {
    switch (type) {
      case 'success': return <CheckCircle size={16} className="text-green-600" />;
      case 'error': return <XCircle size={16} className="text-red-600" />;
      case 'warning': return <AlertTriangle size={16} className="text-yellow-600" />;
      case 'admin': return <Shield size={16} className="text-purple-600" />;
      default: return <Info size={16} className="text-blue-600" />;
    }
  };

  // Fetch bidding history for a player
  const fetchBiddingHistory = async (playerId: string) => {
    if (!resolvedMatch?.id) {
      console.warn('⚠️ resolvedMatch not available, cannot fetch bidding history');
      return;
    }
    
    try {
      setReportLoading(true);
      // Fetch bids for this player in the current match
      console.log('📋 Fetching bidding history for player:', playerId, 'in match:', resolvedMatch.id);
      const url = `${API_BASE}/bids?seasonId=${resolvedMatch.id}&playerId=${playerId}`;
      console.log('🔗 Request URL:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error('❌ Failed to fetch bids, HTTP status:', response.status, response.statusText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('📥 Raw API Response:', result);
      console.log('📥 Response type:', typeof result);
      console.log('📥 Response keys:', Object.keys(result));
      
      // Extract bids from response 
      // Backend returns: { success: true, data: [...] } or just [...]
      let bids = [];
      if (result.data && Array.isArray(result.data)) {
        bids = result.data;
        console.log('✓ Extracted bids from result.data:', bids.length, 'bids');
      } else if (result.bids && Array.isArray(result.bids)) {
        bids = result.bids;
        console.log('✓ Extracted bids from result.bids:', bids.length, 'bids');
      } else if (Array.isArray(result)) {
        bids = result;
        console.log('✓ Result is directly an array:', bids.length, 'bids');
      } else {
        console.warn('⚠️ Unexpected response structure:', result);
        bids = [];
      }
      
      console.log('📊 Total bids extracted:', bids.length);
      
      if (bids.length > 0) {
        console.log('📋 First bid sample:', JSON.stringify(bids[0], null, 2));
      }
      
      // Sort by timestamp ascending (oldest first, chronological order)
      const sortedBids = bids.sort((a: any, b: any) => {
        const timeA = new Date(a.timestamp || 0).getTime();
        const timeB = new Date(b.timestamp || 0).getTime();
        return timeA - timeB;
      });
      
      console.log('✓ Sorted bids chronologically');
      
      // Enrich bids with team names from local teams array
      const enrichedBids = sortedBids.map((bid: any) => {
        const team = teams.find(t => t.id === bid.teamId);
        return {
          ...bid,
          teamName: bid.teamName || team?.name || 'Unknown Team'
        };
      });
      
      console.log('✅ Successfully enriched', enrichedBids.length, 'bids with team data');
      
      setBiddingHistory(prev => ({
        ...prev,
        [playerId]: enrichedBids
      }));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('❌ Failed to fetch bidding history:', errorMsg);
      console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'N/A');
      
      setBiddingHistory(prev => ({
        ...prev,
        [playerId]: []
      }));
    } finally {
      setReportLoading(false);
    }
  };

  // Generate CSV for report
  const generateReportCSV = () => {
    let csvContent = 'Team,Player,Email,Base Price,Sold Price,Profit/Loss,Bid Count\n';
    
    teams.forEach(team => {
      const teamPlayers = eligiblePlayers.filter(p => p.soldTo === team.id);
      
      if (teamPlayers.length === 0) {
        csvContent += `"${team.name}","No players assigned","","","","",""\n`;
      } else {
        teamPlayers.forEach((player, idx) => {
          const difference = (player.soldAmount || 0) - player.basePrice;
          const bidCount = biddingHistory[player.id]?.length || 0;
          
          csvContent += `"${idx === 0 ? team.name : ''}","${player.name}","${player.email || ''}","₹${((player.basePrice || 0) / 100000).toFixed(1)}L","₹${((player.soldAmount || 0) / 100000).toFixed(1)}L","₹${(Math.abs(difference) / 100000).toFixed(1)}L","${bidCount}"\n`;
        });
      }
    });
    
    return csvContent;
  };

  // ─── Team/Player Registration Handlers (copied from Auctioneer) ────────────
  const handleAddTeam = async () => {
    if (!teamName.trim()) { setAddTeamError('Team Name is required'); return; }
    if (!teamShortCode.trim()) { setAddTeamError('Team Short Code is required'); return; }
    if (!homeCity.trim()) { setAddTeamError('Home City is required'); return; }
    if (!roleInTeam) { setAddTeamError('Role in Team is required'); return; }
    if (!ownerName.trim()) { setAddTeamError('Owner/Representative Name is required'); return; }
    if (!teamEmail.trim()) { setAddTeamError('Email is required'); return; }
    if (!teamPassword.trim()) { setAddTeamError('Password is required'); return; }
    if (!teamLogoFile) { setAddTeamError('Team Logo is required'); return; }
    if (!authLetterFile) { setAddTeamError('Authorization Letter is required'); return; }
    if (!governmentId.trim()) { setAddTeamError('Government ID Number is required'); return; }
    if (!govIdFile) { setAddTeamError('Government ID Proof document is required'); return; }
    const matchRef = resolvedMatch || currentMatch;
    if (!matchRef?.id) { setAddTeamError('No match selected.'); return; }

    setAddTeamLoading(true);
    setAddTeamError('');

    try {
      console.log('================== TEAM REGISTRATION START ==================');
      const tempTeamId = `team_${Date.now()}`;
      const logoUrl = await uploadTeamLogo(teamLogoFile, tempTeamId);
      const authLetterUrl = await uploadDocument(authLetterFile, 'authorization-letters', tempTeamId);
      const govIdUrl = await uploadDocument(govIdFile, 'government-ids', tempTeamId);

      const registrationData = {
        fullName: ownerName, email: teamEmail, password: teamPassword, phone: teamPhone,
        seasonId: matchRef.id, teamName, teamShortCode, homeCity, roleInTeam,
        teamLogo: logoUrl, authorizationLetter: authLetterUrl,
        governmentId, governmentIdFile: govIdUrl, role: 'TEAM_REP'
      };

      const result = await registerTeam(registrationData);
      if (result) {
        const teamsRes = await fetch(`${API_BASE}/teams?matchId=${matchRef.id}`);
        if (teamsRes.ok) {
          const teamsData = await teamsRes.json();
          if (teamsData.data && Array.isArray(teamsData.data)) setTeams(teamsData.data);
          else if (Array.isArray(teamsData)) setTeams(teamsData);
        }
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

  const resetAddTeamForm = () => {
    setTeamName(''); setTeamShortCode(''); setHomeCity(''); setRoleInTeam('');
    setOwnerName(''); setTeamEmail(''); setTeamPhone(''); setTeamPassword(''); setGovernmentId('');
    if (teamLogoPreviewUrl) URL.revokeObjectURL(teamLogoPreviewUrl);
    setTeamLogoFile(null); setTeamLogoPreviewUrl(null);
    setAuthLetterFile(null); setGovIdFile(null); setAddTeamError('');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { setAddTeamError('Team logo file size must be less than 10MB'); return; }
      if (teamLogoPreviewUrl) URL.revokeObjectURL(teamLogoPreviewUrl);
      const previewUrl = URL.createObjectURL(file);
      setTeamLogoFile(file); setTeamLogoPreviewUrl(previewUrl); setAddTeamError('');
    }
  };

  const handleAuthLetterUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { setAddTeamError('Authorization letter file size must be less than 10MB'); return; }
      setAuthLetterFile(file); setAddTeamError('');
    }
  };

  const handleGovIdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { setAddTeamError('Government ID file size must be less than 10MB'); return; }
      setGovIdFile(file); setAddTeamError('');
    }
  };

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
      if (file.size > 10 * 1024 * 1024) { setAddTeamError('File size must be less than 10MB'); return; }
      if (type === 'logo') {
        if (!file.type.startsWith('image/')) { setAddTeamError('Team logo must be an image file'); return; }
        if (teamLogoPreviewUrl) URL.revokeObjectURL(teamLogoPreviewUrl);
        const previewUrl = URL.createObjectURL(file);
        setTeamLogoFile(file); setTeamLogoPreviewUrl(previewUrl);
      } else if (type === 'auth') {
        if (file.type !== 'application/pdf') { setAddTeamError('Authorization letter must be a PDF file'); return; }
        setAuthLetterFile(file);
      } else {
        const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        if (!validTypes.includes(file.type)) { setAddTeamError('Government ID must be PDF, JPG, JPEG, or PNG'); return; }
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
    // Reset base price validation states
    setBasePriceWarning(null); setBasePriceError(null);
  };

  const handlePlayerPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { setAddPlayerError('Photo must be less than 10MB'); return; }
      if (!file.type.startsWith('image/')) { setAddPlayerError('File must be an image'); return; }
      if (playerPhotoPreviewUrl) URL.revokeObjectURL(playerPhotoPreviewUrl);
      setPlayerPhotoFile(file); setPlayerPhotoPreviewUrl(URL.createObjectURL(file)); setAddPlayerError('');
    }
  };

  const handlePlayerGovIdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { setAddPlayerError('File must be less than 10MB'); return; }
      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!validTypes.includes(file.type)) { setAddPlayerError('Must be PDF, JPG, or PNG'); return; }
      setPlayerGovIdFile(file); setAddPlayerError('');
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
        setPlayerPhotoFile(file); setPlayerPhotoPreviewUrl(URL.createObjectURL(file));
      } else {
        const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        if (!validTypes.includes(file.type)) { setAddPlayerError('Must be PDF, JPG, or PNG'); return; }
        setPlayerGovIdFile(file);
      }
      setAddPlayerError('');
    }
  };

  const handleAddPlayer = async () => {
    if (!playerName.trim()) { setAddPlayerError('Player Name is required'); return; }
    if (!playerEmail.trim()) { setAddPlayerError('Email is required'); return; }
    if (!playerPassword.trim()) { setAddPlayerError('Password is required'); return; }
    if (!playerGender) { setAddPlayerError('Gender is required'); return; }
    if (!playerNationality.trim()) { setAddPlayerError('Nationality is required'); return; }
    if (!playerRoleId) { setAddPlayerError('Playing Role is required'); return; }
    if (!playerBasePrice || parseInt(playerBasePrice) < 50000) { setAddPlayerError('Base Price must be at least ₹50,000'); return; }
    
    // ─── PURSE INTELLIGENCE: Hard block if base price exceeds maxBasePrice ─────
    if (basePriceError) {
      setAddPlayerError(basePriceError);
      return;
    }
    
    if (!playerPhotoFile) { setAddPlayerError('Player Photo is required'); return; }
    if (!playerGovId.trim()) { setAddPlayerError('Government ID Number is required'); return; }
    if (!playerGovIdFile) { setAddPlayerError('Government ID Proof is required'); return; }
    const matchRef = resolvedMatch || currentMatch;
    if (!matchRef?.id) { setAddPlayerError('No match selected.'); return; }

    setAddPlayerLoading(true);
    setAddPlayerError('');

    try {
      console.log('================== PLAYER REGISTRATION START ==================');
      const tempPlayerId = `player_${Date.now()}`;
      const photoUrl = await uploadPlayerPhoto(playerPhotoFile, tempPlayerId);
      const govIdUrl = await uploadDocument(playerGovIdFile, 'government-ids', tempPlayerId);

      const registrationData = {
        fullName: playerName, email: playerEmail, phone: playerPhone, password: playerPassword,
        role: 'PLAYER', seasonId: matchRef.id, governmentId: playerGovId, governmentIdFile: govIdUrl,
        dateOfBirth: '', age: parseInt(playerAge) || 25, gender: playerGender, nationality: playerNationality,
        playerPhoto: photoUrl, imageUrl: photoUrl, sport: matchRef.config?.sport || 'CRICKET',
        playingRole: playerRoleId, roleId: playerRoleId, battingStyle: playerBattingStyle,
        bowlingStyle: playerBowlingStyle, experienceLevel: playerExperience, previousTeams: playerPreviousTeams,
        basePrice: parseInt(playerBasePrice) || 500000, playerCategory: playerCategory,
        availability: 'Yes', consent: true, isOverseas: playerIsOverseas, bio: playerBio, name: playerName,
      };

      const result = await registerPlayer(registrationData);
      if (result) {
        const playersRes = await fetch(`${API_BASE}/players?matchId=${matchRef.id}`);
        if (playersRes.ok) {
          const playersData = await playersRes.json();
          if (playersData.data && Array.isArray(playersData.data)) setPlayers(playersData.data);
          else if (Array.isArray(playersData)) setPlayers(playersData);
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

  // Report computed values
  const soldPlayersCount = eligiblePlayers.filter(p => p.status === 'SOLD').length;
  const unsoldPlayersCount = eligiblePlayers.filter(p => p.status === 'UNSOLD').length;
  const pendingPlayersCount = eligiblePlayers.filter(p => p.status === 'AVAILABLE' || p.status === 'PENDING').length;
  const totalAmountSpent = eligiblePlayers.filter(p => p.status === 'SOLD').reduce((sum, p) => sum + ((p as any).soldAmount || (p as any).soldPrice || (p as any).currentBid || 0), 0);

  return (
    <>
      {/* Loading State \u2014 HUD Boot Sequence */}
      {loading && (
        <div className="h-screen w-screen flex items-center justify-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a0a0a 0%, #2d0a0a 25%, #1a0a12 50%, #0d0d1a 100%)' }}>
          <div className="absolute inset-0 opacity-[0.03]" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 0, 102, 0.3) 2px, rgba(255, 0, 102, 0.3) 4px)' }}></div>
          <div className="text-center relative z-10">
            <div className="relative mx-auto mb-6 w-20 h-20">
              <div className="animate-spin rounded-full h-20 w-20 border-4 border-pink-500/20 border-t-pink-500"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Shield size={28} className="text-pink-400/60" />
              </div>
            </div>
            <p className="text-pink-400 text-lg font-black uppercase tracking-wider">Initializing Control Room</p>
            <div className="mt-3 w-48 h-1 mx-auto bg-pink-900/30 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-pink-500 to-red-500 rounded-full" style={{animation: 'hud-load 2s ease-in-out infinite'}}></div>
            </div>
            <p className="text-pink-400/40 text-xs mt-2 font-semibold">Loading admin systems...</p>
          </div>
        </div>
      )}

      {/* Error State - No Match Found */}
      {!loading && !activeMatch && (
        <div className="h-screen w-screen flex items-center justify-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a0a0a 0%, #2d0a0a 25%, #1a0a12 50%, #0d0d1a 100%)' }}>
          <div className="absolute inset-0 opacity-[0.03]" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 0, 102, 0.3) 2px, rgba(255, 0, 102, 0.3) 4px)' }}></div>
          <div className="text-center relative z-10 max-w-md mx-auto p-8">
            <div className="relative mx-auto mb-6 w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(255,20,100,0.15), rgba(200,50,120,0.1))', border: '2px solid rgba(255,0,102,0.3)' }}>
              <AlertCircle size={36} className="text-red-400" />
            </div>
            <h1 className="text-2xl font-black text-white mb-3">Match Data Not Found</h1>
            <p className="text-pink-300/60 text-sm font-medium mb-6">
              Unable to load match data. The match ID may be invalid or there was an error connecting to the database.
            </p>
            <div className="space-y-3">
              <div className="rounded-xl p-4 text-left" style={{ background: 'linear-gradient(135deg, rgba(255,20,100,0.08), rgba(200,50,120,0.04))', border: '1px solid rgba(255,0,102,0.15)' }}>
                <p className="text-xs text-pink-300/40 uppercase font-bold mb-1">Match ID from Session</p>
                <p className="text-sm text-white font-mono">{sessionStorage.getItem('hypehammer_current_match_id') || 'None'}</p>
              </div>
              <div className="rounded-xl p-4 text-left" style={{ background: 'linear-gradient(135deg, rgba(255,20,100,0.08), rgba(200,50,120,0.04))', border: '1px solid rgba(255,0,102,0.15)' }}>
                <p className="text-xs text-pink-300/40 uppercase font-bold mb-1">Logged in as</p>
                <p className="text-sm text-white">{currentUser?.email || 'Unknown'}</p>
              </div>
            </div>
            <button
              onClick={() => {
                sessionStorage.removeItem('hypehammer_current_match_id');
                window.location.href = '/';
              }}
              className="mt-6 px-6 py-3 rounded-full bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-bold text-sm shadow-lg transition-all flex items-center gap-2 mx-auto"
            >
              <ArrowLeft size={18} />
              Return to Home
            </button>
          </div>
        </div>
      )}

      {/* Main Dashboard - Only show if we have an active match */}
      {!loading && activeMatch && (
        <>
      {/* AAA ESPORTS COMMAND CENTER — Cinematic Styles */}
      <style>{`
        .custom-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { display: none; }

        /* === CORE KEYFRAMES — Fresh Red/Pink Energy === */
        @keyframes neon-pulse {
          0%, 100% { box-shadow: 0 0 10px rgba(255, 0, 102, 0.5), 0 0 30px rgba(255, 0, 102, 0.25), 0 0 60px rgba(255, 0, 102, 0.1); }
          50% { box-shadow: 0 0 20px rgba(255, 0, 102, 0.7), 0 0 50px rgba(255, 0, 102, 0.4), 0 0 90px rgba(255, 0, 102, 0.18); }
        }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes ring-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse-glow { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.9; } }
        @keyframes bg-shift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes scan-line { 0% { transform: translateY(-100%); } 100% { transform: translateY(100vh); } }
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
        @keyframes hex-breathe {
          0%, 100% { filter: drop-shadow(0 0 6px rgba(255, 0, 102, 0.4)); transform: scale(1); }
          50% { filter: drop-shadow(0 0 16px rgba(255, 0, 102, 0.8)); transform: scale(1.06); }
        }
        @keyframes data-stream {
          0% { background-position: 0 0; }
          100% { background-position: 0 -200px; }
        }
        @keyframes energy-flow {
          0% { background-position: 0% 0%; }
          100% { background-position: 0% 200%; }
        }
        @keyframes radar-sweep { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes capsule-in {
          0% { transform: translateY(24px) scale(0.94); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes counter-roll {
          0% { transform: translateY(100%); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes glitch-flicker {
          0%, 92%, 94%, 96%, 100% { opacity: 1; }
          93%, 95% { opacity: 0.4; transform: translateX(-2px); }
        }
        @keyframes panel-slide {
          0% { clip-path: polygon(0 0, 0 0, 0 100%, 0 100%); }
          100% { clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); }
        }
        @keyframes glow-breathe {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }

        /* === UTILITY CLASSES === */
        .neon-pulse { animation: neon-pulse 2s ease-in-out infinite; }
        .float { animation: float 6s ease-in-out infinite; }
        .shimmer { background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent); background-size: 200% 100%; animation: shimmer 3s infinite; }
        .animated-bg { background-size: 400% 400%; animation: bg-shift 15s ease infinite; }
        .notification-pulse { animation: neon-border-pulse 1.5s ease-in-out infinite; }
        .holo-ring { animation: holographic-ring 4s linear infinite; }
        .hex-breathe { animation: hex-breathe 2.5s ease-in-out infinite; }
        .glitch-flicker { animation: glitch-flicker 4s ease-in-out infinite; }

        /* HUD CARD — Warm Glass Panel */
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

        /* CYBER GLOW */
        .cyber-glow {
          box-shadow: 0 0 30px rgba(255, 0, 102, 0.3), 0 0 60px rgba(255, 0, 102, 0.1), inset 0 0 30px rgba(255, 0, 102, 0.05);
        }

        /* GLASS CARD — Warm Tinted */
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

        /* SPINE ICON (legacy compat) */
        .spine-icon { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
        .spine-icon:hover { transform: scale(1.18); filter: drop-shadow(0 0 10px rgba(255, 0, 102, 0.7)); }

        /* CAPSULE STAT — Broadcast Metric Pod */
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

        /* ARENA SPOTLIGHT — Center Stage Glow */
        .arena-spotlight {
          position: relative;
          background: radial-gradient(ellipse at center, rgba(255, 0, 102, 0.1) 0%, transparent 70%);
        }
        .arena-spotlight::before {
          content: '';
          position: absolute;
          inset: -60px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255, 0, 102, 0.08) 0%, transparent 60%);
          animation: pulse-glow 3s ease-in-out infinite;
          pointer-events: none;
        }

        /* MISSION WIDGET — Warm Glass Panel */
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

        /* ANGLED SECTION HEADER */
        .angled-header {
          clip-path: polygon(0 0, 100% 0, 98% 100%, 0 100%);
          background: linear-gradient(90deg, rgba(255, 0, 102, 0.12), transparent);
          padding: 16px 24px;
        }

        /* NEON ROW */
        .neon-row { transition: all 0.2s ease; }
        .neon-row:hover {
          background: rgba(255, 0, 102, 0.06) !important;
          box-shadow: inset 4px 0 0 rgba(255, 0, 102, 0.7);
        }

        /* GRADIENT BORDER */
        .gradient-border { position: relative; }
        .gradient-border::before {
          content: '';
          position: absolute; inset: 0;
          border-radius: inherit;
          padding: 1px;
          background: linear-gradient(135deg, rgba(255, 0, 102, 0.6), rgba(249, 115, 22, 0.4), rgba(255, 100, 163, 0.5));
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }

        /* STATUS PILL */
        .status-pill {
          font-size: 11px;
          font-weight: 800;
          padding: 4px 12px;
          border-radius: 20px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        /* ENERGY LINE */
        .energy-line {
          background: linear-gradient(180deg, transparent 0%, rgba(255, 0, 102, 0.7) 20%, rgba(255, 100, 163, 0.5) 50%, rgba(255, 0, 102, 0.7) 80%, transparent 100%);
          animation: energy-flow 3s linear infinite;
          background-size: 100% 200%;
        }

        /* PARTICLE */
        .particle {
          position: absolute;
          width: 4px; height: 4px;
          border-radius: 50%;
          background: rgba(255, 0, 102, 0.9);
          animation: particle-drift 3s ease-out infinite;
        }

        /* DATA STREAM overlay */
        .data-stream-bg {
          background-image: repeating-linear-gradient(0deg, transparent, transparent 24px, rgba(255, 0, 102, 0.015) 24px, rgba(255, 0, 102, 0.015) 25px);
          animation: data-stream 8s linear infinite;
        }

        /* HERO GLOW — Ambient Light */
        .hero-glow {
          position: absolute;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255, 0, 102, 0.25) 0%, transparent 70%);
          filter: blur(80px);
          pointer-events: none;
        }

        /* SHIMMER TEXT */
        .shimmer-text {
          background: linear-gradient(90deg, #ff0066, #ff66a3, #ff0066);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 3s linear infinite;
        }

        /* === PORTED FROM AUCTIONEER === */
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

        .slash-line {
          position: absolute;
          height: 2px;
          background: linear-gradient(90deg, rgba(255, 0, 102, 0.8), transparent);
        }

        .neon-glow {
          animation: neon-pulse 2s ease-in-out infinite;
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

        /* Custom scrollbar — Auctioneer style */
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

        {/* CYBER SIDEBAR — Auctioneer-Style Vertical Spine */}
        <div className="fixed left-8 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center">
          {/* Decorative slash lines — Top */}
          <div className="flex flex-col items-center mb-4">
            <div className="w-0.5 h-16 rounded-full" style={{ background: 'linear-gradient(180deg, transparent, rgba(255, 0, 102, 0.8), transparent)' }}></div>
            <div className="relative h-8 w-12 flex items-center justify-center">
              <div className="absolute w-[70px] h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(255, 0, 102, 0.6), transparent)', transform: 'rotate(-45deg)' }}></div>
              <div className="absolute w-[55px] h-[1px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(255, 100, 163, 0.35), transparent)', transform: 'rotate(-45deg)', marginTop: '10px' }}></div>
            </div>
          </div>

          {/* Main Pill Dock — Auctioneer Style */}
          <div className="relative">
            <div className="w-14 py-6 rounded-full glass-card flex flex-col items-center gap-4">

              {/* Navigation Icons */}
              {(() => {
                const navItems = [
                  { id: 'overview', icon: <Home size={20} />, label: 'Overview' },
                  { id: 'reports', icon: <FileText size={20} />, label: 'Reports' },
                  { id: 'players', icon: <Users size={20} />, label: 'Players' },
                  { id: 'playerApplications', icon: <UserCheck size={20} />, label: 'Applications' },
                  { id: 'teams', icon: <Trophy size={20} />, label: 'Teams' },
                  { id: 'auctioneers', icon: <Gavel size={20} />, label: 'Auctioneers', badge: pendingAuctioneers },
                  { id: 'liveRoom', icon: <Radio size={20} />, label: 'Live Room' },
                  { id: 'settings', icon: <Settings size={20} />, label: 'Settings' },
                ];
                const activeNavIndex = navItems.findIndex(n => n.id === activeSection);
                return (
                  <>
                    {navItems.map((item) => (
                      <div key={item.id} className="relative">
                        <button
                          onClick={() => {
                            setActiveSection(item.id as any);
                          }}
                          className={`nav-icon w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                            activeSection === item.id
                              ? 'active bg-gradient-to-br from-pink-500/40 to-red-600/40 text-pink-400'
                              : 'text-pink-300/60 hover:text-pink-400 hover:bg-pink-500/10'
                          }`}
                          title={item.label}
                        >
                          {item.icon}
                        </button>
                        {item.badge !== undefined && item.badge > 0 && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[7px] font-black rounded-full flex items-center justify-center shadow-lg shadow-red-500/50 animate-pulse">
                            {item.badge}
                          </span>
                        )}
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

          {/* Logout at bottom */}
          <button
            onClick={() => { sessionStorage.clear(); localStorage.clear(); setStatus(AuctionStatus.HOME); }}
            className="nav-icon mt-4 w-10 h-10 rounded-xl flex items-center justify-center text-red-400/60 hover:text-red-400 hover:bg-red-500/20 transition-all"
          >
            <LogOut size={18} />
          </button>

          {/* Decorative slash lines — Bottom */}
          <div className="flex flex-col items-center mt-4">
            <div className="relative h-8 w-12 flex items-center justify-center">
              <div className="absolute w-[70px] h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(255, 0, 102, 0.6), transparent)', transform: 'rotate(45deg)' }}></div>
              <div className="absolute w-[55px] h-[1px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(255, 100, 163, 0.35), transparent)', transform: 'rotate(45deg)', marginTop: '-10px' }}></div>
            </div>
            <div className="w-0.5 h-16 rounded-full" style={{ background: 'linear-gradient(180deg, rgba(255, 0, 102, 0.8), transparent)' }}></div>
          </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="ml-28 min-h-screen flex flex-col flex-1">
          {/* TOP COMMAND BAR — Cinematic Control Ribbon */}
          <div className="mx-8 mt-6 sticky top-6 z-20">
            <div className="relative rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(90deg, rgba(26, 10, 10, 0.96), rgba(45, 10, 10, 0.92), rgba(26, 10, 10, 0.96))', border: '1px solid rgba(255, 0, 102, 0.15)', boxShadow: '0 8px 48px rgba(0, 0, 0, 0.5), 0 0 60px rgba(255, 0, 102, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.04)' }}>
              {/* Top edge glow line */}
              <div className="absolute top-0 left-[10%] right-[10%] h-[1px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(255, 0, 102, 0.7), rgba(255, 100, 163, 0.5), rgba(255, 0, 102, 0.7), transparent)' }}></div>
              <div className="px-8 py-4 flex items-center justify-between gap-6">
                {/* Left: Title + Status */}
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="w-[4px] h-11 rounded-full" style={{ background: 'linear-gradient(180deg, rgba(255, 0, 102, 0.9), rgba(249, 115, 22, 0.7))' }}></div>
                  <div>
                    <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-red-400 to-orange-400 uppercase tracking-[0.2em] leading-tight glitch-flicker">
                      Command Center
                    </h2>
                    <p className="text-[10px] text-pink-400/40 font-bold uppercase tracking-[0.3em] mt-0.5">
                      {activeMatch?.name || 'No Season'} <span className="text-red-400/30">|</span> {activeMatch?.sport || 'Cricket'} <span className="text-red-400/30">|</span> {activeMatch?.year || new Date().getFullYear()}
                    </p>
                  </div>
                </div>

                {/* Center: Search with holographic border */}
                <div className="flex-1 max-w-lg mx-4">
                  <div className="relative group">
                    <div className="absolute -inset-[1px] rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity" style={{ background: 'linear-gradient(90deg, rgba(255, 0, 102, 0.4), rgba(249, 115, 22, 0.3), rgba(255, 0, 102, 0.4))' }}></div>
                    <div className="relative">
                      <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-400/30" />
                      <input
                        type="text"
                        placeholder="Search users, auctions, teams..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-5 py-2.5 rounded-xl text-sm font-semibold text-pink-100 placeholder-pink-400/25 transition-all focus:outline-none"
                        style={{ background: 'rgba(255, 0, 102, 0.05)', border: '1px solid rgba(255, 0, 102, 0.12)' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  {/* Live Room */}
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

                  {/* Admin Profile Ring */}
                  <div className="relative group cursor-pointer" title={`${currentUser.name} • Click to Logout`} onClick={() => { sessionStorage.clear(); localStorage.clear(); setStatus(AuctionStatus.HOME); }}>
                    <div className="absolute -inset-1 rounded-full opacity-0 group-hover:opacity-60 blur-md transition-opacity" style={{ background: 'linear-gradient(135deg, rgba(255, 0, 102, 0.6), rgba(249, 115, 22, 0.5))', animation: 'ring-rotate 3s linear infinite' }}></div>
                    <div className="relative w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm hover:scale-110 transition-transform overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(255, 0, 102, 0.7), rgba(249, 115, 22, 0.6))', border: '2px solid rgba(255, 0, 102, 0.4)' }}>
                      {(resolvedMatch?.profilePhotoURL || currentMatch?.profilePhotoURL) ? (
                        <img src={resolvedMatch?.profilePhotoURL || currentMatch?.profilePhotoURL} alt={currentUser.name} className="w-full h-full object-cover" />
                      ) : (
                        currentUser.name?.[0] || 'A'
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* DYNAMIC CONTENT SECTIONS */}
          <div className="px-8 py-8 pb-20 overflow-y-auto h-[calc(100vh-7rem)] admin-content-scroll custom-scrollbar">

            {/* 1️⃣ OVERVIEW SECTION — Auctioneer-Style Home */}
            {activeSection === 'overview' && (
              <div className="animate-in fade-in duration-500 flex flex-col gap-6">
                {/* MAIN GRID */}
                <div className="grid grid-cols-12 gap-6">
                  {/* ROW 1: HERO CARD */}
                  <div className="col-span-8">
                    <div className="h-full glass-card rounded-3xl overflow-hidden relative group transition-all duration-500" style={{ minHeight: '320px' }}>
                      {/* Layer 0: Base gradient */}
                      <div className="absolute inset-0 bg-gradient-to-br from-pink-600/20 via-red-900/30 to-purple-900/20"></div>
                      {/* Layer 1: SVG artwork */}
                      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
                        <svg className="absolute right-0 top-0 h-full" viewBox="0 0 500 400" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMaxYMid slice" style={{ width: '55%', opacity: 0.9 }}>
                          <polygon points="200,0 500,0 500,400 280,400 160,250" fill="url(#heroGrad1)" />
                          <polygon points="250,0 500,0 500,350 320,400 220,220" fill="url(#heroGrad2)" />
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
                        <div className="absolute -right-10 top-1/2 -translate-y-1/2 w-80 h-80 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,0,102,0.2) 0%, transparent 70%)', filter: 'blur(40px)' }} />
                      </div>
                      {/* Layer 2: Left readability gradient */}
                      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent" />
                      <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-black/60 to-transparent" />
                      {/* Layer 3: Content */}
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
                            {liveAuctionStatus === 'ENDED' ? (
                              <button onClick={() => setActiveSection('reports')} className="cyber-button px-6 py-3 rounded-full text-white font-black tracking-wider flex items-center gap-2.5 text-sm" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                                <FileText size={18} /> VIEW REPORT
                              </button>
                            ) : liveAuctionStatus === 'LIVE' ? (
                              <button onClick={() => setActiveSection('liveRoom')} className="cyber-button px-6 py-3 rounded-full text-white font-black tracking-wider flex items-center gap-2.5 text-sm">
                                <Radio size={18} /> ENTER LIVE ROOM
                              </button>
                            ) : (
                              <button onClick={() => setActiveSection('liveRoom')} className="cyber-button px-6 py-3 rounded-full text-white font-black tracking-wider flex items-center gap-2.5 text-sm">
                                <Radio size={18} /> OPEN LIVE ROOM
                              </button>
                            )}
                            <button onClick={() => setActiveSection('reports')} className="px-5 py-3 rounded-full bg-white/5 border border-pink-500/20 text-pink-300 hover:bg-pink-500/10 transition-all font-bold tracking-wider text-sm">
                              VIEW DETAILS
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
                              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/80 border border-pink-400/50 mb-2">
                                <span className="text-white text-[10px] font-bold tracking-wider uppercase">{currentBiddingPlayer.role || 'PLAYER'}</span>
                              </div>
                              <h2 className="text-xl font-black text-white mb-1" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>{currentBiddingPlayer.name}</h2>
                              <p className="text-pink-300 text-xs font-medium">Base Price: ₹{((currentBiddingPlayer.basePrice || 0) / 100000).toFixed(1)}L</p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="h-full glass-card rounded-3xl flex flex-col items-center justify-center p-6 border border-pink-500/20" style={{ background: 'linear-gradient(135deg, rgba(255, 0, 102, 0.08), rgba(219, 39, 119, 0.05))' }}>
                          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500/20 to-pink-600/10 flex items-center justify-center mb-4 border border-pink-500/30">
                            <Activity size={36} className="text-pink-400/60" />
                          </div>
                          <h3 className="text-lg font-bold text-white mb-2">{liveAuctionStatus === 'ENDED' ? 'Auction Ended' : 'Waiting for Bidding'}</h3>
                          <p className="text-pink-400/60 text-sm text-center">{liveAuctionStatus === 'ENDED' ? 'All players have been auctioned' : liveAuctionStatus === 'LIVE' ? 'Next player loading...' : 'Start the auction to see live bidding'}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ROW 2: REGISTERED TEAMS + QUICK ACTIONS */}
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

                      {loading ? (
                        <div className="grid grid-cols-2 gap-4">
                          {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="glass-card rounded-2xl p-3 border border-pink-500/20" style={{ background: 'linear-gradient(135deg, rgba(255, 0, 102, 0.05), rgba(219, 39, 119, 0.05))' }}>
                              <div className="flex items-center gap-3">
                                <div className="animate-pulse bg-gradient-to-r from-pink-500/30 to-pink-600/20 w-10 h-10 rounded-lg" style={{ boxShadow: '0 0 15px rgba(255, 0, 102, 0.15)' }}></div>
                                <div className="flex-1">
                                  <div className="animate-pulse bg-gradient-to-r from-pink-500/25 to-pink-600/15 w-3/4 h-3 rounded mb-1"></div>
                                  <div className="animate-pulse bg-gradient-to-r from-pink-500/20 to-pink-600/10 w-1/2 h-2 rounded"></div>
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

                  {/* QUICK ACTIONS */}
                  <div className="col-span-4">
                    <div className="glass-card rounded-3xl p-5 h-full">
                      <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
                      <div className="flex flex-col gap-3">
                        {liveAuctionStatus === 'ENDED' ? (
                          <button 
                            onClick={() => setActiveSection('reports')}
                            className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-600/20 border border-green-500/30 text-green-300 hover:border-green-500/50 hover:bg-green-500/30 transition-all flex items-center justify-center gap-3 font-medium"
                          >
                            <FileText size={18} />
                            View Auction Report
                          </button>
                        ) : liveAuctionStatus === 'LIVE' ? (
                          <button 
                            onClick={() => setActiveSection('liveRoom')}
                            className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-red-500/20 to-rose-600/20 border border-red-500/30 text-red-300 hover:border-red-500/50 hover:bg-red-500/30 transition-all flex items-center justify-center gap-3 font-medium"
                          >
                            <Radio size={18} className="animate-pulse" />
                            Enter Live Room
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
                          onClick={() => setActiveSection('teams')}
                          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-pink-500/10 text-pink-300/80 hover:border-pink-500/30 hover:bg-white/10 transition-all flex items-center justify-center gap-3 font-medium"
                        >
                          <Users size={18} />
                          Manage Teams
                        </button>
                        <button 
                          onClick={() => setActiveSection('settings')}
                          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-pink-500/10 text-pink-300/80 hover:border-pink-500/30 hover:bg-white/10 transition-all flex items-center justify-center gap-3 font-medium"
                        >
                          <Settings size={18} />
                          Season Settings
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ROW 3: PLAYERS GRID */}
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

                    {loading ? (
                      <div className="grid grid-cols-6 gap-4">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                          <div key={i} className="glass-card rounded-2xl p-4 h-48 border border-pink-500/20" style={{ background: 'linear-gradient(135deg, rgba(255, 0, 102, 0.05), rgba(219, 39, 119, 0.05))' }}>
                            <div className="animate-pulse bg-gradient-to-r from-pink-500/30 to-pink-600/20 w-20 h-20 rounded-full mx-auto mb-3" style={{ boxShadow: '0 0 20px rgba(255, 0, 102, 0.2)' }}></div>
                            <div className="animate-pulse bg-gradient-to-r from-pink-500/25 to-pink-600/15 w-3/4 h-4 rounded mx-auto mb-2"></div>
                            <div className="animate-pulse bg-gradient-to-r from-pink-500/20 to-pink-600/10 w-1/2 h-3 rounded mx-auto"></div>
                          </div>
                        ))}
                      </div>
                    ) : players.length > 0 ? (
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
            
            {/* 2️⃣ ADMIN SETTINGS — Professional Compact Layout */}
            {activeSection === 'settings' && (
              <div className="animate-in fade-in duration-500">
                {/* Section Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-[4px] h-10 rounded-full" style={{ background: 'linear-gradient(180deg, rgba(255, 0, 102, 0.9), rgba(249, 115, 22, 0.6))' }}></div>
                    <div>
                      <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-red-400 to-orange-400 uppercase tracking-wider">Settings</h2>
                      <p className="text-xs text-pink-400/40 font-bold uppercase tracking-[0.2em] mt-0.5">Admin Control Panel</p>
                    </div>
                  </div>
                  
                  {/* Tab Navigation - Right Side */}
                  <div className="flex items-center gap-2 p-2 rounded-xl hud-card">
                    {([
                      { id: 'account' as const, label: 'Account & Auction', icon: <User size={18} /> },
                      { id: 'platform' as const, label: 'Platform', icon: <Shield size={18} /> },
                      { id: 'media' as const, label: 'Media', icon: <Image size={18} /> },
                    ]).map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setSettingsTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                        settingsTab === tab.id
                          ? 'bg-gradient-to-r from-pink-600/80 to-red-600/80 text-white shadow-lg'
                          : 'text-pink-300/50 hover:text-pink-300 hover:bg-pink-500/10'
                      }`}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  ))}
                </div>
                </div>

                <div className="grid grid-cols-12 gap-4">

                  {/* ── LEFT COLUMN: Personal Info Card (always visible) ── */}
                  <div className="col-span-12 lg:col-span-4">
                    <div className="hud-card rounded-2xl overflow-hidden">
                      {/* Profile Header */}
                      <div className="relative h-28" style={{ background: 'linear-gradient(135deg, rgba(255, 0, 102, 0.3), rgba(249, 115, 22, 0.2), rgba(139, 0, 50, 0.3))' }}>
                        <div className="absolute inset-0 opacity-20" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.03) 3px, rgba(255,255,255,0.03) 4px)' }}></div>
                      </div>
                      <div className="px-6 pb-6 -mt-14 relative">
                        {/* Avatar */}
                        <div className="relative w-28 h-28 rounded-2xl overflow-hidden mb-4 flex-shrink-0" style={{ border: '3px solid rgba(255, 0, 102, 0.4)', boxShadow: '0 0 20px rgba(255, 0, 102, 0.2)' }}>
                          {(resolvedMatch || currentMatch)?.profilePhotoURL ? (
                            <img src={(resolvedMatch || currentMatch)?.profilePhotoURL} alt="Admin" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl font-black text-white" style={{ background: 'linear-gradient(135deg, rgba(255, 0, 102, 0.7), rgba(249, 115, 22, 0.6))' }}>
                              {currentUser.name?.[0]?.toUpperCase() || 'A'}
                            </div>
                          )}
                        </div>
                        <h3 className="text-lg font-black text-pink-100 truncate">{activeMatch?.organizerName || currentUser.name}</h3>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="px-3 py-1 rounded text-xs font-black uppercase tracking-wider bg-pink-500/20 text-pink-400 border border-pink-500/30">Admin</span>
                          {activeMatch?.designation && (
                            <span className="px-3 py-1 rounded text-xs font-black uppercase tracking-wider bg-orange-500/15 text-orange-400 border border-orange-500/25">{activeMatch.designation}</span>
                          )}
                        </div>
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center gap-2 text-sm text-pink-300/60">
                            <Mail size={14} className="text-pink-400/40 flex-shrink-0" />
                            <span className="truncate">{activeMatch?.organizerEmail || currentUser.email}</span>
                          </div>
                          {activeMatch?.organizerPhone && (
                            <div className="flex items-center gap-2 text-sm text-pink-300/60">
                              <User size={14} className="text-pink-400/40 flex-shrink-0" />
                              <span>{activeMatch.organizerPhone}</span>
                            </div>
                          )}
                          {(activeMatch?.organizationName) && (
                            <div className="flex items-center gap-2 text-sm text-pink-300/60">
                              <Briefcase size={14} className="text-pink-400/40 flex-shrink-0" />
                              <span className="truncate">{activeMatch.organizationName}</span>
                            </div>
                          )}
                        </div>
                        {/* Quick Stats */}
                        <div className="mt-5 grid grid-cols-3 gap-3">
                          <div className="text-center p-3 rounded-lg bg-pink-900/20 border border-pink-500/15">
                            <p className="text-lg font-black text-pink-100">{players.length}</p>
                            <p className="text-[10px] font-bold uppercase text-pink-400/40 tracking-wider">Players</p>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-pink-900/20 border border-pink-500/15">
                            <p className="text-lg font-black text-pink-100">{teams.length}</p>
                            <p className="text-[10px] font-bold uppercase text-pink-400/40 tracking-wider">Teams</p>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-pink-900/20 border border-pink-500/15">
                            <p className="text-lg font-black text-emerald-400">₹{((seasonSettings.baseTeamBudget || 0) / 10000000).toFixed(1)}Cr</p>
                            <p className="text-[10px] font-bold uppercase text-pink-400/40 tracking-wider">Budget</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Match Status Control — compact */}
                    <div className="hud-card rounded-2xl p-4 mt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Activity size={14} className="text-pink-400/60" />
                        <h4 className="text-[10px] font-black text-pink-400/60 uppercase tracking-wider">Match Status</h4>
                      </div>
                      <div className="flex gap-1.5">
                        {(['SETUP', 'ONGOING', 'COMPLETED'] as const).map(s => (
                          <button
                            key={s}
                            onClick={async () => {
                              const response = await fetch(`${API_BASE}/match-status/${resolvedMatch?.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: s, updatedBy: currentUser.email })
                              });
                              if (response.ok) {
                                setResolvedMatch(prev => prev ? {...prev, status: s} : null);
                                addSystemLog('admin', `Match status → ${s}`);
                              }
                            }}
                            className={`flex-1 px-2 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                              resolvedMatch?.status === s
                                ? s === 'ONGOING' ? 'bg-green-500 text-white neon-pulse' :
                                  s === 'COMPLETED' ? 'bg-gray-500 text-white' : 'bg-blue-500 text-white'
                                : 'hud-card text-pink-300/40 hover:text-pink-300/70'
                            }`}
                          >
                            {s === 'SETUP' ? 'Setup' : s === 'ONGOING' ? 'Live' : 'Done'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ── RIGHT COLUMN: Tab Content ── */}
                  <div className="col-span-12 lg:col-span-8">

                    {/* ─── ACCOUNT & AUCTION TAB (COMBINED) ─── */}
                    {settingsTab === 'account' && (
                      <div className="space-y-4">
                        {/* Account Settings Card */}
                        <div className="hud-card rounded-2xl p-5">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center border border-pink-500/30">
                                <User size={14} className="text-pink-400" />
                              </div>
                              <h3 className="text-xs font-black text-pink-300 uppercase tracking-wider">Account Settings</h3>
                            </div>
                            <div className="flex items-center gap-2">
                              {editingAccount ? (
                                <>
                                  <button onClick={() => { setEditingAccount(false); if (activeMatch) setAccountSettings({ name: activeMatch.organizerName || currentUser.name || '', email: activeMatch.organizerEmail || currentUser.email || '', phone: activeMatch.organizerPhone || '', organizationName: activeMatch.organizationName || '', organizationType: activeMatch.organizationType || '', designation: activeMatch.designation || '' }); }} className="px-3 py-1.5 rounded-lg hud-card text-pink-300/60 text-[10px] font-bold flex items-center gap-1 hover:bg-pink-500/10 transition-all">
                                    <X size={12} /> Cancel
                                  </button>
                                  <button onClick={handleSaveAccountSettings} className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white text-[10px] font-bold flex items-center gap-1 transition-all">
                                    <Save size={12} /> Save
                                  </button>
                                </>
                              ) : (
                                <button onClick={() => setEditingAccount(true)} className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-pink-600 to-red-600 text-white text-[10px] font-bold flex items-center gap-1 transition-all">
                                  <Edit size={12} /> Edit
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="text-[9px] font-black uppercase text-pink-400/50 tracking-wider block mb-1">Full Name</label>
                              <input type="text" value={accountSettings.name} onChange={(e) => setAccountSettings({...accountSettings, name: e.target.value})} disabled={!editingAccount} className="w-full px-3 py-2 rounded-lg bg-pink-900/20 border border-pink-500/20 text-sm font-bold text-pink-100 disabled:opacity-50 focus:border-pink-500 focus:outline-none transition-all" />
                            </div>
                            <div>
                              <label className="text-[9px] font-black uppercase text-pink-400/50 tracking-wider block mb-1">Email Address</label>
                              <input type="email" value={accountSettings.email} onChange={(e) => setAccountSettings({...accountSettings, email: e.target.value})} disabled={!editingAccount} className="w-full px-3 py-2 rounded-lg bg-pink-900/20 border border-pink-500/20 text-sm font-bold text-pink-100 disabled:opacity-50 focus:border-pink-500 focus:outline-none transition-all" />
                            </div>
                            <div>
                              <label className="text-[9px] font-black uppercase text-pink-400/50 tracking-wider block mb-1">Phone Number</label>
                              <input type="tel" value={accountSettings.phone} onChange={(e) => setAccountSettings({...accountSettings, phone: e.target.value})} disabled={!editingAccount} className="w-full px-3 py-2 rounded-lg bg-pink-900/20 border border-pink-500/20 text-sm font-bold text-pink-100 disabled:opacity-50 focus:border-pink-500 focus:outline-none transition-all" placeholder="Not set" />
                            </div>
                            <div>
                              <label className="text-[9px] font-black uppercase text-pink-400/50 tracking-wider block mb-1">Designation</label>
                              <select value={accountSettings.designation} onChange={(e) => setAccountSettings({...accountSettings, designation: e.target.value})} disabled={!editingAccount} className="w-full px-3 py-2 rounded-lg bg-pink-900/20 border border-pink-500/20 text-sm font-bold text-pink-100 disabled:opacity-50 focus:border-pink-500 focus:outline-none transition-all">
                                <option value="">Select</option>
                                <option value="Organizer">Organizer</option>
                                <option value="Coordinator">Coordinator</option>
                                <option value="Owner">Owner</option>
                              </select>
                            </div>
                          </div>
                        </div>
                        {/* Password Change Card */}
                        <div className="hud-card rounded-2xl p-5">
                          <div className="flex items-center gap-2 mb-3">
                            <Lock size={14} className="text-orange-400/60" />
                            <h4 className="text-[10px] font-black text-pink-400/50 uppercase tracking-wider">Security</h4>
                          </div>
                          <p className="text-xs text-pink-300/40 mb-3">Password can be changed via the authentication system.</p>
                          <button className="px-4 py-2 rounded-lg hud-card text-pink-300/50 text-[10px] font-bold uppercase tracking-wider hover:bg-pink-500/10 hover:text-pink-300 transition-all flex items-center gap-2" onClick={() => alert('Password reset will be sent to your email.')}>
                            <Lock size={12} />
                            Request Password Reset
                          </button>
                        </div>
                        
                        {/* Auction Configuration Card */}
                        <div className="hud-card rounded-2xl p-5">
                          <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                              <Gavel size={14} className="text-indigo-400" />
                            </div>
                            <h3 className="text-xs font-black text-pink-300 uppercase tracking-wider">Auction Configuration</h3>
                          </div>
                          <div className="flex items-center gap-2">
                            {editingSettings ? (
                              <>
                                <button onClick={() => setEditingSettings(false)} className="px-3 py-1.5 rounded-lg hud-card text-pink-300/60 text-[10px] font-bold flex items-center gap-1 hover:bg-pink-500/10 transition-all">
                                  <X size={12} /> Cancel
                                </button>
                                <button onClick={handleSaveSettings} className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white text-[10px] font-bold flex items-center gap-1 transition-all">
                                  <Save size={12} /> Save
                                </button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => setEditingSettings(true)} className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-pink-600 to-red-600 text-white text-[10px] font-bold flex items-center gap-1 transition-all">
                                  <Edit size={12} /> Edit
                                </button>
                                <button onClick={handleLockSeason} className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-red-600 text-white text-[10px] font-bold flex items-center gap-1 transition-all">
                                  <Lock size={12} /> Lock
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Season Info Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                          <div>
                            <label className="text-[9px] font-black uppercase text-pink-400/50 tracking-wider block mb-1">Season Name</label>
                            <input type="text" value={seasonSettings.name} onChange={(e) => setSeasonSettings({...seasonSettings, name: e.target.value})} disabled={!editingSettings} className="w-full px-3 py-2 rounded-lg bg-pink-900/20 border border-pink-500/20 text-sm font-bold text-pink-100 disabled:opacity-50 focus:border-pink-500 focus:outline-none transition-all" />
                          </div>
                          <div>
                            <label className="text-[9px] font-black uppercase text-pink-400/50 tracking-wider block mb-1">Sport Type</label>
                            <select value={seasonSettings.sport} onChange={(e) => setSeasonSettings({...seasonSettings, sport: e.target.value})} disabled={!editingSettings} className="w-full px-3 py-2 rounded-lg bg-pink-900/20 border border-pink-500/20 text-sm font-bold text-pink-100 disabled:opacity-50 focus:border-pink-500 focus:outline-none transition-all">
                              <option value="Cricket">Cricket</option>
                              <option value="Football">Football</option>
                              <option value="Basketball">Basketball</option>
                              <option value="Kabaddi">Kabaddi</option>
                            </select>
                          </div>
                        </div>

                        {/* Budget & Bid Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                          <div>
                            <label className="text-[9px] font-black uppercase text-pink-400/50 tracking-wider block mb-1">Base Team Budget (₹)</label>
                            <input type="number" value={seasonSettings.baseTeamBudget} onChange={(e) => setSeasonSettings({...seasonSettings, baseTeamBudget: parseInt(e.target.value) || 0})} disabled={!editingSettings} className="w-full px-3 py-2 rounded-lg bg-pink-900/20 border border-pink-500/20 text-sm font-bold text-pink-100 disabled:opacity-50 focus:border-pink-500 focus:outline-none transition-all font-mono" />
                            <p className="text-[9px] text-emerald-400/50 mt-0.5 font-mono">₹{(seasonSettings.baseTeamBudget || 0).toLocaleString()}</p>
                          </div>
                          <div>
                            <label className="text-[9px] font-black uppercase text-pink-400/50 tracking-wider block mb-1">Bid Increment (₹)</label>
                            <input type="number" value={seasonSettings.bidIncrement} onChange={(e) => setSeasonSettings({...seasonSettings, bidIncrement: parseInt(e.target.value) || 0})} disabled={!editingSettings} className="w-full px-3 py-2 rounded-lg bg-pink-900/20 border border-pink-500/20 text-sm font-bold text-pink-100 disabled:opacity-50 focus:border-pink-500 focus:outline-none transition-all font-mono" />
                            <p className="text-[9px] text-emerald-400/50 mt-0.5 font-mono">₹{(seasonSettings.bidIncrement || 0).toLocaleString()}</p>
                          </div>
                        </div>

                        {/* Team & Squad Row */}
                        <div className="grid grid-cols-3 gap-3 mb-4">
                          <div>
                            <label className="text-[9px] font-black uppercase text-pink-400/50 tracking-wider block mb-1">Max Teams</label>
                            <input type="number" value={seasonSettings.maxTeams} onChange={(e) => setSeasonSettings({...seasonSettings, maxTeams: parseInt(e.target.value) || 0})} disabled={!editingSettings} className="w-full px-3 py-2 rounded-lg bg-pink-900/20 border border-pink-500/20 text-sm font-bold text-pink-100 disabled:opacity-50 focus:border-pink-500 focus:outline-none transition-all" />
                          </div>
                          <div>
                            <label className="text-[9px] font-black uppercase text-pink-400/50 tracking-wider block mb-1">Min Squad</label>
                            <input type="number" value={seasonSettings.minSquadSize} onChange={(e) => setSeasonSettings({...seasonSettings, minSquadSize: parseInt(e.target.value) || 0})} disabled={!editingSettings} className="w-full px-3 py-2 rounded-lg bg-pink-900/20 border border-pink-500/20 text-sm font-bold text-pink-100 disabled:opacity-50 focus:border-pink-500 focus:outline-none transition-all" />
                          </div>
                          <div>
                            <label className="text-[9px] font-black uppercase text-pink-400/50 tracking-wider block mb-1">Max Squad</label>
                            <input type="number" value={seasonSettings.maxSquadSize} onChange={(e) => setSeasonSettings({...seasonSettings, maxSquadSize: parseInt(e.target.value) || 0})} disabled={!editingSettings} className="w-full px-3 py-2 rounded-lg bg-pink-900/20 border border-pink-500/20 text-sm font-bold text-pink-100 disabled:opacity-50 focus:border-pink-500 focus:outline-none transition-all" />
                          </div>
                        </div>

                        {/* Duration Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[9px] font-black uppercase text-pink-400/50 tracking-wider block mb-1">Auction Duration (min)</label>
                            <input type="number" value={seasonSettings.duration} onChange={(e) => setSeasonSettings({...seasonSettings, duration: parseInt(e.target.value) || 0})} disabled={!editingSettings} className="w-full px-3 py-2 rounded-lg bg-pink-900/20 border border-pink-500/20 text-sm font-bold text-pink-100 disabled:opacity-50 focus:border-pink-500 focus:outline-none transition-all" />
                          </div>
                          <div className="flex items-end">
                            <div className="w-full p-2.5 rounded-lg bg-pink-900/10 border border-pink-500/10">
                              <p className="text-[9px] text-pink-300/40 flex items-center gap-1.5"><AlertCircle size={10} /> Budget changes won't affect existing teams</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      </div>
                    )}

                    {/* ─── PLATFORM TAB ─── */}
                    {settingsTab === 'platform' && (
                      <div className="space-y-4">
                        <div className="hud-card rounded-2xl p-5">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
                              <Shield size={14} className="text-cyan-400" />
                            </div>
                            <h3 className="text-xs font-black text-pink-300 uppercase tracking-wider">Organization & Platform</h3>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                            <div>
                              <label className="text-[9px] font-black uppercase text-pink-400/50 tracking-wider block mb-1">Organization Name</label>
                              <input type="text" value={accountSettings.organizationName} onChange={(e) => setAccountSettings({...accountSettings, organizationName: e.target.value})} disabled={!editingAccount} className="w-full px-3 py-2 rounded-lg bg-pink-900/20 border border-pink-500/20 text-sm font-bold text-pink-100 disabled:opacity-50 focus:border-pink-500 focus:outline-none transition-all" placeholder="Not set" />
                            </div>
                            <div>
                              <label className="text-[9px] font-black uppercase text-pink-400/50 tracking-wider block mb-1">Organization Type</label>
                              <select value={accountSettings.organizationType} onChange={(e) => setAccountSettings({...accountSettings, organizationType: e.target.value})} disabled={!editingAccount} className="w-full px-3 py-2 rounded-lg bg-pink-900/20 border border-pink-500/20 text-sm font-bold text-pink-100 disabled:opacity-50 focus:border-pink-500 focus:outline-none transition-all">
                                <option value="">Select</option>
                                <option value="Sports Club">Sports Club</option>
                                <option value="Corporate">Corporate</option>
                                <option value="Educational">Educational</option>
                                <option value="Government">Government</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>
                          </div>
                          {!editingAccount && (
                            <button onClick={() => { setEditingAccount(true); setSettingsTab('account'); }} className="text-[10px] text-pink-400/40 hover:text-pink-400 transition-all flex items-center gap-1 font-bold">
                              <Edit size={10} /> Edit in Account tab
                            </button>
                          )}
                        </div>
                        {/* Access & Role Info */}
                        <div className="hud-card rounded-2xl p-5">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
                              <Star size={14} className="text-amber-400" />
                            </div>
                            <h3 className="text-xs font-black text-pink-300 uppercase tracking-wider">Access & Role</h3>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-lg bg-pink-900/15 border border-pink-500/10">
                              <p className="text-[9px] font-black uppercase text-pink-400/40 tracking-wider mb-0.5">Role</p>
                              <p className="text-sm font-black text-pink-100">Administrator</p>
                            </div>
                            <div className="p-3 rounded-lg bg-pink-900/15 border border-pink-500/10">
                              <p className="text-[9px] font-black uppercase text-pink-400/40 tracking-wider mb-0.5">Access Level</p>
                              <p className="text-sm font-black text-pink-100">Full Access</p>
                            </div>
                            <div className="p-3 rounded-lg bg-pink-900/15 border border-pink-500/10">
                              <p className="text-[9px] font-black uppercase text-pink-400/40 tracking-wider mb-0.5">Match ID</p>
                              <p className="text-[11px] font-mono text-pink-300/60 truncate">{activeMatch?.id || '—'}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-pink-900/15 border border-pink-500/10">
                              <p className="text-[9px] font-black uppercase text-pink-400/40 tracking-wider mb-0.5">Venue</p>
                              <p className="text-sm font-bold text-pink-100 truncate">{activeMatch?.place || activeMatch?.venueLocation || activeMatch?.venueMode || '—'}</p>
                            </div>
                          </div>
                        </div>
                        {/* Data Stats */}
                        <div className="hud-card rounded-2xl p-5">
                          <div className="flex items-center gap-2 mb-3">
                            <BarChart3 size={14} className="text-pink-400/60" />
                            <h4 className="text-[10px] font-black text-pink-400/50 uppercase tracking-wider">Data Overview</h4>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            <div className="text-center p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                              <p className="text-lg font-black text-blue-400">{eligiblePlayers.length}</p>
                              <p className="text-[8px] font-bold uppercase text-blue-400/50 tracking-wider">Players</p>
                            </div>
                            <div className="text-center p-2.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
                              <p className="text-lg font-black text-orange-400">{teams.length}</p>
                              <p className="text-[8px] font-bold uppercase text-orange-400/50 tracking-wider">Teams</p>
                            </div>
                            <div className="text-center p-2.5 rounded-lg bg-green-500/10 border border-green-500/20">
                              <p className="text-lg font-black text-green-400">{eligiblePlayers.filter(p => p.status === 'SOLD').length}</p>
                              <p className="text-[8px] font-bold uppercase text-green-400/50 tracking-wider">Sold</p>
                            </div>
                            <div className="text-center p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                              <p className="text-lg font-black text-amber-400">{eligiblePlayers.filter(p => p.status === 'PENDING' || p.status === 'AVAILABLE').length}</p>
                              <p className="text-[8px] font-bold uppercase text-amber-400/50 tracking-wider">Pending</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ─── MEDIA TAB ─── */}
                    {settingsTab === 'media' && (
                      <div className="space-y-4">
                        <div className="hud-card rounded-2xl p-5">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                              <Image size={14} className="text-purple-400" />
                            </div>
                            <h3 className="text-xs font-black text-pink-300 uppercase tracking-wider">Profile Image</h3>
                          </div>
                          <div className="flex items-start gap-5">
                            {/* Current Image */}
                            <div className="flex-shrink-0">
                              <div className="w-28 h-28 rounded-2xl overflow-hidden" style={{ border: '2px solid rgba(255, 0, 102, 0.3)', boxShadow: '0 0 20px rgba(255, 0, 102, 0.1)' }}>
                                {(resolvedMatch || currentMatch)?.profilePhotoURL ? (
                                  <img src={(resolvedMatch || currentMatch)?.profilePhotoURL} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-3xl font-black text-white" style={{ background: 'linear-gradient(135deg, rgba(255, 0, 102, 0.5), rgba(249, 115, 22, 0.4))' }}>
                                    {currentUser.name?.[0]?.toUpperCase() || 'A'}
                                  </div>
                                )}
                              </div>
                            </div>
                            {/* Upload Zone */}
                            <div className="flex-1">
                              <p className="text-xs text-pink-300/50 mb-3">Upload a new profile photo. Supported: JPG, PNG, WebP. Max 5MB.</p>
                              <label className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl cursor-pointer transition-all ${uploadingPhoto ? 'opacity-50 pointer-events-none' : 'hover:bg-pink-500/15 hover:border-pink-500/40'}`} style={{ background: 'rgba(255, 0, 102, 0.06)', border: '1px dashed rgba(255, 0, 102, 0.25)' }}>
                                {uploadingPhoto ? (
                                  <><Loader2 size={16} className="text-pink-400 animate-spin" /><span className="text-[10px] font-bold text-pink-400 uppercase tracking-wider">Uploading...</span></>
                                ) : (
                                  <><Upload size={16} className="text-pink-400/60" /><span className="text-[10px] font-bold text-pink-300/60 uppercase tracking-wider">Choose File</span></>
                                )}
                                <input
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      if (file.size > 5 * 1024 * 1024) { alert('File too large (max 5MB)'); return; }
                                      handleProfilePhotoUpload(file);
                                    }
                                  }}
                                />
                              </label>
                              {(resolvedMatch || currentMatch)?.profilePhotoURL && (
                                <p className="text-[9px] text-green-400/50 mt-2 flex items-center gap-1"><CheckCircle size={10} /> Current photo loaded from server</p>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* Document Info */}
                        <div className="hud-card rounded-2xl p-5">
                          <div className="flex items-center gap-2 mb-3">
                            <FileText size={14} className="text-pink-400/60" />
                            <h4 className="text-[10px] font-black text-pink-400/50 uppercase tracking-wider">Verification Documents</h4>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="p-3 rounded-lg bg-pink-900/15 border border-pink-500/10 flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeMatch?.governmentIdURL ? 'bg-green-500/20 border-green-500/30' : 'bg-pink-900/20 border-pink-500/15'} border`}>
                                {activeMatch?.governmentIdURL ? <CheckCircle size={14} className="text-green-400" /> : <X size={14} className="text-pink-400/30" />}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-pink-100">Government ID</p>
                                <p className="text-[9px] text-pink-300/40">{activeMatch?.governmentId || 'Not provided'}</p>
                              </div>
                            </div>
                            <div className="p-3 rounded-lg bg-pink-900/15 border border-pink-500/10 flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeMatch?.organizerProofURL ? 'bg-green-500/20 border-green-500/30' : 'bg-pink-900/20 border-pink-500/15'} border`}>
                                {activeMatch?.organizerProofURL ? <CheckCircle size={14} className="text-green-400" /> : <X size={14} className="text-pink-400/30" />}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-pink-100">Organizer Proof</p>
                                <p className="text-[9px] text-pink-300/40">{activeMatch?.organizerProofURL ? 'Uploaded' : 'Not provided'}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              </div>
            )}

            {/* 3️⃣ PLAYERS — Delegated to PlayersPage */}
            {activeSection === 'players' && (
              <PlayersPage
                onClose={() => setActiveSection('overview')}
                currentMatch={resolvedMatch || currentMatch}
                onAddPlayer={() => { resetAddPlayerForm(); setActiveSection('addPlayer'); }}
              />
            )}

            {/* 3A️⃣ PLAYER APPLICATIONS — Approval Workflow */}
            {activeSection === 'playerApplications' && (
              <PlayerApplicationsPage
                onClose={() => setActiveSection('overview')}
                currentMatch={resolvedMatch || currentMatch}
              />
            )}

            {/* 3B: ADD PLAYER FORM */}
            {activeSection === 'addPlayer' && (
              <div className="flex-1 p-6 pr-8 pb-16">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(236, 72, 153, 0.15)', border: '1px solid rgba(236, 72, 153, 0.3)' }}>
                      <Plus size={24} className="text-pink-400" />
                    </div>
                    <div>
                      <h1 className="text-3xl font-black text-white tracking-tight">Register New Player</h1>
                      <p className="text-pink-400/50 text-sm mt-1">Complete all required fields to add a player to {(resolvedMatch || currentMatch)?.name || 'this auction'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveSection('players')}
                    className="px-6 py-3 rounded-full bg-white/5 border border-pink-500/25 text-pink-300 hover:bg-pink-500/10 hover:border-pink-500/40 transition-all flex items-center gap-2.5 text-sm font-bold"
                    style={{ boxShadow: '0 0 12px rgba(255,0,102,0.1)' }}
                  >
                    <ArrowLeft size={20} />
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
                              {((resolvedMatch || currentMatch)?.config?.roles || []).map((role: any) => (
                                <option key={role.id} value={role.id} style={{ background: '#1a0a1e', color: '#fff' }}>{role.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-pink-400/70 mb-2">Base Price (₹) <span className="text-red-400">*</span></label>
                            <input 
                              type="number" 
                              value={playerBasePrice} 
                              onChange={e => setPlayerBasePrice(e.target.value)} 
                              placeholder="500000" 
                              min={50000} 
                              className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-pink-300/30 focus:outline-none transition-all" 
                              style={{ 
                                background: 'rgba(0,0,0,0.4)', 
                                border: `1px solid ${basePriceError ? 'rgba(239,68,68,0.6)' : basePriceWarning ? 'rgba(234,179,8,0.6)' : 'rgba(236,72,153,0.2)'}` 
                              }} 
                              onFocus={e => { e.target.style.borderColor = basePriceError ? 'rgba(239,68,68,0.8)' : basePriceWarning ? 'rgba(234,179,8,0.8)' : 'rgba(236,72,153,0.5)'; }} 
                              onBlur={e => { e.target.style.borderColor = basePriceError ? 'rgba(239,68,68,0.6)' : basePriceWarning ? 'rgba(234,179,8,0.6)' : 'rgba(236,72,153,0.2)'; }} 
                            />
                            {/* Max Base Price Info */}
                            {matchSettings && (
                              <div className="mt-2 space-y-1">
                                <p className="text-[10px] text-pink-400/60">
                                  Max allowed: <span className="text-pink-300 font-semibold">{formattedMaxBasePrice}</span>
                                  <span className="text-pink-400/40 ml-2">(Team purse: {shortPurse} | Squad: {matchSettings.playersPerTeam})</span>
                                </p>
                                <p className="text-[10px] text-pink-400/60">
                                  Recommended range: <span className="text-green-400 font-semibold">{formattedRecommendedMin}</span> – <span className="text-green-400 font-semibold">{formattedMaxBasePrice}</span>
                                </p>
                              </div>
                            )}
                            {/* Base Price Warning (NON-BLOCKING) */}
                            {basePriceWarning && !basePriceError && (
                              <div className="flex items-start gap-1.5 mt-2 text-[11px] text-yellow-400">
                                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                                <span>{basePriceWarning}</span>
                              </div>
                            )}
                            {/* Base Price Error (HARD BLOCK) */}
                            {basePriceError && (
                              <div className="flex items-start gap-1.5 mt-2 text-[11px] text-red-400">
                                <XCircle size={14} className="flex-shrink-0 mt-0.5" />
                                <span>{basePriceError}</span>
                              </div>
                            )}
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
            )}

            {/* 4️⃣ TEAMS — Grid with TeamHUDCard */}
            {activeSection === 'teams' && (() => {
              // Filter teams by search query
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
                      <p className="text-pink-400/50 text-sm mt-1">{(resolvedMatch || currentMatch)?.name || 'All Teams'} &mdash; {processedTeams.length} franchise{processedTeams.length !== 1 ? 's' : ''} registered</p>
                    </div>
                  </div>
                  
                  {/* Search Bar + Add Team + Exit Button */}
                  <div className="flex items-center gap-3">
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
                      onClick={() => setActiveSection('overview')}
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
                {loading ? (
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
            })()}

            {/* 4B: ADD TEAM FORM */}
            {activeSection === 'addTeam' && (
              <div className="flex-1 p-6 pr-8 pb-16">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(236, 72, 153, 0.15)', border: '1px solid rgba(236, 72, 153, 0.3)' }}>
                      <Plus size={24} className="text-pink-400" />
                    </div>
                    <div>
                      <h1 className="text-3xl font-black text-white tracking-tight">Register New Team</h1>
                      <p className="text-pink-400/50 text-sm mt-1">Complete all required fields to add a franchise to {(resolvedMatch || currentMatch)?.name || 'this auction'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveSection('teams')}
                    className="px-6 py-3 rounded-full bg-white/5 border border-pink-500/25 text-pink-300 hover:bg-pink-500/10 hover:border-pink-500/40 transition-all flex items-center gap-2.5 text-sm font-bold"
                    style={{ boxShadow: '0 0 12px rgba(255,0,102,0.1)' }}
                  >
                    <ArrowLeft size={20} />
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

                  {/* Row 2: Team Details */}
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

                  {/* Purse Intelligence Info Card - DISPLAY ONLY */}
                  {matchSettings && (
                    <div className="glass-card rounded-2xl p-5" style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                      <h3 className="text-sm font-black text-green-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Wallet size={16} />
                        Team Budget Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="rounded-xl p-4" style={{ background: 'rgba(0,0,0,0.3)' }}>
                          <p className="text-[10px] text-green-300/60 uppercase font-bold tracking-wider mb-1">Squad Size</p>
                          <p className="text-2xl font-black text-white">{matchSettings.playersPerTeam} <span className="text-sm font-normal text-green-300/60">players</span></p>
                        </div>
                        <div className="rounded-xl p-4" style={{ background: 'rgba(0,0,0,0.3)' }}>
                          <p className="text-[10px] text-green-300/60 uppercase font-bold tracking-wider mb-1">Team Purse</p>
                          <p className="text-2xl font-black text-white">{shortPurse}</p>
                        </div>
                        <div className="rounded-xl p-4" style={{ background: 'rgba(0,0,0,0.3)' }}>
                          <p className="text-[10px] text-green-300/60 uppercase font-bold tracking-wider mb-1">Avg Budget Per Player</p>
                          <p className="text-2xl font-black text-white">{formattedAvgValue}</p>
                        </div>
                      </div>
                      <p className="text-xs text-green-300/50 mt-3 flex items-center gap-1">
                        <Info size={12} />
                        This is the budget your team will receive for building your squad during the auction.
                      </p>
                    </div>
                  )}

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
            )}

            {/* 4C: TEAM DETAIL — TeamSquadPage */}
            {activeSection === 'teamDetail' && (() => {
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
            })()}

            {/* 5️⃣ AUCTIONEERS MANAGEMENT */}
            {activeSection === 'auctioneers' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <div className="w-[4px] h-8 rounded-full" style={{ background: 'linear-gradient(180deg, rgba(249, 115, 22, 0.9), rgba(255, 0, 102, 0.6))' }}></div>
                      <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-red-400 to-pink-400 uppercase tracking-wider">Auctioneer Applications</h2>
                    </div>
                    <p className="text-sm text-pink-400/60 mt-1 font-semibold">
                      Only ONE auctioneer per season. Approving one will auto-reject others.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-lg text-sm font-bold">
                      {pendingAuctioneers} Pending
                    </span>
                    <span className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-sm font-bold">
                      {approvedAuctioneers} Approved
                    </span>
                  </div>
                </div>

                <div className="grid gap-3">
                  {auctioneers.map((auctioneer) => (
                    <div key={auctioneer.id} className="space-y-2">
                      <div className={`hud-card rounded-xl p-4 transition-all ${
                        auctioneer.status === 'approved' ? 'border-green-500/40' :
                        auctioneer.status === 'rejected' ? 'border-red-500/40' :
                        ''
                      }`} style={{ borderWidth: auctioneer.status !== 'pending' ? '2px' : '1px' }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-black neon-pulse">
                              <Gavel size={24} />
                            </div>
                            <div>
                              <h3 className="text-lg font-black text-pink-100">{auctioneer.name}</h3>
                              <p className="text-sm text-pink-400/60">{auctioneer.email}</p>
                              <p className="text-xs text-pink-400/50 mt-0.5">
                                {auctioneer.experience || '0'} years exp • {auctioneer.languagesKnown?.join(', ') || 'N/A'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                if (selectedAuctioneer?.id === auctioneer.id) {
                                  setSelectedAuctioneer(null);
                                } else {
                                  setSelectedAuctioneer(auctioneer);
                                }
                              }}
                              className={`px-3 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
                                selectedAuctioneer?.id === auctioneer.id 
                                  ? 'bg-gradient-to-r from-pink-600 to-red-600 text-white neon-pulse' 
                                  : 'hud-card text-pink-300 hover:bg-pink-500/20'
                              }`}
                            >
                              <Eye size={16} />
                              {selectedAuctioneer?.id === auctioneer.id ? 'Hide' : 'View'}
                            </button>
                            {auctioneer.status === 'approved' ? (
                              <div className="flex items-center gap-2 px-3 py-2 bg-green-500/20 rounded-lg">
                                <CheckCircle size={16} className="text-green-400" />
                                <span className="text-sm font-bold text-green-400">APPROVED</span>
                              </div>
                            ) : auctioneer.status === 'rejected' ? (
                              <div className="flex items-center gap-2 px-3 py-2 bg-red-500/20 rounded-lg">
                                <XCircle size={16} className="text-red-400" />
                                <span className="text-sm font-bold text-red-400">REJECTED</span>
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleRejectAuctioneer(auctioneer.id)}
                                  className="px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold text-sm transition-all flex items-center gap-2"
                                >
                                  <X size={16} />
                                  Reject
                                </button>
                                <button
                                  onClick={() => handleApproveAuctioneer(auctioneer.id)}
                                  className="px-3 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-sm transition-all flex items-center gap-2 neon-pulse"
                                >
                                  <Check size={16} />
                                  Approve
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Inline Detail View */}
                      {selectedAuctioneer?.id === auctioneer.id && (
                        <div className="hud-card rounded-xl p-5 space-y-4 animate-in slide-in-from-top duration-300">
                          {/* Personal Information */}
                          <div>
                            <h4 className="text-base font-black text-pink-200 mb-3 flex items-center gap-2">
                              <User size={18} className="text-blue-400" />
                              Personal Information
                            </h4>
                            <div className="grid grid-cols-3 gap-3 text-sm">
                              <div className="hud-card rounded-lg p-3">
                                <p className="text-xs font-bold text-pink-400/50 uppercase mb-1">Full Name</p>
                                <p className="text-pink-100 font-semibold">{auctioneer.name || 'N/A'}</p>
                              </div>
                              <div className="hud-card rounded-lg p-3">
                                <p className="text-xs font-bold text-pink-400/50 uppercase mb-1">Email</p>
                                <p className="text-pink-100 font-semibold break-all">{auctioneer.email || 'N/A'}</p>
                              </div>
                              <div className="hud-card rounded-lg p-3">
                                <p className="text-xs font-bold text-pink-400/50 uppercase mb-1">Phone</p>
                                <p className="text-pink-100 font-semibold">{auctioneer.phone || 'N/A'}</p>
                              </div>
                              <div className="col-span-3 hud-card rounded-lg p-3">
                                <p className="text-xs font-bold text-pink-400/50 uppercase mb-1">Auctioneer ID</p>
                                <p className="text-pink-100 font-mono text-sm">{auctioneer.id || 'N/A'}</p>
                              </div>
                            </div>
                          </div>

                          {/* Professional Details */}
                          <div>
                            <h4 className="text-base font-black text-pink-200 mb-3 flex items-center gap-2">
                              <Gavel size={18} className="text-purple-400" />
                              Professional Details
                            </h4>
                            <div className="grid grid-cols-3 gap-3 text-sm">
                              <div className="hud-card rounded-lg p-3">
                                <p className="text-xs font-bold text-pink-400/50 uppercase mb-1">Experience Level</p>
                                <p className="text-pink-100 font-semibold">{auctioneer.experienceLevel || 'N/A'}</p>
                              </div>
                              <div className="hud-card rounded-lg p-3">
                                <p className="text-xs font-bold text-pink-400/50 uppercase mb-1">License</p>
                                <p className="text-pink-100 font-semibold">{auctioneer.auctioneerLicense || 'N/A'}</p>
                              </div>
                              <div className="hud-card rounded-lg p-3">
                                <p className="text-xs font-bold text-pink-400/50 uppercase mb-1">Govt ID Number</p>
                                <p className="text-pink-100 font-semibold">{auctioneer.governmentId || 'N/A'}</p>
                              </div>
                              <div className="col-span-3 hud-card rounded-lg p-3">
                                <p className="text-xs font-bold text-pink-400/50 uppercase mb-2">Languages Known</p>
                                <div className="flex flex-wrap gap-2">
                                  {auctioneer.languages && auctioneer.languages.length > 0 ? (
                                    auctioneer.languages.map((lang: string, idx: number) => (
                                      <span key={idx} className="px-2.5 py-1 bg-purple-500/20 text-purple-400 rounded-lg text-xs font-bold">
                                        {lang}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-pink-400/60 text-xs">No languages specified</span>
                                  )}
                                </div>
                              </div>
                              <div className="col-span-3 hud-card rounded-lg p-3">
                                <p className="text-xs font-bold text-pink-400/50 uppercase mb-1">Previous Auctions</p>
                                <p className="text-pink-100 font-semibold whitespace-pre-wrap text-xs">{auctioneer.previousAuctions || 'No previous auctions mentioned'}</p>
                              </div>
                            </div>
                          </div>

                          {/* Application Status */}
                          <div>
                            <h4 className="text-base font-black text-pink-200 mb-3 flex items-center gap-2">
                              <FileText size={18} className="text-green-400" />
                              Application Status
                            </h4>
                            <div className="grid grid-cols-3 gap-3 text-sm">
                              <div className="hud-card rounded-lg p-3">
                                <p className="text-xs font-bold text-pink-400/50 uppercase mb-1">Status</p>
                                <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-bold ${
                                  auctioneer.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                                  auctioneer.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                                  'bg-yellow-500/20 text-yellow-400'
                                }`}>
                                  {auctioneer.status === 'approved' ? <CheckCircle size={14} /> :
                                   auctioneer.status === 'rejected' ? <XCircle size={14} /> :
                                   <Clock size={14} />}
                                  {(auctioneer.status || 'pending').toUpperCase()}
                                </span>
                              </div>
                              <div className="col-span-2 hud-card rounded-lg p-3">
                                <p className="text-xs font-bold text-pink-400/50 uppercase mb-1">Applied On</p>
                                <p className="text-pink-100 font-semibold text-xs">
                                  {auctioneer.createdAt ? new Date(auctioneer.createdAt).toLocaleDateString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  }) : 'N/A'}
                                </p>
                              </div>
                              {auctioneer.assignedAuctionEvent && (
                                <div className="col-span-3 hud-card rounded-lg p-3">
                                  <p className="text-xs font-bold text-pink-400/50 uppercase mb-1">Assigned Event</p>
                                  <p className="text-pink-100 font-semibold text-xs">{auctioneer.assignedAuctionEvent}</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Government ID Proof */}
                          {auctioneer.governmentIdFile && (
                            <div>
                              <h4 className="text-base font-black text-pink-200 mb-3 flex items-center gap-2">
                                <Shield size={18} className="text-red-400" />
                                Government ID Proof
                              </h4>
                              <div className="hud-card rounded-lg p-4">
                                {auctioneer.governmentIdFile.includes('.pdf') ? (
                                  <div className="flex items-center gap-3 p-3 bg-red-500/20 rounded-lg border border-red-500/30">
                                    <FileText size={28} className="text-red-400" />
                                    <div className="flex-1">
                                      <p className="text-sm font-bold text-pink-100">PDF Document</p>
                                      <p className="text-xs text-pink-400/60">Click to download or view</p>
                                    </div>
                                    <a
                                      href={auctioneer.governmentIdFile}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold text-sm transition-all"
                                    >
                                      View PDF
                                    </a>
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    <img
                                      src={auctioneer.governmentIdFile}
                                      alt="Government ID Proof"
                                      className="w-full h-auto rounded-lg border-2 border-slate-200 max-h-96 object-contain"
                                    />
                                    <a
                                      href={auctioneer.governmentIdFile}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-block px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold text-sm transition-all"
                                    >
                                      View Full Size
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {auctioneers.length === 0 && (
                    <div className="hud-card rounded-2xl p-12 text-center">
                      <Gavel size={48} className="mx-auto text-pink-500/30 mb-4" />
                      <h3 className="text-xl font-black text-pink-300 mb-2">No Applications Yet</h3>
                      <p className="text-pink-400/60">Waiting for auctioneers to apply...</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 6️⃣ LIVE MONITOR */}
            {activeSection === 'liveMonitor' && (
              <div className="animate-in fade-in duration-500">
                {/* Live Notifications - Floating at top */}
                <div className="fixed top-20 right-6 z-50 space-y-3 max-w-md">
                  {liveNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`animate-in slide-in-from-right duration-300 shadow-2xl rounded-xl overflow-hidden ${
                        notification.type === 'bid' ? 'bg-gradient-to-r from-blue-500 to-cyan-600' :
                        notification.type === 'sold' ? 'bg-gradient-to-r from-green-500 to-emerald-600' :
                        notification.type === 'unsold' ? 'bg-gradient-to-r from-gray-500 to-slate-600' :
                        notification.type === 'start' ? 'bg-gradient-to-r from-orange-500 to-red-600' :
                        'bg-gradient-to-r from-purple-500 to-indigo-600'
                      }`}
                    >
                      <div className="p-3 flex items-center gap-3">
                        <div className="flex-1">
                          <p className="text-white font-bold text-sm">{notification.message}</p>
                        </div>
                        <button
                          onClick={() => removeLiveNotification(notification.id)}
                          className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all"
                        >
                          <X size={14} className="text-white" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-12 gap-3 h-[calc(100vh-130px)]">
                  {/* Left: Live Auction Display */}
                  <div className="col-span-8 h-full">
                    {/* Live Auction Card */}
                    <div className="mission-widget rounded-2xl overflow-hidden h-full flex flex-col cyber-glow">
                      <div className="angled-header">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-red-300 flex items-center gap-2">
                          <Zap size={14} className="text-red-400 animate-pulse" />
                          Live Auction Room
                        </h3>
                      </div>
                      
                      <div className="p-6 flex flex-col items-center justify-center flex-1">
                        {console.log('📺 Admin: LiveMonitor rendering - currentBiddingPlayer:', currentBiddingPlayer?.name || 'NULL')}
                        {currentBiddingPlayer ? (
                          <div className="text-center w-full max-w-md">
                            {/* Player Image */}
                            <div className="h-44 w-44 mx-auto flex items-center justify-center bg-pink-900/30 rounded-full border-4 border-pink-500/50 shadow-lg mb-4 overflow-hidden neon-pulse">
                              {currentBiddingPlayer.imageUrl ? (
                                <img src={currentBiddingPlayer.imageUrl} alt={currentBiddingPlayer.name} className="w-full h-full object-cover" />
                              ) : (
                                <User size={60} className="text-pink-400" />
                              )}
                            </div>

                            {/* Player Info */}
                            <h3 className="text-2xl font-black text-pink-100 mb-2 uppercase leading-tight">{currentBiddingPlayer.name}</h3>
                            <p className="text-cyan-400 text-xs uppercase tracking-wider font-bold mb-4">{currentBiddingPlayer.role || currentBiddingPlayer.roleId || 'Player'}</p>

                            {/* Current Bid */}
                            <div className="mission-widget rounded-xl p-4 mb-3 cyber-glow" style={{ border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                              <p className="text-xs text-pink-400/60 uppercase tracking-wider font-bold mb-1">Current Bid</p>
                              <p className="text-4xl font-black text-green-400 mb-1">
                                ₹{currentBid >= 10000000 ? (currentBid / 10000000).toFixed(1) + 'Cr' : (currentBid / 100000).toFixed(1) + 'L'}
                              </p>
                              {leadingTeamName ? (
                                <p className="text-cyan-400 text-base font-bold animate-pulse">Leading: {leadingTeamName}</p>
                              ) : (
                                <p className="text-pink-400/60 text-sm">No bids yet</p>
                              )}
                            </div>

                            {/* Base Price */}
                            <p className="text-pink-400/60 text-xs">Base Price: ₹{(currentBiddingPlayer.basePrice / 100000).toFixed(1)}L</p>
                          </div>
                        ) : (
                          <div className="text-center">
                            <Radio size={60} className={`mx-auto mb-4 ${liveAuctionStatus === 'LIVE' ? 'text-red-500 animate-pulse' : 'text-pink-500/30'}`} />
                            <h3 className="text-2xl font-black text-pink-300 mb-2">
                              {liveAuctionStatus === 'LIVE' ? 'Preparing Next Player...' :
                               liveAuctionStatus === 'PAUSED' ? 'Auction Paused' :
                               liveAuctionStatus === 'ENDED' ? 'Auction Ended' :
                               'Waiting to Start'}
                            </h3>
                            <p className="text-pink-400/60 text-sm">
                              {liveAuctionStatus === 'LIVE' ? 'The next player will appear shortly' :
                               liveAuctionStatus === 'PAUSED' ? 'Auction temporarily on hold' :
                               liveAuctionStatus === 'ENDED' ? 'All players have been auctioned' :
                               'Auction has not started yet'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Stats and Emergency Controls */}
                  <div className="col-span-4 h-full grid grid-rows-5 gap-2">
                    {/* Row 1: Players Sold */}
                    <div className="mission-widget rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-xs font-bold text-pink-400/60 uppercase tracking-wider">Players Sold</h4>
                        <CheckCircle size={14} className="text-green-400" />
                      </div>
                      <p className="text-xl font-black text-green-400">{soldPlayers}/{totalPlayers}</p>
                      <div className="mt-1 w-full bg-pink-900/30 rounded-full h-1">
                        <div 
                          className="bg-green-500 h-1 rounded-full transition-all duration-500"
                          style={{ width: `${totalPlayers > 0 ? (soldPlayers / totalPlayers) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Row 2: Total Spent */}
                    <div className="mission-widget rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-xs font-bold text-pink-400/60 uppercase tracking-wider">Total Spent</h4>
                        <DollarSign size={14} className="text-orange-400" />
                      </div>
                      <p className="text-xl font-black text-orange-400">₹{(spentBudget / 10000000).toFixed(1)}Cr</p>
                      <p className="text-xs text-pink-400/60">of ₹{(totalBudget / 10000000).toFixed(1)}Cr</p>
                    </div>

                    {/* Row 3: Teams Active and Remaining side by side */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="mission-widget rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-[10px] font-bold text-pink-400/60 uppercase">Active</h4>
                          <Users size={12} className="text-purple-400" />
                        </div>
                        <p className="text-lg font-black text-purple-400">{approvedTeams}</p>
                        <p className="text-[10px] text-pink-400/50">Teams</p>
                      </div>

                      <div className="mission-widget rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-[10px] font-bold text-pink-400/60 uppercase">Pending</h4>
                          <Activity size={12} className="text-cyan-400" />
                        </div>
                        <p className="text-lg font-black text-cyan-400">{pendingPlayers}</p>
                        <p className="text-[10px] text-pink-400/50">Players</p>
                      </div>
                    </div>


                  </div>
                </div>
              </div>
            )}

            {/* 8️⃣ REPORTS — ReportSection + BiddingHistoryPage */}
            {(activeSection === 'reports' || activeSection === 'report') && (() => {
              const reportTeams = teams.map(team => {
                const teamPlayers = eligiblePlayers.filter(p => 
                  (p as any).soldTo === team.id || (p as any).teamId === team.id || (p as any).buyingTeamId === team.id
                );
                const spent = teamPlayers.reduce((sum, p) => sum + ((p as any).soldAmount || (p as any).soldPrice || (p as any).currentBid || 0), 0);
                return { ...team, acquiredPlayers: teamPlayers, totalSpent: spent };
              });
              const unassignedPlayers = eligiblePlayers.filter(p => {
                const hasTeam = (p as any).soldTo || (p as any).teamId || (p as any).buyingTeamId;
                return !hasTeam && (p.status === 'UNSOLD' || p.status === 'AVAILABLE' || p.status === 'PENDING' || !p.status);
              });
              return (
                <ReportSection
                  teams={reportTeams}
                  unassignedPlayers={unassignedPlayers}
                  players={eligiblePlayers}
                  currentMatch={resolvedMatch || currentMatch}
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
            })()}

            {/* 8B: BIDDING HISTORY — BiddingHistoryPage */}
            {activeSection === 'history' && (() => {
              if (!historyPlayer || !(resolvedMatch || currentMatch)?.id) {
                setActiveSection('reports');
                return null;
              }
              return (
                <BiddingHistoryPage
                  player={historyPlayer}
                  seasonId={(resolvedMatch || currentMatch)!.id}
                  onBack={() => setActiveSection('reports')}
                />
              );
            })()}

          </div>
        </div>
      </div>

      {/* Full-Screen Live Room — No Sidebar, No Topbar */}
      {activeSection === 'liveRoom' && (resolvedMatch || currentMatch) && (
        <div className="fixed inset-0 z-[60] bg-black animate-in fade-in duration-500">
          <LiveAuctionPage
            seasonId={(resolvedMatch || currentMatch)!.id}
            userId={currentUser.email}
            userRole={UserRole.ADMIN}
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

      {/* CONFIRMATION MODAL \u2014 HUD Popup */}
      {showConfirmation && confirmAction && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="hud-card rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in duration-200 cyber-glow gradient-border">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center neon-pulse border border-yellow-500/30">
                <AlertTriangle size={24} className="text-yellow-400" />
              </div>
              <div>
                <h3 className="text-xl font-black text-pink-100">Confirm Action</h3>
                <p className="text-[10px] text-pink-400/40 uppercase tracking-widest font-bold">Critical Operation</p>
              </div>
            </div>
            
            <p className="text-pink-200/80 font-semibold mb-6 leading-relaxed">
              {confirmAction.message}
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirmation(false);
                  setConfirmAction(null);
                }}
                className="flex-1 px-5 py-2.5 rounded-xl hud-card text-pink-300/70 font-bold text-sm transition-all hover:bg-pink-500/10 hover:text-pink-300"
              >
                Cancel
              </button>
              <button
                onClick={executeConfirmedAction}
                className="flex-1 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white font-bold text-sm shadow-lg transition-all neon-pulse"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </>
  );
};
