import React from 'react';
import { getSpeedData, getTypeStyle } from '../sheet/utils';
import { SpeedTagPills } from './SpeedTagPills';
import { AttributeColoredText } from '../rules/AttributeColoredText';
import { HighlightedText } from '../rules/HighlightedText';

export interface AbilityBoxStat {
  label: string;
  value: string;
  colorVar?: string;
}

export interface AbilityBoxProps {
  name: string;
  marker?: string;
  subtype?: string;
  requires?: string;
  snCost?: string | null;
  acc?: string | null;
  dmg?: string | null;
  eva?: string | null;
  extraStats?: string[];
  effect?: React.ReactNode;
  highlightQuery?: string;
}

function resolveTypeCategory(subtype?: string): 'attack' | 'defensive' | 'utility' | 'passive' {
  if (!subtype) return 'utility';
  const lower = subtype.toLowerCase();
  if (lower.includes('attack')) return 'attack';
  if (lower.includes('defensive')) return 'defensive';
  if (lower.includes('passive')) return 'passive';
  return 'utility';
}

function extractRankAndWeapons(requires?: string): {
  rankTag: string | null;
  weaponsTag: string | null;
  cleanRequires: string;
} {
  if (!requires) {
    return { rankTag: null, weaponsTag: null, cleanRequires: 'None' };
  }
  const stripped = requires.replace(/^Requires:\s*/i, '').replace(/^Requirements:\s*/i, '').trim();
  const rankMatch = stripped.match(/(?:Class|Berserker|[A-Za-z]+)\s+Rank\s+(\d+)/i);
  const rankTag = rankMatch ? `Rank ${rankMatch[1]}` : null;
  const weaponsMatch = stripped.match(/Weapons:\s*([^·]+)/i);
  const weaponsTag = weaponsMatch ? weaponsMatch[1].trim() : null;

  return {
    rankTag,
    weaponsTag,
    cleanRequires: stripped || 'None',
  };
}

