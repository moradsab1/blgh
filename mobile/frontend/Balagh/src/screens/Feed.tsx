/**
 * Safety Feed drawer — §5.10 – §5.11
 *
 * A draggable bottom sheet (25 / 60 / 90 %) over the map. Sticky header with
 * locality + distance + search, filter chips, and a FlatList of incident cards.
 * Cards show severity, relative time (30 s refresh), category, description,
 * Confirm/Deny vote pills, comment count, and a bookmark (persisted).
 * Tapping a card opens the Incident Detail route.
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
import type { FeedProps } from '../navigation/types';
import { color, fontSize, font, radius, space } from '../core/theme/tokens';
import { Text, SeverityPill, Chip } from '../core/theme/components';
import { Search, Bookmark, MessageCircle, CATEGORY_ICON } from '../core/icons';
import { BottomSheet } from '../presentation/components/BottomSheet';
import { relativeTime } from '../core/format/time';
import { haptics } from '../core/haptics';
import { strings } from '../core/strings';
import { useLangStore } from '../domain/stores/lang';
import { useBookmarksStore } from '../domain/stores/bookmarks';
import { db } from '../data/mock/db';
import { MockIncidentRepo } from '../data/mock/MockIncidentRepo';
import { wsEventEmitter } from '../data/mock/eventEmitter';
import { formatNumber } from '../core/theme/tokens';
import type { Incident } from '../core/types';

const repo = new MockIncidentRepo();

type FilterKey = 'all' | 'reports' | 'safety' | 'mediation' | 'initiatives';

const FeedScreen = ({ navigation }: FeedProps): React.ReactElement => {
  const { lang } = useLangStore();
  const s = strings[lang];

  const [incidents, setIncidents] = useState<Incident[]>(() => db.incidents.getAll());
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [, setTick] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const toastOpacity = useMemo(() => new Animated.Value(0), []);

  const bookmarks = useBookmarksStore();

  const refresh = useCallback(() => setIncidents(db.incidents.getAll()), []);

  // Live updates from the shared mock db keep feed ↔ map in sync.
  useEffect(() => {
    const unsub = wsEventEmitter.subscribe(ev => {
      if (ev.t === 'incident.created' || ev.t === 'incident.resolved' || ev.t === 'vote.updated') {
        refresh();
      }
    });
    return unsub;
  }, [refresh]);

  // 30 s timestamp refresh
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

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

  const visible = useMemo(() => {
    // Only "all" and "reports" surface incident data in the mock; the other
    // filters (safety/mediation/initiatives) have no seeded content yet.
    let list = filter === 'all' || filter === 'reports' ? incidents : [];
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        i =>
          (i.description ?? '').toLowerCase().includes(q) ||
          i.ref.toLowerCase().includes(q) ||
          (s.category[i.category] ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [incidents, filter, query, s]);

  const handleVote = useCallback(
    async (incident: Incident, vote: 'confirm' | 'deny') => {
      if (incident.myVote) {
        showToast(s.detail.alreadyVoted);
        return;
      }
      // Optimistic update
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
        // 409 duplicate (or any failure) → revert + toast
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
    [refresh, showToast, s],
  );

  const renderCard = useCallback(
    ({ item }: { item: Incident }): React.ReactElement => {
      const CatIcon = CATEGORY_ICON[item.category];
      const isBookmarked = bookmarks.isBookmarked(item.id);
      return (
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.8}
          testID={`feed-card-${item.id}`}
          onPress={() => navigation.navigate('IncidentDetail', { id: item.id })}>
          <View style={styles.cardTop}>
            <SeverityPill severity={item.severity} label={s.category[item.category]} />
            <Text variant="caption" muted testID={`feed-time-${item.id}`}>
              {relativeTime(item.createdAt, lang)}
            </Text>
          </View>

          <View style={styles.cardCategory}>
            <CatIcon size={18} />
            <Text variant="label">{s.category[item.category]}</Text>
          </View>

          {item.description ? (
            <Text secondary numberOfLines={3} style={styles.cardDesc}>
              {item.description}
            </Text>
          ) : null}

          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.votePill, item.myVote === 'confirm' && styles.votePillConfirm]}
              onPress={() => handleVote(item, 'confirm')}
              testID={`feed-confirm-${item.id}`}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Text variant="caption" style={styles.voteText}>
                ✓ {formatNumber(item.confirmations)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.votePill, item.myVote === 'deny' && styles.votePillDeny]}
              onPress={() => handleVote(item, 'deny')}
              testID={`feed-deny-${item.id}`}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Text variant="caption" style={styles.voteText}>
                ✕ {formatNumber(item.denials)}
              </Text>
            </TouchableOpacity>

            <View style={styles.commentCount}>
              <MessageCircle size={14} />
              <Text variant="caption" muted>{formatNumber(item.commentCount)}</Text>
            </View>

            <View style={styles.spacer} />

            <TouchableOpacity
              onPress={() => {
                haptics.toggle();
                bookmarks.toggle(item.id);
              }}
              testID={`feed-bookmark-${item.id}`}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Bookmark
                size={18}
                style={isBookmarked ? styles.bookmarkActive : styles.bookmarkInactive}
              />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      );
    },
    [s, lang, bookmarks, handleVote, navigation],
  );

  return (
    <BottomSheet
      snapPoints={[0.25, 0.6, 0.9]}
      initialSnapIndex={1}
      onClose={() => navigation.goBack()}
      testID="feed-sheet">
      {/* Sticky header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text variant="heading">{s.feed.title}</Text>
          <Text variant="caption" muted>{s.feed.distance}</Text>
        </View>
        <View style={styles.searchBox}>
          <Search size={16} color={color.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={s.feed.searchPlaceholder}
            placeholderTextColor={color.textMuted}
            autoCorrect={false}
          />
        </View>
        <View style={styles.chipsRow}>
          {(['all', 'reports', 'safety', 'mediation', 'initiatives'] as FilterKey[]).map(key => (
            <Chip
              key={key}
              label={s.feed.filters[key]}
              active={filter === key}
              onPress={() => {
                haptics.toggle();
                setFilter(key);
              }}
              testID={`feed-filter-${key}`}
              style={styles.chip}
            />
          ))}
        </View>
      </View>

      <FlatList
        data={visible}
        keyExtractor={item => item.id}
        renderItem={renderCard}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty} testID="feed-empty">
            <Text style={styles.emptyIcon}>🛡️</Text>
            <Text secondary style={styles.emptyTitle}>{s.feed.empty}</Text>
            <Text muted variant="caption" style={styles.emptySub}>{s.feed.emptySub}</Text>
          </View>
        }
      />

      {toast ? (
        <Animated.View style={[styles.toast, { opacity: toastOpacity }]} pointerEvents="none">
          <Text variant="caption" style={styles.toastText}>{toast}</Text>
        </Animated.View>
      ) : null}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: space(2),
    paddingBottom: space(1),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.border,
    gap: space(1),
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1),
    backgroundColor: color.card,
    borderRadius: radius.md,
    paddingHorizontal: space(1.5),
    minHeight: 40,
  },
  searchInput: {
    flex: 1,
    color: color.textPrimary,
    fontSize: fontSize.base,
    paddingVertical: space(1),
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space(0.75),
  },
  chip: {
    marginEnd: space(0.5),
  },
  list: {
    padding: space(2),
    gap: space(1),
    paddingBottom: space(6),
  },
  card: {
    backgroundColor: color.card,
    borderRadius: radius.md,
    padding: space(2),
    gap: space(1),
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1),
  },
  cardDesc: {
    lineHeight: 20,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1),
    marginTop: space(0.5),
  },
  votePill: {
    backgroundColor: color.bg,
    borderRadius: radius.pill,
    paddingHorizontal: space(1.5),
    paddingVertical: 4,
    minHeight: 30,
    justifyContent: 'center',
  },
  votePillConfirm: {
    backgroundColor: color.status.calm + '33',
  },
  votePillDeny: {
    backgroundColor: color.accent + '33',
  },
  voteText: {
    color: color.textSecondary,
  },
  commentCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  spacer: {
    flex: 1,
  },
  bookmarkActive: {
    opacity: 1,
  },
  bookmarkInactive: {
    opacity: 0.4,
  },
  empty: {
    alignItems: 'center',
    paddingTop: space(6),
    gap: space(1),
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: fontSize.md,
    fontFamily: font.arabicSemiBold,
  },
  emptySub: {
    textAlign: 'center',
    paddingHorizontal: space(4),
  },
  toast: {
    position: 'absolute',
    bottom: space(4),
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

export default FeedScreen;
