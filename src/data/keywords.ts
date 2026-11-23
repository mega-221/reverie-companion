export type KeywordKey =
  | 'pierce'
  | 'break'
  | 'stun'
  | 'bleeding'
  | 'burn'
  | 'soulburn'
  | 'tmv'
  | 'fractured'
  | 'prone'
  | 'feeble'
  | 'blind'
  | 'immobilized'
  | 'unaware'
  | 'stealth'
  | 'taunt'
  | 'intimidate'
  | 'pull'
  | 'push';

export type KeywordMatchMode = 'off' | 'prose' | 'effect';

export const KEYWORD_CSS_VAR: Record<KeywordKey, string> = {
  pierce: 'var(--rev-kw-pierce)',
  break: 'var(--rev-kw-break)',
  stun: 'var(--rev-kw-stun)',
  bleeding: 'var(--rev-kw-bleeding)',
  burn: 'var(--rev-kw-burn)',
  soulburn: 'var(--rev-kw-soulburn)',
  tmv: 'var(--rev-kw-tmv)',
  fractured: 'var(--rev-kw-fractured)',
  prone: 'var(--rev-kw-prone)',
  feeble: 'var(--rev-kw-feeble)',
  blind: 'var(--rev-kw-neutral)',
  immobilized: 'var(--rev-kw-neutral)',
  unaware: 'var(--rev-kw-neutral)',
  stealth: 'var(--rev-kw-neutral)',
  taunt: 'var(--rev-kw-neutral)',
  intimidate: 'var(--rev-kw-neutral)',
  pull: 'var(--rev-kw-neutral)',
  push: 'var(--rev-kw-neutral)',
};

const LOWER_TERM_TO_KEYWORD: Record<string, KeywordKey> = {
  pierce: 'pierce',
  break: 'break',
  stun: 'stun',
  bleeding: 'bleeding',
  burn: 'burn',
  soulburn: 'soulburn',
  'temporary vigor': 'tmv',
  tmv: 'tmv',
  tvg: 'tmv',
  fractured: 'fractured',
  prone: 'prone',
  feeble: 'feeble',
  blind: 'blind',
  immobilized: 'immobilized',
  unaware: 'unaware',
  stealth: 'stealth',
  taunted: 'taunt',
  taunt: 'taunt',
  intimidated: 'intimidate',
  intimidate: 'intimidate',
  pull: 'pull',
  push: 'push',
};

// Ambiguous everyday English verbs/nouns that in lowercase without mechanic framing shouldn't turn into keywords.
const STRICT_CASE_OR_MECHANIC_TERMS = new Set([
  'break',
  'burn',
  'blind',
  'pull',
  'push',
]);

// Combined longest-first keyword pattern
export const KEYWORD_PATTERN_STR =
  'Temporary Vigor|Immobilized|Intimidated|Intimidate|Fractured|Soulburn|Bleeding|Unaware|Taunted|Stealth|Feeble|Pierce|Break|Prone|Blind|Taunt|Stun|Burn|Pull|Push|TMV|TVG';

export function resolveKeywordMatch(
  rawTerm: string,
  text: string,
  matchStart: number,
  matchEnd: number,
  mode: KeywordMatchMode,
  allowStealthStatusInProse = false
): KeywordKey | null {
  if (mode === 'off') return null;

  const lower = rawTerm.toLowerCase();
  const key = LOWER_TERM_TO_KEYWORD[lower];
  if (!key) return null;

  const before = text.slice(Math.max(0, matchStart - 28), matchStart);
  const after = text.slice(matchEnd, Math.min(text.length, matchEnd + 28));

  // Stealth disambiguation: "Stealth check / roll / skill / disadvantage" or "Weapons: Stealth" is the Reflex Core Skill, not the status effect.
  if (key === 'stealth') {
    if (
      /^\s+(?:checks?|rolls?|skills?|disadvantage)\b/i.test(after) ||
      /Weapons:\s*$/i.test(before) ||
      /Inspiration:\s*(?:[A-Za-z]+,\s*)*$/i.test(before)
    ) {
      return null;
    }

    if (mode === 'prose' && !allowStealthStatusInProse) {
      // Only treat Stealth as status keyword in general prose when clearly framed as the Stealth condition
      if (!/\b(?:in|enter|entering|exit|exiting|leave|leaving|remain in|while in)\s+$/i.test(before)) {
        return null;
      }
    }
    return 'stealth';
  }

  const isCapitalized = /^[A-Z]/.test(rawTerm);

  if (mode === 'prose') {
    // In prose mode, require capitalized exact form (e.g., "Bleeding", "Stun", "Prone", "Temporary Vigor", "TMV")
    // so ordinary prose verbs/words ("break free", "push forward", "burn down") never false-positive.
    if (!isCapitalized && lower !== 'soulburn') {
      return null;
    }
    return key;
  }

  // mode === 'effect'
  if (STRICT_CASE_OR_MECHANIC_TERMS.has(lower) && !isCapitalized) {
    // Allow lowercase only when clearly used as a numeric or inflicted status mechanic (e.g. "burn 1", "inflict break 2", "push 2")
    const hasNumericFollow = /^\s+(?:\d+|X)\b/i.test(after);
    const hasInflictLead =
      /\b(?:inflict(?:s|ed|ing)?|apply(?:ing)?|applied|suffer(?:s|ed|ing)?|remove(?:s|d|ing)?|cleanse(?:s|d|ing)?)\s+(?:equal\s+|additional\s+|that\s+much\s+)?$/i.test(
        before
      );
    if (!hasNumericFollow && !hasInflictLead) {
      return null;
    }
  }

  return key;
}

export interface KeywordSegment {
  text: string;
  keyword: KeywordKey | null;
}

const EFFECT_REGEX = new RegExp(`\\b(${KEYWORD_PATTERN_STR})\\b`, 'gi');

export function splitTextByKeywords(
  text: string,
  mode: KeywordMatchMode,
  allowStealthStatusInProse = false
): KeywordSegment[] {
  if (!text || mode === 'off') {
    return [{ text, keyword: null }];
  }

  const segments: KeywordSegment[] = [];
  EFFECT_REGEX.lastIndex = 0;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = EFFECT_REGEX.exec(text)) !== null) {
    const matchedWord = match[0];
    const start = match.index;
    const end = EFFECT_REGEX.lastIndex;

    const resolved = resolveKeywordMatch(
      matchedWord,
      text,
      start,
      end,
      mode,
      allowStealthStatusInProse
    );
    if (!resolved) continue;

    if (start > lastIndex) {
      segments.push({ text: text.slice(lastIndex, start), keyword: null });
    }
    segments.push({ text: matchedWord, keyword: resolved });
    lastIndex = end;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), keyword: null });
  }

  return segments.length > 0 ? segments : [{ text, keyword: null }];
}
