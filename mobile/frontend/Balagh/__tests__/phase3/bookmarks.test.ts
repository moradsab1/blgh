import { useBookmarksStore } from '../../src/domain/stores/bookmarks';
import store, { StorageKeys } from '../../src/core/storage';

describe('bookmarks store — persistence', () => {
  beforeEach(() => {
    store.delete(StorageKeys.BOOKMARKS);
    useBookmarksStore.getState().hydrate();
  });

  it('starts empty when nothing is stored', () => {
    expect(useBookmarksStore.getState().ids).toEqual([]);
    expect(useBookmarksStore.getState().isBookmarked('x')).toBe(false);
  });

  it('toggling on adds the id and persists it to storage', () => {
    useBookmarksStore.getState().toggle('inc-1');

    expect(useBookmarksStore.getState().isBookmarked('inc-1')).toBe(true);

    const raw = store.getString(StorageKeys.BOOKMARKS);
    expect(raw).toBeDefined();
    expect(JSON.parse(raw as string)).toContain('inc-1');
  });

  it('toggling off removes the id and updates storage', () => {
    useBookmarksStore.getState().toggle('inc-1');
    useBookmarksStore.getState().toggle('inc-1');

    expect(useBookmarksStore.getState().isBookmarked('inc-1')).toBe(false);
    expect(JSON.parse(store.getString(StorageKeys.BOOKMARKS) as string)).not.toContain('inc-1');
  });

  it('survives a re-hydrate (simulating an app relaunch from storage)', () => {
    useBookmarksStore.getState().toggle('inc-7');
    useBookmarksStore.getState().toggle('inc-9');

    // Wipe in-memory state, then reload from the persisted storage layer.
    useBookmarksStore.setState({ ids: [] });
    useBookmarksStore.getState().hydrate();

    const { ids } = useBookmarksStore.getState();
    expect(ids).toEqual(expect.arrayContaining(['inc-7', 'inc-9']));
  });

  it('tolerates corrupt stored JSON without throwing', () => {
    store.setString(StorageKeys.BOOKMARKS, '{not valid json');
    expect(() => useBookmarksStore.getState().hydrate()).not.toThrow();
    expect(useBookmarksStore.getState().ids).toEqual([]);
  });
});
