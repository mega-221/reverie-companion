import { supabase } from '../supabase';
import { defaultCharacterData } from '../defaults';
import type { AllowedEditor, Character, CharacterData, CompendiumEntry, InventoryItem } from '../types';
import { calculateTierFromLevel, getSpendableXp } from '../components/sheet/progression/progressionData';
import { apMax } from '../calc';

/**
 * Normalizes a partial/older CharacterData blob safely with full default structures.
 */
export function safeCharacterData(raw?: Partial<CharacterData>): CharacterData {
  const base = defaultCharacterData();
  return {
    ...base,
    ...raw,
    identity: {
      ...base.identity,
      ...(raw?.identity || {}),
      inspirations: Array.isArray(raw?.identity?.inspirations) ? raw.identity.inspirations : [],
      originChoices: raw?.identity?.originChoices || {},
    },
    progression: {
      ...base.progression,
      ...(raw?.progression || {}),
      advancements: Array.isArray(raw?.progression?.advancements) ? raw.progression.advancements : [],
    },
    attributes: {
      ...base.attributes,
      ...(raw?.attributes || {}),
    },
    skills: raw?.skills || base.skills,
    specialSkills: Array.isArray(raw?.specialSkills) ? raw.specialSkills : [],
    convictions: Array.isArray(raw?.convictions) ? raw.convictions : [],
    failings: Array.isArray(raw?.failings) ? raw.failings : [],
    aspects: Array.isArray(raw?.aspects) ? raw.aspects : [],
    abilities: Array.isArray(raw?.abilities) ? raw.abilities : [],
    disciplines: Array.isArray(raw?.disciplines) ? raw.disciplines : [],
    items: Array.isArray(raw?.items) ? raw.items : [],
    possessions: Array.isArray(raw?.possessions) ? raw.possessions : [],
    equipment: {
      ...base.equipment,
      ...(raw?.equipment || {}),
      extra: Array.isArray(raw?.equipment?.extra) ? raw.equipment.extra : [],
    },
    bonus: {
      ...base.bonus,
      ...(raw?.bonus || {}),
    },
    trackers: {
      ...base.trackers,
      ...(raw?.trackers || {}),
      injuries: Array.isArray(raw?.trackers?.injuries) ? raw.trackers.injuries : [],
    },
    notes: raw?.notes || '',
    journal: Array.isArray(raw?.journal) ? raw.journal : [],
    relationships: Array.isArray(raw?.relationships) ? raw.relationships : [],
    allowedEditors: Array.isArray(raw?.allowedEditors) ? raw.allowedEditors : [],
  };
}

type LegacyInjury = {
  name?: string;
  part?: string;
  affectedAttributes?: string[] | string;
  severity?: number;
  treatment?: 'none' | 'survival' | 'medicine';
  weeksLeft?: number;
};

