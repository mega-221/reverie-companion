import {
  KEYWORD_PATTERN_STR,
  resolveKeywordMatch,
  type KeywordKey,
  type KeywordMatchMode,
} from './keywords';

export interface GlossaryEntry {
  title: string;
  description: string;
}

export const KEYWORD_GLOSSARY: Record<KeywordKey, GlossaryEntry> = {
  pierce: {
    title: 'Pierce X',
    description: 'Bypasses up to X Armour Points (AP) on a successful hit.',
  },
  break: {
    title: 'Break X',
    description: "Depletes X Armour Points (AP) from the target's armour on a successful hit.",
  },
  stun: {
    title: 'Stun X',
    description:
      'Afflicted creature has -X on combat rolls. Reduced by 1 at the end of its turn and by 2 upon performing a defensive action.',
  },
  bleeding: {
    title: 'Bleeding X',
    description:
      'Loses X Vigor (VG) at the start of its turn or once per minute. Reduced by 1 via a defensive action, or by 2 by spending 2 ACP on a CL 12+X Survival check. Unbroken medium/heavy armour or shields grant immunity.',
  },
  burn: {
    title: 'Burn X',
    description:
      'Loses X Vigor (VG) at the start of its turn. Reduced by 1 when it deals damage and by 2 upon performing a defensive action. Deals +2 DMG to targets without armour.',
  },
  soulburn: {
    title: 'Soulburn X',
    description:
      'Loses X Vigor (VG) at the start of its turn. Reduced by 2 upon performing a defensive action. Upon reaching 0 VG, Soulburn is cleansed and Burn 1 is applied.',
  },
  tmv: {
    title: 'Temporary Vigor (TMV)',
    description:
      'Additional Vigor unaffected by armour that is depleted before the main Vigor pool.',
  },
  fractured: {
    title: 'Fractured X',
    description:
      "Afflicted creature's abilities cost +1 Action Point to perform. Reduced by 1 at the end of its turn, or by 2 via a defensive action and succeeding a CL 12+X Discipline check.",
  },
  prone: {
    title: 'Prone',
    description:
      'Afflicted creature loses its reaction for this turn. At the start of its next turn, it loses 2 Action Points and its movement action.',
  },
  feeble: {
    title: 'Feeble X',
    description: 'Afflicted creature deals -X Damage (DMG) during its next turn.',
  },
  blind: {
    title: 'Blind X',
    description:
      'Afflicted creature suffers -8 Accuracy (ACC) on all ranged attacks and abilities during its next X turns.',
  },
  immobilized: {
    title: 'Immobilized X',
    description: 'Afflicted creature is unable to move during its next X turns.',
  },
  unaware: {
    title: 'Unaware',
    description: 'Unaware creatures have 0 Evasion (EVA).',
  },
  stealth: {
    title: 'Stealth',
    description:
      "Other creatures are Unaware of a creature in Stealth. Lost upon entering a creature's line of sight or attacking within line of sight.",
  },
  taunt: {
    title: 'Taunted',
    description:
      'Afflicted creature has -2 on all attacks not targeting the creature that inflicted Taunt during its next 2 turns.',
  },
  intimidate: {
    title: 'Intimidated',
    description:
      'Afflicted creature has -2 on all attacks targeting the source during its next 2 turns.',
  },
  pull: {
    title: 'Pull X',
    description: 'Moves the target X tiles directly toward you.',
  },
  push: {
    title: 'Push X',
    description: 'Moves the target X tiles directly away from you.',
  },
};

