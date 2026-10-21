import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { Button } from './Button';

export interface EmptyStateProps {
  title: string;
  description?: string;
  actionTitle?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionTitle,
  onAction,
  icon
}) => {
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={[styles.container, { padding: spacing.xl }]}>
      {icon ? <View style={{ marginBottom: spacing.md }}>{icon}</View> : null}
      <Text
        style={[
          styles.title,
          {
            color: colors.text,
            fontSize: typography.sizes.lg,
            fontWeight: typography.weights.bold
          }
        ]}
      >
        {title}
      </Text>
      {description ? (
        <Text
          style={[
            styles.description,
            {
              color: colors.textSecondary,
              fontSize: typography.sizes.sm,
              marginVertical: spacing.sm
            }
          ]}
        >
          {description}
        </Text>
      ) : null}
      {actionTitle && onAction ? (
        <Button
          title={actionTitle}
          onPress={onAction}
          variant="outline"
          size="sm"
          style={{ marginTop: spacing.md }}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180
  },
  title: {
    textAlign: 'center'
  },
  description: {
    textAlign: 'center',
    maxWidth: 280
  }
});
