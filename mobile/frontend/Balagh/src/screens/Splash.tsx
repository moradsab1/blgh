import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { color, radius, space } from '../core/theme/tokens';
import { Text } from '../core/theme/components';
import store, { StorageKeys } from '../core/storage';
import type { SplashProps } from '../navigation/types';
import type { AppLanguage } from '../core/types';

const SplashScreen = ({ navigation }: SplashProps): React.ReactElement => {
  useEffect(() => {
    try {
      const savedLang = store.getString(StorageKeys.LANGUAGE) as AppLanguage | undefined;
      const onboardingDone = store.getBoolean(StorageKeys.ONBOARDING_DONE) ?? false;
      const localityId = store.getString(StorageKeys.LOCALITY_ID);

      if (onboardingDone && localityId) {
        navigation.replace('Map');
      } else if (savedLang) {
        navigation.replace('Welcome');
      } else {
        navigation.replace('Language');
      }
    } catch {
      navigation.replace('Language');
    }
  }, [navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <View style={styles.logoSquare}>
          <Text style={styles.logoLetter}>ب</Text>
        </View>
        <Text style={styles.appName}>بلاغ</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    gap: space(2),
  },
  logoSquare: {
    width: 80,
    height: 80,
    backgroundColor: color.accent,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: {
    fontSize: 40,
    fontWeight: 'bold',
    color: color.textPrimary,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: color.textPrimary,
    letterSpacing: 2,
  },
});

export default SplashScreen;