export function normalizeCharacter(
  fetchedChar: Character,
  getEntryByName: (name: string) => CompendiumEntry | undefined
): Character {
  const rawItems = Array.isArray(fetchedChar.data?.items)
    ? fetchedChar.data.items as Array<InventoryItem | string>
    : [];
  const migratedItems: InventoryItem[] = rawItems.map((item) =>
    typeof item === 'string'
      ? { id: crypto.randomUUID(), name: item, qty: 1 }
      : { ...item, id: item.id || crypto.randomUUID() }
  );

  const resolveEq = (value: string): string => {
    if (!value) return '';
    if (value.length > 30) return value;
    const existing = migratedItems.find((item) => item.name === value);
    if (existing) return existing.id;
    const newId = crypto.randomUUID();
    migratedItems.push({ id: newId, name: value, qty: 0 });
    return newId;
  };

  const rawEquipment = fetchedChar.data?.equipment;
  const migratedEquipment = {
    mainHand: resolveEq(rawEquipment?.mainHand || ''),
    mainHandMode: (rawEquipment?.mainHandMode || (rawEquipment?.mainHand ? '1H' : '')) as '1H' | '2H' | '',
    offHand: resolveEq(rawEquipment?.offHand || ''),
    armour: resolveEq(rawEquipment?.armour || ''),
    extra: Array.isArray(rawEquipment?.extra)
      ? rawEquipment.extra.map((itemId) => resolveEq(itemId))
      : [],
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

  const safeData = safeCharacterData(fetchedChar.data);
  const rawLevel = Math.max(0, safeData.progression.level);
  const rawXp = Math.max(0, safeData.progression.xp);
  const derivedTier = calculateTierFromLevel(rawLevel);
  const totalXp = rawXp < rawLevel * 5
    ? rawLevel * 5 + Math.min(4, rawXp)
    : rawXp;

  const safeDataWithMigrations: CharacterData = {
    ...safeData,
    progression: {
      ...safeData.progression,
      tier: safeData.progression.tier ?? derivedTier,
      level: rawLevel,
      xp: totalXp,
      spendableXp: totalXp,
    },
    trackers: {
      ...safeData.trackers,
      injuries: (safeData.trackers.injuries as LegacyInjury[]).map((injury) => ({
        name: injury.name || injury.part || 'Unknown Injury',
        affectedAttributes: Array.isArray(injury.affectedAttributes)
          ? injury.affectedAttributes
          : typeof injury.affectedAttributes === 'string'
            ? injury.affectedAttributes.split(',').map((value) => value.trim())
            : [],
        severity: injury.severity ?? 1,
        treatment: injury.treatment || 'none',
        weeksLeft: injury.weeksLeft ?? (injury.severity ?? 1) * 4,
      })),
    },
    equipment: migratedEquipment,
    abilities: safeData.abilities.map((ability) =>
      typeof ability === 'string'
        ? { name: ability, equipped: true }
        : ability
    ),
    items: migratedItems,
    possessions: safeData.possessions.map((item) => ({
      ...item,
      id: item.id || crypto.randomUUID(),
    })),
    aspects: (safeData.aspects || []).map((aspect) =>
      typeof aspect === 'string'
        ? { id: crypto.randomUUID(), name: aspect, abandoned: false }
        : {
            id: aspect.id || crypto.randomUUID(),
            name: aspect.name || '',
            abandoned: Boolean(aspect.abandoned),
          }
    ),
    journal: migratedJournal,
    allowedEditors: Array.isArray(fetchedChar.allowed_editors)
      ? fetchedChar.allowed_editors
      : safeData.allowedEditors,
  };

  const initialApMax = apMax(safeDataWithMigrations, getEntryByName);
  if (
    !safeDataWithMigrations.trackers.apInitialized &&
    safeDataWithMigrations.trackers.ap === 0 &&
    initialApMax > 0
  ) {
    safeDataWithMigrations.trackers.ap = initialApMax;
    safeDataWithMigrations.trackers.apInitialized = true;
  }

  safeDataWithMigrations.progression.spendableXp = getSpendableXp(safeDataWithMigrations);

  return {
    ...fetchedChar,
    allowed_editors: safeDataWithMigrations.allowedEditors,
    data: safeDataWithMigrations,
  };
}

export function isTextInputPatch(
  patch: Partial<CharacterData>,
  prevData: CharacterData
): boolean {
  if ('notes' in patch || 'journal' in patch || 'relationships' in patch) return true;
  if ('identity' in patch && patch.identity) {
    const sameMeta =
      patch.identity.origin === prevData.identity?.origin &&
      patch.identity.className === prevData.identity?.className &&
      patch.identity.path === prevData.identity?.path &&
      JSON.stringify(patch.identity.inspirations) === JSON.stringify(prevData.identity?.inspirations) &&
      JSON.stringify(patch.identity.originChoices) === JSON.stringify(prevData.identity?.originChoices);
    if (sameMeta && patch.identity.quote !== prevData.identity?.quote) return true;
  }
  if ('convictions' in patch && patch.convictions && patch.convictions.length === (prevData.convictions?.length ?? 0)) {
    return true;
  }
  if ('failings' in patch && patch.failings && patch.failings.length === (prevData.failings?.length ?? 0)) {
    return true;
  }
  return false;
}

/**
 * Updates `characters` and mirrors the updated snapshot to all `party_characters` rows
 * referencing that character.
 */
export async function saveAndMirrorCharacter(params: {
  characterId: string;
  name?: string;
  data?: CharacterData;
  allowedEditors?: AllowedEditor[];
  updatedAt?: string;
}): Promise<{ error: Error | null; updatedAt: string }> {
  const updatedAt = params.updatedAt || new Date().toISOString();

  const charUpdate: Record<string, unknown> = { updated_at: updatedAt };
  if (params.name !== undefined) charUpdate.name = params.name;
  if (params.data !== undefined) charUpdate.data = params.data;
  if (params.allowedEditors !== undefined) charUpdate.allowed_editors = params.allowedEditors;

  const { error } = await supabase
    .from('characters')
    .update(charUpdate)
    .eq('id', params.characterId);

  if (error) {
    return { error: new Error(error.message), updatedAt };
  }

  const mirrorUpdate: Record<string, unknown> = {};
  if (params.name !== undefined) mirrorUpdate.character_name = params.name;
  if (params.data !== undefined) mirrorUpdate.character_data = params.data;

  if (Object.keys(mirrorUpdate).length > 0) {
    await supabase
      .from('party_characters')
      .update(mirrorUpdate)
      .eq('character_id', params.characterId);
  }

  return { error: null, updatedAt };
}
