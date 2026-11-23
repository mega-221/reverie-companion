import rawBundle from './rulesBundle.json';
import type { CompendiumEntry } from '../types';
import { getSyncedSearchTextForSection } from '../utils/compendiumRulesSync';
import type { RuleChapter, RuleSearchResult, RuleSection, RulesBundle, RulesMeta } from './rulesTypes';

const bundle = rawBundle as unknown as RulesBundle;

export const RULES_META: RulesMeta = bundle.meta;
export const RULES_CHAPTERS: RuleChapter[] = bundle.chapters;

export const TOTAL_RULE_SECTIONS = RULES_CHAPTERS.reduce(
  (sum, chapter) => sum + chapter.sections.length,
  0
);

export function findChapterById(chapterId: string | null | undefined): RuleChapter {
  if (!chapterId) return RULES_CHAPTERS[0];
  return RULES_CHAPTERS.find((ch) => ch.id === chapterId) || RULES_CHAPTERS[0];
}

export function findSectionLocation(
  sectionId: string | null | undefined
): { chapter: RuleChapter; section: RuleSection } | null {
  if (!sectionId) return null;
  for (const chapter of RULES_CHAPTERS) {
    const section = chapter.sections.find((sec) => sec.id === sectionId);
    if (section) {
      return { chapter, section };
    }
  }
  return null;
}

export function formatPageSpan(pages: [number, number]): string {
  const [start, end] = pages;
  return start === end ? `p. ${start}` : `pp. ${start}–${end}`;
}

function countOccurrences(haystackLower: string, needleLower: string): number {
  if (!needleLower) return 0;
  let count = 0;
  let idx = 0;
  while (true) {
    const found = haystackLower.indexOf(needleLower, idx);
    if (found === -1) break;
    count += 1;
    idx = found + needleLower.length;
  }
  return count;
}

function buildSnippet(text: string, queryLower: string, tokens: string[]): string {
  const lower = text.toLowerCase();
  let matchIdx = lower.indexOf(queryLower);

  if (matchIdx === -1) {
    for (const token of tokens) {
      const idx = lower.indexOf(token);
      if (idx !== -1 && (matchIdx === -1 || idx < matchIdx)) {
        matchIdx = idx;
      }
    }
  }

  if (matchIdx === -1) {
    return text.length > 150 ? `${text.slice(0, 147).trimEnd()}…` : text;
  }

  const radiusBefore = 52;
  const radiusAfter = 96;
  let start = Math.max(0, matchIdx - radiusBefore);
  let end = Math.min(text.length, matchIdx + queryLower.length + radiusAfter);

  if (start > 0) {
    const nextSpace = text.indexOf(' ', start);
    if (nextSpace !== -1 && nextSpace < matchIdx) {
      start = nextSpace + 1;
    }
  }
  if (end < text.length) {
    const prevSpace = text.lastIndexOf(' ', end);
    if (prevSpace > matchIdx) {
      end = prevSpace;
    }
  }

  const prefix = start > 0 ? '…' : '';
  const suffix = end < text.length ? '…' : '';
  return `${prefix}${text.slice(start, end).trim()}${suffix}`;
}

export function searchRules(rawQuery: string, compendiumEntries?: CompendiumEntry[]): RuleSearchResult[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return [];

  const tokens = query.split(/\s+/).filter(Boolean);
  const results: RuleSearchResult[] = [];

  for (const chapter of RULES_CHAPTERS) {
    const chapterTitleLower = `${chapter.number}. ${chapter.title}`.toLowerCase();

    for (const section of chapter.sections) {
      const titleLower = section.title.toLowerCase();
      const extraDbText = compendiumEntries && compendiumEntries.length > 0
        ? getSyncedSearchTextForSection(section.id, compendiumEntries)
        : '';
      const effectiveSearchText = extraDbText
        ? `${section.searchText} ${extraDbText}`
        : section.searchText;
      const bodyLower = effectiveSearchText.toLowerCase();
      const combinedLower = `${chapterTitleLower} ${titleLower} ${bodyLower}`;

      // Require every whitespace-delimited token to exist somewhere in the section or its chapter header
      const allTokensPresent = tokens.every((token) => combinedLower.includes(token));
      if (!allTokensPresent) continue;

      let score = 0;
      if (titleLower === query) score += 1000;
      else if (titleLower.startsWith(query)) score += 600;
      else if (titleLower.includes(query)) score += 380;
      else if (tokens.every((t) => titleLower.includes(t))) score += 260;

      if (chapterTitleLower.includes(query)) score += 80;

      const phraseBodyMatches = countOccurrences(bodyLower, query);
      if (phraseBodyMatches > 0) {
        score += 180 + Math.min(phraseBodyMatches, 12) * 14;
      }

      let totalTokenMatches = phraseBodyMatches;
      if (phraseBodyMatches === 0) {
        for (const token of tokens) {
          const c = countOccurrences(bodyLower, token);
          totalTokenMatches += c;
          score += Math.min(c, 10) * 10;
        }
      }

      if (titleLower.includes(query)) {
        totalTokenMatches += 1;
      }

      results.push({
        chapter,
        section,
        score,
        matchCount: Math.max(1, totalTokenMatches),
        snippet: buildSnippet(effectiveSearchText, query, tokens),
      });
    }
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.section.pages[0] - b.section.pages[0];
  });

  return results;
}
