import { supabase } from '../supabase';
import { sendEphemeralBroadcast } from '../hooks/useVisibilityRealtime';
import { safeCharacterData, saveAndMirrorCharacter } from './characterSync';
import type {
  AllowedEditor,
  Character,
  CharacterData,
  InventoryItem,
  PartyMessage,
  PartyNotificationPayload,
} from '../types';

export const ITEM_TRANSFER_PREFIX = '::REVERIE_TRANSFER::';
export const ITEM_TRANSFER_ACK_PREFIX = '::REVERIE_TRANSFER_ACK::';

export type PartyTransferOffer = {
  offerId: string;
  partyId: string;
  partyName: string;
  fromCharId: string;
  fromCharName: string;
  fromUserId: string;
  toCharId: string;
  toCharName: string;
  toUserId: string;
  item: InventoryItem;
  createdAt: string;
};

export type PartyTransferAck = {
  offerId: string;
  action: 'claimed' | 'returned' | 'reclaimed';
  actorUserId: string;
  actorName: string;
  createdAt: string;
};

export type PartyTransferTarget = {
  partyId: string;
  partyName: string;
  characterId: string;
  characterName: string;
  ownerUserId: string;
  ownerUsername: string;
  canDirectEdit: boolean;
};

export function serializeItemTransferOffer(offer: PartyTransferOffer): string {
  return `${ITEM_TRANSFER_PREFIX}${JSON.stringify(offer)}`;
}

export function isItemTransferOfferContent(content: string): boolean {
  return typeof content === 'string' && content.startsWith(ITEM_TRANSFER_PREFIX);
}

export function parseItemTransferOffer(content: string): PartyTransferOffer | null {
  if (!isItemTransferOfferContent(content)) return null;
  try {
    const parsed = JSON.parse(content.slice(ITEM_TRANSFER_PREFIX.length));
    if (!parsed || typeof parsed !== 'object' || !parsed.offerId || !parsed.item) return null;
    return parsed as PartyTransferOffer;
  } catch {
    return null;
  }
}

export function serializeItemTransferAck(ack: PartyTransferAck): string {
  return `${ITEM_TRANSFER_ACK_PREFIX}${JSON.stringify(ack)}`;
}

export function isItemTransferAckContent(content: string): boolean {
  return typeof content === 'string' && content.startsWith(ITEM_TRANSFER_ACK_PREFIX);
}

export function parseItemTransferAck(content: string): PartyTransferAck | null {
  if (!isItemTransferAckContent(content)) return null;
  try {
    const parsed = JSON.parse(content.slice(ITEM_TRANSFER_ACK_PREFIX.length));
    if (!parsed || typeof parsed !== 'object' || !parsed.offerId || !parsed.action) return null;
    return parsed as PartyTransferAck;
  } catch {
    return null;
  }
}

export function getItemDisplayLabel(item: Pick<InventoryItem, 'name' | 'customName'>): string {
  return item.customName?.trim() ? item.customName.trim() : item.name;
}

function isSameItemMetadata(a: InventoryItem, b: InventoryItem): boolean {
  return (
    a.name === b.name &&
    (a.customName || '') === (b.customName || '') &&
    (a.category || '') === (b.category || '') &&
    (a.subtype || '') === (b.subtype || '') &&
    (a.burden ?? null) === (b.burden ?? null) &&
    (a.value ?? null) === (b.value ?? null) &&
    (a.ap ?? null) === (b.ap ?? null) &&
    (a.resists || '') === (b.resists || '') &&
    (a.req || '') === (b.req || '') &&
    (a.dmg || '') === (b.dmg || '') &&
    (a.range || '') === (b.range || '') &&
    (a.ammo || '') === (b.ammo || '') &&
    (a.effect || '') === (b.effect || '') &&
    (a.description || '') === (b.description || '') &&
    (a.season || '') === (b.season || '') &&
    (a.ability_access || '') === (b.ability_access || '') &&
    (a.location || '') === (b.location || '')
  );
}

