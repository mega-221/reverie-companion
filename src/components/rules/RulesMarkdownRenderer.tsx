import React from 'react';
import type { KeywordMatchMode } from '../../data/keywords';
import type { CompendiumEntry } from '../../types';
import { useCompendium } from '../../CompendiumContext';
import {
  compendiumAbilityToSynced,
  getCompendiumIndex,
  sortCompendiumAbilitiesWithOrder,
} from '../../utils/compendiumRulesSync';
import { AbilityBox } from '../common/AbilityBox';
import { AttributeColoredText } from './AttributeColoredText';
import { HighlightedText } from './HighlightedText';
import { ATTRIBUTE_CSS_VAR, type AttributeKey } from './attributeColors';
import {
  getClassTagStyle,
  parseClassSectionIntro,
  type ParsedClassIntro,
} from './classFormatting';
import {
  renderAbilityEffect,
  renderInline,
  renderListItem,
  renderOriginSkillText,
  type RichTextOptions,
} from './RulesInline';
import {
  isDefinitionOrMetaLine,
  isLikelyPlainSubheading,
  parseAbilityHeader,
  parseStatLine,
} from './RulesParsers';

interface RulesMarkdownRendererProps {
  markdown: string;
  sectionId: string;
  highlightQuery?: string;
}

interface ParsedAbilityData {
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

interface OriginEntry {
  name: string;
  description: string;
  inspiration: string;
  startWith: string;
}

interface OriginGroup {
  title: string;
  lore: string;
  origins: OriginEntry[];
}

interface SkillGroupData {
  attrKey: AttributeKey;
  code: string;
  fullName: string;
  items: { name: string; body: string }[];
}

interface TierCardData {
  title: string;
  limits: string[];
  body: string;
}

interface DefinitionItem {
  term: string;
  separator: string;
  body: string;
}

type Block =
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'minorTitle'; title: string; names: string[] }
  | { type: 'hr' }
  | { type: 'blockquote'; lines: string[] }
  | { type: 'list'; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'ability'; ability: ParsedAbilityData }
  | { type: 'statbox'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'originGroup'; group: OriginGroup }
  | { type: 'skillGrid'; groups: SkillGroupData[] }
  | { type: 'tierCard'; tier: TierCardData }
  | { type: 'definitionList'; items: DefinitionItem[] }
  | {
      type: 'archetypeCard';
      name: string;
      description: string;
      classes: DefinitionItem[];
    };

const ATTR_CODE_META: Record<string, { key: AttributeKey; fullName: string }> = {
  GRT: { key: 'grt', fullName: 'Grit' },
  REF: { key: 'ref', fullName: 'Reflex' },
  INT: { key: 'int', fullName: 'Intellect' },
  PSY: { key: 'psy', fullName: 'Psyche' },
};

function parseOriginGroupsAndRest(lines: string[]): Block[] {
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (!trimmed) {
      i++;
      continue;
    }

    if (/^(Generic|Eterion|Agmar|Vesperik|Duiber|Lior) Origins$/.test(trimmed)) {
      const groupTitle = trimmed;
      i++;
      const loreLines: string[] = [];

      // Collect plane lore paragraph until the first Origin entry (short title line followed by description, then Inspiration:)
      while (i < lines.length) {
        const cur = lines[i].trim();
        if (!cur) {
          i++;
          continue;
        }
        // Check if current line starts an origin entry (look ahead up to 6 lines for Inspiration:)
        let isOriginStart = false;
        if (
          cur.length <= 32 &&
          !/[.?!:]$/.test(cur) &&
          !/^(Generic|Eterion|Agmar|Vesperik|Duiber|Lior) Origins$/.test(cur)
        ) {
          for (let k = i + 1; k < Math.min(i + 7, lines.length); k++) {
            if (/^Inspiration:/i.test(lines[k].trim())) {
              isOriginStart = true;
              break;
            }
            if (/^(Generic|Eterion|Agmar|Vesperik|Duiber|Lior) Origins$/.test(lines[k].trim())) {
              break;
            }
          }
        }
        if (isOriginStart) break;
        loreLines.push(cur);
        i++;
      }

      const origins: OriginEntry[] = [];
      while (i < lines.length) {
        const cur = lines[i].trim();
        if (!cur) {
          i++;
          continue;
        }
        if (/^(Generic|Eterion|Agmar|Vesperik|Duiber|Lior) Origins$/.test(cur)) {
          break;
        }
        if (/^Ulvandul and Ravina/i.test(cur)) {
          break;
        }

        const originName = cur;
        i++;
        const descLines: string[] = [];
        let inspiration = '';
        let startWith = '';

        while (i < lines.length) {
          const l = lines[i].trim();
          if (!l) {
            i++;
            continue;
          }
          if (/^Inspiration:/i.test(l)) {
            inspiration = l.replace(/^Inspiration:\s*/i, '').trim();
            i++;
            continue;
          }
          if (/^Start with:/i.test(l)) {
            startWith = l.replace(/^Start with:\s*/i, '').trim();
            i++;
            break;
          }
          descLines.push(l);
          i++;
        }

        if (originName && (inspiration || startWith)) {
          origins.push({
            name: originName,
            description: descLines.join(' '),
            inspiration,
            startWith,
          });
        }
      }

      blocks.push({
        type: 'originGroup',
        group: {
          title: groupTitle,
          lore: loreLines.join(' '),
          origins,
        },
      });
      continue;
    }

    // Intro or closing paragraphs
    const paraLines: string[] = [trimmed];
    i++;
    while (i < lines.length) {
      const nxt = lines[i].trim();
      if (!nxt || /^(Generic|Eterion|Agmar|Vesperik|Duiber|Lior) Origins$/.test(nxt)) {
        break;
      }
      paraLines.push(nxt);
      i++;
    }
    blocks.push({ type: 'paragraph', text: paraLines.join(' ') });
  }

  return blocks;
}

