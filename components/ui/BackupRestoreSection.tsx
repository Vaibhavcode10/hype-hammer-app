/**
 * BackupRestoreSection Component
 * Production-grade backup & restore system integrated into Settings page
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Archive,
  FileJson,
  HardDrive,
  Calendar,
  User,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  Eye,
  X,
  Shield,
  Zap,
} from 'lucide-react';

import {
  BackupMetadata,
  BackupType,
  AutoBackupConfig,
  RestorePreview,
  BackupPermissions,
  UserRole,
  AutoBackupInterval,
  MatchData,
  LiveAuctionStatus,
} from '../../types';

import {
  getBackups,
  createFullBackup,
  createQuickBackup,
  deleteBackup,
  downloadBackup,
  getBackupStatus,
  getAutoBackupConfig,
  updateAutoBackupConfig,
  previewRestore,
  validateBackup,
  restoreBackup,
  getBackupPermissions,
  formatFileSize,
  formatBackupDate,
  getBackupTypeLabel,
  getIntervalLabel,
} from '../../services/backupService';

interface BackupRestoreSectionProps {
  currentMatch?: MatchData | null;
  currentUser: {
    name: string;
    email: string;
    role?: UserRole;
  };
  auctionStatus?: LiveAuctionStatus | string;
  onNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const BackupRestoreSection: React.FC<BackupRestoreSectionProps> = ({
  currentMatch,
  currentUser,
  auctionStatus,
  onNotification,
}) => {
  
  // Extract matchId and matchName from currentMatch
  const matchId = currentMatch?.id || '';
  const matchName = currentMatch?.name || 'Unknown Match';
  // State
  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [backupInProgress, setBackupInProgress] = useState(false);
  const [autoBackupConfig, setAutoBackupConfig] = useState<AutoBackupConfig | null>(null);
  const [showAutoBackupSettings, setShowAutoBackupSettings] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupMetadata | null>(null);
  const [restorePreview, setRestorePreview] = useState<RestorePreview | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; error?: string } | null>(null);
  const [expandedBackup, setExpandedBackup] = useState<string | null>(null);

  // Get user role (default to ADMIN for backward compatibility)
  const userRole = currentUser.role || UserRole.ADMIN;
  const permissions = getBackupPermissions(userRole);
  
  // Check if auction is live (blocks restore)
  const isAuctionLive = auctionStatus === LiveAuctionStatus.LIVE || auctionStatus === 'LIVE';

  // Load backups
  const loadBackups = useCallback(async () => {
    if (!matchId) return;
    
    setIsLoading(true);
    try {
      const [backupList, status, autoConfig] = await Promise.all([
        getBackups(matchId),
        getBackupStatus(matchId),
        permissions.canScheduleAutoBackup ? getAutoBackupConfig(matchId) : Promise.resolve(null),
      ]);
      
      setBackups(backupList);
      setBackupInProgress(status.inProgress);
      if (autoConfig) {
        setAutoBackupConfig(autoConfig);
      }
    } catch (error) {
      console.error('Failed to load backups:', error);
      onNotification?.('Failed to load backups', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [matchId, permissions.canScheduleAutoBackup, onNotification]);

  useEffect(() => {
    loadBackups();
  }, [loadBackups]);

  // Polling for backup status while in progress
  useEffect(() => {
    if (!backupInProgress) return;

    const interval = setInterval(async () => {
      const status = await getBackupStatus(matchId);
      setBackupInProgress(status.inProgress);
      if (!status.inProgress) {
        loadBackups();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [backupInProgress, matchId, loadBackups]);

  // Create backup handlers
  const handleCreateFullBackup = async () => {
    if (!permissions.canCreateFullBackup || isCreatingBackup || backupInProgress) return;
    
    setIsCreatingBackup(true);
    try {
      const response = await createFullBackup(
        matchId,
        currentUser.name,
        currentUser.email,
        userRole
      );
      
      if (response.success) {
        onNotification?.('Full backup created successfully ✅', 'success');
        setBackupInProgress(true);
        loadBackups();
      } else {
        onNotification?.(response.error || 'Failed to create backup', 'error');
      }
    } catch (error) {
      console.error('Backup failed:', error);
      onNotification?.('Backup failed', 'error');
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleCreateQuickBackup = async () => {
    if (!permissions.canCreateQuickBackup || isCreatingBackup || backupInProgress) return;
    
    setIsCreatingBackup(true);
    try {
      const response = await createQuickBackup(
        matchId,
        currentUser.name,
        currentUser.email,
        userRole
      );
      
      if (response.success) {
        onNotification?.('Quick backup created successfully ✅', 'success');
        setBackupInProgress(true);
        loadBackups();
      } else {
        onNotification?.(response.error || 'Failed to create backup', 'error');
      }
    } catch (error) {
      console.error('Backup failed:', error);
      onNotification?.('Backup failed', 'error');
    } finally {
      setIsCreatingBackup(false);
    }
  };

  // Download handler
  const handleDownload = async (backup: BackupMetadata) => {
    try {
      await downloadBackup(backup);
      onNotification?.('Download started', 'success');
    } catch (error) {
      console.error('Download failed:', error);
      onNotification?.('Download failed', 'error');
    }
  };

  // Delete handler
  const handleDelete = async (backup: BackupMetadata) => {
    if (!permissions.canDeleteBackups) return;
    
    if (!window.confirm(`Are you sure you want to delete this backup?\n\n${backup.fileName}\n\nThis action cannot be undone.`)) {
      return;
    }
    
    try {
      const response = await deleteBackup(backup.id, userRole);
      if (response.success) {
        onNotification?.('Backup deleted', 'success');
        loadBackups();
      } else {
        onNotification?.(response.error || 'Failed to delete backup', 'error');
      }
    } catch (error) {
      console.error('Delete failed:', error);
      onNotification?.('Failed to delete backup', 'error');
    }
  };

  // Restore handlers
  const handleOpenRestore = async (backup: BackupMetadata) => {
    if (!permissions.canRestore) return;
    
    setSelectedBackup(backup);
    setShowRestoreModal(true);
    setIsValidating(true);
    setValidationResult(null);
    setRestorePreview(null);
    
    try {
      const [validation, preview] = await Promise.all([
        validateBackup(backup.id),
        previewRestore(backup.id),
      ]);
      
      setValidationResult(validation);
      setRestorePreview(preview);
    } catch (error) {
      console.error('Validation failed:', error);
      setValidationResult({ valid: false, error: 'Failed to validate backup' });
    } finally {
      setIsValidating(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedBackup || !permissions.canRestore || isAuctionLive) return;
    
    if (!window.confirm('Are you sure you want to restore from this backup?\n\nThis will overwrite current data. This action cannot be undone.')) {
      return;
    }
    
    setIsRestoring(true);
    try {
      const response = await restoreBackup(selectedBackup.id, matchId, userRole);
      
      if (response.success) {
        onNotification?.('Restore completed successfully ✅', 'success');
        setShowRestoreModal(false);
        setSelectedBackup(null);
        window.location.reload(); // Refresh to show restored data
      } else {
        onNotification?.(response.error || 'Restore failed', 'error');
      }
    } catch (error) {
      console.error('Restore failed:', error);
      onNotification?.('Restore failed', 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  // Auto backup handlers
  const handleToggleAutoBackup = async (enabled: boolean) => {
    if (!permissions.canScheduleAutoBackup || !autoBackupConfig) return;
    
    try {
      const response = await updateAutoBackupConfig(matchId, { enabled }, userRole);
      if (response.success && response.data) {
        setAutoBackupConfig(response.data);
        onNotification?.(enabled ? 'Auto backup enabled' : 'Auto backup disabled', 'success');
      }
    } catch (error) {
      console.error('Failed to update auto backup:', error);
      onNotification?.('Failed to update settings', 'error');
    }
  };

  const handleUpdateInterval = async (interval: AutoBackupInterval) => {
    if (!permissions.canScheduleAutoBackup) return;
    
    try {
      const response = await updateAutoBackupConfig(matchId, { interval, enabled: true }, userRole);
      if (response.success && response.data) {
        setAutoBackupConfig(response.data);
        onNotification?.(`Auto backup interval set to ${getIntervalLabel(interval)}`, 'success');
      }
    } catch (error) {
      console.error('Failed to update interval:', error);
      onNotification?.('Failed to update settings', 'error');
    }
  };

  // Status badge component
  const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const styles: Record<string, string> = {
      'completed': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      'in-progress': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'pending': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      'failed': 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    
    const icons: Record<string, React.ReactNode> = {
      'completed': <CheckCircle2 size={12} />,
      'in-progress': <Loader2 size={12} className="animate-spin" />,
      'pending': <Clock size={12} />,
      'failed': <AlertCircle size={12} />,
    };
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${styles[status] || styles.pending}`}>
        {icons[status] || icons.pending}
        {status}
      </span>
    );
  };

  // Type badge component
  const TypeBadge: React.FC<{ type: BackupType }> = ({ type }) => {
    const styles: Record<BackupType, string> = {
      'full': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'quick': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      'auto': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    };
    
    const icons: Record<BackupType, React.ReactNode> = {
      'full': <HardDrive size={12} />,
      'quick': <Zap size={12} />,
      'auto': <RefreshCw size={12} />,
    };
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${styles[type]}`}>
        {icons[type]}
        {getBackupTypeLabel(type)}
      </span>
    );
  };

  // Don't render if user doesn't have permissions or no match
  if (!permissions.canViewBackups || !matchId) {
    return null;
  }

  return (
    <div className="col-span-12">
      <div className="hud-card rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-pink-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/30 to-purple-500/30 flex items-center justify-center border border-pink-500/30">
                <Database size={20} className="text-pink-400" />
              </div>
              <div>
                <h3 className="text-lg font-black text-pink-100 uppercase tracking-wide">
                  Data Backup & Restore
                </h3>
                <p className="text-[10px] text-pink-400/60 uppercase tracking-wider mt-0.5">
                  {matchName} • {backups.length} backup{backups.length !== 1 ? 's' : ''} available
                </p>
              </div>
            </div>
            
            <button
              onClick={loadBackups}
              disabled={isLoading}
              className="p-2 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/20 transition-all"
            >
              <RefreshCw size={16} className={`text-pink-400 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Content - 2 Column Layout */}
        <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* LEFT COLUMN: Manual Backup */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-pink-300 uppercase tracking-wider flex items-center gap-2">
              <Archive size={12} />
              Manual Backup
            </h4>
            
            {/* Full Backup Button */}
            {permissions.canCreateFullBackup && (
              <button
                onClick={handleCreateFullBackup}
                disabled={isCreatingBackup || backupInProgress}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-gradient-to-r from-pink-600/30 to-purple-600/30 border border-pink-500/40 hover:border-pink-500/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {isCreatingBackup || backupInProgress ? (
                  <Loader2 size={16} className="text-pink-400 animate-spin" />
                ) : (
                  <HardDrive size={16} className="text-pink-400 group-hover:scale-110 transition-transform" />
                )}
                <div className="text-left">
                  <p className="text-xs font-bold text-pink-100 uppercase tracking-wide">
                    Create Full Backup
                  </p>
                  <p className="text-[8px] text-pink-400/60">
                    Database + Storage Files
                  </p>
                </div>
              </button>
            )}
            
            {/* Quick Backup Button */}
            {permissions.canCreateQuickBackup && (
              <button
                onClick={handleCreateQuickBackup}
                disabled={isCreatingBackup || backupInProgress}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-gradient-to-r from-cyan-600/30 to-blue-600/30 border border-cyan-500/40 hover:border-cyan-500/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {isCreatingBackup || backupInProgress ? (
                  <Loader2 size={16} className="text-cyan-400 animate-spin" />
                ) : (
                  <Zap size={16} className="text-cyan-400 group-hover:scale-110 transition-transform" />
                )}
                <div className="text-left">
                  <p className="text-xs font-bold text-cyan-100 uppercase tracking-wide">
                    Quick Backup
                  </p>
                  <p className="text-[8px] text-cyan-400/60">
                    JSON Only (Faster)
                  </p>
                </div>
              </button>
            )}
            
            {/* Backup in progress indicator */}
            {backupInProgress && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <Loader2 size={14} className="text-blue-400 animate-spin flex-shrink-0" />
                <span className="text-xs font-bold text-blue-300">
                  Creating backup...
                </span>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Auto Backup + Backup History */}
          <div className="space-y-3">
            {/* Auto Backup Section (Admin Only) */}
            {permissions.canScheduleAutoBackup && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-pink-300 uppercase tracking-wider flex items-center gap-2">
                    <RefreshCw size={12} />
                    Auto Backup
                  </h4>
                  <button
                    onClick={() => setShowAutoBackupSettings(!showAutoBackupSettings)}
                    className="text-pink-400/60 hover:text-pink-400 transition-colors"
                  >
                    {showAutoBackupSettings ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
                
                {showAutoBackupSettings && autoBackupConfig && (
                  <div className="p-3 rounded-lg bg-pink-900/10 border border-pink-500/20 space-y-3">
                    {/* Enable Toggle */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-pink-200">Enable Auto Backup</span>
                      <button
                        onClick={() => handleToggleAutoBackup(!autoBackupConfig.enabled)}
                        className={`relative w-10 h-5 rounded-full transition-colors ${
                          autoBackupConfig.enabled ? 'bg-pink-500' : 'bg-pink-900/50'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                            autoBackupConfig.enabled ? 'translate-x-5' : ''
                          }`}
                        />
                      </button>
                    </div>
                    
                    {/* Interval Selector */}
                    {autoBackupConfig.enabled && (
                      <div className="space-y-2">
                        <span className="text-[8px] font-bold text-pink-400/60 uppercase tracking-wider">
                          Interval
                        </span>
                        <div className="grid grid-cols-3 gap-1">
                          {(['hourly', 'six_hours', 'daily'] as AutoBackupInterval[]).map((interval) => (
                            <button
                              key={interval}
                              onClick={() => handleUpdateInterval(interval)}
                              className={`px-2 py-1 rounded text-[7px] font-bold uppercase transition-all ${
                                autoBackupConfig.interval === interval
                                  ? 'bg-pink-500/30 border-pink-500/50 text-pink-200'
                                  : 'bg-pink-900/20 border-pink-500/20 text-pink-400/60 hover:border-pink-500/40'
                              } border`}
                            >
                              {getIntervalLabel(interval)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Backup History (Mini) */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-pink-300 uppercase tracking-wider flex items-center gap-2">
                <Clock size={12} />
                Latest Backups
              </h4>

              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 size={18} className="text-pink-400 animate-spin" />
                </div>
              ) : backups.length === 0 ? (
                <div className="text-center py-6 text-pink-400/60">
                  <p className="text-xs">No backups available</p>
                </div>
              ) : (
                <div className="space-y-1 max-h-56 overflow-y-auto">
                  {backups.slice(0, 5).map((backup) => (
                    <div
                      key={backup.id}
                      className="p-2 rounded-lg bg-pink-900/10 border border-pink-500/20 cursor-pointer hover:border-pink-500/40 transition-all"
                      onClick={() => setExpandedBackup(expandedBackup === backup.id ? null : backup.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <TypeBadge type={backup.type} />
                            <StatusBadge status={backup.status} />
                          </div>
                          <p className="text-[8px] text-pink-300/60 mt-1 truncate">{backup.fileName}</p>
                          <p className="text-[7px] text-pink-400/40">{formatBackupDate(backup.createdAt)}</p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <p className="text-[8px] text-pink-400/60">{formatFileSize(backup.size)}</p>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {expandedBackup === backup.id && (
                        <div className="mt-2 pt-2 border-t border-pink-500/10 space-y-1 text-[7px] text-pink-400/60">
                          <p>Players: {backup.counts?.players || 0}</p>
                          <p>Teams: {backup.counts?.teams || 0}</p>
                          <p>By: {backup.createdBy}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Backup History Table (Full) - Below both columns */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-sm font-bold text-pink-300 uppercase tracking-wider flex items-center gap-2">
              <Clock size={14} />
              Backup History
            </h4>
            
            <h4 className="text-xs font-bold text-pink-300 uppercase tracking-wider flex items-center gap-2">
              <Clock size={12} />
              Complete Backup History
            </h4>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={16} className="text-pink-400 animate-spin" />
              </div>
            ) : backups.length === 0 ? (
              <div className="text-center py-6 text-pink-400/60">
                <p className="text-xs">No backups yet</p>
              </div>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {backups.map((backup) => (
                  <div
                    key={backup.id}
                    className="p-2 rounded-lg bg-pink-900/10 border border-pink-500/20 cursor-pointer hover:border-pink-500/40 transition-all"
                    onClick={() => setExpandedBackup(expandedBackup === backup.id ? null : backup.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 flex-wrap">
                          <TypeBadge type={backup.type} />
                          <StatusBadge status={backup.status} />
                        </div>
                        <p className="text-[8px] text-pink-300/60 mt-0.5 truncate">{backup.fileName}</p>
                        <p className="text-[7px] text-pink-400/40">{formatBackupDate(backup.createdAt)} • {formatFileSize(backup.size)}</p>
                      </div>
                      
                      {/* Quick Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {backup.status === 'completed' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(backup);
                            }}
                            className="p-1 rounded hover:bg-pink-500/20 transition-all"
                            title="Download"
                          >
                            <Download size={12} className="text-emerald-400" />
                          </button>
                        )}
                        
                        {permissions.canRestore && backup.status === 'completed' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenRestore(backup);
                            }}
                            disabled={isAuctionLive}
                            className="p-1 rounded hover:bg-pink-500/20 transition-all disabled:opacity-50"
                            title="Restore"
                          >
                            <Upload size={12} className={isAuctionLive ? 'text-gray-400' : 'text-blue-400'} />
                          </button>
                        )}
                        
                        {permissions.canDeleteBackups && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(backup);
                            }}
                            className="p-1 rounded hover:bg-pink-500/20 transition-all"
                            title="Delete"
                          >
                            <Trash2 size={12} className="text-red-400" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expanded Stats */}
                    {expandedBackup === backup.id && (
                      <div className="mt-1.5 pt-1.5 border-t border-pink-500/10 grid grid-cols-4 gap-1">
                        <div className="bg-pink-900/20 rounded p-1.5">
                          <p className="text-[6px] text-pink-400/60 uppercase">Players</p>
                          <p className="text-sm font-black text-pink-100">{backup.playersCount || 0}</p>
                        </div>
                        <div className="bg-pink-900/20 rounded p-1.5">
                          <p className="text-[6px] text-pink-400/60 uppercase">Teams</p>
                          <p className="text-sm font-black text-pink-100">{backup.teamsCount || 0}</p>
                        </div>
                        <div className="bg-pink-900/20 rounded p-1.5">
                          <p className="text-[6px] text-pink-400/60 uppercase">Bids</p>
                          <p className="text-sm font-black text-pink-100">{backup.bidsCount || 0}</p>
                        </div>
                        <div className="bg-pink-900/20 rounded p-1.5">
                          <p className="text-[6px] text-pink-400/60 uppercase">By</p>
                          <p className="text-[8px] text-pink-100 truncate">{backup.createdBy}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Restore Modal */}
        {showRestoreModal && selectedBackup && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-lg mx-4 rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(26, 10, 46, 0.98), rgba(45, 10, 40, 0.95))' }}>
              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-pink-500/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Upload size={20} className="text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-pink-100">Restore Backup</h3>
                    <p className="text-xs text-pink-400/60">{selectedBackup.fileName}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowRestoreModal(false);
                    setSelectedBackup(null);
                    setRestorePreview(null);
                    setValidationResult(null);
                  }}
                  className="p-2 rounded-lg hover:bg-pink-500/20 transition-all"
                >
                  <X size={20} className="text-pink-400" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-5">
                {/* Live Auction Warning */}
                {isAuctionLive && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/20 border border-red-500/30">
                    <AlertTriangle size={24} className="text-red-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-red-300">Auction is Live</p>
                      <p className="text-xs text-red-400/80 mt-0.5">
                        Restore is disabled during a live auction to prevent data corruption.
                      </p>
                    </div>
                  </div>
                )}

                {/* Validation Status */}
                {isValidating ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={32} className="text-pink-400 animate-spin" />
                    <span className="ml-3 text-pink-300">Validating backup...</span>
                  </div>
                ) : validationResult && !validationResult.valid ? (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/20 border border-red-500/30">
                    <AlertCircle size={24} className="text-red-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-red-300">Validation Failed</p>
                      <p className="text-xs text-red-400/80 mt-0.5">{validationResult.error}</p>
                    </div>
                  </div>
                ) : restorePreview && (
                  <>
                    {/* Preview Stats */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-pink-300 uppercase tracking-wider">
                        Restore Preview
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-pink-900/20 rounded-lg p-3">
                          <p className="text-[10px] font-bold text-pink-400/60 uppercase">Players</p>
                          <p className="text-xl font-black text-pink-100">{restorePreview.playersCount}</p>
                        </div>
                        <div className="bg-pink-900/20 rounded-lg p-3">
                          <p className="text-[10px] font-bold text-pink-400/60 uppercase">Teams</p>
                          <p className="text-xl font-black text-pink-100">{restorePreview.teamsCount}</p>
                        </div>
                        <div className="bg-pink-900/20 rounded-lg p-3">
                          <p className="text-[10px] font-bold text-pink-400/60 uppercase">Auctions</p>
                          <p className="text-xl font-black text-pink-100">{restorePreview.auctionsCount}</p>
                        </div>
                        <div className="bg-pink-900/20 rounded-lg p-3">
                          <p className="text-[10px] font-bold text-pink-400/60 uppercase">Bids</p>
                          <p className="text-xl font-black text-pink-100">{restorePreview.bidsCount}</p>
                        </div>
                      </div>
                    </div>

                    {/* Warnings */}
                    {restorePreview.warnings && restorePreview.warnings.length > 0 && (
                      <div className="space-y-2">
                        {restorePreview.warnings.map((warning, idx) => (
                          <div key={idx} className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                            <AlertTriangle size={14} className="text-amber-400 flex-shrink-0" />
                            <span className="text-xs text-amber-300">{warning}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Safety Warning */}
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                      <Shield size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-amber-300">Important</p>
                        <p className="text-xs text-amber-400/80 mt-1">
                          Restoring will overwrite current data including all players, teams, bids, and settings. 
                          This action cannot be undone. We recommend creating a backup before proceeding.
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-pink-500/20 flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowRestoreModal(false);
                    setSelectedBackup(null);
                    setRestorePreview(null);
                    setValidationResult(null);
                  }}
                  className="px-5 py-2.5 rounded-lg text-sm font-bold text-pink-300 hover:bg-pink-500/20 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRestore}
                  disabled={isRestoring || isValidating || !validationResult?.valid || isAuctionLive}
                  className="px-5 py-2.5 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-pink-600 to-red-600 hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isRestoring ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Restoring...
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      Confirm Restore
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BackupRestoreSection;
