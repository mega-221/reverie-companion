import { useState, useEffect } from 'react';
import type { Character } from '../../../types';
import { useCompendium } from '../../../CompendiumContext';
import { CORE_SKILLS } from '../utils';
import type { AdvancementNodeDef } from './progressionData';

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
  const { getAbilities } = useCompendium();
  const [selected, setSelected] = useState('');
  const [customInput, setCustomInput] = useState('');

  useEffect(() => {
    setSelected('');
    setCustomInput('');
  }, [pending]);

  if (!pending) return null;

  const { tier, node } = pending;
  const targetType = node.requiresTarget;

  let options: { value: string; label: string; sub?: string }[] = [];

  if (targetType === 'discipline') {
    const allAbilities = getAbilities();
    const allDisciplines = Array.from(
      new Set(allAbilities.map(a => a.data.source).filter(Boolean))
    ) as string[];
    options = allDisciplines
      .filter(d => !char.data.disciplines.includes(d))
      .map(d => ({ value: d, label: d }));
  } else if (targetType === 'ability') {
    const allAbilities = getAbilities();
    const knownNames = new Set(char.data.abilities.map(a => a.name));
    options = allAbilities
      .filter(
        a =>
          !knownNames.has(a.name) &&
          (char.data.disciplines.length === 0 || char.data.disciplines.includes(a.data.source))
      )
      .map(a => ({
        value: a.name,
        label: a.name,
        sub: `${a.data.source || 'Discipline'} · Rank ${a.data.class_rank ?? 0}`,
      }));
  } else if (targetType === 'conviction') {
    options = char.data.convictions
      .filter(c => c.name && c.rank < 5)
      .map(c => ({
        value: c.name,
        label: c.name,
        sub: `${c.season} · Current Rank ${c.rank}`,
      }));
  } else if (targetType === 'skill') {
    const coreOpts = CORE_SKILLS.filter(s => (char.data.skills[s] ?? 0) < 5).map(s => ({
      value: s,
      label: s,
      sub: `Core Skill · Rank ${char.data.skills[s] ?? 0}`,
    }));
    const specOpts = char.data.specialSkills
      .filter(s => s.rank < 5)
      .map(s => ({
        value: s.name,
        label: s.name,
        sub: `Special Skill · Rank ${s.rank}`,
      }));
    options = [...coreOpts, ...specOpts];
  }

  const finalChoice = selected || customInput.trim();

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
        <div className="border-b border-gray-700 pb-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">
            Tier {tier} Advancement
          </span>
          <h3 className="text-lg font-cinzel text-gray-100">{node.label}</h3>
          <p className="text-xs text-gray-400 mt-1">{node.description}</p>
        </div>

        {options.length > 0 ? (
          <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
            {options.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setSelected(opt.value);
                  setCustomInput('');
                }}
                className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors flex items-center justify-between ${
                  selected === opt.value
                    ? 'bg-red-950/40 border-red-500 text-white'
                    : 'bg-gray-900/70 border-gray-700 text-gray-300 hover:border-gray-500'
                }`}
              >
                <span className="font-semibold">{opt.label}</span>
                {opt.sub && <span className="text-xs text-gray-400">{opt.sub}</span>}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">
            No matching entries found in compendium/sheet. Enter a name manually below:
          </p>
        )}

        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1">
            Or enter custom name:
          </label>
          <input
            type="text"
            placeholder="Type name..."
            value={customInput}
            onChange={e => {
              setCustomInput(e.target.value);
              setSelected('');
            }}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-sm text-gray-200 focus:outline-none focus:border-red-500"
          />
        </div>

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
            disabled={!finalChoice}
            onClick={() => onConfirm(finalChoice)}
            className="px-5 py-2 text-sm font-bold text-white bg-red-900 hover:bg-red-800 disabled:opacity-40 rounded-lg transition-colors"
          >
            Confirm Selection
          </button>
        </div>
      </div>
    </div>
  );
}