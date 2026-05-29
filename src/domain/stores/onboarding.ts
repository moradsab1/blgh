import { create } from 'zustand';
import store, { StorageKeys } from '../../core/storage';
import { SUPPORTED_LANGUAGES } from '../../core/strings';
import type { AppLanguage } from '../../core/types';

const parseLanguage = (value: string | undefined): AppLanguage | null =>
  value && (SUPPORTED_LANGUAGES as string[]).includes(value)
    ? (value as AppLanguage)
    : null;

interface OnboardingState {
  language: AppLanguage | null;
  localityId: string | null;
  onboardingDone: boolean;
  setLanguage: (lang: AppLanguage) => void;
  setLocalityId: (id: string) => void;
  setOnboardingDone: () => void;
  resetOnboarding: () => void;
  hydrate: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  language: null,
  localityId: null,
  onboardingDone: false,

  setLanguage: (lang) => {
    store.setString(StorageKeys.LANGUAGE, lang);
    set({ language: lang });
  },

  setLocalityId: (id) => {
    store.setString(StorageKeys.LOCALITY_ID, id);
    set({ localityId: id });
  },

  setOnboardingDone: () => {
    store.setBoolean(StorageKeys.ONBOARDING_DONE, true);
    set({ onboardingDone: true });
  },

  resetOnboarding: () => {
    store.delete(StorageKeys.LANGUAGE);
    store.delete(StorageKeys.LOCALITY_ID);
    store.delete(StorageKeys.ONBOARDING_DONE);
    set({ language: null, localityId: null, onboardingDone: false });
  },

  hydrate: () => {
    const language = parseLanguage(store.getString(StorageKeys.LANGUAGE));
    const localityId = store.getString(StorageKeys.LOCALITY_ID) || null;
    const onboardingDone = store.getBoolean(StorageKeys.ONBOARDING_DONE) ?? false;
    set({ language, localityId, onboardingDone });
  },
}));
