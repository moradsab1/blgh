/**
 * Arab-community victims counter — §5.6b
 *
 * A compact pill in the map's top-center showing the current year's victim
 * count (e.g. "ضحايا 2026 · 142") in the same rounded style as the status
 * pill. Tapping it opens a lightweight popover floating over the map with the
 * current-year count, the last 3 years, a highlighted all-years total, a
 * calendar date-range picker that totals victims in the chosen period, and a
 * link to the memorial website. All values load from the repository with
 * loading + error states.
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
import { CalendarRange, ChevronDown, Globe, X } from '../../core/icons';
import { haptics } from '../../core/haptics';
import { useReduceMotion } from '../../core/a11y/useReduceMotion';
import { strings } from '../../core/strings';
import { useLangStore } from '../../domain/stores/lang';
import { MEMORIAL_URL } from '../../core/config';
import { MockVictimsRepo } from '../../data/mock/MockVictimsRepo';
import { DateRangeCalendar } from './DateRangeCalendar';
import type { DateRange } from './DateRangeCalendar';
import type { VictimStats } from '../../core/types';

const repo = new MockVictimsRepo();

const fmtDate = (ms: number): string => {
  const d = new Date(ms);
  return formatNumber(`${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`);
};

export const VictimsCounter = (): React.ReactElement => {
  const { lang } = useLangStore();
  const s = strings[lang];
  const reduceMotion = useReduceMotion();

  const [stats, setStats] = useState<VictimStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);

  // Calendar date-range filter
  const [dateRange, setDateRange] = useState<DateRange>({ from: null, to: null });
  const [rangeOpen, setRangeOpen] = useState(false);
  const [rangeCount, setRangeCount] = useState<number | null>(null);
  const [rangeLoading, setRangeLoading] = useState(false);

  const anim = useRef(new Animated.Value(0)).current;

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    repo
      .getStats()
      .then(st => { setStats(st); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  // Total victims across the years the chosen date range spans (yearly data).
  useEffect(() => {
    if (dateRange.from == null || dateRange.to == null) {
      setRangeCount(null);
      return;
    }
    const fromYear = new Date(dateRange.from).getFullYear();
    const toYear = new Date(dateRange.to).getFullYear();
    setRangeLoading(true);
    repo
      .getRangeCount(fromYear, toYear)
      .then(n => { setRangeCount(n); setRangeLoading(false); })
      .catch(() => { setRangeCount(null); setRangeLoading(false); });
  }, [dateRange]);

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

  const lastThree = useMemo(() => stats?.byYear.slice(1, 4) ?? [], [stats]);

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
        <Text variant="caption" muted numberOfLines={1} style={styles.cardLabel}>
          {s.victims.victimsLabel} {stats ? formatNumber(stats.currentYear) : ''}
        </Text>
        {loading ? (
          <ActivityIndicator size="small" color={color.accent} testID="victims-card-loading" />
        ) : error ? (
          <Text variant="heading" style={styles.cardNumberMuted}>—</Text>
        ) : (
          <Text variant="heading" style={styles.cardNumber} testID="victims-card-number">
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

              {/* Custom period — one calendar button → date-range picker */}
              <Text variant="label" style={styles.rangeTitle}>{s.victims.rangeTitle}</Text>
              <Pressable
                style={styles.calendarBtn}
                onPress={() => { haptics.toggle(); setRangeOpen(o => !o); }}
                testID="victims-range-toggle">
                <CalendarRange size={16} color={color.accent} />
                <Text variant="label" style={styles.calendarBtnText} numberOfLines={1}>
                  {dateRange.from != null && dateRange.to != null
                    ? `${fmtDate(dateRange.from)} – ${fmtDate(dateRange.to)}`
                    : s.victims.pickPeriod}
                </Text>
                <ChevronDown size={16} color={color.textSecondary} />
              </Pressable>

              {rangeOpen ? (
                <View style={styles.calendarWrap}>
                  <DateRangeCalendar lang={lang} range={dateRange} onChange={setDateRange} />
                </View>
              ) : null}

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
  // Compact two-line card — label on top, bold count beneath — using the
  // app's themed heading font (script-aware bold) for a consistent look.
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    backgroundColor: color.card,
    borderRadius: radius.lg,
    paddingHorizontal: space(2),
    paddingVertical: space(0.75),
    minWidth: 88,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
    ...shadow.float,
  },
  cardLabel: {
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  cardNumber: {
    fontSize: fontSize.xl,
    lineHeight: fontSize.xl + 2,
    color: color.accent,
  },
  cardNumberMuted: {
    fontSize: fontSize.xl,
    lineHeight: fontSize.xl + 2,
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
    maxHeight: '74%',
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
  rangeTitle: { marginTop: space(2.5), marginBottom: space(1) },
  calendarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1),
    backgroundColor: color.cardElevated,
    borderRadius: radius.md,
    paddingHorizontal: space(1.5),
    minHeight: 44,
  },
  calendarBtnText: { flex: 1, color: color.textPrimary },
  calendarWrap: {
    marginTop: space(1.5),
    backgroundColor: color.cardElevated,
    borderRadius: radius.md,
    padding: space(1.5),
  },
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
