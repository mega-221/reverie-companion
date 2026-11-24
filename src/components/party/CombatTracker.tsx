import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type {
  Character,
  CombatAbility,
  Combatant,
  CombatantSide,
  CombatEncounterState,
  CombatLogEntry,
  CombatStatusKey,
  CustomNpc,
  PartyVitalsSyncPayload,
} from '../../types';
import type { SharedCharacterEntry } from '../../PartyDetail';
import { useCompendium } from '../../CompendiumContext';
import { useConfirm } from '../sheet/ConfirmDialog';
import { KeywordText } from '../common/KeywordText';
import { SpeedTagPills } from '../common/SpeedTagPills';
import { Tooltip } from '../sheet/utils';
import { getSpeedData, getTypeStyle } from '../sheet/utils';
import { loadNpcs } from '../../utils/npcStorage';
import { safeCharacterData, saveAndMirrorCharacter } from '../../utils/characterSync';
import { apMax, dpMax, strainMax, vigorMax } from '../../calc';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import {
  applyDestinyToSession,
  createRollSession,
  exertDieInSession,
  type ActiveRollSession,
} from '../../utils/diceRoller';
import DiscoRollOverlay from '../sheet/dice/DiscoRollOverlay';
import {
  type AttackResolution,
  COMBAT_STATUS_CATALOG,
  buildCombatantFromCharacter,
  buildCombatantFromNpc,
  getEffectiveEva,
  parseAbilityAcpCost,
  parseSignedMod,
  parseWeaponDamage,
  resolveCombatAttack,
} from '../../utils/combatMath';
import {
  createInitialCombatEncounter,
  getCombatStorageKey,
} from '../../utils/combatTrackerState';

function getStatusBadgeStyle(key: CombatStatusKey): string {
  switch (key) {
    case 'bleeding':
      return 'bg-red-950/70 border-red-700/80 text-red-300';
    case 'burn':
      return 'bg-orange-950/70 border-orange-700/80 text-orange-300';
    case 'soulburn':
      return 'bg-red-950/80 border-red-500/80 text-red-200';
    case 'stun':
      return 'bg-yellow-950/70 border-yellow-700/80 text-yellow-300';
    case 'fractured':
      return 'bg-blue-950/70 border-blue-700/80 text-blue-300';
    case 'feeble':
      return 'bg-gray-800/80 border-gray-600 text-gray-300';
    case 'prone':
      return 'bg-stone-800/80 border-stone-600 text-stone-300';
    case 'stealth':
      return 'bg-slate-800/80 border-slate-600 text-slate-300';
    case 'pierce':
    case 'break':
      return 'bg-zinc-800/80 border-zinc-600 text-zinc-300';
    case 'blind':
    case 'immobilized':
    case 'unaware':
      return 'bg-neutral-800/80 border-neutral-600 text-neutral-300';
    case 'taunt':
    case 'intimidate':
      return 'bg-rose-950/70 border-rose-700/80 text-rose-300';
    default:
      return 'bg-gray-800/80 border-gray-600 text-gray-300';
  }
}

