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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MapPin,
  Globe,
  Key,
  Shield,
  Trash2,
  Info,
  HelpCircle,
  Mail,
  MessageCircle,
  Radio,
  Siren,
  ChevronRight,
  ChevronLeft,
  Copy,
} from '../../core/icons';
import type { IconProps } from '../../core/icons';
import { color, font, space, radius, shadow } from '../../core/theme/tokens';
import { Text } from '../../core/theme/components';
import { haptics } from '../../core/haptics';
import store, { StorageKeys } from '../../core/storage';
import { getPublicKeyHex, getPublicIdentifier, deleteIdentity } from '../../core/identity';
import { notificationService } from '../../domain/services/notifications';
import { strings } from '../../core/strings';
import { APP_VERSION } from '../../core/version';
import { useIsRTL, useLangStore } from '../../domain/stores/lang';
import { LOCALITIES } from '../../data/mock/db';
import type { SettingsProps } from '../../navigation/types';
import { useOnboardingStore } from '../../domain/stores/onboarding';

const CONTACT_EMAIL = 'contact@balagh.app';

const LANGUAGE_NAMES = { ar: 'العربية', he: 'עברית', en: 'English' } as const;

const SettingsScreen = ({ navigation }: SettingsProps): React.ReactElement => {
  const { lang } = useLangStore();
  const s = strings[lang];
  const { resetOnboarding } = useOnboardingStore();
  const isRTL = useIsRTL();
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

  // Current selections surfaced as row values so the page answers
  // "what am I set to?" without navigating anywhere.
  const localityValue = useMemo(() => {
    const id = store.getString(StorageKeys.LOCALITY_ID);
    const loc = LOCALITIES.find(l => l.id === id);
    if (!loc) return undefined;
    return lang === 'he' ? loc.nameHe : lang === 'en' ? loc.nameEn : loc.nameAr;
  }, [lang]);

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
          style={styles.backBtn}
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
        <Group>
          <SettingsRow
            Icon={MapPin}
            tint={color.reportAccent}
            label={s.settings.account.locality}
            value={localityValue}
            onPress={() => navigation.navigate('Locality', { fromSettings: true })}
            chevron={<ChevronIcon size={18} color={color.textMuted} />}
          />
          <SettingsRow
            Icon={Globe}
            tint={color.textSecondary}
            label={s.settings.account.language}
            value={LANGUAGE_NAMES[lang]}
            onPress={() => navigation.navigate('Language', { fromSettings: true })}
            chevron={<ChevronIcon size={18} color={color.textMuted} />}
          />
          <TouchableOpacity
            style={styles.row}
            onPress={() => setIdentifierRevealed(r => !r)}
            onLongPress={handleIdentifierLongPress}
            activeOpacity={0.7}>
            <IconBadge Icon={Key} tint={color.severity.medium} />
            <View style={styles.rowBody}>
              <Text>{s.settings.account.identifier}</Text>
              <Text secondary variant="caption" style={styles.identifierValue}>
                {identifierRevealed ? fullPublicKey : shortIdentifier}
              </Text>
            </View>
            <Copy size={16} color={color.textMuted} />
          </TouchableOpacity>
        </Group>

        <SectionHeader label={s.settings.privacy.title} />
        <Group>
          <SettingsRow
            Icon={Shield}
            tint={color.status.calm}
            label={s.settings.privacy.constitution}
            onPress={() => navigation.navigate('PrivacyConstitution')}
            chevron={<ChevronIcon size={18} color={color.textMuted} />}
          />
          <SettingsRow
            Icon={Trash2}
            tint={color.error}
            label={s.settings.privacy.deleteData}
            destructive
            onPress={handleDeleteData}
          />
        </Group>

        <SectionHeader label={s.settings.notifications.title} />
        <Group>
          <ToggleRow
            Icon={Siren}
            tint={color.accent}
            label={s.settings.notifications.nearby}
            value={notifNearby}
            onValueChange={v => handleToggle(StorageKeys.NOTIFICATION_NEARBY, v, setNotifNearby)}
          />
          <ToggleRow
            Icon={Radio}
            tint={color.status.watch}
            label={s.settings.notifications.statusChanges}
            value={notifStatus}
            onValueChange={v => handleToggle(StorageKeys.NOTIFICATION_STATUS, v, setNotifStatus)}
          />
          <ToggleRow
            Icon={MessageCircle}
            tint={color.status.calm}
            label={s.settings.notifications.followUp}
            value={notifFollowup}
            onValueChange={v => handleToggle(StorageKeys.NOTIFICATION_FOLLOWUP, v, setNotifFollowup)}
          />
        </Group>

        <SectionHeader label={s.settings.about.title} />
        <Group>
          <SettingsRow
            Icon={Info}
            tint={color.textSecondary}
            label={s.settings.about.version}
            value={APP_VERSION}
            onPress={() => navigation.navigate('About')}
            chevron={<ChevronIcon size={18} color={color.textMuted} />}
          />
        </Group>

        <SectionHeader label={s.settings.support.title} />
        <Group>
          <SettingsRow
            Icon={HelpCircle}
            tint={color.textSecondary}
            label={s.settings.support.howItWorks}
            onPress={() => navigation.navigate('HowItWorks')}
            chevron={<ChevronIcon size={18} color={color.textMuted} />}
          />
          <SettingsRow
            Icon={Mail}
            tint={color.textSecondary}
            label={s.settings.support.contact}
            onPress={handleContact}
          />
        </Group>
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

// Inset-grouped card (iOS Settings style): one elevated white card per
// section; dividers are inserted between children automatically.
const Group = ({ children }: { children: React.ReactNode }): React.ReactElement => {
  const items = React.Children.toArray(children);
  return (
    <View style={styles.group}>
      {items.map((child, i) => (
        <View key={i} style={i < items.length - 1 ? styles.divider : null}>
          {child}
        </View>
      ))}
    </View>
  );
};

// Tinted icon badge — the same visual language as feed cards and the
// category grid, so settings reads as part of the same family.
const IconBadge = ({
  Icon,
  tint,
}: {
  Icon: React.ComponentType<IconProps>;
  tint: string;
}): React.ReactElement => (
  <View style={[styles.iconBadge, { backgroundColor: tint + '14' }]}>
    <Icon size={18} color={tint} />
  </View>
);

interface SettingsRowProps {
  Icon: React.ComponentType<IconProps>;
  tint: string;
  label: string;
  value?: string;
  destructive?: boolean;
  onPress: () => void;
  chevron?: React.ReactNode;
}

const SettingsRow = ({
  Icon, tint, label, value, destructive, onPress, chevron,
}: SettingsRowProps): React.ReactElement => (
  <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
    <IconBadge Icon={Icon} tint={tint} />
    <View style={styles.rowBody}>
      <Text style={destructive ? styles.destructiveLabel : undefined}>{label}</Text>
      {value ? <Text secondary variant="caption">{value}</Text> : null}
    </View>
    {chevron}
  </TouchableOpacity>
);

interface ToggleRowProps {
  Icon: React.ComponentType<IconProps>;
  tint: string;
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}

const ToggleRow = ({
  Icon, tint, label, value, onValueChange,
}: ToggleRowProps): React.ReactElement => (
  <View style={styles.row}>
    <IconBadge Icon={Icon} tint={tint} />
    <View style={styles.rowBody}>
      <Text>{label}</Text>
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: color.border, true: color.status.calm }}
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
    gap: space(1),
    paddingHorizontal: space(2),
    paddingVertical: space(1.5),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.border,
  },
  backBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: space(8),
  },
  sectionHeader: {
    paddingHorizontal: space(4),
    paddingTop: space(3),
    paddingBottom: space(1),
    letterSpacing: 0.8,
  },
  group: {
    marginHorizontal: space(2),
    backgroundColor: color.card,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
    overflow: 'hidden',
    ...shadow.card,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space(2),
    paddingVertical: space(1.5),
    minHeight: 56,
    gap: space(1.75),
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: radius.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destructiveLabel: {
    color: color.error,
  },
  identifierValue: {
    fontFamily: font.mono,
    letterSpacing: 0.5,
  },
});

export default SettingsScreen;
