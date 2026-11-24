export default function CompactVitalMeter({
  kind,
  label,
  current,
  max,
}: {
  kind: 'vigor' | 'strain' | 'dp' | 'ap';
  label: string;
  current: number;
  max: number;
}) {
  const safeMax = Math.max(1, max);
  const isVigor = kind === 'vigor';
  const isStrain = kind === 'strain';
  const isDestiny = kind === 'dp';

  const hasTemporaryVigor = isVigor && current > safeMax;
  let titleColor = 'text-gray-300';
  let segmentColor = 'bg-red-500';

  if (isVigor) {
    if (hasTemporaryVigor) titleColor = 'text-[#76a5af]';
    else if (current <= -safeMax) {
      titleColor = 'text-gray-400';
      segmentColor = 'bg-black';
    } else if (current <= 0) {
      titleColor = 'text-red-500';
      segmentColor = 'bg-red-800';
    } else if (current <= safeMax / 2) titleColor = 'text-red-400';
    else titleColor = 'text-gray-200';
  } else if (isStrain) {
    segmentColor = 'bg-blue-500';
    if (current >= safeMax * 2) {
      titleColor = 'text-purple-400';
      segmentColor = 'bg-purple-600';
    } else if (current >= safeMax) titleColor = 'text-blue-400';
    else titleColor = 'text-gray-200';
  } else if (isDestiny) {
    segmentColor = 'bg-yellow-500';
    if (current >= safeMax) {
      titleColor = 'text-cyan-400';
      segmentColor = 'bg-cyan-500';
    } else if (current >= safeMax / 2) titleColor = 'text-yellow-400';
    else titleColor = 'text-gray-200';
  } else if (kind === 'ap') {
    if (current < max) {
      titleColor = 'text-amber-400';
      segmentColor = 'bg-amber-400';
    } else if (current > max) {
      titleColor = 'text-cyan-300';
      segmentColor = 'bg-cyan-400';
    } else {
      titleColor = 'text-gray-200';
      segmentColor = 'bg-cyan-500';
    }
  }

  const totalBars = hasTemporaryVigor ? current : safeMax;
  const pct = Math.max(0, Math.min(100, (current / safeMax) * 100));

  return (
    <div className="flex flex-col gap-1 min-w-0">
      <div className="flex items-baseline justify-between gap-1 text-[11px] leading-none">
        <span className={`vital-static font-bold uppercase tracking-wider ${titleColor}`}>{label}</span>
        <span className="font-bold tabular-nums" style={{ color: 'var(--rev-text)' }}>
          <span className={current < 0 ? 'vital-static text-red-500' : ''}>{current}</span>
          <span className="font-normal" style={{ color: 'var(--rev-text-faint)' }}>/{max}</span>
        </span>
      </div>

      {totalBars <= 24 ? (
        <div className="vital-static flex w-full gap-0.5 h-1.5">
          {Array.from({ length: totalBars }).map((_, index) => {
            let isFilled = false;
            let isTemporary = false;
            let isOverflowing = false;

            if (isVigor && current < 0) isFilled = index >= safeMax + current;
            else {
              isFilled = index < current;
              if (isStrain && index < current - safeMax) isOverflowing = true;
              if (isVigor && index >= safeMax) isTemporary = true;
            }

            let segmentClass = 'vital-static flex-1 h-full rounded-[1px] transition-colors duration-200 ';
            if (isFilled) {
              if (isTemporary) segmentClass += 'bg-[#76a5af]';
              else if (isOverflowing) segmentClass += current >= safeMax * 2 ? 'bg-purple-600' : 'bg-purple-500';
              else segmentClass += segmentColor;
            } else segmentClass += 'bg-gray-700/50';
            return <div key={index} className={segmentClass} />;
          })}
        </div>
      ) : (
        <div className="vital-static h-1.5 w-full rounded-full bg-gray-700/50 overflow-hidden">
          <div
            className={`vital-static h-full rounded-full transition-all duration-300 ${hasTemporaryVigor ? 'bg-[#76a5af]' : segmentColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
