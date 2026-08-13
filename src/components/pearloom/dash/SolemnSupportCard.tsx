'use client';

// ─────────────────────────────────────────────────────────────
// SolemnSupportCard — a person, not a help centre.
//
// From the synthesis (§3, R2): a free tier plus a solemn occasion
// plus zero tolerance for automation failures implies a VISIBLE
// human escalation route. Neither the code nor the docs had one.
//
// Someone arranging a funeral has days, not weeks, and no appetite
// for a chatbot or a knowledge base. If anything goes wrong with a
// memorial site — the date is wrong on the invitation, the
// livestream link won't save, a name is misspelled — they need to
// reach a person on the first attempt.
//
// WHAT IT PROMISES IS EXACTLY WHAT IT DELIVERS: an email to
// hello@pearloom.com, the address the product already uses
// everywhere. It does not claim a response time, a phone line, or
// a dedicated team, because none of those exist. Promising a human
// we can't produce would be the custom-domain mistake made on the
// worst possible occasion.
//
// The subject line is prefilled and tagged so this lands
// identifiable in the inbox and can be answered ahead of the queue
// — that operational detail is what makes "human-backed" real
// rather than decorative.
// ─────────────────────────────────────────────────────────────

import { trackEvent } from '@/lib/analytics/beacon';

interface Props {
  /** Only rendered for memorial / funeral occasions. */
  occasion?: string | null;
  /** Names the celebration in the subject so it's identifiable. */
  siteLabel?: string | null;
}

const SUPPORT_EMAIL = 'hello@pearloom.com';

export function SolemnSupportCard({ occasion, siteLabel }: Props) {
  const solemn = occasion === 'memorial' || occasion === 'funeral';
  if (!solemn) return null;

  const subject = `Memorial site — help needed${siteLabel ? ` (${siteLabel})` : ''}`;
  const body = [
    'Tell us what you need and we’ll take it from here.',
    '',
    '',
    '— Sent from Pearloom',
  ].join('\n');
  const href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <section
      style={{
        border: '1px solid var(--line-soft, rgba(14,13,11,0.10))',
        borderRadius: 14,
        padding: 18,
        background: 'var(--card, #FBF7EE)',
      }}
    >
      <h3
        style={{
          fontFamily: 'var(--font-display, Georgia, serif)',
          fontSize: 18,
          fontWeight: 600,
          margin: '0 0 6px',
        }}
      >
        If anything here needs a person
      </h3>
      <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--ink-soft)', margin: '0 0 12px' }}>
        Write to us and someone will read it and reply. You don&rsquo;t need to
        work out which part of the site is wrong, or fix it yourself — tell us
        what should be different and we&rsquo;ll sort it out with you.
      </p>
      <a
        href={href}
        onClick={() => trackEvent('solemn_support_opened', { occasion })}
        className="btn btn-outline btn-sm"
        style={{ textDecoration: 'none' }}
      >
        Email {SUPPORT_EMAIL}
      </a>
    </section>
  );
}

export default SolemnSupportCard;
