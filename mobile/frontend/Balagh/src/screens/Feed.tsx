/**
 * Incidents Feed drawer — §5.10
 *
 * A draggable bottom sheet (25 / 60 / 90 %) over the map. While the map only
 * shows currently open incidents (24 h window), the feed is the history
 * browser: a time-range filter (quick chips + more-filters sheet with extended
 * ranges and a custom calendar) plus multi-select city and incident-type
 * pickers (e.g. "gunfire + robbery, last month, Nazareth + Haifa").
 *
 * Cards are modern severity-striped tiles: tinted icon badge, category title,
 * locality + relative time, description (≤3 lines), and a resolved badge for
 * closed incidents. Tapping a card opens the Incident Detail route.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { FeedProps } from '../navigation/types';
import { color, fontSize, font, formatNumber, radius, shadow, space } from '../core/theme/tokens';
import { Text, Chip, Button } from '../core/theme/components';
import {
  Search,
  CalendarRange,
  CATEGORY_ICON,
  Check,
  ChevronDown,
  MapPin,
  Shapes,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from '../core/icons';
import type { IconProps } from '../core/icons';
import { BottomSheet } from '../presentation/components/BottomSheet';
import { FeedSkeleton } from '../presentation/components/Skeleton';
import { relativeTime } from '../core/format/time';
import { haptics } from '../core/haptics';
import { strings } from '../core/strings';
import { useLangStore } from '../domain/stores/lang';
import {
  countByCategory,
  countByLocality,
  countByRange,
  FEED_MORE_RANGES,
  FEED_RANGES,
  filterIncidents,
} from '../domain/feed/filters';
import type { FeedFilter, FeedRangeKey } from '../domain/feed/filters';
import { DateRangeCalendar } from '../presentation/components/DateRangeCalendar';
import type { DateRange } from '../presentation/components/DateRangeCalendar';
import { db, LOCALITIES } from '../data/mock/db';
import { wsEventEmitter } from '../data/mock/eventEmitter';
import type { AppLanguage, Category, Incident, Locality } from '../core/types';

function localityName(loc: Locality, lang: AppLanguage): string {
  return lang === 'he' ? loc.nameHe : lang === 'en' ? loc.nameEn : loc.nameAr;
}

// ── Multi-select picker modal ─────────────────────────────────────────────────
// Shared bottom sheet for the "choose city" and "incident type" filter buttons.
// Rows toggle (multi-select) and stay open; the "all" row clears the selection;
// an Apply button (or backdrop/✕) closes the sheet. Optionally searchable.

interface PickerItem {
  id: string;
  label: string;
  sub?: string;
  /** Extra text the search matches against (e.g. names in other scripts). */
  keywords?: string;
  /** Facet count under the current other filters (e.g. last-month incidents). */
  count?: number;
  Icon: React.ComponentType<IconProps>;
}

interface MultiPickerProps {
  visible: boolean;
  title: string;
  allLabel: string;
  items: PickerItem[];
  selectedIds: string[];
  searchable?: boolean;
  searchPlaceholder?: string;
  applyLabel: string;
  testIDPrefix: string;
  onToggle: (id: string) => void;
  onClear: () => void;
  onClose: () => void;
}

