import React, { useState } from 'react';
import {
  View,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Pressable,
} from 'react-native';
import { Text, Button } from '../core/theme/components';
import { color, space, radius, font, fontSize } from '../core/theme/tokens';
import { ChevronLeft } from '../core/icons';
import { useLangStore } from '../domain/stores/lang';
import { strings } from '../core/strings';
import { MockIncidentRepo } from '../data/mock/MockIncidentRepo';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ReportDetails'>;

const MAX_CHARS = 200;

type GeoSuccess = (pos: { coords: { latitude: number; longitude: number } }) => void;
interface GeoLike {
  getCurrentPosition(success: GeoSuccess, error: (err: unknown) => void, opts?: object): void;
}

declare const global: Record<string, unknown>;
const getGeoPosition = (): Promise<{ coords: { latitude: number; longitude: number } }> =>
  new Promise((resolve, reject) => {
    const nav = global?.navigator as Record<string, unknown> | undefined;
    const geo = nav?.geolocation as GeoLike | undefined;
    if (!geo) { reject(new Error('no-geo')); return; }
    geo.getCurrentPosition(resolve, reject, { timeout: 5000, maximumAge: 30000 });
  });

const repo = new MockIncidentRepo();

export default function ReportDetailsScreen({ navigation, route }: Props): React.ReactElement {
  const { category } = route.params;
  const { lang } = useLangStore();
  const s = strings[lang];

  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      let lat = 32.5139;
      let lng = 35.1566;
      try {
        const pos = await getGeoPosition();
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {}
      const { ref } = await repo.submitReport(
        category,
        lat,
        lng,
        description.trim() || undefined,
      );
      navigation.replace('ReportSuccess', { ref });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={color.bg} />
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
          <ChevronLeft size={20} color={color.textPrimary} />
        </Pressable>
        <Text variant="heading" style={styles.headerTitle}>{s.report.detailsTitle}</Text>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              multiline
              maxLength={MAX_CHARS}
              value={description}
              onChangeText={setDescription}
              placeholder={s.report.detailsPlaceholder}
              placeholderTextColor={color.textMuted}
              textAlignVertical="top"
              blurOnSubmit
            />
            <Text variant="caption" muted style={styles.charCount}>
              {description.length} / {MAX_CHARS}
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          {submitting && <ActivityIndicator color={color.accent} size="small" style={styles.spinner} />}
          <Button
            label={submitting ? s.report.submitting : s.report.submit}
            variant="primary"
            fullWidth
            disabled={submitting}
            onPress={handleSubmit}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  flex: { flex: 1 },
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
    paddingHorizontal: space(2),
    paddingTop: space(2),
    paddingBottom: space(3),
  },
  inputContainer: {
    backgroundColor: color.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    padding: space(2),
    minHeight: 140,
  },
  input: {
    color: color.textPrimary,
    fontFamily: font.arabic,
    fontSize: fontSize.base,
    minHeight: 100,
    padding: 0,
  },
  charCount: { textAlign: 'right', marginTop: space(1) },
  footer: {
    padding: space(2),
    paddingBottom: space(3),
    gap: space(1.5),
  },
  spinner: { alignSelf: 'center' },
});
