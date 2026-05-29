import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  I18nManager,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, ChevronLeft } from '../../core/icons';
import { color, space, hit } from '../../core/theme/tokens';
import { Text } from '../../core/theme/components';
import { haptics } from '../../core/haptics';
import store, { StorageKeys } from '../../core/storage';
import { strings, applyRTL } from '../../core/strings';
import { setCurrentScript } from '../../core/theme/components';
import { useLangStore } from '../../domain/stores/lang';
import type { LanguageProps } from '../../navigation/types';
import type { AppLanguage } from '../../core/types';

interface LanguageOption {
  code: AppLanguage;
  flag: string;
  nativeName: string;
  script: 'arabic' | 'latin';
}

const LANGUAGES: LanguageOption[] = [
  { code: 'ar', flag: '🇸🇦', nativeName: 'العربية', script: 'arabic' },
  { code: 'he', flag: '🇮🇱', nativeName: 'עברית', script: 'arabic' },
  { code: 'en', flag: '🇬🇧', nativeName: 'English', script: 'latin' },
];

const LanguageScreen = ({ navigation, route }: LanguageProps): React.ReactElement => {
  const { lang, setLang } = useLangStore();
  const s = strings[lang];
  const fromSettings = route.params?.fromSettings ?? false;

  const selectLanguage = (option: LanguageOption): void => {
    haptics.toggle();
    setLang(option.code);
    store.setString(StorageKeys.LANGUAGE, option.code);
    setCurrentScript(option.script);

    const needsReload = applyRTL(option.code);
    if (needsReload) {
      Alert.alert(s.language.restartTitle, s.language.restartMessage);
      return;
    }

    if (fromSettings) {
      navigation.goBack();
    } else {
      navigation.replace('Welcome');
    }
  };

  const ChevronIcon = I18nManager.isRTL ? ChevronLeft : ChevronRight;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoRow}>
          <View style={styles.logoSquare}>
            <Text style={styles.logoLetter}>ب</Text>
          </View>
        </View>

        <View style={styles.cards}>
          {LANGUAGES.map(option => (
            <TouchableOpacity
              key={option.code}
              style={styles.card}
              activeOpacity={0.75}
              onPress={() => selectLanguage(option)}
              accessibilityLabel={option.nativeName}
              accessibilityRole="button">
              <Text style={styles.flag}>{option.flag}</Text>
              <Text style={styles.langName}>{option.nativeName}</Text>
              <ChevronIcon size={20} color={color.textMuted} style={styles.chevron} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.bg,
  },
  content: {
    flex: 1,
    paddingHorizontal: space(3),
    justifyContent: 'center',
    gap: space(4),
  },
  logoRow: {
    alignItems: 'center',
    marginBottom: space(2),
  },
  logoSquare: {
    width: 64,
    height: 64,
    backgroundColor: color.accent,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: {
    fontSize: 32,
    fontWeight: 'bold',
    color: color.textPrimary,
  },
  cards: {
    gap: space(2),
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.card,
    borderRadius: 16,
    padding: space(2),
    minHeight: hit.min,
    gap: space(2),
  },
  flag: {
    fontSize: 28,
  },
  langName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: color.textPrimary,
  },
  chevron: {
    marginStart: 'auto',
  },
});

export default LanguageScreen;
