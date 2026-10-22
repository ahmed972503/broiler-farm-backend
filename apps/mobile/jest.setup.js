// Jest setup for React Native and Expo
import '@testing-library/react-native/extend-expect';

// Mock AsyncStorage in-memory
const storageCache: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(async (key: string, val: string) => {
    storageCache[key] = val;
    return null;
  }),
  getItem: jest.fn(async (key: string) => {
    return storageCache[key] !== undefined ? storageCache[key] : null;
  }),
  removeItem: jest.fn(async (key: string) => {
    delete storageCache[key];
    return null;
  }),
  getAllKeys: jest.fn(async () => Object.keys(storageCache)),
  multiRemove: jest.fn(async (keys: string[]) => {
    keys.forEach(k => delete storageCache[k]);
    return null;
  }),
  clear: jest.fn(async () => {
    for (const k in storageCache) delete storageCache[k];
    return null;
  }),
}));

// Mock Expo SecureStore
const secureStorageCache: Record<string, string> = {};
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(async (key: string, val: string) => {
    secureStorageCache[key] = val;
  }),
  getItemAsync: jest.fn(async (key: string) => {
    return secureStorageCache[key] || null;
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    delete secureStorageCache[key];
  }),
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useSegments: () => [],
  useLocalSearchParams: () => ({}),
  Link: 'Link',
  Tabs: Object.assign(({ children }: any) => children, {
    Screen: ({ children }: any) => children,
  }),
  Stack: Object.assign(({ children }: any) => children, {
    Screen: ({ children }: any) => children,
  }),
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (str: string) => str,
    i18n: {
      changeLanguage: () => new Promise(() => { }),
      language: 'en',
    },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: () => { },
  },
}));

// Mock expo-sqlite in-memory for Jest
const mockSyncQueueTable = [];
const mockEntityCacheTable = new Map();
const mockConflictLogTable = [];

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(async () => ({
    execAsync: jest.fn(async () => {}),
    runAsync: jest.fn(async (sql, ...params) => {
      if (sql.includes('INSERT INTO sync_queue')) {
        const [clientMutationId, entityType, action, payload, clientTimestamp, createdAt] = params;
        mockSyncQueueTable.push({ clientMutationId, entityType, action, payload, clientTimestamp, createdAt });
      } else if (sql.includes('DELETE FROM sync_queue WHERE clientMutationId = ?')) {
        const [id] = params;
        const idx = mockSyncQueueTable.findIndex(item => item.clientMutationId === id);
        if (idx !== -1) mockSyncQueueTable.splice(idx, 1);
      } else if (sql.includes('DELETE FROM sync_queue')) {
        mockSyncQueueTable.length = 0;
      } else if (sql.includes('INSERT OR REPLACE INTO entity_cache')) {
        const [key, entityType, entityId, data, clientUpdatedAt, isOffline] = params;
        mockEntityCacheTable.set(key, { key, entityType, entityId, data, clientUpdatedAt, isOffline });
      } else if (sql.includes('DELETE FROM entity_cache')) {
        mockEntityCacheTable.clear();
      } else if (sql.includes('INSERT INTO conflict_audit_log')) {
        const [id, clientMutationId, entityType, conflictType, resolution, localData, serverData, resolvedAt] = params;
        mockConflictLogTable.push({ id, clientMutationId, entityType, conflictType, resolution, localData, serverData, resolvedAt });
      } else if (sql.includes('DELETE FROM conflict_audit_log')) {
        mockConflictLogTable.length = 0;
      }
      return { changes: 1, lastInsertRowId: 1 };
    }),
    getFirstAsync: jest.fn(async (sql, ...params) => {
      if (sql.includes('FROM sync_queue WHERE clientMutationId = ?')) {
        const [id] = params;
        return mockSyncQueueTable.find(item => item.clientMutationId === id) || null;
      }
      return null;
    }),
    getAllAsync: jest.fn(async (sql, ...params) => {
      if (sql.includes('FROM sync_queue')) {
        return [...mockSyncQueueTable].sort((a, b) => a.createdAt - b.createdAt);
      } else if (sql.includes('FROM entity_cache WHERE entityType = ?')) {
        const [entityType] = params;
        return Array.from(mockEntityCacheTable.values())
          .filter(e => e.entityType === entityType)
          .sort((a, b) => new Date(b.clientUpdatedAt).getTime() - new Date(a.clientUpdatedAt).getTime());
      } else if (sql.includes('FROM conflict_audit_log')) {
        return [...mockConflictLogTable].sort((a, b) => new Date(b.resolvedAt).getTime() - new Date(a.resolvedAt).getTime());
      }
      return [];
    }),
  })),
}));

