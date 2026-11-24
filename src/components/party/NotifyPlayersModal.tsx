import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { PartyMember, PartyNotificationPayload } from '../../types';
import { CORE_SKILLS, SPECIAL_SKILLS } from '../sheet/utils';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { useEscapeKey } from '../../hooks/useEscapeKey';

const QUICK_PRESETS = [
  {
    label: 'Roll Initiative',
    title: 'Roll Initiative',
    message: 'Combat is beginning. Please roll Initiative.',
  },
  {
    label: 'Search the Area',
    title: 'Perception Check',
    skill: 'Perception',
    challengeLevel: 12,
    message: 'Roll Perception for Challenge Level 12 to inspect your surroundings.',
  },
  {
    label: 'Stealth Check',
    title: 'Stealth Check',
    skill: 'Stealth',
    challengeLevel: 12,
    message: 'Roll Stealth for Challenge Level 12 to remain undetected.',
  },
  {
    label: 'Resist Effect',
    title: 'Willpower Check',
    skill: 'Willpower',
    challengeLevel: 14,
    message: 'Roll Willpower for Challenge Level 14 to resist the effect.',
  },
  {
    label: 'Take a Rest',
    title: 'Short Rest',
    message: 'Update your vitals and recover resources for a rest.',
  },
];

