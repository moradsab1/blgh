import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { Text, Button } from '../../core/theme/components';
import { color, space, radius } from '../../core/theme/tokens';
import { CATEGORY_ICON, ChevronLeft } from '../../core/icons';
import { useLangStore } from '../../domain/stores/lang';
import { strings } from '../../core/strings';
import { MockIncidentRepo } from '../../data/mock/MockIncidentRepo';
import type { Category } from '../../core/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CrisisConfirm'>;

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

const SEVERITY_TINT: Record<Category, string> = {
  GUNFIRE: color.severity.critical,
  STABBING: color.severity.critical,
  ASSAULT: color.severity.high,
  ROBBERY: color.severity.high,
  SUSPICIOUS: color.severity.medium,
  OTHER: color.severity.medium,
};

const repo = new MockIncidentRepo();

export default function CrisisConfirmScreen({ navigation, route }: Props): React.ReactElement {
  const { category } = route.params as { category: Category };
  const { lang } = useLangStore();
  const s = strings[lang];

  const [coords, setCoords] = useState({ lat: 32.5139, lng: 35.1566 });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getGeoPosition()
      .then(pos => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }))
      .catch(() => {});
  }, []);

  const handleSend = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const { ref } = await repo.submitReport(category, coords.lat, coords.lng);
      navigation.replace('CrisisSuccess', { ref });
    } finally {
      setSubmitting(false);
    }
  };

  const Icon = CATEGORY_ICON[category];
  const tint = SEVERITY_TINT[category];

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={color.bg} />
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
          <ChevronLeft size={20} color={color.textPrimary} />
        </Pressable>
        <Text variant="heading" style={styles.headerTitle}>{s.crisis.confirmTitle}</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.mapContainer}>
        <MapboxGL.MapView
          style={styles.map}
          styleURL={MapboxGL.StyleURL.Dark}
          rotateEnabled={false}
          pitchEnabled={false}
          scrollEnabled={false}
          zoomEnabled={false}
          logoEnabled={false}
          attributionEnabled={false}>
          <MapboxGL.Camera
            centerCoordinate={[coords.lng, coords.lat]}
            zoomLevel={14}
            animationMode="none"
          />
          <MapboxGL.LocationPuck />
        </MapboxGL.MapView>
      </View>

      <View style={styles.content}>
        <View style={[styles.categoryBadge, { borderColor: tint }]}>
          <Icon size={28} />
          <Text variant="label" style={{ color: tint }}>{s.category[category]}</Text>
        </View>
        <Text secondary style={styles.confirmSubtitle}>{s.crisis.confirmSubtitle}</Text>
      </View>

      <View style={styles.footer}>
        {submitting && <ActivityIndicator color={color.accent} size="small" style={styles.spinner} />}
        <Button
          label={submitting ? s.report.submitting : s.crisis.send}
          variant="danger"
          fullWidth
          disabled={submitting}
          onPress={handleSend}
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
  mapContainer: { height: 140, overflow: 'hidden' },
  map: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space(3),
    gap: space(2),
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1),
    backgroundColor: color.card,
    borderWidth: 1.5,
    borderRadius: radius.pill,
    paddingHorizontal: space(2),
    paddingVertical: space(1),
  },
  confirmSubtitle: { textAlign: 'center' },
  footer: {
    padding: space(2),
    paddingBottom: space(3),
    gap: space(1.5),
  },
  spinner: { alignSelf: 'center' },
});
