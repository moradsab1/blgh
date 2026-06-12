import React, { useState } from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Pressable,
} from 'react-native';
import { Text, Button } from '../core/theme/components';
import { color, space, radius } from '../core/theme/tokens';
import { ChevronLeft, Check } from '../core/icons';
import { useLangStore } from '../domain/stores/lang';
import { strings } from '../core/strings';
import { haptics } from '../core/haptics';
import { MockIncidentRepo } from '../data/mock/MockIncidentRepo';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import type { Category } from '../core/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ReportDetails'>;

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

  // Users never type a description — they pick one of the prepared
  // situation descriptions for the chosen category.
  const situations = s.report.situations[category as Category] ?? [];
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (submitting || selectedIndex === null) return;
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
        situations[selectedIndex],
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

      <ScrollView contentContainerStyle={styles.content}>
        <Text secondary style={styles.subtitle}>{s.report.situationSubtitle}</Text>
        {situations.map((situation, index) => {
          const selected = selectedIndex === index;
          return (
            <Pressable
              key={situation}
              style={[styles.option, selected && styles.optionSelected]}
              onPress={() => {
                haptics.toggle();
                setSelectedIndex(index);
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              testID={`situation-option-${index}`}>
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected && <Check size={14} color={color.textOnAccent} />}
              </View>
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                {situation}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        {submitting && <ActivityIndicator color={color.accent} size="small" style={styles.spinner} />}
        <Button
          label={submitting ? s.report.submitting : s.report.submit}
          variant="primary"
          fullWidth
          disabled={submitting || selectedIndex === null}
          onPress={handleSubmit}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
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
    gap: space(1.5),
  },
  subtitle: { textAlign: 'center', marginBottom: space(0.5) },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1.5),
    backgroundColor: color.card,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: color.border,
    padding: space(2),
    minHeight: 56,
  },
  optionSelected: {
    borderColor: color.accent,
    backgroundColor: color.accent + '0D',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: color.border,
    backgroundColor: color.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: color.accent,
    backgroundColor: color.accent,
  },
  optionText: {
    flex: 1,
    color: color.textPrimary,
    lineHeight: 22,
  },
  optionTextSelected: {
    color: color.textPrimary,
  },
  footer: {
    padding: space(2),
    paddingBottom: space(3),
    gap: space(1.5),
  },
  spinner: { alignSelf: 'center' },
});
