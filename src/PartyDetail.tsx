import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';
import type {
  Character,
  CharacterData,
  Party,
  PartyMember,
  PartyMessage,
  PartyNotificationPayload,
  PartyVitalsSyncPayload,
} from './types';
import { useConfirm } from './components/sheet/ConfirmDialog';
import { useCompendium } from './CompendiumContext';
import { vigorMax, strainMax, dpMax, apMax } from './calc';
import { sendEphemeralBroadcast, useVisibilityRealtime } from './hooks/useVisibilityRealtime';
import PartyCalendar from './components/party/PartyCalendar';
import PartyChat from './components/party/PartyChat';
import NotifyPlayersModal from './components/party/NotifyPlayersModal';
import PartyNotificationPopup from './components/party/PartyNotificationPopup';
import PartyDateTransitionPopup, { type PartyDateTransition } from './components/party/PartyDateTransitionPopup';
import { CrisisModal } from './components/sheet/narrative/ConvictionsCard';
import { getSpendableXp } from './components/sheet/progression/progressionData';
import { normalizeCalendarDate, type ReverieCalendarDate } from './reverieCalendar';

export type SharedCharacterEntry = {
  id: string;
  party_id: string;
  character_id: string;
  user_id: string;
  character: Character;
  username?: string;
};

function safeVitalsData(raw: Partial<CharacterData> | undefined): CharacterData {
  return {
    identity: raw?.identity || { origin: '', className: '', path: '', quote: '', inspirations: [], originChoices: {} },
    progression: raw?.progression || { tier: 0, level: 0, xp: 0, advancements: [] },
    attributes: raw?.attributes || { grt: 1, ref: 1, int: 1, psy: 1 },
    skills: raw?.skills || {},
    specialSkills: Array.isArray(raw?.specialSkills) ? raw!.specialSkills : [],
    convictions: Array.isArray(raw?.convictions) ? raw!.convictions : [],
    failings: Array.isArray(raw?.failings) ? raw!.failings : [],
    aspects: Array.isArray(raw?.aspects) ? raw!.aspects : [],
    abilities: Array.isArray(raw?.abilities) ? raw!.abilities : [],
    disciplines: Array.isArray(raw?.disciplines) ? raw!.disciplines : [],
    items: Array.isArray(raw?.items) ? raw!.items : [],
    possessions: Array.isArray(raw?.possessions) ? raw!.possessions : [],
    equipment: raw?.equipment || { mainHand: '', mainHandMode: '', offHand: '', armour: '', extra: [] },
    bonus: raw?.bonus || { vm: 0, sl: 0, dp: 0, eva: 0, ap: 0 },
    trackers: raw?.trackers || { vigor: 5, strain: 0, dp: 2, ap: 0, acc: 0, injuries: [] },
    notes: raw?.notes || '',
    journal: Array.isArray(raw?.journal) ? raw!.journal : [],
    relationships: Array.isArray(raw?.relationships) ? raw!.relationships : [],
    allowedEditors: Array.isArray(raw?.allowedEditors) ? raw!.allowedEditors : [],
  };
}

