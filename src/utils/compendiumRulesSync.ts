import type { CompendiumEntry } from '../types';

export interface SyncedAbilityData {
  marker: string;
  name: string;
  subtype: string;
  requires?: string;
  snCost?: string | null;
  acc?: string | null;
  dmg?: string | null;
  eva?: string | null;
  extraStats?: string[];
  effectLines: string[];
}

const WEAPON_REQ_NAMES = new Set([
  'polearm',
  'sword',
  'axe',
  'blunt',
  'dagger',
  'bow',
  'crossbow',
  'firearm',
  'sling',
  'thrown',
  'shield',
  'unarmed',
]);

function normalizeSubtype(entry: CompendiumEntry, fallbackSubtype?: string): string {
  const d = entry.data || {};
  if (d.feature_type === 'passive' || d.type === 'passive') return 'Passive';
  if (fallbackSubtype && fallbackSubtype.trim().length > 0) return fallbackSubtype;

  const rawType = String(d.type || 'utility').toLowerCase();
  const range = String(d.range || '').trim();
  if (rawType === 'attack') {
    if (range && !['self', 'none', '-'].includes(range.toLowerCase())) {
      return `${range} Attack`;
    }
    return 'Attack';
  }
  if (rawType === 'defensive') return 'Defensive';
  return 'Utility';
}

function extractConvictionAndCleanEffect(rawDesc: string): {
  convictionReq: string | null;
  effectLines: string[];
} {
  const trimmed = rawDesc.trim();
  if (!trimmed || trimmed === '-') {
    return { convictionReq: null, effectLines: ['-'] };
  }

  let work = trimmed;
  let convictionReq: string | null = null;

  const convMatch = work.match(
    /^Conviction:\s*(Vamor|Bruma|Trumst|Halice)\b(?:\s*[:\-—·]\s*|\s+)?/i
  );
  if (convMatch) {
    const rawSeason = convMatch[1];
    const normalizedSeason =
      rawSeason.charAt(0).toUpperCase() + rawSeason.slice(1).toLowerCase();
    convictionReq = `Conviction: ${normalizedSeason}`;
    work = work.slice(convMatch[0].length).trim();
  }

  return {
    convictionReq,
    effectLines: work ? [work] : [],
  };
}

function formatCompendiumRequirements(
  entry: CompendiumEntry,
  sourceKind: 'basic' | 'class' | 'discipline',
  convictionReq: string | null,
  fallbackRequires?: string
): string {
  const d = entry.data || {};
  const rank = Number(d.class_rank ?? 0);
  const rawReq = String(d.requirement || '').trim();
  const parts: string[] = [];

  if (sourceKind === 'class') {
    const classSource = String(d.source || '').trim();
    // Preserve static "Requires: Berserker Rank 2" label style if present, otherwise use source + rank
    const staticRankMatch = fallbackRequires?.match(/([A-Za-z]+\s+Rank\s+\d+)/i);
    if (staticRankMatch) {
      parts.push(staticRankMatch[1]);
    } else if (classSource) {
      parts.push(`${classSource} Rank ${rank}`);
    } else {
      parts.push(`Class Rank ${rank}`);
    }
  } else if (sourceKind === 'discipline') {
    parts.push(`Class Rank ${rank}`);
  }

  if (rawReq && rawReq.toLowerCase() !== 'none') {
    const tokens = rawReq.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
    const looksLikeWeaponList = tokens.length > 0 && tokens.every((t) => WEAPON_REQ_NAMES.has(t));
    if (looksLikeWeaponList && sourceKind === 'discipline' && !/^weapons:/i.test(rawReq)) {
      parts.push(`Weapons: ${rawReq}`);
    } else {
      parts.push(rawReq);
    }
  }

  if (convictionReq) {
    parts.push(convictionReq);
  }

  if (parts.length === 0) return 'None';
  return `Requires: ${parts.join(' · ')}`;
}

export function compendiumAbilityToSynced(
  entry: CompendiumEntry,
  sourceKind: 'basic' | 'class' | 'discipline',
  fallback?: { subtype?: string; requires?: string }
): SyncedAbilityData {
  const d = entry.data || {};
  const isPassive = d.feature_type === 'passive' || d.type === 'passive';
  const marker = isPassive ? '' : String(d.speed || '').trim();
  const subtype = normalizeSubtype(entry, fallback?.subtype);
  const { convictionReq, effectLines } = extractConvictionAndCleanEffect(String(d.description || ''));
  const requires = formatCompendiumRequirements(
    entry,
    sourceKind,
    convictionReq,
    fallback?.requires
  );

  if (isPassive) {
    return {
      marker: '',
      name: entry.name,
      subtype,
      requires,
      snCost: null,
      acc: null,
      dmg: null,
      eva: null,
      extraStats: [],
      effectLines,
    };
  }

  const snLabel = sourceKind === 'discipline' ? 'Strain' : 'SN';
  const snCost =
    d.sn_cost !== undefined && d.sn_cost !== null && String(d.sn_cost) !== ''
      ? `${d.sn_cost} ${snLabel}`
      : '0 SN';

  const acc = d.acc !== undefined && d.acc !== null && String(d.acc) !== '' ? `${d.acc} ACC` : null;
  const dmg = d.dmg !== undefined && d.dmg !== null && String(d.dmg) !== '' ? `${d.dmg} DMG` : null;
  const eva = d.eva !== undefined && d.eva !== null && String(d.eva) !== '' ? `${d.eva} EVA` : null;
  const extraStats: string[] = [];
  if (d.upkeep !== undefined && d.upkeep !== null && String(d.upkeep).trim() !== '' && String(d.upkeep) !== '0') {
    extraStats.push(`Upkeep ${d.upkeep}`);
  }

  return {
    marker,
    name: entry.name,
    subtype,
    requires,
    snCost,
    acc,
    dmg,
    eva,
    extraStats,
    effectLines,
  };
}

