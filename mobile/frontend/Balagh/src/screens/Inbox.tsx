import React, { useCallback, useEffect, useState } from 'react';
import {
  SectionList,
  View,
  Pressable,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../core/theme/components';
import { color, space, fontSize } from '../core/theme/tokens';
import { ChevronLeft, Shield, Siren, Check, Radio, MessageCircle } from '../core/icons';
import { InboxSkeleton } from '../presentation/components/Skeleton';
import { useLangStore } from '../domain/stores/lang';
import { strings } from '../core/strings';
import { MockNotificationRepo } from '../data/mock/MockNotificationRepo';
import { wsEventEmitter } from '../data/mock/eventEmitter';
import { db } from '../data/mock/db';
import { groupNotifications } from '../domain/utils/notifications';
import { relativeTime } from '../core/format/time';
import type { AppNotification, WsEvent } from '../core/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Inbox'>;

const repo = new MockNotificationRepo();

const TYPE_ICON: Record<AppNotification['type'], React.ReactElement> = {
  nearby: <Siren size={18} />,
  verification: <Check size={18} color={color.success} />,
  status: <Radio size={18} />,
  follow_up: <MessageCircle size={18} />,
};

interface RowProps {
  item: AppNotification;
  onPress: (item: AppNotification) => void;
}

const NotificationRow = ({ item, onPress }: RowProps): React.ReactElement => {
  const { lang } = useLangStore();
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => onPress(item)}
      accessibilityRole="button">
      <View style={styles.rowLeft}>
        {!item.read && <View style={styles.unreadDot} />}
        <View style={styles.iconWrap}>{TYPE_ICON[item.type]}</View>
      </View>
      <View style={styles.rowBody}>
        <Text variant="label" style={item.read ? styles.readTitle : undefined}>
          {item.title}
        </Text>
        <Text secondary variant="caption" numberOfLines={2}>{item.body}</Text>
      </View>
      <Text muted variant="caption" style={styles.time}>
        {relativeTime(item.createdAt, lang)}
      </Text>
    </Pressable>
  );
};

const SectionHeader = ({ title }: { title: string }): React.ReactElement => (
  <View style={styles.sectionHeader}>
    <Text secondary variant="caption" style={styles.sectionLabel}>{title.toUpperCase()}</Text>
  </View>
);

export default function InboxScreen({ navigation }: Props): React.ReactElement {
  const { lang } = useLangStore();
  const s = strings[lang];

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await repo.getNotifications();
    setNotifications(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const unsub = wsEventEmitter.subscribe((e: WsEvent) => {
      if (e.t === 'notification.new') {
        setNotifications(prev => [e.notification, ...prev]);
      }
    });
    return unsub;
  }, []);

  const handlePress = useCallback(async (item: AppNotification) => {
    if (!item.read) {
      await repo.markRead([item.id]);
      setNotifications(prev =>
        prev.map(n => n.id === item.id ? { ...n, read: true } : n),
      );
    }
    if (!item.incidentRef) return;
    // Resolve the incident's numeric id from the ref so IncidentDetail's
    // by-id lookup succeeds (refs like BLG-XXXXXX are not valid ids).
    const incident = db.incidents.getAll().find(i => i.ref === item.incidentRef);
    if (incident) {
      navigation.navigate('IncidentDetail', { id: incident.id });
    }
  }, [navigation]);

  const handleMarkAllRead = useCallback(async () => {
    await repo.markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const groups = groupNotifications(notifications, {
    today: s.inbox.today,
    yesterday: s.inbox.yesterday,
    lastWeek: s.inbox.lastWeek,
  });

  const hasUnread = notifications.some(n => !n.read);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={color.bg} />
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
          <ChevronLeft size={20} color={color.textPrimary} />
        </Pressable>
        <Text variant="heading" style={styles.headerTitle}>{s.inbox.title}</Text>
        {hasUnread ? (
          <Pressable onPress={handleMarkAllRead} hitSlop={8} style={styles.markAllBtn}>
            <Text variant="caption" style={styles.markAllText}>{s.inbox.markAllRead}</Text>
          </Pressable>
        ) : (
          <View style={styles.headerRight} />
        )}
      </View>

      {loading ? (
        <InboxSkeleton />
      ) : (
        <SectionList
          sections={groups}
          keyExtractor={item => item.id}
          renderSectionHeader={({ section }) => <SectionHeader title={section.label} />}
          renderItem={({ item }) => (
            <NotificationRow item={item} onPress={handlePress} />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Shield size={48} />
              <Text variant="heading" style={styles.emptyTitle}>{s.inbox.empty}</Text>
              <Text secondary style={styles.emptySub}>{s.inbox.emptySub}</Text>
            </View>
          }
          contentContainerStyle={groups.length === 0 ? styles.emptyContainer : styles.listContent}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled
        />
      )}
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
  headerRight: { minWidth: 60 },
  markAllBtn: { minWidth: 60, alignItems: 'flex-end', justifyContent: 'center', minHeight: 44 },
  markAllText: { color: color.accent },
  sectionHeader: {
    backgroundColor: color.bg,
    paddingHorizontal: space(2),
    paddingTop: space(2),
    paddingBottom: space(0.75),
  },
  sectionLabel: { letterSpacing: 0.5 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: color.card,
    paddingHorizontal: space(2),
    paddingVertical: space(1.5),
    gap: space(1.5),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.border,
    minHeight: 56,
  },
  rowPressed: { opacity: 0.75 },
  rowLeft: { alignItems: 'center', gap: space(0.5), paddingTop: 2 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: color.accent,
  },
  iconWrap: { width: 24, alignItems: 'center' },
  rowBody: { flex: 1, gap: 2 },
  readTitle: { color: color.textSecondary },
  time: { paddingTop: 2, fontSize: fontSize.xs },
  empty: { alignItems: 'center', gap: space(1.5), paddingTop: space(6) },
  emptyTitle: { textAlign: 'center' },
  emptySub: { textAlign: 'center', paddingHorizontal: space(3) },
  emptyContainer: { flex: 1 },
  listContent: { paddingBottom: space(4) },
});
