import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { Party, PartyMember } from './types';
import { DEFAULT_CALENDAR_DATE, formatReverieDate } from './reverieCalendar';
import { useBodyScrollLock } from './hooks/useBodyScrollLock';
import { useEscapeKey } from './hooks/useEscapeKey';

export type { Party, PartyMember };

export default function PartyDashboard({
  userId,
  userEmail,
  onSelectParty,
}: {
  userId: string;
  userEmail: string;
  onSelectParty: (partyId: string) => void;
}) {
  const [parties, setParties] = useState<Party[]>([]);
  const [memberships, setMemberships] = useState<PartyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newPartyName, setNewPartyName] = useState('');
  const [newPartyDescription, setNewPartyDescription] = useState('');
  const [creating, setCreating] = useState(false);

  useBodyScrollLock(isCreateOpen);

  async function loadParties() {
    setLoading(true);
    setError(null);

    try {
      const { data: memberRows, error: memberError } = await supabase
        .from('party_members')
        .select('*');

      if (memberError) throw memberError;
      const allMemberships = (memberRows as PartyMember[]) || [];
      setMemberships(allMemberships);

      const { data: partyRows, error: partyError } = await supabase
        .from('parties')
        .select('*')
        .order('created_at', { ascending: false });

      if (partyError) throw partyError;
      setParties((partyRows as Party[]) || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load parties. Ensure party tables are provisioned in Supabase.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadParties();
  }, [userId, userEmail]);

  useEscapeKey(isCreateOpen && !creating, () => setIsCreateOpen(false));

  async function handleCreateParty(e: React.FormEvent) {
    e.preventDefault();
    if (!newPartyName.trim() || creating) return;

    setCreating(true);
    setError(null);

    try {
      const { data: newParty, error: createError } = await supabase
        .from('parties')
        .insert({
          name: newPartyName.trim(),
          description: newPartyDescription.trim(),
          calendar_date: DEFAULT_CALENDAR_DATE,
          owner_id: userId,
        })
        .select('*')
        .single();

      if (createError) throw createError;

      if (newParty) {
        await supabase.from('party_members').insert({
          party_id: newParty.id,
          user_id: userId,
          email: userEmail.toLowerCase(),
          status: 'accepted',
        });
      }

      setNewPartyName('');
      setNewPartyDescription('');
      setIsCreateOpen(false);
      loadParties();
    } catch (err: any) {
      setError(err?.message || 'Failed to create party.');
    } finally {
      setCreating(false);
    }
  }

  async function handleRespondInvite(membershipId: string, status: 'accepted' | 'declined') {
    if (status === 'declined') {
      await supabase.from('party_members').delete().eq('id', membershipId);
    } else {
      await supabase.from('party_members')
        .update({ status: 'accepted', user_id: userId })
        .eq('id', membershipId);
    }
    loadParties();
  }

  const normalizedUserEmail = userEmail.toLowerCase();

  const pendingInvites = memberships.filter(
    m => (m.user_id === userId || m.email.toLowerCase() === normalizedUserEmail) && m.status === 'pending'
  );

  const myPartyIds = new Set([
    ...parties.filter(p => p.owner_id === userId).map(p => p.id),
    ...memberships.filter(
      m => (m.user_id === userId || m.email.toLowerCase() === normalizedUserEmail) && m.status === 'accepted'
    ).map(m => m.party_id),
  ]);

  const activeParties = parties.filter(p => myPartyIds.has(p.id));

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b rev-divider pb-4 gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-spectral font-bold" style={{ color: 'var(--rev-text)' }}>
            Parties
          </h2>
          <p className="text-xs mt-0.5 tabular-nums" style={{ color: 'var(--rev-text-muted)' }}>
            {activeParties.length} active {activeParties.length === 1 ? 'party' : 'parties'}
            {pendingInvites.length > 0 ? ` · ${pendingInvites.length} pending invite${pendingInvites.length === 1 ? '' : 's'}` : ''}
          </p>
        </div>
        <button
          onClick={() => {
            setNewPartyName('');
            setNewPartyDescription('');
            setIsCreateOpen(true);
          }}
          className="rev-btn-primary w-full sm:w-auto justify-center px-5 py-2.5 font-bold shadow-sm flex items-center gap-2 shrink-0 text-sm"
        >
          <span>+ Create Party</span>
        </button>
      </div>

      {error && (
        <div className="sheet-panel-red text-sm p-4 mb-6 flex flex-col gap-3" style={{ color: 'var(--rev-accent-text)' }}>
          <span>Party system error: {error}</span>
          <button
            onClick={loadParties}
            className="self-start px-3 py-1.5 rev-btn-primary text-xs font-bold"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--rev-badge-warn)' }}>
            Pending Party Invitations
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {pendingInvites.map(inv => {
              const party = parties.find(p => p.id === inv.party_id);
              return (
                <div key={inv.id} className="sheet-panel p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-lg truncate" style={{ color: 'var(--rev-text)' }}>
                      {party?.name || 'Unknown Party'}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--rev-text-muted)' }}>
                      You have been invited to join this party.
                    </span>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                    <button
                      onClick={() => handleRespondInvite(inv.id, 'accepted')}
                      className="flex-1 sm:flex-initial px-3 py-2 sm:py-1.5 bg-green-950/80 hover:bg-green-900 border border-green-800 text-green-200 text-xs font-bold rounded-lg transition-colors"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleRespondInvite(inv.id, 'declined')}
                      className="flex-1 sm:flex-initial px-3 py-2 sm:py-1.5 bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-200 text-xs font-bold rounded-lg transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Parties Wide Grid */}
      {loading ? (
        <div className="sheet-panel p-12 text-center" style={{ color: 'var(--rev-text-muted)' }}>
          <p className="animate-pulse">Loading parties...</p>
        </div>
      ) : activeParties.length === 0 && !error ? (
        <div className="sheet-panel p-12 text-center flex flex-col items-center justify-center gap-3">
          <p className="italic" style={{ color: 'var(--rev-text-muted)' }}>
            You are not a member of any active parties yet.
          </p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="mt-2 text-xs font-bold uppercase tracking-wider underline underline-offset-4"
            style={{ color: 'var(--rev-accent-text)' }}
          >
            Create your first party
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {activeParties.map(p => {
            const isOwner = p.owner_id === userId;
            const dateLabel = p.calendar_date ? formatReverieDate(p.calendar_date) : null;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectParty(p.id)}
                className="group sheet-panel p-4 sm:p-5 flex flex-col justify-between gap-4 text-left transition-all hover:shadow-md cursor-pointer"
                style={{ borderColor: 'var(--rev-border)' }}
              >
                <div className="flex flex-col gap-1.5 min-w-0 w-full">
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className="font-bold text-lg truncate transition-colors"
                      style={{ color: 'var(--rev-text-bright)' }}
                    >
                      {p.name}
                    </span>
                    {isOwner && (
                      <span
                        className="text-[11px] font-bold uppercase tracking-wider shrink-0 mt-0.5"
                        style={{ color: 'var(--rev-badge-warn)' }}
                      >
                        Leader
                      </span>
                    )}
                  </div>
                  <p className="text-xs line-clamp-2 min-h-[1.25rem] sm:min-h-[2rem]" style={{ color: 'var(--rev-text-muted)' }}>
                    {p.description?.trim() ? p.description : 'Party workspace and shared characters.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 pt-3 border-t rev-divider-subtle w-full text-xs tabular-nums">
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 min-w-0" style={{ color: 'var(--rev-text-faint)' }}>
                    {dateLabel && (
                      <>
                        <span style={{ color: 'var(--rev-text-secondary)' }}>{dateLabel}</span>
                        <span>·</span>
                      </>
                    )}
                    <span className="shrink-0">Created {new Date(p.created_at).toLocaleDateString()}</span>
                  </div>
                  <span
                    className="text-xs font-bold uppercase tracking-wider group-hover:translate-x-0.5 transition-transform shrink-0"
                    style={{ color: 'var(--rev-accent-text)' }}
                  >
                    Open →
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* CREATE PARTY MODAL */}
      {isCreateOpen && (
        <div
          className="fixed inset-0 z-[200] rev-modal-backdrop backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !creating && setIsCreateOpen(false)}
        >
          <div
            className="sheet-modal shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b rev-divider rev-inset-soft shrink-0">
              <h2 className="font-bold text-xl" style={{ color: 'var(--rev-text)' }}>
                Create Party
              </h2>
              {!creating && (
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="font-bold text-2xl leading-none px-2 py-0.5 rounded hover:bg-white/10 hover:text-white transition-colors"
                  style={{ color: 'var(--rev-text-muted)' }}
                  aria-label="Close"
                >
                  ×
                </button>
              )}
            </div>

            <form onSubmit={handleCreateParty} className="p-6 flex flex-col gap-5">
              <label className="flex flex-col text-sm font-bold" style={{ color: 'var(--rev-text-muted)' }}>
                Party Name
                <input
                  type="text"
                  required
                  className="rev-input p-3 mt-1 font-normal shadow-inner text-base"
                  placeholder="Party name..."
                  value={newPartyName}
                  onChange={(e) => setNewPartyName(e.target.value)}
                  disabled={creating}
                  autoFocus
                />
              </label>

              <label className="flex flex-col text-sm font-bold" style={{ color: 'var(--rev-text-muted)' }}>
                Description (optional)
                <textarea
                  rows={3}
                  className="rev-input p-3 mt-1 font-normal shadow-inner text-sm resize-y"
                  placeholder="Campaign notes or party description..."
                  value={newPartyDescription}
                  onChange={(e) => setNewPartyDescription(e.target.value)}
                  disabled={creating}
                />
              </label>

              <div className="flex gap-3 w-full mt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={creating}
                  className="flex-1 py-3 font-bold text-sm rev-btn-secondary disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newPartyName.trim() || creating}
                  className={`flex-1 py-3 font-bold text-sm shadow-sm flex items-center justify-center ${
                    !newPartyName.trim() || creating
                      ? 'rev-btn-secondary opacity-40 cursor-not-allowed'
                      : 'rev-btn-primary'
                  }`}
                >
                  {creating ? 'Creating...' : 'Create Party'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
