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
        Request a copy of everything we have, correct anything that's wrong, or delete your account — visit
        your dashboard settings or email <a href="mailto:hello@pearloom.com" style={{ color: 'var(--lavender-ink)' }}>hello@pearloom.com</a>.
      </p>
      <p style={{ marginTop: 24, fontSize: 13, opacity: 0.7 }}>Last updated: April 2026.</p>
    </LegalPage>
  );
}
