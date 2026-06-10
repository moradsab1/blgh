import React from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Text } from '../core/theme/components';
import { color, space } from '../core/theme/tokens';
import { ChevronLeft } from '../core/icons';
import { CategoryGrid } from '../presentation/components/CategoryGrid';
import { useLangStore } from '../domain/stores/lang';
import { strings } from '../core/strings';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import type { Category } from '../core/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ReportCategory'>;

export default function ReportCategoryScreen({ navigation }: Props): React.ReactElement {
  const { lang } = useLangStore();
  const s = strings[lang];

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={color.bg} />
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
          <ChevronLeft size={20} color={color.textPrimary} />
        </Pressable>
        <Text variant="heading" style={styles.headerTitle}>{s.report.title}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text secondary style={styles.subtitle}>{s.report.categorySubtitle}</Text>
        <CategoryGrid
          onSelect={(cat: Category) => navigation.navigate('ReportDetails', { category: cat })}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space(2),
    paddingVertical: space(1.5),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.border,
  },
  backBtn: { minWidth: 44, minHeight: 44, justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center' },
  headerRight: { minWidth: 44 },
  content: {
    paddingHorizontal: space(2),
    paddingTop: space(2),
    paddingBottom: space(4),
    gap: space(2),
  },
  subtitle: { textAlign: 'center' },
});
