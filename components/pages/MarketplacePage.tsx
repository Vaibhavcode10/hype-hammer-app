import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Trophy, Calendar, Users, Play, Clock, MapPin, Filter, Search, Plus, ArrowLeft, Eye, UserPlus, Award } from 'lucide-react';
import { AuctionStatus, SportData, MatchData, UserRole } from '../../types';
import { CountdownDisplay } from '../ui/CountdownDisplay';
import { NeonDesignStyles, GlassCard, NeonButton, LiveBadge, GradientHeading, NeonPageWrapper, NeonSearchBar, FilterPill } from '../ui/NeonDesignSystem';

interface MarketplacePageProps {
  allSports: SportData[];
  setStatus: (status: AuctionStatus) => void;
  onSelectMatch: (sportType: string, matchId: string) => void;
  onViewLiveAuction: (sportType: string, matchId: string) => void;
  onCreateSeason: () => void;
  currentUserRole?: UserRole;
}

type FilterType = 'all' | 'upcoming' | 'ongoing' | 'completed';

const MarketplacePageComponent: React.FC<MarketplacePageProps> = ({
  allSports,
  setStatus,
  onSelectMatch,
  onViewLiveAuction,
  onCreateSeason,
  currentUserRole
}) => {
  console.log('🏪 MarketplacePage render - allSports length:', allSports.length);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Wait for allSports to load
  useEffect(() => {
    if (allSports && allSports.length > 0) {
      setIsLoading(false);
    }
  }, [allSports]);

  // Flatten all matches from all sports with their sport context
  // Status is computed by the backend, so we trust it
  const allMatches = useMemo(() => {
    console.log('📊 Recalculating allMatches from allSports');
    return allSports.flatMap(sport =>
      sport.matches.map(match => ({
        ...match,
        sportType: sport.sportType,
        sportName: sport.customSportName || sport.sportType
      }))
    );
  }, [allSports]);

  // Filter matches based on search and status (memoized)
  const filteredMatches = useMemo(() => allMatches.filter(match => {
    const matchesSearch = searchTerm === '' || 
      match.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      match.sportName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      match.place?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = 
      activeFilter === 'all' ||
      (activeFilter === 'upcoming' && match.status === 'SETUP') ||
      (activeFilter === 'ongoing' && match.status === 'ONGOING') ||
      (activeFilter === 'completed' && match.status === 'COMPLETED');

    return matchesSearch && matchesFilter;
  }), [allMatches, searchTerm, activeFilter]);

  // Group by status for display (memoized to prevent recalculation)
  const upcomingMatches = useMemo(() => filteredMatches.filter(m => m.status === 'SETUP'), [filteredMatches]);
  const ongoingMatches = useMemo(() => filteredMatches.filter(m => m.status === 'ONGOING'), [filteredMatches]);
  const completedMatches = useMemo(() => filteredMatches.filter(m => m.status === 'COMPLETED'), [filteredMatches]);

  const getStatusBadge = useCallback((status: string) => {
    switch (status) {
      case 'SETUP':
        return <span className="px-3 py-1 rounded-full text-xs font-bold text-blue-300" style={{ background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.4)' }}>UPCOMING</span>;
      case 'ONGOING':
        return <LiveBadge />;
      case 'COMPLETED':
        return <span className="px-3 py-1 rounded-full text-xs font-bold text-pink-300/60" style={{ background: 'rgba(255, 0, 102, 0.1)', border: '1px solid rgba(255, 0, 102, 0.3)' }}>COMPLETED</span>;
      default:
        return null;
    }
  }, []);

  const renderMatchCard = useCallback((match: MatchData & { sportType: string; sportName: string }) => {
    const budgetPool = ((match.config?.totalBudget || 10000000) * match.teams.length / 10000000).toFixed(1);
    const playersSold = (match.history?.length || 0);
    const totalPlayers = match.players.length;
    
    return (
    <GlassCard
      key={`${match.sportType}-${match.id}`}
      glow
      className="group hover:scale-[1.02] transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider text-white" style={{ background: 'linear-gradient(135deg, #ff0066, #ff4d94)' }}>
              {match.sportName}
            </span>
            {getStatusBadge(match.status)}
          </div>
          <h3 className="text-xl font-black text-pink-100 group-hover:text-pink-300 transition-colors">
            {match.name}
          </h3>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex items-center gap-2 text-sm text-pink-300/70">
          <Calendar className="w-4 h-4 text-pink-400" />
          <span>{match.matchDate ? new Date(match.matchDate).toLocaleDateString() : match.createdAt ? new Date(match.createdAt).toLocaleDateString() : 'TBD'}</span>
        </div>
        {match.place && (
          <div className="flex items-center gap-2 text-sm text-pink-300/70">
            <MapPin className="w-4 h-4 text-pink-400" />
            <span>{match.place}</span>
          </div>
        )}
      </div>

      {/* Countdown */}
      <div className="mb-4 py-2 px-3 rounded-lg" style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.2)' }}>
        <CountdownDisplay
          targetDate={match.auctionDateTime || match.matchDate}
          auctionStatus={match.status}
        />
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <NeonButton
          fullWidth
          variant="primary"
          onClick={(e) => {
            e.stopPropagation();
            onSelectMatch(match.sportType, match.id);
          }}
        >
          <UserPlus className="w-4 h-4" />
          Apply for Auction
        </NeonButton>
        {match.status === 'COMPLETED' ? (
          <NeonButton
            fullWidth
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              onViewLiveAuction(match.sportType, match.id);
            }}
          >
            <Award className="w-4 h-4" />
            See Results
          </NeonButton>
        ) : (
          <NeonButton
            fullWidth
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              onViewLiveAuction(match.sportType, match.id);
            }}
          >
            <Eye className="w-4 h-4" />
            View Live Auction
          </NeonButton>
        )}
      </div>
    </GlassCard>
    );
  }, [onSelectMatch, onViewLiveAuction, getStatusBadge]);

  return (
    <NeonPageWrapper className="min-h-screen">
      <NeonDesignStyles />
      
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl" style={{ background: 'rgba(26, 10, 10, 0.95)', borderBottom: '1px solid rgba(255, 0, 102, 0.2)' }}>
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo & Back */}
            <div className="flex items-center gap-6">
              <button
                onClick={() => setStatus(AuctionStatus.HOME)}
                className="flex items-center gap-2 text-pink-300/70 hover:text-pink-300 transition-colors"
              >
                <ArrowLeft size={20} />
                <span className="text-sm font-bold">Home</span>
              </button>
              <div className="h-8 w-px" style={{ background: 'rgba(255, 0, 102, 0.3)' }}></div>
              <GradientHeading size="lg">
                Auction Marketplace
              </GradientHeading>
            </div>

            {/* Create Season Button (Only for potential organizers) */}
            <NeonButton variant="primary" onClick={onCreateSeason}>
              <Plus size={18} />
              Organize Season
            </NeonButton>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-8 pt-28 pb-12">
        {/* Search & Filters */}
        <div className="mb-8 space-y-4">
          {/* Search Bar */}
          <NeonSearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search auctions by name, sport, or location..."
          />

          {/* Filter Pills */}
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-pink-400/60" />
            <div className="flex gap-2 flex-wrap">
              {[
                { key: 'all', label: 'All Auctions', count: allMatches.length },
                { key: 'upcoming', label: 'Upcoming', count: upcomingMatches.length },
                { key: 'ongoing', label: 'Live Now', count: ongoingMatches.length },
                { key: 'completed', label: 'Completed', count: completedMatches.length }
              ].map((filter) => (
                <FilterPill
                  key={filter.key}
                  label={`${filter.label} (${filter.count})`}
                  active={activeFilter === filter.key}
                  onClick={() => setActiveFilter(filter.key as FilterType)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-16 h-16 rounded-full" style={{ border: '4px solid rgba(255, 0, 102, 0.2)', borderTop: '4px solid #ff0066', animation: 'spin 1s linear infinite' }}></div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredMatches.length === 0 && (
          <div className="text-center py-20">
            <Trophy className="w-20 h-20 mx-auto mb-6 text-pink-400/30" />
            <GradientHeading size="lg" className="mb-2">No Auctions Found</GradientHeading>
            <p className="text-pink-300/70 mb-8">
              {searchTerm ? 'Try adjusting your search terms' : 'Be the first to organize an auction!'}
            </p>
            <NeonButton variant="primary" onClick={onCreateSeason}>
              Create Your First Season
            </NeonButton>
          </div>
        )}

        {/* Live Now Section */}
        {!isLoading && ongoingMatches.length > 0 && (activeFilter === 'all' || activeFilter === 'ongoing') && (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" style={{ boxShadow: '0 0 10px rgba(34, 197, 94, 0.5)' }}></div>
              <GradientHeading size="lg">Live Auctions</GradientHeading>
              <span className="text-sm text-pink-300/50">({ongoingMatches.length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ongoingMatches.map(renderMatchCard)}
            </div>
          </div>
        )}

        {/* Upcoming Section */}
        {!isLoading && upcomingMatches.length > 0 && (activeFilter === 'all' || activeFilter === 'upcoming') && (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <Clock className="w-6 h-6 text-pink-400" />
              <GradientHeading size="lg">Upcoming Auctions</GradientHeading>
              <span className="text-sm text-pink-300/50">({upcomingMatches.length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingMatches.map(renderMatchCard)}
            </div>
          </div>
        )}

        {/* Completed Section */}
        {!isLoading && completedMatches.length > 0 && (activeFilter === 'all' || activeFilter === 'completed') && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <Trophy className="w-6 h-6 text-pink-400/60" />
              <GradientHeading size="lg">Completed Auctions</GradientHeading>
              <span className="text-sm text-pink-300/50">({completedMatches.length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedMatches.map(renderMatchCard)}
            </div>
          </div>
        )}
      </div>

      {/* Support Footer */}
      <div className="py-8 text-center" style={{ borderTop: '1px solid rgba(255, 0, 102, 0.1)' }}>
        <p className="text-xs text-pink-300/50 font-medium">
          Support{' '}
          <span className="mx-2 text-pink-300/30">•</span>
          <a href="mailto:hypehammer.mail@gmail.com" className="text-pink-400/70 hover:text-pink-400 transition-colors">
            hypehammer.mail@gmail.com
          </a>
        </p>
      </div>
    </NeonPageWrapper>
  );
};

// Memoize to prevent unnecessary re-renders when parent re-renders
export const MarketplacePage = React.memo(MarketplacePageComponent);