export default function CombatTracker({
  partyId,
  userId,
  sharedChars,
  isLeader,
  incomingCombatSync,
  onBroadcastCombat,
  onSyncCharacterUpdate,
  onBroadcastVitals,
}: {
  partyId: string;
  userId: string;
  sharedChars: SharedCharacterEntry[];
  isLeader: boolean;
  incomingCombatSync: CombatEncounterState | null;
  onBroadcastCombat: (state: CombatEncounterState) => void;
  onSyncCharacterUpdate: (char: Character) => void;
  onBroadcastVitals: (payload: PartyVitalsSyncPayload) => void;
}) {
  const { getEntryByName, getAbilities } = useCompendium();
  const { askConfirm, confirmDialog } = useConfirm();

  const [encounter, setEncounter] = useState<CombatEncounterState>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(getCombatStorageKey(partyId));
        if (raw) return JSON.parse(raw) as CombatEncounterState;
      } catch {
        // ignore
      }
    }
    return createInitialCombatEncounter();
  });

  // Setup state
  const [savedNpcs, setSavedNpcs] = useState<CustomNpc[]>(() => loadNpcs(userId));
  const [selectedPcIds, setSelectedPcIds] = useState<Set<string>>(
    () => new Set(sharedChars.map((s) => s.character_id))
  );
  const [pcSideOverrides, setPcSideOverrides] = useState<Record<string, CombatantSide>>({});
  const [stagedNpcs, setStagedNpcs] = useState<{ npc: CustomNpc; side: CombatantSide; count: number }[]>([]);
  const [npcAddSide, setNpcAddSide] = useState<Record<string, CombatantSide>>({});
  const [npcAddCount, setNpcAddCount] = useState<Record<string, number>>({});

  // Inline quick custom combatant
  const [quickCustomOpen, setQuickCustomOpen] = useState(false);
  const [quickName, setQuickName] = useState('Brigand');
  const [quickSide, setQuickSide] = useState<CombatantSide>('enemy');
  const [quickVigor, setQuickVigor] = useState(6);
  const [quickAp, setQuickAp] = useState(1);
  const [quickEva, setQuickEva] = useState(10);
  const [quickDmg, setQuickDmg] = useState('3');
  const [quickRank, setQuickRank] = useState(1);

  // Active combat UI state
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [abilityTabByCombatant, setAbilityTabByCombatant] = useState<Record<string, 'all' | 'class' | 'basic'>>({});
  const [statusPickerFor, setStatusPickerFor] = useState<string | null>(null);
  const [statusKeyToAdd, setStatusKeyToAdd] = useState<CombatStatusKey>('bleeding');
  const [statusStacksInput, setStatusStacksInput] = useState<number>(1);
  const [addReinforcementOpen, setAddReinforcementOpen] = useState(false);
  const [showLogs, setShowLogs] = useState(true);

  // Attack Resolver modal state
  const [attackModal, setAttackModal] = useState<{
    attackerId: string;
    ability: CombatAbility | null;
    weaponId: string;
    targetIds: string[];
    flanking: number;
    isRanged: boolean;
    distanceMod: number;
    coverMod: number;
    speedMod: number;
    extraAcc: number;
    extraDmg: number;
    resolution: AttackResolution | null;
  } | null>(null);
  const [combatRollOverlay, setCombatRollOverlay] = useState<{
    session: ActiveRollSession;
    charName: string;
    currentStrain: number;
    strainMaxVal: number;
    currentDp: number;
    namedConvictions: { name: string; season: string; rank: number }[];
  } | null>(null);

  useBodyScrollLock(Boolean(attackModal) || addReinforcementOpen);
  useEscapeKey(Boolean(attackModal), () => setAttackModal(null));
  useEscapeKey(addReinforcementOpen, () => setAddReinforcementOpen(false));

  // Sync incoming remote combat broadcast
  useEffect(() => {
    if (!incomingCombatSync) return;
    if (incomingCombatSync.updatedAt === encounter.updatedAt) return;
    setEncounter(incomingCombatSync);
    try {
      window.localStorage.setItem(getCombatStorageKey(partyId), JSON.stringify(incomingCombatSync));
    } catch {
      // ignore
    }
  }, [incomingCombatSync, partyId]);

  useEffect(() => {
    setSavedNpcs(loadNpcs(userId));
  }, [userId]);

  // Keep default checked PCs updated when sharedChars first loads
  useEffect(() => {
    if (!encounter.active && sharedChars.length > 0 && selectedPcIds.size === 0) {
      setSelectedPcIds(new Set(sharedChars.map((s) => s.character_id)));
    }
  }, [sharedChars, encounter.active, selectedPcIds.size]);

  const commitEncounter = (updater: (prev: CombatEncounterState) => CombatEncounterState, broadcastSync = true) => {
    setEncounter((prev) => {
      const next = {
        ...updater(prev),
        updatedAt: new Date().toISOString(),
      };
      try {
        window.localStorage.setItem(getCombatStorageKey(partyId), JSON.stringify(next));
      } catch {
        // ignore
      }
      if (broadcastSync) {
        onBroadcastCombat(next);
      }
      return next;
    });
  };

  // Persist PC vital/AP changes to Supabase + broadcast party:vitals
  const syncPcStatsToDb = async (c: Combatant, updates: { vigor?: number; tmv?: number; strain?: number; dp?: number; ap?: number }) => {
    if (c.kind !== 'pc' || !c.sourceCharacterId) return;
    const entry = sharedChars.find((s) => s.character_id === c.sourceCharacterId);
    if (!entry?.character) return;

    const baseData = safeCharacterData(entry.character.data);
    const nextVigor = updates.vigor ?? c.vigor;
    const nextTmv = updates.tmv ?? c.tmv;
    const totalStoredVigor = nextVigor + Math.max(0, nextTmv);
    const nextStrain = updates.strain ?? c.strain;
    const nextDp = updates.dp ?? c.dp;
    const nextAp = updates.ap ?? c.ap;

    const nextData = {
      ...baseData,
      trackers: {
        ...baseData.trackers,
        vigor: totalStoredVigor,
        strain: nextStrain,
        dp: nextDp,
        ap: nextAp,
        apInitialized: true,
      },
    };

    const { error, updatedAt } = await saveAndMirrorCharacter({
      characterId: entry.character.id,
      name: entry.character.name,
      data: nextData,
    });

    if (!error) {
      onSyncCharacterUpdate({ ...entry.character, data: nextData, updated_at: updatedAt });
      onBroadcastVitals({
        character_id: entry.character.id,
        name: entry.character.name,
        vigor: totalStoredVigor,
        vigorMax: vigorMax(nextData),
        strain: nextStrain,
        strainMax: strainMax(nextData),
        dp: nextDp,
        dpMax: dpMax(nextData),
        ap: nextAp,
        apMax: apMax(nextData, getEntryByName),
        updated_at: updatedAt,
      });
    }
  };

  const handleStageNpc = (npc: CustomNpc) => {
    const side = npcAddSide[npc.id] || 'enemy';
    const count = Math.max(1, Math.min(20, npcAddCount[npc.id] || 1));
    setStagedNpcs((prev) => [...prev, { npc, side, count }]);
  };

  const handleAddQuickCombatant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) return;
    const now = new Date().toISOString();
    const adhocNpc: CustomNpc = {
      id: `quick-${Date.now()}`,
      name: quickName.trim(),
      role: 'Quick Combatant',
      className: '',
      path: '',
      tier: quickRank,
      classRank: quickRank,
      notes: '',
      stats: {
        vigorMax: Math.max(1, quickVigor),
        strainMax: 6,
        dpMax: 0,
        apMax: Math.max(0, quickAp),
        eva: quickEva,
        acc: 0,
        mov: 4,
        resists: '',
        armourName: '',
      },
      attributes: { grt: 1, ref: 1, int: 1, psy: 1 },
      skills: {},
      convictions: [],
      failings: [],
      abilities: [
        {
          id: `qab-${Date.now()}`,
          name: 'Strike',
          type: 'attack',
          speed: '>>',
          range: 'Adjacent',
          snCost: 0,
          acc: '+0',
          dmg: '+0',
          effect: 'Basic weapon or natural attack.',
        },
      ],
      items: [
        {
          id: `qit-${Date.now()}`,
          name: 'Primary Weapon',
          qty: 1,
          category: 'Weapon',
          dmg: quickDmg || '3',
          range: 'Adjacent',
          equippedSlot: 'mainHand',
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    if (encounter.active) {
      const created = buildCombatantFromNpc(adhocNpc, quickSide, adhocNpc.name);
      commitEncounter((prev) => ({
        ...prev,
        combatants: [...prev.combatants, created],
        logs: [
          {
            id: `log-${Date.now()}`,
            round: prev.round,
            text: `${created.name} (${quickSide}) joined the combat.`,
            tone: 'info' as const,
            createdAt: new Date().toISOString(),
          },
          ...prev.logs,
        ],
      }));
      setAddReinforcementOpen(false);
    } else {
      setStagedNpcs((prev) => [...prev, { npc: adhocNpc, side: quickSide, count: 1 }]);
      setQuickCustomOpen(false);
    }
  };

  const handleStartCombat = () => {
    const pcCombatants: Combatant[] = sharedChars
      .filter((s) => selectedPcIds.has(s.character_id))
      .map((s) => buildCombatantFromCharacter(s.character, pcSideOverrides[s.character_id] || 'ally', getEntryByName, getAbilities));

    const npcCombatants: Combatant[] = [];
    for (const item of stagedNpcs) {
      for (let i = 0; i < item.count; i++) {
        const displayName = item.count > 1 ? `${item.npc.name} #${i + 1}` : item.npc.name;
        npcCombatants.push(buildCombatantFromNpc(item.npc, item.side, displayName));
      }
    }

    const all = [...pcCombatants, ...npcCombatants];
    if (all.length === 0) return;

    setExpandedIds(new Set());
    commitEncounter(() => ({
      id: `combat-${Date.now()}`,
      active: true,
      round: 1,
      activeSide: 'ally',
      activeCombatantId: null,
      combatants: all,
      logs: [
        {
          id: `log-start-${Date.now()}`,
          round: 1,
          text: `Combat started (${all.length} combatants). Choose an actor for the turn.`,
          tone: 'info' as const,
          createdAt: new Date().toISOString(),
        },
      ],
      updatedAt: new Date().toISOString(),
    }));
  };

  // The acting side/character is chosen explicitly by the user.
  const handleNextTurn = () => {
    commitEncounter((prev) => {
      if (!prev.active || prev.combatants.length === 0) return prev;
      const updatedCombatants = prev.activeCombatantId
        ? prev.combatants.map((c) =>
            c.id === prev.activeCombatantId ? { ...c, hasActed: true } : c
          )
        : prev.combatants;
      const unacted = updatedCombatants.filter((c) => !c.hasActed);
      if (unacted.length > 0) {
        return {
          ...prev,
          activeCombatantId: null,
          combatants: updatedCombatants,
          logs: [
            {
              id: `log-turn-${Date.now()}`,
              round: prev.round,
              text: 'Actor turn completed. Choose the next combatant.',
              tone: 'info' as const,
              createdAt: new Date().toISOString(),
            },
            ...prev.logs,
          ].slice(0, 50),
        };
      }

      // Everyone has acted -> Advance Round & refresh economy
      const nextRound = prev.round + 1;
      const refreshedCombatants = updatedCombatants.map((c) => {
        const isProne = c.statuses.some((s) => s.key === 'prone');
        return {
          ...c,
          hasActed: false,
          moveUsed: isProne ? true : false,
          acpRemaining: isProne ? 1 : 3,
          reactionUsed: false,
        };
      });

      return {
        ...prev,
        round: nextRound,
        activeSide: 'ally',
        activeCombatantId: null,
        combatants: refreshedCombatants,
        logs: [
          {
            id: `log-r-${nextRound}-${Date.now()}`,
            round: nextRound,
            text: `Round ${nextRound} begins — action economy refreshed.`,
            tone: 'info' as const,
            createdAt: new Date().toISOString(),
          },
          ...prev.logs,
        ],
      };
    });
  };

  const handleEndCombat = async () => {
    const ok = await askConfirm({
      title: 'End Combat Encounter',
      message: 'End the current combat encounter? Depleted Armour Points (AP) on participating PCs will be restored to max.',
      confirmLabel: 'End Combat',
      tone: 'neutral' as const,
    });
    if (!ok) return;

    // Restore depleted AP for PCs per Reverie core rule
    for (const c of encounter.combatants) {
      if (c.kind === 'pc' && c.ap < c.apMax) {
        await syncPcStatsToDb(c, { ap: c.apMax });
      }
    }

    commitEncounter(() => createInitialCombatEncounter());
    setStagedNpcs([]);
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const adjustCombatantVital = (
    combatant: Combatant,
    field: 'vigor' | 'tmv' | 'strain' | 'dp' | 'ap',
    delta: number
  ) => {
    let nextVal = 0;
    if (field === 'vigor') nextVal = combatant.vigor + delta;
    else if (field === 'tmv') nextVal = Math.max(0, combatant.tmv + delta);
    else if (field === 'strain') nextVal = Math.max(0, combatant.strain + delta);
    else if (field === 'dp') nextVal = Math.max(0, combatant.dp + delta);
    else if (field === 'ap') nextVal = Math.max(0, combatant.ap + delta);

    commitEncounter((prev) => ({
      ...prev,
      combatants: prev.combatants.map((c) =>
        c.id === combatant.id ? { ...c, [field]: nextVal } : c
      ),
    }));

    if (combatant.kind === 'pc') {
      syncPcStatsToDb(combatant, { [field]: nextVal });
    }
  };

  const addStatusToCombatant = (combatantId: string, key: CombatStatusKey, stacks = 1) => {
    const meta = COMBAT_STATUS_CATALOG.find((s) => s.key === key);
    commitEncounter((prev) => ({
      ...prev,
      combatants: prev.combatants.map((c) => {
        if (c.id !== combatantId) return c;
        const existingIdx = c.statuses.findIndex((s) => s.key === key);
        const nextStatuses = [...c.statuses];
        if (existingIdx >= 0) {
          nextStatuses[existingIdx] = {
            key,
            stacks: meta?.hasStacks ? Math.max(1, (nextStatuses[existingIdx].stacks || 1) + stacks) : undefined,
          };
        } else {
          nextStatuses.push({ key, stacks: meta?.hasStacks ? Math.max(1, stacks) : undefined });
        }
        return {
          ...c,
          statuses: nextStatuses,
          reactionUsed: key === 'prone' ? true : c.reactionUsed,
        };
      }),
    }));
    setStatusPickerFor(null);
  };

  const removeStatusFromCombatant = (combatantId: string, key: CombatStatusKey) => {
    commitEncounter((prev) => ({
      ...prev,
      combatants: prev.combatants.map((c) =>
        c.id === combatantId ? { ...c, statuses: c.statuses.filter((s) => s.key !== key) } : c
      ),
    }));
  };

  const handleUseNonAttackAbility = (combatant: Combatant, ab: CombatAbility) => {
    const hasFractured = combatant.statuses.some((s) => s.key === 'fractured');
    const cost = parseAbilityAcpCost(ab.speed, hasFractured);
    const nextAcp = Math.max(0, combatant.acpRemaining - cost.acp);
    const nextStrain = combatant.strain + Math.max(0, ab.snCost || 0);

    commitEncounter((prev) => ({
      ...prev,
      combatants: prev.combatants.map((c) =>
        c.id === combatant.id
          ? {
              ...c,
              acpRemaining: nextAcp,
              reactionUsed: cost.isReaction ? true : c.reactionUsed,
              strain: nextStrain,
            }
          : c
      ),
      logs: [
        {
          id: `log-ab-${Date.now()}`,
          round: prev.round,
          text: `${combatant.name} used ${ab.name}${ab.snCost > 0 ? ` (${ab.snCost} SN)` : ''}.`,
          tone: 'info' as const,
          createdAt: new Date().toISOString(),
        },
        ...prev.logs,
      ],
    }));

    if (combatant.kind === 'pc' && ab.snCost > 0) {
      syncPcStatsToDb(combatant, { strain: nextStrain });
    }
  };

  const openAttackResolver = (attacker: Combatant, ability: CombatAbility | null) => {
    const weapons = attacker.equipmentList.filter(
      (e) => e.slot === 'mainHand' || e.slot === 'offHand' || (e.dmg && String(e.dmg).trim() !== '')
    );
    const defaultWeapon = weapons.find((w) => w.slot === 'mainHand') || weapons[0];
    const oppositeTargets = encounter.combatants.filter((c) => c.side !== attacker.side && c.vigor > -c.vigorMax);
    const defaultTarget = oppositeTargets[0]?.id ? [oppositeTargets[0].id] : [];
    const isRanged = /ranged|bow|crossbow|firearm|sling|thrown|close|medium|long/i.test(
      `${ability?.range || ''} ${defaultWeapon?.range || ''}`
    );

    setAttackModal({
      attackerId: attacker.id,
      ability,
      weaponId: defaultWeapon?.id || 'unarmed',
      targetIds: defaultTarget,
      flanking: 0,
      isRanged,
      distanceMod: 0,
      coverMod: 0,
      speedMod: 0,
      extraAcc: 0,
      extraDmg: 0,
      resolution: null,
    });
  };

  const runAttackRoll = () => {
    if (!attackModal) return;
    const attacker = encounter.combatants.find((c) => c.id === attackModal.attackerId);
    if (!attacker) return;
    const targets = encounter.combatants.filter((c) => attackModal.targetIds.includes(c.id));
    if (targets.length === 0) return;

    const rangedModifier = attackModal.isRanged
      ? attackModal.distanceMod + attackModal.coverMod + attackModal.speedMod
      : 0;
    const baseModifiers = [
      { label: 'Class Rank', value: attacker.classRank },
      { label: 'Accuracy', value: attacker.acc },
      { label: 'Ability / Mod', value: (parseSignedMod(attackModal.ability?.acc) + attackModal.extraAcc + rangedModifier) },
      { label: 'Flanking', value: attackModal.flanking },
    ].filter((modifier) => modifier.value !== 0);

    const session = createRollSession({
      category: 'combat',
      title: attackModal.ability?.name || 'Combat Attack',
      subtitle: `${attacker.name} · 3d6 vs target Evasion`,
      accentColor: '#f59e0b',
      accentTag: 'COMBAT',
      diceSizes: ['d6', 'd6', 'd6'],
      baseModifiers,
      targetLabel: targets.length === 1 ? targets[0].name : `${targets.length} targets`,
    });

    const sourceCharacter = attacker.sourceCharacterId
      ? sharedChars.find((entry) => entry.character_id === attacker.sourceCharacterId)?.character
      : null;
    setCombatRollOverlay({
      session,
      charName: attacker.name,
      currentStrain: attacker.strain,
      strainMaxVal: attacker.strainMax,
      currentDp: attacker.dp,
      namedConvictions: sourceCharacter?.data.convictions
        ?.filter((conviction) => conviction.name)
        .map((conviction) => ({
          name: conviction.name,
          season: conviction.season,
          rank: conviction.rank,
        })) || [],
    });
  };

  const applyAttackResolution = async () => {
    if (!attackModal?.resolution) return;
    const attacker = encounter.combatants.find((c) => c.id === attackModal.attackerId);
    if (!attacker) return;

    const res = attackModal.resolution;
    const hasFractured = attacker.statuses.some((s) => s.key === 'fractured');
    const cost = parseAbilityAcpCost(attackModal.ability?.speed, hasFractured);
    const nextAcp = Math.max(0, attacker.acpRemaining - cost.acp);
    const nextStrain = attacker.strain + Math.max(0, attackModal.ability?.snCost || 0);

    const outcomeByTargetId = new Map(res.outcomes.map((o) => [o.targetId, o]));
    const updatedPcs: { combatant: Combatant; updates: { vigor?: number; tmv?: number; strain?: number; ap?: number } }[] = [];

    const logLines: string[] = [];
    for (const o of res.outcomes) {
      if (o.hit) {
        logLines.push(
          `${attacker.name} hit ${o.targetName} (${res.totalRoll} vs EVA ${o.effectiveEva}, +${o.overflow} overflow) → ${o.vigorLost} VG DMG${o.tmvAbsorbed > 0 ? `, ${o.tmvAbsorbed} TMV` : ''}${o.apBroken > 0 ? `, -${o.apBroken} AP` : ''}`
        );
      } else {
        logLines.push(`${attacker.name} missed ${o.targetName} (${res.totalRoll} vs EVA ${o.effectiveEva})`);
      }
    }

    commitEncounter((prev) => {
      const nextCombatants = prev.combatants.map((c) => {
        if (c.id === attacker.id) {
          const updatedAttacker = {
            ...c,
            acpRemaining: nextAcp,
            reactionUsed: cost.isReaction ? true : c.reactionUsed,
            strain: nextStrain,
          };
          if (c.kind === 'pc' && (attackModal.ability?.snCost || 0) > 0) {
            updatedPcs.push({ combatant: c, updates: { strain: nextStrain } });
          }
          return updatedAttacker;
        }

        const out = outcomeByTargetId.get(c.id);
        if (!out || !out.hit) return c;

        const nextVigor = c.vigor - out.vigorLost;
        const nextTmv = Math.max(0, c.tmv - out.tmvAbsorbed);
        const nextAp = Math.max(0, c.ap - out.apBroken);
        // Taking hit clears Unaware
        const nextStatuses = c.statuses.filter((s) => s.key !== 'unaware');

        if (c.kind === 'pc') {
          updatedPcs.push({
            combatant: c,
            updates: { vigor: nextVigor, tmv: nextTmv, ap: nextAp },
          });
        }

        return {
          ...c,
          vigor: nextVigor,
          tmv: nextTmv,
          ap: nextAp,
          statuses: nextStatuses,
        };
      });

      const newLogEntries: CombatLogEntry[] = logLines.map((text, idx) => ({
        id: `log-atk-${Date.now()}-${idx}`,
        round: prev.round,
        text,
        tone: res.outcomes.some((o) => o.hit) ? 'hit' : 'miss',
        createdAt: new Date().toISOString(),
      }));

      return {
        ...prev,
        combatants: nextCombatants,
        logs: [...newLogEntries, ...prev.logs].slice(0, 60),
      };
    });

    for (const item of updatedPcs) {
      await syncPcStatsToDb(item.combatant, item.updates);
    }

    setAttackModal(null);
  };

  const allies = useMemo(() => encounter.combatants.filter((c) => c.side === 'ally'), [encounter.combatants]);
  const enemies = useMemo(() => encounter.combatants.filter((c) => c.side === 'enemy'), [encounter.combatants]);
  const activeCombatant = useMemo(
    () => encounter.combatants.find((c) => c.id === encounter.activeCombatantId) || null,
    [encounter.combatants, encounter.activeCombatantId]
  );

  // Helper to render compact expandable Combatant card
  const renderCombatantCard = (c: Combatant) => {
    const isCurrentTurn = encounter.activeCombatantId === c.id;
    const isExpanded = expandedIds.has(c.id);
    const hasFractured = c.statuses.some((s) => s.key === 'fractured');
    const effectiveEva = getEffectiveEva(c);
    const activeAbTab = abilityTabByCombatant[c.id] || 'all';
    const filteredAbilities = c.abilities.filter((a) => {
      if (activeAbTab === 'class') return a.sourceKind === 'class' || a.sourceKind === 'discipline' || a.sourceKind === 'npc';
      if (activeAbTab === 'basic') return a.sourceKind === 'basic';
      return true;
    });

    const isDown = c.vigor <= 0;

    return (
      <div
        key={c.id}
        className={`sheet-panel transition-all overflow-hidden ${isDown ? 'opacity-75' : ''}`}
        style={{
          borderColor: isCurrentTurn ? 'var(--rev-accent)' : undefined,
          boxShadow: isCurrentTurn ? '0 0 0 1px var(--rev-accent)' : undefined,
        }}
      >
        {/* Collapsed Compact Header Row */}
        <div
          onClick={() => toggleExpand(c.id)}
          className="px-3.5 py-2.5 flex flex-col gap-2 cursor-pointer hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isCurrentTurn
                    ? 'bg-emerald-400 animate-pulse'
                    : c.hasActed
                    ? 'bg-gray-600'
                    : c.side === 'ally'
                    ? 'bg-sky-400'
                    : 'bg-red-500'
                }`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-spectral font-bold text-base truncate" style={{ color: 'var(--rev-text-bright)' }}>
                    {c.name}
                  </span>
                  {isCurrentTurn && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-950/80 border border-emerald-600 text-emerald-300">
                      Active Turn
                    </span>
                  )}
                  {c.hasActed && !isCurrentTurn && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-black/40 border border-gray-700 text-gray-400">
                      Acted
                    </span>
                  )}
                </div>
                <div className="text-[11px] truncate" style={{ color: 'var(--rev-text-muted)' }}>
                  {c.subtitle} · EVA <strong style={{ color: 'var(--rev-text-bright)' }}>{effectiveEva}</strong>
                  {c.statuses.some((s) => s.key === 'unaware') ? ' (Unaware)' : ''}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              {!isCurrentTurn && !c.hasActed && (
                <button
                  type="button"
                  onClick={() =>
                    commitEncounter((prev) => ({
                      ...prev,
                      activeSide: c.side,
                      activeCombatantId: c.id,
                    }))
                  }
                  className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider rev-btn-secondary"
                  title="Make this combatant the actor"
                >
                  Make Actor
                </button>
              )}
              <button
                type="button"
                onClick={() => openAttackResolver(c, c.abilities.find((a) => a.type === 'attack') || null)}
                className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider rev-btn-primary"
                title="Make an attack roll"
              >
                Attack
              </button>
              <button
                type="button"
                onClick={() => toggleExpand(c.id)}
                className="px-1.5 py-1 text-xs font-bold"
                style={{ color: 'var(--rev-text-muted)' }}
                aria-label={isExpanded ? 'Collapse combatant' : 'Expand combatant'}
              >
                {isExpanded ? '▲' : '▼'}
              </button>
            </div>
          </div>

          {/* Compact Vitals & Turn Economy Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] tabular-nums">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-1.5 py-0.5 rounded bg-black/35 border border-gray-700/80 font-bold ${
                c.vigor <= -c.vigorMax
                  ? 'rev-keep-color text-gray-400 border-gray-600'
                  : c.vigor <= 0
                  ? 'rev-keep-color bg-red-950/70 border-red-800 text-red-400'
                  : c.vigor <= c.vigorMax / 2
                  ? 'rev-keep-color bg-red-950/45 border-red-900/70 text-red-300'
                  : 'rev-keep-color bg-red-950/25 border-red-900/50 text-red-200'
              }`}>
                VG {c.vigor}/{c.vigorMax}
              </span>
              {c.tmv > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-teal-950/70 border border-teal-700 text-teal-300 font-bold">
                  +{c.tmv} TMV
                </span>
              )}
              <span className={`px-1.5 py-0.5 rounded bg-black/35 border border-gray-700/80 font-bold ${
                c.strain >= c.strainMax * 2
                  ? 'rev-keep-color bg-purple-950/70 border-purple-700 text-purple-300'
                  : c.strain >= c.strainMax
                  ? 'rev-keep-color bg-blue-950/70 border-blue-700 text-blue-300'
                  : 'rev-keep-color bg-blue-950/35 border-blue-900/60 text-blue-200'
              }`}>
                SN {c.strain}/{c.strainMax}
              </span>
              {c.dpMax > 0 && (
                <span className={`px-1.5 py-0.5 rounded bg-black/35 border border-gray-700/80 font-bold ${
                  c.dp >= c.dpMax
                    ? 'rev-keep-color bg-cyan-950/70 border-cyan-700 text-cyan-300'
                    : c.dp >= c.dpMax / 2
                    ? 'rev-keep-color bg-yellow-950/60 border-yellow-700 text-yellow-300'
                    : 'rev-keep-color bg-yellow-950/25 border-yellow-900/60 text-yellow-200'
                }`}>
                  DP {c.dp}/{c.dpMax}
                </span>
              )}
              <span className={`px-1.5 py-0.5 rounded bg-black/35 border border-gray-700/80 font-bold ${
                c.apMax > 0 && c.ap < c.apMax
                  ? 'rev-keep-color bg-amber-950/60 border-amber-700 text-amber-300'
                  : c.ap > c.apMax
                  ? 'rev-keep-color bg-cyan-950/70 border-cyan-700 text-cyan-300'
                  : 'rev-keep-color bg-cyan-950/35 border-cyan-900/60 text-cyan-200'
              }`}>
                AP {c.ap}/{c.apMax}
              </span>
            </div>

            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() =>
                  commitEncounter((prev) => ({
                    ...prev,
                    combatants: prev.combatants.map((x) => (x.id === c.id ? { ...x, moveUsed: !x.moveUsed } : x)),
                  }))
                }
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                  c.moveUsed ? 'bg-black/40 border-gray-800 text-gray-500 line-through' : 'bg-emerald-950/50 border-emerald-700/70 text-emerald-300'
                }`}
                title="Toggle 1 Movement Action"
              >
                Move
              </button>
              <button
                type="button"
                onClick={() =>
                  commitEncounter((prev) => ({
                    ...prev,
                    combatants: prev.combatants.map((x) =>
                      x.id === c.id ? { ...x, acpRemaining: (x.acpRemaining + 3) % 4 } : x
                    ),
                  }))
                }
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                  c.acpRemaining === 0 ? 'bg-black/40 border-gray-800 text-gray-500' : 'bg-amber-950/50 border-amber-700/70 text-amber-300'
                }`}
                title="Click to cycle remaining ACP (0–3)"
              >
                ACP {c.acpRemaining}/3
              </button>
              <button
                type="button"
                onClick={() =>
                  commitEncounter((prev) => ({
                    ...prev,
                    combatants: prev.combatants.map((x) => (x.id === c.id ? { ...x, reactionUsed: !x.reactionUsed } : x)),
                  }))
                }
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                  c.reactionUsed ? 'bg-black/40 border-gray-800 text-gray-500 line-through' : 'bg-sky-950/50 border-sky-700/70 text-sky-300'
                }`}
                title="Toggle 1 Reaction"
              >
                React
              </button>
            </div>
          </div>

          {/* Active Status Effect Badges */}
          {c.statuses.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5" onClick={(e) => e.stopPropagation()}>
              {c.statuses.map((st) => {
                const meta = COMBAT_STATUS_CATALOG.find((m) => m.key === st.key);
                return (
                  <Tooltip key={st.key} title={meta?.label || st.key} text={meta?.summary || ''} inline noBorder>
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${getStatusBadgeStyle(st.key)}`}>
                      <span>
                        {meta?.label || st.key}
                        {st.stacks !== undefined ? ` ${st.stacks}` : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeStatusFromCombatant(c.id, st.key)}
                        className="hover:text-white leading-none ml-0.5"
                        aria-label={`Remove ${st.key}`}
                      >
                        ×
                      </button>
                    </span>
                  </Tooltip>
                );
              })}
            </div>
          )}
        </div>

        {/* EXPANDED COMPACT DRAWER: Vitals + Equipment + Active Abilities */}
        {isExpanded && (
          <div className="border-t rev-divider rev-inset p-3.5 space-y-3 text-xs">
            {/* 1. Quick Vitals & Status Steppers */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(
                [
                  { field: 'vigor', label: 'Vigor', val: c.vigor, max: c.vigorMax },
                  { field: 'tmv', label: 'TMV', val: c.tmv, max: null },
                  { field: 'strain', label: 'Strain', val: c.strain, max: c.strainMax },
                  { field: 'ap', label: 'Armour AP', val: c.ap, max: c.apMax },
                  { field: 'dp', label: 'Destiny DP', val: c.dp, max: c.dpMax },
                ] as const
              ).map((item) => (
                <div key={item.field} className="bg-black/30 border border-gray-700/60 rounded p-1.5 flex flex-col items-center gap-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--rev-text-muted)' }}>
                    {item.label}
                  </span>
                  <div className="flex items-center gap-1.5 tabular-nums">
                    <button
                      type="button"
                      onClick={() => adjustCombatantVital(c, item.field, -1)}
                      className="w-5 h-5 rounded bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold"
                    >
                      −
                    </button>
                    <span className="font-bold text-xs text-white">
                      {item.val}
                      {item.max !== null ? <span className="text-[10px] text-gray-500">/{item.max}</span> : null}
                    </span>
                    <button
                      type="button"
                      onClick={() => adjustCombatantVital(c, item.field, 1)}
                      className="w-5 h-5 rounded bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Status Adder */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-black/20 rounded px-2.5 py-2 border border-gray-700/40">
              <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--rev-text-muted)' }}>
                <span>Rank <strong className="text-white">{c.classRank}</strong></span>
                <span>·</span>
                <span>ACC <strong className="text-white">{c.acc >= 0 ? `+${c.acc}` : c.acc}</strong></span>
                <span>·</span>
                <span>MOV <strong className="text-white">{c.mov}</strong></span>
                {c.resists && (
                  <>
                    <span>·</span>
                    <span className="text-amber-300">Resists: {c.resists}</span>
                  </>
                )}
              </div>

              {statusPickerFor === c.id ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <select
                    value={statusKeyToAdd}
                    onChange={(e) => setStatusKeyToAdd(e.target.value as CombatStatusKey)}
                    className="rev-input px-2 py-1 text-[11px] font-bold"
                  >
                    {COMBAT_STATUS_CATALOG.map((s) => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                  </select>
                  {COMBAT_STATUS_CATALOG.find((s) => s.key === statusKeyToAdd)?.hasStacks && (
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={statusStacksInput}
                      onChange={(e) => setStatusStacksInput(Math.max(1, Number(e.target.value) || 1))}
                      className="w-12 rev-input px-1.5 py-1 text-[11px] text-center tabular-nums"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => addStatusToCombatant(c.id, statusKeyToAdd, statusStacksInput)}
                    className="rev-btn-primary px-2 py-1 text-[10px] font-bold"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusPickerFor(null)}
                    className="rev-btn-secondary px-2 py-1 text-[10px] font-bold"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setStatusKeyToAdd('bleeding');
                    setStatusStacksInput(1);
                    setStatusPickerFor(c.id);
                  }}
                  className="rev-btn-secondary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
                >
                  + Status
                </button>
              )}
            </div>

            {/* 2. Equipment & Mode */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--rev-text-muted)' }}>
                  Current Equipment
                </span>
                <div className="flex items-center gap-1">
                  {(['1H', '2H'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() =>
                        commitEncounter((prev) => ({
                          ...prev,
                          combatants: prev.combatants.map((x) => (x.id === c.id ? { ...x, mainHandMode: mode } : x)),
                        }))
                      }
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                        c.mainHandMode === mode ? 'rev-btn-primary' : 'rev-btn-secondary opacity-70'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {c.equipmentList.length === 0 ? (
                <p className="text-[11px] italic" style={{ color: 'var(--rev-text-faint)' }}>No equipment equipped.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {c.equipmentList.map((eq) => (
                    <div key={`${eq.slot}-${eq.id}`} className="bg-black/25 border border-gray-700/50 rounded px-2.5 py-1.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] uppercase font-bold tracking-wider px-1 py-0.2 rounded bg-gray-800 text-gray-400">
                            {eq.slot === 'mainHand' ? 'Main' : eq.slot === 'offHand' ? 'Off' : eq.slot === 'armour' ? 'Armour' : 'Extra'}
                          </span>
                          <span className="font-semibold truncate text-gray-100">{eq.name}</span>
                        </div>
                        {eq.effect && (
                          <div className="text-[10px] truncate mt-0.5" style={{ color: 'var(--rev-text-muted)' }}>
                            <KeywordText text={eq.effect} mode="effect" />
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] font-bold tabular-nums shrink-0 text-right">
                        {eq.dmg && <div className="text-red-300">DMG {parseWeaponDamage(eq.dmg, c.mainHandMode)}</div>}
                        {eq.ap ? <div className="text-cyan-300">AP {eq.ap}</div> : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Active Abilities */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--rev-text-muted)' }}>
                  Active Abilities ({filteredAbilities.length})
                </span>
                <div className="flex items-center gap-1">
                  {(['all', 'class', 'basic'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setAbilityTabByCombatant((prev) => ({ ...prev, [c.id]: tab }))}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        activeAbTab === tab ? 'rev-btn-primary' : 'rev-btn-secondary opacity-70'
                      }`}
                    >
                      {tab === 'all' ? 'All' : tab === 'class' ? 'Unique' : 'Basic'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                {filteredAbilities.map((ab) => {
                  const speedData = ab.speed ? getSpeedData(ab.speed, ab.upkeep) : null;
                  const cost = parseAbilityAcpCost(ab.speed, hasFractured);
                  const isAttack = ab.type === 'attack';

                  return (
                    <div
                      key={ab.id}
                      className={`bg-black/25 border border-gray-700/60 rounded px-2.5 py-2 flex flex-col gap-1 ${
                        ab.locked ? 'opacity-45' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                          <span className="font-bold text-gray-100 truncate">{ab.name}</span>
                          <span className={`rev-ability-pill ${getTypeStyle(ab.type)}`}>{ab.type}</span>
                          <SpeedTagPills speedData={speedData} />
                          {ab.snCost > 0 && (
                            <span className="rev-ability-pill bg-blue-950/60 border-blue-700 text-blue-300">
                              {ab.snCost} SN
                            </span>
                          )}
                          {ab.acc && (
                            <span className="rev-ability-pill bg-green-950/60 border-green-700 text-green-300">
                              {ab.acc} ACC
                            </span>
                          )}
                          {ab.dmg && (
                            <span className="rev-ability-pill bg-red-950/60 border-red-700 text-red-300">
                              {ab.dmg} DMG
                            </span>
                          )}
                        </div>

                        {ab.type !== 'passive' && (
                          <button
                            type="button"
                            onClick={() => (isAttack ? openAttackResolver(c, ab) : handleUseNonAttackAbility(c, ab))}
                            disabled={
                              ab.locked ||
                              (cost.isReaction ? c.reactionUsed : c.acpRemaining < cost.acp)
                            }
                            className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 disabled:opacity-40 ${
                              isAttack ? 'rev-btn-primary' : 'rev-btn-secondary'
                            }`}
                          >
                            {isAttack ? 'Roll Attack' : 'Use'}
                          </button>
                        )}
                      </div>

                      {ab.effect && (
                        <div className="text-[11px] leading-snug" style={{ color: 'var(--rev-text-secondary)' }}>
                          <KeywordText text={ab.effect} mode="effect" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full space-y-6">
      {confirmDialog}

      {!encounter.active ? (
        /* ========================= SETUP VIEW ========================= */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Participating Party Characters */}
          <div className="lg:col-span-5 sheet-panel p-5 space-y-4">
            <div className="flex items-center justify-between border-b rev-divider pb-2.5">
              <h3 className="font-spectral font-bold text-lg" style={{ color: 'var(--rev-text-bright)' }}>
                Party Characters ({selectedPcIds.size}/{sharedChars.length})
              </h3>
              <button
                type="button"
                onClick={() =>
                  setSelectedPcIds((prev) =>
                    prev.size === sharedChars.length
                      ? new Set()
                      : new Set(sharedChars.map((s) => s.character_id))
                  )
                }
                className="text-xs font-bold hover:underline"
                style={{ color: 'var(--rev-accent-text)' }}
              >
                {selectedPcIds.size === sharedChars.length ? 'Clear All' : 'Select All'}
              </button>
            </div>

            {sharedChars.length === 0 ? (
              <p className="text-xs italic py-4 text-center" style={{ color: 'var(--rev-text-muted)' }}>
                No shared characters in this party yet.
              </p>
            ) : (
              <div className="space-y-2">
                {sharedChars.map((s) => {
                  const c = s.character;
                  const data = safeCharacterData(c.data);
                  const checked = selectedPcIds.has(c.id);
                  const side = pcSideOverrides[c.id] || 'ally';
                  return (
                    <div
                      key={c.id}
                      onClick={() =>
                        setSelectedPcIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(c.id)) next.delete(c.id);
                          else next.add(c.id);
                          return next;
                        })
                      }
                      className="rev-card p-3 flex items-center justify-between gap-2 cursor-pointer"
                      style={{
                        borderColor: checked ? 'var(--rev-accent-border)' : undefined,
                        backgroundColor: checked ? 'var(--rev-accent-soft)' : undefined,
                      }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {}}
                          style={{ accentColor: 'var(--rev-accent)' }}
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-sm truncate" style={{ color: 'var(--rev-text-bright)' }}>
                            {c.name}
                          </div>
                          <div className="text-[11px] truncate tabular-nums" style={{ color: 'var(--rev-text-muted)' }}>
                            VG {data.trackers.vigor}/{vigorMax(data)} · AP {data.trackers.ap}/{apMax(data, getEntryByName)} · REF {data.attributes.ref}
                          </div>
                        </div>
                      </div>
                      <select
                        value={side}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          setPcSideOverrides((prev) => ({
                            ...prev,
                            [c.id]: e.target.value as CombatantSide,
                          }))
                        }
                        className="rev-input px-2 py-1 text-[11px] font-bold"
                      >
                        <option value="ally">Ally</option>
                        <option value="enemy">Enemy</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add NPCs from Library & Start Combat */}
          <div className="lg:col-span-7 space-y-5">
            <div className="sheet-panel p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b rev-divider pb-2.5">
                <h3 className="font-spectral font-bold text-lg" style={{ color: 'var(--rev-text-bright)' }}>
                  Add NPCs &amp; Enemies
                </h3>
                <button
                  type="button"
                  onClick={() => setQuickCustomOpen((p) => !p)}
                  className="rev-btn-secondary px-3 py-1 text-xs font-bold"
                >
                  {quickCustomOpen ? 'Close Quick Form' : '+ Quick Custom Combatant'}
                </button>
              </div>

              {quickCustomOpen && (
                <form onSubmit={handleAddQuickCombatant} className="rev-inset p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <input
                    type="text"
                    value={quickName}
                    onChange={(e) => setQuickName(e.target.value)}
                    placeholder="Name"
                    className="rev-input px-2.5 py-1.5 text-xs sm:col-span-2"
                    required
                  />
                  <select
                    value={quickSide}
                    onChange={(e) => setQuickSide(e.target.value as CombatantSide)}
                    className="rev-input px-2 py-1.5 text-xs font-bold"
                  >
                    <option value="enemy">Enemy</option>
                    <option value="ally">Ally</option>
                  </select>
                  <input
                    type="number"
                    value={quickVigor}
                    onChange={(e) => setQuickVigor(Math.max(1, Number(e.target.value) || 1))}
                    placeholder="VG"
                    title="Vigor Max"
                    className="rev-input px-2 py-1.5 text-xs text-center tabular-nums"
                  />
                  <input
                    type="number"
                    value={quickAp}
                    onChange={(e) => setQuickAp(Math.max(0, Number(e.target.value) || 0))}
                    placeholder="AP"
                    title="Armour AP"
                    className="rev-input px-2 py-1.5 text-xs text-center tabular-nums"
                  />
                  <input
                    type="number"
                    value={quickEva}
                    onChange={(e) => setQuickEva(Number(e.target.value) || 10)}
                    placeholder="EVA"
                    title="Evasion"
                    className="rev-input px-2 py-1.5 text-xs text-center tabular-nums"
                  />
                  <input
                    type="text"
                    value={quickDmg}
                    onChange={(e) => setQuickDmg(e.target.value)}
                    placeholder="DMG"
                    title="Weapon Damage"
                    className="rev-input px-2 py-1.5 text-xs text-center"
                  />
                  <input
                    type="number"
                    min={0}
                    max={6}
                    value={quickRank}
                    onChange={(e) => setQuickRank(Math.max(0, Number(e.target.value) || 0))}
                    placeholder="Rank"
                    title="Class Rank"
                    className="rev-input px-2 py-1.5 text-xs text-center tabular-nums"
                  />
                  <button type="submit" className="rev-btn-primary px-3 py-1.5 text-xs font-bold sm:col-span-4">
                    Add Quick Combatant
                  </button>
                </form>
              )}

              {savedNpcs.length === 0 ? (
                <p className="text-xs italic py-2" style={{ color: 'var(--rev-text-muted)' }}>
                  No saved creatures in your NPC Creator yet. Use &ldquo;NPC Creator&rdquo; in the main menu or &ldquo;+ Quick Custom Combatant&rdquo; above.
                </p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                  {savedNpcs.map((npc) => (
                    <div key={npc.id} className="rev-inset p-2.5 flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-sm truncate" style={{ color: 'var(--rev-text-bright)' }}>
                          {npc.name}
                        </div>
                        <div className="text-[11px] tabular-nums" style={{ color: 'var(--rev-text-muted)' }}>
                          {npc.role || 'Creature'} · VG {npc.stats.vigorMax} · AP {npc.stats.apMax} · EVA {npc.stats.eva} · REF {npc.attributes.ref}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <select
                          value={npcAddSide[npc.id] || 'enemy'}
                          onChange={(e) => setNpcAddSide((p) => ({ ...p, [npc.id]: e.target.value as CombatantSide }))}
                          className="rev-input px-2 py-1 text-xs font-bold"
                        >
                          <option value="enemy">Enemy</option>
                          <option value="ally">Ally</option>
                        </select>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={npcAddCount[npc.id] || 1}
                          onChange={(e) => setNpcAddCount((p) => ({ ...p, [npc.id]: Math.max(1, Number(e.target.value) || 1) }))}
                          className="w-12 rev-input px-1.5 py-1 text-xs text-center tabular-nums"
                        />
                        <button
                          type="button"
                          onClick={() => handleStageNpc(npc)}
                          className="rev-btn-primary px-3 py-1 text-xs font-bold"
                        >
                          + Add
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Staged NPCs */}
              {stagedNpcs.length > 0 && (
                <div className="pt-2 border-t rev-divider-subtle space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--rev-text-muted)' }}>
                    Staged Creatures
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {stagedNpcs.map((item, idx) => (
                      <div key={idx} className="rev-card px-3 py-1.5 flex items-center gap-2 text-xs">
                        <span className={`font-bold uppercase text-[10px] ${item.side === 'ally' ? 'text-sky-300' : 'text-red-400'}`}>
                          {item.side}
                        </span>
                        <span className="font-bold text-gray-100">
                          {item.count > 1 ? `${item.count}× ` : ''}{item.npc.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => setStagedNpcs((prev) => prev.filter((_, i) => i !== idx))}
                          className="rev-icon-btn rev-icon-btn-danger text-sm"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Start Encounter Box */}
            <div className="sheet-panel p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--rev-text-muted)' }}>
                  Actor Selection
                </div>
                <p className="text-xs" style={{ color: 'var(--rev-text-secondary)' }}>
                  Choose any staged combatant to act. The next actor is never predetermined.
                </p>
              </div>

              <button
                type="button"
                onClick={handleStartCombat}
                disabled={selectedPcIds.size === 0 && stagedNpcs.length === 0}
                className="rev-btn-primary px-6 py-3 font-bold text-sm shadow-sm disabled:opacity-40 shrink-0"
              >
                Start Combat Encounter →
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ========================= ACTIVE COMBAT VIEW ========================= */
        <div className="space-y-5">
          {/* Round & Actor Banner */}
          <div className="sheet-panel p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="rev-inset px-4 py-2 text-center">
                <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--rev-text-muted)' }}>
                  Round
                </div>
                <div className="font-spectral font-bold text-2xl leading-none tabular-nums" style={{ color: 'var(--rev-text-bright)' }}>
                  {encounter.round}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--rev-accent-text)' }}>
                  {activeCombatant ? (activeCombatant.side === 'ally' ? 'Allied Actor' : 'Enemy Actor') : 'No Actor Selected'}
                </div>
                <div className="font-spectral font-bold text-xl" style={{ color: 'var(--rev-text-bright)' }}>
                  {activeCombatant ? activeCombatant.name : 'Select Combatant'}
                </div>
                <div className="text-xs" style={{ color: 'var(--rev-text-muted)' }}>
                  Choose any combatant as actor, regardless of side.
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowLogs((p) => !p)}
                className="rev-btn-secondary px-3 py-2 text-xs font-bold"
              >
                {showLogs ? 'Hide Log' : `Combat Log (${encounter.logs.length})`}
              </button>
              <button
                type="button"
                onClick={() => setAddReinforcementOpen(true)}
                className="rev-btn-secondary px-3 py-2 text-xs font-bold"
              >
                + Add Combatant
              </button>
              <button
                type="button"
                onClick={handleNextTurn}
                disabled={!activeCombatant}
                className="rev-btn-primary px-4 py-2 text-xs sm:text-sm font-bold shadow-sm disabled:opacity-40"
              >
                {activeCombatant ? 'Complete Actor Turn' : 'Select Actor'}
              </button>
              {(isLeader || encounter.combatants.length > 0) && (
                <button
                  type="button"
                  onClick={handleEndCombat}
                  className="px-3 py-2 text-xs font-bold rounded border border-red-800/70 bg-red-950/50 text-red-300 hover:bg-red-900/50 transition-colors"
                >
                  End Combat
                </button>
              )}
            </div>
          </div>

          {/* Allies vs Enemies Columns */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b rev-divider pb-1.5">
                <h3 className="font-spectral font-bold text-lg text-sky-300">
                  Allies ({allies.filter((c) => !c.hasActed).length}/{allies.length} unacted)
                </h3>
              </div>
              {allies.length === 0 ? (
                <div className="sheet-panel p-6 text-center text-xs italic" style={{ color: 'var(--rev-text-muted)' }}>
                  No allied combatants.
                </div>
              ) : (
                allies.map(renderCombatantCard)
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between border-b rev-divider pb-1.5">
                <h3 className="font-spectral font-bold text-lg text-red-400">
                  Enemies ({enemies.filter((c) => !c.hasActed).length}/{enemies.length} unacted)
                </h3>
              </div>
              {enemies.length === 0 ? (
                <div className="sheet-panel p-6 text-center text-xs italic" style={{ color: 'var(--rev-text-muted)' }}>
                  No enemy combatants.
                </div>
              ) : (
                enemies.map(renderCombatantCard)
              )}
            </div>
          </div>

          {/* Combat Log */}
          {showLogs && encounter.logs.length > 0 && (
            <div className="sheet-panel p-4 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--rev-text-muted)' }}>
                Encounter Log
              </span>
              <div className="max-h-40 overflow-y-auto space-y-1 pr-1 custom-scrollbar text-xs">
                {encounter.logs.map((entry) => (
                  <div
                    key={entry.id}
                    className={`px-2.5 py-1 rounded bg-black/25 border border-gray-800 ${
                      entry.tone === 'hit'
                        ? 'text-emerald-300'
                        : entry.tone === 'miss'
                        ? 'text-red-300'
                        : 'text-gray-300'
                    }`}
                  >
                    <span className="font-bold text-gray-500 mr-2">[R{entry.round}]</span>
                    {entry.text}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================= ATTACK RESOLVER MODAL ========================= */}
      {attackModal && (() => {
        const attacker = encounter.combatants.find((c) => c.id === attackModal.attackerId);
        if (!attacker) return null;
        const attackAbilities = attacker.abilities.filter((a) => a.type === 'attack');
        const weapons = attacker.equipmentList.filter(
          (e) => e.slot === 'mainHand' || e.slot === 'offHand' || (e.dmg && String(e.dmg).trim() !== '')
        );
        const potentialTargets = encounter.combatants.filter((c) => c.id !== attacker.id);

        return createPortal(
          <div
            className="fixed inset-0 z-[240] rev-backdrop flex items-center justify-center p-3 sm:p-4"
            onClick={() => setAttackModal(null)}
          >
            <div
              role="dialog"
              aria-modal="true"
              className="sheet-modal max-w-2xl w-full max-h-[90dvh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center p-4 border-b rev-divider rev-inset-soft shrink-0">
                <div>
                  <h3 className="font-spectral font-bold text-xl" style={{ color: 'var(--rev-text-bright)' }}>
                    Resolve Attack — {attacker.name}
                  </h3>
                  <p className="text-[11px]" style={{ color: 'var(--rev-text-muted)' }}>
                    3d6 + Class Rank ({attacker.classRank}) + ACC ({attacker.acc >= 0 ? `+${attacker.acc}` : attacker.acc}) + Mods vs Target EVA
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAttackModal(null)}
                  className="rev-icon-btn rev-icon-btn-edit text-xl"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 min-h-0 custom-scrollbar">
                {/* Ability & Weapon Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--rev-text-muted)' }}>
                    Attack Ability
                    <select
                      value={attackModal.ability?.id || 'none'}
                      onChange={(e) => {
                        const chosen = attackAbilities.find((a) => a.id === e.target.value) || null;
                        setAttackModal((prev) => (prev ? { ...prev, ability: chosen, resolution: null } : prev));
                      }}
                      className="rev-input px-2.5 py-2 text-xs font-bold"
                    >
                      <option value="none">Standard Attack (+0 ACC / +0 DMG)</option>
                      {attackAbilities.map((ab) => (
                        <option key={ab.id} value={ab.id}>
                          {ab.name} ({ab.acc || '+0'} ACC, {ab.dmg || '+0'} DMG, {ab.snCost} SN)
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--rev-text-muted)' }}>
                    Weapon ({attacker.mainHandMode} Mode)
                    <select
                      value={attackModal.weaponId}
                      onChange={(e) => setAttackModal((prev) => (prev ? { ...prev, weaponId: e.target.value, resolution: null } : prev))}
                      className="rev-input px-2.5 py-2 text-xs font-bold"
                    >
                      <option value="unarmed">Unarmed / Ability Only (0 DMG)</option>
                      {weapons.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} ({parseWeaponDamage(w.dmg, attacker.mainHandMode)} DMG)
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {/* Flanking, Ranged & Custom Modifiers */}
                <div className="rev-inset p-3.5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--rev-text-muted)' }}>
                        Flanking (+1 per extra enemy):
                      </span>
                      {[0, 1, 2, 3, 4].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setAttackModal((p) => (p ? { ...p, flanking: val, resolution: null } : p))}
                          className={`px-2 py-0.5 rounded text-xs font-bold tabular-nums ${
                            attackModal.flanking === val ? 'rev-btn-primary' : 'rev-btn-secondary'
                          }`}
                        >
                          +{val}
                        </button>
                      ))}
                    </div>

                    <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={attackModal.isRanged}
                        onChange={(e) => setAttackModal((p) => (p ? { ...p, isRanged: e.target.checked, resolution: null } : p))}
                        style={{ accentColor: 'var(--rev-accent)' }}
                      />
                      <span>Ranged Attack</span>
                    </label>
                  </div>

                  {attackModal.isRanged && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t rev-divider-subtle">
                      <select
                        value={attackModal.distanceMod}
                        onChange={(e) => setAttackModal((p) => (p ? { ...p, distanceMod: Number(e.target.value), resolution: null } : p))}
                        className="rev-input px-2 py-1.5 text-xs"
                      >
                        <option value={0}>Effective Range (+0)</option>
                        <option value={-3}>Too Close (-3 ACC)</option>
                        <option value={-2}>Too Far (-2 ACC)</option>
                      </select>
                      <select
                        value={attackModal.coverMod}
                        onChange={(e) => setAttackModal((p) => (p ? { ...p, coverMod: Number(e.target.value), resolution: null } : p))}
                        className="rev-input px-2 py-1.5 text-xs"
                      >
                        <option value={0}>No Cover (+0)</option>
                        <option value={-1}>Half Cover (-1 ACC)</option>
                        <option value={-2}>3/4 Cover (-2 ACC)</option>
                        <option value={-3}>Full Cover (-3 ACC)</option>
                      </select>
                      <select
                        value={attackModal.speedMod}
                        onChange={(e) => setAttackModal((p) => (p ? { ...p, speedMod: Number(e.target.value), resolution: null } : p))}
                        className="rev-input px-2 py-1.5 text-xs"
                      >
                        <option value={0}>Stationary (+0)</option>
                        <option value={-1}>Fast &gt;4 tiles (-1 ACC)</option>
                        <option value={-3}>Incredibly Fast (-3 ACC)</option>
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <label className="flex items-center justify-between bg-black/25 px-3 py-1.5 rounded border border-gray-700/50 text-xs font-bold">
                      <span>Bonus ACC Mod</span>
                      <input
                        type="number"
                        value={attackModal.extraAcc}
                        onChange={(e) => setAttackModal((p) => (p ? { ...p, extraAcc: Number(e.target.value) || 0, resolution: null } : p))}
                        className="w-16 rev-input px-2 py-1 text-center tabular-nums"
                      />
                    </label>
                    <label className="flex items-center justify-between bg-black/25 px-3 py-1.5 rounded border border-gray-700/50 text-xs font-bold">
                      <span>Bonus DMG Mod</span>
                      <input
                        type="number"
                        value={attackModal.extraDmg}
                        onChange={(e) => setAttackModal((p) => (p ? { ...p, extraDmg: Number(e.target.value) || 0, resolution: null } : p))}
                        className="w-16 rev-input px-2 py-1 text-center tabular-nums"
                      />
                    </label>
                  </div>
                </div>

                {/* Multi-Target Selection */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--rev-text-muted)' }}>
                    Targets ({attackModal.targetIds.length} selected)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                    {potentialTargets.map((t) => {
                      const isSel = attackModal.targetIds.includes(t.id);
                      const effEva = getEffectiveEva(t);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() =>
                            setAttackModal((prev) => {
                              if (!prev) return prev;
                              const exists = prev.targetIds.includes(t.id);
                              return {
                                ...prev,
                                targetIds: exists ? prev.targetIds.filter((id) => id !== t.id) : [...prev.targetIds, t.id],
                                resolution: null,
                              };
                            })
                          }
                          className="p-2.5 border text-left flex items-center justify-between gap-2 transition-colors"
                          style={{
                            borderRadius: 'var(--rev-radius-control)',
                            backgroundColor: isSel ? 'var(--rev-accent-soft)' : 'var(--rev-surface-inset)',
                            borderColor: isSel ? 'var(--rev-accent-border)' : 'var(--rev-border-subtle)',
                          }}
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-xs truncate" style={{ color: 'var(--rev-text-bright)' }}>
                              {t.name}
                            </div>
                            <div className="text-[10px] tabular-nums" style={{ color: 'var(--rev-text-muted)' }}>
                              EVA {effEva} · AP {t.ap} · VG {t.vigor}/{t.vigorMax}{t.tmv > 0 ? ` (+${t.tmv} TMV)` : ''}
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold uppercase ${t.side === 'ally' ? 'text-sky-300' : 'text-red-400'}`}>
                            {t.side}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Roll Result Breakdown */}
                {attackModal.resolution && (
                  <div className="rev-inset p-4 space-y-3 border-l-2" style={{ borderLeftColor: 'var(--rev-accent)' }}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--rev-text-muted)' }}>
                          Combat Roll:
                        </span>
                        <span className="font-bold text-sm tabular-nums text-white">
                          [{attackModal.resolution.dice.join(', ')}] ({attackModal.resolution.diceSum})
                          {' '}+ Rank {attackModal.resolution.classRank}
                          {attackModal.resolution.baseAcc !== 0 ? ` + ACC ${attackModal.resolution.baseAcc}` : ''}
                          {attackModal.resolution.abilityAccMod !== 0 ? ` + Abil ${attackModal.resolution.abilityAccMod}` : ''}
                          {attackModal.resolution.flankAcc > 0 ? ` + Flank ${attackModal.resolution.flankAcc}` : ''}
                          {attackModal.resolution.rangedAcc !== 0 ? ` + Ranged ${attackModal.resolution.rangedAcc}` : ''}
                          {attackModal.resolution.statusPenalty > 0 ? ` - Status ${attackModal.resolution.statusPenalty}` : ''}
                          {attackModal.resolution.armourPenalty > 0 ? ` - ArmourPen ${attackModal.resolution.armourPenalty}` : ''}
                          {attackModal.resolution.extraAcc !== 0 ? ` + Mod ${attackModal.resolution.extraAcc}` : ''}
                        </span>
                      </div>
                      <span className="text-xl font-spectral font-bold text-white tabular-nums">
                        Total {attackModal.resolution.totalRoll}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {attackModal.resolution.outcomes.map((o) => (
                        <div
                          key={o.targetId}
                          className={`p-2.5 rounded border text-xs flex flex-col gap-1 ${
                            o.hit ? 'bg-emerald-950/40 border-emerald-700/70' : 'bg-red-950/35 border-red-800/60'
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold">
                            <span className="text-white">{o.targetName} (EVA {o.effectiveEva})</span>
                            <span className={o.hit ? 'text-emerald-300' : 'text-red-400'}>
                              {o.hit ? 'HIT!' : 'MISS'}
                            </span>
                          </div>
                          {o.hit && (
                            <div className="text-[11px] text-gray-200 tabular-nums">
                              Raw DMG: {o.weaponDmg} Wpn {o.abilityDmgMod !== 0 ? `${o.abilityDmgMod >= 0 ? '+' : ''}${o.abilityDmgMod} Abil ` : ''}
                              +{o.overflow} Overflow
                              {o.bonusDmg !== 0 ? ` +${o.bonusDmg} Bonus` : ''}
                              {o.feeblePenalty > 0 ? ` -${o.feeblePenalty} Feeble` : ''}
                              {' '}= <strong>{o.rawDmg}</strong>
                              {o.totalPierce > 0 ? ` · Pierce ${o.totalPierce} (Eff. AP ${o.effectiveAp})` : ` · Armour AP ${o.effectiveAp}`}
                              {' '}→ <strong className="text-red-300">{o.vigorLost} VG lost</strong>
                              {o.tmvAbsorbed > 0 ? `, ${o.tmvAbsorbed} TMV absorbed` : ''}
                              {o.apBroken > 0 ? `, -${o.apBroken} AP broken` : ''}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 p-4 border-t rev-divider shrink-0">
                <button
                  type="button"
                  onClick={runAttackRoll}
                  disabled={attackModal.targetIds.length === 0}
                  className="flex-1 py-2.5 font-bold text-sm rev-btn-secondary disabled:opacity-40"
                >
                  {attackModal.resolution ? 'Re-Roll 3d6' : 'Roll 3d6 Attack'}
                </button>
                {attackModal.resolution && (
                  <button
                    type="button"
                    onClick={applyAttackResolution}
                    className="flex-1 py-2.5 font-bold text-sm rev-btn-primary shadow-sm"
                  >
                    Apply Damage &amp; Spend Action
                  </button>
                )}
              </div>
            </div>
          </div>,
          document.body
        );
      })()}

      {combatRollOverlay && (
        <DiscoRollOverlay
          session={combatRollOverlay.session}
          charName={combatRollOverlay.charName}
          currentStrain={combatRollOverlay.currentStrain}
          strainMaxVal={combatRollOverlay.strainMaxVal}
          exertStrainCost={Math.max(1, Math.ceil(combatRollOverlay.strainMaxVal * 0.25))}
          currentDp={combatRollOverlay.currentDp}
          namedConvictions={combatRollOverlay.namedConvictions}
          readOnly={false}
          onExertDie={(dieId) => {
            setCombatRollOverlay((prev) => prev ? {
              ...prev,
              session: exertDieInSession(prev.session, dieId, Math.max(1, Math.ceil(prev.strainMaxVal * 0.25))),
              currentStrain: prev.currentStrain + Math.max(1, Math.ceil(prev.strainMaxVal * 0.25)),
            } : prev);
          }}
          onSpendDestiny={(conviction) => {
            setCombatRollOverlay((prev) => prev ? {
              ...prev,
              session: applyDestinyToSession(prev.session, conviction),
              currentDp: Math.max(0, prev.currentDp - 1),
            } : prev);
          }}
          onAccept={(session) => {
            if (attackModal) {
              const attacker = encounter.combatants.find((c) => c.id === attackModal.attackerId);
              if (attacker) {
                const weapon = attacker.equipmentList.find((e) => e.id === attackModal.weaponId) || null;
                const targets = encounter.combatants.filter((c) => attackModal.targetIds.includes(c.id));
                const manualDice: [number, number, number] = [
                  session.dice[0]?.value || 1,
                  session.dice[1]?.value || 1,
                  session.dice[2]?.value || 1,
                ];
                const rangedModifier = attackModal.isRanged
                  ? attackModal.distanceMod + attackModal.coverMod + attackModal.speedMod
                  : 0;
                const resolution = resolveCombatAttack({
                  attacker,
                  ability: attackModal.ability,
                  weapon,
                  targets,
                  isRanged: attackModal.isRanged,
                  flankingExtraEnemies: attackModal.flanking,
                  rangedModifier,
                  extraAcc: attackModal.extraAcc,
                  extraDmg: attackModal.extraDmg,
                  manualDice,
                });
                setAttackModal((prev) => prev ? { ...prev, resolution } : prev);
              }
            }
            setCombatRollOverlay(null);
          }}
        />
      )}

      {/* ========================= ADD REINFORCEMENT MODAL ========================= */}
      {addReinforcementOpen && createPortal(
        <div
          className="fixed inset-0 z-[230] rev-backdrop flex items-center justify-center p-4"
          onClick={() => setAddReinforcementOpen(false)}
        >
          <div
            className="sheet-modal max-w-lg w-full max-h-[82vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b rev-divider rev-inset-soft">
              <h3 className="font-spectral font-bold text-lg" style={{ color: 'var(--rev-text-bright)' }}>
                Add Combatant Mid-Encounter
              </h3>
              <button type="button" onClick={() => setAddReinforcementOpen(false)} className="rev-icon-btn rev-icon-btn-edit text-xl" aria-label="Close">
                ×
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-3">
              {savedNpcs.map((npc) => (
                <div key={npc.id} className="rev-inset p-2.5 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-sm" style={{ color: 'var(--rev-text-bright)' }}>{npc.name}</div>
                    <div className="text-[11px]" style={{ color: 'var(--rev-text-muted)' }}>VG {npc.stats.vigorMax} · EVA {npc.stats.eva} · AP {npc.stats.apMax}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const created = buildCombatantFromNpc(npc, 'ally');
                        commitEncounter((p) => ({ ...p, combatants: [...p.combatants, created] }));
                        setAddReinforcementOpen(false);
                      }}
                      className="rev-btn-secondary px-2.5 py-1 text-xs font-bold"
                    >
                      + Ally
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const created = buildCombatantFromNpc(npc, 'enemy');
                        commitEncounter((p) => ({ ...p, combatants: [...p.combatants, created] }));
                        setAddReinforcementOpen(false);
                      }}
                      className="rev-btn-primary px-2.5 py-1 text-xs font-bold"
                    >
                      + Enemy
                    </button>
                  </div>
                </div>
              ))}

              <form onSubmit={handleAddQuickCombatant} className="border-t rev-divider pt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                <input
                  type="text"
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  placeholder="Quick Name"
                  className="rev-input px-2 py-1.5 text-xs sm:col-span-2"
                  required
                />
                <select
                  value={quickSide}
                  onChange={(e) => setQuickSide(e.target.value as CombatantSide)}
                  className="rev-input px-2 py-1.5 text-xs font-bold"
                >
                  <option value="enemy">Enemy</option>
                  <option value="ally">Ally</option>
                </select>
                <button type="submit" className="rev-btn-primary px-3 py-1.5 text-xs font-bold">
                  + Quick Add
                </button>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
