import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  ActivityIndicator,
  Modal,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TextInput,
  Pressable,
} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { Text, Button } from '../core/theme/components';
import { color, fontSize, font, space, radius, shadow } from '../core/theme/tokens';
import { ChevronLeft, Check, Locate, MapPin, X } from '../core/icons';
import ArabicLabels from '../presentation/components/ArabicLabels';
import { useLangStore } from '../domain/stores/lang';
import { useMapStore } from '../domain/stores/map';
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
    geo.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 });
  });

const SNIPPET_STYLE = 'mapbox://styles/mapbox/streets-v12';
const PREVIEW_ZOOM = 12; // city-level so the reporter sees where they are
const EDIT_ZOOM = 15;    // close enough to drop the pin precisely
const repo = new MockIncidentRepo();

type Coords = { lat: number; lng: number };

// Fallback to the chosen locality's centre when GPS is unavailable.
function localityFallback(): Coords {
  const id = store.getString(StorageKeys.LOCALITY_ID);
  const loc = LOCALITIES.find(l => l.id === id) ?? LOCALITIES[0];
  return { lat: loc.lat, lng: loc.lng };
}

function markerShape(c: Coords) {
  return {
    type: 'FeatureCollection' as const,
    features: [
      {
        type: 'Feature' as const,
        properties: {},
        geometry: { type: 'Point' as const, coordinates: [c.lng, c.lat] },
      },
    ],
  };
}

// Incident pin: severity-accent, slightly translucent so the blue current-
// location puck stays readable underneath when they coincide.
const PIN_STYLE = {
  circleRadius: 10,
  circleColor: color.accent,
  circleOpacity: 0.7,
  circleStrokeWidth: 3,
  circleStrokeColor: '#FFFFFF',
  circleStrokeOpacity: 0.9,
};

