import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  LayoutAnimation,
  Platform,
  UIManager,
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Shield, Check } from '../../core/icons';
import { color, space, radius, fontSize } from '../../core/theme/tokens';
import { Text } from '../../core/theme/components';
import { haptics } from '../../core/haptics';
import { strings } from '../../core/strings';
import { useLangStore } from '../../domain/stores/lang';
import { getReduceMotion } from '../../core/a11y/useReduceMotion';
import type { RootStackParamList } from '../../navigation/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<RootStackParamList, 'PrivacyConstitution'>;

// Stable ordering of the seven covenants — matches the keys in strings.constitution.rules.
const RULE_KEYS = [
  'noPersonalData',
  'noAuthorities',
  'anonymous',
  'onDevice',
  'minimalPermissions',
  'noSound',
  'openSource',
] as const;

type RuleKey = (typeof RULE_KEYS)[number];

// LayoutAnimation needs an explicit opt-in on old-arch Android; harmless on Fabric/iOS.
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PrivacyConstitutionScreen = ({ navigation }: Props): React.ReactElement => {
  const { lang } = useLangStore();
  const s = strings[lang];
  const c = s.constitution;
  const isRTL = I18nManager.isRTL;

  const [expanded, setExpanded] = useState<RuleKey | null>(null);

  const toggle = (key: RuleKey): void => {
    haptics.press();
    if (!getReduceMotion()) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setExpanded(prev => (prev === key ? null : key));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel={s.common.back}>
          {isRTL ? (
            <ChevronRight size={24} color={color.textPrimary} />
          ) : (
            <ChevronLeft size={24} color={color.textPrimary} />
          )}
        </Pressable>
        <Text variant="heading" style={styles.headerTitle}>{c.title}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <Shield size={32} />
          <View style={styles.introBadge}>
            <Text variant="caption" style={styles.introBadgeText}>{c.updatedBadge}</Text>
          </View>
        </View>
        <Text secondary style={styles.subtitle}>{c.subtitle}</Text>

        {RULE_KEYS.map((key) => {
          const rule = c.rules[key];
          const isOpen = expanded === key;
          return (
            <Pressable
              key={key}
              style={styles.card}
              onPress={() => toggle(key)}
              accessibilityRole="button"
              accessibilityState={{ expanded: isOpen }}
              accessibilityLabel={rule.title}>
              <View style={styles.cardHead}>
                <View style={styles.cardNumber}>
                  <Check size={14} color={color.success} />
                </View>
                <Text variant="label" style={styles.cardTitle}>{rule.title}</Text>
                <View style={[styles.caret, isOpen && styles.caretOpen]}>
                  <ChevronLeft
                    size={16}
                    color={isOpen ? color.accent : color.textMuted}
                  />
                </View>
              </View>
              {isOpen && (
                <View style={styles.cardBody}>
                  <Text secondary variant="caption" style={styles.ensureLabel}>
                    {c.howWeEnsure}
                  </Text>
                  <Text style={styles.ensureText}>{rule.ensure}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space(2),
    paddingVertical: space(1.5),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.border,
  },
  backBtn: { minWidth: 44, minHeight: 44, justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center' },
  headerRight: { minWidth: 44 },
  content: { padding: space(2), paddingBottom: space(8), gap: space(1.25) },
  intro: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: space(1),
    gap: space(1),
  },
  introBadge: {
    backgroundColor: color.success + '22',
    borderRadius: radius.pill,
    paddingHorizontal: space(1.5),
    paddingVertical: 4,
  },
  introBadgeText: { color: color.success, letterSpacing: 0.5 },
  subtitle: { textAlign: 'center', marginBottom: space(1), paddingHorizontal: space(2) },
  card: {
    backgroundColor: color.card,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
    paddingHorizontal: space(2),
    paddingVertical: space(1.5),
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: space(1.5) },
  cardNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: color.success + '1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { flex: 1 },
  caret: { transform: [{ rotate: '-90deg' }] },
  caretOpen: { transform: [{ rotate: '90deg' }] },
  cardBody: {
    marginTop: space(1.5),
    paddingTop: space(1.5),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border,
    gap: space(0.75),
  },
  ensureLabel: { letterSpacing: 0.3 },
  ensureText: { lineHeight: fontSize.base * 1.6 },
});

export default PrivacyConstitutionScreen;
