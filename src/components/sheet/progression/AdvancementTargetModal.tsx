import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Character } from '../../../types';
import { useCompendium } from '../../../CompendiumContext';
import {
  ATTRIBUTE_NAMES,
  SKILL_GROUPS,
  SPECIAL_SKILLS,
  SPECIAL_SKILL_ATTRIBUTES,
  CORE_SKILL_DESCRIPTIONS,
  SPECIAL_SKILL_DESCRIPTIONS,
  SKILL_XP_COSTS,
  getMinSkillRank,
} from '../utils';
import { getSignatureSkills, isSkillInspired, type AdvancementNodeDef } from './progressionData';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
import { useEscapeKey } from '../../../hooks/useEscapeKey';
import { splitLines } from '../../../constants/reverie';

export default function AdvancementTargetModal({
  char,
  pending,
  onClose,
  onConfirm,
}: {
  char: Character;
  pending: { tier: number; node: AdvancementNodeDef } | null;
  onClose: () => void;
  onConfirm: (targetName: string) => void;
}) {
  const { getEntryByName } = useCompendium();
  const [selected, setSelected] = useState('');
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);

  useBodyScrollLock(Boolean(pending));

  useEffect(() => {
    setSelected('');
    setExpandedSkill(null);
  }, [pending]);

  useEscapeKey(Boolean(pending), onClose);

  if (!pending || typeof document === 'undefined') return null;

  const { tier, node } = pending;
  const targetType = node.requiresTarget;

  // Signature Skill selector: mirrors SpecialSkillModal, sorted by Attribute (3 Core on top, divider, 3 Special on bottom)
  if (targetType === 'skill') {
    const existingSignatures = getSignatureSkills(char.data);

    return createPortal(
      <div
        className="fixed inset-0 z-[210] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        onClick={onClose}
      >
        <div
          className="sheet-modal animate-in zoom-in-95 duration-200 max-w-2xl max-h-[85vh]"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-black/20 shrink-0">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400 block">
                Tier {tier} Advancement
              </span>
              <h2 className="font-bold text-xl text-gray-200">
                Select Signature Skill
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-white hover:bg-white/10 rounded font-bold text-2xl leading-none px-2 py-0.5 transition-colors"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {(Object.keys(ATTRIBUTE_NAMES) as Array<keyof typeof ATTRIBUTE_NAMES>).map(attr => {
              const coreSkills = SKILL_GROUPS[attr].skills;
              const specialSkills = SPECIAL_SKILLS.filter(
                s => SPECIAL_SKILL_ATTRIBUTES[s] === attr
              );
              const attrColor = SKILL_GROUPS[attr].color;

              const renderSkillRow = (
                skillName: string,
                kind: 'core' | 'special'
              ) => {
                const isExpanded = expandedSkill === skillName;
                const isAlreadySignature = existingSignatures.has(skillName);
                const isInspired = isSkillInspired(skillName, char.data);
                const learnedSpec =
                  kind === 'special'
                    ? char.data.specialSkills.find(s => s.name === skillName)
                    : undefined;
                const isUnlearned = kind === 'special' && !learnedSpec;
                const isDisabled = isAlreadySignature || isUnlearned;
                const currentRank =
                  kind === 'core'
                    ? char.data.skills[skillName] ?? 0
                    : learnedSpec?.rank ?? null;
                const originMin = getMinSkillRank(skillName, char);
                let retroRefund = 0;
                if (!isInspired && currentRank !== null && currentRank > originMin) {
                  for (let r = originMin; r < currentRank; r++) {
                    const baseCost = r < SKILL_XP_COSTS.length ? SKILL_XP_COSTS[r] : 0;
                    if (baseCost > 0) retroRefund += 1;
                  }
                }

                const desc =
                  kind === 'core'
                    ? CORE_SKILL_DESCRIPTIONS[skillName]
                    : SPECIAL_SKILL_DESCRIPTIONS[skillName] ||
                      getEntryByName(skillName)?.data?.description ||
                      '';

                return (
                  <div
                    key={skillName}
                    className={`bg-black/20 border border-gray-700 rounded-lg overflow-hidden transition-all duration-200 ${
                      isExpanded ? 'ring-1 ring-red-900 shadow-md' : ''
                    } ${isDisabled ? 'opacity-50 grayscale' : ''}`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedSkill(isExpanded ? null : skillName)
                      }
                      className="w-full text-left p-3 hover:bg-white/5 transition-colors flex justify-between items-center gap-2 group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-gray-200 group-hover:text-white truncate">
                          {skillName}
                        </span>
                        {isInspired && (
                          <span
                            className={`text-xs ${
                              isAlreadySignature ? 'text-cyan-400' : 'text-yellow-500'
                            }`}
                            title={
                              isAlreadySignature
                                ? 'Already a Signature Skill'
                                : 'Already Inspired'
                            }
                          >
                            ★
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {retroRefund > 0 && !isDisabled && (
                          <span className="bg-emerald-950/60 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-emerald-300 border border-emerald-700/60">
                            +{retroRefund} XP Freed
                          </span>
                        )}
                        {isAlreadySignature && (
                          <span className="bg-cyan-950/60 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-cyan-300 border border-cyan-700/60">
                            Signature
                          </span>
                        )}
                        <span className="bg-black/40 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-gray-300 border border-gray-600">
                          {currentRank !== null ? `Rank ${currentRank}` : 'Unlearned'}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${attrColor} border-current`}
                        >
                          {attr.toUpperCase()}
                        </span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="p-4 border-t border-gray-700 bg-black/40">
                        {desc && (
                          <div className="text-sm italic text-gray-200 mb-4 border-l-2 border-gray-700 pl-2">
                            {splitLines(desc).map((line: string, idx: number) => (
                                <span key={idx} className="block mb-1 last:mb-0">
                                  {line}
                                </span>
                              ))}
                          </div>
                        )}
                        {isAlreadySignature ? (
                          <button
                            type="button"
                            disabled
                            className="w-full py-2 bg-gray-700 text-gray-400 font-bold text-sm rounded cursor-not-allowed"
                          >
                            Already Signature Skill
                          </button>
                        ) : isUnlearned ? (
                          <button
                            type="button"
                            disabled
                            className="w-full py-2 bg-gray-700 text-gray-400 font-bold text-sm rounded cursor-not-allowed"
                          >
                            Skill Not Learned
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onConfirm(skillName)}
                            className="w-full py-2 bg-red-900 hover:bg-red-800 text-white font-bold text-sm rounded transition-colors"
                          >
                            Confirm Selection
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              };

              return (
                <div key={attr}>
                  <div
                    className={`bg-black/20 text-xs font-bold uppercase tracking-widest py-2 border-b border-gray-700 mb-2 px-2 rounded-t ${attrColor}`}
                  >
                    {ATTRIBUTE_NAMES[attr]}
                  </div>

                  {/* 3 Core Skills on top */}
                  <div className="space-y-2">
                    {coreSkills.map(skill => renderSkillRow(skill, 'core'))}
                  </div>

                  {/* Minor divider */}
                  <div className="flex items-center gap-2 my-2.5 px-2">
                    <div className="h-px flex-1 bg-gray-700/70" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                      Special Skills
                    </span>
                    <div className="h-px flex-1 bg-gray-700/70" />
                  </div>

                  {/* 3 Special Skills on bottom */}
                  <div className="space-y-2">
                    {specialSkills.map(skill => renderSkillRow(skill, 'special'))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // Conviction Rank 5 selector
  const convictionOptions = char.data.convictions
    .filter(c => c.name && c.rank === 4)
    .map(c => ({
      value: c.name,
      label: c.name,
      sub: `${c.season} · Rank 4 → 5`,
    }));

  return createPortal(
    <div
      className="fixed inset-0 z-[210] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="border-b border-gray-700 pb-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400">
            Tier {tier} Advancement
          </span>
          <h3 className="text-lg font-bold text-gray-100">{node.label}</h3>
          <p className="text-xs text-gray-400 mt-1">{node.description}</p>
        </div>

        {convictionOptions.length > 0 ? (
          <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
            {convictionOptions.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSelected(opt.value)}
                className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors flex items-center justify-between gap-2 ${
                  selected === opt.value
                    ? 'bg-purple-950/50 border-purple-500 text-white'
                    : 'bg-gray-900/70 border-gray-700 text-gray-300 hover:border-gray-500'
                }`}
              >
                <span className="font-semibold">{opt.label}</span>
                {opt.sub && <span className="text-xs text-gray-400 text-right">{opt.sub}</span>}
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-black/30 border border-gray-700 rounded-lg p-4 text-xs text-gray-400 italic text-center">
            You need a Conviction at Rank 4 to elevate it to Rank 5.
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-300 bg-gray-900 hover:bg-gray-700 border border-gray-700 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selected}
            onClick={() => selected && onConfirm(selected)}
            className="px-5 py-2 text-sm font-bold text-white bg-purple-900 hover:bg-purple-800 disabled:opacity-40 rounded-lg transition-colors"
          >
            Confirm Selection
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}