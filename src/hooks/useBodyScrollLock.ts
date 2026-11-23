import { useEffect } from 'react';

let activeLockCount = 0;
let savedHtmlOverflow = '';
let savedBodyOverflow = '';
let savedBodyPaddingRight = '';

function lockScroll(): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  if (activeLockCount === 0) {
    const html = document.documentElement;
    const body = document.body;
    savedHtmlOverflow = html.style.overflow;
    savedBodyOverflow = body.style.overflow;
    savedBodyPaddingRight = body.style.paddingRight;

    const scrollbarWidth = window.innerWidth - html.clientWidth;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      const computedPad = Number.parseFloat(window.getComputedStyle(body).paddingRight || '0') || 0;
      body.style.paddingRight = `${computedPad + scrollbarWidth}px`;
    }
  }
  activeLockCount += 1;
}

function unlockScroll(): void {
  if (typeof document === 'undefined') return;
  if (activeLockCount <= 0) {
    activeLockCount = 0;
    return;
  }
  activeLockCount -= 1;
  if (activeLockCount === 0) {
    document.documentElement.style.overflow = savedHtmlOverflow;
    document.body.style.overflow = savedBodyOverflow;
    document.body.style.paddingRight = savedBodyPaddingRight;
  }
}

export function useBodyScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;
    lockScroll();
    return () => {
      unlockScroll();
    };
  }, [locked]);
}
