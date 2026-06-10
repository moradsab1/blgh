import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  Alert,
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Shield, Globe } from '../../core/icons';
import { color, space, radius, fontSize } from '../../core/theme/tokens';
import { Text } from '../../core/theme/components';
import { haptics } from '../../core/haptics';
import { strings } from '../../core/strings';
import { useLangStore } from '../../domain/stores/lang';
import { OSS_LIBRARIES, GITHUB_URL } from '../../core/oss';
import { APP_VERSION } from '../../core/version';
import type { RootStackParamList } from '../../navigation/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<RootStackParamList, 'About'>;

const AboutScreen = ({ navigation }: Props): React.ReactElement => {
  const { lang } = useLangStore();
  const s = strings[lang];
  const a = s.about;
  const isRTL = I18nManager.isRTL;

  const openGithub = async (): Promise<void> => {
    haptics.press();
    try {
      const canOpen = await Linking.canOpenURL(GITHUB_URL);
      if (canOpen) { await Linking.openURL(GITHUB_URL); return; }
    } catch { /* fall through */ }
    Alert.alert(a.sourceLabel, GITHUB_URL);
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
        <Text variant="heading" style={styles.headerTitle}>{a.title}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Shield size={48} color={color.accent} />
          <Text variant="heading" style={styles.appName}>{a.title}</Text>
          <Text secondary style={styles.tagline}>{a.tagline}</Text>
          <Text muted variant="caption" style={styles.version}>
            {a.versionLabel} {APP_VERSION}
          </Text>
        </View>

        <Text secondary variant="caption" style={styles.sectionHeader}>
          {a.licenseTitle.toUpperCase()}
        </Text>
        <View style={styles.card}>
          <Text variant="label">{a.license}</Text>
          <Text secondary variant="caption" style={styles.cardNote}>{a.licenseNote}</Text>
        </View>

        <Text secondary variant="caption" style={styles.sectionHeader}>
          {a.sourceTitle.toUpperCase()}
        </Text>
        <Pressable
          style={styles.linkRow}
          onPress={openGithub}
          accessibilityRole="link"
          accessibilityLabel={a.sourceLabel}>
          <Globe size={20} color={color.textSecondary} />
          <Text style={styles.linkLabel}>{a.sourceLabel}</Text>
          {isRTL ? (
            <ChevronLeft size={18} color={color.textMuted} />
          ) : (
            <ChevronRight size={18} color={color.textMuted} />
          )}
        </Pressable>

        <Text secondary variant="caption" style={styles.sectionHeader}>
          {a.acknowledgements.toUpperCase()}
        </Text>
        <Text secondary variant="caption" style={styles.ossNote}>{a.ossNote}</Text>
        <View style={styles.ossCard}>
          {OSS_LIBRARIES.map((lib, idx) => (
            <View
              key={lib.name}
              style={[styles.ossRow, idx === OSS_LIBRARIES.length - 1 && styles.ossRowLast]}>
              <Text variant="caption" style={styles.ossName} numberOfLines={1}>{lib.name}</Text>
              <Text muted variant="caption">{lib.license}</Text>
            </View>
          ))}
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
  hero: { alignItems: 'center', gap: space(0.75), paddingVertical: space(3) },
  appName: { fontSize: fontSize.xl },
  tagline: { textAlign: 'center', paddingHorizontal: space(2) },
  version: { marginTop: space(0.5), letterSpacing: 0.5 },
  sectionHeader: {
    paddingTop: space(3),
    paddingBottom: space(1),
    letterSpacing: 0.8,
  },
  card: {
    backgroundColor: color.card,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
    padding: space(2),
    gap: space(0.5),
  },
  cardNote: { lineHeight: fontSize.xs * 1.6 },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2),
    backgroundColor: color.card,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
    paddingHorizontal: space(2),
    minHeight: 56,
  },
  linkLabel: { flex: 1 },
  ossNote: { paddingBottom: space(1), lineHeight: fontSize.xs * 1.6 },
  ossCard: {
    backgroundColor: color.card,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
    overflow: 'hidden',
  },
  ossRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space(2),
    paddingHorizontal: space(2),
    paddingVertical: space(1.25),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.border,
  },
  ossRowLast: { borderBottomWidth: 0 },
  ossName: { flex: 1 },
});

export default AboutScreen;
