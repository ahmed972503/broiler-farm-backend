import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { useTheme } from '../../src/theme';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../../src/i18n';
import { SyncStatusBanner } from '../../src/components/ui';

export default function WorkerLayout() {
  const { colors, typography, spacing, mode, toggleTheme } = useTheme();
  const { user, logout } = useAuthStore();
  const { t, i18n } = useTranslation();
  const router = useRouter();

  const toggleLang = () => {
    changeLanguage(i18n.language === 'ur' ? 'en' : 'ur');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Top Worker App Header */}
      <View style={[styles.topHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.shedBadge, { color: colors.primary, fontSize: typography.sizes.xs, fontWeight: typography.weights.bold }]}>
            {user?.shed?.name || `SHED ${user?.assignedShedId ? 'ASSIGNED' : '5'}`}
          </Text>
          <Text style={[styles.workerName, { color: colors.text, fontSize: typography.sizes.md, fontWeight: typography.weights.bold }]}>
            {user?.name || 'Worker'}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={toggleLang}
            style={[styles.actionChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Text style={{ color: colors.text, fontSize: typography.sizes.xs, fontWeight: typography.weights.bold }}>
              {i18n.language === 'ur' ? 'EN' : 'اردو'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={toggleTheme}
            style={[styles.actionChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Text style={{ fontSize: 13 }}>{mode === 'dark' ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => logout()}
            style={[styles.logoutButton, { backgroundColor: colors.dangerBg, borderColor: colors.danger }]}
          >
            <Text style={{ color: colors.danger, fontSize: typography.sizes.xs, fontWeight: typography.weights.bold }}>
              Logout
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ paddingHorizontal: spacing.base }}>
        <SyncStatusBanner />
      </View>

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            height: 60,
            paddingBottom: 8,
            paddingTop: 6
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: {
            fontSize: typography.sizes.xs,
            fontWeight: typography.weights.semibold
          }
        }}
      >
        <Tabs.Screen
          name="today"
          options={{
            title: t('nav.today'),
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🏠</Text>
          }}
        />
        <Tabs.Screen
          name="daily-entry"
          options={{
            title: t('worker.addDailyEntry'),
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>📝</Text>
          }}
        />
        <Tabs.Screen
          name="vaccinations"
          options={{
            title: t('nav.vaccinations'),
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>💉</Text>
          }}
        />
        <Tabs.Screen
          name="weight"
          options={{
            title: t('nav.weights'),
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>⚖️</Text>
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'Khata',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>📋</Text>
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1
  },
  shedBadge: {
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  workerName: {
    marginTop: 2
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  actionChip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginLeft: 6
  },
  logoutButton: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginLeft: 6
  }
});
