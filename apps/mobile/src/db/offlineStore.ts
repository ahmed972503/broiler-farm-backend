import AsyncStorage from '@react-native-async-storage/async-storage';
import { SyncItem, SyncEntity, SyncAction, SyncPacket, SyncResponse } from '@broiler/shared';

const SYNC_QUEUE_KEY = '@broiler_farm_sync_queue';
const CACHE_KEY_PREFIX = '@broiler_farm_cache_';

/**
 * Lightweight UUID v4 generator for React Native / Web
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class OfflineStore {
  /**
   * Retrieves all currently pending sync mutations
   */
  static async getQueue(): Promise<SyncItem[]> {
    try {
      const data = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Enqueues a mutation to be sent to the backend
   */
  static async enqueueMutation(
    entityType: SyncEntity,
    action: SyncAction,
    payload: any
  ): Promise<SyncItem> {
    const item: SyncItem = {
      clientMutationId: generateUUID(),
      entityType,
      action,
      payload,
      clientTimestamp: new Date().toISOString()
    };

    const queue = await this.getQueue();
    queue.push(item);
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));

    // Also update local cache for immediate display
    await this.updateLocalEntityCache(entityType, payload);

    return item;
  }

  /**
   * Removes processed items from the sync queue
   */
  static async removeProcessedMutations(mutationIds: string[]): Promise<void> {
    const queue = await this.getQueue();
    const idSet = new Set(mutationIds);
    const remaining = queue.filter(item => !idSet.has(item.clientMutationId));
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(remaining));
  }

  /**
   * Caches entities locally so the worker can view today's records even with 0 internet
   */
  static async updateLocalEntityCache(entityType: string, payload: any): Promise<void> {
    try {
      const key = `${CACHE_KEY_PREFIX}${entityType}`;
      const existingData = await AsyncStorage.getItem(key);
      const items: any[] = existingData ? JSON.parse(existingData) : [];

      // Replace or prepend
      const identifier = payload.id || payload.date || payload.taskId || generateUUID();
      const index = items.findIndex(i => (i.id && i.id === identifier) || (i.date && i.date === payload.date));
      if (index >= 0) {
        items[index] = { ...items[index], ...payload, isOffline: true };
      } else {
        items.unshift({ ...payload, id: identifier, isOffline: true });
      }

      await AsyncStorage.setItem(key, JSON.stringify(items.slice(0, 50))); // Keep last 50
    } catch (err) {
      console.warn('Local cache write failed', err);
    }
  }

  /**
   * Gets locally cached records for offline view
   */
  static async getLocalCache<T = any>(entityType: string): Promise<T[]> {
    try {
      const key = `${CACHE_KEY_PREFIX}${entityType}`;
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Clears the entire queue and cache on logout
   */
  static async clearAll(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const farmKeys = keys.filter(k => k.startsWith(CACHE_KEY_PREFIX) || k === SYNC_QUEUE_KEY);
      await AsyncStorage.multiRemove(farmKeys);
    } catch (err) {
      console.error('Clear store error', err);
    }
  }
}
