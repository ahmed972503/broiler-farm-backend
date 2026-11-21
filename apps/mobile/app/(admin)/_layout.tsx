import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  Platform,
  StatusBar as RNStatusBar,
  Image,
} from "react-native";
import { Slot, useRouter, usePathname } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../src/theme";
import { useAuthStore } from "../../src/store/useAuthStore";
import { useTranslation } from "react-i18next";
import { changeLanguage } from "../../src/i18n";
import { SyncStatusBanner } from "../../src/components/ui";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface NavItem {
  name: string;
  labelKey: string;
  fallbackLabel: string;
  renderIcon: (color: string) => React.ReactNode;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    name: "dashboard",
    labelKey: "nav.dashboard",
    fallbackLabel: "Dashboard",
    renderIcon: (color) => (
      <Ionicons name="stats-chart" size={18} color={color} />
    ),
    path: "/(admin)/dashboard",
  },
  {
    name: "sheds",
    labelKey: "nav.sheds",
    fallbackLabel: "Sheds",
    renderIcon: (color) => (
      <Ionicons name="business-outline" size={18} color={color} />
    ),
    path: "/(admin)/sheds",
  },
  {
    name: "batches",
    labelKey: "nav.batches",
    fallbackLabel: "Batches / Flocks",
    renderIcon: (color) => (
      <MaterialCommunityIcons name="egg-outline" size={18} color={color} />
    ),
    path: "/(admin)/batches",
  },
  {
    name: "daily-records",
    labelKey: "nav.dailyEntry",
    fallbackLabel: "Daily Records",
    renderIcon: (color) => (
      <Ionicons name="clipboard-outline" size={18} color={color} />
    ),
    path: "/(admin)/daily-records",
  },
  {
    name: "feed",
    labelKey: "nav.feed",
    fallbackLabel: "Feed Stock",
    renderIcon: (color) => (
      <MaterialCommunityIcons name="barley" size={18} color={color} />
    ),
    path: "/(admin)/feed",
  },
  {
    name: "sales",
    labelKey: "nav.sales",
    fallbackLabel: "Sales & Buyers",
    renderIcon: (color) => (
      <Ionicons name="cash-outline" size={18} color={color} />
    ),
    path: "/(admin)/sales",
  },
  {
    name: "reports",
    labelKey: "nav.reports",
    fallbackLabel: "Reports & Export",
    renderIcon: (color) => (
      <Ionicons name="document-text-outline" size={18} color={color} />
    ),
    path: "/(admin)/reports",
  },
  {
    name: "alerts",
    labelKey: "nav.alerts",
    fallbackLabel: "Alerts Center",
    renderIcon: (color) => (
      <Ionicons name="notifications-outline" size={18} color={color} />
    ),
    path: "/(admin)/alerts",
  },
  {
    name: "users",
    labelKey: "nav.users",
    fallbackLabel: "User Management",
    renderIcon: (color) => (
      <Ionicons name="person-circle-outline" size={18} color={color} />
    ),
    path: "/(admin)/users",
  },
  {
    name: "settings",
    labelKey: "nav.settings",
    fallbackLabel: "Settings",
    renderIcon: (color) => (
      <Ionicons name="settings-outline" size={18} color={color} />
    ),
    path: "/(admin)/settings",
  },
];

