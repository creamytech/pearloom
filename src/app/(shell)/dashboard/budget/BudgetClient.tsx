'use client';

// ─────────────────────────────────────────────────────────────
// The Budget — /dashboard/budget
//
// The rich, cents-precise ledger the whole product plans against
// (GRAND-PLAN Phase 0). Backed by /api/sites/budget/lines
// (budget_lines table): planned ↔ committed ↔ paid per line,
// expense vs. income kept legible and never netted, and vendor
// lines woven in straight from the Vendor Book.
//
// This is the DEEP budget. The cockpit's quick "back-of-napkin"
// budget (manifest.budget) is a SEPARATE store — the two never
// sync. When this ledger is empty a host can seed it from the
// occasion's default categories OR bring their quick budget over.
//
// Money honesty: every figure is host-entered cents rendered as
// plain dollars. Null stays blank — never a fabricated $0.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DashLayout } from '@/components/pearloom/dash/DashShell';
import { PLAtmosphere, PLCard } from '@/components/pearloom/dash/PLChrome';
import { PageIntro } from '@/components/pearloom/dash/QuietDash';
import { Thread } from '@/components/brand/Thread';
import { WeaveLoader } from '@/components/brand/WeaveLoader';
import { Icon } from '@/components/pearloom/motifs';
import { useSelectedSite } from '@/components/marketing/design/dash/hooks';
import { EmptyShell } from '@/components/marketing/design/dash/DashShell';
import { budgetCategoriesFor } from '@/lib/event-os/budget-categories';
import { rollupBudget, type BudgetLine, type BudgetLineInput, type BudgetKind } from '@/lib/budget/lines';
import { HeroPlate, PlateAction } from '@/components/shell';

// ── Money ─────────────────────────────────────────────────────
// Host-entered cents → plain "$1,200". Whole dollars unless the
// host typed cents. Null stays blank ("—") — never a recorded $0.

function fmtMoney(cents: number): string {
  const whole = cents % 100 === 0;
  return '$' + (cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  });
}

