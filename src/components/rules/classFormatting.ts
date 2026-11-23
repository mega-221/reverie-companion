export interface ParsedClassIntro {
  archetype: string;
  tags: string[];
  vignettes: [string, string, string];
  description: string;
  recommendedDisciplines?: string;
  recommendedSpecialSkills?: string;
  bodyStartLineIndex: number;
}

export interface ClassTagStyle {
  color: string;
  backgroundColor: string;
  borderColor: string;
}

const TAG_PALETTE = {
  crimson: {
    color: '#fca5a5',
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
    borderColor: 'rgba(239, 68, 68, 0.42)',
  },
  ember: {
    color: '#fdba74',
    backgroundColor: 'rgba(249, 115, 22, 0.14)',
    borderColor: 'rgba(249, 115, 22, 0.42)',
  },
  amber: {
    color: '#fcd34d',
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    borderColor: 'rgba(245, 158, 11, 0.42)',
  },
  emerald: {
    color: '#6ee7b7',
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    borderColor: 'rgba(16, 185, 129, 0.42)',
  },
  teal: {
    color: '#5eead4',
    backgroundColor: 'rgba(20, 184, 166, 0.14)',
    borderColor: 'rgba(20, 184, 166, 0.42)',
  },
  cyan: {
    color: '#67e8f9',
    backgroundColor: 'rgba(6, 182, 212, 0.14)',
    borderColor: 'rgba(6, 182, 212, 0.42)',
  },
  cobalt: {
    color: '#93c5fd',
    backgroundColor: 'rgba(59, 130, 246, 0.14)',
    borderColor: 'rgba(59, 130, 246, 0.42)',
  },
  indigo: {
    color: '#a5b4fc',
    backgroundColor: 'rgba(99, 102, 241, 0.14)',
    borderColor: 'rgba(99, 102, 241, 0.42)',
  },
  violet: {
    color: '#d8b4fe',
    backgroundColor: 'rgba(168, 85, 247, 0.14)',
    borderColor: 'rgba(168, 85, 247, 0.42)',
  },
  rose: {
    color: '#f9a8d4',
    backgroundColor: 'rgba(236, 72, 153, 0.14)',
    borderColor: 'rgba(236, 72, 153, 0.42)',
  },
} as const;

const ARCHETYPE_COLOR_MAP: Record<string, ClassTagStyle> = {
  Champion: TAG_PALETTE.crimson,
  Scoundrel: TAG_PALETTE.emerald,
  Guide: TAG_PALETTE.amber,
  Scholar: TAG_PALETTE.cobalt,
  Mystic: TAG_PALETTE.violet,
  Aberration: TAG_PALETTE.rose,
};

const TRAIT_COLOR_MAP: Record<string, ClassTagStyle> = {
  // Crimson
  Orders: TAG_PALETTE.crimson,
  'Self Burn': TAG_PALETTE.crimson,
  Fleshweaving: TAG_PALETTE.crimson,
  'Blood Manipulation': TAG_PALETTE.crimson,
  // Ember
  Brutal: TAG_PALETTE.ember,
  Explosive: TAG_PALETTE.ember,
  Traps: TAG_PALETTE.ember,
  Strain: TAG_PALETTE.ember,
  Wildfire: TAG_PALETTE.ember,
  // Amber
  Risky: TAG_PALETTE.amber,
  Tempo: TAG_PALETTE.amber,
  'Rapid Fire': TAG_PALETTE.amber,
  // Emerald
  Guardian: TAG_PALETTE.emerald,
  Elusive: TAG_PALETTE.emerald,
  Concoctions: TAG_PALETTE.emerald,
  Parasite: TAG_PALETTE.emerald,
  // Teal
  Formation: TAG_PALETTE.teal,
  Navigator: TAG_PALETTE.teal,
  Toolbox: TAG_PALETTE.teal,
  Constructs: TAG_PALETTE.teal,
  Shapeshifter: TAG_PALETTE.teal,
  // Cyan
  'Area Control': TAG_PALETTE.cyan,
  Auras: TAG_PALETTE.cyan,
  'Remote Control': TAG_PALETTE.cyan,
  Augury: TAG_PALETTE.cyan,
  Divination: TAG_PALETTE.cyan,
  // Cobalt
  Breacher: TAG_PALETTE.cobalt,
  Sniper: TAG_PALETTE.cobalt,
  Enforcer: TAG_PALETTE.cobalt,
  Planning: TAG_PALETTE.cobalt,
  Prediction: TAG_PALETTE.cobalt,
  Gravity: TAG_PALETTE.cobalt,
  // Indigo
  Stealth: TAG_PALETTE.indigo,
  // Violet
  Channelling: TAG_PALETTE.violet,
  'Memory Theft': TAG_PALETTE.violet,
  Incoherent: TAG_PALETTE.violet,
  // Rose
  Elegant: TAG_PALETTE.rose,
  Prosthetics: TAG_PALETTE.rose,
  Reanimation: TAG_PALETTE.rose,
};

