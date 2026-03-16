
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Plus, Users, LayoutDashboard, Settings, Gavel, 
  Trophy, TrendingUp, Info, LogOut, CheckCircle2, 
  XCircle, Clock, Search, ChevronRight, Menu, X,
  History, PieChart, Image as ImageIcon, Globe, DollarSign,
  Edit2, Trash2, Eye, ShieldCheck, ChevronLeft, Cpu, Activity,
  MapPin, Calendar, FileText, User, Sparkles, TrendingDown,
  Timer, BarChart3, Wallet, Zap, Briefcase, Play, ArrowRight, Shield,
  ExternalLink, HelpCircle, BookOpen, ArrowLeft, FastForward, ChevronUp, Download, RefreshCw
} from 'lucide-react';
import { 
  SportType, AuctionType, AuctionStatus, 
  AuctionConfig, Player, Team, Bid 
} from './types';
import { INITIAL_CONFIG, SPORT_DEFAULTS, MOCK_PLAYERS, MOCK_TEAMS } from './constants';
import { getAuctionInsights } from './services/geminiService';

// --- Atomic Command Components ---

const HUDPill: React.FC<{ children: React.ReactNode; icon?: React.ReactNode; className?: string }> = ({ children, icon, className = "" }) => (
  <div className={`flex items-center gap-2 bg-[#1a1410]/80 border border-[#c5a059]/20 backdrop-blur-xl px-4 py-2 rounded-full shadow-lg ${className}`}>
    {icon && <span className="text-[#c5a059]">{icon}</span>}
    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#b4a697]">{children}</span>
  </div>
);