export default function ReportDetailsScreen({ navigation, route }: Props): React.ReactElement {
  const { category } = route.params;
  const { lang } = useLangStore();
  const s = strings[lang];

  const situations = s.report.situations[category as Category] ?? [];
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ── Editable incident location ──────────────────────────────────────────────
  // The incident defaults to the user's current location — the same fix the
  // home map already holds in the map store — so it shows immediately even if a
  // fresh getCurrentPosition is slow or unavailable. GPS can be wrong, so the
  // reporter can adjust the pin; there is no "failed to locate" state.
  const { userLat, userLng, locationGranted, setUserLocation } = useMapStore();
  const [coords, setCoords] = useState<Coords>(() =>
    userLat != null && userLng != null ? { lat: userLat, lng: userLng } : localityFallback());
  const [cameraCenter, setCameraCenter] = useState<Coords>(coords);
  const [adjusted, setAdjusted] = useState(false);
  const [locationText, setLocationText] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorCameraRef = useRef<any>(null);

  // Mirror `adjusted` in a ref so the live-location listener reads the latest
  // value without re-subscribing.
  const adjustedRef = useRef(false);
  useEffect(() => { adjustedRef.current = adjusted; }, [adjusted]);

  // Snap the incident pin onto the EXACT current location — the same source
  // Mapbox renders the blue puck from — so the red pin sits precisely on the
  // blue puck, not merely near it. Tracking continues until the reporter moves
  // the pin manually.
  const applyLiveLocation = useCallback(
    (loc: { coords?: { latitude: number; longitude: number } } | null) => {
      const c = loc?.coords;
      if (!c || adjustedRef.current) return;
      const next = { lat: c.latitude, lng: c.longitude };
      setCoords(next);
      setCameraCenter(next);
      setUserLocation(next.lat, next.lng);
    },
    [setUserLocation],
  );

  useEffect(() => {
    // Prefer Mapbox's location manager (the puck's own source) so the pin
    // matches the puck exactly; fall back to a one-shot GPS read otherwise.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lm: any = (MapboxGL as any).locationManager;
    if (lm?.addListener) {
      try { lm.start?.(); } catch { /* no-op */ }
      lm.getLastKnownLocation?.().then(applyLiveLocation).catch(() => {});
      lm.addListener(applyLiveLocation);
      return () => { try { lm.removeListener?.(applyLiveLocation); } catch { /* no-op */ } };
    }
    getGeoPosition().then(applyLiveLocation).catch(() => {});
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "My location" button: resume live tracking and snap to the current fix now.
  const recenterToCurrent = useCallback(() => {
    setAdjusted(false);
    adjustedRef.current = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lm: any = (MapboxGL as any).locationManager;
    if (lm?.getLastKnownLocation) {
      lm.getLastKnownLocation().then(applyLiveLocation).catch(() => {});
    } else {
      getGeoPosition().then(applyLiveLocation).catch(() => {});
    }
  }, [applyLiveLocation]);

  const openEditor = useCallback(() => {
    haptics.toggle();
    setCameraCenter(coords); // editor opens centered on the current pin
    setEditorOpen(true);
  }, [coords]);

  const closeEditor = useCallback(() => {
    setCameraCenter(coords); // preview re-centers on the chosen pin
    setEditorOpen(false);
  }, [coords]);

  // Tap on the editor map moves the pin; the camera stays put.
  const handleMapPress = useCallback((feature: { geometry?: { coordinates?: number[] } }) => {
    const c = feature?.geometry?.coordinates;
    if (Array.isArray(c) && c.length === 2) {
      haptics.impact();
      setCoords({ lat: c[1], lng: c[0] });
      setAdjusted(true);
    }
  }, []);

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
        {/* ── Location preview (tap to open the editor) ───────────────── */}
        <View style={styles.sectionTitleRow}>
          <MapPin size={16} color={color.accent} />
          <Text variant="label">{s.report.location.title}</Text>
        </View>

        <View style={styles.previewWrap}>
          <MapboxGL.MapView
            style={StyleSheet.absoluteFill}
            styleURL={SNIPPET_STYLE}
            logoEnabled={false}
            attributionEnabled={false}
            scaleBarEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            scrollEnabled={false}
            zoomEnabled={false}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            {...({ compassEnabled: false } as any)}>
            <ArabicLabels />
            <MapboxGL.Camera
              centerCoordinate={[cameraCenter.lng, cameraCenter.lat]}
              zoomLevel={PREVIEW_ZOOM}
              animationDuration={400}
            />
            {locationGranted && <MapboxGL.LocationPuck />}
            <MapboxGL.ShapeSource id="reportPreviewSource" shape={markerShape(coords)}>
              <MapboxGL.CircleLayer id="reportPreviewPin" style={PIN_STYLE} />
            </MapboxGL.ShapeSource>
          </MapboxGL.MapView>

          {/* Transparent overlay makes the whole preview open the editor. */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={openEditor}
            accessibilityRole="button"
            accessibilityLabel={s.report.location.tapToChange}
            testID="report-location-preview"
          />
        </View>

        {/* Note under the map. */}
        <Text variant="caption" secondary style={styles.note}>
          {s.report.location.tapToChange}
        </Text>

        {locationText.trim() ? (
          <View style={styles.placeRow}>
            <MapPin size={13} color={color.textSecondary} />
            <Text variant="caption" secondary style={styles.placeText}>{locationText.trim()}</Text>
          </View>
        ) : null}

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

      {/* ── Location editor (bigger card) ───────────────────────────── */}
      {editorOpen && (
        <Modal visible transparent animationType="slide" onRequestClose={closeEditor}>
          <Pressable style={styles.editorBackdrop} onPress={closeEditor} testID="report-location-backdrop" />
          <View style={styles.editorSheet}>
            <View style={styles.editorHandle} />
            <View style={styles.editorTitleRow}>
              <Text variant="heading">{s.report.location.title}</Text>
              <Pressable onPress={closeEditor} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={20} color={color.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.editorMapWrap} testID="report-location-map">
              <MapboxGL.MapView
                style={StyleSheet.absoluteFill}
                styleURL={SNIPPET_STYLE}
                logoEnabled={false}
                attributionEnabled={false}
                scaleBarEnabled={false}
                rotateEnabled={false}
                pitchEnabled={false}
                onPress={handleMapPress}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                {...({ compassEnabled: false } as any)}>
                <ArabicLabels />
                <MapboxGL.Camera
                  ref={editorCameraRef}
                  centerCoordinate={[cameraCenter.lng, cameraCenter.lat]}
                  zoomLevel={EDIT_ZOOM}
                  animationDuration={400}
                />
                {locationGranted && <MapboxGL.LocationPuck />}
                <MapboxGL.ShapeSource id="reportEditorSource" shape={markerShape(coords)}>
                  <MapboxGL.CircleLayer id="reportEditorPin" style={PIN_STYLE} />
                </MapboxGL.ShapeSource>
              </MapboxGL.MapView>

              <Pressable
                style={styles.myLocationBtn}
                onPress={recenterToCurrent}
                accessibilityRole="button"
                accessibilityLabel={s.report.location.myLocation}
                testID="report-my-location">
                <Locate size={18} color={color.textPrimary} />
              </Pressable>
            </View>

            <Text variant="caption" secondary style={styles.editorHint}>
              {adjusted ? s.report.location.adjusted : s.report.location.editHint}
            </Text>

            <TextInput
              style={styles.locationInput}
              value={locationText}
              onChangeText={setLocationText}
              placeholder={s.report.location.textPlaceholder}
              placeholderTextColor={color.textMuted}
              testID="report-location-input"
            />

            <Button
              label={s.report.location.done}
              variant="primary"
              fullWidth
              onPress={closeEditor}
              style={styles.editorDone}
              testID="report-location-done"
            />
          </View>
        </Modal>
      )}
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
    gap: space(1),
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1),
  },
  previewWrap: {
    height: 150,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: color.cardElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
  },
  note: { lineHeight: 18 },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  placeText: { flex: 1, lineHeight: 18 },
  subtitle: { marginTop: space(1.5) },
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

  // ── Editor modal ──
  editorBackdrop: {
    flex: 1,
    backgroundColor: color.scrim,
  },
  editorSheet: {
    backgroundColor: color.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: space(2),
    paddingBottom: space(3),
    paddingTop: space(1),
    ...shadow.float,
  },
  editorHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: color.border,
    marginBottom: space(1.5),
  },
  editorTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space(1.5),
  },
  editorMapWrap: {
    height: 320,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: color.cardElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
  },
  myLocationBtn: {
    position: 'absolute',
    bottom: space(1.5),
    right: space(1.5),
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: color.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
    ...shadow.float,
  },
  editorHint: {
    textAlign: 'center',
    lineHeight: 18,
    marginTop: space(1),
  },
  locationInput: {
    backgroundColor: color.cardElevated,
    borderRadius: radius.md,
    paddingHorizontal: space(1.5),
    minHeight: 48,
    marginTop: space(1.5),
    color: color.textPrimary,
    fontFamily: font.arabic,
    fontSize: fontSize.base,
  },
  editorDone: {
    marginTop: space(1.5),
  },
});
