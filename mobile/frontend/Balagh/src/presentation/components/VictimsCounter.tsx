/**
 * Arab-community victims counter — §5.6b
 *
 * A compact card in the map's top row (beside the safety status pill) showing
 * the current year's victim count as a bold red number. Tapping it opens a
 * lightweight popover (transparent Modal, not a full-screen modal) floating
 * over the map with: the current-year count, the last 3 years, a highlighted
 * all-years total, a year-range filter, and a link to the memorial website.
 *
 * All values load from the repository (mock today) with loading + error states.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Text, Chip } from '../../core/theme/components';
import {
  color,
  font,
  fontSize,
  formatNumber,
  motion,
  radius,
  shadow,
  space,
} from '../../core/theme/tokens';
import { Globe, X } from '../../core/icons';
import { haptics } from '../../core/haptics';
import { useReduceMotion } from '../../core/a11y/useReduceMotion';
import { strings } from '../../core/strings';
import { useLangStore } from '../../domain/stores/lang';
import { MEMORIAL_URL } from '../../core/config';
import { MockVictimsRepo } from '../../data/mock/MockVictimsRepo';
import type { VictimStats } from '../../core/types';

const repo = new MockVictimsRepo();

export const VictimsCounter = (): React.ReactElement => {
  const { lang } = useLangStore();
  const s = strings[lang];
  const reduceMotion = useReduceMotion();

  const [stats, setStats] = useState<VictimStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);

  // Year-range filter state
  const [fromYear, setFromYear] = useState<number | null>(null);
  const [toYear, setToYear] = useState<number | null>(null);
  const [rangeCount, setRangeCount] = useState<number | null>(null);
  const [rangeLoading, setRangeLoading] = useState(false);

  const anim = useRef(new Animated.Value(0)).current;

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    repo
      .getStats()
      .then(st => {
        setStats(st);
        const years = st.byYear.map(y => y.year);
        setFromYear(years[years.length - 1] ?? st.currentYear);
        setToYear(years[0] ?? st.currentYear);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  useEffect(() => { load(); }, [load]);

  const openPopover = useCallback(() => {
    haptics.toggle();
    setOpen(true);
    Animated.timing(anim, {
      toValue: 1,
      duration: reduceMotion ? 0 : motion.fast,
      useNativeDriver: true,
    }).start();
  }, [anim, reduceMotion]);

  const closePopover = useCallback(() => {
    Animated.timing(anim, {
      toValue: 0,
      duration: reduceMotion ? 0 : motion.fast,
      useNativeDriver: true,
    }).start(() => setOpen(false));
  }, [anim, reduceMotion]);

  const years = useMemo(() => stats?.byYear.map(y => y.year) ?? [], [stats]);
  const lastThree = useMemo(() => stats?.byYear.slice(1, 4) ?? [], [stats]);

  const applyRange = useCallback(() => {
    if (fromYear == null || toYear == null) return;
    setRangeLoading(true);
    repo
      .getRangeCount(fromYear, toYear)
      .then(n => { setRangeCount(n); setRangeLoading(false); })
      .catch(() => { setRangeCount(null); setRangeLoading(false); });
  }, [fromYear, toYear]);

  const openMemorial = useCallback(() => {
    haptics.press();
    Linking.openURL(MEMORIAL_URL).catch(() => {});
  }, []);

  return (
    <>
      <Pressable
        style={styles.card}
        onPress={openPopover}
        accessibilityRole="button"
        accessibilityLabel={s.victims.title}
        testID="victims-card">
        <Text variant="caption" muted style={styles.cardLabel} numberOfLines={1}>
          {s.victims.victimsLabel} {stats ? formatNumber(stats.currentYear) : ''}
        </Text>
        {loading ? (
          <ActivityIndicator size="small" color={color.accent} testID="victims-card-loading" />
        ) : error ? (
          <Text style={styles.cardNumberMuted}>—</Text>
        ) : (
          <Text style={styles.cardNumber} testID="victims-card-number">
            {formatNumber(stats?.currentYearCount ?? 0)}
          </Text>
        )}
      </Pressable>

      <Modal visible={open} transparent animationType="none" onRequestClose={closePopover}>
        <Pressable style={styles.backdrop} onPress={closePopover} testID="victims-backdrop" />
        <Animated.View
          style={[
            styles.popover,
            {
              opacity: anim,
              transform: [
                { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
              ],
            },
          ]}
          testID="victims-popover">
          <View style={styles.popHeader}>
            <Text variant="heading" style={styles.popTitle}>{s.victims.title}</Text>
            <Pressable onPress={closePopover} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} testID="victims-close">
              <X size={20} color={color.textSecondary} />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.stateBox}>
              <ActivityIndicator color={color.accent} />
            </View>
          ) : error ? (
            <View style={styles.stateBox}>
              <Text secondary style={styles.errorText}>{s.victims.error}</Text>
              <Chip label={s.common.retry} active onPress={load} testID="victims-retry" />
            </View>
          ) : stats ? (
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Current year */}
              <View style={styles.currentRow}>
                <Text variant="caption" muted>{formatNumber(stats.currentYear)}</Text>
                <Text style={styles.currentNumber}>{formatNumber(stats.currentYearCount)}</Text>
              </View>

              {/* Last 3 years */}
              <View style={styles.yearsGrid}>
                {lastThree.map(y => (
                  <View key={y.year} style={styles.yearCell}>
                    <Text variant="caption" muted>{formatNumber(y.year)}</Text>
                    <Text style={styles.yearValue}>{formatNumber(y.count)}</Text>
                  </View>
                ))}
              </View>

              {/* Total (highlighted) */}
              <View style={styles.totalBox}>
                <Text variant="label" style={styles.totalLabel}>{s.victims.total}</Text>
                <Text style={styles.totalValue}>{formatNumber(stats.total)}</Text>
              </View>

              {/* Year-range filter */}
              <Text variant="label" style={styles.rangeTitle}>{s.victims.rangeTitle}</Text>
              <Text variant="caption" muted>{s.victims.fromYear}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {years.map(y => (
                  <Chip
                    key={`from-${y}`}
                    label={formatNumber(y)}
                    active={fromYear === y}
                    onPress={() => setFromYear(y)}
                    style={styles.chip}
                    testID={`victims-from-${y}`}
                  />
                ))}
              </ScrollView>
              <Text variant="caption" muted style={styles.toLabel}>{s.victims.toYear}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {years.map(y => (
                  <Chip
                    key={`to-${y}`}
                    label={formatNumber(y)}
                    active={toYear === y}
                    onPress={() => setToYear(y)}
                    style={styles.chip}
                    testID={`victims-to-${y}`}
                  />
                ))}
              </ScrollView>

              <Pressable style={styles.applyBtn} onPress={applyRange} testID="victims-apply">
                <Text variant="label" style={styles.applyText}>{s.victims.apply}</Text>
              </Pressable>

              {rangeLoading ? (
                <ActivityIndicator color={color.accent} style={styles.rangeResult} />
              ) : rangeCount !== null ? (
                <View style={styles.rangeResultRow}>
                  <Text variant="caption" secondary>{s.victims.inRange}</Text>
                  <Text style={styles.rangeValue} testID="victims-range-value">{formatNumber(rangeCount)}</Text>
                </View>
              ) : null}

              {/* Memorial website */}
              <Pressable style={styles.memorialBtn} onPress={openMemorial} testID="victims-memorial">
                <Globe size={18} color={color.accent} />
                <View style={styles.memorialBody}>
                  <Text variant="label" style={styles.memorialLabel}>{s.victims.memorialLabel}</Text>
                  <Text variant="caption" muted>{s.victims.memorialDesc}</Text>
                </View>
              </Pressable>
            </ScrollView>
          ) : null}
        </Animated.View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.card,
    borderRadius: radius.md,
    paddingHorizontal: space(1.5),
    paddingVertical: space(0.75),
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
    ...shadow.float,
  },
  cardLabel: { textAlign: 'center' },
  cardNumber: {
    fontFamily: font.arabicBold,
    fontSize: fontSize.xl,
    lineHeight: fontSize.xl + 4,
    color: color.accent,
  },
  cardNumberMuted: {
    fontFamily: font.arabicBold,
    fontSize: fontSize.xl,
    color: color.textMuted,
  },

  // Popover
  backdrop: {
    flex: 1,
    backgroundColor: color.scrim,
  },
  popover: {
    position: 'absolute',
    top: '12%',
    alignSelf: 'center',
    width: '90%',
    maxWidth: 360,
    maxHeight: '72%',
    backgroundColor: color.card,
    borderRadius: radius.xl,
    padding: space(2),
    ...shadow.float,
  },
  popHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space(1.5),
    gap: space(1),
  },
  popTitle: { flex: 1, fontSize: fontSize.md },
  stateBox: { alignItems: 'center', gap: space(1.5), paddingVertical: space(3) },
  errorText: { textAlign: 'center' },
  currentRow: {
    alignItems: 'center',
    gap: 2,
    paddingVertical: space(1),
  },
  currentNumber: {
    fontFamily: font.arabicBold,
    fontSize: fontSize.xxl,
    color: color.accent,
  },
  yearsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: space(1),
    gap: space(1),
  },
  yearCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    backgroundColor: color.cardElevated,
    borderRadius: radius.md,
    paddingVertical: space(1),
  },
  yearValue: {
    fontFamily: font.arabicSemiBold,
    fontSize: fontSize.lg,
    color: color.textPrimary,
  },
  totalBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space(2),
    paddingHorizontal: space(2),
    paddingVertical: space(1.5),
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: color.accent,
    backgroundColor: color.accent + '0D',
  },
  totalLabel: { color: color.textPrimary },
  totalValue: {
    fontFamily: font.arabicBold,
    fontSize: fontSize.xl,
    color: color.accent,
  },
  rangeTitle: { marginTop: space(2.5), marginBottom: space(0.5) },
  chipRow: { gap: space(0.75), paddingVertical: space(0.5), paddingEnd: space(1) },
  chip: { marginEnd: space(0.5) },
  toLabel: { marginTop: space(1) },
  applyBtn: {
    marginTop: space(1.5),
    backgroundColor: color.accent,
    borderRadius: radius.md,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: { color: color.textOnAccent },
  rangeResult: { marginTop: space(1.5) },
  rangeResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space(1.5),
  },
  rangeValue: {
    fontFamily: font.arabicBold,
    fontSize: fontSize.lg,
    color: color.accent,
  },
  memorialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1.5),
    marginTop: space(2.5),
    padding: space(1.5),
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
    backgroundColor: color.cardElevated,
  },
  memorialBody: { flex: 1, gap: 2 },
  memorialLabel: { color: color.accent },
});

export default VictimsCounter;
