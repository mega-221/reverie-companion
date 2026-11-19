import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from './supabase';
import type {
  AllowedEditor,
  Character,
  CharacterData,
  CompendiumEntry,
  PartyNotificationPayload,
  PartyVitalsSyncPayload,
} from './types';
import { useCompendium } from './CompendiumContext';
import { 
  ORIGIN_EFFECTS, ORIGIN_CHOICES, CORE_SKILLS, SPECIAL_SKILL_ATTRIBUTES, 
  getMinSkillRank, SKILL_XP_COSTS, getMaxAttribute, SKILL_GROUPS, 
  getMaxAttributePoints, getSpentAttributePoints,
  type Tab, type LevelUpTarget 
} from './components/sheet/utils';
import { vigorMax, strainMax, dpMax, apMax } from './calc';
import {
  calculateTierFromLevel,
  getMaxAccessibleAbilityRank,
  isSkillInspired,
  getSkillMaxRank,
  getSpendableXp,
  type AbilityPickTask,
} from './components/sheet/progression/progressionData';
import { sendEphemeralBroadcast, useVisibilityRealtime } from './hooks/useVisibilityRealtime';
import { useTheme } from './theme/ThemeContext';
import { resolveDynamicConvictionThemeId } from './theme/themes';

import Header from './components/sheet/Header';
import GameplaySection from './components/sheet/GameplaySection';
import NarrativeSection from './components/sheet/NarrativeSection';
import ProgressionSection from './components/sheet/ProgressionSection';
import Footer from './components/sheet/Footer';
import InventoryModal from './components/sheet/modals/InventoryModal';
import SettingsModal from './components/SettingsModal';
import PartyNotificationPopup from './components/party/PartyNotificationPopup';
import PartyDateTransitionPopup, { type PartyDateTransition } from './components/party/PartyDateTransitionPopup';
import { normalizeCalendarDate } from './reverieCalendar';
import { LevelUpModal, OriginModal, ClassModal, SpecialSkillModal, AbilityModal, PathModal, DisciplineModal } from './components/sheet/modals/Modals';
import { CrisisModal } from './components/sheet/narrative/ConvictionsCard';

function normalizeCharacter(
  fetchedChar: Character,
  getEntryByName: (name: string) => CompendiumEntry | undefined
): Character {
  const rawItems: any[] = Array.isArray(fetchedChar.data?.items) ? fetchedChar.data.items : [];
  const migratedItems = rawItems.map((i: any) =>
    typeof i === 'string'
      ? { id: crypto.randomUUID(), name: i, qty: 1 }
      : { ...i, id: i.id || crypto.randomUUID() }
  );

  const resolveEq = (val: string): string => {
    if (!val) return '';
    if (val.length > 30) return val;
    const existing = migratedItems.find((i: any) => i.name === val);
    if (existing) return existing.id;
    const newId = crypto.randomUUID();
    migratedItems.push({ id: newId, name: val, qty: 0 });
    return newId;
  };

  const rawEq = fetchedChar.data?.equipment || ({} as any);
  const migratedEq = {
    mainHand: resolveEq(rawEq.mainHand || ''),
    mainHandMode: (rawEq.mainHandMode || (rawEq.mainHand ? '1H' : '')) as '1H' | '2H' | '',
    offHand: resolveEq(rawEq.offHand || ''),
    armour: resolveEq(rawEq.armour || ''),
    extra: Array.isArray(rawEq.extra) ? rawEq.extra.map((id: string) => resolveEq(id)) : [],
  };

  const oldNotes = fetchedChar.data?.notes || '';
  let migratedJournal = fetchedChar.data?.journal || [];
  if (oldNotes && migratedJournal.length === 0) {
    migratedJournal = [{
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      title: 'Imported Notes',
      content: oldNotes,
    }];
  }

  const safeData: CharacterData = {
    ...(fetchedChar.data || {}),
    identity: {
      origin: fetchedChar.data?.identity?.origin || '',
      className: fetchedChar.data?.identity?.className || '',
      path: fetchedChar.data?.identity?.path || '',
      quote: fetchedChar.data?.identity?.quote || '',
      inspirations: fetchedChar.data?.identity?.inspirations || [],
      originChoices: fetchedChar.data?.identity?.originChoices || {},
    },
    progression: (() => {
      const rawLevel = Math.max(0, fetchedChar.data?.progression?.level ?? 0);
      const derivedTier = calculateTierFromLevel(rawLevel);
      const rawXp = Math.max(0, fetchedChar.data?.progression?.xp ?? 0);
      const totalXp =
        rawXp < rawLevel * 5
          ? rawLevel * 5 + Math.min(4, rawXp)
          : rawXp;
      return {
        tier: fetchedChar.data?.progression?.tier ?? derivedTier,
        level: rawLevel,
        xp: totalXp,
        spendableXp: totalXp,
        advancements: Array.isArray(fetchedChar.data?.progression?.advancements)
          ? fetchedChar.data.progression.advancements
          : [],
      };
    })(),
    attributes: {
      grt: fetchedChar.data?.attributes?.grt || 1,
      ref: fetchedChar.data?.attributes?.ref || 1,
      int: fetchedChar.data?.attributes?.int || 1,
      psy: fetchedChar.data?.attributes?.psy || 1,
    },
    bonus: {
      vm: fetchedChar.data?.bonus?.vm || 0,
      sl: fetchedChar.data?.bonus?.sl || 0,
      dp: fetchedChar.data?.bonus?.dp || 0,
      eva: fetchedChar.data?.bonus?.eva || 0,
      ap: fetchedChar.data?.bonus?.ap || 0,
    },
    trackers: {
      vigor: fetchedChar.data?.trackers?.vigor ?? 5,
      strain: fetchedChar.data?.trackers?.strain ?? 0,
      dp: fetchedChar.data?.trackers?.dp ?? 2,
      ap: fetchedChar.data?.trackers?.ap ?? 0,
      apInitialized: Boolean(fetchedChar.data?.trackers?.apInitialized),
      acc: fetchedChar.data?.trackers?.acc ?? 0,
      injuries: (fetchedChar.data?.trackers?.injuries || []).map((inj: any) => ({
        name: inj.name || inj.part || 'Unknown Injury',
        affectedAttributes: Array.isArray(inj.affectedAttributes)
          ? inj.affectedAttributes
          : (inj.affectedAttributes ? inj.affectedAttributes.split(',').map((s: string) => s.trim()) : []),
        severity: inj.severity ?? 1,
        treatment: inj.treatment || 'none',
        weeksLeft: inj.weeksLeft ?? (inj.severity ?? 1) * 4,
      })),
    },
    equipment: migratedEq,
    abilities: Array.isArray(fetchedChar.data?.abilities)
      ? fetchedChar.data.abilities.map((a: any) => (typeof a === 'string' ? { name: a, equipped: true } : a))
      : [],
    convictions: fetchedChar.data?.convictions || [],
    failings: fetchedChar.data?.failings || [],
    aspects: Array.isArray(fetchedChar.data?.aspects)
      ? fetchedChar.data.aspects.map((a: any) =>
          typeof a === 'string'
            ? { id: crypto.randomUUID(), name: a, abandoned: false }
            : { id: a?.id || crypto.randomUUID(), name: a?.name || '', abandoned: Boolean(a?.abandoned) }
        )
      : [],
    specialSkills: fetchedChar.data?.specialSkills || [],
    items: migratedItems,
    possessions: (fetchedChar.data?.possessions || []).map((i: any) => ({ ...i, id: i.id || crypto.randomUUID() })),
    disciplines: fetchedChar.data?.disciplines || [],
    skills: fetchedChar.data?.skills || {},
    journal: migratedJournal,
    relationships: fetchedChar.data?.relationships || [],
    notes: oldNotes,
    allowedEditors: Array.isArray(fetchedChar.allowed_editors)
      ? fetchedChar.allowed_editors
      : Array.isArray(fetchedChar.data?.allowedEditors)
      ? fetchedChar.data.allowedEditors
      : [],
  };

  const initialApMax = apMax(safeData, getEntryByName);
  if (!safeData.trackers.apInitialized && safeData.trackers.ap === 0 && initialApMax > 0) {
    safeData.trackers.ap = initialApMax;
    safeData.trackers.apInitialized = true;
  }

  safeData.progression.spendableXp = getSpendableXp(safeData);

  return {
    ...fetchedChar,
    allowed_editors: safeData.allowedEditors,
    data: safeData,
  };
}

