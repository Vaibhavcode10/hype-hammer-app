import React, { useState, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, User, Settings as SettingsIcon, Trophy, Database, 
  Users, Shield, Mail, Save, RotateCcw, Download, Upload, Trash2, CheckCircle2,
  Plus, Building2, MapPin, ExternalLink,
  Clock, Activity, Globe, Gavel, Calendar, Loader2, AlertTriangle, Edit3, X
} from 'lucide-react';
import { AuctionStatus, AuctionConfig, Player, Team, SportType, AuctionType, MatchData, UserRole, LiveAuctionStatus } from '../../types';
import { BackupRestoreSection } from '../ui/BackupRestoreSection';

const API_BASE = 'https://us-central1-axilam.cloudfunctions.net/auction';

interface SettingsLayoutPageProps {
  config: AuctionConfig;
  setConfig: (config: AuctionConfig) => void;
  players: Player[];
  setPlayers: (players: Player[]) => void;
  teams: Team[];
  setTeams: (teams: Team[]) => void;
  currentUser: {
    name: string;
    email: string;
    avatar?: string;
    role?: UserRole;
  };
  setCurrentUser: (user: { name: string; email: string; avatar?: string; role?: UserRole }) => void;
  setStatus: (status: AuctionStatus) => void;
  currentMatch: MatchData | null;
  auctionStatus?: LiveAuctionStatus | string;
}

// Helper to format timestamps
const formatDate = (value?: string | number | null): string => {
  if (!value) return '—';
  try {
    const d = new Date(typeof value === 'number' ? value : value);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  } catch {
    return '—';
  }
};

const statusColors: Record<string, string> = {
  SETUP: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  ONGOING: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  COMPLETED: 'bg-green-500/20 text-green-300 border-green-500/30',
};

