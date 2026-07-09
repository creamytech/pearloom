'use client';

/* eslint-disable no-restricted-syntax */
/* GuestsPanel — in-editor guest list management. The audit found
   guests lived only at /dashboard/guest-review with the editor
   deep-linking out. This panel pulls them inline. Talks to
   /api/guests (already supports siteSlug for GET; POST gained
   siteSlug support in this round). */

import { useEffect, useState, useMemo } from 'react';
import { Icon } from '../../motifs';
import { FGroup, FInput, SectionPanelShell } from './_section-atoms';
import { pearErrorMessage } from '../../redesign/PearAssist';
import { getAppOrigin } from '@/lib/site-urls';
import { StateChip, rsvpStateKind } from '@/components/shell';

type GuestStatus = 'pending' | 'attending' | 'declined';
interface Guest {
  id: string;
  name: string;
  email?: string | null;
  status: GuestStatus;
  plusOne?: boolean;
  /** Present when the guest has a mailing address on file
   *  (GET /api/guests returns the full object or null). */
  mailingAddress?: { line1?: string | null } | null;
}

type FilterTab = 'all' | GuestStatus;

// Status renders through the shared shell <StateChip> (TASTE-PLAN
// T.1); only the labels are local to this panel's voice.
const STATUS_LABEL: Record<GuestStatus, string> = {
  pending: 'Pending', attending: 'Going', declined: 'Can’t make it',
};

