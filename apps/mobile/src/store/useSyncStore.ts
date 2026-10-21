import { create } from 'zustand';
import { OfflineStore } from '../db/offlineStore';
import { SyncPacket, SyncResponse } from '@broiler/shared';

interface SyncState {
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: string | null;
  syncError: string | null;
  refreshPendingCount: () => Promise<void>;
  syncWithServer: (apiBaseUrl: string, token: string, userId: string) => Promise<boolean>;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  isSyncing: false,
  pendingCount: 0,
  lastSyncTime: null,
  syncError: null,

  refreshPendingCount: async () => {
    const queue = await OfflineStore.getQueue();
    set({ pendingCount: queue.length });
  },

  syncWithServer: async (apiBaseUrl: string, token: string, userId: string): Promise<boolean> => {
    if (get().isSyncing) return false;

    const queue = await OfflineStore.getQueue();
    if (queue.length === 0) {
      set({ pendingCount: 0 });
      return true;
    }

    set({ isSyncing: true, syncError: null });

    try {
      const packet: SyncPacket = {
        deviceId: 'mobile-client-device',
        userId,
        items: queue
      };

      const res = await fetch(`${apiBaseUrl}/api/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(packet)
      });

      if (!res.ok) {
        throw new Error(`Sync failed with HTTP ${res.status}`);
      }

      const data: SyncResponse = await res.json();
      if (data.success && data.results) {
        // Collect successfully processed mutation IDs
        const processedIds = data.results
          .filter(r => r.status === 'synced' || r.status === 'conflict')
          .map(r => r.clientMutationId);

        await OfflineStore.removeProcessedMutations(processedIds);

        const remainingQueue = await OfflineStore.getQueue();
        set({
          isSyncing: false,
          pendingCount: remainingQueue.length,
          lastSyncTime: new Date().toLocaleTimeString(),
          syncError: null
        });
        return true;
      } else {
        throw new Error('Sync response indicated failure');
      }
    } catch (err: any) {
      console.warn('[Sync Error]: Offline or server unavailable:', err.message);
      set({
        isSyncing: false,
        syncError: err.message || 'Network unavailable'
      });
      return false;
    }
  }
}));
