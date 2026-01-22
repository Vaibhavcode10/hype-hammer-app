import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Settings, Gavel, 
  TrendingUp, X, History, ArrowLeft, Activity,
  Users, Trophy
} from 'lucide-react';
import {
  AuctionStatus, 
  AuctionConfig, Player, Team, Bid, SportData, MatchData, SportType, AuctionType, UserRole
} from './types';
import { INITIAL_CONFIG, SPORT_DEFAULTS } from './constants';
import { getAuctionInsights } from './services/geminiService';
import { loadAppState, saveAppState, loadSportsData, saveSportsData, loadAllSportsFromDB } from './services/storageService';
import { registerAuctioneer, registerTeam, registerPlayer, registerGuest } from './services/apiService';

// Import Components
import {
  HUDPill, OrbitalItem, SoldCelebration, SettingsSidebar,
  HomePage, MarketplacePage, AuthPage, AdminRegistrationPage, RoleSelectionPage, RoleBasedRegistrationPage, ProfileCompletionPage, HowItWorksPage, SettingsPage, SettingsLayoutPage, PlayersPage, TeamsPage, AuctionRoomPage, HistoryPage,
  PlayerModal, TeamModal, SquadModal, PlayerDashboardPage, PlayerRegistrationPage, AdminDashboardPage, AuctioneerDashboardPage, TeamRepDashboardPage, GuestDashboardPage
} from './components';

// --- Core Application ---

