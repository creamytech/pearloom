'use client';

// ─────────────────────────────────────────────────────────────
// The Vendor Book — /dashboard/vendors
//
// The host's private roster of everyone hired for the day: what
// they cost, when deposits and balances fall due, and when they
// arrive. Backed by /api/vendors/book (site_vendors table). The
// public directory at /vendors is the browsing counterpart — a
// Book entry is the private record of the person you actually
// hired.
//
// Money honesty: every figure is host-entered cents rendered as
// plain dollars. No conversion, no processing — this is a ledger.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { DashLayout } from '@/components/pearloom/dash/DashShell';
import { PLAtmosphere, PLCard } from '@/components/pearloom/dash/PLChrome';
import { PageIntro } from '@/components/pearloom/dash/QuietDash';
import { Icon, PearloomGlyph } from '@/components/pearloom/motifs';
import { useSelectedSite } from '@/components/marketing/design/dash/hooks';
import { EmptyShell } from '@/components/marketing/design/dash/DashShell';
import { getEventType } from '@/lib/event-os/event-types';
import { vendorToBudgetLine } from '@/lib/budget/lines';
import { todayLocal, formatLocalDate } from '@/lib/date-utils';
import { StateChip, vendorStateKind, HeroPlate, PlateAction } from '@/components/shell';

// ── Types ─────────────────────────────────────────────────────

type VendorStatus = 'considering' | 'booked' | 'paid';

interface BookVendor {
  id: string;
  name: string;
  category: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  costCents: number | null;
  depositCents: number | null;
  depositDue: string | null;
  balanceDue: string | null;
  depositPaid: boolean;
  balancePaid: boolean;
  status: VendorStatus;
  arrivalTime: string | null;
  notes: string | null;
  directoryVendorId: string | null;
  /** Call-sheet token — null until the host mints one. */
  packetToken: string | null;
  createdAt: string;
}

// The form's working shape — dollars as strings so the host can
// type freely; converted to cents on save.
interface VendorDraft {
  name: string;
  category: string;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  cost: string;
  deposit: string;
  depositDue: string;
  balanceDue: string;
  arrivalTime: string;
  notes: string;
  status: VendorStatus;
}

const EMPTY_DRAFT: VendorDraft = {
  name: '', category: '', contactName: '', email: '', phone: '', website: '',
  cost: '', deposit: '', depositDue: '', balanceDue: '', arrivalTime: '', notes: '',
  status: 'considering',
};

// ── Occasion-aware category suggestions ───────────────────────
// Plain words a first-time host already has (BRAND §7).

function categorySuggestions(occasion?: string): string[] {
  const id = occasion ?? '';
  if (id === 'memorial' || id === 'funeral') {
    return ['Funeral home', 'Officiant', 'Caterer', 'Florist', 'Musician'];
  }
  if (id === 'bachelor-party' || id === 'bachelorette-party' || id === 'reunion') {
    return ['Lodging', 'Activities', 'Transport', 'Restaurant'];
  }
  const et = getEventType(id);
  if (id === 'wedding' || et?.category === 'wedding-arc') {
    return ['Photographer', 'Florist', 'Caterer', 'DJ', 'Planner', 'Venue', 'Baker', 'Rentals'];
  }
  return ['Caterer', 'DJ', 'Venue', 'Rentals', 'Baker'];
}

// ── Money ─────────────────────────────────────────────────────
// Host-entered cents → plain "$1,200". Whole dollars unless the
// host typed cents.

function fmtMoney(centsVal: number): string {
  const whole = centsVal % 100 === 0;
  return '$' + (centsVal / 100).toLocaleString('en-US', {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  });
}

