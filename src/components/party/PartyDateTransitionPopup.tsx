import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  calendarTotalDays,
  dateFromTotalDays,
  formatReverieDate,
  formatReverieElapsed,
  type ReverieCalendarDate,
} from '../../reverieCalendar';

export type PartyDateTransition = {
  id: string;
  previousDate: ReverieCalendarDate;
  nextDate: ReverieCalendarDate;
  partyName?: string;
};

function buildDateFrames(prev: ReverieCalendarDate, next: ReverieCalendarDate): ReverieCalendarDate[] {
  const startDay = calendarTotalDays(prev);
  const endDay = calendarTotalDays(next);
  const diff = endDay - startDay;

  if (diff === 0) return [next];

  const absDiff = Math.abs(diff);
  const stepDir = diff > 0 ? 1 : -1;

  if (absDiff <= 18) {
    const frames: ReverieCalendarDate[] = [];
    for (let i = 0; i <= absDiff; i++) {
      frames.push(dateFromTotalDays(startDay + i * stepDir));
    }
    return frames;
  }

  // Smoothly sample intermediate dates when advancing weeks, months, or years
  const frameCount = 26;
  const frames: ReverieCalendarDate[] = [];
  for (let i = 0; i <= frameCount; i++) {
    const t = i / frameCount;
    const interpolated = Math.round(startDay + diff * t);
    const frameDate = dateFromTotalDays(interpolated);
    const prevFrame = frames[frames.length - 1];
    if (
      !prevFrame ||
      prevFrame.day !== frameDate.day ||
      prevFrame.monthIndex !== frameDate.monthIndex ||
      prevFrame.year !== frameDate.year
    ) {
      frames.push(frameDate);
    }
  }
  const last = frames[frames.length - 1];
  if (!last || last.day !== next.day || last.monthIndex !== next.monthIndex || last.year !== next.year) {
    frames.push(next);
  }
  return frames;
}