const AppContent: React.FC = () => {
  const navigate = useNavigate();

  // Map status to route paths (one-way navigation to avoid loops)
  const statusToPath: Record<AuctionStatus, string> = {
    [AuctionStatus.HOME]: '/',
    [AuctionStatus.MARKETPLACE]: '/marketplace',
    [AuctionStatus.AUTH]: '/login',
    [AuctionStatus.ADMIN_REGISTRATION]: '/admin/register',
    [AuctionStatus.ROLE_SELECTION]: '/role/select',
    [AuctionStatus.ROLE_REGISTRATION]: '/role/register',
    [AuctionStatus.PROFILE_COMPLETION]: '/profile/complete',
    [AuctionStatus.HOW_IT_WORKS]: '/how-it-works',
    [AuctionStatus.SETUP]: '/auction',
    [AuctionStatus.MATCHES]: '/marketplace',
    [AuctionStatus.READY]: '/auction',
    [AuctionStatus.LIVE]: '/auction',
    [AuctionStatus.PAUSED]: '/auction',
    [AuctionStatus.ENDED]: '/auction',
    [AuctionStatus.SETTINGS]: '/settings',
    [AuctionStatus.PLAYER_REGISTRATION]: '/player/register',
    [AuctionStatus.PLAYER_DASHBOARD]: '/player/dashboard',
    [AuctionStatus.ADMIN_DASHBOARD]: '/admin/dashboard',
    [AuctionStatus.AUCTIONEER_DASHBOARD]: '/auctioneer/dashboard',
    [AuctionStatus.TEAM_REP_DASHBOARD]: '/team-rep/dashboard',
    [AuctionStatus.GUEST_DASHBOARD]: '/guest/dashboard'
  };

  // Reverse mapping: path to status (for refreshes and back button)
  const pathToStatus: Record<string, AuctionStatus> = {
    '/': AuctionStatus.HOME,
    '/marketplace': AuctionStatus.MARKETPLACE,
    '/login': AuctionStatus.AUTH,
    '/admin/register': AuctionStatus.ADMIN_REGISTRATION,
    '/role/select': AuctionStatus.ROLE_SELECTION,
    '/role/register': AuctionStatus.ROLE_REGISTRATION,
    '/profile/complete': AuctionStatus.PROFILE_COMPLETION,
    '/how-it-works': AuctionStatus.HOW_IT_WORKS,
    '/auction': AuctionStatus.READY,
    '/settings': AuctionStatus.SETTINGS,
    '/player/register': AuctionStatus.PLAYER_REGISTRATION,
    '/player/dashboard': AuctionStatus.PLAYER_DASHBOARD,
    '/admin/dashboard': AuctionStatus.ADMIN_DASHBOARD,
    '/auctioneer/dashboard': AuctionStatus.AUCTIONEER_DASHBOARD,
    '/team-rep/dashboard': AuctionStatus.TEAM_REP_DASHBOARD,
    '/guest/dashboard': AuctionStatus.GUEST_DASHBOARD
  };
  // Load initial state from backend
  const loadInitialState = async () => {
    const savedState = await loadAppState();
    if (savedState) {
      return {
        status: savedState.status || AuctionStatus.HOME,
        currentSport: savedState.currentSport || null,
        currentMatchId: savedState.currentMatchId || null,
        activeTab: savedState.activeTab || 'dashboard'
      };
    }
    return {
      status: AuctionStatus.HOME,
      currentSport: null,
      currentMatchId: null,
      activeTab: 'dashboard' as const
    };
  };

  // Initialize state with default values (will be loaded in useEffect)
  const [status, setStatus] = useState<AuctionStatus>(() => {
    // Try to restore status from sessionStorage first
    const savedStatus = sessionStorage.getItem('hypehammer_current_status');
    if (savedStatus) {
      return savedStatus as AuctionStatus;
    }
    // Otherwise, derive from current URL path
    const currentPath = window.location.pathname;
    return pathToStatus[currentPath] || AuctionStatus.HOME;
  });
  const [pendingDashboardStatus, setPendingDashboardStatus] = useState<AuctionStatus | null>(null);
  
  // User state - restore from sessionStorage on refresh
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = sessionStorage.getItem('hypehammer_current_user');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch (e) {
        console.error('Error parsing saved user:', e);
      }
    }
    return {
      name: 'Guest User',
      email: 'guest@hypehammer.com',
      avatar: undefined,
      role: UserRole.AUCTIONEER,
      playerId: undefined as string | undefined
    };
  });

  // OAuth user pending profile completion
  const [pendingOAuthUser, setPendingOAuthUser] = useState<any>(null);
  
  // Role selection state for registration flow
  const [selectedRoleForRegistration, setSelectedRoleForRegistration] = useState<UserRole | null>(null);
  
  // Settings sidebar state
  const [isSettingsSidebarOpen, setIsSettingsSidebarOpen] = useState(false);
  
  // Multi-sport, multi-match state - restore from sessionStorage
  const [allSports, setAllSports] = useState<SportData[]>([]);
  const [currentSport, setCurrentSport] = useState<string | null>(() => {
    return sessionStorage.getItem('hypehammer_current_sport') || null;
  });
  const [currentMatchId, setCurrentMatchId] = useState<string | null>(() => {
    return sessionStorage.getItem('hypehammer_current_match_id') || null;
  });
  
  // Current match data (derived from allSports)
  const currentSportData = useMemo(() => {
    return allSports.find(s => 
      s.sportType === currentSport || s.customSportName === currentSport
    );
  }, [allSports, currentSport]);

  const currentMatch = useMemo(() => {
    if (!currentSportData || !currentMatchId) {
      console.log('📊 currentMatch is NULL - currentSportData:', !!currentSportData, 'currentMatchId:', currentMatchId);
      return null;
    }
    const match = currentSportData.matches.find(m => m.id === currentMatchId);
    console.log('📊 currentMatch computed:', match?.name);
    return match;
  }, [currentSportData, currentMatchId]);

  // Log status on every render
  console.log('🔄 App render - status:', status, 'currentUser.role:', currentUser.role, 'currentMatch:', currentMatch?.id);

  // Current match state (for active auction)
  const [config, setConfig] = useState<AuctionConfig>(INITIAL_CONFIG);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [history, setHistory] = useState<Bid[]>([]);
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'players' | 'teams' | 'room' | 'history'>('dashboard');
  const [isNavExpanded, setIsNavExpanded] = useState(false);

  const [playerSearch, setPlayerSearch] = useState('');
  const [teamSearch, setTeamSearch] = useState('');
  const [aiInsights, setAiInsights] = useState<string[]>([]);

  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isSquadModalOpen, setIsSquadModalOpen] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [viewingSquadTeamId, setViewingSquadTeamId] = useState<string | null>(null);

  const [soldAnimationData, setSoldAnimationData] = useState<{ player: Player; team: Team; price: number } | null>(null);

  const [newPlayer, setNewPlayer] = useState<Partial<Player>>({ 
    name: '', roleId: '', basePrice: 0, isOverseas: false, imageUrl: '', 
    age: 25, nationality: '', bio: '', stats: '' 
  });
  const [newTeam, setNewTeam] = useState<Partial<Team>>({ 
    name: '', owner: '', budget: 0, logo: '', 
    homeCity: '', foundationYear: 2024 
  });

  const [currentPlayerIdx, setCurrentPlayerIdx] = useState<number | null>(null);
  const [currentBid, setCurrentBid] = useState<number>(0);
  const [currentBidderId, setCurrentBidderId] = useState<string | null>(null);
  const [timer, setTimer] = useState(30);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [auctionRound, setAuctionRound] = useState(1);

  // Load saved state on mount
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        // Load app state
        const savedState = await loadAppState();
        if (savedState && savedState.status) {
          // Only restore valid persistent statuses (not transitional ones like MATCHES, SETUP, READY)
          const persistentStatuses = [
            AuctionStatus.HOME,
            AuctionStatus.MARKETPLACE,
            AuctionStatus.ADMIN_DASHBOARD,
            AuctionStatus.AUCTIONEER_DASHBOARD,
            AuctionStatus.TEAM_REP_DASHBOARD,
            AuctionStatus.PLAYER_DASHBOARD,
            AuctionStatus.GUEST_DASHBOARD,
            AuctionStatus.SETTINGS
          ];
          
          if (persistentStatuses.includes(savedState.status as AuctionStatus)) {
            setStatus(savedState.status as AuctionStatus);
            setCurrentSport(savedState.currentSport);
            setCurrentMatchId(savedState.currentMatchId);
            setActiveTab(savedState.activeTab as any);
          } else {
            // For deprecated/transitional statuses, go to HOME
            console.warn('⚠️ Skipping deprecated status from localStorage:', savedState.status);
            setStatus(AuctionStatus.HOME);
          }
        }

        // Load from localStorage immediately for instant display
        const localData = localStorage.getItem('hypehammer_sports');
        if (localData) {
          try {
            const parsedData = JSON.parse(localData);
            if (parsedData && parsedData.length > 0) {
              console.log('📦 Loaded cached sports data from localStorage');
              setAllSports(parsedData);
            }
          } catch (err) {
            console.error('Error parsing local storage:', err);
          }
        }

        // Try API to get fresh data (source of truth)
        const sportsFromDB = await loadAllSportsFromDB();
        if (sportsFromDB && sportsFromDB.length > 0) {
          console.log('✅ Loaded fresh sports data from Firebase');
          // Only update if data actually changed (deep comparison via JSON)
          const currentData = localStorage.getItem('hypehammer_sports');
          const newData = JSON.stringify(sportsFromDB);
          if (currentData !== newData) {
            console.log('📊 Data changed, updating state');
            setAllSports(sportsFromDB);
            localStorage.setItem('hypehammer_sports', newData);
          } else {
            console.log('✓ Data unchanged, skipping update');
          }
          return; // Exit here - we got fresh data from API
        }

        // If API returned nothing but we had localStorage data, keep using it
        if (localData) {
          console.log('⚠️ API returned no data, keeping cached data');
          return;
        }

        // If we get here, no data from API or localStorage
        console.log('No auction data found. Start by creating an auction.');
        setAllSports([]);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadSavedData();
  }, []);

  // Navigate to pending dashboard once currentMatch is ready
  useEffect(() => {
    if (pendingDashboardStatus && currentMatch) {
      console.log('✅ currentMatch ready, navigating to:', pendingDashboardStatus);
      setStatus(pendingDashboardStatus);
      setPendingDashboardStatus(null);
    }
  }, [pendingDashboardStatus, currentMatch]);

  // One-way sync status to URL (prevents view loops)
  useEffect(() => {
    const path = statusToPath[status] || '/';
    // Use push for history support, but only if URL actually changed
    const currentPath = window.location.pathname;
    if (currentPath !== path) {
      navigate(path);
    }
    // Save current status to sessionStorage for refresh persistence
    sessionStorage.setItem('hypehammer_current_status', status);
  }, [status, navigate]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const currentPath = window.location.pathname;
      const newStatus = pathToStatus[currentPath];
      if (newStatus && newStatus !== status) {
        console.log('🔙 Browser back/forward detected. Changing status from', status, 'to', newStatus);
        setStatus(newStatus);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [status]);

  // Save user state to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem('hypehammer_current_user', JSON.stringify(currentUser));
  }, [currentUser]);

  // Save current sport and match to sessionStorage whenever they change
  useEffect(() => {
    if (currentSport) {
      sessionStorage.setItem('hypehammer_current_sport', currentSport);
    }
  }, [currentSport]);

  useEffect(() => {
    if (currentMatchId) {
      sessionStorage.setItem('hypehammer_current_match_id', currentMatchId);
    }
  }, [currentMatchId]);

  // Save app state to JSON file whenever key state changes
  useEffect(() => {
    const stateToSave = {
      status,
      currentSport,
      currentMatchId,
      activeTab
    };
    saveAppState(stateToSave);
  }, [status, currentSport, currentMatchId, activeTab]);

  // NOTE: Disabled auto-save to prevent infinite loops and ERR_INSUFFICIENT_RESOURCES
  // Sports data is now managed through Firebase, not local JSON files
  // useEffect(() => {
  //   saveSportsData(allSports);
  //   localStorage.setItem('hypehammer_sports', JSON.stringify(allSports));
  // }, [allSports]);

  // Update allSports whenever current match's players/teams change
  useEffect(() => {
    if (!currentMatch || !currentSportData) return;

    // Avoid infinite loops by only writing when something actually changed
    setAllSports(prev => prev.map(sport => {
      if (sport.sportType === currentSportData.sportType && 
          sport.customSportName === currentSportData.customSportName) {
        return {
          ...sport,
          matches: sport.matches.map(match => {
            if (match.id !== currentMatch.id) return match;

            const isSamePlayers = JSON.stringify(match.players) === JSON.stringify(players);
            const isSameTeams = JSON.stringify(match.teams) === JSON.stringify(teams);
            const isSameHistory = JSON.stringify(match.history) === JSON.stringify(history);

            if (isSamePlayers && isSameTeams && isSameHistory) return match; // no-op

            return {
              ...match,
              players,
              teams,
              history
            };
          })
        };
      }
      return sport;
    }));
  }, [players, teams, history, currentMatch, currentSport]);

  // Multi-sport/match management functions
  const handleSelectSport = (sportType: SportType, customName?: string) => {
    const sportIdentifier = sportType === SportType.CUSTOM && customName ? customName : sportType;
    
    // Check if sport already exists
    let sport = allSports.find(s => 
      s.sportType === sportType && 
      (sportType !== SportType.CUSTOM || s.customSportName === customName)
    );

    // If sport doesn't exist, create it
    if (!sport) {
      sport = {
        sportType,
        customSportName: sportType === SportType.CUSTOM ? customName : undefined,
        matches: []
      };
      setAllSports(prev => [...prev, sport!]);
    }

    setCurrentSport(sportIdentifier);
    setCurrentMatchId(null);
    setPlayers([]);
    setTeams([]);
    setStatus(AuctionStatus.MATCHES);
  };

  const handleCreateMatch = (matchName: string, matchDate?: number, place?: string) => {
    if (!currentSport || !currentSportData) return;

    // Get sport-specific defaults
    const sportDefaults = SPORT_DEFAULTS[currentSportData.sportType];
    const sportConfig: AuctionConfig = {
      sport: currentSportData.sportType,
      customSportName: currentSportData.customSportName,
      type: AuctionType.OPEN,
      level: 'Professional',
      squadSize: sportDefaults.squadSize || { min: 1, max: 100 },
      totalBudget: sportDefaults.totalBudget || 1000000,
      roles: sportDefaults.roles || [{ id: 'player', name: 'Player' }],
      rules: sportDefaults.rules || {}
    };

    // Start with empty teams and players - user will add their own
    const freshTeams: Team[] = [];
    const freshPlayers: Player[] = [];

    const newMatch: MatchData = {
      id: `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: matchName,
      createdAt: Date.now(),
      matchDate,
      place,
      config: sportConfig,
      players: freshPlayers,
      teams: freshTeams,
      history: [],
      status: 'SETUP'
    };

    setAllSports(prev => prev.map(sport => {
      if (sport.sportType === currentSportData.sportType && 
          sport.customSportName === currentSportData.customSportName) {
        return { ...sport, matches: [...sport.matches, newMatch] };
      }
      return sport;
    }));

    // Stay on Matches page - don't auto-navigate
  };

  const handleUpdateMatch = (matchId: string, matchName: string, matchDate?: number, place?: string) => {
    if (!currentSportData) return;

    setAllSports(prev => prev.map(sport => {
      if (sport.sportType === currentSportData.sportType && 
          sport.customSportName === currentSportData.customSportName) {
        return {
          ...sport,
          matches: sport.matches.map(match => 
            match.id === matchId
              ? { ...match, name: matchName, matchDate, place }
              : match
          )
        };
      }
      return sport;
    }));
  };

  const handleSelectMatch = (matchId: string) => {
    const match = currentSportData?.matches.find(m => m.id === matchId);
    if (match) {
      setCurrentMatchId(matchId);
      loadMatch(match);
      setStatus(AuctionStatus.READY);
    }
  };

  const handleDeleteMatch = (matchId: string) => {
    if (!currentSportData) return;

    setAllSports(prev => prev.map(sport => {
      if (sport.sportType === currentSportData.sportType && 
          sport.customSportName === currentSportData.customSportName) {
        return { ...sport, matches: sport.matches.filter(m => m.id !== matchId) };
      }
      return sport;
    }));

    // If deleted match was current, clear selection
    if (currentMatchId === matchId) {
      setCurrentMatchId(null);
    }
  };

  const loadMatch = (match: MatchData) => {
    setConfig(match.config);
    setPlayers(match.players);
    setTeams(match.teams);
    setHistory(match.history);
    setActiveTab('dashboard');
  };

  const saveCurrentMatch = useCallback(() => {
    if (!currentMatchId || !currentSportData) return;

    setAllSports(prev => prev.map(sport => {
      if (sport.sportType === currentSportData.sportType && 
          sport.customSportName === currentSportData.customSportName) {
        return {
          ...sport,
          matches: sport.matches.map(match => {
            if (match.id === currentMatchId) {
              return {
                ...match,
                config,
                players,
                teams,
                history,
                status: history.length > 0 ? (players.every(p => p.status !== 'PENDING') ? 'COMPLETED' : 'ONGOING') : 'SETUP'
              };
            }
            return match;
          })
        };
      }
      return sport;
    }));
  }, [currentMatchId, currentSportData, config, players, teams, history, allSports]);

  // Clear players/teams if no match is selected
  useEffect(() => {
    if (!currentMatch) {
      setPlayers([]);
      setTeams([]);
      setConfig(INITIAL_CONFIG);
    }
  }, [currentMatch]);

  // Auto-load current match data when match changes
  useEffect(() => {
    if (currentMatch && currentMatchId) {
      loadMatch(currentMatch);
    }
  }, [currentMatch, currentMatchId]);

  // Auto-save match data whenever it changes
  useEffect(() => {
    if (currentMatchId && status === AuctionStatus.READY) {
      saveCurrentMatch();
    }
  }, [players, teams, history, config]);

  const handleBackToMatches = () => {
    saveCurrentMatch();
    setCurrentMatchId(null);
    setStatus(AuctionStatus.MATCHES);
  };

  const handleBackToSetup = () => {
    setCurrentSport(null);
    setCurrentMatchId(null);
    setStatus(AuctionStatus.SETUP);
  };

  // Player registration handler
  const handlePlayerRegister = (sportId: string, matchId: string, playerData: Partial<Player>) => {
    const [sportType, customName] = sportId.split('-');
    
    const newPlayer: Player = {
      id: `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: playerData.name!,
      roleId: playerData.roleId!,
      basePrice: playerData.basePrice!,
      isOverseas: playerData.isOverseas || false,
      status: 'PENDING',
      imageUrl: playerData.imageUrl,
      age: playerData.age,
      nationality: playerData.nationality,
      bio: playerData.bio,
      stats: playerData.stats
    };

    // Add player to the selected match
    setAllSports(prev => prev.map(sport => {
      if (`${sport.sportType}-${sport.customSportName || ''}` === sportId) {
        return {
          ...sport,
          matches: sport.matches.map(match => 
            match.id === matchId
              ? { ...match, players: [...match.players, newPlayer] }
              : match
          )
        };
      }
      return sport;
    }));

    // Update current user with player ID
    setCurrentUser(prev => ({ ...prev, playerId: newPlayer.id }));
    
    // Navigate to player dashboard
    setStatus(AuctionStatus.PLAYER_DASHBOARD);
  };

  const handleLogout = () => {
    // Clear user data
    setCurrentUser({
      name: 'Guest User',
      email: 'guest@hypehammer.com',
      avatar: undefined
    });
    // Clear sessionStorage
    sessionStorage.removeItem('hypehammer_current_user');
    sessionStorage.removeItem('hypehammer_current_sport');
    sessionStorage.removeItem('hypehammer_current_match_id');
    sessionStorage.removeItem('hypehammer_current_status');
    // Reset to home
    setStatus(AuctionStatus.HOME);
    setCurrentSport(null);
    setCurrentMatchId(null);
  };

  const handleNavigateToSettings = (section?: string) => {
    setStatus(AuctionStatus.SETTINGS);
    // TODO: In the future, pass the section parameter to SettingsPage to auto-scroll to that section
  };

  const handleSelectMatchFromSidebar = (matchId: string, sportIdentifier: string) => {
    const sport = allSports.find(s => 
      (s.customSportName || s.sportType) === sportIdentifier
    );
    if (sport) {
      const match = sport.matches.find(m => m.id === matchId);
      if (match) {
        setCurrentSport(sportIdentifier);
        setCurrentMatchId(matchId);
        loadMatch(match);
        setStatus(AuctionStatus.READY);
      }
    }
  };

  useEffect(() => {
    if (activeTab === 'dashboard' && status === AuctionStatus.READY) {
      getAuctionInsights(players, teams, config).then(data => {
        setAiInsights(data.insights || []);
      });
    }
  }, [activeTab, status, players.length, teams.length, config]);

  const handleNextPlayer = useCallback((startFromIdx: number | null = null) => {
    const findNext = (startIdx: number) => {
      for (let i = startIdx; i < players.length; i++) {
        if (players[i].status === 'PENDING') return i;
      }
      for (let i = 0; i < startIdx; i++) {
        if (players[i].status === 'PENDING') return i;
      }
      for (let i = startIdx; i < players.length; i++) {
        if (players[i].status === 'UNSOLD') return i;
      }
      for (let i = 0; i < startIdx; i++) {
        if (players[i].status === 'UNSOLD') return i;
      }
      return -1;
    };

    const nextIdx = findNext(startFromIdx !== null ? (startFromIdx + 1) % players.length : 0);

    if (nextIdx !== -1) {
      setCurrentPlayerIdx(nextIdx);
      setCurrentBid(players[nextIdx].basePrice);
      setCurrentBidderId(null);
      setTimer(30);
      setIsTimerRunning(false);
      if (players[nextIdx].status === 'UNSOLD' && auctionRound === 1) setAuctionRound(2);
      return true;
    } else {
      setCurrentPlayerIdx(null);
      return false;
    }
  }, [players, auctionRound]);

  const placeBid = (teamId: string, amount: number) => {
    const team = teams.find(t => t.id === teamId);
    if (!team || amount > team.remainingBudget || (amount <= currentBid && currentBidderId !== null)) return;
    setCurrentBid(amount);
    setCurrentBidderId(teamId);
    setTimer(30);
    setIsTimerRunning(true);
  };

  const skipPlayer = useCallback(() => {
    if (currentPlayerIdx === null) return;
    handleNextPlayer(currentPlayerIdx);
  }, [currentPlayerIdx, handleNextPlayer]);

  const finalizePlayer = useCallback((sold: boolean) => {
    if (currentPlayerIdx === null) return;
    const player = players[currentPlayerIdx];
    const updatedPlayers = [...players];
    const updatedTeams = [...teams];

    if (sold && currentBidderId) {
      const buyingTeam = teams.find(t => t.id === currentBidderId);
      if (buyingTeam) setSoldAnimationData({ player, team: buyingTeam, price: currentBid });
      
      // Update player as SOLD
      const soldPlayer = { ...player, status: 'SOLD', teamId: currentBidderId, soldPrice: currentBid };
      updatedPlayers[currentPlayerIdx] = soldPlayer;
      
      // Update team with player
      const tIdx = updatedTeams.findIndex(t => t.id === currentBidderId);
      updatedTeams[tIdx] = { 
        ...updatedTeams[tIdx], 
        remainingBudget: updatedTeams[tIdx].remainingBudget - currentBid, 
        players: [...updatedTeams[tIdx].players, player.id] 
      };
      
      setHistory(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), playerId: player.id, teamId: currentBidderId!, amount: currentBid, timestamp: Date.now() }]);
    } else {
      updatedPlayers[currentPlayerIdx] = { ...player, status: 'UNSOLD' };
    }

    setPlayers(updatedPlayers);
    setTeams(updatedTeams);
    
    if (!sold) {
      setCurrentPlayerIdx(null);
      setTimeout(() => handleNextPlayer(), 100);
    }
    setIsTimerRunning(false);
  }, [currentPlayerIdx, players, teams, currentBidderId, currentBid, handleNextPlayer]);

  const handleEditPlayer = (player: Player) => {
    setEditingPlayerId(player.id);
    setNewPlayer(player);
    setIsPlayerModalOpen(true);
  };

  const handleEditTeam = (team: Team) => {
    setEditingTeamId(team.id);
    setNewTeam(team);
    setIsTeamModalOpen(true);
  };

  const exportHistoryAsJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(history, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `hypehammer_history_${new Date().toISOString()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  useEffect(() => {
    let interval: any;
    if (isTimerRunning && timer > 0) interval = setInterval(() => setTimer(t => t - 1), 1000);
    else if (timer === 0 && isTimerRunning) finalizePlayer(!!currentBidderId);
    return () => clearInterval(interval);
  }, [timer, isTimerRunning, currentBidderId, finalizePlayer]);

  const filteredPlayers = useMemo(() => players.filter(p => p.name.toLowerCase().includes(playerSearch.toLowerCase()) || (p.nationality?.toLowerCase() || '').includes(playerSearch.toLowerCase())), [players, playerSearch]);
  const filteredTeams = useMemo(() => teams.filter(t => t.name.toLowerCase().includes(teamSearch.toLowerCase()) || (t.homeCity?.toLowerCase() || '').includes(teamSearch.toLowerCase())), [teams, teamSearch]);

  const totalValueSold = history.reduce((acc, b) => acc + b.amount, 0);
  const totalAvailableBudget = teams.reduce((acc, t) => acc + t.budget, 0);
  const avgPlayerPrice = history.length > 0 ? totalValueSold / history.length : 0;
  const topSpentTeam = [...teams].sort((a, b) => (b.budget - b.remainingBudget) - (a.budget - a.remainingBudget))[0];

  const isAuctionRoomActive = activeTab === 'room';

  // Handle login - route to appropriate dashboard based on role
  const handleLogin = (user: { email: string; password: string; role: UserRole }) => {
    console.log('🔐 Login attempt:', user.email, 'Role:', user.role);
    
    // Load full user data from localStorage
    const storedUsers = localStorage.getItem('hypehammer_users');
    let fullUserData = null;
    
    if (storedUsers) {
      try {
        const users = JSON.parse(storedUsers);
        fullUserData = users.find((u: any) => u.email === user.email);
        console.log('✅ Found user data:', fullUserData?.name, 'Role:', fullUserData?.role);
      } catch (err) {
        console.error('Error loading user data:', err);
      }
    }
    
    // Update current user with full data
    const updatedUser = {
      email: user.email,
      role: user.role,
      name: fullUserData?.name || user.email.split('@')[0],
      teamName: fullUserData?.teamName,
      playerRole: fullUserData?.playerRole,
      basePrice: fullUserData?.basePrice,
      viewerType: fullUserData?.viewerType,
    };
    
    setCurrentUser(updatedUser);

    // For admin, route immediately (no match needed)
    if (user.role === UserRole.ADMIN) {
      console.log('➡️ Admin login - going to ADMIN_DASHBOARD');
      setStatus(AuctionStatus.ADMIN_DASHBOARD);
      return;
    }

    // For non-admin roles, select first match and set pending dashboard
    if (allSports.length === 0) {
      console.warn('⚠️ No sports data available');
      setStatus(AuctionStatus.MARKETPLACE);
      return;
    }

    const firstSport = allSports[0];
    if (!firstSport.matches || firstSport.matches.length === 0) {
      console.warn('⚠️ No matches available');
      setStatus(AuctionStatus.MARKETPLACE);
      return;
    }

    const firstMatch = firstSport.matches[0];
    const sportName = firstSport.sportType || firstSport.customSportName || 'Cricket';
    
    console.log('🎯 Auto-selecting:', sportName, firstMatch.name);
    
    // Determine target dashboard based on role
    let targetDashboard: AuctionStatus;
    switch (user.role) {
      case UserRole.AUCTIONEER:
        targetDashboard = AuctionStatus.AUCTIONEER_DASHBOARD;
        break;
      case UserRole.TEAM_REP:
        targetDashboard = AuctionStatus.TEAM_REP_DASHBOARD;
        break;
      case UserRole.PLAYER:
        targetDashboard = AuctionStatus.PLAYER_DASHBOARD;
        break;
      case UserRole.GUEST:
        targetDashboard = AuctionStatus.GUEST_DASHBOARD;
        break;
      default:
        setStatus(AuctionStatus.MARKETPLACE);
        return;
    }
    
    console.log('📍 Navigating to dashboard:', targetDashboard);
    
    // Go directly to dashboard (even if no match data yet)
    setStatus(targetDashboard);
  };

  // --- Layout Views ---

  if (status === AuctionStatus.HOME) {
    return <HomePage setStatus={setStatus} onLogin={handleLogin} />;
  }

  if (status === AuctionStatus.MARKETPLACE) {
    return <MarketplacePage 
      allSports={allSports}
      setStatus={setStatus}
      onSelectMatch={(sportType, matchId) => {
        setCurrentSport(sportType);
        setCurrentMatchId(matchId);
        // User can now join/register for this specific match - go to role selection
        setStatus(AuctionStatus.ROLE_SELECTION);
      }}
      onCreateSeason={() => {
        // Admin wants to create a new season
        setStatus(AuctionStatus.ADMIN_REGISTRATION);
      }}
      currentUserRole={currentUser.role}
    />;
  }

  if (status === AuctionStatus.ROLE_SELECTION) {
    return <RoleSelectionPage 
      setStatus={setStatus}
      selectedMatch={currentMatch}
      selectedSport={currentSportData}
      onRoleSelected={(role) => {
        setSelectedRoleForRegistration(role);
        setStatus(AuctionStatus.ROLE_REGISTRATION);
      }}
    />;
  }

  if (status === AuctionStatus.ROLE_REGISTRATION) {
    return <RoleBasedRegistrationPage 
      setStatus={setStatus}
      selectedRole={selectedRoleForRegistration || UserRole.GUEST}
      selectedMatch={currentMatch}
      selectedSport={currentSportData}
      onRegister={async (registrationData) => {
        try {
          console.log('Registration data:', registrationData);
          
          if (!registrationData.seasonId) {
            alert('No match selected. Please select a match first.');
            return false;
          }
          
          let result = null;
          
          // Call appropriate registration endpoint
          switch (registrationData.role) {
            case UserRole.AUCTIONEER:
              result = await registerAuctioneer(registrationData);
              if (result) {
                setCurrentUser({
                  name: registrationData.fullName,
                  email: registrationData.email,
                  avatar: undefined,
                  role: UserRole.AUCTIONEER
                });
                setCurrentMatchId(registrationData.seasonId);
                setPendingDashboardStatus(AuctionStatus.AUCTIONEER_DASHBOARD);
                return true;
              }
              break;
              
            case UserRole.TEAM_REP:
              result = await registerTeam(registrationData);
              if (result) {
                setCurrentUser({
                  name: registrationData.fullName,
                  email: registrationData.email,
                  avatar: undefined,
                  role: UserRole.TEAM_REP
                });
                setCurrentMatchId(registrationData.seasonId);
                setPendingDashboardStatus(AuctionStatus.TEAM_REP_DASHBOARD);
                return true;
              }
              break;
              
            case UserRole.PLAYER:
              result = await registerPlayer(registrationData);
              if (result && result.playerId) {
                setCurrentUser({
                  name: registrationData.fullName,
                  email: registrationData.email,
                  avatar: undefined,
                  role: UserRole.PLAYER,
                  playerId: result.playerId
                });
                setCurrentMatchId(registrationData.seasonId);
                setPendingDashboardStatus(AuctionStatus.PLAYER_DASHBOARD);
                return true;
              }
              break;
              
            case UserRole.GUEST:
              result = await registerGuest(registrationData);
              if (result) {
                setCurrentUser({
                  name: registrationData.fullName,
                  email: registrationData.email,
                  avatar: undefined,
                  role: UserRole.GUEST
                });
                setCurrentMatchId(registrationData.seasonId);
                setPendingDashboardStatus(AuctionStatus.GUEST_DASHBOARD);
                return true;
              }
              break;
              
            default:
              console.error('Unknown role:', registrationData.role);
              alert('Invalid role selected');
              return false;
          }
          
          // If we get here, registration failed
          alert('Registration failed. The email may already be registered or there was a server error.');
          return false;
        } catch (error: any) {
          console.error('❌ Registration error:', error);
          if (error.status === 409) {
            alert('This email is already registered. Please use a different email or sign in.');
          } else {
            alert('Registration failed. Please try again or contact support.');
          }
          return false;
        }
      }}
    />;
  }

  if (status === AuctionStatus.ADMIN_REGISTRATION) {
    return <AdminRegistrationPage 
      setStatus={setStatus}
      onRegisterAdmin={async (adminData) => {
        // Process admin registration
        setCurrentUser({
          name: adminData.fullName,
          email: adminData.email,
          avatar: undefined,
          role: UserRole.ADMIN,
          playerId: undefined
        });
        
        // Create the new season/match immediately
        const newMatchId = `match-${Date.now()}`;
        const newMatch: MatchData = {
          id: newMatchId,
          name: adminData.seasonName,
          createdAt: Date.now(),
          matchDate: new Date(adminData.auctionDateTime).getTime(),
          place: adminData.venueLocation || (adminData.venueMode === 'Online' ? 'Online' : 'TBD'),
          config: {
            sport: adminData.sportType as SportType,
            type: AuctionType.OPEN,
            level: 'Professional',
            squadSize: { min: 11, max: adminData.maxPlayersPerTeam },
            totalBudget: adminData.baseBudgetPerTeam,
            roles: [],
            rules: {}
          },
          players: [],
          teams: [],
          history: [],
          status: 'SETUP'
        };
        
        // Find or create sport data
        const sportIndex = allSports.findIndex(s => 
          s.sportType === adminData.sportType || s.customSportName === adminData.sportType
        );
        
        if (sportIndex >= 0) {
          // Sport exists, add match to it
          const updatedSports = [...allSports];
          updatedSports[sportIndex].matches.push(newMatch);
          setAllSports(updatedSports);
          
          // Save to both localStorage AND backend API
          localStorage.setItem('hypehammer_sports', JSON.stringify(updatedSports));
          await saveSportsData(updatedSports);
        } else {
          // Create new sport entry
          const newSportData: SportData = {
            sportType: adminData.sportType as SportType,
            matches: [newMatch]
          };
          const updatedSports = [...allSports, newSportData];
          setAllSports(updatedSports);
          
          // Save to both localStorage AND backend API
          localStorage.setItem('hypehammer_sports', JSON.stringify(updatedSports));
          await saveSportsData(updatedSports);
        }
        
        // Note: Modal will show and redirect to marketplace
      }}
    />;
  }

  if (status === AuctionStatus.AUTH) {
    return <AuthPage 
      setStatus={setStatus} 
      onLogin={(userData) => {
        if (userData.isOAuthUser) {
          // Store OAuth user and redirect to profile completion
          setPendingOAuthUser(userData);
          setStatus(AuctionStatus.PROFILE_COMPLETION);
        } else {
          // Regular signup/login
          setCurrentUser(userData);
        }
      }}
    />;
  }

  if (status === AuctionStatus.PROFILE_COMPLETION) {
    return <ProfileCompletionPage 
      setStatus={setStatus} 
      oauthUser={pendingOAuthUser}
      onProfileComplete={(completedUser) => {
        setCurrentUser(completedUser);
        setPendingOAuthUser(null);
        if (completedUser.role === UserRole.PLAYER) {
          setStatus(AuctionStatus.PLAYER_REGISTRATION);
        } else {
          setStatus(AuctionStatus.SETUP);
        }
      }}
    />;
  }

  if (status === AuctionStatus.PLAYER_REGISTRATION) {
    return <PlayerRegistrationPage 
      allSports={allSports}
      currentUser={currentUser}
      onRegister={handlePlayerRegister}
      onBack={() => setStatus(AuctionStatus.PLAYER_DASHBOARD)}
    />;
  }

  if (status === AuctionStatus.PLAYER_DASHBOARD) {
    console.log('🎨 Rendering PLAYER_DASHBOARD, currentMatch:', currentMatch?.id);
    if (!currentMatch) {
      console.warn('⚠️ No currentMatch yet, showing loading...');
      return <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading Player Dashboard...</div>
      </div>;
    }
    return <PlayerDashboardPage 
      setStatus={setStatus}
      currentMatch={currentMatch}
      currentUser={currentUser}
    />;
  }

  if (status === AuctionStatus.ADMIN_DASHBOARD) {
    console.log('🎨 Rendering ADMIN_DASHBOARD');
    return <AdminDashboardPage 
      setStatus={setStatus}
      allSports={allSports}
      currentUser={currentUser}
    />;
  }

  if (status === AuctionStatus.AUCTIONEER_DASHBOARD) {
    console.log('🎨 Rendering AUCTIONEER_DASHBOARD, currentMatch:', currentMatch?.id);
    if (!currentMatch) {
      console.warn('⚠️ No currentMatch yet, showing loading...');
      return <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading Auctioneer Dashboard...</div>
      </div>;
    }
    return <AuctioneerDashboardPage 
      setStatus={setStatus}
      currentMatch={currentMatch}
      currentUser={currentUser}
    />;
  }

  if (status === AuctionStatus.TEAM_REP_DASHBOARD) {
    console.log('🎨 Rendering TEAM_REP_DASHBOARD, currentMatch:', currentMatch?.id);
    if (!currentMatch) {
      console.warn('⚠️ No currentMatch yet, showing loading...');
      return <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading Team Dashboard...</div>
      </div>;
    }
    return <TeamRepDashboardPage 
      setStatus={setStatus}
      currentMatch={currentMatch}
      currentUser={currentUser}
    />;
  }

  if (status === AuctionStatus.GUEST_DASHBOARD) {
    console.log('🎨 Rendering GUEST_DASHBOARD, currentMatch:', currentMatch?.id);
    if (!currentMatch) {
      console.warn('⚠️ No currentMatch yet, showing loading...');
      return <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading Guest Dashboard...</div>
      </div>;
    }
    return <GuestDashboardPage 
      setStatus={setStatus}
      currentMatch={currentMatch}
      currentUser={currentUser}
    />;
  }

  if (status === AuctionStatus.HOW_IT_WORKS) {
    return <HowItWorksPage setStatus={setStatus} />;
  }

  if (status === AuctionStatus.SETTINGS) {
    return <SettingsLayoutPage 
      config={config} 
      setConfig={setConfig} 
      players={players} 
      setPlayers={setPlayers} 
      teams={teams} 
      setTeams={setTeams}
      currentUser={currentUser}
      setCurrentUser={setCurrentUser}
      setStatus={setStatus} 
    />;
  }

  // Fallback/default view - auction room for READY/LIVE/PAUSED/ENDED statuses
  console.log('🎨 Rendering fallback auction room view, status:', status);
  return (
    <div className="h-screen bg-gradient-to-br from-white via-blue-50 to-orange-50 flex flex-col items-center p-4 lg:p-8 overflow-hidden relative">
      {soldAnimationData && <SoldCelebration player={soldAnimationData.player} team={soldAnimationData.team} price={soldAnimationData.price} onComplete={() => { setSoldAnimationData(null); setTimeout(() => handleNextPlayer(), 100); }} />}

      <div className="fixed top-8 left-10 z-[60] flex items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl cursor-pointer overflow-hidden border-2 border-blue-500" onClick={() => setStatus(AuctionStatus.HOME)}>
            <img src="./logo.jpg" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <div className="hidden sm:block">
            <h2 className="text-xl font-display font-black tracking-widest gold-text uppercase leading-none">HypeHammer</h2>
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.3em] mt-1">{config.sport} Protocol</p>
          </div>
        </div>
        <button onClick={handleBackToMatches} className="bg-white/80 border border-blue-500/20 backdrop-blur-xl px-4 py-2.5 rounded-full text-blue-600 hover:bg-blue-500 hover:text-white transition-all shadow-lg flex items-center gap-2"><ArrowLeft size={14} /><span className="text-[9px] font-black uppercase tracking-[0.2em]">Back to Matches</span></button>
      </div>

      <div className="fixed top-8 right-10 z-[60] flex gap-3">
        {currentPlayerIdx !== null && <HUDPill icon={<TrendingUp size={12} />}>Round {auctionRound}</HUDPill>}
        <HUDPill icon={<Activity size={12} />}>System Live</HUDPill>
        <button onClick={() => setIsSettingsSidebarOpen(true)} className="p-2.5 bg-orange-500/10 border border-orange-500/20 rounded-full text-orange-500 hover:bg-orange-500 hover:text-white transition-all"><Settings size={16} /></button>
      </div>

      <div className="w-full max-w-[1500px] h-full flex flex-col pt-20 pb-20">
        <div className="flex-1 overflow-y-auto custom-scrollbar px-2 lg:px-4 animate-in fade-in duration-700">
          {activeTab === 'players' && (
            <PlayersPage 
              filteredPlayers={filteredPlayers}
              playerSearch={playerSearch}
              setPlayerSearch={setPlayerSearch}
              setEditingPlayerId={setEditingPlayerId}
              setNewPlayer={setNewPlayer}
              setIsPlayerModalOpen={setIsPlayerModalOpen}
              setPlayers={setPlayers}
              handleEditPlayer={handleEditPlayer}
            />
          )}

          {activeTab === 'teams' && (
            <TeamsPage 
              filteredTeams={filteredTeams}
              teamSearch={teamSearch}
              setTeamSearch={setTeamSearch}
              config={config}
              setEditingTeamId={setEditingTeamId}
              setNewTeam={setNewTeam}
              setIsTeamModalOpen={setIsTeamModalOpen}
              setViewingSquadTeamId={setViewingSquadTeamId}
              setIsSquadModalOpen={setIsSquadModalOpen}
              setTeams={setTeams}
              handleEditTeam={handleEditTeam}
            />
          )}

          {activeTab === 'room' && (
            <AuctionRoomPage 
              currentPlayerIdx={currentPlayerIdx}
              players={players}
              timer={timer}
              currentBid={currentBid}
              currentBidderId={currentBidderId}
              teams={teams}
              auctionRound={auctionRound}
              finalizePlayer={finalizePlayer}
              skipPlayer={skipPlayer}
              placeBid={placeBid}
              handleNextPlayer={handleNextPlayer}
            />
          )}

          {activeTab === 'history' && (
            <HistoryPage 
              history={history}
              players={players}
              teams={teams}
              exportHistoryAsJson={exportHistoryAsJson}
            />
          )}
        </div>
      </div>

      {/* Adaptive Navigation Dock */}
      <div className={`fixed transition-all duration-700 ease-in-out z-[100] ${isAuctionRoomActive ? 'bottom-8 left-10' : 'bottom-6 left-1/2 -translate-x-1/2'}`}>
        {isAuctionRoomActive ? (
          /* Hidden sidebar mode: Single button that expands vertically from bottom-left */
          <div className="flex flex-col-reverse items-start gap-4">
            <nav className={`orbital-nav transition-all duration-500 overflow-hidden flex flex-col gap-2 p-2 rounded-3xl ${isNavExpanded ? 'opacity-100 translate-y-0 scale-100 mb-2' : 'opacity-0 translate-y-4 scale-95 pointer-events-none'}`}>
              <OrbitalItem icon={<LayoutDashboard size={20} />} active={(activeTab as any) === 'dashboard'} onClick={() => {setActiveTab('dashboard'); setIsNavExpanded(false);}} />
              <OrbitalItem icon={<Users size={20} />} active={(activeTab as any) === 'players'} onClick={() => {setActiveTab('players'); setIsNavExpanded(false);}} />
              <OrbitalItem icon={<Trophy size={20} />} active={(activeTab as any) === 'teams'} onClick={() => {setActiveTab('teams'); setIsNavExpanded(false);}} />
              <OrbitalItem icon={<History size={20} />} active={(activeTab as any) === 'history'} onClick={() => {setActiveTab('history'); setIsNavExpanded(false);}} />
            </nav>
            <button 
              onClick={() => setIsNavExpanded(!isNavExpanded)}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-2xl relative border border-blue-500/30 ${isNavExpanded ? 'bg-blue-500 text-[#0d0a09]' : 'orbital-nav text-blue-600'}`}
            >
              {isNavExpanded ? <X size={24} /> : <Gavel size={24} />}
              {!isNavExpanded && <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse border border-[#0d0a09]"></div>}
            </button>
          </div>
        ) : (
          /* Standard centered bar mode */
          <nav className="orbital-nav flex items-center gap-4 p-4 rounded-full w-fit">
            <OrbitalItem icon={<LayoutDashboard size={20} />} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
            <OrbitalItem icon={<Users size={20} />} active={activeTab === 'players'} onClick={() => setActiveTab('players')} />
            <OrbitalItem icon={<Gavel size={20} />} active={(activeTab as any) === 'room'} onClick={() => setActiveTab('room')} />
            <OrbitalItem icon={<Trophy size={20} />} active={activeTab === 'teams'} onClick={() => setActiveTab('teams')} />
            <OrbitalItem icon={<History size={20} />} active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
          </nav>
        )}
      </div>

      {/* Modals */}
      <PlayerModal
        isOpen={isPlayerModalOpen}
        onClose={() => { setIsPlayerModalOpen(false); setEditingPlayerId(null); }}
        editingPlayerId={editingPlayerId}
        newPlayer={newPlayer}
        setNewPlayer={setNewPlayer}
        config={config}
        players={players}
        setPlayers={setPlayers}
        setIsPlayerModalOpen={setIsPlayerModalOpen}
        setEditingPlayerId={setEditingPlayerId}
      />

      <TeamModal
        isOpen={isTeamModalOpen}
        onClose={() => { setIsTeamModalOpen(false); setEditingTeamId(null); }}
        editingTeamId={editingTeamId}
        newTeam={newTeam}
        setNewTeam={setNewTeam}
        config={config}
        teams={teams}
        setTeams={setTeams}
        setIsTeamModalOpen={setIsTeamModalOpen}
        setEditingTeamId={setEditingTeamId}
      />

      <SquadModal
        isOpen={isSquadModalOpen}
        onClose={() => setIsSquadModalOpen(false)}
        viewingSquadTeamId={viewingSquadTeamId}
        teams={teams}
        players={players}
      />

      {/* Settings Sidebar */}
      <SettingsSidebar
        isOpen={isSettingsSidebarOpen}
        onClose={() => setIsSettingsSidebarOpen(false)}
        currentUser={currentUser}
        allSports={allSports}
        currentSport={currentSport}
        currentMatchId={currentMatchId}
        onSelectMatch={handleSelectMatchFromSidebar}
        onNavigateToSettings={handleNavigateToSettings}
        onLogout={handleLogout}
      />
    </div>
  );
};

const App: React.FC = () => (
  <BrowserRouter>
    <AppContent />
  </BrowserRouter>
);

export default App;