const MultiPickerModal = ({
  visible,
  title,
  allLabel,
  items,
  selectedIds,
  searchable,
  searchPlaceholder,
  applyLabel,
  testIDPrefix,
  onToggle,
  onClear,
  onClose,
}: MultiPickerProps): React.ReactElement => {
  const [query, setQuery] = useState('');

  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!searchable || !q) return items;
    return items.filter(
      item =>
        item.label.toLowerCase().includes(q) ||
        (item.sub ?? '').toLowerCase().includes(q) ||
        (item.keywords ?? '').toLowerCase().includes(q),
    );
  }, [items, query, searchable]);

  const close = (): void => {
    setQuery('');
    onClose();
  };

  const noneSelected = selectedIds.length === 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={pickerStyles.backdrop} onPress={close} testID={`${testIDPrefix}-backdrop`} />
      <View style={pickerStyles.sheet} testID={`${testIDPrefix}-modal`}>
        <View style={pickerStyles.handle} />
        <View style={pickerStyles.titleRow}>
          <Text variant="heading">{title}</Text>
          <TouchableOpacity onPress={close} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={20} color={color.textSecondary} />
          </TouchableOpacity>
        </View>

        {searchable ? (
          <View style={pickerStyles.searchBox}>
            <Search size={16} color={color.textMuted} />
            <TextInput
              style={pickerStyles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder={searchPlaceholder}
              placeholderTextColor={color.textMuted}
              autoCorrect={false}
              testID={`${testIDPrefix}-search`}
            />
          </View>
        ) : null}

        <FlatList
          data={visibleItems}
          keyExtractor={item => item.id}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={pickerStyles.list}
          ListHeaderComponent={
            <TouchableOpacity
              style={[pickerStyles.row, noneSelected && pickerStyles.rowActive]}
              onPress={() => {
                haptics.toggle();
                onClear();
              }}
              testID={`${testIDPrefix}-all`}>
              <Check size={16} color={noneSelected ? color.accent : color.textMuted} />
              <View style={pickerStyles.rowNames}>
                <Text
                  variant="label"
                  style={[pickerStyles.rowLabel, noneSelected && pickerStyles.rowLabelActive]}>
                  {allLabel}
                </Text>
              </View>
            </TouchableOpacity>
          }
          renderItem={({ item }) => {
            const active = selectedIds.includes(item.id);
            const ItemIcon = item.Icon;
            return (
              <TouchableOpacity
                style={[pickerStyles.row, active && pickerStyles.rowActive]}
                onPress={() => {
                  haptics.toggle();
                  onToggle(item.id);
                }}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: active }}
                testID={`${testIDPrefix}-${item.id}`}>
                <ItemIcon size={16} color={active ? color.accent : color.textMuted} />
                <View style={pickerStyles.rowNames}>
                  <Text
                    variant="label"
                    style={[pickerStyles.rowLabel, active && pickerStyles.rowLabelActive]}>
                    {item.label}
                  </Text>
                  {item.sub ? (
                    <Text variant="caption" muted>{item.sub}</Text>
                  ) : null}
                </View>
                {typeof item.count === 'number' ? (
                  <View style={pickerStyles.countPill}>
                    <Text variant="caption" secondary>{formatNumber(item.count)}</Text>
                  </View>
                ) : null}
                <View style={[pickerStyles.checkbox, active && pickerStyles.checkboxActive]}>
                  {active && <Check size={13} color={color.textOnAccent} />}
                </View>
              </TouchableOpacity>
            );
          }}
        />

        <Button
          label={applyLabel}
          variant="primary"
          fullWidth
          onPress={close}
          style={filtersStyles.applyBtn}
          testID={`${testIDPrefix}-apply`}
        />
      </View>
    </Modal>
  );
};

// ── More-filters modal ────────────────────────────────────────────────────────
// Opened by the "more" button after the quick range chips. Offers the extended
// ranges (last 3 months / last year) and a custom date-range calendar.

const formatShortDate = (ms: number): string => {
  const d = new Date(ms);
  return formatNumber(`${d.getDate()}/${d.getMonth() + 1}`);
};

interface MoreFiltersProps {
  visible: boolean;
  range: FeedRangeKey;
  customRange: DateRange;
  lang: AppLanguage;
  /** Facet counts for the preset ranges under the other active filters. */
  rangeCounts: Record<Exclude<FeedRangeKey, 'custom'>, number>;
  /** Count for a pending custom range under the other active filters. */
  getCustomCount: (range: DateRange) => number;
  onApply: (range: FeedRangeKey, customRange: DateRange) => void;
  onClose: () => void;
}

