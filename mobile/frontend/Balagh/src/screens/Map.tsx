/**
 * Map screen — §5.5 – §5.9  Main Map Dashboard
 *
 * Full-bleed Mapbox map with:
 *  - Clustered incident pins (ShapeSource + CircleLayer/SymbolLayer)
 *  - Pulse ring on the highest-priority active incident
 *  - Safety status pill (top-left)
 *  - Floating toolbar (top-right): Inbox + Settings
 *  - Recenter FAB (bottom-right)
 *  - Bottom action tray: Feed pill + Report FAB
 *  - IncidentDetailSheet (slide-up from bottom)
 *  - LocationPermissionOverlay (Modal, first-launch only)
 *  - Live updates via wsEventEmitter
 *  - Offline tile pack download
 *  - Geo-watching when permission granted
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Dimensions,
  Linking,
  Modal,
  PermissionsAndroid,
  Platform,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapboxGL from '@rnmapbox/maps';

import type { MapProps } from '../navigation/types';
import { color, fontSize, font, motion, radius, space } from '../core/theme/tokens';
import { Text, SeverityPill } from '../core/theme/components';
import { useReduceMotion } from '../core/a11y/useReduceMotion';
import { haptics } from '../core/haptics';
import { strings } from '../core/strings';
import { useLangStore } from '../domain/stores/lang';
import { useMapStore } from '../domain/stores/map';
import { computeStatus, haversineKm } from '../domain/status';
import { db, LOCALITIES } from '../data/mock/db';
import { wsEventEmitter, startMockEmitter, stopMockEmitter } from '../data/mock/eventEmitter';
import store, { StorageKeys } from '../core/storage';
import type { Incident, SafetyState } from '../core/types';

// ── Constants ─────────────────────────────────────────────────────────────────

const MAPBOX_DARK_STYLE = 'mapbox://styles/mapbox/dark-v11';
const INITIAL_ZOOM = 13;
const USER_ZOOM = 14;
const CLUSTER_RADIUS = 50;
const CLUSTER_MAX_ZOOM = 14;
const OFFLINE_DELTA = 0.15; // degrees of lat/lng around locality
const OFFLINE_MIN_ZOOM = 10;
const OFFLINE_MAX_ZOOM = 16;
const NEW_ANIM_DURATION = 320; // ms — how long "new" pin animation lasts
const RESOLVE_FADE_DURATION = 30_000; // 30 s fade-out for resolving pins
const PULSE_INTERVAL = 800; // ms toggle for pulse ring

const CATEGORY_LABELS_AR: Record<string, string> = {
  GUNFIRE: 'إطلاق نار',
  STABBING: 'طعن',
  ASSAULT: 'اعتداء',
  ROBBERY: 'سطو',
  SUSPICIOUS: 'مشبوه',
  OTHER: 'أخرى',
};

const SEVERITY_ORDER: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

// Mapbox expression-safe numeric severity level for cluster maxSeverity property
function severityLevel(s: string): number {
  return SEVERITY_ORDER[s] ?? 0;
}

function timeAgoAr(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff} ث`;
  if (diff < 3600) return `${Math.floor(diff / 60)} د`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} س`;
  return `${Math.floor(diff / 86400)} ي`;
}

// Default locality if StorageKeys.LOCALITY_ID not set
const DEFAULT_LOCALITY = LOCALITIES.find(l => l.id === 'umm-al-fahm') ?? LOCALITIES[0];

// ── LocationPermissionOverlay ─────────────────────────────────────────────────

interface LocationPermOverlayProps {
  visible: boolean;
  onContinue: () => void;
  onSkip: () => void;
}

const LocationPermissionOverlay = ({
  visible,
  onContinue,
  onSkip,
}: LocationPermOverlayProps): React.ReactElement => (
  <Modal
    visible={visible}
    animationType="fade"
    transparent
    statusBarTranslucent>
    <View style={ovStyles.backdrop}>
      <View style={ovStyles.card}>
        {/* Shield icon */}
        <Text style={ovStyles.icon}>🛡️</Text>

        {/* Title */}
        <Text style={ovStyles.title}>الموقع الجغرافي</Text>

        {/* Explanation */}
        <Text style={ovStyles.body}>
          لعرض الحوادث القريبة منك على الخريطة
        </Text>

        {/* Bullet points */}
        <View style={ovStyles.bullets}>
          <Text style={ovStyles.bullet}>• أثناء استخدام التطبيق فقط</Text>
          <Text style={ovStyles.bullet}>• لن يُتتبَّع موقعك في الخلفية</Text>
          <Text style={ovStyles.bullet}>• لا مشاركة مع الشرطة أو أي جهة رسمية</Text>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={ovStyles.primaryBtn}
          onPress={onContinue}
          activeOpacity={0.8}>
          <Text style={ovStyles.primaryBtnText}>متابعة</Text>
        </TouchableOpacity>

        {/* Skip */}
        <TouchableOpacity
          style={ovStyles.ghostBtn}
          onPress={onSkip}
          activeOpacity={0.7}>
          <Text style={ovStyles.ghostBtnText}>ليس الآن</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const ovStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(11,18,32,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space(3),
  },
  card: {
    backgroundColor: color.card,
    borderRadius: radius.xl,
    padding: space(3),
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
  },
  icon: {
    fontSize: 56,
    marginBottom: space(2),
  },
  title: {
    fontSize: fontSize.xl,
    fontFamily: font.arabicBold,
    color: color.textPrimary,
    marginBottom: space(1),
    textAlign: 'center',
  },
  body: {
    fontSize: fontSize.base,
    fontFamily: font.arabic,
    color: color.textSecondary,
    textAlign: 'center',
    marginBottom: space(2),
  },
  bullets: {
    alignSelf: 'stretch',
    gap: 6,
    marginBottom: space(3),
  },
  bullet: {
    fontSize: fontSize.sm,
    fontFamily: font.arabic,
    color: color.textSecondary,
    textAlign: 'right',
  },
  primaryBtn: {
    backgroundColor: color.accent,
    borderRadius: radius.md,
    paddingVertical: space(1.5),
    width: '100%',
    alignItems: 'center',
    marginBottom: space(1),
    minHeight: 48,
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: fontSize.base,
    fontFamily: font.arabicSemiBold,
    color: color.textPrimary,
  },
  ghostBtn: {
    paddingVertical: space(1),
    width: '100%',
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  ghostBtnText: {
    fontSize: fontSize.sm,
    fontFamily: font.arabic,
    color: color.textSecondary,
  },
});

