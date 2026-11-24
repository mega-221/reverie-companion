import React, { useState } from 'react';
import { createPortal } from 'react-dom';

export interface TooltipProps {
  text: string;
  title?: string;
  children: React.ReactNode;
  className?: string;
  noBorder?: boolean;
  disabled?: boolean;
  noTruncate?: boolean;
  inline?: boolean;
  underlineColor?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  text,
  title,
  children,
  className = 'w-full',
  disabled = false,
  noTruncate = false,
  inline = false,
}) => {
  const [coords, setCoords] = useState<{ x: number; y: number; below: boolean }>({
    x: 0,
    y: 0,
    below: false,
  });
  const [show, setShow] = useState(false);

  const underlineStyle: React.CSSProperties | undefined = undefined;
  const underlineClass = '';

  if (disabled || !text) {
    if (inline) {
      return (
        <span className={`${underlineClass} ${className === 'w-full' ? '' : className}`} style={underlineStyle}>
          {children}
        </span>
      );
    }
    return (
      <div className={`inline-flex items-center ${className}`}>
        <div className={`${noTruncate ? 'w-full' : 'truncate w-full'} ${underlineClass}`} style={underlineStyle}>
          {children}
        </div>
      </div>
    );
  }

  const updatePosition = (el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    const x = Math.max(148, Math.min(window.innerWidth - 148, rect.left + rect.width / 2));
    const below = rect.top < 120;
    const y = below ? rect.bottom + 8 : rect.top - 8;
    setCoords({ x, y, below });
    setShow(true);
  };

  const tooltipPortal =
    show &&
    typeof document !== 'undefined' &&
    createPortal(
      <div
        role="tooltip"
        className={`rev-dark-card fixed z-[9999] w-64 sm:w-72 -translate-x-1/2 p-2.5 bg-black text-gray-200 border border-gray-700 text-xs rounded-md shadow-2xl pointer-events-none leading-relaxed normal-case font-normal whitespace-pre-line ${
          coords.below ? '' : '-translate-y-full'
        } ${title ? 'text-left' : 'text-center italic'}`}
        style={{ left: coords.x, top: coords.y }}
      >
        {title && (
          <div className="font-bold text-[11px] uppercase tracking-wider text-white mb-1 pb-1 border-b border-gray-800">
            {title}
          </div>
        )}
        <div className={title ? 'text-gray-300' : ''}>{text}</div>
        {coords.below ? (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-b-black" />
        ) : (
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-black" />
        )}
      </div>,
      document.body
    );

  if (inline) {
    return (
      <>
        <span
          tabIndex={0}
          className={`relative inline cursor-help ${underlineClass} ${className === 'w-full' ? '' : className}`}
          style={underlineStyle}
          onMouseEnter={(e) => updatePosition(e.currentTarget)}
          onMouseLeave={() => setShow(false)}
          onFocus={(e) => updatePosition(e.currentTarget)}
          onBlur={() => setShow(false)}
          onClick={(e) => {
            e.stopPropagation();
            if (show) setShow(false);
            else updatePosition(e.currentTarget);
          }}
        >
          {children}
        </span>
        {tooltipPortal}
      </>
    );
  }

  return (
    <div
      className={`relative inline-flex items-center cursor-help ${className}`}
      onMouseEnter={(e) => updatePosition(e.currentTarget)}
      onMouseLeave={() => setShow(false)}
      onFocus={(e) => updatePosition(e.currentTarget)}
      onBlur={() => setShow(false)}
    >
      <div className={`${noTruncate ? 'w-full' : 'truncate w-full'} ${underlineClass}`} style={underlineStyle}>
        {children}
      </div>
      {tooltipPortal}
    </div>
  );
};
