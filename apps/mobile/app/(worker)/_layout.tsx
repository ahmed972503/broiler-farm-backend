import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar as RNStatusBar,
  Image,
} from "react-native";
import { Tabs, useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../src/theme";
import { useAuthStore } from "../../src/store/useAuthStore";
import { useTranslation } from "react-i18next";
import { changeLanguage } from "../../src/i18n";
import { SyncStatusBanner } from "../../src/components/ui";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function WorkerLayout() {
  const { colors, typography, spacing, mode, toggleTheme } = useTheme();
  const { user, logout } = useAuthStore();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const statusBarHeight =
    Platform.OS === "android"
      ? Math.max(RNStatusBar.currentHeight || 0, insets.top, 24)
      : insets.top;

  const toggleLang = () => {
    changeLanguage(i18n.language === "ur" ? "en" : "ur");
  };

  return (
    <View
      style={{
        flex: 1,
        height: "100%",
        backgroundColor: colors.background,
      }}
    >
      {/* Top Worker App Header */}
      <View
        style={[
          styles.topHeader,
          {
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
            paddingTop: statusBarHeight + 10,
          },
        ]}
      >
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 }}>
          <Image
            source={require("../../assets/logo.png")}
            style={{ width: 34, height: 34, borderRadius: 17, marginRight: 10 }}
            resizeMode="contain"
          />
          <View style={{ flex: 1 }}>
            <Text
              numberOfLines={1}
              style={[
                styles.shedBadge,
                {
                  color: colors.primary,
                  fontSize: typography.sizes.xs,
                  fontWeight: typography.weights.bold,
                },
              ]}
            >
              {user?.shed?.name ||
                `SHED ${user?.assignedShedId ? "ASSIGNED" : "5"}`}
            </Text>
            <Text
              numberOfLines={1}
              style={[
                styles.workerName,
                {
                  color: colors.text,
                  fontSize: typography.sizes.md,
                  fontWeight: typography.weights.bold,
                },
              ]}
            >
              {user?.name || "Worker"}
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={toggleLang}
            style={[
              styles.actionChip,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text
              style={{
                color: colors.text,
                fontSize: typography.sizes.xs,
                fontWeight: typography.weights.bold,
              }}
            >
              {i18n.language === "ur" ? "EN" : "اردو"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={toggleTheme}
            style={[
              styles.actionChip,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Ionicons
              name={mode === "dark" ? "sunny-outline" : "moon-outline"}
              size={14}
              color={colors.text}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={async () => {
              await logout();
              router.replace("/login");
            }}
            style={[
              styles.logoutButton,
              { backgroundColor: colors.dangerBg, borderColor: colors.danger },
            ]}
          >
            <Text
              style={{
                color: colors.danger,
                fontSize: typography.sizes.xs,
                fontWeight: typography.weights.bold,
              }}
            >
              Logout
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ paddingHorizontal: spacing.base }}>
        <SyncStatusBanner />
      </View>

      <Tabs
        sceneContainerStyle={{ backgroundColor: colors.background }}
        screenOptions={{
          headerShown: false,
          tabBarHideOnKeyboard: true,
          tabBarStyle: {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            height: 60 + (insets.bottom > 0 ? insets.bottom : 0),
            paddingBottom: insets.bottom > 0 ? insets.bottom + 4 : 6,
            paddingTop: 6,
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "600",
            textAlign: "center",
          },
          tabBarItemStyle: {
            paddingHorizontal: 0,
            overflow: "hidden",
          },
        }}
      >
        <Tabs.Screen
          name="today"
          options={{
            title: t("tabs.today", "Aaj"),
            tabBarIcon: ({ color }: { color: string }) => (
              <Ionicons name="home-outline" size={20} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="daily-entry"
          options={{
            title: t("tabs.dailyEntry", "Rozana"),
            tabBarIcon: ({ color }: { color: string }) => (
              <Ionicons name="create-outline" size={20} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="vaccinations"
          options={{
            title: t("tabs.vaccinations", "Teekay"),
            tabBarIcon: ({ color }: { color: string }) => (
              <MaterialCommunityIcons name="needle" size={20} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="weight"
          options={{
            title: t("tabs.weights", "Wazan"),
            tabBarIcon: ({ color }: { color: string }) => (
              <MaterialCommunityIcons name="scale" size={20} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: t("tabs.history", "Khata"),
            tabBarIcon: ({ color }: { color: string }) => (
              <Ionicons name="reader-outline" size={20} color={color} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  shedBadge: {
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  workerName: {
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionChip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginLeft: 6,
  },
  logoutButton: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginLeft: 6,
  },
});