function isTextInputPatch(p: Partial<CharacterData>, prevData: CharacterData): boolean {
  if ('notes' in p || 'journal' in p || 'relationships' in p) return true;
  if ('identity' in p && p.identity) {
    const sameMeta =
      p.identity.origin === prevData.identity?.origin &&
      p.identity.className === prevData.identity?.className &&
      p.identity.path === prevData.identity?.path &&
      JSON.stringify(p.identity.inspirations) === JSON.stringify(prevData.identity?.inspirations) &&
      JSON.stringify(p.identity.originChoices) === JSON.stringify(prevData.identity?.originChoices);
    if (sameMeta && p.identity.quote !== prevData.identity?.quote) return true;
  }
  if ('convictions' in p && p.convictions && p.convictions.length === (prevData.convictions?.length ?? 0)) {
    return true;
  }
  if ('failings' in p && p.failings && p.failings.length === (prevData.failings?.length ?? 0)) {
    return true;
  }
  return false;
}

export default function CharacterSheet({
  id,
  onBack,
  currentUserId,
  currentUserEmail = '',
  currentUsername = '',
  onUsernameUpdated,
  partyId,
  readOnly = false,
  initialCharacter,
}: {
  id: string;
  onBack: () => void;
  currentUserId?: string;
  currentUserEmail?: string;
  currentUsername?: string;
  onUsernameUpdated?: (newUsername: string) => void;
  partyId?: string;
  readOnly?: boolean;
  initialCharacter?: Character;
}) {
  const { getAbilities, getEntryByName, loading: compendiumLoading } = useCompendium();
  const { setOverrideThemeId } = useTheme();
  const [char, setChar] = useState<Character | null>(null);
  const [isAuthoritativeDbChar, setIsAuthoritativeDbChar] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('gameplay');
  const [isSheetSettingsOpen, setIsSheetSettingsOpen] = useState(false);
  const [notificationQueue, setNotificationQueue] = useState<PartyNotificationPayload[]>([]);
  const [dateTransition, setDateTransition] = useState<PartyDateTransition | null>(null);

  const [pulseState, setPulseState] = useState<'none' | 'active' | 'fading'>('none');

  const [levelUpTarget, setLevelUpTarget] = useState<LevelUpTarget | null>(null);
  const [isOriginModalOpen, setIsOriginModalOpen] = useState(false);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isPathModalOpen, setIsPathModalOpen] = useState(false);
  const [isDisciplineModalOpen, setIsDisciplineModalOpen] = useState(false);
  const [modalDisciplineIndex, setModalDisciplineIndex] = useState<number | null>(null);
  const [isSpecialSkillModalOpen, setIsSpecialSkillModalOpen] = useState(false);
  const [modalSpecialSkillIndex, setModalSpecialSkillIndex] = useState<number | null>(null);
  const [isAbilityModalOpen, setIsAbilityModalOpen] = useState(false);
  const [modalAbilityIndex, setModalAbilityIndex] = useState<number | null>(null);
  const [abilityPickQueue, setAbilityPickQueue] = useState<AbilityPickTask[]>([]);
  const [abilityPickTotal, setAbilityPickTotal] = useState(0);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [isCrisisNotifOpen, setIsCrisisNotifOpen] = useState(false);

  const clientSessionIdRef = useRef(crypto.randomUUID());
  const charRef = useRef<Character | null>(null);
  const dirtyRef = useRef(false);
  const effectiveReadOnlyRef = useRef(true);
  const sharedPartyIdsRef = useRef<string[]>(partyId ? [partyId] : []);

  const debounceSaveTimerRef = useRef<number | null>(null);
  const textBroadcastTimerRef = useRef<number | null>(null);
  const pendingTextPatchRef = useRef<Partial<CharacterData>>({});

  const isOwner = Boolean(char && currentUserId && char.user_id === currentUserId);
  const allowedEditors: AllowedEditor[] =
    char?.allowed_editors ?? char?.data?.allowedEditors ?? [];
  const isAllowedEditor = Boolean(
    char && currentUserId && allowedEditors.some(ed => ed.user_id === currentUserId)
  );
  const canEdit = Boolean(
    char &&
    isAuthoritativeDbChar &&
    (isOwner || isAllowedEditor || (!currentUserId && !readOnly))
  );
  const effectiveReadOnly = !canEdit;
  effectiveReadOnlyRef.current = effectiveReadOnly;

  const clearSyncTimers = useCallback(() => {
    if (debounceSaveTimerRef.current !== null) {
      window.clearTimeout(debounceSaveTimerRef.current);
      debounceSaveTimerRef.current = null;
    }
    if (textBroadcastTimerRef.current !== null) {
      window.clearTimeout(textBroadcastTimerRef.current);
      textBroadcastTimerRef.current = null;
    }
    pendingTextPatchRef.current = {};
  }, []);

  const buildPatchedCharacter = useCallback(
    (prev: Character, p: Partial<CharacterData>, preserveTrackersExact = false): Character => {
      const merged: CharacterData = { ...prev.data, ...p };

      if (!p.trackers && !preserveTrackersExact) {
        const prevVigorMax = vigorMax(prev.data);
        const nextVigorMax = vigorMax(merged);
        const deltaVigorMax = nextVigorMax - prevVigorMax;

        const prevDpMax = dpMax(prev.data);
        const nextDpMax = dpMax(merged);
        const deltaDpMax = nextDpMax - prevDpMax;

        const prevArmourId = prev.data.equipment?.armour || '';
        const nextArmourId = merged.equipment?.armour || '';
        const equippedNewArmour = Boolean(nextArmourId && nextArmourId !== prevArmourId);
        const prevApMax = apMax(prev.data, getEntryByName);
        const nextApMax = apMax(merged, getEntryByName);
        const deltaApMax = nextApMax - prevApMax;

        if (deltaVigorMax !== 0 || deltaDpMax !== 0 || deltaApMax !== 0 || equippedNewArmour) {
          const nextVigor =
            deltaVigorMax !== 0
              ? Math.max(
                  -nextVigorMax,
                  Math.min(nextVigorMax * 2, merged.trackers.vigor + deltaVigorMax)
                )
              : merged.trackers.vigor;

          const nextDp =
            deltaDpMax !== 0
              ? Math.max(0, Math.min(nextDpMax, merged.trackers.dp + deltaDpMax))
              : merged.trackers.dp;

          const nextAp = equippedNewArmour
            ? nextApMax
            : deltaApMax !== 0
            ? Math.max(0, (merged.trackers.ap ?? 0) + deltaApMax)
            : merged.trackers.ap;

          merged.trackers = {
            ...merged.trackers,
            vigor: nextVigor,
            dp: nextDp,
            ap: nextAp,
            apInitialized:
              equippedNewArmour || deltaApMax !== 0 ? true : merged.trackers.apInitialized,
          };
        }
      }

      return {
        ...prev,
        data: {
          ...merged,
          progression: {
            ...merged.progression,
            spendableXp: getSpendableXp(merged),
          },
        },
      };
    },
    [getEntryByName]
  );

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    dirtyRef.current = false;
    setHasUnsavedChanges(false);
    setSaved(false);
    clearSyncTimers();

    sharedPartyIdsRef.current = partyId ? [partyId] : [];

    async function loadSharedPartyMembership() {
      const { data: rows } = await supabase
        .from('party_characters')
        .select('party_id')
        .eq('character_id', id);

      if (cancelled || !rows) return;
      const ids = new Set<string>(partyId ? [partyId] : []);
      for (const r of rows as any[]) {
        if (r.party_id) ids.add(r.party_id);
      }
      sharedPartyIdsRef.current = Array.from(ids);
    }

    async function loadCharacter() {
      loadSharedPartyMembership();

      const { data: liveChar } = await supabase
        .from('characters')
        .select('*')
        .eq('id', id)
        .single();

      if (cancelled) return;

      if (liveChar) {
        const normalized = normalizeCharacter(liveChar as Character, getEntryByName);
        charRef.current = normalized;
        setChar(normalized);
        setIsAuthoritativeDbChar(true);
        return;
      }

      if (initialCharacter && initialCharacter.id === id) {
        const normalized = normalizeCharacter(initialCharacter, getEntryByName);
        charRef.current = normalized;
        setChar(normalized);
        setIsAuthoritativeDbChar(false);
        return;
      }

      if (partyId) {
        const { data: sharedRow, error: sharedErr } = await supabase
          .from('party_characters')
          .select('*')
          .eq('party_id', partyId)
          .eq('character_id', id)
          .single();

        if (cancelled) return;

        if (sharedRow && !sharedErr) {
          const snapshotChar: Character = {
            id: sharedRow.character_id,
            user_id: sharedRow.user_id,
            name: sharedRow.character_name || 'Unnamed Character',
            data: sharedRow.character_data || {},
            allowed_editors: Array.isArray(sharedRow.character_data?.allowedEditors)
              ? sharedRow.character_data.allowedEditors
              : [],
            created_at: sharedRow.created_at,
            updated_at: sharedRow.created_at,
          };
          const normalized = normalizeCharacter(snapshotChar, getEntryByName);
          charRef.current = normalized;
          setChar(normalized);
          setIsAuthoritativeDbChar(false);
          return;
        }
      }

      setLoadError('Character not found or you do not have permission to view it.');
    }

    loadCharacter();

    return () => {
      cancelled = true;
      clearSyncTimers();
    };
  }, [id, partyId, initialCharacter, clearSyncTimers]);

  const persistCharacterToDb = useCallback(async (target: Character): Promise<boolean> => {
    if (!target || effectiveReadOnlyRef.current) return false;
    setSaving(true);
    const updatedAt = new Date().toISOString();

    const { error } = await supabase
      .from('characters')
      .update({
        data: target.data,
        name: target.name,
        updated_at: updatedAt,
      })
      .eq('id', target.id);

    if (!error) {
      await supabase
        .from('party_characters')
        .update({
          character_data: target.data,
          character_name: target.name,
        })
        .eq('character_id', target.id);

      dirtyRef.current = false;
      setHasUnsavedChanges(false);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    }

    setSaving(false);
    return !error;
  }, []);

  const { broadcast } = useVisibilityRealtime({
    channelName: id ? `char-sync:${id}` : null,
    enabled: Boolean(id && char),
    broadcastHandlers: {
      'sheet:patch': (payload) => {
        if (!payload || payload.senderId === clientSessionIdRef.current || !charRef.current) return;

        let nextChar = charRef.current;
        if (payload.patch && typeof payload.patch === 'object') {
          nextChar = buildPatchedCharacter(nextChar, payload.patch as Partial<CharacterData>, true);
        } else if (payload.data) {
          nextChar = normalizeCharacter(
            { ...nextChar, data: payload.data },
            getEntryByName
          );
        }
        if (typeof payload.name === 'string') {
          nextChar = { ...nextChar, name: payload.name };
        }

        charRef.current = nextChar;
        setChar(nextChar);
        // Receiving tab does NOT own the save timer or mark dirty
      },
      'sheet:permissions': (payload) => {
        if (!payload || payload.senderId === clientSessionIdRef.current || !charRef.current) return;
        const nextEditors = Array.isArray(payload.allowed_editors) ? payload.allowed_editors : [];
        const updated: Character = {
          ...charRef.current,
          allowed_editors: nextEditors,
          data: {
            ...charRef.current.data,
            allowedEditors: nextEditors,
          },
        };
        charRef.current = updated;
        setChar(updated);
      },
      'party:notify': async (payload: PartyNotificationPayload) => {
        if (!payload?.id || !currentUserId || !Array.isArray(payload.targetUserIds)) return;
        if (!payload.targetUserIds.includes(currentUserId)) return;

        let belongsToParty =
          Boolean(partyId && payload.partyId === partyId) ||
          sharedPartyIdsRef.current.includes(payload.partyId);

        if (!belongsToParty && payload.partyId) {
          const { data: membershipRow } = await supabase
            .from('party_characters')
            .select('party_id')
            .eq('character_id', id)
            .eq('party_id', payload.partyId)
            .maybeSingle();
          if (membershipRow?.party_id) {
            sharedPartyIdsRef.current = Array.from(new Set([...sharedPartyIdsRef.current, membershipRow.party_id]));
            belongsToParty = true;
          }
        }

        if (!belongsToParty) return;

        setNotificationQueue(prev => {
          if (prev.some(n => n.id === payload.id)) return prev;
          return [...prev, payload];
        });
      },
    },
    onBeforeHide: () => {
      if (textBroadcastTimerRef.current !== null && Object.keys(pendingTextPatchRef.current).length > 0) {
        window.clearTimeout(textBroadcastTimerRef.current);
        textBroadcastTimerRef.current = null;
        broadcast('sheet:patch', {
          senderId: clientSessionIdRef.current,
          patch: pendingTextPatchRef.current,
        });
        pendingTextPatchRef.current = {};
      }
      if (debounceSaveTimerRef.current !== null) {
        window.clearTimeout(debounceSaveTimerRef.current);
        debounceSaveTimerRef.current = null;
      }
      if (dirtyRef.current && charRef.current && !effectiveReadOnlyRef.current) {
        persistCharacterToDb(charRef.current);
      }
    },
    onResumeFromHidden: async () => {
      const { data: sharedRows } = await supabase
        .from('party_characters')
        .select('party_id')
        .eq('character_id', id);
      if (sharedRows) {
        const ids = new Set<string>(partyId ? [partyId] : []);
        for (const r of sharedRows as any[]) {
          if (r.party_id) ids.add(r.party_id);
        }
        sharedPartyIdsRef.current = Array.from(ids);
      }

      if (dirtyRef.current) return;
      const { data: fresh } = await supabase
        .from('characters')
        .select('*')
        .eq('id', id)
        .single();
      if (fresh) {
        const normalized = normalizeCharacter(fresh as Character, getEntryByName);
        charRef.current = normalized;
        setChar(normalized);
        setIsAuthoritativeDbChar(true);
      }
    },
  });

  const activePartyId = partyId || sharedPartyIdsRef.current[0];
  useVisibilityRealtime({
    channelName: activePartyId ? `party-sync:${activePartyId}` : null,
    enabled: Boolean(activePartyId && char),
    broadcastHandlers: {
      'party:calendar': (payload) => {
        if (!payload?.calendar_date) return;
        const nextDate = normalizeCalendarDate(payload.calendar_date);
        const prevSource = payload.previous_date;
        if (prevSource) {
          const prevDate = normalizeCalendarDate(prevSource);
          if (
            prevDate.day !== nextDate.day ||
            prevDate.monthIndex !== nextDate.monthIndex ||
            prevDate.year !== nextDate.year
          ) {
            setDateTransition({
              id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
              previousDate: prevDate,
              nextDate,
            });
          }
        }
      },
      'party:notify': async (payload: PartyNotificationPayload) => {
        if (!payload?.id || !currentUserId || !Array.isArray(payload.targetUserIds)) return;
        if (!payload.targetUserIds.includes(currentUserId)) return;
        setNotificationQueue(prev => {
          if (prev.some(n => n.id === payload.id)) return prev;
          return [...prev, payload];
        });
      },
    },
  });

  const emitPartyVitalsIfChanged = useCallback(
    (prevChar: Character | null, nextChar: Character, force = false) => {
      const partyIds = sharedPartyIdsRef.current;
      if (partyIds.length === 0) return;

      const nextVMax = vigorMax(nextChar.data);
      const nextSMax = strainMax(nextChar.data);
      const nextDMax = dpMax(nextChar.data);
      const nextAMax = apMax(nextChar.data, getEntryByName);

      const nextV = nextChar.data.trackers.vigor;
      const nextS = nextChar.data.trackers.strain;
      const nextD = nextChar.data.trackers.dp;
      const nextA = nextChar.data.trackers.ap ?? 0;

      if (!force && prevChar) {
        const prevVMax = vigorMax(prevChar.data);
        const prevSMax = strainMax(prevChar.data);
        const prevDMax = dpMax(prevChar.data);
        const prevAMax = apMax(prevChar.data, getEntryByName);

        const unchanged =
          prevChar.name === nextChar.name &&
          prevChar.data.trackers.vigor === nextV &&
          prevVMax === nextVMax &&
          prevChar.data.trackers.strain === nextS &&
          prevSMax === nextSMax &&
          prevChar.data.trackers.dp === nextD &&
          prevDMax === nextDMax &&
          (prevChar.data.trackers.ap ?? 0) === nextA &&
          prevAMax === nextAMax;

        if (unchanged) return;
      }

      const payload: PartyVitalsSyncPayload = {
        character_id: nextChar.id,
        name: nextChar.name,
        vigor: nextV,
        vigorMax: nextVMax,
        strain: nextS,
        strainMax: nextSMax,
        dp: nextD,
        dpMax: nextDMax,
        ap: nextA,
        apMax: nextAMax,
        updated_at: new Date().toISOString(),
      };

      for (const pid of partyIds) {
        sendEphemeralBroadcast(`party-sync:${pid}`, 'party:vitals', payload);
      }
    },
    [getEntryByName]
  );

  const emitPatchBroadcast = useCallback(
    (deltaPatch: Partial<CharacterData>, isText: boolean) => {
      if (!isText) {
        // Flush any buffered text patch together with this immediate discrete click
        let combined = deltaPatch;
        if (textBroadcastTimerRef.current !== null) {
          window.clearTimeout(textBroadcastTimerRef.current);
          textBroadcastTimerRef.current = null;
          combined = { ...pendingTextPatchRef.current, ...deltaPatch };
          pendingTextPatchRef.current = {};
        }
        broadcast('sheet:patch', {
          senderId: clientSessionIdRef.current,
          patch: combined,
        });
        return;
      }

      // Throttle text input typing to ~400ms
      pendingTextPatchRef.current = {
        ...pendingTextPatchRef.current,
        ...deltaPatch,
      };
      if (textBroadcastTimerRef.current === null) {
        textBroadcastTimerRef.current = window.setTimeout(() => {
          textBroadcastTimerRef.current = null;
          const patchToSend = pendingTextPatchRef.current;
          pendingTextPatchRef.current = {};
          if (Object.keys(patchToSend).length === 0) return;
          broadcast('sheet:patch', {
            senderId: clientSessionIdRef.current,
            patch: patchToSend,
          });
        }, 400);
      }
    },
    [broadcast]
  );

  const scheduleDebouncedSave = useCallback(
    (target: Character) => {
      if (debounceSaveTimerRef.current !== null) {
        window.clearTimeout(debounceSaveTimerRef.current);
      }
      debounceSaveTimerRef.current = window.setTimeout(() => {
        debounceSaveTimerRef.current = null;
        if (dirtyRef.current && charRef.current && !effectiveReadOnlyRef.current) {
          persistCharacterToDb(charRef.current);
        } else if (dirtyRef.current && !effectiveReadOnlyRef.current) {
          persistCharacterToDb(target);
        }
      }, 2500);
    },
    [persistCharacterToDb]
  );

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasUnsavedChanges]);

  const dynamicSheetThemeId = char?.data?.dynamicTheme
    ? resolveDynamicConvictionThemeId(char.data.convictions)
    : null;

  useEffect(() => {
    setOverrideThemeId(dynamicSheetThemeId);
  }, [dynamicSheetThemeId, setOverrideThemeId]);

  useEffect(() => {
    return () => {
      setOverrideThemeId(null);
    };
  }, [setOverrideThemeId]);

  useEffect(() => {
    if (compendiumLoading || !char) return;
    const targetMaxAp = apMax(char.data, getEntryByName);
    if (!char.data.trackers.apInitialized && (char.data.trackers.ap ?? 0) === 0 && targetMaxAp > 0) {
      setChar(prev => {
        if (!prev) return prev;
        if (prev.data.trackers.apInitialized || (prev.data.trackers.ap ?? 0) !== 0) return prev;
        const next: Character = {
          ...prev,
          data: {
            ...prev.data,
            trackers: {
              ...prev.data.trackers,
              ap: targetMaxAp,
              apInitialized: true,
            },
          },
        };
        charRef.current = next;
        return next;
      });
    }
  }, [compendiumLoading, char?.id]);

  if (loadError) {
    return (
      <div className="w-full min-h-screen rev-canvas flex flex-col items-center justify-center p-6 text-center gap-4">
        <p className="text-red-400 font-cinzel text-lg">{loadError}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 rev-btn-secondary font-bold text-sm"
        >
          ← Back
        </button>
      </div>
    );
  }

  if (!char) {
    return (
      <p className="text-gray-400 p-8 text-center font-cinzel text-xl h-screen flex items-center justify-center rev-canvas">
        Loading character...
      </p>
    );
  }

  const baseStrainMax = strainMax(char.data);
  const isCritical = char.data.trackers.strain > baseStrainMax || char.data.trackers.vigor < 1;
  const showFilter = isCritical || pulseState !== 'none';

  function patch(p: Partial<CharacterData>) {
    if (effectiveReadOnly || !charRef.current) return;
    const prevChar = charRef.current;
    const nextChar = buildPatchedCharacter(prevChar, p, false);

    // Build exact delta patch (includes any derived trackers / progression updates)
    const deltaPatch: Partial<CharacterData> = {};
    for (const key of Object.keys(p) as Array<keyof CharacterData>) {
      (deltaPatch as any)[key] = nextChar.data[key];
    }
    if (nextChar.data.trackers !== prevChar.data.trackers) {
      deltaPatch.trackers = nextChar.data.trackers;
    }
    if (nextChar.data.progression !== prevChar.data.progression) {
      deltaPatch.progression = nextChar.data.progression;
    }

    const isText = isTextInputPatch(p, prevChar.data);

    charRef.current = nextChar;
    setChar(nextChar);
    dirtyRef.current = true;
    setSaved(false);
    setHasUnsavedChanges(true);

    emitPatchBroadcast(deltaPatch, isText);
    emitPartyVitalsIfChanged(prevChar, nextChar);
    scheduleDebouncedSave(nextChar);
  }

  function updateTracker(key: 'vigor' | 'strain' | 'dp' | 'ap' | 'acc', amount: number) {
    if (effectiveReadOnly || !charRef.current) return;
    const currentChar = charRef.current;
    const current = currentChar.data.trackers[key];
    let max = Infinity;
    let min = 0;

    if (key === 'vigor') {
      const baseMax = vigorMax(currentChar.data);
      max = baseMax * 2;
      min = -baseMax;
    }
    if (key === 'strain') max = strainMax(currentChar.data) * 2;
    if (key === 'dp') max = dpMax(currentChar.data);

    const nextVal = Math.max(min, Math.min(max, current + amount));

    if (key === 'strain' && nextVal >= max) {
      setPulseState('active');
      const endurance = currentChar.data.skills.Endurance || 0;
      const targetVigor = 1 + endurance;

      const newVigor = currentChar.data.trackers.vigor < targetVigor ? currentChar.data.trackers.vigor : targetVigor;
      const halfMax = max / 2;

      patch({
        trackers: {
          ...currentChar.data.trackers,
          vigor: newVigor,
          strain: halfMax,
        },
      });

      setTimeout(() => setPulseState('fading'), 2000);
      setTimeout(() => setPulseState('none'), 3000);
      return;
    }

    patch({
      trackers: {
        ...currentChar.data.trackers,
        [key]: nextVal,
        ...(key === 'ap' ? { apInitialized: true } : {}),
      },
    });
  }

  async function save(): Promise<boolean> {
    if (effectiveReadOnly || !charRef.current) return false;
    if (debounceSaveTimerRef.current !== null) {
      window.clearTimeout(debounceSaveTimerRef.current);
      debounceSaveTimerRef.current = null;
    }
    return persistCharacterToDb(charRef.current);
  }

  function handleRequestBack() {
    if (effectiveReadOnly || !hasUnsavedChanges) {
      onBack();
    } else {
      setIsExitConfirmOpen(true);
    }
  }

  function applyOrigin(originName: string, choices: Record<string, string>) {
    if (!charRef.current) return;
    const currentChar = charRef.current;
    const oldOriginName = currentChar.data.identity.origin;
    let newSkills = { ...currentChar.data.skills };
    let newSpecialSkills = [...(currentChar.data.specialSkills || [])];
    let newInspirations = [...(currentChar.data.identity.inspirations || [])];
    let newAbilities = [...(currentChar.data.abilities || [])];

    if (oldOriginName && oldOriginName !== originName) {
      const oldEffects = ORIGIN_EFFECTS[oldOriginName];
      if (oldEffects) {
        if (oldEffects.starting) Object.entries(oldEffects.starting).forEach(([skill, rank]) => { newSkills[skill] = Math.max(0, (newSkills[skill] || 0) - rank); newSpecialSkills = newSpecialSkills.filter(s => s.name !== skill); });
        if (oldEffects.inspiration) oldEffects.inspiration.forEach(insp => { newInspirations = newInspirations.filter(i => i !== insp); });
        if (oldEffects.specialAbilities) oldEffects.specialAbilities.forEach(disc => { const abilitiesToRemove = getAbilities().filter(a => a.data.source === disc && (a.data.class_rank || 0) <= 1); newAbilities = newAbilities.filter(ab => !abilitiesToRemove.find(x => x.name === ab.name)); });
      }
      const oldChoices = currentChar.data.identity.originChoices || {};
      Object.entries(oldChoices).forEach(([choiceId, skillName]) => {
        const choice = ORIGIN_CHOICES[oldOriginName]?.find(c => c.id === choiceId);
        if (choice) {
          if (choice.type === 'inspiration') newInspirations = newInspirations.filter(i => i !== skillName);
          else if (choice.type === 'starting') { newSkills[skillName] = Math.max(0, (newSkills[skillName] || 0) - (choice.rank || 0)); newSpecialSkills = newSpecialSkills.filter(s => s.name !== skillName); }
        }
      });
    }

    const effects = ORIGIN_EFFECTS[originName];
    if (effects) {
      if (effects.starting) Object.entries(effects.starting).forEach(([skill, rank]) => {
        if (CORE_SKILLS.includes(skill)) newSkills[skill] = Math.max(newSkills[skill] || 0, rank);
        else {
          const existing = newSpecialSkills.find(s => s.name === skill);
          if (existing) existing.rank = Math.max(existing.rank, rank);
          else newSpecialSkills.push({ name: skill, rank, attribute: SPECIAL_SKILL_ATTRIBUTES[skill] || 'grt' });
        }
      });
      if (effects.inspiration) effects.inspiration.forEach(insp => { if (!newInspirations.includes(insp)) newInspirations.push(insp); });
      if (effects.specialAbilities) effects.specialAbilities.forEach(disc => {
        const abilitiesToAdd = getAbilities().filter(a => a.data.source === disc && (a.data.class_rank || 0) <= 1);
        abilitiesToAdd.forEach(ab => { if (newAbilities.length < 6 && !newAbilities.find(x => x.name === ab.name)) newAbilities.push({ name: ab.name, equipped: true }); });
      });
    }

    if (choices) Object.entries(choices).forEach(([choiceId, skillName]) => {
      const choice = ORIGIN_CHOICES[originName]?.find(c => c.id === choiceId);
      if (choice) {
        if (choice.type === 'inspiration') { if (!newInspirations.includes(skillName)) newInspirations.push(skillName); }
        else if (choice.type === 'starting') {
          if (CORE_SKILLS.includes(skillName)) newSkills[skillName] = Math.max(newSkills[skillName] || 0, choice.rank || 0);
          else {
            const existing = newSpecialSkills.find(s => s.name === skillName);
            if (existing) existing.rank = Math.max(existing.rank, choice.rank || 0);
            else newSpecialSkills.push({ name: skillName, rank: choice.rank || 0, attribute: SPECIAL_SKILL_ATTRIBUTES[skillName] || 'grt' });
          }
        }
      }
    });

    patch({ identity: { ...currentChar.data.identity, origin: originName, inspirations: newInspirations, originChoices: choices }, skills: newSkills, specialSkills: newSpecialSkills, abilities: newAbilities });
  }

  const handleAdvance = () => {
    if (!char || !levelUpTarget) return;
    const currentSpendable = getSpendableXp(char.data);

    if (levelUpTarget.type === 'attribute') {
      const current = char.data.attributes[levelUpTarget.key];
      const max = getMaxAttribute(char.data.progression.tier);
      const availablePts = getMaxAttributePoints(char.data.progression.tier) - getSpentAttributePoints(char.data.attributes);

      if (current < max && availablePts > 0) {
        patch({ attributes: { ...char.data.attributes, [levelUpTarget.key]: current + 1 } });
      }
    } else if (levelUpTarget.type === 'skill') {
      const current = char.data.skills[levelUpTarget.key] ?? 0;
      const attr = Object.keys(SKILL_GROUPS).find(a => (SKILL_GROUPS[a as keyof typeof SKILL_GROUPS].skills as readonly string[]).includes(levelUpTarget.key)) as keyof typeof char.data.attributes;
      const originMin = getMinSkillRank(levelUpTarget.key, char);
      const max = getSkillMaxRank(levelUpTarget.key, char.data.attributes[attr], originMin, char.data);
      if (current < max) {
        let cost = SKILL_XP_COSTS[current];
        const isInspired = isSkillInspired(levelUpTarget.key, char.data);
        if (isInspired) cost = Math.max(0, cost - 1);

        if (currentSpendable >= cost) {
          patch({
            skills: { ...char.data.skills, [levelUpTarget.key]: current + 1 },
          });
        }
      }
    } else if (levelUpTarget.type === 'specialSkill') {
      const skill = char.data.specialSkills[levelUpTarget.index];
      const compendiumAttr = getEntryByName(skill.name)?.data?.attribute;
      const attr = (compendiumAttr || skill.attribute || 'grt') as keyof typeof char.data.attributes;
      const originMin = getMinSkillRank(skill.name, char);
      const max = getSkillMaxRank(skill.name, char.data.attributes[attr], originMin, char.data);
      if (skill.rank < max) {
        let cost = SKILL_XP_COSTS[skill.rank];
        const isInspired = isSkillInspired(skill.name, char.data);
        if (isInspired) cost = Math.max(0, cost - 1);

        if (currentSpendable >= cost) {
          const next = [...char.data.specialSkills]; next[levelUpTarget.index] = { ...next[levelUpTarget.index], rank: skill.rank + 1 };
          patch({ specialSkills: next });
        }
      }
    }
  };

  const handleRegress = () => {
    if (!char || !levelUpTarget) return;

    if (levelUpTarget.type === 'attribute') {
      const current = char.data.attributes[levelUpTarget.key];
      if (current > 1) patch({ attributes: { ...char.data.attributes, [levelUpTarget.key]: current - 1 } });
    } else if (levelUpTarget.type === 'skill') {
      const current = char.data.skills[levelUpTarget.key] ?? 0;
      const min = getMinSkillRank(levelUpTarget.key, char);
      if (current > min) {
        patch({
          skills: { ...char.data.skills, [levelUpTarget.key]: current - 1 },
        });
      }
    } else if (levelUpTarget.type === 'specialSkill') {
      const skill = char.data.specialSkills[levelUpTarget.index];
      const min = getMinSkillRank(skill.name, char);
      if (skill.rank > min) {
        const next = [...char.data.specialSkills]; next[levelUpTarget.index] = { ...next[levelUpTarget.index], rank: skill.rank - 1 };
        patch({ specialSkills: next });
      }
    }
  };

  return (
    <>
      <PartyDateTransitionPopup
        transition={dateTransition}
        onDismiss={() => setDateTransition(null)}
      />

      <PartyNotificationPopup
        notification={notificationQueue[0] || null}
        queueCount={notificationQueue.length}
        giveTargets={canEdit ? [{ id: char.id, name: char.name || 'Unnamed Character' }] : []}
        onRespondGive={async (notif, accepted) => {
          if (!accepted || !canEdit || !charRef.current) return;
          const amount = Math.max(1, Math.trunc(notif.grantAmount || 0));
          if (amount <= 0) return;

          if (notif.grantResource === 'xp') {
            patch({
              progression: {
                ...charRef.current.data.progression,
                xp: (charRef.current.data.progression.xp ?? 0) + amount,
              },
            });
          } else if (notif.grantResource === 'dp') {
            patch({
              trackers: {
                ...charRef.current.data.trackers,
                dp: Math.max(0, (charRef.current.data.trackers.dp ?? 0) + amount),
              },
            });
          }

          if (debounceSaveTimerRef.current !== null) {
            window.clearTimeout(debounceSaveTimerRef.current);
            debounceSaveTimerRef.current = null;
          }
          if (charRef.current) {
            await persistCharacterToDb(charRef.current);
          }
        }}
        onRespondCrisis={(_notif, accepted) => {
          if (!accepted || !canEdit) return;
          setIsCrisisNotifOpen(true);
        }}
        onDismiss={(notifId) => {
          setNotificationQueue(prev => prev.filter(n => n.id !== notifId));
        }}
      />

      {pulseState !== 'none' && (
        <div className={`fixed inset-0 z-[100] pointer-events-none backdrop-blur-[2px] bg-cyan-950/10 transition-opacity duration-1000 ease-in-out ${
          pulseState === 'fading' ? 'opacity-0' : 'opacity-100'
        }`}>
          <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(34,211,238,0.5)] critical-heartbeat" />
        </div>
      )}

      <div className={`min-h-screen rev-canvas pb-20 font-sans transition-all duration-1000 ${showFilter ? 'grayscale-[60%] contrast-[1.1]' : ''}`}>
        <Header
          char={char}
          onBack={handleRequestBack}
          onSave={save}
          saving={saving}
          saved={saved}
          hasUnsavedChanges={hasUnsavedChanges}
          updateTracker={updateTracker}
          showPulse={pulseState !== 'none'}
          readOnly={effectiveReadOnly}
          onOpenSettings={() => setIsSheetSettingsOpen(true)}
        />
        <main className="w-full px-4 sm:px-6 pt-6 relative z-10">
          {activeTab === 'gameplay' && (
            <GameplaySection
              char={char}
              patch={patch}
              updateTracker={updateTracker}
              setLevelUpTarget={setLevelUpTarget}
              setIsClassModalOpen={setIsClassModalOpen}
              setIsPathModalOpen={setIsPathModalOpen}
              setIsDisciplineModalOpen={setIsDisciplineModalOpen}
              setModalDisciplineIndex={setModalDisciplineIndex}
              setIsSpecialSkillModalOpen={setIsSpecialSkillModalOpen}
              setModalSpecialSkillIndex={setModalSpecialSkillIndex}
              setIsAbilityModalOpen={setIsAbilityModalOpen}
              setModalAbilityIndex={setModalAbilityIndex}
              onOpenInventory={() => setIsInventoryModalOpen(true)}
            />
          )}

          {activeTab === 'narrative' && <NarrativeSection char={char} patch={patch} openOriginModal={() => setIsOriginModalOpen(true)} onRemoveOrigin={() => applyOrigin('', {})} />}

          {activeTab === 'progression' && (
            <ProgressionSection
              char={char}
              patch={patch}
              onQueueAbilityPicks={(tasks) => {
                if (tasks.length === 0) return;
                setAbilityPickQueue(tasks);
                setAbilityPickTotal(tasks.length);
              }}
            />
          )}
        </main>
      </div>

      {/* Modals rendered OUTSIDE the filtered wrapper so fixed positioning is viewport-relative */}
      <LevelUpModal char={char} levelUpTarget={levelUpTarget} setLevelUpTarget={setLevelUpTarget} handleAdvance={handleAdvance} handleRegress={handleRegress} />
      <OriginModal char={char} isOpen={isOriginModalOpen} onClose={() => setIsOriginModalOpen(false)} applyOrigin={applyOrigin} />
      <ClassModal char={char} isOpen={isClassModalOpen} onClose={() => setIsClassModalOpen(false)} patch={patch} />
      <SpecialSkillModal char={char} isOpen={isSpecialSkillModalOpen} onClose={() => setIsSpecialSkillModalOpen(false)} patch={patch} modalIndex={modalSpecialSkillIndex} />
      <AbilityModal
        char={char}
        isOpen={isAbilityModalOpen}
        onClose={() => setIsAbilityModalOpen(false)}
        patch={patch}
        modalIndex={modalAbilityIndex}
        guidedQueue={abilityPickQueue}
        guidedTotal={abilityPickTotal}
        onGuidedSelect={(abilityName) => {
          patch({
            abilities: [...char.data.abilities, { name: abilityName, equipped: false }],
          });
          setAbilityPickQueue(prev => {
            const next = prev.slice(1);
            if (next.length === 0) setAbilityPickTotal(0);
            return next;
          });
        }}
        onGuidedSkip={() => {
          setAbilityPickQueue(prev => {
            const next = prev.slice(1);
            if (next.length === 0) setAbilityPickTotal(0);
            return next;
          });
        }}
        onGuidedSkipAll={() => {
          setAbilityPickQueue([]);
          setAbilityPickTotal(0);
        }}
      />
      <InventoryModal char={char} isOpen={isInventoryModalOpen} onClose={() => setIsInventoryModalOpen(false)} patch={patch} />
      {isCrisisNotifOpen && canEdit && (
        <CrisisModal char={char} patch={patch} onClose={() => setIsCrisisNotifOpen(false)} />
      )}

      {currentUserId && (
        <SettingsModal
          isOpen={isSheetSettingsOpen}
          onClose={() => setIsSheetSettingsOpen(false)}
          userId={currentUserId}
          userEmail={currentUserEmail}
          currentUsername={currentUsername}
          onUsernameUpdated={(nextName) => onUsernameUpdated?.(nextName)}
          sheetConfig={{
            char,
            ownerId: char.user_id,
            isOwner,
            onSettingsSaved: ({ editors, dynamicTheme }) => {
              if (!charRef.current) return;
              const updated: Character = {
                ...charRef.current,
                allowed_editors: editors,
                data: {
                  ...charRef.current.data,
                  allowedEditors: editors,
                  dynamicTheme,
                },
              };
              charRef.current = updated;
              setChar(updated);
              broadcast('sheet:permissions', {
                senderId: clientSessionIdRef.current,
                allowed_editors: editors,
              });
              broadcast('sheet:patch', {
                senderId: clientSessionIdRef.current,
                patch: { dynamicTheme },
              });
            },
          }}
        />
      )}

      <PathModal char={char} isOpen={isPathModalOpen} onClose={() => setIsPathModalOpen(false)} patch={patch} classData={getEntryByName(char.data.identity.className)} />
      <DisciplineModal
        char={char}
        isOpen={isDisciplineModalOpen}
        onClose={() => setIsDisciplineModalOpen(false)}
        patch={patch}
        modalIndex={modalDisciplineIndex}
        onDisciplineSelected={(discName: string) => {
          const maxRank = getMaxAccessibleAbilityRank(char.data.progression.tier);
          const allAbilities = getAbilities();
          const ownedNames = new Set((char.data.abilities || []).map(a => a.name));
          const tasks: AbilityPickTask[] = [];

          const ownedRank0 = (char.data.abilities || []).filter(ab => {
            const entry = getEntryByName(ab.name);
            return entry?.data?.source === discName && Number(entry?.data?.class_rank ?? 0) === 0;
          }).length;
          const availRank0 = allAbilities.filter(
            ab => ab.data?.source === discName && Number(ab.data?.class_rank ?? 0) === 0 && !ownedNames.has(ab.name)
          ).length;
          const rank0ToPick = Math.min(availRank0, Math.max(0, 2 - ownedRank0));
          for (let k = 0; k < rank0ToPick; k++) {
            tasks.push({
              discipline: discName,
              rank: 0,
              promptDetail:
                rank0ToPick > 1
                  ? `Select Rank 0 ability from ${discName} (${k + 1} of ${rank0ToPick}).`
                  : `Select 1 Rank 0 ability from ${discName}.`,
            });
          }

          for (let rank = 1; rank <= maxRank; rank++) {
            const ownedAtRank = (char.data.abilities || []).filter(ab => {
              const entry = getEntryByName(ab.name);
              return entry?.data?.source === discName && Number(entry?.data?.class_rank ?? 0) === rank;
            }).length;
            const availAtRank = allAbilities.filter(
              ab => ab.data?.source === discName && Number(ab.data?.class_rank ?? 0) === rank && !ownedNames.has(ab.name)
            ).length;
            if (ownedAtRank < 1 && availAtRank > 0) {
              tasks.push({
                discipline: discName,
                rank,
                promptDetail: `Select 1 Rank ${rank} ability from ${discName}.`,
              });
            }
          }

          if (tasks.length > 0) {
            setAbilityPickQueue(tasks);
            setAbilityPickTotal(tasks.length);
          }
        }}
      />

      <Footer activeTab={activeTab} setActiveTab={setActiveTab} showFilter={showFilter} />

      {isExitConfirmOpen && createPortal(
        <div
          className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsExitConfirmOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="sheet-modal max-w-sm animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-black/20 shrink-0">
              <h3 className="font-cinzel font-bold text-lg text-gray-200 truncate pr-2">Unsaved Changes</h3>
              <button
                type="button"
                onClick={() => setIsExitConfirmOpen(false)}
                className="text-gray-400 hover:text-white font-bold text-2xl leading-none px-2 shrink-0"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="p-5 flex flex-col gap-5">
              <p className="text-sm text-gray-300 leading-relaxed">
                You have unsaved changes on <strong className="text-gray-100">{char.name || 'this character'}</strong>. Would you like to save before exiting?
              </p>

              <div className="flex flex-col gap-2 w-full">
                <button
                  type="button"
                  disabled={saving}
                  onClick={async () => {
                    const ok = await save();
                    if (ok) {
                      setIsExitConfirmOpen(false);
                      onBack();
                    }
                  }}
                  className="w-full py-2.5 px-4 rounded-lg font-bold text-sm border bg-red-900 hover:bg-red-800 border-red-700 text-white shadow-sm transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save & Exit'}
                </button>
                <div className="flex gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => setIsExitConfirmOpen(false)}
                    className="flex-1 py-2 px-3 rounded-lg font-bold text-sm border border-gray-600 text-gray-300 bg-gray-800 hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      dirtyRef.current = false;
                      setHasUnsavedChanges(false);
                      setIsExitConfirmOpen(false);
                      onBack();
                    }}
                    className="flex-1 py-2 px-3 rounded-lg font-bold text-sm border border-red-900/80 text-red-300 bg-red-950/40 hover:bg-red-900/50 transition-colors"
                  >
                    Discard & Exit
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}