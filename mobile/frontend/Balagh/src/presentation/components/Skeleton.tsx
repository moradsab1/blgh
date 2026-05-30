import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { color, space, radius } from '../../core/theme/tokens';
import { getReduceMotion } from '../../core/a11y/useReduceMotion';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

// A single shimmering placeholder block. Under reduce-motion the pulse is
// disabled and it renders as a static dim block (§14 Phase 6 a11y sweep).
export const Skeleton = ({ width = '100%', height = 16, style }: SkeletonProps): React.ReactElement => {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (getReduceMotion()) {
      pulse.setValue(0.5);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.8, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        styles.block,
        { width: width as ViewStyle['width'], height, opacity: pulse },
        style,
      ]}
    />
  );
};

// A single feed card placeholder.
const FeedCardSkeleton = (): React.ReactElement => (
  <View style={styles.card}>
    <View style={styles.cardRow}>
      <Skeleton width={72} height={20} style={styles.pill} />
      <Skeleton width={48} height={12} />
    </View>
    <Skeleton width="60%" height={16} />
    <Skeleton width="90%" height={12} />
  </View>
);

// 5 feed cards (§14 Phase 6: "5 feed cards").
export const FeedSkeleton = (): React.ReactElement => (
  <View style={styles.list} accessibilityLabel="loading">
    {Array.from({ length: 5 }).map((_, i) => (
      <FeedCardSkeleton key={i} />
    ))}
  </View>
);

// A single inbox row placeholder.
const InboxRowSkeleton = (): React.ReactElement => (
  <View style={styles.inboxRow}>
    <Skeleton width={32} height={32} style={styles.avatar} />
    <View style={styles.inboxBody}>
      <Skeleton width="50%" height={14} />
      <Skeleton width="80%" height={11} />
    </View>
  </View>
);

// 7 inbox rows (§14 Phase 6: "7 inbox rows").
export const InboxSkeleton = (): React.ReactElement => (
  <View style={styles.list} accessibilityLabel="loading">
    {Array.from({ length: 7 }).map((_, i) => (
      <InboxRowSkeleton key={i} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  block: { backgroundColor: color.cardElevated, borderRadius: radius.sm },
  list: { padding: space(2), gap: space(1.5) },
  card: {
    backgroundColor: color.card,
    borderRadius: radius.md,
    padding: space(2),
    gap: space(1),
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pill: { borderRadius: radius.pill },
  inboxRow: { flexDirection: 'row', gap: space(1.5), alignItems: 'center' },
  avatar: { borderRadius: 16 },
  inboxBody: { flex: 1, gap: space(0.75) },
});

export default Skeleton;
