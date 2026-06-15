import { db } from '../../src/data/mock/db';
import { strings } from '../../src/core/strings';
import type { FeedPost, FeedPostKind } from '../../src/core/types';

describe('feeds content (team events + community news)', () => {
  it('seeds both announcement and news posts', () => {
    const posts = db.feedPosts.getAll();
    expect(posts.length).toBeGreaterThan(0);
    const kinds = new Set(posts.map(p => p.kind));
    expect(kinds.has('announcement')).toBe(true);
    expect(kinds.has('news')).toBe(true);
  });

  it('every post carries a source, title, body and timestamp', () => {
    for (const p of db.feedPosts.getAll()) {
      expect(p.source).toBeTruthy();
      expect(p.title).toBeTruthy();
      expect(p.body).toBeTruthy();
      expect(Number.isNaN(Date.parse(p.createdAt))).toBe(false);
    }
  });

  it('filtering by kind narrows the list (matches the screen filters)', () => {
    const posts = db.feedPosts.getAll();
    const byKind = (kind: FeedPostKind): FeedPost[] => posts.filter(p => p.kind === kind);
    expect(byKind('announcement').length).toBeGreaterThan(0);
    expect(byKind('news').length).toBeGreaterThan(0);
    expect(byKind('announcement').length + byKind('news').length).toBe(posts.length);
  });

  it('feeds chrome strings exist in every locale', () => {
    for (const s of [strings.ar, strings.he, strings.en]) {
      expect(s.feeds.title).toBeTruthy();
      expect(s.feeds.subtitle).toBeTruthy();
      expect(s.feeds.filters.all).toBeTruthy();
      expect(s.feeds.filters.announcements).toBeTruthy();
      expect(s.feeds.filters.news).toBeTruthy();
      expect(s.feeds.announcement).toBeTruthy();
      expect(s.feeds.news).toBeTruthy();
    }
  });
});