function parseSkillGroupsSection(lines: string[]): Block[] {
  const blocks: Block[] = [];
  const groups: SkillGroupData[] = [];
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (!trimmed) {
      i++;
      continue;
    }

    const attrMatch = trimmed.match(/^(GRT|REF|INT|PSY):$/);
    if (attrMatch) {
      const code = attrMatch[1];
      const meta = ATTR_CODE_META[code];
      const items: { name: string; body: string }[] = [];
      i++;

      while (i < lines.length) {
        const cur = lines[i].trim();
        if (!cur) {
          i++;
          continue;
        }
        if (/^(GRT|REF|INT|PSY):$/.test(cur)) break;
        const skillMatch = cur.match(/^([A-Z][a-z]+)\s+-\s+(.+)$/);
        if (skillMatch) {
          items.push({ name: skillMatch[1], body: skillMatch[2] });
        } else if (items.length > 0) {
          items[items.length - 1].body = `${items[items.length - 1].body} ${cur}`;
        }
        i++;
      }

      groups.push({
        attrKey: meta.key,
        code,
        fullName: meta.fullName,
        items,
      });
      continue;
    }

    const paraLines: string[] = [trimmed];
    i++;
    while (i < lines.length) {
      const nxt = lines[i].trim();
      if (!nxt || /^(GRT|REF|INT|PSY):$/.test(nxt)) break;
      paraLines.push(nxt);
      i++;
    }
    blocks.push({ type: 'paragraph', text: paraLines.join(' ') });
  }

  if (groups.length > 0) {
    blocks.push({ type: 'skillGrid', groups });
  }

  return blocks;
}

const FRONT_MATTER_COVER_LINES = new Set([
  'REVERIE',
  'In memory of those who shattered the world.',
  'CORE ~ RULES',
  'CORE~RULES',
  'ALPHA0 ~ 11 ~ 0',
  'ALPHA 0 ~ 11 ~ 0',
  'ALPHA 0~11~0',
  'Prelude',
  'Table of Contents',
  '…',
]);