export default function PartyDateTransitionPopup({
  transition,
  onDismiss,
}: {
  transition: PartyDateTransition | null;
  onDismiss: () => void;
}) {
  const [rendered, setRendered] = useState<PartyDateTransition | null>(transition);
  const [visible, setVisible] = useState(false);
  const [frameIndex, setFrameIndex] = useState(0);
  const [animFinished, setAnimFinished] = useState(false);
  const closingRef = useRef(false);
  const timersRef = useRef<number[]>([]);
  const animRafRef = useRef<number | null>(null);

  const frames = useMemo(() => {
    if (!rendered) return [];
    return buildDateFrames(rendered.previousDate, rendered.nextDate);
  }, [rendered]);

  const clearAllTimers = useCallback(() => {
    for (const t of timersRef.current) {
      window.clearTimeout(t);
    }
    timersRef.current = [];
    if (animRafRef.current !== null) {
      cancelAnimationFrame(animRafRef.current);
      animRafRef.current = null;
    }
  }, []);

  const handleClose = useCallback(() => {
    if (!rendered || closingRef.current) return;
    closingRef.current = true;
    clearAllTimers();
    setVisible(false);
    const t = window.setTimeout(() => {
      onDismiss();
    }, 300);
    timersRef.current.push(t);
  }, [rendered, clearAllTimers, onDismiss]);

  useEffect(() => {
    clearAllTimers();
    if (transition) {
      closingRef.current = false;
      setVisible(false);
      setFrameIndex(0);
      setAnimFinished(false);
      setRendered(transition);

      let raf1 = 0;
      let raf2 = 0;
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          setVisible(true);
        });
      });

      const computedFrames = buildDateFrames(transition.previousDate, transition.nextDate);
      const maxIndex = Math.max(0, computedFrames.length - 1);

      const startTimer = window.setTimeout(() => {
        if (maxIndex === 0) {
          setAnimFinished(true);
          return;
        }

        const duration = Math.min(1350, Math.max(650, maxIndex * 75));
        const startTime = performance.now();

        const tick = (now: number) => {
          const rawT = Math.min(1, (now - startTime) / duration);
          const eased = 1 - Math.pow(1 - rawT, 2);
          const nextIdx = Math.min(maxIndex, Math.round(eased * maxIndex));
          setFrameIndex(nextIdx);
          if (rawT < 1) {
            animRafRef.current = requestAnimationFrame(tick);
          } else {
            animRafRef.current = null;
            setFrameIndex(maxIndex);
            setAnimFinished(true);
          }
        };

        animRafRef.current = requestAnimationFrame(tick);
      }, 220);

      timersRef.current.push(startTimer);

      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
        clearAllTimers();
      };
    } else {
      closingRef.current = false;
      setVisible(false);
      setRendered(null);
      setFrameIndex(0);
      setAnimFinished(false);
    }
  }, [transition, clearAllTimers]);

  useEffect(() => {
    if (!rendered) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [rendered, handleClose]);

  if (!rendered) return null;

  const currentFrameDate = frames[Math.min(frameIndex, Math.max(0, frames.length - 1))] || rendered.nextDate;
  const currentLabel = formatReverieDate(currentFrameDate);
  const prevLabel = formatReverieDate(rendered.previousDate);
  const nextLabel = formatReverieDate(rendered.nextDate);
  const elapsedLabel = formatReverieElapsed(rendered.previousDate, rendered.nextDate);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="party-date-transition-title"
      onClick={handleClose}
      className={`fixed inset-0 z-[285] flex items-center justify-center p-4 backdrop-blur-md cursor-pointer animate-in fade-in duration-200 transition-opacity duration-300 ease-out ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ backgroundColor: 'var(--rev-modal-backdrop)' }}
    >
      <div
        onClick={handleClose}
        className={`sheet-modal w-full max-w-lg max-h-[88vh] max-h-[88dvh] overflow-y-auto no-scrollbar shadow-2xl animate-in fade-in zoom-in-95 duration-200 transition-all duration-300 ease-out ${
          visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
        }`}
      >
        <div className="px-5 py-3.5 border-b rev-divider rev-inset-soft flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {rendered.partyName && (
              <>
                <span
                  className="text-xs font-bold uppercase tracking-wider truncate"
                  style={{ color: 'var(--rev-accent-text)' }}
                >
                  {rendered.partyName}
                </span>
                <span style={{ color: 'var(--rev-text-faint)' }}>·</span>
              </>
            )}
            <span
              id="party-date-transition-title"
              className="text-xs font-bold uppercase tracking-wider truncate"
              style={{ color: 'var(--rev-text-muted)' }}
            >
              In-Game Date Updated
            </span>
          </div>
          <span
            className="text-[11px] font-bold uppercase tracking-wider shrink-0"
            style={{ color: 'var(--rev-badge-warn)' }}
          >
            {elapsedLabel}
          </span>
        </div>

        <div className="p-6 sm:p-8 flex flex-col items-center justify-center text-center gap-4">
          <div className="w-full min-h-[3.5rem] flex items-center justify-center px-2">
            <span
              className="font-cinzel font-bold text-2xl sm:text-3xl tabular-nums transition-colors duration-200"
              style={{ color: animFinished ? 'var(--rev-text-bright)' : 'var(--rev-accent-text)' }}
            >
              {currentLabel}
            </span>
          </div>

          <div
            className="text-xs tabular-nums flex flex-wrap items-center justify-center gap-2"
            style={{ color: 'var(--rev-text-faint)' }}
          >
            <span className={animFinished ? 'line-through' : ''}>{prevLabel}</span>
            <span style={{ color: 'var(--rev-accent-text)' }}>→</span>
            <span
              className="font-bold"
              style={{ color: animFinished ? 'var(--rev-text-secondary)' : 'var(--rev-text-muted)' }}
            >
              {nextLabel}
            </span>
          </div>

          <p
            className="text-[11px] tracking-wide pt-2 transition-opacity duration-300"
            style={{
              color: 'var(--rev-text-faint)',
              opacity: animFinished ? 0.85 : 0.45,
            }}
          >
            Click to continue
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
