/**
 * Incident Detail sheet — §5.12
 *
 * A 60 → 95 % bottom sheet over the map. Shows severity + timestamp + category,
 * locality + distance, full description, a 140 pt non-interactive Mapbox snippet,
 * a Confirm/Deny vote row (optimistic, one-way), and a comments thread where each
 * comment carries a deterministic 3-emoji identity tag (deriveEmojis) plus a
 * composer (≤280 chars).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Animated,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import type { IncidentDetailProps } from '../navigation/types';
import { color, fontSize, font, radius, space, formatNumber } from '../core/theme/tokens';
import { Text, SeverityPill, Button } from '../core/theme/components';
import { CATEGORY_ICON, MessageCircle } from '../core/icons';
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
import type { Incident, Comment } from '../core/types';

const repo = new MockIncidentRepo();
const COMMENT_MAX = 280;
const SNIPPET_STYLE = 'mapbox://styles/mapbox/dark-v11';

const IncidentDetailScreen = ({ navigation, route }: IncidentDetailProps): React.ReactElement => {
  const { id } = route.params;
  const { lang } = useLangStore();
  const s = strings[lang];
  const { userLat, userLng } = useMapStore();

  const [incident, setIncident] = useState<Incident | undefined>(() => db.incidents.getById(id));
  const [comments, setComments] = useState<Comment[]>(() => db.comments.getByIncident(id));
  const [body, setBody] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const toastOpacity = useMemo(() => new Animated.Value(0), []);

  const refresh = useCallback(() => {
    setIncident(db.incidents.getById(id));
    setComments(db.comments.getByIncident(id));
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

  const handleSend = useCallback(async () => {
    const trimmed = body.trim();
    if (!trimmed || !incident) return;
    setBody('');
    haptics.press();
    try {
      await repo.addComment(incident.id, trimmed);
    } catch {
      // best-effort
    }
    refresh();
  }, [body, incident, refresh]);

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

  const header = (
    <View>
      <View style={styles.topRow}>
        <SeverityPill severity={incident.severity} label={s.category[incident.category]} />
        <Text variant="caption" muted>{relativeTime(incident.createdAt, lang)}</Text>
      </View>

      <View style={styles.categoryRow}>
        <CatIcon size={22} />
        <Text variant="heading">{s.category[incident.category]}</Text>
      </View>

      <View style={styles.localityRow}>
        <Text variant="caption" secondary>📍 {localityName}</Text>
        {distanceKm !== null ? (
          <Text variant="caption" muted>
            {s.detail.distanceAway} {formatNumber(distanceKm.toFixed(1))} {s.detail.km}
          </Text>
        ) : null}
      </View>

      {incident.description ? (
        <Text style={styles.description}>{incident.description}</Text>
      ) : null}

      {/* Non-interactive 140 pt map snippet. Attribution kept on to comply
          with Mapbox ToS even though the snippet is a static preview. */}
      <View style={styles.snippet} pointerEvents="none" testID="detail-map-snippet">
        <MapboxGL.MapView
          style={StyleSheet.absoluteFill}
          styleURL={SNIPPET_STYLE}
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
                circleStrokeWidth: 2,
                circleStrokeColor: 'rgba(255,255,255,0.4)',
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

      <Text variant="label" style={styles.commentsTitle}>
        {s.detail.commentsTitle} ({formatNumber(comments.length)})
      </Text>
    </View>
  );

  const renderComment = ({ item }: { item: Comment }): React.ReactElement => (
    <View style={styles.comment} testID={`comment-${item.id}`}>
      <Text style={styles.commentTag}>{item.identityTag.join(' ')}</Text>
      <View style={styles.commentBody}>
        <Text variant="caption" muted>{relativeTime(item.createdAt, lang)}</Text>
        <Text style={styles.commentText}>{item.body}</Text>
      </View>
    </View>
  );

  return (
    <BottomSheet
      snapPoints={[0.6, 0.95]}
      initialSnapIndex={0}
      onClose={() => navigation.goBack()}
      testID="detail-sheet">
      <FlatList
        data={comments}
        keyExtractor={c => c.id}
        renderItem={renderComment}
        ListHeaderComponent={header}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.noCommentsBox}>
            <MessageCircle size={28} />
            <Text secondary style={styles.noCommentsTitle}>{s.detail.noComments}</Text>
            <Text muted variant="caption" style={styles.noCommentsSub}>
              {s.detail.composerPlaceholder}
            </Text>
          </View>
        }
      />

      {/* Composer */}
      <View style={styles.composer}>
        <TextInput
          style={styles.composerInput}
          value={body}
          onChangeText={t => setBody(t.slice(0, COMMENT_MAX))}
          placeholder={s.detail.composerPlaceholder}
          placeholderTextColor={color.textMuted}
          multiline
          maxLength={COMMENT_MAX}
          testID="comment-composer"
        />
        <View style={styles.composerFooter}>
          <Text variant="caption" muted>
            {formatNumber(body.length)}/{formatNumber(COMMENT_MAX)}
          </Text>
          <Button
            label={s.detail.send}
            size="sm"
            disabled={!body.trim()}
            onPress={handleSend}
            testID="comment-send"
          />
        </View>
      </View>

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
    paddingBottom: space(2),
    gap: space(1),
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
    backgroundColor: color.bg,
  },
  voteRow: {
    flexDirection: 'row',
    gap: space(1),
    marginTop: space(2),
  },
  voteBtn: {
    flex: 1,
    backgroundColor: color.card,
    borderRadius: radius.md,
    paddingVertical: space(1.5),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  voteConfirm: {
    backgroundColor: color.status.calm + '33',
  },
  voteDeny: {
    backgroundColor: color.accent + '33',
  },
  voteLabel: {
    color: color.textPrimary,
  },
  commentsTitle: {
    marginTop: space(2.5),
    marginBottom: space(0.5),
  },
  noCommentsBox: {
    alignItems: 'center',
    paddingVertical: space(3),
    gap: space(0.75),
    backgroundColor: color.card,
    borderRadius: radius.md,
    paddingHorizontal: space(2),
  },
  noCommentsTitle: {
    textAlign: 'center',
  },
  noCommentsSub: {
    textAlign: 'center',
    paddingHorizontal: space(2),
  },
  comment: {
    flexDirection: 'row',
    gap: space(1),
    backgroundColor: color.card,
    borderRadius: radius.md,
    padding: space(1.5),
  },
  commentTag: {
    fontSize: 18,
  },
  commentBody: {
    flex: 1,
    gap: 2,
  },
  commentText: {
    color: color.textPrimary,
    lineHeight: 20,
  },
  composer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border,
    padding: space(1.5),
    backgroundColor: color.cardElevated,
    gap: space(1),
  },
  composerInput: {
    color: color.textPrimary,
    fontSize: fontSize.base,
    fontFamily: font.arabic,
    maxHeight: 100,
    minHeight: 40,
    backgroundColor: color.card,
    borderRadius: radius.md,
    paddingHorizontal: space(1.5),
    paddingTop: space(1),
  },
  composerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toast: {
    position: 'absolute',
    bottom: space(10),
    alignSelf: 'center',
    backgroundColor: color.cardElevated,
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