export function getCompendiumIndex(entries: CompendiumEntry[]) {
  const byType = new Map<string, CompendiumEntry[]>();
  const byNameLower = new Map<string, CompendiumEntry>();
  const abilitiesBySourceLower = new Map<string, CompendiumEntry[]>();

  for (const entry of entries) {
    const tList = byType.get(entry.type) || [];
    tList.push(entry);
    byType.set(entry.type, tList);

    byNameLower.set(entry.name.trim().toLowerCase(), entry);

    if (entry.type === 'ability') {
      const src = String(entry.data?.source || '').trim().toLowerCase();
      if (src) {
        const sList = abilitiesBySourceLower.get(src) || [];
        sList.push(entry);
        abilitiesBySourceLower.set(src, sList);
      }
    }
  }

  return { byType, byNameLower, abilitiesBySourceLower };
}

export function sortCompendiumAbilitiesWithOrder(
  dbAbilities: CompendiumEntry[],
  preferredOrderNames: string[] = []
): CompendiumEntry[] {
  const orderMap = new Map<string, number>();
  preferredOrderNames.forEach((n, idx) => orderMap.set(n.trim().toLowerCase(), idx));

  return [...dbAbilities].sort((a, b) => {
    const rankA = Number(a.data?.class_rank ?? 0);
    const rankB = Number(b.data?.class_rank ?? 0);
    if (rankA !== rankB) return rankA - rankB;

    const idxA = orderMap.get(a.name.trim().toLowerCase());
    const idxB = orderMap.get(b.name.trim().toLowerCase());
    if (idxA !== undefined && idxB !== undefined) return idxA - idxB;
    if (idxA !== undefined) return -1;
    if (idxB !== undefined) return 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Generates searchable plain text from DB compendium entries relevant to a rules section
 * so live search indexes updated DB names, effects, statements, and descriptions.
 */
export function getSyncedSearchTextForSection(
  sectionId: string,
  entries: CompendiumEntry[]
): string {
  if (!entries || entries.length === 0) return '';
  const { byType, byNameLower, abilitiesBySourceLower } = getCompendiumIndex(entries);

  if (sectionId === 'base-abilities') {
    const basics = abilitiesBySourceLower.get('basic') || [];
    return basics
      .map((a) => `${a.name} ${a.data?.description || ''} ${a.data?.requirement || ''}`)
      .join(' ');
  }

  if (sectionId === 'special-skills') {
    return (byType.get('special_skill') || [])
      .map((s) => `${s.name} ${s.data?.attribute || ''} ${s.data?.description || ''}`)
      .join(' ');
  }

  if (sectionId === 'origins') {
    return (byType.get('origin') || [])
      .map(
        (o) =>
          `${o.name} ${o.data?.plane || ''} ${o.data?.lore || ''} ${o.data?.inspiration || ''} ${o.data?.starting || ''}`
      )
      .join(' ');
  }

  if (sectionId === 'convictions') {
    return (byType.get('conviction') || [])
      .map((c) => `${c.name} ${c.data?.season || ''} ${c.data?.statement || ''}`)
      .join(' ');
  }

  if (sectionId === 'failings') {
    return (byType.get('failing') || [])
      .map((f) => `${f.name} ${f.data?.statement || ''}`)
      .join(' ');
  }

  if (sectionId === 'available-disciplines') {
    return (byType.get('discipline') || [])
      .map((d) => `${d.name} ${d.data?.description || ''}`)
      .join(' ');
  }

  const clsEntry = byType.get('class')?.find((c) => c.name.toLowerCase() === sectionId.toLowerCase());
  if (clsEntry) {
    const paths: string[] = Array.isArray(clsEntry.data?.paths) ? clsEntry.data.paths : [];
    const sources = [clsEntry.name, ...paths];
    const abs = sources.flatMap((s) => abilitiesBySourceLower.get(s.toLowerCase()) || []);
    return `${clsEntry.data?.archetype || ''} ${paths.join(' ')} ${abs
      .map((a) => `${a.name} ${a.data?.description || ''}`)
      .join(' ')}`;
  }

  const discEntry = byNameLower.get(sectionId.toLowerCase());
  if (discEntry && discEntry.type === 'discipline') {
    const abs = abilitiesBySourceLower.get(discEntry.name.toLowerCase()) || [];
    return `${discEntry.data?.description || ''} ${abs
      .map((a) => `${a.name} ${a.data?.description || ''} ${a.data?.requirement || ''}`)
      .join(' ')}`;
  }

  return '';
}