const FALLBACK_PALETTE_LIST: ClassTagStyle[] = Object.values(TAG_PALETTE);

export function getClassTagStyle(label: string, isArchetype = false): ClassTagStyle {
  if (isArchetype && ARCHETYPE_COLOR_MAP[label]) {
    return ARCHETYPE_COLOR_MAP[label];
  }
  if (TRAIT_COLOR_MAP[label]) {
    return TRAIT_COLOR_MAP[label];
  }
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  }
  return FALLBACK_PALETTE_LIST[hash % FALLBACK_PALETTE_LIST.length];
}

// Verified exact opening phrases for the 3 vignettes + 4th non-lore description paragraph across all 20 classes.
const CLASS_SECTION_SPLITS: Record<string, [string, string, string, string]> = {
  berserker: [
    'The guard had been mocking him',
    'He rapidly rose through the ranks',
    'His heart would sink when she met',
    'Berserkers are simple and brutal warriors',
  ],
  legionary: [
    'He was not just another cog',
    'She had spent enough time in this place',
    'They stood shoulder to shoulder',
    'Legionaries are trained and versatile servants',
  ],
  marksman: [
    'When his village was overrun',
    'As the sun was nearing its zenith',
    'He drew his bow and turned around',
    'Marksmen are proficient hunters',
  ],
  warden: [
    'The patrons’ voices grew ever louder',
    'The novice desperately tried to hold off',
    'As he stood behind his lord',
    'Wardens are heavily armored fighters',
  ],
  duelist: [
    'As the feast was nearing its end',
    'He had been sent to quell a peasant uprising',
    'When she woke up her rival’s mercenaries',
    'Duelists are skilled and elegant fighters',
  ],
  gunslinger: [
    'He could not save his mother',
    'She was known amongst her colleagues',
    'He had four belts lined with pistols',
    'Gunlingers are outlaws and vigilantes',
  ],
  rogue: [
    'When her mother disappeared',
    'The newspaper spoke of a legendary marauder',
    'She wiped the fresh blood from her blade',
    'Rogues are chaotic and resourceful operatives',
  ],
  stalker: [
    'The trees surrounding his perimeter',
    'They left her alone to deal with the bounty',
    'They had begun torching his woodland',
    'Stalkers are lurking hunters',
  ],
  bard: [
    'He stood upon the stage',
    'She was the first person they would turn to',
    'He was beyond conviction and beyond care',
    'Bards are artists and amplifiers of emotion',
  ],
  envoy: [
    'As he was being transported to the scene',
    'He knew they were after him',
    'She looked solemnly over the battlefield-to-become',
    'Envoys are diplomats and commanders',
  ],
  wayfarer: [
    'He ran through the grassy field',
    'This was just another night of exchanging stories',
    'She was well known for her knowledge',
    'Wayfarers are scouts and explorers',
  ],
  apothecary: [
    'An old woman sat in a dimly lit room',
    'He was by all means slower',
    'His position was overrun by the invading force',
    'Apothecaries are scientists and doctors',
  ],
  clairvoyant: [
    'The crime scene was already blocked off',
    'His path to the vault was now blocked',
    'She sat atop the lookout tower',
    'Clairvoyants are investigators and tacticians',
  ],
  mechanist: [
    'It finally moved!',
    'He sat behind tall cover',
    'She stood inside her construct-suit',
    'Mechanists are pioneers of robotics',
  ],
  arbiter: [
    'A man sits under the cloudy, silvery sky',
    'They send her in only when',
    'The creatures of the forest were rapidly descending',
    'Arbiters are the mystics of Trumst',
  ],
  empath: [
    'After a battle would end',
    'He knew of both the dangers',
    'Armed with naught but a walking stick',
    'Empaths are diviners and telepaths',
  ],
  sorcerer: [
    'His parents woke him and his sister up',
    'When they woke up in the forest',
    'Throughout the night he stood on the castle tower',
    'Sorcerers are powerful channelers of flame',
  ],
  witch: [
    'She burst into the dimly lit cellar',
    'The winter after her husband’s death',
    'They all hated him and they all relied on him',
    'Witches are occult healers and mediums',
  ],
  protean: [
    'With his sister’s death he was left',
    'She had run out of pages in her journal',
    'His lover’s death had made him a recluse',
    'Proteans are shapeshifters who have been alienated',
  ],
  vessel: [
    'Her appetite wasn’t the same ever since',
    'The lowlives had finished their drinks',
    'For her next act she would demonstrate',
    'Vessels are hosts to vampiric parasites',
  ],
};