export function addTransferredItemToData(
  data: CharacterData,
  transferredItem: InventoryItem
): { patch: Partial<CharacterData>; nextData: CharacterData } {
  const safe = safeCharacterData(data);
  const qtyToAdd = Math.max(1, Math.trunc(transferredItem.qty || 1));
  const incomingClean: InventoryItem = {
    ...transferredItem,
    id: crypto.randomUUID(),
    qty: qtyToAdd,
  };

  let nextItems: InventoryItem[];
  const stackTarget = !incomingClean.customName
    ? safe.items.find((existing) => !existing.customName && isSameItemMetadata(existing, incomingClean))
    : undefined;

  if (stackTarget) {
    nextItems = safe.items.map((existing) =>
      existing.id === stackTarget.id
        ? { ...existing, qty: Math.max(0, existing.qty || 0) + qtyToAdd }
        : existing
    );
  } else {
    nextItems = [...safe.items, incomingClean];
  }

  const nextData: CharacterData = { ...safe, items: nextItems };
  return { patch: { items: nextItems }, nextData };
}

export function isItemEquipped(data: CharacterData, itemId: string): boolean {
  const eq = data.equipment;
  if (!eq || !itemId) return false;
  return (
    eq.mainHand === itemId ||
    eq.offHand === itemId ||
    eq.armour === itemId ||
    (Array.isArray(eq.extra) && eq.extra.includes(itemId))
  );
}

export function deductTransferredItemFromData(
  data: CharacterData,
  source: 'items' | 'possessions' | { slot: 'mainHand' | 'offHand' | 'armour' | 'extra'; extraIndex?: number },
  itemId: string,
  requestedQty: number
): {
  patch: Partial<CharacterData>;
  nextData: CharacterData;
  transferredItem: InventoryItem;
} | null {
  const safe = safeCharacterData(data);

  if (typeof source === 'object') {
    const eq = {
      ...safe.equipment,
      extra: [...(safe.equipment.extra || [])],
    };
    let equippedId = '';
    if (source.slot === 'extra' && typeof source.extraIndex === 'number') {
      equippedId = eq.extra[source.extraIndex] || '';
      if (!equippedId || equippedId !== itemId) return null;
      eq.extra[source.extraIndex] = '';
    } else if (source.slot === 'mainHand' || source.slot === 'offHand' || source.slot === 'armour') {
      equippedId = eq[source.slot] || '';
      if (!equippedId || equippedId !== itemId) return null;
      eq[source.slot] = '';
      if (source.slot === 'mainHand') {
        eq.mainHandMode = '';
      }
    } else {
      return null;
    }

    const backpackRow = safe.items.find((i) => i.id === equippedId);
    if (!backpackRow) return null;

    const stillEquippedElsewhere =
      eq.mainHand === equippedId ||
      eq.offHand === equippedId ||
      eq.armour === equippedId ||
      eq.extra.includes(equippedId);

    const nextItems =
      (backpackRow.qty || 0) <= 0 && !stillEquippedElsewhere
        ? safe.items.filter((i) => i.id !== equippedId)
        : safe.items;

    const transferredItem: InventoryItem = {
      ...backpackRow,
      id: crypto.randomUUID(),
      qty: 1,
    };

    const nextData: CharacterData = {
      ...safe,
      items: nextItems,
      equipment: eq,
    };
    return {
      patch: { items: nextItems, equipment: eq },
      nextData,
      transferredItem,
    };
  }

  const list = source === 'items' ? safe.items : safe.possessions;
  const item = list.find((i) => i.id === itemId);
  if (!item || (item.qty || 0) <= 0) return null;

  const qty = Math.min(item.qty, Math.max(1, Math.trunc(requestedQty || 1)));
  const remaining = item.qty - qty;
  const equipped = source === 'items' && isItemEquipped(safe, itemId);

  const nextList = list
    .map((i) => (i.id === itemId ? { ...i, qty: remaining } : i))
    .filter((i) => (source === 'items' && equipped ? true : i.qty > 0));

  const transferredItem: InventoryItem = {
    ...item,
    id: crypto.randomUUID(),
    qty,
  };

  const patch: Partial<CharacterData> =
    source === 'items' ? { items: nextList } : { possessions: nextList };
  const nextData: CharacterData = {
    ...safe,
    ...patch,
  };

  return { patch, nextData, transferredItem };
}

