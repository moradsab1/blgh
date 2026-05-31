import React, { useState } from 'react';
import {
  View,
  Pressable,
  ScrollView,
  StyleSheet,
  StatusBar,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button } from '../core/theme/components';
import { color, space, radius, fontSize } from '../core/theme/tokens';
import { ChevronLeft } from '../core/icons';
import { useLangStore } from '../domain/stores/lang';
import { strings } from '../core/strings';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'FollowUp'>;

type Screen = 'gate' | 'details' | 'resources';

interface Details {
  vehicle: 'yes' | 'no' | null;
  assailants: '1' | '2' | '3+' | null;
  direction: 'north' | 'south' | 'east' | 'west' | null;
  weapon: 'yes' | 'no' | null;
}

const INITIAL_DETAILS: Details = {
  vehicle: null,
  assailants: null,
  direction: null,
  weapon: null,
};

interface ChipGroupProps<T extends string> {
  label: string;
  options: { value: T; label: string }[];
  selected: T | null;
  onSelect: (v: T | null) => void;
}

function ChipGroup<T extends string>({ label, options, selected, onSelect }: ChipGroupProps<T>): React.ReactElement {
  return (
    <View style={cgStyles.group}>
      <Text secondary variant="caption" style={cgStyles.label}>{label}</Text>
      <View style={cgStyles.chips}>
        {options.map(opt => {
          const active = selected === opt.value;
          return (
            <Pressable
              key={opt.value}
              style={[cgStyles.chip, active && cgStyles.chipActive]}
              onPress={() => onSelect(active ? null : opt.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}>
              <Text
                variant="caption"
                style={{ color: active ? color.textPrimary : color.textSecondary }}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const cgStyles = StyleSheet.create({
  group: { gap: space(0.75) },
  label: { paddingHorizontal: space(0.5) },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1) },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.card,
    paddingHorizontal: space(1.5),
    paddingVertical: space(0.75),
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipActive: {
    borderColor: color.accent,
    backgroundColor: color.accent + '22',
  },
});

export default function FollowUpScreen({ navigation, route }: Props): React.ReactElement {
  const { ref } = route.params;
  const { lang } = useLangStore();
  const s = strings[lang];

  const [screen, setScreen] = useState<Screen>('gate');
  const [details, setDetails] = useState<Details>(INITIAL_DETAILS);

  const handleSafe = (): void => setScreen('details');
  const handleUnsafe = (): void => setScreen('resources');

  const handleSubmitDetails = (): void => {
    navigation.reset({ index: 0, routes: [{ name: 'Map' }] });
  };

  const handleCallMDA = async (): Promise<void> => {
    const url = `tel:${s.followup.mdaNumber}`;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) { await Linking.openURL(url); return; }
    } catch {}
    Alert.alert(s.followup.mdaLabel, s.followup.mdaNumber);
  };

  const handleDone = (): void => {
    navigation.reset({ index: 0, routes: [{ name: 'Map' }] });
  };

  const set = <K extends keyof Details>(key: K, value: Details[K]): void =>
    setDetails(prev => ({ ...prev, [key]: value }));

  // Internal sub-screen back: details/resources → gate, gate → parent stack
  const handleBack = (): void => {
    if (screen === 'gate') {
      navigation.goBack();
    } else {
      setScreen('gate');
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={color.bg} />
      <View style={styles.header}>
        <Pressable onPress={handleBack} hitSlop={12} style={styles.backBtn}>
          <ChevronLeft size={20} color={color.textPrimary} />
        </Pressable>
        <Text variant="heading" style={styles.headerTitle}>{s.followup.title}</Text>
        <View style={styles.headerRight} />
      </View>

      <Text secondary variant="caption" style={styles.refBadge}>{ref}</Text>

      {screen === 'gate' && (
        <View style={styles.gateContent}>
          <Text variant="heading" style={styles.gateQuestion}>{s.followup.gateQuestion}</Text>
          <View style={styles.gateButtons}>
            <Button
              label={s.followup.safeYes}
              variant="secondary"
              fullWidth
              onPress={handleSafe}
            />
            <Button
              label={s.followup.safeNo}
              variant="danger"
              fullWidth
              onPress={handleUnsafe}
            />
          </View>
        </View>
      )}

      {screen === 'details' && (
        <ScrollView contentContainerStyle={styles.detailsContent} showsVerticalScrollIndicator={false}>
          <Text secondary style={styles.detailsSubtitle}>{s.followup.detailsSubtitle}</Text>

          <ChipGroup
            label={s.followup.vehicleLabel}
            options={[
              { value: 'yes', label: s.followup.yes },
              { value: 'no', label: s.followup.no },
            ]}
            selected={details.vehicle}
            onSelect={v => set('vehicle', v)}
          />

          <ChipGroup
            label={s.followup.assailantLabel}
            options={[
              { value: '1', label: s.followup.one },
              { value: '2', label: s.followup.two },
              { value: '3+', label: s.followup.threePlus },
            ]}
            selected={details.assailants}
            onSelect={v => set('assailants', v)}
          />

          <ChipGroup
            label={s.followup.directionLabel}
            options={[
              { value: 'north', label: s.followup.north },
              { value: 'south', label: s.followup.south },
              { value: 'east', label: s.followup.east },
              { value: 'west', label: s.followup.west },
            ]}
            selected={details.direction}
            onSelect={v => set('direction', v)}
          />

          <ChipGroup
            label={s.followup.weaponLabel}
            options={[
              { value: 'yes', label: s.followup.yes },
              { value: 'no', label: s.followup.no },
            ]}
            selected={details.weapon}
            onSelect={v => set('weapon', v)}
          />

          <View style={styles.detailsFooter}>
            <Button
              label={s.followup.submitDetails}
              variant="primary"
              fullWidth
              onPress={handleSubmitDetails}
            />
          </View>
        </ScrollView>
      )}

      {screen === 'resources' && (
        <ScrollView contentContainerStyle={styles.resourcesContent} showsVerticalScrollIndicator={false}>
          <View style={styles.resourcesNote}>
            <Text secondary style={styles.noteText}>{s.followup.resourcesNote}</Text>
          </View>

          <View style={styles.resourceCard}>
            <View style={styles.resourceInfo}>
              <Text variant="label">{s.followup.mdaLabel}</Text>
              <Text style={styles.resourceNumber}>{s.followup.mdaNumber}</Text>
            </View>
            <Pressable
              style={styles.callBtn}
              onPress={handleCallMDA}
              accessibilityRole="button"
              accessibilityLabel={`${s.followup.call} ${s.followup.mdaLabel}`}>
              <Text style={styles.callBtnText}>{s.followup.call}</Text>
            </Pressable>
          </View>

          <View style={[styles.resourceCard, styles.resourceCardLast, styles.civilCard]}>
            <View style={styles.resourceInfo}>
              <Text variant="label">{s.followup.civilLabel}</Text>
              <Text secondary variant="caption" style={styles.civilNote}>
                {s.followup.civilNote}
              </Text>
            </View>
          </View>

          <View style={styles.resourcesFooter}>
            <Button
              label={s.followup.done}
              variant="primary"
              fullWidth
              onPress={handleDone}
            />
          </View>
        </ScrollView>
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
  headerRight: { minWidth: 44 },
  refBadge: {
    textAlign: 'center',
    paddingVertical: space(1),
    letterSpacing: 1,
  },
  // Gate
  gateContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space(3),
    gap: space(3),
  },
  gateQuestion: {
    textAlign: 'center',
    fontSize: fontSize.lg,
  },
  gateButtons: { width: '100%', gap: space(1.5) },
  // Details
  detailsContent: {
    paddingHorizontal: space(2),
    paddingTop: space(2),
    paddingBottom: space(4),
    gap: space(2.5),
  },
  detailsSubtitle: { textAlign: 'center', marginBottom: space(1) },
  detailsFooter: { marginTop: space(2) },
  // Resources
  resourcesContent: {
    paddingHorizontal: space(2),
    paddingTop: space(2),
    paddingBottom: space(4),
    gap: space(2),
  },
  resourcesNote: {
    backgroundColor: color.card,
    borderRadius: radius.md,
    padding: space(2),
    borderLeftWidth: 3,
    borderLeftColor: color.warning,
  },
  noteText: { lineHeight: 22 },
  resourceCard: {
    backgroundColor: color.card,
    borderRadius: radius.md,
    borderBottomWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: space(2),
    gap: space(2),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
  },
  resourceCardLast: { borderBottomWidth: StyleSheet.hairlineWidth },
  civilCard: {
    alignItems: 'flex-start',
  },
  civilNote: {
    lineHeight: 18,
    marginTop: 2,
  },
  resourceInfo: { flex: 1, gap: 4 },
  resourceNumber: {
    fontSize: fontSize.xl,
    color: color.textPrimary,
    letterSpacing: 2,
  },
  callBtn: {
    backgroundColor: color.success,
    borderRadius: radius.md,
    paddingHorizontal: space(2),
    paddingVertical: space(1),
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 64,
  },
  callBtnText: { color: '#fff', fontWeight: '600' },
  resourcesFooter: { marginTop: space(2) },
});
