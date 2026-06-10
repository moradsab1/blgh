/**
 * Incident Detail sheet — §5.12
 *
 * A 60 → 95 % bottom sheet over the map. Shows severity + timestamp + category,
 * locality + distance, full description, a 140 pt non-interactive Mapbox snippet,
 * and a Confirm/Deny vote row (optimistic, one-way).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import type { IncidentDetailProps } from '../navigation/types';
import { color, radius, space, formatNumber } from '../core/theme/tokens';
import { Text, SeverityPill } from '../core/theme/components';
import { CATEGORY_ICON, MapPin } from '../core/icons';
import { BottomSheet } from '../presentation/components/BottomSheet';
import { relativeTime } from '../core/format/time';
import { haptics } from '../core/haptics';
import { strings } from '../core/strings';
import { useLangStore } from '../domain/stores/lang';
import { useMapStore } from '../domain/stores/map';
import { haversineKm } from '../domain/status';
import { db, LOCALITIES } from '../data/mock/db';
import { MockIncidentRepo } from '../data/mock/MockIncidentRepo';
import { wsEventEmitter } from '../data/mock/eventEmitter';
import store, { StorageKeys } from '../core/storage';
import type { Incident } from '../core/types';

const repo = new MockIncidentRepo();
const SNIPPET_STYLE = 'mapbox://styles/mapbox/streets-v12';
const SNIPPET_LOCALE = { locale: 'ar' } as const;

const IncidentDetailScreen = ({ navigation, route }: IncidentDetailProps): React.ReactElement => {
  const { id } = route.params;
  const { lang } = useLangStore();
  const s = strings[lang];
  const { userLat, userLng } = useMapStore();

  const [incident, setIncident] = useState<Incident | undefined>(() => db.incidents.getById(id));
  const [toast, setToast] = useState<string | null>(null);
  const toastOpacity = useMemo(() => new Animated.Value(0), []);

  const refresh = useCallback(() => {
    setIncident(db.incidents.getById(id));
  }, [id]);

  useEffect(() => {
    const unsub = wsEventEmitter.subscribe(ev => {
      if (
        (ev.t === 'vote.updated' && ev.id === id) ||
        ev.t === 'incident.resolved'
      ) {
        refresh();
      }
    });
    return unsub;
  }, [id, refresh]);

  const showToast = useCallback(
    (msg: string) => {
      setToast(msg);
      Animated.sequence([
        Animated.timing(toastOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.delay(1800),
        Animated.timing(toastOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => setToast(null));
    },
    [toastOpacity],
  );

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

  const handleVote = useCallback(
    async (vote: 'confirm' | 'deny') => {
      if (!incident) return;
      if (incident.myVote) {
        showToast(s.detail.alreadyVoted);
        return;
      }
      haptics.success();
      db.incidents.update(incident.id, {
        myVote: vote,
        confirmations: vote === 'confirm' ? incident.confirmations + 1 : incident.confirmations,
        denials: vote === 'deny' ? incident.denials + 1 : incident.denials,
      });
      refresh();
      try {
        await repo.vote(incident.id, vote);
        wsEventEmitter.emit({
          t: 'vote.updated',
          id: incident.id,
          confirmations: db.incidents.getById(incident.id)?.confirmations ?? 0,
          denials: db.incidents.getById(incident.id)?.denials ?? 0,
        });
      } catch (e) {
        const code = (e as { code?: number }).code;
        if (code === 409) showToast(s.detail.alreadyVoted);
        db.incidents.update(incident.id, {
          myVote: null,
          confirmations: incident.confirmations,
          denials: incident.denials,
        });
        refresh();
      }
    },
    [incident, refresh, showToast, s],
  );

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
          <CatIcon size={22} color={color.severity[incident.severity]} />
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
            localizeLabels={SNIPPET_LOCALE}
            logoEnabled={false}
            attributionEnabled={false}
            scaleBarEnabled={false}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            {...({ compassEnabled: false } as any)}>
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
              <MapboxGL.CircleLayer
                id="detailSnippetPin"
                style={{
                  circleColor: color.severity[incident.severity],
                  circleRadius: 9,
                  circleStrokeWidth: 2.5,
                  circleStrokeColor: '#FFFFFF',
                }}
              />
            </MapboxGL.ShapeSource>
          </MapboxGL.MapView>
        </View>

        {/* Vote row */}
        <View style={styles.voteRow}>
          <TouchableOpacity
            style={[styles.voteBtn, incident.myVote === 'confirm' && styles.voteConfirm]}
            onPress={() => handleVote('confirm')}
            testID="detail-confirm"
            activeOpacity={0.8}>
            <Text variant="label" style={styles.voteLabel}>
              ✓ {s.detail.confirm} · {formatNumber(incident.confirmations)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.voteBtn, incident.myVote === 'deny' && styles.voteDeny]}
            onPress={() => handleVote('deny')}
            testID="detail-deny"
            activeOpacity={0.8}>
            <Text variant="label" style={styles.voteLabel}>
              ✕ {s.detail.deny} · {formatNumber(incident.denials)}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {toast ? (
        <Animated.View style={[styles.toast, { opacity: toastOpacity }]} pointerEvents="none">
          <Text variant="caption" style={styles.toastText}>{toast}</Text>
        </Animated.View>
      ) : null}
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
    gap: space(1),
    marginTop: space(1.5),
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
  voteRow: {
    flexDirection: 'row',
    gap: space(1),
    marginTop: space(2),
  },
  voteBtn: {
    flex: 1,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    paddingVertical: space(1.5),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  voteConfirm: {
    backgroundColor: color.status.calm + '1A',
    borderColor: color.status.calm,
  },
  voteDeny: {
    backgroundColor: color.accent + '1A',
    borderColor: color.accent,
  },
  voteLabel: {
    color: color.textPrimary,
  },
  toast: {
    position: 'absolute',
    bottom: space(10),
    alignSelf: 'center',
    backgroundColor: color.card,
    borderRadius: radius.pill,
    paddingHorizontal: space(2),
    paddingVertical: space(1),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
  },
  toastText: {
    color: color.textPrimary,
  },
});

export default IncidentDetailScreen;
