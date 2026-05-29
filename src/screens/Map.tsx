import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { MapProps } from '../navigation/types';
import { color, radius, space } from '../core/theme/tokens';
import { Text, SeverityPill } from '../core/theme/components';
import { db } from '../data/mock/db';
import { LOCALITIES } from '../data/mock/db';
import store, { StorageKeys } from '../core/storage';
import type { Incident, SafetyState } from '../core/types';

function deriveStatus(incidents: Incident[]): SafetyState {
  const active = incidents.filter(i => !i.resolvedAt);
  if (active.some(i => i.severity === 'critical' || i.severity === 'high')) return 'active';
  if (active.some(i => i.severity === 'medium')) return 'watch';
  return 'calm';
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}ث`;
  if (diff < 3600) return `${Math.floor(diff / 60)}د`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}س`;
  return `${Math.floor(diff / 86400)}ي`;
}

const CATEGORY_LABELS: Record<string, string> = {
  GUNFIRE: 'إطلاق نار',
  STABBING: 'طعن',
  ASSAULT: 'اعتداء',
  ROBBERY: 'سطو',
  SUSPICIOUS: 'مشبوه',
  OTHER: 'أخرى',
};

const STATUS_LABELS: Record<SafetyState, string> = {
  calm: 'هادئ',
  watch: 'تنبّه',
  active: 'نشط',
};

interface IncidentRowProps {
  incident: Incident;
}

const IncidentRow = ({ incident }: IncidentRowProps): React.ReactElement => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <SeverityPill severity={incident.severity} label={CATEGORY_LABELS[incident.category] ?? incident.category} />
      <Text variant="caption" muted>{timeAgo(incident.createdAt)}</Text>
    </View>
    {incident.description ? (
      <Text style={styles.desc}>{incident.description}</Text>
    ) : null}
    <View style={styles.cardFooter}>
      <Text variant="caption" muted>✓ {incident.confirmations}  ✗ {incident.denials}</Text>
      <Text variant="mono" muted>{incident.ref}</Text>
    </View>
  </View>
);

const MapScreen = ({ navigation }: MapProps): React.ReactElement => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [localityName, setLocalityName] = useState('');

  useEffect(() => {
    const localityId = store.getString(StorageKeys.LOCALITY_ID);
    const found = LOCALITIES.find(l => l.id === localityId);
    setLocalityName(found?.nameAr ?? 'منطقتك');
    setIncidents(db.incidents.getAll());
  }, []);

  const status = deriveStatus(incidents);
  const statusColor = color.status[status];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text variant="heading">{localityName}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text variant="caption" style={{ color: statusColor }}>
              {STATUS_LABELS[status]}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => navigation.navigate('Settings')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Incident feed */}
      <FlatList
        data={incidents}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text secondary>لا توجد حوادث مُبلَّغ عنها</Text>
          </View>
        }
        renderItem={({ item }) => <IncidentRow incident={item} />}
      />

      {/* Report FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('ReportCategory')}
        activeOpacity={0.8}>
        <Text style={styles.fabText}>+ بلاغ</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: space(2),
    paddingTop: space(2),
    paddingBottom: space(1.5),
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  settingsBtn: {
    padding: space(1),
  },
  list: {
    paddingHorizontal: space(2),
    paddingBottom: space(10),
    gap: space(1),
  },
  card: {
    backgroundColor: color.card,
    borderRadius: radius.md,
    padding: space(2),
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  desc: {
    color: color.textPrimary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  empty: {
    alignItems: 'center',
    paddingTop: space(6),
  },
  fab: {
    position: 'absolute',
    bottom: space(4),
    alignSelf: 'center',
    backgroundColor: color.accent,
    paddingHorizontal: space(3),
    paddingVertical: space(1.5),
    borderRadius: radius.pill,
  },
  fabText: {
    color: color.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MapScreen;
