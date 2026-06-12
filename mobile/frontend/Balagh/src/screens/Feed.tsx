/**
 * Safety Feed drawer — §5.10
 *
 * A draggable bottom sheet (25 / 60 / 90 %) over the map. Sticky header with
 * locality + distance + search, filter chips, and a FlatList of incident cards.
 * Cards show severity, relative time (30 s refresh), category, description,
 * and a bookmark (persisted). Tapping a card opens the Incident Detail route.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { FeedProps } from '../navigation/types';
import { color, fontSize, font, radius, shadow, space } from '../core/theme/tokens';
import { Text, SeverityPill, Chip } from '../core/theme/components';
import { Search, BookmarkFilled, BookmarkOutline, CATEGORY_ICON, ShieldCheck } from '../core/icons';
import { BottomSheet } from '../presentation/components/BottomSheet';
import { FeedSkeleton } from '../presentation/components/Skeleton';
import { relativeTime } from '../core/format/time';
import { haptics } from '../core/haptics';
import { strings } from '../core/strings';
import { useLangStore } from '../domain/stores/lang';
import { useBookmarksStore } from '../domain/stores/bookmarks';
import { db } from '../data/mock/db';
import { wsEventEmitter } from '../data/mock/eventEmitter';
import type { Incident } from '../core/types';

// Only the filters with real seeded content are surfaced; "Safety tips",
// "Mediation", and "Initiatives" were always-empty dead UI before content
// exists to back them.
type FilterKey = 'all' | 'reports';
const FILTERS: FilterKey[] = ['all', 'reports'];

const FeedScreen = ({ navigation }: FeedProps): React.ReactElement => {
  const { lang } = useLangStore();
  const s = strings[lang];

  const [incidents, setIncidents] = useState<Incident[]>(() => db.incidents.getAll());
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [, setTick] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const bookmarks = useBookmarksStore();

  const refresh = useCallback(() => setIncidents(db.incidents.getAll()), []);

  // Brief skeleton flash on first mount so the list reads as actively loading
  // even when mock data is instantly available.
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 320);
    return () => clearTimeout(t);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    haptics.toggle();
    setTimeout(() => {
      refresh();
      setRefreshing(false);
    }, 600);
  }, [refresh]);

  // Live updates from the shared mock db keep feed ↔ map in sync.
  useEffect(() => {
    const unsub = wsEventEmitter.subscribe(ev => {
      if (ev.t === 'incident.created' || ev.t === 'incident.resolved') {
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

  const visible = useMemo(() => {
    let list = incidents;
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
  }, [incidents, query, s]);

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
            <CatIcon size={18} color={color.severity[item.severity]} />
            <Text variant="label">{s.category[item.category]}</Text>
          </View>

          {item.description ? (
            <Text secondary numberOfLines={3} style={styles.cardDesc}>
              {item.description}
            </Text>
          ) : null}

          <View style={styles.cardActions}>
            <TouchableOpacity
              onPress={() => {
                haptics.toggle();
                bookmarks.toggle(item.id);
              }}
              testID={`feed-bookmark-${item.id}`}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              {isBookmarked ? (
                <BookmarkFilled size={20} color={color.severity.medium} />
              ) : (
                <BookmarkOutline size={20} color={color.textMuted} />
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      );
    },
    [s, lang, bookmarks, navigation],
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
          {FILTERS.map(key => (
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

      {loading ? (
        <FeedSkeleton />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={item => item.id}
          renderItem={renderCard}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={color.textSecondary}
              colors={[color.accent]}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty} testID="feed-empty">
              <ShieldCheck size={40} color={color.status.calm} />
              <Text secondary style={styles.emptyTitle}>{s.feed.empty}</Text>
              <Text muted variant="caption" style={styles.emptySub}>{s.feed.emptySub}</Text>
            </View>
          }
        />
      )}
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
    backgroundColor: color.cardElevated,
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
    borderRadius: radius.lg,
    padding: space(2),
    gap: space(1),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
    ...shadow.card,
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
    justifyContent: 'flex-end',
    marginTop: space(0.5),
  },
  empty: {
    alignItems: 'center',
    paddingTop: space(6),
    gap: space(1),
  },
  emptyTitle: {
    fontSize: fontSize.md,
    fontFamily: font.arabicSemiBold,
  },
  emptySub: {
    textAlign: 'center',
    paddingHorizontal: space(4),
  },
});

export default FeedScreen;
