/**
 * How Balagh works — a short, general walkthrough opened from Settings →
 * Support. Four steps: report, community visibility, area status, privacy.
 * (Previously this entry duplicated the Privacy Constitution screen.)
 */

import React from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, MapPin, Radio, Shield, Siren } from '../../core/icons';
import type { IconProps } from '../../core/icons';
import { color, space, radius, shadow, formatNumber } from '../../core/theme/tokens';
import { Text } from '../../core/theme/components';
import { strings } from '../../core/strings';
import { useIsRTL, useLangStore } from '../../domain/stores/lang';
import type { RootStackParamList } from '../../navigation/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<RootStackParamList, 'HowItWorks'>;

const STEP_VISUALS: { Icon: React.ComponentType<IconProps>; tint: string }[] = [
  { Icon: Siren, tint: color.accent },
  { Icon: MapPin, tint: color.reportAccent },
  { Icon: Radio, tint: color.status.watch },
  { Icon: Shield, tint: color.status.calm },
];

const HowItWorksScreen = ({ navigation }: Props): React.ReactElement => {
  const { lang } = useLangStore();
  const s = strings[lang];
  const isRTL = useIsRTL();

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
        <Text variant="heading" style={styles.headerTitle}>{s.howItWorks.title}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {s.howItWorks.steps.map((step, index) => {
          const { Icon, tint } = STEP_VISUALS[index % STEP_VISUALS.length];
          return (
            <View key={step.title} style={styles.card} testID={`how-it-works-step-${index}`}>
              <View style={[styles.iconBadge, { backgroundColor: tint + '14' }]}>
                <Icon size={22} color={tint} />
              </View>
              <View style={styles.cardBody}>
                <View style={styles.cardTitleRow}>
                  <View style={[styles.stepNumber, { backgroundColor: tint }]}>
                    <Text variant="caption" style={styles.stepNumberText}>
                      {formatNumber(index + 1)}
                    </Text>
                  </View>
                  <Text variant="label" style={styles.cardTitle}>{step.title}</Text>
                </View>
                <Text secondary variant="caption" style={styles.cardText}>{step.body}</Text>
              </View>
            </View>
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
  content: {
    padding: space(2),
    paddingBottom: space(8),
    gap: space(1.5),
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space(1.75),
    backgroundColor: color.card,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
    padding: space(2),
    ...shadow.card,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
    gap: space(0.75),
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1),
  },
  stepNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    color: color.textOnAccent,
    fontSize: 11,
    lineHeight: 14,
  },
  cardTitle: { flex: 1 },
  cardText: { lineHeight: 19 },
});

export default HowItWorksScreen;
