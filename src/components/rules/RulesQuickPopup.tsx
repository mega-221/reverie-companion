import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  RULES_CHAPTERS,
  formatPageSpan,
} from '../../data/rulesIndex';
import type { RuleChapter, RuleSection } from '../../data/rulesTypes';
import { RulesMarkdownRenderer } from './RulesMarkdownRenderer';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

interface RulesQuickPopupProps {
  chapter: RuleChapter;
  section: RuleSection;
  highlightQuery?: string;
  onSelectLocation: (chapter: RuleChapter, section: RuleSection) => void;
  onOpenInRules?: (chapter: RuleChapter, section: RuleSection) => void;
  onClose: () => void;
}

export const RulesQuickPopup: React.FC<RulesQuickPopupProps> = ({
  chapter,
  section,
  highlightQuery,
  onSelectLocation,
  onOpenInRules,
  onClose,
}) => {
  useBodyScrollLock(true);
  const orderedSections = useMemo(() => {
    const flat: { chapter: RuleChapter; section: RuleSection }[] = [];
    for (const ch of RULES_CHAPTERS) {
      for (const sec of ch.sections) {
        flat.push({ chapter: ch, section: sec });
      }
    }
    return flat;
  }, []);

  const currentIdx = orderedSections.findIndex(
    (entry) => entry.chapter.id === chapter.id && entry.section.id === section.id
  );
  const prevEntry = currentIdx > 0 ? orderedSections[currentIdx - 1] : null;
  const nextEntry =
    currentIdx >= 0 && currentIdx < orderedSections.length - 1
      ? orderedSections[currentIdx + 1]
      : null;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[250] rev-backdrop flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Rules Reference: ${section.title}`}
      onClick={onClose}
    >
      <div
        className="sheet-modal max-w-3xl max-h-[88vh] flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between gap-3 px-5 py-4 border-b rev-divider shrink-0"
          style={{ backgroundColor: 'var(--rev-surface-inset)' }}
        >
          <div className="min-w-0 space-y-0.5">
            <div
              className="text-[11px] uppercase tracking-[0.16em] font-semibold tabular-nums truncate"
              style={{ color: 'var(--rev-accent-text)' }}
            >
              Chapter {chapter.number}. {chapter.title} · {formatPageSpan(section.pages)}
            </div>
            <h2
              className="font-spectral text-lg sm:text-xl font-bold truncate"
              style={{ color: 'var(--rev-text-bright)' }}
            >
              {section.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close rules popup"
            title="Close (Esc)"
            className="px-2.5 py-1 text-xl font-bold leading-none rounded transition-colors hover:bg-white/10 shrink-0"
            style={{ color: 'var(--rev-text-muted)' }}
          >
            ×
          </button>
        </div>

        {/* Scrollable Article Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-7">
          <RulesMarkdownRenderer
            markdown={section.content}
            sectionId={section.id}
            highlightQuery={highlightQuery}
          />
        </div>

        {/* Footer Quick Article Navigation */}
        <div
          className="px-4 sm:px-5 py-3 border-t rev-divider flex items-center justify-between gap-2 shrink-0 text-xs"
          style={{ backgroundColor: 'var(--rev-surface-inset)' }}
        >
          <div className="min-w-0 flex-1">
            {prevEntry ? (
              <button
                type="button"
                onClick={() => onSelectLocation(prevEntry.chapter, prevEntry.section)}
                className="rev-btn-secondary px-2.5 py-1.5 font-semibold truncate max-w-full inline-flex items-center gap-1"
              >
                <span>←</span>
                <span className="truncate">{prevEntry.section.title}</span>
              </button>
            ) : null}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="rev-btn-secondary px-3 py-1.5 font-bold shrink-0 whitespace-nowrap"
            >
              Back to Sheet
            </button>
            {onOpenInRules && (
              <button
                type="button"
                onClick={() => onOpenInRules(chapter, section)}
                className="rev-btn-primary px-3 py-1.5 font-bold shrink-0 whitespace-nowrap"
              >
                Open in Rules →
              </button>
            )}
          </div>

          <div className="min-w-0 flex-1 flex justify-end">
            {nextEntry ? (
              <button
                type="button"
                onClick={() => onSelectLocation(nextEntry.chapter, nextEntry.section)}
                className="rev-btn-secondary px-2.5 py-1.5 font-semibold truncate max-w-full inline-flex items-center gap-1"
              >
                <span className="truncate">{nextEntry.section.title}</span>
                <span>→</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
