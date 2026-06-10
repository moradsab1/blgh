import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { color, radius, shadow, space } from '../../core/theme/tokens';
import { useReduceMotion } from '../../core/a11y/useReduceMotion';
import { strings } from '../../core/strings';
import { useLangStore } from '../../domain/stores/lang';

// ── BottomSheet ─────────────────────────────────────────────────────────────
// A draggable bottom sheet built with plain RN Animated + PanResponder
// (no @gorhom/bottom-sheet, no reanimated — keeps the minimal stack, §16).
//
// snapPoints are fractions of screen height, ascending (e.g. [0.25, 0.6, 0.9]).
// The sheet body is sized to the LARGEST snap point; a translateY reveals only
// the active fraction. Dragging below the smallest snap (past a threshold)
// triggers onClose so the parent can dismiss the route/modal.

interface BottomSheetProps {
  snapPoints: number[];
  initialSnapIndex?: number;
  onClose: () => void;
  children: React.ReactNode;
  testID?: string;
}

export const BottomSheet = ({
  snapPoints,
  initialSnapIndex = 0,
  onClose,
  children,
  testID,
}: BottomSheetProps): React.ReactElement => {
  const reduceMotion = useReduceMotion();
  const { lang } = useLangStore();
  const screenH = Dimensions.get('window').height;

  const sorted = useMemo(
    () => [...snapPoints].sort((a, b) => a - b),
    [snapPoints],
  );
  const maxSnap = sorted[sorted.length - 1];
  const sheetHeight = maxSnap * screenH;

  // translateY for a given snap fraction: how far down to push the sheet so
  // only `fraction` of the screen is visible.
  const translateForFraction = (fraction: number): number =>
    (maxSnap - fraction) * screenH;

  const startIndex = Math.min(initialSnapIndex, sorted.length - 1);
  const translateY = useRef(
    new Animated.Value(sheetHeight), // start fully hidden, animate in
  ).current;
  const currentSnapRef = useRef(sorted[startIndex]);
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Spring gives the sheet a native, organic snap rather than the mechanical
  // feel of linear timing — measurable difference next to UIKit sheets.
  const animateTo = (toValue: number, opacity: number): void => {
    if (reduceMotion) {
      translateY.setValue(toValue);
      backdropOpacity.setValue(opacity);
      return;
    }
    Animated.parallel([
      Animated.spring(translateY, {
        toValue,
        useNativeDriver: true,
        damping: 22,
        stiffness: 240,
        mass: 1,
        overshootClamping: false,
        restDisplacementThreshold: 0.5,
        restSpeedThreshold: 0.5,
      }),
      Animated.timing(backdropOpacity, {
        toValue: opacity,
        duration: 240,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Animate in on mount
  useEffect(() => {
    animateTo(translateForFraction(sorted[startIndex]), 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const snapToNearest = (currentTranslate: number): void => {
    // Find the snap fraction whose translateY is closest to the current position.
    let best = sorted[0];
    let bestDist = Infinity;
    for (const f of sorted) {
      const d = Math.abs(translateForFraction(f) - currentTranslate);
      if (d < bestDist) {
        bestDist = d;
        best = f;
      }
    }
    currentSnapRef.current = best;
    animateTo(translateForFraction(best), 1);
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evt, gesture) =>
          Math.abs(gesture.dy) > 6,
        onPanResponderMove: (_evt, gesture) => {
          const base = translateForFraction(currentSnapRef.current);
          const next = Math.max(0, base + gesture.dy);
          translateY.setValue(next);
        },
        onPanResponderRelease: (_evt, gesture) => {
          const base = translateForFraction(currentSnapRef.current);
          const released = base + gesture.dy;
          const smallestTranslate = translateForFraction(sorted[0]);
          // Dragged well below the smallest snap → dismiss
          if (
            released > smallestTranslate + screenH * 0.12 ||
            gesture.vy > 1.4
          ) {
            Animated.timing(translateY, {
              toValue: sheetHeight,
              duration: reduceMotion ? 0 : 200,
              useNativeDriver: true,
            }).start(() => onClose());
            Animated.timing(backdropOpacity, {
              toValue: 0,
              duration: reduceMotion ? 0 : 200,
              useNativeDriver: true,
            }).start();
            return;
          }
          snapToNearest(released);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sorted, sheetHeight, reduceMotion],
  );

  const dismiss = (): void => {
    Animated.timing(translateY, {
      toValue: sheetHeight,
      duration: reduceMotion ? 0 : 200,
      useNativeDriver: true,
    }).start(() => onClose());
    Animated.timing(backdropOpacity, {
      toValue: 0,
      duration: reduceMotion ? 0 : 200,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.fill} testID={testID}>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable
          style={styles.fill}
          onPress={dismiss}
          testID="bottomsheet-backdrop"
          accessibilityRole="button"
          accessibilityLabel={strings[lang].common.close}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          { height: sheetHeight, transform: [{ translateY }] },
        ]}>
        <View style={styles.handleZone} {...panResponder.panHandlers}>
          <View style={styles.handle} />
        </View>
        <View style={styles.body}>{children}</View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: color.scrim,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: color.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
    ...shadow.float,
  },
  handleZone: {
    alignItems: 'center',
    paddingVertical: space(1.5),
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: color.border,
  },
  body: {
    flex: 1,
  },
});

export default BottomSheet;
