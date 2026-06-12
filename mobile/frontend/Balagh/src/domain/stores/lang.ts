import { create } from 'zustand';
import type { AppLanguage } from '../../core/types';
import { isRTL } from '../../core/strings';
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

/**
 * Reactive layout direction for the CURRENT language — flips instantly when
 * the user switches language, no app relaunch.
 *
 * Use this instead of `I18nManager.isRTL` in components: the I18nManager flag
 * only changes on the next cold start, so reading it mid-session would leave
 * mirrored icons and rows stale after a language change. The app root applies
 * the matching `direction` style (see App.tsx), which Yoga propagates to the
 * whole tree.
 */
export const useIsRTL = (): boolean => isRTL(useLangStore(s => s.lang));