function CompactVitalMeter({
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
  const isAp = kind === 'ap';

  const hasTVG = isVigor && current > safeMax;
  let titleColor = 'text-gray-300';
  let segmentColor = 'bg-red-500';

  if (isVigor) {
    segmentColor = 'bg-red-500';
    if (hasTVG) {
      titleColor = 'text-[#76a5af]';
    } else if (current <= -safeMax) {
      titleColor = 'text-gray-400';
      segmentColor = 'bg-black';
    } else if (current <= 0) {
      titleColor = 'text-red-500';
      segmentColor = 'bg-red-800';
    } else if (current <= safeMax / 2) {
      titleColor = 'text-red-400';
    } else {
      titleColor = 'text-gray-200';
    }
  } else if (isStrain) {
    segmentColor = 'bg-blue-500';
    if (current >= safeMax * 2) {
      titleColor = 'text-purple-400';
      segmentColor = 'bg-purple-600';
    } else if (current >= safeMax) {
      titleColor = 'text-blue-400';
    } else {
      titleColor = 'text-gray-200';
    }
  } else if (isDestiny) {
    segmentColor = 'bg-yellow-500';
    if (current >= safeMax) {
      titleColor = 'text-cyan-400';
      segmentColor = 'bg-cyan-500';
    } else if (current >= safeMax / 2) {
      titleColor = 'text-yellow-400';
    } else {
      titleColor = 'text-gray-200';
    }
  } else if (isAp) {
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

  const totalBars = hasTVG ? current : safeMax;
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
          {Array.from({ length: totalBars }).map((_, i) => {
            let isFilled = false;
            let isTVG = false;
            let isOverflowing = false;

            if (isVigor && current < 0) {
              isFilled = i >= safeMax + current;
            } else {
              isFilled = i < current;
              if (isStrain && i < current - safeMax) isOverflowing = true;
              if (isVigor && i >= safeMax) isTVG = true;
            }

            let segClass = 'vital-static flex-1 h-full rounded-[1px] transition-colors duration-200 ';
            if (isFilled) {
              if (isTVG) {
                segClass += 'bg-[#76a5af]';
              } else if (isOverflowing) {
                segClass += current >= safeMax * 2 ? 'bg-purple-600' : 'bg-purple-500';
              } else {
                segClass += segmentColor;
              }
            } else {
              segClass += 'bg-gray-700/50';
            }
            return <div key={i} className={segClass} />;
          })}
        </div>
      ) : (
        <div className="vital-static h-1.5 w-full rounded-full bg-gray-700/50 overflow-hidden">
          <div
            className={`vital-static h-full rounded-full transition-all duration-300 ${
              hasTVG ? 'bg-[#76a5af]' : segmentColor
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default function PartyDetail({
  partyId,
  userId,
  userUsername,
  onBack,
  onInspectCharacter,
}: {
  partyId: string;
  userId: string;
  userUsername: string;
  onBack: () => void;
  onInspectCharacter: (character: Character) => void;
}) {
  const { getEntryByName } = useCompendium();
  const [party, setParty] = useState<Party | null>(null);
  const [members, setMembers] = useState<PartyMember[]>([]);
  const [memberUsernames, setMemberUsernames] = useState<Map<string, string>>(new Map());
  const [sharedChars, setSharedChars] = useState<SharedCharacterEntry[]>([]);
  const [liveVitalsMap, setLiveVitalsMap] = useState<Map<string, PartyVitalsSyncPayload>>(new Map());
  const [userCharacters, setUserCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { askConfirm, confirmDialog } = useConfirm();

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteInput, setInviteInput] = useState('');
  const [inviting, setInviting] = useState(false);

  const [isShareOpen, setIsShareOpen] = useState(false);
  const [selectedCharIds, setSelectedCharIds] = useState<Set<string>>(new Set());
  const [sharing, setSharing] = useState(false);

  const [isEditPartyOpen, setIsEditPartyOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingMeta, setSavingMeta] = useState(false);

  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const [notificationQueue, setNotificationQueue] = useState<PartyNotificationPayload[]>([]);
  const [dateTransition, setDateTransition] = useState<PartyDateTransition | null>(null);
  const [crisisChar, setCrisisChar] = useState<Character | null>(null);

  const [incomingChatMessages, setIncomingChatMessages] = useState<PartyMessage[]>([]);
  const [deletedChatIds, setDeletedChatIds] = useState<string[]>([]);
  const [chatRefreshSignal, setChatRefreshSignal] = useState(0);

  const [isLeaderMenuOpen, setIsLeaderMenuOpen] = useState(false);
  const leaderMenuRef = useRef<HTMLDivElement | null>(null);
  const resumeSyncTimerRef = useRef<number | null>(null);
  const partyCalendarRef = useRef<ReverieCalendarDate | null | undefined>(party?.calendar_date);
  partyCalendarRef.current = party?.calendar_date;
  const partyNameRef = useRef<string | undefined>(party?.name);
  partyNameRef.current = party?.name;

  const enqueueNotification = useCallback((payload: PartyNotificationPayload) => {
    if (!payload?.id || !Array.isArray(payload.targetUserIds)) return;
    if (!payload.targetUserIds.includes(userId)) return;
    setNotificationQueue(prev => {
      if (prev.some(n => n.id === payload.id)) return prev;
      return [...prev, payload];
    });
  }, [userId]);

  const buildSharedEntries = useCallback(
    async (sharedList: any[], profileMap: Map<string, string>): Promise<SharedCharacterEntry[]> => {
      const charIds = Array.from(new Set(sharedList.map(s => s.character_id).filter(Boolean)));
      const liveCharMap = new Map<string, Character>();

      if (charIds.length > 0) {
        const { data: liveChars } = await supabase
          .from('characters')
          .select('*')
          .in('id', charIds);
        if (liveChars) {
          for (const lc of liveChars as Character[]) {
            liveCharMap.set(lc.id, lc);
          }
        }
      }

      return sharedList.map(s => {
        const live = liveCharMap.get(s.character_id);
        return {
          id: s.id,
          party_id: s.party_id,
          character_id: s.character_id,
          user_id: s.user_id,
          username: profileMap.get(s.user_id) || s.user_id.slice(0, 8),
          character: live || {
            id: s.character_id,
            user_id: s.user_id,
            name: s.character_name || 'Unnamed Character',
            data: s.character_data || {},
            allowed_editors: Array.isArray(s.character_data?.allowedEditors)
              ? s.character_data.allowedEditors
              : [],
            created_at: s.created_at,
            updated_at: s.created_at,
          },
        };
      });
    },
    []
  );

  const loadPartyData = useCallback(
    async (showLoader = true) => {
      if (showLoader) setLoading(true);
      setError(null);

      try {
        const { data: partyData, error: partyErr } = await supabase
          .from('parties')
          .select('*')
          .eq('id', partyId)
          .single();

        if (partyErr) throw partyErr;
        setParty(partyData as Party);

        const { data: memberData, error: memberErr } = await supabase
          .from('party_members')
          .select('*')
          .eq('party_id', partyId);

        if (memberErr) throw memberErr;
        const memberList = (memberData as PartyMember[]) || [];
        setMembers(memberList);

        const userIds = memberList
          .map(m => m.user_id)
          .filter(id => id && id !== '00000000-0000-0000-0000-000000000000');
        const profileMap = new Map<string, string>();
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('*')
            .in('id', userIds);
          if (profilesData) {
            for (const p of profilesData as any[]) {
              profileMap.set(p.id, p.username);
            }
          }
        }
        setMemberUsernames(profileMap);

        const { data: sharedData, error: sharedErr } = await supabase
          .from('party_characters')
          .select('*')
          .eq('party_id', partyId);

        if (sharedErr) throw sharedErr;

        const sharedList = (sharedData as any[]) || [];
        const enrichedShared = await buildSharedEntries(sharedList, profileMap);
        setSharedChars(enrichedShared);
        setLiveVitalsMap(new Map());

        const { data: myChars } = await supabase
          .from('characters')
          .select('*')
          .eq('user_id', userId);

        const myCharList = (myChars as Character[]) || [];
        setUserCharacters(myCharList);

        const mine = new Set(sharedList.filter(s => s.user_id === userId).map(s => s.character_id));
        setSelectedCharIds(mine);
      } catch (err: any) {
        setError(err?.message || 'Failed to load party details.');
      } finally {
        if (showLoader) setLoading(false);
      }
    },
    [partyId, userId, buildSharedEntries]
  );

  const refreshSharedCharsOnly = useCallback(async () => {
    const { data: sharedData } = await supabase
      .from('party_characters')
      .select('*')
      .eq('party_id', partyId);
    if (!sharedData) return;
    const enriched = await buildSharedEntries(sharedData as any[], memberUsernames);
    setSharedChars(enriched);
    setLiveVitalsMap(new Map());
  }, [partyId, memberUsernames, buildSharedEntries]);

  useEffect(() => {
    loadPartyData(true);
  }, [loadPartyData]);

  useEffect(() => {
    return () => {
      if (resumeSyncTimerRef.current !== null) {
        window.clearTimeout(resumeSyncTimerRef.current);
      }
    };
  }, []);

  const consumeIncomingMessages = useCallback(() => {
    setIncomingChatMessages([]);
  }, []);

  const consumeDeletedMessages = useCallback(() => {
    setDeletedChatIds([]);
  }, []);

  // Pure Broadcast visibility-aware Realtime channel (avoids postgres_changes publication mismatch errors)
  const { broadcast } = useVisibilityRealtime({
    channelName: partyId ? `party-sync:${partyId}` : null,
    enabled: Boolean(partyId),
    broadcastHandlers: {
      'party:vitals': (payload: PartyVitalsSyncPayload) => {
        if (!payload?.character_id) return;
        setLiveVitalsMap(prev => {
          const next = new Map(prev);
          next.set(payload.character_id, payload);
          return next;
        });
        if (typeof payload.name === 'string') {
          setSharedChars(prev =>
            prev.map(entry =>
              entry.character_id === payload.character_id
                ? {
                    ...entry,
                    character: { ...entry.character, name: payload.name! },
                  }
                : entry
            )
          );
        }
      },
      'party:calendar': (payload) => {
        if (!payload?.calendar_date) return;
        const nextDate = normalizeCalendarDate(payload.calendar_date);
        const prevSource = payload.previous_date || partyCalendarRef.current;
        setParty(prev => (prev ? { ...prev, calendar_date: nextDate } : prev));
        if (prevSource) {
          const prevDate = normalizeCalendarDate(prevSource);
          if (
            prevDate.day !== nextDate.day ||
            prevDate.monthIndex !== nextDate.monthIndex ||
            prevDate.year !== nextDate.year
          ) {
            setDateTransition({
              id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
              previousDate: prevDate,
              nextDate,
              partyName: partyNameRef.current,
            });
          }
        }
      },
      'party:meta': (payload) => {
        setParty(prev =>
          prev
            ? {
                ...prev,
                name: typeof payload?.name === 'string' ? payload.name : prev.name,
                description: typeof payload?.description === 'string' ? payload.description : prev.description,
              }
            : prev
        );
      },
      'party:chat': (payload: PartyMessage) => {
        if (payload?.id && payload?.party_id === partyId) {
          setIncomingChatMessages(prev => [...prev, payload]);
        }
      },
      'party:chat:delete': (payload: { id?: string }) => {
        if (!payload?.id) return;
        const deletedId = payload.id;
        setIncomingChatMessages(prev => prev.filter(m => m.id !== deletedId));
        setDeletedChatIds(prev => (prev.includes(deletedId) ? prev : [...prev, deletedId]));
      },
      'party:notify': (payload: PartyNotificationPayload) => {
        enqueueNotification(payload);
      },
      'party:roster': () => {
        loadPartyData(false);
      },
    },
    onBeforeHide: () => {
      if (resumeSyncTimerRef.current !== null) {
        window.clearTimeout(resumeSyncTimerRef.current);
        resumeSyncTimerRef.current = null;
      }
    },
    onResumeFromHidden: () => {
      loadPartyData(false);
      setChatRefreshSignal(n => n + 1);
      // Trailing check ensures any debounced sheet flush completed across tabs catches up cleanly
      if (resumeSyncTimerRef.current !== null) {
        window.clearTimeout(resumeSyncTimerRef.current);
      }
      resumeSyncTimerRef.current = window.setTimeout(() => {
        resumeSyncTimerRef.current = null;
        refreshSharedCharsOnly();
      }, 700);
    },
  });

  useEffect(() => {
    const anyModal = isInviteOpen || isShareOpen || isEditPartyOpen;
    if (!anyModal) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!inviting) setIsInviteOpen(false);
        if (!sharing) setIsShareOpen(false);
        if (!savingMeta) setIsEditPartyOpen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isInviteOpen, isShareOpen, isEditPartyOpen, inviting, sharing, savingMeta]);

  useEffect(() => {
    if (!isLeaderMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (leaderMenuRef.current && !leaderMenuRef.current.contains(e.target as Node)) {
        setIsLeaderMenuOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsLeaderMenuOpen(false);
    };
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isLeaderMenuOpen]);

  async function handleSendNotification(payload: PartyNotificationPayload) {
    // 1. Broadcast to targeted players currently viewing this party dashboard
    broadcast('party:notify', payload);

    // Display locally as well when leader targets themselves (broadcast.self is false)
    if (payload.targetUserIds.includes(userId)) {
      enqueueNotification(payload);
    }

    // 2. Also deliver directly to active character sheets belonging to this party
    const { data: freshRows } = await supabase
      .from('party_characters')
      .select('character_id')
      .eq('party_id', partyId);

    const uniqueCharIds = Array.from(
      new Set([
        ...sharedChars.map(s => s.character_id),
        ...((freshRows || []).map((r: any) => r.character_id)),
      ].filter(Boolean))
    );

    if (uniqueCharIds.length > 0) {
      await Promise.all(
        uniqueCharIds.map(charId =>
          sendEphemeralBroadcast(`char-sync:${charId}`, 'party:notify', payload)
        )
      );
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteInput.trim() || inviting) return;

    setInviting(true);
    setError(null);

    try {
      const queryVal = inviteInput.trim();
      let targetEmail = queryVal.toLowerCase();
      let targetUserId = '00000000-0000-0000-0000-000000000000';

      if (!queryVal.includes('@')) {
        const { data: profile, error: profErr } = await supabase
          .from('profiles')
          .select('*')
          .ilike('username', queryVal)
          .single();

        if (profErr || !profile) {
          throw new Error(`User with username "${queryVal}" not found.`);
        }
        targetEmail = profile.email;
        targetUserId = profile.id;
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .ilike('email', queryVal)
          .single();
        if (profile) {
          targetUserId = profile.id;
        }
      }

      const existing = members.find(m => m.email.toLowerCase() === targetEmail);
      if (existing) {
        throw new Error('This user is already invited or a member of the party.');
      }

      const { error: inviteErr } = await supabase.from('party_members').insert({
        party_id: partyId,
        user_id: targetUserId,
        email: targetEmail,
        status: 'pending',
      });

      if (inviteErr) throw inviteErr;

      setInviteInput('');
      setIsInviteOpen(false);
      await loadPartyData(false);
      broadcast('party:roster', { at: Date.now() });
    } catch (err: any) {
      setError(err?.message || 'Failed to send invite.');
    } finally {
      setInviting(false);
    }
  }

  async function handleSaveShares(e: React.FormEvent) {
    e.preventDefault();
    setSharing(true);
    setError(null);

    try {
      const { error: delErr } = await supabase
        .from('party_characters')
        .delete()
        .eq('party_id', partyId)
        .eq('user_id', userId);

      if (delErr) throw delErr;

      const inserts = Array.from(selectedCharIds).map(charId => {
        const c = userCharacters.find(item => item.id === charId);
        return {
          party_id: partyId,
          character_id: charId,
          user_id: userId,
          character_name: c?.name || 'Unnamed Character',
          character_data: c?.data || {},
        };
      });

      if (inserts.length > 0) {
        const { error: insErr } = await supabase
          .from('party_characters')
          .insert(inserts);

        if (insErr) throw insErr;
      }

      setIsShareOpen(false);
      await loadPartyData(false);
      broadcast('party:roster', { at: Date.now() });
    } catch (err: any) {
      setError(err?.message || 'Failed to update shared characters.');
    } finally {
      setSharing(false);
    }
  }

  async function handleSavePartyMeta(e: React.FormEvent) {
    e.preventDefault();
    if (!editName.trim() || savingMeta || !party) return;

    setSavingMeta(true);
    setError(null);

    const nextName = editName.trim();
    const nextDescription = editDescription.trim();

    const { error: updateErr } = await supabase
      .from('parties')
      .update({
        name: nextName,
        description: nextDescription,
      })
      .eq('id', partyId);

    setSavingMeta(false);

    if (updateErr) {
      setError(updateErr.message);
      return;
    }

    setParty(prev => (prev ? { ...prev, name: nextName, description: nextDescription } : prev));
    broadcast('party:meta', { name: nextName, description: nextDescription });
    setIsEditPartyOpen(false);
  }

  async function handleRemoveMember(memberId: string) {
    await supabase.from('party_members').delete().eq('id', memberId);
    await loadPartyData(false);
    broadcast('party:roster', { at: Date.now() });
  }

  async function handleDeleteParty() {
    const ok = await askConfirm({
      title: 'Delete Party',
      message: 'Are you sure you want to delete this party? All memberships and shared character links will be removed.',
      confirmLabel: 'Delete Party',
      tone: 'danger',
    });
    if (!ok) return;

    const { error: delPartyErr } = await supabase.from('parties').delete().eq('id', partyId);
    if (delPartyErr) {
      setError(delPartyErr.message);
      return;
    }
    onBack();
  }

  if (loading) {
    return (
      <div className="w-full p-12 text-center font-cinzel" style={{ color: 'var(--rev-text-muted)' }}>
        <p className="animate-pulse">Loading party...</p>
      </div>
    );
  }

  if (!party) {
    return (
      <div className="w-full p-8 text-center">
        <p className="text-red-400 mb-4">Party not found.</p>
        <button onClick={onBack} className="px-4 py-2 rev-btn-secondary font-bold text-sm">
          ← Back to Parties
        </button>
      </div>
    );
  }

  const isLeader = party.owner_id === userId;

  const ownedPartyChars = sharedChars.filter(s => s.user_id === userId);
  const giveTargets =
    ownedPartyChars.length > 0
      ? ownedPartyChars.map(s => ({ id: s.character_id, name: s.character?.name || 'Unnamed Character' }))
      : userCharacters.map(c => ({ id: c.id, name: c.name || 'Unnamed Character' }));

  const handleRespondGive = async (
    notif: PartyNotificationPayload,
    accepted: boolean,
    targetCharacterId?: string
  ) => {
    if (!accepted || !targetCharacterId) return;
    const amount = Math.max(1, Math.trunc(notif.grantAmount || 0));
    if (amount <= 0) return;

    const { data: liveChar, error: fetchErr } = await supabase
      .from('characters')
      .select('*')
      .eq('id', targetCharacterId)
      .single();

    if (fetchErr || !liveChar) {
      throw new Error(fetchErr?.message || 'Could not load target character.');
    }

    const baseData = safeVitalsData((liveChar as Character).data);
    let nextData: CharacterData;
    let deltaPatch: Partial<CharacterData>;

    if (notif.grantResource === 'xp') {
      const nextProgression = {
        ...baseData.progression,
        xp: (baseData.progression?.xp ?? 0) + amount,
      };
      nextData = { ...baseData, progression: nextProgression };
      nextData.progression = {
        ...nextProgression,
        spendableXp: getSpendableXp(nextData),
      };
      deltaPatch = { progression: nextData.progression };
    } else if (notif.grantResource === 'dp') {
      const nextTrackers = {
        ...baseData.trackers,
        dp: Math.max(0, (baseData.trackers?.dp ?? 0) + amount),
      };
      nextData = { ...baseData, trackers: nextTrackers };
      deltaPatch = { trackers: nextTrackers };
    } else {
      return;
    }

    const updatedAt = new Date().toISOString();
    const { error: updateErr } = await supabase
      .from('characters')
      .update({ data: nextData, updated_at: updatedAt })
      .eq('id', targetCharacterId);

    if (updateErr) {
      throw new Error(updateErr.message);
    }

    await supabase
      .from('party_characters')
      .update({
        character_name: liveChar.name,
        character_data: nextData,
      })
      .eq('character_id', targetCharacterId);

    setSharedChars(prev =>
      prev.map(entry =>
        entry.character_id === targetCharacterId
          ? { ...entry, character: { ...entry.character, data: nextData, updated_at: updatedAt } }
          : entry
      )
    );
    setUserCharacters(prev =>
      prev.map(c => (c.id === targetCharacterId ? { ...c, data: nextData, updated_at: updatedAt } : c))
    );

    if (notif.grantResource === 'dp') {
      const vitalsPayload: PartyVitalsSyncPayload = {
        character_id: targetCharacterId,
        name: liveChar.name,
        vigor: nextData.trackers.vigor,
        vigorMax: vigorMax(nextData),
        strain: nextData.trackers.strain,
        strainMax: strainMax(nextData),
        dp: nextData.trackers.dp,
        dpMax: dpMax(nextData),
        ap: nextData.trackers.ap ?? 0,
        apMax: apMax(nextData, getEntryByName),
        updated_at: updatedAt,
      };
      setLiveVitalsMap(prev => {
        const next = new Map(prev);
        next.set(targetCharacterId, vitalsPayload);
        return next;
      });
      broadcast('party:vitals', vitalsPayload);
    }

    sendEphemeralBroadcast(`char-sync:${targetCharacterId}`, 'sheet:patch', {
      senderId: `party-give-${userId}`,
      patch: deltaPatch,
    });
  };

  const handleRespondCrisis = async (
    _notif: PartyNotificationPayload,
    accepted: boolean,
    targetCharacterId?: string
  ) => {
    if (!accepted || !targetCharacterId) return;

    const { data: liveChar, error: fetchErr } = await supabase
      .from('characters')
      .select('*')
      .eq('id', targetCharacterId)
      .single();

    if (fetchErr || !liveChar) {
      throw new Error(fetchErr?.message || 'Could not load target character.');
    }

    const raw = liveChar as Character;
    setCrisisChar({
      ...raw,
      data: safeVitalsData(raw.data),
    });
  };

  const handleApplyCrisisPatch = async (updates: Partial<CharacterData>) => {
    if (!crisisChar) return;
    const nextData: CharacterData = {
      ...crisisChar.data,
      ...updates,
    };
    const updatedAt = new Date().toISOString();

    const { error: updateErr } = await supabase
      .from('characters')
      .update({ data: nextData, updated_at: updatedAt })
      .eq('id', crisisChar.id);

    if (updateErr) {
      setError(updateErr.message);
      return;
    }

    await supabase
      .from('party_characters')
      .update({
        character_name: crisisChar.name,
        character_data: nextData,
      })
      .eq('character_id', crisisChar.id);

    const updatedChar: Character = {
      ...crisisChar,
      data: nextData,
      updated_at: updatedAt,
    };
    setCrisisChar(updatedChar);
    setSharedChars(prev =>
      prev.map(entry =>
        entry.character_id === crisisChar.id
          ? { ...entry, character: { ...entry.character, data: nextData, updated_at: updatedAt } }
          : entry
      )
    );
    setUserCharacters(prev =>
      prev.map(c => (c.id === crisisChar.id ? { ...c, data: nextData, updated_at: updatedAt } : c))
    );

    if (updates.trackers) {
      const vitalsPayload: PartyVitalsSyncPayload = {
        character_id: crisisChar.id,
        name: crisisChar.name,
        vigor: nextData.trackers.vigor,
        vigorMax: vigorMax(nextData),
        strain: nextData.trackers.strain,
        strainMax: strainMax(nextData),
        dp: nextData.trackers.dp,
        dpMax: dpMax(nextData),
        ap: nextData.trackers.ap ?? 0,
        apMax: apMax(nextData, getEntryByName),
        updated_at: updatedAt,
      };
      setLiveVitalsMap(prev => {
        const next = new Map(prev);
        next.set(crisisChar.id, vitalsPayload);
        return next;
      });
      broadcast('party:vitals', vitalsPayload);
    }

    sendEphemeralBroadcast(`char-sync:${crisisChar.id}`, 'sheet:patch', {
      senderId: `party-crisis-${userId}`,
      patch: updates,
    });
  };

  return (
    <div className="w-full">
      {confirmDialog}

      <PartyNotificationPopup
        notification={notificationQueue[0] || null}
        queueCount={notificationQueue.length}
        giveTargets={giveTargets}
        onRespondGive={handleRespondGive}
        onRespondCrisis={handleRespondCrisis}
        onDismiss={(notifId) => {
          setNotificationQueue(prev => prev.filter(n => n.id !== notifId));
        }}
      />

      {crisisChar && (
        <CrisisModal
          char={crisisChar}
          patch={handleApplyCrisisPatch}
          onClose={() => setCrisisChar(null)}
        />
      )}

      <PartyDateTransitionPopup
        transition={dateTransition}
        onDismiss={() => setDateTransition(null)}
      />

      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center mb-6 border-b rev-divider pb-4 gap-4">
        <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-3 min-w-0 w-full">
          <button
            onClick={onBack}
            className="transition-colors text-xs sm:text-sm font-bold uppercase tracking-wider sm:mt-1.5 shrink-0"
            style={{ color: 'var(--rev-accent-text)' }}
          >
            ← Parties
          </button>
          <div className="hidden sm:block w-px h-6 mt-1 shrink-0" style={{ backgroundColor: 'var(--rev-border)' }}></div>
          <div className="min-w-0 w-full">
            <h2 className="text-2xl sm:text-3xl font-cinzel font-bold break-words" style={{ color: 'var(--rev-text-bright)' }}>
              {party.name}
            </h2>
            <p className="text-xs mt-0.5 whitespace-pre-wrap break-words" style={{ color: 'var(--rev-text-muted)' }}>
              {party.description?.trim() ? party.description : 'Party management and shared characters.'}
            </p>
            <PartyCalendar
              partyId={partyId}
              calendarDate={party.calendar_date}
              isLeader={isLeader}
              onDateChange={(nextDate: ReverieCalendarDate, prevDate: ReverieCalendarDate) => {
                setParty(prev => (prev ? { ...prev, calendar_date: nextDate } : prev));
                if (
                  prevDate.day !== nextDate.day ||
                  prevDate.monthIndex !== nextDate.monthIndex ||
                  prevDate.year !== nextDate.year
                ) {
                  setDateTransition({
                    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                    previousDate: prevDate,
                    nextDate,
                    partyName: party.name,
                  });
                }
              }}
              onBroadcastCalendar={(nextDate: ReverieCalendarDate, prevDate: ReverieCalendarDate) => {
                broadcast('party:calendar', { calendar_date: nextDate, previous_date: prevDate });
              }}
              onError={(msg) => setError(msg)}
            />
          </div>
        </div>

        {/* Grouped Header Actions: Primary Actions + Compact Leader Menu */}
        <div
          className={`w-full lg:w-auto shrink-0 gap-2 ${
            isLeader
              ? 'grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center'
              : 'flex flex-wrap items-center'
          }`}
        >
          <button
            onClick={() => setIsShareOpen(true)}
            className={`rev-btn-primary px-4 py-2 font-bold text-sm shadow-sm text-center ${
              isLeader ? 'col-span-2 sm:col-span-1' : 'w-full sm:w-auto'
            }`}
          >
            Share Characters
          </button>

          {isLeader && (
            <button
              type="button"
              onClick={() => setIsNotifyModalOpen(true)}
              className="rev-btn-secondary px-3 sm:px-3.5 py-2 font-bold text-xs sm:text-sm shadow-sm text-center whitespace-nowrap"
            >
              Notify Players
            </button>
          )}

          {isLeader && (
            <div className="relative" ref={leaderMenuRef}>
              <button
                type="button"
                onClick={() => setIsLeaderMenuOpen(prev => !prev)}
                aria-expanded={isLeaderMenuOpen}
                aria-haspopup="menu"
                className="w-full sm:w-auto justify-center rev-btn-secondary px-3 sm:px-3.5 py-2 font-bold text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 shadow-sm whitespace-nowrap"
              >
                <span>Leader Actions</span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-transform duration-150 ${isLeaderMenuOpen ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {isLeaderMenuOpen && (
                <div
                  role="menu"
                  className="sheet-modal absolute right-0 mt-2 w-52 z-[150] p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsLeaderMenuOpen(false);
                      setIsInviteOpen(true);
                    }}
                    className="w-full text-left px-3 py-2 text-sm font-bold rounded transition-colors hover:bg-white/5"
                    style={{ color: 'var(--rev-text)' }}
                  >
                    Invite Member
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsLeaderMenuOpen(false);
                      setEditName(party.name);
                      setEditDescription(party.description || '');
                      setIsEditPartyOpen(true);
                    }}
                    className="w-full text-left px-3 py-2 text-sm font-bold rounded transition-colors hover:bg-white/5"
                    style={{ color: 'var(--rev-text)' }}
                  >
                    Edit Party Details
                  </button>
                  <div className="my-1 border-t rev-divider-subtle" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsLeaderMenuOpen(false);
                      handleDeleteParty();
                    }}
                    className="w-full text-left px-3 py-2 text-sm font-bold rounded transition-colors text-red-400 hover:bg-red-950/40"
                  >
                    Delete Party
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="sheet-panel-red text-sm p-4 mb-6" style={{ color: 'var(--rev-accent-text)' }}>
          {error}
        </div>
      )}

      {/* Wide 12-Col Desktop Workspace: Roster (3) + Shared Characters (5) + Live Chat (4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* Members Column */}
        <div className="sheet-panel p-4 sm:p-5 flex flex-col gap-4 lg:col-span-4 xl:col-span-3 min-w-0">
          <h3 className="font-cinzel font-bold text-lg border-b rev-divider pb-2 tabular-nums" style={{ color: 'var(--rev-text)' }}>
            Party Roster ({members.length})
          </h3>
          <ul className="flex flex-col gap-2.5">
            {members.map(m => {
              const isOwner = m.user_id === party.owner_id;
              const username = memberUsernames.get(m.user_id) || m.email.split('@')[0];
              return (
                <li key={m.id} className="rev-inset flex justify-between items-center p-3 gap-2">
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-sm truncate" style={{ color: 'var(--rev-text-bright)' }}>
                      {username}
                    </span>
                    <span className="text-xs truncate" style={{ color: 'var(--rev-text-muted)' }}>
                      {m.email}
                    </span>
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] font-bold uppercase tracking-wider">
                      {isOwner && <span style={{ color: 'var(--rev-badge-warn)' }}>Leader</span>}
                      {isOwner && <span style={{ color: 'var(--rev-text-faint)' }}>·</span>}
                      <span style={{ color: m.status === 'accepted' ? 'var(--rev-badge-success)' : 'var(--rev-badge-warn)' }}>
                        {m.status}
                      </span>
                    </div>
                  </div>
                  {isLeader && !isOwner && (
                    <button
                      onClick={() => handleRemoveMember(m.id)}
                      className="text-xs font-bold text-red-400 hover:text-red-300 ml-2 shrink-0"
                      title="Remove member"
                    >
                      Remove
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Shared Characters Column */}
        <div className="sheet-panel p-4 sm:p-5 flex flex-col gap-4 lg:col-span-8 xl:col-span-5 min-w-0">
          <h3 className="font-cinzel font-bold text-lg border-b rev-divider pb-2 tabular-nums" style={{ color: 'var(--rev-text)' }}>
            Shared Party Characters ({sharedChars.length})
          </h3>

          {sharedChars.length === 0 ? (
            <p className="text-sm italic py-8 text-center" style={{ color: 'var(--rev-text-muted)' }}>
              No characters have been shared into this party yet. Click "Share Characters" to add yours.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-3">
              {sharedChars.map(s => {
                const c = s.character;
                if (!c) return null;
                const safeData = safeVitalsData(c.data);
                const identity = safeData.identity;
                const progression = safeData.progression;
                const classPath = [identity.className, identity.path].filter(Boolean).join(' · ');

                const liveVitals = liveVitalsMap.get(c.id);
                const vMax = liveVitals ? liveVitals.vigorMax : vigorMax(safeData);
                const vCur = liveVitals ? liveVitals.vigor : (safeData.trackers.vigor ?? 0);
                const sMax = liveVitals ? liveVitals.strainMax : strainMax(safeData);
                const sCur = liveVitals ? liveVitals.strain : (safeData.trackers.strain ?? 0);
                const dMax = liveVitals ? liveVitals.dpMax : dpMax(safeData);
                const dCur = liveVitals ? liveVitals.dp : (safeData.trackers.dp ?? 0);
                const aMax = liveVitals ? liveVitals.apMax : apMax(safeData, getEntryByName);
                const aCur = liveVitals ? liveVitals.ap : (safeData.trackers.ap ?? 0);
                const showAp = aMax > 0 || aCur > 0;

                const allowedList = Array.isArray(c.allowed_editors)
                  ? c.allowed_editors
                  : Array.isArray(safeData.allowedEditors)
                  ? safeData.allowedEditors
                  : [];
                const isCharOwner = c.user_id === userId;
                const canEdit = isCharOwner || allowedList.some(ed => ed.user_id === userId);
                const href = `?tab=parties&party=${encodeURIComponent(partyId)}&character=${encodeURIComponent(c.id)}`;

                return (
                  <a
                    key={s.id}
                    href={href}
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
                        return;
                      }
                      e.preventDefault();
                      onInspectCharacter(c);
                    }}
                    className="group rev-card p-4 flex flex-col justify-between gap-3 cursor-pointer shadow-sm hover:shadow no-underline text-inherit"
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <span
                          className="font-cinzel font-bold text-base truncate transition-colors"
                          style={{ color: 'var(--rev-text-bright)' }}
                        >
                          {liveVitals?.name || c.name || 'Unnamed Character'}
                        </span>
                        <span
                          className="text-[11px] font-bold uppercase tracking-wider shrink-0 tabular-nums"
                          style={{ color: 'var(--rev-accent-text)' }}
                        >
                          T{progression.tier} · L{progression.level}
                        </span>
                      </div>
                      {classPath && (
                        <span className="text-xs truncate" style={{ color: 'var(--rev-text-muted)' }}>
                          {classPath}
                        </span>
                      )}
                    </div>

                    {/* Compact Vitals Strip matching VitalsCard colors */}
                    <div
                      className={`grid gap-2 sm:gap-3 py-2 border-y rev-divider-subtle ${
                        showAp ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'
                      }`}
                    >
                      <CompactVitalMeter kind="vigor" label="VG" current={vCur} max={vMax} />
                      <CompactVitalMeter kind="strain" label="SN" current={sCur} max={sMax} />
                      <CompactVitalMeter kind="dp" label="DP" current={dCur} max={dMax} />
                      {showAp && (
                        <CompactVitalMeter kind="ap" label="AP" current={aCur} max={aMax} />
                      )}
                    </div>

                    <div className="flex flex-wrap justify-between items-center text-[11px] gap-x-2 gap-y-1" style={{ color: 'var(--rev-text-faint)' }}>
                      <span className="truncate min-w-0">
                        Player: <strong style={{ color: 'var(--rev-text-secondary)' }}>{s.username}</strong>
                        {canEdit && (
                          <span className="font-bold" style={{ color: 'var(--rev-badge-success)' }}>
                            {' · '}{isCharOwner ? 'Owner' : 'Editable'}
                          </span>
                        )}
                      </span>
                      <span
                        className="font-bold group-hover:translate-x-0.5 transition-transform shrink-0"
                        style={{ color: 'var(--rev-accent-text)' }}
                      >
                        {canEdit ? 'Open Sheet →' : 'Inspect Sheet →'}
                      </span>
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </div>

        {/* Party Chat Column */}
        <div className="lg:col-span-12 xl:col-span-4">
          <PartyChat
            partyId={partyId}
            userId={userId}
            username={userUsername}
            isLeader={isLeader}
            incomingMessages={incomingChatMessages}
            onConsumeIncomingMessages={consumeIncomingMessages}
            deletedMessageIds={deletedChatIds}
            onConsumeDeletedMessages={consumeDeletedMessages}
            refreshSignal={chatRefreshSignal}
            onBroadcastMessage={(msg) => broadcast('party:chat', msg)}
            onBroadcastDeleteMessage={(messageId) => broadcast('party:chat:delete', { id: messageId })}
          />
        </div>
      </div>

      {/* NOTIFY PLAYERS MODAL */}
      {isLeader && (
        <NotifyPlayersModal
          isOpen={isNotifyModalOpen}
          onClose={() => setIsNotifyModalOpen(false)}
          partyId={partyId}
          partyName={party.name}
          senderName={userUsername}
          leaderUserId={userId}
          members={members}
          memberUsernames={memberUsernames}
          onSendNotification={handleSendNotification}
        />
      )}

      {/* EDIT PARTY MODAL */}
      {isEditPartyOpen && (
        <div
          className="fixed inset-0 z-[200] rev-modal-backdrop backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !savingMeta && setIsEditPartyOpen(false)}
        >
          <div
            className="sheet-modal shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b rev-divider rev-inset-soft shrink-0">
              <h2 className="font-cinzel font-bold text-xl" style={{ color: 'var(--rev-text)' }}>
                Edit Party
              </h2>
              {!savingMeta && (
                <button
                  onClick={() => setIsEditPartyOpen(false)}
                  className="font-bold text-2xl leading-none px-2"
                  style={{ color: 'var(--rev-text-muted)' }}
                  aria-label="Close"
                >
                  ×
                </button>
              )}
            </div>

            <form onSubmit={handleSavePartyMeta} className="p-6 flex flex-col gap-5">
              <label className="flex flex-col text-sm font-bold" style={{ color: 'var(--rev-text-muted)' }}>
                Party Name
                <input
                  type="text"
                  required
                  className="rev-input p-3 mt-1 font-normal shadow-inner text-base"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={savingMeta}
                  autoFocus
                />
              </label>

              <label className="flex flex-col text-sm font-bold" style={{ color: 'var(--rev-text-muted)' }}>
                Description
                <textarea
                  rows={4}
                  className="rev-input p-3 mt-1 font-normal shadow-inner text-sm resize-y"
                  placeholder="Campaign notes or party description..."
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  disabled={savingMeta}
                />
              </label>

              <div className="flex gap-3 w-full mt-2">
                <button
                  type="button"
                  onClick={() => setIsEditPartyOpen(false)}
                  disabled={savingMeta}
                  className="flex-1 py-3 font-bold text-sm rev-btn-secondary disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!editName.trim() || savingMeta}
                  className={`flex-1 py-3 font-bold text-sm shadow-sm flex items-center justify-center ${
                    !editName.trim() || savingMeta
                      ? 'rev-btn-secondary opacity-40 cursor-not-allowed'
                      : 'rev-btn-primary'
                  }`}
                >
                  {savingMeta ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INVITE MODAL */}
      {isInviteOpen && (
        <div
          className="fixed inset-0 z-[200] rev-modal-backdrop backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !inviting && setIsInviteOpen(false)}
        >
          <div
            className="sheet-modal shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b rev-divider rev-inset-soft shrink-0">
              <h2 className="font-cinzel font-bold text-xl" style={{ color: 'var(--rev-text)' }}>
                Invite Member
              </h2>
              {!inviting && (
                <button
                  onClick={() => setIsInviteOpen(false)}
                  className="font-bold text-2xl leading-none px-2"
                  style={{ color: 'var(--rev-text-muted)' }}
                  aria-label="Close"
                >
                  ×
                </button>
              )}
            </div>

            <form onSubmit={handleInvite} className="p-6 flex flex-col gap-5">
              <label className="flex flex-col text-sm font-bold" style={{ color: 'var(--rev-text-muted)' }}>
                Username or Email Address
                <input
                  type="text"
                  required
                  className="rev-input p-3 mt-1 font-normal shadow-inner text-base"
                  placeholder="Username or email..."
                  value={inviteInput}
                  onChange={(e) => setInviteInput(e.target.value)}
                  disabled={inviting}
                  autoFocus
                />
              </label>

              <div className="flex gap-3 w-full mt-2">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  disabled={inviting}
                  className="flex-1 py-3 font-bold text-sm rev-btn-secondary disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!inviteInput.trim() || inviting}
                  className={`flex-1 py-3 font-bold text-sm shadow-sm flex items-center justify-center ${
                    !inviteInput.trim() || inviting
                      ? 'rev-btn-secondary opacity-40 cursor-not-allowed'
                      : 'rev-btn-primary'
                  }`}
                >
                  {inviting ? 'Inviting...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SHARE CHARACTERS MODAL */}
      {isShareOpen && (
        <div
          className="fixed inset-0 z-[200] rev-modal-backdrop backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !sharing && setIsShareOpen(false)}
        >
          <div
            className="sheet-modal shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 max-h-[85vh] max-h-[85dvh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b rev-divider rev-inset-soft shrink-0">
              <h2 className="font-cinzel font-bold text-xl" style={{ color: 'var(--rev-text)' }}>
                Share Your Characters
              </h2>
              {!sharing && (
                <button
                  onClick={() => setIsShareOpen(false)}
                  className="font-bold text-2xl leading-none px-2"
                  style={{ color: 'var(--rev-text-muted)' }}
                  aria-label="Close"
                >
                  ×
                </button>
              )}
            </div>

            <form onSubmit={handleSaveShares} className="p-5 sm:p-6 flex flex-col gap-5 flex-1 min-h-0 overflow-y-auto no-scrollbar">
              <p className="text-xs" style={{ color: 'var(--rev-text-muted)' }}>
                Select which of your characters to share with this party. Party members can inspect shared sheets, and users granted access in Sheet Settings can edit them.
              </p>

              {userCharacters.length === 0 ? (
                <p className="text-sm italic text-center py-6" style={{ color: 'var(--rev-text-faint)' }}>
                  You have no characters created yet.
                </p>
              ) : (
                <div className="flex flex-col gap-2 max-h-64 overflow-y-auto no-scrollbar pr-1">
                  {userCharacters.map(c => {
                    const isChecked = selectedCharIds.has(c.id);
                    const progression = c.data?.progression || { level: 0, tier: 0 };
                    return (
                      <label
                        key={c.id}
                        className="flex items-center justify-between p-3 border transition-colors cursor-pointer"
                        style={{
                          backgroundColor: isChecked ? 'var(--rev-accent-soft)' : 'var(--rev-surface-inset)',
                          borderColor: isChecked ? 'var(--rev-accent-border)' : 'var(--rev-border-subtle)',
                          borderRadius: 'var(--rev-radius-panel)',
                          color: isChecked ? 'var(--rev-text-bright)' : 'var(--rev-text-secondary)',
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const next = new Set(selectedCharIds);
                              if (e.target.checked) next.add(c.id);
                              else next.delete(c.id);
                              setSelectedCharIds(next);
                            }}
                            className="w-4 h-4 rounded cursor-pointer"
                            style={{ accentColor: 'var(--rev-accent)' }}
                          />
                          <span className="font-cinzel font-bold text-sm">{c.name || 'Unnamed Character'}</span>
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-wider tabular-nums" style={{ color: 'var(--rev-text-muted)' }}>
                          Tier {progression.tier} · Lvl {progression.level}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-3 w-full mt-2 pt-2 border-t rev-divider">
                <button
                  type="button"
                  onClick={() => setIsShareOpen(false)}
                  disabled={sharing}
                  className="flex-1 py-3 font-bold text-sm rev-btn-secondary disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sharing}
                  className="flex-1 py-3 font-bold text-sm rev-btn-primary shadow-sm flex items-center justify-center disabled:opacity-50"
                >
                  {sharing ? 'Saving...' : 'Save Shared Characters'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
