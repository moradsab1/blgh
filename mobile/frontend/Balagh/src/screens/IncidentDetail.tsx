/**
 * Incident Detail sheet — §5.12
 *
 * A 60 → 95 % bottom sheet over the map. Shows severity + timestamp + category,
 * locality + distance, full description, and a 140 pt non-interactive Mapbox
 * snippet.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import type { IncidentDetailProps } from '../navigation/types';
import { color, radius, space, formatNumber } from '../core/theme/tokens';
import { Text, SeverityPill } from '../core/theme/components';
import { CATEGORY_ICON, MapPin } from '../core/icons';
import { BottomSheet } from '../presentation/components/BottomSheet';
import ArabicLabels from '../presentation/components/ArabicLabels';
import { privacyCircleRadius } from '../presentation/map/privacyCircle';
import { relativeTime } from '../core/format/time';
import { strings } from '../core/strings';
import { useLangStore } from '../domain/stores/lang';
import { useMapStore } from '../domain/stores/map';
import { haversineKm } from '../domain/status';
import { db, LOCALITIES } from '../data/mock/db';
import { wsEventEmitter } from '../data/mock/eventEmitter';
import store, { StorageKeys } from '../core/storage';
import type { Incident } from '../core/types';

const SNIPPET_STYLE = 'mapbox://styles/mapbox/streets-v12';

const IncidentDetailScreen = ({ navigation, route }: IncidentDetailProps): React.ReactElement => {
  const { id } = route.params;
  const { lang } = useLangStore();
  const s = strings[lang];
  const { userLat, userLng } = useMapStore();

  const [incident, setIncident] = useState<Incident | undefined>(() => db.incidents.getById(id));

  const refresh = useCallback(() => {
    setIncident(db.incidents.getById(id));
  }, [id]);

  useEffect(() => {
    const unsub = wsEventEmitter.subscribe(ev => {
      if (ev.t === 'incident.resolved') {
        refresh();
      }
    });
    return unsub;
  }, [id, refresh]);

  const distanceKm = useMemo(() => {
    if (!incident) return null;
    let fromLat = userLat;
    let fromLng = userLng;
    if (fromLat === null || fromLng === null) {
      const locId = store.getString(StorageKeys.LOCALITY_ID);
      const loc = LOCALITIES.find(l => l.id === locId) ?? LOCALITIES[0];
      fromLat = loc.lat;
      fromLng = loc.lng;
    }
    return haversineKm(fromLat, fromLng, incident.lat, incident.lng);
  }, [incident, userLat, userLng]);

  const localityName = useMemo(() => {
    if (!incident) return '';
    const loc = LOCALITIES.find(l => l.id === incident.localityId);
    if (!loc) return '';
    return lang === 'he' ? loc.nameHe : lang === 'en' ? loc.nameEn : loc.nameAr;
  }, [incident, lang]);

  if (!incident) {
    return (
      <BottomSheet snapPoints={[0.6, 0.95]} initialSnapIndex={0} onClose={() => navigation.goBack()}>
        <View style={styles.missing}>
          <Text secondary>{s.errors.generic}</Text>
        </View>
      </BottomSheet>
    );
  }

  const CatIcon = CATEGORY_ICON[incident.category];

  return (
    <BottomSheet
      snapPoints={[0.6, 0.95]}
      initialSnapIndex={0}
      onClose={() => navigation.goBack()}
      testID="detail-sheet">
      <ScrollView
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <SeverityPill severity={incident.severity} label={s.category[incident.category]} />
          <Text variant="caption" muted>{relativeTime(incident.createdAt, lang)}</Text>
        </View>

        <View style={styles.categoryRow}>
          <View
            style={[
              styles.iconBadge,
              { backgroundColor: color.severity[incident.severity] + '14' },
            ]}>
            <CatIcon size={22} color={color.severity[incident.severity]} />
          </View>
          <Text variant="heading">{s.category[incident.category]}</Text>
        </View>

        <View style={styles.localityRow}>
          <View style={styles.localityName}>
            <MapPin size={13} color={color.textSecondary} />
            <Text variant="caption" secondary>{localityName}</Text>
          </View>
          {distanceKm !== null ? (
            <Text variant="caption" muted>
              {s.detail.distanceAway} {formatNumber(distanceKm.toFixed(1))} {s.detail.km}
            </Text>
          ) : null}
        </View>

        {incident.description ? (
          <Text style={styles.description}>{incident.description}</Text>
        ) : null}

        {/* Non-interactive 140 pt map snippet. */}
        <View style={styles.snippet} pointerEvents="none" testID="detail-map-snippet">
          <MapboxGL.MapView
            style={StyleSheet.absoluteFill}
            styleURL={SNIPPET_STYLE}
            logoEnabled={false}
            attributionEnabled={false}
            scaleBarEnabled={false}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            {...({ compassEnabled: false } as any)}>
            <ArabicLabels />
            <MapboxGL.Camera
              centerCoordinate={[incident.lng, incident.lat]}
              zoomLevel={14}
              animationDuration={0}
            />
            <MapboxGL.ShapeSource
              id="detailSnippetSource"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              shape={{
                type: 'FeatureCollection',
                features: [
                  {
                    type: 'Feature',
                    properties: {},
                    geometry: { type: 'Point', coordinates: [incident.lng, incident.lat] },
                  },
                ],
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
              } as any}>
              {/* Privacy circle (~150 m ground radius) — never an exact pin. */}
              <MapboxGL.CircleLayer
                id="detailSnippetPin"
                style={{
                  circleColor: color.severity[incident.severity],
                  circleRadius: privacyCircleRadius(),
                  circleOpacity: 0.22,
                  circleStrokeWidth: 2,
                  circleStrokeColor: color.severity[incident.severity],
                  circleStrokeOpacity: 0.55,
                }}
              />
            </MapboxGL.ShapeSource>
          </MapboxGL.MapView>
        </View>
      </ScrollView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: space(2),
    paddingBottom: space(3),
  },
  missing: {
    alignItems: 'center',
    paddingTop: space(6),
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: space(1),
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1.5),
    marginTop: space(1.5),
  },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  localityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: space(1),
  },
  localityName: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  description: {
    marginTop: space(1.5),
    lineHeight: 22,
    color: color.textPrimary,
  },
  snippet: {
    height: 140,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginTop: space(2),
    backgroundColor: color.cardElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
  },
});

export default IncidentDetailScreen;
