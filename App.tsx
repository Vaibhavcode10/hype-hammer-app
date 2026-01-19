
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Plus, Users, LayoutDashboard, Settings, Gavel, 
  Trophy, TrendingUp, Info, LogOut, CheckCircle2, 
  XCircle, Clock, Search, ChevronRight, Menu, X,
  History, PieChart, Image as ImageIcon, Globe, DollarSign,
  Edit2, Trash2, Eye, ShieldCheck, ChevronLeft, Cpu, Activity,
  MapPin, Calendar, FileText, User, Sparkles, TrendingDown,
  Timer
} from 'lucide-react';
import { 
  SportType, AuctionType, AuctionStatus, 
  AuctionConfig, Player, Team, Bid 
} from './types';
import { INITIAL_CONFIG, SPORT_DEFAULTS, MOCK_PLAYERS, MOCK_TEAMS } from './constants';

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
  <div className={`bg-[#1a1410]/60 border border-[#3d2f2b] rounded-[2rem] p-8 backdrop-blur-md shadow-2xl relative group ${className}`}>
    <div className="flex items-center justify-between mb-8">
      <h3 className="text-sm font-display font-black flex items-center gap-3 tracking-[0.3em] text-[#c5a059] uppercase">
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
      <div className="bg-[#1a1410] border border-[#c5a059]/30 w-full max-w-2xl rounded-[3rem] shadow-[0_0_100px_rgba(197,160,89,0.15)] overflow-hidden animate-in fade-in zoom-in-95 duration-300">
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

// --- Celebration Component ---