export const AbilityBox: React.FC<AbilityBoxProps> = ({
  name,
  marker,
  subtype,
  requires,
  snCost,
  acc,
  dmg,
  eva,
  extraStats,
  effect,
  highlightQuery,
}) => {
  const category = resolveTypeCategory(subtype);
  const speedData = marker
    ? getSpeedData(marker === 'I' ? '|' : marker)
    : null;
  const { rankTag, weaponsTag, cleanRequires } = extractRankAndWeapons(requires);

  const isPassive = category === 'passive' && !snCost && !acc && !dmg && !eva;

  const stats: AbilityBoxStat[] = [];
  if (!isPassive) {
    if (snCost !== undefined && snCost !== null) {
      stats.push({
        label: 'Strain',
        value: snCost.replace(/\s+Strain$/i, ' SN'),
        colorVar: 'var(--rev-info-text)',
      });
    }
    if (acc !== undefined && acc !== null) {
      stats.push({
        label: 'Accuracy',
        value: acc.replace(/\s*ACC$/i, ''),
        colorVar: 'var(--rev-pos-text)',
      });
    }
    if (dmg !== undefined && dmg !== null) {
      stats.push({
        label: 'Damage',
        value: dmg.replace(/\s*DMG$/i, ''),
        colorVar: 'var(--rev-neg-text)',
      });
    }
    if (eva !== undefined && eva !== null) {
      stats.push({
        label: 'Evasion',
        value: eva.replace(/\s*EVA$/i, ''),
        colorVar: 'var(--rev-arcane-text)',
      });
    }
    if (extraStats && extraStats.length > 0) {
      extraStats.forEach((extra) => {
        stats.push({
          label: 'Modifier',
          value: extra,
          colorVar: 'var(--rev-accent-text)',
        });
      });
    }
    stats.push({
      label: 'Requires',
      value: cleanRequires,
      colorVar: 'var(--rev-text-secondary)',
    });
  }

  return (
    <div
      className="border rounded-lg transition-colors my-3 overflow-visible"
      style={{
        backgroundColor: 'var(--rev-surface-inset)',
        borderColor: 'var(--rev-border)',
      }}
    >
      {/* Header Row modeled on Character Sheet AbilitiesCard */}
      <div className="flex flex-col sm:flex-row sm:items-center p-2 gap-2">
        <div
          className="w-full sm:w-[240px] shrink-0 border rounded-md py-1.5 px-2.5 text-sm font-bold flex items-center justify-between"
          style={{
            backgroundColor: 'var(--rev-surface)',
            borderColor: 'var(--rev-border-strong)',
            color: 'var(--rev-text-bright)',
          }}
        >
          <span className="truncate">
            <HighlightedText text={name} query={highlightQuery} />
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
          {subtype && (
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border shrink-0 whitespace-nowrap ${getTypeStyle(
                category
              )}`}
            >
              <HighlightedText text={subtype} query={highlightQuery} />
            </span>
          )}

          <SpeedTagPills
            speedData={speedData}
            speedBadgeClassName="rev-dark-card bg-gray-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-gray-200 border border-gray-600 cursor-help whitespace-nowrap"
          />

          {weaponsTag && (
            <span
              className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border shrink-0 whitespace-nowrap"
              style={{
                backgroundColor: 'var(--rev-surface)',
                borderColor: 'var(--rev-border-strong)',
                color: 'var(--rev-text-secondary)',
              }}
            >
              {weaponsTag}
            </span>
          )}

          {rankTag && (
            <span
              className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border shrink-0 whitespace-nowrap tabular-nums"
              style={{
                backgroundColor: 'var(--rev-surface)',
                borderColor: 'var(--rev-border-strong)',
                color: 'var(--rev-text-secondary)',
              }}
            >
              {rankTag}
            </span>
          )}

          {isPassive && cleanRequires !== 'None' && (
            <span
              className="px-2 py-0.5 rounded text-[10px] font-semibold border shrink-0 whitespace-nowrap"
              style={{
                backgroundColor: 'var(--rev-surface)',
                borderColor: 'var(--rev-border)',
                color: 'var(--rev-text-muted)',
              }}
            >
              <AttributeColoredText
                text={cleanRequires}
                query={highlightQuery}
                enableAttributeColors
                enableSeasonColors
                keywordMode="off"
              />
            </span>
          )}
        </div>
      </div>

      {/* Standardized Body: Segmented Stats Strip + Effect */}
      <div
        className="p-3.5 sm:p-4 border-t text-sm rounded-b-lg space-y-3"
        style={{
          borderColor: 'var(--rev-border-subtle)',
          backgroundColor: 'var(--rev-surface-inset-alt)',
        }}
      >
        {stats.length > 0 && (
          <div
            className="flex flex-wrap justify-between gap-y-2 p-2 rounded border text-center"
            style={{
              backgroundColor: 'var(--rev-surface)',
              borderColor: 'var(--rev-border-subtle)',
            }}
          >
            {stats.map((stat, idx) => (
              <div
                key={`${stat.label}-${idx}`}
                className="flex-1 flex flex-col items-center justify-center min-w-[84px] px-2"
                style={
                  idx !== stats.length - 1
                    ? { borderRight: '1px solid var(--rev-border-subtle)' }
                    : undefined
                }
              >
                <span
                  className="text-[10px] font-bold uppercase tracking-wider mb-0.5"
                  style={{ color: 'var(--rev-text-faint)' }}
                >
                  {stat.label}
                </span>
                <span
                  className="text-xs sm:text-sm font-bold tabular-nums leading-snug"
                  style={{ color: stat.colorVar || 'var(--rev-text-bright)' }}
                >
                  {stat.label === 'Requires' ? (
                    <AttributeColoredText
                      text={stat.value}
                      query={highlightQuery}
                      enableAttributeColors
                      enableSeasonColors
                      keywordMode="off"
                    />
                  ) : (
                    <HighlightedText text={stat.value} query={highlightQuery} />
                  )}
                </span>
              </div>
            ))}
          </div>
        )}

        {effect && (
          <div className="space-y-1">
            <div
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: 'var(--rev-text-faint)' }}
            >
              Effect
            </div>
            <div
              className="pl-3 space-y-1.5"
              style={{
                borderLeft: '2px solid var(--rev-quote-border)',
                color: 'var(--rev-text)',
              }}
            >
              {effect}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
