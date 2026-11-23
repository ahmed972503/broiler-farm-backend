import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Platform,
} from "react-native";
import { useTheme } from "../../theme";

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  suffix?: string;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  suffix,
  containerStyle,
  inputStyle,
  helperText,
  onFocus,
  onBlur,
  ...props
}) => {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  return (
    <View
      style={[styles.container, { marginBottom: spacing.md }, containerStyle]}
    >
      {label ? (
        <Text
          style={[
            styles.label,
            {
              color: colors.text,
              fontSize: typography.sizes.sm,
              fontWeight: typography.weights.semibold,
              marginBottom: spacing.xs,
            },
          ]}
        >
          {label}
        </Text>
      ) : null}

      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: colors.card,
            borderColor: error
              ? colors.danger
              : isFocused
              ? colors.primary
              : colors.border,
            borderRadius: borderRadius.md,
            paddingHorizontal: spacing.md,
          },
          props.multiline && {
            minHeight: 80,
            alignItems: "flex-start",
            paddingVertical: spacing.sm,
          },
          Platform.OS === "web" &&
            ({
              transition: "border-color 0.15s ease, box-shadow 0.15s ease",
              ...(isFocused
                ? { boxShadow: `0 0 0 3px ${colors.primary}25` }
                : {}),
            } as any),
        ]}
      >
        <TextInput
          placeholderTextColor={colors.textMuted}
          style={[
            styles.input,
            {
              color: colors.text,
              fontSize: typography.sizes.base,
            },
            props.multiline && {
              minHeight: 60,
              textAlignVertical: "top",
            },
            Platform.OS === "web" &&
              ({
                outlineStyle: "none",
                outlineWidth: 0,
                outlineColor: "transparent",
                borderWidth: 0,
                borderStyle: "none",
                backgroundColor: "transparent",
              } as any),
            inputStyle,
          ]}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        {suffix ? (
          <Text
            style={[
              styles.suffix,
              {
                color: colors.textSecondary,
                fontSize: typography.sizes.sm,
                fontWeight: typography.weights.medium,
                marginLeft: spacing.xs,
              },
            ]}
          >
            {suffix}
          </Text>
        ) : null}
      </View>

      {error ? (
        <Text
          style={[
            styles.errorText,
            {
              color: colors.danger,
              fontSize: typography.sizes.xs,
              marginTop: spacing.xs,
            },
          ]}
        >
          {error}
        </Text>
      ) : helperText ? (
        <Text
          style={[
            styles.helperText,
            {
              color: colors.textMuted,
              fontSize: typography.sizes.xs,
              marginTop: spacing.xs,
            },
          ]}
        >
          {helperText}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  label: {},
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderStyle: "solid",
    minHeight: 48, // Large easy touch target
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 0,
    backgroundColor: "transparent",
  },
  suffix: {},
  errorText: {
    fontWeight: "500",
  },
  helperText: {},
});
