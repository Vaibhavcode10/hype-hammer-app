import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Users, User, ArrowLeft, Search, Filter, X as FilterX, Shield, Check, X, Clock, Ban, Mail, Phone, Calendar, Globe, Star, Briefcase, MapPin, FileText, ExternalLink } from 'lucide-react';
import type { MatchData, Player as AppPlayer, ApprovalStatus } from '../../types';
import { formatIndianCurrencyShort } from '../../services/currencyUtils';

const API_BASE = 'https://us-central1-axilam.cloudfunctions.net/auction';

type Player = AppPlayer & {
  soldTimestamp?: unknown;
  updatedAt?: unknown;
  createdAt?: unknown;
};

interface PlayerApplicationsPageProps {
  onClose: () => void;
  currentMatch: MatchData | null;
}

export const PlayerApplicationsPage: React.FC<PlayerApplicationsPageProps> = ({ onClose, currentMatch }) => {
  // Data states - one for each tab to support backend filtering
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [acceptedPlayers, setAcceptedPlayers] = useState<Player[]>([]);
  const [pendingPlayers, setPendingPlayers] = useState<Player[]>([]);
  const [declinedPlayers, setDeclinedPlayers] = useState<Player[]>([]);
  
  // Counts for dynamic tabs
  const [counts, setCounts] = useState({ all: 0, accepted: 0, pending: 0, declined: 0 });
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'accepted' | 'pending' | 'declined'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingApproval, setUpdatingApproval] = useState<string | null>(null);

  // Fetch all players and counts on mount
  useEffect(() => {
    if (currentMatch?.id) {
      fetchAllData();
    }
  }, [currentMatch?.id]);

  // Fetch players when tab changes (backend filtering)
  useEffect(() => {
    if (currentMatch?.id) {
      fetchPlayersForTab(activeTab);
    }
  }, [activeTab, currentMatch?.id]);

  const fetchAllData = async () => {
    if (!currentMatch) return;
    
    try {
      setLoading(true);
      // Fetch all players to get counts
      const res = await fetch(`${API_BASE}/players?matchId=${currentMatch.id}`);
      if (res.ok) {
        const data = await res.json();
        const players = data.data || [];
        setAllPlayers(players);
        
        // Calculate counts
        const accepted = players.filter((p: Player) => p.approvalStatus === 'accepted').length;
        const pending = players.filter((p: Player) => p.approvalStatus === 'pending' || !p.approvalStatus).length;
        const declined = players.filter((p: Player) => p.approvalStatus === 'declined').length;
        
        setCounts({
          all: players.length,
          accepted,
          pending,
          declined
        });
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayersForTab = async (tab: 'all' | 'accepted' | 'pending' | 'declined') => {
    if (!currentMatch) return;
    
    try {
      let url = `${API_BASE}/players?matchId=${currentMatch.id}`;
      if (tab !== 'all') {
        url += `&approvalStatus=${tab}`;
      }
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const players = data.data || [];
        
        // Sort: accepted first in All view
        const sortedPlayers = tab === 'all' 
          ? sortByApprovalStatus(players)
          : players;
        
        switch (tab) {
          case 'all':
            setAllPlayers(sortedPlayers);
            break;
          case 'accepted':
            setAcceptedPlayers(sortedPlayers);
            break;
          case 'pending':
            setPendingPlayers(sortedPlayers);
            break;
          case 'declined':
            setDeclinedPlayers(sortedPlayers);
            break;
        }
      }
    } catch (error) {
      console.error(`Failed to fetch ${tab} players:`, error);
    }
  };

  // Sort players by approval status: accepted first, then pending, then declined
  const sortByApprovalStatus = (players: Player[]): Player[] => {
    const order: Record<string, number> = { accepted: 0, pending: 1, declined: 2 };
    return [...players].sort((a, b) => {
      const statusA = a.approvalStatus || 'pending';
      const statusB = b.approvalStatus || 'pending';
      return (order[statusA] ?? 1) - (order[statusB] ?? 1);
    });
  };

  const getApprovalStatus = (player: Player): ApprovalStatus => {
    return player.approvalStatus || 'pending';
  };

  const handleUpdateApproval = async (playerId: string, status: 'accepted' | 'declined') => {
    if (!currentMatch?.id) return;
    
    setUpdatingApproval(playerId);
    try {
      const response = await fetch(`${API_BASE}/players/${playerId}/${status === 'accepted' ? 'approve' : 'decline'}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        // Refetch data to update counts and lists
        await fetchAllData();
        await fetchPlayersForTab(activeTab);
      } else {
        console.error('Failed to update approval status');
      }
    } catch (error) {
      console.error('Error updating approval:', error);
    } finally {
      setUpdatingApproval(null);
    }
  };

  const formatDate = (value?: unknown) => {
    if (!value) return 'N/A';
    if (typeof value === 'object' && value !== null) {
      const asAny = value as any;
      if (typeof asAny.toDate === 'function') {
        return asAny.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      }
      const seconds = asAny.seconds ?? asAny._seconds;
      if (typeof seconds === 'number') {
        return new Date(seconds * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    }
    if (typeof value === 'number') {
      const ms = value > 1_000_000_000_000 ? value : value * 1000;
      return new Date(ms).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Get current players based on active tab
  const currentPlayers = useMemo(() => {
    let players: Player[];
    switch (activeTab) {
      case 'accepted':
        players = acceptedPlayers;
        break;
      case 'pending':
        players = pendingPlayers;
        break;
      case 'declined':
        players = declinedPlayers;
        break;
      default:
        players = allPlayers;
    }
    
    // Apply search filter
    if (searchTerm) {
      return players.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return players;
  }, [activeTab, allPlayers, acceptedPlayers, pendingPlayers, declinedPlayers, searchTerm]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-pink-500/30 border-t-pink-500 mx-auto mb-4"></div>
          <p className="text-lg font-bold text-pink-400">Loading Applications...</p>
        </div>
      </div>
    );
  }

  const renderPlayerCard = (player: Player) => {
    const approvalStatus = getApprovalStatus(player);
    const basePrice = player.basePrice || 0;
    const playingRole = player.roleId || player.role || '';
    const age = player.age ? Math.floor(player.age) : null;
    const experience = player.experienceLevel || '';
    const stats = player.stats || '';

    let statusColor = 'rgba(236, 72, 153, 0.15)';
    let statusBg = 'rgba(236, 72, 153, 0.08)';
    let statusBorder = 'rgba(236, 72, 153, 0.2)';
    let statusTextColor = '#f9a8d4';
    let statusText = 'PENDING';

    if (approvalStatus === 'accepted') {
      statusColor = 'rgba(34, 197, 94, 0.15)';
      statusBg = 'rgba(34, 197, 94, 0.08)';
      statusBorder = 'rgba(34, 197, 94, 0.2)';
      statusTextColor = '#86efac';
      statusText = 'ACCEPTED';
    } else if (approvalStatus === 'declined') {
      statusColor = 'rgba(239, 68, 68, 0.15)';
      statusBg = 'rgba(239, 68, 68, 0.08)';
      statusBorder = 'rgba(239, 68, 68, 0.2)';
      statusTextColor = '#fca5a5';
      statusText = 'DECLINED';
    }

    return (
      <div 
        key={player.id}
        className="relative rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] cursor-default"
        style={{
          background: 'linear-gradient(145deg, rgba(20, 10, 25, 0.95), rgba(30, 15, 35, 0.9))',
          border: '1px solid ' + statusColor,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)'
        }}
      >
        {/* Top Accent Bar - Status Color */}
        <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, ${statusColor}, ${statusBorder})` }} />

        <div className="p-4">
          {/* Header Section: Avatar + Basic Info */}
          <div className="flex gap-3 mb-3">
            {/* Avatar */}
            <div 
              className="w-14 h-14 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${statusBg}, rgba(180, 50, 120, 0.06))`,
                border: `2px solid ${statusBorder}`
              }}
            >
              {player.imageUrl ? (
                <img src={player.imageUrl} alt={player.name} className="w-full h-full object-cover" />
              ) : (
                <User size={22} className="text-pink-400/40" />
              )}
            </div>

            {/* Name + Quick Info */}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-white truncate leading-tight">
                {player.name}
              </h4>
              <p className="text-[10px] text-pink-400/60 truncate">{playingRole || 'Player'}</p>
              {age && <p className="text-[10px] text-pink-400/50">Age: {age}</p>}
            </div>
          </div>

          {/* Status + Approval Badges */}
          <div className="flex gap-2 mb-3 flex-wrap">
            <span 
              className="px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wide"
              style={{
                background: statusBg,
                border: `1px solid ${statusBorder}`,
                color: statusTextColor
              }}
            >
              {statusText}
            </span>
            {player.nationality && (
              <span 
                className="px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wide"
                style={{
                  background: 'rgba(236, 72, 153, 0.08)',
                  border: '1px solid rgba(236, 72, 153, 0.2)',
                  color: '#f9a8d4'
                }}
              >
                {player.nationality}
              </span>
            )}
          </div>

          {/* Divider */}
          <div className="h-[1px] w-full mb-3 bg-gradient-to-r from-transparent via-pink-500/15 to-transparent" />

          {/* Details Grid */}
          <div className="space-y-2 mb-3 text-[10px]">
            {/* Base Price */}
            {basePrice > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-pink-400/60">Base Price:</span>
                <span className="font-bold text-pink-200">{formatIndianCurrencyShort(basePrice)}</span>
              </div>
            )}

            {/* Experience */}
            {experience && (
              <div className="flex items-center justify-between">
                <span className="text-pink-400/60">Experience:</span>
                <span className="font-semibold text-pink-300/80 text-right">{experience}</span>
              </div>
            )}

            {/* Availability */}
            {player.availability && (
              <div className="flex items-center justify-between">
                <span className="text-pink-400/60">Availability:</span>
                <span className="font-semibold text-emerald-300">{player.availability}</span>
              </div>
            )}

            {/* Government ID Section */}
            {(player.governmentId || player.governmentIdURL) && (
              <>
                {player.governmentId && (
                  <div className="flex items-center justify-between">
                    <span className="text-pink-400/60">Gov ID:</span>
                    <span className="font-semibold text-pink-300/80 text-right truncate">{player.governmentId}</span>
                  </div>
                )}
                {player.governmentIdURL && (
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-pink-400/60">ID Proof:</span>
                    <a href={player.governmentIdURL} target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-1 text-pink-400 hover:text-pink-300 transition-colors">
                      <ExternalLink size={10} />
                      <span className="text-[9px] font-bold">View</span>
                    </a>
                  </div>
                )}
              </>
            )}

            {/* Stats - Truncate if too long */}
            {stats && (
              <div className="flex items-start justify-between gap-2">
                <span className="text-pink-400/60">Stats:</span>
                <span className="font-semibold text-pink-300/80 text-right line-clamp-2">{stats}</span>
              </div>
            )}
          </div>

          {/* Contact Info - Compact */}
          {(player.email || player.phone) && (
            <>
              <div className="h-[1px] w-full mb-2 bg-gradient-to-r from-transparent via-pink-500/10 to-transparent" />
              <div className="space-y-1 mb-3 text-[9px]">
                {player.email && (
                  <div className="flex items-center gap-1.5 text-pink-400/50 truncate">
                    <Mail size={10} className="flex-shrink-0" />
                    <span className="truncate">{player.email}</span>
                  </div>
                )}
                {player.phone && (
                  <div className="flex items-center gap-1.5 text-pink-400/50">
                    <Phone size={10} className="flex-shrink-0" />
                    <span>{player.phone}</span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {approvalStatus !== 'accepted' && (
              <button
                onClick={() => handleUpdateApproval(player.id, 'accepted')}
                disabled={updatingApproval === player.id}
                className="flex-1 py-2 rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-600/20 border border-green-500/40 text-green-300 text-xs font-bold hover:from-green-500/30 hover:to-emerald-600/30 hover:border-green-500/60 transition-all flex items-center justify-center gap-1 disabled:opacity-50"
              >
                <Check size={12} />
                Accept
              </button>
            )}
            {approvalStatus !== 'declined' && (
              <button
                onClick={() => handleUpdateApproval(player.id, 'declined')}
                disabled={updatingApproval === player.id}
                className="flex-1 py-2 rounded-lg bg-gradient-to-r from-red-500/20 to-rose-600/20 border border-red-500/40 text-red-300 text-xs font-bold hover:from-red-500/30 hover:to-rose-600/30 hover:border-red-500/60 transition-all flex items-center justify-center gap-1 disabled:opacity-50"
              >
                <X size={12} />
                Decline
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 p-4 pr-6 pb-12">
      {/* Gaming Theme Styles */}
      <style>{`
        @keyframes neon-pulse {
          0%, 100% { box-shadow: 0 0 5px rgba(236, 72, 153, 0.3), 0 0 20px rgba(236, 72, 153, 0.2); }
          50% { box-shadow: 0 0 10px rgba(236, 72, 153, 0.5), 0 0 30px rgba(236, 72, 153, 0.3); }
        }
        .neon-pulse { animation: neon-pulse 2s ease-in-out infinite; }
        .glass-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(236, 72, 153, 0.15);
        }
        .custom-scrollbar::-webkit-scrollbar { display: none; }
        .custom-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
      `}</style>

      {/* Header - Matches Players page exactly */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.2), rgba(180, 50, 120, 0.15))',
              border: '1px solid rgba(236, 72, 153, 0.4)',
              boxShadow: '0 0 15px rgba(236, 72, 153, 0.2)'
            }}
          >
            <Shield size={20} className="text-pink-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Applied Players</h1>
            <p className="text-pink-400/50 text-xs">{currentMatch?.name || 'Current Season'} — {counts.all} applications</p>
          </div>
        </div>

        {/* Search Bar + Exit Button */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-pink-400/50" />
            <input
              type="text"
              placeholder="Search applications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
            onClick={onClose}
            className="px-5 py-2.5 rounded-full bg-white/5 border border-pink-500/20 text-pink-300 hover:bg-pink-500/10 hover:border-pink-500/40 transition-all flex items-center gap-2 text-sm font-semibold"
          >
            <ArrowLeft size={16} />
            Exit
          </button>
        </div>
      </div>

      {/* Spacer between header and content */}
      <div className="mt-6" />

      {/* Stats Bar */}
      <div className="mb-4">
        <div className="grid grid-cols-4 gap-4">
          <div 
            className="rounded-xl p-4"
            style={{
              background: 'linear-gradient(145deg, rgba(20, 10, 25, 0.95), rgba(30, 15, 35, 0.9))',
              border: '1px solid rgba(236, 72, 153, 0.2)',
              borderLeft: '3px solid rgba(236, 72, 153, 0.6)'
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-pink-600/30 to-red-600/30 flex items-center justify-center border border-pink-500/20">
                <Users size={20} className="text-pink-400" />
              </div>
              <div>
                <p className="text-[10px] text-pink-400/50 uppercase font-bold">Total Applications</p>
                <p className="text-xl font-black text-white">{counts.all}</p>
              </div>
            </div>
          </div>
          
          <div 
            className="rounded-xl p-4"
            style={{
              background: 'linear-gradient(145deg, rgba(20, 10, 25, 0.95), rgba(30, 15, 35, 0.9))',
              border: '1px solid rgba(236, 72, 153, 0.2)',
              borderLeft: '3px solid rgba(34, 197, 94, 0.6)'
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-green-600/30 to-emerald-600/30 flex items-center justify-center border border-green-500/20">
                <Check size={20} className="text-green-400" />
              </div>
              <div>
                <p className="text-[10px] text-pink-400/50 uppercase font-bold">Accepted</p>
                <p className="text-xl font-black text-green-300">{counts.accepted}</p>
              </div>
            </div>
          </div>
          
          <div 
            className="rounded-xl p-4"
            style={{
              background: 'linear-gradient(145deg, rgba(20, 10, 25, 0.95), rgba(30, 15, 35, 0.9))',
              border: '1px solid rgba(236, 72, 153, 0.2)',
              borderLeft: '3px solid rgba(245, 158, 11, 0.6)'
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-amber-600/30 to-yellow-600/30 flex items-center justify-center border border-amber-500/20">
                <Clock size={20} className="text-amber-400" />
              </div>
              <div>
                <p className="text-[10px] text-pink-400/50 uppercase font-bold">Pending</p>
                <p className="text-xl font-black text-amber-300">{counts.pending}</p>
              </div>
            </div>
          </div>

          <div 
            className="rounded-xl p-4"
            style={{
              background: 'linear-gradient(145deg, rgba(20, 10, 25, 0.95), rgba(30, 15, 35, 0.9))',
              border: '1px solid rgba(236, 72, 153, 0.2)',
              borderLeft: '3px solid rgba(239, 68, 68, 0.6)'
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-red-600/30 to-rose-600/30 flex items-center justify-center border border-red-500/20">
                <Ban size={20} className="text-red-400" />
              </div>
              <div>
                <p className="text-[10px] text-pink-400/50 uppercase font-bold">Declined</p>
                <p className="text-xl font-black text-red-300">{counts.declined}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs + Controls */}
      <div className="mb-4 flex items-center gap-4">
        {/* Tabs */}
        <div 
          className="rounded-xl p-1 inline-flex"
          style={{
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(236, 72, 153, 0.15)'
          }}
        >
          <button
            onClick={() => setActiveTab('all')}
            className={`px-5 py-2 rounded-lg font-bold text-sm transition-all ${
              activeTab === 'all'
                ? 'text-white'
                : 'text-pink-300/60 hover:bg-pink-500/10'
            }`}
            style={activeTab === 'all' ? {
              background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.3), rgba(180, 50, 120, 0.2))',
              border: '1px solid rgba(236, 72, 153, 0.4)',
              boxShadow: '0 0 12px rgba(236, 72, 153, 0.15)'
            } : {}}
          >
            All ({counts.all})
          </button>
          <button
            onClick={() => setActiveTab('accepted')}
            className={`px-5 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-1.5 ${
              activeTab === 'accepted'
                ? 'text-white'
                : 'text-green-300/60 hover:bg-green-500/10'
            }`}
            style={activeTab === 'accepted' ? {
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(22, 163, 74, 0.2))',
              border: '1px solid rgba(34, 197, 94, 0.4)',
              boxShadow: '0 0 12px rgba(34, 197, 94, 0.15)'
            } : {}}
          >
            <Check size={14} />
            Accepted ({counts.accepted})
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-5 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-1.5 ${
              activeTab === 'pending'
                ? 'text-white'
                : 'text-amber-300/60 hover:bg-amber-500/10'
            }`}
            style={activeTab === 'pending' ? {
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.3), rgba(217, 119, 6, 0.2))',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              boxShadow: '0 0 12px rgba(245, 158, 11, 0.15)'
            } : {}}
          >
            <Clock size={14} />
            Pending ({counts.pending})
          </button>
          <button
            onClick={() => setActiveTab('declined')}
            className={`px-5 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-1.5 ${
              activeTab === 'declined'
                ? 'text-white'
                : 'text-red-300/60 hover:bg-red-500/10'
            }`}
            style={activeTab === 'declined' ? {
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(220, 38, 38, 0.2))',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              boxShadow: '0 0 12px rgba(239, 68, 68, 0.15)'
            } : {}}
          >
            <Ban size={14} />
            Declined ({counts.declined})
          </button>
        </div>

        {/* Clear Filters */}
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="p-2.5 rounded-xl text-pink-300 transition-all hover:bg-pink-500/10"
            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(236, 72, 153, 0.2)' }}
            title="Clear search"
          >
            <FilterX size={16} />
          </button>
        )}
      </div>

      {/* Applications Grid */}
      <div className="pb-6">
        {currentPlayers.length === 0 ? (
          <div 
            className="rounded-xl p-8 text-center"
            style={{
              background: 'linear-gradient(145deg, rgba(15, 8, 20, 0.8), rgba(25, 12, 30, 0.7))',
              border: '1px dashed rgba(236, 72, 153, 0.2)'
            }}
          >
            <Users size={32} className="text-pink-400/25 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">
              {searchTerm ? 'No applications match search' : `No ${activeTab === 'all' ? '' : activeTab} applications`}
            </h3>
            <p className="text-pink-400/30 text-xs">Applications will appear here once players register</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {currentPlayers.map(renderPlayerCard)}
          </div>
        )}
      </div>
    </div>
  );
};