function dollarsToCents(s: string): number | null {
  const n = Number(s.replace(/[$,\s]/g, ''));
  if (!s.trim() || !Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function centsToDollarsInput(c: number | null | undefined): string {
  if (c == null) return '';
  return String(c % 100 === 0 ? c / 100 : (c / 100).toFixed(2));
}

// ── Shared styles (the Vendor Book vocabulary) ────────────────

const field: React.CSSProperties = {
  border: '1px solid var(--line)', background: 'var(--cream)', borderRadius: 8,
  padding: '7px 10px', fontSize: 13, color: 'var(--ink)',
  fontFamily: 'var(--font-ui, inherit)', outline: 'none', width: '100%', boxSizing: 'border-box',
};
const fieldLabel: React.CSSProperties = {
  fontSize: 11.5, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 4, display: 'block',
};
const MONO = 'var(--pl-font-mono, monospace)';
const plum = 'var(--plum, #C6563D)';

// The working shape of the add/edit form — dollars as strings so
// the host types freely; converted to cents on save.
interface LineDraft {
  category: string;
  label: string;
  kind: BudgetKind;
  planned: string;
  committed: string;
  paid: string;
}

const EMPTY_DRAFT: LineDraft = {
  category: '', label: '', kind: 'expense', planned: '', committed: '', paid: '',
};

function draftFrom(l: BudgetLine): LineDraft {
  return {
    category: l.category,
    label: l.label ?? '',
    kind: l.kind,
    planned: centsToDollarsInput(l.plannedCents),
    committed: centsToDollarsInput(l.committedCents),
    paid: centsToDollarsInput(l.paidCents),
  };
}

// ── The page ──────────────────────────────────────────────────

export function BudgetClient() {
  const { site, loading } = useSelectedSite();
  const siteId = site?.id ?? '';
  const occasion = site?.occasion;

  // Ledger, tagged with the site it was fetched for so `listLoading`
  // is a derived render-time flag (the Vendor Book pattern).
  const [result, setResult] = useState<{ siteId: string; lines: BudgetLine[] } | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!siteId) return;
    let cancelled = false;
    fetch(`/api/sites/budget/lines?siteId=${encodeURIComponent(siteId)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load failed'))))
      .then((data: { lines?: BudgetLine[] }) => {
        if (cancelled) return;
        setResult({ siteId, lines: data.lines ?? [] });
        setLoadError(false);
      })
      .catch(() => {
        if (cancelled) return;
        setResult({ siteId, lines: [] });
        setLoadError(true);
      });
    return () => { cancelled = true; };
  }, [siteId]);

  const listLoading = !!siteId && result?.siteId !== siteId;
  const lines = useMemo(
    () => (result?.siteId === siteId ? result.lines : []),
    [result, siteId],
  );

  const setLines = useCallback((update: (prev: BudgetLine[]) => BudgetLine[]) => {
    setResult((r) => (r && r.siteId === siteId ? { ...r, lines: update(r.lines) } : r));
  }, [siteId]);

  // The cockpit's quick budget (manifest.budget = [{cat,used,cap}] in
  // dollars) — read-only here, offered as a one-tap import when this
  // ledger is empty. A SEPARATE store; we never write it back.
  const quickBudget = useMemo<Array<{ cat: string; used: number; cap: number }>>(() => {
    const raw = (site?.manifest as { budget?: unknown } | undefined)?.budget;
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((l): l is { cat: string; used: number; cap: number } =>
        !!l && typeof l === 'object' && typeof (l as { cat?: unknown }).cat === 'string')
      .map((l) => ({ cat: l.cat, used: Number(l.used) || 0, cap: Number(l.cap) || 0 }));
  }, [site]);

  // ── Form + write state ──
  const [form, setForm] = useState<{ mode: 'add' } | { mode: 'edit'; line: BudgetLine } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);

  // Upsert one line; merges the saved row into place (replace by id,
  // else append). Returns the saved line or null.
  const postLine = useCallback(async (input: BudgetLineInput & { id?: string }): Promise<BudgetLine | null> => {
    if (!siteId) return null;
    const res = await fetch('/api/sites/budget/lines', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ siteId, line: input }),
    }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { ok?: boolean; line?: BudgetLine; error?: string } | null;
    if (!res?.ok || !data?.ok || !data.line) return null;
    const saved = data.line;
    setLines((prev) =>
      prev.some((l) => l.id === saved.id)
        ? prev.map((l) => (l.id === saved.id ? saved : l))
        : [...prev, saved],
    );
    return saved;
  }, [siteId, setLines]);

  const saveDraft = useCallback(async (draft: LineDraft) => {
    const category = draft.category.trim();
    if (!category) {
      setFormError('A category is the one line every entry needs.');
      return;
    }
    setSaving(true);
    setFormError(null);
    const editing = form?.mode === 'edit' ? form.line : null;
    const input: BudgetLineInput & { id?: string } = {
      category,
      label: draft.label.trim() || null,
      kind: draft.kind,
      plannedCents: dollarsToCents(draft.planned),
      committedCents: dollarsToCents(draft.committed),
      paidCents: dollarsToCents(draft.paid),
      // Preserve a vendor line's link on edit; a hand-added line is manual.
      sourceKind: editing?.sourceKind ?? 'manual',
      sourceId: editing?.sourceId ?? null,
      sortIndex: editing?.sortIndex,
      ...(editing ? { id: editing.id } : {}),
    };
    const saved = await postLine(input);
    setSaving(false);
    if (!saved) {
      setFormError('That didn’t save — check your connection and try again.');
      return;
    }
    setForm(null);
  }, [form, postLine]);

  const removeLine = useCallback(async (id: string) => {
    if (!siteId) return;
    setOpError(null);
    const res = await fetch(
      `/api/sites/budget/lines?siteId=${encodeURIComponent(siteId)}&id=${encodeURIComponent(id)}`,
      { method: 'DELETE' },
    ).catch(() => null);
    if (res?.ok) {
      setLines((prev) => prev.filter((l) => l.id !== id));
    } else {
      setOpError('That line didn’t clear — try again.');
    }
  }, [siteId, setLines]);

  // ── Seed the empty ledger ──
  // Template: blank expense lines for the occasion's default
  // categories — categories only, NO invented amounts (the host
  // fills them). Import: the quick budget's real host-typed figures.
  const seedFromTemplate = useCallback(async () => {
    setSeeding(true);
    setOpError(null);
    const cats = budgetCategoriesFor(occasion);
    let anyFailed = false;
    for (let i = 0; i < cats.length; i += 1) {
      const ok = await postLine({
        category: cats[i], label: null, kind: 'expense',
        plannedCents: null, committedCents: null, paidCents: null,
        sourceKind: 'manual', sourceId: null, sortIndex: i,
      });
      if (!ok) anyFailed = true;
    }
    setSeeding(false);
    if (anyFailed) setOpError('Some lines didn’t save — refresh and try again.');
  }, [occasion, postLine]);

  const importQuickBudget = useCallback(async () => {
    setSeeding(true);
    setOpError(null);
    let anyFailed = false;
    for (let i = 0; i < quickBudget.length; i += 1) {
      const q = quickBudget[i];
      const ok = await postLine({
        category: q.cat, label: null, kind: 'expense',
        plannedCents: null,
        committedCents: q.cap > 0 ? Math.round(q.cap * 100) : null,
        paidCents: q.used > 0 ? Math.round(q.used * 100) : null,
        sourceKind: 'manual', sourceId: null, sortIndex: i,
      });
      if (!ok) anyFailed = true;
    }
    setSeeding(false);
    if (anyFailed) setOpError('Some lines didn’t come over — refresh and try again.');
  }, [quickBudget, postLine]);

  // ── Derived views ──
  const rollup = useMemo(() => rollupBudget(lines), [lines]);
  const expenseLines = useMemo(() => lines.filter((l) => l.kind !== 'income'), [lines]);
  const incomeLines = useMemo(() => lines.filter((l) => l.kind === 'income'), [lines]);

  // Expense lines grouped by category, insertion order preserved.
  const categoryGroups = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, BudgetLine[]>();
    for (const l of expenseLines) {
      const key = l.category || 'Other';
      if (!map.has(key)) { map.set(key, []); order.push(key); }
      map.get(key)!.push(l);
    }
    return order.map((cat) => ({ cat, rows: map.get(cat)! }));
  }, [expenseLines]);

  const isEmpty = lines.length === 0;

  return (
    <DashLayout active="budget" hideTopbar>
      <PLAtmosphere />
      {/* The pressed plate (TASTE-PLAN T.3) — the rollup IS the
          route's headline; the ledger below stays quiet paper. */}
      <div style={{ padding: '16px var(--pl-dash-pad) 0', maxWidth: 'var(--pl-dash-maxw)', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <HeroPlate
          eyebrow="Budget"
          title="The budget."
          figures={!isEmpty ? [
            { label: 'Planned', value: fmtMoney(rollup.plannedCents), raw: rollup.plannedCents },
            { label: 'Committed', value: fmtMoney(rollup.committedCents), raw: rollup.committedCents },
            { label: 'Paid', value: fmtMoney(rollup.paidCents), raw: rollup.paidCents },
          ] : undefined}
          actions={!isEmpty && site?.id ? (
            <PlateAction primary onClick={() => { setForm({ mode: 'add' }); setFormError(null); }}>
              Add a line
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
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {loading || listLoading ? (
          <PLCard tone="paper" style={{ padding: 60, display: 'grid', placeItems: 'center' }}>
            <WeaveLoader size="md" label="Threading…" />
          </PLCard>
        ) : !site?.id ? (
          <EmptyShell
            inline
            cta={null}
            message="Pick a celebration first — the switcher in the sidebar keeps its budget."
          />
        ) : (
          <>
            {loadError && (
              <div role="alert" style={{ fontSize: 12.5, color: plum, lineHeight: 1.5 }}>
                The budget didn&rsquo;t load — refresh to try again.
              </div>
            )}

            {/* Totals — the running figures from the ledger rollup */}
            {!isEmpty && <TotalsCard rollup={rollup} />}

            {/* Add / edit form */}
            {form && (
              <LineForm
                key={form.mode === 'edit' ? form.line.id : 'add'}
                initial={form.mode === 'edit' ? draftFrom(form.line) : EMPTY_DRAFT}
                heading={form.mode === 'edit' ? `Edit ${form.line.label || form.line.category}` : 'Add a line'}
                categorySuggestions={budgetCategoriesFor(occasion)}
                saving={saving}
                error={formError}
                onCancel={() => { setForm(null); setFormError(null); }}
                onSave={saveDraft}
              />
            )}

            {opError && (
              <div role="alert" style={{ fontSize: 12.5, color: plum, lineHeight: 1.5 }}>
                {opError}
              </div>
            )}

            {isEmpty && !form ? (
              <EmptyLedger
                categories={budgetCategoriesFor(occasion)}
                hasQuickBudget={quickBudget.length > 0}
                seeding={seeding}
                onSeedTemplate={seedFromTemplate}
                onImportQuick={importQuickBudget}
                onAddLine={() => { setForm({ mode: 'add' }); setFormError(null); }}
              />
            ) : (
              <>
                {/* Expenses, grouped by category */}
                {categoryGroups.map((g) => (
                  <section key={g.cat}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '2px 0 12px' }}>
                      <span className="eyebrow" style={{ margin: 0 }}>{g.cat}</span>
                      <CategorySubtotal rows={g.rows} />
                      <div aria-hidden style={{ flex: 1 }}>
                        <Thread variant="straight" height={6} weight={0.75} style={{ opacity: 0.6 }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {g.rows.map((l) => (
                        <LineRow
                          key={l.id}
                          line={l}
                          onEdit={() => { setForm({ mode: 'edit', line: l }); setFormError(null); }}
                          onRemove={() => removeLine(l.id)}
                        />
                      ))}
                    </div>
                  </section>
                ))}

                {/* Income — tracked separately, never netted against spend */}
                {incomeLines.length > 0 && (
                  <section>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '2px 0 12px' }}>
                      <span className="eyebrow" style={{ margin: 0 }}>Coming in</span>
                      <span style={{ fontFamily: MONO, fontSize: 11, color: 'var(--sage-deep)' }}>
                        {fmtMoney(rollup.incomeCents)}
                      </span>
                      <div aria-hidden style={{ flex: 1 }}>
                        <Thread variant="straight" height={6} weight={0.75} style={{ opacity: 0.6 }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {incomeLines.map((l) => (
                        <LineRow
                          key={l.id}
                          line={l}
                          onEdit={() => { setForm({ mode: 'edit', line: l }); setFormError(null); }}
                          onRemove={() => removeLine(l.id)}
                        />
                      ))}
                    </div>
                  </section>
                )}

                <div style={{ fontSize: 12.5, color: 'var(--ink-muted)', lineHeight: 1.55 }}>
                  Every figure here is yours — Pearloom keeps the ledger and never touches the money.
                </div>
              </>
            )}
          </>
        )}
      </div>
    </DashLayout>
  );
}

// ── Totals card ───────────────────────────────────────────────

function TotalsCard({ rollup }: { rollup: ReturnType<typeof rollupBudget> }) {
  const remaining = rollup.remainingCents;
  const stats: Array<{ label: string; cents: number; color?: string; note?: string }> = [
    { label: 'Planned', cents: rollup.plannedCents },
    {
      label: 'Committed',
      cents: rollup.committedCents,
      color: rollup.overBudget ? plum : undefined,
      note: rollup.overBudget && rollup.plannedCents > 0
        ? `Over your plan by ${fmtMoney(rollup.committedCents - rollup.plannedCents)}`
        : undefined,
    },
    { label: 'Paid', cents: rollup.paidCents },
    { label: 'Still to pay', cents: remaining, color: 'var(--sage-deep)' },
  ];
  return (
    <PLCard tone="paper">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: 16,
        }}
      >
        {stats.map((s) => (
          <div key={s.label}>
            <div style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
              {s.label}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, lineHeight: 1.1, marginTop: 4, color: s.color ?? 'var(--ink)' }}>
              {fmtMoney(s.cents)}
            </div>
            {s.note && (
              <div style={{ marginTop: 3, fontSize: 11.5, color: plum, lineHeight: 1.4 }}>{s.note}</div>
            )}
          </div>
        ))}
      </div>
      {rollup.incomeCents > 0 && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--line-soft)', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--ink-soft)' }}>
            <Icon name="gift" size={13} /> Coming in
          </span>
          <span style={{ fontFamily: MONO, fontSize: 13, color: 'var(--sage-deep)' }}>{fmtMoney(rollup.incomeCents)}</span>
        </div>
      )}
    </PLCard>
  );
}

function CategorySubtotal({ rows }: { rows: BudgetLine[] }) {
  const committed = rows.reduce((a, b) => a + (b.committedCents ?? 0), 0);
  const planned = rows.reduce((a, b) => a + (b.plannedCents ?? 0), 0);
  const shown = committed || planned;
  if (shown <= 0) return null;
  return <span style={{ fontFamily: MONO, fontSize: 11, color: 'var(--ink-muted)' }}>{fmtMoney(shown)}</span>;
}

// ── One ledger line ───────────────────────────────────────────

function LineRow({ line: l, onEdit, onRemove }: { line: BudgetLine; onEdit: () => void; onRemove: () => void }) {
  const [armed, setArmed] = useState(false);
  const linked = l.sourceKind === 'vendor';
  const over = (l.committedCents ?? 0) > 0 && (l.plannedCents ?? 0) > 0 && (l.committedCents ?? 0) > (l.plannedCents ?? 0);

  const money = (label: string, cents: number | null | undefined, color?: string) => (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
        {label}
      </div>
      <div style={{ fontFamily: MONO, fontSize: 13, marginTop: 2, color: cents == null ? 'var(--ink-muted)' : (color ?? 'var(--ink)') }}>
        {cents == null ? '—' : fmtMoney(cents)}
      </div>
    </div>
  );

  return (
    <PLCard tone="paper" style={{ padding: '13px 15px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 160px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {l.label || l.category}
            </span>
            {linked && (
              <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--lavender-ink, #6B5B8A)', background: 'var(--lavender-bg)', borderRadius: 999, padding: '2px 8px' }}>
                From the vendor book
              </span>
            )}
          </div>
          {l.label && l.label !== l.category && (
            <div style={{ marginTop: 2, fontSize: 12, color: 'var(--ink-muted)' }}>{l.category}</div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 18, flexShrink: 0 }}>
          {money('Planned', l.plannedCents)}
          {money('Committed', l.committedCents, over ? plum : undefined)}
          {money('Paid', l.paidCents)}
        </div>

        <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'center' }}>
          <button type="button" onClick={onEdit} aria-label={`Edit ${l.label || l.category}`} style={iconBtn}>
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
            <button type="button" onClick={() => setArmed(true)} aria-label={`Remove ${l.label || l.category}`} style={{ ...iconBtn, color: plum }}>
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

// ── Empty ledger — the "Nothing yet. Begin a thread." key ─────

function EmptyLedger({
  categories,
  hasQuickBudget,
  seeding,
  onSeedTemplate,
  onImportQuick,
  onAddLine,
}: {
  categories: string[];
  hasQuickBudget: boolean;
  seeding: boolean;
  onSeedTemplate: () => void;
  onImportQuick: () => void;
  onAddLine: () => void;
}) {
  return (
    <PLCard tone="paper" style={{ padding: '40px 24px', textAlign: 'center' }}>
      <div
        style={{
          fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 22,
          color: 'var(--ink)', fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1', marginBottom: 10,
        }}
      >
        Nothing yet. Begin a thread.
      </div>
      <Thread variant="weave" width="64px" height={12} weight={1} style={{ margin: '0 auto 14px' }} />
      <div style={{ fontSize: 13.5, color: 'var(--ink-soft)', maxWidth: 460, margin: '0 auto 20px', lineHeight: 1.55 }}>
        One ledger for the whole celebration — planned, committed, and paid, with your vendors woven in.
        {categories.length > 0 && (
          <> Start from the lines this day usually plans: <span style={{ color: 'var(--ink)' }}>{categories.slice(0, 4).join(', ')}</span>{categories.length > 4 ? '…' : '.'}</>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-primary btn-sm" disabled={seeding} onClick={onSeedTemplate}>
          {seeding ? 'Threading…' : 'Start from a template'}
        </button>
        {hasQuickBudget && (
          <button type="button" className="btn btn-outline btn-sm" disabled={seeding} onClick={onImportQuick}>
            Bring in your quick budget
          </button>
        )}
        <button type="button" className="btn btn-outline btn-sm" disabled={seeding} onClick={onAddLine}>
          <Icon name="plus" size={12} /> Add a line
        </button>
      </div>
    </PLCard>
  );
}

// ── The add / edit form ───────────────────────────────────────

function LineForm({
  initial,
  heading,
  categorySuggestions,
  saving,
  error,
  onCancel,
  onSave,
}: {
  initial: LineDraft;
  heading: string;
  categorySuggestions: string[];
  saving: boolean;
  error: string | null;
  onCancel: () => void;
  onSave: (draft: LineDraft) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const set = (patch: Partial<LineDraft>) => setDraft((d) => ({ ...d, ...patch }));

  return (
    <PLCard tone="paper" title={heading}>
      <div className="pd-budget-form" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={fieldLabel} htmlFor="bl-category">Category</label>
          <input id="bl-category" value={draft.category} placeholder={categorySuggestions[0] ?? 'Venue'} onChange={(e) => set({ category: e.target.value })} style={field} />
          {categorySuggestions.length > 0 && (
            <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {categorySuggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set({ category: s })}
                  style={{
                    border: `1px solid ${draft.category === s ? 'var(--sage-deep)' : 'var(--line-soft)'}`,
                    background: draft.category === s ? 'var(--sage-tint)' : 'transparent',
                    color: draft.category === s ? 'var(--sage-deep)' : 'var(--ink-soft)',
                    borderRadius: 999, padding: '3px 10px', fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <label style={fieldLabel} htmlFor="bl-label">Label (optional)</label>
          <input id="bl-label" value={draft.label} placeholder="Rosewood Catering" onChange={(e) => set({ label: e.target.value })} style={field} />
        </div>
        <div>
          <label style={fieldLabel} htmlFor="bl-kind">Kind</label>
          <select
            id="bl-kind"
            value={draft.kind}
            onChange={(e) => set({ kind: e.target.value as BudgetKind })}
            style={{ ...field, appearance: 'auto' }}
          >
            <option value="expense">Going out</option>
            <option value="income">Coming in</option>
          </select>
        </div>
        <div />
        <div>
          <label style={fieldLabel} htmlFor="bl-planned">Planned ($)</label>
          <input id="bl-planned" inputMode="decimal" value={draft.planned} placeholder="5,000" onChange={(e) => set({ planned: e.target.value })} style={field} />
        </div>
        <div>
          <label style={fieldLabel} htmlFor="bl-committed">Committed ($)</label>
          <input id="bl-committed" inputMode="decimal" value={draft.committed} placeholder="4,800" onChange={(e) => set({ committed: e.target.value })} style={field} />
        </div>
        <div>
          <label style={fieldLabel} htmlFor="bl-paid">Paid ($)</label>
          <input id="bl-paid" inputMode="decimal" value={draft.paid} placeholder="2,400" onChange={(e) => set({ paid: e.target.value })} style={field} />
        </div>
      </div>
      {error && (
        <div role="alert" style={{ marginTop: 10, fontSize: 12.5, color: plum, lineHeight: 1.5 }}>
          {error}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button type="button" className="btn btn-primary btn-sm" disabled={saving} onClick={() => onSave(draft)}>
          {saving ? 'Saving…' : 'Set the line'}
        </button>
        <button type="button" className="btn btn-outline btn-sm" disabled={saving} onClick={onCancel}>
          Cancel
        </button>
      </div>
      <style jsx>{`
        @media (max-width: 640px) {
          :global(.pd-budget-form) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </PLCard>
  );
}