const MoreFiltersModal = ({
  visible,
  range,
  customRange,
  lang,
  rangeCounts,
  getCustomCount,
  onApply,
  onClose,
}: MoreFiltersProps): React.ReactElement => {
  const s = strings[lang];
  const [pending, setPending] = useState<DateRange>(customRange);

  // Re-sync the draft selection each time the sheet opens.
  useEffect(() => {
    if (visible) setPending(customRange);
  }, [visible, customRange]);

  const pickPreset = (key: FeedRangeKey): void => {
    haptics.toggle();
    onApply(key, { from: null, to: null });
    onClose();
  };

  const applyCustom = (): void => {
    if (pending.from === null || pending.to === null) return;
    haptics.toggle();
    onApply('custom', pending);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={pickerStyles.backdrop} onPress={onClose} testID="feed-filters-backdrop" />
      <View style={pickerStyles.sheet} testID="feed-filters-modal">
        <View style={pickerStyles.handle} />
        <View style={pickerStyles.titleRow}>
          <Text variant="heading">{s.feed.filtersTitle}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={20} color={color.textSecondary} />
          </TouchableOpacity>
        </View>

        {FEED_MORE_RANGES.map(key => {
          const active = range === key;
          return (
            <TouchableOpacity
              key={key}
              style={[pickerStyles.row, active && pickerStyles.rowActive]}
              onPress={() => pickPreset(key)}
              testID={`feed-range-${key}`}>
              <CalendarRange size={16} color={active ? color.accent : color.textMuted} />
              <View style={pickerStyles.rowNames}>
                <Text
                  variant="label"
                  style={[pickerStyles.rowLabel, active && pickerStyles.rowLabelActive]}>
                  {s.feed.ranges[key]}
                </Text>
              </View>
              <View style={pickerStyles.countPill}>
                <Text variant="caption" secondary>{formatNumber(rangeCounts[key])}</Text>
              </View>
              {active && <Check size={18} color={color.accent} />}
            </TouchableOpacity>
          );
        })}

        <View style={filtersStyles.customHeader}>
          <CalendarRange size={16} color={range === 'custom' ? color.accent : color.textMuted} />
          <Text
            variant="label"
            style={range === 'custom' ? pickerStyles.rowLabelActive : pickerStyles.rowLabel}>
            {s.feed.customRange}
          </Text>
          {pending.from !== null ? (
            <Text variant="caption" muted>
              {formatShortDate(pending.from)}
              {pending.to !== null ? ` – ${formatShortDate(pending.to)}` : ''}
            </Text>
          ) : null}
        </View>

        <DateRangeCalendar lang={lang} range={pending} onChange={setPending} />

        <Button
          label={
            pending.from !== null && pending.to !== null
              ? `${s.feed.apply} (${formatNumber(getCustomCount(pending))})`
              : s.feed.apply
          }
          variant="primary"
          fullWidth
          disabled={pending.from === null || pending.to === null}
          onPress={applyCustom}
          style={filtersStyles.applyBtn}
          testID="feed-filters-apply"
        />
      </View>
    </Modal>
  );
};

