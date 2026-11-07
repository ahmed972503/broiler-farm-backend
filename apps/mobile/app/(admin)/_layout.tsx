import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  Platform,
} from "react-native";
import { Slot, useRouter, usePathname } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../src/theme";
import { useAuthStore } from "../../src/store/useAuthStore";
import { useTranslation } from "react-i18next";
import { changeLanguage } from "../../src/i18n";
import { SyncStatusBanner } from "../../src/components/ui";

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
    name: "inventory",
    labelKey: "nav.inventory",
    fallbackLabel: "Inventory",
    renderIcon: (color) => (
      <Ionicons name="cube-outline" size={18} color={color} />
    ),
    path: "/(admin)/inventory",
  },
  {
    name: "expenses",
    labelKey: "nav.expenses",
    fallbackLabel: "Expenses",
    renderIcon: (color) => (
      <Ionicons name="wallet-outline" size={18} color={color} />
    ),
    path: "/(admin)/expenses",
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
    name: "staff",
    labelKey: "nav.staff",
    fallbackLabel: "Staff & Wages",
    renderIcon: (color) => (
      <Ionicons name="people-outline" size={18} color={color} />
    ),
    path: "/(admin)/staff",
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
            <View
              style={[styles.logoIconBg, { backgroundColor: colors.primary }]}
            >
              <MaterialCommunityIcons
                name="shield-home"
                size={20}
                color="#FFFFFF"
              />
            </View>
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
            { backgroundColor: colors.card, borderBottomColor: colors.border },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {!isWide ? (
              <TouchableOpacity
                onPress={() => setMobileMenuOpen(!mobileMenuOpen)}
                style={{ padding: 6, marginRight: 8 }}
              >
                <Ionicons name="menu-outline" size={24} color={colors.text} />
              </TouchableOpacity>
            ) : null}
            <Text
              style={[
                styles.navTitle,
                {
                  color: colors.text,
                  fontSize: typography.sizes.md,
                  fontWeight: typography.weights.bold,
                },
              ]}
            >
              Broiler Farm Management System
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

            {!isWide ? (
              <TouchableOpacity onPress={() => logout()} style={{ padding: 6 }}>
                <Text
                  style={{
                    color: colors.danger,
                    fontSize: 13,
                    fontWeight: "700",
                  }}
                >
                  Exit
                </Text>
              </TouchableOpacity>
            ) : null}
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
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {renderNavList()}
          </View>
        ) : null}

        {/* Active Page Content */}
        <View style={{ flex: 1 }}>
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
    height: 56,
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
    top: 56,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    borderBottomWidth: 1,
    padding: 16,
  },
});
