import React from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  StyleSheet,
  ViewStyle,
  TextStyle
} from 'react-native';
import { useTheme } from '../../theme';

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
  ...props
}) => {
  const { colors, spacing, borderRadius, typography } = useTheme();

  return (
    <View style={[styles.container, { marginBottom: spacing.md }, containerStyle]}>
      {label ? (
        <Text
          style={[
            styles.label,
            {
              color: colors.text,
              fontSize: typography.sizes.sm,
              fontWeight: typography.weights.semibold,
              marginBottom: spacing.xs
            }
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
            borderColor: error ? colors.danger : colors.border,
            borderRadius: borderRadius.md,
            paddingHorizontal: spacing.md
          }
        ]}
      >
        <TextInput
          placeholderTextColor={colors.textMuted}
          style={[
            styles.input,
            {
              color: colors.text,
              fontSize: typography.sizes.base
            },
            inputStyle
          ]}
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
                marginLeft: spacing.xs
              }
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
              marginTop: spacing.xs
            }
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
              marginTop: spacing.xs
            }
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
    width: '100%'
  },
  label: {},
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    minHeight: 48 // Large easy touch target
  },
  input: {
    flex: 1,
    paddingVertical: 10
  },
  suffix: {},
  errorText: {
    fontWeight: '500'
  },
  helperText: {}
});
