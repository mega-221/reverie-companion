import { supabase } from '../supabase';
import { defaultCharacterData } from '../defaults';
import type { AllowedEditor, CharacterData } from '../types';

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
