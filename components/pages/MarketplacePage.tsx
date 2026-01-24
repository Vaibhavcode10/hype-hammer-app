import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Trophy, Calendar, Users, Play, Clock, MapPin, Filter, Search, Plus, ArrowLeft } from 'lucide-react';
import { AuctionStatus, SportData, MatchData, UserRole } from '../../types';

interface MarketplacePageProps {
  allSports: SportData[];
  setStatus: (status: AuctionStatus) => void;
  onSelectMatch: (sportType: string, matchId: string) => void;
  onCreateSeason: () => void;
  currentUserRole?: UserRole;
}

type FilterType = 'all' | 'upcoming' | 'ongoing' | 'completed';

const MarketplacePageComponent: React.FC<MarketplacePageProps> = ({
  allSports,
  setStatus,
  onSelectMatch,
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

  // Flatten all matches from all sports with their sport context (memoized to prevent recalculation)
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
        return <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-xs font-bold">UPCOMING</span>;
      case 'ONGOING':
        return <span className="px-3 py-1 bg-green-100 text-green-600 rounded-full text-xs font-bold animate-pulse">LIVE NOW</span>;
      case 'COMPLETED':
        return <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold">COMPLETED</span>;
      default:
        return null;
    }
  }, []);

  const renderMatchCard = useCallback((match: MatchData & { sportType: string; sportName: string }) => {
    const budgetPool = ((match.config?.totalBudget || 10000000) * match.teams.length / 10000000).toFixed(1);
    const playersSold = (match.history?.length || 0);
    const totalPlayers = match.players.length;
    
    return (
    <div
      key={`${match.sportType}-${match.id}`}
      className="bg-white border-2 border-slate-200 rounded-2xl p-6 hover:border-blue-500 hover:shadow-xl transition-all group cursor-pointer"
      onClick={() => onSelectMatch(match.sportType, match.id)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-1 bg-gradient-to-r from-blue-500 to-orange-500 text-white rounded text-[10px] font-black uppercase tracking-wider">
              {match.sportName}
            </span>
            {getStatusBadge(match.status)}
          </div>
          <h3 className="text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">
            {match.name}
          </h3>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Calendar className="w-4 h-4 text-blue-500" />
          <span>{match.matchDate ? new Date(match.matchDate).toLocaleDateString() : match.createdAt ? new Date(match.createdAt).toLocaleDateString() : 'TBD'}</span>
        </div>
        {match.place && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <MapPin className="w-4 h-4 text-orange-500" />
            <span>{match.place}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Users className="w-4 h-4 text-blue-500" />
          <span>{match.teams.length} Teams</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Trophy className="w-4 h-4 text-orange-500" />
          <span>{totalPlayers} Players</span>
        </div>
      </div>

      {/* Auction Stats */}
      <div className="bg-slate-50 rounded-lg p-3 mb-4">
        <div className="flex justify-between text-xs">
          <span className="text-slate-600">Budget Pool</span>
          <span className="font-bold text-slate-900">₹{budgetPool}Cr</span>
        </div>
        <div className="flex justify-between text-xs mt-2">
          <span className="text-slate-600">Players Sold</span>
          <span className="font-bold text-green-600">{playersSold} / {totalPlayers}</span>
        </div>
      </div>

      {/* Action Button */}
      <button
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-orange-500 text-white rounded-lg font-bold uppercase text-sm tracking-wider hover:brightness-110 transition-all group-hover:scale-105"
        onClick={(e) => {
          e.stopPropagation();
          onSelectMatch(match.sportType, match.id);
        }}
      >
        <Play className="w-4 h-4" fill="currentColor" />
        {match.status === 'COMPLETED' ? 'View Results' : match.status === 'ONGOING' ? 'Join Live' : 'Register Now'}
      </button>
    </div>
    );
  }, [onSelectMatch, getStatusBadge]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-orange-50">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo & Back */}
            <div className="flex items-center gap-6">
              <button
                onClick={() => setStatus(AuctionStatus.HOME)}
                className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors"
              >
                <ArrowLeft size={20} />
                <span className="text-sm font-bold">Home</span>
              </button>
              <div className="h-8 w-px bg-slate-300"></div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                <span className="gold-text">Auction</span> Marketplace
              </h1>
            </div>

            {/* Create Season Button (Only for potential organizers) */}
            <button
              onClick={onCreateSeason}
              className="flex items-center gap-2 px-6 py-3 gold-gradient text-white rounded-full font-bold text-sm uppercase tracking-wider hover:brightness-110 transition-all shadow-lg"
            >
              <Plus size={18} />
              Organize Season
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-8 pt-28 pb-12">
        {/* Search & Filters */}
        <div className="mb-8 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search auctions by name, sport, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none text-slate-900 placeholder-slate-400 font-medium"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-slate-500" />
            <div className="flex gap-2 flex-wrap">
              {[
                { key: 'all', label: 'All Auctions', count: allMatches.length },
                { key: 'upcoming', label: 'Upcoming', count: upcomingMatches.length },
                { key: 'ongoing', label: 'Live Now', count: ongoingMatches.length },
                { key: 'completed', label: 'Completed', count: completedMatches.length }
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setActiveFilter(filter.key as FilterType)}
                  className={`px-4 py-2 rounded-full font-bold text-sm transition-all ${
                    activeFilter === filter.key
                      ? 'gold-gradient text-white shadow-lg'
                      : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-blue-500'
                  }`}
                >
                  {filter.label} ({filter.count})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredMatches.length === 0 && (
          <div className="text-center py-20">
            <Trophy className="w-20 h-20 mx-auto mb-6 text-slate-300" />
            <h3 className="text-2xl font-bold text-slate-900 mb-2">No Auctions Found</h3>
            <p className="text-slate-600 mb-8">
              {searchTerm ? 'Try adjusting your search terms' : 'Be the first to organize an auction!'}
            </p>
            <button
              onClick={onCreateSeason}
              className="px-8 py-4 gold-gradient text-white rounded-full font-bold uppercase tracking-wider hover:brightness-110 transition-all shadow-lg"
            >
              Create Your First Season
            </button>
          </div>
        )}

        {/* Live Now Section */}
        {!isLoading && ongoingMatches.length > 0 && (activeFilter === 'all' || activeFilter === 'ongoing') && (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <h2 className="text-2xl font-black text-slate-900">Live Auctions</h2>
              <span className="text-sm text-slate-500">({ongoingMatches.length})</span>
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
              <Clock className="w-6 h-6 text-blue-500" />
              <h2 className="text-2xl font-black text-slate-900">Upcoming Auctions</h2>
              <span className="text-sm text-slate-500">({upcomingMatches.length})</span>
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
              <Trophy className="w-6 h-6 text-gray-500" />
              <h2 className="text-2xl font-black text-slate-900">Completed Auctions</h2>
              <span className="text-sm text-slate-500">({completedMatches.length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedMatches.map(renderMatchCard)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Memoize to prevent unnecessary re-renders when parent re-renders
export const MarketplacePage = React.memo(MarketplacePageComponent);
