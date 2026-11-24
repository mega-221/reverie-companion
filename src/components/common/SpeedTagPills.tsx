import React from 'react';
import { Tooltip } from './Tooltip';

export interface SpeedTagData {
  speedLabel: string;
  speedTooltip: string;
  upkeepLabel: string;
  upkeepTooltip: string;
}

interface SpeedTagPillsProps {
  speedData: SpeedTagData | null | undefined;
  speedBadgeClassName?: string;
}

export const SpeedTagPills: React.FC<SpeedTagPillsProps> = ({
  speedData,
  speedBadgeClassName = 'rev-ability-pill bg-gray-800 text-gray-300 border-gray-600 cursor-help',
}) => {
  if (!speedData) return null;

  return (
    <span className="rev-speed-tags inline-flex items-center gap-1.5 shrink-0 h-6">
      <Tooltip
        text={speedData.speedTooltip}
        noBorder
        noTruncate
        className="w-fit h-6 shrink-0"
      >
        <span className={speedBadgeClassName}>{speedData.speedLabel}</span>
      </Tooltip>

      {speedData.upkeepLabel && (
        <Tooltip
          text={speedData.upkeepTooltip}
          noBorder
          noTruncate
          className="w-fit h-6 shrink-0"
        >
          <span className="rev-keep-color rev-dark-card rev-ability-pill bg-teal-900/40 text-teal-300 border-teal-700/50 cursor-help">
            {speedData.upkeepLabel}
          </span>
        </Tooltip>
      )}
    </span>
  );
};