export default function NotifyPlayersModal({
  isOpen,
  onClose,
  partyId,
  partyName,
  senderName,
  leaderUserId,
  members,
  memberUsernames,
  onSendNotification,
}: {
  isOpen: boolean;
  onClose: () => void;
  partyId: string;
  partyName: string;
  senderName: string;
  leaderUserId: string;
  members: PartyMember[];
  memberUsernames: Map<string, string>;
  onSendNotification: (payload: PartyNotificationPayload) => Promise<void> | void;
}) {
  useBodyScrollLock(Boolean(isOpen));
  const acceptedMembers = members.filter(
    m => m.status === 'accepted' && m.user_id && m.user_id !== '00000000-0000-0000-0000-000000000000'
  );
  const defaultTargets = acceptedMembers
    .filter(m => m.user_id !== leaderUserId)
    .map(m => m.user_id);

  const [mode, setMode] = useState<'prompt' | 'give' | 'crisis'>('prompt');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(defaultTargets));
  const [selectedSkill, setSelectedSkill] = useState<string>('Perception');
  const [challengeLevel, setChallengeLevel] = useState<number>(12);
  const [grantResource, setGrantResource] = useState<'xp' | 'dp'>('xp');
  const [grantAmount, setGrantAmount] = useState<number>(5);
  const [title, setTitle] = useState('Perception Check');
  const [message, setMessage] = useState('Roll Perception for Challenge Level 12.');
  const [activeSkillMeta, setActiveSkillMeta] = useState<{ skill?: string; challengeLevel?: number }>({
    skill: 'Perception',
    challengeLevel: 12,
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const targets = acceptedMembers
      .filter(m => m.user_id !== leaderUserId)
      .map(m => m.user_id);
    setSelectedIds(new Set(targets.length > 0 ? targets : acceptedMembers.map(m => m.user_id)));
    setError(null);
  }, [isOpen]);

  useEscapeKey(isOpen && !sending, onClose);

  const applyGiveDefaults = (res: 'xp' | 'dp', amt: number) => {
    const safeAmt = Math.max(1, Math.min(999, Math.trunc(amt) || 1));
    if (res === 'xp') {
      setTitle(`Grant ${safeAmt} XP`);
      setMessage(`${senderName || 'Party Leader'} is offering +${safeAmt} XP.`);
    } else {
      setTitle(`Grant ${safeAmt} Destiny ${safeAmt === 1 ? 'Point' : 'Points'}`);
      setMessage(`${senderName || 'Party Leader'} is offering +${safeAmt} Destiny ${safeAmt === 1 ? 'Point' : 'Points'}.`);
    }
  };

  const switchMode = (nextMode: 'prompt' | 'give' | 'crisis') => {
    setMode(nextMode);
    setError(null);
    if (nextMode === 'give') {
      const amt = grantResource === 'dp' ? 1 : 5;
      setGrantAmount(amt);
      applyGiveDefaults(grantResource, amt);
      setActiveSkillMeta({});
    } else if (nextMode === 'crisis') {
      setTitle('Resolve Crisis');
      setMessage('A mental breaking point has been reached. Resolve a Crisis on your character.');
      setActiveSkillMeta({});
    } else {
      setTitle(`${selectedSkill} Check`);
      setMessage(`Roll ${selectedSkill} for Challenge Level ${challengeLevel}.`);
      setActiveSkillMeta({ skill: selectedSkill, challengeLevel });
    }
  };

  const applySkillRollPreset = (skill = selectedSkill, level = challengeLevel) => {
    const safeLevel = Math.max(1, Math.min(20, Number.isFinite(level) ? level : 1));
    setTitle(`${skill} Check`);
    setMessage(`Roll ${skill} for Challenge Level ${safeLevel}.`);
    setActiveSkillMeta({ skill, challengeLevel: safeLevel });
  };

  const applyQuickPreset = (preset: (typeof QUICK_PRESETS)[number]) => {
    setTitle(preset.title);
    setMessage(preset.message);
    if (preset.skill) {
      setSelectedSkill(preset.skill);
      setChallengeLevel(preset.challengeLevel ?? 12);
      setActiveSkillMeta({ skill: preset.skill, challengeLevel: preset.challengeLevel });
    } else {
      setActiveSkillMeta({});
    }
  };

  const toggleMember = (uid: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedIds.size === 0) {
      setError('Select at least one player to notify.');
      return;
    }
    if (!message.trim()) {
      setError('Enter a notification message.');
      return;
    }
    if (mode === 'give' && (!Number.isFinite(grantAmount) || grantAmount < 1)) {
      setError('Enter an amount of at least 1.');
      return;
    }

    setSending(true);
    setError(null);

    const safeAmt = Math.max(1, Math.trunc(grantAmount));
    const payload: PartyNotificationPayload = {
      id: crypto.randomUUID(),
      partyId,
      partyName,
      senderName: senderName || 'Party Leader',
      targetUserIds: Array.from(selectedIds),
      type: mode,
      title:
        title.trim() ||
        (mode === 'give' ? 'Reward Offered' : mode === 'crisis' ? 'Resolve Crisis' : 'Party Prompt'),
      message: message.trim(),
      ...(mode === 'prompt' && activeSkillMeta.skill ? { skill: activeSkillMeta.skill } : {}),
      ...(mode === 'prompt' && typeof activeSkillMeta.challengeLevel === 'number'
        ? { challengeLevel: activeSkillMeta.challengeLevel }
        : {}),
      ...(mode === 'give' ? { grantResource, grantAmount: safeAmt } : {}),
      createdAt: new Date().toISOString(),
    };

    try {
      await onSendNotification(payload);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to send notification.');
    } finally {
      setSending(false);
    }
  }

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[220] rev-backdrop flex items-center justify-center p-3 sm:p-4"
      onClick={() => !sending && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="sheet-modal shadow-2xl w-full max-w-xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 border-b rev-divider rev-inset-soft shrink-0">
          <div className="min-w-0">
            <h2 className="font-spectral font-bold text-xl leading-tight" style={{ color: 'var(--rev-text-bright)' }}>
              Narrator Dispatch
            </h2>
            <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--rev-text-muted)' }}>
              {partyName} · Push rolls, rewards, or crisis prompts to live sheets
            </p>
          </div>
          {!sending && (
            <button
              type="button"
              onClick={onClose}
              className="rev-icon-btn rev-icon-btn-edit text-xl"
              aria-label="Close"
            >
              ×
            </button>
          )}
        </div>

        {/* Mode Segmented Bar */}
        <div className="px-5 pt-3.5 pb-2 shrink-0">
          <div className="grid grid-cols-3 gap-1.5 p-1 rev-inset">
            {(
              [
                { id: 'prompt', label: 'Prompt / Roll' },
                { id: 'give', label: 'Give Reward' },
                { id: 'crisis', label: 'Resolve Crisis' },
              ] as const
            ).map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => switchMode(t.id)}
                className={`py-2 px-2 text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                  mode === t.id ? 'rev-btn-primary shadow-sm' : 'opacity-70 hover:opacity-100'
                }`}
                style={mode === t.id ? undefined : { color: 'var(--rev-text-secondary)' }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-5 pb-5 pt-2 flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto no-scrollbar">
          {error && (
            <div className="sheet-panel-red text-xs sm:text-sm p-3 font-medium" style={{ color: 'var(--rev-accent-text)' }}>
              {error}
            </div>
          )}

          {/* Recipients */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-widest tabular-nums" style={{ color: 'var(--rev-text-muted)' }}>
                Recipients ({selectedIds.size}/{acceptedMembers.length})
              </span>
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set(acceptedMembers.map(m => m.user_id)))}
                  className="font-bold hover:underline"
                  style={{ color: 'var(--rev-accent-text)' }}
                >
                  Select All
                </button>
                <span style={{ color: 'var(--rev-text-faint)' }}>·</span>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="font-bold hover:underline"
                  style={{ color: 'var(--rev-text-muted)' }}
                >
                  Clear
                </button>
              </div>
            </div>

            {acceptedMembers.length === 0 ? (
              <p className="text-xs italic rev-inset p-3 text-center" style={{ color: 'var(--rev-text-faint)' }}>
                No accepted members in this party yet.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto no-scrollbar">
                {acceptedMembers.map(m => {
                  const name = memberUsernames.get(m.user_id) || m.email.split('@')[0];
                  const isChecked = selectedIds.has(m.user_id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleMember(m.user_id)}
                      aria-pressed={isChecked}
                      className="flex items-center gap-2 px-3 py-1.5 border text-xs font-bold cursor-pointer transition-all"
                      style={{
                        borderRadius: 'var(--rev-radius-control)',
                        backgroundColor: isChecked ? 'var(--rev-accent-soft)' : 'var(--rev-surface-inset)',
                        borderColor: isChecked ? 'var(--rev-accent-border)' : 'var(--rev-border)',
                        color: isChecked ? 'var(--rev-text-bright)' : 'var(--rev-text-muted)',
                      }}
                    >
                      <span
                        className="w-2 h-2 rounded-full transition-colors"
                        style={{
                          backgroundColor: isChecked ? 'var(--rev-accent)' : 'var(--rev-border-strong)',
                        }}
                      />
                      <span>{name}</span>
                      {m.user_id === leaderUserId && (
                        <span className="text-[10px] opacity-80" style={{ color: 'var(--rev-badge-warn)' }}>
                          You
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Mode Body */}
          {mode === 'prompt' ? (
            <div className="rev-inset flex flex-col gap-3 p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--rev-text-muted)' }}>
                  Skill Check Configuration
                </span>
                <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--rev-text-faint)' }}>
                  Interactive Roll Prompt
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2.5 items-center">
                <select
                  value={selectedSkill}
                  onChange={(e) => {
                    const nextSkill = e.target.value;
                    setSelectedSkill(nextSkill);
                    applySkillRollPreset(nextSkill, challengeLevel);
                  }}
                  className="rev-input px-3 py-2 text-xs sm:text-sm font-bold"
                  aria-label="Skill"
                >
                  <optgroup label="Core Skills">
                    {CORE_SKILLS.map(skill => (
                      <option key={skill} value={skill}>
                        {skill}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Special Skills">
                    {SPECIAL_SKILLS.map(skill => (
                      <option key={skill} value={skill}>
                        {skill}
                      </option>
                    ))}
                  </optgroup>
                </select>

                <div className="flex items-center gap-2 justify-end">
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--rev-text-muted)' }}>
                    Target CL
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={25}
                    value={challengeLevel}
                    onChange={(e) => {
                      const parsed = Number.parseInt(e.target.value, 10);
                      const nextLvl = Number.isFinite(parsed) ? Math.max(1, Math.min(25, parsed)) : 12;
                      setChallengeLevel(nextLvl);
                      applySkillRollPreset(selectedSkill, nextLvl);
                    }}
                    className="w-16 rev-input px-2 py-2 text-xs sm:text-sm font-bold text-center tabular-nums"
                    aria-label="Challenge Level"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-widest font-bold mr-1" style={{ color: 'var(--rev-text-faint)' }}>
                  Suggested CL
                </span>
                {[10, 12, 14, 16, 18, 20].map((clVal) => (
                  <button
                    key={clVal}
                    type="button"
                    onClick={() => {
                      setChallengeLevel(clVal);
                      applySkillRollPreset(selectedSkill, clVal);
                    }}
                    className={`px-2.5 py-1 rounded text-xs font-bold tabular-nums transition-colors ${
                      challengeLevel === clVal ? 'rev-btn-primary' : 'rev-btn-secondary'
                    }`}
                  >
                    {clVal}
                  </button>
                ))}
              </div>

              <div className="pt-2 border-t rev-divider-subtle flex flex-wrap gap-1.5">
                {QUICK_PRESETS.map(preset => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => applyQuickPreset(preset)}
                    className="px-2.5 py-1 text-[11px] font-semibold rev-btn-secondary hover:opacity-100"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          ) : mode === 'give' ? (
            <div className="rev-inset flex flex-col gap-3 p-4">
              <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--rev-text-muted)' }}>
                Reward Grant
              </span>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setGrantResource('xp');
                    const nextAmt = grantResource === 'dp' ? 5 : grantAmount;
                    setGrantAmount(nextAmt);
                    applyGiveDefaults('xp', nextAmt);
                  }}
                  className={`py-2.5 px-3 text-xs font-bold uppercase tracking-wider transition-colors ${
                    grantResource === 'xp' ? 'rev-btn-primary shadow-sm' : 'rev-btn-secondary opacity-75'
                  }`}
                >
                  Experience (XP)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGrantResource('dp');
                    const nextAmt = grantResource === 'xp' ? 1 : grantAmount;
                    setGrantAmount(nextAmt);
                    applyGiveDefaults('dp', nextAmt);
                  }}
                  className={`py-2.5 px-3 text-xs font-bold uppercase tracking-wider transition-colors ${
                    grantResource === 'dp' ? 'rev-btn-primary shadow-sm' : 'rev-btn-secondary opacity-75'
                  }`}
                >
                  Destiny Points (DP)
                </button>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <div>
                  <div className="text-xs font-bold" style={{ color: 'var(--rev-text-secondary)' }}>
                    Grant Amount
                  </div>
                  <div className="text-[11px]" style={{ color: 'var(--rev-text-faint)' }}>
                    Recipients can choose which character claims it
                  </div>
                </div>
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={grantAmount}
                  onChange={(e) => {
                    const parsed = Number.parseInt(e.target.value, 10);
                    const nextAmt = Number.isFinite(parsed) ? Math.max(1, Math.min(999, parsed)) : 1;
                    setGrantAmount(nextAmt);
                    applyGiveDefaults(grantResource, nextAmt);
                  }}
                  className="w-24 rev-input px-3 py-2 text-sm font-bold text-center tabular-nums"
                  aria-label="Grant Amount"
                />
              </div>
            </div>
          ) : (
            <div className="rev-inset flex flex-col gap-1.5 p-4 border-l-2" style={{ borderLeftColor: 'var(--rev-accent)' }}>
              <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--rev-accent-text)' }}>
                Crisis Resolution Prompt
              </span>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--rev-text-secondary)' }}>
                Dispatches an interactive Crisis prompt to selected players. Accepting opens the character&apos;s Resolve Crisis window immediately.
              </p>
            </div>
          )}

          {/* Title & Message */}
          <div className="flex flex-col gap-3">
            <label className="flex flex-col text-[11px] font-bold uppercase tracking-widest gap-1.5" style={{ color: 'var(--rev-text-muted)' }}>
              Notification Title
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  mode === 'give'
                    ? 'Reward title...'
                    : mode === 'crisis'
                    ? 'Resolve Crisis'
                    : 'Prompt title...'
                }
                className="rev-input px-3 py-2 font-normal text-sm"
              />
            </label>

            <label className="flex flex-col text-[11px] font-bold uppercase tracking-widest gap-1.5" style={{ color: 'var(--rev-text-muted)' }}>
              Message
              <textarea
                rows={3}
                required
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  setActiveSkillMeta({});
                }}
                placeholder={
                  mode === 'give'
                    ? 'Reason for the XP or Destiny Point reward...'
                    : mode === 'crisis'
                    ? 'Describe the psychological breaking point or trigger...'
                    : 'Enter roll instruction or custom task...'
                }
                className="rev-input px-3 py-2 font-normal text-sm resize-y"
              />
            </label>
          </div>

          <div className="flex gap-3 pt-3 border-t rev-divider">
            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              className="flex-1 py-2.5 font-bold text-sm rev-btn-secondary disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending || selectedIds.size === 0 || !message.trim()}
              className="flex-1 py-2.5 font-bold text-sm rev-btn-primary disabled:opacity-40 shadow-sm"
            >
              {sending
                ? 'Sending...'
                : mode === 'give'
                ? 'Send Reward'
                : mode === 'crisis'
                ? 'Send Crisis'
                : 'Send Dispatch'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