const CommandCard: React.FC<{ title: string; children: React.ReactNode; icon?: React.ReactNode; className?: string; actions?: React.ReactNode }> = ({ 
  title, children, icon, className = "", actions 
}) => (
  <div className={`bg-[#1a1410]/60 border border-[#3d2f2b] rounded-[2rem] p-6 backdrop-blur-md shadow-2xl relative group ${className}`}>
    <div className="flex items-center justify-between mb-6">
      <h3 className="text-[11px] font-display font-black flex items-center gap-3 tracking-[0.3em] text-[#c5a059] uppercase">
        {icon && <span>{icon}</span>}
        {title}
      </h3>
      {actions && <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">{actions}</div>}
    </div>
    {children}
  </div>
);

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ 
  isOpen, onClose, title, children 
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md">
      <div className="bg-[#1a1410] border border-[#c5a059]/30 w-full max-w-4xl rounded-[3rem] shadow-[0_0_100px_rgba(197,160,89,0.15)] overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="px-10 py-8 border-b border-[#3d2f2b] flex items-center justify-between bg-[#211a17]/30">
          <h3 className="text-2xl font-display font-black text-[#f5f5dc] tracking-widest uppercase">{title}</h3>
          <button onClick={onClose} className="p-3 hover:bg-[#3d2f2b] rounded-2xl text-[#b4a697] hover:text-[#f5f5dc] transition-all">
            <X size={24} />
          </button>
        </div>
        <div className="p-10 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

const SoldCelebration: React.FC<{ player: Player; team: Team; price: number; onComplete: () => void }> = ({ player, team, price, onComplete }) => {
  const [stage, setStage] = useState<'hammer' | 'sparkle'>('hammer');
  useEffect(() => {
    const hammerTimer = setTimeout(() => setStage('sparkle'), 1200);
    const completeTimer = setTimeout(onComplete, 3500);
    return () => {
      clearTimeout(hammerTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center celebration-overlay animate-in fade-in duration-500 backdrop-blur-sm">
      <div className="text-center relative px-6">
        {stage === 'hammer' && (
          <div className="flex flex-col items-center animate-in zoom-in duration-300">
            <div className="w-48 h-48 bg-[#c5a059]/10 rounded-full flex items-center justify-center border border-[#c5a059]/30 mb-8 relative">
              <Gavel size={80} className="text-[#c5a059] hammer-strike" />
              <div className="absolute inset-0 shimmer-gold rounded-full opacity-30"></div>
            </div>
            <h2 className="text-5xl font-display font-black text-[#c5a059] uppercase tracking-[0.4em] animate-pulse">GOING ONCE... TWICE...</h2>
          </div>
        )}
        {stage === 'sparkle' && (
          <div className="animate-in zoom-in duration-500">
            <div className="relative mb-12">
               <div className="w-64 h-64 mx-auto rounded-[3rem] overflow-hidden border-4 border-[#c5a059] shadow-[0_0_80px_rgba(197,160,89,0.6)] relative z-10">
                 {player.imageUrl ? <img src={player.imageUrl} className="w-full h-full object-cover" /> : <Users size={100} className="text-[#3d2f2b] m-14" />}
                 <div className="absolute inset-0 shimmer-gold opacity-50"></div>
               </div>
            </div>
            <div className="space-y-4">
              <h1 className="text-7xl font-display font-black gold-text uppercase tracking-tighter drop-shadow-[0_0_20px_rgba(197,160,89,0.5)]">SOLD!</h1>
              <p className="text-3xl font-display font-bold text-[#f5f5dc] uppercase tracking-widest">To <span className="text-[#c5a059]">{team.name}</span></p>
              <p className="text-5xl font-mono font-black text-[#f5f5dc] border-t border-[#c5a059]/20 pt-6 mt-6">${price.toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Core Application ---

const App: React.FC = () => {
  const [status, setStatus] = useState<AuctionStatus>(AuctionStatus.HOME);
  const [config, setConfig] = useState<AuctionConfig>(INITIAL_CONFIG);
  const [players, setPlayers] = useState<Player[]>(MOCK_PLAYERS);
  const [teams, setTeams] = useState<Team[]>(MOCK_TEAMS);
  const [history, setHistory] = useState<Bid[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'players' | 'teams' | 'room' | 'history'>('dashboard');
  const [isNavExpanded, setIsNavExpanded] = useState(false);

  const [playerSearch, setPlayerSearch] = useState('');
  const [teamSearch, setTeamSearch] = useState('');
  const [aiInsights, setAiInsights] = useState<string[]>([]);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);

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

  useEffect(() => {
    if (activeTab === 'dashboard' && status === AuctionStatus.READY) {
      getAuctionInsights(players, teams, config).then(data => {
        setAiInsights(data.insights || []);
      });
    }
  }, [activeTab, status, players.length, teams.length, config]);

  // Fetch data from public/data/*.json and poll for updates every 5s
  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        const [pRes, tRes] = await Promise.all([fetch('/data/players.json'), fetch('/data/teams.json')]);
        if (!mounted) return;
        if (pRes.ok) {
          const pdata = await pRes.json();
          if (Array.isArray(pdata)) setPlayers(pdata);
        }
        if (tRes.ok) {
          const tdata = await tRes.json();
          if (Array.isArray(tdata)) setTeams(tdata);
        }
      } catch (e) {
        console.warn('Failed to fetch public data', e);
      }
    };

    fetchData();
    const id = setInterval(fetchData, 5000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

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
      updatedPlayers[currentPlayerIdx] = { ...player, status: 'SOLD', teamId: currentBidderId, soldPrice: currentBid };
      const tIdx = updatedTeams.findIndex(t => t.id === currentBidderId);
      updatedTeams[tIdx] = { ...updatedTeams[tIdx], remainingBudget: updatedTeams[tIdx].remainingBudget - currentBid, players: [...updatedTeams[tIdx].players, player.id] };
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
    return (
      <div className="min-h-screen bg-[#0d0a09] flex flex-col overflow-hidden">
        {/* Header with Logo and How It Works */}
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-[#c5a059] shadow-2xl">
              <img src="./logo.jpg" alt="HypeHammer Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="text-xl font-display font-black tracking-widest gold-text uppercase leading-none">HypeHammer</h2>
              <p className="text-[9px] font-bold text-[#b4a697] uppercase tracking-[0.3em] mt-1">Command Center</p>
            </div>
          </div>
          <button onClick={() => setIsHowItWorksOpen(true)} className="flex items-center gap-3 bg-[#1a1410]/80 border border-[#c5a059]/20 backdrop-blur-xl px-6 py-3 rounded-full text-[#c5a059] hover:bg-[#c5a059] hover:text-[#0d0a09] transition-all shadow-lg">
            <HelpCircle size={18} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">How It Works</span>
          </button>
        </div>

        {/* Hero Section */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-4xl space-y-12 animate-in fade-in zoom-in duration-1000">
            <div className="space-y-4">
              <h1 className="text-8xl md:text-9xl font-display font-black tracking-tighter text-[#f5f5dc] leading-none drop-shadow-2xl uppercase">DRAFT THE <br /><span className="gold-text">FUTURE.</span></h1>
              <p className="text-[#c5a059] text-xs font-black uppercase tracking-[0.5em]">HypeHammer Command v2.5</p>
            </div>
            <button onClick={() => setStatus(AuctionStatus.SETUP)} className="group relative px-16 py-8 gold-gradient text-[#0d0a09] font-black uppercase tracking-[0.4em] rounded-full shadow-2xl text-sm hover:scale-105 active:scale-95 transition-all"><span className="relative z-10 flex items-center gap-4"><Play size={20} fill="currentColor" /> Initialize Market</span></button>
          </div>
        </div>
      </div>
    );
  }

  if (status === AuctionStatus.SETUP) {
    return (
      <div className="min-h-screen bg-[#0d0a09] flex flex-col items-center justify-center p-10 overflow-hidden relative">
        <div className="fixed top-8 left-10 z-[60]"><button onClick={() => setStatus(AuctionStatus.HOME)} className="flex items-center gap-3 bg-[#1a1410]/80 border border-[#c5a059]/20 backdrop-blur-xl px-5 py-3 rounded-full text-[#c5a059] hover:bg-[#c5a059] hover:text-[#0d0a09] transition-all shadow-lg"><ArrowLeft size={18} /><span className="text-[10px] font-black uppercase tracking-[0.2em]">Exit To Home</span></button></div>
        <div className="max-w-4xl w-full z-10">
          <div className="text-center mb-12 space-y-4"><h1 className="text-8xl font-display font-black tracking-tighter text-[#f5f5dc] drop-shadow-2xl">HYPE<span className="gold-text">HAMMER</span></h1><p className="text-[#c5a059] text-xs font-black uppercase tracking-[0.5em]">Setup Protocol</p></div>
          <div className="bg-[#1a1410] border border-[#c5a059]/30 rounded-[3rem] p-12 shadow-[0_0_80px_rgba(0,0,0,0.8)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-8">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#b4a697]">Global Discipline</label>
                <div className="grid grid-cols-2 gap-4">
                  {Object.values(SportType).map((s) => (
                    <button key={s} onClick={() => setConfig({ ...config, sport: s, roles: SPORT_DEFAULTS[s].roles || [], squadSize: SPORT_DEFAULTS[s].squadSize || config.squadSize, totalBudget: SPORT_DEFAULTS[s].totalBudget || config.totalBudget })} className={`p-6 rounded-2xl border transition-all duration-500 text-left relative overflow-hidden group ${config.sport === s ? 'border-[#c5a059] bg-[#c5a059]/10' : 'border-[#3d2f2b] bg-[#120d0b] hover:border-[#5c4742]'}`}><span className={`font-display font-bold text-xl uppercase ${config.sport === s ? 'text-[#f5f5dc]' : 'text-[#b4a697]'}`}>{s}</span></button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col justify-between">
                <div className="space-y-10">
                  <div className="space-y-4"><label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#b4a697]">Capital Limit</label><input type="number" className="w-full bg-[#120d0b] border border-[#3d2f2b] rounded-2xl px-6 py-5 text-[#f5f5dc] font-mono text-xl focus:ring-1 ring-[#c5a059] outline-none" value={config.totalBudget} onChange={(e) => setConfig({ ...config, totalBudget: Number(e.target.value) })} /></div>
                  <div className="space-y-4"><label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#b4a697]">Framework</label><select className="w-full bg-[#120d0b] border border-[#3d2f2b] rounded-2xl px-6 py-5 text-[#f5f5dc] font-bold uppercase tracking-wider outline-none appearance-none" value={config.type} onChange={(e) => setConfig({ ...config, type: e.target.value as AuctionType })}>{Object.values(AuctionType).map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                </div>
                <button onClick={() => setStatus(AuctionStatus.READY)} className="gold-gradient hover:brightness-110 text-[#0d0a09] font-black py-6 rounded-2xl mt-12 transition-all shadow-2xl uppercase tracking-[0.3em] text-sm">Synchronize Command</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
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
        <button onClick={() => setStatus(AuctionStatus.SETUP)} className="bg-[#1a1410]/80 border border-[#c5a059]/20 backdrop-blur-xl px-4 py-2.5 rounded-full text-[#c5a059] hover:bg-[#c5a059] hover:text-[#0d0a09] transition-all shadow-lg flex items-center gap-2"><ArrowLeft size={14} /><span className="text-[9px] font-black uppercase tracking-[0.2em]">Back to Setup</span></button>
      </div>

      <div className="fixed top-8 right-10 z-[60] flex gap-3">
        {currentPlayerIdx !== null && <HUDPill icon={<TrendingUp size={12} />}>Round {auctionRound}</HUDPill>}
        <HUDPill icon={<Activity size={12} />}>System Live</HUDPill>
        <button onClick={() => setStatus(AuctionStatus.SETUP)} className="p-2.5 bg-[#a65d50]/10 border border-[#a65d50]/20 rounded-full text-[#a65d50] hover:bg-[#a65d50] hover:text-white transition-all"><Settings size={16} /></button>
        <button onClick={async () => {
          try {
            const [pRes, tRes] = await Promise.all([fetch('/data/players.json'), fetch('/data/teams.json')]);
            if (pRes.ok) setPlayers(await pRes.json());
            if (tRes.ok) setTeams(await tRes.json());
          } catch (e) {
            console.warn('Refresh data failed', e);
          }
        }} className="p-2.5 bg-[#1a1410]/80 border border-[#c5a059]/20 rounded-full text-[#c5a059] hover:bg-[#c5a059] hover:text-[#0d0a09] transition-all" title="Refresh data"><RefreshCw size={16} /></button>
      </div>

      <div className="w-full max-w-[1500px] h-full flex flex-col pt-20 pb-20">
        <div className="flex-1 overflow-y-auto custom-scrollbar px-2 lg:px-4 animate-in fade-in duration-700">
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 pb-20">
              <div className="lg:col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label="Draft Progress" value={`${players.length > 0 ? Math.round((players.filter(p => p.status === 'SOLD').length / players.length) * 100) : 0}%`} icon={<Zap />} subValue={`${players.filter(p => p.status === 'SOLD').length} of ${players.length} registered`} />
                <StatCard label="Total Market Value" value={`$${(totalValueSold / 1000000).toFixed(2)}M`} icon={<TrendingUp />} subValue={`Avg. Price: $${(avgPlayerPrice/1000000).toFixed(2)}M`} />
                <StatCard label="Capital Utilization" value={`${totalAvailableBudget > 0 ? Math.round((totalValueSold / totalAvailableBudget) * 100) : 0}%`} icon={<Wallet />} subValue={`Spent: $${(totalValueSold/1000000).toFixed(1)}M / Total: $${(totalAvailableBudget/1000000).toFixed(1)}M`} />
                <StatCard label="Top Tier Franchise" value={topSpentTeam?.name || '—'} icon={<Trophy />} subValue={`Spent $${((topSpentTeam?.budget - topSpentTeam?.remainingBudget) / 1000000).toFixed(1)}M so far`} />
              </div>
              <div className="lg:col-span-12 mt-6">
                <CommandCard title="Strategic Liquidity" icon={<BarChart3 size={16}/>}>
                  <div className="h-[300px] flex items-end justify-between gap-4 px-4 pb-4 border-b border-[#3d2f2b]">
                    {teams.map(t => (
                      <div key={t.id} className="flex-1 flex flex-col items-center gap-3 group relative">
                        <div className="w-full gold-gradient rounded-t-xl transition-all group-hover:brightness-125" style={{ height: `${((t.budget - t.remainingBudget) / t.budget) * 200 + 10}px` }}></div>
                        <span className="text-[10px] font-black uppercase text-[#b4a697] truncate w-full text-center">{t.name}</span>
                        <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-all bg-[#c5a059] text-[#0d0a09] px-3 py-1 rounded-lg text-[10px] font-black">${((t.budget-t.remainingBudget)/1000000).toFixed(1)}M</div>
                      </div>
                    ))}
                  </div>
                </CommandCard>
              </div>
            </div>
          )}

          {activeTab === 'players' && (
            <CommandCard title="Registry" className="w-full min-h-full">
              <div className="flex flex-col sm:flex-row justify-between mb-8 gap-4">
                <div className="relative w-full sm:w-96"><Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#b4a697]" size={20} /><input type="text" placeholder="Scan registry..." className="w-full bg-[#0d0a09] border border-[#3d2f2b] rounded-full pl-14 pr-6 py-4 text-[#f5f5dc] focus:ring-1 ring-[#c5a059] outline-none" value={playerSearch} onChange={(e) => setPlayerSearch(e.target.value)} /></div>
                <button onClick={() => { setEditingPlayerId(null); setNewPlayer({ name: '', basePrice: 0, status: 'PENDING' }); setIsPlayerModalOpen(true); }} className="px-6 py-4 gold-gradient text-[#0d0a09] rounded-full font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-2xl"><Plus size={16} /> Register Talent</button>
              </div>
              <table className="w-full text-left">
                <thead className="text-[10px] font-black uppercase tracking-[0.2em] text-[#b4a697] border-b border-[#3d2f2b]"><tr><th className="pb-4">Asset</th><th className="pb-4">Valuation</th><th className="pb-4">Status</th><th className="pb-4 text-right">Actions</th></tr></thead>
                <tbody className="divide-y divide-[#3d2f2b]/30">
                  {filteredPlayers.map(p => (
                    <tr key={p.id} className="group hover:bg-[#c5a059]/5 transition-all"><td className="py-4 font-bold text-base text-[#f5f5dc]">{p.name}</td><td className="py-4 font-mono text-base font-bold text-[#f5f5dc]">${p.basePrice.toLocaleString()}</td><td className="py-4"><span className={`text-[9px] font-black px-2 py-0.5 border rounded uppercase ${p.status === 'SOLD' ? 'text-green-500 border-green-500/20' : 'text-[#c5a059] border-[#c5a059]/20'}`}>{p.status}</span></td><td className="py-4 text-right"><div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all"><button onClick={() => handleEditPlayer(p)} className="p-2 text-[#c5a059] hover:bg-[#c5a059]/10 rounded-lg"><Edit2 size={14} /></button><button onClick={() => setPlayers(prev => prev.filter(pl => pl.id !== p.id))} className="p-2 text-[#a65d50] hover:bg-[#a65d50]/10 rounded-lg"><Trash2 size={14} /></button></div></td></tr>
                  ))}
                </tbody>
              </table>
            </CommandCard>
          )}

          {activeTab === 'teams' && (
            <div className="space-y-8 pb-20">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="relative w-full sm:w-96"><Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#b4a697]" size={20} /><input type="text" placeholder="Find franchise..." className="w-full bg-[#0d0a09] border border-[#3d2f2b] rounded-full pl-14 pr-6 py-4 text-[#f5f5dc] focus:ring-1 ring-[#c5a059] outline-none" value={teamSearch} onChange={(e) => setTeamSearch(e.target.value)} /></div>
                <button onClick={() => { setEditingTeamId(null); setNewTeam({ name: '', budget: config.totalBudget }); setIsTeamModalOpen(true); }} className="px-6 py-4 gold-gradient text-[#0d0a09] rounded-full font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-2xl"><Plus size={16} /> Establish Franchise</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredTeams.map(t => (
                  <CommandCard key={t.id} title={t.name} icon={<ShieldCheck size={16} />} actions={<><button onClick={() => handleEditTeam(t)} className="p-2 text-[#b4a697] hover:text-[#c5a059]"><Edit2 size={12} /></button><button onClick={() => setTeams(prev => prev.filter(tm => tm.id !== t.id))} className="p-2 text-[#b4a697] hover:text-[#a65d50]"><Trash2 size={12} /></button></>}>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-[#0d0a09] border border-[#c5a059]/10 rounded-2xl flex items-center justify-center p-2">
                          {t.logo ? <img src={t.logo} className="w-full h-full object-contain" /> : <Trophy size={24} className="text-[#3d2f2b]" />}
                        </div>
                        <div>
                          <p className="text-xl font-display font-black text-[#f5f5dc] uppercase">{t.name}</p>
                          <p className="text-[10px] uppercase font-bold text-[#b4a697]">{t.players.length} Players Secured</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <p className="text-[10px] font-black uppercase text-[#b4a697]">Liquidity</p>
                          <p className="text-xl font-mono font-black text-[#f5f5dc]">${t.remainingBudget.toLocaleString()}</p>
                        </div>
                        <div className="w-full h-1.5 bg-[#0d0a09] rounded-full overflow-hidden border border-[#3d2f2b]">
                          <div className="h-full gold-gradient" style={{ width: `${(t.remainingBudget/t.budget)*100}%` }}></div>
                        </div>
                      </div>
                      <button onClick={() => { setViewingSquadTeamId(t.id); setIsSquadModalOpen(true); }} className="w-full py-3 border border-[#c5a059]/20 rounded-xl text-[9px] font-black uppercase hover:bg-[#c5a059]/10 transition-all text-[#c5a059]">Review Roster</button>
                    </div>
                  </CommandCard>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'room' && (
            <div className="h-full w-full max-w-[1400px] mx-auto overflow-hidden flex flex-col">
              {currentPlayerIdx !== null ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
                  <div className="lg:col-span-3 flex flex-col gap-4">
                    <CommandCard title="Individual Data" className="flex-1">
                      <div className="p-4 bg-[#0d0a09]/60 rounded-2xl border border-[#3d2f2b]">
                        <p className="text-[11px] text-[#f5f5dc] italic leading-relaxed">{players[currentPlayerIdx].stats || 'Analyzing field metrics...'}</p>
                      </div>
                    </CommandCard>
                    <div className="flex flex-col gap-4">
                      <button onClick={() => finalizePlayer(true)} disabled={!currentBidderId} className={`py-4 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 transition-all ${currentBidderId ? 'bg-[#8b9d77] text-[#0d0a09]' : 'bg-[#3d2f2b] text-[#5c4742] opacity-50'}`}><CheckCircle2 size={14} /> Sell</button>
                      <button onClick={skipPlayer} className="py-4 rounded-2xl bg-[#3d2f2b] text-[#f5f5dc] font-black uppercase text-[10px] flex items-center justify-center gap-2 transition-all border border-[#c5a059]/10 hover:bg-[#c5a059]/20"><FastForward size={14} /> Skip Deferral</button>
                    </div>
                  </div>
                  <div className="lg:col-span-6 flex flex-col gap-6 h-full justify-between">
                    <div className="bg-[#1a1410] border border-[#c5a059]/30 rounded-[3rem] overflow-hidden shadow-2xl relative flex-1 flex flex-col">
                      <div className="absolute top-6 left-6 z-20 flex items-center gap-3 bg-black/60 px-4 py-2 rounded-2xl border border-[#c5a059]/20 backdrop-blur-md"><Timer size={16} className={timer < 10 ? 'text-[#a65d50] animate-pulse' : 'text-[#c5a059]'} /><span className={`text-xl font-mono font-black ${timer < 10 ? 'text-[#a65d50]' : 'text-[#f5f5dc]'}`}>00:{timer < 10 ? `0${timer}` : timer}</span></div>
                      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_center,_#211a17_0%,_#1a1410_100%)]">
                        <div className="w-44 h-44 bg-[#0d0a09] border-4 border-[#c5a059]/20 rounded-[3rem] overflow-hidden p-2 mb-6">
                          {players[currentPlayerIdx].imageUrl ? <img src={players[currentPlayerIdx].imageUrl} className="w-full h-full object-cover rounded-[2.5rem]" /> : <Users size={64} className="text-[#3d2f2b] m-10" />}
                        </div>
                        <h2 className="text-4xl font-display font-black uppercase text-[#f5f5dc] tracking-tighter text-center">{players[currentPlayerIdx].name}</h2>
                        <div className="mt-4 px-4 py-1.5 rounded-full border border-[#c5a059]/20 bg-[#c5a059]/5 text-[9px] font-black uppercase text-[#c5a059] tracking-widest">{players[currentPlayerIdx].status === 'UNSOLD' ? `Round ${auctionRound} (Recycled)` : `Sequence Active`}</div>
                      </div>
                      <div className="p-8 bg-[#120d0b] border-t border-[#3d2f2b] text-center flex-1 flex flex-col justify-center">
                        <p className="text-[9px] uppercase font-black text-[#c5a059] mb-1">Current Engagement</p>
                        <p className="text-6xl font-mono font-black text-[#f5f5dc] leading-none drop-shadow-md">${currentBid.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                  <div className="lg:col-span-3 flex flex-col h-full overflow-y-auto custom-scrollbar space-y-3">
                    {teams.map(t => { 
                      const nextBid = currentBidderId === null ? currentBid : currentBid + 500000; 
                      const isTop = currentBidderId === t.id; 
                      return (
                        <div key={t.id} className={`p-4 rounded-3xl border transition-all flex flex-col gap-3 ${isTop ? 'bg-[#c5a059] border-[#f5f5dc]' : 'bg-[#1a1410] border-[#3d2f2b]'}`}>
                          <div className="flex justify-between items-start"><span className={`font-black uppercase tracking-widest text-xs truncate ${isTop ? 'text-[#0d0a09]' : 'text-[#f5f5dc]'}`}>{t.name}</span><span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded ${isTop ? 'bg-[#0d0a09]/10 text-[#0d0a09]' : 'bg-black text-[#c5a059]'}`}>${(t.remainingBudget/1000000).toFixed(1)}M</span></div>
                          <button disabled={nextBid > t.remainingBudget || isTop} onClick={() => placeBid(t.id, nextBid)} className={`w-full py-2 rounded-2xl font-black uppercase text-[10px] transition-all ${isTop ? 'bg-[#0d0a09] text-white' : 'bg-[#211a17] text-[#c5a059] border border-[#c5a059]/20'}`}>{isTop ? 'Winning' : `Bid $${(nextBid/1000).toFixed(0)}k`}</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center space-y-12 animate-in fade-in duration-700">
                  <div className="w-40 h-40 gold-gradient rounded-[3rem] flex items-center justify-center shadow-2xl"><Cpu size={64} className="text-[#0d0a09]" /></div>
                  <div className="text-center space-y-6 max-w-xl px-4">
                    <h2 className="text-4xl font-display font-black uppercase text-[#f5f5dc] tracking-widest">Protocol Staged</h2>
                    <p className="text-xs text-[#b4a697] uppercase tracking-[0.4em] font-medium leading-relaxed">Available Units: {players.filter(p => p.status === 'PENDING' || p.status === 'UNSOLD').length} remaining.</p>
                    <button onClick={() => handleNextPlayer()} className="group relative px-12 py-5 gold-gradient text-[#0d0a09] font-black uppercase tracking-[0.4em] rounded-full shadow-2xl text-sm transition-all active:scale-95 hover:brightness-110">Launch Selection Cycle</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <CommandCard title="Market Archive" className="w-full" actions={<button onClick={exportHistoryAsJson} className="flex items-center gap-2 bg-[#c5a059]/10 text-[#c5a059] px-4 py-2 rounded-full text-[9px] font-black uppercase hover:bg-[#c5a059] hover:text-[#0d0a09] transition-all"><Download size={14} /> Export Protocol</button>}>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="text-[10px] font-black uppercase tracking-[0.2em] text-[#b4a697] border-b border-[#3d2f2b]"><tr><th className="pb-4">Timestamp</th><th className="pb-4">Asset</th><th className="pb-4">Franchise</th><th className="pb-4 text-right">Settlement</th></tr></thead>
                  <tbody className="divide-y divide-[#3d2f2b]/30">
                    {history.map(b => (
                      <tr key={b.id} className="hover:bg-[#c5a059]/5 transition-all"><td className="py-4 text-[10px] font-mono text-[#b4a697]">{new Date(b.timestamp).toLocaleTimeString()}</td><td className="py-4 font-bold text-[#f5f5dc]">{players.find(p => p.id === b.playerId)?.name}</td><td className="py-4 text-[#c5a059] font-black uppercase text-[10px] tracking-widest">{teams.find(t => t.id === b.teamId)?.name}</td><td className="py-4 text-right font-mono font-black text-[#f5f5dc]">${b.amount.toLocaleString()}</td></tr>
                    ))}
                    {history.length === 0 && <tr><td colSpan={4} className="py-10 text-center opacity-30 text-[10px] uppercase font-black tracking-[0.3em]">No archive data detected</td></tr>}
                  </tbody>
                </table>
              </div>
            </CommandCard>
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
      <Modal isOpen={isPlayerModalOpen} onClose={() => { setIsPlayerModalOpen(false); setEditingPlayerId(null); }} title={editingPlayerId ? "Refine Talent" : "Enroll Talent"}>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2"><label className="text-[10px] font-black uppercase text-[#c5a059]">Name *</label><input type="text" className="w-full bg-[#0d0a09] border border-[#3d2f2b] rounded-2xl px-5 py-4 text-[#f5f5dc] outline-none focus:ring-1 ring-[#c5a059]" value={newPlayer.name} onChange={e => setNewPlayer({...newPlayer, name: e.target.value})} placeholder="Player Name" /></div>
            <div className="space-y-2"><label className="text-[10px] font-black uppercase text-[#c5a059]">Base Price *</label><input type="number" className="w-full bg-[#0d0a09] border border-[#3d2f2b] rounded-2xl px-5 py-4 text-[#f5f5dc] outline-none focus:ring-1 ring-[#c5a059]" value={newPlayer.basePrice} onChange={e => setNewPlayer({...newPlayer, basePrice: Number(e.target.value)})} placeholder="1000000" /></div>
            <div className="space-y-2"><label className="text-[10px] font-black uppercase text-[#c5a059]">Role *</label><select className="w-full bg-[#0d0a09] border border-[#3d2f2b] rounded-2xl px-5 py-4 text-[#f5f5dc] outline-none focus:ring-1 ring-[#c5a059]" value={newPlayer.roleId} onChange={e => setNewPlayer({...newPlayer, roleId: e.target.value})}>{config.roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
            <div className="space-y-2"><label className="text-[10px] font-black uppercase text-[#c5a059]">Age</label><input type="number" className="w-full bg-[#0d0a09] border border-[#3d2f2b] rounded-2xl px-5 py-4 text-[#f5f5dc] outline-none focus:ring-1 ring-[#c5a059]" value={newPlayer.age || ''} onChange={e => setNewPlayer({...newPlayer, age: Number(e.target.value) || undefined})} placeholder="25" /></div>
            <div className="space-y-2"><label className="text-[10px] font-black uppercase text-[#c5a059]">Nationality</label><input type="text" className="w-full bg-[#0d0a09] border border-[#3d2f2b] rounded-2xl px-5 py-4 text-[#f5f5dc] outline-none focus:ring-1 ring-[#c5a059]" value={newPlayer.nationality || ''} onChange={e => setNewPlayer({...newPlayer, nationality: e.target.value})} placeholder="India" /></div>
            <div className="space-y-2 flex items-center gap-3"><input type="checkbox" id="isOverseas" className="w-5 h-5 bg-[#0d0a09] border border-[#3d2f2b] rounded" checked={newPlayer.isOverseas || false} onChange={e => setNewPlayer({...newPlayer, isOverseas: e.target.checked})} /><label htmlFor="isOverseas" className="text-[10px] font-black uppercase text-[#c5a059] cursor-pointer">Overseas Player</label></div>
          </div>
          <div className="space-y-2"><label className="text-[10px] font-black uppercase text-[#c5a059]">Image URL</label><input type="text" className="w-full bg-[#0d0a09] border border-[#3d2f2b] rounded-2xl px-5 py-4 text-[#f5f5dc] outline-none focus:ring-1 ring-[#c5a059]" value={newPlayer.imageUrl || ''} onChange={e => setNewPlayer({...newPlayer, imageUrl: e.target.value})} placeholder="https://example.com/player.jpg" /></div>
          <div className="space-y-2"><label className="text-[10px] font-black uppercase text-[#c5a059]">Bio</label><textarea className="w-full bg-[#0d0a09] border border-[#3d2f2b] rounded-2xl px-5 py-4 text-[#f5f5dc] outline-none focus:ring-1 ring-[#c5a059] min-h-[80px]" value={newPlayer.bio || ''} onChange={e => setNewPlayer({...newPlayer, bio: e.target.value})} placeholder="Player background and achievements..." /></div>
          <div className="space-y-2"><label className="text-[10px] font-black uppercase text-[#c5a059]">Stats Summary</label><textarea className="w-full bg-[#0d0a09] border border-[#3d2f2b] rounded-2xl px-5 py-4 text-[#f5f5dc] outline-none focus:ring-1 ring-[#c5a059] min-h-[80px]" value={newPlayer.stats || ''} onChange={e => setNewPlayer({...newPlayer, stats: e.target.value})} placeholder="Key statistics and performance metrics..." /></div>
          <button onClick={() => {
            if(!newPlayer.name) return;
            if(editingPlayerId) setPlayers(players.map(p => p.id === editingPlayerId ? {...p, ...newPlayer} as Player : p));
            else setPlayers([...players, {id: Math.random().toString(36).substr(2,9), name: newPlayer.name!, roleId: newPlayer.roleId || config.roles[0].id, basePrice: newPlayer.basePrice || 0, isOverseas: newPlayer.isOverseas || false, status: 'PENDING', imageUrl: newPlayer.imageUrl, age: newPlayer.age, nationality: newPlayer.nationality, bio: newPlayer.bio, stats: newPlayer.stats}]);
            setIsPlayerModalOpen(false);
            setEditingPlayerId(null);
            setNewPlayer({ name: '', roleId: '', basePrice: 0, isOverseas: false, imageUrl: '', age: 25, nationality: '', bio: '', stats: '' });
          }} className="w-full py-5 gold-gradient rounded-3xl text-[#0d0a09] font-black uppercase text-xs shadow-2xl hover:brightness-110 transition-all">Validate Profile</button>
        </div>
      </Modal>

      <Modal isOpen={isTeamModalOpen} onClose={() => { setIsTeamModalOpen(false); setEditingTeamId(null); }} title={editingTeamId ? "Update Charter" : "Charter Franchise"}>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2"><label className="text-[10px] font-black uppercase text-[#c5a059]">Team Name *</label><input type="text" className="w-full bg-[#0d0a09] border border-[#3d2f2b] rounded-2xl px-5 py-4 text-[#f5f5dc] outline-none focus:ring-1 ring-[#c5a059]" value={newTeam.name} onChange={e => setNewTeam({...newTeam, name: e.target.value})} placeholder="Team Name" /></div>
            <div className="space-y-2"><label className="text-[10px] font-black uppercase text-[#c5a059]">Budget *</label><input type="number" className="w-full bg-[#0d0a09] border border-[#3d2f2b] rounded-2xl px-5 py-4 text-[#f5f5dc] outline-none focus:ring-1 ring-[#c5a059]" value={newTeam.budget} onChange={e => setNewTeam({...newTeam, budget: Number(e.target.value)})} placeholder="100000000" /></div>
            <div className="space-y-2"><label className="text-[10px] font-black uppercase text-[#c5a059]">Owner</label><input type="text" className="w-full bg-[#0d0a09] border border-[#3d2f2b] rounded-2xl px-5 py-4 text-[#f5f5dc] outline-none focus:ring-1 ring-[#c5a059]" value={newTeam.owner || ''} onChange={e => setNewTeam({...newTeam, owner: e.target.value})} placeholder="Owner Name" /></div>
            <div className="space-y-2"><label className="text-[10px] font-black uppercase text-[#c5a059]">Home City</label><input type="text" className="w-full bg-[#0d0a09] border border-[#3d2f2b] rounded-2xl px-5 py-4 text-[#f5f5dc] outline-none focus:ring-1 ring-[#c5a059]" value={newTeam.homeCity || ''} onChange={e => setNewTeam({...newTeam, homeCity: e.target.value})} placeholder="Mumbai" /></div>
            <div className="space-y-2"><label className="text-[10px] font-black uppercase text-[#c5a059]">Foundation Year</label><input type="number" className="w-full bg-[#0d0a09] border border-[#3d2f2b] rounded-2xl px-5 py-4 text-[#f5f5dc] outline-none focus:ring-1 ring-[#c5a059]" value={newTeam.foundationYear || ''} onChange={e => setNewTeam({...newTeam, foundationYear: Number(e.target.value) || undefined})} placeholder="2024" /></div>
          </div>
          <div className="space-y-2"><label className="text-[10px] font-black uppercase text-[#c5a059]">Logo URL</label><input type="text" className="w-full bg-[#0d0a09] border border-[#3d2f2b] rounded-2xl px-5 py-4 text-[#f5f5dc] outline-none focus:ring-1 ring-[#c5a059]" value={newTeam.logo || ''} onChange={e => setNewTeam({...newTeam, logo: e.target.value})} placeholder="https://example.com/logo.png" /></div>
          <button onClick={() => {
            if(!newTeam.name) return;
            if(editingTeamId) setTeams(teams.map(t => t.id === editingTeamId ? {...t, ...newTeam, remainingBudget: editingTeamId ? teams.find(tm => tm.id === editingTeamId)?.remainingBudget || newTeam.budget || config.totalBudget : newTeam.budget || config.totalBudget} as Team : t));
            else setTeams([...teams, {id: Math.random().toString(36).substr(2,9), name: newTeam.name!, budget: newTeam.budget || config.totalBudget, remainingBudget: newTeam.budget || config.totalBudget, players: [], owner: newTeam.owner, homeCity: newTeam.homeCity, foundationYear: newTeam.foundationYear, logo: newTeam.logo}]);
            setIsTeamModalOpen(false);
            setEditingTeamId(null);
            setNewTeam({ name: '', owner: '', budget: 0, logo: '', homeCity: '', foundationYear: 2024 });
          }} className="w-full py-5 gold-gradient rounded-3xl text-[#0d0a09] font-black uppercase text-xs shadow-2xl hover:brightness-110 transition-all">Deploy Charter</button>
        </div>
      </Modal>

      <Modal isOpen={isSquadModalOpen} onClose={() => setIsSquadModalOpen(false)} title="Roster Intelligence">
        <div className="space-y-6">
          {viewingSquadTeamId && (
            <>
              <div className="p-6 bg-[#0d0a09]/60 border border-[#c5a059]/20 rounded-[2rem]">
                <h3 className="text-2xl font-display font-black text-[#f5f5dc] uppercase">{teams.find(t => t.id === viewingSquadTeamId)?.name}</h3>
                <p className="text-[10px] font-mono text-[#c5a059] uppercase tracking-widest">Available Capital: ${teams.find(t => t.id === viewingSquadTeamId)?.remainingBudget.toLocaleString()}</p>
              </div>
              <div className="space-y-3">
                {players.filter(p => p.teamId === viewingSquadTeamId).map(p => (
                  <div key={p.id} className="p-4 bg-[#1a1410] border border-[#3d2f2b] rounded-2xl flex justify-between items-center">
                    <p className="font-bold text-[#f5f5dc]">{p.name}</p>
                    <p className="font-mono text-[#c5a059]">${p.soldPrice?.toLocaleString()}</p>
                  </div>
                ))}
                {players.filter(p => p.teamId === viewingSquadTeamId).length === 0 && <p className="text-center opacity-30 text-[10px] uppercase font-black py-10">Roster Empty</p>}
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* How It Works Modal */}
      <Modal isOpen={isHowItWorksOpen} onClose={() => setIsHowItWorksOpen(false)} title="How It Works">
        <div className="space-y-8">
          {/* Mock YouTube Video Embed */}
          <div className="aspect-video bg-[#0d0a09] border-2 border-[#c5a059]/20 rounded-2xl overflow-hidden flex items-center justify-center relative">
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1a1410] to-[#0d0a09]">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 mx-auto bg-[#c5a059] rounded-full flex items-center justify-center shadow-2xl">
                  <Play size={40} fill="#0d0a09" className="text-[#0d0a09] ml-1" />
                </div>
                <p className="text-[#b4a697] text-sm font-bold uppercase tracking-widest">Tutorial Video Coming Soon</p>
              </div>
            </div>
          </div>

          {/* Step-by-Step Guidelines */}
          <div className="space-y-6">
            <h3 className="text-lg font-display font-black text-[#c5a059] uppercase tracking-widest border-b border-[#3d2f2b] pb-3">Step-by-Step Guide</h3>
            
            <div className="space-y-4">
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-[#c5a059] flex items-center justify-center flex-shrink-0 font-black text-[#0d0a09]">1</div>
                <div>
                  <h4 className="font-bold text-[#f5f5dc] mb-1">Configure Your Auction</h4>
                  <p className="text-sm text-[#b4a697] leading-relaxed">Choose your sport, set budget limits, and customize auction framework to match your league requirements.</p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-[#c5a059] flex items-center justify-center flex-shrink-0 font-black text-[#0d0a09]">2</div>
                <div>
                  <h4 className="font-bold text-[#f5f5dc] mb-1">Register Teams & Players</h4>
                  <p className="text-sm text-[#b4a697] leading-relaxed">Add all participating teams with their budgets, and register players with roles, base prices, and detailed profiles.</p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-[#c5a059] flex items-center justify-center flex-shrink-0 font-black text-[#0d0a09]">3</div>
                <div>
                  <h4 className="font-bold text-[#f5f5dc] mb-1">Launch Auction Room</h4>
                  <p className="text-sm text-[#b4a697] leading-relaxed">Enter the auction room, start the bidding process, and watch as teams compete for top talent in real-time.</p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-[#c5a059] flex items-center justify-center flex-shrink-0 font-black text-[#0d0a09]">4</div>
                <div>
                  <h4 className="font-bold text-[#f5f5dc] mb-1">Monitor & Finalize</h4>
                  <p className="text-sm text-[#b4a697] leading-relaxed">Track live stats, manage bids, and finalize player sales. Export complete auction history when done.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#c5a059]/5 border border-[#c5a059]/20 rounded-2xl p-6">
            <div className="flex items-start gap-3">
              <BookOpen size={20} className="text-[#c5a059] flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-[#f5f5dc] mb-2 uppercase tracking-wider text-xs">Pro Tip</h4>
                <p className="text-sm text-[#b4a697] leading-relaxed">Use the dashboard to get AI-powered insights and track real-time auction statistics. Click on any team to view their complete roster and remaining budget.</p>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// --- Atomic Layout Units ---

const OrbitalItem: React.FC<{ icon: React.ReactNode; active: boolean; onClick: () => void }> = ({ icon, active, onClick }) => (
  <button onClick={onClick} className={`p-3 rounded-2xl transition-all duration-500 relative flex items-center justify-center flex-shrink-0 ${active ? 'bg-[#c5a059] text-[#0d0a09] shadow-[0_0_20px_rgba(197,160,89,0.5)]' : 'text-[#b4a697] hover:bg-[#c5a059]/10 hover:text-[#f5f5dc]'}`}>{icon}{active && <div className="absolute top-[-2px] left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full"></div>}</button>
);

const StatCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode; subValue?: string }> = ({ label, value, icon, subValue }) => (
  <div className="bg-[#1a1410] border border-[#3d2f2b] rounded-[2rem] p-8 hover:border-[#c5a059]/30 transition-all group overflow-hidden relative"><div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-125 transition-all text-[#c5a059]">{icon}</div><p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#b4a697] mb-2">{label}</p><p className="text-3xl font-display font-black text-[#f5f5dc] tracking-tighter">{value}</p>{subValue && <p className="text-[10px] text-[#5c4742] mt-2 font-medium">{subValue}</p>}</div>
);

export default App;
