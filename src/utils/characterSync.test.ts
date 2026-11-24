import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('../supabase', () => ({ supabase: {} }));

let normalizeCharacter: typeof import('./characterSync')['normalizeCharacter'];
let isTextInputPatch: typeof import('./characterSync')['isTextInputPatch'];
let defaultCharacterData: typeof import('../defaults')['defaultCharacterData'];

beforeAll(async () => {
  ({ normalizeCharacter, isTextInputPatch } = await import('./characterSync'));
  ({ defaultCharacterData } = await import('../defaults'));
});

describe('character synchronization helpers', () => {
  it('normalizes legacy notes into a journal entry', () => {
    const data = defaultCharacterData();
    data.notes = 'Remember the gate.';

    const normalized = normalizeCharacter({
      id: 'char-1',
      user_id: 'user-1',
      name: 'Test',
      data,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    }, () => undefined);

    expect(normalized.data.journal).toHaveLength(1);
    expect(normalized.data.journal?.[0].content).toBe('Remember the gate.');
  });

  it('identifies text patches for delayed broadcasting', () => {
    const data = defaultCharacterData();
    expect(isTextInputPatch({ notes: 'new note' }, data)).toBe(true);
    expect(isTextInputPatch({ trackers: { ...data.trackers, vigor: 4 } }, data)).toBe(false);
  });

  it('migrates string abilities to equipped ability objects', () => {
    const data = defaultCharacterData();
    data.abilities = ['Dodge' as never];

    const normalized = normalizeCharacter({
      id: 'char-1',
      user_id: 'user-1',
      name: 'Test',
      data,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    }, () => undefined);

    expect(normalized.data.abilities).toEqual([{ name: 'Dodge', equipped: true }]);
  });
});
