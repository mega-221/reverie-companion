import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
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

  const frameCount = 28;
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

  useBodyScrollLock(Boolean(rendered));

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
    }, 380);
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

        const duration = Math.min(1550, Math.max(780, maxIndex * 85));
        const startTime = performance.now();

        const tick = (now: number) => {
          const rawT = Math.min(1, (now - startTime) / duration);
          // Smooth cubic ease-out
          const eased = 1 - Math.pow(1 - rawT, 3);
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
      }, 260);

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
      className={`fixed inset-0 z-[285] flex items-center justify-center p-6 cursor-pointer transition-all duration-500 ease-out ${
        visible ? 'opacity-100 rev-roll-blur bg-black/35' : 'opacity-0 backdrop-blur-none bg-black/0'
      }`}
    >
      <div
        className={`w-full max-w-2xl flex flex-col items-center justify-center text-center gap-5 select-none transition-all duration-500 ease-out ${
          visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-3 scale-[0.98]'
        }`}
      >
        {/* Subtle Eyebrow Header (no UI box) */}
        <div
          id="party-date-transition-title"
          className="flex flex-wrap items-center justify-center gap-2.5 text-xs uppercase tracking-[0.28em] font-bold drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]"
          style={{ color: 'rgba(229, 231, 235, 0.82)' }}
        >
          {rendered.partyName && <span>{rendered.partyName}</span>}
          {rendered.partyName && <span className="opacity-50">·</span>}
          <span className="text-amber-300/90">{elapsedLabel}</span>
        </div>

        {/* Main Floating Date Display */}
        <div className="w-full py-2 flex items-center justify-center">
          <span
            className="font-spectral text-3xl sm:text-5xl tracking-[0.06em] tabular-nums transition-all duration-500 drop-shadow-[0_4px_20px_rgba(0,0,0,0.95)]"
            style={{
              color: animFinished ? '#ffffff' : '#fcd34d',
              transform: animFinished ? 'scale(1)' : 'scale(0.99)',
            }}
          >
            {currentLabel}
          </span>
        </div>

        {/* Minimal Divider */}
        <div
          className="h-px transition-all duration-700 ease-out"
          style={{
            width: animFinished ? '12rem' : '6rem',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)',
          }}
        />

        {/* Previous -> Next Reference */}
        <div
          className={`text-xs sm:text-sm tabular-nums flex flex-wrap items-center justify-center gap-2.5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] transition-all duration-500 ${
            visible ? 'opacity-90 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
          style={{ color: 'rgba(209, 213, 219, 0.78)' }}
        >
          <span className={animFinished ? 'line-through opacity-65' : ''}>{prevLabel}</span>
          <span className="text-amber-300/80">→</span>
          <span className="font-bold text-white">{nextLabel}</span>
        </div>

        {/* Continue Cue */}
        <p
          className={`text-[11px] uppercase tracking-[0.25em] pt-4 transition-all duration-700 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] ${
            animFinished && visible ? 'opacity-80 translate-y-0' : 'opacity-0 translate-y-1'
          }`}
          style={{ color: 'rgba(229, 231, 235, 0.75)' }}
        >
          Click anywhere to continue
        </p>
      </div>
    </div>,
    document.body
  );
}
