import React from "react";
import { Redirect } from "expo-router";
import { useAuthStore } from "../src/store/useAuthStore";
import { View, ActivityIndicator } from "react-native";
import { useTheme } from "../src/theme";

export default function Index() {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const { colors } = useTheme();

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  if (user?.role === "admin") {
    return <Redirect href="/(admin)/dashboard" />;
  }

  return <Redirect href="/(worker)/today" />;
}