// ── IncidentDetailSheet ───────────────────────────────────────────────────────

interface DetailSheetProps {
  incident: Incident | null;
  onClose: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = 320;

const IncidentDetailSheet = ({
  incident,
  onClose,
}: DetailSheetProps): React.ReactElement | null => {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (incident) {
      // Slide up
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: reduceMotion ? motion.instant : motion.base,
        useNativeDriver: true,
      }).start();
    } else {
      // Slide down
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: reduceMotion ? motion.instant : motion.fast,
        useNativeDriver: true,
      }).start();
    }
  }, [incident, reduceMotion, slideAnim]);

  if (!incident) return null;

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SHEET_HEIGHT, 0],
  });

  return (
    <>
      {/* Dim backdrop */}
      <Pressable
        style={dsStyles.backdrop}
        onPress={onClose}
        accessibilityLabel="إغلاق التفاصيل"
      />
      <Animated.View
        style={[dsStyles.sheet, { transform: [{ translateY }] }]}
        testID="incident-detail-sheet">
        {/* Close button */}
        <TouchableOpacity
          style={dsStyles.closeBtn}
          onPress={onClose}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={dsStyles.closeBtnText}>×</Text>
        </TouchableOpacity>

        {/* Severity pill + category */}
        <View style={dsStyles.row}>
          <SeverityPill
            severity={incident.severity}
            label={CATEGORY_LABELS_AR[incident.category] ?? incident.category}
          />
          <Text style={dsStyles.timeAgo}>{timeAgoAr(incident.createdAt)}</Text>
        </View>

        {/* Description */}
        {incident.description ? (
          <Text style={dsStyles.description}>{incident.description}</Text>
        ) : null}

        {/* Ref code */}
        <Text style={dsStyles.ref}>{incident.ref}</Text>

        {/* Votes */}
        <View style={dsStyles.votesRow}>
          <Text style={dsStyles.voteText}>✓ {incident.confirmations}</Text>
          <Text style={dsStyles.voteText}>✗ {incident.denials}</Text>
        </View>

        {/* Coming-soon note */}
        <Text style={dsStyles.note}>تفاصيل كاملة في الإصدار القادم</Text>
      </Animated.View>
    </>
  );
};

const dsStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: color.cardElevated,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: space(3),
    paddingTop: space(2),
  },
  closeBtn: {
    position: 'absolute',
    top: space(1.5),
    left: space(2),
    zIndex: 10,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 24,
    color: color.textSecondary,
    lineHeight: 28,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space(1.5),
    marginTop: space(1),
  },
  timeAgo: {
    fontSize: fontSize.sm,
    fontFamily: font.arabic,
    color: color.textMuted,
  },
  description: {
    fontSize: fontSize.base,
    fontFamily: font.arabic,
    color: color.textPrimary,
    marginBottom: space(1.5),
    lineHeight: fontSize.base * 1.6,
    textAlign: 'right',
  },
  ref: {
    fontSize: fontSize.sm,
    fontFamily: font.mono,
    color: color.textMuted,
    marginBottom: space(1),
  },
  votesRow: {
    flexDirection: 'row',
    gap: space(2),
    marginBottom: space(1.5),
  },
  voteText: {
    fontSize: fontSize.sm,
    fontFamily: font.arabic,
    color: color.textSecondary,
  },
  note: {
    fontSize: fontSize.xs,
    fontFamily: font.arabic,
    color: color.textMuted,
    textAlign: 'center',
    marginTop: 'auto',
  },
});

// ── GeoJSON builder ───────────────────────────────────────────────────────────

interface IncidentFeatureProps {
  opacity: number;
  severityLevel: number;
  severity: string;
}

function buildGeoJSON(
  incidents: Incident[],
  newIds: Map<string, number>,
  resolvingIds: Map<string, number>,
  now: number,
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = incidents.map(inc => {
    let opacity = 1;

    if (newIds.has(inc.id)) {
      // Scale-in: 0→1 over NEW_ANIM_DURATION ms
      const elapsed = now - (newIds.get(inc.id) ?? now);
      opacity = Math.min(1, elapsed / NEW_ANIM_DURATION);
    }

    if (resolvingIds.has(inc.id)) {
      // Fade-out: 1→0 over RESOLVE_FADE_DURATION ms
      const resolveAt = resolvingIds.get(inc.id) ?? now;
      const elapsed = now - resolveAt;
      opacity = Math.max(0, 1 - elapsed / RESOLVE_FADE_DURATION);
    }

    const props: IncidentFeatureProps = {
      opacity,
      severityLevel: severityLevel(inc.severity),
      severity: inc.severity,
    };

    return {
      type: 'Feature',
      id: inc.id,
      geometry: {
        type: 'Point',
        coordinates: [inc.lng, inc.lat],
      },
      properties: props,
    };
  });

  return { type: 'FeatureCollection', features };
}

// Highest-priority active incident for pulse ring
function highestPriorityIncident(incidents: Incident[]): Incident | null {
  const active = incidents.filter(i => !i.resolvedAt);
  if (active.length === 0) return null;
  return active.reduce((best, cur) =>
    severityLevel(cur.severity) > severityLevel(best.severity) ? cur : best,
  );
}

function buildPulseGeoJSON(incident: Incident | null): GeoJSON.FeatureCollection {
  if (!incident) return { type: 'FeatureCollection', features: [] };
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        id: `pulse-${incident.id}`,
        geometry: {
          type: 'Point',
          coordinates: [incident.lng, incident.lat],
        },
        properties: {},
      },
    ],
  };
}

// ── MapScreen ─────────────────────────────────────────────────────────────────

