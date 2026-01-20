import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

// Import Components
import {
  HUDPill, OrbitalItem, SoldCelebration, SettingsSidebar,
  HomePage, AuthPage, HowItWorksPage, SetupPage, MatchesPage, SettingsPage, SettingsLayoutPage, DashboardPage, PlayersPage, TeamsPage, AuctionRoomPage, HistoryPage,
  PlayerModal, TeamModal, SquadModal, PlayerDashboardPage, PlayerRegistrationPage
} from './components';

// --- Core Application ---

const App: React.FC = () => {
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
  const [status, setStatus] = useState<AuctionStatus>(AuctionStatus.HOME);
  
  // User state
  const [currentUser, setCurrentUser] = useState({
    name: 'Guest User',
    email: 'guest@hypehammer.com',
    avatar: undefined,
    role: UserRole.AUCTIONEER,
    playerId: undefined as string | undefined
  });
  
  // Settings sidebar state
  const [isSettingsSidebarOpen, setIsSettingsSidebarOpen] = useState(false);
  
  // Multi-sport, multi-match state
  const [allSports, setAllSports] = useState<SportData[]>([]);
  const [currentSport, setCurrentSport] = useState<string | null>(null);
  const [currentMatchId, setCurrentMatchId] = useState<string | null>(null);
  
  // Current match data (derived from allSports)
  const currentSportData = useMemo(() => {
    return allSports.find(s => 
      s.sportType === currentSport || s.customSportName === currentSport
    );
  }, [allSports, currentSport]);

  const currentMatch = useMemo(() => {
    if (!currentSportData || !currentMatchId) return null;
    return currentSportData.matches.find(m => m.id === currentMatchId);
  }, [currentSportData, currentMatchId]);

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
        const savedState = await loadAppState();
        const sportsFromDB = await loadAllSportsFromDB();

        if (savedState) {
          setStatus(savedState.status as AuctionStatus);
          setCurrentSport(savedState.currentSport);
          setCurrentMatchId(savedState.currentMatchId);
          setActiveTab(savedState.activeTab as any);
        }

        if (sportsFromDB && sportsFromDB.length > 0) {
          setAllSports(sportsFromDB);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadSavedData();
  }, []);

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

  // Save sports data to JSON file whenever it changes
  useEffect(() => {
    saveSportsData(allSports);
  }, [allSports]);

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

  // --- Layout Views ---

  if (status === AuctionStatus.HOME) {
    return <HomePage setStatus={setStatus} />;
  }

  if (status === AuctionStatus.AUTH) {
    return <AuthPage 
      setStatus={setStatus} 
      onLogin={(userData) => setCurrentUser(userData)}
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
    return <PlayerDashboardPage 
      currentUser={currentUser}
      allSports={allSports}
      onEditProfile={() => setStatus(AuctionStatus.PLAYER_REGISTRATION)}
    />;
  }

  if (status === AuctionStatus.HOW_IT_WORKS) {
    return <HowItWorksPage setStatus={setStatus} />;
  }

  if (status === AuctionStatus.SETUP) {
    return <SetupPage 
      config={config} 
      setConfig={setConfig} 
      onSelectSport={handleSelectSport}
      setStatus={setStatus} 
    />;
  }

  if (status === AuctionStatus.MATCHES) {
    if (!currentSportData) {
      setStatus(AuctionStatus.SETUP);
      return null;
    }
    return <MatchesPage 
      sportData={currentSportData}
      setStatus={setStatus}
      onCreateMatch={handleCreateMatch}
      onUpdateMatch={handleUpdateMatch}
      onSelectMatch={handleSelectMatch}
      onDeleteMatch={handleDeleteMatch}
      onBackToSetup={handleBackToSetup}
    />;
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

  return (
    <div className="h-screen bg-[#0d0a09] flex flex-col items-center p-4 lg:p-8 overflow-hidden relative">
      {soldAnimationData && <SoldCelebration player={soldAnimationData.player} team={soldAnimationData.team} price={soldAnimationData.price} onComplete={() => { setSoldAnimationData(null); setTimeout(() => handleNextPlayer(), 100); }} />}

      <div className="fixed top-8 left-10 z-[60] flex items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl cursor-pointer overflow-hidden border-2 border-[#c5a059]" onClick={() => setStatus(AuctionStatus.HOME)}>
            <img src="./logo.jpg" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <div className="hidden sm:block">
            <h2 className="text-xl font-display font-black tracking-widest gold-text uppercase leading-none">HypeHammer</h2>
            <p className="text-[10px] font-bold text-[#b4a697] uppercase tracking-[0.3em] mt-1">{config.sport} Protocol</p>
          </div>
        </div>
        <button onClick={handleBackToMatches} className="bg-[#1a1410]/80 border border-[#c5a059]/20 backdrop-blur-xl px-4 py-2.5 rounded-full text-[#c5a059] hover:bg-[#c5a059] hover:text-[#0d0a09] transition-all shadow-lg flex items-center gap-2"><ArrowLeft size={14} /><span className="text-[9px] font-black uppercase tracking-[0.2em]">Back to Matches</span></button>
      </div>

      <div className="fixed top-8 right-10 z-[60] flex gap-3">
        {currentPlayerIdx !== null && <HUDPill icon={<TrendingUp size={12} />}>Round {auctionRound}</HUDPill>}
        <HUDPill icon={<Activity size={12} />}>System Live</HUDPill>
        <button onClick={() => setIsSettingsSidebarOpen(true)} className="p-2.5 bg-[#a65d50]/10 border border-[#a65d50]/20 rounded-full text-[#a65d50] hover:bg-[#a65d50] hover:text-white transition-all"><Settings size={16} /></button>
      </div>

      <div className="w-full max-w-[1500px] h-full flex flex-col pt-20 pb-20">
        <div className="flex-1 overflow-y-auto custom-scrollbar px-2 lg:px-4 animate-in fade-in duration-700">
          {activeTab === 'dashboard' && (
            <DashboardPage players={players} teams={teams} history={history} />
          )}

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
              className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-2xl relative border border-[#c5a059]/30 ${isNavExpanded ? 'bg-[#c5a059] text-[#0d0a09]' : 'orbital-nav text-[#c5a059]'}`}
            >
              {isNavExpanded ? <X size={24} /> : <Gavel size={24} />}
              {!isNavExpanded && <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#c5a059] rounded-full animate-pulse border border-[#0d0a09]"></div>}
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

export default App;
