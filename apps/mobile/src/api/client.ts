import { useAuthStore } from '../store/useAuthStore';
import { Platform } from 'react-native';

// In Expo, localhost works on Web and iOS simulator. On Android emulator use 10.0.2.2.
function getBaseUrl(): string {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000';
  }
  return 'http://localhost:5000';
}

export const API_BASE_URL = getBaseUrl();

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

  try {
    const res = await fetch(url, { ...options, headers });

    // Handle token expiration / 401
    if (res.status === 401 && !path.includes('/auth/login') && !path.includes('/auth/refresh')) {
      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        try {
          const refreshRes = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
          });
          const refreshData = await refreshRes.json();
          if (refreshData.success && refreshData.data?.accessToken) {
            headers.Authorization = `Bearer ${refreshData.data.accessToken}`;
            // Retry original request with fresh token
            const retryRes = await fetch(url, { ...options, headers });
            const retryData = await retryRes.json();
            return retryData;
          }
        } catch {
          // Token refresh failed, user should login again
          useAuthStore.getState().logout();
        }
      }
    }

    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Network request failed. Working in offline mode.'
    };
  }
}
