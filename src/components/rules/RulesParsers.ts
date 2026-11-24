export function parseAbilityHeader(rawHeading: string): {
  marker: string;
  name: string;
  subtype: string;
} {
  let work = rawHeading.trim();
  let marker = '';
  const markerMatch = work.match(
    /^((?:>>>|>>|>|\||I|<)(?:\s*\/\s*(?:>>>|>>|>|\||I|<))?)\s+(.+)$/
  );
  if (markerMatch) {
    marker = markerMatch[1].trim();
    work = markerMatch[2].trim();
  }
  const dashParts = work.split(/\s+—\s+/);
  return {
    marker,
    name: dashParts[0]?.trim() || work,
    subtype: (dashParts[1] || '').replace(/^\*|\*$/g, '').trim(),
  };
}

export function parseStatLine(rawStatLine?: string): {
  snCost: string | null;
  acc: string | null;
  dmg: string | null;
  eva: string | null;
  extraStats: string[];
} {
  if (!rawStatLine) {
    return { snCost: null, acc: null, dmg: null, eva: null, extraStats: [] };
  }
  const clean = rawStatLine.replace(/\*\*/g, '').replace(/^\||\|$/g, '').trim();
  const parts = clean.split(/\s*[·|]\s*/).map((part) => part.trim()).filter(Boolean);
  let snCost: string | null = null;
  let acc: string | null = null;
  let dmg: string | null = null;
  let eva: string | null = null;
  const extraStats: string[] = [];

  for (const part of parts) {
    if (/(?:SN|Strain)$/i.test(part)) snCost = part;
    else if (/ACC$/i.test(part)) acc = part;
    else if (/DMG$/i.test(part)) dmg = part;
    else if (/EVA$/i.test(part)) eva = part;
    else extraStats.push(part);
  }

  return { snCost, acc, dmg, eva, extraStats };
}

export function isLikelyPlainSubheading(line: string, nextLine?: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 52) return false;
  if (/^[●\-*>#|[\]]/.test(trimmed)) return false;
  if (/[.?!:;]$/.test(trimmed)) return false;
  if (/^(Inspiration|Start with|Attribute Rank Limit|Skill Rank Limit|Requirements|Effect):/i.test(trimmed)) {
    return false;
  }
  if (/^Tier \d+/i.test(trimmed)) return true;
  return /^[A-Z0-9][A-Za-z0-9\s'’\-–/()]+$/.test(trimmed)
    && trimmed.split(/\s+/).length <= 6
    && nextLine !== undefined
    && nextLine.trim().length > trimmed.length;
}

export function isDefinitionOrMetaLine(line: string): boolean {
  const trimmed = line.trim();
  return (
    /^(Inspiration|Start with|Attribute Rank Limit|Skill Rank Limit|Requirements|Effect):/i.test(trimmed)
    || /^\*\*(Archetype|Recommended disciplines|Recommended special skills|Effect):/i.test(trimmed)
    || /^\*Requires:/i.test(trimmed)
    || /^\[.*\]$/.test(trimmed)
    || /^\|.*\|/.test(trimmed)
    || /^[A-Z][A-Za-z0-9\s/()]+ - [A-Z]/.test(trimmed)
  );
}

