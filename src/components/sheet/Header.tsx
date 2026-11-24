import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Character } from '../../types';
import { vigorMax, strainMax, dpMax, apMax } from '../../calc';
import { useCompendium } from '../../CompendiumContext';
import { formatPageSpan, searchRules } from '../../data/rulesIndex';
import type { RuleChapter, RuleSection } from '../../data/rulesTypes';
import { HighlightedText } from '../rules/HighlightedText';
import { RulesQuickPopup } from '../rules/RulesQuickPopup';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import VitalsCard from './gameplay/VitalsCard';

export interface DragSkillTarget {
  name: string;
  kind: 'core' | 'special';
}

export default function Header({ 
  char, onBack, onSave, saving, saved, hasUnsavedChanges, showPulse, updateTracker, readOnly, onOpenSettings, onOpenInRules,
  onOpenDiceRoller, onDragHoverSkill, onDropSkillRoll
}: { 
  char: Character, 
  onBack: () => void, 
  onSave: () => void, 
  saving: boolean, 
  saved: boolean,
  hasUnsavedChanges?: boolean,
  showPulse?: boolean,
  updateTracker: (k: 'vigor' | 'strain' | 'dp' | 'ap' | 'acc', amount: number) => void,
  readOnly?: boolean,
  onOpenSettings?: () => void,
  onOpenInRules?: (chapterId: string, sectionId: string) => void,
  onOpenDiceRoller?: () => void,
  onDragHoverSkill?: (target: DragSkillTarget | null) => void,
  onDropSkillRoll?: (target: DragSkillTarget) => void
}) {
  const { getEntryByName, entries: compendiumEntries } = useCompendium();
  const maxAp = apMax(char.data, getEntryByName);
  const currentAp = char.data.trackers.ap ?? 0;
  const [vitalsOpen, setVitalsOpen] = useState(false);

  useBodyScrollLock(vitalsOpen);

  const convictionList = char.data.convictions.map(c => c.name).filter(Boolean);
  const classPathDisplay = [char.data.identity.className, char.data.identity.path].filter(Boolean).join(', ');

  // Quick Rules Search State
  const [rulesQuery, setRulesQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isSearchCompact, setIsSearchCompact] = useState(false);
  const [centeredWidthPx, setCenteredWidthPx] = useState(280);
  const [compactSearchOpen, setCompactSearchOpen] = useState(false);
  const [popupTarget, setPopupTarget] = useState<{
    chapter: RuleChapter;
    section: RuleSection;
    query?: string;
  } | null>(null);

  const [headerHeight, setHeaderHeight] = useState(58);

  const fixedHeaderRef = useRef<HTMLElement | null>(null);
  const headerBarRef = useRef<HTMLDivElement | null>(null);
  const leftMeasureRef = useRef<HTMLDivElement | null>(null);
  const rightControlsRef = useRef<HTMLDivElement | null>(null);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const compactPopoverRef = useRef<HTMLDivElement | null>(null);
  const compactToggleBtnRef = useRef<HTMLButtonElement | null>(null);
  const compactInputRef = useRef<HTMLInputElement | null>(null);

  const rulesResults = useMemo(() => {
    if (!rulesQuery.trim()) return [];
    return searchRules(rulesQuery, compendiumEntries).slice(0, 8);
  }, [rulesQuery, compendiumEntries]);

  // Drag-to-skill Dice Roller pointer state (works identically on desktop mouse and mobile touch)
  const [dragState, setDragState] = useState<{
    active: boolean;
    x: number;
    y: number;
    hovered: DragSkillTarget | null;
  } | null>(null);
  const dragStartRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    dragging: boolean;
    hovered: DragSkillTarget | null;
  } | null>(null);

  const findSkillTargetAtPoint = useCallback((clientX: number, clientY: number): DragSkillTarget | null => {
    if (typeof document === 'undefined') return null;
    const els = document.elementsFromPoint(clientX, clientY);
    for (const el of els) {
      const targetEl = (el as HTMLElement).closest?.('[data-roll-skill="true"]') as HTMLElement | null;
      if (targetEl) {
        const name = targetEl.getAttribute('data-roll-skill-name');
        const kind = targetEl.getAttribute('data-roll-skill-kind');
        if (name && (kind === 'core' || kind === 'special')) {
          return { name, kind };
        }
      }
    }
    return null;
  }, []);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const start = dragStartRef.current;
      if (!start || e.pointerId !== start.pointerId) return;
      const dx = e.clientX - start.startX;
      const dy = e.clientY - start.startY;
      if (!start.dragging && Math.hypot(dx, dy) > 8) {
        start.dragging = true;
      }
      if (start.dragging) {
        const hovered = findSkillTargetAtPoint(e.clientX, e.clientY);
        start.hovered = hovered;
        onDragHoverSkill?.(hovered);
        setDragState({ active: true, x: e.clientX, y: e.clientY, hovered });
      }
    };

    const handlePointerEnd = (e: PointerEvent) => {
      const start = dragStartRef.current;
      if (!start || e.pointerId !== start.pointerId) return;
      dragStartRef.current = null;

      if (start.dragging) {
        const dropTarget = start.hovered || findSkillTargetAtPoint(e.clientX, e.clientY);
        onDragHoverSkill?.(null);
        setDragState(null);
        if (dropTarget) {
          onDropSkillRoll?.(dropTarget);
        }
      } else {
        onDragHoverSkill?.(null);
        setDragState(null);
        onOpenDiceRoller?.();
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerEnd);
    window.addEventListener('pointercancel', handlePointerEnd);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
    };
  }, [findSkillTargetAtPoint, onDragHoverSkill, onDropSkillRoll, onOpenDiceRoller]);

  const measureHeaderFit = useCallback(() => {
    const bar = headerBarRef.current;
    const leftEl = leftMeasureRef.current;
    const rightEl = rightControlsRef.current;
    if (!bar || !leftEl || !rightEl) return;

    const barRect = bar.getBoundingClientRect();
    const centerX = barRect.left + barRect.width / 2;
    const leftEdge = leftEl.getBoundingClientRect().right;
    let rightEdge = rightEl.getBoundingClientRect().left;

    // Account for the compact search icon button's own width so expanding back happens cleanly without jitter
    if (compactToggleBtnRef.current) {
      rightEdge += compactToggleBtnRef.current.getBoundingClientRect().width + 12;
    }

    const halfClearance = Math.min(centerX - leftEdge, rightEdge - centerX) - 14;
    const availableCenterWidth = Math.floor(halfClearance * 2);

    if (availableCenterWidth < 210) {
      setIsSearchCompact(true);
    } else {
      setIsSearchCompact(false);
      setCompactSearchOpen(false);
      setCenteredWidthPx(Math.min(340, Math.max(210, availableCenterWidth)));
    }
  }, []);

  useLayoutEffect(() => {
    measureHeaderFit();
    const headerEl = fixedHeaderRef.current;
    const bar = headerBarRef.current;
    const leftEl = leftMeasureRef.current;
    const rightEl = rightControlsRef.current;
    if (!bar) return;

    const updateHeight = () => {
      if (fixedHeaderRef.current) {
        setHeaderHeight(Math.ceil(fixedHeaderRef.current.getBoundingClientRect().height));
      }
    };
    updateHeight();

    const observer = new ResizeObserver(() => {
      measureHeaderFit();
      updateHeight();
    });
    if (headerEl) observer.observe(headerEl);
    observer.observe(bar);
    if (leftEl) observer.observe(leftEl);
    if (rightEl) observer.observe(rightEl);
    window.addEventListener('resize', measureHeaderFit);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measureHeaderFit);
    };
  }, [measureHeaderFit, char.name, classPathDisplay, convictionList.length, showPulse, readOnly, onOpenSettings]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(target)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  useEffect(() => {
    if (!compactSearchOpen) return;
    const raf = requestAnimationFrame(() => compactInputRef.current?.focus());
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        compactPopoverRef.current?.contains(target) ||
        compactToggleBtnRef.current?.contains(target)
      ) {
        return;
      }
      setCompactSearchOpen(false);
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCompactSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [compactSearchOpen]);

  const openRulesResult = (chapter: RuleChapter, section: RuleSection, query?: string) => {
    setPopupTarget({ chapter, section, query });
    setDropdownOpen(false);
    setCompactSearchOpen(false);
  };

  const renderRulesResultsList = () => {
    if (rulesResults.length === 0) {
      return (
        <div className="p-3 text-center text-xs" style={{ color: 'var(--rev-text-muted)' }}>
          No matching rules found for “{rulesQuery.trim()}”.
        </div>
      );
    }
    return (
      <>
        <div
          className="px-2 py-1 text-[10px] uppercase tracking-wider font-bold flex items-center justify-between"
          style={{ color: 'var(--rev-text-faint)' }}
        >
          <span>Quick Rules Lookup</span>
          <span>Click to open</span>
        </div>
        {rulesResults.map((res) => (
          <button
            key={`${res.chapter.id}::${res.section.id}`}
            type="button"
            onClick={() => openRulesResult(res.chapter, res.section, rulesQuery.trim())}
            className="w-full text-left p-2.5 border transition-colors hover:border-[var(--rev-accent-border)]"
            style={{
              backgroundColor: 'var(--rev-surface-inset)',
              borderColor: 'var(--rev-border-subtle)',
              borderRadius: 'var(--rev-radius-card)',
            }}
          >
            <div
              className="text-[11px] tabular-nums truncate"
              style={{ color: 'var(--rev-text-muted)' }}
            >
              {res.chapter.number}. {res.chapter.title} ·{' '}
              {formatPageSpan(res.section.pages)}
            </div>
            <div
              className="text-sm font-semibold leading-snug"
              style={{ color: 'var(--rev-text-bright)' }}
            >
              <HighlightedText text={res.section.title} query={rulesQuery} />
            </div>
            <p
              className="text-xs leading-relaxed line-clamp-2 mt-0.5"
              style={{ color: 'var(--rev-text-secondary)' }}
            >
              <HighlightedText text={res.snippet} query={rulesQuery} />
            </p>
          </button>
        ))}
      </>
    );
  };

  return (
    <>
      <div className="w-full shrink-0" style={{ height: headerHeight > 0 ? headerHeight : 58 }} aria-hidden="true" />
      <header ref={fixedHeaderRef} className="fixed top-0 left-0 right-0 z-40 rev-header-bar shadow-md w-full transition-colors duration-300">
        <div
          ref={headerBarRef}
          className="relative w-full px-2.5 sm:px-4 py-2.5 flex justify-between items-center gap-1.5 sm:gap-3"
        >
          {/* Left Identity */}
          <div className="flex items-center min-w-0 flex-1">
            <div ref={leftMeasureRef} className="w-fit max-w-full flex items-center gap-1.5 sm:gap-3 min-w-0">
              <button
                onClick={onBack}
                className="hover:text-white transition-colors text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-1 sm:gap-2 shrink-0"
                style={{ color: 'var(--rev-header-muted)' }}
              >
                ← Back
              </button>
              <div className="w-px h-5 shrink-0" style={{ backgroundColor: 'var(--rev-header-border)' }}></div>
              
              <h1 className="text-base sm:text-xl font-spectral font-bold truncate min-w-0">
                {char.name || 'Unnamed Character'}
              </h1>

              {(classPathDisplay || convictionList.length > 0) && (
                <div className="hidden xl:flex items-center gap-2.5 text-xs italic min-w-0" style={{ color: 'var(--rev-header-muted)' }}>
                  <div className="w-px h-5 shrink-0" style={{ backgroundColor: 'var(--rev-header-border)' }}></div>
                  {classPathDisplay && (
                    <span className="shrink-0 whitespace-nowrap">{classPathDisplay}</span>
                  )}
                  {classPathDisplay && convictionList.length > 0 && (
                    <div className="w-px h-5 shrink-0" style={{ backgroundColor: 'var(--rev-header-border)' }}></div>
                  )}
                  {convictionList.length > 0 && (
                    <span className="truncate max-w-[200px]">{convictionList.join(' • ')}</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Center Quick Rules Search (only rendered inline when centered clear space fits without touching sides) */}
          {!isSearchCompact && (
            <div
              ref={searchContainerRef}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
              style={{ width: `${centeredWidthPx}px` }}
            >
              <div className="relative">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'var(--rev-header-muted)' }}
                >
                  <path
                    fillRule="evenodd"
                    d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                    clipRule="evenodd"
                  />
                </svg>
                <input
                  type="search"
                  value={rulesQuery}
                  onFocus={() => {
                    if (rulesQuery.trim()) setDropdownOpen(true);
                  }}
                  onChange={(e) => {
                    const next = e.target.value;
                    setRulesQuery(next);
                    setDropdownOpen(next.trim().length > 0);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setDropdownOpen(false);
                      (e.currentTarget as HTMLInputElement).blur();
                    } else if (e.key === 'Enter' && rulesResults.length > 0) {
                      e.preventDefault();
                      openRulesResult(
                        rulesResults[0].chapter,
                        rulesResults[0].section,
                        rulesQuery.trim()
                      );
                    }
                  }}
                  placeholder="Search rules..."
                  aria-label="Quick search rules"
                  className="w-full pl-8 pr-7 py-1.5 rounded text-xs sm:text-sm focus:outline-none transition-colors placeholder:text-current placeholder:opacity-65 appearance-none [&::-webkit-search-cancel-button]:hidden"
                  style={{
                    backgroundColor: 'var(--rev-header-btn)',
                    border: '1px solid var(--rev-header-border)',
                    color: 'var(--rev-header-text)',
                  }}
                />
                {rulesQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setRulesQuery('');
                      setDropdownOpen(false);
                    }}
                    aria-label="Clear rules search"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 px-1 py-0.5 rounded text-[11px] font-bold opacity-75 hover:opacity-100 hover:bg-white/10 transition-colors"
                    style={{ color: 'var(--rev-header-muted)' }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {dropdownOpen && rulesQuery.trim().length > 0 && (
                <div
                  className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-[min(92vw,420px)] max-h-[65vh] overflow-y-auto custom-scrollbar z-50 shadow-2xl border p-2 space-y-1"
                  style={{
                    backgroundColor: 'var(--rev-surface)',
                    borderColor: 'var(--rev-border-strong)',
                    borderRadius: 'var(--rev-radius-panel)',
                    color: 'var(--rev-text)',
                  }}
                >
                  {renderRulesResultsList()}
                </div>
              )}
            </div>
          )}
          
          {/* Right Vitals & Controls */}
          <div ref={rightControlsRef} className="flex items-center gap-1 sm:gap-3 lg:gap-4 shrink-0">
            
            {/* Heart Attack Indicator */}
            {showPulse && (
              <div className="hidden md:flex items-center animate-pulse">
                <span className="text-cyan-400 font-spectral font-bold text-lg tracking-[0.2em] drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">
                  ~ Heart Attack ~
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setVitalsOpen(true)}
              title="Open quick vitals editor"
              aria-label="Open quick vitals"
              className="md:hidden px-2 sm:px-3 py-1.5 rounded text-xs font-medium shadow-sm text-white shrink-0 transition-colors"
              style={{ backgroundColor: 'var(--rev-header-btn)', border: '1px solid var(--rev-header-border)' }}
            >
              Vitals
            </button>

            <button
              type="button"
              onClick={() => setVitalsOpen(true)}
              title="Open quick vitals editor"
              className="hidden md:flex gap-3 lg:gap-5 text-sm font-bold px-2.5 py-1.5 rounded border border-transparent hover:bg-white/10 focus:outline-none transition-colors tabular-nums"
            >
              <span title="Vigor">
                VG:{' '}
                <span className={char.data.trackers.vigor < 0 ? 'rev-keep-color text-red-400' : ''}>
                  {char.data.trackers.vigor}
                </span>
                /{vigorMax(char.data)}
              </span>
              <span title="Strain">
                SN:{' '}
                <span className={char.data.trackers.strain < 0 ? 'rev-keep-color text-red-400' : ''}>
                  {char.data.trackers.strain}
                </span>
                /{strainMax(char.data)}
              </span>
              <span title="Destiny">
                DP:{' '}
                <span className={char.data.trackers.dp < 0 ? 'rev-keep-color text-red-400' : ''}>
                  {char.data.trackers.dp}
                </span>
                /{dpMax(char.data)}
              </span>
            </button>
            {onOpenDiceRoller && (
              <button
                type="button"
                onPointerDown={(e) => {
                  if (e.button !== 0 && e.pointerType === 'mouse') return;
                  e.preventDefault();
                  dragStartRef.current = {
                    pointerId: e.pointerId,
                    startX: e.clientX,
                    startY: e.clientY,
                    dragging: false,
                    hovered: null,
                  };
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpenDiceRoller();
                  }
                }}
                title="Click to open Dice Roller, or drag onto any skill to roll it"
                aria-label="Dice Roller"
                className="touch-none select-none flex items-center gap-1.5 text-xs sm:text-sm font-bold px-2 sm:px-3 py-1.5 rounded border text-white hover:bg-white/10 active:scale-95 transition-all shrink-0 cursor-grab active:cursor-grabbing"
                style={{ backgroundColor: 'var(--rev-header-btn)', borderColor: 'var(--rev-header-border)' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 shrink-0">
                  <polygon points="12 2 21 7 21 17 12 22 3 17 3 7 12 2" />
                  <polyline points="3 7 12 12 21 7" />
                  <line x1="12" y1="22" x2="12" y2="12" />
                </svg>
                <span className="hidden sm:inline">Roll</span>
              </button>
            )}
            {readOnly ? (
              <span className="px-2.5 py-1.5 rounded text-xs font-bold uppercase tracking-wider bg-black/30 border border-white/20 text-white shrink-0">
                Read-Only
              </span>
            ) : (
              <button 
                onClick={onSave} 
                disabled={saving} 
                title={hasUnsavedChanges ? 'You have unsaved changes' : 'Save character'}
                className={`px-2.5 sm:px-3.5 py-1.5 rounded text-xs sm:text-sm font-medium shadow-sm transition-colors flex items-center gap-1.5 shrink-0 ${
                  saved
                    ? 'bg-green-600 text-white'
                    : hasUnsavedChanges
                    ? 'rev-btn-primary ring-1 ring-white/40'
                    : 'rev-btn-primary'
                }`}
              >
                {hasUnsavedChanges && !saving && !saved && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                )}
                <span>{saving ? 'Saving...' : saved ? 'Saved!' : 'Save'}</span>
              </button>
            )}
            {isSearchCompact && (
              <button
                ref={compactToggleBtnRef}
                type="button"
                onClick={() => setCompactSearchOpen(prev => !prev)}
                aria-label="Search rules"
                aria-expanded={compactSearchOpen}
                title="Search rules"
                className="p-1.5 rounded border text-white hover:bg-white/10 transition-colors shrink-0"
                style={{ backgroundColor: 'var(--rev-header-btn)', borderColor: 'var(--rev-header-border)' }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                aria-label="Settings"
                title="Settings"
                className="p-1.5 rounded border text-white hover:opacity-90 transition-colors shrink-0"
                style={{ backgroundColor: 'var(--rev-header-btn)', borderColor: 'var(--rev-header-border)' }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
            )}
          </div>

          {/* Anchored Floating Search Popover in Compact Mode */}
          {isSearchCompact && compactSearchOpen && (
            <div
              ref={compactPopoverRef}
              className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-[min(94vw,420px)] z-50 shadow-2xl border p-2.5 space-y-2"
              style={{
                backgroundColor: 'var(--rev-surface)',
                borderColor: 'var(--rev-border-strong)',
                borderRadius: 'var(--rev-radius-panel)',
                color: 'var(--rev-text)',
              }}
            >
              <div className="relative">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'var(--rev-text-muted)' }}
                >
                  <path
                    fillRule="evenodd"
                    d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                    clipRule="evenodd"
                  />
                </svg>
                <input
                  ref={compactInputRef}
                  type="search"
                  value={rulesQuery}
                  onChange={(e) => setRulesQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setCompactSearchOpen(false);
                    } else if (e.key === 'Enter' && rulesResults.length > 0) {
                      e.preventDefault();
                      openRulesResult(
                        rulesResults[0].chapter,
                        rulesResults[0].section,
                        rulesQuery.trim()
                      );
                    }
                  }}
                  placeholder="Search rules..."
                  aria-label="Quick search rules"
                  className="w-full rev-input pl-8 pr-7 py-2 text-sm focus:outline-none appearance-none [&::-webkit-search-cancel-button]:hidden"
                />
                {rulesQuery && (
                  <button
                    type="button"
                    onClick={() => setRulesQuery('')}
                    aria-label="Clear rules search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-1 py-0.5 rounded text-xs font-bold opacity-75 hover:opacity-100 hover:bg-white/10 transition-colors"
                    style={{ color: 'var(--rev-text-muted)' }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {rulesQuery.trim().length > 0 && (
                <div className="max-h-[55vh] overflow-y-auto custom-scrollbar space-y-1">
                  {renderRulesResultsList()}
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {popupTarget && (
        <RulesQuickPopup
          chapter={popupTarget.chapter}
          section={popupTarget.section}
          highlightQuery={popupTarget.query}
          onSelectLocation={(nextChapter, nextSection) =>
            setPopupTarget({ chapter: nextChapter, section: nextSection, query: undefined })
          }
          onOpenInRules={
            onOpenInRules
              ? (ch, sec) => {
                  setPopupTarget(null);
                  onOpenInRules(ch.id, sec.id);
                }
              : undefined
          }
          onClose={() => setPopupTarget(null)}
        />
      )}

      {vitalsOpen && createPortal(
        <div
          className="fixed inset-0 z-[200] rev-backdrop flex items-center justify-center p-4"
          onClick={() => setVitalsOpen(false)}
        >
          <div
            className="sheet-modal max-w-md max-h-[85vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-black/20 shrink-0">
              <h2 className="font-bold text-xl text-gray-200">Vitals</h2>
              <button onClick={() => setVitalsOpen(false)} className="rev-icon-btn rev-icon-btn-edit text-xl" aria-label="Close">×</button>
            </div>
            <div className="p-4 overflow-y-auto flex flex-col gap-3">
              <VitalsCard char={char} updateTracker={updateTracker} />
              <div className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Armour Points (AP)</span>
                  <span className="text-[11px] text-gray-500">
                    {maxAp > 0 && currentAp < maxAp
                      ? `${maxAp - currentAp} depleted (restores after combat)`
                      : maxAp > 0
                      ? 'Active damage reduction'
                      : 'No armour equipped'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {currentAp < maxAp && (
                    <button
                      type="button"
                      onClick={() => updateTracker('ap', maxAp - currentAp)}
                      className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded bg-cyan-950/60 hover:bg-cyan-900/70 border border-cyan-800 text-cyan-200"
                    >
                      Restore
                    </button>
                  )}
                  <div className="flex items-center bg-gray-900 border border-gray-700 rounded-lg shadow-sm h-8 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => updateTracker('ap', -1)}
                      disabled={currentAp <= 0}
                      className="w-8 h-full flex items-center justify-center text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-40 font-bold"
                    >
                      −
                    </button>
                    <span className={`px-2 text-sm font-bold tabular-nums ${currentAp < 0 ? 'rev-keep-color text-red-500' : currentAp < maxAp ? 'text-amber-400' : currentAp > maxAp ? 'text-cyan-300' : 'text-white'}`}>
                      {currentAp}{maxAp > 0 ? <span className="text-xs text-gray-500 font-normal">/{maxAp}</span> : null}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateTracker('ap', 1)}
                      className="w-8 h-full flex items-center justify-center text-gray-400 hover:bg-gray-800 hover:text-white font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {dragState?.active && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed z-[500] pointer-events-none -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 px-3 py-2 rounded-full border-2 shadow-2xl text-xs font-bold uppercase tracking-wider backdrop-blur-md transition-transform duration-75"
          style={{
            left: dragState.x,
            top: dragState.y,
            backgroundColor: dragState.hovered ? 'rgba(16, 185, 129, 0.92)' : 'rgba(15, 23, 42, 0.92)',
            borderColor: dragState.hovered ? '#6ee7b7' : 'rgba(255,255,255,0.45)',
            color: '#ffffff',
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 shrink-0">
            <polygon points="12 2 21 7 21 17 12 22 3 17 3 7 12 2" />
            <polyline points="3 7 12 12 21 7" />
            <line x1="12" y1="22" x2="12" y2="12" />
          </svg>
          <span>{dragState.hovered ? `Roll ${dragState.hovered.name}` : 'Drop on Skill'}</span>
        </div>,
        document.body
      )}
    </>
  );
}