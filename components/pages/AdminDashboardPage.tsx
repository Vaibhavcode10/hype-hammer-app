import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Users, Trophy, DollarSign, Activity, AlertCircle, 
  Search, Bell, User, LogOut, Menu, Calendar, Shield, 
  Gavel, UserCheck, TrendingUp, FileText, Settings, Eye,
  Play, Pause, StopCircle, Edit, Trash2, Check, X, Download,
  Clock, Target, Award, Briefcase, ChevronRight, Filter,
  PieChart, LineChart, ArrowUp, ArrowDown, Sparkles, Zap,
  Home, Radio, Lock, Unlock, RotateCcw, Plus, Save, RefreshCw,
  AlertTriangle, CheckCircle, XCircle, Info, History,
  Layers, Gauge, BarChart, TrendingDown
} from 'lucide-react';
import { AuctionStatus, MatchData, UserRole, Player, Team } from '../../types';
import { LiveAuctionPage } from './LiveAuctionPage';
import { socketService } from '../../services/socketService';

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
  const [activeSection, setActiveSection] = useState<'overview' | 'settings' | 'players' | 'teams' | 'auctioneers' | 'liveMonitor' | 'analytics' | 'reports'>('overview');
  
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
    maxSquadSize: 15,
    baseTeamBudget: 10000000,
  });
  
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

  // Scroll to top when section changes
  useEffect(() => {
    const contentDiv = document.querySelector('.admin-content-scroll');
    if (contentDiv) {
      contentDiv.scrollTop = 0;
    }
  }, [activeSection]);

  // Filtered data based on search and filters
  const filteredTeams = teams.filter(team => {
    const matchesSearch = team.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.repName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = teamFilter === 'all' || 
      (teamFilter === 'active' && team.squadSize > 0) ||
      (teamFilter === 'inactive' && team.squadSize === 0);
    return matchesSearch && matchesFilter;
  });
  
  const filteredPlayers = players.filter(player => {
    const matchesSearch = player.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      player.role?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = playerFilter === 'all' ||
      (playerFilter === 'available' && (player.status === 'AVAILABLE' || player.status === 'PENDING')) ||
      (playerFilter === 'sold' && player.status === 'SOLD') ||
      (playerFilter === 'unsold' && player.status === 'UNSOLD');
    return matchesSearch && matchesFilter;
  });
  
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
  
  // Season Settings handlers
  const handleSaveSettings = async () => {
    try {
      if (!currentMatch?.id) {
        alert('No match/season selected');
        return;
      }

      const response = await fetch(`http://localhost:5000/api/auctions/${currentMatch.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: seasonSettings.name,
          sport: seasonSettings.sport,
          config: {
            duration: seasonSettings.duration,
            bidIncrement: seasonSettings.bidIncrement,
            maxTeams: seasonSettings.maxTeams,
            maxSquadSize: seasonSettings.maxSquadSize,
            baseTeamBudget: seasonSettings.baseTeamBudget,
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
    if (!currentMatch?.id) {
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
    if (!currentMatch?.id) {
      alert('No active season selected');
      return;
    }
    
    try {
      const response = await fetch('http://localhost:5000/api/auctioneer/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          auctioneerId,
          seasonId: currentMatch.id,
          adminId: currentUser.email
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
          const response = await fetch('http://localhost:5000/api/auctioneer/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              auctioneerId: confirmAction.data,
              seasonId: currentMatch?.id,
              adminId: currentUser.email
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
    const fetchData = async () => {
      if (!currentMatch?.id) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const [teamsRes, playersRes, auctioneersRes] = await Promise.all([
          fetch(`http://localhost:5000/api/teams?matchId=${currentMatch.id}`),
          fetch(`http://localhost:5000/api/players?matchId=${currentMatch.id}`),
          fetch(`http://localhost:5000/api/auctioneers?matchId=${currentMatch.id}`)
        ]);

        if (teamsRes.ok) {
          const data = await teamsRes.json();
          // Calculate squadSize from playerIds array length
          const teamsWithSquadSize = (data.data || []).map((team: Team) => ({
            ...team,
            squadSize: team.playerIds?.length || 0
          }));
          setTeams(teamsWithSquadSize);
        }

        if (playersRes.ok) {
          const data = await playersRes.json();
          setPlayers(data.data || []);
        }

        if (auctioneersRes.ok) {
          const data = await auctioneersRes.json();
          setAuctioneers(data.data || []);
        }
        
        // Initialize alerts count
        const pendingApprovals = (data.data || []).filter((a: any) => !a.status || a.status === 'pending').length;
        setAlertsCount(pendingApprovals);
        
        // Add initial log
        addSystemLog('info', 'Admin dashboard loaded');
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        addSystemLog('error', 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentMatch?.id]);

  // Initialize season settings from current match
  useEffect(() => {
    if (currentMatch) {
      setSeasonSettings({
        name: currentMatch.name || '',
        sport: currentMatch.sport || 'Cricket',
        startDate: currentMatch.matchDate ? new Date(currentMatch.matchDate).toISOString().split('T')[0] : '',
        duration: currentMatch.config?.duration || 120,
        bidIncrement: currentMatch.config?.bidIncrement || 100000,
        maxTeams: currentMatch.config?.maxTeams || 8,
        maxSquadSize: currentMatch.config?.maxSquadSize || 15,
        baseTeamBudget: currentMatch.config?.baseTeamBudget || 10000000,
      });
    }
  }, [currentMatch]);


  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!currentMatch?.id || !currentUser?.email) return;

    // Connect to server
    socketService.connect('http://localhost:5000');

    // Join season room
    socketService.joinSeason(currentMatch.id, currentUser.email, UserRole.ADMIN);

    const socket = socketService.getSocket();
    if (!socket) return;

    // Listen for player updates
    socket.on('PLAYER_UPDATED', async (data: { playerId: string; player: Player }) => {
      console.log('Admin: PLAYER_UPDATED received:', data);
      setPlayers(prev => prev.map(p => p.id === data.playerId ? data.player : p));
      
      // If player was sold, refetch teams to update squad sizes
      if (data.player.status === 'SOLD') {
        try {
          const teamsRes = await fetch(`http://localhost:5000/api/teams?matchId=${currentMatch.id}`);
          if (teamsRes.ok) {
            const teamsData = await teamsRes.json();
            // Calculate squadSize from playerIds array length
            const teamsWithSquadSize = (teamsData.data || []).map((team: Team) => ({
              ...team,
              squadSize: team.playerIds?.length || 0
            }));
            setTeams(teamsWithSquadSize);
          }
        } catch (error) {
          console.error('Failed to refetch teams:', error);
        }
      }
    });

    // Listen for player sold events
    socket.on('PLAYER_SOLD', async (data: any) => {
      console.log('Admin: PLAYER_SOLD received:', data);
      
      // Refetch both players and teams to get updated data
      try {
        const [playersRes, teamsRes] = await Promise.all([
          fetch(`http://localhost:5000/api/players?matchId=${currentMatch.id}`),
          fetch(`http://localhost:5000/api/teams?matchId=${currentMatch.id}`)
        ]);
        
        if (playersRes.ok) {
          const playersData = await playersRes.json();
          setPlayers(playersData.data || []);
        }
        
        if (teamsRes.ok) {
          const teamsData = await teamsRes.json();
          // Calculate squadSize from playerIds array length
          const teamsWithSquadSize = (teamsData.data || []).map((team: Team) => ({
            ...team,
            squadSize: team.playerIds?.length || 0
          }));
          setTeams(teamsWithSquadSize);
        }
        
        addSystemLog('success', `Player ${data.playerName} sold to ${data.teamName} for ₹${(data.finalAmount / 100000).toFixed(1)}L`);
        addLiveNotification(`✅ ${data.playerName} SOLD to ${data.teamName} for ₹${(data.finalAmount / 100000).toFixed(1)}L`, 'sold');
      } catch (error) {
        console.error('Failed to refetch data after player sold:', error);
      }
      
      setCurrentBiddingPlayer(null);
      setCurrentBid(0);
      setLeadingTeamName('');
    });

    // Listen for team updates
    socket.on('TEAM_UPDATED', (data: { teamId: string; team: Team }) => {
      console.log('Admin: TEAM_UPDATED received:', data);
      // Calculate squadSize from playerIds array length
      const updatedTeam = {
        ...data.team,
        squadSize: data.team.playerIds?.length || 0
      };
      setTeams(prev => prev.map(t => t.id === data.teamId ? updatedTeam : t));
    });

    // Listen for live auction events
    socket.on('AUCTION_TIMER_UPDATE', (data: any) => {
      setCountdown(data.remainingSeconds);
    });

    socket.on('AUCTION_STATE_UPDATE', (data: any) => {
      console.log('Admin: AUCTION_STATE_UPDATE received:', data);
      console.log('   → Status:', data.status);
      console.log('   → Current Player ID:', data.currentPlayerId);
      console.log('   → Bidding Active:', data.biddingActive);
      console.log('   → Current Bid:', data.currentBid);
      console.log('   → Leading Team Name:', data.leadingTeamName);
      
      if (data.status) {
        setLiveAuctionStatus(data.status);
      }
      if (data.remainingSeconds !== undefined) {
        setCountdown(data.remainingSeconds);
      }
      if (data.currentPlayerId && data.biddingActive) {
        // Fetch player data if we have the ID
        fetch(`http://localhost:5000/api/players/${data.currentPlayerId}?matchId=${currentMatch.id}`)
          .then(res => res.json())
          .then(playerData => {
            if (playerData.data) {
              console.log('✅ Fetched player:', playerData.data);
              setCurrentBiddingPlayer(playerData.data);
              setCurrentBid(data.currentBid || playerData.data.basePrice || 0);
              setLeadingTeamName(data.leadingTeamName || '');
            }
          })
          .catch(err => {
            console.error('Failed to fetch player:', err);
            // Fallback: try to find in local players array
            const player = players.find(p => p.id === data.currentPlayerId);
            if (player) {
              console.log('✅ Found player in local array:', player);
              setCurrentBiddingPlayer(player);
              setCurrentBid(data.currentBid || player.basePrice || 0);
              setLeadingTeamName(data.leadingTeamName || '');
            }
          });
      } else if (!data.biddingActive) {
        console.log('ℹ️ Bidding not active, clearing current player');
        setCurrentBiddingPlayer(null);
        setCurrentBid(0);
        setLeadingTeamName('');
      }
    });

    socket.on('AUCTION_STARTED', (data: any) => {
      console.log('Admin: AUCTION_STARTED');
      setLiveAuctionStatus('LIVE');
      addSystemLog('info', 'Auction has started');
    });

    socket.on('AUCTION_PAUSED', (data: any) => {
      console.log('Admin: AUCTION_PAUSED');
      setLiveAuctionStatus('PAUSED');
      addSystemLog('warning', 'Auction paused');
    });

    socket.on('AUCTION_RESUMED', (data: any) => {
      console.log('Admin: AUCTION_RESUMED');
      setLiveAuctionStatus('LIVE');
      addSystemLog('info', 'Auction resumed');
    });

    socket.on('AUCTION_ENDED', (data: any) => {
      console.log('Admin: AUCTION_ENDED');
      setLiveAuctionStatus('ENDED');
      addSystemLog('info', 'Auction has ended');
    });

    socket.on('PLAYER_BIDDING_STARTED', (data: any) => {
      console.log('Admin: PLAYER_BIDDING_STARTED', data);
      console.log('   → Player:', data.player);
      console.log('   → Base Price:', data.basePrice);
      
      if (data.player) {
        setCurrentBiddingPlayer(data.player);
        setCurrentBid(data.basePrice || data.player.basePrice || 0);
        setLeadingTeamName('');
        setCountdown(data.duration || 120); // Set initial countdown
        setLiveAuctionStatus('LIVE');
        addSystemLog('info', `Bidding started for ${data.player.name}`);
        addLiveNotification(`🎯 Bidding started for ${data.player.name}`, 'start');
      }
    });

    socket.on('NEW_BID', (data: any) => {
      console.log('Admin: NEW_BID', data);
      console.log('   → Amount:', data.amount);
      console.log('   → Team Name:', data.teamName);
      
      setCurrentBid(data.amount);
      setLeadingTeamName(data.teamName || '');
      addSystemLog('info', `${data.teamName} bid ₹${(data.amount / 100000).toFixed(1)}L`);
      addLiveNotification(`💰 ${data.teamName} bid ₹${(data.amount / 100000).toFixed(1)}L`, 'bid');
    });

    socket.on('PLAYER_UNSOLD', async (data: any) => {
      console.log('Admin: PLAYER_UNSOLD', data);
      setCurrentBiddingPlayer(null);
      setCurrentBid(0);
      setLeadingTeamName('');
      addSystemLog('warning', `${data.playerName} went unsold`);
      addLiveNotification(`❌ ${data.playerName} went UNSOLD`, 'unsold');
    });

    return () => {
      socket.off('PLAYER_UPDATED');
      socket.off('PLAYER_SOLD');
      socket.off('TEAM_UPDATED');
      socket.off('AUCTION_TIMER_UPDATE');
      socket.off('AUCTION_STATE_UPDATE');
      socket.off('AUCTION_STARTED');
      socket.off('AUCTION_PAUSED');
      socket.off('AUCTION_RESUMED');
      socket.off('AUCTION_ENDED');
      socket.off('PLAYER_BIDDING_STARTED');
      socket.off('NEW_BID');
      socket.off('PLAYER_UNSOLD');
    };
  }, [currentMatch?.id, currentUser?.email]);

  // Calculate season-specific KPIs
  const totalTeams = teams.length;
  const approvedTeams = teams.filter(t => t.squadSize !== undefined && t.squadSize > 0).length;
  const totalPlayers = players.length;
  const soldPlayers = players.filter(p => p.status === 'SOLD').length;
  const unsoldPlayers = players.filter(p => p.status === 'UNSOLD').length;
  const pendingPlayers = players.filter(p => p.status === 'AVAILABLE' || p.status === 'PENDING').length;
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
    if (!currentMatch?.id) return;
    
    try {
      setReportLoading(true);
      // Use matchId query parameter instead of auction_id in URL
      const response = await fetch(`http://localhost:5000/api/bids?playerId=${playerId}`);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Bidding history response:', result);
        // Handle both result.data and result.bids or direct array
        const bids = result.data || result.bids || result || [];
        console.log('Extracted bids:', bids);
        
        // Sort by timestamp descending (most recent first)
        const sortedBids = Array.isArray(bids) ? bids.sort((a, b) => {
          const timeA = new Date(a.timestamp).getTime();
          const timeB = new Date(b.timestamp).getTime();
          return timeA - timeB; // Ascending order (oldest first, chronological)
        }) : [];
        
        // Enrich bids with team names
        const enrichedBids = sortedBids.map(bid => {
          const team = teams.find(t => t.id === bid.teamId);
          return {
            ...bid,
            teamName: team?.name || 'Unknown Team'
          };
        });
        
        setBiddingHistory(prev => ({
          ...prev,
          [playerId]: enrichedBids
        }));
      }
    } catch (error) {
      console.error('Failed to fetch bidding history:', error);
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
      const teamPlayers = players.filter(p => p.soldTo === team.id);
      
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

  return (
    <>
      {/* Custom Scrollbar Styles */}
      <style>{`
        .custom-scrollbar {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
        .custom-scrollbar::-webkit-scrollbar {
          display: none;  /* Chrome, Safari, Opera */
        }
      `}</style>

      <div className="h-screen bg-gradient-to-br from-white via-blue-50 to-purple-50 flex overflow-hidden">
        {/* LEFT SIDEBAR - FLOATING ADMIN MENU */}
        <div className={`fixed left-6 top-6 bottom-6 bg-white/95 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border-2 border-blue-200/50 p-8 z-30 hover:shadow-3xl transition-all duration-300 ${
          sidebarCollapsed ? 'w-24' : 'w-72'
        }`}>
          {/* Toggle Button - Small circle at bottom right edge */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute -right-3 bottom-8 w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-full shadow-lg flex items-center justify-center transition-all group z-40"
            title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            <ChevronRight size={16} className={`text-white transition-transform duration-300 ${sidebarCollapsed ? 'rotate-0' : 'rotate-180'}`} />
          </button>

          {/* Logo */}
          <div 
            className={`flex items-center gap-3 mb-8 cursor-pointer hover:scale-105 transition-transform ${
              sidebarCollapsed ? 'justify-center' : ''
            }`}
            onClick={() => setStatus(AuctionStatus.HOME)}
          >
            <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-purple-400 shadow-lg flex-shrink-0">
              <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            {!sidebarCollapsed && (
              <div>
                <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 leading-tight">
                  ADMIN
                </h1>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Control Panel</p>
              </div>
            )}
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-2">
            <button
              onClick={() => setActiveSection('overview')}
              className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-3' : 'gap-3 px-5'} py-4 rounded-2xl font-bold text-sm transition-all ${
                activeSection === 'overview' 
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-xl scale-105' 
                  : 'text-slate-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:scale-102'
              }`}
              title="Overview"
            >
              <Home size={20} className="flex-shrink-0" />
              {!sidebarCollapsed && <span>Overview</span>}
            </button>

            <button
              onClick={() => setActiveSection('reports')}
              className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-3' : 'gap-3 px-5'} py-4 rounded-2xl font-bold text-sm transition-all ${
                activeSection === 'reports' 
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-xl scale-105' 
                  : 'text-slate-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:scale-102'
              }`}
              title="Reports"
            >
              <FileText size={20} className="flex-shrink-0" />
              {!sidebarCollapsed && <span>Reports</span>}
            </button>

            <button
              onClick={() => setActiveSection('players')}
              className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-3' : 'gap-3 px-5'} py-4 rounded-2xl font-bold text-sm transition-all ${
                activeSection === 'players' 
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-xl scale-105' 
                  : 'text-slate-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:scale-102'
              }`}
              title="Players"
            >
              <Users size={20} className="flex-shrink-0" />
              {!sidebarCollapsed && <span>Players</span>}
            </button>

            <button
              onClick={() => setActiveSection('teams')}
              className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-3' : 'gap-3 px-5'} py-4 rounded-2xl font-bold text-sm transition-all ${
                activeSection === 'teams' 
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-xl scale-105' 
                  : 'text-slate-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:scale-102'
              }`}
              title="Teams"
            >
              <Trophy size={20} className="flex-shrink-0" />
              {!sidebarCollapsed && <span>Teams</span>}
            </button>

            <button
              onClick={() => setActiveSection('auctioneers')}
              className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-3' : 'gap-3 px-5'} py-4 rounded-2xl font-bold text-sm transition-all ${
                activeSection === 'auctioneers' 
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-xl scale-105' 
                  : 'text-slate-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:scale-102'
              }`}
              title="Auctioneers"
            >
              <Gavel size={20} className="flex-shrink-0" />
              {!sidebarCollapsed && <span>Auctioneers</span>}
              {!sidebarCollapsed && pendingAuctioneers > 0 && (
                <span className="ml-auto px-2.5 py-1 bg-red-500 text-white text-xs rounded-full font-black shadow-lg">
                  {pendingAuctioneers}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveSection('liveMonitor')}
              className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-3' : 'gap-3 px-5'} py-4 rounded-2xl font-bold text-sm transition-all ${
                activeSection === 'liveMonitor' 
                  ? 'bg-gradient-to-r from-red-500 to-orange-600 text-white shadow-xl animate-pulse scale-105' 
                  : 'text-slate-700 hover:bg-gradient-to-r hover:from-red-50 hover:to-orange-50 hover:scale-102'
              }`}
              title="Live Monitor"
            >
              <Radio size={20} className="flex-shrink-0" />
              {!sidebarCollapsed && <span>Live Monitor</span>}
            </button>

            <button
              onClick={() => setActiveSection('analytics')}
              className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-3' : 'gap-3 px-5'} py-4 rounded-2xl font-bold text-sm transition-all ${
                activeSection === 'analytics' 
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-xl scale-105' 
                  : 'text-slate-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:scale-102'
              }`}
              title="Analytics"
            >
              <BarChart size={20} className="flex-shrink-0" />
              {!sidebarCollapsed && <span>Analytics</span>}
            </button>

            <button
              onClick={() => setActiveSection('settings')}
              className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-3' : 'gap-3 px-5'} py-4 rounded-2xl font-bold text-sm transition-all ${
                activeSection === 'settings' 
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-xl scale-105' 
                  : 'text-slate-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:scale-102'
              }`}
              title="Season Settings"
            >
              <Clock size={20} className="flex-shrink-0" />
              {!sidebarCollapsed && <span>Season Settings</span>}
            </button>
          </nav>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'pl-32' : 'pl-80'}`}>
          {/* TOP BAR - GLOBAL CONTROL STRIP */}
          <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] border-2 border-blue-200 px-8 py-4 mx-6 mt-6 sticky top-6 z-20 shadow-lg">
            <div className="flex items-center justify-between">
              {/* Season Info */}
              <div className="flex items-center gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-800">
                    {currentMatch?.name || 'No Season Selected'}
                  </h2>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                    {currentMatch?.sport || 'Cricket'} • {currentMatch?.year || new Date().getFullYear()}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-4">
                {/* Live Room Button */}
                <button
                  onClick={() => setActiveSection('liveMonitor')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-lg ${
                    activeSection === 'liveMonitor'
                      ? 'bg-red-500 text-white'
                      : 'bg-red-500/10 border-2 border-red-500/20 hover:bg-red-500 hover:text-white text-red-600'
                  }`}
                >
                  <Radio size={16} className={liveAuctionStatus === 'LIVE' ? 'animate-pulse' : ''} />
                  Live Room
                </button>

                {/* Logout */}
                <button 
                  onClick={() => setStatus(AuctionStatus.HOME)} 
                  className="px-4 py-2 rounded-xl bg-red-500/10 border-2 border-red-500/20 hover:bg-red-500 hover:text-white transition-all flex items-center gap-2 text-sm font-bold text-red-600"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </div>
          </div>

          {/* DYNAMIC CONTENT SECTIONS */}
          <div className="px-6 py-6 pb-12 overflow-y-auto h-[calc(100vh-8rem)] admin-content-scroll">
            
            {/* 1️⃣ OVERVIEW SECTION */}
            {activeSection === 'overview' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Teams KPI */}
                  <div className="group relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-blue-600 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity"></div>
                    <div className="relative bg-white/90 backdrop-blur-xl border-2 border-blue-200 rounded-3xl p-6 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-100 rounded-2xl">
                          <Trophy size={28} className="text-blue-600" />
                        </div>
                        <span className="text-xs font-bold text-blue-600">{approvedTeams} Approved</span>
                      </div>
                      <h3 className="text-4xl font-black text-slate-800 mb-2">{totalTeams}</h3>
                      <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">Teams</p>
                    </div>
                  </div>

                  {/* Players KPI */}
                  <div className="group relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-purple-600 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity"></div>
                    <div className="relative bg-white/90 backdrop-blur-xl border-2 border-purple-200 rounded-3xl p-6 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-purple-100 rounded-2xl">
                          <Users size={28} className="text-purple-600" />
                        </div>
                        <span className="text-xs font-bold text-purple-600">{soldPlayers} Sold</span>
                      </div>
                      <h3 className="text-4xl font-black text-slate-800 mb-2">{totalPlayers}</h3>
                      <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">Players</p>
                    </div>
                  </div>

                  {/* Budget KPI */}
                  <div className="group relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-green-600 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity"></div>
                    <div className="relative bg-white/90 backdrop-blur-xl border-2 border-green-200 rounded-3xl p-6 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-100 rounded-2xl">
                          <DollarSign size={28} className="text-green-600" />
                        </div>
                        <span className="text-xs font-bold text-green-600">Pool</span>
                      </div>
                      <h3 className="text-4xl font-black text-slate-800 mb-2">₹{(totalBudget / 1000000).toFixed(0)}M</h3>
                      <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">Total Budget</p>
                    </div>
                  </div>

                  {/* Auctioneers KPI */}
                  <div className="group relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-red-600 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity"></div>
                    <div className="relative bg-white/90 backdrop-blur-xl border-2 border-orange-200 rounded-3xl p-6 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-orange-100 rounded-2xl">
                          <Gavel size={28} className="text-orange-600" />
                        </div>
                        <span className="text-xs font-bold text-orange-600">{approvedAuctioneers} Active</span>
                      </div>
                      <h3 className="text-4xl font-black text-slate-800 mb-2">{auctioneers.length}</h3>
                      <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">Auctioneers</p>
                    </div>
                  </div>
                </div>

                {/* FIRST ROW - 2 CHARTS */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 3. Team Performance - Budget Spending Histogram (MOVED TO FIRST ROW LEFT) */}
                  <div className="bg-white/90 backdrop-blur-xl border-2 border-green-200 rounded-3xl p-6 shadow-xl">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-black text-slate-800">Team Spending Performance</h3>
                      <div className="p-2 bg-green-100 rounded-xl">
                        <Target size={20} className="text-green-600" />
                      </div>
                    </div>
                    <div className="flex items-center justify-center">
                      <div className="relative w-72 h-72">
                        <svg viewBox="0 0 200 200">
                          {/* Background circles */}
                          <circle cx="100" cy="100" r="80" fill="none" stroke="#E5E7EB" strokeWidth="1" />
                          <circle cx="100" cy="100" r="60" fill="none" stroke="#E5E7EB" strokeWidth="1" />
                          <circle cx="100" cy="100" r="40" fill="none" stroke="#E5E7EB" strokeWidth="1" />
                          <circle cx="100" cy="100" r="20" fill="none" stroke="#E5E7EB" strokeWidth="1" />
                          
                          {/* Team bars - showing budget spending */}
                          {teams.slice(0, 8).map((team, idx) => {
                            const angle = (idx * 360) / Math.min(teams.length, 8);
                            const spent = (team.budget || 0) - (team.remainingBudget || 0);
                            const maxBudget = team.budget || 10000000;
                            const spentPercentage = (spent / maxBudget) * 100;
                            const radius = (spentPercentage / 100) * 80;
                            const x = 100 + radius * Math.cos(((angle - 90) * Math.PI) / 180);
                            const y = 100 + radius * Math.sin(((angle - 90) * Math.PI) / 180);
                            
                            const colors = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#06B6D4', '#F97316'];
                            
                            return (
                              <g key={idx}>
                                <line
                                  x1="100"
                                  y1="100"
                                  x2={x}
                                  y2={y}
                                  stroke={colors[idx]}
                                  strokeWidth="8"
                                  strokeLinecap="round"
                                  className="hover:opacity-70 transition-opacity"
                                />
                                <circle cx={x} cy={y} r="4" fill={colors[idx]} />
                              </g>
                            );
                          })}
                          
                          {/* Center circle */}
                          <circle cx="100" cy="100" r="15" fill="white" stroke="#3B82F6" strokeWidth="2" />
                        </svg>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {teams.slice(0, 8).map((team, idx) => {
                        const colors = ['text-blue-600', 'text-purple-600', 'text-pink-600', 'text-yellow-600', 'text-green-600', 'text-red-600', 'text-cyan-600', 'text-orange-600'];
                        const spent = (team.budget || 0) - (team.remainingBudget || 0);
                        return (
                          <div key={idx} className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-semibold text-slate-700 truncate">{team.name}</span>
                            <div className="flex flex-col items-end">
                              <span className={`font-black ${colors[idx]}`}>₹{(spent / 100000).toFixed(1)}L</span>
                              <span className="text-[10px] text-slate-400">{((spent / (team.budget || 10000000)) * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Team Budget Pie Chart */}
                  <div className="bg-white/90 backdrop-blur-xl border-2 border-purple-200 rounded-3xl p-6 shadow-xl">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-black text-slate-800">Budget Distribution</h3>
                      <div className="p-2 bg-purple-100 rounded-xl">
                        <PieChart size={20} className="text-purple-600" />
                      </div>
                    </div>
                    <div className="flex items-center justify-center">
                      <div className="relative w-64 h-64">
                        <svg viewBox="0 0 200 200" className="transform -rotate-90">
                          {(() => {
                            const colors = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#06B6D4', '#F97316'];
                            let currentAngle = 0;
                            // Calculate spent as: initial budget - remaining budget
                            const teamSpending = teams.map(t => ({
                              ...t,
                              spent: (t.budget || 0) - (t.remainingBudget || 0)
                            }));
                            const totalSpent = teamSpending.reduce((sum, t) => sum + t.spent, 0) || 1;
                            
                            return teamSpending.map((team, idx) => {
                              const spent = team.spent || 0;
                              if (spent === 0) return null; // Skip teams with no spending
                              const percentage = (spent / totalSpent) * 100;
                              const angle = (percentage / 100) * 360;
                              const startAngle = currentAngle;
                              currentAngle += angle;
                              
                              const x1 = 100 + 80 * Math.cos((startAngle * Math.PI) / 180);
                              const y1 = 100 + 80 * Math.sin((startAngle * Math.PI) / 180);
                              const x2 = 100 + 80 * Math.cos((currentAngle * Math.PI) / 180);
                              const y2 = 100 + 80 * Math.sin((currentAngle * Math.PI) / 180);
                              const largeArc = angle > 180 ? 1 : 0;
                              
                              return (
                                <path
                                  key={idx}
                                  d={`M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`}
                                  fill={colors[idx % colors.length]}
                                  className="hover:opacity-80 transition-opacity cursor-pointer"
                                />
                              );
                            });
                          })()}
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <p className="text-3xl font-black text-slate-800">₹{(teams.reduce((sum, t) => sum + ((t.budget || 0) - (t.remainingBudget || 0)), 0) / 1000000).toFixed(1)}M</p>
                            <p className="text-xs font-bold text-slate-500">Spent</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {teams.slice(0, 8).map((team, idx) => {
                        const colors = ['bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-yellow-500', 'bg-green-500', 'bg-red-500', 'bg-cyan-500', 'bg-orange-500'];
                        const spent = (team.budget || 0) - (team.remainingBudget || 0);
                        return (
                          <div key={idx} className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${colors[idx]}`}></div>
                            <div>
                              <span className="text-xs font-semibold text-slate-700 truncate block">{team.name}</span>
                              <span className="text-[10px] text-slate-500">₹{(spent / 100000).toFixed(1)}L</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* INFO SECTION */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-3xl p-6 shadow-xl">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                        <Trophy size={32} className="text-white" />
                      </div>
                      <h4 className="text-2xl font-black text-slate-800 mb-1">{players.filter(p => p.status === 'SOLD').length}/{totalPlayers}</h4>
                      <p className="text-sm font-bold text-slate-600">Players Sold</p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center">
                        <DollarSign size={32} className="text-white" />
                      </div>
                      <h4 className="text-2xl font-black text-slate-800 mb-1">₹{(teams.reduce((sum, t) => sum + ((t.budget || 0) - (t.remainingBudget || 0)), 0) / 1000000).toFixed(1)}M</h4>
                      <p className="text-sm font-bold text-slate-600">Total Spent</p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center">
                        <Activity size={32} className="text-white" />
                      </div>
                      <h4 className="text-2xl font-black text-slate-800 mb-1">{approvedTeams}/{totalTeams}</h4>
                      <p className="text-sm font-bold text-slate-600">Active Teams</p>
                    </div>
                  </div>
                </div>

                {/* SECOND ROW - 2 CHARTS */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 1. Price Pyramid Chart (MOVED TO SECOND ROW LEFT) */}
                  <div className="bg-white/90 backdrop-blur-xl border-2 border-blue-200 rounded-3xl p-6 shadow-xl">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-black text-slate-800">Player Price Distribution</h3>
                      <div className="p-2 bg-blue-100 rounded-xl">
                        <TrendingUp size={20} className="text-blue-600" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      {(() => {
                        const priceRanges = [
                          { label: '₹10L+', min: 1000000, color: 'bg-gradient-to-r from-purple-500 to-pink-600' },
                          { label: '₹5-10L', min: 500000, max: 1000000, color: 'bg-gradient-to-r from-blue-500 to-purple-500' },
                          { label: '₹2-5L', min: 200000, max: 500000, color: 'bg-gradient-to-r from-green-500 to-blue-500' },
                          { label: '₹1-2L', min: 100000, max: 200000, color: 'bg-gradient-to-r from-yellow-500 to-green-500' },
                          { label: '< ₹1L', max: 100000, color: 'bg-gradient-to-r from-orange-500 to-yellow-500' }
                        ];
                        const maxCount = Math.max(...priceRanges.map(range => 
                          players.filter(p => {
                            const price = p.soldAmount || p.basePrice || 0;
                            return (range.min === undefined || price >= range.min) && (range.max === undefined || price < range.max);
                          }).length
                        ), 1);
                        
                        return priceRanges.map((range, idx) => {
                          const count = players.filter(p => {
                            const price = p.soldAmount || p.basePrice || 0;
                            return (range.min === undefined || price >= range.min) && (range.max === undefined || price < range.max);
                          }).length;
                          const percentage = (count / maxCount) * 100;
                          
                          return (
                            <div key={idx} className="flex items-center gap-4">
                              <span className="text-sm font-bold text-slate-700 w-20">{range.label}</span>
                              <div className="flex-1 bg-gray-100 rounded-full h-8 overflow-hidden relative">
                                <div 
                                  className={`h-full ${range.color} transition-all duration-1000 flex items-center justify-end pr-3`}
                                  style={{ width: `${percentage}%` }}
                                >
                                  {count > 0 && <span className="text-white font-black text-xs">{count}</span>}
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* 4. Team-Player Dot Plot with Price Details (MOVED TO RIGHT) */}
                  <div className="bg-white/90 backdrop-blur-xl border-2 border-orange-200 rounded-3xl p-6 shadow-xl">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-black text-slate-800">Team Rosters & Prices</h3>
                      <div className="p-2 bg-orange-100 rounded-xl">
                        <Users size={20} className="text-orange-600" />
                      </div>
                    </div>
                    <div className="space-y-4 max-h-[300px] overflow-y-auto">
                      {teams.map((team, idx) => {
                        const teamPlayers = players.filter(p => p.soldTo === team.id);
                        const totalPlayerValue = teamPlayers.reduce((sum, p) => sum + (p.soldAmount || 0), 0);
                        const colors = ['bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-yellow-500', 'bg-green-500', 'bg-red-500', 'bg-cyan-500', 'bg-orange-500'];
                        const spent = (team.budget || 0) - (team.remainingBudget || 0);
                        
                        return (
                          <div key={idx} className="border-2 border-slate-100 rounded-2xl p-4 hover:border-blue-300 transition-all">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-xl ${colors[idx % colors.length]} flex items-center justify-center text-white font-bold text-sm`}>
                                  {team.name?.[0] || 'T'}
                                </div>
                                <div>
                                  <p className="font-black text-slate-800 text-sm">{team.name}</p>
                                  <p className="text-xs text-slate-500">{teamPlayers.length} players</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold block mb-1">
                                  Spent: ₹{(spent / 100000).toFixed(1)}L
                                </span>
                                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold block">
                                  Value: ₹{(totalPlayerValue / 100000).toFixed(1)}L
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {teamPlayers.map((player, pIdx) => (
                                <div
                                  key={pIdx}
                                  className={`w-2 h-2 rounded-full ${colors[idx % colors.length]} cursor-help`}
                                  title={`${player.name}: ₹${((player.soldAmount || 0) / 100000).toFixed(1)}L`}
                                ></div>
                              ))}
                              {teamPlayers.length === 0 && (
                                <p className="text-xs text-slate-400 italic">No players yet</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* 2️⃣ SEASON SETTINGS SECTION */}
            {activeSection === 'settings' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-3xl font-black text-slate-800">Season Settings</h2>
                  <div className="flex items-center gap-3">
                    {editingSettings ? (
                      <>
                        <button
                          onClick={() => setEditingSettings(false)}
                          className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm transition-all flex items-center gap-2"
                        >
                          <X size={16} />
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveSettings}
                          className="px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold text-sm transition-all flex items-center gap-2"
                        >
                          <Save size={16} />
                          Save
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setEditingSettings(true)}
                          className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm transition-all flex items-center gap-2"
                        >
                          <Edit size={16} />
                          Edit
                        </button>
                        <button
                          onClick={handleLockSeason}
                          className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-all flex items-center gap-2"
                        >
                          <Lock size={16} />
                          Lock
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white/90 backdrop-blur-xl border-2 border-blue-200 rounded-3xl p-6 shadow-xl">
                    <label className="block text-sm font-bold text-slate-600 mb-2 uppercase tracking-wider">Season Name</label>
                    <input
                      type="text"
                      value={seasonSettings.name}
                      onChange={(e) => setSeasonSettings({...seasonSettings, name: e.target.value})}
                      disabled={!editingSettings}
                      className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 focus:border-blue-500 focus:outline-none text-lg font-bold disabled:bg-gray-50"
                    />
                  </div>

                  <div className="bg-white/90 backdrop-blur-xl border-2 border-blue-200 rounded-3xl p-6 shadow-xl">
                    <label className="block text-sm font-bold text-slate-600 mb-2 uppercase tracking-wider">Sport Type</label>
                    <select
                      value={seasonSettings.sport}
                      onChange={(e) => setSeasonSettings({...seasonSettings, sport: e.target.value})}
                      disabled={!editingSettings}
                      className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 focus:border-blue-500 focus:outline-none text-lg font-bold disabled:bg-gray-50"
                    >
                      <option value="Cricket">Cricket</option>
                      <option value="Football">Football</option>
                      <option value="Basketball">Basketball</option>
                      <option value="Kabaddi">Kabaddi</option>
                    </select>
                  </div>

                  <div className="bg-white/90 backdrop-blur-xl border-2 border-blue-200 rounded-3xl p-6 shadow-xl">
                    <label className="block text-sm font-bold text-slate-600 mb-2 uppercase tracking-wider">Auction Duration (minutes)</label>
                    <input
                      type="number"
                      value={seasonSettings.duration}
                      onChange={(e) => setSeasonSettings({...seasonSettings, duration: parseInt(e.target.value)})}
                      disabled={!editingSettings}
                      className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 focus:border-blue-500 focus:outline-none text-lg font-bold disabled:bg-gray-50"
                    />
                  </div>

                  <div className="bg-white/90 backdrop-blur-xl border-2 border-blue-200 rounded-3xl p-6 shadow-xl">
                    <label className="block text-sm font-bold text-slate-600 mb-2 uppercase tracking-wider">Bid Increment (₹)</label>
                    <input
                      type="number"
                      value={seasonSettings.bidIncrement}
                      onChange={(e) => setSeasonSettings({...seasonSettings, bidIncrement: parseInt(e.target.value)})}
                      disabled={!editingSettings}
                      className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 focus:border-blue-500 focus:outline-none text-lg font-bold disabled:bg-gray-50"
                    />
                  </div>

                  <div className="bg-white/90 backdrop-blur-xl border-2 border-blue-200 rounded-3xl p-6 shadow-xl">
                    <label className="block text-sm font-bold text-slate-600 mb-2 uppercase tracking-wider">Max Teams</label>
                    <input
                      type="number"
                      value={seasonSettings.maxTeams}
                      onChange={(e) => setSeasonSettings({...seasonSettings, maxTeams: parseInt(e.target.value)})}
                      disabled={!editingSettings}
                      className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 focus:border-blue-500 focus:outline-none text-lg font-bold disabled:bg-gray-50"
                    />
                  </div>

                  <div className="bg-white/90 backdrop-blur-xl border-2 border-blue-200 rounded-3xl p-6 shadow-xl">
                    <label className="block text-sm font-bold text-slate-600 mb-2 uppercase tracking-wider">Max Squad Size</label>
                    <input
                      type="number"
                      value={seasonSettings.maxSquadSize}
                      onChange={(e) => setSeasonSettings({...seasonSettings, maxSquadSize: parseInt(e.target.value)})}
                      disabled={!editingSettings}
                      className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 focus:border-blue-500 focus:outline-none text-lg font-bold disabled:bg-gray-50"
                    />
                  </div>

                  <div className="bg-white/90 backdrop-blur-xl border-2 border-blue-200 rounded-3xl p-6 shadow-xl md:col-span-2">
                    <label className="block text-sm font-bold text-slate-600 mb-2 uppercase tracking-wider">Base Team Budget (₹)</label>
                    <input
                      type="number"
                      value={seasonSettings.baseTeamBudget}
                      onChange={(e) => setSeasonSettings({...seasonSettings, baseTeamBudget: parseInt(e.target.value)})}
                      disabled={!editingSettings}
                      className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 focus:border-blue-500 focus:outline-none text-lg font-bold disabled:bg-gray-50"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 3️⃣ PLAYERS MANAGEMENT */}
            {activeSection === 'players' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-3xl font-black text-slate-800">Players Management</h2>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search players..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-12 pr-6 py-3 rounded-2xl border-2 border-blue-200 focus:border-blue-500 focus:outline-none text-sm font-semibold"
                      />
                    </div>
                    <select
                      value={playerFilter}
                      onChange={(e) => setPlayerFilter(e.target.value as any)}
                      className="px-4 py-3 rounded-xl border-2 border-blue-200 focus:border-blue-500 focus:outline-none text-sm font-bold"
                    >
                      <option value="all">All Players</option>
                      <option value="available">Available</option>
                      <option value="sold">Sold</option>
                      <option value="unsold">Unsold</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-3">
                  {filteredPlayers.map((player) => (
                    <div key={player.id} className="bg-white/90 backdrop-blur-xl border-2 border-blue-200 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-black text-lg overflow-hidden flex-shrink-0">
                            {player.imageUrl ? (
                              <img src={player.imageUrl} alt={player.name} className="w-full h-full object-cover" />
                            ) : (
                              player.name.charAt(0)
                            )}
                          </div>
                          <div>
                            <h3 className="text-base font-black text-slate-800">{player.name}</h3>
                            <p className="text-xs text-slate-600">{player.role || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Base Price</p>
                            <p className="text-sm font-black text-slate-800">₹{((player.basePrice || 0) / 100000).toFixed(1)}L</p>
                          </div>
                          {player.status === 'SOLD' && (
                            <>
                              <div className="text-right">
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Sold Price</p>
                                <p className="text-sm font-black text-green-600">₹{((player.soldAmount || player.soldPrice || player.finalPrice || player.currentBid || player.basePrice || 0) / 100000).toFixed(1)}L</p>
                              </div>
                              <div className="text-right min-w-[100px]">
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Team</p>
                                <p className="text-sm font-black text-purple-600 truncate">{teams.find(t => t.id === player.soldTo)?.name || player.teamName || player.teamId || 'N/A'}</p>
                              </div>
                            </>
                          )}
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                            player.status === 'SOLD' ? 'bg-green-100 text-green-700' :
                            player.status === 'UNSOLD' ? 'bg-red-100 text-red-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {player.status || 'AVAILABLE'}
                          </span>
                          {currentMatch?.status === 'SETUP' && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleEditPlayerPrice(player.id)}
                                className="p-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-600 transition-colors"
                                title="Edit Price"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => handleRemovePlayer(player.id)}
                                className="p-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 transition-colors"
                                title="Remove Player"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4️⃣ TEAMS MANAGEMENT */}
            {activeSection === 'teams' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-3xl font-black text-slate-800">Teams Management</h2>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search teams..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-12 pr-6 py-3 rounded-2xl border-2 border-blue-200 focus:border-blue-500 focus:outline-none text-sm font-semibold"
                      />
                    </div>
                    <select
                      value={teamFilter}
                      onChange={(e) => setTeamFilter(e.target.value as any)}
                      className="px-4 py-3 rounded-xl border-2 border-blue-200 focus:border-blue-500 focus:outline-none text-sm font-bold"
                    >
                      <option value="all">All Teams</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-slate-500 mt-4 font-semibold">Loading teams...</p>
                  </div>
                ) : filteredTeams.length === 0 ? (
                  <div className="bg-white/90 backdrop-blur-xl border-2 border-blue-200 rounded-2xl p-12 text-center">
                    <Trophy size={48} className="mx-auto text-slate-300 mb-4" />
                    <h3 className="text-xl font-black text-slate-600 mb-2">No Teams Yet</h3>
                    <p className="text-slate-500">Waiting for team registrations...</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {filteredTeams.map((team) => (
                    <div key={team.id} className="bg-white/90 backdrop-blur-xl border-2 border-blue-200 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-black text-lg overflow-hidden flex-shrink-0">
                            {team.logo ? (
                              <img src={team.logo} alt={team.name} className="w-full h-full object-cover" />
                            ) : (
                              team.name?.charAt(0) || 'T'
                            )}
                          </div>
                          <div>
                            <h3 className="text-base font-black text-slate-800">{team.name}</h3>
                            <p className="text-xs text-slate-600">{team.repName || 'No Rep'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Budget</p>
                            <p className="text-sm font-black text-slate-800">₹{((team.budget || team.initialBudget || 0) / 1000000).toFixed(1)}M</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Remaining</p>
                            <p className="text-sm font-black text-green-600">₹{((team.remainingBudget !== undefined ? team.remainingBudget : (team.budget || team.initialBudget || 0)) / 1000000).toFixed(1)}M</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Squad</p>
                            <p className="text-sm font-black text-purple-600">{team.squadSize || 0} Players</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                            (team.squadSize || 0) > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {(team.squadSize || 0) > 0 ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                          {currentMatch?.status === 'SETUP' && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleEditTeamBudget(team.id)}
                                className="p-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-600 transition-colors"
                                title="Edit Budget"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => handleDisableTeam(team.id)}
                                className="p-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 transition-colors"
                                title="Disable Team"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 5️⃣ AUCTIONEERS MANAGEMENT */}
            {activeSection === 'auctioneers' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-3xl font-black text-slate-800">Auctioneer Applications</h2>
                    <p className="text-sm text-slate-600 mt-2 font-semibold">
                      ⚠️ Only ONE auctioneer per season. Approving one will auto-reject others.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-full text-sm font-bold">
                      {pendingAuctioneers} Pending
                    </span>
                    <span className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-bold">
                      {approvedAuctioneers} Approved
                    </span>
                  </div>
                </div>

                <div className="grid gap-4">
                  {auctioneers.map((auctioneer) => (
                    <div key={auctioneer.id} className="space-y-3">
                      <div className={`bg-white/90 backdrop-blur-xl border-2 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all ${
                        auctioneer.status === 'approved' ? 'border-green-400' :
                        auctioneer.status === 'rejected' ? 'border-red-400' :
                        'border-blue-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-black text-2xl">
                              <Gavel size={32} />
                            </div>
                            <div>
                              <h3 className="text-xl font-black text-slate-800">{auctioneer.name}</h3>
                              <p className="text-sm text-slate-600">{auctioneer.email}</p>
                              <p className="text-xs text-slate-500 mt-1">
                                {auctioneer.experience || '0'} years exp • {auctioneer.languagesKnown?.join(', ') || 'N/A'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => {
                                if (selectedAuctioneer?.id === auctioneer.id) {
                                  setSelectedAuctioneer(null);
                                } else {
                                  setSelectedAuctioneer(auctioneer);
                                }
                              }}
                              className={`px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                                selectedAuctioneer?.id === auctioneer.id 
                                  ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                                  : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                              }`}
                            >
                              <Eye size={16} />
                              {selectedAuctioneer?.id === auctioneer.id ? 'Hide' : 'View'} Details
                            </button>
                            {auctioneer.status === 'approved' ? (
                              <div className="flex items-center gap-2 px-4 py-2 bg-green-100 rounded-full">
                                <CheckCircle size={18} className="text-green-600" />
                                <span className="text-sm font-bold text-green-800">APPROVED</span>
                              </div>
                            ) : auctioneer.status === 'rejected' ? (
                              <div className="flex items-center gap-2 px-4 py-2 bg-red-100 rounded-full">
                                <XCircle size={18} className="text-red-600" />
                                <span className="text-sm font-bold text-red-800">REJECTED</span>
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleRejectAuctioneer(auctioneer.id)}
                                  className="px-4 py-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 font-bold text-sm transition-all flex items-center gap-2"
                                >
                                  <X size={16} />
                                  Reject
                                </button>
                                <button
                                  onClick={() => handleApproveAuctioneer(auctioneer.id)}
                                  className="px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold text-sm shadow-lg transition-all flex items-center gap-2"
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
                        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border-2 border-slate-200 space-y-4 animate-in slide-in-from-top duration-300">
                          {/* Personal Information */}
                          <div>
                            <h4 className="text-base font-black text-slate-800 mb-3 flex items-center gap-2">
                              <User size={18} className="text-blue-600" />
                              Personal Information
                            </h4>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div className="bg-white rounded-xl p-3">
                                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Full Name</p>
                                <p className="text-slate-800 font-semibold">{auctioneer.name || 'N/A'}</p>
                              </div>
                              <div className="bg-white rounded-xl p-3">
                                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Email</p>
                                <p className="text-slate-800 font-semibold break-all">{auctioneer.email || 'N/A'}</p>
                              </div>
                              <div className="bg-white rounded-xl p-3">
                                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Phone</p>
                                <p className="text-slate-800 font-semibold">{auctioneer.phone || 'N/A'}</p>
                              </div>
                              <div className="col-span-3 bg-white rounded-xl p-3">
                                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Auctioneer ID</p>
                                <p className="text-slate-800 font-mono text-sm">{auctioneer.id || 'N/A'}</p>
                              </div>
                            </div>
                          </div>

                          {/* Professional Details */}
                          <div>
                            <h4 className="text-base font-black text-slate-800 mb-3 flex items-center gap-2">
                              <Gavel size={18} className="text-purple-600" />
                              Professional Details
                            </h4>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div className="bg-white rounded-xl p-3">
                                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Experience</p>
                                <p className="text-slate-800 font-semibold">{auctioneer.experience || '0'} years</p>
                              </div>
                              <div className="bg-white rounded-xl p-3">
                                <p className="text-xs font-bold text-slate-500 uppercase mb-1">License</p>
                                <p className="text-slate-800 font-semibold">{auctioneer.auctioneerLicense || 'N/A'}</p>
                              </div>
                              <div className="bg-white rounded-xl p-3">
                                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Govt ID</p>
                                <p className="text-slate-800 font-semibold">{auctioneer.auctioneerGovtId || 'N/A'}</p>
                              </div>
                              <div className="col-span-3 bg-white rounded-xl p-3">
                                <p className="text-xs font-bold text-slate-500 uppercase mb-2">Languages Known</p>
                                <div className="flex flex-wrap gap-2">
                                  {auctioneer.languagesKnown?.length > 0 ? (
                                    auctioneer.languagesKnown.map((lang: string, idx: number) => (
                                      <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">
                                        {lang}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-slate-500 text-xs">No languages specified</span>
                                  )}
                                </div>
                              </div>
                              <div className="col-span-3 bg-white rounded-xl p-3">
                                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Previous Auctions</p>
                                <p className="text-slate-800 font-semibold whitespace-pre-wrap text-xs">{auctioneer.previousAuctions || 'No previous auctions mentioned'}</p>
                              </div>
                            </div>
                          </div>

                          {/* Application Status */}
                          <div>
                            <h4 className="text-base font-black text-slate-800 mb-3 flex items-center gap-2">
                              <FileText size={18} className="text-green-600" />
                              Application Status
                            </h4>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div className="bg-white rounded-xl p-3">
                                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Status</p>
                                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${
                                  auctioneer.status === 'approved' ? 'bg-green-100 text-green-700' :
                                  auctioneer.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                  'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {auctioneer.status === 'approved' ? <CheckCircle size={14} /> :
                                   auctioneer.status === 'rejected' ? <XCircle size={14} /> :
                                   <Clock size={14} />}
                                  {(auctioneer.status || 'pending').toUpperCase()}
                                </span>
                              </div>
                              <div className="col-span-2 bg-white rounded-xl p-3">
                                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Applied On</p>
                                <p className="text-slate-800 font-semibold text-xs">
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
                                <div className="col-span-3 bg-white rounded-xl p-3">
                                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">Assigned Event</p>
                                  <p className="text-slate-800 font-semibold text-xs">{auctioneer.assignedAuctionEvent}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {auctioneers.length === 0 && (
                    <div className="bg-white/90 backdrop-blur-xl border-2 border-blue-200 rounded-2xl p-12 text-center">
                      <Gavel size={48} className="mx-auto text-slate-300 mb-4" />
                      <h3 className="text-xl font-black text-slate-600 mb-2">No Applications Yet</h3>
                      <p className="text-slate-500">Waiting for auctioneers to apply...</p>
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
                      className={`animate-in slide-in-from-right duration-300 shadow-2xl rounded-2xl overflow-hidden ${
                        notification.type === 'bid' ? 'bg-gradient-to-r from-blue-500 to-cyan-600' :
                        notification.type === 'sold' ? 'bg-gradient-to-r from-green-500 to-emerald-600' :
                        notification.type === 'unsold' ? 'bg-gradient-to-r from-gray-500 to-slate-600' :
                        notification.type === 'start' ? 'bg-gradient-to-r from-orange-500 to-red-600' :
                        'bg-gradient-to-r from-purple-500 to-indigo-600'
                      }`}
                    >
                      <div className="p-4 flex items-center gap-3">
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

                <div className="grid grid-cols-12 gap-1.5 h-[calc(100vh-130px)]">
                  {/* Left: Live Auction Display */}
                  <div className="col-span-8 h-full">
                    {/* Live Auction Card */}
                    <div className="bg-white/90 backdrop-blur-xl border-2 border-cyan-200 rounded-3xl overflow-hidden shadow-xl h-full flex flex-col">
                      <div className="bg-gradient-to-r from-red-100 to-orange-100 border-b-2 border-red-200 p-2">
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                          <Zap size={16} className="text-red-600" />
                          Live Auction Room
                        </h3>
                      </div>
                      
                      <div className="p-4 flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50 flex-1">
                        {currentBiddingPlayer ? (
                          <div className="text-center w-full max-w-md">
                            {/* Player Image */}
                            <div className="h-48 flex items-center justify-center bg-slate-200 rounded-2xl border-4 border-white shadow-lg mb-3 mx-auto overflow-hidden">
                              {currentBiddingPlayer.imageUrl ? (
                                <img src={currentBiddingPlayer.imageUrl} alt={currentBiddingPlayer.name} className="max-h-full max-w-full object-cover rounded-xl" />
                              ) : (
                                <User size={60} className="text-gray-500" />
                              )}
                            </div>

                            {/* Player Info */}
                            <h3 className="text-3xl font-black text-slate-800 mb-2 uppercase leading-tight">{currentBiddingPlayer.name}</h3>
                            <p className="text-cyan-600 text-xs uppercase tracking-wider font-bold mb-3">{currentBiddingPlayer.role || currentBiddingPlayer.roleId || 'Player'}</p>

                            {/* Timer */}
                            {countdown > 0 && (
                              <div className="bg-white border-4 border-yellow-400 rounded-2xl p-2 mb-3 shadow-lg inline-block">
                                <p className="text-xs text-gray-600 uppercase tracking-wider font-bold mb-1">Time Remaining</p>
                                <p className="text-4xl font-black text-slate-800 animate-pulse">{countdown}s</p>
                              </div>
                            )}

                            {/* Current Bid */}
                            <div className="bg-white border-4 border-red-400 rounded-2xl p-4 mb-2 shadow-lg">
                              <p className="text-xs text-gray-600 uppercase tracking-wider font-bold mb-1">Current Bid</p>
                              <p className="text-4xl font-black text-slate-800 mb-1">
                                ₹{currentBid >= 10000000 ? (currentBid / 10000000).toFixed(1) + 'Cr' : (currentBid / 100000).toFixed(1) + 'L'}
                              </p>
                              {leadingTeamName ? (
                                <p className="text-cyan-600 text-base font-bold animate-pulse">Leading: {leadingTeamName}</p>
                              ) : (
                                <p className="text-gray-500 text-sm">No bids yet</p>
                              )}
                            </div>

                            {/* Base Price */}
                            <p className="text-gray-600 text-xs">Base Price: ₹{(currentBiddingPlayer.basePrice / 100000).toFixed(1)}L</p>
                          </div>
                        ) : (
                          <div className="text-center">
                            <Radio size={60} className={`mx-auto mb-4 ${liveAuctionStatus === 'LIVE' ? 'text-red-500 animate-pulse' : 'text-gray-400'}`} />
                            <h3 className="text-2xl font-black text-slate-600 mb-2">
                              {liveAuctionStatus === 'LIVE' ? 'Preparing Next Player...' :
                               liveAuctionStatus === 'PAUSED' ? 'Auction Paused' :
                               liveAuctionStatus === 'ENDED' ? 'Auction Ended' :
                               'Waiting to Start'}
                            </h3>
                            <p className="text-gray-500 text-sm">
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
                  <div className="col-span-4 h-full grid grid-rows-5 gap-1.5">
                    {/* Row 1: Players Sold */}
                    <div className="bg-white/90 backdrop-blur-xl border-2 border-blue-200 rounded-2xl p-3 shadow-lg">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Players Sold</h4>
                        <CheckCircle size={14} className="text-green-500" />
                      </div>
                      <p className="text-xl font-black text-green-600">{soldPlayers}/{totalPlayers}</p>
                      <div className="mt-1 w-full bg-gray-200 rounded-full h-1">
                        <div 
                          className="bg-green-500 h-1 rounded-full transition-all duration-500"
                          style={{ width: `${totalPlayers > 0 ? (soldPlayers / totalPlayers) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Row 2: Total Spent */}
                    <div className="bg-white/90 backdrop-blur-xl border-2 border-orange-200 rounded-2xl p-3 shadow-lg">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Total Spent</h4>
                        <DollarSign size={14} className="text-orange-500" />
                      </div>
                      <p className="text-xl font-black text-orange-600">₹{(spentBudget / 10000000).toFixed(1)}Cr</p>
                      <p className="text-xs text-slate-500">of ₹{(totalBudget / 10000000).toFixed(1)}Cr</p>
                    </div>

                    {/* Row 3: Teams Active and Remaining side by side */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="bg-white/90 backdrop-blur-xl border-2 border-purple-200 rounded-2xl p-3 shadow-lg">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Teams Active</h4>
                          <Users size={14} className="text-purple-500" />
                        </div>
                        <p className="text-xl font-black text-purple-600">{approvedTeams}</p>
                        <p className="text-xs text-slate-500">Bidding teams</p>
                      </div>

                      <div className="bg-white/90 backdrop-blur-xl border-2 border-cyan-200 rounded-2xl p-3 shadow-lg">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Remaining</h4>
                          <Activity size={14} className="text-cyan-500" />
                        </div>
                        <p className="text-xl font-black text-cyan-600">{pendingPlayers}</p>
                        <p className="text-xs text-slate-500">Players pending</p>
                      </div>
                    </div>

                    {/* Emergency Controls - 2 rows */}
                    <div className="row-span-2 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl p-2 shadow-2xl">
                      <h3 className="text-sm font-black text-white mb-2 flex items-center gap-2">
                        <AlertTriangle size={18} />
                        Emergency Controls
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={handleEmergencyPause}
                          disabled={emergencyPaused || liveAuctionStatus !== 'LIVE'}
                          className="px-3 py-3 rounded-xl bg-white/90 hover:bg-white font-black text-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-1"
                        >
                          <Pause size={20} />
                          <span className="text-xs">PAUSE</span>
                        </button>
                        <button
                          onClick={() => handleExtendTimer(30)}
                          disabled={liveAuctionStatus !== 'LIVE' || !currentBiddingPlayer}
                          className="px-3 py-3 rounded-xl bg-white/90 hover:bg-white font-black text-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-1"
                        >
                          <Clock size={20} />
                          <span className="text-xs">+30s</span>
                        </button>
                        <button
                          onClick={handleForceCloseBidding}
                          disabled={liveAuctionStatus !== 'LIVE' || !currentBiddingPlayer}
                          className="px-3 py-3 rounded-xl bg-white/90 hover:bg-white font-black text-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-1"
                        >
                          <StopCircle size={20} />
                          <span className="text-xs">CLOSE</span>
                        </button>
                        <button
                          onClick={handleRollbackLastAction}
                          className="px-3 py-3 rounded-xl bg-white/90 hover:bg-white font-black text-blue-600 transition-all flex flex-col items-center gap-1"
                        >
                          <RotateCcw size={20} />
                          <span className="text-xs">UNDO</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 7️⃣ ANALYTICS */}
            {activeSection === 'analytics' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <h2 className="text-3xl font-black text-slate-800 mb-6">Analytics & Insights</h2>

                {/* Budget Distribution */}
                <div className="bg-white/90 backdrop-blur-xl border-2 border-blue-200 rounded-3xl p-6 shadow-xl">
                  <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                    <PieChart size={24} className="text-blue-600" />
                    Budget Distribution
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-6 bg-blue-50 rounded-2xl">
                      <p className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-2">Total Pool</p>
                      <p className="text-4xl font-black text-blue-600">₹{(totalBudget / 1000000).toFixed(0)}M</p>
                    </div>
                    <div className="text-center p-6 bg-green-50 rounded-2xl">
                      <p className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-2">Spent</p>
                      <p className="text-4xl font-black text-green-600">₹{(spentBudget / 1000000).toFixed(0)}M</p>
                      <p className="text-xs text-slate-500 mt-2">{((spentBudget / totalBudget) * 100).toFixed(1)}%</p>
                    </div>
                    <div className="text-center p-6 bg-orange-50 rounded-2xl">
                      <p className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-2">Remaining</p>
                      <p className="text-4xl font-black text-orange-600">₹{(remainingBudget / 1000000).toFixed(0)}M</p>
                      <p className="text-xs text-slate-500 mt-2">{((remainingBudget / totalBudget) * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                  
                  {/* Visual Progress Bar */}
                  <div className="mt-6">
                    <div className="w-full h-8 bg-gray-200 rounded-full overflow-hidden flex">
                      <div 
                        className="bg-green-500 flex items-center justify-center text-white text-xs font-bold"
                        style={{ width: `${(spentBudget / totalBudget) * 100}%` }}
                      >
                        {((spentBudget / totalBudget) * 100).toFixed(0)}% Spent
                      </div>
                      <div 
                        className="bg-orange-300 flex items-center justify-center text-white text-xs font-bold"
                        style={{ width: `${(remainingBudget / totalBudget) * 100}%` }}
                      >
                        {((remainingBudget / totalBudget) * 100).toFixed(0)}% Left
                      </div>
                    </div>
                  </div>
                </div>

                {/* Player Status Breakdown */}
                <div className="bg-white/90 backdrop-blur-xl border-2 border-purple-200 rounded-3xl p-6 shadow-xl">
                  <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                    <BarChart3 size={24} className="text-purple-600" />
                    Player Status
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-6 bg-green-50 rounded-2xl border-2 border-green-200">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">Sold</p>
                        <CheckCircle size={20} className="text-green-600" />
                      </div>
                      <p className="text-5xl font-black text-green-600 mb-1">{soldPlayers}</p>
                      <p className="text-xs text-slate-500">{totalPlayers > 0 ? ((soldPlayers / totalPlayers) * 100).toFixed(1) : 0}% of total</p>
                    </div>
                    
                    <div className="p-6 bg-blue-50 rounded-2xl border-2 border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">Pending</p>
                        <Clock size={20} className="text-blue-600" />
                      </div>
                      <p className="text-5xl font-black text-blue-600 mb-1">{pendingPlayers}</p>
                      <p className="text-xs text-slate-500">{totalPlayers > 0 ? ((pendingPlayers / totalPlayers) * 100).toFixed(1) : 0}% of total</p>
                    </div>
                    
                    <div className="p-6 bg-red-50 rounded-2xl border-2 border-red-200">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">Unsold</p>
                        <XCircle size={20} className="text-red-600" />
                      </div>
                      <p className="text-5xl font-black text-red-600 mb-1">{unsoldPlayers}</p>
                      <p className="text-xs text-slate-500">{totalPlayers > 0 ? ((unsoldPlayers / totalPlayers) * 100).toFixed(1) : 0}% of total</p>
                    </div>
                  </div>
                </div>

                {/* Top Spenders */}
                <div className="bg-white/90 backdrop-blur-xl border-2 border-orange-200 rounded-3xl p-6 shadow-xl">
                  <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                    <TrendingUp size={24} className="text-orange-600" />
                    Top Spending Teams
                  </h3>
                  <div className="space-y-4">
                    {teams
                      .map(team => {
                        const initialBudget = team.budget || team.initialBudget || 0;
                        const remaining = team.remainingBudget !== undefined ? team.remainingBudget : initialBudget;
                        const spent = initialBudget - remaining;
                        return { ...team, spent, initialBudget, remaining };
                      })
                      .sort((a, b) => b.spent - a.spent)
                      .slice(0, 5)
                      .map((team, index) => (
                        <div key={team.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl border border-orange-200">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-white ${
                              index === 0 ? 'bg-yellow-500' :
                              index === 1 ? 'bg-gray-400' :
                              index === 2 ? 'bg-orange-600' :
                              'bg-slate-400'
                            }`}>
                              {index + 1}
                            </div>
                            {team.logo ? (
                              <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-orange-300">
                                <img src={team.logo} alt={team.name} className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-black text-xl border-2 border-orange-300">
                                {team.name?.charAt(0) || 'T'}
                              </div>
                            )}
                            <div>
                              <h4 className="text-lg font-black text-slate-800">{team.name}</h4>
                              <p className="text-xs text-slate-500">{team.squadSize || 0} players</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-black text-orange-600">₹{(team.spent / 1000000).toFixed(1)}M</p>
                            <p className="text-xs text-slate-500">₹{(team.remaining / 1000000).toFixed(1)}M left</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {/* 8️⃣ REPORTS */}
            {activeSection === 'reports' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex items-center justify-between gap-4 mb-6 bg-gradient-to-br from-slate-50 to-white py-4 border-b-2 border-blue-200">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                    <input
                      type="text"
                      placeholder="Search by team or player name..."
                      value={reportSearchQuery}
                      onChange={(e) => setReportSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-blue-200 focus:border-blue-500 focus:outline-none bg-white text-slate-800 font-semibold placeholder:text-slate-400 transition-all"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const csvContent = generateReportCSV();
                      const element = document.createElement('a');
                      element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent));
                      element.setAttribute('download', `auction_report_${currentMatch?.name || 'report'}.csv`);
                      element.style.display = 'none';
                      document.body.appendChild(element);
                      element.click();
                      document.body.removeChild(element);
                    }}
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold transition-all flex items-center gap-2 shadow-lg whitespace-nowrap"
                  >
                    <Download size={20} />
                    Export CSV
                  </button>
                </div>

                <div className="bg-white/90 backdrop-blur-xl border-2 border-blue-200 rounded-3xl overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-blue-100 to-purple-100 sticky top-0 z-10">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-black text-slate-800 uppercase tracking-wider">Team</th>
                          <th className="px-6 py-4 text-left text-xs font-black text-slate-800 uppercase tracking-wider">Player</th>
                          <th className="px-6 py-4 text-left text-xs font-black text-slate-800 uppercase tracking-wider">Base Price</th>
                          <th className="px-6 py-4 text-left text-xs font-black text-slate-800 uppercase tracking-wider">Sold Price</th>
                          <th className="px-6 py-4 text-left text-xs font-black text-slate-800 uppercase tracking-wider">Profit/Loss</th>
                          <th className="px-6 py-4 text-center text-xs font-black text-slate-800 uppercase tracking-wider">Bidding History</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {teams.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                              No teams available for report
                            </td>
                          </tr>
                        ) : (
                          teams
                            .filter(team => {
                              const teamMatch = team.name?.toLowerCase().includes(reportSearchQuery.toLowerCase());
                              const teamPlayers = players.filter(p => p.soldTo === team.id);
                              const playerMatch = teamPlayers.some(p => p.name?.toLowerCase().includes(reportSearchQuery.toLowerCase()));
                              return reportSearchQuery === '' || teamMatch || playerMatch;
                            })
                            .flatMap(team => {
                            const teamPlayers = players.filter(p => p.soldTo === team.id).filter(p => 
                              reportSearchQuery === '' || p.name?.toLowerCase().includes(reportSearchQuery.toLowerCase())
                            );
                            if (teamPlayers.length === 0) {
                              return (
                                <tr key={team.id} className="hover:bg-blue-50 transition-colors">
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold overflow-hidden">
                                        {team.logo ? (
                                          <img src={team.logo} alt={team.name} className="w-full h-full object-cover" />
                                        ) : (
                                          team.name?.charAt(0) || 'T'
                                        )}
                                      </div>
                                      <div>
                                        <p className="font-bold text-slate-800">{team.name}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-slate-500">
                                    No players assigned
                                  </td>
                                </tr>
                              );
                            }
                            return teamPlayers.map((player, idx) => {
                              const difference = (player.soldAmount || 0) - player.basePrice;
                              const isExpanded = expandedPlayers.has(player.id);
                              
                              return (
                                <React.Fragment key={player.id}>
                                  <tr className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-100 transition-colors`}>
                                    <td className="px-6 py-4">
                                      {idx === 0 && (
                                        <div className="flex items-center gap-3">
                                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold overflow-hidden">
                                            {team.logo ? (
                                              <img src={team.logo} alt={team.name} className="w-full h-full object-cover" />
                                            ) : (
                                              team.name?.charAt(0) || 'T'
                                            )}
                                          </div>
                                          <p className="font-bold text-slate-800">{team.name}</p>
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-6 py-4">
                                      <p className="font-semibold text-slate-800">{player.name}</p>
                                      <p className="text-xs text-slate-500">{player.email || 'N/A'}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                      <span className="font-semibold text-slate-700">₹{((player.basePrice || 0) / 100000).toFixed(1)}L</span>
                                    </td>
                                    <td className="px-6 py-4">
                                      <span className="font-bold text-green-600">₹{((player.soldAmount || 0) / 100000).toFixed(1)}L</span>
                                    </td>
                                    <td className="px-6 py-4">
                                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                                        difference > 0 ? 'bg-green-100 text-green-700' : 
                                        difference < 0 ? 'bg-red-100 text-red-700' : 
                                        'bg-gray-100 text-gray-700'
                                      }`}>
                                        {difference > 0 ? <TrendingUp size={12} /> : difference < 0 ? <TrendingDown size={12} /> : null}
                                        ₹{(Math.abs(difference) / 100000).toFixed(1)}L
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                      <button
                                        onClick={() => {
                                          const newExpanded = new Set(expandedPlayers);
                                          if (isExpanded) {
                                            newExpanded.delete(player.id);
                                          } else {
                                            newExpanded.add(player.id);
                                            if (!biddingHistory[player.id]) {
                                              fetchBiddingHistory(player.id);
                                            }
                                          }
                                          setExpandedPlayers(newExpanded);
                                        }}
                                        className="px-3 py-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-600 font-bold text-xs transition-all inline-flex items-center gap-1"
                                      >
                                        {isExpanded ? '▼' : '▶'} View
                                      </button>
                                    </td>
                                  </tr>
                                  {isExpanded && (
                                    <tr className={`${idx % 2 === 0 ? 'bg-blue-50' : 'bg-blue-100'}`}>
                                      <td colSpan={6} className="px-6 py-4">
                                        <div className="bg-white rounded-xl border-2 border-blue-200 p-4">
                                          <h4 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider">Bidding History</h4>
                                          {reportLoading && biddingHistory[player.id] === undefined ? (
                                            <div className="text-center py-4">
                                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                                              <p className="text-xs text-slate-500 mt-2">Loading history...</p>
                                            </div>
                                          ) : biddingHistory[player.id]?.length === 0 ? (
                                            <p className="text-sm text-slate-500">No bidding history found</p>
                                          ) : (
                                            <div className="space-y-2">
                                              {biddingHistory[player.id]?.map((bid, bidIdx) => (
                                                <div key={bidIdx} className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-l-4 border-blue-500">
                                                  <div className="flex-1">
                                                    <p className="font-bold text-slate-800 text-sm">Bid #{bidIdx + 1}</p>
                                                    <p className="text-xs text-slate-600">{bid.teamName || bid.teamId || 'Unknown Team'}</p>
                                                  </div>
                                                  <div className="text-right">
                                                    <p className="font-black text-lg text-purple-600">₹{(bid.amount / 100000).toFixed(1)}L</p>
                                                    <p className="text-xs text-slate-500">{new Date(bid.timestamp).toLocaleTimeString()}</p>
                                                  </div>
                                                </div>
                                              ))}
                                              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-l-4 border-green-500 mt-3">
                                                <div>
                                                  <p className="font-bold text-slate-800 text-sm">SOLD ✓</p>
                                                  <p className="text-xs text-slate-600">Final Sale</p>
                                                </div>
                                                <div className="text-right">
                                                  <p className="font-black text-lg text-green-600">₹{((player.soldAmount || 0) / 100000).toFixed(1)}L</p>
                                                  <p className="text-xs text-slate-500">{player.soldAt ? new Date(player.soldAt).toLocaleTimeString() : 'N/A'}</p>
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            });
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* CONFIRMATION MODAL */}
      {showConfirmation && confirmAction && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in duration-200">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <AlertTriangle size={24} className="text-yellow-600" />
              </div>
              <h3 className="text-2xl font-black text-slate-800">Confirm Action</h3>
            </div>
            
            <p className="text-slate-600 font-semibold mb-8 leading-relaxed">
              {confirmAction.message}
            </p>
            
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowConfirmation(false);
                  setConfirmAction(null);
                }}
                className="flex-1 px-6 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm transition-all"
              >
                Cancel
              </button>
              <button
                onClick={executeConfirmedAction}
                className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white font-bold text-sm shadow-lg transition-all"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};