/**
 * DateRangeCalendar — a compact month-grid range picker built on plain RN
 * primitives (no date-picker library; the minimal-stack rule of §6.3).
 *
 * Tap once to set the range start, tap again to set the end (tapping before
 * the start restarts the range). Future days are disabled. Endpoints render
 * as solid accent circles; days in between get a soft accent wash.
 */

import React, { useMemo, useState } from 'react';
import { I18nManager, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from '../../core/theme/components';
import { color, radius, space } from '../../core/theme/tokens';
import { ChevronLeft, ChevronRight } from '../../core/icons';
import { strings } from '../../core/strings';
import type { AppLanguage } from '../../core/types';

export interface DateRange {
  from: number | null; // start-of-day ms
  to: number | null; // end-of-day ms
}

interface Props {
  lang: AppLanguage;
  range: DateRange;
  onChange: (range: DateRange) => void;
}

const DAY_MS = 24 * 3_600_000;

const startOfDay = (ms: number): number => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const endOfDay = (ms: number): number => startOfDay(ms) + DAY_MS - 1;

export const DateRangeCalendar = ({ lang, range, onChange }: Props): React.ReactElement => {
  const s = strings[lang];
  const today = useMemo(() => startOfDay(Date.now()), []);
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());

  const cells = useMemo(() => {
    const leading = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sunday
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const out: (number | null)[] = Array(leading).fill(null);
    for (let day = 1; day <= daysInMonth; day++) {
      out.push(new Date(viewYear, viewMonth, day).getTime());
    }
    return out;
  }, [viewYear, viewMonth]);

  const shiftMonth = (delta: number): void => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const handleDayPress = (dayMs: number): void => {
    if (range.from !== null && range.to === null && dayMs >= range.from) {
      onChange({ from: range.from, to: endOfDay(dayMs) });
    } else {
      onChange({ from: startOfDay(dayMs), to: null });
    }
  };

  // Chevrons follow reading direction so "next month" always points forward.
  const PrevIcon = I18nManager.isRTL ? ChevronRight : ChevronLeft;
  const NextIcon = I18nManager.isRTL ? ChevronLeft : ChevronRight;
  const canGoNext = new Date(viewYear, viewMonth + 1, 1).getTime() <= today;

  return (
    <View style={styles.root} testID="date-range-calendar">
      <View style={styles.monthHeader}>
        <TouchableOpacity
          onPress={() => shiftMonth(-1)}
          style={styles.monthNavBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          testID="calendar-prev-month">
          <PrevIcon size={18} color={color.textSecondary} />
        </TouchableOpacity>
        <Text variant="label">
          {s.feed.calendar.months[viewMonth]} {String(viewYear)}
        </Text>
        <TouchableOpacity
          onPress={() => shiftMonth(1)}
          style={styles.monthNavBtn}
          disabled={!canGoNext}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          testID="calendar-next-month">
          <NextIcon size={18} color={canGoNext ? color.textSecondary : color.border} />
        </TouchableOpacity>
      </View>

      <View style={styles.weekRow}>
        {s.feed.calendar.weekdaysShort.map((wd, i) => (
          <Text key={`${wd}-${i}`} variant="caption" muted style={styles.weekday}>
            {wd}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((dayMs, i) => {
          if (dayMs === null) {
            return <View key={`blank-${i}`} style={styles.dayCell} />;
          }
          const disabled = dayMs > today;
          const isStart = range.from !== null && dayMs === range.from;
          const isEnd = range.to !== null && startOfDay(range.to) === dayMs;
          const inRange =
            range.from !== null &&
            range.to !== null &&
            dayMs > range.from &&
            dayMs < startOfDay(range.to);
          return (
            <TouchableOpacity
              key={dayMs}
              style={[
                styles.dayCell,
                inRange && styles.dayInRange,
                (isStart || isEnd) && styles.dayEndpoint,
              ]}
              onPress={() => handleDayPress(dayMs)}
              disabled={disabled}
              testID={`calendar-day-${new Date(dayMs).getDate()}`}>
              <Text
                variant="caption"
                style={[
                  styles.dayText,
                  disabled && styles.dayTextDisabled,
                  (isStart || isEnd) && styles.dayTextEndpoint,
                ]}>
                {String(new Date(dayMs).getDate())}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const CELL = `${100 / 7}%` as const;

const styles = StyleSheet.create({
  root: {
    gap: space(0.5),
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space(0.5),
  },
  monthNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: color.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekday: {
    width: CELL,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: CELL,
    aspectRatio: 1.15,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  dayInRange: {
    backgroundColor: color.accent + '14',
    borderRadius: 0,
  },
  dayEndpoint: {
    backgroundColor: color.accent,
  },
  dayText: {
    color: color.textPrimary,
  },
  dayTextDisabled: {
    color: color.textMuted,
  },
  dayTextEndpoint: {
    color: color.textOnAccent,
  },
});
