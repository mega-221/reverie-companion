import type { CustomNpc } from '../types';

const STORAGE_KEY_PREFIX = 'reverie_npcs_v1_';

function storageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId || 'local'}`;
}

export function createBlankNpc(): CustomNpc {
  const now = new Date().toISOString();
  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `npc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: 'New Creature',
    role: 'Humanoid Enemy',
    className: '',
    path: '',
    tier: 1,
    classRank: 1,
    notes: '',
    stats: {
      vigorMax: 6,
      strainMax: 6,
      dpMax: 2,
      apMax: 0,
      eva: 10,
      acc: 0,
      mov: 4,
      resists: '',
      armourName: '',
    },
    attributes: { grt: 1, ref: 1, int: 1, psy: 1 },
    skills: {},
    convictions: [],
    failings: [],
    abilities: [],
    items: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function normalizeNpc(raw: Partial<CustomNpc>): CustomNpc {
  const blank = createBlankNpc();
  return {
    ...blank,
    ...raw,
    id: typeof raw.id === 'string' && raw.id ? raw.id : blank.id,
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name : 'Unnamed Creature',
    role: typeof raw.role === 'string' ? raw.role : '',
    className: typeof raw.className === 'string' ? raw.className : '',
    path: typeof raw.path === 'string' ? raw.path : '',
    tier: Number.isFinite(Number(raw.tier)) ? Math.max(0, Number(raw.tier)) : 1,
    classRank: Number.isFinite(Number(raw.classRank)) ? Math.max(0, Number(raw.classRank)) : 1,
    notes: typeof raw.notes === 'string' ? raw.notes : '',
    stats: {
      ...blank.stats,
      ...(raw.stats || {}),
      vigorMax: Math.max(1, Number(raw.stats?.vigorMax ?? blank.stats.vigorMax) || 1),
      strainMax: Math.max(0, Number(raw.stats?.strainMax ?? blank.stats.strainMax) || 0),
      dpMax: Math.max(0, Number(raw.stats?.dpMax ?? blank.stats.dpMax) || 0),
      apMax: Math.max(0, Number(raw.stats?.apMax ?? 0) || 0),
      eva: Number.isFinite(Number(raw.stats?.eva)) ? Number(raw.stats?.eva) : 10,
      acc: Number.isFinite(Number(raw.stats?.acc)) ? Number(raw.stats?.acc) : 0,
      mov: Math.max(0, Number(raw.stats?.mov ?? 4) || 0),
      resists: typeof raw.stats?.resists === 'string' ? raw.stats.resists : '',
      armourName: typeof raw.stats?.armourName === 'string' ? raw.stats.armourName : '',
    },
    attributes: {
      grt: Number.isFinite(Number(raw.attributes?.grt)) ? Number(raw.attributes?.grt) : 1,
      ref: Number.isFinite(Number(raw.attributes?.ref)) ? Number(raw.attributes?.ref) : 1,
      int: Number.isFinite(Number(raw.attributes?.int)) ? Number(raw.attributes?.int) : 1,
      psy: Number.isFinite(Number(raw.attributes?.psy)) ? Number(raw.attributes?.psy) : 1,
    },
    skills: raw.skills && typeof raw.skills === 'object' ? { ...raw.skills } : {},
    convictions: Array.isArray(raw.convictions) ? raw.convictions : [],
    failings: Array.isArray(raw.failings) ? raw.failings : [],
    abilities: Array.isArray(raw.abilities) ? raw.abilities : [],
    items: Array.isArray(raw.items) ? raw.items : [],
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : blank.createdAt,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : blank.updatedAt,
  };
}

export function loadNpcs(userId: string): CustomNpc[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => normalizeNpc(item));
  } catch {
    return [];
  }
}

export function saveNpcs(userId: string, npcs: CustomNpc[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(npcs));
  } catch {
    // ignore quota errors
  }
}

export function upsertNpc(userId: string, npc: CustomNpc): CustomNpc[] {
  const list = loadNpcs(userId);
  const now = new Date().toISOString();
  const nextNpc = normalizeNpc({ ...npc, updatedAt: now });
  const idx = list.findIndex((n) => n.id === nextNpc.id);
  const nextList = idx >= 0
    ? list.map((n, i) => (i === idx ? nextNpc : n))
    : [nextNpc, ...list];
  saveNpcs(userId, nextList);
  return nextList;
}

export function deleteNpc(userId: string, id: string): CustomNpc[] {
  const nextList = loadNpcs(userId).filter((n) => n.id !== id);
  saveNpcs(userId, nextList);
  return nextList;
}

export function duplicateNpc(userId: string, id: string): { list: CustomNpc[]; copy: CustomNpc | null } {
  const list = loadNpcs(userId);
  const src = list.find((n) => n.id === id);
  if (!src) return { list, copy: null };
  const now = new Date().toISOString();
  const copy = normalizeNpc({
    ...src,
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `npc-${Date.now()}`,
    name: `${src.name} (Copy)`,
    createdAt: now,
    updatedAt: now,
  });
  const nextList = [copy, ...list];
  saveNpcs(userId, nextList);
  return { list: nextList, copy };
}
