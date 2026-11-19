import type { Character } from '../../../types';
import { vigorMax, strainMax, dpMax } from '../../../calc';

export default function VitalsCard({ char, updateTracker }: { char: Character, updateTracker: (k: any, a: number) => void }) {
  const stats = [
    { label: 'Vigor', key: 'vigor', current: char.data.trackers.vigor, max: vigorMax(char.data), color: 'bg-red-500' },
    { label: 'Strain', key: 'strain', current: char.data.trackers.strain, max: strainMax(char.data), color: 'bg-blue-500' },
    { label: 'Destiny', key: 'dp', current: char.data.trackers.dp, max: dpMax(char.data), color: 'bg-yellow-500' }
  ];

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-sm p-4 flex flex-col justify-evenly h-full divide-y divide-gray-700/50">
      {stats.map(({ label, key, current, max, color }) => {
        const isStrain = key === 'strain';
        const isVigor = key === 'vigor';
        const isDestiny = key === 'dp';

        const hasTVG = isVigor && current > max;

        // State Thresholds
        let isState1 = false;
        let isState2 = false;

        if (isVigor) {
          isState1 = current <= max / 2 && current > 0;
          isState2 = current <= 0;
        } else if (isStrain) {
          isState1 = current >= max; 
          isState2 = current >= max * 2; 
        } else if (isDestiny) {
          isState1 = current >= max / 2 && current < max;
          isState2 = current >= max;
        }

        // Animated Letter Spacing
        let trackingClass = "tracking-[0.25em]";
        if (isState1) trackingClass = "tracking-[0.35em]";
        if (isState2) trackingClass = "tracking-[0.45em]";

        // Dynamic Title & Segment Colors
        let titleColor = 'text-white';
        let segmentColor = color;

        if (isVigor) {
          if (hasTVG) {
            titleColor = 'text-[#76a5af]'; 
          } else if (current <= -max) {
            titleColor = 'text-black';
            segmentColor = 'bg-black';
          } else if (current <= 0) {
            titleColor = 'text-red-800';
            segmentColor = 'bg-red-800';
          } else if (current <= max / 2) {
            titleColor = 'text-red-400';
          }
        } else if (isStrain) {
          if (current >= max * 2) {
            titleColor = 'text-purple-600';
            segmentColor = 'bg-purple-600';
          } else if (current >= max) {
            titleColor = 'text-blue-400';
          }
        } else if (isDestiny) {
          if (current >= max) {
            titleColor = 'text-cyan-400';
            segmentColor = 'bg-cyan-500';
          } else if (current >= max / 2) {
            titleColor = 'text-yellow-400';
          }
        }

        const totalBars = hasTVG ? current : max;

        return (
          <div key={key} className="flex flex-col items-center w-full gap-2 py-3">
            
            <span className={`vital-static font-bold uppercase text-lg transition-all duration-500 ease-out ${trackingClass} ${titleColor}`}>
              {label}
            </span>

            <div className="vital-static flex w-full gap-1">
              {Array.from({ length: totalBars }).map((_, i) => {
                let isFilled = false;
                let isTVG = false;
                let isOverflowing = false;

                if (isVigor && current < 0) {
                  isFilled = i >= max + current;
                } else {
                  isFilled = i < current;
                  
                  if (isStrain && i < (current - max)) isOverflowing = true;
                  if (isVigor && i >= max) isTVG = true;
                }

                let segmentClass = "vital-static flex-1 h-3.5 rounded-sm transition-all duration-300 ";
                
                if (isFilled) {
                  if (isTVG) {
                    segmentClass += "bg-[#76a5af] shadow-[0_0_8px_rgba(118,165,175,0.6)]";
                  } else if (isOverflowing) {
                    segmentClass += current >= max * 2 ? 'bg-purple-600' : 'bg-purple-500';
                  } else {
                    segmentClass += segmentColor;
                  }
                } else {
                  segmentClass += "bg-gray-700/50"; 
                }

                return <div key={i} className={segmentClass} />;
              })}
            </div>

            <div className="flex items-center bg-gray-900 border border-gray-700 rounded-lg shadow-sm min-w-[10.5rem] w-auto h-9 mt-1 overflow-hidden">
              <button 
                onClick={() => updateTracker(key, -1)} 
                className="w-9 h-full flex items-center justify-center text-gray-400 hover:bg-gray-800 hover:text-white font-bold text-lg shrink-0 transition-colors duration-75"
              >
                −
              </button>
              
              <div className="flex-1 px-2.5 text-center font-bold text-white flex items-baseline justify-center gap-1 select-none tabular-nums whitespace-nowrap">
                <span className={`vital-static text-xl leading-none ${current < 0 ? 'text-red-500' : ''}`}>{current}</span>
                <span className="text-xs text-gray-500 font-normal leading-none">/ {max}</span>
              </div>
              
              <button 
                onClick={() => updateTracker(key, 1)} 
                className="w-9 h-full flex items-center justify-center text-gray-400 hover:bg-gray-800 hover:text-white font-bold text-lg shrink-0 transition-colors duration-75"
              >
                +
              </button>
            </div>

          </div>
        );
      })}
    </div>
  );
}