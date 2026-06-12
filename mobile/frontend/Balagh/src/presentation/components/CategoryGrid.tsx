import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from '../../core/theme/components';
import { color, radius, shadow, space } from '../../core/theme/tokens';
import { CATEGORY_ICON } from '../../core/icons';
import type { Category } from '../../core/types';
import { useLangStore } from '../../domain/stores/lang';
import { strings } from '../../core/strings';

const SEVERITY_TINT: Record<Category, string> = {
  GUNFIRE: color.severity.critical,
  STABBING: color.severity.critical,
  ASSAULT: color.severity.high,
  ROBBERY: color.severity.high,
  SUSPICIOUS: color.severity.medium,
  OTHER: color.severity.medium,
};

const CATEGORIES: Category[] = ['GUNFIRE', 'STABBING', 'ASSAULT', 'ROBBERY', 'SUSPICIOUS', 'OTHER'];

interface Props {
  onSelect: (category: Category) => void;
}

export function CategoryGrid({ onSelect }: Props): React.ReactElement {
  const { lang } = useLangStore();
  const s = strings[lang];

  return (
    <View style={styles.grid}>
      {CATEGORIES.map(cat => {
        const Icon = CATEGORY_ICON[cat];
        const tint = SEVERITY_TINT[cat];
        return (
          <Pressable
            key={cat}
            style={({ pressed }) => [
              styles.card,
              pressed && { borderColor: tint, transform: [{ scale: 0.97 }] },
            ]}
            onPress={() => onSelect(cat)}
            accessibilityRole="button"
            accessibilityLabel={s.category[cat]}>
            <View style={[styles.iconBadge, { backgroundColor: tint + '14' }]}>
              <Icon size={28} color={tint} />
            </View>
            <Text variant="label" style={styles.cardLabel}>
              {s.category[cat]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space(1.5),
  },
  card: {
    width: '47%',
    backgroundColor: color.card,
    borderWidth: 1.5,
    borderColor: color.border,
    borderRadius: radius.lg,
    paddingVertical: space(2.5),
    paddingHorizontal: space(2),
    alignItems: 'center',
    gap: space(1.5),
    minHeight: 124,
    justifyContent: 'center',
    ...shadow.card,
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    textAlign: 'center',
    color: color.textPrimary,
  },
});
