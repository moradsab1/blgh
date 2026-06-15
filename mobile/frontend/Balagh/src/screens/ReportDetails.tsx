import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TextInput,
  Pressable,
} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { Text, Button } from '../core/theme/components';
import { color, fontSize, font, space, radius } from '../core/theme/tokens';
import { ChevronLeft, Check, Locate, MapPin } from '../core/icons';
import ArabicLabels from '../presentation/components/ArabicLabels';
import { useLangStore } from '../domain/stores/lang';
import { strings } from '../core/strings';
import { haptics } from '../core/haptics';
import store, { StorageKeys } from '../core/storage';
import { LOCALITIES } from '../data/mock/db';
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

const SNIPPET_STYLE = 'mapbox://styles/mapbox/streets-v12';
const repo = new MockIncidentRepo();

type GpsStatus = 'locating' | 'ok' | 'failed';

// Fallback to the chosen locality's centre when GPS is unavailable, so the
// reporter always starts from a sensible point and can adjust from there.
function localityFallback(): { lat: number; lng: number } {
  const id = store.getString(StorageKeys.LOCALITY_ID);
  const loc = LOCALITIES.find(l => l.id === id) ?? LOCALITIES[0];
  return { lat: loc.lat, lng: loc.lng };
}

export default function ReportDetailsScreen({ navigation, route }: Props): React.ReactElement {
  const { category } = route.params;
  const { lang } = useLangStore();
  const s = strings[lang];

  // Users never type a description — they pick one of the prepared
  // situation descriptions for the chosen category.
  const situations = s.report.situations[category as Category] ?? [];
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ── Editable incident location ──────────────────────────────────────────────
  // GPS is unreliable in the field, so we show the current fix up front and let
  // the reporter correct it: tap the map to move the pin, or type a place note.
  const [coords, setCoords] = useState(() => localityFallback());
  const [cameraCenter, setCameraCenter] = useState(coords);
  const [gps, setGps] = useState<GpsStatus>('locating');
  const [adjusted, setAdjusted] = useState(false);
  const [locationText, setLocationText] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cameraRef = useRef<any>(null);

  const acquireLocation = useCallback(() => {
    setGps('locating');
    getGeoPosition()
      .then(pos => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(next);
        setCameraCenter(next);
        setAdjusted(false);
        setGps('ok');
      })
      .catch(() => setGps('failed'));
  }, []);

  useEffect(() => { acquireLocation(); }, [acquireLocation]);

  const handleMapPress = useCallback((feature: { geometry?: { coordinates?: number[] } }) => {
    const c = feature?.geometry?.coordinates;
    if (Array.isArray(c) && c.length === 2) {
      haptics.impact();
      setCoords({ lat: c[1], lng: c[0] });
      setAdjusted(true);
    }
  }, []);

  const markerGeoJSON = {
    type: 'FeatureCollection' as const,
    features: [
      {
        type: 'Feature' as const,
        properties: {},
        geometry: { type: 'Point' as const, coordinates: [coords.lng, coords.lat] },
      },
    ],
  };

  const handleSubmit = async () => {
    if (submitting || selectedIndex === null) return;
    setSubmitting(true);
    try {
      const { ref } = await repo.submitReport(
        category,
        coords.lat,
        coords.lng,
        situations[selectedIndex],
        locationText,
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

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* ── Location section ────────────────────────────────────────── */}
        <View style={styles.sectionTitleRow}>
          <MapPin size={16} color={color.accent} />
          <Text variant="label">{s.report.location.title}</Text>
        </View>

        <View style={styles.mapCard}>
          <View style={styles.mapWrap} testID="report-location-map">
            <MapboxGL.MapView
              style={StyleSheet.absoluteFill}
              styleURL={SNIPPET_STYLE}
              logoEnabled={false}
              attributionEnabled={false}
              scaleBarEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
              scrollEnabled={false}
              onPress={handleMapPress}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              {...({ compassEnabled: false } as any)}>
              <ArabicLabels />
              <MapboxGL.Camera
                ref={cameraRef}
                centerCoordinate={[cameraCenter.lng, cameraCenter.lat]}
                zoomLevel={15}
                animationDuration={400}
              />
              <MapboxGL.ShapeSource
                id="reportLocationSource"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                shape={markerGeoJSON as any}>
                <MapboxGL.CircleLayer
                  id="reportLocationPin"
                  style={{
                    circleRadius: 9,
                    circleColor: color.accent,
                    circleStrokeWidth: 3,
                    circleStrokeColor: '#FFFFFF',
                  }}
                />
              </MapboxGL.ShapeSource>
            </MapboxGL.MapView>

            {/* Recenter to GPS */}
            <Pressable
              style={styles.myLocationBtn}
              onPress={acquireLocation}
              accessibilityRole="button"
              accessibilityLabel={s.report.location.myLocation}
              testID="report-my-location">
              <Locate size={18} color={color.textPrimary} />
            </Pressable>
          </View>

          <Text
            variant="caption"
            secondary={gps !== 'failed'}
            style={[styles.locationHint, gps === 'failed' && styles.locationHintError]}>
            {gps === 'locating'
              ? s.report.location.locating
              : gps === 'failed'
              ? s.report.location.gpsFailed
              : adjusted
              ? s.report.location.adjusted
              : s.report.location.hint}
          </Text>
        </View>

        <TextInput
          style={styles.locationInput}
          value={locationText}
          onChangeText={setLocationText}
          placeholder={s.report.location.textPlaceholder}
          placeholderTextColor={color.textMuted}
          testID="report-location-input"
        />

        {/* ── Situation picker ────────────────────────────────────────── */}
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
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1),
  },
  mapCard: {
    gap: space(1),
  },
  mapWrap: {
    height: 190,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: color.cardElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
  },
  myLocationBtn: {
    position: 'absolute',
    bottom: space(1),
    right: space(1),
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: color.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
  },
  locationHint: {
    lineHeight: 18,
  },
  locationHintError: {
    color: color.accent,
  },
  locationInput: {
    backgroundColor: color.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    paddingHorizontal: space(1.5),
    minHeight: 48,
    color: color.textPrimary,
    fontFamily: font.arabic,
    fontSize: fontSize.base,
  },
  subtitle: { marginTop: space(1) },
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
