import React from 'react';
import type { KeywordMatchMode } from '../../data/keywords';
import { ATTRIBUTE_CSS_VAR } from './attributeColors';
import { AttributeColoredText } from './AttributeColoredText';
import { HighlightedText } from './HighlightedText';

export interface RichTextOptions {
  colorAttributes?: boolean;
  enableSeasonColors?: boolean;
  enableConvictionColors?: boolean;
  keywordMode?: KeywordMatchMode;
  allowStealthStatusInProse?: boolean;
}

export function renderInline(
  text: string,
  highlightQuery?: string,
  optionsOrAttr: boolean | RichTextOptions = true
): React.ReactNode {
  const opts: RichTextOptions =
    typeof optionsOrAttr === 'boolean'
      ? { colorAttributes: optionsOrAttr }
      : optionsOrAttr;
  const {
    colorAttributes = true,
    enableSeasonColors = true,
    enableConvictionColors = false,
    keywordMode = 'off',
    allowStealthStatusInProse = false,
  } = opts;

  const nodes: React.ReactNode[] = [];
  const tokenRegex = /(\*\*[^*]+\*\*|\*[^*\n]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyCounter = 0;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(
        <AttributeColoredText
          key={`p-${keyCounter++}`}
          text={text.slice(lastIndex, match.index)}
          query={highlightQuery}
          enableAttributeColors={colorAttributes}
          enableSeasonColors={enableSeasonColors}
          enableConvictionColors={enableConvictionColors}
          keywordMode={keywordMode}
          allowStealthStatusInProse={allowStealthStatusInProse}
        />
      );
    }

    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      nodes.push(
        <strong key={`b-${keyCounter++}`} className="font-semibold" style={{ color: 'var(--rev-text-bright)' }}>
          <AttributeColoredText
            text={token.slice(2, -2)}
            query={highlightQuery}
            enableAttributeColors={colorAttributes}
            enableSeasonColors={enableSeasonColors}
            enableConvictionColors={enableConvictionColors}
            keywordMode={keywordMode}
            allowStealthStatusInProse={allowStealthStatusInProse}
          />
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      nodes.push(
        <em key={`i-${keyCounter++}`} className="italic" style={{ color: 'var(--rev-text-secondary)' }}>
          <AttributeColoredText
            text={token.slice(1, -1)}
            query={highlightQuery}
            enableAttributeColors={colorAttributes}
            enableSeasonColors={enableSeasonColors}
            enableConvictionColors={enableConvictionColors}
            keywordMode={keywordMode}
            allowStealthStatusInProse={allowStealthStatusInProse}
          />
        </em>
      );
    }
    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(
      <AttributeColoredText
        key={`p-${keyCounter++}`}
        text={text.slice(lastIndex)}
        query={highlightQuery}
        enableAttributeColors={colorAttributes}
        enableSeasonColors={enableSeasonColors}
        enableConvictionColors={enableConvictionColors}
        keywordMode={keywordMode}
        allowStealthStatusInProse={allowStealthStatusInProse}
      />
    );
  }
  return nodes;
}

export function renderOriginSkillText(text: string, highlightQuery?: string): React.ReactNode {
  return (
    <>
      {text.split(/(\bReason\b)/g).map((part, index) =>
        part === 'Reason' ? (
          <span key={index} className="rev-keep-color font-semibold" style={{ color: ATTRIBUTE_CSS_VAR.int }}>
            <HighlightedText text={part} query={highlightQuery} />
          </span>
        ) : (
          <AttributeColoredText
            key={index}
            text={part}
            query={highlightQuery}
            enableAttributeColors
            enableSeasonColors={false}
            keywordMode="off"
          />
        )
      )}
    </>
  );
}

export function renderListItem(
  item: string,
  highlightQuery?: string,
  options: RichTextOptions = {}
): React.ReactNode {
  const colonOrDash = item.match(/^([^—:\-]{2,36}?)\s*(:|\s-\s)\s*(.+)$/);
  if (colonOrDash && !/^\*\*/.test(item)) {
    const [, term, separator, rest] = colonOrDash;
    return (
      <>
        <strong className="font-semibold" style={{ color: 'var(--rev-text-bright)' }}>
          <AttributeColoredText
            text={term}
            query={highlightQuery}
            enableAttributeColors={options.colorAttributes ?? true}
            enableSeasonColors={options.enableSeasonColors ?? true}
            enableConvictionColors={options.enableConvictionColors ?? false}
            keywordMode={options.keywordMode ?? 'off'}
            allowStealthStatusInProse={options.allowStealthStatusInProse ?? false}
          />
        </strong>
        <span style={{ color: 'var(--rev-text-muted)' }}>
          {separator === ':' ? ': ' : ' — '}
        </span>
        {renderInline(rest, highlightQuery, options)}
      </>
    );
  }
  return renderInline(item, highlightQuery, options);
}

export function renderAbilityEffect(
  effectLines: string[],
  highlightQuery?: string,
  enableConvictionColors = false
): React.ReactNode {
  const joined = effectLines
    .join(' ')
    .trim()
    .replace(/^\*\*(?:Effect|Effects):\*\*\s*/i, '')
    .replace(/^(?:Effect|Effects):\s*/i, '')
    .trim();
  if (!joined) return null;

  const effectOptions: RichTextOptions = {
    colorAttributes: true,
    enableSeasonColors: true,
    enableConvictionColors,
    keywordMode: 'effect',
    allowStealthStatusInProse: true,
  };

  if (joined.includes(' ● ')) {
    const [lead, ...bulletParts] = joined.split(/\s+●\s+/);
    return (
      <div className="space-y-1.5">
        {lead && (
          <p className="text-sm leading-relaxed" style={{ color: 'var(--rev-text)' }}>
            {renderInline(lead, highlightQuery, effectOptions)}
          </p>
        )}
        <ul className="space-y-1 pl-4">
          {bulletParts.map((item, index) => (
            <li
              key={index}
              className="text-sm leading-relaxed list-disc"
              style={{ color: 'var(--rev-text)' }}
            >
              {renderInline(item, highlightQuery, effectOptions)}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <p className="text-sm leading-relaxed" style={{ color: 'var(--rev-text)' }}>
      {renderInline(joined, highlightQuery, effectOptions)}
    </p>
  );
}
