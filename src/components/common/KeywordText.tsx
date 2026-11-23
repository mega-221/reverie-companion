import React from 'react';
import {
  KEYWORD_CSS_VAR,
  splitTextByKeywords,
  type KeywordMatchMode,
} from '../../data/keywords';
import { HighlightedText } from '../rules/HighlightedText';

interface KeywordTextProps {
  text: string;
  mode?: KeywordMatchMode;
  query?: string;
  allowStealthStatusInProse?: boolean;
}

export const KeywordText: React.FC<KeywordTextProps> = ({
  text,
  mode = 'effect',
  query,
  allowStealthStatusInProse = false,
}) => {
  if (!text) return null;
  if (mode === 'off') {
    return <HighlightedText text={text} query={query} />;
  }

  const segments = splitTextByKeywords(text, mode, allowStealthStatusInProse);

  return (
    <>
      {segments.map((seg, idx) =>
        seg.keyword ? (
          <strong
            key={idx}
            className="rev-keep-color font-bold"
            style={{ color: KEYWORD_CSS_VAR[seg.keyword] }}
          >
            <HighlightedText text={seg.text} query={query} />
          </strong>
        ) : (
          <React.Fragment key={idx}>
            <HighlightedText text={seg.text} query={query} />
          </React.Fragment>
        )
      )}
    </>
  );
};
