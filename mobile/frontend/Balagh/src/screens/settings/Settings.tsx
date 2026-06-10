import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
  Share,
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MapPin,
  Globe,
  Key,
  Shield,
  Trash2,
  Bell,
  Info,
  HelpCircle,
  Mail,
  ChevronRight,
  ChevronLeft,
  Copy,
} from '../../core/icons';
import { color, space, radius } from '../../core/theme/tokens';
import { Text } from '../../core/theme/components';
import { haptics } from '../../core/haptics';
import store, { StorageKeys } from '../../core/storage';
import { getPublicKeyHex, getPublicIdentifier, deleteIdentity } from '../../core/identity';
import { notificationService } from '../../domain/services/notifications';
import { strings } from '../../core/strings';
import { APP_VERSION } from '../../core/version';
import { useLangStore } from '../../domain/stores/lang';
import type { SettingsProps } from '../../navigation/types';
import { useOnboardingStore } from '../../domain/stores/onboarding';

const CONTACT_EMAIL = 'contact@balagh.app';

const SettingsScreen = ({ navigation }: SettingsProps): React.ReactElement => {
  const { lang } = useLangStore();
  const s = strings[lang];
  const { resetOnboarding } = useOnboardingStore();
  const isRTL = I18nManager.isRTL;
  const ChevronIcon = isRTL ? ChevronLeft : ChevronRight;

  const [notifNearby, setNotifNearby] = useState(
    store.getBoolean(StorageKeys.NOTIFICATION_NEARBY) ?? true,
  );
  const [notifStatus, setNotifStatus] = useState(
    store.getBoolean(StorageKeys.NOTIFICATION_STATUS) ?? true,
  );
  const [notifFollowup, setNotifFollowup] = useState(
    store.getBoolean(StorageKeys.NOTIFICATION_FOLLOWUP) ?? true,
  );
  const [identifierRevealed, setIdentifierRevealed] = useState(false);

  const shortIdentifier = useMemo(() => {
    try { return getPublicIdentifier(); } catch { return '—'; }
  }, []);
  const fullPublicKey = useMemo(() => {
    try { return getPublicKeyHex(); } catch { return '—'; }
  }, []);

  const handleToggle = (
    key: typeof StorageKeys[keyof typeof StorageKeys],
    value: boolean,
    setter: (v: boolean) => void,
  ): void => {
    if (value) {
      // Enabling a toggle — request POST_NOTIFICATIONS permission first.
      notificationService.requestPermission().then(granted => {
        if (!granted) {
          Alert.alert(s.settings.notifications.permissionDenied);
          return;
        }
        haptics.toggle();
        setter(true);
        store.setBoolean(key, true);
      }).catch(() => {});
    } else {
      haptics.toggle();
      setter(false);
      store.setBoolean(key, false);
    }
  };

  const handleDeleteData = (): void => {
    Alert.alert(
      s.settings.privacy.deleteConfirmTitle,
      s.settings.privacy.deleteConfirmMessage,
      [
        { text: s.settings.privacy.deleteConfirmCancel, style: 'cancel' },
        {
          text: s.settings.privacy.deleteConfirmConfirm,
          style: 'destructive',
          onPress: async () => {
            haptics.error();
            await deleteIdentity();
            store.clearAll();
            resetOnboarding();
            navigation.replace('Language');
          },
        },
      ],
    );
  };

  const handleIdentifierLongPress = (): void => {
    setIdentifierRevealed(true);
    if (fullPublicKey !== '—') {
      haptics.success();
      Share.share({ message: fullPublicKey }).catch(() => {});
    }
  };

  const handleContact = async (): Promise<void> => {
    haptics.press();
    const url = `mailto:${CONTACT_EMAIL}`;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) { await Linking.openURL(url); return; }
    } catch { /* fall through */ }
    Alert.alert(CONTACT_EMAIL);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          {isRTL ? (
            <ChevronRight size={24} color={color.textPrimary} />
          ) : (
            <ChevronLeft size={24} color={color.textPrimary} />
          )}
        </TouchableOpacity>
        <Text variant="heading">{s.settings.title}</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <SectionHeader label={s.settings.account.title} />

        <SettingsRow
          icon={<MapPin size={20} color={color.textSecondary} />}
          label={s.settings.account.locality}
          onPress={() => navigation.navigate('Locality', { fromSettings: true })}
          chevron={<ChevronIcon size={18} color={color.textMuted} />}
        />
        <SettingsRow
          icon={<Globe size={20} color={color.textSecondary} />}
          label={s.settings.account.language}
          onPress={() => navigation.navigate('Language', { fromSettings: true })}
          chevron={<ChevronIcon size={18} color={color.textMuted} />}
        />
        <TouchableOpacity
          style={[styles.row, styles.rowLast]}
          onPress={() => setIdentifierRevealed(r => !r)}
          onLongPress={handleIdentifierLongPress}
          activeOpacity={0.7}>
          <Key size={20} color={color.textSecondary} />
          <View style={styles.rowBody}>
            <Text>{s.settings.account.identifier}</Text>
            <Text secondary variant="caption" style={styles.identifierValue}>
              {identifierRevealed ? fullPublicKey : shortIdentifier}
            </Text>
          </View>
          <Copy size={16} color={color.textMuted} />
        </TouchableOpacity>

        <SectionHeader label={s.settings.privacy.title} />

        <SettingsRow
          icon={<Shield size={20} color={color.textSecondary} />}
          label={s.settings.privacy.constitution}
          onPress={() => navigation.navigate('PrivacyConstitution')}
          chevron={<ChevronIcon size={18} color={color.textMuted} />}
        />
        <SettingsRow
          icon={<Trash2 size={20} color={color.error} />}
          label={s.settings.privacy.deleteData}
          labelStyle={{ color: color.error }}
          onPress={handleDeleteData}
          isLast
        />

        <SectionHeader label={s.settings.notifications.title} />

        <ToggleRow
          icon={<Bell size={20} color={color.textSecondary} />}
          label={s.settings.notifications.nearby}
          value={notifNearby}
          onValueChange={v => handleToggle(StorageKeys.NOTIFICATION_NEARBY, v, setNotifNearby)}
        />
        <ToggleRow
          icon={<Bell size={20} color={color.textSecondary} />}
          label={s.settings.notifications.statusChanges}
          value={notifStatus}
          onValueChange={v => handleToggle(StorageKeys.NOTIFICATION_STATUS, v, setNotifStatus)}
        />
        <ToggleRow
          icon={<Bell size={20} color={color.textSecondary} />}
          label={s.settings.notifications.followUp}
          value={notifFollowup}
          onValueChange={v => handleToggle(StorageKeys.NOTIFICATION_FOLLOWUP, v, setNotifFollowup)}
          isLast
        />

        <SectionHeader label={s.settings.about.title} />
        <SettingsRow
          icon={<Info size={20} color={color.textSecondary} />}
          label={s.settings.about.version}
          value={APP_VERSION}
          onPress={() => navigation.navigate('About')}
          chevron={<ChevronIcon size={18} color={color.textMuted} />}
          isLast
        />

        <SectionHeader label={s.settings.support.title} />
        <SettingsRow
          icon={<HelpCircle size={20} color={color.textSecondary} />}
          label={s.settings.support.howItWorks}
          onPress={() => navigation.navigate('PrivacyConstitution')}
          chevron={<ChevronIcon size={18} color={color.textMuted} />}
        />
        <SettingsRow
          icon={<Mail size={20} color={color.textSecondary} />}
          label={s.settings.support.contact}
          onPress={handleContact}
          isLast
        />
      </ScrollView>
    </SafeAreaView>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────

