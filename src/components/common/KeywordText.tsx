import React from 'react';
import { KEYWORD_CSS_VAR, type KeywordMatchMode } from '../../data/keywords';
import { splitTextWithGlossary } from '../../data/glossary';
import { HighlightedText } from '../rules/HighlightedText';
import { Tooltip } from './Tooltip';

interface KeywordTextProps {
  text: string;
  mode?: KeywordMatchMode;
  query?: string;
  allowStealthStatusInProse?: boolean;
  includeAbbreviations?: boolean;
}

export const KeywordText: React.FC<KeywordTextProps> = ({
  text,
  mode = 'effect',
  query,
  allowStealthStatusInProse = false,
  includeAbbreviations = true,
}) => {
  if (!text) return null;
  if (mode === 'off' && !includeAbbreviations) {
    return <HighlightedText text={text} query={query} />;
  }

  const segments = splitTextWithGlossary(text, {
    keywordMode: mode,
    allowStealthStatusInProse,
    includeAbbreviations,
  });

  return (
    <>
      {segments.map((seg, idx) => {
        if (seg.keyword && seg.glossary) {
          return (
            <Tooltip
              key={idx}
              inline
              noTruncate
              title={seg.glossary.title}
              text={seg.glossary.description}
              underlineColor={KEYWORD_CSS_VAR[seg.keyword]}
            >
              <strong
                className="rev-keep-color font-bold"
                style={{ color: KEYWORD_CSS_VAR[seg.keyword] }}
              >
                <HighlightedText text={seg.text} query={query} />
              </strong>
            </Tooltip>
          );
        }

        if (seg.glossary) {
          return (
            <Tooltip
              key={idx}
              inline
              noTruncate
              title={seg.glossary.title}
              text={seg.glossary.description}
            >
              <span className="font-semibold">
                <HighlightedText text={seg.text} query={query} />
              </span>
            </Tooltip>
          );
        }

        return (
          <React.Fragment key={idx}>
            <HighlightedText text={seg.text} query={query} />
          </React.Fragment>
        );
      })}
    </>
  );
};