const FeedScreen = ({ navigation }: FeedProps): React.ReactElement => {
  const { lang } = useLangStore();
  const s = strings[lang];

  const [incidents, setIncidents] = useState<Incident[]>(() => db.incidents.getAll());
  const [range, setRange] = useState<FeedRangeKey>('day');
  const [localityIds, setLocalityIds] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [customRange, setCustomRange] = useState<DateRange>({ from: null, to: null });
  const [, setTick] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const activeFilter = useMemo<FeedFilter>(
    () => ({
      range,
      localityIds,
      categories,
      customFrom: customRange.from,
      customTo: customRange.to,
    }),
    [range, localityIds, categories, customRange],
  );

  const visible = useMemo(
    () => filterIncidents(incidents, activeFilter),
    [incidents, activeFilter],
  );

  // Facet counts — every filter option shows how many incidents it matches
  // under the user's other active filters (its own dimension is ignored).
  const localityCounts = useMemo(
    () => countByLocality(incidents, activeFilter),
    [incidents, activeFilter],
  );
  const categoryCounts = useMemo(
    () => countByCategory(incidents, activeFilter),
    [incidents, activeFilter],
  );
  const rangeCounts = useMemo(
    () => countByRange(incidents, activeFilter),
    [incidents, activeFilter],
  );
  const getCustomCount = useCallback(
    (pending: DateRange): number =>
      filterIncidents(incidents, {
        ...activeFilter,
        range: 'custom',
        customFrom: pending.from,
        customTo: pending.to,
      }).length,
    [incidents, activeFilter],
  );

  // Multi-select button labels: "first selection +N" when several are chosen.
  const cityLabel = useMemo(() => {
    if (localityIds.length === 0) return s.feed.allLocalities;
    const first = LOCALITIES.find(l => l.id === localityIds[0]);
    const name = first ? localityName(first, lang) : s.feed.allLocalities;
    return localityIds.length === 1
      ? name
      : `${name} +${formatNumber(localityIds.length - 1)}`;
  }, [localityIds, lang, s]);

  const typeLabel = useMemo(() => {
    if (categories.length === 0) return s.feed.chooseType;
    const name = s.category[categories[0]];
    return categories.length === 1
      ? name
      : `${name} +${formatNumber(categories.length - 1)}`;
  }, [categories, s]);

  const cityItems = useMemo<PickerItem[]>(
    () =>
      LOCALITIES.map(loc => ({
        id: loc.id,
        label: localityName(loc, lang),
        sub: lang !== 'ar' ? loc.nameAr : undefined,
        keywords: `${loc.nameAr} ${loc.nameHe} ${loc.nameEn}`,
        count: localityCounts[loc.id] ?? 0,
        Icon: MapPin,
      })),
    [lang, localityCounts],
  );

  const typeItems = useMemo<PickerItem[]>(
    () =>
      (Object.keys(CATEGORY_ICON) as Category[]).map(cat => ({
        id: cat,
        label: s.category[cat],
        count: categoryCounts[cat] ?? 0,
        Icon: CATEGORY_ICON[cat],
      })),
    [s, categoryCounts],
  );

  const toggleIn = <T extends string>(list: T[], id: T): T[] =>
    list.includes(id) ? list.filter(x => x !== id) : [...list, id];

  // The "more" button reflects the extended selection (3 months / year / custom).
  const extendedActive = range === 'quarter' || range === 'year' || range === 'custom';
  const moreButtonLabel = useMemo(() => {
    if (range === 'quarter' || range === 'year') return s.feed.ranges[range];
    if (range === 'custom' && customRange.from !== null && customRange.to !== null) {
      return `${formatShortDate(customRange.from)} – ${formatShortDate(customRange.to)}`;
    }
    return s.feed.moreFilters;
  }, [range, customRange, s]);

  const renderCard = useCallback(
    ({ item }: { item: Incident }): React.ReactElement => {
      const CatIcon = CATEGORY_ICON[item.category];
      const sevColor = color.severity[item.severity];
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
    [s, lang, navigation],
  );

  return (
    <BottomSheet
      snapPoints={[0.25, 0.6, 0.9]}
      initialSnapIndex={1}
      onClose={() => navigation.goBack()}
      testID="feed-sheet">
      {/* Sticky header — no search bar: descriptions are prepared options, so
          the filters (time range, more-filters sheet, city) drive the list. */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text variant="heading">{s.feed.title}</Text>
          <View style={styles.countPill} testID="feed-count">
            <Text variant="caption" secondary>{formatNumber(visible.length)}</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}>
          {FEED_RANGES.map(key => (
            <Chip
              key={key}
              label={s.feed.ranges[key]}
              count={rangeCounts[key]}
              active={range === key}
              onPress={() => {
                haptics.toggle();
                setRange(key);
              }}
              testID={`feed-range-${key}`}
              style={styles.chip}
            />
          ))}

          <TouchableOpacity
            style={[styles.moreButton, extendedActive && styles.moreButtonActive]}
            onPress={() => {
              haptics.toggle();
              setMoreFiltersOpen(true);
            }}
            activeOpacity={0.8}
            testID="feed-more-filters">
            <SlidersHorizontal
              size={14}
              color={extendedActive ? color.textOnAccent : color.textSecondary}
            />
            <Text
              variant="label"
              style={extendedActive ? styles.moreButtonTextActive : styles.moreButtonText}
              numberOfLines={1}>
              {moreButtonLabel}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* City + incident-type filter buttons — both multi-select pickers. */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cityRow}>
          <TouchableOpacity
            style={[styles.cityButton, localityIds.length > 0 && styles.cityButtonActive]}
            onPress={() => {
              haptics.toggle();
              setCityPickerOpen(true);
            }}
            activeOpacity={0.8}
            testID="feed-city-button">
            <MapPin
              size={15}
              color={localityIds.length > 0 ? color.accent : color.textSecondary}
            />
            <Text
              variant="label"
              style={localityIds.length > 0 ? styles.cityButtonTextActive : styles.cityButtonText}
              numberOfLines={1}>
              {cityLabel}
            </Text>
            <ChevronDown
              size={15}
              color={localityIds.length > 0 ? color.accent : color.textSecondary}
            />
          </TouchableOpacity>

          {localityIds.length > 0 ? (
            <TouchableOpacity
              style={styles.cityClear}
              onPress={() => {
                haptics.toggle();
                setLocalityIds([]);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              testID="feed-city-clear">
              <X size={14} color={color.textSecondary} />
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[styles.cityButton, categories.length > 0 && styles.cityButtonActive]}
            onPress={() => {
              haptics.toggle();
              setTypePickerOpen(true);
            }}
            activeOpacity={0.8}
            testID="feed-type-button">
            <Shapes
              size={15}
              color={categories.length > 0 ? color.accent : color.textSecondary}
            />
            <Text
              variant="label"
              style={categories.length > 0 ? styles.cityButtonTextActive : styles.cityButtonText}
              numberOfLines={1}>
              {typeLabel}
            </Text>
            <ChevronDown
              size={15}
              color={categories.length > 0 ? color.accent : color.textSecondary}
            />
          </TouchableOpacity>

          {categories.length > 0 ? (
            <TouchableOpacity
              style={styles.cityClear}
              onPress={() => {
                haptics.toggle();
                setCategories([]);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              testID="feed-type-clear">
              <X size={14} color={color.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </ScrollView>
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

      <MultiPickerModal
        visible={cityPickerOpen}
        title={s.feed.chooseCity}
        allLabel={s.feed.allLocalities}
        items={cityItems}
        selectedIds={localityIds}
        searchable
        searchPlaceholder={s.locality.searchPlaceholder}
        applyLabel={s.feed.apply}
        testIDPrefix="feed-city"
        onToggle={id => setLocalityIds(prev => toggleIn(prev, id))}
        onClear={() => setLocalityIds([])}
        onClose={() => setCityPickerOpen(false)}
      />

      <MultiPickerModal
        visible={typePickerOpen}
        title={s.feed.chooseType}
        allLabel={s.feed.allTypes}
        items={typeItems}
        selectedIds={categories}
        applyLabel={s.feed.apply}
        testIDPrefix="feed-type"
        onToggle={id => setCategories(prev => toggleIn(prev, id as Category))}
        onClear={() => setCategories([])}
        onClose={() => setTypePickerOpen(false)}
      />

      <MoreFiltersModal
        visible={moreFiltersOpen}
        range={range}
        customRange={customRange}
        lang={lang}
        rangeCounts={rangeCounts}
        getCustomCount={getCustomCount}
        onApply={(nextRange, nextCustom) => {
          setRange(nextRange);
          setCustomRange(nextCustom);
        }}
        onClose={() => setMoreFiltersOpen(false)}
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1),
  },
  countPill: {
    backgroundColor: color.cardElevated,
    borderRadius: radius.pill,
    paddingHorizontal: space(1.25),
    minWidth: 28,
    minHeight: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(0.75),
    paddingEnd: space(2),
  },
  chip: {
    marginEnd: space(0.5),
  },
  moreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(0.75),
    backgroundColor: color.cardElevated,
    borderRadius: radius.pill,
    paddingHorizontal: space(1.75),
    minHeight: 34,
    maxWidth: '60%',
  },
  moreButtonActive: {
    backgroundColor: color.accent,
  },
  moreButtonText: {
    color: color.textSecondary,
    flexShrink: 1,
  },
  moreButtonTextActive: {
    color: color.textOnAccent,
    flexShrink: 1,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1),
    paddingEnd: space(2),
  },
  cityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(0.75),
    backgroundColor: color.cardElevated,
    borderRadius: radius.pill,
    paddingHorizontal: space(1.75),
    minHeight: 36,
    maxWidth: 240,
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
  countPill: {
    backgroundColor: color.cardElevated,
    borderRadius: radius.pill,
    minWidth: 26,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: color.border,
    backgroundColor: color.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    borderColor: color.accent,
    backgroundColor: color.accent,
  },
});

const filtersStyles = StyleSheet.create({
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1.5),
    paddingHorizontal: space(1.5),
    minHeight: 44,
    marginTop: space(0.5),
  },
  applyBtn: {
    marginTop: space(1.5),
  },
});

export default FeedScreen;
