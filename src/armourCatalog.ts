import type { CompendiumEntry } from './types';

export type ArmourCategory = 'Light' | 'Medium' | 'Heavy';

export const ARMOUR_SUBTYPES: ArmourCategory[] = ['Light', 'Medium', 'Heavy'];

export const ARMOUR_CATEGORY_RULES: Record<
  ArmourCategory,
  {
    requiredCarry: number;
    stealthDisadvantage: boolean;
    movementPenalty: number;
    summary: string;
  }
> = {
  Light: {
    requiredCarry: 0,
    stealthDisadvantage: false,
    movementPenalty: 0,
    summary: 'No Carry requirement, no penalties.',
  },
  Medium: {
    requiredCarry: 3,
    stealthDisadvantage: true,
    movementPenalty: 0,
    summary: 'Requires Carry 3 · Disadvantage on Stealth checks.',
  },
  Heavy: {
    requiredCarry: 6,
    stealthDisadvantage: true,
    movementPenalty: 1,
    summary: 'Requires Carry 6 · Disadvantage on Stealth checks · -1 tile Movement.',
  },
};

export const ARMOUR_COMPENDIUM_ENTRIES: CompendiumEntry[] = [
  {
    id: 'builtin-armour-reinforced-coat',
    type: 'item',
    name: 'Reinforced Coat',
    data: {
      category: 'armour',
      subtype: 'Light',
      ap: 1,
      resists: '-',
      value: 40,
      burden: 1,
      req: '-',
      effect: '-',
      description: 'Lightly plated coat offering reliable protection without restricting movement.',
    },
  },
  {
    id: 'builtin-armour-gambeson-jacket',
    type: 'item',
    name: 'Gambeson Jacket',
    data: {
      category: 'armour',
      subtype: 'Light',
      ap: 1,
      resists: 'Stun 1',
      value: 60,
      burden: 1,
      req: '-',
      effect: 'Resists Stun 1',
      description: 'Quilted padded armour that cushions heavy blows.',
    },
  },
  {
    id: 'builtin-armour-leather-armour',
    type: 'item',
    name: 'Leather Armour',
    data: {
      category: 'armour',
      subtype: 'Light',
      ap: 1,
      resists: 'Pierce 1',
      value: 70,
      burden: 1,
      req: '-',
      effect: 'Resists Pierce 1',
      description: 'Boiled and layered hide shaped to turn glancing thrusts.',
    },
  },
  {
    id: 'builtin-armour-chain-coat',
    type: 'item',
    name: 'Chain Coat',
    data: {
      category: 'armour',
      subtype: 'Medium',
      ap: 2,
      resists: 'Bleeding 1',
      value: 140,
      burden: 2,
      req: 'Carry 3',
      effect: 'Resists Bleeding 1',
      description: 'Interlinked steel rings worn over padding to foil slashing cuts.',
    },
  },
  {
    id: 'builtin-armour-breastplate',
    type: 'item',
    name: 'Breastplate',
    data: {
      category: 'armour',
      subtype: 'Medium',
      ap: 2,
      resists: 'Pierce 1',
      value: 180,
      burden: 2,
      req: 'Carry 3',
      effect: 'Resists Pierce 1',
      description: 'Shaped steel cuirass protecting the vitals of the torso.',
    },
  },
  {
    id: 'builtin-armour-half-plate',
    type: 'item',
    name: 'Half-Plate',
    data: {
      category: 'armour',
      subtype: 'Medium',
      ap: 3,
      resists: 'Pierce 1',
      value: 220,
      burden: 3,
      req: 'Carry 3',
      effect: 'Resists Pierce 1',
      description: 'Articulated plates covering chest, shoulders, and limbs over mail.',
    },
  },
  {
    id: 'builtin-armour-banded-mail',
    type: 'item',
    name: 'Banded Mail',
    data: {
      category: 'armour',
      subtype: 'Heavy',
      ap: 3,
      resists: 'Break 1, Pierce 1',
      value: 400,
      burden: 4,
      req: 'Carry 6',
      effect: 'Resists Break 1, Pierce 1',
      description: 'Overlapping metal lames backed by heavy mail and thick padding.',
    },
  },
  {
    id: 'builtin-armour-splint',
    type: 'item',
    name: 'Splint',
    data: {
      category: 'armour',
      subtype: 'Heavy',
      ap: 4,
      resists: 'Break 1, Pierce 1',
      value: 500,
      burden: 4,
      req: 'Carry 6',
      effect: 'Resists Break 1, Pierce 1',
      description: 'Vertical metal strips riveted onto stout leather for rigid defence.',
    },
  },
  {
    id: 'builtin-armour-full-plate',
    type: 'item',
    name: 'Full-Plate',
    data: {
      category: 'armour',
      subtype: 'Heavy',
      ap: 4,
      resists: 'Break 1, Pierce 2',
      value: 650,
      burden: 5,
      req: 'Carry 6',
      effect: 'Resists Break 1, Pierce 2',
      description: 'Head-to-toe forged steel harness offering unmatched battlefield protection.',
    },
  },
];
