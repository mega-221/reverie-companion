import type { CombatEncounterState } from '../types';

export function createInitialCombatEncounter(): CombatEncounterState {
  return {
    id: `combat-${Date.now()}`,
    active: false,
    round: 1,
    activeSide: 'ally',
    activeCombatantId: null,
    combatants: [],
    logs: [],
    updatedAt: new Date().toISOString(),
  };
}

export function getCombatStorageKey(partyId: string): string {
  return `reverie_party_combat_v1_${partyId}`;
}
