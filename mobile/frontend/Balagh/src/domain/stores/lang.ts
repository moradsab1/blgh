import { create } from 'zustand';
import type { AppLanguage } from '../../core/types';
import store, { StorageKeys } from '../../core/storage';

interface LangStore {
  lang: AppLanguage;
  setLang: (lang: AppLanguage) => void;
}

// Default to Arabic. The real saved language is applied after the storage
// cache is hydrated at startup (see useHydrated in App.tsx), which calls
// setLang() with the persisted value.
export const useLangStore = create<LangStore>(set => ({
  lang: 'ar',
  setLang: lang => {
    store.setString(StorageKeys.LANGUAGE, lang);
    set({ lang });
  },
}));
