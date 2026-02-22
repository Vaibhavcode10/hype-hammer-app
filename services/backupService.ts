/**
 * Backup & Restore Service
 * Frontend service for managing platform backups
 */

import { 
  BackupMetadata, 
  BackupType, 
  AutoBackupConfig, 
  RestorePreview,
  BackupPermissions,
  UserRole,
  AutoBackupInterval
} from '../types';

const API_BASE = (import.meta as any)?.env?.VITE_API_URL || 'https://us-central1-axilam.cloudfunctions.net';
const API_ENDPOINT = `${API_BASE}/auction`;

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

/**
 * Generic fetch wrapper
 */
async function apiCall<T = any>(
  path: string,
  method: string = 'GET',
  body?: any
): Promise<ApiResponse<T>> {
  try {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_ENDPOINT}${path}`, options);
    const data: ApiResponse<T> = await response.json();
    
    return data;
  } catch (error) {
    console.error(`API Call Failed: ${method} ${path}`, error);
    return { success: false, error: String(error) };
  }
}

// ========================
// PERMISSIONS
// ========================

/**
 * Get backup permissions based on user role
 */
export function getBackupPermissions(role: UserRole): BackupPermissions {
  switch (role) {
    case UserRole.ADMIN:
      return {
        canCreateFullBackup: true,
        canCreateQuickBackup: true,
        canRestore: true,
        canScheduleAutoBackup: true,
        canDeleteBackups: true,
        canViewBackups: true,
      };
    case UserRole.AUCTIONEER:
      return {
        canCreateFullBackup: true,
        canCreateQuickBackup: true,
        canRestore: false,
        canScheduleAutoBackup: false,
        canDeleteBackups: false,
        canViewBackups: true,
      };
    default:
      return {
        canCreateFullBackup: false,
        canCreateQuickBackup: false,
        canRestore: false,
        canScheduleAutoBackup: false,
        canDeleteBackups: false,
        canViewBackups: false,
      };
  }
}

// ========================
// BACKUP OPERATIONS
// ========================

/**
 * Get all backups for a match
 */
export async function getBackups(matchId: string): Promise<BackupMetadata[]> {
  const response = await apiCall<BackupMetadata[]>(`/backups?matchId=${matchId}`);
  return response.data || [];
}

/**
 * Get a specific backup
 */
export async function getBackup(backupId: string): Promise<BackupMetadata | null> {
  const response = await apiCall<BackupMetadata>(`/backups/${backupId}`);
  return response.data || null;
}

/**
 * Create a new backup
 */
export async function createBackup(
  matchId: string,
  type: BackupType,
  createdBy: string,
  createdByEmail: string,
  createdByRole: UserRole
): Promise<ApiResponse<BackupMetadata>> {
  return apiCall<BackupMetadata>('/backups', 'POST', {
    matchId,
    type,
    createdBy,
    createdByEmail,
    createdByRole,
  });
}

/**
 * Create a full backup (includes storage files)
 */
export async function createFullBackup(
  matchId: string,
  createdBy: string,
  createdByEmail: string,
  createdByRole: UserRole
): Promise<ApiResponse<BackupMetadata>> {
  return apiCall<BackupMetadata>('/backup/full', 'POST', {
    matchId,
    createdBy,
    createdByEmail,
    createdByRole,
  });
}

/**
 * Create a quick backup (JSON only, no storage files)
 */
export async function createQuickBackup(
  matchId: string,
  createdBy: string,
  createdByEmail: string,
  createdByRole: UserRole
): Promise<ApiResponse<BackupMetadata>> {
  return apiCall<BackupMetadata>('/backup/quick', 'POST', {
    matchId,
    createdBy,
    createdByEmail,
    createdByRole,
  });
}

/**
 * Delete a backup
 */
export async function deleteBackup(
  backupId: string,
  userRole: UserRole
): Promise<ApiResponse<void>> {
  return apiCall<void>(`/backups/${backupId}`, 'DELETE', { userRole });
}

/**
 * Get download URL for a backup
 */
export async function getBackupDownloadUrl(backupId: string): Promise<string | null> {
  const response = await apiCall<{ downloadURL: string }>(`/backups/${backupId}/download`);
  return response.data?.downloadURL || null;
}

/**
 * Download a backup file
 */
export async function downloadBackup(backup: BackupMetadata): Promise<void> {
  if (backup.downloadURL) {
    const link = document.createElement('a');
    link.href = backup.downloadURL;
    link.download = backup.fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    // Fetch download URL first
    const url = await getBackupDownloadUrl(backup.id);
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = backup.fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      throw new Error('Download URL not available');
    }
  }
}

// ========================
// BACKUP STATUS
// ========================

/**
 * Check if a backup is currently in progress
 */
export async function getBackupStatus(matchId: string): Promise<{
  inProgress: boolean;
  latestBackup: BackupMetadata | null;
}> {
  const response = await apiCall<{
    inProgress: boolean;
    latestBackup: BackupMetadata | null;
  }>(`/backup/status?matchId=${matchId}`);
  
  return response.data || { inProgress: false, latestBackup: null };
}

// ========================
// AUTO BACKUP
// ========================

/**
 * Get auto backup configuration
 */
export async function getAutoBackupConfig(matchId: string): Promise<AutoBackupConfig> {
  const response = await apiCall<AutoBackupConfig>(`/backup/auto-config?matchId=${matchId}`);
  return response.data || {
    enabled: false,
    interval: 'daily' as AutoBackupInterval,
    retainCount: 10,
  };
}

/**
 * Update auto backup configuration
 */
export async function updateAutoBackupConfig(
  matchId: string,
  config: Partial<AutoBackupConfig>,
  userRole: UserRole
): Promise<ApiResponse<AutoBackupConfig>> {
  return apiCall<AutoBackupConfig>('/backup/auto-config', 'PUT', {
    matchId,
    ...config,
    userRole,
  });
}

// ========================
// RESTORE OPERATIONS
// ========================

/**
 * Preview a backup before restoring
 */
export async function previewRestore(backupId: string): Promise<RestorePreview | null> {
  const response = await apiCall<RestorePreview>('/restore/preview', 'POST', { backupId });
  return response.data || null;
}

/**
 * Validate a backup file
 */
export async function validateBackup(backupId: string): Promise<{
  valid: boolean;
  error?: string;
  schemaVersion?: string;
  files?: string[];
}> {
  const response = await apiCall<{
    valid: boolean;
    error?: string;
    schemaVersion?: string;
    files?: string[];
  }>('/restore/validate', 'POST', { backupId });
  
  return response.data || { valid: false, error: 'Unknown error' };
}

/**
 * Restore from a backup
 */
export async function restoreBackup(
  backupId: string,
  matchId: string,
  userRole: UserRole
): Promise<ApiResponse<{
  restoredPlayers: number;
  restoredTeams: number;
  restoredBids: number;
}>> {
  return apiCall('/restore', 'POST', {
    backupId,
    matchId,
    userRole,
  });
}

// ========================
// UTILITIES
// ========================

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format date for display
 */
export function formatBackupDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

/**
 * Get backup type label
 */
export function getBackupTypeLabel(type: BackupType): string {
  switch (type) {
    case 'full':
      return 'Full Backup';
    case 'quick':
      return 'Quick Backup';
    case 'auto':
      return 'Auto Backup';
    default:
      return type;
  }
}

/**
 * Get auto backup interval label
 */
export function getIntervalLabel(interval: AutoBackupInterval): string {
  switch (interval) {
    case 'hourly':
      return 'Every Hour';
    case 'six_hours':
      return 'Every 6 Hours';
    case 'daily':
      return 'Daily';
    case 'disabled':
      return 'Disabled';
    default:
      return interval;
  }
}
