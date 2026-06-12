/**
 * Incidents Feed drawer — §5.10
 *
 * A draggable bottom sheet (25 / 60 / 90 %) over the map. While the map only
 * shows currently open incidents (24 h window), the feed is the history
 * browser: a time-range filter (last 24 h / week / month) plus a locality
 * filter (e.g. "last month in Nazareth"), with search on top.
 *
 * Cards are modern severity-striped tiles: tinted icon badge, category title,
 * locality + relative time, description (≤3 lines), a resolved badge for
 * closed incidents, and a persisted bookmark. Tapping a card opens the
 * Incident Detail route.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { FeedProps } from '../navigation/types';
import { color, fontSize, font, radius, shadow, space } from '../core/theme/tokens';
import { Text, Chip } from '../core/theme/components';
import {
  Search,
  BookmarkFilled,
  BookmarkOutline,
  CATEGORY_ICON,
  Check,
  ChevronDown,
  MapPin,
  ShieldCheck,
  X,
} from '../core/icons';
import { BottomSheet } from '../presentation/components/BottomSheet';
import { FeedSkeleton } from '../presentation/components/Skeleton';
import { relativeTime } from '../core/format/time';
import { haptics } from '../core/haptics';
import { strings } from '../core/strings';
import { useLangStore } from '../domain/stores/lang';
import { useBookmarksStore } from '../domain/stores/bookmarks';
import { FEED_RANGES, filterIncidents } from '../domain/feed/filters';
import type { FeedRangeKey } from '../domain/feed/filters';
import { db, LOCALITIES } from '../data/mock/db';
import { wsEventEmitter } from '../data/mock/eventEmitter';
import type { AppLanguage, Incident, Locality } from '../core/types';

function localityName(loc: Locality, lang: AppLanguage): string {
  return lang === 'he' ? loc.nameHe : lang === 'en' ? loc.nameEn : loc.nameAr;
}

// ── City picker modal ─────────────────────────────────────────────────────────
// One "choose city" button in the filter bar opens this bottom sheet instead of
// rendering all 18 locality chips inline. Searchable across ar/he/en scripts.

interface CityPickerProps {
  visible: boolean;
  selectedId: string | null;
  lang: AppLanguage;
  onSelect: (id: string | null) => void;
  onClose: () => void;
}

const CityPickerModal = ({
  visible,
  selectedId,
  lang,
  onSelect,
  onClose,
}: CityPickerProps): React.ReactElement => {
  const s = strings[lang];
  const [cityQuery, setCityQuery] = useState('');

  const cities = useMemo(() => {
    const q = cityQuery.trim().toLowerCase();
    if (!q) return LOCALITIES;
    return LOCALITIES.filter(
      loc =>
        loc.nameAr.toLowerCase().includes(q) ||
        loc.nameHe.toLowerCase().includes(q) ||
        loc.nameEn.toLowerCase().includes(q),
    );
  }, [cityQuery]);

  const pick = (id: string | null): void => {
    haptics.toggle();
    onSelect(id);
    setCityQuery('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={pickerStyles.backdrop} onPress={onClose} testID="feed-city-backdrop" />
      <View style={pickerStyles.sheet} testID="feed-city-modal">
        <View style={pickerStyles.handle} />
        <View style={pickerStyles.titleRow}>
          <Text variant="heading">{s.feed.chooseCity}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={20} color={color.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={pickerStyles.searchBox}>
          <Search size={16} color={color.textMuted} />
          <TextInput
            style={pickerStyles.searchInput}
            value={cityQuery}
            onChangeText={setCityQuery}
            placeholder={s.locality.searchPlaceholder}
            placeholderTextColor={color.textMuted}
            autoCorrect={false}
            testID="feed-city-search"
          />
        </View>

        <FlatList
          data={cities}
          keyExtractor={loc => loc.id}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={pickerStyles.list}
          ListHeaderComponent={
            <TouchableOpacity
              style={[pickerStyles.row, selectedId === null && pickerStyles.rowActive]}
              onPress={() => pick(null)}
              testID="feed-city-all">
              <MapPin size={16} color={selectedId === null ? color.accent : color.textMuted} />
              <View style={pickerStyles.rowNames}>
                <Text
                  variant="label"
                  style={[pickerStyles.rowLabel, selectedId === null && pickerStyles.rowLabelActive]}>
                  {s.feed.allLocalities}
                </Text>
              </View>
              {selectedId === null && <Check size={18} color={color.accent} />}
            </TouchableOpacity>
          }
          renderItem={({ item: loc }) => {
            const active = selectedId === loc.id;
            return (
              <TouchableOpacity
                style={[pickerStyles.row, active && pickerStyles.rowActive]}
                onPress={() => pick(loc.id)}
                testID={`feed-city-${loc.id}`}>
                <MapPin size={16} color={active ? color.accent : color.textMuted} />
                <View style={pickerStyles.rowNames}>
                  <Text
                    variant="label"
                    style={[pickerStyles.rowLabel, active && pickerStyles.rowLabelActive]}>
                    {localityName(loc, lang)}
                  </Text>
                  {lang !== 'ar' ? (
                    <Text variant="caption" muted>{loc.nameAr}</Text>
                  ) : null}
                </View>
                {active && <Check size={18} color={color.accent} />}
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </Modal>
  );
};

const FeedScreen = ({ navigation }: FeedProps): React.ReactElement => {
  const { lang } = useLangStore();
  const s = strings[lang];

  const [incidents, setIncidents] = useState<Incident[]>(() => db.incidents.getAll());
  const [query, setQuery] = useState('');
  const [range, setRange] = useState<FeedRangeKey>('day');
  const [localityId, setLocalityId] = useState<string | null>(null);
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
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

  const visible = useMemo(
    () => filterIncidents(incidents, { range, localityId, query }, s.category),
    [incidents, range, localityId, query, s],
  );

  const selectedCity = useMemo(
    () => LOCALITIES.find(l => l.id === localityId) ?? null,
    [localityId],
  );

  const renderCard = useCallback(
    ({ item }: { item: Incident }): React.ReactElement => {
      const CatIcon = CATEGORY_ICON[item.category];
      const sevColor = color.severity[item.severity];
      const isBookmarked = bookmarks.isBookmarked(item.id);
      const loc = LOCALITIES.find(l => l.id === item.localityId);
      return (
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.8}
          testID={`feed-card-${item.id}`}
          onPress={() => navigation.navigate('IncidentDetail', { id: item.id })}>
          {/* Severity accent strip */}
          <View style={[styles.cardAccent, { backgroundColor: sevColor }]} />

          <View style={styles.cardBody}>
            <View style={styles.cardTop}>
              <View style={[styles.iconBadge, { backgroundColor: sevColor + '14' }]}>
                <CatIcon size={20} color={sevColor} />
              </View>

              <View style={styles.cardTitleArea}>
                <Text variant="label">{s.category[item.category]}</Text>
                <View style={styles.cardMetaRow}>
                  {loc ? (
                    <>
                      <MapPin size={11} color={color.textMuted} />
                      <Text variant="caption" muted>{localityName(loc, lang)}</Text>
                      <Text variant="caption" muted>·</Text>
                    </>
                  ) : null}
                  <Text variant="caption" muted testID={`feed-time-${item.id}`}>
                    {relativeTime(item.createdAt, lang)}
                  </Text>
                  {item.resolvedAt ? (
                    <View style={styles.resolvedBadge} testID={`feed-resolved-${item.id}`}>
                      <Text style={styles.resolvedBadgeText}>{s.feed.resolved}</Text>
                    </View>
                  ) : null}
                </View>
              </View>

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

            {item.description ? (
              <Text secondary numberOfLines={3} style={styles.cardDesc}>
                {item.description}
              </Text>
            ) : null}
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
        <Text variant="heading">{s.feed.title}</Text>
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

        {/* Filter bar — time-range chips + one "choose city" button that
            opens the searchable city picker (instead of 18 inline chips). */}
        <View style={styles.chipsRow}>
          {FEED_RANGES.map(key => (
            <Chip
              key={key}
              label={s.feed.ranges[key]}
              active={range === key}
              onPress={() => {
                haptics.toggle();
                setRange(key);
              }}
              testID={`feed-range-${key}`}
              style={styles.chip}
            />
          ))}
        </View>

        <View style={styles.cityRow}>
          <TouchableOpacity
            style={[styles.cityButton, selectedCity && styles.cityButtonActive]}
            onPress={() => {
              haptics.toggle();
              setCityPickerOpen(true);
            }}
            activeOpacity={0.8}
            testID="feed-city-button">
            <MapPin size={15} color={selectedCity ? color.accent : color.textSecondary} />
            <Text
              variant="label"
              style={selectedCity ? styles.cityButtonTextActive : styles.cityButtonText}
              numberOfLines={1}>
              {selectedCity ? localityName(selectedCity, lang) : s.feed.allLocalities}
            </Text>
            <ChevronDown size={15} color={selectedCity ? color.accent : color.textSecondary} />
          </TouchableOpacity>

          {selectedCity ? (
            <TouchableOpacity
              style={styles.cityClear}
              onPress={() => {
                haptics.toggle();
                setLocalityId(null);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              testID="feed-city-clear">
              <X size={14} color={color.textSecondary} />
            </TouchableOpacity>
          ) : null}
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

      <CityPickerModal
        visible={cityPickerOpen}
        selectedId={localityId}
        lang={lang}
        onSelect={setLocalityId}
        onClose={() => setCityPickerOpen(false)}
      />
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: space(2),
    paddingBottom: space(1.5),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.border,
    gap: space(1),
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
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1),
  },
  cityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(0.75),
    backgroundColor: color.cardElevated,
    borderRadius: radius.pill,
    paddingHorizontal: space(1.75),
    minHeight: 36,
    maxWidth: '80%',
  },
  cityButtonActive: {
    backgroundColor: color.accent + '14',
  },
  cityButtonText: {
    color: color.textSecondary,
    flexShrink: 1,
  },
  cityButtonTextActive: {
    color: color.accent,
    flexShrink: 1,
  },
  cityClear: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: color.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: space(2),
    gap: space(1.25),
    paddingBottom: space(6),
  },
  card: {
    flexDirection: 'row',
    backgroundColor: color.card,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
    overflow: 'hidden',
    ...shadow.card,
  },
  cardAccent: {
    width: 4,
  },
  cardBody: {
    flex: 1,
    padding: space(2),
    gap: space(1),
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1.5),
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleArea: {
    flex: 1,
    gap: 2,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
  },
  resolvedBadge: {
    backgroundColor: color.cardElevated,
    borderRadius: radius.pill,
    paddingHorizontal: space(1),
    paddingVertical: 1,
  },
  resolvedBadgeText: {
    fontSize: 11,
    fontFamily: font.arabicMedium,
    color: color.textSecondary,
  },
  cardDesc: {
    lineHeight: 20,
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

const pickerStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: color.scrim,
  },
  sheet: {
    backgroundColor: color.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: space(2),
    paddingBottom: space(3),
    maxHeight: '75%',
    ...shadow.float,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: color.border,
    marginTop: space(1),
    marginBottom: space(1.5),
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space(1.5),
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1),
    backgroundColor: color.cardElevated,
    borderRadius: radius.md,
    paddingHorizontal: space(1.5),
    minHeight: 40,
    marginBottom: space(1),
  },
  searchInput: {
    flex: 1,
    color: color.textPrimary,
    fontSize: fontSize.base,
    paddingVertical: space(1),
  },
  list: {
    paddingBottom: space(2),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1.5),
    borderRadius: radius.md,
    paddingHorizontal: space(1.5),
    minHeight: 52,
  },
  rowActive: {
    backgroundColor: color.accent + '0D',
  },
  rowNames: {
    flex: 1,
    gap: 1,
  },
  rowLabel: {
    color: color.textPrimary,
  },
  rowLabelActive: {
    color: color.accent,
  },
});

export default FeedScreen;
