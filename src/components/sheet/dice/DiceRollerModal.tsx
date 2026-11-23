import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { Character } from '../../../types';
import { useCompendium } from '../../../CompendiumContext';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
import {
  accuracyBonus,
  getBurdenPenalty,
  getEquippedArmourInfo,
} from '../../../calc';
import {
  ATTRIBUTE_KEYS,
  ATTRIBUTE_NAMES,
  SKILL_GROUPS,
  SPECIAL_SKILL_ATTRIBUTES,
} from '../../../constants/reverie';
import {
  ATTRIBUTE_ACCENT_HEX,
  buildCombatRollSession,
  buildConvictionCheckSession,
  buildDeathSaveRollSession,
  buildDestinyRollSession,
  buildSkillRollSession,
  CORE_SKILLS,
  createRollSession,
  getEffectiveSkillModifier,
  type ActiveRollSession,
  type AdvantageMode,
  type DieSize,
} from '../../../utils/diceRoller';

interface DiceRollerModalProps {
  isOpen: boolean;
  onClose: () => void;
  char: Character;
  onStartRoll: (session: ActiveRollSession) => void;
}

type RollerTab = 'skills' | 'rules' | 'custom';

export default function DiceRollerModal({
  isOpen,
  onClose,
  char,
  onStartRoll,
}: DiceRollerModalProps) {
  useBodyScrollLock(isOpen);

  const { getEntryByName } = useCompendium();
  const [activeTab, setActiveTab] = useState<RollerTab>('skills');

  // Shared Skill Check options
  const [skillUseCl, setSkillUseCl] = useState(true);
  const [skillCl, setSkillCl] = useState(12);
  const [advantageMode, setAdvantageMode] = useState<AdvantageMode>('normal');
  const [showOtherSpecials, setShowOtherSpecials] = useState(false);

  // Combat Roll options
  const [combatMod, setCombatMod] = useState(0);
  const [combatUseEva, setCombatUseEva] = useState(true);
  const [combatEva, setCombatEva] = useState(10);

  // Contested Roll options
  const [contestedSkill, setContestedSkill] = useState('Stealth');
  const [contestedSide, setContestedSide] = useState<'active' | 'passive'>('active');
  const [contestedUseTarget, setContestedUseTarget] = useState(false);
  const [contestedTarget, setContestedTarget] = useState(12);

  // Conviction Check options
  const namedConvictions = char.data.convictions.filter((c) => c.name?.trim());
  const [selectedConvIdx, setSelectedConvIdx] = useState(0);
  const [convictionCl, setConvictionCl] = useState(18);

  // First Aid severity
  const activeInjuries = char.data.trackers.injuries || [];
  const defaultSev = activeInjuries.length > 0 ? activeInjuries[0].severity : 1;
  const [firstAidSeverity, setFirstAidSeverity] = useState(defaultSev);

  // Custom Roll (strictly Coinflip, d6, and d20 ONLY)
  const [customDie, setCustomDie] = useState<DieSize>('d6');
  const [customCount, setCustomCount] = useState(1);
  const [customMod, setCustomMod] = useState(0);
  const [customLabel, setCustomLabel] = useState('');
  const [customUseCl, setCustomUseCl] = useState(false);
  const [customCl, setCustomCl] = useState(10);

  if (!isOpen) return null;

  const tier = Math.max(0, char.data.progression?.tier ?? 0);
  const classRank = Math.max(0, Math.min(4, tier - 1));
  const armourInfo = getEquippedArmourInfo(char.data, getEntryByName);
  const burdenPenalty = getBurdenPenalty(char.data, getEntryByName);
  const baseAcc = (char.data.trackers.acc || 0) + accuracyBonus(char.data);
  const effectiveAcc = baseAcc - burdenPenalty - (armourInfo?.combatRollPenalty ?? 0);

  const launch = (session: ActiveRollSession) => {
    onClose();
    onStartRoll(session);
  };

  const learnedSpecialNames = new Set((char.data.specialSkills || []).map((s) => s.name));
  const unlearnedSpecialNames = Object.keys(SPECIAL_SKILL_ATTRIBUTES).filter(
    (name) => !learnedSpecialNames.has(name)
  );

  const allSkillOptions = [
    ...CORE_SKILLS.map((name) => ({ name, kind: 'core' as const })),
    ...Object.keys(SPECIAL_SKILL_ATTRIBUTES).map((name) => ({
      name,
      kind: 'special' as const,
    })),
  ];

  const handleCustomRoll = () => {
    const diceSizes: DieSize[] = Array.from({ length: customCount }, () => customDie);
    const dieTitle =
      customDie === 'coinflip'
        ? customCount === 1
          ? 'Coinflip'
          : `${customCount}× Coinflip`
        : `${customCount}${customDie}`;

    const accent =
      customDie === 'coinflip'
        ? '#eab308'
        : customDie === 'd20'
        ? '#22d3ee'
        : '#a855f7';

    launch(
      createRollSession({
        category: 'custom',
        title: customLabel.trim() || `Custom Roll (${dieTitle})`,
        subtitle: `${dieTitle}${customMod !== 0 ? ` ${customMod >= 0 ? `+ ${customMod}` : `- ${Math.abs(customMod)}`}` : ''} · Custom Roll`,
        accentColor: accent,
        accentTag: customDie === 'coinflip' ? 'COIN' : customDie.toUpperCase(),
        diceSizes,
        advantageMode: customDie === 'coinflip' || customCount < 2 ? 'normal' : advantageMode,
        baseModifiers: customMod !== 0 ? [{ label: 'Modifier', value: customMod }] : [],
        targetLabel: customUseCl && customDie !== 'coinflip' ? 'Target' : undefined,
        targetValue: customUseCl && customDie !== 'coinflip' ? customCl : undefined,
      })
    );
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[320] rev-modal-backdrop backdrop-blur-md flex items-center justify-center p-2.5 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label="Dice Roller"
      onClick={onClose}
    >
      <div
        className="sheet-modal w-full max-w-2xl max-h-[90vh] max-h-[90dvh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className="px-4 sm:px-5 py-3.5 border-b rev-divider flex items-center justify-between gap-3 shrink-0"
          style={{ backgroundColor: 'var(--rev-surface-inset)' }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="w-8 h-8 rounded-lg flex items-center justify-center border shrink-0"
              style={{
                backgroundColor: 'var(--rev-accent-soft)',
                borderColor: 'var(--rev-accent-border)',
                color: 'var(--rev-accent-text)',
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="w-4 h-4">
                <polygon points="12 2 21 7 21 17 12 22 3 17 3 7 12 2" />
                <polyline points="3 7 12 12 21 7" />
                <line x1="12" y1="22" x2="12" y2="12" />
              </svg>
            </span>
            <div className="min-w-0">
              <h2 className="font-spectral font-bold text-lg sm:text-xl leading-tight truncate" style={{ color: 'var(--rev-text-bright)' }}>
                Dice Roller
              </h2>
              <p className="text-[11px] truncate" style={{ color: 'var(--rev-text-muted)' }}>
                Tap a check or drag the Roll button directly onto any skill
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dice roller"
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded text-2xl leading-none font-bold hover:bg-white/10 transition-colors shrink-0"
            style={{ color: 'var(--rev-text-muted)' }}
          >
            ×
          </button>
        </div>

        {/* Segmented Tabs */}
        <div className="px-4 sm:px-5 pt-3 pb-2 border-b rev-divider-subtle shrink-0">
          <div className="grid grid-cols-3 gap-1.5 p-1 rev-inset">
            {(
              [
                { id: 'skills', label: 'Skills' },
                { id: 'rules', label: 'Combat & Rules' },
                { id: 'custom', label: 'Custom Roll' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`min-h-[38px] px-2 py-1.5 text-xs font-bold transition-colors whitespace-nowrap ${
                  activeTab === t.id ? 'rev-btn-primary' : 'opacity-75 hover:opacity-100'
                }`}
                style={activeTab === t.id ? undefined : { color: 'var(--rev-text-secondary)' }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-5 space-y-5">
          {activeTab === 'skills' && (
            <>
              {/* Quick Check Settings Strip */}
              <div className="rev-inset p-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer select-none" style={{ color: 'var(--rev-text-secondary)' }}>
                    <input
                      type="checkbox"
                      checked={skillUseCl}
                      onChange={(e) => setSkillUseCl(e.target.checked)}
                      className="w-4 h-4 rounded"
                      style={{ accentColor: 'var(--rev-accent)' }}
                    />
                    Target CL
                  </label>
                  {skillUseCl && (
                    <div className="flex items-center gap-1">
                      {[10, 12, 14, 16, 18, 20].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setSkillCl(preset)}
                          className={`px-2 py-1 text-xs font-bold rounded border tabular-nums ${
                            skillCl === preset ? 'rev-btn-primary' : 'rev-btn-secondary'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={skillCl}
                        onChange={(e) => setSkillCl(Math.max(1, parseInt(e.target.value, 10) || 12))}
                        className="rev-input w-14 px-2 py-1 text-xs font-bold text-center tabular-nums"
                        aria-label="Challenge Level"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {(['normal', 'advantage', 'disadvantage'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setAdvantageMode(mode)}
                      className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded border ${
                        advantageMode === mode ? 'rev-btn-primary' : 'rev-btn-secondary'
                      }`}
                    >
                      {mode === 'normal' ? 'Normal' : mode === 'advantage' ? 'Adv' : 'Dis'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Core Skills 2x2 Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {ATTRIBUTE_KEYS.map((attr) => {
                  const group = SKILL_GROUPS[attr];
                  const accent = ATTRIBUTE_ACCENT_HEX[attr];
                  return (
                    <div key={attr} className="rev-inset p-3 space-y-2">
                      <div className="flex items-center justify-between border-b rev-divider-subtle pb-1.5">
                        <span className="font-bold text-sm uppercase tracking-wider" style={{ color: accent }}>
                          {ATTRIBUTE_NAMES[attr]}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5" style={{ color: accent }}>
                          {attr.toUpperCase()} · {char.data.attributes[attr]}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {group.skills.map((skill) => {
                          const totalMod = getEffectiveSkillModifier(char, skill, 'core', getEntryByName);
                          const hasStealthDis =
                            skill === 'Stealth' && Boolean(armourInfo?.stealthDisadvantage);

                          return (
                            <button
                              key={skill}
                              type="button"
                              onClick={() =>
                                launch(
                                  buildSkillRollSession({
                                    char,
                                    skillName: skill,
                                    kind: 'core',
                                    getEntryByName,
                                    advantageMode:
                                      advantageMode !== 'normal'
                                        ? advantageMode
                                        : hasStealthDis
                                        ? 'disadvantage'
                                        : 'normal',
                                    targetValue: skillUseCl ? skillCl : undefined,
                                  })
                                )
                              }
                              className="w-full min-h-[42px] px-3 py-1.5 rounded-lg border border-transparent hover:border-[var(--rev-accent-border)] bg-black/20 hover:bg-white/10 flex items-center justify-between gap-2 transition-colors text-left"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-sm font-medium truncate" style={{ color: 'var(--rev-text-bright)' }}>
                                  {skill}
                                </span>
                                {hasStealthDis && (
                                  <span className="rev-keep-color text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-950/70 border border-amber-700/80 text-amber-300 shrink-0">
                                    DIS
                                  </span>
                                )}
                              </div>
                              <span
                                className="font-mono font-bold text-sm tabular-nums shrink-0"
                                style={{ color: totalMod < 0 ? '#f87171' : accent }}
                              >
                                {totalMod >= 0 ? `+${totalMod}` : totalMod}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Special Skills */}
              <div className="rev-inset p-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm uppercase tracking-wider" style={{ color: 'var(--rev-text-bright)' }}>
                    Special Skills
                  </span>
                  {unlearnedSpecialNames.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowOtherSpecials((prev) => !prev)}
                      className="text-xs font-semibold hover:underline"
                      style={{ color: 'var(--rev-accent-text)' }}
                    >
                      {showOtherSpecials ? 'Hide untrained' : `Show untrained (${unlearnedSpecialNames.length})`}
                    </button>
                  )}
                </div>

                {char.data.specialSkills.length === 0 && !showOtherSpecials ? (
                  <p className="text-xs italic" style={{ color: 'var(--rev-text-faint)' }}>
                    No learned special skills yet. You can still roll untrained special skills.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {char.data.specialSkills.map((s) => {
                      const totalMod = getEffectiveSkillModifier(char, s.name, 'special', getEntryByName);
                      const attr = (getEntryByName(s.name)?.data?.attribute || s.attribute || 'grt').toLowerCase() as 'grt' | 'ref' | 'int' | 'psy';
                      const accent = ATTRIBUTE_ACCENT_HEX[attr] || ATTRIBUTE_ACCENT_HEX.grt;
                      return (
                        <button
                          key={s.name}
                          type="button"
                          onClick={() =>
                            launch(
                              buildSkillRollSession({
                                char,
                                skillName: s.name,
                                kind: 'special',
                                getEntryByName,
                                advantageMode,
                                targetValue: skillUseCl ? skillCl : undefined,
                              })
                            )
                          }
                          className="min-h-[42px] px-3 py-1.5 rounded-lg border border-white/10 hover:border-[var(--rev-accent-border)] bg-black/25 hover:bg-white/10 flex items-center justify-between gap-2 transition-colors text-left"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm font-medium truncate" style={{ color: 'var(--rev-text-bright)' }}>
                              {s.name}
                            </span>
                            <span
                              className="text-[9px] font-bold uppercase px-1 py-0.5 rounded border shrink-0"
                              style={{ color: accent, borderColor: `${accent}66` }}
                            >
                              {attr.toUpperCase()}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-sm tabular-nums shrink-0" style={{ color: accent }}>
                            {totalMod >= 0 ? `+${totalMod}` : totalMod}
                          </span>
                        </button>
                      );
                    })}

                    {showOtherSpecials &&
                      unlearnedSpecialNames.map((name) => {
                        const totalMod = getEffectiveSkillModifier(char, name, 'special', getEntryByName);
                        const attr = (SPECIAL_SKILL_ATTRIBUTES[name] || 'grt') as 'grt' | 'ref' | 'int' | 'psy';
                        const accent = ATTRIBUTE_ACCENT_HEX[attr];
                        return (
                          <button
                            key={name}
                            type="button"
                            onClick={() =>
                              launch(
                                buildSkillRollSession({
                                  char,
                                  skillName: name,
                                  kind: 'special',
                                  getEntryByName,
                                  advantageMode,
                                  targetValue: skillUseCl ? skillCl : undefined,
                                })
                              )
                            }
                            className="min-h-[42px] px-3 py-1.5 rounded-lg border border-dashed border-white/15 hover:border-[var(--rev-accent-border)] bg-black/15 hover:bg-white/10 flex items-center justify-between gap-2 transition-colors text-left opacity-85 hover:opacity-100"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-sm truncate" style={{ color: 'var(--rev-text-secondary)' }}>
                                {name}
                              </span>
                              <span
                                className="text-[9px] font-bold uppercase px-1 py-0.5 rounded border shrink-0"
                                style={{ color: accent, borderColor: `${accent}55` }}
                              >
                                {attr.toUpperCase()} · 0
                              </span>
                            </div>
                            <span className="font-mono font-bold text-sm tabular-nums shrink-0" style={{ color: accent }}>
                              {totalMod >= 0 ? `+${totalMod}` : totalMod}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'rules' && (
            <div className="space-y-4">
              {/* Combat Roll */}
              <div className="rev-inset p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-base text-amber-300">
                      Combat Roll
                    </h3>
                    <p className="text-xs" style={{ color: 'var(--rev-text-muted)' }}>
                      3d6 + Class Rank ({classRank}) + Effective ACC ({effectiveAcc >= 0 ? `+${effectiveAcc}` : effectiveAcc}) vs Target EVA
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      launch(
                        buildCombatRollSession({
                          char,
                          getEntryByName,
                          abilityMod: combatMod,
                          targetEva: combatUseEva ? combatEva : undefined,
                          advantageMode,
                        })
                      )
                    }
                    className="rev-btn-primary min-h-[40px] px-4 py-2 text-xs font-bold uppercase tracking-wider shrink-0"
                  >
                    Roll Combat
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <label className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--rev-text-secondary)' }}>
                    Ability / Situational Mod:
                    <input
                      type="number"
                      value={combatMod}
                      onChange={(e) => setCombatMod(parseInt(e.target.value, 10) || 0)}
                      className="rev-input w-16 px-2 py-1 text-xs font-bold text-center tabular-nums"
                    />
                  </label>

                  <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer" style={{ color: 'var(--rev-text-secondary)' }}>
                    <input
                      type="checkbox"
                      checked={combatUseEva}
                      onChange={(e) => setCombatUseEva(e.target.checked)}
                      className="w-4 h-4 rounded"
                      style={{ accentColor: 'var(--rev-accent)' }}
                    />
                    Target EVA:
                  </label>
                  {combatUseEva && (
                    <input
                      type="number"
                      min={1}
                      max={40}
                      value={combatEva}
                      onChange={(e) => setCombatEva(Math.max(1, parseInt(e.target.value, 10) || 10))}
                      className="rev-input w-16 px-2 py-1 text-xs font-bold text-center tabular-nums"
                    />
                  )}
                </div>
              </div>

              {/* Destiny Roll (1d20) & Defying Death (1d6) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="rev-inset p-4 flex flex-col justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-base text-cyan-300">
                      Destiny Roll (1d20)
                    </h3>
                    <p className="text-xs mt-1" style={{ color: 'var(--rev-text-muted)' }}>
                      Unmodified 1d20 fate &amp; fortune check.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => launch(buildDestinyRollSession())}
                    className="rev-btn-secondary min-h-[42px] w-full py-2 text-xs font-bold uppercase tracking-wider border-cyan-700/70 text-cyan-200 hover:bg-cyan-950/50"
                  >
                    Roll 1d20 Destiny
                  </button>
                </div>

                <div className="rev-inset p-4 flex flex-col justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-base text-red-400">
                      Defying Death (1d6)
                    </h3>
                    <p className="text-xs mt-1" style={{ color: 'var(--rev-text-muted)' }}>
                      Survive on 4+ when damaged while defying death.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => launch(buildDeathSaveRollSession())}
                    className="rev-btn-secondary min-h-[42px] w-full py-2 text-xs font-bold uppercase tracking-wider border-red-800/80 text-red-300 hover:bg-red-950/50"
                  >
                    Roll Death Save (4+)
                  </button>
                </div>
              </div>

              {/* Conviction Check */}
              <div className="rev-inset p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-base" style={{ color: 'var(--rev-text-bright)' }}>
                      Conviction Check
                    </h3>
                    <p className="text-xs" style={{ color: 'var(--rev-text-muted)' }}>
                      3d6 + Conviction Rank vs CL (CL 18 for Strain Limit / Crisis prevention)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const chosen =
                        namedConvictions[selectedConvIdx] || {
                          name: 'Unconvicted',
                          season: '',
                          rank: 0,
                        };
                      launch(
                        buildConvictionCheckSession({
                          conviction: chosen,
                          targetCl: convictionCl,
                        })
                      );
                    }}
                    className="rev-btn-primary min-h-[40px] px-4 py-2 text-xs font-bold uppercase tracking-wider shrink-0"
                  >
                    Roll Conviction
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {namedConvictions.length > 0 ? (
                    <select
                      value={selectedConvIdx}
                      onChange={(e) => setSelectedConvIdx(Number(e.target.value))}
                      className="rev-input px-3 py-1.5 text-xs font-semibold flex-1 min-w-[160px]"
                    >
                      {namedConvictions.map((c, idx) => (
                        <option key={c.name} value={idx}>
                          {c.name} ({c.season} · +{c.rank})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs italic" style={{ color: 'var(--rev-text-faint)' }}>
                      No named convictions (rolls +0)
                    </span>
                  )}

                  <div className="flex items-center gap-1">
                    {[12, 15, 18].map((cl) => (
                      <button
                        key={cl}
                        type="button"
                        onClick={() => setConvictionCl(cl)}
                        className={`px-2 py-1 text-xs font-bold rounded border tabular-nums ${
                          convictionCl === cl ? 'rev-btn-primary' : 'rev-btn-secondary'
                        }`}
                      >
                        CL {cl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Contested Roll */}
              <div className="rev-inset p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-base" style={{ color: 'var(--rev-text-bright)' }}>
                      Contested Roll
                    </h3>
                    <p className="text-xs" style={{ color: 'var(--rev-text-muted)' }}>
                      Active side must score strictly higher; Passive side wins ties.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const opt = allSkillOptions.find((o) => o.name === contestedSkill);
                      launch(
                        buildSkillRollSession({
                          char,
                          skillName: contestedSkill,
                          kind: opt?.kind || 'core',
                          getEntryByName,
                          advantageMode,
                          isContested: true,
                          contestedSide,
                          targetValue: contestedUseTarget ? contestedTarget : undefined,
                        })
                      );
                    }}
                    className="rev-btn-primary min-h-[40px] px-4 py-2 text-xs font-bold uppercase tracking-wider shrink-0"
                  >
                    Roll Contested
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <select
                    value={contestedSkill}
                    onChange={(e) => setContestedSkill(e.target.value)}
                    className="rev-input px-3 py-1.5 text-xs font-semibold flex-1 min-w-[150px]"
                  >
                    {allSkillOptions.map((opt) => (
                      <option key={opt.name} value={opt.name}>
                        {opt.name} ({opt.kind === 'core' ? 'Core' : 'Special'})
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-1">
                    {(['active', 'passive'] as const).map((side) => (
                      <button
                        key={side}
                        type="button"
                        onClick={() => setContestedSide(side)}
                        className={`px-2.5 py-1 text-xs font-bold uppercase rounded border ${
                          contestedSide === side ? 'rev-btn-primary' : 'rev-btn-secondary'
                        }`}
                      >
                        {side}
                      </button>
                    ))}
                  </div>

                  <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer" style={{ color: 'var(--rev-text-secondary)' }}>
                    <input
                      type="checkbox"
                      checked={contestedUseTarget}
                      onChange={(e) => setContestedUseTarget(e.target.checked)}
                      className="w-4 h-4 rounded"
                      style={{ accentColor: 'var(--rev-accent)' }}
                    />
                    vs Score:
                  </label>
                  {contestedUseTarget && (
                    <input
                      type="number"
                      min={1}
                      max={35}
                      value={contestedTarget}
                      onChange={(e) => setContestedTarget(parseInt(e.target.value, 10) || 12)}
                      className="rev-input w-16 px-2 py-1 text-xs font-bold text-center tabular-nums"
                    />
                  )}
                </div>
              </div>

              {/* First Aid (CL 12 + Severity) */}
              <div className="rev-inset p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-base" style={{ color: 'var(--rev-text-bright)' }}>
                      First Aid Check (CL {12 + firstAidSeverity})
                    </h3>
                    <p className="text-xs" style={{ color: 'var(--rev-text-muted)' }}>
                      Medicine (2 wks/sev) or Survival (3 wks/sev) vs 12 + Injury Severity.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs" style={{ color: 'var(--rev-text-muted)' }}>Sev:</span>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={firstAidSeverity}
                      onChange={(e) => setFirstAidSeverity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="rev-input w-14 px-2 py-1 text-xs font-bold text-center tabular-nums"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      launch(
                        buildSkillRollSession({
                          char,
                          skillName: 'Medicine',
                          kind: 'special',
                          getEntryByName,
                          advantageMode,
                          targetValue: 12 + firstAidSeverity,
                        })
                      )
                    }
                    className="rev-btn-secondary flex-1 min-h-[40px] px-3 py-1.5 text-xs font-bold"
                  >
                    First Aid: Medicine
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      launch(
                        buildSkillRollSession({
                          char,
                          skillName: 'Survival',
                          kind: 'core',
                          getEntryByName,
                          advantageMode,
                          targetValue: 12 + firstAidSeverity,
                        })
                      )
                    }
                    className="rev-btn-secondary flex-1 min-h-[40px] px-3 py-1.5 text-xs font-bold"
                  >
                    First Aid: Survival
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'custom' && (
            <div className="rev-inset p-4 sm:p-5 space-y-5">
              <div>
                <h3 className="font-bold text-base" style={{ color: 'var(--rev-text-bright)' }}>
                  Custom Roll
                </h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--rev-text-muted)' }}>
                  Supported dice in Reverie: Coinflip, d6, and d20.
                </p>
              </div>

              {/* Strictly Coinflip, d6, d20 selector */}
              <div className="grid grid-cols-3 gap-2.5">
                {(
                  [
                    { id: 'coinflip', label: 'Coinflip', sub: 'Heads / Tails' },
                    { id: 'd6', label: 'd6', sub: 'Six-sided die' },
                    { id: 'd20', label: 'd20', sub: 'Twenty-sided die' },
                  ] as const
                ).map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setCustomDie(d.id)}
                    className={`min-h-[60px] p-3 rounded-lg border text-center transition-all flex flex-col items-center justify-center ${
                      customDie === d.id ? 'rev-btn-primary' : 'rev-btn-secondary'
                    }`}
                  >
                    <span className="font-bold text-base">{d.label}</span>
                    <span className="text-[10px] opacity-80 mt-0.5">{d.sub}</span>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex flex-col gap-1 text-xs font-bold" style={{ color: 'var(--rev-text-muted)' }}>
                  Number of {customDie === 'coinflip' ? 'Coins' : 'Dice'}
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setCustomCount((c) => Math.max(1, c - 1))}
                      className="rev-btn-secondary w-10 h-10 font-bold text-base"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={customCount}
                      onChange={(e) =>
                        setCustomCount(Math.max(1, Math.min(12, parseInt(e.target.value, 10) || 1)))
                      }
                      className="rev-input flex-1 h-10 text-center font-bold text-base tabular-nums"
                    />
                    <button
                      type="button"
                      onClick={() => setCustomCount((c) => Math.min(12, c + 1))}
                      className="rev-btn-secondary w-10 h-10 font-bold text-base"
                    >
                      +
                    </button>
                  </div>
                </label>

                <label className="flex flex-col gap-1 text-xs font-bold" style={{ color: 'var(--rev-text-muted)' }}>
                  Flat Modifier
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setCustomMod((m) => m - 1)}
                      className="rev-btn-secondary w-10 h-10 font-bold text-base"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={-50}
                      max={50}
                      value={customMod}
                      onChange={(e) => setCustomMod(parseInt(e.target.value, 10) || 0)}
                      className="rev-input flex-1 h-10 text-center font-bold text-base tabular-nums"
                    />
                    <button
                      type="button"
                      onClick={() => setCustomMod((m) => m + 1)}
                      className="rev-btn-secondary w-10 h-10 font-bold text-base"
                    >
                      +
                    </button>
                  </div>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <label className="flex flex-col gap-1 text-xs font-bold" style={{ color: 'var(--rev-text-muted)' }}>
                  Optional Label
                  <input
                    type="text"
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                    placeholder="e.g., Weapon Damage, Luck..."
                    className="rev-input px-3 py-2 text-sm font-normal mt-1"
                  />
                </label>

                {customDie !== 'coinflip' && (
                  <div className="flex items-center gap-2.5 pt-4">
                    <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer" style={{ color: 'var(--rev-text-secondary)' }}>
                      <input
                        type="checkbox"
                        checked={customUseCl}
                        onChange={(e) => setCustomUseCl(e.target.checked)}
                        className="w-4 h-4 rounded"
                        style={{ accentColor: 'var(--rev-accent)' }}
                      />
                      Target CL:
                    </label>
                    {customUseCl && (
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={customCl}
                        onChange={(e) => setCustomCl(parseInt(e.target.value, 10) || 10)}
                        className="rev-input w-20 px-2.5 py-1.5 text-sm font-bold text-center tabular-nums"
                      />
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleCustomRoll}
                className="rev-btn-primary w-full min-h-[46px] py-3 font-bold text-sm uppercase tracking-[0.18em]"
              >
                Roll {customCount === 1 && customDie === 'coinflip' ? 'Coinflip' : `${customCount}${customDie === 'coinflip' ? '× Coinflip' : customDie}`}
                {customMod !== 0 ? ` ${customMod >= 0 ? `+ ${customMod}` : `- ${Math.abs(customMod)}`}` : ''}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
