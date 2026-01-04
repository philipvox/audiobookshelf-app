/**
 * src/features/player/hooks/useSyncStatus.ts
 *
 * Hook to monitor background sync status for UI display.
 * Updates periodically to show current sync queue state.
 */

import { useState, useEffect, useCallback } from 'react';
import { backgroundSyncService } from '../services/backgroundSyncService';

export interface SyncStatus {
  queueSize: number;
  isRunning: boolean;
  status: 'synced' | 'syncing' | 'pending' | 'offline';
  label: string;
}

/**
 * Hook to get current sync status for UI display.
 * Polls every 2 seconds while mounted.
 */
export function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>({
    queueSize: 0,
    isRunning: false,
    status: 'synced',
    label: 'Synced',
  });

  const updateStatus = useCallback(() => {
    const { queueSize, isRunning } = backgroundSyncService.getStatus();

    let syncStatus: SyncStatus['status'];
    let label: string;

    if (queueSize === 0) {
      syncStatus = 'synced';
      label = 'Synced';
    } else if (isRunning) {
      syncStatus = 'syncing';
      label = `Syncing ${queueSize} item${queueSize !== 1 ? 's' : ''}...`;
    } else {
      syncStatus = 'pending';
      label = `${queueSize} item${queueSize !== 1 ? 's' : ''} pending`;
    }

    setStatus({
      queueSize,
      isRunning,
      status: syncStatus,
      label,
    });
  }, []);

  useEffect(() => {
    // Initial check
    updateStatus();

    // Poll every 2 seconds
    const interval = setInterval(updateStatus, 2000);

    return () => clearInterval(interval);
  }, [updateStatus]);

  return status;
}