const SoldCelebration: React.FC<{ player: Player; team: Team; price: number; onComplete: () => void }> = ({ player, team, price, onComplete }) => {
  const [stage, setStage] = useState<'hammer' | 'sparkle'>('hammer');

  useEffect(() => {
    const hammerTimer = setTimeout(() => setStage('sparkle'), 1200);
    const completeTimer = setTimeout(onComplete, 4500);
    return () => {
      clearTimeout(hammerTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center celebration-overlay animate-in fade-in duration-500 backdrop-blur-sm">
      <div className="text-center relative">
        {stage === 'hammer' && (
          <div className="flex flex-col items-center animate-in zoom-in duration-300">
            <div className="w-48 h-48 bg-[#c5a059]/10 rounded-full flex items-center justify-center border border-[#c5a059]/30 mb-8 relative">
              <Gavel size={80} className="text-[#c5a059] hammer-strike" />
              <div className="absolute inset-0 shimmer-gold rounded-full opacity-30"></div>
            </div>
            <h2 className="text-5xl font-display font-black text-[#c5a059] uppercase tracking-[0.4em] animate-pulse">
              GOING ONCE... TWICE...
            </h2>
          </div>
        )}

        {stage === 'sparkle' && (
          <div className="animate-in zoom-in duration-500">
            <div className="relative mb-12">
               <div className="w-64 h-64 mx-auto rounded-[3rem] overflow-hidden border-4 border-[#c5a059] shadow-[0_0_80px_rgba(197,160,89,0.6)] relative z-10">
                 {player.imageUrl ? <img src={player.imageUrl} className="w-full h-full object-cover" /> : <Users size={100} className="text-[#3d2f2b] m-14" />}
                 <div className="absolute inset-0 shimmer-gold opacity-50"></div>
               </div>
               {[...Array(12)].map((_, i) => (
                 <div 
                   key={i} 
                   className="sparkle" 
                   style={{ 
                     top: `${Math.random() * 100}%`, 
                     left: `${Math.random() * 100}%`,
                     animationDelay: `${Math.random() * 0.5}s`
                   }}
                 />
               ))}
            </div>
            <div className="space-y-4">
              <h1 className="text-7xl font-display font-black gold-text uppercase tracking-tighter drop-shadow-[0_0_20px_rgba(197,160,89,0.5)]">
                SOLD!
              </h1>
              <p className="text-3xl font-display font-bold text-[#f5f5dc] uppercase tracking-widest">
                To <span className="text-[#c5a059]">{team.name}</span>
              </p>
              <p className="text-5xl font-mono font-black text-[#f5f5dc] border-t border-[#c5a059]/20 pt-6 mt-6">
                ${price.toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Core Application ---

const App: React.FC = () => {
  const [status, setStatus] = useState<AuctionStatus>(AuctionStatus.SETUP);
  const [config, setConfig] = useState<AuctionConfig>(INITIAL_CONFIG);
  const [players, setPlayers] = useState<Player[]>(MOCK_PLAYERS);
  const [teams, setTeams] = useState<Team[]>(MOCK_TEAMS);
  const [history, setHistory] = useState<Bid[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'players' | 'teams' | 'room' | 'history'>('dashboard');

  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isSquadModalOpen, setIsSquadModalOpen] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [viewingSquadTeamId, setViewingSquadTeamId] = useState<string | null>(null);

  // Animation State
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

  useEffect(() => {
    if (isPlayerModalOpen && !newPlayer.roleId && config.roles.length > 0 && !editingPlayerId) {
      setNewPlayer(prev => ({ ...prev, roleId: config.roles[0].id }));
    }
  }, [isPlayerModalOpen, config.roles, editingPlayerId]);

  const handleNextPlayer = useCallback(() => {
    const nextIdx = players.findIndex(p => p.status === 'PENDING');
    if (nextIdx !== -1) {
      setCurrentPlayerIdx(nextIdx);
      setCurrentBid(players[nextIdx].basePrice);
      setCurrentBidderId(null);
      setTimer(30);
      setIsTimerRunning(false);
    } else alert("Registry Depleted: No further individuals available.");
  }, [players]);

  const placeBid = (teamId: string, amount: number) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;
    if (amount > team.remainingBudget) {
      alert("Insufficient Funds: Franchise budget limit reached.");
      return;
    }
    if (amount <= currentBid && currentBidderId !== null) {
      return; // Do nothing if bid is lower than current
    }
    setCurrentBid(amount);
    setCurrentBidderId(teamId);
    setTimer(30);
    setIsTimerRunning(true);
  };

  const finalizePlayer = (sold: boolean) => {
    if (currentPlayerIdx === null) return;
    const player = players[currentPlayerIdx];
    const updatedPlayers = [...players];
    const updatedTeams = [...teams];

    if (sold && currentBidderId) {
      const buyingTeam = teams.find(t => t.id === currentBidderId);
      if (buyingTeam) {
        setSoldAnimationData({ player, team: buyingTeam, price: currentBid });
      }

      updatedPlayers[currentPlayerIdx] = { ...player, status: 'SOLD', teamId: currentBidderId, soldPrice: currentBid };
      const tIdx = updatedTeams.findIndex(t => t.id === currentBidderId);
      updatedTeams[tIdx] = { ...updatedTeams[tIdx], remainingBudget: updatedTeams[tIdx].remainingBudget - currentBid, players: [...updatedTeams[tIdx].players, player.id] };
      setHistory(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), playerId: player.id, teamId: currentBidderId!, amount: currentBid, timestamp: Date.now() }]);
    } else {
      updatedPlayers[currentPlayerIdx] = { ...player, status: 'UNSOLD' };
    }

    setPlayers(updatedPlayers);
    setTeams(updatedTeams);
    setCurrentPlayerIdx(null);
    setIsTimerRunning(false);
  };

  useEffect(() => {
    let interval: any;
    if (isTimerRunning && timer > 0) interval = setInterval(() => setTimer(t => t - 1), 1000);
    else if (timer === 0 && isTimerRunning) finalizePlayer(!!currentBidderId);
    return () => clearInterval(interval);
  }, [timer, isTimerRunning, currentBidderId]);

  const handleEditPlayer = (player: Player) => { 
    setEditingPlayerId(player.id); 
    setNewPlayer({ ...player }); 
    setIsPlayerModalOpen(true); 
  };
  const handleDeletePlayer = (id: string) => { 
    if (confirm("Remove profile permanently?")) setPlayers(players.filter(p => p.id !== id)); 
  };
  const handleEditTeam = (team: Team) => { 
    setEditingTeamId(team.id); 
    setNewTeam({ ...team }); 
    setIsTeamModalOpen(true); 
  };
  const handleDeleteTeam = (id: string) => { 
    if (confirm("Dissolve franchise?")) setTeams(teams.filter(t => t.id !== id)); 
  };

  const viewingSquad = useMemo(() => (!viewingSquadTeamId ? [] : players.filter(p => p.teamId === viewingSquadTeamId)), [viewingSquadTeamId, players]);

  // --- Views ---

  if (status === AuctionStatus.SETUP) {
    return (
      <div className="min-h-screen bg-[#0d0a09] flex flex-col items-center justify-center p-10 overflow-hidden relative">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#c5a059]/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#c5a059]/5 rounded-full blur-[120px]"></div>
        
        <div className="max-w-4xl w-full z-10">
          <div className="text-center mb-12 space-y-4">
            <h1 className="text-8xl font-display font-black tracking-tighter text-[#f5f5dc] drop-shadow-2xl">
              OMNI<span className="gold-text">AUCTION</span>
            </h1>
            <div className="flex items-center justify-center gap-4">
              <div className="h-px w-12 bg-[#3d2f2b]"></div>
              <p className="text-[#c5a059] text-xs font-black uppercase tracking-[0.5em]">Command Protocol v2.5</p>
              <div className="h-px w-12 bg-[#3d2f2b]"></div>
            </div>
          </div>

          <div className="bg-[#1a1410] border border-[#c5a059]/30 rounded-[3rem] p-12 shadow-[0_0_80px_rgba(0,0,0,0.8)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-8">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#b4a697]">Global Discipline</label>
                <div className="grid grid-cols-2 gap-4">
                  {Object.values(SportType).map((s) => (
                    <button key={s} onClick={() => setConfig({ ...config, sport: s, roles: SPORT_DEFAULTS[s].roles || [], squadSize: SPORT_DEFAULTS[s].squadSize || config.squadSize, totalBudget: SPORT_DEFAULTS[s].totalBudget || config.totalBudget })}
                      className={`p-6 rounded-2xl border transition-all duration-500 text-left relative overflow-hidden group ${config.sport === s ? 'border-[#c5a059] bg-[#c5a059]/10' : 'border-[#3d2f2b] bg-[#120d0b] hover:border-[#5c4742]'}`}>
                      <span className={`font-display font-bold text-xl uppercase ${config.sport === s ? 'text-[#f5f5dc]' : 'text-[#b4a697]'}`}>{s}</span>
                      {config.sport === s && <div className="absolute right-[-10px] bottom-[-10px] opacity-10"><Trophy size={60} /></div>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col justify-between">
                <div className="space-y-10">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#b4a697]">Economic Limit</label>
                    <div className="relative">
                      <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 text-[#c5a059]" size={20} />
                      <input type="number" className="w-full bg-[#120d0b] border border-[#3d2f2b] rounded-2xl pl-14 pr-6 py-5 text-[#f5f5dc] font-mono text-xl focus:ring-1 ring-[#c5a059] outline-none transition-all" value={config.totalBudget} onChange={(e) => setConfig({ ...config, totalBudget: Number(e.target.value) })} />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#b4a697]">Execution Framework</label>
                    <select className="w-full bg-[#120d0b] border border-[#3d2f2b] rounded-2xl px-6 py-5 text-[#f5f5dc] font-bold uppercase tracking-wider outline-none appearance-none" value={config.type} onChange={(e) => setConfig({ ...config, type: e.target.value as AuctionType })}>
                      {Object.values(AuctionType).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <button onClick={() => setStatus(AuctionStatus.READY)} className="gold-gradient hover:brightness-110 text-[#0d0a09] font-black py-6 rounded-2xl mt-12 transition-all shadow-[0_20px_40px_rgba(197,160,89,0.2)] uppercase tracking-[0.3em] text-sm">
                  Initialize Market
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#0d0a09] flex flex-col items-center p-4 lg:p-8 overflow-hidden relative">
      {/* Celebration Trigger */}
      {soldAnimationData && (
        <SoldCelebration 
          player={soldAnimationData.player} 
          team={soldAnimationData.team} 
          price={soldAnimationData.price} 
          onComplete={() => setSoldAnimationData(null)} 
        />
      )}

      {/* HUD Corner Elements */}
      <div className="fixed top-8 left-10 z-[60]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 gold-gradient rounded-2xl flex items-center justify-center text-[#0d0a09] font-black text-xl shadow-2xl animate-orbit">O</div>
          <div className="hidden sm:block">
            <h2 className="text-xl font-display font-black tracking-widest gold-text uppercase leading-none">OmniAuction</h2>
            <p className="text-[10px] font-bold text-[#b4a697] uppercase tracking-[0.3em] mt-1">{config.sport} Protocol</p>
          </div>
        </div>
      </div>

      <div className="fixed top-8 right-10 z-[60] flex gap-3">
        <HUDPill icon={<Activity size={12} />}>System Live</HUDPill>
        <HUDPill icon={<TrendingUp size={12} />}>Drafted: {players.filter(p => p.status === 'SOLD').length}/{players.length}</HUDPill>
        <button onClick={() => setStatus(AuctionStatus.SETUP)} className="p-2.5 bg-[#a65d50]/10 border border-[#a65d50]/20 rounded-full text-[#a65d50] hover:bg-[#a65d50] hover:text-white transition-all">
          <LogOut size={16} />
        </button>
      </div>

      {/* Main Command Workspace */}
      <div className="w-full max-w-[1500px] h-full flex flex-col pt-20 pb-28">
        <div className="flex-1 overflow-y-auto custom-scrollbar px-2 lg:px-4 animate-in fade-in duration-700">
          
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard label="Draft Pool" value={players.length} icon={<Users />} />
              <StatCard label="Franchises" value={teams.length} icon={<Trophy />} />
              <StatCard label="Market Capital" value={`$${(players.reduce((acc, p) => acc + (p.soldPrice || 0), 0) / 1000000).toFixed(2)}M`} icon={<TrendingUp />} />
              <StatCard label="Session Status" value={`${players.length > 0 ? Math.round((players.filter(p => p.status === 'SOLD').length / players.length) * 100) : 0}%`} icon={<Activity />} />
              
              <CommandCard title="Market Liquidity" className="lg:col-span-3 h-[350px]">
                <div className="h-full flex flex-col items-center justify-center border border-[#3d2f2b] rounded-3xl bg-[#0d0a09]/50 opacity-40">
                  <PieChart size={64} className="text-[#c5a059] mb-4" />
                  <span className="text-[10px] uppercase font-black tracking-[0.3em]">Real-time analytics engine processing...</span>
                </div>
              </CommandCard>

              <CommandCard title="Constraints" className="lg:col-span-1 h-[350px]">
                <div className="space-y-6">
                  <div className="p-4 bg-[#0d0a09]/60 rounded-2xl border border-[#3d2f2b]">
                    <p className="text-[10px] uppercase font-black tracking-widest text-[#b4a697] mb-2">Squad Range</p>
                    <p className="text-xl font-display font-black text-[#f5f5dc]">{config.squadSize.min} — {config.squadSize.max}</p>
                  </div>
                  <div className="p-4 bg-[#0d0a09]/60 rounded-2xl border border-[#3d2f2b]">
                    <p className="text-[10px] uppercase font-black tracking-widest text-[#b4a697] mb-2">Foreign Cap</p>
                    <p className="text-xl font-display font-black text-[#f5f5dc]">{config.rules.overseasLimit || 'Unlimited'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {config.roles.map(r => (
                      <span key={r.id} className="text-[8px] font-black uppercase px-2 py-1 bg-[#c5a059]/10 border border-[#c5a059]/20 rounded-full text-[#c5a059]">{r.name}</span>
                    ))}
                  </div>
                </div>
              </CommandCard>
            </div>
          )}

          {activeTab === 'players' && (
            <CommandCard title="Talent Registry" className="w-full min-h-full">
              <div className="flex flex-col sm:flex-row justify-between mb-8 gap-4">
                <div className="relative w-full sm:w-96">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#b4a697]" size={20} />
                  <input type="text" placeholder="Scan registry..." className="w-full bg-[#0d0a09] border border-[#3d2f2b] rounded-full pl-14 pr-6 py-4 text-[#f5f5dc] focus:ring-1 ring-[#c5a059] outline-none" />
                </div>
                <button onClick={() => { setEditingPlayerId(null); setNewPlayer({ name: '', roleId: config.roles[0]?.id, basePrice: 0, isOverseas: false, imageUrl: '', age: 25, nationality: '', bio: '', stats: '' }); setIsPlayerModalOpen(true); }} className="px-6 py-4 gold-gradient text-[#0d0a09] rounded-full font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-2xl">
                  <Plus size={16} /> Register Talent
                </button>
              </div>

              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left">
                  <thead className="text-[10px] font-black uppercase tracking-[0.2em] text-[#b4a697] border-b border-[#3d2f2b]">
                    <tr>
                      <th className="pb-4">Individual</th>
                      <th className="pb-4 hidden lg:table-cell">Bio</th>
                      <th className="pb-4">Role</th>
                      <th className="pb-4">Evaluation</th>
                      <th className="pb-4">Status</th>
                      <th className="pb-4 text-right">Ops</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#3d2f2b]/30">
                    {players.map(p => (
                      <tr key={p.id} className="group hover:bg-[#c5a059]/5 transition-all">
                        <td className="py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-[#3d2f2b] rounded-xl overflow-hidden border border-[#c5a059]/10">
                              {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" /> : <Users size={16} className="text-[#b4a697] m-3" />}
                            </div>
                            <div>
                              <p className="text-[#f5f5dc] font-bold text-base leading-tight">{p.name}</p>
                              <p className="text-[8px] text-[#c5a059] uppercase font-black tracking-widest mt-0.5">{p.nationality} {p.isOverseas ? '• INTL' : ''}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 max-w-xs truncate text-[11px] text-[#b4a697] italic hidden lg:table-cell">{p.bio || 'No profile bio provided.'}</td>
                        <td className="py-4"><span className="text-[9px] font-black uppercase bg-[#3d2f2b] px-2 py-0.5 rounded text-[#b4a697]">{config.roles.find(r => r.id === p.roleId)?.name}</span></td>
                        <td className="py-4 font-mono text-base font-bold text-[#f5f5dc]">${p.basePrice.toLocaleString()}</td>
                        <td className="py-4">
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${p.status === 'SOLD' ? 'text-[#8b9d77] border-[#8b9d77]/20 bg-[#8b9d77]/5' : p.status === 'UNSOLD' ? 'text-[#a65d50] border-[#a65d50]/20 bg-[#a65d50]/5' : 'text-[#c5a059] border-[#c5a059]/20 bg-[#c5a059]/5'}`}>{p.status}</span>
                        </td>
                        <td className="py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => handleEditPlayer(p)} className="p-2 bg-[#1a1410] border border-[#3d2f2b] hover:border-[#c5a059] rounded-lg text-[#c5a059]"><Edit2 size={14} /></button>
                            <button onClick={() => handleDeletePlayer(p.id)} className="p-2 bg-[#1a1410] border border-[#3d2f2b] hover:border-[#a65d50] rounded-lg text-[#a65d50]"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CommandCard>
          )}

          {activeTab === 'teams' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {teams.map(t => (
                <CommandCard key={t.id} title={t.name} icon={<ShieldCheck size={16} />} actions={
                  <>
                    <button onClick={() => handleEditTeam(t)} className="p-2 text-[#b4a697] hover:text-[#c5a059]"><Edit2 size={12} /></button>
                    <button onClick={() => handleDeleteTeam(t.id)} className="p-2 text-[#b4a697] hover:text-[#a65d50]"><Trash2 size={12} /></button>
                  </>
                }>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-[#0d0a09] border border-[#c5a059]/10 rounded-2xl flex items-center justify-center p-2">
                        {t.logo ? <img src={t.logo} className="w-full h-full object-contain" /> : <Trophy size={28} className="text-[#3d2f2b]" />}
                      </div>
                      <div>
                        <p className="text-[8px] uppercase font-black tracking-[0.2em] text-[#c5a059]">{t.homeCity || 'Neutral Venue'}</p>
                        <p className="text-xl font-display font-black text-[#f5f5dc] leading-tight mt-0.5">{t.name}</p>
                        <p className="text-[8px] uppercase font-bold text-[#b4a697] tracking-widest">Est. {t.foundationYear || '—'}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[9px] uppercase font-black tracking-widest text-[#b4a697]">Remaining Liquidity</div>
                      <div className="text-2xl font-mono font-black text-[#f5f5dc]">${t.remainingBudget.toLocaleString()}</div>
                      <div className="w-full h-2 bg-[#0d0a09] rounded-full overflow-hidden border border-[#3d2f2b]">
                        <div className="h-full gold-gradient" style={{ width: `${(t.remainingBudget/t.budget)*100}%` }}></div>
                      </div>
                    </div>
                    <button onClick={() => { setViewingSquadTeamId(t.id); setIsSquadModalOpen(true); }} className="w-full py-3 border border-[#c5a059]/20 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] hover:bg-[#c5a059]/10 transition-all">Review Roster</button>
                  </div>
                </CommandCard>
              ))}
              <div onClick={() => { setEditingTeamId(null); setNewTeam({ name: '', owner: '', budget: config.totalBudget, logo: '', homeCity: '', foundationYear: 2024 }); setIsTeamModalOpen(true); }} className="border-2 border-dashed border-[#3d2f2b] rounded-[2rem] flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-[#c5a059]/50 transition-all group p-8">
                <div className="w-12 h-12 bg-[#1a1410] rounded-full flex items-center justify-center text-[#3d2f2b] group-hover:text-[#c5a059] transition-all"><Plus size={24} /></div>
                <span className="text-[10px] uppercase font-black tracking-[0.3em] text-[#3d2f2b] group-hover:text-[#b4a697]">New Franchise</span>
              </div>
            </div>
          )}

          {activeTab === 'room' && (
            <div className="h-full w-full max-w-[1400px] mx-auto overflow-hidden flex flex-col">
              {currentPlayerIdx !== null ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
                  {/* Left Section: Information & Context */}
                  <div className="lg:col-span-3 flex flex-col gap-4 order-2 lg:order-1">
                    <CommandCard title="Individual Intelligence" className="flex-1">
                      <div className="space-y-4">
                        <div className="p-4 bg-[#0d0a09]/60 rounded-2xl border border-[#3d2f2b]">
                          <p className="text-[9px] uppercase font-black text-[#c5a059] tracking-widest mb-1">Performance Stats</p>
                          <p className="text-[11px] text-[#f5f5dc] italic leading-relaxed">{players[currentPlayerIdx].stats || 'Analyzing field data...'}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-[#0d0a09]/60 rounded-xl border border-[#3d2f2b] text-center">
                            <p className="text-[8px] uppercase font-black text-[#5c4742]">Age</p>
                            <p className="text-lg font-mono font-bold text-[#f5f5dc]">{players[currentPlayerIdx].age}</p>
                          </div>
                          <div className="p-3 bg-[#0d0a09]/60 rounded-xl border border-[#3d2f2b] text-center">
                            <p className="text-[8px] uppercase font-black text-[#5c4742]">Role</p>
                            <p className="text-xs uppercase font-bold text-[#c5a059] truncate">{config.roles.find(r => r.id === players[currentPlayerIdx!].roleId)?.name}</p>
                          </div>
                        </div>
                        <div className="p-4 bg-[#0d0a09]/60 rounded-2xl border border-[#3d2f2b]">
                          <p className="text-[9px] uppercase font-black text-[#b4a697] tracking-widest mb-2">Base Valuation</p>
                          <p className="text-2xl font-mono font-bold text-[#b4a697]/50">${players[currentPlayerIdx].basePrice.toLocaleString()}</p>
                        </div>
                      </div>
                    </CommandCard>
                    <div className="flex gap-4">
                      <button onClick={() => finalizePlayer(true)} disabled={!currentBidderId} className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-2 transition-all ${currentBidderId ? 'bg-[#8b9d77] text-[#0d0a09] shadow-lg shadow-[#8b9d77]/20' : 'bg-[#3d2f2b] text-[#5c4742] cursor-not-allowed opacity-50'}`}>
                        <CheckCircle2 size={14} /> Sell
                      </button>
                      <button onClick={() => finalizePlayer(false)} className="flex-1 py-4 rounded-2xl bg-[#a65d50] text-[#0d0a09] font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#a65d50]/20">
                        <XCircle size={14} /> Unsold
                      </button>
                    </div>
                  </div>

                  {/* Center Section: Focus Area */}
                  <div className="lg:col-span-6 flex flex-col gap-6 order-1 lg:order-2 h-full justify-between">
                    <div className="bg-[#1a1410] border border-[#c5a059]/30 rounded-[3rem] overflow-hidden shadow-2xl relative flex-1 flex flex-col">
                      <div className="absolute top-6 left-6 z-20 flex items-center gap-3 bg-black/60 px-4 py-2 rounded-2xl border border-[#c5a059]/20 backdrop-blur-md">
                        <Timer size={16} className={timer < 10 ? 'text-[#a65d50] animate-pulse' : 'text-[#c5a059]'} />
                        <span className={`text-xl font-mono font-black ${timer < 10 ? 'text-[#a65d50]' : 'text-[#f5f5dc]'}`}>00:{timer < 10 ? `0${timer}` : timer}</span>
                      </div>
                      
                      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_center,_#211a17_0%,_#1a1410_100%)]">
                        <div className="w-44 h-44 bg-[#0d0a09] border-4 border-[#c5a059]/20 rounded-[3rem] shadow-2xl overflow-hidden p-2 relative mb-6">
                           {players[currentPlayerIdx].imageUrl ? <img src={players[currentPlayerIdx].imageUrl} className="w-full h-full object-cover rounded-[2.5rem]" /> : <Users size={64} className="text-[#3d2f2b] m-10" />}
                        </div>
                        <div className="text-center">
                          <h2 className="text-4xl font-display font-black uppercase text-[#f5f5dc] tracking-tighter leading-tight">{players[currentPlayerIdx].name}</h2>
                          <p className="text-sm text-[#b4a697] uppercase tracking-[0.2em] font-medium mt-1">{players[currentPlayerIdx].nationality} {players[currentPlayerIdx].isOverseas ? '• Global Draft' : ''}</p>
                        </div>
                      </div>

                      <div className="p-8 bg-[#120d0b] border-t border-[#3d2f2b] flex items-center justify-between">
                         <div className="text-center flex-1">
                            <p className="text-[9px] uppercase font-black tracking-widest text-[#c5a059] mb-1">Current Engagement</p>
                            <p className="text-6xl font-mono font-black text-[#f5f5dc] leading-none drop-shadow-md">${currentBid.toLocaleString()}</p>
                            <div className="mt-4 flex items-center justify-center gap-2">
                               {currentBidderId ? (
                                 <span className="text-[10px] uppercase font-black bg-[#c5a059]/10 border border-[#c5a059]/30 text-[#c5a059] px-3 py-1 rounded-full flex items-center gap-1">
                                   <Trophy size={10} /> {teams.find(t => t.id === currentBidderId)?.name}
                                 </span>
                               ) : <span className="text-[10px] uppercase font-black text-[#5c4742] tracking-widest">Awaiting Initial Bid</span>}
                            </div>
                         </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Section: Bidding Array (Functional Controls) */}
                  <div className="lg:col-span-3 flex flex-col order-3 lg:order-3 h-full">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#c5a059] mb-4 flex items-center gap-2"><Gavel size={14}/> Active Bidders</h3>
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2 pb-4">
                      {teams.map(t => {
                        const nextBid = currentBidderId === null ? currentBid : currentBid + 500000;
                        const canBid = nextBid <= t.remainingBudget;
                        const isTopBidder = currentBidderId === t.id;

                        return (
                          <div key={t.id} className={`p-4 rounded-3xl border transition-all relative overflow-hidden flex flex-col gap-3 ${isTopBidder ? 'bg-[#c5a059] border-[#f5f5dc] shadow-xl z-10' : 'bg-[#1a1410] border-[#3d2f2b]'}`}>
                             <div className="flex justify-between items-start">
                                <span className={`font-black uppercase tracking-widest text-xs truncate max-w-[150px] ${isTopBidder ? 'text-[#0d0a09]' : 'text-[#f5f5dc]'}`}>{t.name}</span>
                                <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded ${isTopBidder ? 'bg-[#0d0a09]/10 text-[#0d0a09]' : 'bg-black text-[#c5a059]'}`}>${(t.remainingBudget/1000000).toFixed(1)}M</span>
                             </div>
                             <button 
                                disabled={!canBid || isTopBidder}
                                onClick={() => placeBid(t.id, nextBid)}
                                className={`w-full py-2 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 ${
                                  isTopBidder ? 'bg-[#0d0a09] text-white animate-pulse shadow-inner' : 
                                  canBid ? 'bg-[#211a17] text-[#c5a059] border border-[#c5a059]/20 hover:bg-[#c5a059] hover:text-[#0d0a09]' : 
                                  'bg-[#3d2f2b] text-[#5c4742] cursor-not-allowed grayscale'
                                }`}
                             >
                               {isTopBidder ? 'Winning Bid' : canBid ? `Bid $${(nextBid/1000).toFixed(0)}k` : 'Insufficient Capital'}
                             </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center space-y-12">
                   <div className="w-40 h-40 gold-gradient rounded-[3rem] flex items-center justify-center shadow-2xl relative">
                      <Cpu size={64} className="text-[#0d0a09]" />
                      <div className="absolute inset-0 bg-white/5 rounded-[3rem] animate-ping"></div>
                   </div>
                   <div className="text-center space-y-6 max-w-xl px-4">
                      <h2 className="text-4xl font-display font-black uppercase text-[#f5f5dc] tracking-widest">Protocol Staged</h2>
                      <p className="text-[#b4a697] font-light italic leading-relaxed uppercase text-[10px] tracking-widest">Awaiting introduction of draft individual into the live engagement room. Current pool occupancy: <span className="text-[#c5a059] font-black">{players.filter(p => p.status === 'PENDING').length}</span> units.</p>
                      <button onClick={handleNextPlayer} className="group relative px-12 py-5 overflow-hidden gold-gradient text-[#0d0a09] font-black uppercase tracking-[0.4em] rounded-full shadow-2xl hover:brightness-110 transition-all text-sm">
                        <span className="relative z-10">Launch Selection Cycle</span>
                        <div className="absolute top-0 -left-[100%] w-full h-full bg-white/20 skew-x-12 group-hover:left-[100%] transition-all duration-1000"></div>
                      </button>
                   </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="max-w-4xl mx-auto space-y-4 pb-20">
              {history.slice().reverse().map(e => (
                <div key={e.id} className="bg-[#1a1410] border border-[#3d2f2b] p-6 rounded-[2rem] flex justify-between items-center hover:border-[#c5a059]/30 transition-all">
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-[#8b9d77]/10 border border-[#8b9d77]/20 rounded-2xl flex items-center justify-center text-[#8b9d77]"><CheckCircle2 size={24} /></div>
                    <div>
                      <p className="text-xl font-display font-black text-[#f5f5dc] uppercase tracking-tighter">{players.find(p => p.id === e.playerId)?.name}</p>
                      <p className="text-[9px] font-black uppercase text-[#b4a697] tracking-widest mt-0.5">Assigned to <span className="text-[#c5a059]">{teams.find(t => t.id === e.teamId)?.name}</span></p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-mono font-black text-[#f5f5dc]">${e.amount.toLocaleString()}</p>
                    <p className="text-[9px] font-bold text-[#3d2f2b] uppercase tracking-[0.4em] mt-1">{new Date(e.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))}
              {history.length === 0 && <div className="py-40 text-center opacity-10 uppercase tracking-[1em] text-xs font-black">Archives Offline</div>}
            </div>
          )}

        </div>
      </div>

      {/* Floating Orbital Command Dock */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-fit px-4">
        <nav className="orbital-nav px-4 lg:px-8 py-3 lg:py-4 rounded-full flex items-center gap-2 lg:gap-4 overflow-x-auto no-scrollbar">
          <OrbitalItem icon={<LayoutDashboard size={20} />} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <OrbitalItem icon={<Users size={20} />} active={activeTab === 'players'} onClick={() => setActiveTab('players')} />
          <div className="w-px h-6 bg-[#3d2f2b] mx-1"></div>
          <OrbitalItem icon={<Gavel size={20} />} active={activeTab === 'room'} onClick={() => setActiveTab('room')} />
          <div className="w-px h-6 bg-[#3d2f2b] mx-1"></div>
          <OrbitalItem icon={<Trophy size={20} />} active={activeTab === 'teams'} onClick={() => setActiveTab('teams')} />
          <OrbitalItem icon={<History size={20} />} active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
        </nav>
      </div>

      {/* --- Global Modals --- */}
      <Modal isOpen={isPlayerModalOpen} onClose={() => { setIsPlayerModalOpen(false); setEditingPlayerId(null); }} title={editingPlayerId ? "Refine Talent Profile" : "Enroll Professional Talent"}>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#c5a059] flex items-center gap-2"><User size={12}/> Legal Name</label>
              <input type="text" placeholder="e.g. Kylian Mbappé" className="w-full bg-[#0d0a09] border border-[#3d2f2b] rounded-2xl px-5 py-4 text-[#f5f5dc] outline-none focus:ring-1 ring-[#c5a059]" value={newPlayer.name} onChange={e => setNewPlayer({...newPlayer, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#c5a059] flex items-center gap-2"><Globe size={12}/> Nationality</label>
              <input type="text" placeholder="e.g. France" className="w-full bg-[#0d0a09] border border-[#3d2f2b] rounded-2xl px-5 py-4 text-[#f5f5dc] outline-none focus:ring-1 ring-[#c5a059]" value={newPlayer.nationality} onChange={e => setNewPlayer({...newPlayer, nationality: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#c5a059]">Age</label>
              <input type="number" className="w-full bg-[#0d0a09] border border-[#3d2f2b] rounded-2xl px-5 py-4 text-[#f5f5dc] font-mono outline-none focus:ring-1 ring-[#c5a059]" value={newPlayer.age} onChange={e => setNewPlayer({...newPlayer, age: Number(e.target.value)})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#c5a059]">Primary Field Role</label>
              <select className="w-full bg-[#0d0a09] border border-[#3d2f2b] rounded-2xl px-5 py-4 text-[#f5f5dc] outline-none focus:ring-1 ring-[#c5a059]" value={newPlayer.roleId} onChange={e => setNewPlayer({...newPlayer, roleId: e.target.value})}>
                {config.roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#c5a059]">Opening Valuation</label>
              <div className="relative">
                <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#c5a059]" />
                <input type="number" className="w-full bg-[#0d0a09] border border-[#3d2f2b] rounded-2xl pl-10 pr-4 py-4 text-[#f5f5dc] font-mono outline-none focus:ring-1 ring-[#c5a059]" value={newPlayer.basePrice} onChange={e => setNewPlayer({...newPlayer, basePrice: Number(e.target.value)})} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#c5a059]">Identity Avatar URL</label>
              <div className="relative">
                <ImageIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#b4a697]" />
                <input type="text" placeholder="https://cloud.cdn/p1.jpg" className="w-full bg-[#0d0a09] border border-[#3d2f2b] rounded-2xl pl-10 pr-4 py-4 text-[#f5f5dc] outline-none focus:ring-1 ring-[#c5a059]" value={newPlayer.imageUrl} onChange={e => setNewPlayer({...newPlayer, imageUrl: e.target.value})} />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#c5a059] flex items-center gap-2"><FileText size={12}/> Brief Bio / Background</label>
            <textarea className="w-full bg-[#0d0a09] border border-[#3d2f2b] rounded-2xl px-5 py-4 text-[#f5f5dc] outline-none focus:ring-1 ring-[#c5a059] h-20 resize-none" placeholder="Career highlights..." value={newPlayer.bio} onChange={e => setNewPlayer({...newPlayer, bio: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#c5a059] flex items-center gap-2"><Activity size={12}/> Performance Stats</label>
            <input type="text" placeholder="e.g. 52 Goals, 14 Assists" className="w-full bg-[#0d0a09] border border-[#3d2f2b] rounded-2xl px-5 py-4 text-[#f5f5dc] outline-none focus:ring-1 ring-[#c5a059]" value={newPlayer.stats} onChange={e => setNewPlayer({...newPlayer, stats: e.target.value})} />
          </div>
          <div className="flex justify-between p-4 bg-[#0d0a09] rounded-2xl border border-[#3d2f2b] items-center">
            <div className="flex gap-4 items-center"><Globe size={18} className="text-[#c5a059]" /><span className="text-xs uppercase font-black tracking-widest">International Status</span></div>
            <button onClick={() => setNewPlayer({...newPlayer, isOverseas: !newPlayer.isOverseas})} className={`w-12 h-7 rounded-full relative transition-all ${newPlayer.isOverseas ? 'bg-[#c5a059]' : 'bg-[#3d2f2b]'}`}><div className={`absolute top-1 w-5 h-5 bg-[#0d0a09] rounded-full transition-all ${newPlayer.isOverseas ? 'left-6' : 'left-1'}`}></div></button>
          </div>
          <button onClick={() => { if(!newPlayer.name) return; if(editingPlayerId) setPlayers(players.map(p => p.id === editingPlayerId ? {...p, ...newPlayer} as Player : p)); else setPlayers([...players, {id: Math.random().toString(36).substr(2,9), name: newPlayer.name!, roleId: newPlayer.roleId || config.roles[0].id, basePrice: newPlayer.basePrice || 0, isOverseas: !!newPlayer.isOverseas, imageUrl: newPlayer.imageUrl, age: newPlayer.age, nationality: newPlayer.nationality, bio: newPlayer.bio, stats: newPlayer.stats, status: 'PENDING'}]); setIsPlayerModalOpen(false); setEditingPlayerId(null); }} className="w-full py-5 gold-gradient rounded-3xl text-[#0d0a09] font-black uppercase tracking-widest text-xs shadow-2xl">Validate Registry Entry</button>
        </div>
      </Modal>

      <Modal isOpen={isTeamModalOpen} onClose={() => { setIsTeamModalOpen(false); setEditingTeamId(null); }} title={editingTeamId ? "Update Franchise Charter" : "Charter New Elite Franchise"}>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#c5a059]">Franchise Title</label>
              <input type="text" placeholder="e.g. Royal Challengers" className="w-full bg-[#0d0a09] border border-[#3d2f2b] rounded-2xl px-5 py-4 text-[#f5f5dc] outline-none focus:ring-1 ring-[#c5a059]" value={newTeam.name} onChange={e => setNewTeam({...newTeam, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#c5a059]">Ownership / Parent Group</label>
              <input type="text" placeholder="e.g. United Spirits Ltd." className="w-full bg-[#0d0a09] border border-[#3d2f2b] rounded-2xl px-5 py-4 text-[#f5f5dc] outline-none focus:ring-1 ring-[#c5a059]" value={newTeam.owner} onChange={e => setNewTeam({...newTeam, owner: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#c5a059] flex items-center gap-2"><MapPin size={12}/> Home City</label>
              <input type="text" placeholder="e.g. Bengaluru" className="w-full bg-[#0d0a09] border border-[#3d2f2b] rounded-2xl px-5 py-4 text-[#f5f5dc] outline-none focus:ring-1 ring-[#c5a059]" value={newTeam.homeCity} onChange={e => setNewTeam({...newTeam, homeCity: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#c5a059] flex items-center gap-2"><Calendar size={12}/> Foundation Year</label>
              <input type="number" className="w-full bg-[#0d0a09] border border-[#3d2f2b] rounded-2xl px-5 py-4 text-[#f5f5dc] font-mono outline-none focus:ring-1 ring-[#c5a059]" value={newTeam.foundationYear} onChange={e => setNewTeam({...newTeam, foundationYear: Number(e.target.value)})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#c5a059]">Capital Allocation</label>
              <div className="relative">
                <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#c5a059]" />
                <input type="number" className="w-full bg-[#0d0a09] border border-[#3d2f2b] rounded-2xl pl-10 pr-4 py-4 text-[#f5f5dc] font-mono outline-none focus:ring-1 ring-[#c5a059]" value={newTeam.budget} onChange={e => setNewTeam({...newTeam, budget: Number(e.target.value)})} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#c5a059]">Emblem URL</label>
              <div className="relative">
                <ImageIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#b4a697]" />
                <input type="text" placeholder="https://..." className="w-full bg-[#0d0a09] border border-[#3d2f2b] rounded-2xl pl-10 pr-4 py-4 text-[#f5f5dc] outline-none focus:ring-1 ring-[#c5a059]" value={newTeam.logo} onChange={e => setNewTeam({...newTeam, logo: e.target.value})} />
              </div>
            </div>
          </div>
          <button onClick={() => { if(!newTeam.name) return; if(editingTeamId) { setTeams(teams.map(t => t.id === editingTeamId ? {...t, ...newTeam, remainingBudget: t.remainingBudget + ((newTeam.budget || t.budget) - t.budget)} as Team : t)); } else { const b = newTeam.budget || config.totalBudget; setTeams([...teams, {id: Math.random().toString(36).substr(2,9), name: newTeam.name!, budget: b, remainingBudget: b, logo: newTeam.logo, owner: newTeam.owner, homeCity: newTeam.homeCity, foundationYear: newTeam.foundationYear, players: []}]); } setIsTeamModalOpen(false); setEditingTeamId(null); }} className="w-full py-5 gold-gradient rounded-3xl text-[#0d0a09] font-black uppercase tracking-widest text-xs shadow-2xl">Validate Charter Signature</button>
        </div>
      </Modal>

      <Modal isOpen={isSquadModalOpen} onClose={() => setIsSquadModalOpen(false)} title={`Operational Roster: ${teams.find(t => t.id === viewingSquadTeamId)?.name}`}>
        <div className="space-y-6">
          <div className="divide-y divide-[#3d2f2b]">
            {viewingSquad.map(p => (
              <div key={p.id} className="py-4 flex justify-between items-center group">
                <div className="flex gap-4 items-center">
                  <div className="w-10 h-10 rounded-xl bg-[#0d0a09] border border-[#3d2f2b] overflow-hidden">{p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" /> : <Users size={16} className="m-3 text-[#3d2f2b]" />}</div>
                  <div><p className="text-white font-bold text-sm">{p.name}</p><p className="text-[8px] uppercase font-black text-[#c5a059]">{config.roles.find(r => r.id === p.roleId)?.name}</p></div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[#f5f5dc] font-bold text-sm">${p.soldPrice?.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="pt-4 border-t border-[#3d2f2b] flex justify-between items-center"><p className="text-[10px] font-black uppercase tracking-widest text-[#b4a697]">Total Portfolio Value</p><p className="text-2xl font-mono font-black text-[#c5a059]">${viewingSquad.reduce((acc, p) => acc + (p.soldPrice || 0), 0).toLocaleString()}</p></div>
        </div>
      </Modal>
    </div>
  );
};

// --- Atomic Layout Units ---

const OrbitalItem: React.FC<{ icon: React.ReactNode; active: boolean; onClick: () => void }> = ({ icon, active, onClick }) => (
  <button onClick={onClick} className={`p-3 rounded-2xl transition-all duration-500 relative flex items-center justify-center ${active ? 'bg-[#c5a059] text-[#0d0a09] shadow-[0_0_20px_rgba(197,160,89,0.5)]' : 'text-[#b4a697] hover:bg-[#c5a059]/10 hover:text-[#f5f5dc]'}`}>
    {icon}
    {active && <div className="absolute top-[-2px] left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full"></div>}
  </button>
);

const StatCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="bg-[#1a1410] border border-[#3d2f2b] rounded-[2rem] p-6 lg:p-8 hover:border-[#c5a059]/30 transition-all group overflow-hidden relative">
    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-125 transition-all text-[#c5a059]">{icon}</div>
    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#b4a697] mb-2">{label}</p>
    <p className="text-3xl lg:text-4xl font-display font-black text-[#f5f5dc] tracking-tighter drop-shadow-lg">{value}</p>
  </div>
);

export default App;
