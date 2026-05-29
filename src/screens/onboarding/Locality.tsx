import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, ArrowLeft, Search, Check } from '../../core/icons';
import { color, space, radius, hit } from '../../core/theme/tokens';
import { Text, Button } from '../../core/theme/components';
import { haptics } from '../../core/haptics';
import store, { StorageKeys } from '../../core/storage';
import { strings } from '../../core/strings';
import { useLangStore } from '../../domain/stores/lang';
import type { LocalityProps } from '../../navigation/types';
import type { Locality } from '../../core/types';
import { LOCALITIES } from '../../data/mock/db';

const LocalityScreen = ({ navigation, route }: LocalityProps): React.ReactElement => {
  const { lang } = useLangStore();
  const s = strings[lang];
  const fromSettings = route.params?.fromSettings ?? false;
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(
    store.getString(StorageKeys.LOCALITY_ID) ?? null,
  );
  const isRTL = I18nManager.isRTL;
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  const getLocalityName = useCallback(
    (loc: Locality): string => {
      switch (lang) {
        case 'ar': return loc.nameAr;
        case 'he': return loc.nameHe;
        default: return loc.nameEn;
      }
    },
    [lang],
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return LOCALITIES;
    const q = query.toLowerCase();
    return LOCALITIES.filter(
      loc =>
        loc.nameAr.toLowerCase().includes(q) ||
        loc.nameHe.toLowerCase().includes(q) ||
        loc.nameEn.toLowerCase().includes(q),
    );
  }, [query]);

  const selectLocality = (loc: Locality): void => {
    haptics.toggle();
    setSelectedId(loc.id);
  };

  const confirmSelection = (): void => {
    if (!selectedId) return;
    haptics.press();
    store.setString(StorageKeys.LOCALITY_ID, selectedId);
    store.setBoolean(StorageKeys.ONBOARDING_DONE, true);
    if (fromSettings) {
      navigation.goBack();
    } else {
      navigation.replace('Map');
    }
  };

  const renderLocality = ({ item }: { item: Locality }): React.ReactElement => {
    const isSelected = item.id === selectedId;
    const primaryName = getLocalityName(item);
    const canonicalName = item.nameEn !== primaryName ? item.nameEn : item.nameAr;

    return (
      <TouchableOpacity
        style={[styles.localityRow, isSelected && styles.localityRowSelected]}
        onPress={() => selectLocality(item)}
        activeOpacity={0.7}
        accessibilityRole="radio"
        accessibilityState={{ selected: isSelected }}>
        <View style={styles.localityNames}>
          <Text style={styles.localityPrimary}>{primaryName}</Text>
          {canonicalName !== primaryName && (
            <Text secondary variant="caption" style={styles.localityCanonical}>
              {canonicalName}
            </Text>
          )}
        </View>
        {isSelected && <Check size={20} color={color.accent} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {fromSettings && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <BackIcon size={24} color={color.textPrimary} />
          </TouchableOpacity>
        )}
        <View style={styles.headerText}>
          <Text variant="heading">{s.locality.title}</Text>
          <Text secondary variant="caption" style={styles.subtitle}>
            {s.locality.subtitle}
          </Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Search size={18} color={color.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder={s.locality.searchPlaceholder}
          placeholderTextColor={color.textMuted}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
      </View>

      <FlatList
        data={filtered}
        renderItem={renderLocality}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text secondary>{s.locality.noResults}</Text>
          </View>
        }
      />

      <View style={styles.footer}>
        <Button
          label={s.locality.cta}
          onPress={confirmSelection}
          fullWidth
          disabled={!selectedId}
          style={styles.cta}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: space(3),
    paddingTop: space(2),
    paddingBottom: space(2),
    gap: space(2),
  },
  backButton: {
    minHeight: hit.min,
    minWidth: hit.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: space(0.5),
  },
  subtitle: {
    lineHeight: 18,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.card,
    borderRadius: radius.md,
    marginHorizontal: space(3),
    marginBottom: space(1),
    paddingHorizontal: space(2),
    minHeight: hit.min,
    gap: space(1),
  },
  searchIcon: {},
  searchInput: {
    flex: 1,
    color: color.textPrimary,
    fontSize: 15,
    paddingVertical: space(1.5),
  },
  listContent: {
    paddingHorizontal: space(3),
    paddingBottom: space(2),
    gap: space(1),
  },
  localityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.card,
    borderRadius: radius.md,
    padding: space(2),
    minHeight: hit.min,
    gap: space(2),
  },
  localityRowSelected: {
    borderWidth: 1.5,
    borderColor: color.accent,
  },
  localityNames: {
    flex: 1,
    gap: 2,
  },
  localityPrimary: {
    fontSize: 16,
    color: color.textPrimary,
  },
  localityCanonical: {
    color: color.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: space(4),
  },
  footer: {
    paddingHorizontal: space(3),
    paddingBottom: space(4),
    paddingTop: space(2),
    borderTopWidth: 1,
    borderTopColor: color.border,
    backgroundColor: color.bg,
  },
  cta: {
    borderRadius: radius.lg,
  },
});

export default LocalityScreen;
