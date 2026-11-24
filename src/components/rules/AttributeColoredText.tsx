import React from 'react';
import { KEYWORD_CSS_VAR, type KeywordMatchMode } from '../../data/keywords';
import {
  ABBREV_GLOSSARY,
  resolveAbbreviationGlossary,
  splitTextWithGlossary,
} from '../../data/glossary';
import {
  ATTRIBUTE_CSS_VAR,
  CONVICTION_TERM_MAP,
  SEASON_CSS_VAR,
  SEASON_TERM_MAP,
  UNIFIED_TERM_MATCH_REGEX,
  getAttributeForTerm,
} from './attributeColors';
import { HighlightedText } from './HighlightedText';
import { Tooltip } from '../common/Tooltip';

interface AttributeColoredTextProps {
  text: string;
  query?: string;
  enableAttributeColors?: boolean;
  enableSeasonColors?: boolean;
  enableConvictionColors?: boolean;
  keywordMode?: KeywordMatchMode;
  allowStealthStatusInProse?: boolean;
  enableGlossaryTooltips?: boolean;
}

function renderPlainWithAbbreviations(
  plainText: string,
  keyPrefix: string,
  query?: string,
  enableGlossaryTooltips = true
): React.ReactNode {
  if (!enableGlossaryTooltips || !plainText) {
    return <HighlightedText key={keyPrefix} text={plainText} query={query} />;
  }

  const abbrSegments = splitTextWithGlossary(plainText, {
    keywordMode: 'off',
    includeAbbreviations: true,
  });

  if (abbrSegments.length === 1 && !abbrSegments[0].glossary) {
    return <HighlightedText key={keyPrefix} text={plainText} query={query} />;
  }

  return (
    <React.Fragment key={keyPrefix}>
      {abbrSegments.map((seg, idx) =>
        seg.glossary ? (
          <Tooltip
            key={`${keyPrefix}-ab-${idx}`}
            inline
            noTruncate
            title={seg.glossary.title}
            text={seg.glossary.description}
          >
            <span className="font-semibold">
              <HighlightedText text={seg.text} query={query} />
            </span>
          </Tooltip>
        ) : (
          <HighlightedText key={`${keyPrefix}-pl-${idx}`} text={seg.text} query={query} />
        )
      )}
    </React.Fragment>
  );
}

function renderNonKeywordSegment(
  segmentText: string,
  keyPrefix: string,
  options: {
    query?: string;
    enableAttributeColors: boolean;
    enableSeasonColors: boolean;
    enableConvictionColors: boolean;
    enableGlossaryTooltips: boolean;
  }
): React.ReactNode[] {
  const {
    query,
    enableAttributeColors,
    enableSeasonColors,
    enableConvictionColors,
    enableGlossaryTooltips,
  } = options;

  if (!enableAttributeColors && !enableSeasonColors && !enableConvictionColors) {
    return [renderPlainWithAbbreviations(segmentText, `${keyPrefix}-plain`, query, enableGlossaryTooltips)];
  }

  const nodes: React.ReactNode[] = [];
  UNIFIED_TERM_MATCH_REGEX.lastIndex = 0;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyCounter = 0;

  while ((match = UNIFIED_TERM_MATCH_REGEX.exec(segmentText)) !== null) {
    const matchedWord = match[0];

    let colorVar: string | null = null;

    if (enableConvictionColors && CONVICTION_TERM_MAP[matchedWord]) {
      colorVar = SEASON_CSS_VAR[CONVICTION_TERM_MAP[matchedWord]];
    } else if (enableSeasonColors && SEASON_TERM_MAP[matchedWord]) {
      colorVar = SEASON_CSS_VAR[SEASON_TERM_MAP[matchedWord]];
    } else if (enableAttributeColors) {
      const attrKey = getAttributeForTerm(matchedWord);
      if (attrKey) {
        colorVar = ATTRIBUTE_CSS_VAR[attrKey];
      }
    }

    if (!colorVar) continue;

    if (match.index > lastIndex) {
      nodes.push(
        renderPlainWithAbbreviations(
          segmentText.slice(lastIndex, match.index),
          `${keyPrefix}-t-${keyCounter++}`,
          query,
          enableGlossaryTooltips
        )
      );
    }

    const abbrGlossary =
      enableGlossaryTooltips
        ? resolveAbbreviationGlossary(
            matchedWord,
            segmentText,
            match.index,
            UNIFIED_TERM_MATCH_REGEX.lastIndex
          ) || ABBREV_GLOSSARY[matchedWord]
        : null;

    const coloredSpan = (
      <span
        className="rev-keep-color font-semibold"
        style={{ color: colorVar }}
      >
        <HighlightedText text={matchedWord} query={query} />
      </span>
    );

    if (abbrGlossary) {
      nodes.push(
        <Tooltip
          key={`${keyPrefix}-c-${keyCounter++}`}
          inline
          noTruncate
          title={abbrGlossary.title}
          text={abbrGlossary.description}
          underlineColor={colorVar}
        >
          {coloredSpan}
        </Tooltip>
      );
    } else {
      nodes.push(
        <React.Fragment key={`${keyPrefix}-c-${keyCounter++}`}>
          {coloredSpan}
        </React.Fragment>
      );
    }

    lastIndex = UNIFIED_TERM_MATCH_REGEX.lastIndex;
  }

  if (lastIndex < segmentText.length) {
    nodes.push(
      renderPlainWithAbbreviations(
        segmentText.slice(lastIndex),
        `${keyPrefix}-t-${keyCounter++}`,
        query,
        enableGlossaryTooltips
      )
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
  keywordMode = 'off',
  allowStealthStatusInProse = false,
  enableGlossaryTooltips = true,
}) => {
  if (!text) return null;

  const segments = splitTextWithGlossary(text, {
    keywordMode,
    allowStealthStatusInProse,
    includeAbbreviations: false,
  });

  return (
    <>
      {segments.map((seg, idx) => {
        if (seg.keyword && seg.glossary) {
          const kwNode = (
            <strong
              className="rev-keep-color font-bold"
              style={{ color: KEYWORD_CSS_VAR[seg.keyword] }}
            >
              <HighlightedText text={seg.text} query={query} />
            </strong>
          );

          if (!enableGlossaryTooltips) {
            return <React.Fragment key={`kw-${idx}`}>{kwNode}</React.Fragment>;
          }

          return (
            <Tooltip
              key={`kw-${idx}`}
              inline
              noTruncate
              title={seg.glossary.title}
              text={seg.glossary.description}
              underlineColor={KEYWORD_CSS_VAR[seg.keyword]}
            >
              {kwNode}
            </Tooltip>
          );
        }

        return (
          <React.Fragment key={`seg-${idx}`}>
            {renderNonKeywordSegment(seg.text, `s${idx}`, {
              query,
              enableAttributeColors,
              enableSeasonColors,
              enableConvictionColors,
              enableGlossaryTooltips,
            })}
          </React.Fragment>
        );
      })}
    </>
  );
};
