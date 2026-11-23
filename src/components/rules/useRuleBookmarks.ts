import { useCallback, useEffect, useState } from 'react';
import type { RuleBookmark } from '../../data/rulesTypes';

const STORAGE_KEY = 'reverie-rules-bookmarks-v1';

export function makeBookmarkId(chapterId: string, sectionId?: string): string {
  return sectionId ? `${chapterId}::${sectionId}` : chapterId;
}

function loadInitialBookmarks(): RuleBookmark[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is RuleBookmark =>
        Boolean(item && typeof item.id === 'string' && typeof item.chapterId === 'string')
    );
  } catch {
    return [];
  }
}

export function useRuleBookmarks() {
  const [bookmarks, setBookmarks] = useState<RuleBookmark[]>(loadInitialBookmarks);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
    } catch {
      // Ignore storage quota / privacy mode failures gracefully
    }
  }, [bookmarks]);

  const isBookmarked = useCallback(
    (chapterId: string, sectionId?: string) => {
      const targetId = makeBookmarkId(chapterId, sectionId);
      return bookmarks.some((b) => b.id === targetId);
    },
    [bookmarks]
  );

  const toggleBookmark = useCallback((chapterId: string, sectionId?: string) => {
    const targetId = makeBookmarkId(chapterId, sectionId);
    setBookmarks((prev) => {
      const exists = prev.some((b) => b.id === targetId);
      if (exists) {
        return prev.filter((b) => b.id !== targetId);
      }
      const next: RuleBookmark = {
        id: targetId,
        chapterId,
        sectionId,
        addedAt: Date.now(),
      };
      return [next, ...prev];
    });
  }, []);

  const removeBookmark = useCallback((id: string) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const clearBookmarks = useCallback(() => {
    setBookmarks([]);
  }, []);

  return {
    bookmarks,
    isBookmarked,
    toggleBookmark,
    removeBookmark,
    clearBookmarks,
  };
}
