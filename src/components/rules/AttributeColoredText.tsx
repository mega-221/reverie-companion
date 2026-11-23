import React from 'react';
import {
  KEYWORD_CSS_VAR,
  splitTextByKeywords,
  type KeywordMatchMode,
} from '../../data/keywords';
import {
  ATTRIBUTE_CSS_VAR,
  CONVICTION_TERM_MAP,
  SEASON_CSS_VAR,
  SEASON_TERM_MAP,
  UNIFIED_TERM_MATCH_REGEX,
  getAttributeForTerm,
} from './attributeColors';
import { HighlightedText } from './HighlightedText';

interface AttributeColoredTextProps {
  text: string;
  query?: string;
  enableAttributeColors?: boolean;
  enableSeasonColors?: boolean;
  enableConvictionColors?: boolean;
  keywordMode?: KeywordMatchMode;
  allowStealthStatusInProse?: boolean;
}

function renderNonKeywordSegment(
  segmentText: string,
  keyPrefix: string,
  options: {
    query?: string;
    enableAttributeColors: boolean;
    enableSeasonColors: boolean;
    enableConvictionColors: boolean;
  }
): React.ReactNode[] {
  const { query, enableAttributeColors, enableSeasonColors, enableConvictionColors } = options;

  if (!enableAttributeColors && !enableSeasonColors && !enableConvictionColors) {
    return [<HighlightedText key={`${keyPrefix}-plain`} text={segmentText} query={query} />];
  }

  const nodes: React.ReactNode[] = [];
  UNIFIED_TERM_MATCH_REGEX.lastIndex = 0;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyCounter = 0;

  while ((match = UNIFIED_TERM_MATCH_REGEX.exec(segmentText)) !== null) {
    const matchedWord = match[0];

    let colorVar: string | null = null;

    // 1. Convictions take priority when inside The Seasons / Convictions (e.g. "Survival" -> Halice green)
    if (enableConvictionColors && CONVICTION_TERM_MAP[matchedWord]) {
      colorVar = SEASON_CSS_VAR[CONVICTION_TERM_MAP[matchedWord]];
    }
    // 2. Proper noun Seasons (Vamor, Bruma, Trumst, Halice)
    else if (enableSeasonColors && SEASON_TERM_MAP[matchedWord]) {
      colorVar = SEASON_CSS_VAR[SEASON_TERM_MAP[matchedWord]];
    }
    // 3. Core/Special Skills & Attributes
    else if (enableAttributeColors) {
      const attrKey = getAttributeForTerm(matchedWord);
      if (attrKey) {
        colorVar = ATTRIBUTE_CSS_VAR[attrKey];
      }
    }

    if (!colorVar) continue;

    if (match.index > lastIndex) {
      nodes.push(
        <HighlightedText
          key={`${keyPrefix}-t-${keyCounter++}`}
          text={segmentText.slice(lastIndex, match.index)}
          query={query}
        />
      );
    }

    nodes.push(
      <span
        key={`${keyPrefix}-c-${keyCounter++}`}
        className="rev-keep-color font-semibold"
        style={{ color: colorVar }}
      >
        <HighlightedText text={matchedWord} query={query} />
      </span>
    );

    lastIndex = UNIFIED_TERM_MATCH_REGEX.lastIndex;
  }

  if (lastIndex < segmentText.length) {
    nodes.push(
      <HighlightedText
        key={`${keyPrefix}-t-${keyCounter++}`}
        text={segmentText.slice(lastIndex)}
        query={query}
      />
    );
  }

  return nodes;
}

export const AttributeColoredText: React.FC<AttributeColoredTextProps> = ({
  text,
  query,
  enableAttributeColors = true,
  enableSeasonColors = true,
  enableConvictionColors = false,
  keywordMode = 'prose',
  allowStealthStatusInProse = false,
}) => {
  if (!text) return null;

  const segments = splitTextByKeywords(text, keywordMode, allowStealthStatusInProse);

  return (
    <>
      {segments.map((seg, idx) => {
        if (seg.keyword) {
          return (
            <strong
              key={`kw-${idx}`}
              className="rev-keep-color font-bold"
              style={{ color: KEYWORD_CSS_VAR[seg.keyword] }}
            >
              <HighlightedText text={seg.text} query={query} />
            </strong>
          );
        }

        return (
          <React.Fragment key={`seg-${idx}`}>
            {renderNonKeywordSegment(seg.text, `s${idx}`, {
              query,
              enableAttributeColors,
              enableSeasonColors,
              enableConvictionColors,
            })}
          </React.Fragment>
        );
      })}
    </>
  );
};