export async function loadPartyTransferTargets(
  senderCharId: string,
  currentUserId?: string
): Promise<PartyTransferTarget[]> {
  if (!senderCharId) return [];

  const { data: myMembershipRows, error: myErr } = await supabase
    .from('party_characters')
    .select('party_id')
    .eq('character_id', senderCharId);

  if (myErr || !myMembershipRows || myMembershipRows.length === 0) {
    return [];
  }

  const partyIds = Array.from(
    new Set((myMembershipRows as any[]).map((r) => r.party_id).filter(Boolean))
  );
  if (partyIds.length === 0) return [];

  const [partiesRes, membersRes] = await Promise.all([
    supabase.from('parties').select('id, name').in('id', partyIds),
    supabase.from('party_characters').select('*').in('party_id', partyIds),
  ]);

  const partyNameMap = new Map<string, string>();
  if (partiesRes.data) {
    for (const p of partiesRes.data as any[]) {
      partyNameMap.set(p.id, p.name || 'Party');
    }
  }

  const sharedRows = ((membersRes.data as any[]) || []).filter(
    (r) => r.character_id && r.character_id !== senderCharId
  );
  if (sharedRows.length === 0) return [];

  const targetCharIds = Array.from(new Set(sharedRows.map((r) => r.character_id)));
  const targetUserIds = Array.from(new Set(sharedRows.map((r) => r.user_id).filter(Boolean)));

  const [liveCharsRes, profilesRes] = await Promise.all([
    supabase
      .from('characters')
      .select('id, user_id, name, allowed_editors, data')
      .in('id', targetCharIds),
    targetUserIds.length > 0
      ? supabase.from('profiles').select('id, username').in('id', targetUserIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const liveCharMap = new Map<string, any>();
  if (liveCharsRes.data) {
    for (const c of liveCharsRes.data as any[]) {
      liveCharMap.set(c.id, c);
    }
  }

  const profileMap = new Map<string, string>();
  if (profilesRes.data) {
    for (const pr of profilesRes.data as any[]) {
      profileMap.set(pr.id, pr.username || '');
    }
  }

  const results: PartyTransferTarget[] = [];
  const seen = new Set<string>();

  for (const row of sharedRows) {
    const key = `${row.party_id}:${row.character_id}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const live = liveCharMap.get(row.character_id);
    const ownerUserId: string = live?.user_id || row.user_id || '';
    const editors: AllowedEditor[] = Array.isArray(live?.allowed_editors)
      ? live.allowed_editors
      : Array.isArray(live?.data?.allowedEditors)
      ? live.data.allowedEditors
      : Array.isArray(row.character_data?.allowedEditors)
      ? row.character_data.allowedEditors
      : [];

    const canDirectEdit = Boolean(
      currentUserId &&
        live &&
        (ownerUserId === currentUserId || editors.some((ed) => ed.user_id === currentUserId))
    );

    results.push({
      partyId: row.party_id,
      partyName: partyNameMap.get(row.party_id) || 'Party',
      characterId: row.character_id,
      characterName: live?.name || row.character_name || 'Unnamed Character',
      ownerUserId,
      ownerUsername: profileMap.get(ownerUserId) || 'Player',
      canDirectEdit,
    });
  }

  results.sort((a, b) => {
    if (a.canDirectEdit !== b.canDirectEdit) return a.canDirectEdit ? -1 : 1;
    const partyCmp = a.partyName.localeCompare(b.partyName);
    if (partyCmp !== 0) return partyCmp;
    return a.characterName.localeCompare(b.characterName);
  });

  return results;
}

export async function deliverTransferredItemToEditableCharacter(params: {
  targetCharacterId: string;
  transferredItem: InventoryItem;
  actorUserId: string;
}): Promise<{ ok: boolean; error?: string; targetChar?: Character }> {
  const { targetCharacterId, transferredItem, actorUserId } = params;
  const { data: liveChar, error: fetchErr } = await supabase
    .from('characters')
    .select('*')
    .eq('id', targetCharacterId)
    .single();

  if (fetchErr || !liveChar) {
    return { ok: false, error: fetchErr?.message || 'Could not load recipient character.' };
  }

  const charRow = liveChar as Character;
  const { patch, nextData } = addTransferredItemToData(charRow.data, transferredItem);

  const { error: saveErr, updatedAt } = await saveAndMirrorCharacter({
    characterId: charRow.id,
    name: charRow.name,
    data: nextData,
  });

  if (saveErr) {
    return { ok: false, error: saveErr.message };
  }

  sendEphemeralBroadcast(`char-sync:${charRow.id}`, 'sheet:patch', {
    senderId: `item-transfer-${actorUserId}`,
    patch,
  });

  return {
    ok: true,
    targetChar: {
      ...charRow,
      data: nextData,
      updated_at: updatedAt,
    },
  };
}

export async function dispatchPartyItemTransferOffer(params: {
  target: PartyTransferTarget;
  senderChar: Character;
  senderUserId: string;
  senderUsername: string;
  transferredItem: InventoryItem;
}): Promise<{ ok: boolean; error?: string; offer?: PartyTransferOffer }> {
  const { target, senderChar, senderUserId, senderUsername, transferredItem } = params;
  const offerId = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  const offer: PartyTransferOffer = {
    offerId,
    partyId: target.partyId,
    partyName: target.partyName,
    fromCharId: senderChar.id,
    fromCharName: senderChar.name || 'Unnamed Character',
    fromUserId: senderUserId,
    toCharId: target.characterId,
    toCharName: target.characterName,
    toUserId: target.ownerUserId,
    item: transferredItem,
    createdAt,
  };

  const msg: PartyMessage = {
    id: crypto.randomUUID(),
    party_id: target.partyId,
    user_id: senderUserId,
    username: senderUsername || offer.fromCharName,
    content: serializeItemTransferOffer(offer),
    created_at: createdAt,
  };

  const { error: msgErr } = await supabase.from('party_messages').insert(msg);
  if (msgErr) {
    return { ok: false, error: msgErr.message };
  }

  sendEphemeralBroadcast(`party-sync:${target.partyId}`, 'party:chat', msg);

  const itemLabel = getItemDisplayLabel(transferredItem);
  const notif: PartyNotificationPayload = {
    id: `transfer-${offerId}`,
    partyId: target.partyId,
    partyName: target.partyName,
    senderName: `${offer.fromCharName} (${senderUsername || 'Player'})`,
    targetUserIds: [target.ownerUserId],
    type: 'item_transfer',
    title: 'Item Transfer Offered',
    message: `${offer.fromCharName} wants to give ${transferredItem.qty}× ${itemLabel} to ${offer.toCharName}.`,
    itemTransfer: {
      offerId,
      partyId: target.partyId,
      partyName: target.partyName,
      fromCharId: offer.fromCharId,
      fromCharName: offer.fromCharName,
      fromUserId: offer.fromUserId,
      toCharId: offer.toCharId,
      toCharName: offer.toCharName,
      toUserId: offer.toUserId,
      item: transferredItem,
    },
    createdAt,
  };

  sendEphemeralBroadcast(`party-sync:${target.partyId}`, 'party:notify', notif);
  sendEphemeralBroadcast(`char-sync:${target.characterId}`, 'party:notify', notif);

  return { ok: true, offer };
}

export async function postPartyTransferAck(params: {
  partyId: string;
  offerId: string;
  action: 'claimed' | 'returned' | 'reclaimed';
  actorUserId: string;
  actorName: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { partyId, offerId, action, actorUserId, actorName } = params;
  const createdAt = new Date().toISOString();
  const ack: PartyTransferAck = {
    offerId,
    action,
    actorUserId,
    actorName,
    createdAt,
  };

  const msg: PartyMessage = {
    id: crypto.randomUUID(),
    party_id: partyId,
    user_id: actorUserId,
    username: actorName,
    content: serializeItemTransferAck(ack),
    created_at: createdAt,
  };

  const { error } = await supabase.from('party_messages').insert(msg);
  if (error) {
    return { ok: false, error: error.message };
  }

  sendEphemeralBroadcast(`party-sync:${partyId}`, 'party:chat', msg);
  return { ok: true };
}

export async function postPartyDirectTransferNotice(params: {
  partyId: string;
  senderUserId: string;
  senderUsername: string;
  fromCharName: string;
  toCharName: string;
  item: InventoryItem;
}): Promise<void> {
  const { partyId, senderUserId, senderUsername, fromCharName, toCharName, item } = params;
  const label = getItemDisplayLabel(item);
  const msg: PartyMessage = {
    id: crypto.randomUUID(),
    party_id: partyId,
    user_id: senderUserId,
    username: senderUsername || fromCharName,
    content: `${fromCharName} transferred ${item.qty}× ${label} to ${toCharName}.`,
    created_at: new Date().toISOString(),
  };
  await supabase.from('party_messages').insert(msg);
  sendEphemeralBroadcast(`party-sync:${partyId}`, 'party:chat', msg);
}

export async function executePartyTransferAction(params: {
  offer: {
    offerId: string;
    partyId: string;
    fromCharId: string;
    fromCharName: string;
    fromUserId: string;
    toCharId: string;
    toCharName: string;
    toUserId: string;
    item: InventoryItem;
  };
  action: 'claim' | 'return' | 'reclaim';
  actorUserId: string;
  actorUsername: string;
  getEntryByName?: (name: string) => any;
}): Promise<{ ok: boolean; error?: string; updatedChar?: Character }> {
  const { offer, action, actorUserId, actorUsername, getEntryByName } = params;

  const { data: existingMsgs } = await supabase
    .from('party_messages')
    .select('content')
    .eq('party_id', offer.partyId)
    .ilike('content', `%${offer.offerId}%`);

  const existingAcks: PartyTransferAck[] = [];
  if (existingMsgs) {
    for (const row of existingMsgs as Array<{ content: string }>) {
      const parsed = parseItemTransferAck(row.content);
      if (parsed && parsed.offerId === offer.offerId) {
        existingAcks.push(parsed);
      }
    }
  }

  if (action === 'claim' || action === 'return') {
    if (existingAcks.length > 0) {
      return { ok: false, error: 'This item transfer has already been resolved.' };
    }
  } else if (action === 'reclaim') {
    if (existingAcks.some((a) => a.action === 'claimed' || a.action === 'reclaimed')) {
      return { ok: false, error: 'This transfer has already been claimed or reclaimed.' };
    }
  }

  if (action === 'return') {
    const ackRes = await postPartyTransferAck({
      partyId: offer.partyId,
      offerId: offer.offerId,
      action: 'returned',
      actorUserId,
      actorName: actorUsername || offer.toCharName,
    });
    return ackRes.ok ? { ok: true } : { ok: false, error: ackRes.error || 'Could not return item.' };
  }

  const targetCharId = action === 'claim' ? offer.toCharId : offer.fromCharId;
  const delivery = await deliverTransferredItemToEditableCharacter({
    targetCharacterId: targetCharId,
    transferredItem: offer.item,
    actorUserId,
  });

  if (!delivery.ok) {
    return { ok: false, error: delivery.error || 'Could not add item to character Backpack.' };
  }

  const ackRes = await postPartyTransferAck({
    partyId: offer.partyId,
    offerId: offer.offerId,
    action: action === 'claim' ? 'claimed' : 'reclaimed',
    actorUserId,
    actorName: actorUsername || (action === 'claim' ? offer.toCharName : offer.fromCharName),
  });

  if (!ackRes.ok) {
    return { ok: false, error: ackRes.error || 'Item added, but failed to record transfer receipt.' };
  }

  if (delivery.targetChar && getEntryByName) {
    const { vigorMax, strainMax, dpMax, apMax } = await import('../calc');
    const td = delivery.targetChar.data;
    sendEphemeralBroadcast(`party-sync:${offer.partyId}`, 'party:vitals', {
      character_id: delivery.targetChar.id,
      name: delivery.targetChar.name,
      vigor: td.trackers.vigor,
      vigorMax: vigorMax(td),
      strain: td.trackers.strain,
      strainMax: strainMax(td),
      dp: td.trackers.dp,
      dpMax: dpMax(td),
      ap: td.trackers.ap ?? 0,
      apMax: apMax(td, getEntryByName),
      updated_at: delivery.targetChar.updated_at,
    });
  }

  return { ok: true, updatedChar: delivery.targetChar };
}
