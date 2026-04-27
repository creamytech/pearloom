'use client';

// ─────────────────────────────────────────────────────────────
// DecorGenerationToast — floating bottom-right pill that shows
// every in-flight AI decor job. Lets the host navigate away
// from the Theme tab and keep editing while Pear paints in
// the background.
//
// Each row in the stack represents one job (divider, section
// stamps, hero flourish, etc.). Running jobs get a pulsing
// gold dot; done jobs flash a sage check and self-evict
// after 4.5s; errored jobs stay until dismissed and surface
// the API's error string.
// ─────────────────────────────────────────────────────────────

import { useDecorJobs, dismissDecorJob, type DecorJob } from '@/lib/decor-bus';

export function DecorGenerationToast() {
  const jobs = useDecorJobs();
  if (jobs.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 'clamp(16px, 2vw, 24px)',
        right: 'clamp(16px, 2vw, 24px)',
        zIndex: 70,
        display: 'flex',
        flexDirection: 'column-reverse',
        gap: 8,
        maxWidth: 360,
        pointerEvents: 'none',
      }}
    >
      {jobs.map((job) => (
        <DecorJobRow key={job.id} job={job} />
      ))}
    </div>
  );
}

function DecorJobRow({ job }: { job: DecorJob }) {
  const elapsed = Math.max(0, ((job.endedAt ?? Date.now()) - job.startedAt) / 1000);
  const tone =
    job.status === 'running'
      ? { bg: 'rgba(14,13,11,0.92)', dot: 'var(--gold, #B8935A)', label: 'Painting' }
      : job.status === 'done'
        ? { bg: 'rgba(92,107,63,0.95)', dot: 'rgba(255,255,255,0.95)', label: 'Ready' }
        : { bg: 'rgba(122,45,45,0.95)', dot: 'rgba(255,255,255,0.95)', label: 'Failed' };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 10px 10px 14px',
        borderRadius: 999,
        background: tone.bg,
        color: 'rgba(243,233,212,0.95)',
        boxShadow: '0 16px 36px rgba(14,13,11,0.32), 0 0 0 1px rgba(184,147,90,0.18)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        fontFamily: 'var(--font-ui)',
        fontSize: 12.5,
        fontWeight: 600,
        animation: 'pl-enter-up 240ms cubic-bezier(0.22, 1, 0.36, 1) both',
        pointerEvents: 'auto',
        maxWidth: 360,
      }}
    >
      <span
        aria-hidden
        style={{
          display: 'inline-grid',
          placeItems: 'center',
          width: 10,
          height: 10,
          borderRadius: 999,
          background: tone.dot,
          flexShrink: 0,
          animation: job.status === 'running' ? 'pl-dot-pulse 1.4s ease-in-out infinite' : undefined,
          boxShadow: job.status === 'running'
            ? `0 0 12px ${tone.dot}, 0 0 0 0 ${tone.dot}`
            : undefined,
        }}
      >
        {job.status === 'done' && (
          <svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" style={{ color: tone.bg }}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            opacity: 0.62,
            marginBottom: 1,
          }}
        >
          {tone.label}
          {job.status === 'running' && elapsed >= 1 && ` · ${Math.round(elapsed)}s`}
        </div>
        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {job.label}
          {job.status === 'error' && job.error && (
            <span style={{ opacity: 0.78, fontWeight: 500 }}> · {job.error}</span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => dismissDecorJob(job.id)}
        aria-label="Dismiss"
        style={{
          width: 22,
          height: 22,
          borderRadius: 999,
          background: 'transparent',
          border: 'none',
          color: 'rgba(243,233,212,0.55)',
          cursor: 'pointer',
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
        }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
