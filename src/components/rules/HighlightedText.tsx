import React from 'react';

interface HighlightedTextProps {
  text: string;
  query?: string;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const HighlightedText: React.FC<HighlightedTextProps> = ({ text, query }) => {
  const clean = query?.trim();
  if (!clean) return <>{text}</>;

  const tokens = Array.from(
    new Set(
      clean
        .split(/\s+/)
        .map((t) => t.trim())
        .filter((t) => t.length >= 2 || clean.length === 1)
    )
  ).sort((a, b) => b.length - a.length);

  if (tokens.length === 0) return <>{text}</>;

  const pattern = new RegExp(`(${tokens.map(escapeRegExp).join('|')})`, 'gi');
  const parts = text.split(pattern);

  return (
    <>
      {parts.map((part, idx) => {
        const isMatch = tokens.some((t) => part.toLowerCase() === t.toLowerCase());
        if (!isMatch) return <React.Fragment key={idx}>{part}</React.Fragment>;
        return (
          <mark
            key={idx}
            className="px-0.5 rounded-sm font-medium"
            style={{
              backgroundColor: 'var(--rev-accent-soft)',
              color: 'var(--rev-accent-highlight)',
            }}
          >
            {part}
          </mark>
        );
      })}
    </>
  );
};
