'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / marketing/design/dash/TeamTasksPanel.tsx
//
// The Team — GRAND-PLAN Phase 3, Pillar 3. Turns the existing
// co-host roster into a real shared workspace: the team at the
// top (you + your co-hosts), then tasks toward the event grouped
// by who they're assigned to. Owner + editor + guest-manager can
// add / toggle / reassign / delete; viewers read only. Built on
// the existing co-host system — the roster comes from
// /api/sites/co-host, the tasks from /api/tasks (both gated by the
// same ownership/role model).
//
// Chrome-only tokens (the .pl8 dashboard family — --card / --ink /
// --line / --pl-gold …), never a site --t-* var. Brand primitives
// for the loader / dividers / empty state (BRAND §7/§8). Honesty
// rule: nothing here is a placeholder — an empty board says so.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useSession } from 'next-auth/react';
import { Thread } from '@/components/brand/Thread';
import { WeaveLoader } from '@/components/brand/WeaveLoader';
import { EmptyState } from '@/components/shell/EmptyState';
import { Icon, PearloomGlyph } from '@/components/pearloom/motifs';

const MONO = 'var(--pl-font-mono, ui-monospace, monospace)';
const DISPLAY = 'var(--font-display, "Fraunces", Georgia, serif)';

const card: CSSProperties = {
  background: 'var(--card)',
  border: '1px solid var(--card-ring, var(--line))',
  borderRadius: 16,
};

const ROLE_LABELS: Record<string, string> = {
  owner: 'Host',
  editor: 'Co-editor',
  'guest-manager': 'Guest manager',
  viewer: 'Viewer',
};

interface EventTask {
  id: string;
  siteId: string;
  title: string;
  detail: string | null;
  assigneeEmail: string | null;
  status: 'open' | 'done';
  dueOn: string | null;
  createdBy: string | null;
  sortIndex: number;
  createdAt: string;
  updatedAt: string;
}

interface CoHost {
  email: string;
  role: string;
}

interface TeamTasksPanelProps {
  siteId: string;
}

