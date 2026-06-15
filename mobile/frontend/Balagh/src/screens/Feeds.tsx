/**
 * Feeds — §5.10b
 *
 * A draggable bottom sheet (25 / 60 / 90 %) over the map — same surface idiom
 * as the incidents Feed. Surfaces community content the map can't:
 *  - **Announcements / events** organized by the Balagh team.
 *  - **News** about violence in the Arab community.
 *
 * Filter chips (All / Events / News) switch the list; each post is a clean
 * card with a tinted kind badge, source + relative time, title and a short
 * body. Opened from the map's bottom action tray (feeds icon).
 */

import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Text, Chip } from '../core/theme/components';
import { color, font, fontSize, radius, shadow, space } from '../core/theme/tokens';
import { Megaphone, Newspaper } from '../core/icons';
import type { IconProps } from '../core/icons';
import { BottomSheet } from '../presentation/components/BottomSheet';
import { relativeTime } from '../core/format/time';
import { haptics } from '../core/haptics';
import { strings } from '../core/strings';
import { useLangStore } from '../domain/stores/lang';
import { db } from '../data/mock/db';
import type { FeedPost, FeedPostKind } from '../core/types';
import type { FeedsProps } from '../navigation/types';

type FilterKey = 'all' | 'announcements' | 'news';
const FILTERS: FilterKey[] = ['all', 'announcements', 'news'];

const KIND_VISUAL: Record<FeedPostKind, { Icon: React.ComponentType<IconProps>; tint: string }> = {
  announcement: { Icon: Megaphone, tint: color.accent },
  news: { Icon: Newspaper, tint: color.status.watch },
};

const FeedsScreen = ({ navigation }: FeedsProps): React.ReactElement => {
  const { lang } = useLangStore();
  const s = strings[lang];

  const [filter, setFilter] = useState<FilterKey>('all');
  const [posts] = useState<FeedPost[]>(() => db.feedPosts.getAll());

  const visible = useMemo(() => {
    if (filter === 'all') return posts;
    const kind: FeedPostKind = filter === 'announcements' ? 'announcement' : 'news';
    return posts.filter(p => p.kind === kind);
  }, [posts, filter]);

  const renderCard = ({ item }: { item: FeedPost }): React.ReactElement => {
    const { Icon, tint } = KIND_VISUAL[item.kind];
    const kindLabel = item.kind === 'announcement' ? s.feeds.announcement : s.feeds.news;
    return (
      <View style={styles.card} testID={`feed-post-${item.id}`}>
        <View style={[styles.iconBadge, { backgroundColor: tint + '14' }]}>
          <Icon size={20} color={tint} />
        </View>
        <View style={styles.cardBody}>
          <View style={styles.metaRow}>
            <View style={[styles.kindPill, { backgroundColor: tint + '14' }]}>
              <Text variant="caption" style={[styles.kindPillText, { color: tint }]}>
                {kindLabel}
              </Text>
            </View>
            <Text variant="caption" muted numberOfLines={1} style={styles.source}>
              {item.source}
            </Text>
            <Text variant="caption" muted>·</Text>
            <Text variant="caption" muted>{relativeTime(item.createdAt, lang)}</Text>
          </View>
          <Text variant="label" style={styles.title}>{item.title}</Text>
          <Text secondary variant="caption" numberOfLines={3} style={styles.body}>
            {item.body}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <BottomSheet
      snapPoints={[0.25, 0.6, 0.9]}
      initialSnapIndex={1}
      onClose={() => navigation.goBack()}
      testID="feeds-sheet">
      {/* Sticky header */}
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <Text variant="heading">{s.feeds.title}</Text>
          <Text variant="caption" muted numberOfLines={1}>{s.feeds.subtitle}</Text>
        </View>
        <View style={styles.chipsRow}>
          {FILTERS.map(key => (
            <Chip
              key={key}
              label={s.feeds.filters[key]}
              active={filter === key}
              onPress={() => {
                haptics.toggle();
                setFilter(key);
              }}
              testID={`feeds-filter-${key}`}
              style={styles.chip}
            />
          ))}
        </View>
      </View>

      <FlatList
        data={visible}
        keyExtractor={p => p.id}
        renderItem={renderCard}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty} testID="feeds-empty">
            <Newspaper size={40} color={color.textMuted} />
            <Text secondary style={styles.emptyTitle}>{s.feeds.empty}</Text>
            <Text muted variant="caption" style={styles.emptySub}>{s.feeds.emptySub}</Text>
          </View>
        }
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
  titleWrap: { gap: 2 },
  chipsRow: {
    flexDirection: 'row',
    gap: space(0.75),
  },
  chip: { marginEnd: space(0.5) },
  list: {
    padding: space(2),
    paddingBottom: space(6),
    gap: space(1.25),
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space(1.5),
    backgroundColor: color.card,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
    padding: space(2),
    ...shadow.card,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, gap: space(0.5) },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  kindPill: {
    borderRadius: radius.pill,
    paddingHorizontal: space(1),
    paddingVertical: 2,
  },
  kindPillText: { fontSize: 11, fontFamily: font.arabicMedium },
  source: { flexShrink: 1 },
  title: { lineHeight: 22 },
  body: { lineHeight: 19 },
  empty: { alignItems: 'center', paddingTop: space(7), gap: space(1) },
  emptyTitle: { fontSize: fontSize.md, fontFamily: font.arabicSemiBold },
  emptySub: { textAlign: 'center', paddingHorizontal: space(4) },
});

export default FeedsScreen;
