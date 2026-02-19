import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { registerAuctioneer, registerTeam, registerPlayer } from './services/apiService';
import { uploadPlayerPhoto, uploadTeamLogo, uploadDocument, uploadProfilePicture } from './services/firebaseStorageService';

// Import Components
import {
  HUDPill, OrbitalItem, SoldCelebration, SettingsSidebar,
  HomePage, MarketplacePage, AuthPage, AdminRegistrationPage, RoleSelectionPage, RoleBasedRegistrationPage, ProfileCompletionPage, HowItWorksPage, SettingsPage, SettingsLayoutPage, PlayersPage, TeamsPage, AuctionRoomPage, HistoryPage,
  PlayerModal, TeamModal, SquadModal, PlayerRegistrationPage, AdminDashboardPage, AuctioneerDashboardPage, GuestDashboardPage
} from './components';

// --- Core Application ---

const AppContent: React.FC = () => {
  const navigate = useNavigate();

  // Dynamic status-to-path helper (supports matchId and role in URL)
  const getStatusPath = (s: AuctionStatus): string => {
    if (s === AuctionStatus.ROLE_SELECTION && currentMatchId) return `/role/select/${currentMatchId}`;
    if (s === AuctionStatus.ROLE_REGISTRATION && selectedRoleForRegistration && currentMatchId) {
      const rolePathMap: Record<string, string> = {
        [UserRole.AUCTIONEER]: 'auctioneer',
        [UserRole.TEAM_REP]: 'team',
        [UserRole.PLAYER]: 'player'
      };
      const rp = rolePathMap[selectedRoleForRegistration];
      if (rp) return `/register/${rp}/${currentMatchId}`;
    }
    const map: Record<string, string> = {
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
    return map[s] || '/';
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

  // Parse dynamic registration routes from URL
  const parseRouteFromPath = (path: string): { status: AuctionStatus; role?: UserRole; matchId?: string } | null => {
    // /role/select/:matchId
    const roleSelectMatch = path.match(/^\/role\/select\/([^/]+)$/);
    if (roleSelectMatch) return { status: AuctionStatus.ROLE_SELECTION, matchId: roleSelectMatch[1] };
    // /register/:role/:matchId
    const registerMatch = path.match(/^\/register\/(auctioneer|team|player)\/([^/]+)$/);
    if (registerMatch) {
      const roleMap: Record<string, UserRole> = { auctioneer: UserRole.AUCTIONEER, team: UserRole.TEAM_REP, player: UserRole.PLAYER };
      return { status: AuctionStatus.ROLE_REGISTRATION, role: roleMap[registerMatch[1]], matchId: registerMatch[2] };
    }
    return null;
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
    // Check dynamic routes first
    const dynamicRoute = parseRouteFromPath(currentPath);
    if (dynamicRoute) return dynamicRoute.status;
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
      role: UserRole.GUEST,
      playerId: undefined as string | undefined
    };
  });

  // OAuth user pending profile completion
  const [pendingOAuthUser, setPendingOAuthUser] = useState<any>(null);
  
  // Role selection state for registration flow - restore from URL on refresh
  const [selectedRoleForRegistration, setSelectedRoleForRegistration] = useState<UserRole | null>(() => {
    const currentPath = window.location.pathname;
    const parsed = parseRouteFromPath(currentPath);
    return parsed?.role || null;
  });
  
  // Settings sidebar state
  const [isSettingsSidebarOpen, setIsSettingsSidebarOpen] = useState(false);
  
  // Multi-sport, multi-match state - restore from sessionStorage
  const [allSports, setAllSports] = useState<SportData[]>([]);
  const [currentSport, setCurrentSport] = useState<string | null>(() => {
    return sessionStorage.getItem('hypehammer_current_sport') || null;
  });
  const [currentMatchId, setCurrentMatchId] = useState<string | null>(() => {
    // Check URL first for matchId in dynamic routes
    const currentPath = window.location.pathname;
    const parsed = parseRouteFromPath(currentPath);
    if (parsed?.matchId) return parsed.matchId;
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
  
  // Sync config from currentMatch data so SettingsLayoutPage gets real values
  useEffect(() => {
    if (currentMatch) {
      const matchConfig = currentMatch.config;
      setConfig(prev => ({
        ...prev,
        sport: (matchConfig?.sport || currentMatch.sportType || prev.sport) as SportType,
        type: matchConfig?.type || prev.type,
        totalBudget: currentMatch.baseBudgetPerTeam || matchConfig?.totalBudget || prev.totalBudget,
        squadSize: {
          min: matchConfig?.squadSize?.min ?? prev.squadSize?.min ?? 11,
          max: currentMatch.maxPlayersPerTeam || matchConfig?.squadSize?.max || prev.squadSize?.max || 15,
        },
        roles: matchConfig?.roles || prev.roles || [],
        rules: matchConfig?.rules || prev.rules || {},
      }));
    }
  }, [currentMatch?.id, currentMatch?.baseBudgetPerTeam, currentMatch?.maxPlayersPerTeam]);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'players' | 'teams' | 'room' | 'history'>('dashboard');
  const [isNavExpanded, setIsNavExpanded] = useState(false);

  const [playerSearch, setPlayerSearch] = useState('');
  const [teamSearch, setTeamSearch] = useState('');
  const [aiInsights, setAiInsights] = useState<string[]>([]);

  // Ref to track last synced state to prevent unnecessary updates
  const lastSyncedState = useRef<{
    players: string;
    teams: string;
    history: string;
  }>({ players: '', teams: '', history: '' });

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

  // Auto-navigate logged-in users to their dashboards on app load
  useEffect(() => {
    // Only trigger when status is HOME and we have a logged-in user
    if (status === AuctionStatus.HOME) {
      // Guard: skip auto-navigation if user explicitly exited or logged out
      const explicitExit = sessionStorage.getItem('hypehammer_explicit_exit');
      if (explicitExit) {
        sessionStorage.removeItem('hypehammer_explicit_exit');
        console.log('🛑 Skipping auto-navigation: user explicitly exited');
        return;
      }

      // Check if this is a real logged-in user
      const savedUser = sessionStorage.getItem('hypehammer_current_user');
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          console.log('👤 Checking saved user:', parsedUser.email, 'Role:', parsedUser.role);
          
          // Only auto-navigate if user has a defined role and is not the default guest
          if (parsedUser.role && parsedUser.email && parsedUser.email !== 'guest@hypehammer.com') {
            console.log('🚀 Auto-navigating logged-in user:', parsedUser.email, 'Role:', parsedUser.role);
            
            let targetDashboard: AuctionStatus;
            switch (parsedUser.role) {
              case UserRole.ADMIN:
                targetDashboard = AuctionStatus.ADMIN_DASHBOARD;
                break;
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
                console.warn('⚠️ Unknown role:', parsedUser.role);
                return;
            }
            
            // For ADMIN: Check if match ID is already in session, otherwise fetch admin's match
            if (parsedUser.role === UserRole.ADMIN || parsedUser.role === 'ADMIN') {
              const savedMatchId = sessionStorage.getItem('hypehammer_current_match_id');
              
              if (savedMatchId) {
                console.log('✅ Admin has match ID in session:', savedMatchId);
                // Ensure allSports is populated before navigating
                if (allSports.length === 0) {
                  console.log('⚠️ allSports is empty, fetching sports data first...');
                  fetch(`https://us-central1-axilam.cloudfunctions.net/auction/sports`)
                    .then(res => res.json())
                    .then(data => {
                      if (data.success && data.data) {
                        setAllSports(data.data);
                        console.log('✅ allSports populated, now navigating');
                      }
                      setStatus(targetDashboard);
                    })
                    .catch(err => {
                      console.error('❌ Error fetching sports:', err);
                      setStatus(targetDashboard); // Navigate anyway
                    });
                } else {
                  setStatus(targetDashboard);
                }
              } else {
                console.log('🔍 Admin has no match ID - fetching match by email:', parsedUser.email);
                
                // Fetch admin's match and set it before navigating
                fetch(`https://us-central1-axilam.cloudfunctions.net/auction/matches`)
                  .then(res => res.json())
                  .then(data => {
                    if (data.success && data.data && data.data.length > 0) {
                      const adminMatch = data.data.find((match: any) => 
                        match.adminEmail === parsedUser.email || 
                        match.organizerEmail === parsedUser.email
                      );
                      
                      if (adminMatch) {
                        const matchId = adminMatch.id;
                        const sport = adminMatch.sport || 'Cricket';
                        console.log('✅ Found admin match:', matchId, 'Sport:', sport);
                        
                        setCurrentSport(sport);
                        sessionStorage.setItem('hypehammer_current_sport', sport);
                        setCurrentMatchId(matchId);
                        sessionStorage.setItem('hypehammer_current_match_id', matchId);
                        
                        // Also populate allSports to ensure currentMatch is available
                        fetch(`https://us-central1-axilam.cloudfunctions.net/auction/sports`)
                          .then(res2 => res2.json())
                          .then(data2 => {
                            if (data2.success && data2.data) {
                              setAllSports(data2.data);
                              console.log('✅ allSports populated after match fetch');
                            }
                          })
                          .catch(err => console.error('❌ Error fetching sports after match:', err));
                      } else {
                        console.warn('⚠️ No match found for admin:', parsedUser.email);
                      }
                    }
                    setStatus(targetDashboard);
                  })
                  .catch(err => {
                    console.error('❌ Error fetching admin match:', err);
                    setStatus(targetDashboard); // Navigate anyway
                  });
              }
            } else if (allSports.length > 0 && allSports[0].matches?.length > 0) {
              // Preserve existing match selection if still valid, otherwise pick first match
              const savedMatchId = sessionStorage.getItem('hypehammer_current_match_id');
              const allMatches = allSports.flatMap(s => s.matches || []);
              const existingMatch = savedMatchId ? allMatches.find(m => m.id === savedMatchId) : null;
              const existingSport = existingMatch ? allSports.find(s => s.matches.some(m => m.id === savedMatchId)) : null;

              if (existingMatch && existingSport) {
                console.log('✅ Preserving existing match selection:', existingMatch.name);
                setCurrentSport(existingSport.sportType || existingSport.customSportName || 'Cricket');
                setCurrentMatchId(existingMatch.id);
              } else {
                const firstSport = allSports[0];
                const firstMatch = firstSport.matches[0];
                console.log('✅ Selecting first match and navigating:', firstMatch.name);
                setCurrentSport(firstSport.sportType || firstSport.customSportName || 'Cricket');
                setCurrentMatchId(firstMatch.id);
              }
              setPendingDashboardStatus(targetDashboard);
            } else {
              console.warn('⚠️ No matches available for', parsedUser.role);
            }
          }
        } catch (e) {
          console.error('Error parsing saved user:', e);
        }
      }
    }
  }, [status, allSports]);

  // One-way sync status to URL (prevents view loops)
  useEffect(() => {
    const path = getStatusPath(status);
    // Use push for history support, but only if URL actually changed
    const currentPath = window.location.pathname;
    if (currentPath !== path) {
      navigate(path);
    }
    // Save current status to sessionStorage for refresh persistence
    sessionStorage.setItem('hypehammer_current_status', status);
  }, [status, navigate, currentMatchId, selectedRoleForRegistration]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const currentPath = window.location.pathname;
      // Check dynamic routes first
      const dynamicRoute = parseRouteFromPath(currentPath);
      if (dynamicRoute) {
        if (dynamicRoute.matchId) setCurrentMatchId(dynamicRoute.matchId);
        if (dynamicRoute.role) setSelectedRoleForRegistration(dynamicRoute.role);
        if (dynamicRoute.status !== status) {
          console.log('🔙 Browser nav to dynamic route:', currentPath);
          setStatus(dynamicRoute.status);
        }
        return;
      }
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

  // DISABLED: This effect was causing infinite re-render loops
  // The circular dependency: setAllSports → currentMatch recomputed → players/teams/history re-derived → triggers effect again
  // State is synced through other mechanisms (direct updates in handlers)
  /*
  // Update allSports whenever current match's players/teams change
  useEffect(() => {
    if (!currentMatch || !currentSportData) return;

    // Serialize current state
    const currentPlayersStr = JSON.stringify(players);
    const currentTeamsStr = JSON.stringify(teams);
    const currentHistoryStr = JSON.stringify(history);

    // Check if state actually changed since last sync
    if (
      lastSyncedState.current.players === currentPlayersStr &&
      lastSyncedState.current.teams === currentTeamsStr &&
      lastSyncedState.current.history === currentHistoryStr
    ) {
      // No change, skip update
      return;
    }

    console.log('🔄 State changed, updating allSports...');

    // Update the ref with new state
    lastSyncedState.current = {
      players: currentPlayersStr,
      teams: currentTeamsStr,
      history: currentHistoryStr
    };

    // Now update allSports
    setAllSports(prev => prev.map(sport => {
      if (sport.sportType === currentSportData.sportType && 
          sport.customSportName === currentSportData.customSportName) {
        return {
          ...sport,
          matches: sport.matches.map(match => 
            match.id === currentMatch.id 
              ? { ...match, players, teams, history }
              : match
          )
        };
      }
      return sport;
    }));
  }, [players, teams, history, currentMatch?.id, currentSportData?.sportType, currentSportData?.customSportName]);
  */

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

  /**
   * CRITICAL: Filter out declined players for all auction-related displays and stats
   * Declined players should ONLY appear in admin review sections
   */
  const eligiblePlayers = useMemo(() => {
    return players.filter(p => p.approvalStatus !== 'declined');
  }, [players]);

  /**
   * CRITICAL: Filter out declined teams for all auction-related displays and stats
   * Declined teams should ONLY appear in admin review sections
   */
  const eligibleTeams = useMemo(() => {
    return teams.filter(t => t.approvalStatus !== 'declined');
  }, [teams]);

  const filteredPlayers = useMemo(() => eligiblePlayers.filter(p => p.name.toLowerCase().includes(playerSearch.toLowerCase()) || (p.nationality?.toLowerCase() || '').includes(playerSearch.toLowerCase())), [eligiblePlayers, playerSearch]);
  const filteredTeams = useMemo(() => eligibleTeams.filter(t => t.name.toLowerCase().includes(teamSearch.toLowerCase()) || (t.homeCity?.toLowerCase() || '').includes(teamSearch.toLowerCase())), [eligibleTeams, teamSearch]);

  const totalValueSold = history.reduce((acc, b) => acc + b.amount, 0);
  const totalAvailableBudget = teams.reduce((acc, t) => acc + t.budget, 0);
  const avgPlayerPrice = history.length > 0 ? totalValueSold / history.length : 0;
  const topSpentTeam = [...teams].sort((a, b) => (b.budget - b.remainingBudget) - (a.budget - a.remainingBudget))[0];

  const isAuctionRoomActive = activeTab === 'room';

  // Handle login - route to appropriate dashboard based on role
  const handleLogin = async (user: { email: string; password: string; role: UserRole }) => {
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
      email: user.email || user.organizerEmail || user.adminEmail || '',
      role: user.role,
      name: fullUserData?.name || (user.email || user.organizerEmail || user.adminEmail || 'User').split('@')[0],
      teamName: fullUserData?.teamName,
      playerRole: fullUserData?.playerRole,
      basePrice: fullUserData?.basePrice,
      viewerType: fullUserData?.viewerType,
    };
    
    setCurrentUser(updatedUser);

    // Determine target dashboard based on role
    let targetDashboard: AuctionStatus;
    switch (user.role) {
      case UserRole.ADMIN:
        targetDashboard = AuctionStatus.ADMIN_DASHBOARD;
        break;
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

    // For admin: fetch their match by adminEmail or organizerEmail
    if (user.role === UserRole.ADMIN) {
      console.log('🔍 Admin login - fetching match by admin email:', user.email);
      
      // Normalize email for case-insensitive comparison
      const normalizedUserEmail = user.email.toLowerCase();
      
      // First, try to find match in local allSports data (immediate after registration)
      let adminMatch = null;
      for (const sport of allSports) {
        const foundMatch = sport.matches.find((m: any) => 
          (m.adminEmail && m.adminEmail.toLowerCase() === normalizedUserEmail) || 
          (m.organizerEmail && m.organizerEmail.toLowerCase() === normalizedUserEmail)
        );
        if (foundMatch) {
          adminMatch = foundMatch;
          console.log('✅ Found admin match in local cache:', foundMatch.id, 'Sport:', sport.sportType);
          setCurrentSport(sport.sportType);
          sessionStorage.setItem('hypehammer_current_sport', sport.sportType);
          setCurrentMatchId(foundMatch.id);
          sessionStorage.setItem('hypehammer_current_match_id', foundMatch.id);
          break;
        }
      }
      
      // If not found in local cache, fetch from API
      if (!adminMatch) {
        try {
          // Fetch all matches and find the one that belongs to this admin
          const response = await fetch(`https://us-central1-axilam.cloudfunctions.net/auction/matches`);
          const data = await response.json();
          
          console.log('📊 API Response:', { success: data.success, dataType: typeof data.data, isArray: Array.isArray(data.data) });
          
          let matchesArray = [];
          
          // Handle different possible API response formats
          if (data.success && data.data) {
            if (Array.isArray(data.data)) {
              matchesArray = data.data;
            } else if (typeof data.data === 'object' && data.data.matches && Array.isArray(data.data.matches)) {
              matchesArray = data.data.matches;
            }
          } else if (Array.isArray(data)) {
            matchesArray = data;
          }
          
          if (matchesArray && matchesArray.length > 0) {
            console.log('📊 Fetched matches count:', matchesArray.length);
            // Log all matches to see their structure
            matchesArray.forEach((m: any, idx: number) => {
              const orgEmail = m.adminEmail || m.organizerEmail || m.email;
              console.log(`   Match ${idx}: id=${m.id}, adminEmail=${m.adminEmail}, organizerEmail=${m.organizerEmail}, email=${m.email}, sport=${m.sport || m.sportType}`);
            });
            
            // Find match where adminEmail or organizerEmail matches the logged-in user (case-insensitive)
            adminMatch = matchesArray.find((match: any) => 
              (match.adminEmail && match.adminEmail.toLowerCase() === normalizedUserEmail) || 
              (match.organizerEmail && match.organizerEmail.toLowerCase() === normalizedUserEmail) ||
              (match.email && match.email.toLowerCase() === normalizedUserEmail)
            );
            
            if (adminMatch) {
              const matchId = adminMatch.id;
              const sport = adminMatch.sport || adminMatch.sportType || 'Cricket';
              console.log('✅ Found admin match from API:', matchId, 'Sport:', sport);
              
              // Set sport and match ID so the admin dashboard loads correctly
              setCurrentSport(sport);
              sessionStorage.setItem('hypehammer_current_sport', sport);
              setCurrentMatchId(matchId);
              sessionStorage.setItem('hypehammer_current_match_id', matchId);
            } else {
              console.warn('⚠️ No match found for admin:', user.email);
              console.warn('   Admin is searching for email (normalized):', normalizedUserEmail);
              console.warn('   Available match emails:', matchesArray.map((m: any) => ({ 
                id: m.id, 
                adminEmail: m.adminEmail, 
                organizerEmail: m.organizerEmail,
                email: m.email,
                allFields: Object.keys(m)
              })));
            }
          } else {
            console.warn('⚠️ No matches returned from API');
          }
        } catch (err) {
          console.error('❌ Error fetching admin match:', err);
        }
      }
      
      console.log('📍 Admin login - going to ADMIN_DASHBOARD');
      setStatus(AuctionStatus.ADMIN_DASHBOARD);
      return;
    }

    // For auctioneers, team reps, and players: fetch their registration to find their match
    console.log('🔍 Fetching', user.role, 'registration data for:', user.email);
    
    try {
      let matchId: string | null = null;
      
      if (user.role === UserRole.AUCTIONEER) {
        // Fetch auctioneer registration to get matchId
        const response = await fetch(`https://us-central1-axilam.cloudfunctions.net/auction/auctioneers?email=${encodeURIComponent(user.email)}`);
        const data = await response.json();
        
        if (data.success && data.data && data.data.length > 0) {
          const auctioneer = data.data[0]; // Get first (should be only one per email due to duplicate check)
          matchId = auctioneer.matchId;
          console.log('✅ Found auctioneer matchId:', matchId);
        } else {
          console.warn('⚠️ No auctioneer registration found for:', user.email);
        }
      } else if (user.role === UserRole.TEAM_REP) {
        // Fetch team registration to get matchId
        const response = await fetch(`https://us-central1-axilam.cloudfunctions.net/auction/teams?email=${encodeURIComponent(user.email)}`);
        const data = await response.json();
        
        if (data.success && data.data && data.data.length > 0) {
          const team = data.data[0];
          matchId = team.matchId;
          console.log('✅ Found team matchId:', matchId);
        } else {
          console.warn('⚠️ No team registration found for:', user.email);
        }
      } else if (user.role === UserRole.PLAYER) {
        // Fetch player registration to get matchId
        const response = await fetch(`https://us-central1-axilam.cloudfunctions.net/auction/players?email=${encodeURIComponent(user.email)}`);
        const data = await response.json();
        
        if (data.success && data.data && data.data.length > 0) {
          const player = data.data[0];
          matchId = player.matchId;
          console.log('✅ Found player matchId:', matchId);
        } else {
          console.warn('⚠️ No player registration found for:', user.email);
        }
      }
      
      if (matchId) {
        console.log('🎯 Found matchId:', matchId);
        
        // Fetch match details to get sport info
        try {
          const matchResponse = await fetch(`https://us-central1-axilam.cloudfunctions.net/auction/matches/${matchId}`);
          const matchData = await matchResponse.json();
          
          if (matchData.success && matchData.data) {
            const match = matchData.data;
            const sport = match.sport || 'Cricket'; // Default to Cricket if not specified
            console.log('✅ Found match sport:', sport);
            
            // Set both sport and match ID so currentMatch resolves correctly
            setCurrentSport(sport);
            sessionStorage.setItem('hypehammer_current_sport', sport);
            setCurrentMatchId(matchId);
            sessionStorage.setItem('hypehammer_current_match_id', matchId);
          } else {
            console.warn('⚠️ Could not fetch match details for:', matchId);
            setCurrentMatchId(matchId); // Still set the ID even if we can't get sport
          }
        } catch (err) {
          console.error('❌ Error fetching match details:', err);
          setCurrentMatchId(matchId); // Still set the ID as fallback
        }
      } else {
        console.warn('⚠️ Could not determine match for', user.role);
      }
    } catch (err) {
      console.error('❌ Error fetching registration data:', err);
    }

    // Navigate to appropriate dashboard
    console.log('📍 Navigating to dashboard:', targetDashboard);
    setPendingDashboardStatus(targetDashboard);
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
      onViewLiveAuction={(sportType, matchId) => {
        setCurrentSport(sportType);
        setCurrentMatchId(matchId);
        setCurrentUser(prev => ({
          ...prev,
          name: prev.name || 'Guest User',
          email: prev.email || 'guest@hypehammer.com',
          role: UserRole.GUEST
        }));
        setStatus(AuctionStatus.GUEST_DASHBOARD);
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
      selectedRole={selectedRoleForRegistration || UserRole.PLAYER}
      selectedMatch={currentMatch}
      selectedSport={currentSportData}
      onRegister={async (registrationData) => {
        try {
          console.log('================== REGISTRATION HANDLER START ==================');
          console.log('📦 Received registrationData from form');
          console.log('   - role:', registrationData.role);
          console.log('   - governmentId:', registrationData.governmentId);
          console.log('   - governmentIdFile:', registrationData.governmentIdFile);
          console.log('   - Keys in registrationData:', Object.keys(registrationData));
          
          if (!registrationData.seasonId) {
            alert('No match selected. Please select a match first.');
            return false;
          }
          
          // Upload files to Firebase Storage and get download URLs
          const processedData = { ...registrationData };
          console.log('📋 processedData initialized with registrationData');
          console.log('   - governmentId:', processedData.governmentId);
          console.log('   - governmentIdFile (before upload):', processedData.governmentIdFile);
          
          try {
            // Upload team logo to Firebase Storage
            if (registrationData.teamLogo && registrationData.teamLogo instanceof File) {
              console.log('📤 Uploading team logo to Firebase Storage...');
              const logoUrl = await uploadTeamLogo(registrationData.teamLogo);
              processedData.teamLogo = logoUrl;
              console.log('✅ Team logo uploaded:', logoUrl);
            }
            
            // Upload player photo to Firebase Storage
            if (registrationData.playerPhoto && registrationData.playerPhoto instanceof File) {
              console.log('📤 Uploading player photo to Firebase Storage...');
              const photoUrl = await uploadPlayerPhoto(registrationData.playerPhoto);
              processedData.imageUrl = photoUrl;  // Map to imageUrl field for backend
              delete processedData.playerPhoto;
              console.log('✅ Player photo uploaded:', photoUrl);
            }

            // Upload auctioneer photo to Firebase Storage
            if (registrationData.auctioneerPhoto && registrationData.auctioneerPhoto instanceof File) {
              console.log('📤 Uploading auctioneer photo to Firebase Storage...');
              const auctioneerPhotoUrl = await uploadProfilePicture(registrationData.auctioneerPhoto, `auctioneer_${Date.now()}`);
              processedData.auctioneerPhoto = auctioneerPhotoUrl;  // Map to auctioneerPhoto field for backend
              console.log('✅ Auctioneer photo uploaded:', auctioneerPhotoUrl);
            }
            
            // Upload documents
            if (registrationData.authorizationLetter && registrationData.authorizationLetter instanceof File) {
              console.log('📤 Uploading authorization letter...');
              const letterUrl = await uploadDocument(registrationData.authorizationLetter, 'authorization-letters');
              processedData.authorizationLetter = letterUrl;
              console.log('✅ Authorization letter uploaded:', letterUrl);
            }
            
            console.log('🔍 Before government ID upload check:');
            console.log('   - registrationData.governmentIdFile:', registrationData.governmentIdFile);
            console.log('   - Is File?', registrationData.governmentIdFile instanceof File);
            
            if (registrationData.governmentIdFile && registrationData.governmentIdFile instanceof File) {
              console.log('📤 ✅ Uploading government ID...');
              const idUrl = await uploadDocument(registrationData.governmentIdFile, 'government-ids');
              processedData.governmentIdFile = idUrl;
              console.log('✅ Government ID uploaded:', idUrl);
            } else {
              console.log('⚠️ Government ID file not found or not a File instance');
            }
          } catch (uploadError: any) {
            console.error('❌ File upload error:', uploadError);
            alert(`File upload failed: ${uploadError.message}`);
            return false;
          }
          
          console.log('================== BEFORE API CALL ==================');
          console.log('processedData keys:', Object.keys(processedData));
          console.log('   - governmentId:', processedData.governmentId);
          console.log('   - governmentIdFile:', processedData.governmentIdFile);
          console.log('   - role:', processedData.role);
          
          let result = null;
          
          // Call appropriate registration endpoint
          switch (processedData.role) {
            case UserRole.AUCTIONEER:
              console.log('📡 Calling registerAuctioneer with full payload:');
              console.log(JSON.stringify({
                governmentId: processedData.governmentId,
                governmentIdFile: processedData.governmentIdFile,
                role: processedData.role,
                name: processedData.fullName,
                email: processedData.email,
                allKeys: Object.keys(processedData)
              }, null, 2));
              console.log('📡 Full processedData object:', processedData);
              result = await registerAuctioneer(processedData);
              if (result) {
                setCurrentUser({
                  name: processedData.fullName,
                  email: processedData.email,
                  avatar: undefined,
                  role: UserRole.AUCTIONEER
                });
                setCurrentMatchId(processedData.seasonId);
                setPendingDashboardStatus(AuctionStatus.AUCTIONEER_DASHBOARD);
                return true;
              }
              break;
              
            case UserRole.TEAM_REP:
              result = await registerTeam(processedData);
              if (result) {
                setCurrentUser({
                  name: processedData.fullName,
                  email: processedData.email,
                  avatar: undefined,
                  role: UserRole.TEAM_REP
                });
                setCurrentMatchId(processedData.seasonId);
                setPendingDashboardStatus(AuctionStatus.TEAM_REP_DASHBOARD);
                return true;
              }
              break;
              
            case UserRole.PLAYER:
              result = await registerPlayer(processedData);
              if (result && result.playerId) {
                setCurrentUser({
                  name: processedData.fullName,
                  email: processedData.email,
                  avatar: undefined,
                  role: UserRole.PLAYER,
                  playerId: result.playerId
                });
                setCurrentMatchId(processedData.seasonId);
                setPendingDashboardStatus(AuctionStatus.PLAYER_DASHBOARD);
                return true;
              }
              break;
              
            default:
              console.error('Unknown role:', processedData.role);
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
        console.log('=' .repeat(80));
        console.log('🚀 ADMIN REGISTRATION HANDLER STARTED');
        console.log('=' .repeat(80));
        
        console.log(`\n📦 Received admin data fields (${Object.keys(adminData).length}):`);
        Object.entries(adminData).forEach(([key, value]) => {
          if (typeof value === 'object' && value instanceof File) {
            console.log(`   ${key}: File object (${value.name})`);
          } else if (typeof value === 'object' && value !== null) {
            console.log(`   ${key}: ${JSON.stringify(value)}`);
          } else {
            console.log(`   ${key}: ${value}`);
          }
        });
        
        // Register admin to Cloud Function first
        let adminRegistrationSuccess = false;
        try {
          const adminPayload = {
            fullName: adminData.fullName,
            email: adminData.email,
            password: adminData.password,
            phone: adminData.phone || '',
            organizationName: adminData.organizationName || '',
            organizationType: adminData.organizerType || ''
          };
          
          console.log('\n1️⃣ Sending admin registration to /register/admin endpoint...');
          console.log(`   Fields: ${Object.keys(adminPayload).length}`);
          console.log(`   Payload: ${JSON.stringify(adminPayload, null, 2)}`);
          
          const response = await fetch('https://us-central1-axilam.cloudfunctions.net/auction/register/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(adminPayload)
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.error('Admin registration error:', errorData);
            alert(`Registration error: ${errorData.error || 'Failed to register admin'}`);
            throw new Error(errorData.error || 'Registration failed');
          }
          
          adminRegistrationSuccess = true;
          console.log('✅ Admin registered successfully to Cloud Function');
        } catch (err) {
          console.error('Failed to register admin:', err);
          if (!adminRegistrationSuccess) {
            alert('Failed to register admin. Please check your connection and try again.');
            throw err; // Propagate error to prevent further processing
          }
        }
        
        // Process admin registration locally
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
          status: 'SETUP',
          // Organizer fields
          organizerEmail: adminData.email,
          adminEmail: adminData.email,
          organizerPassword: adminData.password,
          organizerName: adminData.fullName,
          organizationType: adminData.organizerType,
          organizationName: adminData.organizationName,
          // Additional season fields
          seasonName: adminData.seasonName,
          sportType: adminData.sportType,
          auctionDateTime: adminData.auctionDateTime,
          venueMode: adminData.venueMode,
          venueLocation: adminData.venueLocation,
          // Configuration fields
          maxTeams: adminData.maxTeams,
          maxPlayersPerTeam: adminData.maxPlayersPerTeam,
          baseBudgetPerTeam: adminData.baseBudgetPerTeam,
          // Organizer details
          organizerPhone: adminData.phone,
          designation: adminData.designation,
          profilePhotoURL: adminData.profilePhotoURL,
          governmentId: adminData.governmentId,
          governmentIdURL: adminData.governmentIdURL,
          organizerProofURL: adminData.organizerProofURL
        };
        
        // Update state immediately - don't wait for Firebase save
        const sportIndex = allSports.findIndex(s => 
          s.sportType === adminData.sportType || s.customSportName === adminData.sportType
        );
        
        let updatedSports: SportData[];
        if (sportIndex >= 0) {
          updatedSports = [...allSports];
          updatedSports[sportIndex].matches.push(newMatch);
          setAllSports(updatedSports);
        } else {
          const newSportData: SportData = {
            sportType: adminData.sportType as SportType,
            matches: [newMatch]
          };
          updatedSports = [...allSports, newSportData];
          setAllSports(updatedSports);
        }
        
        // Update currentMatchId IMMEDIATELY - this triggers dashboard to load with correct match
        setCurrentSport(adminData.sportType as string);
        setCurrentMatchId(newMatchId);
        // CRITICAL: Save matchId to sessionStorage IMMEDIATELY so AdminDashboardPage can find it
        sessionStorage.setItem('hypehammer_current_match_id', newMatchId);
        // CRITICAL: Save sportType to sessionStorage too for consistency
        sessionStorage.setItem('hypehammer_current_sport', adminData.sportType as string);
        console.log('✅ Admin match created and set as current:', newMatchId);
        
        // Save to localStorage for persistence
        localStorage.setItem('hypehammer_sports', JSON.stringify(updatedSports));
        
        // Save to Firebase in background (don't await - this was causing the delay)
        saveSportsData(updatedSports).catch(err => {
          console.warn('⚠️ Failed to save sports data to backend:', err);
        });
        
        // Save match to Firebase - AWAIT to ensure it's saved before dashboard loads
        console.log('\n2️⃣ Preparing match data for /matches endpoint...');
        console.log(`   Total fields in newMatch: ${Object.keys(newMatch).length}`);
        console.log(`   Fields: ${Object.keys(newMatch).join(', ')}`);
        console.log(`   Match ID: ${newMatch.id}`);
        console.log(`   Match Name: ${newMatch.name}`);
        console.log(`   Organizer Email: ${newMatch.organizerEmail}`);
        console.log(`   Admin Email: ${newMatch.adminEmail}`);
        console.log(`   Sport Type: ${newMatch.sportType}`);
        console.log(`   Venue Mode: ${newMatch.venueMode}`);
        console.log(`   Personal Fields: fullName=${newMatch.organizerName}, phone=${newMatch.organizerPhone}, designation=${newMatch.designation}`);
        console.log(`   Document URLs: govId=${newMatch.governmentIdURL ? '✅' : '❌'}, proof=${newMatch.organizerProofURL ? '✅' : '❌'}`);
        console.log('\n   📦 Full match payload being sent:');
        console.log(JSON.stringify(newMatch, null, 2));
        
        try {
          const matchSaveResponse = await fetch('https://us-central1-axilam.cloudfunctions.net/auction/matches', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newMatch)
          });
          
          if (matchSaveResponse.ok) {
            const result = await matchSaveResponse.json();
            console.log('✅ Match saved to Firebase successfully');
            console.log(`   Response data keys: ${result.data && Object.keys(result.data).join(', ') || 'N/A'}`);
            console.log(`   organizerEmail in response: ${result.data?.organizerEmail || 'MISSING'}`);
            console.log(`   adminEmail in response: ${result.data?.adminEmail || 'MISSING'}`);
          } else {
            const error = await matchSaveResponse.json().catch(() => ({ error: 'Unknown error' }));
            console.error('❌ Failed to save match to Firebase');
            console.error(`   Status: ${matchSaveResponse.status}`);
            console.error(`   Error: ${JSON.stringify(error)}`);
          }
        } catch (err) {
          console.error('❌ Failed to save match to Firebase:', err);
        }
        
        // Redirect to admin dashboard - the match data is now saved and available
        setStatus(AuctionStatus.ADMIN_DASHBOARD);
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

  if (status === AuctionStatus.ADMIN_DASHBOARD) {
    // Admin dashboard — role is validated at login, not during render
    console.log('🎨 Rendering ADMIN_DASHBOARD | Role:', currentUser.role, '| Match:', currentMatch?.id || 'null');
    return <AdminDashboardPage 
      setStatus={setStatus}
      currentMatch={currentMatch}
      currentUser={currentUser}
    />;
  }

  if (status === AuctionStatus.AUCTIONEER_DASHBOARD) {
    if (!currentMatch) {
      return (
        <div className="w-full h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a0a 50%, #0a0505 100%)' }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-pink-500 mx-auto mb-4" style={{ boxShadow: '0 0 30px rgba(255, 0, 102, 0.3)' }}></div>
            <p className="text-pink-300 text-lg font-medium">Loading match data...</p>
          </div>
        </div>
      );
    }
    console.log('🎨 Rendering AUCTIONEER_DASHBOARD, currentMatch:', currentMatch?.id);
    // Always render dashboard - it will handle approval states and loading
    return <AuctioneerDashboardPage 
      setStatus={setStatus}
      currentMatch={currentMatch}
      currentUser={currentUser}
    />;
  }

  // Team Rep Dashboard and Player Dashboard have been removed.
  // These statuses redirect back to the home page.
  if (status === AuctionStatus.TEAM_REP_DASHBOARD || status === AuctionStatus.PLAYER_DASHBOARD) {
    setStatus(AuctionStatus.HOME);
    return null;
  }

  if (status === AuctionStatus.GUEST_DASHBOARD) {
    if (!currentMatch) {
      return (
        <div className="w-full h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a0a 50%, #0a0505 100%)' }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-pink-500 mx-auto mb-4" style={{ boxShadow: '0 0 30px rgba(255, 0, 102, 0.3)' }}></div>
            <p className="text-pink-300 text-lg font-medium">Loading match data...</p>
          </div>
        </div>
      );
    }
    console.log('🎨 Rendering GUEST_DASHBOARD, currentMatch:', currentMatch?.id);
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
      currentMatch={currentMatch}
    />;
  }

  // Fallback/default view - auction room for READY/LIVE/PAUSED/ENDED statuses
  console.log('🎨 Rendering fallback auction room view, status:', status);
  
  // Determine confetti size based on user role
  const getConfettiSize = (): 'none' | 'small' | 'normal' => {
    if (currentUser.role === UserRole.AUCTIONEER) return 'none'; // No confetti for auctioneers
    return 'small'; // Small confetti for all spectators (guests, players, team reps)
  };
  
  return (
    <div className="h-screen bg-gradient-to-br from-white via-blue-50 to-orange-50 flex flex-col items-center p-4 lg:p-8 overflow-hidden relative">
      {soldAnimationData && currentUser.role !== UserRole.AUCTIONEER && <SoldCelebration player={soldAnimationData.player} team={soldAnimationData.team} price={soldAnimationData.price} onComplete={() => { setSoldAnimationData(null); setTimeout(() => handleNextPlayer(), 100); }} confettiSize={getConfettiSize()} compact={true} />}

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
              currentMatchId={currentMatchId || undefined}
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
  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <AppContent />
  </BrowserRouter>
);

export default App;
