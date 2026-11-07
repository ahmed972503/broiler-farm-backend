import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserRole } from "@broiler/shared";

const AUTH_USER_KEY = "@broiler_farm_auth_user";
const AUTH_TOKEN_KEY = "@broiler_farm_auth_token";
const AUTH_REFRESH_KEY = "@broiler_farm_auth_refresh";

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  phone: string;
  role: UserRole;
  assignedShedId?: string | null;
  shed?: {
    id: string;
    name: string;
    shedNumber: number;
    currentBatchId?: string | null;
  } | null;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (
    user: AuthUser,
    token: string,
    refreshToken: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: async (user: AuthUser, token: string, refreshToken: string) => {
    try {
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
      await AsyncStorage.setItem(AUTH_REFRESH_KEY, refreshToken);
      set({
        user,
        token,
        refreshToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      console.error("Failed to save auth session", err);
    }
  },

  logout: async () => {
    try {
      await AsyncStorage.removeItem(AUTH_USER_KEY);
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
      await AsyncStorage.removeItem(AUTH_REFRESH_KEY);
      set({
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (err) {
      console.error("Logout error", err);
    }
  },

  restoreSession: async () => {
    const timer = setTimeout(() => {
      if (useAuthStore.getState().isLoading) {
        set({ isLoading: false });
      }
    }, 400);

    try {
      const storedUser = await AsyncStorage.getItem(AUTH_USER_KEY);
      const storedToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      const storedRefresh = await AsyncStorage.getItem(AUTH_REFRESH_KEY);

      clearTimeout(timer);
      if (storedUser && storedToken) {
        set({
          user: JSON.parse(storedUser),
          token: storedToken,
          refreshToken: storedRefresh,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch {
      clearTimeout(timer);
      set({ isLoading: false });
    }
  },
}));
