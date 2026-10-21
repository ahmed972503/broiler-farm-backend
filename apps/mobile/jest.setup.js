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
      changeLanguage: () => new Promise(() => {}),
      language: 'en',
    },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  },
}));