function dollarsToCents(s: string): number | null {
  const n = Number(s.replace(/[$,\s]/g, ''));
  if (!s.trim() || !Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function centsToDollarsInput(c: number | null): string {
  if (c == null) return '';
  return String(c % 100 === 0 ? c / 100 : (c / 100).toFixed(2));
}

const fmtDueDate = (iso: string) => formatLocalDate(iso, { month: 'short', day: 'numeric' });

// Balance owed = cost minus deposit (when both are entered).
function balanceCents(v: BookVendor): number | null {
  if (v.costCents == null) return null;
  return Math.max(0, v.costCents - (v.depositCents ?? 0));
}

// ── Payment-schedule strip ────────────────────────────────────

interface DueEntry {
  key: string;
  vendorName: string;
  kind: 'deposit' | 'balance';
  date: string;
  amountCents: number | null;
  overdue: boolean;
}

function upcomingDues(vendors: BookVendor[], today: string): DueEntry[] {
  const dues: DueEntry[] = [];
  for (const v of vendors) {
    if (v.depositDue && !v.depositPaid) {
      dues.push({
        key: `${v.id}:deposit`, vendorName: v.name, kind: 'deposit',
        date: v.depositDue, amountCents: v.depositCents, overdue: v.depositDue < today,
      });
    }
    if (v.balanceDue && !v.balancePaid) {
      dues.push({
        key: `${v.id}:balance`, vendorName: v.name, kind: 'balance',
        date: v.balanceDue, amountCents: balanceCents(v), overdue: v.balanceDue < today,
      });
    }
  }
  // Chronological — overdue dates sort first naturally, which is
  // exactly where the host's eye should land.
  dues.sort((a, b) => a.date.localeCompare(b.date));
  return dues.slice(0, 3);
}

// ── Shared styles ─────────────────────────────────────────────

const field: React.CSSProperties = {
  border: '1px solid var(--line)', background: 'var(--cream)', borderRadius: 8,
  padding: '7px 10px', fontSize: 13, color: 'var(--ink)',
  fontFamily: 'var(--font-ui, inherit)', outline: 'none', width: '100%', boxSizing: 'border-box',
};
const fieldLabel: React.CSSProperties = {
  fontSize: 11.5, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 4, display: 'block',
};
const plum = 'var(--plum, #C6563D)';

// ── Per-vendor accent + initials ──────────────────────────────
// A stable tint drawn from the vendor's name (a hash, never a
// stored/fabricated field) so each avatar reads distinct — the
// zip's four-way sage / lavender / gold / peach cycle.

const VENDOR_ACCENTS: Array<{ bg: string; ink: string }> = [
  { bg: 'var(--sage-tint)', ink: 'var(--sage-deep, #5C6B3F)' },
  { bg: 'var(--lavender-bg)', ink: 'var(--lavender-ink, #6B5B8A)' },
  { bg: 'rgba(193,154,75,0.16)', ink: '#8A6A2E' },
  { bg: 'var(--peach-bg)', ink: 'var(--peach-ink, #C6703D)' },
];

function vendorAccent(name: string): { bg: string; ink: string } {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) | 0;
  return VENDOR_ACCENTS[Math.abs(h) % VENDOR_ACCENTS.length];
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '·';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// The relationship-stage chip — the shared shell <StateChip>
// (TASTE-PLAN T.1): waiting → info → good from tentative to
// settled. `paid` wears a check.
const STATUS_LABEL: Record<VendorStatus, string> = {
  considering: 'Considering', booked: 'Booked', paid: 'Paid',
};

// ── The page ──────────────────────────────────────────────────

export function VendorBookClient() {
  const { site, loading } = useSelectedSite();
  const siteId = site?.id ?? '';

  // Today as a local YYYY-MM-DD, computed once at mount (React
  // Compiler: no Date.now() in render — lazy init only).
  const [today] = useState(() => todayLocal());

  // Roster, tagged with the site it was fetched for so `listLoading`
  // is a derived render-time flag (the VendorsPage pattern).
  const [result, setResult] = useState<{ siteId: string; vendors: BookVendor[] } | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!siteId) return;
    let cancelled = false;
    fetch(`/api/vendors/book?siteId=${encodeURIComponent(siteId)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load failed'))))
      .then((data: { vendors?: BookVendor[] }) => {
        if (cancelled) return;
        setResult({ siteId, vendors: data.vendors ?? [] });
        setLoadError(false);
      })
      .catch(() => {
        if (cancelled) return;
        setResult({ siteId, vendors: [] });
        setLoadError(true);
      });
    return () => { cancelled = true; };
  }, [siteId]);

  const listLoading = !!siteId && result?.siteId !== siteId;
  const vendors = useMemo(
    () => (result?.siteId === siteId ? result.vendors : []),
    [result, siteId],
  );

  const setVendors = useCallback((update: (prev: BookVendor[]) => BookVendor[]) => {
    setResult((r) => (r && r.siteId === siteId ? { ...r, vendors: update(r.vendors) } : r));
  }, [siteId]);

  // ── Form state (add or edit — one form at a time) ──
  const [form, setForm] = useState<{ mode: 'add' } | { mode: 'edit'; vendor: BookVendor } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const suggestions = categorySuggestions(site?.occasion);

  const saveDraft = useCallback(async (draft: VendorDraft) => {
    if (!siteId) return;
    const payload = {
      siteId,
      name: draft.name.trim(),
      category: draft.category.trim(),
      contactName: draft.contactName.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim(),
      website: draft.website.trim(),
      costCents: dollarsToCents(draft.cost),
      depositCents: dollarsToCents(draft.deposit),
      depositDue: draft.depositDue || null,
      balanceDue: draft.balanceDue || null,
      arrivalTime: draft.arrivalTime.trim(),
      notes: draft.notes.trim(),
      status: draft.status,
    };
    if (!payload.name || !payload.category) {
      setFormError('A name and a category are the two lines every entry needs.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const editing = form?.mode === 'edit' ? form.vendor : null;
      const res = await fetch('/api/vendors/book', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(editing ? { ...payload, id: editing.id } : payload),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; vendor?: BookVendor; error?: string } | null;
      if (!res.ok || !data?.ok || !data.vendor) {
        setFormError(data?.error ?? 'That didn’t save — try again.');
        return;
      }
      const saved = data.vendor;
      setVendors((prev) =>
        editing ? prev.map((v) => (v.id === saved.id ? saved : v)) : [...prev, saved],
      );
      setForm(null);
    } catch {
      setFormError('That didn’t save — check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }, [siteId, form, setVendors]);

  // Quick single-field PATCH (mark a deposit/balance paid).
  const patchVendor = useCallback(async (id: string, patch: Record<string, unknown>) => {
    if (!siteId) return;
    try {
      const res = await fetch('/api/vendors/book', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ siteId, id, ...patch }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; vendor?: BookVendor } | null;
      if (res.ok && data?.ok && data.vendor) {
        const saved = data.vendor;
        setVendors((prev) => prev.map((v) => (v.id === saved.id ? saved : v)));
      }
    } catch { /* leave the row as-is — nothing was presented as saved */ }
  }, [siteId, setVendors]);

  // ── The call sheet ──
  // First tap mints the vendor's packet token (idempotent server-
  // side), then copies /vp/{token}; later taps just copy — the
  // token rides the roster after the first mint.
  const copyCallSheet = useCallback(async (v: BookVendor): Promise<boolean> => {
    if (!siteId) return false;
    let token = v.packetToken;
    if (!token) {
      try {
        const res = await fetch('/api/vendors/book/packet', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ siteId, id: v.id }),
        });
        const data = (await res.json().catch(() => null)) as { ok?: boolean; token?: string } | null;
        if (!res.ok || !data?.ok || !data.token) return false;
        token = data.token;
        const minted = token;
        setVendors((prev) => prev.map((x) => (x.id === v.id ? { ...x, packetToken: minted } : x)));
      } catch {
        return false;
      }
    }
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/vp/${token}`);
      return true;
    } catch {
      return false;
    }
  }, [siteId, setVendors]);

  const removeVendor = useCallback(async (id: string) => {
    if (!siteId) return;
    const res = await fetch(
      `/api/vendors/book?siteId=${encodeURIComponent(siteId)}&id=${encodeURIComponent(id)}`,
      { method: 'DELETE' },
    ).catch(() => null);
    if (res?.ok) setVendors((prev) => prev.filter((v) => v.id !== id));
  }, [siteId, setVendors]);

  // ── Budget linkage ──
  // A vendor line lives in the budget_lines ledger (source_kind =
  // 'vendor', source_id = the vendor's id) — the real FK, not a
  // name-string merge into manifest.budget. We fetch which vendors
  // are already linked so the card can read "In the budget", and
  // add one via POST /api/sites/budget/lines.
  const [linkedVendorIds, setLinkedVendorIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!siteId) { setLinkedVendorIds(new Set()); return; }
    let cancelled = false;
    fetch(`/api/sites/budget/lines?siteId=${encodeURIComponent(siteId)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load failed'))))
      .then((data: { lines?: Array<{ sourceKind?: string | null; sourceId?: string | null }> }) => {
        if (cancelled) return;
        const ids = new Set<string>();
        for (const l of data.lines ?? []) {
          if (l.sourceKind === 'vendor' && l.sourceId) ids.add(l.sourceId);
        }
        setLinkedVendorIds(ids);
      })
      .catch(() => { if (!cancelled) setLinkedVendorIds(new Set()); });
    return () => { cancelled = true; };
  }, [siteId]);

  const inBudget = useCallback(
    (v: BookVendor) => linkedVendorIds.has(v.id),
    [linkedVendorIds],
  );

  const [budgetBusy, setBudgetBusy] = useState<string | null>(null);
  const [budgetError, setBudgetError] = useState<string | null>(null);

  const addToBudget = useCallback(async (v: BookVendor) => {
    if (!siteId) return;
    setBudgetBusy(v.id);
    setBudgetError(null);
    try {
      // vendorToBudgetLine derives the linked line (committed = cost,
      // paid = whichever of deposit/balance is marked paid). The
      // (site_id, source_id) unique index makes a repeat add update
      // the line in place rather than duplicating it.
      const res = await fetch('/api/sites/budget/lines', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ siteId, line: vendorToBudgetLine(v) }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !data?.ok) {
        setBudgetError(data?.error ?? 'The budget didn’t save — try again.');
        return;
      }
      setLinkedVendorIds((prev) => {
        const next = new Set(prev);
        next.add(v.id);
        return next;
      });
    } catch {
      setBudgetError('The budget didn’t save — check your connection and try again.');
    } finally {
      setBudgetBusy(null);
    }
  }, [siteId]);

  // ── Derived views ──
  // `dues` recomputes from `vendors`, so a "Mark paid" (patchVendor
  // → setVendors) drops the entry from the strip immediately.
  const dues = useMemo(() => upcomingDues(vendors, today), [vendors, today]);
  // A payment schedule exists (some due date was ever entered) —
  // when it does and nothing is left unpaid, the strip rests on a
  // quiet "All paid" instead of vanishing.
  const hasSchedule = useMemo(
    () => vendors.some((v) => v.depositDue || v.balanceDue),
    [vendors],
  );
  const groups: Array<{ status: VendorStatus; label: string; rows: BookVendor[] }> = [
    { status: 'considering', label: 'Considering', rows: vendors.filter((v) => v.status === 'considering') },
    { status: 'booked', label: 'Booked', rows: vendors.filter((v) => v.status === 'booked') },
    { status: 'paid', label: 'Paid', rows: vendors.filter((v) => v.status === 'paid') },
  ];

  // Every past-due deposit/balance across the roster, earliest
  // first — feeds the rail's "next payment" line + its "needs
  // attention" card. Real dates only; nothing is fabricated.
  const overdueDues = useMemo<DueEntry[]>(() => {
    const all: DueEntry[] = [];
    for (const v of vendors) {
      if (v.depositDue && !v.depositPaid && v.depositDue < today) {
        all.push({ key: `${v.id}:deposit`, vendorName: v.name, kind: 'deposit', date: v.depositDue, amountCents: v.depositCents, overdue: true });
      }
      if (v.balanceDue && !v.balancePaid && v.balanceDue < today) {
        all.push({ key: `${v.id}:balance`, vendorName: v.name, kind: 'balance', date: v.balanceDue, amountCents: balanceCents(v), overdue: true });
      }
    }
    all.sort((a, b) => a.date.localeCompare(b.date));
    return all;
  }, [vendors, today]);
  const overdueCount = overdueDues.length;

  // The rail's "next payment" — the soonest unpaid due (overdue in
  // plum), else a quiet "All set" once a schedule exists at all.
  const nextDue = dues[0] ?? null;
  const nextPayment = nextDue
    ? { label: fmtDueDate(nextDue.date), overdue: nextDue.overdue }
    : hasSchedule ? { label: 'All set', overdue: false } : null;

  // "The team" rail summary — roster totals + the next payment.
  const teamRows: Array<{ label: string; value: React.ReactNode; small?: boolean; color?: string }> = [
    { label: 'Booked', value: groups[1].rows.length },
    { label: 'Considering', value: groups[0].rows.length },
    { label: 'Paid', value: groups[2].rows.length },
    ...(nextPayment
      ? [{ label: 'Next payment', value: nextPayment.label, small: true, color: nextPayment.overdue ? plum : 'var(--ink)' }]
      : []),
  ];

  // Rail only when there's roster data — a form opened over an empty
  // book keeps the single-column layout (no all-zeros summary).
  const showRail = vendors.length > 0;

  return (
    <DashLayout active="vendors" hideTopbar>
      <PLAtmosphere />
      {/* The pressed plate (TASTE-PLAN T.3) — the route's ONE focal
          surface; the book below stays quiet paper. */}
      <div style={{ padding: '16px var(--pl-dash-pad) 0', maxWidth: 'var(--pl-dash-maxw)', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <HeroPlate
          eyebrow="Vendors"
          title="The vendor book."
          figures={vendors.length > 0 ? [
            { label: 'Booked', value: String(groups[1].rows.length), raw: groups[1].rows.length },
            { label: 'Considering', value: String(groups[0].rows.length), raw: groups[0].rows.length },
            { label: 'Paid', value: String(groups[2].rows.length), raw: groups[2].rows.length },
          ] : undefined}
          actions={site?.id ? (
            <PlateAction primary onClick={() => { setForm({ mode: 'add' }); setFormError(null); }}>
              Add a vendor
            </PlateAction>
          ) : undefined}
          style={{ marginBottom: 16 }}
        />
      </div>
      <div
        style={{
          padding: '0 var(--pl-dash-pad) 60px',
          maxWidth: 'var(--pl-dash-maxw)',
          margin: '0 auto',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {loading || listLoading ? (
          <PLCard tone="paper" style={{ padding: 60, textAlign: 'center' }}>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                fontSize: 18,
                color: 'var(--sage-deep)',
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              }}
            >
              Loading…
            </div>
          </PLCard>
        ) : !site?.id ? (
          <EmptyShell
            inline
            cta={null}
            message="Pick a celebration first — the switcher in the sidebar keeps its vendor book."
          />
        ) : vendors.length === 0 && !form ? (
          /* ── Honest empty state — full width, no summary rail ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {loadError && (
              <div role="alert" style={{ fontSize: 12.5, color: plum, lineHeight: 1.5 }}>
                The book didn&rsquo;t load — refresh to try again.
              </div>
            )}
            <PLCard tone="paper" style={{ padding: '44px 24px', textAlign: 'center' }}>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontStyle: 'italic',
                  fontSize: 21,
                  color: 'var(--ink)',
                  fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                  marginBottom: 8,
                }}
              >
                Nothing yet.
              </div>
              <div style={{ fontSize: 13.5, color: 'var(--ink-soft)', maxWidth: 420, margin: '0 auto', lineHeight: 1.55 }}>
                The first name in the book is usually the venue.
              </div>
            </PLCard>
            <DirectoryLink />
          </div>
        ) : (
          /* ── The vendor book — roster (left) + a sticky summary rail
                (right): the zip's two-column layout. The rail only
                rides along once there's real roster data. ── */
          <div
            className={showRail ? 'pd-vendors-main' : undefined}
            style={{
              display: showRail ? 'grid' : 'flex',
              ...(showRail
                ? { gridTemplateColumns: 'minmax(0, 1fr) 300px', alignItems: 'flex-start' }
                : { flexDirection: 'column' }),
              gap: 20,
            }}
          >
            {/* MAIN — the due-next strip, the add/edit form, the roster */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
              {loadError && (
                <div role="alert" style={{ fontSize: 12.5, color: plum, lineHeight: 1.5 }}>
                  The book didn&rsquo;t load — refresh to try again.
                </div>
              )}

              {/* Payment-schedule strip — what's due next */}
              {dues.length === 0 && hasSchedule && (
                <PLCard tone="paper" title="Due next" icon="calendar">
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--sage-deep)' }}>
                    <Icon name="check" size={13} /> All paid — nothing on the schedule.
                  </div>
                </PLCard>
              )}
              {dues.length > 0 && (
                <PLCard tone="paper" title="Due next" icon="calendar">
                  <div className="pd-vb-strip" style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 2 }}>
                    {dues.map((d) => (
                      <div
                        key={d.key}
                        style={{
                          flex: '0 0 auto',
                          minWidth: 190,
                          border: `1px solid ${d.overdue ? plum : 'var(--line-soft)'}`,
                          borderRadius: 12,
                          padding: '10px 14px',
                          background: 'var(--cream)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                          <span
                            style={{
                              fontFamily: 'var(--pl-font-mono, monospace)',
                              fontSize: 10.5,
                              fontWeight: 700,
                              letterSpacing: '0.14em',
                              textTransform: 'uppercase',
                              color: d.overdue ? plum : 'var(--ink-muted)',
                            }}
                          >
                            {fmtDueDate(d.date)}
                          </span>
                          {d.amountCents != null && (
                            <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--ink)' }}>
                              {fmtMoney(d.amountCents)}
                            </span>
                          )}
                        </div>
                        <div style={{ marginTop: 4, fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>
                          {d.vendorName}
                          <span style={{ color: 'var(--ink-muted)', fontWeight: 400 }}>
                            {' '}· {d.kind === 'deposit' ? 'deposit' : 'balance'}
                          </span>
                        </div>
                        {d.overdue && (
                          <div style={{ marginTop: 3, fontSize: 11.5, color: plum }}>Past due</div>
                        )}
                      </div>
                    ))}
                  </div>
                </PLCard>
              )}

              {/* Add / edit form — opened from the header's action */}
              {form && (
                <VendorForm
                  key={form.mode === 'edit' ? form.vendor.id : 'add'}
                  initial={form.mode === 'edit' ? draftFrom(form.vendor) : EMPTY_DRAFT}
                  heading={form.mode === 'edit' ? `Edit ${form.vendor.name}` : 'Add a vendor'}
                  suggestions={suggestions}
                  saving={saving}
                  error={formError}
                  onCancel={() => { setForm(null); setFormError(null); }}
                  onSave={saveDraft}
                />
              )}

              {budgetError && (
                <div role="alert" style={{ fontSize: 12.5, color: plum, lineHeight: 1.5 }}>
                  {budgetError}
                </div>
              )}

              {/* Roster, grouped by status */}
              {groups.map((g) =>
                g.rows.length === 0 ? null : (
                  <section key={g.status}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '2px 0 12px' }}>
                      <span className="eyebrow" style={{ margin: 0 }}>{g.label}</span>
                      <span style={{ fontFamily: 'var(--pl-font-mono, monospace)', fontSize: 11, color: 'var(--ink-muted)' }}>
                        {g.rows.length}
                      </span>
                      <div aria-hidden style={{ flex: 1, height: 1, background: 'var(--line-soft)' }} />
                    </div>
                    <div
                      className="pd-vb-grid"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))',
                        gap: 16,
                      }}
                    >
                      {g.rows.map((v) => (
                        <VendorCard
                          key={v.id}
                          vendor={v}
                          today={today}
                          linked={inBudget(v)}
                          budgetBusy={budgetBusy === v.id}
                          onEdit={() => { setForm({ mode: 'edit', vendor: v }); setFormError(null); }}
                          onRemove={() => removeVendor(v.id)}
                          onMarkPaid={(patch) => patchVendor(v.id, patch)}
                          onAddToBudget={() => addToBudget(v)}
                          onCopyCallSheet={() => copyCallSheet(v)}
                        />
                      ))}
                    </div>
                  </section>
                ),
              )}

              <DirectoryLink />
            </div>

            {/* RAIL — "The team" summary + a real attention / ledger note */}
            {showRail && (
              <aside
                className="pd-vendors-rail"
                style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 86 }}
              >
                <section style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 16, padding: '16px 18px' }}>
                  <span className="eyebrow" style={{ margin: 0 }}>The team</span>
                  <div style={{ marginTop: 4 }}>
                    {teamRows.map((r, i) => (
                      <div
                        key={r.label}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                          padding: '9px 0',
                          borderTop: i ? '1px solid var(--line-soft)' : 'none',
                        }}
                      >
                        <span style={{ fontSize: 13, color: 'var(--ink)' }}>{r.label}</span>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: r.small ? 15 : 19, lineHeight: 1, color: r.color ?? 'var(--ink)' }}>
                          {r.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                {overdueCount > 0 && overdueDues[0] ? (
                  <section style={{ background: 'var(--peach-bg)', borderRadius: 16, padding: '16px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <PearloomGlyph size={16} color="var(--peach-ink, #C6703D)" />
                      <span style={{ fontFamily: 'var(--pl-font-mono, monospace)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--peach-ink, #C6703D)' }}>
                        Needs attention
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5 }}>
                      <strong style={{ fontWeight: 600 }}>{overdueDues[0].vendorName}</strong>&rsquo;s {overdueDues[0].kind} was due {fmtDueDate(overdueDues[0].date)}.
                      {overdueCount > 1 ? ` ${overdueCount} payments past due.` : ''}
                    </div>
                    <div style={{ marginTop: 10, fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
                      Mark it paid on the vendor&rsquo;s card once it&rsquo;s settled.
                    </div>
                  </section>
                ) : (
                  <section style={{ background: 'var(--cream-2)', border: '1px solid var(--line-soft)', borderRadius: 16, padding: '16px 18px' }}>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.55 }}>
                      Every figure here is yours — Pearloom keeps the ledger and never touches vendor money.
                    </div>
                  </section>
                )}
              </aside>
            )}
          </div>
        )}
      </div>
    </DashLayout>
  );
}

// ── Quiet cross-link to the public directory ──────────────────

function DirectoryLink() {
  return (
    <div style={{ fontSize: 13, color: 'var(--ink-muted)' }}>
      Browsing?{' '}
      <Link href="/vendors" style={{ color: 'var(--peach-ink, #C6703D)', fontWeight: 600, textDecoration: 'none' }}>
        The directory has ideas →
      </Link>
    </div>
  );
}

// ── Vendor card ───────────────────────────────────────────────

function VendorCard({
  vendor: v,
  today,
  linked,
  budgetBusy,
  onEdit,
  onRemove,
  onMarkPaid,
  onAddToBudget,
  onCopyCallSheet,
}: {
  vendor: BookVendor;
  today: string;
  linked: boolean;
  budgetBusy: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onMarkPaid: (patch: { depositPaid?: boolean; balancePaid?: boolean }) => void;
  onAddToBudget: () => void;
  onCopyCallSheet: () => Promise<boolean>;
}) {
  // Two-stage remove (the RegistryClaimsFeed arm-then-confirm
  // pattern — no window.confirm).
  const [armed, setArmed] = useState(false);

  // Call-sheet copy state — 'copied' flashes "Copied — send it
  // along" for a beat, then rests back on the action.
  const [sheetState, setSheetState] = useState<'idle' | 'busy' | 'copied' | 'error'>('idle');
  const handleCallSheet = async () => {
    if (sheetState === 'busy') return;
    setSheetState('busy');
    const ok = await onCopyCallSheet();
    setSheetState(ok ? 'copied' : 'error');
    setTimeout(() => setSheetState('idle'), 2400);
  };

  const bal = balanceCents(v);
  const accent = vendorAccent(v.name);
  const contactBits = [
    v.contactName && <span key="n" style={{ color: 'var(--ink)' }}>{v.contactName}</span>,
    v.phone && (
      <a key="p" href={`tel:${v.phone.replace(/[^\d+]/g, '')}`} style={contactLink}>
        {v.phone}
      </a>
    ),
    v.email && (
      <a key="e" href={`mailto:${v.email}`} style={contactLink}>
        {v.email}
      </a>
    ),
    v.website && (
      <a key="w" href={v.website.startsWith('http') ? v.website : `https://${v.website}`} target="_blank" rel="noreferrer" style={contactLink}>
        Website
      </a>
    ),
  ].filter(Boolean);

  return (
    <PLCard tone="paper">
      {/* Header — avatar · name + category chip · status pill (zip anatomy) */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span
          aria-hidden
          style={{
            width: 40, height: 40, borderRadius: 11, flexShrink: 0, display: 'grid', placeItems: 'center',
            background: accent.bg, color: accent.ink,
            fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 14, fontWeight: 600,
          }}
        >
          {initialsOf(v.name)}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {v.name}
          </div>
          <span
            style={{
              display: 'inline-block',
              marginTop: 5,
              fontFamily: 'var(--pl-font-mono, monospace)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: accent.ink,
              background: accent.bg,
              borderRadius: 999,
              padding: '3px 9px',
            }}
          >
            {v.category}
          </span>
        </div>
        <StateChip kind={vendorStateKind(v.status)} style={{ flexShrink: 0 }}>
          {v.status === 'paid' && <Icon name="check" size={10} color="currentColor" />}
          {STATUS_LABEL[v.status]}
        </StateChip>
      </div>

      {contactBits.length > 0 && (
        <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: '4px 12px', fontSize: 12.5, color: 'var(--ink-soft)' }}>
          {contactBits}
        </div>
      )}

      {/* ── Money lines — host-entered, plain dollars ── */}
      {(v.costCents != null || v.depositCents != null) && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {v.costCents != null && (
            <div style={moneyRow}>
              <span style={{ color: 'var(--ink-soft)' }}>Cost</span>
              <span style={{ fontFamily: 'var(--pl-font-mono, monospace)', color: 'var(--ink)' }}>{fmtMoney(v.costCents)}</span>
            </div>
          )}
          {v.depositCents != null && (
            <PaymentLine
              label="Deposit"
              amountCents={v.depositCents}
              due={v.depositDue}
              paid={v.depositPaid}
              today={today}
              onMarkPaid={() => onMarkPaid({ depositPaid: true })}
            />
          )}
          {v.costCents != null && (v.depositCents != null || v.balanceDue) && (
            <PaymentLine
              label="Balance"
              amountCents={bal}
              due={v.balanceDue}
              paid={v.balancePaid}
              today={today}
              onMarkPaid={() => onMarkPaid({ balancePaid: true })}
            />
          )}
        </div>
      )}

      {/* Arrival time — the day-of fact. Prominent once a vendor is
          actually booked; a quiet aside while still considering. */}
      {v.arrivalTime && v.status !== 'considering' ? (
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span
            style={{
              fontFamily: 'var(--pl-font-mono, monospace)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--ink-muted)',
            }}
          >
            Arrives
          </span>
          <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 21, lineHeight: 1.1, color: 'var(--ink)' }}>
            {v.arrivalTime}
          </span>
        </div>
      ) : v.arrivalTime ? (
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--ink-soft)' }}>
          <Icon name="clock" size={12} /> Arrives {v.arrivalTime}
        </div>
      ) : null}

      {v.notes && (
        <details style={{ marginTop: 10 }}>
          <summary style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', cursor: 'pointer' }}>Notes</summary>
          <div style={{ marginTop: 6, fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
            {v.notes}
          </div>
        </details>
      )}

      {/* ── Footer — budget + call sheet (booked/paid) left · edit /
          remove right. Present for every card so those actions stay
          reachable; considering rests on a quiet "Still deciding". ── */}
      <div
        style={{
          marginTop: 14,
          paddingTop: 12,
          borderTop: '1px solid var(--line-soft)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px 12px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px 14px', minWidth: 0 }}>
          {v.status === 'considering' ? (
            <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 13, color: 'var(--ink-muted)' }}>
              Still deciding
            </span>
          ) : (
            <>
              {linked ? (
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--sage-deep)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Icon name="check" size={12} /> In the budget
                </span>
              ) : (
                <button type="button" className="btn btn-outline btn-sm" disabled={budgetBusy} onClick={onAddToBudget}>
                  {budgetBusy ? 'Adding…' : 'Add to budget'}
                </button>
              )}
              {/* One printable sheet the vendor keeps: /vp/{token}. */}
              <button
                type="button"
                onClick={handleCallSheet}
                disabled={sheetState === 'busy'}
                style={{
                  border: 'none', background: 'transparent', padding: 0, cursor: 'pointer',
                  fontSize: 12, fontWeight: 700,
                  color:
                    sheetState === 'copied' ? 'var(--sage-deep)'
                    : sheetState === 'error' ? plum
                    : 'var(--peach-ink, #C6703D)',
                }}
              >
                {sheetState === 'copied'
                  ? 'Copied — send it along'
                  : sheetState === 'error'
                    ? 'Couldn’t copy — try again'
                    : sheetState === 'busy'
                      ? 'Saving…'
                      : 'Call sheet →'}
              </button>
            </>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button type="button" onClick={onEdit} aria-label={`Edit ${v.name}`} style={iconBtn}>
            <Icon name="brush" size={13} />
          </button>
          {armed ? (
            <button
              type="button"
              onClick={onRemove}
              style={{ ...iconBtn, width: 'auto', padding: '0 8px', color: plum, borderColor: plum, fontSize: 11.5, fontWeight: 700 }}
            >
              Remove?
            </button>
          ) : (
            <button type="button" onClick={() => setArmed(true)} aria-label={`Remove ${v.name}`} style={{ ...iconBtn, color: plum }}>
              <Icon name="trash" size={13} />
            </button>
          )}
        </div>
      </div>
    </PLCard>
  );
}

