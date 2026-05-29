import React from 'react';
import {
  Text as RNText,
  TextProps,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
  ViewStyle,
  StyleSheet,
  StyleProp,
  TextStyle,
} from 'react-native';
import { create } from 'zustand';
import { color, font, fontSize, hit, radius, space } from './tokens';
import type { Severity } from '../types';

// ── Script store — reactive so all mounted Text components re-render on language change ──

type Script = 'arabic' | 'latin';

interface ScriptState {
  script: Script;
  setScript: (s: Script) => void;
}

const useScriptStore = create<ScriptState>((set) => ({
  script: 'arabic',
  setScript: (s) => set({ script: s }),
}));

export const setCurrentScript = (s: Script): void => useScriptStore.getState().setScript(s);
export const getCurrentScript = (): Script => useScriptStore.getState().script;

// ── Text ─────────────────────────────────────────────────────────────────────

interface BalaghTextProps extends TextProps {
  variant?: 'body' | 'caption' | 'label' | 'heading' | 'mono';
  muted?: boolean;
  secondary?: boolean;
}

export const Text = ({
  variant = 'body',
  muted,
  secondary,
  style,
  ...props
}: BalaghTextProps): React.ReactElement => {
  const isArabicScript = useScriptStore(s => s.script) === 'arabic';

  const fontFamily = (() => {
    if (variant === 'mono') return font.mono;
    if (variant === 'heading') return isArabicScript ? font.arabicBold : font.latinBold;
    if (variant === 'label') return isArabicScript ? font.arabicMedium : font.latinMedium;
    return isArabicScript ? font.arabic : font.latin;
  })();

  const textColor = muted
    ? color.textMuted
    : secondary
    ? color.textSecondary
    : color.textPrimary;

  const textSize = (() => {
    switch (variant) {
      case 'heading': return fontSize.lg;
      case 'caption': return fontSize.xs;
      case 'label': return fontSize.sm;
      case 'mono': return fontSize.sm;
      default: return fontSize.base;
    }
  })();

  return (
    <RNText
      style={[{ fontFamily, color: textColor, fontSize: textSize }, style]}
      {...props}
    />
  );
};

// ── Button ────────────────────────────────────────────────────────────────────

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  labelStyle?: StyleProp<TextStyle>;
}

export const Button = ({
  label,
  variant = 'primary',
  size = 'md',
  fullWidth,
  style,
  labelStyle,
  disabled,
  ...props
}: ButtonProps): React.ReactElement => {
  const bg = (() => {
    if (disabled) return color.border;
    switch (variant) {
      case 'primary': return color.accent;
      case 'secondary': return color.card;
      case 'ghost': return color.transparent;
      case 'danger': return color.error;
      default: return color.accent;
    }
  })();

  const textCol = disabled
    ? color.textMuted
    : variant === 'ghost'
    ? color.textSecondary
    : color.textPrimary;

  const paddingV = size === 'sm' ? space(1) : size === 'lg' ? space(2) : space(1.5);
  const minH = size === 'sm' ? hit.min * 0.75 : hit.min;

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      disabled={disabled}
      style={[
        styles.button,
        { backgroundColor: bg, paddingVertical: paddingV, minHeight: minH },
        fullWidth && styles.fullWidth,
        style as ViewStyle,
      ]}
      {...props}>
      <Text variant="label" style={[{ color: textCol }, labelStyle]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

// ── Chip ─────────────────────────────────────────────────────────────────────

interface ChipProps extends TouchableOpacityProps {
  label: string;
  active?: boolean;
}

export const Chip = ({ label, active, style, ...props }: ChipProps): React.ReactElement => (
  <TouchableOpacity
    activeOpacity={0.7}
    style={[
      styles.chip,
      { backgroundColor: active ? color.accent : color.card },
      style as ViewStyle,
    ]}
    {...props}>
    <Text variant="caption" style={{ color: active ? color.textPrimary : color.textSecondary }}>
      {label}
    </Text>
  </TouchableOpacity>
);

// ── SeverityPill ──────────────────────────────────────────────────────────────

interface SeverityPillProps {
  severity: Severity;
  label: string;
  style?: StyleProp<ViewStyle>;
}

const SEVERITY_LABELS: Record<Severity, string> = {
  critical: 'حرج',
  high: 'عالي',
  medium: 'متوسط',
  low: 'منخفض',
};

export const SeverityPill = ({
  severity,
  label,
  style,
}: SeverityPillProps): React.ReactElement => (
  <View
    style={[
      styles.severityPill,
      { backgroundColor: color.severity[severity] + '22' },
      style,
    ]}>
    <View style={[styles.severityDot, { backgroundColor: color.severity[severity] }]} />
    <Text variant="caption" style={{ color: color.severity[severity] }}>
      {label || SEVERITY_LABELS[severity]}
    </Text>
  </View>
);

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space(3),
    minHeight: hit.min,
  },
  fullWidth: {
    width: '100%',
  },
  chip: {
    borderRadius: radius.pill,
    paddingHorizontal: space(1.5),
    paddingVertical: space(0.75),
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  severityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    paddingHorizontal: space(1.5),
    paddingVertical: 4,
    gap: 6,
    alignSelf: 'flex-start',
  },
  severityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
