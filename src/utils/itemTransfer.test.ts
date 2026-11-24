import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('../supabase', () => ({ supabase: {} }));

let addTransferredItemToData: typeof import('./itemTransfer')['addTransferredItemToData'];
let deductTransferredItemFromData: typeof import('./itemTransfer')['deductTransferredItemFromData'];
let defaultCharacterData: typeof import('../defaults')['defaultCharacterData'];

beforeAll(async () => {
  ({ defaultCharacterData } = await import('../defaults'));
  ({ addTransferredItemToData, deductTransferredItemFromData } = await import('./itemTransfer'));
});

describe('item transfer data updates', () => {
  it('stacks matching incoming items', () => {
    const data = defaultCharacterData();
    data.items = [{
      id: 'ration-1',
      name: 'Rations',
      qty: 2,
      category: 'Consumable',
    }];

    const result = addTransferredItemToData(data, {
      id: 'incoming',
      name: 'Rations',
      qty: 3,
      category: 'Consumable',
    });

    expect(result.nextData.items).toHaveLength(1);
    expect(result.nextData.items[0].qty).toBe(5);
  });

  it('deducts quantity and preserves the remaining item', () => {
    const data = defaultCharacterData();
    data.items = [{
      id: 'ration-1',
      name: 'Rations',
      qty: 3,
      category: 'Consumable',
    }];

    const result = deductTransferredItemFromData(data, 'items', 'ration-1', 1);

    expect(result).not.toBeNull();
    expect(result?.nextData.items).toHaveLength(1);
    expect(result?.nextData.items[0].qty).toBe(2);
  });

  it('unequips and transfers the requested equipped item', () => {
    const data = defaultCharacterData();
    data.items = [{
      id: 'sword-1',
      name: 'Sword',
      qty: 1,
      category: 'Weapon',
    }];
    data.equipment.mainHand = 'sword-1';

    const result = deductTransferredItemFromData(
      data,
      { slot: 'mainHand' },
      'sword-1',
      1
    );

    expect(result).not.toBeNull();
    expect(result?.nextData.equipment.mainHand).toBe('');
  });
});
