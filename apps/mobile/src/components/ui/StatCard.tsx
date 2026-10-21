import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';
import { Card } from './Card';
import { Badge } from './Badge';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  badgeLabel?: string;
  badgeVariant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  icon?: React.ReactNode;
  style?: ViewStyle;
  trend?: 'up' | 'down' | 'neutral';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  badgeLabel,
  badgeVariant = 'neutral',
  icon,
  style
}) => {
  const { colors, spacing, typography } = useTheme();

  return (
    <Card style={style} elevated>
      <View style={styles.header}>
        <Text
          style={[
            styles.title,
            {
              color: colors.textSecondary,
              fontSize: typography.sizes.sm,
              fontWeight: typography.weights.semibold
            }
          ]}
        >
          {title}
        </Text>
        {icon ? <View style={styles.iconWrapper}>{icon}</View> : null}
      </View>

      <Text
        style={[
          styles.value,
          {
            color: colors.text,
            fontSize: typography.sizes.xl,
            fontWeight: typography.weights.heavy,
            marginVertical: spacing.xs
          }
        ]}
      >
        {value}
      </Text>

      <View style={styles.footer}>
        {subtitle ? (
          <Text
            style={[
              styles.subtitle,
              {
                color: colors.textMuted,
                fontSize: typography.sizes.xs,
                fontWeight: typography.weights.medium
              }
            ]}
          >
            {subtitle}
          </Text>
        ) : null}

        {badgeLabel ? (
          <Badge label={badgeLabel} variant={badgeVariant} size="sm" />
        ) : null}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  iconWrapper: {},
  title: {
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  value: {},
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2
  },
  subtitle: {
    flex: 1
  }
});
