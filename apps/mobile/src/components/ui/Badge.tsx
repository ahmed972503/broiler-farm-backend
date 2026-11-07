import React from "react";
import { View, Text, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { useTheme } from "../../theme";

export interface BadgeProps {
  label: string;
  variant?: "success" | "warning" | "danger" | "info" | "neutral";
  size?: "sm" | "md";
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = "neutral",
  size = "md",
  style,
  textStyle,
  testID,
}) => {
  const { colors, spacing, borderRadius, typography } = useTheme();

  const getColors = () => {
    switch (variant) {
      case "success":
        return {
          bg: colors.successBg,
          text: colors.success,
          border: colors.success,
        };
      case "warning":
        return {
          bg: colors.warningBg,
          text: colors.warning,
          border: colors.warning,
        };
      case "danger":
        return {
          bg: colors.dangerBg,
          text: colors.danger,
          border: colors.danger,
        };
      case "info":
        return { bg: colors.infoBg, text: colors.info, border: colors.info };
      case "neutral":
      default:
        return {
          bg: colors.surface,
          text: colors.textSecondary,
          border: colors.border,
        };
    }
  };

  const badgeColors = getColors();

  return (
    <View
      testID={testID}
      style={[
        styles.badge,
        {
          backgroundColor: badgeColors.bg,
          borderColor: badgeColors.border,
          borderRadius: borderRadius.full,
          paddingVertical: size === "sm" ? 2 : spacing.xs,
          paddingHorizontal: size === "sm" ? spacing.sm : spacing.md,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: badgeColors.text,
            fontSize: size === "sm" ? typography.sizes.xs : typography.sizes.sm,
            fontWeight: typography.weights.semibold,
          },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    alignSelf: "flex-start",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {},
});
