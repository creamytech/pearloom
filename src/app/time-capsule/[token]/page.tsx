// ─────────────────────────────────────────────────────────────
// Pearloom / app/time-capsule/[token]/page.tsx
// Love Letter Time Capsule unlock/read page
// ─────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic';

import { CapsuleReveal } from './CapsuleReveal';
import { parseLocalDate } from '@/lib/date';

interface CapsuleData {
  letter?: string;
  fromName?: string;
  toName?: string;
  unlockDate?: string;
  createdAt?: string;
  error?: string;
  daysRemaining?: number;
}

async function fetchCapsule(token: string): Promise<CapsuleData> {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000';

    const res = await fetch(
      `${baseUrl}/api/time-capsule?token=${encodeURIComponent(token)}`,
      { cache: 'no-store' }
    );
    const json = await res.json();
    return json as CapsuleData;
  } catch {
    return { error: 'fetch_failed' };
  }
}

function formatDate(dateStr: string): string {
  try {
    return parseLocalDate(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function googleCalendarUrl(unlockDate: string, fromName: string, toName: string): string {
  const d = new Date(unlockDate);
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr =
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;

  const title = encodeURIComponent(`Open Love Letter from ${fromName} to ${toName}`);
  const details = encodeURIComponent(
    'Your sealed love letter from Pearloom is ready to open today.'
  );
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dateStr}/${dateStr}&details=${details}`;
}

export default async function TimeCapsulePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await fetchCapsule(token);

  // ── Still sealed ───────────────────────────────────────────────────────────
  if (data.error === 'sealed') {
    const calUrl = googleCalendarUrl(
      data.unlockDate ?? new Date().toISOString(),
      data.fromName ?? 'Someone special',
      data.toName ?? 'You'
    );

    return (
      <div style={sealedStyles.page}>
        <div style={sealedStyles.card}>
          <div style={sealedStyles.lockIcon}>🔒</div>
          <h1 style={sealedStyles.heading}>This Letter Is Still Sealed</h1>
          <p style={sealedStyles.body}>
            This love letter will open on{' '}
            <strong style={sealedStyles.highlight}>
              {data.unlockDate ? formatDate(data.unlockDate) : 'a future date'}
            </strong>
            .
          </p>
          <p style={sealedStyles.sub}>
            Come back in{' '}
            <strong style={sealedStyles.highlight}>
              {data.daysRemaining}{' '}
              {data.daysRemaining === 1 ? 'day' : 'days'}
            </strong>{' '}
            when it&apos;s ready.
          </p>
          <a href={calUrl} target="_blank" rel="noopener noreferrer" style={sealedStyles.calBtn}>
            Set a reminder →
          </a>
        </div>
      </div>
    );
  }

  // ── Not found / error ─────────────────────────────────────────────────────
  if (data.error || !data.letter) {
    return (
      <div style={sealedStyles.page}>
        <div style={sealedStyles.card}>
          <div style={sealedStyles.lockIcon}>💔</div>
          <h1 style={sealedStyles.heading}>Letter Not Found</h1>
          <p style={sealedStyles.body}>
            We couldn&apos;t find this letter. It may have been removed, or the link
            might be incorrect.
          </p>
        </div>
      </div>
    );
  }

  // ── Letter is ready to open ───────────────────────────────────────────────
  return (
    <CapsuleReveal
      letter={data.letter}
      fromName={data.fromName ?? ''}
      toName={data.toName ?? ''}
      unlockDate={data.unlockDate ?? ''}
      createdAt={data.createdAt ?? ''}
    />
  );
}

// ── Sealed page styles ────────────────────────────────────────────────────────

const sealedStyles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#1C1916',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  card: {
    background: 'rgba(214,198,168,0.06)',
    border: '1px solid rgba(214,198,168,0.18)',
    borderRadius: '16px',
    padding: '48px 40px',
    maxWidth: '440px',
    width: '100%',
    textAlign: 'center',
  },
  lockIcon: {
    fontSize: '48px',
    marginBottom: '20px',
  },
  heading: {
    margin: '0 0 16px 0',
    fontSize: '22px',
    fontWeight: 600,
    color: 'var(--pl-muted)',
    lineHeight: 1.3,
  },
  body: {
    fontSize: '15px',
    color: 'rgba(214,198,168,0.7)',
    lineHeight: 1.6,
    margin: '0 0 12px 0',
  },
  sub: {
    fontSize: '14px',
    color: 'rgba(214,198,168,0.5)',
    margin: '0 0 28px 0',
  },
  highlight: {
    color: 'var(--pl-muted)',
    fontWeight: 600,
  },
  calBtn: {
    display: 'inline-block',
    background: 'rgba(214,198,168,0.1)',
    border: '1px solid rgba(214,198,168,0.25)',
    borderRadius: '8px',
    color: 'var(--pl-muted)',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
    padding: '10px 22px',
  },
};