const MapScreen = ({ navigation }: MapProps): React.ReactElement => {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const { lang } = useLangStore();
  const s = strings[lang];

  const {
    userLat,
    userLng,
    locationGranted,
    safetyState,
    isRecenterVisible,
    setUserLocation,
    setLocationGranted,
    setSafetyState,
    setRecenterVisible,
    setActiveIncident,
    activeIncidentId,
  } = useMapStore();

  // ── Local state ────────────────────────────────────────────────────────────

  const [incidents, setIncidents] = useState<Incident[]>(() => db.incidents.getAll());
  const [localityCoords, setLocalityCoords] = useState<{ lat: number; lng: number }>(DEFAULT_LOCALITY);
  const [localityName, setLocalityName] = useState<string>(DEFAULT_LOCALITY.nameAr);
  const [showPermOverlay, setShowPermOverlay] = useState(false);
  const [permDeniedBanner, setPermDeniedBanner] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [mapKey, setMapKey] = useState(0);
  const [mapError, setMapError] = useState(false);
  const [pulseOpaque, setPulseOpaque] = useState(true);

  // Animation timestamp for GeoJSON opacity calculation
  const [animNow, setAnimNow] = useState(() => Date.now());

  // Track new/resolving incident IDs for opacity animation
  const newIdsRef = useRef<Map<string, number>>(new Map());
  const resolvingIdsRef = useRef<Map<string, number>>(new Map());
  const [animTick, setAnimTick] = useState(0); // incremented to force re-render

  // Refs
  const cameraRef = useRef</* any — Mapbox Camera type is complex */ any>(null);
  const hasFlownToUserRef = useRef(false);
  const geoWatchIdRef = useRef<number | null>(null);

  // Report FAB breathe animation (only when safetyState === 'calm')
  const breatheAnim = useRef(new Animated.Value(1)).current;
  const breatheLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  // ── Locality init ─────────────────────────────────────────────────────────

  useEffect(() => {
    const localityId = store.getString(StorageKeys.LOCALITY_ID);
    const found = LOCALITIES.find(l => l.id === localityId) ?? DEFAULT_LOCALITY;
    setLocalityCoords({ lat: found.lat, lng: found.lng });
    setLocalityName(found.nameAr);
  }, []);

  // ── Location permission init ──────────────────────────────────────────────

  useEffect(() => {
    const asked = store.getBoolean(StorageKeys.LOCATION_PERMISSION_ASKED);
    if (!asked) {
      setShowPermOverlay(true);
    } else {
      // Previously asked — restore cached granted state
      const granted = store.getBoolean(StorageKeys.LOCATION_GRANTED);
      if (granted) {
        setLocationGranted(true);
      } else if (granted === false) {
        setPermDeniedBanner(true);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Geo watch ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!locationGranted) return;
    // navigator.geolocation may be absent in test environments
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;

    geoWatchIdRef.current = navigator.geolocation.watchPosition(
      pos => {
        setUserLocation(pos.coords.latitude, pos.coords.longitude);
        if (!hasFlownToUserRef.current && cameraRef.current) {
          hasFlownToUserRef.current = true;
          cameraRef.current.setCamera({
            centerCoordinate: [pos.coords.longitude, pos.coords.latitude],
            zoomLevel: USER_ZOOM,
            animationDuration: reduceMotion ? 0 : motion.deliberate,
          });
        }
      },
      _err => {
        // silently fail — location may be unavailable
      },
      { enableHighAccuracy: true, distanceFilter: 20 },
    );

    return () => {
      if (geoWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(geoWatchIdRef.current);
        geoWatchIdRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationGranted]);

  // ── Permission handlers ───────────────────────────────────────────────────

  const handlePermContinue = useCallback(async () => {
    let granted = false;

    if (Platform.OS === 'android') {
      try {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        granted = result === PermissionsAndroid.RESULTS.GRANTED;
      } catch {
        granted = false;
      }
    } else {
      // iOS: trigger the system permission dialog via watchPosition (Hermes polyfill)
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        await new Promise<void>(resolve => {
          const watchId = navigator.geolocation.watchPosition(
            () => {
              granted = true;
              navigator.geolocation.clearWatch(watchId);
              resolve();
            },
            () => {
              granted = false;
              navigator.geolocation.clearWatch(watchId);
              resolve();
            },
            { enableHighAccuracy: true },
          );
        });
      }
    }

    store.setBoolean(StorageKeys.LOCATION_PERMISSION_ASKED, true);
    store.setBoolean(StorageKeys.LOCATION_GRANTED, granted);
    setLocationGranted(granted);
    setShowPermOverlay(false);
    if (!granted) {
      setPermDeniedBanner(true);
    }
  }, [setLocationGranted]);

  const handlePermSkip = useCallback(() => {
    store.setBoolean(StorageKeys.LOCATION_PERMISSION_ASKED, true);
    store.setBoolean(StorageKeys.LOCATION_GRANTED, false);
    setLocationGranted(false);
    setShowPermOverlay(false);
    setPermDeniedBanner(true);
  }, [setLocationGranted]);

  // ── Safety status recomputation ───────────────────────────────────────────

  useEffect(() => {
    const next = computeStatus(incidents, userLat, userLng, localityCoords);
    setSafetyState(next);
  }, [incidents, userLat, userLng, localityCoords, setSafetyState]);

  // ── Status pill pulse (for watch/active) ──────────────────────────────────

  useEffect(() => {
    if (safetyState === 'calm' || reduceMotion) return;
    const id = setInterval(() => {
      setPulseOpaque(v => !v);
    }, PULSE_INTERVAL);
    return () => clearInterval(id);
  }, [safetyState, reduceMotion]);

  // ── Report FAB breathe animation ──────────────────────────────────────────

  useEffect(() => {
    if (safetyState !== 'calm' || reduceMotion) {
      breatheLoopRef.current?.stop();
      breatheLoopRef.current = null;
      breatheAnim.setValue(1);
      return;
    }

    breatheLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, {
          toValue: 1.08,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(breatheAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    breatheLoopRef.current.start();

    return () => {
      breatheLoopRef.current?.stop();
      breatheLoopRef.current = null;
    };
  }, [safetyState, reduceMotion, breatheAnim]);

  // ── Pulse ring interval ───────────────────────────────────────────────────
  // (separate from status pill pulse, drives the CircleLayer opacity toggle)
  const [pulseVisible, setPulseVisible] = useState(true);

  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => setPulseVisible(v => !v), PULSE_INTERVAL);
    return () => clearInterval(id);
  }, [reduceMotion]);

  // ── Anim interval for new-pin scale-in ───────────────────────────────────

  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => {
      const now = Date.now();
      let changed = false;

      // Clean up new IDs that have finished animating
      newIdsRef.current.forEach((addedAt, id2) => {
        if (now - addedAt >= NEW_ANIM_DURATION) {
          newIdsRef.current.delete(id2);
          changed = true;
        }
      });

      // Clean up resolving IDs whose full fade has elapsed
      resolvingIdsRef.current.forEach((resolveAt, id2) => {
        if (now - resolveAt >= RESOLVE_FADE_DURATION) {
          resolvingIdsRef.current.delete(id2);
          changed = true;
        }
      });

      setAnimNow(now);
      if (changed) setAnimTick(t => t + 1);
    }, 100);
    return () => clearInterval(id);
  }, [reduceMotion]);

  // ── Live event subscription ───────────────────────────────────────────────

  useEffect(() => {
    const unsub = wsEventEmitter.subscribe(event => {
      if (event.t === 'incident.created') {
        const inc = event.incident;
        db.incidents.add(inc);
        newIdsRef.current.set(inc.id, Date.now());
        setIncidents(db.incidents.getAll());
        haptics.impact();
      } else if (event.t === 'incident.resolved') {
        db.incidents.resolve(event.id);
        resolvingIdsRef.current.set(event.id, Date.now());
        setIncidents(db.incidents.getAll());
      } else if (event.t === 'status.changed') {
        setSafetyState(event.state as SafetyState);
      }
    });
    return unsub;
  }, [setSafetyState]);

  // ── Mock emitter lifecycle ────────────────────────────────────────────────

  useEffect(() => {
    startMockEmitter();
    return () => stopMockEmitter();
  }, []);

  // ── GeoJSON memos ─────────────────────────────────────────────────────────

  const incidentGeoJSON = useMemo(
    () => buildGeoJSON(incidents, newIdsRef.current, resolvingIdsRef.current, animNow),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [incidents, animNow, animTick],
  );

  const pulseIncident = useMemo(() => highestPriorityIncident(incidents), [incidents]);
  const pulseGeoJSON = useMemo(() => buildPulseGeoJSON(pulseIncident), [pulseIncident]);

  // ── Offline pack download (after map loads) ───────────────────────────────

  const downloadOfflinePack = useCallback(async () => {
    const { lat, lng } = localityCoords;
    const packName = `locality-${lat.toFixed(2)}-${lng.toFixed(2)}`;
    try {
      const packs = await MapboxGL.offlineManager.getPacks();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const exists = (packs as any[]).some(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (p: any) => p?.name === packName || p?.metadata?.name === packName,
      );
      if (exists) return;

      await MapboxGL.offlineManager.createPack(
        {
          name: packName,
          styleURL: MAPBOX_DARK_STYLE,
          minZoom: OFFLINE_MIN_ZOOM,
          maxZoom: OFFLINE_MAX_ZOOM,
          bounds: [
            [lng - OFFLINE_DELTA, lat - OFFLINE_DELTA],
            [lng + OFFLINE_DELTA, lat + OFFLINE_DELTA],
          ],
        },
        // progress callback
        () => {},
        // error callback — silent
        () => {},
      );
    } catch {
      // Silent fail — offline pack is best-effort
    }
  }, [localityCoords]);

  const handleMapLoaded = useCallback(() => {
    downloadOfflinePack();
  }, [downloadOfflinePack]);

  // ── Camera recenter ───────────────────────────────────────────────────────

  const handleRecenter = useCallback(() => {
    const targetLat = userLat ?? localityCoords.lat;
    const targetLng = userLng ?? localityCoords.lng;
    cameraRef.current?.setCamera({
      centerCoordinate: [targetLng, targetLat],
      zoomLevel: USER_ZOOM,
      animationDuration: reduceMotion ? 0 : motion.deliberate,
    });
    setRecenterVisible(false);
    haptics.impact();
  }, [userLat, userLng, localityCoords, reduceMotion, setRecenterVisible]);

  // ── Region change → recenter visibility ──────────────────────────────────

  const handleRegionDidChange = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (feature: any) => {
      if (userLat === null || userLng === null) return;
      const [lng, lat] = feature?.geometry?.coordinates ?? [0, 0];
      const dist = haversineKm(lat, lng, userLat, userLng);
      setRecenterVisible(dist > 0.15);
    },
    [userLat, userLng, setRecenterVisible],
  );

  // ── Pin tap handlers ──────────────────────────────────────────────────────

  const handleClusterPress = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (event: any) => {
      const feature = event?.features?.[0];
      if (!feature) return;
      const [lng, lat] = feature.geometry.coordinates;
      const currentZoom = (await cameraRef.current?.getZoom?.()) ?? INITIAL_ZOOM;
      cameraRef.current?.setCamera({
        centerCoordinate: [lng, lat],
        zoomLevel: currentZoom + 2,
        animationDuration: reduceMotion ? 0 : motion.base,
      });
    },
    [reduceMotion],
  );

  const handlePinPress = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (event: any) => {
      const feature = event?.features?.[0];
      if (!feature) return;
      const { id } = feature;
      const inc = incidents.find(i => i.id === String(id));
      if (!inc) return;

      setActiveIncident(inc.id);
      setSelectedIncident(inc);

      cameraRef.current?.setCamera({
        centerCoordinate: [inc.lng, inc.lat],
        zoomLevel: USER_ZOOM,
        animationDuration: reduceMotion ? 0 : motion.base,
      });
      haptics.selection();
    },
    [incidents, reduceMotion, setActiveIncident],
  );

  const handleCloseSheet = useCallback(() => {
    setSelectedIncident(null);
    setActiveIncident(null);
  }, [setActiveIncident]);

  // ── Mapbox layer expressions ──────────────────────────────────────────────

  // Circle color for cluster based on maxSeverity
  const clusterCircleColor = [
    'step',
    ['get', 'maxSeverity'],
    color.severity.low,    // default (0)
    1, color.severity.low,
    2, color.severity.medium,
    3, color.severity.high,
    4, color.severity.critical,
  ];

  // Circle radius for cluster based on point_count
  const clusterCircleRadius = [
    'step',
    ['get', 'point_count'],
    18,
    5, 22,
    20, 28,
    50, 34,
  ];

  // Individual pin color based on severity
  const pinCircleColor = [
    'match',
    ['get', 'severity'],
    'critical', color.severity.critical,
    'high',     color.severity.high,
    'medium',   color.severity.medium,
    'low',      color.severity.low,
    color.severity.medium, // fallback
  ];

  // ── Error view ────────────────────────────────────────────────────────────

  if (mapError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{s.errors.mapFailed}</Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => {
            setMapError(false);
            setMapKey(k => k + 1);
          }}
          activeOpacity={0.8}>
          <Text style={styles.retryBtnText}>{s.common.retry}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const statusColor = color.status[safetyState];
  const statusLabel = s.map.status[safetyState];

  const refLat = localityCoords.lat;
  const refLng = localityCoords.lng;

  return (
    <View style={styles.root} testID="map-screen">
      {/* ── Mapbox MapView ─────────────────────────────────────────────── */}
      <MapboxGL.MapView
        key={mapKey}
        testID="mapbox-map-view"
        style={styles.map}
        styleURL={MAPBOX_DARK_STYLE}
        rotateEnabled={false}
        pitchEnabled={false}
        onDidFinishLoadingMap={handleMapLoaded}
        onMapLoadingError={() => setMapError(true)}
        onRegionDidChange={handleRegionDidChange}>

        {/* Camera — starts at locality, flies to user on first GPS fix */}
        <MapboxGL.Camera
          ref={cameraRef}
          centerCoordinate={[refLng, refLat]}
          zoomLevel={INITIAL_ZOOM}
          animationMode="flyTo"
          animationDuration={0}
        />

        {/* User location puck */}
        {locationGranted && (
          <MapboxGL.LocationPuck
            testID="mapbox-location-puck"
            pulsing={{ isEnabled: !reduceMotion }}
          />
        )}

        {/* ── Incident ShapeSource with clustering ─────────────────── */}
        <MapboxGL.ShapeSource
          id="incidentsSource"
          testID="incidents-shape-source"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          shape={incidentGeoJSON as any}
          cluster
          clusterRadius={CLUSTER_RADIUS}
          clusterMaxZoomLevel={CLUSTER_MAX_ZOOM}
          clusterProperties={{
            maxSeverity: [
              ['max', ['accumulated'], ['get', 'maxSeverity']],
              ['get', 'severityLevel'],
            ],
          }}
          onPress={handleClusterPress}>

          {/* Cluster circles */}
          <MapboxGL.CircleLayer
            id="clusterCircleLayer"
            filter={['has', 'point_count']}
            style={{
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              circleColor: clusterCircleColor as any,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              circleRadius: clusterCircleRadius as any,
              circleOpacity: 0.9,
              circleStrokeWidth: 2,
              circleStrokeColor: 'rgba(255,255,255,0.2)',
            }}
          />

          {/* Cluster count label */}
          <MapboxGL.SymbolLayer
            id="clusterCountLayer"
            filter={['has', 'point_count']}
            style={{
              textField: ['get', 'point_count_abbreviated'],
              textFont: ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
              textSize: 14,
              textColor: '#FFFFFF',
              textAllowOverlap: true,
              textIgnorePlacement: true,
            }}
          />

          {/* Individual non-cluster pins */}
          <MapboxGL.CircleLayer
            id="pinLayer"
            filter={['!', ['has', 'point_count']]}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onPress={handlePinPress as any}
            style={{
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              circleColor: pinCircleColor as any,
              circleRadius: 10,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              circleOpacity: ['get', 'opacity'] as any,
              circleStrokeWidth: 2,
              circleStrokeColor: 'rgba(255,255,255,0.3)',
            }}
          />
        </MapboxGL.ShapeSource>

        {/* ── Pulse ring ShapeSource ──────────────────────────────────── */}
        <MapboxGL.ShapeSource
          id="pulseSource"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          shape={pulseGeoJSON as any}>
          <MapboxGL.CircleLayer
            id="pulseLayer"
            style={{
              circleRadius: 24,
              circleColor: 'transparent',
              circleStrokeWidth: 3,
              circleStrokeColor: pulseIncident
                ? color.severity[pulseIncident.severity as keyof typeof color.severity]
                : color.accent,
              circleOpacity: 0,
              circleStrokeOpacity: pulseVisible && !reduceMotion ? 0.7 : 0,
            }}
          />
        </MapboxGL.ShapeSource>
      </MapboxGL.MapView>

      {/* ── Safety Status Pill (top-left, below safe-area) ─────────── */}
      <View
        style={[
          styles.statusPill,
          { top: insets.top + space(1) },
        ]}
        testID="status-pill">
        <View
          style={[
            styles.statusDot,
            {
              backgroundColor: statusColor,
              opacity:
                safetyState !== 'calm' && !reduceMotion
                  ? pulseOpaque ? 1 : 0.3
                  : 1,
            },
          ]}
        />
        <Text style={[styles.statusLabel, { color: statusColor }]}>
          {statusLabel}
        </Text>
      </View>

      {/* ── Floating Toolbar (top-right) ────────────────────────────── */}
      <View
        style={[
          styles.toolbar,
          { top: insets.top + space(1) },
        ]}>
        <TouchableOpacity
          style={styles.toolbarBtn}
          onPress={() => navigation.navigate('Inbox')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          testID="toolbar-inbox-btn">
          <Text style={styles.toolbarIcon}>🔔</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.toolbarBtn}
          onPress={() => navigation.navigate('Settings')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          testID="toolbar-settings-btn">
          <Text style={styles.toolbarIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* ── Location denied banner ──────────────────────────────────── */}
      {permDeniedBanner && (
        <View
          style={[styles.deniedBanner, { top: insets.top + space(1) + 48 }]}
          testID="location-denied-banner">
          <Text style={styles.deniedBannerText}>
            لم تُمنح صلاحية الموقع —{' '}
          </Text>
          <TouchableOpacity onPress={() => Linking.openSettings()}>
            <Text style={[styles.deniedBannerText, styles.deniedBannerLink]}>
              الإعدادات
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Recenter FAB (bottom-right) ─────────────────────────────── */}
      {isRecenterVisible && (
        <TouchableOpacity
          style={[
            styles.recenterFab,
            { bottom: insets.bottom + space(10) + space(2) },
          ]}
          onPress={handleRecenter}
          activeOpacity={0.8}
          testID="recenter-fab">
          <Text style={styles.recenterIcon}>◎</Text>
        </TouchableOpacity>
      )}

      {/* ── Bottom Action Tray ──────────────────────────────────────── */}
      <View
        style={[
          styles.actionTray,
          { paddingBottom: insets.bottom + space(1) },
        ]}>
        {/* Feed pill */}
        <TouchableOpacity
          style={styles.feedPill}
          // TODO: navigate to Feed screen when it's added to navigation
          onPress={() => navigation.navigate('Inbox')}
          activeOpacity={0.8}
          testID="feed-pill">
          <Text style={styles.feedPillText}>{s.map.feed}</Text>
          <Text style={styles.feedPillIcon}>📰</Text>
        </TouchableOpacity>

        {/* Report FAB */}
        <Animated.View style={{ transform: [{ scale: breatheAnim }] }}>
          <TouchableOpacity
            style={styles.reportFab}
            onPress={() => navigation.navigate('ReportCategory')}
            activeOpacity={0.8}
            testID="report-fab">
            <Text style={styles.reportFabIcon}>🚨</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* ── Incident Detail Sheet ───────────────────────────────────── */}
      {selectedIncident ? (
        <IncidentDetailSheet
          incident={selectedIncident}
          onClose={handleCloseSheet}
        />
      ) : null}

      {/* ── Location Permission Overlay (Modal) ─────────────────────── */}
      <LocationPermissionOverlay
        visible={showPermOverlay}
        onContinue={handlePermContinue}
        onSkip={handlePermSkip}
      />
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.bg,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },

  // Status pill
  statusPill: {
    position: 'absolute',
    left: space(2),
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: color.overlay,
    borderRadius: radius.pill,
    paddingHorizontal: space(1.5),
    paddingVertical: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: fontSize.sm,
    fontFamily: font.arabicSemiBold,
  },

  // Floating toolbar
  toolbar: {
    position: 'absolute',
    right: space(2),
    flexDirection: 'row',
    gap: space(1),
    backgroundColor: color.overlay,
    borderRadius: radius.pill,
    paddingHorizontal: space(1),
    paddingVertical: 6,
  },
  toolbarBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarIcon: {
    fontSize: 20,
  },

  // Denied banner
  deniedBanner: {
    position: 'absolute',
    left: space(2),
    right: space(2),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.card,
    borderRadius: radius.md,
    paddingHorizontal: space(2),
    paddingVertical: space(1),
  },
  deniedBannerText: {
    fontSize: fontSize.sm,
    fontFamily: font.arabic,
    color: color.textSecondary,
  },
  deniedBannerLink: {
    color: color.accent,
    textDecorationLine: 'underline',
  },

  // Recenter FAB
  recenterFab: {
    position: 'absolute',
    right: space(2),
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: color.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recenterIcon: {
    fontSize: 22,
    color: color.textPrimary,
  },

  // Bottom action tray
  actionTray: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: space(2),
    paddingTop: space(1.5),
    backgroundColor: 'rgba(11,18,32,0.75)',
  },
  feedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: color.card,
    borderRadius: radius.pill,
    paddingHorizontal: space(2),
    paddingVertical: space(1),
    minHeight: 44,
  },
  feedPillText: {
    fontSize: fontSize.sm,
    fontFamily: font.arabicMedium,
    color: color.textPrimary,
  },
  feedPillIcon: {
    fontSize: 16,
  },
  reportFab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space(1),
  },
  reportFabIcon: {
    fontSize: 28,
  },

  // Error state
  errorContainer: {
    flex: 1,
    backgroundColor: color.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space(2),
    paddingHorizontal: space(3),
  },
  errorText: {
    fontSize: fontSize.base,
    fontFamily: font.arabic,
    color: color.textSecondary,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: color.accent,
    borderRadius: radius.md,
    paddingHorizontal: space(3),
    paddingVertical: space(1.5),
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtnText: {
    fontSize: fontSize.base,
    fontFamily: font.arabicSemiBold,
    color: color.textPrimary,
  },
});

export default MapScreen;