function syncParsedWithCompendium(
  sectionId: string,
  classIntro: ParsedClassIntro | null,
  blocks: Block[],
  entries: CompendiumEntry[]
): { classIntro: ParsedClassIntro | null; blocks: Block[] } {
  if (sectionId === 'front-matter') {
    const filtered = blocks
      .map((b) => {
        if (b.type === 'paragraph') {
          const lines = b.text
            .split(/\n+/)
            .map((l) => l.trim())
            .filter((l) => l && !FRONT_MATTER_COVER_LINES.has(l));
          return lines.length > 0 ? { ...b, text: lines.join(' ') } : null;
        }
        return b;
      })
      .filter((b): b is Block => b !== null);
    return { classIntro, blocks: filtered };
  }

  if (!entries || entries.length === 0) {
    return { classIntro, blocks };
  }

  const { byType, byNameLower, abilitiesBySourceLower } = getCompendiumIndex(entries);

  // 1. Base Abilities
  if (sectionId === 'base-abilities') {
    const dbBasics = abilitiesBySourceLower.get('basic') || [];
    if (dbBasics.length > 0) {
      const staticAbilities = blocks.filter((b): b is Extract<Block, { type: 'ability' }> => b.type === 'ability');
      const fallbackByName = new Map(
        staticAbilities.map((b) => [b.ability.name.toLowerCase(), b.ability])
      );
      const orderNames = staticAbilities.map((b) => b.ability.name);
      const sorted = sortCompendiumAbilitiesWithOrder(dbBasics, orderNames);
      const firstAbilityIdx = blocks.findIndex((b) => b.type === 'ability');
      const prefixBlocks = firstAbilityIdx >= 0 ? blocks.slice(0, firstAbilityIdx) : blocks;
      const syncedBlocks: Block[] = sorted.map((entry) => {
        const fb = fallbackByName.get(entry.name.toLowerCase());
        return {
          type: 'ability',
          ability: compendiumAbilityToSynced(entry, 'basic', {
            subtype: fb?.subtype,
            requires: fb?.requires,
          }),
        };
      });
      return { classIntro, blocks: [...prefixBlocks, ...syncedBlocks] };
    }
  }

  // 2. Special Skills
  if (sectionId === 'special-skills') {
    const dbSpecials = byType.get('special_skill') || [];
    if (dbSpecials.length > 0) {
      return {
        classIntro,
        blocks: blocks.map((b) => {
          if (b.type !== 'skillGrid') return b;
          return {
            ...b,
            groups: b.groups.map((grp) => {
              const matching = dbSpecials.filter(
                (s) => String(s.data?.attribute || '').toLowerCase() === grp.attrKey
              );
              if (matching.length === 0) return grp;
              const staticOrder = grp.items.map((it) => it.name.toLowerCase());
              const sorted = [...matching].sort((a, b2) => {
                const ia = staticOrder.indexOf(a.name.toLowerCase());
                const ib = staticOrder.indexOf(b2.name.toLowerCase());
                if (ia !== -1 && ib !== -1) return ia - ib;
                if (ia !== -1) return -1;
                if (ib !== -1) return 1;
                return a.name.localeCompare(b2.name);
              });
              return {
                ...grp,
                items: sorted.map((s) => ({
                  name: s.name,
                  body: String(s.data?.description || '').trim(),
                })),
              };
            }),
          };
        }),
      };
    }
  }

  // 3. Origins
  if (sectionId === 'origins') {
    const dbOrigins = byType.get('origin') || [];
    if (dbOrigins.length > 0) {
      const dbOriginByName = new Map(dbOrigins.map((o) => [o.name.trim().toLowerCase(), o]));
      return {
        classIntro,
        blocks: blocks.map((b) => {
          if (b.type !== 'originGroup') return b;
          const planeName = b.group.title.replace(/\s+Origins$/i, '').trim().toLowerCase();
          const seen = new Set<string>();
          const updatedOrigins = b.group.origins.map((orig) => {
            const key = orig.name.trim().toLowerCase();
            seen.add(key);
            const db = dbOriginByName.get(key);
            if (!db) return orig;
            return {
              name: db.name || orig.name,
              description: String(db.data?.lore || orig.description),
              inspiration: String(db.data?.inspiration || orig.inspiration),
              startWith: String(db.data?.starting || orig.startWith),
            };
          });
          // Append any DB-added origins for this plane not already in static bundle
          for (const db of dbOrigins) {
            const dbPlane = String(db.data?.plane || '').trim().toLowerCase();
            const key = db.name.trim().toLowerCase();
            if (dbPlane === planeName && !seen.has(key)) {
              updatedOrigins.push({
                name: db.name,
                description: String(db.data?.lore || ''),
                inspiration: String(db.data?.inspiration || ''),
                startWith: String(db.data?.starting || ''),
              });
            }
          }
          return {
            ...b,
            group: {
              ...b.group,
              origins: updatedOrigins,
            },
          };
        }),
      };
    }
  }

  // 4. Convictions
  if (sectionId === 'convictions') {
    const dbConvictions = byType.get('conviction') || [];
    if (dbConvictions.length > 0) {
      const nextBlocks = [...blocks];
      for (let idx = 0; idx < nextBlocks.length - 1; idx++) {
        const cur = nextBlocks[idx];
        const nxt = nextBlocks[idx + 1];
        if (cur.type === 'paragraph' && nxt.type === 'list') {
          const seasonMatch = cur.text.match(/^(Vamor|Bruma|Trumst|Halice)\b/i);
          if (seasonMatch) {
            const season = seasonMatch[1];
            const seasonConvs = dbConvictions.filter(
              (c) => String(c.data?.season || '').toLowerCase() === season.toLowerCase()
            );
            if (seasonConvs.length > 0) {
              nextBlocks[idx + 1] = {
                type: 'list',
                items: seasonConvs.map(
                  (c) => `${c.name} - ${String(c.data?.statement || '').trim()}`
                ),
              };
            }
          }
        }
      }
      return { classIntro, blocks: nextBlocks };
    }
  }

  // 5. Failings
  if (sectionId === 'failings') {
    const dbFailings = byType.get('failing') || [];
    if (dbFailings.length > 0) {
      const nextBlocks = blocks.map((b, idx) => {
        if (b.type === 'list' && idx > 0) {
          const prev = blocks[idx - 1];
          if (prev.type === 'paragraph' && /different failings/i.test(prev.text)) {
            return {
              type: 'list' as const,
              items: dbFailings.map(
                (f) => `${f.name} - ${String(f.data?.statement || '').trim()}`
              ),
            };
          }
        }
        return b;
      });
      return { classIntro, blocks: nextBlocks };
    }
  }

  // 6. Available Disciplines Overview
  if (sectionId === 'available-disciplines') {
    const dbDiscs = byType.get('discipline') || [];
    if (dbDiscs.length > 0) {
      const dbDiscMap = new Map(dbDiscs.map((d) => [d.name.trim().toLowerCase(), d]));
      const nextBlocks = blocks.map((b) => {
        if (b.type !== 'list') return b;
        return {
          ...b,
          items: b.items.map((item) => {
            const m = item.match(/^([A-Za-z]+)\s+-\s+/);
            if (!m) return item;
            const db = dbDiscMap.get(m[1].toLowerCase());
            if (!db?.data?.description) return item;
            return `${db.name} - ${String(db.data.description).trim()}`;
          }),
        };
      });
      return { classIntro, blocks: nextBlocks };
    }
  }

  // 7. Discipline Sections (06-disciplines/*)
  const discEntry = byNameLower.get(sectionId.toLowerCase());
  if (discEntry && discEntry.type === 'discipline') {
    const dbAbs = abilitiesBySourceLower.get(discEntry.name.toLowerCase()) || [];
    const staticOrder = blocks
      .filter((b): b is Extract<Block, { type: 'ability' }> => b.type === 'ability')
      .map((b) => b.ability.name);
    const fallbackByName = new Map(
      blocks
        .filter((b): b is Extract<Block, { type: 'ability' }> => b.type === 'ability')
        .map((b) => [b.ability.name.toLowerCase(), b.ability])
    );

    const outBlocks: Block[] = [];
    let replacedAbilities = false;
    let updatedTagline = false;

    for (const b of blocks) {
      if (!updatedTagline && b.type === 'paragraph' && discEntry.data?.description) {
        if (b.text.startsWith('**') && b.text.endsWith('**')) {
          outBlocks.push({ type: 'paragraph', text: `**${discEntry.data.description}**` });
          updatedTagline = true;
          continue;
        }
      }
      if (b.type === 'ability') {
        if (!replacedAbilities && dbAbs.length > 0) {
          replacedAbilities = true;
          const sorted = sortCompendiumAbilitiesWithOrder(dbAbs, staticOrder);
          for (const entry of sorted) {
            const fb = fallbackByName.get(entry.name.toLowerCase());
            outBlocks.push({
              type: 'ability',
              ability: compendiumAbilityToSynced(entry, 'discipline', {
                subtype: fb?.subtype,
                requires: fb?.requires,
              }),
            });
          }
        } else if (dbAbs.length === 0) {
          outBlocks.push(b);
        }
        continue;
      }
      outBlocks.push(b);
    }
    return { classIntro, blocks: outBlocks };
  }

  // 8. Class Sections (05-classes/*)
  const clsEntry = byType
    .get('class')
    ?.find((c) => c.name.trim().toLowerCase() === sectionId.toLowerCase());
  if (clsEntry) {
    const syncedIntro = classIntro
      ? {
          ...classIntro,
          archetype: String(clsEntry.data?.archetype || classIntro.archetype),
        }
      : classIntro;

    const outBlocks: Block[] = [];
    let currentSourceName: string = clsEntry.name;
    let bucketStaticAbilities: Extract<Block, { type: 'ability' }>[] = [];
    let bucketPrefix: Block[] = [];

    const flushClassBucket = () => {
      const dbAbs = abilitiesBySourceLower.get(currentSourceName.toLowerCase()) || [];
      if (dbAbs.length === 0) {
        outBlocks.push(...bucketPrefix, ...bucketStaticAbilities);
      } else {
        const order = bucketStaticAbilities.map((b) => b.ability.name);
        const fallbackByName = new Map(
          bucketStaticAbilities.map((b) => [b.ability.name.toLowerCase(), b.ability])
        );
        const sorted = sortCompendiumAbilitiesWithOrder(dbAbs, order);
        outBlocks.push(
          ...bucketPrefix,
          ...sorted.map((entry) => {
            const fb = fallbackByName.get(entry.name.toLowerCase());
            return {
              type: 'ability' as const,
              ability: compendiumAbilityToSynced(entry, 'class', {
                subtype: fb?.subtype,
                requires: fb?.requires,
              }),
            };
          })
        );
      }
      bucketPrefix = [];
      bucketStaticAbilities = [];
    };

    for (const b of blocks) {
      if (b.type === 'h2') {
        flushClassBucket();
        outBlocks.push(b);
        if (/^Path:\s*/i.test(b.text)) {
          currentSourceName = b.text.replace(/^Path:\s*/i, '').trim();
        } else {
          currentSourceName = clsEntry.name;
        }
        continue;
      }
      if (b.type === 'ability') {
        bucketStaticAbilities.push(b);
      } else {
        bucketPrefix.push(b);
      }
    }
    flushClassBucket();

    return { classIntro: syncedIntro, blocks: outBlocks };
  }

  return { classIntro, blocks };
}