export const ABBREV_GLOSSARY: Record<string, GlossaryEntry> = {
  ACP: {
    title: 'ACP — Action Points',
    description:
      'Each combatant gets 3 Action Points per turn to spend on abilities (> Swift = 1, >> Average = 2, >>> Slow = 3).',
  },
  AP_ACTION: {
    title: 'AP — Action Points',
    description:
      'Each combatant gets 3 Action Points per turn to spend on abilities (> Swift = 1, >> Average = 2, >>> Slow = 3).',
  },
  AP: {
    title: 'AP — Armour Points',
    description:
      'Flat damage reduction applied before lowering Vigor. Can be depleted by Break effects and is restored at the end of combat.',
  },
  ACC: {
    title: 'ACC — Accuracy',
    description: 'Each point of Accuracy adds +1 to your Combat Roll against enemy Evasion (EVA).',
  },
  DMG: {
    title: 'DMG — Damage',
    description: 'Harm dealt on a hit. Reduced by Armour Points (AP) before lowering Vigor (VG).',
  },
  EVA: {
    title: 'EVA — Evasion',
    description:
      'Defense rating (starts at 10). Acts as the target CL for all attacks directed at you.',
  },
  CL: {
    title: 'CL — Challenge Level',
    description:
      'Target number needed to succeed on a roll. Reaching CL + 4 on a skill check yields a Radiant Success.',
  },
  VG: {
    title: 'VG — Vigor',
    description:
      'Your physical resilience & health pool. Dropping to 0 VG or below exposes you to Defying Death and forces an emergency Strain gain.',
  },
  HP: {
    title: 'HP / VG — Vigor',
    description:
      'Your health & physical resilience pool (Vigor Limit starts at 5 + Tier + advancements).',
  },
  VL: {
    title: 'VL — Vigor Limit',
    description: 'Maximum Vigor capacity (5 + Tier + advancements).',
  },
  VM: {
    title: 'VM — Vigor Maximum',
    description: 'Maximum Vigor capacity (5 + Tier + advancements).',
  },
  SN: {
    title: 'SN — Strain',
    description:
      'Morale & exhaustion resource. Exceeding your Strain Limit (SL) triggers a CL 18 Conviction Check (risking a Crisis).',
  },
  SL: {
    title: 'SL — Strain Limit',
    description:
      'Maximum Strain before Standing On The Edge (5 + Tier + advancements). Reaching 2× SL causes a heart attack.',
  },
  DP: {
    title: 'DP — Destiny Points',
    description:
      'Spend 1 DP to add +Conviction Rank to a roll (once per combat encounter) or power special effects.',
  },
  THP: {
    title: 'THP / TMV — Temporary Vigor',
    description:
      'Temporary Vigor buffer unaffected by armour that absorbs damage before your main Vigor pool.',
  },
  MOV: {
    title: 'MOV — Movement Speed',
    description:
      'Calculated from Athletics + GRT + REF to determine how many tiles (2–5+) you move per Movement Action.',
  },
  BRD: {
    title: 'BRD — Burden',
    description:
      'Encumbrance of carried items (max 6 + GRT + Endurance + 2×Carry). Exceeding max penalizes GRT, REF, and Combat Rolls.',
  },
  GRT: {
    title: 'GRT — Grit',
    description: 'Attribute governing physical strength, durability, Athletics, Brawling, and Endurance.',
  },
  REF: {
    title: 'REF — Reflex',
    description: 'Attribute governing agility, senses, coordination, Dexterity, Perception, and Stealth.',
  },
  INT: {
    title: 'INT — Intellect',
    description: 'Attribute governing memory, logic, pragmatism, Knowledge, Reasoning, and Survival.',
  },
  PSY: {
    title: 'PSY — Psyche',
    description: 'Attribute governing presence, empathy, resolve, Intuition, Persuasion, and Willpower.',
  },
  '1H': {
    title: '1H — One-Handed',
    description: 'Wielded in one hand, leaving your off-hand free or open for a sidearm (+1 EVA) or shield.',
  },
  '2H': {
    title: '2H — Two-Handed',
    description: 'Requires both hands to wield; prevents equipping a separate off-hand weapon or shield.',
  },
  XP: {
    title: 'XP — Experience Points',
    description: 'Spent to raise Core and Special Skill ranks; every 5 spent XP advances your Level.',
  },
};

export function resolveAbbreviationGlossary(
  token: string,
  text: string,
  matchStart: number,
  matchEnd: number
): GlossaryEntry | null {
  if (token === 'AP') {
    const before = text.slice(Math.max(0, matchStart - 28), matchStart);
    const after = text.slice(matchEnd, Math.min(text.length, matchEnd + 28));
    if (
      /\b(?:spend(?:ing)?|cost(?:s)?|gain(?:s|ed)?|recover(?:s|ed)?|restore(?:s|d)?|lose(?:s)?|loses|for|takes?)\s+(?:\+|-)?\d+\s*$/i.test(
        before
      ) ||
      /^\s+(?:to\s+perform|per\s+turn|this\s+turn)/i.test(after)
    ) {
      return ABBREV_GLOSSARY.AP_ACTION;
    }
    return ABBREV_GLOSSARY.AP;
  }
  return ABBREV_GLOSSARY[token] || null;
}

const ABBREV_PATTERN =
  'ACP|THP|DMG|ACC|EVA|BRD|MOV|GRT|REF|INT|PSY|VG|VL|VM|SN|SL|DP|AP|CL|HP|1H|2H|XP';

const COMBINED_GLOSSARY_REGEX = new RegExp(
  `\\b(${KEYWORD_PATTERN_STR}|${ABBREV_PATTERN})\\b`,
  'gi'
);

export interface GlossarySegment {
  text: string;
  keyword: KeywordKey | null;
  glossary: GlossaryEntry | null;
}

export function splitTextWithGlossary(
  text: string,
  options: {
    keywordMode: KeywordMatchMode;
    allowStealthStatusInProse?: boolean;
    includeAbbreviations?: boolean;
  }
): GlossarySegment[] {
  const { keywordMode, allowStealthStatusInProse = false, includeAbbreviations = true } = options;

  if (!text) return [{ text, keyword: null, glossary: null }];
  if (keywordMode === 'off' && !includeAbbreviations) {
    return [{ text, keyword: null, glossary: null }];
  }

  const segments: GlossarySegment[] = [];
  COMBINED_GLOSSARY_REGEX.lastIndex = 0;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = COMBINED_GLOSSARY_REGEX.exec(text)) !== null) {
    const matchedWord = match[0];
    const start = match.index;
    const end = COMBINED_GLOSSARY_REGEX.lastIndex;

    const kw =
      keywordMode !== 'off'
        ? resolveKeywordMatch(matchedWord, text, start, end, keywordMode, allowStealthStatusInProse)
        : null;

    if (kw) {
      if (start > lastIndex) {
        segments.push({ text: text.slice(lastIndex, start), keyword: null, glossary: null });
      }
      segments.push({ text: matchedWord, keyword: kw, glossary: KEYWORD_GLOSSARY[kw] });
      lastIndex = end;
      continue;
    }

    // Strict case-sensitive uppercase check for abbreviations so ordinary lowercase words never match
    if (includeAbbreviations) {
      const abbrEntry = resolveAbbreviationGlossary(matchedWord, text, start, end);
      if (abbrEntry) {
        if (start > lastIndex) {
          segments.push({ text: text.slice(lastIndex, start), keyword: null, glossary: null });
        }
        segments.push({ text: matchedWord, keyword: null, glossary: abbrEntry });
        lastIndex = end;
      }
    }
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), keyword: null, glossary: null });
  }

  return segments.length > 0 ? segments : [{ text, keyword: null, glossary: null }];
}
