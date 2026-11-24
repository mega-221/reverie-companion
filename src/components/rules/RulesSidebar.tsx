import React, { useMemo, useState } from 'react';
import {
  RULES_CHAPTERS,
  TOTAL_RULE_SECTIONS,
  findChapterById,
  findSectionLocation,
  formatPageSpan,
  searchRules,
} from '../../data/rulesIndex';
import type { RuleBookmark } from '../../data/rulesTypes';
import { HighlightedText } from './HighlightedText';
import { useCompendium } from '../../CompendiumContext';

interface RulesSidebarProps {
  activeChapterId: string;
  activeSectionId: string | null;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSelectChapter: (chapterId: string) => void;
  onSelectSection: (chapterId: string, sectionId: string, fromSearch?: boolean) => void;
  bookmarks: RuleBookmark[];
  isBookmarked: (chapterId: string, sectionId?: string) => boolean;
  onToggleBookmark: (chapterId: string, sectionId?: string) => void;
  onRemoveBookmark: (id: string) => void;
  onClearBookmarks: () => void;
  onCloseMobile?: () => void;
}

export const RulesSidebar: React.FC<RulesSidebarProps> = ({
  activeChapterId,
  activeSectionId,
  searchQuery,
  onSearchChange,
  onSelectChapter,
  onSelectSection,
  bookmarks,
  isBookmarked,
  onToggleBookmark,
  onRemoveBookmark,
  onClearBookmarks,
  onCloseMobile,
}) => {
  const { entries: compendiumEntries } = useCompendium();
  const [sidebarMode, setSidebarMode] = useState<'contents' | 'bookmarks'>('contents');
  const [manualExpandedIds, setManualExpandedIds] = useState<Record<string, boolean>>({});

  const searchResults = useMemo(
    () => searchRules(searchQuery, compendiumEntries),
    [searchQuery, compendiumEntries]
  );
  const isSearching = searchQuery.trim().length > 0;

  const toggleChapterExpanded = (chapterId: string) => {
    setManualExpandedIds((prev) => {
      const currentlyExpanded =
        prev[chapterId] !== undefined ? prev[chapterId] : chapterId === activeChapterId;
      return { ...prev, [chapterId]: !currentlyExpanded };
    });
  };

  const isChapterExpanded = (chapterId: string) => {
    if (manualExpandedIds[chapterId] !== undefined) {
      return manualExpandedIds[chapterId];
    }
    return chapterId === activeChapterId;
  };

  const handleJumpChapter = (chapterId: string) => {
    setManualExpandedIds((prev) => ({ ...prev, [chapterId]: true }));
    onSelectChapter(chapterId);
    onCloseMobile?.();
  };

  const handleJumpSection = (chapterId: string, sectionId: string, fromSearch = false) => {
    setManualExpandedIds((prev) => ({ ...prev, [chapterId]: true }));
    onSelectSection(chapterId, sectionId, fromSearch);
    onCloseMobile?.();
  };

  return (
    <div className="sheet-panel flex flex-col overflow-hidden max-h-[82vh] lg:max-h-[calc(100vh-7.5rem)]">
      {/* Search Header */}
      <div className="p-3.5 border-b rev-divider space-y-2.5 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-xs uppercase tracking-wider font-bold"
            style={{ color: 'var(--rev-text-muted)' }}
          >
            Rulebook Index
          </span>
          <div className="flex items-center gap-2">
            <span
              className="text-[11px] tabular-nums"
              style={{ color: 'var(--rev-text-faint)' }}
            >
              {RULES_CHAPTERS.length} chapters · {TOTAL_RULE_SECTIONS} sections
            </span>
            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Close rulebook index"
                className="rev-icon-btn rev-icon-btn-edit text-sm"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="relative">
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--rev-text-faint)' }}
          >
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
              clipRule="evenodd"
            />
          </svg>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search entire rules..."
            aria-label="Search entire rules"
            className="rev-input w-full pl-9 pr-8 py-2 text-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rev-icon-btn rev-icon-btn-edit text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {!isSearching ? (
          <div
            className="grid grid-cols-2 gap-1 p-1 rev-inset"
            role="tablist"
            aria-label="Rulebook sidebar mode"
          >
            <button
              type="button"
              role="tab"
              aria-selected={sidebarMode === 'contents'}
              onClick={() => setSidebarMode('contents')}
              className={`px-2.5 py-1.5 text-xs font-bold transition-colors whitespace-nowrap ${
                sidebarMode === 'contents' ? 'rev-btn-primary' : 'opacity-75 hover:opacity-100'
              }`}
              style={
                sidebarMode === 'contents' ? undefined : { color: 'var(--rev-text-secondary)' }
              }
            >
              Contents
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={sidebarMode === 'bookmarks'}
              onClick={() => setSidebarMode('bookmarks')}
              className={`px-2.5 py-1.5 text-xs font-bold transition-colors whitespace-nowrap tabular-nums ${
                sidebarMode === 'bookmarks' ? 'rev-btn-primary' : 'opacity-75 hover:opacity-100'
              }`}
              style={
                sidebarMode === 'bookmarks' ? undefined : { color: 'var(--rev-text-secondary)' }
              }
            >
              Bookmarks ({bookmarks.length})
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs pt-0.5">
            <span className="tabular-nums" style={{ color: 'var(--rev-text-muted)' }}>
              {searchResults.length}{' '}
              {searchResults.length === 1 ? 'matching section' : 'matching sections'}
            </span>
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="font-semibold hover:underline"
              style={{ color: 'var(--rev-accent-text)' }}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Scrollable Sidebar Body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2.5 space-y-1.5">
        {isSearching ? (
          searchResults.length === 0 ? (
            <div className="rev-inset p-4 text-center space-y-1.5 my-2">
              <p className="text-sm font-semibold" style={{ color: 'var(--rev-text-bright)' }}>
                No matching rules found
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--rev-text-muted)' }}>
                Try another keyword such as <span className="italic">Vigor</span>,{' '}
                <span className="italic">Flanking</span>, <span className="italic">Berserker</span>,
                or <span className="italic">Soulburn</span>.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {searchResults.map((result) => {
                const isActive =
                  result.chapter.id === activeChapterId &&
                  result.section.id === activeSectionId;
                return (
                  <button
                    key={`${result.chapter.id}::${result.section.id}`}
                    type="button"
                    onClick={() =>
                      handleJumpSection(result.chapter.id, result.section.id, true)
                    }
                    className="w-full text-left p-2.5 transition-colors border"
                    style={{
                      borderRadius: 'var(--rev-radius-card)',
                      backgroundColor: isActive
                        ? 'var(--rev-accent-soft)'
                        : 'var(--rev-surface-inset)',
                      borderColor: isActive
                        ? 'var(--rev-accent-border)'
                        : 'var(--rev-border-subtle)',
                    }}
                  >
                    <div
                      className="text-[11px] tabular-nums mb-0.5 truncate"
                      style={{ color: 'var(--rev-text-muted)' }}
                    >
                      {result.chapter.number}. {result.chapter.title} ·{' '}
                      {formatPageSpan(result.section.pages)}
                    </div>
                    <div
                      className="text-sm font-semibold leading-snug mb-1"
                      style={{ color: 'var(--rev-text-bright)' }}
                    >
                      <HighlightedText text={result.section.title} query={searchQuery} />
                    </div>
                    <p
                      className="text-xs leading-relaxed line-clamp-3"
                      style={{ color: 'var(--rev-text-secondary)' }}
                    >
                      <HighlightedText text={result.snippet} query={searchQuery} />
                    </p>
                  </button>
                );
              })}
            </div>
          )
        ) : sidebarMode === 'contents' ? (
          <nav aria-label="Rulebook table of contents" className="space-y-1">
            {RULES_CHAPTERS.map((chapter) => {
              const isCurrentChapter = chapter.id === activeChapterId;
              const expanded = isChapterExpanded(chapter.id);
              const chapterBookmarked = isBookmarked(chapter.id);

              return (
                <div key={chapter.id} className="space-y-0.5">
                  <div
                    className="flex items-center gap-1 px-2 py-1.5 transition-colors border"
                    style={{
                      borderRadius: 'var(--rev-radius-control)',
                      backgroundColor: isCurrentChapter
                        ? 'var(--rev-accent-soft)'
                        : 'transparent',
                      borderColor: isCurrentChapter
                        ? 'var(--rev-accent-border)'
                        : 'transparent',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleChapterExpanded(chapter.id)}
                      aria-expanded={expanded}
                      aria-label={`${expanded ? 'Collapse' : 'Expand'} Chapter ${chapter.number}`}
                      className="p-1 shrink-0 opacity-75 hover:opacity-100"
                      style={{ color: 'var(--rev-text-muted)' }}
                    >
                      <svg
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        className={`w-3.5 h-3.5 transition-transform ${
                          expanded ? 'rotate-90' : ''
                        }`}
                      >
                        <path
                          fillRule="evenodd"
                          d="M6.22 4.22a.75.75 0 011.06 0l3.25 3.25a.75.75 0 010 1.06l-3.25 3.25a.75.75 0 01-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 010-1.06z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleJumpChapter(chapter.id)}
                      className="flex-1 text-left min-w-0 py-0.5"
                    >
                      <div
                        className="text-xs font-bold leading-snug truncate"
                        style={{
                          color: isCurrentChapter
                            ? 'var(--rev-accent-text)'
                            : 'var(--rev-text-bright)',
                        }}
                      >
                        <span className="mr-1.5 tabular-nums">
                          {chapter.number}.
                        </span>
                        {chapter.title}
                      </div>
                      <div
                        className="text-[11px] tabular-nums"
                        style={{ color: 'var(--rev-text-faint)' }}
                      >
                        {formatPageSpan(chapter.pages)} · {chapter.sections.length}{' '}
                        {chapter.sections.length === 1 ? 'section' : 'sections'}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => onToggleBookmark(chapter.id)}
                      aria-label={
                        chapterBookmarked
                          ? `Remove bookmark for Chapter ${chapter.number}`
                          : `Bookmark Chapter ${chapter.number}`
                      }
                      title={chapterBookmarked ? 'Bookmarked' : 'Bookmark chapter'}
                      className={`p-1 shrink-0 transition-opacity ${
                        chapterBookmarked ? 'opacity-100' : 'opacity-35 hover:opacity-90'
                      }`}
                      style={{
                        color: chapterBookmarked
                          ? 'var(--rev-accent-highlight)'
                          : 'var(--rev-text-muted)',
                      }}
                    >
                      <BookmarkIcon filled={chapterBookmarked} className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {expanded && (
                    <div className="pl-5 pr-1 py-0.5 space-y-0.5">
                      {chapter.sections.map((section) => {
                        const isActiveSection =
                          isCurrentChapter && activeSectionId === section.id;
                        const sectionBookmarked = isBookmarked(chapter.id, section.id);

                        return (
                          <div
                            key={section.id}
                            className="group flex items-center gap-1 px-2 py-1 transition-colors border"
                            style={{
                              borderRadius: 'var(--rev-radius-badge)',
                              backgroundColor: isActiveSection
                                ? 'var(--rev-surface-inset)'
                                : 'transparent',
                              borderColor: isActiveSection
                                ? 'var(--rev-border)'
                                : 'transparent',
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => handleJumpSection(chapter.id, section.id)}
                              className="flex-1 text-left min-w-0 flex items-baseline justify-between gap-2"
                            >
                              <span
                                className={`text-xs leading-snug truncate ${
                                  isActiveSection ? 'font-semibold' : ''
                                }`}
                                style={{
                                  color: isActiveSection
                                    ? 'var(--rev-accent-text)'
                                    : 'var(--rev-text-secondary)',
                                }}
                              >
                                {section.title}
                              </span>
                              <span
                                className="text-[10px] tabular-nums shrink-0"
                                style={{ color: 'var(--rev-text-faint)' }}
                              >
                                {section.pages[0] === section.pages[1]
                                  ? section.pages[0]
                                  : `${section.pages[0]}–${section.pages[1]}`}
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => onToggleBookmark(chapter.id, section.id)}
                              aria-label={
                                sectionBookmarked
                                  ? `Remove bookmark for ${section.title}`
                                  : `Bookmark ${section.title}`
                              }
                              title={sectionBookmarked ? 'Bookmarked' : 'Bookmark section'}
                              className={`p-0.5 shrink-0 transition-opacity ${
                                sectionBookmarked
                                  ? 'opacity-100'
                                  : 'opacity-0 group-hover:opacity-80 focus:opacity-100'
                              }`}
                              style={{
                                color: sectionBookmarked
                                  ? 'var(--rev-accent-highlight)'
                                  : 'var(--rev-text-muted)',
                              }}
                            >
                              <BookmarkIcon filled={sectionBookmarked} className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        ) : (
          <div className="space-y-2">
            {bookmarks.length === 0 ? (
              <div className="rev-inset p-4 text-center space-y-1.5 my-2">
                <p className="text-sm font-semibold" style={{ color: 'var(--rev-text-bright)' }}>
                  No saved bookmarks yet
                </p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--rev-text-muted)' }}>
                  Select the bookmark icon next to any chapter or section to pin key rules here for
                  fast reference during play.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between px-1 pt-0.5">
                  <span className="text-[11px]" style={{ color: 'var(--rev-text-muted)' }}>
                    Saved locally on this device
                  </span>
                  <button
                    type="button"
                    onClick={onClearBookmarks}
                    className="text-[11px] font-semibold hover:underline"
                    style={{ color: 'var(--rev-text-muted)' }}
                  >
                    Clear all
                  </button>
                </div>

                <div className="space-y-1.5">
                  {bookmarks.map((bm) => {
                    const chapter = findChapterById(bm.chapterId);
                    const secLoc = bm.sectionId ? findSectionLocation(bm.sectionId) : null;
                    const title = secLoc
                      ? secLoc.section.title
                      : `${chapter.number}. ${chapter.title}`;
                    const subtitle = secLoc
                      ? `${chapter.number}. ${chapter.title} · ${formatPageSpan(
                          secLoc.section.pages
                        )}`
                      : `Entire Chapter · ${formatPageSpan(chapter.pages)}`;

                    return (
                      <div
                        key={bm.id}
                        className="flex items-start gap-2 p-2.5 rev-inset hover:border-[var(--rev-accent-border)] transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            secLoc
                              ? handleJumpSection(chapter.id, secLoc.section.id)
                              : handleJumpChapter(chapter.id)
                          }
                          className="flex-1 text-left min-w-0"
                        >
                          <div
                            className="text-xs font-semibold truncate"
                            style={{ color: 'var(--rev-text-bright)' }}
                          >
                            {title}
                          </div>
                          <div
                            className="text-[11px] tabular-nums truncate mt-0.5"
                            style={{ color: 'var(--rev-text-muted)' }}
                          >
                            {subtitle}
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => onRemoveBookmark(bm.id)}
                          aria-label={`Remove bookmark ${title}`}
                          title="Remove bookmark"
                          className="rev-icon-btn rev-icon-btn-danger text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const BookmarkIcon: React.FC<{ filled: boolean; className?: string }> = ({
  filled,
  className = 'w-4 h-4',
}) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 20 20"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth={1.6}
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5.5 3.25h9A1.25 1.25 0 0115.75 4.5v12.5l-5.75-3.5L4.25 17V4.5A1.25 1.25 0 015.5 3.25z"
    />
  </svg>
);