const SectionHeader = ({ label }: { label: string }): React.ReactElement => (
  <Text secondary variant="caption" style={styles.sectionHeader}>
    {label.toUpperCase()}
  </Text>
);

interface SettingsRowProps {
  icon: React.ReactNode;
  label: string;
  labelStyle?: import('react-native').StyleProp<import('react-native').TextStyle>;
  value?: string;
  onPress: () => void;
  chevron?: React.ReactNode;
  isLast?: boolean;
}

const SettingsRow = ({
  icon, label, labelStyle, value, onPress, chevron, isLast,
}: SettingsRowProps): React.ReactElement => (
  <TouchableOpacity
    style={[styles.row, isLast && styles.rowLast]}
    onPress={onPress}
    activeOpacity={0.7}>
    {icon}
    <View style={styles.rowBody}>
      <Text style={labelStyle}>{label}</Text>
      {value && <Text secondary variant="caption">{value}</Text>}
    </View>
    {chevron}
  </TouchableOpacity>
);

interface ToggleRowProps {
  icon: React.ReactNode;
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  isLast?: boolean;
}

const ToggleRow = ({
  icon, label, value, onValueChange, isLast,
}: ToggleRowProps): React.ReactElement => (
  <View style={[styles.row, isLast && styles.rowLast]}>
    {icon}
    <View style={styles.rowBody}>
      <Text>{label}</Text>
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: color.border, true: color.accent }}
      thumbColor={color.textOnAccent}
    />
  </View>
);

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2),
    paddingHorizontal: space(3),
    paddingVertical: space(2),
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: space(8),
  },
  sectionHeader: {
    paddingHorizontal: space(3),
    paddingTop: space(3),
    paddingBottom: space(1),
    letterSpacing: 0.8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.card,
    paddingHorizontal: space(2),
    paddingVertical: space(1.5),
    minHeight: 56,
    gap: space(2),
    borderBottomWidth: 0.5,
    borderBottomColor: color.border,
  },
  rowLast: {
    borderBottomWidth: 0,
    borderBottomLeftRadius: radius.md,
    borderBottomRightRadius: radius.md,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  identifierValue: {
    fontFamily: 'JetBrainsMono-Regular',
    letterSpacing: 0.5,
  },
});

export default SettingsScreen;
