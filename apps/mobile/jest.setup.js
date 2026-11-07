// Jest setup for React Native and Expo
import "@testing-library/react-native/extend-expect";

// Mock AsyncStorage in-memory
const storageCache = {};
jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(async (key, val) => {
    storageCache[key] = val;
    return null;
  }),
  getItem: jest.fn(async (key) => {
    return storageCache[key] !== undefined ? storageCache[key] : null;
  }),
  removeItem: jest.fn(async (key) => {
    delete storageCache[key];
    return null;
  }),
  getAllKeys: jest.fn(async () => Object.keys(storageCache)),
  multiRemove: jest.fn(async (keys) => {
    keys.forEach((k) => delete storageCache[k]);
    return null;
  }),
  clear: jest.fn(async () => {
    for (const k in storageCache) delete storageCache[k];
    return null;
  }),
}));

// Mock Expo SecureStore
const secureStorageCache = {};
jest.mock("expo-secure-store", () => ({
  setItemAsync: jest.fn(async (key, val) => {
    secureStorageCache[key] = val;
  }),
  getItemAsync: jest.fn(async (key) => {
    return secureStorageCache[key] || null;
  }),
  deleteItemAsync: jest.fn(async (key) => {
    delete secureStorageCache[key];
  }),
}));

// Mock expo-router
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useSegments: () => [],
  useLocalSearchParams: () => ({}),
  Link: "Link",
  Tabs: Object.assign(({ children }) => children, {
    Screen: ({ children }) => children,
  }),
  Stack: Object.assign(({ children }) => children, {
    Screen: ({ children }) => children,
  }),
}));

// Mock i18next
jest.mock("i18next", () => ({
  use: () => ({
    init: () => {},
  }),
  init: () => {},
  changeLanguage: (lng) => {
    mockCurrentLang = lng;
    return Promise.resolve();
  },
  get language() {
    return mockCurrentLang;
  },
}));

// Mock react-i18next
const mockUrTranslations = require("./src/i18n/ur.json");
const mockEnTranslations = require("./src/i18n/en.json");

let mockCurrentLang = "ur";

function mockResolveTranslation(dict, key) {
  const parts = key.split(".");
  let cur = dict;
  for (const p of parts) {
    if (!cur || typeof cur !== "object") return null;
    cur = cur[p];
  }
  return typeof cur === "string" ? cur : null;
}

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (str) => {
      const activeDict =
        mockCurrentLang === "ur" ? mockUrTranslations : mockEnTranslations;
      const translated = mockResolveTranslation(activeDict, str);
      if (translated) return translated;
      const fallback = mockResolveTranslation(mockEnTranslations, str);
      return fallback || str;
    },
    i18n: {
      changeLanguage: (lng) => {
        mockCurrentLang = lng;
        return Promise.resolve();
      },
      get language() {
        return mockCurrentLang;
      },
    },
  }),
  initReactI18next: {
    type: "3rdParty",
    init: () => {},
  },
}));

// Mock expo-sqlite in-memory for Jest
const mockSyncQueueTable = [];
const mockEntityCacheTable = new Map();
const mockConflictLogTable = [];

jest.mock("expo-sqlite", () => ({
  openDatabaseAsync: jest.fn(async () => ({
    execAsync: jest.fn(async () => {}),
    runAsync: jest.fn(async (sql, ...params) => {
      if (sql.includes("INSERT INTO sync_queue")) {
        const [
          clientMutationId,
          entityType,
          action,
          payload,
          clientTimestamp,
          createdAt,
        ] = params;
        mockSyncQueueTable.push({
          clientMutationId,
          entityType,
          action,
          payload,
          clientTimestamp,
          createdAt,
        });
      } else if (
        sql.includes("DELETE FROM sync_queue WHERE clientMutationId = ?")
      ) {
        const [id] = params;
        const idx = mockSyncQueueTable.findIndex(
          (item) => item.clientMutationId === id,
        );
        if (idx !== -1) mockSyncQueueTable.splice(idx, 1);
      } else if (sql.includes("DELETE FROM sync_queue")) {
        mockSyncQueueTable.length = 0;
      } else if (sql.includes("INSERT OR REPLACE INTO entity_cache")) {
        const [key, entityType, entityId, data, clientUpdatedAt, isOffline] =
          params;
        mockEntityCacheTable.set(key, {
          key,
          entityType,
          entityId,
          data,
          clientUpdatedAt,
          isOffline,
        });
      } else if (sql.includes("DELETE FROM entity_cache")) {
        mockEntityCacheTable.clear();
      } else if (sql.includes("INSERT INTO conflict_audit_log")) {
        const [
          id,
          clientMutationId,
          entityType,
          conflictType,
          resolution,
          localData,
          serverData,
          resolvedAt,
        ] = params;
        mockConflictLogTable.push({
          id,
          clientMutationId,
          entityType,
          conflictType,
          resolution,
          localData,
          serverData,
          resolvedAt,
        });
      } else if (sql.includes("DELETE FROM conflict_audit_log")) {
        mockConflictLogTable.length = 0;
      }
      return { changes: 1, lastInsertRowId: 1 };
    }),
    getFirstAsync: jest.fn(async (sql, ...params) => {
      if (sql.includes("FROM sync_queue WHERE clientMutationId = ?")) {
        const [id] = params;
        return (
          mockSyncQueueTable.find((item) => item.clientMutationId === id) ||
          null
        );
      }
      return null;
    }),
    getAllAsync: jest.fn(async (sql, ...params) => {
      if (sql.includes("FROM sync_queue")) {
        return [...mockSyncQueueTable].sort(
          (a, b) => a.createdAt - b.createdAt,
        );
      } else if (sql.includes("FROM entity_cache WHERE entityType = ?")) {
        const [entityType] = params;
        return Array.from(mockEntityCacheTable.values())
          .filter((e) => e.entityType === entityType)
          .sort(
            (a, b) =>
              new Date(b.clientUpdatedAt).getTime() -
              new Date(a.clientUpdatedAt).getTime(),
          );
      } else if (sql.includes("FROM conflict_audit_log")) {
        return [...mockConflictLogTable].sort(
          (a, b) =>
            new Date(b.resolvedAt).getTime() - new Date(a.resolvedAt).getTime(),
        );
      }
      return [];
    }),
  })),
}));
