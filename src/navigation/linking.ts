import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from './types';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['balagh://'],
  config: {
    screens: {
      CrisisReassure: 'crisis',
      Map: 'map',
      Inbox: 'inbox',
      Settings: 'settings',
    },
  },
};
