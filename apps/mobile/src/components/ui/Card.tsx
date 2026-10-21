import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme';

export interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
  onPress?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, style, elevated = false, onPress }) => {
  const { colors, spacing, borderRadius } = useTheme();

  const cardStyle = [
    styles.card,
    {
      backgroundColor: elevated ? colors.cardElevated : colors.card,
      borderColor: colors.border,
      borderRadius: borderRadius.lg,
      padding: spacing.base
    },
    elevated && styles.shadow,
    style
  ];

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={cardStyle}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    marginVertical: 6,
    width: '100%'
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3
  }
});
