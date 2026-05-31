import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Text } from '../../core/theme/components';
import { color, font, fontSize, space } from '../../core/theme/tokens';
import { strings } from '../../core/strings';
import { useLangStore } from '../../domain/stores/lang';
import { useReduceMotion } from '../../core/a11y/useReduceMotion';

// A thin top band shown on every crisis-flow screen so the chrome reads as
// distinct from the routine report flow. Pulses subtly to communicate urgency
// without screaming. Respects reduce-motion.
const CrisisModeBadge = (): React.ReactElement => {
  const { lang } = useLangStore();
  const reduceMotion = useReduceMotion();
  const pulse = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    if (reduceMotion) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.85, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, reduceMotion]);

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.dot, { opacity: pulse }]} />
      <Text style={styles.label}>{strings[lang].crisis.modeBadge}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: color.crisisAccent,
    paddingVertical: space(0.75),
    paddingHorizontal: space(2),
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FECACA',
  },
  label: {
    color: '#FEE2E2',
    fontFamily: font.arabicSemiBold,
    fontSize: fontSize.xs,
    letterSpacing: 1.4,
  },
});

export default CrisisModeBadge;