export function TeamTasksPanel({ siteId }: TeamTasksPanelProps) {
  const { data: session } = useSession();
  const myEmail = session?.user?.email?.toLowerCase().trim() ?? null;

  const [tasks, setTasks] = useState<EventTask[]>([]);
  const [team, setTeam] = useState<CoHost[]>([]);
  const [canWrite, setCanWrite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [draftTitle, setDraftTitle] = useState('');
  const [draftAssignee, setDraftAssignee] = useState('');
  const [draftDue, setDraftDue] = useState('');
  const [busy, setBusy] = useState(false);

  // Today as a local YYYY-MM-DD, once at mount (React Compiler: no
  // Date.now() in render — lazy init only). Used to flag overdue.
  const [todayIso] = useState(() => new Date().toISOString().slice(0, 10));

  // Load the task board (tagged with the siteId it was fetched for
  // so a site switch never shows a stale board).
  useEffect(() => {
    if (!siteId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/tasks?siteId=${encodeURIComponent(siteId)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`tasks ${r.status}`))))
      .then((data: { tasks?: EventTask[]; canWrite?: boolean }) => {
        if (cancelled) return;
        setTasks(Array.isArray(data.tasks) ? data.tasks : []);
        setCanWrite(!!data.canWrite);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [siteId]);

  // Load the co-host roster (owner-gated server-side; non-owners
  // simply don't get the list — the board still works).
  useEffect(() => {
    if (!siteId) return;
    let cancelled = false;
    fetch(`/api/sites/co-host?siteId=${encodeURIComponent(siteId)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { active?: CoHost[] } | null) => {
        if (!cancelled && data && Array.isArray(data.active)) setTeam(data.active);
      })
      .catch(() => {
        /* roster is a nicety — the board doesn't need it */
      });
    return () => {
      cancelled = true;
    };
  }, [siteId]);

  // The team: you first, then co-hosts (deduped by email).
  const roster = useMemo(() => {
    const seen = new Set<string>();
    const out: Array<{ email: string; role: string; you: boolean }> = [];
    if (myEmail) {
      out.push({ email: myEmail, role: 'owner', you: true });
      seen.add(myEmail);
    }
    for (const c of team) {
      const e = c.email.toLowerCase().trim();
      if (seen.has(e)) continue;
      seen.add(e);
      out.push({ email: e, role: c.role, you: false });
    }
    return out;
  }, [team, myEmail]);

  // Assignee options for the composer + per-row reassign: the team,
  // plus any assignee already on a task (so a member who left the
  // roster still shows), plus "Anyone".
  const assigneeOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of roster) map.set(m.email, m.you ? `You (${m.email})` : m.email);
    for (const t of tasks) {
      if (t.assigneeEmail && !map.has(t.assigneeEmail)) map.set(t.assigneeEmail, t.assigneeEmail);
    }
    return [...map.entries()].map(([email, label]) => ({ email, label }));
  }, [roster, tasks]);

  // Group tasks by assignee — open before done within a group; the
  // groups ordered you → other members → unassigned last.
  const groups = useMemo(() => {
    const byAssignee = new Map<string, EventTask[]>();
    for (const t of tasks) {
      const key = t.assigneeEmail ?? '';
      const arr = byAssignee.get(key) ?? [];
      arr.push(t);
      byAssignee.set(key, arr);
    }
    for (const arr of byAssignee.values()) {
      arr.sort((a, b) => {
        if (a.status !== b.status) return a.status === 'open' ? -1 : 1;
        if (a.sortIndex !== b.sortIndex) return a.sortIndex - b.sortIndex;
        return a.createdAt.localeCompare(b.createdAt);
      });
    }
    const keys = [...byAssignee.keys()].sort((a, b) => {
      if (a === '') return 1; // unassigned last
      if (b === '') return -1;
      if (myEmail && a === myEmail) return -1; // you first
      if (myEmail && b === myEmail) return 1;
      return a.localeCompare(b);
    });
    return keys.map((k) => ({ assignee: k || null, tasks: byAssignee.get(k) as EventTask[] }));
  }, [tasks, myEmail]);

  const openCount = useMemo(() => tasks.filter((t) => t.status === 'open').length, [tasks]);

  const addTask = useCallback(async () => {
    const title = draftTitle.trim();
    if (!title || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          task: { title, assigneeEmail: draftAssignee || null, dueOn: draftDue || null },
        }),
      });
      const data = await res.json();
      if (res.ok && data.task) {
        setTasks((prev) => [...prev, data.task as EventTask]);
        setDraftTitle('');
        setDraftDue('');
        // Keep the assignee selected — teams tend to add a run of
        // tasks for the same person.
      } else {
        setError(typeof data.error === 'string' ? data.error : 'Could not add the task.');
      }
    } catch {
      setError('Could not add the task.');
    } finally {
      setBusy(false);
    }
  }, [draftTitle, draftAssignee, draftDue, siteId, busy]);

  const toggle = useCallback(
    async (task: EventTask) => {
      const next = task.status === 'open' ? 'done' : 'open';
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: next } : t)));
      try {
        const res = await fetch('/api/tasks', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ siteId, id: task.id, status: next }),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (data.task) setTasks((prev) => prev.map((t) => (t.id === task.id ? (data.task as EventTask) : t)));
      } catch {
        setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t)));
      }
    },
    [siteId],
  );

  const reassign = useCallback(
    async (task: EventTask, assigneeEmail: string) => {
      const next = assigneeEmail || null;
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, assigneeEmail: next } : t)));
      try {
        const res = await fetch('/api/tasks', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ siteId, id: task.id, assigneeEmail: next }),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (data.task) setTasks((prev) => prev.map((t) => (t.id === task.id ? (data.task as EventTask) : t)));
      } catch {
        setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, assigneeEmail: task.assigneeEmail } : t)));
      }
    },
    [siteId],
  );

  /* Arm-then-confirm (the house pattern): the first tap arms the ×,
     the second deletes, 4s of inaction disarms. */
  const [removeArmed, setRemoveArmed] = useState<string | null>(null);
  const remove = useCallback(
    async (task: EventTask) => {
      if (removeArmed !== task.id) {
        setRemoveArmed(task.id);
        window.setTimeout(() => setRemoveArmed((a) => (a === task.id ? null : a)), 4000);
        return;
      }
      setRemoveArmed(null);
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      try {
        await fetch(`/api/tasks?siteId=${encodeURIComponent(siteId)}&id=${encodeURIComponent(task.id)}`, {
          method: 'DELETE',
        });
      } catch {
        /* board refetches on next mount */
      }
    },
    [siteId, removeArmed],
  );

  const labelFor = useCallback(
    (email: string | null): string => {
      if (!email) return 'Unassigned';
      if (myEmail && email === myEmail) return 'You';
      return email;
    },
    [myEmail],
  );

  return (
    <section style={{ ...card, padding: '28px 32px 32px' }} aria-label="The team and tasks">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <span className="eyebrow" style={{ margin: 0, display: 'block' }}>
            The team
          </span>
          <div style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 600, lineHeight: 1.16, color: 'var(--ink)', marginTop: 8 }}>
            Who&rsquo;s <span style={{ fontStyle: 'italic', color: 'var(--sage-deep)' }}>on it.</span>
          </div>
        </div>
        {!loading && tasks.length > 0 && (
          <span
            style={{
              fontFamily: MONO,
              fontSize: 9.5,
              letterSpacing: '0.14em',
              color: 'var(--ink-muted)',
              padding: '5px 10px',
              borderRadius: 999,
              background: 'var(--cream-3)',
              border: '1px solid var(--line)',
            }}
          >
            {openCount} OPEN · {tasks.length} TOTAL
          </span>
        )}
      </div>

      {/* Team roster — you + co-hosts */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
        {roster.map((m) => (
          <span
            key={m.email}
            title={m.email}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px 6px 8px',
              borderRadius: 999,
              background: m.you ? 'var(--sage-bg, var(--cream-2))' : 'var(--cream-2)',
              border: '1px solid var(--line)',
              fontSize: 12.5,
              color: 'var(--ink)',
              maxWidth: '100%',
            }}
          >
            <span
              aria-hidden
              style={{
                width: 22,
                height: 22,
                borderRadius: 999,
                flexShrink: 0,
                background: 'linear-gradient(135deg, var(--lavender-ink), var(--sage-deep))',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <PearloomGlyph size={11} color="var(--cream)" />
            </span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
              {m.you ? 'You' : m.email}
            </span>
            <span style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.1em', color: 'var(--ink-muted)', textTransform: 'uppercase' }}>
              {ROLE_LABELS[m.role] ?? m.role}
            </span>
          </span>
        ))}
        {roster.length <= 1 && (
          <span style={{ fontSize: 12.5, color: 'var(--ink-muted)', fontStyle: 'italic', alignSelf: 'center' }}>
            Just you so far — invite co-hosts from the site&rsquo;s Share panel.
          </span>
        )}
      </div>

      <Thread variant="straight" height={10} weight={1} style={{ margin: '22px 0' }} />

      {/* Add-task composer (write roles only) */}
      {canWrite && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void addTask();
          }}
          style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'stretch', marginBottom: 22 }}
        >
          <input
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            placeholder="Add a task toward the day…"
            maxLength={140}
            aria-label="Task title"
            style={{
              flex: '2 1 240px',
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid var(--line)',
              background: 'var(--card)',
              fontSize: 13,
              fontFamily: 'inherit',
              color: 'var(--ink)',
              outline: 'none',
            }}
          />
          <select
            value={draftAssignee}
            onChange={(e) => setDraftAssignee(e.target.value)}
            aria-label="Assign to"
            style={{
              flex: '1 1 150px',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid var(--line)',
              background: 'var(--card)',
              fontSize: 13,
              fontFamily: 'inherit',
              color: 'var(--ink)',
              outline: 'none',
            }}
          >
            <option value="">Anyone</option>
            {assigneeOptions.map((o) => (
              <option key={o.email} value={o.email}>
                {o.label}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={draftDue}
            onChange={(e) => setDraftDue(e.target.value)}
            aria-label="Due date"
            style={{
              flex: '0 1 150px',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid var(--line)',
              background: 'var(--card)',
              fontSize: 13,
              fontFamily: 'inherit',
              color: 'var(--ink)',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={busy || !draftTitle.trim()}
            className="btn btn-primary btn-sm"
            style={{ opacity: busy || !draftTitle.trim() ? 0.5 : 1, flex: '0 0 auto' }}
          >
            {busy ? 'Setting…' : 'Add task'}
          </button>
        </form>
      )}

      {error && (
        <div style={{ padding: '10px 14px', background: 'var(--peach-bg)', borderRadius: 10, fontSize: 12.5, color: 'var(--peach-ink)', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* The board */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
          <WeaveLoader size="md" label="Threading…" />
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          size="compact"
          title="Nothing yet. Begin a thread."
          description={
            canWrite
              ? 'Add the first task above and assign it to someone on the team.'
              : 'No tasks on the board yet.'
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {groups.map((group) => (
            <div key={group.assignee ?? '__unassigned'}>
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 9.5,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: group.assignee ? 'var(--sage-deep)' : 'var(--ink-muted)',
                  marginBottom: 8,
                }}
              >
                {labelFor(group.assignee)}
                <span style={{ color: 'var(--ink-muted)' }}> · {group.tasks.filter((t) => t.status === 'open').length} open</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {group.tasks.map((task, i) => {
                  const overdue = task.status === 'open' && task.dueOn !== null && task.dueOn < todayIso;
                  return (
                    <div
                      key={task.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '11px 2px',
                        borderTop: i ? '1px solid var(--line-soft)' : 'none',
                      }}
                    >
                      {/* Pearl toggle — the on/off atom */}
                      <button
                        type="button"
                        onClick={() => canWrite && void toggle(task)}
                        disabled={!canWrite}
                        aria-label={task.status === 'done' ? 'Mark as open' : 'Mark as done'}
                        aria-pressed={task.status === 'done'}
                        style={{
                          width: 20,
                          height: 20,
                          flexShrink: 0,
                          borderRadius: 999,
                          border: task.status === 'done' ? '1.5px solid var(--sage-deep)' : '1.5px solid var(--line)',
                          background: task.status === 'done' ? 'var(--sage-deep)' : 'transparent',
                          display: 'grid',
                          placeItems: 'center',
                          cursor: canWrite ? 'pointer' : 'default',
                          padding: 0,
                        }}
                      >
                        {task.status === 'done' && <Icon name="check" size={11} strokeWidth={3} color="var(--cream)" />}
                      </button>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 500,
                            color: task.status === 'done' ? 'var(--ink-muted)' : 'var(--ink)',
                            textDecoration: task.status === 'done' ? 'line-through' : 'none',
                            lineHeight: 1.3,
                          }}
                        >
                          {task.title}
                        </div>
                        {(task.detail || task.dueOn) && (
                          <div style={{ fontSize: 12, color: overdue ? 'var(--peach-ink)' : 'var(--ink-muted)', marginTop: 2 }}>
                            {task.detail && <span>{task.detail}</span>}
                            {task.detail && task.dueOn && <span> · </span>}
                            {task.dueOn && (
                              <span>
                                {overdue ? 'Overdue · ' : 'Due '}
                                {new Date(`${task.dueOn}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {canWrite && (
                        <>
                          <select
                            value={task.assigneeEmail ?? ''}
                            onChange={(e) => void reassign(task, e.target.value)}
                            aria-label="Reassign task"
                            style={{
                              flex: '0 0 auto',
                              maxWidth: 150,
                              padding: '5px 8px',
                              borderRadius: 8,
                              border: '1px solid var(--line)',
                              background: 'var(--cream-2)',
                              fontSize: 11.5,
                              fontFamily: 'inherit',
                              color: 'var(--ink-soft)',
                              outline: 'none',
                            }}
                          >
                            <option value="">Anyone</option>
                            {assigneeOptions.map((o) => (
                              <option key={o.email} value={o.email}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => void remove(task)}
                            aria-label={removeArmed === task.id ? 'Tap again to remove the task' : 'Remove task'}
                            title={removeArmed === task.id ? 'Tap again to remove' : 'Remove task'}
                            style={{
                              flexShrink: 0,
                              width: 26,
                              height: 26,
                              display: 'grid',
                              placeItems: 'center',
                              borderRadius: 8,
                              border: removeArmed === task.id ? '1px solid var(--plum, #C6563D)' : '1px solid transparent',
                              background: 'transparent',
                              color: removeArmed === task.id ? 'var(--plum, #C6563D)' : 'var(--ink-muted)',
                              cursor: 'pointer',
                            }}
                          >
                            <Icon name="close" size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
