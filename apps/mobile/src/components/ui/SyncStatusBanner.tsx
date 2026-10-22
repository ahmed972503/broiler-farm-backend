import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "../../theme";
import { useSyncStore } from "../../store/useSyncStore";
import { useAuthStore } from "../../store/useAuthStore";
import { API_BASE_URL } from "../../api/client";
import { useTranslation } from "react-i18next";

export const SyncStatusBanner: React.FC = () => {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const { isSyncing, pendingCount, syncError, syncWithServer, lastSyncTime } =
    useSyncStore();
  const { token, user } = useAuthStore();
  const { t } = useTranslation();

  const handleSyncPress = async () => {
    if (token && user) {
      await syncWithServer(API_BASE_URL, token, user.id);
    }
  };

  if (pendingCount === 0 && !isSyncing && !syncError) {
    return (
      <View
        style={[
          styles.syncedBar,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={[styles.dot, { backgroundColor: colors.success }]} />
        <Text
          style={[
            styles.syncedText,
            { color: colors.textSecondary, fontSize: typography.sizes.xs },
          ]}
        >
          {t("worker.syncedNotice")} {lastSyncTime ? `• ${lastSyncTime}` : ""}
        </Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handleSyncPress}
      disabled={isSyncing}
      style={[
        styles.banner,
        {
          backgroundColor: isSyncing
            ? colors.infoBg
            : syncError
              ? colors.dangerBg
              : colors.warningBg,
          borderColor: isSyncing
            ? colors.info
            : syncError
              ? colors.danger
              : colors.warning,
          borderRadius: borderRadius.md,
          marginVertical: spacing.xs,
          padding: spacing.sm,
        },
      ]}
    >
      <View style={styles.content}>
        {isSyncing ? (
          <ActivityIndicator
            size="small"
            color={colors.info}
            style={{ marginRight: spacing.sm }}
          />
        ) : (
          <View
            style={[
              styles.dot,
              {
                backgroundColor: syncError ? colors.danger : colors.warning,
                marginRight: spacing.sm,
              },
            ]}
          />
        )}
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.bannerTitle,
              {
                color: isSyncing
                  ? colors.info
                  : syncError
                    ? colors.danger
                    : colors.warning,
                fontSize: typography.sizes.sm,
                fontWeight: typography.weights.bold,
              },
            ]}
          >
            {isSyncing
              ? t("sync.syncing")
              : syncError
                ? `${syncError} - Tap to retry`
                : `${pendingCount} ${t("sync.pendingChanges")} - Tap to Sync`}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  banner: {
    borderWidth: 1,
    width: "100%",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  bannerTitle: {},
  syncedBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: 6,
    marginVertical: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  syncedText: {
    fontWeight: "500",
  },
});
