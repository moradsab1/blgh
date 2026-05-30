import { create } from 'zustand';
import store, { StorageKeys } from '../../core/storage';

// ── Bookmarks store ────────────────────────────────────────────────────────
// Bookmarked incident IDs, persisted to AsyncStorage under StorageKeys.BOOKMARKS
// as a JSON array. The in-memory storage cache is hydrated at startup
// (hydrateStorage), so the initial read is synchronous.

interface BookmarksState {
  ids: string[];
  isBookmarked: (id: string) => boolean;
  toggle: (id: string) => void;
  hydrate: () => void;
}

function loadFromStorage(): string[] {
  const raw = store.getString(StorageKeys.BOOKMARKS);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function persist(ids: string[]): void {
  store.setString(StorageKeys.BOOKMARKS, JSON.stringify(ids));
}

export const useBookmarksStore = create<BookmarksState>((set, get) => ({
  ids: loadFromStorage(),

  isBookmarked: (id: string) => get().ids.includes(id),

  toggle: (id: string) => {
    const current = get().ids;
    const next = current.includes(id)
      ? current.filter(x => x !== id)
      : [...current, id];
    persist(next);
    set({ ids: next });
  },

  hydrate: () => set({ ids: loadFromStorage() }),
}));
