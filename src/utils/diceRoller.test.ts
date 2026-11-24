import { describe, expect, it } from 'vitest';
import {
  formatDieValue,
  isRollLogContent,
  parseRollLog,
  serializeRollLog,
  type RollLogEntry,
} from './diceRoller';

describe('dice roll log serialization', () => {
  it('round-trips a roll log entry', () => {
    const entry: RollLogEntry = {
      v: 1,
      id: 'roll-1',
      charId: 'char-1',
      charName: 'Test',
      category: 'skill',
      title: 'Athletics',
      subtitle: 'GRT',
      accentColor: '#ef4444',
      accentTag: 'GRT',
      advantageMode: 'normal',
      dice: [{ size: 'd20', value: 12, exertCount: 0 }],
      modifiers: [{ label: 'Athletics', value: 3 }],
      exertCount: 0,
      strainIncurred: 0,
      diceSum: 12,
      total: 15,
      outcomeLabel: 'Success',
      outcomeTone: 'success',
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    const serialized = serializeRollLog(entry);
    expect(isRollLogContent(serialized)).toBe(true);
    expect(parseRollLog(serialized)).toEqual(entry);
  });

  it('rejects malformed roll log content', () => {
    expect(parseRollLog('not a roll')).toBeNull();
    expect(parseRollLog('::REVERIE_ROLL::{}')).toBeNull();
  });

  it('formats die values consistently', () => {
    expect(formatDieValue('coinflip', 1)).toBe('TAILS');
    expect(formatDieValue('coinflip', 2)).toBe('HEADS');
    expect(formatDieValue('d6', 4)).toBe('4');
  });
});
