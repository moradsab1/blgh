/**
 * Map screen — §5.5 – §5.9  Main Map Dashboard
 *
 * Full-bleed Mapbox map with:
 *  - Clustered incident pins (ShapeSource + CircleLayer/SymbolLayer)
 *  - Pulse ring on the highest-priority active incident
 *  - Safety status pill (top-left)
 *  - Floating toolbar (top-right): Inbox + Settings
 *  - Bottom action tray: Feed pill (start) + centered Report FAB +
 *    Recenter button (end, when panned away)
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
  Linking,
  Modal,
  PermissionsAndroid,
  Platform,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapboxGL from '@rnmapbox/maps';

import type { MapProps } from '../navigation/types';
import { color, fontSize, font, motion, radius, shadow, space } from '../core/theme/tokens';
import { Text } from '../core/theme/components';
import { History, Locate, Mail, Newspaper, Plus, Settings, Shield } from '../core/icons';
import ArabicLabels from '../presentation/components/ArabicLabels';
import { privacyCircleRadius } from '../presentation/map/privacyCircle';
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

// Hermes polyfills navigator.geolocation but TypeScript has no DOM lib here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const global: Record<string, unknown>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getGeo = (): any => (global as any)?.navigator?.geolocation;

// Streets style — Mapbox's most complete, continuously-updated road network
// (every named road carries a label, unlike the minimal light style). Labels
// are localized to Arabic with a fallback chain via <ArabicLabels /> so roads
// whose names exist only in Hebrew still show a label.
const MAPBOX_STYLE = 'mapbox://styles/mapbox/streets-v12';
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
        <View style={ovStyles.iconCircle}>
          <Shield size={32} color={color.accent} />
        </View>

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
    backgroundColor: color.scrim,
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
    ...shadow.float,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: color.accent + '14',
    alignItems: 'center',
    justifyContent: 'center',
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
    color: color.textOnAccent,
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
  } = useMapStore();

  // ── Local state ────────────────────────────────────────────────────────────

  const [incidents, setIncidents] = useState<Incident[]>(() => db.incidents.getOpen());
  const [localityCoords, setLocalityCoords] = useState<{ lat: number; lng: number }>(DEFAULT_LOCALITY);
  const [showPermOverlay, setShowPermOverlay] = useState(false);
  const [permDeniedBanner, setPermDeniedBanner] = useState(false);
  const [mapKey, setMapKey] = useState(0);
  const [mapError, setMapError] = useState(false);
  const [pulseOpaque, setPulseOpaque] = useState(true);
  // Live unread-incident counter so the toolbar bell shows a real-time badge
  // when the mock emitter creates a new incident or notification.
  const [unreadCount, setUnreadCount] = useState(0);

  // Animation timestamp for GeoJSON opacity calculation
  const [animNow, setAnimNow] = useState(() => Date.now());

  // Track new/resolving incident IDs for opacity animation
  const newIdsRef = useRef<Map<string, number>>(new Map());
  const resolvingIdsRef = useRef<Map<string, number>>(new Map());
  const [animTick, setAnimTick] = useState(0); // incremented to force re-render

  // Refs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cameraRef = useRef<any>(null);
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
    const geo = getGeo();
    if (!geo) return;

    geoWatchIdRef.current = geo.watchPosition(
      (pos: { coords: { latitude: number; longitude: number } }) => {
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
      (_err: unknown) => {
        // silently fail — location may be unavailable
      },
      { enableHighAccuracy: true, distanceFilter: 20 },
    );

    return () => {
      if (geoWatchIdRef.current !== null) {
        getGeo()?.clearWatch(geoWatchIdRef.current);
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
      const geo = getGeo();
      if (geo) {
        await new Promise<void>(resolve => {
          const watchId = geo.watchPosition(
            () => {
              granted = true;
              geo.clearWatch(watchId);
              resolve();
            },
            () => {
              granted = false;
              geo.clearWatch(watchId);
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
        newIdsRef.current.set(inc.id, Date.now());
        setIncidents(db.incidents.getOpen());
        setUnreadCount(c => c + 1);
        haptics.impact();
      } else if (event.t === 'incident.resolved') {
        db.incidents.resolve(event.id);
        resolvingIdsRef.current.set(event.id, Date.now());
        setIncidents(db.incidents.getOpen());
      } else if (event.t === 'status.changed') {
        setSafetyState(event.state as SafetyState);
      } else if (event.t === 'notification.new') {
        // Bump the bell badge so demo viewers see the inbox come alive.
        setUnreadCount(c => c + 1);
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
          styleURL: MAPBOX_STYLE,
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

  // Single handler for ShapeSource — handles both clusters and individual pins
  const handleSourcePress = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (event: any) => {
      const feature = event?.features?.[0];
      if (!feature) return;

      if (feature.properties?.cluster) {
        // Cluster tap → zoom in to expand
        const [lng, lat] = feature.geometry.coordinates;
        const currentZoom = (await cameraRef.current?.getZoom?.()) ?? INITIAL_ZOOM;
        cameraRef.current?.setCamera({
          centerCoordinate: [lng, lat],
          zoomLevel: currentZoom + 2,
          animationDuration: reduceMotion ? 0 : motion.base,
        });
      } else {
        // Individual pin tap → center map + open the Incident Detail route (§5.12)
        const incId = String(feature.id ?? feature.properties?.id ?? '');
        const inc = incidents.find(i => i.id === incId);
        if (!inc) return;
        setActiveIncident(inc.id);
        cameraRef.current?.setCamera({
          centerCoordinate: [inc.lng, inc.lat],
          zoomLevel: USER_ZOOM,
          animationDuration: reduceMotion ? 0 : motion.base,
        });
        haptics.selection();
        navigation.navigate('IncidentDetail', { id: inc.id });
      }
    },
    [incidents, reduceMotion, setActiveIncident, navigation],
  );

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
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      {/* ── Mapbox MapView ─────────────────────────────────────────────── */}
      <MapboxGL.MapView
        key={mapKey}
        testID="mapbox-map-view"
        style={styles.map}
        styleURL={MAPBOX_STYLE}
        logoEnabled={false}
        attributionEnabled={false}
        scaleBarEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        onDidFinishLoadingMap={handleMapLoaded}
        onMapLoadingError={() => setMapError(true)}
        onRegionDidChange={handleRegionDidChange}>

        {/* Arabic labels with name → name_en fallback (never blank) */}
        <ArabicLabels />

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
          onPress={handleSourcePress}>

          {/* Cluster circles */}
          <MapboxGL.CircleLayer
            id="clusterCircleLayer"
            filter={['has', 'point_count']}
            style={{
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              circleColor: clusterCircleColor as any,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              circleRadius: clusterCircleRadius as any,
              circleOpacity: 0.92,
              circleStrokeWidth: 2.5,
              circleStrokeColor: '#FFFFFF',
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

          {/* Individual non-cluster incidents — translucent privacy circles
              covering ~150 m of ground so the exact location stays hidden. */}
          <MapboxGL.CircleLayer
            id="pinLayer"
            filter={['!', ['has', 'point_count']]}
            style={{
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              circleColor: pinCircleColor as any,
              circleRadius: privacyCircleRadius(),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              circleOpacity: ['*', 0.22, ['get', 'opacity']] as any,
              circleStrokeWidth: 2,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              circleStrokeColor: pinCircleColor as any,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              circleStrokeOpacity: ['*', 0.55, ['get', 'opacity']] as any,
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
              // Pulse traces the edge of the privacy circle, not an exact point.
              circleRadius: privacyCircleRadius(),
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
          onPress={() => {
            setUnreadCount(0);
            navigation.navigate('Inbox');
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          testID="toolbar-inbox-btn">
          <Mail size={19} color={color.textPrimary} />
          {unreadCount > 0 && (
            <View style={styles.badge} testID="toolbar-inbox-badge">
              <Text style={styles.badgeText}>
                {unreadCount > 9 ? '9+' : String(unreadCount)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.toolbarBtn}
          onPress={() => navigation.navigate('Settings')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          testID="toolbar-settings-btn">
          <Settings size={19} color={color.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* ── Location denied banner ──────────────────────────────────── */}
      {permDeniedBanner && (
        <View
          style={[styles.deniedBanner, { top: insets.top + space(1) + 48 }]}
          testID="location-denied-banner">
          <Text style={styles.deniedBannerText}>
            {s.map.locationDenied} —{' '}
          </Text>
          <TouchableOpacity onPress={() => Linking.openSettings()}>
            <Text style={[styles.deniedBannerText, styles.deniedBannerLink]}>
              {s.map.locationDeniedAction}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Bottom Action Tray ──────────────────────────────────────── */}
      {/* Three balanced slots: Feed pill (start) · centered Report FAB ·
          Recenter (end, shown when panned away) — the primary "add incident"
          action sits dead-center for one-handed reach. */}
      {/* ── Recenter FAB (floats above the tray, trailing edge) ─────── */}
      {isRecenterVisible && (
        <TouchableOpacity
          style={[styles.recenterFab, { bottom: insets.bottom + 84 + space(2) }]}
          onPress={handleRecenter}
          activeOpacity={0.8}
          testID="recenter-fab">
          <Locate size={22} color={color.textPrimary} />
        </TouchableOpacity>
      )}

      <View
        style={[
          styles.actionTray,
          { paddingBottom: insets.bottom + space(1) },
        ]}>
        {/* Incidents history — opens the incidents list (icon-only). */}
        <View style={styles.trayStart}>
          <TouchableOpacity
            style={styles.trayIconBtn}
            onPress={() => navigation.navigate('Feed')}
            accessibilityRole="button"
            accessibilityLabel={s.map.feed}
            activeOpacity={0.8}
            testID="feed-pill">
            <History size={24} color={color.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Report FAB — long-press routes to the Crisis fast-path. */}
        <Animated.View style={[styles.trayCenter, { transform: [{ scale: breatheAnim }] }]}>
          <TouchableOpacity
            style={styles.reportFab}
            onPress={() => navigation.navigate('ReportCategory')}
            onLongPress={() => {
              haptics.impact();
              navigation.navigate('CrisisReassure');
            }}
            delayLongPress={350}
            accessibilityHint={s.map.longPressForCrisis}
            activeOpacity={0.8}
            testID="report-fab">
            <Plus size={32} color={color.textOnAccent} />
          </TouchableOpacity>
        </Animated.View>

        {/* Feeds — team events + community news (icon-only). */}
        <View style={styles.trayEnd}>
          <TouchableOpacity
            style={styles.trayIconBtn}
            onPress={() => navigation.navigate('Feeds')}
            accessibilityRole="button"
            accessibilityLabel={s.feeds.title}
            activeOpacity={0.8}
            testID="feeds-btn">
            <Newspaper size={24} color={color.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Incident Detail now opens as its own route (§5.12) on pin tap. */}

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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  // Status pill
  statusPill: {
    position: 'absolute',
    left: space(2),
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: color.card,
    borderRadius: radius.pill,
    paddingHorizontal: space(1.75),
    minHeight: 42,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
    ...shadow.float,
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

  // Floating toolbar — two detached circular buttons, Google-Maps style
  toolbar: {
    position: 'absolute',
    right: space(2),
    flexDirection: 'row',
    gap: space(1),
  },
  toolbarBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: color.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
    ...shadow.float,
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: color.accent,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: color.card,
  },
  badgeText: {
    color: color.textOnAccent,
    fontSize: 10,
    fontFamily: font.arabicSemiBold,
    lineHeight: 12,
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
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
    ...shadow.card,
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

  // Bottom action tray — chrome floats free over the map; each control
  // carries its own elevation instead of sitting on a dark band. Three
  // balanced flex slots keep the Report FAB perfectly centered.
  actionTray: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    // Bottom-align the side controls; the center FAB lifts itself above them.
    alignItems: 'flex-end',
    paddingHorizontal: space(2),
    paddingTop: space(1.5),
  },
  trayStart: {
    flex: 1,
    alignItems: 'flex-start',
  },
  trayCenter: {
    alignItems: 'center',
    // Raise the primary action clear of the Feed/Recenter row so it reads
    // as the bold focal control, not just another button in the tray.
    marginBottom: space(2.5),
  },
  trayEnd: {
    flex: 1,
    alignItems: 'flex-end',
  },
  // Circular icon buttons flanking the center FAB — history (incidents list)
  // and feeds (team events + community news). Icon-only, no labels.
  trayIconBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: color.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space(1),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
    ...shadow.float,
  },
  reportFab: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: color.reportAccent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space(1),
    // White ring lifts the centered CTA off any map color underneath.
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...shadow.float,
  },
  recenterFab: {
    // Floats above the action tray on the trailing edge; `bottom` is set
    // inline from the safe-area inset so it clears the tray on any device.
    position: 'absolute',
    right: space(2),
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: color.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
    ...shadow.float,
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
    color: color.textOnAccent,
  },
});

export default MapScreen;