const iconBtn: React.CSSProperties = {
  width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  border: '1px solid var(--line-soft)', borderRadius: 8, background: 'transparent',
  color: 'var(--ink-soft)', cursor: 'pointer',
};
const contactLink: React.CSSProperties = {
  color: 'var(--peach-ink, #C6703D)', textDecoration: 'none', fontWeight: 600,
  overflowWrap: 'anywhere',
};
const moneyRow: React.CSSProperties = {
  display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', fontSize: 12.5,
};

function PaymentLine({
  label,
  amountCents,
  due,
  paid,
  today,
  onMarkPaid,
}: {
  label: string;
  amountCents: number | null;
  due: string | null;
  paid: boolean;
  today: string;
  onMarkPaid: () => void;
}) {
  const overdue = !paid && !!due && due < today;
  return (
    <div style={moneyRow}>
      <span style={{ color: 'var(--ink-soft)' }}>
        {label}
        {due && (
          <span style={{ color: overdue ? plum : 'var(--ink-muted)' }}>
            {' '}· due {fmtDueDate(due)}{overdue ? ' — past due' : ''}
          </span>
        )}
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        {amountCents != null && (
          <span style={{ fontFamily: 'var(--pl-font-mono, monospace)', color: 'var(--ink)' }}>{fmtMoney(amountCents)}</span>
        )}
        {paid ? (
          <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--sage-deep)' }}>Paid ✓</span>
        ) : (
          <button
            type="button"
            onClick={onMarkPaid}
            style={{
              border: 'none', background: 'transparent', padding: 0, cursor: 'pointer',
              fontSize: 11.5, fontWeight: 700, color: 'var(--peach-ink, #C6703D)',
            }}
          >
            Mark paid
          </button>
        )}
      </span>
    </div>
  );
}

