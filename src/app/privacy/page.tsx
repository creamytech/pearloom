import type { Metadata } from 'next';
import { LegalPage } from '@/components/pearloom/pages/LegalPage';

export const metadata: Metadata = {
  title: 'Privacy · Pearloom',
  description: 'How Pearloom handles your memories, data, and privacy.',
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy, with care."
      subtitle="We treat every photo, message, and memory like it's our own. Here's exactly how we handle them."
    >
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--ink)', marginTop: 40, marginBottom: 12 }}>The short version</h2>
      <p>
        We collect only what's needed to make your events work. We never sell your data. We store your memories
        safely. You can export or delete everything, any time.
      </p>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--ink)', marginTop: 40, marginBottom: 12 }}>What we collect</h2>
      <p>
        Your name and email when you sign in; photos, text, and guest lists you upload; analytics on how your
        site is used so we can improve the product.
      </p>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--ink)', marginTop: 40, marginBottom: 12 }}>Third-party processors</h2>
      <p>
        Supabase (database + auth), Cloudflare R2 (file storage), Resend (transactional email), Stripe (billing),
        Google (OAuth sign-in), Anthropic and Google AI (AI features). Each processor is under a data-processing
        agreement that mirrors our commitments to you.
      </p>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--ink)', marginTop: 40, marginBottom: 12 }}>Your rights</h2>
      <p>
        <strong>Export your data:</strong> visit <a href="/dashboard/profile?section=export" style={{ color: 'var(--lavender-ink)' }}>Settings → Weave a backup</a> for a one-click JSON download of every site, guest, RSVP, photo URL, registry item, and payment record we hold on you.
      </p>
      <p>
        <strong>Delete your account:</strong> visit <a href="/dashboard/profile?section=danger" style={{ color: 'var(--lavender-ink)' }}>Settings → Delicate actions</a>. Account deletion is irreversible, every site, guest, message, and photo is hard-deleted within seconds.
      </p>
      <p>
        Need to correct something we got wrong, or have a question? Email <a href="mailto:hello@pearloom.com" style={{ color: 'var(--lavender-ink)' }}>hello@pearloom.com</a>.
      </p>
      <p style={{ marginTop: 24, fontSize: 13, opacity: 0.7 }}>Last updated: May 2026.</p>
    </LegalPage>
  );
}
