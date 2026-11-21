import { useAuthStore } from "../store/useAuthStore";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const STORAGE_KEY_API_URL = "@broiler_farm_api_url";

function getDefaultBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, "");
  }
  // Default to live cloud backend on Vercel
  return "https://broiler-farm-backend-3g4r-hoslcd6ju-aag-d348.vercel.app";
}

export let API_BASE_URL: string = getDefaultBaseUrl();

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

export async function initApiBaseUrl(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY_API_URL);
    if (saved && saved.trim()) {
      API_BASE_URL = saved.trim().replace(/\/$/, "");
    }
  } catch {}
  return API_BASE_URL;
}

// Initialize on module load
initApiBaseUrl();

export async function setApiBaseUrl(newUrl: string): Promise<string> {
  const sanitized = newUrl.trim().replace(/\/$/, "");
  API_BASE_URL = sanitized;
  try {
    await AsyncStorage.setItem(STORAGE_KEY_API_URL, sanitized);
  } catch (err) {
    console.error("Failed to save custom API URL:", err);
  }
  return API_BASE_URL;
}

export async function testServerConnection(urlToTest?: string): Promise<{
  success: boolean;
  message: string;
}> {
  const target = (urlToTest || getApiBaseUrl()).trim().replace(/\/$/, "");
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    let res: Response;
    try {
      res = await fetch(`${target}/health`, {
        method: "GET",
        signal: controller.signal,
      });
      if (!res.ok) {
        res = await fetch(`${target}/`, {
          method: "GET",
          signal: controller.signal,
        });
      }
    } catch (e: any) {
      res = await fetch(`${target}/`, {
        method: "GET",
        signal: controller.signal,
      });
    }
    clearTimeout(timer);

    const text = await res.text();
    if (text.includes("Protected by Vercel Authentication")) {
      return {
        success: false,
        message: "Vercel Authentication is ON! Please disable Deployment Protection in Vercel Settings.",
      };
    }

    if (res.ok) {
      return { success: true, message: `Connected successfully to ${target}` };
    }
    return {
      success: false,
      message: `Server returned HTTP status ${res.status} (${res.statusText})`,
    };
  } catch (err: any) {
    if (err.name === "AbortError") {
      return {
        success: false,
        message: `Connection timed out to ${target}. Check internet connection or server status.`,
      };
    }
    return {
      success: false,
      message:
        err.message ||
        `Failed to reach server at ${target}. Check if backend is running.`,
    };
  }
}

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<{ success: boolean; data?: T; error?: string }> {
  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  try {
    const res = await fetch(url, { ...options, headers });

    // Handle token expiration / 401
    if (
      res.status === 401 &&
      !path.includes("/auth/login") &&
      !path.includes("/auth/refresh")
    ) {
      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        try {
          const refreshRes = await fetch(`${baseUrl}/api/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
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

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await res.text();
      if (text.includes("Protected by Vercel Authentication")) {
        return {
          success: false,
          error: "Vercel Authentication is ON! Disable Deployment Protection in Vercel Settings -> Deployment Protection.",
        };
      }
      return {
        success: false,
        error: `Server error (${res.status}): ${text.slice(0, 100)}`,
      };
    }

    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      error:
        err.message ||
        `Network request failed: Cannot connect to ${baseUrl}. Check internet and server status.`,
    };
  }
}
