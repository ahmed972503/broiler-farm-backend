import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "../src/store/useAuthStore";
import { useTheme } from "../src/theme";
import "../src/i18n"; // Initialize i18n

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function RootNavigation() {
  const { user, isAuthenticated, isLoading, restoreSession } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const { colors, mode } = useTheme();

  useEffect(() => {
    restoreSession();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const firstSegment = (segments[0] as string) || "";
    const inAuthGroup = firstSegment === "(auth)" || firstSegment === "login";
    const inAdminGroup = firstSegment === "(admin)";
    const inWorkerGroup = firstSegment === "(worker)";

    if (!isAuthenticated) {
      if (!inAuthGroup) {
        router.replace("/login");
      }
    } else {
      if (inAuthGroup || firstSegment === "" || firstSegment === "index") {
        if (user?.role === "admin") {
          router.replace("/(admin)/dashboard");
        } else {
          router.replace("/(worker)/today");
        }
      } else if (user?.role === "worker" && inAdminGroup) {
        // Enforce frontend route guard: worker cannot view admin routes
        router.replace("/(worker)/today");
      }
    }
  }, [isAuthenticated, isLoading, user, segments]);

  if (isLoading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(worker)" options={{ headerShown: false }} />
        <Stack.Screen name="(admin)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <RootNavigation />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