export const SettingsLayoutPage: React.FC<SettingsLayoutPageProps> = ({ 
  config, 
  setConfig, 
  players, 
  setPlayers, 
  teams, 
  setTeams,
  currentUser,
  setCurrentUser,
  setStatus,
  currentMatch,
  auctionStatus
}) => {
  // ─── Debug logging ───
  useEffect(() => {
    console.log('⚙️ [SettingsLayoutPage] Component MOUNTED');
    console.log('⚙️ [SettingsLayoutPage] currentMatch:', currentMatch);
    console.log('⚙️ [SettingsLayoutPage] currentUser:', currentUser);
    return () => console.log('⚙️ [SettingsLayoutPage] Component UNMOUNTED');
  }, []);

  useEffect(() => {
    console.log('⚙️ [SettingsLayoutPage] currentMatch UPDATED:', currentMatch);
  }, [currentMatch]);

  // Build initial config from currentMatch data (top-level + nested config), falling back to INITIAL_CONFIG prop
  const buildConfigFromMatch = (matchData: MatchData | null | undefined, fallback: AuctionConfig): AuctionConfig => {
    if (!matchData) return { ...fallback, squadSize: fallback?.squadSize || { min: 5, max: 15 }, roles: fallback?.roles || [], rules: fallback?.rules || {} };
    const mc = matchData.config;
    return {
      sport: (mc?.sport || (matchData as any).sportType || fallback.sport) as SportType,
      type: mc?.type || fallback.type,
      level: mc?.level || fallback.level,
      totalBudget: (matchData as any).baseBudgetPerTeam || mc?.totalBudget || fallback.totalBudget,
      squadSize: {
        min: mc?.squadSize?.min ?? fallback?.squadSize?.min ?? 11,
        max: (matchData as any).maxPlayersPerTeam || mc?.squadSize?.max || fallback?.squadSize?.max || 15,
      },
      roles: mc?.roles || fallback?.roles || [],
      rules: mc?.rules || fallback?.rules || {},
    };
  };

  const [localConfig, setLocalConfig] = useState<AuctionConfig>(() => buildConfigFromMatch(currentMatch, config));
  const [saveNotification, setSaveNotification] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Re-sync localConfig when currentMatch data arrives/changes
  useEffect(() => {
    if (currentMatch?.id) {
      setLocalConfig(buildConfigFromMatch(currentMatch, config));
    }
  }, [currentMatch?.id, currentMatch?.baseBudgetPerTeam, currentMatch?.maxPlayersPerTeam]);

  // ─── Editable fields state ───
  const m = currentMatch;
  const [editOrgName, setEditOrgName] = useState(m?.organizerName || currentUser.name);
  const [editOrgEmail, setEditOrgEmail] = useState(m?.organizerEmail || currentUser.email);
  const [editOrganizationName, setEditOrganizationName] = useState(m?.organizationName || '');
  const [editOrganizationType, setEditOrganizationType] = useState(m?.organizationType || '');
  const [editPlace, setEditPlace] = useState(m?.place || m?.venueLocation || '');
  const [editMatchName, setEditMatchName] = useState(m?.name || '');
  const [isEditing, setIsEditing] = useState(false);

  // Sync editable fields when currentMatch changes
  useEffect(() => {
    if (m) {
      setEditOrgName(m.organizerName || currentUser.name);
      setEditOrgEmail(m.organizerEmail || currentUser.email);
      setEditOrganizationName(m.organizationName || '');
      setEditOrganizationType(m.organizationType || '');
      setEditPlace(m.place || m.venueLocation || '');
      setEditMatchName(m.name || '');
    }
  }, [m?.id]);

  // ─── Firebase PATCH save ───
  const handleSaveToFirebase = useCallback(async () => {
    if (!m?.id) {
      setSaveError('No match ID found — cannot save');
      return;
    }
    setIsSaving(true);
    setSaveError(null);

    const payload: Record<string, any> = {};

    // Organization / profile fields
    if (editOrgName !== (m.organizerName || '')) payload.organizerName = editOrgName;
    if (editOrgEmail !== (m.organizerEmail || '')) payload.organizerEmail = editOrgEmail;
    if (editOrganizationName !== (m.organizationName || '')) payload.organizationName = editOrganizationName;
    if (editOrganizationType !== (m.organizationType || '')) payload.organizationType = editOrganizationType;
    if (editPlace !== (m.place || m.venueLocation || '')) payload.place = editPlace;
    if (editMatchName !== (m.name || '')) payload.name = editMatchName;

    // Auction config fields — always send the full config block so partial keys don't clobber
    const configPayload: Record<string, any> = {};
    if (localConfig.sport !== (m.config?.sport || config.sport)) configPayload.sport = localConfig.sport;
    if (localConfig.type !== (m.config?.type || config.type)) configPayload.type = localConfig.type;
    if (localConfig.totalBudget !== (m.config?.totalBudget ?? config.totalBudget ?? 0)) configPayload.totalBudget = Number(localConfig.totalBudget);
    if ((localConfig.squadSize?.min) !== (m.config?.squadSize?.min ?? config.squadSize?.min ?? 5)) {
      configPayload.squadSize = { ...(m.config?.squadSize || config.squadSize || { min: 5, max: 15 }), min: Number(localConfig.squadSize?.min ?? 5) };
    }
    if ((localConfig.squadSize?.max) !== (m.config?.squadSize?.max ?? config.squadSize?.max ?? 15)) {
      configPayload.squadSize = { ...(configPayload.squadSize || m.config?.squadSize || config.squadSize || { min: 5, max: 15 }), max: Number(localConfig.squadSize?.max ?? 15) };
    }
    if (JSON.stringify(localConfig.roles) !== JSON.stringify(m.config?.roles || config.roles || [])) configPayload.roles = localConfig.roles;

    if (Object.keys(configPayload).length > 0) {
      payload.config = { ...(m.config || config), ...configPayload };
    }

    // Also sync top-level fields so both readers (top-level and config) stay consistent
    payload.baseBudgetPerTeam = Number(localConfig.totalBudget);
    payload.maxPlayersPerTeam = Number(localConfig.squadSize?.max ?? 15);
    payload.maxTeams = (m as any).maxTeams || payload.config?.maxTeams || undefined;

    if (Object.keys(payload).length === 0) {
      setSaveNotification('No changes to save');
      setIsSaving(false);
      setTimeout(() => setSaveNotification(null), 2500);
      return;
    }

    console.log('⚙️ [SettingsLayoutPage] Saving PATCH to Firebase:', payload);

    try {
      const res = await fetch(`${API_BASE}/matches/${m.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errText}`);
      }

      // Also update local config state so parent App picks up changes
      if (payload.config) {
        setConfig({ ...config, ...payload.config });
      }

      setIsEditing(false);
      setSaveNotification('✅ Settings saved to Firebase!');
      console.log('⚙️ [SettingsLayoutPage] Save SUCCESS');
      setTimeout(() => setSaveNotification(null), 3000);
    } catch (err: any) {
      console.error('⚙️ [SettingsLayoutPage] Save FAILED:', err);
      setSaveError(err.message || 'Save failed');
      setTimeout(() => setSaveError(null), 5000);
    } finally {
      setIsSaving(false);
    }
  }, [m, editOrgName, editOrgEmail, editOrganizationName, editOrganizationType, editPlace, editMatchName, localConfig, config, setConfig]);

  const handleSave = () => {
    handleSaveToFirebase();
  };

  const handleReset = () => {
    setLocalConfig(buildConfigFromMatch(currentMatch, config));
    if (m) {
      setEditOrgName(m.organizerName || currentUser.name);
      setEditOrgEmail(m.organizerEmail || currentUser.email);
      setEditOrganizationName(m.organizationName || '');
      setEditOrganizationType(m.organizationType || '');
      setEditPlace(m.place || m.venueLocation || '');
      setEditMatchName(m.name || '');
    }
    setIsEditing(false);
    setSaveNotification('Settings reset to last saved state');
    setTimeout(() => setSaveNotification(null), 3000);
  };

  const handleExportData = () => {
    const exportData = {
      config: localConfig,
      players,
      teams,
      exportDate: new Date().toISOString()
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `hypehammer_settings_${new Date().toISOString()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    setSaveNotification('Data exported successfully!');
    setTimeout(() => setSaveNotification(null), 3000);
  };

  const handleImportData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event: any) => {
        try {
          const importedData = JSON.parse(event.target.result);
          if (importedData.config) setLocalConfig(importedData.config);
          if (importedData.players) setPlayers(importedData.players);
          if (importedData.teams) setTeams(importedData.teams);
          setSaveNotification('Data imported successfully!');
          setTimeout(() => setSaveNotification(null), 3000);
        } catch (error) {
          setSaveNotification('Error importing data. Please check the file format.');
          setTimeout(() => setSaveNotification(null), 3000);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleClearAllData = () => {
    if (window.confirm('Are you sure you want to clear all players and teams? This action cannot be undone.')) {
      setPlayers([]);
      setTeams([]);
      setSaveNotification('All data cleared!');
      setTimeout(() => setSaveNotification(null), 3000);
    }
  };

  const addRole = () => {
    const roleName = prompt('Enter new role name:');
    if (roleName && roleName.trim()) {
      setLocalConfig({
        ...localConfig,
        roles: [...(localConfig.roles || []), { id: Math.random().toString(36).substr(2, 9), name: roleName.trim() }]
      });
    }
  };

  const removeRole = (roleId: string) => {
    const currentRoles = localConfig.roles || [];
    if (currentRoles.length <= 1) {
      alert('Cannot remove the last role. At least one role is required.');
      return;
    }
    setLocalConfig({
      ...localConfig,
      roles: currentRoles.filter(r => r.id !== roleId)
    });
  };

  // Derive read-only data from currentMatch
  const profilePhoto = m?.profilePhotoURL || currentUser.avatar;
  const adminEmail = m?.adminEmail || currentUser.email;
  const organizerName = editOrgName;
  const organizationName = editOrganizationName || '—';
  const organizationType = editOrganizationType || '—';
  const sport = localConfig.sport || m?.config?.sport || config.sport;
  const auctionType = localConfig.type || m?.config?.type || config.type;
  const level = m?.config?.level || config.level;
  const totalBudget = localConfig.totalBudget ?? m?.config?.totalBudget ?? config.totalBudget ?? 0;
  const squadMax = localConfig.squadSize?.max ?? m?.config?.squadSize?.max ?? m?.config?.maxSquad ?? config.squadSize?.max ?? config.maxSquad ?? 15;
  const organizerEmail = editOrgEmail;
  const place = editPlace || '—';
  const govIdURL = m?.governmentIdURL;
  const proofURL = m?.organizerProofURL;
  const matchStatus = m?.status || 'SETUP';
  const createdAt = m?.createdAt;
  const updatedAt = m?.updatedAt;
  const matchDate = m?.matchDate;
  const statusUpdatedAt = m?.statusUpdatedAt;
  const statusUpdatedBy = m?.statusUpdatedBy;
  const roles = localConfig.roles || m?.config?.roles || config.roles || [];
  const rules = m?.config?.rules || config.rules || {};
  const configLevel = m?.config?.level || config.level || 'ADVANCED';

  // Info row helper - DARK THEME
  const InfoRow = ({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) => (
    <div className="flex items-start gap-3 py-2.5 border-b border-pink-500/10 last:border-0">
      <div className="mt-0.5 text-pink-400">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black uppercase text-pink-400/60 tracking-wider mb-0.5">{label}</p>
        <p className={`text-sm font-semibold text-pink-100 truncate ${mono ? 'font-mono text-xs' : ''}`}>{value || '—'}</p>
      </div>
    </div>
  );

  // Document button helper - DARK THEME
  const DocButton = ({ url, label }: { url?: string; label: string }) => {
    if (!url) return <span className="text-xs text-pink-400/40 italic">Not uploaded</span>;
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-pink-500/10 border border-pink-500/30 rounded-lg text-xs font-bold text-pink-400 hover:bg-pink-500/20 transition-all"
      >
        <ExternalLink size={12} />
        {label}
      </a>
    );
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0a0118 0%, #1a0a2e 50%, #16213e 100%)' }}>
      {/* Inline Styles for HUD Cards */}
      <style>{`
        .hud-card {
          background: linear-gradient(135deg, rgba(255, 20, 100, 0.06) 0%, rgba(139, 0, 50, 0.1) 100%);
          backdrop-filter: blur(28px) saturate(1.4);
          border: 1px solid rgba(255, 0, 102, 0.15);
          box-shadow: 0 8px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 0 60px rgba(255, 0, 102, 0.04);
          transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .hud-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5), 0 0 40px rgba(255, 0, 102, 0.15);
          border-color: rgba(255, 0, 102, 0.4);
        }
        .mission-widget {
          background: linear-gradient(135deg, rgba(255, 20, 100, 0.08) 0%, rgba(139, 0, 50, 0.12) 100%);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 0, 102, 0.2);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }
      `}</style>

      {/* ═══ DEBUG BANNER ═══ */}
      <div className="bg-gradient-to-r from-green-500/80 via-emerald-500/80 to-teal-500/80 text-white text-center py-1.5 text-[10px] font-black uppercase tracking-[0.3em] border-b border-green-400/30">
        NEW SETTINGS UI ACTIVE — SettingsLayoutPage.tsx — Match: {m?.id || 'NO MATCH'}
      </div>

      {/* Notification */}
      {saveNotification && (
        <div className="fixed top-4 right-4 z-[200] bg-gradient-to-r from-pink-500 to-orange-500 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 neon-pulse">
          <CheckCircle2 size={16} />
          <span className="font-bold text-xs uppercase tracking-wider">{saveNotification}</span>
        </div>
      )}

      {/* Save Error */}
      {saveError && (
        <div className="fixed top-4 right-4 z-[200] bg-gradient-to-r from-red-500 to-rose-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2">
          <AlertTriangle size={16} />
          <span className="font-bold text-xs uppercase tracking-wider">{saveError}</span>
        </div>
      )}

      {/* Top Bar - DARK THEME */}
      <div className="sticky top-0 z-50" style={{ background: 'rgba(10, 1, 24, 0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255, 0, 102, 0.15)' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setStatus(AuctionStatus.ADMIN_DASHBOARD)}
              className="p-2 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 hover:text-pink-300 transition-all border border-pink-500/20"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-red-400 to-orange-400 uppercase tracking-wide">Admin Settings</h1>
              <p className="text-[10px] text-pink-400/60 font-medium">{m?.name || 'Match Settings'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleReset}
              className="px-4 py-2 hud-card rounded-xl text-pink-300/70 hover:text-pink-300 transition-all text-xs font-bold uppercase tracking-wider flex items-center gap-2"
            >
              <RotateCcw size={12} />
              Reset
            </button>
            {!isEditing ? (
              <button 
                onClick={() => setIsEditing(true)}
                className="px-5 py-2 bg-gradient-to-r from-pink-600 to-red-600 rounded-xl text-white hover:brightness-110 transition-all text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg"
              >
                <Edit3 size={12} />
                Edit
              </button>
            ) : (
              <>
                <button 
                  onClick={() => { setIsEditing(false); handleReset(); }}
                  className="px-4 py-2 hud-card rounded-xl text-pink-300/70 hover:text-pink-300 transition-all text-xs font-bold uppercase tracking-wider flex items-center gap-2"
                >
                  <X size={12} />
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-5 py-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl text-white hover:brightness-110 transition-all text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg disabled:opacity-60 neon-pulse"
                >
                  {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  {isSaving ? 'Saving...' : 'Save to Firebase'}
                </button>
              </>
            )}
            {/* Profile avatar in topbar - DARK THEME */}
            <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-pink-400 flex items-center justify-center bg-gradient-to-br from-pink-400 to-orange-400 shadow-lg">
              {profilePhoto ? (
                <img src={profilePhoto} alt={organizerName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-black text-sm">{organizerName?.[0] || 'A'}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid - DARK THEME */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-12 gap-5">

          {/* ═══════════ ROW 1 ═══════════ */}

          {/* Personal Info Card (Top-Left) — spans 4 cols - DARK THEME */}
          <div className="col-span-12 lg:col-span-4">
            <div className="hud-card rounded-2xl overflow-hidden h-full">
              {/* Profile header band - DARK THEME */}
              <div className="bg-gradient-to-r from-pink-600/80 via-red-600/80 to-orange-600/80 px-5 pt-5 pb-10 relative">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23fff\' fill-opacity=\'0.3\'%3E%3Cpath d=\'M0 40L40 0H20L0 20M40 40V20L20 40\'/%3E%3C/g%3E%3C/svg%3E")' }} />
                <p className="text-[10px] font-bold text-white/80 uppercase tracking-[0.2em]">Admin Profile</p>
              </div>
              <div className="px-5 pb-5 -mt-8 relative">
                {/* Profile photo - DARK THEME */}
                <div className="w-16 h-16 rounded-2xl overflow-hidden border-[3px] border-pink-400/50 shadow-lg bg-gradient-to-br from-pink-400 to-orange-400 flex items-center justify-center mb-3">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt={organizerName} className="w-full h-full object-cover" />
                  ) : (
                    <User size={28} className="text-white" />
                  )}
                </div>
                <h3 className="text-base font-black text-pink-100 mb-0.5">{organizerName}</h3>
                <p className="text-xs text-pink-400/60 mb-3">{adminEmail}</p>
                
                <div className="space-y-0">
                  <InfoRow icon={<Building2 size={14} />} label="Organization" value={organizationName} />
                  <InfoRow icon={<Globe size={14} />} label="Organization Type" value={organizationType} />
                  <InfoRow icon={<Trophy size={14} />} label="Sport" value={sport} />
                  <InfoRow icon={<Gavel size={14} />} label="Auction Type" value={auctionType} />
                  <InfoRow icon={<Activity size={14} />} label="Level" value={level} />
                </div>
              </div>
            </div>
          </div>

          {/* Auction Configuration Card — spans 4 cols - DARK THEME */}
          <div className="col-span-12 lg:col-span-4">
            <div className="hud-card rounded-2xl p-5 h-full">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                  <SettingsIcon size={16} className="text-emerald-400" />
                </div>
                <h3 className="text-sm font-black text-pink-300 uppercase tracking-wide">Auction Configuration</h3>
              </div>

              <div className="space-y-4">
                {/* Total Budget - DARK THEME */}
                <div>
                  <label className="text-[10px] font-black uppercase text-pink-400/60 tracking-wider">Total Budget per Team</label>
                  {isEditing ? (
                    <input type="number" className="mt-1 w-full bg-pink-900/20 border border-pink-500/30 rounded-xl px-3 py-2.5 text-2xl font-black text-emerald-400 outline-none focus:border-pink-500 transition-all"
                      value={localConfig.totalBudget}
                      onChange={(e) => setLocalConfig({...localConfig, totalBudget: Number(e.target.value)})} />
                  ) : (
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-2xl font-black text-emerald-400">₹{totalBudget.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {/* Squad Size - MAX ONLY (NO MIN) - DARK THEME */}
                <div className="bg-pink-900/20 border border-pink-500/20 rounded-xl p-3 text-center">
                  <p className="text-[9px] font-bold uppercase text-pink-400/60 tracking-wider mb-1">Max Squad</p>
                  {isEditing ? (
                    <input type="number" className="w-full bg-pink-900/30 border border-pink-500/30 rounded-lg px-2 py-1 text-xl font-black text-blue-400 text-center outline-none focus:border-pink-500"
                      value={localConfig.squadSize?.max || localConfig.maxSquad}
                      onChange={(e) => setLocalConfig({...localConfig, squadSize: {...(localConfig.squadSize || {}), max: Number(e.target.value)}, maxSquad: Number(e.target.value)})} />
                  ) : (
                    <p className="text-xl font-black text-blue-400">{squadMax}</p>
                  )}
                </div>

                {/* Auction Type & Sport */}
                <div className="space-y-0">
                  <InfoRow icon={<Gavel size={14} />} label="Auction Type" value={auctionType} />
                  <InfoRow icon={<Trophy size={14} />} label="Sport" value={sport} />
                </div>
              </div>
            </div>
          </div>

          {/* Organization Details Card — spans 4 cols - DARK THEME */}
          <div className="col-span-12 lg:col-span-4">
            <div className="hud-card rounded-2xl p-5 h-full">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                  <Building2 size={16} className="text-purple-400" />
                </div>
                <h3 className="text-sm font-black text-pink-300 uppercase tracking-wide">Organization Details</h3>
              </div>

              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-pink-400/60 tracking-wider block mb-1">Match / Season Name</label>
                    <input type="text" value={editMatchName} onChange={e => setEditMatchName(e.target.value)}
                      className="w-full bg-pink-900/20 border border-pink-500/30 rounded-xl px-3 py-2 text-sm text-pink-100 outline-none focus:border-pink-500 transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-pink-400/60 tracking-wider block mb-1">Organization Name</label>
                    <input type="text" value={editOrganizationName} onChange={e => setEditOrganizationName(e.target.value)}
                      className="w-full bg-pink-900/20 border border-pink-500/30 rounded-xl px-3 py-2 text-sm text-pink-100 outline-none focus:border-pink-500 transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-pink-400/60 tracking-wider block mb-1">Organization Type</label>
                    <select value={editOrganizationType} onChange={e => setEditOrganizationType(e.target.value)}
                      className="w-full bg-pink-900/20 border border-pink-500/30 rounded-xl px-3 py-2 text-sm text-pink-100 outline-none focus:border-pink-500 transition-all">
                      <option value="">Select</option>
                      <option value="Sports Club">Sports Club</option>
                      <option value="College">College</option>
                      <option value="Corporate">Corporate</option>
                      <option value="League">League</option>
                      <option value="Club">Club</option>
                      <option value="Private">Private</option>
                      <option value="Educational">Educational</option>
                      <option value="Government">Government</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-pink-400/60 tracking-wider block mb-1">Organizer Name</label>
                    <input type="text" value={editOrgName} onChange={e => setEditOrgName(e.target.value)}
                      className="w-full bg-pink-900/20 border border-pink-500/30 rounded-xl px-3 py-2 text-sm text-pink-100 outline-none focus:border-pink-500 transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-pink-400/60 tracking-wider block mb-1">Organizer Email</label>
                    <input type="email" value={editOrgEmail} onChange={e => setEditOrgEmail(e.target.value)}
                      className="w-full bg-pink-900/20 border border-pink-500/30 rounded-xl px-3 py-2 text-sm text-pink-100 outline-none focus:border-pink-500 transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-pink-400/60 tracking-wider block mb-1">Place</label>
                    <input type="text" value={editPlace} onChange={e => setEditPlace(e.target.value)}
                      className="w-full bg-pink-900/20 border border-pink-500/30 rounded-xl px-3 py-2 text-sm text-pink-100 outline-none focus:border-pink-500 transition-all" />
                  </div>
                </div>
              ) : (
                <div className="space-y-0">
                  {editMatchName && (
                    <InfoRow icon={<Trophy size={14} />} label="Match / Season Name" value={editMatchName} />
                  )}
                  <InfoRow icon={<Building2 size={14} />} label="Organization Name" value={organizationName} />
                  <InfoRow icon={<User size={14} />} label="Organizer Name" value={organizerName} />
                  <InfoRow icon={<Mail size={14} />} label="Organizer Email" value={organizerEmail} />
                  <InfoRow icon={<MapPin size={14} />} label="Place" value={place} />
                </div>
              )}

              {/* Document Links - DARK THEME */}
              <div className="mt-4 pt-3 border-t border-pink-500/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-pink-400/60 tracking-wider">Government ID</span>
                  <DocButton url={govIdURL} label="View / Download" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-pink-400/60 tracking-wider">Organizer Proof</span>
                  <DocButton url={proofURL} label="View / Download" />
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════ ROW 2 ═══════════ */}

          {/* System Status Card (Read-Only) — spans 6 cols - DARK THEME */}
          <div className="col-span-12 lg:col-span-6">
            <div className="hud-card rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
                  <Activity size={16} className="text-amber-400" />
                </div>
                <h3 className="text-sm font-black text-pink-300 uppercase tracking-wide">System Status</h3>
                <span className="ml-auto text-[9px] font-bold uppercase text-pink-400/40 bg-pink-500/10 px-2 py-1 rounded-md border border-pink-500/20">Read-only</span>
              </div>

              <div className="mb-4">
                <p className="text-[10px] font-black uppercase text-pink-400/60 tracking-wider mb-1">Current Status</p>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase ${
                  matchStatus === 'SETUP' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                  matchStatus === 'ONGOING' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' :
                  'bg-green-500/20 text-green-400 border border-green-500/40'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${matchStatus === 'ONGOING' ? 'bg-blue-400 animate-pulse' : matchStatus === 'COMPLETED' ? 'bg-green-400' : 'bg-amber-400'}`} />
                  {matchStatus}
                </span>
              </div>

              <div className="space-y-0">
                <InfoRow icon={<Clock size={14} />} label="Status Updated At" value={formatDate(statusUpdatedAt)} />
                <InfoRow icon={<User size={14} />} label="Status Updated By" value={statusUpdatedBy || '—'} mono />
                <InfoRow icon={<Calendar size={14} />} label="Created At" value={formatDate(createdAt)} />
                <InfoRow icon={<Clock size={14} />} label="Last Updated" value={formatDate(updatedAt)} />
                <InfoRow icon={<Calendar size={14} />} label="Match Date" value={formatDate(matchDate)} />
              </div>
            </div>
          </div>

          {/* Roles & Access Card (Read-Only) — spans 6 cols - DARK THEME */}
          <div className="col-span-12 lg:col-span-6">
            <div className="hud-card rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                  <Shield size={16} className="text-indigo-400" />
                </div>
                <h3 className="text-sm font-black text-pink-300 uppercase tracking-wide">Roles & Access</h3>
                <span className="ml-auto text-[9px] font-bold uppercase text-pink-400/40 bg-pink-500/10 px-2 py-1 rounded-md border border-pink-500/20">Read-only</span>
              </div>

              {/* Config Level - DARK THEME */}
              <div className="mb-4">
                <p className="text-[10px] font-black uppercase text-pink-400/60 tracking-wider mb-1">Config Level</p>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/20 border border-indigo-500/40 rounded-lg text-xs font-bold text-indigo-400 uppercase">{configLevel || '—'}</span>
              </div>

              {/* Roles - DARK THEME */}
              <div className="mb-4">
                <p className="text-[10px] font-black uppercase text-pink-400/60 tracking-wider mb-2">Player Roles ({roles.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {roles.map(role => (
                    <span key={role.id} className="px-2.5 py-1 bg-blue-500/20 border border-blue-500/40 rounded-lg text-xs font-bold text-blue-400">
                      {role.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Rules - DARK THEME */}
              <div>
                <p className="text-[10px] font-black uppercase text-pink-400/60 tracking-wider mb-2">Rules</p>
                <div className="bg-pink-900/20 border border-pink-500/20 rounded-xl p-3 space-y-1.5">
                  {rules.overseasLimit !== undefined && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-pink-300/70 font-medium">Overseas Limit</span>
                      <span className="font-bold text-pink-100">{rules.overseasLimit}</span>
                    </div>
                  )}
                  {rules.roleLimits && Object.entries(rules.roleLimits).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between text-xs">
                      <span className="text-pink-300/70 font-medium">{key}</span>
                      <span className="font-bold text-pink-100">Min: {(val as {min: number; max: number}).min} / Max: {(val as {min: number; max: number}).max}</span>
                    </div>
                  ))}
                  {!rules.overseasLimit && (!rules.roleLimits || Object.keys(rules.roleLimits).length === 0) && (
                    <p className="text-xs text-pink-400/40 italic">No custom rules configured</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════ ROW 3 — Data Management ═══════════ */}

          <div className="col-span-12">
            <div className="hud-card rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-slate-500/20 flex items-center justify-center border border-slate-500/30">
                  <Database size={16} className="text-slate-400" />
                </div>
                <h3 className="text-sm font-black text-pink-300 uppercase tracking-wide">Data Management</h3>
              </div>

              <div className="grid grid-cols-12 gap-4">
                {/* Stats - DARK THEME */}
                <div className="col-span-12 md:col-span-4 grid grid-cols-2 gap-3">
                  <div className="bg-blue-500/20 border border-blue-500/40 rounded-xl p-3 text-center">
                    <p className="text-[9px] font-bold uppercase text-blue-400/80 tracking-wider mb-1">Players</p>
                    <p className="text-2xl font-black text-blue-400">{players.length}</p>
                  </div>
                  <div className="bg-orange-500/20 border border-orange-500/40 rounded-xl p-3 text-center">
                    <p className="text-[9px] font-bold uppercase text-orange-400/80 tracking-wider mb-1">Teams</p>
                    <p className="text-2xl font-black text-orange-400">{teams.length}</p>
                  </div>
                </div>

                {/* Actions - DARK THEME */}
                <div className="col-span-12 md:col-span-8 flex flex-wrap gap-2 items-start">
                  <button 
                    onClick={handleExportData}
                    className="flex items-center gap-2 px-4 py-2.5 hud-card rounded-xl hover:bg-pink-500/10 transition-all text-xs font-bold text-pink-300/70 hover:text-pink-300"
                  >
                    <Download size={14} />
                    Export Data
                  </button>
                  <button 
                    onClick={handleImportData}
                    className="flex items-center gap-2 px-4 py-2.5 hud-card rounded-xl hover:bg-pink-500/10 transition-all text-xs font-bold text-pink-300/70 hover:text-pink-300"
                  >
                    <Upload size={14} />
                    Import Data
                  </button>
                  <button 
                    onClick={handleClearAllData}
                    className="flex items-center gap-2 px-4 py-2.5 bg-red-500/20 border border-red-500/40 rounded-xl hover:bg-red-500/30 hover:border-red-500/60 transition-all text-xs font-bold text-red-400"
                  >
                    <Trash2 size={14} />
                    Clear All Data
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════ ROW 4 — Match Config (Editable) ═══════════ */}

          <div className="col-span-12">
            <div className="mission-widget rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center border border-teal-500/30">
                  <Trophy size={16} className="text-teal-400" />
                </div>
                <h3 className="text-sm font-black text-pink-300 uppercase tracking-wide">Match Configuration</h3>
              </div>

              <div className="grid grid-cols-12 gap-4">
                {/* Sport Type - DARK THEME */}
                <div className="col-span-12 md:col-span-3">
                  <label className="text-[10px] font-black uppercase text-pink-400/60 tracking-wider block mb-1">Sport Type</label>
                  <select 
                    className="w-full bg-pink-900/20 border border-pink-500/30 rounded-xl px-3 py-2.5 text-sm text-pink-100 outline-none focus:border-pink-500 transition-all"
                    value={localConfig.sport}
                    onChange={(e) => setLocalConfig({...localConfig, sport: e.target.value as SportType})}
                  >
                    {Object.values(SportType).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Auction Type - DARK THEME */}
                <div className="col-span-12 md:col-span-3">
                  <label className="text-[10px] font-black uppercase text-pink-400/60 tracking-wider block mb-1">Auction Type</label>
                  <select 
                    className="w-full bg-pink-900/20 border border-pink-500/30 rounded-xl px-3 py-2.5 text-sm text-pink-100 outline-none focus:border-pink-500 transition-all"
                    value={localConfig.type}
                    onChange={(e) => setLocalConfig({...localConfig, type: e.target.value as AuctionType})}
                  >
                    {Object.values(AuctionType).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Total Budget - DARK THEME */}
                <div className="col-span-12 md:col-span-2">
                  <label className="text-[10px] font-black uppercase text-pink-400/60 tracking-wider block mb-1">Total Budget</label>
                  <input 
                    type="number"
                    className="w-full bg-pink-900/20 border border-pink-500/30 rounded-xl px-3 py-2.5 text-sm text-pink-100 outline-none focus:border-pink-500 transition-all"
                    value={localConfig.totalBudget}
                    onChange={(e) => setLocalConfig({...localConfig, totalBudget: Number(e.target.value)})}
                  />
                </div>

                {/* Squad Min - DARK THEME */}
                <div className="col-span-6 md:col-span-2">
                  <label className="text-[10px] font-black uppercase text-pink-400/60 tracking-wider block mb-1">Squad Min</label>
                  <input 
                    type="number"
                    className="w-full bg-pink-900/20 border border-pink-500/30 rounded-xl px-3 py-2.5 text-sm text-pink-100 outline-none focus:border-pink-500 transition-all"
                    value={localConfig.squadSize.min}
                    onChange={(e) => setLocalConfig({...localConfig, squadSize: {...localConfig.squadSize, min: Number(e.target.value)}})}
                  />
                </div>

                {/* Squad Max - DARK THEME */}
                <div className="col-span-6 md:col-span-2">
                  <label className="text-[10px] font-black uppercase text-pink-400/60 tracking-wider block mb-1">Squad Max</label>
                  <input 
                    type="number"
                    className="w-full bg-pink-900/20 border border-pink-500/30 rounded-xl px-3 py-2.5 text-sm text-pink-100 outline-none focus:border-pink-500 transition-all"
                    value={localConfig.squadSize.max}
                    onChange={(e) => setLocalConfig({...localConfig, squadSize: {...localConfig.squadSize, max: Number(e.target.value)}})}
                  />
                </div>
              </div>

              {/* Player Roles - DARK THEME */}
              <div className="mt-4 pt-4 border-t border-pink-500/10">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-black uppercase text-pink-400/60 tracking-wider">Player Roles</p>
                  <button 
                    onClick={addRole}
                    className="flex items-center gap-1 px-2.5 py-1 bg-blue-500/20 border border-blue-500/40 rounded-lg text-[10px] font-bold text-blue-400 hover:bg-blue-500/30 transition-all uppercase"
                  >
                    <Plus size={10} />
                    Add Role
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(localConfig.roles || []).map(role => (
                    <span key={role.id} className="group inline-flex items-center gap-1 px-2.5 py-1 bg-pink-500/10 border border-pink-500/30 rounded-lg text-xs font-bold text-pink-300">
                      {role.name}
                      <button 
                        onClick={() => removeRole(role.id)}
                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════ ROW 5 — Data Backup & Restore ═══════════ */}
          {currentMatch?.id && (
            <BackupRestoreSection
              currentMatch={currentMatch}
              currentUser={{
                name: currentUser.name,
                email: currentUser.email,
                role: currentUser.role || UserRole.ADMIN,
              }}
              auctionStatus={auctionStatus}
              onNotification={(message, type) => {
                if (type === 'error') {
                  setSaveError(message);
                  setTimeout(() => setSaveError(null), 5000);
                } else {
                  setSaveNotification(message);
                  setTimeout(() => setSaveNotification(null), 3000);
                }
              }}
            />
          )}

        </div>
      </div>
    </div>
  );
};