function formatTagLabel(rawTag: string): string {
  // Split CamelCase tags like MemoryTheft -> Memory Theft, AreaControl -> Area Control
  return rawTag
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseClassSectionIntro(
  sectionId: string,
  lines: string[]
): ParsedClassIntro | null {
  const markers = CLASS_SECTION_SPLITS[sectionId];
  if (!markers) return null;

  let archetype = '';
  let tags: string[] = [];
  let recommendedDisciplines: string | undefined;
  let recommendedSpecialSkills: string | undefined;
  let quoteText = '';
  let bodyStartLineIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('**Archetype:**')) {
      const val = trimmed.replace(/^\*\*Archetype:\*\*\s*/, '').trim();
      const parts = val
        .split(/\s*·\s*/)
        .map((p) => formatTagLabel(p))
        .filter(Boolean);
      archetype = parts[0] || '';
      tags = parts.slice(1);
      continue;
    }

    if (trimmed.startsWith('**Recommended disciplines:**')) {
      recommendedDisciplines = trimmed
        .replace(/^\*\*Recommended disciplines:\*\*\s*/, '')
        .trim();
      continue;
    }

    if (trimmed.startsWith('**Recommended special skills:**')) {
      recommendedSpecialSkills = trimmed
        .replace(/^\*\*Recommended special skills:\*\*\s*/, '')
        .trim();
      continue;
    }

    if (trimmed.startsWith('> ')) {
      quoteText = trimmed.replace(/^>\s*/, '').trim();
      bodyStartLineIndex = i + 1;
      break;
    }
  }

  if (!quoteText) return null;

  const idx0 = quoteText.indexOf(markers[0]);
  const idx1 = quoteText.indexOf(markers[1]);
  const idx2 = quoteText.indexOf(markers[2]);
  const idx3 = quoteText.indexOf(markers[3]);

  if (idx0 !== 0 || idx1 <= idx0 || idx2 <= idx1 || idx3 <= idx2) {
    return null;
  }

  return {
    archetype,
    tags,
    vignettes: [
      quoteText.slice(idx0, idx1).trim(),
      quoteText.slice(idx1, idx2).trim(),
      quoteText.slice(idx2, idx3).trim(),
    ],
    description: quoteText.slice(idx3).trim(),
    recommendedDisciplines,
    recommendedSpecialSkills,
    bodyStartLineIndex,
  };
}
