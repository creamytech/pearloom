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
import { PageIntro, StatStrip, type StatStripItem } from '@/components/pearloom/dash/QuietDash';
import { Icon } from '@/components/pearloom/motifs';
import {
  useSelectedSite,
  patchSiteManifestInCache,
} from '@/components/marketing/design/dash/hooks';
import { getEventType } from '@/lib/event-os/event-types';
import { todayLocal, formatLocalDate } from '@/lib/date-utils';

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

interface BudgetLine { cat: string; used: number; cap: number }

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
  const budgetLines = useMemo<BudgetLine[]>(() => {
    const raw = (site?.manifest as { budget?: unknown } | undefined)?.budget;
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((l): l is BudgetLine => !!l && typeof l === 'object' && typeof (l as BudgetLine).cat === 'string')
      .map((l) => ({ cat: l.cat, used: Number(l.used) || 0, cap: Number(l.cap) || 0 }));
  }, [site]);

  const inBudget = useCallback(
    (v: BookVendor) =>
      budgetLines.some((l) => l.cat.trim().toLowerCase() === v.name.trim().toLowerCase()),
    [budgetLines],
  );

  const [budgetBusy, setBudgetBusy] = useState<string | null>(null);
  const [budgetError, setBudgetError] = useState<string | null>(null);

  const addToBudget = useCallback(async (v: BookVendor) => {
    if (!siteId) return;
    // The budget is host-entered DOLLARS ({cat, used, cap} — see
    // /api/sites/budget + cockpit's BudgetBreakdown). used = what's
    // actually been paid so far; cap = the vendor's full cost.
    let paidCents = 0;
    if (v.depositPaid && v.depositCents) paidCents += v.depositCents;
    if (v.balancePaid) paidCents += balanceCents(v) ?? 0;
    const line: BudgetLine = {
      cat: v.name.trim(),
      used: Math.round(paidCents / 100),
      cap: Math.round((v.costCents ?? 0) / 100),
    };
    // Merge by name — replace an existing line, else append. The
    // route replaces the whole array, so we send the merged set.
    const key = line.cat.toLowerCase();
    const existingIdx = budgetLines.findIndex((l) => l.cat.trim().toLowerCase() === key);
    const merged = existingIdx >= 0
      ? budgetLines.map((l, i) => (i === existingIdx ? line : l))
      : [...budgetLines, line];

    setBudgetBusy(v.id);
    setBudgetError(null);
    try {
      const res = await fetch('/api/sites/budget', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ siteId, budget: merged }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !data?.ok) {
        setBudgetError(data?.error ?? 'The budget didn’t save — try again.');
        return;
      }
      // Reflect immediately: the cached site manifest is what
      // inBudget() reads.
      patchSiteManifestInCache(siteId, { budget: merged });
    } catch {
      setBudgetError('The budget didn’t save — check your connection and try again.');
    } finally {
      setBudgetBusy(null);
    }
  }, [siteId, budgetLines]);

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

  // Quiet StatStrip (plan rule 3) — roster totals as 40px chips;
  // zeros collapse into one muted trailing chip. Past-due counts
  // every unpaid deposit/balance whose date has slipped.
  const overdueCount = vendors.reduce(
    (n, v) =>
      n +
      (v.depositDue && !v.depositPaid && v.depositDue < today ? 1 : 0) +
      (v.balanceDue && !v.balancePaid && v.balanceDue < today ? 1 : 0),
    0,
  );
  const statItems: StatStripItem[] = [
    { label: 'Booked', value: groups[1].rows.length, tone: 'sage' },
    { label: 'Paid', value: groups[2].rows.length },
    { label: 'Considering', value: groups[0].rows.length },
    { label: 'Past due', value: overdueCount, tone: 'plum' },
  ];

  return (
    <DashLayout active="vendors" hideTopbar>
      <PLAtmosphere />
      {/* Quiet header (plan rules 1 + 6): one line + StatStrip; the
          "everyone you've hired…" prose is gone (the empty state
          carries the invitation) and Add a vendor rides the
          actions row. */}
      <div style={{ padding: '16px clamp(20px, 4vw, 40px) 0', maxWidth: 1180, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <PageIntro
          eyebrow="Vendors"
          title="The vendor book."
          meta={!loading && !listLoading && vendors.length > 0 ? <StatStrip items={statItems} /> : undefined}
          actions={
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={!site?.id}
              onClick={() => { setForm({ mode: 'add' }); setFormError(null); }}
            >
              Add a vendor
            </button>
          }
          style={{ marginBottom: 16 }}
        />
      </div>
      <div
        style={{
          padding: '0 clamp(20px, 4vw, 40px) 60px',
          maxWidth: 1180,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
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
              Threading…
            </div>
          </PLCard>
        ) : !site?.id ? (
          <PLCard tone="sage" style={{ padding: '40px 24px', textAlign: 'center' }}>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                fontSize: 22,
                color: 'var(--sage-deep)',
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                marginBottom: 8,
              }}
            >
              Pick a celebration first.
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--ink-soft)', maxWidth: 420, margin: '0 auto', lineHeight: 1.55 }}>
              Open the celebration switcher in the sidebar to keep its vendor book.
            </div>
          </PLCard>
        ) : (
          <>
            {loadError && (
              <div role="alert" style={{ fontSize: 12.5, color: plum, lineHeight: 1.5 }}>
                The book didn&rsquo;t load — refresh to try again.
              </div>
            )}

            {/* ── Payment-schedule strip — what's due next ── */}
            {dues.length === 0 && hasSchedule && (
              <PLCard tone="paper" title="Due next" icon="calendar">
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--sage-deep)',
                  }}
                >
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

            {/* ── Add / edit form — opened from the header's
                Add a vendor action (plan rule 6). ── */}
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

            {/* ── Roster, grouped by status ── */}
            {vendors.length === 0 && !form ? (
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
            ) : (
              groups.map((g) =>
                g.rows.length === 0 ? null : (
                  <section key={g.status}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '6px 0 12px' }}>
                      <span className="eyebrow" style={{ margin: 0 }}>{g.label}</span>
                      <span
                        style={{
                          fontFamily: 'var(--pl-font-mono, monospace)',
                          fontSize: 11,
                          color: 'var(--ink-muted)',
                        }}
                      >
                        {g.rows.length}
                      </span>
                      <div aria-hidden style={{ flex: 1, height: 1, background: 'var(--line-soft)' }} />
                    </div>
                    <div
                      className="pd-vb-grid"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))',
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
              )
            )}

            {/* ── Quiet cross-link to the public directory ── */}
            <div style={{ fontSize: 13, color: 'var(--ink-muted)' }}>
              Browsing?{' '}
              <Link href="/vendors" style={{ color: 'var(--peach-ink, #C6703D)', fontWeight: 600, textDecoration: 'none' }}>
                The directory has ideas →
              </Link>
            </div>
          </>
        )}
      </div>
    </DashLayout>
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
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.25 }}>
            {v.name}
          </div>
          <span
            style={{
              display: 'inline-block',
              marginTop: 5,
              fontFamily: 'var(--pl-font-mono, monospace)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--sage-deep)',
              background: 'var(--sage-tint)',
              borderRadius: 999,
              padding: '3px 9px',
            }}
          >
            {v.category}
          </span>
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

      {/* ── Budget linkage + call sheet — booked/paid vendors only ── */}
      {v.status !== 'considering' && (
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px 14px' }}>
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
                  ? 'Threading…'
                  : 'Call sheet →'}
          </button>
        </div>
      )}
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
