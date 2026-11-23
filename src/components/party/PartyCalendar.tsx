import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabase';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import {
  DEFAULT_CALENDAR_DATE,
  REVERIE_MONTHS,
  advanceReverieDate,
  formatReverieDate,
  normalizeCalendarDate,
  type ReverieCalendarDate,
} from '../../reverieCalendar';

export default function PartyCalendar({
  partyId,
  calendarDate,
  isLeader,
  onDateChange,
  onBroadcastCalendar,
  onError,
}: {
  partyId: string;
  calendarDate?: ReverieCalendarDate | null;
  isLeader: boolean;
  onDateChange: (nextDate: ReverieCalendarDate, prevDate: ReverieCalendarDate) => void;
  onBroadcastCalendar: (nextDate: ReverieCalendarDate, prevDate: ReverieCalendarDate) => void;
  onError?: (msg: string) => void;
}) {
  const current = normalizeCalendarDate(calendarDate || DEFAULT_CALENDAR_DATE);
  const [saving, setSaving] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [draft, setDraft] = useState<ReverieCalendarDate>(current);

  useBodyScrollLock(isPopupOpen);

  useEffect(() => {
    if (!isPopupOpen) {
      setDraft(normalizeCalendarDate(calendarDate || DEFAULT_CALENDAR_DATE));
    }
  }, [calendarDate, isPopupOpen]);

  useEscapeKey(isPopupOpen && !saving, () => setIsPopupOpen(false));

  async function commitDate(nextRaw: ReverieCalendarDate) {
    if (!isLeader || saving) return;
    const nextDate = normalizeCalendarDate(nextRaw);
    const prevDate = current;
    if (
      nextDate.day === prevDate.day &&
      nextDate.monthIndex === prevDate.monthIndex &&
      nextDate.year === prevDate.year
    ) {
      return;
    }

    setDraft(nextDate);
    onDateChange(nextDate, prevDate);
    onBroadcastCalendar(nextDate, prevDate);
    setSaving(true);

    const { error } = await supabase
      .from('parties')
      .update({ calendar_date: nextDate })
      .eq('id', partyId);

    setSaving(false);

    if (error) {
      setDraft(prevDate);
      onDateChange(prevDate, prevDate);
      onError?.(error.message);
    }
  }

  function handleStep(unit: 'day' | 'week' | 'month' | 'year', delta: number) {
    const nextDate = advanceReverieDate(current, unit, delta);
    commitDate(nextDate);
  }

  const shiftDraftMonth = (delta: number) => {
    setDraft(prev => advanceReverieDate(prev, 'month', delta));
  };

  const handleYearInput = (raw: string) => {
    if (raw === '' || raw === '-') {
      setDraft(prev => ({ ...prev, year: 0 }));
      return;
    }
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed)) {
      setDraft(prev => ({ ...prev, year: parsed }));
    }
  };

  const stepBtnClass =
    'px-2 py-1 text-xs font-bold rev-btn-secondary disabled:opacity-40';

  const calendarIcon = (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      style={{ color: 'var(--rev-accent-text)' }}
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );

  return (
    <>
      <div className="inline-flex flex-wrap items-center gap-2 mt-1.5">
        {calendarIcon}
        <span
          className="font-bold text-sm sm:text-base tabular-nums whitespace-normal"
          style={{ color: 'var(--rev-text)' }}
        >
          {formatReverieDate(current)}
        </span>
        {isLeader && (
          <button
            type="button"
            onClick={() => {
              setDraft(current);
              setIsPopupOpen(true);
            }}
            className="text-[11px] font-bold uppercase tracking-wider transition-colors px-1.5 py-0.5 rounded hover:bg-white/5"
            style={{ color: 'var(--rev-text-muted)' }}
            title="Adjust in-game date"
          >
            Adjust
          </button>
        )}
      </div>

      {isPopupOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[260] rev-modal-backdrop backdrop-blur-[2px] flex items-center justify-center p-4"
            onClick={() => !saving && setIsPopupOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="sheet-modal max-w-sm max-h-[88vh] max-h-[88dvh] overflow-y-auto no-scrollbar p-4 animate-in fade-in zoom-in-95 duration-150 gap-4"
            >
              <div className="flex items-center justify-between border-b rev-divider pb-2.5">
                <div className="flex flex-col">
                  <span
                    className="text-[11px] font-bold uppercase tracking-widest"
                    style={{ color: 'var(--rev-text-muted)' }}
                  >
                    In-Game Calendar
                  </span>
                  <span
                    className="font-bold text-base tabular-nums mt-0.5"
                    style={{ color: 'var(--rev-text-bright)' }}
                  >
                    {formatReverieDate(current)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPopupOpen(false)}
                  className="font-bold text-xl leading-none px-1.5 py-0.5 rounded hover:bg-white/10 hover:text-white transition-colors self-start"
                  style={{ color: 'var(--rev-text-muted)' }}
                  aria-label="Close calendar"
                >
                  ×
                </button>
              </div>

              {/* Quick Step Controls */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rev-inset flex items-center justify-between p-1.5">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleStep('day', -1)}
                    className={stepBtnClass}
                    title="Previous Day"
                  >
                    −1d
                  </button>
                  <span className="text-[11px] font-bold uppercase select-none" style={{ color: 'var(--rev-text-muted)' }}>
                    Day
                  </span>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleStep('day', 1)}
                    className={stepBtnClass}
                    title="Next Day"
                  >
                    +1d
                  </button>
                </div>

                <div className="rev-inset flex items-center justify-between p-1.5">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleStep('week', -1)}
                    className={stepBtnClass}
                    title="Previous Week (7 days)"
                  >
                    −1w
                  </button>
                  <span className="text-[11px] font-bold uppercase select-none" style={{ color: 'var(--rev-text-muted)' }}>
                    Week
                  </span>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleStep('week', 1)}
                    className={stepBtnClass}
                    title="Next Week (7 days)"
                  >
                    +1w
                  </button>
                </div>

                <div className="rev-inset flex items-center justify-between p-1.5">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleStep('month', -1)}
                    className={stepBtnClass}
                    title="Previous Month"
                  >
                    −1m
                  </button>
                  <span className="text-[11px] font-bold uppercase select-none" style={{ color: 'var(--rev-text-muted)' }}>
                    Month
                  </span>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleStep('month', 1)}
                    className={stepBtnClass}
                    title="Next Month"
                  >
                    +1m
                  </button>
                </div>

                <div className="rev-inset flex items-center justify-between p-1.5">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleStep('year', -1)}
                    className={stepBtnClass}
                    title="Previous Year"
                  >
                    −1y
                  </button>
                  <span className="text-[11px] font-bold uppercase select-none" style={{ color: 'var(--rev-text-muted)' }}>
                    Year
                  </span>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleStep('year', 1)}
                    className={stepBtnClass}
                    title="Next Year"
                  >
                    +1y
                  </button>
                </div>
              </div>

              {/* Direct Date Picker */}
              <div className="pt-2 border-t rev-divider">
                <div className="flex items-center gap-1.5 mb-3">
                  <button
                    type="button"
                    onClick={() => shiftDraftMonth(-1)}
                    className="px-2 py-1.5 rev-btn-secondary text-xs font-bold shrink-0"
                    title="Previous month"
                  >
                    ‹
                  </button>

                  <select
                    value={draft.monthIndex}
                    onChange={e => setDraft(prev => ({ ...prev, monthIndex: Number(e.target.value) }))}
                    className="flex-1 min-w-0 rev-input px-2 py-1.5 text-xs font-bold"
                    aria-label="Month"
                  >
                    {REVERIE_MONTHS.map((m, idx) => (
                      <option key={m} value={idx}>
                        {m}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center rev-input shrink-0">
                    <input
                      type="number"
                      value={draft.year}
                      onChange={e => handleYearInput(e.target.value)}
                      className="w-14 bg-transparent px-1.5 py-1.5 text-xs font-bold text-right focus:outline-none tabular-nums"
                      style={{ color: 'var(--rev-text)' }}
                      aria-label="Year"
                    />
                    <span className="pr-2 pl-0.5 text-[11px] font-bold select-none" style={{ color: 'var(--rev-accent-text)' }}>
                      . AS
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => shiftDraftMonth(1)}
                    className="px-2 py-1.5 rev-btn-secondary text-xs font-bold shrink-0"
                    title="Next month"
                  >
                    ›
                  </button>
                </div>

                <div className="grid grid-cols-6 gap-1">
                  {Array.from({ length: 30 }, (_, idx) => {
                    const day = idx + 1;
                    const isSelected = draft.day === day;
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setDraft(prev => ({ ...prev, day }))}
                        className={`py-1.5 text-xs font-bold tabular-nums transition-colors ${
                          isSelected ? 'rev-btn-primary shadow-sm' : 'rev-inset hover:bg-white/5'
                        }`}
                        style={!isSelected ? { color: 'var(--rev-text-secondary)' } : undefined}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between mt-3 pt-2.5 border-t rev-divider text-[11px] gap-2">
                  <span className="tabular-nums" style={{ color: 'var(--rev-text-muted)' }}>
                    {formatReverieDate(draft)}
                  </span>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      commitDate(draft);
                      setIsPopupOpen(false);
                    }}
                    className="px-3 py-1.5 rev-btn-primary font-bold shrink-0"
                  >
                    Set Date
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
