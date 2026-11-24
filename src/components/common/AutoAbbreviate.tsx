import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';

interface AutoAbbreviateProps {
  full: string;
  short: string;
  group?: string;
  className?: string;
  title?: string;
}

interface GroupState {
  members: Map<string, boolean>;
  listeners: Set<() => void>;
}

const groupRegistry = new Map<string, GroupState>();

function getOrCreateGroup(groupName: string): GroupState {
  let state = groupRegistry.get(groupName);
  if (!state) {
    state = { members: new Map(), listeners: new Set() };
    groupRegistry.set(groupName, state);
  }
  return state;
}

function isGroupAbbreviated(groupName: string): boolean {
  const state = groupRegistry.get(groupName);
  if (!state) return false;
  for (const overflows of state.members.values()) {
    if (overflows) return true;
  }
  return false;
}

function setGroupMemberOverflow(groupName: string, memberId: string, overflows: boolean) {
  const state = getOrCreateGroup(groupName);
  const prev = state.members.get(memberId);
  if (prev === overflows) return;
  const prevGroupAbbrev = isGroupAbbreviated(groupName);
  state.members.set(memberId, overflows);
  const nextGroupAbbrev = isGroupAbbreviated(groupName);
  if (prevGroupAbbrev !== nextGroupAbbrev) {
    state.listeners.forEach((cb) => cb());
  }
}

function removeGroupMember(groupName: string, memberId: string) {
  const state = groupRegistry.get(groupName);
  if (!state) return;
  const prevGroupAbbrev = isGroupAbbreviated(groupName);
  state.members.delete(memberId);
  if (state.members.size === 0 && state.listeners.size === 0) {
    groupRegistry.delete(groupName);
    return;
  }
  const nextGroupAbbrev = isGroupAbbreviated(groupName);
  if (prevGroupAbbrev !== nextGroupAbbrev) {
    state.listeners.forEach((cb) => cb());
  }
}

export function AutoAbbreviate({ full, short, group, className = '', title }: AutoAbbreviateProps) {
  const memberId = useId();
  const containerRef = useRef<HTMLSpanElement | null>(null);
  const measureRef = useRef<HTMLSpanElement | null>(null);
  const [selfUseShort, setSelfUseShort] = useState(false);
  const [groupUseShort, setGroupUseShort] = useState(() => (group ? isGroupAbbreviated(group) : false));

  useEffect(() => {
    if (!group) return;
    const state = getOrCreateGroup(group);
    const sync = () => setGroupUseShort(isGroupAbbreviated(group));
    state.listeners.add(sync);
    sync();
    return () => {
      state.listeners.delete(sync);
      removeGroupMember(group, memberId);
    };
  }, [group, memberId]);

  const checkFit = useCallback(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    const availableWidth = container.getBoundingClientRect().width;
    if (availableWidth <= 0) return;

    const fullWidth = measure.getBoundingClientRect().width;
    const overflows = fullWidth > availableWidth + 0.5;
    setSelfUseShort(overflows);
    if (group) {
      setGroupMemberOverflow(group, memberId, overflows);
    }
  }, [group, memberId]);

  useLayoutEffect(() => {
    checkFit();
  }, [checkFit, full, short, className]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let rafId = 0;
    const scheduleCheck = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(checkFit);
    };

    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(scheduleCheck) : null;
    observer?.observe(container);
    window.addEventListener('resize', scheduleCheck);

    let cancelled = false;
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (!cancelled) scheduleCheck();
      });
    }

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      observer?.disconnect();
      window.removeEventListener('resize', scheduleCheck);
    };
  }, [checkFit]);

  const useShort = group ? selfUseShort || groupUseShort : selfUseShort;

  return (
    <span
      ref={containerRef}
      title={title ?? (useShort ? full : undefined)}
      className={`relative block w-full min-w-0 overflow-hidden whitespace-nowrap ${className}`}
    >
      {useShort ? short : full}
      <span
        ref={measureRef}
        aria-hidden="true"
        className="pointer-events-none invisible absolute left-0 top-0 whitespace-nowrap"
      >
        {full}
      </span>
    </span>
  );
}
