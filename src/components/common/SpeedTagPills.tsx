import React from 'react';

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
  speedBadgeClassName = 'bg-gray-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-gray-300 border border-gray-600 cursor-help whitespace-nowrap',
}) => {
  if (!speedData) return null;

  return (
    <>
      <div className="relative group inline-flex items-center shrink-0">
        <span className={speedBadgeClassName}>{speedData.speedLabel}</span>
        <div className="rev-dark-card absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-black text-gray-200 border border-gray-700 text-xs rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[100] pointer-events-none text-center leading-tight normal-case font-normal italic">
          {speedData.speedTooltip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black" />
        </div>
      </div>

      {speedData.upkeepLabel && (
        <div className="relative group inline-flex items-center shrink-0">
          <span className="rev-keep-color rev-dark-card bg-teal-900/40 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-teal-300 border border-teal-700/50 cursor-help whitespace-nowrap">
            {speedData.upkeepLabel}
          </span>
          <div className="rev-dark-card absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-black text-gray-200 border border-gray-700 text-xs rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[100] pointer-events-none text-center leading-tight normal-case font-normal italic">
            {speedData.upkeepTooltip}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black" />
          </div>
        </div>
      )}
    </>
  );
};