// ── The form ──────────────────────────────────────────────────

function draftFrom(v: BookVendor): VendorDraft {
  return {
    name: v.name,
    category: v.category,
    contactName: v.contactName ?? '',
    email: v.email ?? '',
    phone: v.phone ?? '',
    website: v.website ?? '',
    cost: centsToDollarsInput(v.costCents),
    deposit: centsToDollarsInput(v.depositCents),
    depositDue: v.depositDue ?? '',
    balanceDue: v.balanceDue ?? '',
    arrivalTime: v.arrivalTime ?? '',
    notes: v.notes ?? '',
    status: v.status,
  };
}

function VendorForm({
  initial,
  heading,
  suggestions,
  saving,
  error,
  onCancel,
  onSave,
}: {
  initial: VendorDraft;
  heading: string;
  suggestions: string[];
  saving: boolean;
  error: string | null;
  onCancel: () => void;
  onSave: (draft: VendorDraft) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const set = (patch: Partial<VendorDraft>) => setDraft((d) => ({ ...d, ...patch }));

  return (
    <PLCard tone="paper" title={heading}>
      <div className="pd-vb-form" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={fieldLabel} htmlFor="vb-name">Name</label>
          <input id="vb-name" value={draft.name} placeholder="Marigold & Co." onChange={(e) => set({ name: e.target.value })} style={field} />
        </div>
        <div>
          <label style={fieldLabel} htmlFor="vb-category">Category</label>
          <input id="vb-category" value={draft.category} placeholder={suggestions[0]} onChange={(e) => set({ category: e.target.value })} style={field} />
          <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => set({ category: s })}
                style={{
                  border: `1px solid ${draft.category === s ? 'var(--sage-deep)' : 'var(--line-soft)'}`,
                  background: draft.category === s ? 'var(--sage-tint)' : 'transparent',
                  color: draft.category === s ? 'var(--sage-deep)' : 'var(--ink-soft)',
                  borderRadius: 999,
                  padding: '3px 10px',
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={fieldLabel} htmlFor="vb-contact">Contact</label>
          <input id="vb-contact" value={draft.contactName} placeholder="Sam Reyes" onChange={(e) => set({ contactName: e.target.value })} style={field} />
        </div>
        <div>
          <label style={fieldLabel} htmlFor="vb-email">Email</label>
          <input id="vb-email" type="email" value={draft.email} placeholder="hello@marigold.co" onChange={(e) => set({ email: e.target.value })} style={field} />
        </div>
        <div>
          <label style={fieldLabel} htmlFor="vb-phone">Phone</label>
          <input id="vb-phone" value={draft.phone} placeholder="(555) 010-1234" onChange={(e) => set({ phone: e.target.value })} style={field} />
        </div>
        <div>
          <label style={fieldLabel} htmlFor="vb-website">Website</label>
          <input id="vb-website" value={draft.website} placeholder="marigold.co" onChange={(e) => set({ website: e.target.value })} style={field} />
        </div>
        <div>
          <label style={fieldLabel} htmlFor="vb-cost">Cost ($)</label>
          <input id="vb-cost" inputMode="decimal" value={draft.cost} placeholder="1,200" onChange={(e) => set({ cost: e.target.value })} style={field} />
        </div>
        <div>
          <label style={fieldLabel} htmlFor="vb-deposit">Deposit ($)</label>
          <input id="vb-deposit" inputMode="decimal" value={draft.deposit} placeholder="300" onChange={(e) => set({ deposit: e.target.value })} style={field} />
        </div>
        <div>
          <label style={fieldLabel} htmlFor="vb-deposit-due">Deposit due</label>
          <input id="vb-deposit-due" type="date" value={draft.depositDue} onChange={(e) => set({ depositDue: e.target.value })} style={field} />
        </div>
        <div>
          <label style={fieldLabel} htmlFor="vb-balance-due">Balance due</label>
          <input id="vb-balance-due" type="date" value={draft.balanceDue} onChange={(e) => set({ balanceDue: e.target.value })} style={field} />
        </div>
        <div>
          <label style={fieldLabel} htmlFor="vb-arrival">Arrives</label>
          <input id="vb-arrival" value={draft.arrivalTime} placeholder="3:00 PM" onChange={(e) => set({ arrivalTime: e.target.value })} style={field} />
        </div>
        <div>
          <label style={fieldLabel} htmlFor="vb-status">Status</label>
          <select
            id="vb-status"
            value={draft.status}
            onChange={(e) => set({ status: e.target.value as VendorStatus })}
            style={{ ...field, appearance: 'auto' }}
          >
            <option value="considering">Considering</option>
            <option value="booked">Booked</option>
            <option value="paid">Paid</option>
          </select>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={fieldLabel} htmlFor="vb-notes">Notes</label>
          <textarea
            id="vb-notes"
            value={draft.notes}
            rows={3}
            placeholder="Load-in through the side entrance. Final headcount by the 12th."
            onChange={(e) => set({ notes: e.target.value })}
            style={{ ...field, resize: 'vertical' }}
          />
        </div>
      </div>
      {error && (
        <div role="alert" style={{ marginTop: 10, fontSize: 12.5, color: plum, lineHeight: 1.5 }}>
          {error}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button type="button" className="btn btn-primary btn-sm" disabled={saving} onClick={() => onSave(draft)}>
          {saving ? 'Saving…' : 'Save to the book'}
        </button>
        <button type="button" className="btn btn-outline btn-sm" disabled={saving} onClick={onCancel}>
          Cancel
        </button>
      </div>
      <style jsx>{`
        @media (max-width: 640px) {
          :global(.pd-vb-form) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </PLCard>
  );
}
