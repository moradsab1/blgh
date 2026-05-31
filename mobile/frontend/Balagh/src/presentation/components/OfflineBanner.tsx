import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../../core/theme/components';
import { color, space, fontSize } from '../../core/theme/tokens';
import { strings } from '../../core/strings';
import { useLangStore } from '../../domain/stores/lang';
import { useNetStore } from '../../domain/stores/net';
import { getReduceMotion } from '../../core/a11y/useReduceMotion';

export type BannerMode = 'offline' | 'reconnected' | 'hidden';

// Pure presentation logic, exported for unit testing.
export function offlineBannerState(isConnected: boolean, wasOffline: boolean): BannerMode {
  if (!isConnected) return 'offline';
  if (wasOffline) return 'reconnected'; // transient — connection just restored
  return 'hidden';
}

const RECONNECT_TOAST_MS = 3000;

// A thin status bar pinned to the top of the screen. Shows a persistent
// "offline" message while disconnected and a transient "reconnected" message
// for a few seconds after the connection returns. Mounted once near the app
// root so every screen inherits it.
const OfflineBanner = (): React.ReactElement | null => {
  const { lang } = useLangStore();
  const insets = useSafeAreaInsets();
  const o = strings[lang].offline;
  const isConnected = useNetStore(s => s.isConnected);
  const wasOffline = useNetStore(s => s.wasOffline);

  const [showReconnected, setShowReconnected] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const wasConnectedRef = useRef(isConnected);

  // Detect the offline → online edge to flash the reconnected toast.
  useEffect(() => {
    if (isConnected && !wasConnectedRef.current && wasOffline) {
      setShowReconnected(true);
      const t = setTimeout(() => setShowReconnected(false), RECONNECT_TOAST_MS);
      wasConnectedRef.current = isConnected;
      return () => clearTimeout(t);
    }
    wasConnectedRef.current = isConnected;
    return undefined;
  }, [isConnected, wasOffline]);

  const mode: BannerMode = !isConnected
    ? 'offline'
    : showReconnected
    ? 'reconnected'
    : 'hidden';

  useEffect(() => {
    const visible = mode !== 'hidden';
    if (getReduceMotion()) {
      opacity.setValue(visible ? 1 : 0);
      return;
    }
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [mode, opacity]);

  if (mode === 'hidden') return null;

  const isOffline = mode === 'offline';
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.banner,
        { top: insets.top, opacity, backgroundColor: isOffline ? color.textMuted : color.success },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite">
      <Text variant="caption" style={styles.text}>
        {isOffline ? o.banner : o.reconnected}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: space(2),
    paddingVertical: space(0.75),
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  text: { color: '#fff', fontSize: fontSize.xs, textAlign: 'center' },
});

export default OfflineBanner;