function parseBlocks(
  markdown: string,
  sectionId: string
): { classIntro: ParsedClassIntro | null; blocks: Block[] } {
  const cleaned = markdown.replace(/<!--[\s\S]*?-->/g, '').replace(/\r\n/g, '\n');
  const rawLines = cleaned.split('\n');

  let startIdx = 0;
  while (startIdx < rawLines.length && rawLines[startIdx].trim() === '') {
    startIdx++;
  }
  if (startIdx < rawLines.length && /^#\s+/.test(rawLines[startIdx].trim())) {
    startIdx++;
  }

  const slicedLines = rawLines.slice(startIdx);
  const lines =
    sectionId === 'front-matter'
      ? slicedLines.filter((l) => !FRONT_MATTER_COVER_LINES.has(l.trim()))
      : slicedLines;

  // Dedicated rich structure for Origins catalogue
  if (sectionId === 'origins') {
    return { classIntro: null, blocks: parseOriginGroupsAndRest(lines) };
  }

  // Dedicated 2x2 Attribute-colored grid for Core Skills & Special Skills
  if (sectionId === 'core-skills' || sectionId === 'special-skills') {
    return { classIntro: null, blocks: parseSkillGroupsSection(lines) };
  }

  // Class section intro (tags, 3 vignettes, 4th description, recommendations below)
  const classIntro = parseClassSectionIntro(sectionId, lines);
  const parseFromIdx = classIntro ? classIntro.bodyStartLineIndex : 0;

  const blocks: Block[] = [];
  let i = parseFromIdx;

  while (i < lines.length) {
    const raw = lines[i];
    const trimmed = raw.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    if (
      sectionId === 'front-matter' &&
      trimmed === 'Doomed Souls of The First March'
    ) {
      const names: string[] = [];
      i++;
      while (i < lines.length) {
        const nameLine = lines[i].trim();
        if (!nameLine) {
          i++;
          continue;
        }
        if (/^(●|-)\s+/.test(nameLine)) {
          names.push(nameLine.replace(/^(●|-)\s+/, '').trim());
          i++;
          continue;
        }
        break;
      }
      blocks.push({ type: 'minorTitle', title: trimmed, names });
      continue;
    }

    // Challenge Level vertical column table detection
    if (sectionId === 'challenge-level' && trimmed === 'CL') {
      const clValues: string[] = [];
      let j = i + 1;
      while (j < lines.length && lines[j].trim() !== 'Difficulty') {
        if (lines[j].trim()) clValues.push(lines[j].trim());
        j++;
      }
      if (j < lines.length && lines[j].trim() === 'Difficulty') {
        j++;
        const diffValues: string[] = [];
        while (j < lines.length && lines[j].trim()) {
          diffValues.push(lines[j].trim());
          j++;
        }
        if (clValues.length > 0 && clValues.length === diffValues.length) {
          blocks.push({
            type: 'table',
            headers: ['CL', 'Difficulty'],
            rows: clValues.map((cl, idx) => [cl, diffValues[idx]]),
          });
          i = j;
          continue;
        }
      }
    }

    // Levels & Tiers structured Tier cards
    if (sectionId === 'levels-and-tiers' && /^Tier \d+/i.test(trimmed)) {
      const title = trimmed;
      const limits: string[] = [];
      const bodyLines: string[] = [];
      i++;
      while (i < lines.length) {
        const nxt = lines[i].trim();
        if (!nxt) {
          i++;
          continue;
        }
        if (/^Tier \d+/i.test(nxt) || /^Is there more\?/i.test(nxt)) break;
        if (/^(Attribute Rank Limit|Skill Rank Limit):/i.test(nxt)) {
          limits.push(nxt);
        } else {
          bodyLines.push(nxt);
        }
        i++;
      }
      blocks.push({
        type: 'tierCard',
        tier: { title, limits, body: bodyLines.join(' ') },
      });
      continue;
    }

    // Class Archetypes grouped cards
    if (
      sectionId === 'class-archetypes' &&
      /^(Champion|Scoundrel|Guide|Scholar|Mystic|Aberration)\s+-\s+/.test(trimmed)
    ) {
      const m = trimmed.match(/^([A-Za-z]+)\s+-\s+(.+)$/);
      const name = m ? m[1] : trimmed;
      const descParts = m ? [m[2]] : [];
      i++;
      while (i < lines.length) {
        const nxt = lines[i].trim();
        if (!nxt || /^●\s+/.test(nxt)) break;
        descParts.push(nxt);
        i++;
      }
      const classes: DefinitionItem[] = [];
      while (i < lines.length && /^●\s+/.test(lines[i].trim())) {
        const item = lines[i].trim().replace(/^●\s+/, '');
        const dm = item.match(/^([^-]+?)\s+-\s+(.+)$/);
        if (dm) {
          classes.push({ term: dm[1].trim(), separator: '—', body: dm[2].trim() });
        } else {
          classes.push({ term: item, separator: '', body: '' });
        }
        i++;
      }
      blocks.push({
        type: 'archetypeCard',
        name,
        description: descParts.join(' '),
        classes,
      });
      continue;
    }

    // Status Effects clean definition list
    if (sectionId === 'status-effects' && /^[A-Z][A-Za-z0-9\s/()]+ - /.test(trimmed)) {
      const defItems: DefinitionItem[] = [];
      while (i < lines.length) {
        const cur = lines[i].trim();
        if (!cur) {
          i++;
          continue;
        }
        const dm = cur.match(/^([A-Z][A-Za-z0-9\s/()]+?)\s+-\s+(.+)$/);
        if (dm) {
          defItems.push({ term: dm[1].trim(), separator: '—', body: dm[2].trim() });
          i++;
        } else if (defItems.length > 0) {
          defItems[defItems.length - 1].body = `${defItems[defItems.length - 1].body} ${cur}`;
          i++;
        } else {
          break;
        }
      }
      if (defItems.length > 0) {
        blocks.push({ type: 'definitionList', items: defItems });
        continue;
      }
    }

    // Horizontal rule
    if (/^(\*\*\*|---)$/.test(trimmed)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // H2 heading
    if (/^##\s+/.test(trimmed)) {
      blocks.push({ type: 'h2', text: trimmed.replace(/^##\s+/, '').trim() });
      i++;
      continue;
    }

    // H3 heading
    if (/^###\s+/.test(trimmed)) {
      blocks.push({ type: 'h3', text: trimmed.replace(/^###\s+/, '').trim() });
      i++;
      continue;
    }

    // Ability Card (#### ...)
    if (/^####\s+/.test(trimmed)) {
      const { marker, name, subtype } = parseAbilityHeader(trimmed.replace(/^####\s+/, ''));
      let requires: string | undefined;
      let statsLine: string | undefined;
      const effectLines: string[] = [];
      i++;

      while (i < lines.length) {
        const nextTrim = lines[i].trim();
        if (!nextTrim) {
          i++;
          break;
        }
        if (/^(#{1,4}\s+|>\s+|\*\*\*|---)/.test(nextTrim)) {
          break;
        }
        if (!requires && /^\*Requires:.*\*$/.test(nextTrim)) {
          requires = nextTrim.replace(/^\*|\*$/g, '').trim();
          i++;
          continue;
        }
        if (
          !statsLine &&
          (/SN/.test(nextTrim) || /Strain/.test(nextTrim) || /ACC|DMG|EVA/.test(nextTrim)) &&
          !/^\*\*Effect:/i.test(nextTrim) &&
          nextTrim.length < 75
        ) {
          statsLine = nextTrim;
          i++;
          continue;
        }
        effectLines.push(nextTrim);
        i++;
      }

      const parsedStats = parseStatLine(statsLine);
      const cleanedEffectLines = [...effectLines];
      if (cleanedEffectLines.length > 0) {
        let firstLine = cleanedEffectLines[0]
          .replace(/^\*\*(?:Effect|Effects):\*\*\s*/i, '')
          .replace(/^(?:Effect|Effects):\s*/i, '')
          .trim();

        const convMatch = firstLine.match(
          /^Conviction:\s*(Vamor|Bruma|Trumst|Halice)\b(?:\s*[:\-—·]\s*|\s+)?/i
        );
        if (convMatch) {
          const rawSeason = convMatch[1];
          const normalizedSeason =
            rawSeason.charAt(0).toUpperCase() + rawSeason.slice(1).toLowerCase();
          const convReq = `Conviction: ${normalizedSeason}`;
          if (requires) {
            const strippedReq = requires
              .replace(/^Requires:\s*/i, '')
              .replace(/^Requirements:\s*/i, '')
              .trim();
            requires = strippedReq ? `Requires: ${strippedReq} · ${convReq}` : convReq;
          } else {
            requires = `Requires: ${convReq}`;
          }
          firstLine = firstLine.slice(convMatch[0].length).trim();
        }
        cleanedEffectLines[0] = firstLine;
      }
      const normalizedEffectLines = cleanedEffectLines.filter((line) => line.trim().length > 0);

      blocks.push({
        type: 'ability',
        ability: {
          marker,
          name,
          subtype,
          requires,
          ...parsedStats,
          effectLines: normalizedEffectLines,
        },
      });
      continue;
    }

    // Base Ability Block in base-abilities.md
    if (
      sectionId === 'base-abilities' &&
      /^(>>|>)\s+[A-Z]/.test(trimmed) &&
      i + 1 < lines.length &&
      /^(Melee|Defensive|Utility)/i.test(lines[i + 1].trim())
    ) {
      const markerMatch = trimmed.match(/^(>>|>)\s+(.+)$/);
      const marker = markerMatch ? markerMatch[1] : '';
      const name = markerMatch ? markerMatch[2] : trimmed;
      const subtype = lines[i + 1].trim();
      let requires: string | undefined;
      let statsLine: string | undefined;
      const effectParts: string[] = [];
      i += 2;

      while (i < lines.length) {
        const nextTrim = lines[i].trim();
        if (!nextTrim) {
          i++;
          continue;
        }
        if (/^(>>|>)\s+[A-Z]/.test(nextTrim)) {
          break;
        }
        if (/^Requirements:/i.test(nextTrim)) {
          requires = nextTrim;
          i++;
          continue;
        }
        if (/^\|.*\|$/.test(nextTrim)) {
          statsLine = nextTrim;
          i++;
          continue;
        }
        if (/^Effect:$/i.test(nextTrim)) {
          i++;
          continue;
        }
        effectParts.push(nextTrim);
        i++;
      }

      const parsedStats = parseStatLine(statsLine);
      blocks.push({
        type: 'ability',
        ability: {
          marker,
          name,
          subtype,
          requires,
          ...parsedStats,
          effectLines: effectParts.length > 0 ? [effectParts.join(' ')] : [],
        },
      });
      continue;
    }

    // Blockquote
    if (/^>\s*/.test(trimmed)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s*/.test(lines[i].trim())) {
        quoteLines.push(lines[i].trim().replace(/^>\s*/, ''));
        i++;
      }
      blocks.push({ type: 'blockquote', lines: quoteLines });
      continue;
    }

    // Bullet list (● or - )
    if (/^(●|-)\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length) {
        const cur = lines[i].trim();
        if (/^(●|-)\s+/.test(cur)) {
          items.push(cur.replace(/^(●|-)\s+/, '').trim());
          i++;
        } else if (
          cur &&
          items.length > 0 &&
          !(sectionId === 'front-matter' && cur === 'Doomed Souls of The First March') &&
          !/^(#{1,4}\s+|>\s+|\*\*\*|---)/.test(cur) &&
          !isLikelyPlainSubheading(cur, lines[i + 1]) &&
          !isDefinitionOrMetaLine(cur) &&
          !/^(It should also be noted|Characters who are|There are a total|With all that)/i.test(
            cur
          )
        ) {
          items[items.length - 1] = `${items[items.length - 1]} ${cur}`;
          i++;
        } else {
          break;
        }
      }
      blocks.push({ type: 'list', items });
      continue;
    }

    // Formula / Speed legend / bracketed stat boxes
    if (/^\[.+\]$/.test(trimmed) && !trimmed.includes('] (')) {
      blocks.push({ type: 'statbox', text: trimmed });
      i++;
      continue;
    }

    // Plain subheadings extracted from PDF
    if (isLikelyPlainSubheading(trimmed, lines[i + 1])) {
      blocks.push({ type: 'h3', text: trimmed });
      i++;
      continue;
    }

    // Single metadata/definition line
    if (isDefinitionOrMetaLine(trimmed)) {
      const joined = [trimmed];
      i++;
      if (/^[A-Z][A-Za-z0-9\s/()]+ - /.test(trimmed)) {
        while (i < lines.length) {
          const nxt = lines[i].trim();
          if (
            !nxt ||
            /^(#{1,4}\s+|>\s+|●\s+|-\s+|\*\*\*|---|\[)/.test(nxt) ||
            isDefinitionOrMetaLine(nxt) ||
            isLikelyPlainSubheading(nxt, lines[i + 1])
          ) {
            break;
          }
          joined.push(nxt);
          i++;
        }
      }
      blocks.push({ type: 'paragraph', text: joined.join(' ') });
      continue;
    }

    // Standard prose paragraph
    const paraLines: string[] = [trimmed];
    i++;
    while (i < lines.length) {
      const nxt = lines[i].trim();
      if (
        !nxt ||
        /^(#{1,4}\s+|>\s+|●\s+|-\s+|\*\*\*|---)/.test(nxt) ||
        /^\[.+\]$/.test(nxt) ||
        isDefinitionOrMetaLine(nxt) ||
        isLikelyPlainSubheading(nxt, lines[i + 1]) ||
        (sectionId === 'challenge-level' && nxt === 'CL') ||
        (sectionId === 'base-abilities' && /^(>>|>)\s+[A-Z]/.test(nxt))
      ) {
        break;
      }
      paraLines.push(nxt);
      i++;
    }
    blocks.push({ type: 'paragraph', text: paraLines.join(' ') });
  }

  return { classIntro, blocks };
}

export const RulesMarkdownRenderer: React.FC<RulesMarkdownRendererProps> = ({
  markdown,
  sectionId,
  highlightQuery,
}) => {
  const { entries: compendiumEntries } = useCompendium();
  const { classIntro, blocks } = React.useMemo(() => {
    const parsed = parseBlocks(markdown, sectionId);
    return syncParsedWithCompendium(sectionId, parsed.classIntro, parsed.blocks, compendiumEntries);
  }, [markdown, sectionId, compendiumEntries]);

  const isConvictionSection = sectionId === 'the-seasons' || sectionId === 'convictions';
  const isStatusSection = sectionId === 'status-effects';
  const proseKeywordMode: KeywordMatchMode = isStatusSection ? 'effect' : 'off';
  const proseOptions: RichTextOptions = {
    colorAttributes: true,
    enableSeasonColors: true,
    enableConvictionColors: isConvictionSection,
    keywordMode: proseKeywordMode,
    allowStealthStatusInProse: isStatusSection,
  };

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Structured Class Intro: Colored Tags, 3 Separate Vignettes, 4th Description Paragraph, Editorial Recommendations */}
      {classIntro && (
        <div className="space-y-4">
          {/* Class Archetype & Trait Tags */}
          <div className="flex flex-wrap items-center gap-2">
            {classIntro.archetype && (
              <span
                className="rev-keep-color px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider border"
                style={getClassTagStyle(classIntro.archetype, true)}
              >
                <HighlightedText text={classIntro.archetype} query={highlightQuery} />
              </span>
            )}
            {classIntro.tags.map((tag) => (
              <span
                key={tag}
                className="rev-keep-color px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider border"
                style={getClassTagStyle(tag, false)}
              >
                <HighlightedText text={tag} query={highlightQuery} />
              </span>
            ))}
          </div>

          {/* 3 Separated In-Universe Vignettes */}
          <div className="space-y-3">
            {classIntro.vignettes.map((vignette, vIdx) => (
              <blockquote key={vIdx} className="rev-inset p-4 sm:p-5">
                <p
                  className="font-serif italic text-sm sm:text-[15px] leading-[1.72]"
                  style={{ color: 'var(--rev-text-secondary)' }}
                >
                  <HighlightedText text={vignette} query={highlightQuery} />
                </p>
              </blockquote>
            ))}
          </div>

          {/* 4th Non-Lore Class Description Paragraph formatted as standard rules prose */}
          <p
            className="font-serif text-[15px] leading-[1.75] pt-1"
            style={{ color: 'var(--rev-text)' }}
          >
            <AttributeColoredText
              text={classIntro.description}
              query={highlightQuery}
              enableAttributeColors
              enableSeasonColors
              keywordMode="off"
            />
          </p>

          {/* Recommendations Integrated Cleanly into Editorial Flow Below Description Text */}
          {(classIntro.recommendedDisciplines || classIntro.recommendedSpecialSkills) && (
            <div className="border-y rev-divider-subtle py-3 space-y-1.5 font-serif text-[14.5px] leading-relaxed">
              {classIntro.recommendedDisciplines && (
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span
                    className="text-[11px] uppercase tracking-wider font-bold shrink-0"
                    style={{ color: 'var(--rev-text-muted)' }}
                  >
                    Recommended Disciplines:
                  </span>
                  <span
                    className="font-semibold"
                    style={{ color: 'var(--rev-accent-text)' }}
                  >
                    <HighlightedText
                      text={classIntro.recommendedDisciplines}
                      query={highlightQuery}
                    />
                  </span>
                </div>
              )}

              {classIntro.recommendedSpecialSkills && (
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span
                    className="text-[11px] uppercase tracking-wider font-bold shrink-0"
                    style={{ color: 'var(--rev-text-muted)' }}
                  >
                    Recommended Special Skills:
                  </span>
                  <span style={{ color: 'var(--rev-text-bright)' }}>
                    <AttributeColoredText
                      text={classIntro.recommendedSpecialSkills}
                      query={highlightQuery}
                      enableAttributeColors
                      enableSeasonColors={false}
                      keywordMode="off"
                    />
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Standard & Domain-Specific Blocks */}
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'h2':
            return (
              <h3
                key={idx}
                className="font-spectral text-base sm:text-lg font-bold tracking-wide pt-3 pb-1 border-b rev-divider-subtle"
                style={{ color: 'var(--rev-accent-text)' }}
              >
                <AttributeColoredText
                  text={block.text}
                  query={highlightQuery}
                  enableAttributeColors={false}
                  enableSeasonColors
                  keywordMode="off"
                />
              </h3>
            );

          case 'h3':
            return (
              <h4
                key={idx}
                className="text-sm sm:text-base font-bold tracking-wide pt-2"
                style={{ color: 'var(--rev-text-bright)' }}
              >
                <AttributeColoredText
                  text={block.text}
                  query={highlightQuery}
                  enableAttributeColors={false}
                  enableSeasonColors
                  keywordMode="off"
                />
              </h4>
            );

          case 'minorTitle':
            return (
              <div key={idx}>
                <h4
                  className="text-sm sm:text-base font-bold tracking-wide pt-2"
                  style={{ color: 'var(--rev-text-bright)' }}
                >
                  {block.title}
                </h4>
                {block.names.length > 0 && (
                  <ul className="space-y-2 pl-5 my-2">
                    {block.names.map((name) => (
                      <li
                        key={name}
                        className="list-disc text-[15px] leading-[1.7]"
                        style={{ color: 'var(--rev-text)' }}
                      >
                        {renderListItem(name, highlightQuery, proseOptions)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );

          case 'hr':
            return <hr key={idx} className="my-4 border-t rev-divider-subtle" />;

          case 'blockquote':
            return (
              <blockquote key={idx} className="rev-inset p-4 sm:p-5 my-3 space-y-2">
                {block.lines.map((line, lineIdx) => (
                  <p
                    key={lineIdx}
                    className="font-serif italic text-sm sm:text-[15px] leading-relaxed"
                    style={{ color: 'var(--rev-text-secondary)' }}
                  >
                    {renderInline(line, highlightQuery, {
                      colorAttributes: false,
                      enableSeasonColors: true,
                      enableConvictionColors: isConvictionSection,
                      keywordMode: 'off',
                    })}
                  </p>
                ))}
              </blockquote>
            );

          case 'list':
            return (
              <ul key={idx} className="space-y-2 pl-5 my-2">
                {block.items.map((item, itemIdx) => (
                  <li
                    key={itemIdx}
                    className="list-disc text-[15px] leading-[1.7]"
                    style={{ color: 'var(--rev-text)' }}
                  >
                    {renderListItem(item, highlightQuery, proseOptions)}
                  </li>
                ))}
              </ul>
            );

          case 'table':
            return (
              <div key={idx} className="rev-inset overflow-hidden my-3 max-w-md">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr
                      className="border-b rev-divider"
                      style={{ backgroundColor: 'var(--rev-surface)' }}
                    >
                      {block.headers.map((head, hIdx) => (
                        <th
                          key={hIdx}
                          className="px-4 py-2 text-xs uppercase tracking-wider font-bold"
                          style={{ color: 'var(--rev-accent-text)' }}
                        >
                          {head}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="border-b rev-divider-subtle last:border-b-0">
                        {row.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            className={`px-4 py-1.5 ${
                              cIdx === 0 ? 'font-mono tabular-nums font-semibold' : ''
                            }`}
                            style={{
                              color:
                                cIdx === 0 ? 'var(--rev-text-bright)' : 'var(--rev-text)',
                            }}
                          >
                            <HighlightedText text={cell} query={highlightQuery} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );

          case 'statbox':
            return (
              <div
                key={idx}
                className="rev-inset px-3.5 py-2 font-mono text-xs sm:text-sm tabular-nums tracking-wide"
                style={{ color: 'var(--rev-accent-text)' }}
              >
                <AttributeColoredText
                  text={block.text}
                  query={highlightQuery}
                  enableAttributeColors
                  enableSeasonColors
                  keywordMode={proseKeywordMode}
                />
              </div>
            );

          case 'ability':
            return (
              <AbilityBox
                key={idx}
                name={block.ability.name}
                marker={block.ability.marker}
                subtype={block.ability.subtype}
                requires={block.ability.requires}
                snCost={block.ability.snCost}
                acc={block.ability.acc}
                dmg={block.ability.dmg}
                eva={block.ability.eva}
                extraStats={block.ability.extraStats}
                highlightQuery={highlightQuery}
                effect={renderAbilityEffect(
                  block.ability.effectLines,
                  highlightQuery,
                  isConvictionSection
                )}
              />
            );

          case 'originGroup':
            return (
              <div key={idx} className="space-y-4 pt-3">
                <div className="space-y-2.5 pb-1">
                  <h4
                    className="font-spectral text-lg font-bold tracking-wide"
                    style={{ color: 'var(--rev-accent-text)' }}
                  >
                    <HighlightedText text={block.group.title} query={highlightQuery} />
                  </h4>
                  {block.group.lore && (
                    <blockquote className="rev-inset p-4 sm:px-5 sm:py-3.5">
                      <p
                        className="font-serif italic text-sm sm:text-[15px] leading-[1.72]"
                        style={{ color: 'var(--rev-text-secondary)' }}
                      >
                        <AttributeColoredText
                          text={block.group.lore}
                          query={highlightQuery}
                          enableAttributeColors={false}
                          enableSeasonColors
                          keywordMode="off"
                        />
                      </p>
                    </blockquote>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {block.group.origins.map((origin) => (
                    <div
                      key={origin.name}
                      className="rev-inset p-4 flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-2">
                        <h5
                          className="text-base font-bold"
                          style={{ color: 'var(--rev-text-bright)' }}
                        >
                          <HighlightedText text={origin.name} query={highlightQuery} />
                        </h5>
                        <p
                          className="font-serif italic text-[13.5px] leading-[1.65] pl-3"
                          style={{
                            color: 'var(--rev-text-secondary)',
                            borderLeft: '2px solid var(--rev-quote-border)',
                          }}
                        >
                          <AttributeColoredText
                            text={origin.description}
                            query={highlightQuery}
                            enableAttributeColors={false}
                            enableSeasonColors
                            keywordMode="off"
                          />
                        </p>
                      </div>

                      <div className="pt-2.5 border-t rev-divider-subtle space-y-1 text-xs">
                        {origin.inspiration && (
                          <div className="flex items-baseline gap-1.5 flex-wrap">
                            <span
                              className="uppercase tracking-wider font-bold text-[10px]"
                              style={{ color: 'var(--rev-text-faint)' }}
                            >
                              Inspiration:
                            </span>
                            <span style={{ color: 'var(--rev-text-bright)' }}>
                              {renderOriginSkillText(origin.inspiration, highlightQuery)}
                            </span>
                          </div>
                        )}
                        {origin.startWith && (
                          <div className="flex items-baseline gap-1.5 flex-wrap">
                            <span
                              className="uppercase tracking-wider font-bold text-[10px]"
                              style={{ color: 'var(--rev-text-faint)' }}
                            >
                              Start with:
                            </span>
                            <span style={{ color: 'var(--rev-text-bright)' }}>
                              {renderOriginSkillText(origin.startWith, highlightQuery)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );

          case 'skillGrid':
            return (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-4 my-3">
                {block.groups.map((grp) => {
                  const color = ATTRIBUTE_CSS_VAR[grp.attrKey];
                  return (
                    <div key={grp.code} className="rev-inset p-4 space-y-3">
                      <div className="flex items-baseline justify-between border-b rev-divider-subtle pb-2">
                        <span
                          className="font-spectral text-lg font-bold tracking-wider uppercase"
                          style={{ color }}
                        >
                          {grp.fullName}
                        </span>
                        <span
                          className="font-mono text-xs font-bold"
                          style={{ color }}
                        >
                          {grp.code}
                        </span>
                      </div>
                      <div className="space-y-2.5">
                        {grp.items.map((sk) => (
                          <div key={sk.name} className="space-y-0.5">
                            <div className="text-sm font-bold" style={{ color }}>
                              <HighlightedText text={sk.name} query={highlightQuery} />
                            </div>
                            <p
                              className="text-xs sm:text-[13px] leading-relaxed"
                              style={{ color: 'var(--rev-text)' }}
                            >
                              <AttributeColoredText
                                text={sk.body}
                                query={highlightQuery}
                                enableAttributeColors
                              />
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );

          case 'tierCard':
            return (
              <div key={idx} className="rev-inset p-4 space-y-2 my-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b rev-divider-subtle pb-2">
                  <h4
                    className="text-sm sm:text-base font-bold"
                    style={{ color: 'var(--rev-text-bright)' }}
                  >
                    <HighlightedText text={block.tier.title} query={highlightQuery} />
                  </h4>
                  {block.tier.limits.length > 0 && (
                    <span
                      className="text-xs font-mono tabular-nums"
                      style={{ color: 'var(--rev-accent-text)' }}
                    >
                      <HighlightedText
                        text={block.tier.limits.join(' · ')}
                        query={highlightQuery}
                      />
                    </span>
                  )}
                </div>
                <p
                  className="font-serif text-sm sm:text-[15px] leading-relaxed"
                  style={{ color: 'var(--rev-text)' }}
                >
                  <AttributeColoredText
                    text={block.tier.body}
                    query={highlightQuery}
                    enableAttributeColors
                    enableSeasonColors
                    keywordMode={proseKeywordMode}
                  />
                </p>
              </div>
            );

          case 'definitionList':
            return (
              <div key={idx} className="rev-inset divide-y rev-divider-subtle my-2">
                {block.items.map((item, dIdx) => (
                  <div key={dIdx} className="p-3 sm:px-4 space-y-1">
                    <div
                      className="text-sm font-bold"
                      style={{ color: 'var(--rev-text-bright)' }}
                    >
                      <AttributeColoredText
                        text={item.term}
                        query={highlightQuery}
                        enableAttributeColors={false}
                        enableSeasonColors={false}
                        keywordMode="effect"
                        allowStealthStatusInProse
                      />
                    </div>
                    {item.body && (
                      <p
                        className="text-sm leading-relaxed"
                        style={{ color: 'var(--rev-text)' }}
                      >
                        <AttributeColoredText
                          text={item.body}
                          query={highlightQuery}
                          enableAttributeColors
                          enableSeasonColors
                          keywordMode="effect"
                          allowStealthStatusInProse
                        />
                      </p>
                    )}
                  </div>
                ))}
              </div>
            );

          case 'archetypeCard':
            return (
              <div key={idx} className="rev-inset p-4 space-y-3 my-2">
                <div className="space-y-1 border-b rev-divider-subtle pb-2.5">
                  <h4
                    className="font-spectral text-base font-bold"
                    style={{ color: 'var(--rev-accent-text)' }}
                  >
                    <HighlightedText text={block.name} query={highlightQuery} />
                  </h4>
                  <p
                    className="font-serif text-sm leading-relaxed"
                    style={{ color: 'var(--rev-text)' }}
                  >
                    <AttributeColoredText
                      text={block.description}
                      query={highlightQuery}
                      enableAttributeColors
                      enableSeasonColors
                      keywordMode="off"
                    />
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {block.classes.map((cls) => (
                    <div
                      key={cls.term}
                      className="p-2.5 rounded border text-xs sm:text-sm"
                      style={{
                        backgroundColor: 'var(--rev-surface)',
                        borderColor: 'var(--rev-border-subtle)',
                      }}
                    >
                      <span
                        className="font-bold"
                        style={{ color: 'var(--rev-text-bright)' }}
                      >
                        <HighlightedText text={cls.term} query={highlightQuery} />
                      </span>
                      {cls.body && (
                        <span style={{ color: 'var(--rev-text-secondary)' }}>
                          {' — '}
                          <AttributeColoredText
                            text={cls.body}
                            query={highlightQuery}
                            enableAttributeColors
                            enableSeasonColors
                            keywordMode="off"
                          />
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );

          case 'paragraph':
            return (
              <p
                key={idx}
                className="font-serif text-[15px] leading-[1.72]"
                style={{ color: 'var(--rev-text)' }}
              >
                {renderInline(block.text, highlightQuery, proseOptions)}
              </p>
            );

          default:
            return null;
        }
      })}
    </div>
  );
};
