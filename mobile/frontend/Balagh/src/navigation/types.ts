import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Splash: undefined;
  Language: { fromSettings?: boolean } | undefined;
  Welcome: undefined;
  Locality: { fromSettings?: boolean };
  Map: undefined;
  Feed: undefined;
  IncidentDetail: { id: string };
  ReportCategory: undefined;
  ReportDetails: { category: string };
  ReportSuccess: { ref: string };
  CrisisReassure: undefined;
  CrisisCategory: undefined;
  CrisisConfirm: { category: string };
  CrisisSuccess: { ref: string };
  FollowUp: { ref: string };
  Inbox: undefined;
  Settings: undefined;
  PrivacyConstitution: undefined;
  About: undefined;
};

export type SplashProps = NativeStackScreenProps<RootStackParamList, 'Splash'>;
export type LanguageProps = NativeStackScreenProps<RootStackParamList, 'Language'>;
export type WelcomeProps = NativeStackScreenProps<RootStackParamList, 'Welcome'>;
export type LocalityProps = NativeStackScreenProps<RootStackParamList, 'Locality'>;
export type MapProps = NativeStackScreenProps<RootStackParamList, 'Map'>;
export type FeedProps = NativeStackScreenProps<RootStackParamList, 'Feed'>;
export type IncidentDetailProps = NativeStackScreenProps<RootStackParamList, 'IncidentDetail'>;
export type SettingsProps = NativeStackScreenProps<RootStackParamList, 'Settings'>;
export type InboxProps = NativeStackScreenProps<RootStackParamList, 'Inbox'>;
