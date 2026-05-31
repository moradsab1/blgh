import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button } from '../../core/theme/components';
import { color, space, fontSize } from '../../core/theme/tokens';
import { Siren } from '../../core/icons';
import { useLangStore } from '../../domain/stores/lang';
import { strings } from '../../core/strings';
import CrisisModeBadge from '../../presentation/components/CrisisModeBadge';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CrisisReassure'>;

export default function CrisisReassureScreen({ navigation }: Props): React.ReactElement {
  const { lang } = useLangStore();
  const s = strings[lang];

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={color.crisisAccent} />
      <CrisisModeBadge />
      <View style={styles.content}>
        <Siren size={72} />
        <Text variant="heading" style={[styles.title, { fontSize: fontSize.xl }]}>
          {s.crisis.reassureTitle}
        </Text>
        <Text secondary style={styles.subtitle}>{s.crisis.reassureSubtitle}</Text>
      </View>
      <View style={styles.footer}>
        <Button
          label={s.crisis.reassureCta}
          variant="danger"
          fullWidth
          onPress={() => navigation.navigate('CrisisCategory')}
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
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center' },
  footer: {
    padding: space(2),
    paddingBottom: space(3),
  },
});
