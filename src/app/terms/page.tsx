import type { Metadata } from 'next';
import { LegalPage } from '@/components/pearloom/pages/LegalPage';

export const metadata: Metadata = {
  title: 'Terms · Pearloom',
  description: 'The terms for using Pearloom — written in plain language.',
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms, in plain language."
      subtitle="Here's how we work together — without legal jargon getting in the way of your celebration."
    >
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--ink)', marginTop: 40, marginBottom: 12 }}>Your content is yours</h2>
      <p>
        Every photo, message, and design you put into Pearloom belongs to you. You grant us a narrow license
        to host, display, and deliver it to your guests. That's it.
      </p>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--ink)', marginTop: 40, marginBottom: 12 }}>Our commitments</h2>
      <p>
        We'll keep your sites running, your data backed up, and your account secure. We'll give 30 days&apos;
        notice before material changes to these terms.
      </p>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--ink)', marginTop: 40, marginBottom: 12 }}>What we ask</h2>
      <p>
        Don't upload anything you don't have rights to. Don't use Pearloom for spam, harassment, or anything
        that would hurt someone else&apos;s day.
      </p>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--ink)', marginTop: 40, marginBottom: 12 }}>Ending things</h2>
      <p>
        Cancel any time from settings — your sites stay up until you delete them. We can pause accounts that
        violate these terms but we&apos;ll always explain why first.
      </p>
      <p style={{ marginTop: 24, fontSize: 13, opacity: 0.7 }}>Last updated: April 2026.</p>
    </LegalPage>
  );
}
