/**
 * About — general info only: logo, app name, tagline, mission paragraph,
 * and the version. The source-repository link and the open-source library
 * list were removed from the product.
 */

import React from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Shield } from '../../core/icons';
import { color, space, radius, shadow, fontSize } from '../../core/theme/tokens';
import { Text } from '../../core/theme/components';
import { strings } from '../../core/strings';
import { useIsRTL, useLangStore } from '../../domain/stores/lang';
import { APP_VERSION } from '../../core/version';
import type { RootStackParamList } from '../../navigation/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<RootStackParamList, 'About'>;

const AboutScreen = ({ navigation }: Props): React.ReactElement => {
  const { lang } = useLangStore();
  const s = strings[lang];
  const a = s.about;
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
        <Text variant="heading" style={styles.headerTitle}>{a.title}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.logoBadge}>
            <Shield size={40} color={color.accent} />
          </View>
          <Text variant="heading" style={styles.appName}>{a.title}</Text>
          <Text secondary style={styles.tagline}>{a.tagline}</Text>
          <View style={styles.versionPill}>
            <Text muted variant="caption" style={styles.version}>
              {a.versionLabel} {APP_VERSION}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text secondary style={styles.mission}>{a.mission}</Text>
        </View>
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
  content: { padding: space(2), paddingBottom: space(8) },
  hero: { alignItems: 'center', gap: space(1), paddingVertical: space(4) },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    backgroundColor: color.accent + '14',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space(0.5),
  },
  appName: { fontSize: fontSize.xl },
  tagline: { textAlign: 'center', paddingHorizontal: space(2) },
  versionPill: {
    backgroundColor: color.cardElevated,
    borderRadius: radius.pill,
    paddingHorizontal: space(1.5),
    paddingVertical: space(0.5),
    marginTop: space(0.5),
  },
  version: { letterSpacing: 0.5 },
  card: {
    backgroundColor: color.card,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
    padding: space(2.5),
    ...shadow.card,
  },
  mission: {
    lineHeight: 24,
    textAlign: 'center',
  },
});

export default AboutScreen;