export default function AdminLayout() {
  const { colors, typography, spacing, borderRadius, mode, toggleTheme } =
    useTheme();
  const { user, logout } = useAuthStore();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();

  const isWide = width >= 768; // Tablet / Web Laptop breakpoint
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const statusBarHeight =
    Platform.OS === "android"
      ? Math.max(RNStatusBar.currentHeight || 0, insets.top, 24)
      : insets.top;

  const toggleLang = () => {
    changeLanguage(i18n.language === "ur" ? "en" : "ur");
  };

  const renderNavList = () => (
    <ScrollView style={{ flex: 1 }}>
      {NAV_ITEMS.map((item) => {
        const isActive = pathname.startsWith(item.path);
        const itemColor = isActive ? colors.primary : colors.textSecondary;
        return (
          <TouchableOpacity
            key={item.name}
            activeOpacity={0.7}
            onPress={() => {
              router.push(item.path as any);
              if (!isWide) setMobileMenuOpen(false);
            }}
            style={[
              styles.navItem,
              {
                backgroundColor: isActive ? colors.surface : "transparent",
                borderColor: isActive ? colors.primary : "transparent",
                borderRadius: borderRadius.md,
                paddingVertical: spacing.sm + 2,
                paddingHorizontal: spacing.md,
              },
            ]}
          >
            <View style={{ marginRight: 12, width: 22, alignItems: "center" }}>
              {item.renderIcon(itemColor)}
            </View>
            <Text
              style={[
                styles.navLabel,
                {
                  color: isActive ? colors.primary : colors.text,
                  fontWeight: isActive
                    ? typography.weights.bold
                    : typography.weights.medium,
                  fontSize: typography.sizes.sm,
                },
              ]}
            >
              {t(item.labelKey, item.fallbackLabel)}
            </Text>
          </TouchableOpacity>
        );
      })}

      {!isWide && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={async () => {
            setMobileMenuOpen(false);
            await logout();
            router.replace("/login");
          }}
          style={[
            styles.navItem,
            {
              backgroundColor: colors.dangerBg,
              borderColor: colors.danger,
              borderRadius: borderRadius.md,
              paddingVertical: spacing.sm + 4,
              paddingHorizontal: spacing.md,
              marginTop: 14,
              marginBottom: 20,
            },
          ]}
        >
          <View style={{ marginRight: 12, width: 22, alignItems: "center" }}>
            <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          </View>
          <Text
            style={{
              color: colors.danger,
              fontWeight: typography.weights.bold,
              fontSize: typography.sizes.sm,
            }}
          >
            Logout (لاگ آؤٹ)
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );

  return (
    <View
      style={[styles.rootContainer, { backgroundColor: colors.background }]}
    >
      {/* Sidebar for Desktop / Laptop / Tablet */}
      {isWide ? (
        <View
          style={[
            styles.sidebar,
            { backgroundColor: colors.card, borderRightColor: colors.border },
          ]}
        >
          <View style={styles.brandHeader}>
            <Image
              source={require("../../assets/logo.png")}
              style={{ width: 38, height: 38, borderRadius: 19 }}
              resizeMode="contain"
            />
            <View style={{ marginLeft: 10 }}>
              <Text
                style={[
                  styles.brandTitle,
                  {
                    color: colors.text,
                    fontSize: typography.sizes.base,
                    fontWeight: typography.weights.bold,
                  },
                ]}
              >
                Al-Barakah Farm
              </Text>
              <Text
                style={{
                  color: colors.primary,
                  fontSize: typography.sizes.xs,
                  fontWeight: typography.weights.semibold,
                }}
              >
                Admin Portal
              </Text>
            </View>
          </View>

          {renderNavList()}

          {/* User profile footer */}
          <View
            style={[styles.sidebarFooter, { borderTopColor: colors.border }]}
          >
            <Text
              style={{
                color: colors.text,
                fontSize: typography.sizes.sm,
                fontWeight: typography.weights.bold,
              }}
            >
              {user?.name || "Farm Owner"}
            </Text>
            <Text
              style={{ color: colors.textMuted, fontSize: typography.sizes.xs }}
            >
              Administrator
            </Text>
            <TouchableOpacity onPress={() => logout()} style={{ marginTop: 8 }}>
              <Text
                style={{
                  color: colors.danger,
                  fontSize: typography.sizes.xs,
                  fontWeight: typography.weights.semibold,
                }}
              >
                Logout
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Main Content Area */}
      <View style={styles.mainContent}>
        {/* Top Navbar */}
        <View
          style={[
            styles.topNavbar,
            {
              backgroundColor: colors.card,
              borderBottomColor: colors.border,
              paddingTop: statusBarHeight,
              height: 56 + statusBarHeight,
            },
          ]}
        >
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              marginRight: 6,
            }}
          >
            {!isWide ? (
              <TouchableOpacity
                onPress={() => setMobileMenuOpen(!mobileMenuOpen)}
                style={{ padding: 6, marginRight: 6 }}
                accessibilityLabel="Navigation menu"
              >
                <Ionicons name="menu-outline" size={24} color={colors.text} />
              </TouchableOpacity>
            ) : null}
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[
                styles.navTitle,
                {
                  flex: 1,
                  color: colors.text,
                  fontSize: isWide
                    ? typography.sizes.md
                    : typography.sizes.sm + 1,
                  fontWeight: typography.weights.bold,
                },
              ]}
            >
              {isWide
                ? "Broiler Farm Management System"
                : "Broiler Farm Manager"}
            </Text>
          </View>

          <View style={styles.topActions}>
            <TouchableOpacity
              onPress={toggleLang}
              style={[
                styles.headerButton,
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
                styles.headerButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Ionicons
                name={mode === "dark" ? "sunny-outline" : "moon-outline"}
                size={16}
                color={colors.text}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ paddingHorizontal: spacing.base }}>
          <SyncStatusBanner />
        </View>

        {/* Mobile menu dropdown */}
        {!isWide && mobileMenuOpen ? (
          <View
            style={[
              styles.mobileMenuDrawer,
              {
                top: 56 + statusBarHeight,
                backgroundColor: colors.card,
                borderColor: colors.border,
                paddingBottom: insets.bottom + 16,
              },
            ]}
          >
            {renderNavList()}

            {/* Mobile Sidebar Footer (Bottom Left Logout) */}
            <View
              style={[
                styles.mobileDrawerFooter,
                { borderTopColor: colors.border },
              ]}
            >
              <View style={{ marginBottom: 10 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    color: colors.text,
                    fontSize: typography.sizes.sm,
                    fontWeight: typography.weights.bold,
                  }}
                >
                  {user?.name || "Farm Owner"}
                </Text>
                <Text
                  style={{
                    color: colors.textMuted,
                    fontSize: typography.sizes.xs,
                  }}
                >
                  Administrator
                </Text>
              </View>

              <TouchableOpacity
                onPress={async () => {
                  setMobileMenuOpen(false);
                  await logout();
                  router.replace("/login");
                }}
                activeOpacity={0.7}
                style={[
                  styles.mobileLogoutBtn,
                  {
                    backgroundColor: colors.dangerBg,
                    borderColor: colors.danger,
                    alignSelf: "flex-start",
                  },
                ]}
              >
                <Ionicons
                  name="log-out-outline"
                  size={18}
                  color={colors.danger}
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={{
                    color: colors.danger,
                    fontSize: typography.sizes.sm,
                    fontWeight: typography.weights.bold,
                  }}
                >
                  Logout (لاگ آؤٹ)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Active Page Content */}
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <Slot />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    flexDirection: "row",
  },
  sidebar: {
    width: 250,
    borderRightWidth: 1,
    paddingTop: 16,
    paddingHorizontal: 12,
  },
  brandHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 6,
  },
  logoIconBg: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {},
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 2,
    borderLeftWidth: 3,
  },
  navLabel: {},
  sidebarFooter: {
    borderTopWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 6,
  },
  mainContent: {
    flex: 1,
  },
  topNavbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  navTitle: {},
  topActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerButton: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginLeft: 8,
  },
  mobileMenuDrawer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    borderBottomWidth: 1,
    padding: 16,
  },
  mobileDrawerFooter: {
    borderTopWidth: 1,
    paddingTop: 14,
    marginTop: 8,
  },
  mobileLogoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
});
