import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  RULES_CHAPTERS,
  RULES_META,
  findChapterById,
  findSectionLocation,
  formatPageSpan,
} from '../../data/rulesIndex';
import { RulesMarkdownRenderer } from './RulesMarkdownRenderer';
import { BookmarkIcon, RulesSidebar } from './RulesSidebar';
import { useRuleBookmarks } from './useRuleBookmarks';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { useEscapeKey } from '../../hooks/useEscapeKey';

interface RulesBrowserProps {
  initialChapterId?: string | null;
  initialSectionId?: string | null;
  onLocationChange?: (chapterId: string, sectionId: string | null) => void;
}

export const RulesBrowser: React.FC<RulesBrowserProps> = ({
  initialChapterId,
  initialSectionId,
  onLocationChange,
}) => {
  // Resolve initial chapter/section cleanly even if only sectionId was provided in URL
  const resolvedInitial = useMemo(() => {
    if (initialSectionId) {
      const loc = findSectionLocation(initialSectionId);
      if (loc) return { chapterId: loc.chapter.id, sectionId: loc.section.id };
    }
    const ch = findChapterById(initialChapterId);
    return { chapterId: ch.id, sectionId: ch.sections[0]?.id ?? null };
  }, [initialChapterId, initialSectionId]);

  const [activeChapterId, setActiveChapterId] = useState<string>(resolvedInitial.chapterId);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(
    resolvedInitial.sectionId
  );
  const [pendingScrollSectionId, setPendingScrollSectionId] = useState<string | null>(
    initialSectionId || null
  );
  const [highlightedSectionId, setHighlightedSectionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeHighlightQuery, setActiveHighlightQuery] = useState('');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  useBodyScrollLock(mobileDrawerOpen);

  const {
    bookmarks,
    isBookmarked,
    toggleBookmark,
    removeBookmark,
    clearBookmarks,
  } = useRuleBookmarks();

  const articleRef = useRef<HTMLDivElement | null>(null);

  // Sync if URL props change externally (e.g., browser Back/Forward popstate)
  useEffect(() => {
    if (initialSectionId) {
      const loc = findSectionLocation(initialSectionId);
      if (loc) {
        setActiveChapterId(loc.chapter.id);
        setActiveSectionId(loc.section.id);
        setPendingScrollSectionId(loc.section.id);
        return;
      }
    }
    if (initialChapterId) {
      const ch = findChapterById(initialChapterId);
      setActiveChapterId(ch.id);
      setActiveSectionId(ch.sections[0]?.id ?? null);
    }
  }, [initialChapterId, initialSectionId]);

  const chapterIndex = useMemo(
    () => Math.max(0, RULES_CHAPTERS.findIndex((c) => c.id === activeChapterId)),
    [activeChapterId]
  );
  const activeChapter = RULES_CHAPTERS[chapterIndex] || RULES_CHAPTERS[0];
  const prevChapter = chapterIndex > 0 ? RULES_CHAPTERS[chapterIndex - 1] : null;
  const nextChapter =
    chapterIndex < RULES_CHAPTERS.length - 1 ? RULES_CHAPTERS[chapterIndex + 1] : null;

  // Scroll smoothly to pending section after chapter render
  useEffect(() => {
    if (!pendingScrollSectionId) return;
    const targetId = `rule-sec-${pendingScrollSectionId}`;
    const timer = window.setTimeout(() => {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setHighlightedSectionId(pendingScrollSectionId);
        window.setTimeout(() => {
          setHighlightedSectionId((curr) =>
            curr === pendingScrollSectionId ? null : curr
          );
        }, 2200);
      }
      setPendingScrollSectionId(null);
    }, 60);
    return () => window.clearTimeout(timer);
  }, [activeChapter.id, pendingScrollSectionId]);

  // Passive scroll-spy tracking visible section inside current chapter
  useEffect(() => {
    const container = articleRef.current;
    if (!container) return;

    const sectionEls = Array.from(
      container.querySelectorAll<HTMLElement>('[data-section-id]')
    );
    if (sectionEls.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          const secId = visible[0].target.getAttribute('data-section-id');
          if (secId) setActiveSectionId(secId);
        }
      },
      {
        rootMargin: '-12% 0px -70% 0px',
        threshold: 0,
      }
    );

    sectionEls.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [activeChapter.id]);

  // Close mobile drawer on Escape
  useEscapeKey(mobileDrawerOpen, () => setMobileDrawerOpen(false));

  const handleSelectChapter = useCallback(
    (chapterId: string) => {
      const target = findChapterById(chapterId);
      const firstSection = target.sections[0]?.id ?? null;
      setActiveChapterId(target.id);
      setActiveSectionId(firstSection);
      setPendingScrollSectionId(null);
      setActiveHighlightQuery('');
      onLocationChange?.(target.id, null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [onLocationChange]
  );

  const handleSelectSection = useCallback(
    (chapterId: string, sectionId: string, fromSearch = false) => {
      setActiveChapterId(chapterId);
      setActiveSectionId(sectionId);
      setPendingScrollSectionId(sectionId);
      setActiveHighlightQuery(fromSearch ? searchQuery.trim() : '');
      onLocationChange?.(chapterId, sectionId);
    },
    [onLocationChange, searchQuery]
  );

  const chapterBookmarked = isBookmarked(activeChapter.id);

  return (
    <div className="space-y-4">
      {/* Mobile Drawer Toggle Bar */}
      <div className="lg:hidden flex items-center justify-between gap-2 sheet-panel p-3">
        <button
          type="button"
          onClick={() => setMobileDrawerOpen(true)}
          className="rev-btn-secondary px-3 py-2 text-xs font-bold flex items-center gap-2 whitespace-nowrap shrink-0"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path
              fillRule="evenodd"
              d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z"
              clipRule="evenodd"
            />
          </svg>
          Contents & Search
        </button>

        <div className="text-right min-w-0">
          <div
            className="text-xs font-bold truncate"
            style={{ color: 'var(--rev-text-bright)' }}
          >
            {activeChapter.number}. {activeChapter.title}
          </div>
          <div
            className="text-[11px] tabular-nums"
            style={{ color: 'var(--rev-text-muted)' }}
          >
            {formatPageSpan(activeChapter.pages)} · {bookmarks.length} bookmarked
          </div>
        </div>
      </div>

      {/* Mobile Centered Index & Search Dialog */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 !mt-0 z-50 lg:hidden flex items-center justify-center p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Rulebook contents and search"
        >
          <div
            className="fixed inset-0 rev-modal-backdrop backdrop-blur-sm"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-150">
            <RulesSidebar
              activeChapterId={activeChapter.id}
              activeSectionId={activeSectionId}
              searchQuery={searchQuery}
              onSearchChange={(q) => {
                setSearchQuery(q);
                if (!q.trim()) setActiveHighlightQuery('');
              }}
              onSelectChapter={handleSelectChapter}
              onSelectSection={handleSelectSection}
              bookmarks={bookmarks}
              isBookmarked={isBookmarked}
              onToggleBookmark={toggleBookmark}
              onRemoveBookmark={removeBookmark}
              onClearBookmarks={clearBookmarks}
              onCloseMobile={() => setMobileDrawerOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Two-Column Reading Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-6 items-start">
        {/* Desktop Sticky Navigation Rail */}
        <aside className="hidden lg:block sticky top-24">
          <RulesSidebar
            activeChapterId={activeChapter.id}
            activeSectionId={activeSectionId}
            searchQuery={searchQuery}
            onSearchChange={(q) => {
              setSearchQuery(q);
              if (!q.trim()) setActiveHighlightQuery('');
            }}
            onSelectChapter={handleSelectChapter}
            onSelectSection={handleSelectSection}
            bookmarks={bookmarks}
            isBookmarked={isBookmarked}
            onToggleBookmark={toggleBookmark}
            onRemoveBookmark={removeBookmark}
            onClearBookmarks={clearBookmarks}
          />
        </aside>

        {/* Active Chapter Page */}
        <main className="sheet-panel p-5 sm:p-8 lg:p-10 min-w-0" ref={articleRef}>

          {/* Chapter Header */}
          <header className="pb-5 mb-6 border-b rev-divider space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1.5 min-w-0">
                <p
                  className="text-xs uppercase tracking-[0.18em] font-semibold tabular-nums"
                  style={{ color: 'var(--rev-accent-text)' }}
                >
                  {RULES_META.source} · Chapter {activeChapter.number} ·{' '}
                  {formatPageSpan(activeChapter.pages)} · {activeChapter.sections.length}{' '}
                  {activeChapter.sections.length === 1 ? 'section' : 'sections'}
                </p>
                <h2
                  className="font-spectral text-2xl sm:text-3xl font-bold tracking-wide"
                  style={{
                    color: 'var(--rev-text-bright)',
                  }}
                >
                  {activeChapter.number}. {activeChapter.title}
                </h2>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => toggleBookmark(activeChapter.id)}
                  className={`px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                    chapterBookmarked ? 'rev-btn-primary' : 'rev-btn-secondary'
                  }`}
                >
                  <BookmarkIcon filled={chapterBookmarked} className="w-3.5 h-3.5" />
                  {chapterBookmarked ? 'Chapter Bookmarked' : 'Bookmark Chapter'}
                </button>
              </div>
            </div>

            {/* Active Search Highlight Notice */}
            {activeHighlightQuery && (
              <div className="rev-inset px-3.5 py-2 flex items-center justify-between gap-3 text-xs">
                <span style={{ color: 'var(--rev-text-secondary)' }}>
                  Highlighting search matches for{' '}
                  <strong style={{ color: 'var(--rev-accent-highlight)' }}>
                    “{activeHighlightQuery}”
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={() => setActiveHighlightQuery('')}
                  className="font-semibold hover:underline shrink-0"
                  style={{ color: 'var(--rev-accent-text)' }}
                >
                  Clear highlight
                </button>
              </div>
            )}

            {/* Quick Section Jump Strip inside Multi-Section Chapters */}
            {activeChapter.sections.length > 1 && (
              <div className="rev-inset p-3.5 space-y-2">
                <div
                  className="text-[11px] uppercase tracking-wider font-bold"
                  style={{ color: 'var(--rev-text-muted)' }}
                >
                  Sections in This Chapter
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-4 gap-y-1">
                  {activeChapter.sections.map((sec) => {
                    const isCurrent = activeSectionId === sec.id;
                    return (
                      <button
                        key={sec.id}
                        type="button"
                        onClick={() => handleSelectSection(activeChapter.id, sec.id)}
                        className="text-left text-xs py-1 flex items-baseline justify-between gap-2 hover:underline transition-colors"
                        style={{
                          color: isCurrent
                            ? 'var(--rev-accent-text)'
                            : 'var(--rev-text-secondary)',
                          fontWeight: isCurrent ? 600 : 400,
                        }}
                      >
                        <span className="truncate">{sec.title}</span>
                        <span
                          className="text-[11px] tabular-nums shrink-0"
                          style={{ color: 'var(--rev-text-faint)' }}
                        >
                          {sec.pages[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </header>

          {/* Sequential Sections */}
          <div className="space-y-10">
            {activeChapter.sections.map((section, idx) => {
              const secBookmarked = isBookmarked(activeChapter.id, section.id);
              const isJustJumped = highlightedSectionId === section.id;

              return (
                <article
                  key={section.id}
                  id={`rule-sec-${section.id}`}
                  data-section-id={section.id}
                  className={`relative scroll-mt-24 ${
                    idx > 0 ? 'pt-8 border-t rev-divider-subtle' : ''
                  }`}
                >
                  {/* Non-shifting highlight backdrop */}
                  <div
                    aria-hidden="true"
                    className={`pointer-events-none absolute -inset-x-3 -bottom-2 ${
                      idx > 0 ? 'top-5' : '-top-2'
                    } border transition-opacity duration-500 ${
                      isJustJumped ? 'opacity-100' : 'opacity-0'
                    }`}
                    style={{
                      borderRadius: 'var(--rev-radius-card)',
                      backgroundColor: 'var(--rev-accent-soft)',
                      borderColor: 'var(--rev-accent-border)',
                    }}
                  />

                  <div className="relative z-10">
                    <div className="flex flex-wrap items-baseline justify-between gap-3 mb-4">
                    <div className="space-y-0.5 min-w-0">
                      <h3
                        className="font-spectral text-xl sm:text-2xl font-bold tracking-wide"
                        style={{ color: 'var(--rev-text-bright)' }}
                      >
                        {section.title}
                      </h3>
                      <p
                        className="text-xs tabular-nums"
                        style={{ color: 'var(--rev-text-faint)' }}
                      >
                        Chapter {activeChapter.number} · {formatPageSpan(section.pages)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleBookmark(activeChapter.id, section.id)}
                      aria-label={
                        secBookmarked
                          ? `Remove bookmark for ${section.title}`
                          : `Bookmark ${section.title}`
                      }
                      className={`px-2.5 py-1 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
                        secBookmarked
                          ? 'rev-btn-primary'
                          : 'rev-btn-secondary opacity-80 hover:opacity-100'
                      }`}
                    >
                      <BookmarkIcon filled={secBookmarked} className="w-3.5 h-3.5" />
                      {secBookmarked ? 'Bookmarked' : 'Bookmark'}
                    </button>
                  </div>

                    <RulesMarkdownRenderer
                      markdown={section.content}
                      sectionId={section.id}
                      highlightQuery={activeHighlightQuery}
                    />
                  </div>
                </article>
              );
            })}
          </div>

          {/* Chapter Pagination Footer */}
          <footer className="mt-12 pt-6 border-t rev-divider flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              {prevChapter ? (
                <button
                  type="button"
                  onClick={() => handleSelectChapter(prevChapter.id)}
                  className="rev-btn-secondary w-full sm:w-auto px-4 py-2.5 text-left flex flex-col gap-0.5"
                >
                  <span
                    className="text-[11px] uppercase tracking-wider"
                    style={{ color: 'var(--rev-text-muted)' }}
                  >
                    ← Previous Chapter
                  </span>
                  <span
                    className="text-sm font-bold truncate"
                    style={{ color: 'var(--rev-text-bright)' }}
                  >
                    {prevChapter.number}. {prevChapter.title}
                  </span>
                </button>
              ) : (
                <div />
              )}
            </div>

            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="rev-btn-secondary px-3.5 py-2 text-xs font-bold whitespace-nowrap shrink-0 self-center"
            >
              Back to top
            </button>

            <div className="flex-1 min-w-0 flex justify-end">
              {nextChapter ? (
                <button
                  type="button"
                  onClick={() => handleSelectChapter(nextChapter.id)}
                  className="rev-btn-primary w-full sm:w-auto px-4 py-2.5 text-right flex flex-col items-end gap-0.5"
                >
                  <span className="text-[11px] uppercase tracking-wider opacity-80">
                    Next Chapter →
                  </span>
                  <span className="text-sm font-bold truncate">
                    {nextChapter.number}. {nextChapter.title}
                  </span>
                </button>
              ) : (
                <div />
              )}
            </div>
          </footer>
        </main>
      </div>

      {/* Mobile Floating Bubble (FAB) for Rules Contents */}
      <button
        type="button"
        onClick={() => setMobileDrawerOpen(true)}
        aria-label="Open rulebook contents and search"
        className="lg:hidden fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full rev-btn-primary shadow-2xl flex items-center justify-center text-white cursor-pointer active:scale-95 transition-transform"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          <line x1="9" y1="7" x2="15" y2="7" />
          <line x1="9" y1="11" x2="15" y2="11" />
        </svg>
      </button>
    </div>
  );
};