export function GuestsPanel({ siteSlug }: { siteSlug: string }) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [searchTerm, setSearchTerm] = useState('');
  /* Composer state — single-row "Add guest" inline. */
  const [draftName, setDraftName] = useState('');
  const [draftEmail, setDraftEmail] = useState('');
  /* Paste-import state — opens a textarea panel for bulk add. */
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importPreview, setImportPreview] = useState<{ name: string; email?: string }[]>([]);
  /* Address-collection link — resolved after mount so the origin
     always matches the browser (dev / preview / prod). */
  const [addressUrl, setAddressUrl] = useState('');
  const [addressCopied, setAddressCopied] = useState(false);

  useEffect(() => {
    if (siteSlug) setAddressUrl(`${getAppOrigin()}/a/${siteSlug}`);
  }, [siteSlug]);

  useEffect(() => {
    if (!siteSlug) return;
    let cancelled = false;
    (async () => {
      setBusy(true); setErr(null);
      try {
        const res = await fetch(`/api/guests?siteSlug=${encodeURIComponent(siteSlug)}`, { cache: 'no-store' });
        if (!res.ok) {
          console.error('[guests] load failed:', res.status);
          throw new Error('Couldn’t load guests, try again?');
        }
        const data = await res.json() as { guests?: Guest[] };
        if (!cancelled) setGuests(data.guests ?? []);
      } catch (e) {
        if (!cancelled) setErr(pearErrorMessage(e, 'Couldn’t load guests, try again?'));
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => { cancelled = true; };
  }, [siteSlug]);

  /* Counts by status — used in tabs + the summary header. */
  const counts = useMemo(() => {
    const out = { all: guests.length, pending: 0, attending: 0, declined: 0 };
    for (const g of guests) out[g.status] = (out[g.status] ?? 0) + 1;
    return out;
  }, [guests]);

  /* How many guests already have a mailing address on file —
     feeds the address-collection card + the print-mail funnel. */
  const withAddress = useMemo(
    () => guests.filter((g) => !!g.mailingAddress?.line1).length,
    [guests],
  );

  async function copyAddressLink() {
    if (!addressUrl) return;
    try {
      await navigator.clipboard.writeText(addressUrl);
      setAddressCopied(true);
      setTimeout(() => setAddressCopied(false), 2000);
    } catch {
      /* Clipboard can be denied — the link stays selectable. */
    }
  }

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return guests.filter((g) => {
      if (filter !== 'all' && g.status !== filter) return false;
      if (!term) return true;
      return g.name.toLowerCase().includes(term) || (g.email ?? '').toLowerCase().includes(term);
    });
  }, [guests, filter, searchTerm]);

  async function addGuest(name: string, email?: string) {
    if (!name.trim()) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch('/api/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteSlug, name: name.trim(), email: email?.trim() || undefined }),
      });
      if (!res.ok) {
        console.error('[guests] add failed:', res.status);
        throw new Error('Couldn’t add the guest, try again?');
      }
      const data = await res.json() as { guest?: Guest };
      if (data.guest) setGuests((prev) => [...prev, data.guest!]);
    } catch (e) {
      setErr(pearErrorMessage(e, 'Couldn’t add the guest, try again?'));
    } finally {
      setBusy(false);
    }
  }

  async function deleteGuest(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/guests?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) {
        console.error('[guests] delete failed:', res.status);
        throw new Error('Couldn’t remove the guest, try again?');
      }
      setGuests((prev) => prev.filter((g) => g.id !== id));
    } catch (e) {
      setErr(pearErrorMessage(e, 'Couldn’t remove the guest, try again?'));
    } finally {
      setBusy(false);
    }
  }

  /* Parse a free-text paste — one guest per line. Accepts:
       "Jane Doe"
       "Jane Doe, jane@example.com"
       "Jane Doe <jane@example.com>"
       "jane@example.com" (just an email — name derived from local-part) */
  function parseImport(text: string): { name: string; email?: string }[] {
    return text.split(/\r?\n/).map((raw) => raw.trim()).filter(Boolean).map((line) => {
      const angle = /^(.+?)\s*<([^>]+)>\s*$/.exec(line);
      if (angle) return { name: angle[1].trim(), email: angle[2].trim() };
      const comma = line.split(/[,\t]/).map((p) => p.trim());
      if (comma.length >= 2) return { name: comma[0], email: comma[1] || undefined };
      if (line.includes('@')) {
        const local = line.split('@')[0];
        return { name: local.replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), email: line };
      }
      return { name: line };
    });
  }

  function previewImport(next: string) {
    setImportText(next);
    setImportPreview(parseImport(next));
  }

  async function runImport() {
    if (importPreview.length === 0) return;
    setBusy(true); setErr(null);
    try {
      /* Sequential — keeps the count UI honest and avoids a 25× burst. */
      for (const entry of importPreview) {
        const res = await fetch('/api/guests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ siteSlug, name: entry.name, email: entry.email }),
        });
        if (res.ok) {
          const data = await res.json() as { guest?: Guest };
          if (data.guest) setGuests((prev) => [...prev, data.guest!]);
        }
      }
      setImportOpen(false);
      setImportText('');
      setImportPreview([]);
    } catch (e) {
      setErr(pearErrorMessage(e, 'Some guests didn’t import, try again?'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Summary header */}
        <div style={{
          display: 'flex', alignItems: 'baseline', gap: 10,
          padding: '8px 0',
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--ink)', lineHeight: 1 }}>
            {counts.all}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
            {counts.all === 1 ? 'guest' : 'guests'} on the list
          </div>
        </div>

        {/* Collect mailing addresses — the /a/ link feeds the
            print-mail funnel (save-the-dates, invitations). */}
        <div
          style={{
            display: 'flex', flexDirection: 'column', gap: 8,
            padding: '12px 13px', borderRadius: 12,
            background: 'var(--card)', border: '1px solid var(--line)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>
              Collect mailing addresses
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-muted)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
              {withAddress} of {counts.all} {counts.all === 1 ? 'guest has' : 'guests have'} a mailing address
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              readOnly
              value={addressUrl}
              onFocus={(e) => e.currentTarget.select()}
              aria-label="Address collection link"
              style={{
                flex: 1, minWidth: 0,
                padding: '8px 10px', borderRadius: 8,
                border: '1px solid var(--line)', background: 'var(--cream-2)',
                fontSize: 11.5, color: 'var(--ink-soft)',
                fontFamily: 'var(--font-ui)', outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={copyAddressLink}
              disabled={!addressUrl}
              style={{
                padding: '8px 13px', borderRadius: 8,
                background: addressCopied ? 'var(--sage-bg)' : 'var(--cream-2)',
                color: addressCopied ? 'var(--sage-deep)' : 'var(--ink-soft)',
                border: '1px solid var(--line)',
                fontSize: 11.5, fontWeight: 700, cursor: addressUrl ? 'pointer' : 'default',
                display: 'inline-flex', alignItems: 'center', gap: 5,
                whiteSpace: 'nowrap',
                transition: 'background 120ms, color 120ms',
              }}
            >
              <Icon name="copy" size={11} color="currentColor" />
              {addressCopied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-muted)', lineHeight: 1.4 }}>
            Guests fill in their own, they land right here.
          </div>
        </div>

        {/* Status filter tabs */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {([
            { id: 'all', label: 'All', n: counts.all },
            { id: 'attending', label: 'Going', n: counts.attending },
            { id: 'pending', label: 'Pending', n: counts.pending },
            { id: 'declined', label: 'Can’t', n: counts.declined },
          ] as Array<{ id: FilterTab; label: string; n: number }>).map((tab) => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                style={{
                  padding: '5px 11px', borderRadius: 999,
                  background: active ? 'var(--peach-bg)' : 'var(--cream-2)',
                  color: active ? 'var(--peach-ink)' : 'var(--ink-soft)',
                  border: active ? '1px solid var(--peach-ink)' : '1px solid var(--line)',
                  fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  transition: 'background 120ms, color 120ms, border-color 120ms',
                }}
              >
                {tab.label}
                <span style={{ fontSize: 10, opacity: 0.7, fontVariantNumeric: 'tabular-nums' }}>{tab.n}</span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        {guests.length > 6 && (
          <FInput value={searchTerm} onChange={setSearchTerm} icon="search" placeholder="Search by name or email" />
        )}

        {/* List */}
        <FGroup label="Guests" hint={busy ? 'Loading…' : err ? undefined : (filtered.length ? undefined : 'No guests yet, add the first one below.')}>
          {err && (
            <div style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(122,45,45,0.08)', color: '#7A2D2D', fontSize: 11.5, marginBottom: 6 }}>
              {err}
            </div>
          )}
          {filtered.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 360, overflowY: 'auto' }}>
              {filtered.map((g) => {
                return (
                  <div
                    key={g.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 10px', borderRadius: 10,
                      background: 'var(--card)', border: '1px solid var(--line)',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {g.name}{g.plusOne && <span style={{ fontWeight: 500, color: 'var(--ink-muted)' }}> +1</span>}
                      </div>
                      {g.email && (
                        <div style={{ fontSize: 11, color: 'var(--ink-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.email}</div>
                      )}
                    </div>
                    <StateChip size="sm" kind={rsvpStateKind(g.status)}>{STATUS_LABEL[g.status]}</StateChip>
                    <button
                      type="button"
                      onClick={() => deleteGuest(g.id)}
                      aria-label={`Remove ${g.name}`}
                      style={{ width: 22, height: 22, borderRadius: 6, display: 'grid', placeItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink-muted)' }}
                    >
                      <Icon name="close" size={11} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </FGroup>

        {/* Add inline */}
        <FGroup label="Add a guest" hint="Just a name is fine. Email lets you send invites later.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <FInput value={draftName} onChange={setDraftName} icon="user" placeholder="Name" />
            <FInput value={draftEmail} onChange={setDraftEmail} icon="mail" placeholder="email@example.com (optional)" type="email" />
            <button
              type="button"
              onClick={async () => {
                await addGuest(draftName, draftEmail);
                setDraftName(''); setDraftEmail('');
              }}
              disabled={!draftName.trim() || busy}
              className="pl-pearl-accent"
              style={{
                padding: '8px 14px',
                borderRadius: 999,
                fontSize: 12.5,
                fontWeight: 700,
                cursor: draftName.trim() && !busy ? 'pointer' : 'not-allowed',
                opacity: draftName.trim() && !busy ? 1 : 0.55,
                border: 'none',
              }}
            >
              {busy ? 'Adding…' : '+ Add to the list'}
            </button>
          </div>
        </FGroup>

        {/* Bulk import — paste a list */}
        {!importOpen ? (
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            style={{
              padding: '8px 12px',
              borderRadius: 10,
              border: '1.5px dashed var(--line)',
              background: 'transparent',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--ink-soft)',
              cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}
          >
            <Icon name="copy" size={13} color="var(--ink-soft)" />
            Paste a whole list from your phone or spreadsheet
          </button>
        ) : (
          <FGroup label={`Paste your list · ${importPreview.length} found`} hint="One guest per line. Accepts: 'Jane Doe', 'Jane Doe, jane@x.com', or 'Jane <jane@x.com>'.">
            <textarea
              value={importText}
              onChange={(e) => previewImport(e.target.value)}
              rows={8}
              placeholder={'Jane Doe, jane@example.com\nDad <dad@example.com>\nGrandma'}
              style={{
                width: '100%', padding: 10, borderRadius: 10,
                border: '1px solid var(--line)', background: 'var(--cream-2)',
                fontSize: 12.5, color: 'var(--ink)', fontFamily: 'var(--font-ui)',
                outline: 'none', resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button
                type="button"
                onClick={runImport}
                disabled={importPreview.length === 0 || busy}
                className="pl-pearl-accent"
                style={{
                  flex: 1, padding: '8px 14px',
                  borderRadius: 999, fontSize: 12.5, fontWeight: 700,
                  cursor: importPreview.length > 0 && !busy ? 'pointer' : 'not-allowed',
                  opacity: importPreview.length > 0 && !busy ? 1 : 0.55,
                  border: 'none',
                }}
              >
                {busy ? 'Adding…' : `Add ${importPreview.length || ''} ${importPreview.length === 1 ? 'guest' : 'guests'}`}
              </button>
              <button
                type="button"
                onClick={() => { setImportOpen(false); setImportText(''); setImportPreview([]); }}
                style={{
                  padding: '8px 14px', borderRadius: 999,
                  background: 'transparent', border: '1px solid var(--line)',
                  fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </FGroup>
        )}
      </div>
    </SectionPanelShell>
  );
}

export default GuestsPanel;
