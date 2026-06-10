import React, { useEffect } from 'react';
import { View, StyleSheet, BackHandler, Linking } from 'react-native';
import { Text, Button } from '../../core/theme/components';
import { color, space, radius, fontSize } from '../../core/theme/tokens';
import { Shield } from '../../core/icons';
import { strings } from '../../core/strings';
import { useLangStore } from '../../domain/stores/lang';

// Non-dismissable 426 update gate. Rendered as a full-screen opaque overlay on
// top of everything; intentionally takes no dismiss handler and no backdrop,
// and swallows the Android hardware back button while mounted, so the user
// cannot get past it without updating (§14 Phase 6 exit criteria).
//
// Store-link URL is intentionally a constant placeholder until store listings
// exist; tapping it opens the store, it never dismisses the gate.
const STORE_URL = 'https://balagh.app/update';

const UpdateGate = (): React.ReactElement => {
  const { lang } = useLangStore();
  const g = strings[lang].updateGate;

  useEffect(() => {
    // Block hardware back for as long as the gate is mounted.
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  const handleUpdate = (): void => {
    Linking.openURL(STORE_URL).catch(() => {});
  };

  return (
    <View style={styles.overlay} accessibilityViewIsModal accessibilityRole="alert">
      <View style={styles.card}>
        <Shield size={48} color={color.accent} />
        <Text variant="heading" style={styles.title}>{g.title}</Text>
        <Text secondary style={styles.message}>{g.message}</Text>
        <Button label={g.cta} variant="primary" fullWidth onPress={handleUpdate} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: color.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space(3),
    zIndex: 9999,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    gap: space(2),
    backgroundColor: color.card,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
    padding: space(3),
  },
  title: { textAlign: 'center' },
  message: { textAlign: 'center', lineHeight: fontSize.base * 1.6 },
});

export default UpdateGate;
