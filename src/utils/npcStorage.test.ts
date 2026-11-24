import { describe, expect, it } from 'vitest';
import { createBlankNpc, normalizeNpc } from './npcStorage';

describe('normalizeNpc', () => {
  it('fills missing values with safe defaults', () => {
    const npc = normalizeNpc({
      name: '',
      stats: { vigorMax: -4 } as never,
      attributes: { grt: Number.NaN } as never,
      abilities: null as never,
    });

    expect(npc.name).toBe('Unnamed Creature');
    expect(npc.stats.vigorMax).toBe(1);
    expect(npc.attributes.grt).toBe(1);
    expect(npc.abilities).toEqual([]);
  });

  it('creates a complete blank NPC', () => {
    const npc = createBlankNpc();

    expect(npc.id).not.toBe('');
    expect(npc.name).toBe('New Creature');
    expect(npc.attributes).toEqual({ grt: 1, ref: 1, int: 1, psy: 1 });
  });
});
