import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Share,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button } from '../core/theme/components';
import { color, space, radius, font, fontSize, motion } from '../core/theme/tokens';
import { Check } from '../core/icons';
import { useLangStore } from '../domain/stores/lang';
import { strings } from '../core/strings';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ReportSuccess'>;

export default function ReportSuccessScreen({ navigation, route }: Props): React.ReactElement {
  const { ref } = route.params;
  const { lang } = useLangStore();
  const s = strings[lang];

  const scale = useRef(new Animated.Value(0)).current;
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    Animated.timing(scale, {
      toValue: 1,
      duration: motion.deliberate,
      easing: Easing.out(Easing.back(1.5)),
      useNativeDriver: true,
    }).start();
  }, [scale]);

  const handleLongPress = async () => {
    try {
      await Share.share({ message: ref });
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 2000);
    } catch {}
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={color.bg} />
      <View style={styles.content}>
        <Animated.View style={[styles.checkCircle, { transform: [{ scale }] }]}>
          <Check size={48} color="#fff" />
        </Animated.View>

        <Text variant="heading" style={styles.title}>{s.report.successTitle}</Text>
        <Text secondary style={styles.subtitle}>{s.report.successSubtitle}</Text>

        <Text secondary variant="caption">{s.report.refLabel}</Text>
        <Pressable
          onLongPress={handleLongPress}
          style={styles.refContainer}
          accessibilityLabel={`${s.report.refLabel}: ${ref}. ${s.report.copyHint}`}>
          <Text style={styles.ref}>{ref}</Text>
          <Text secondary variant="caption">{s.report.copyHint}</Text>
        </Pressable>

        {toastVisible && (
          <View style={styles.toast}>
            <Text variant="caption" style={styles.toastText}>{s.common.copied}</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Button
          label={s.followup.followUpCta}
          variant="secondary"
          fullWidth
          onPress={() => navigation.navigate('FollowUp', { ref })}
        />
        <Button
          label={s.report.backToMap}
          variant="primary"
          fullWidth
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Map' }] })}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space(3),
    gap: space(2),
  },
  checkCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: color.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center' },
  refContainer: {
    backgroundColor: color.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    paddingVertical: space(2),
    paddingHorizontal: space(3),
    alignItems: 'center',
    gap: space(0.5),
  },
  ref: {
    fontFamily: font.mono,
    fontSize: fontSize.md,
    color: color.textPrimary,
    letterSpacing: 2,
  },
  toast: {
    position: 'absolute',
    bottom: space(4),
    backgroundColor: color.cardElevated,
    paddingHorizontal: space(2),
    paddingVertical: space(1),
    borderRadius: radius.pill,
  },
  toastText: { color: color.textPrimary },
  footer: {
    padding: space(2),
    paddingBottom: space(3),
    gap: space(1),
  },
});
