export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import LandingPageWrapper from './LandingPageWrapper';

/* The money page carries its own explicit metadata + canonical —
   everything else inherits the root defaults. */
export const metadata: Metadata = {
  title: 'Pearloom — beautiful sites for weddings & every day that matters',
  description:
    'Make a beautiful wedding, birthday, reunion, or memorial website in minutes — then manage guests, RSVPs, the registry, and the whole day from one place.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Pearloom — beautiful sites for the days that matter',
    description:
      'Make a beautiful site for your celebration, invite your people, and keep every moment after — all in one place.',
    url: '/',
  },
};

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://pearloom.com';

/* Structured data — Organization + WebSite + SoftwareApplication.
   Rendered only on the signed-out landing (the crawler's view). */
const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${BASE}/#org`,
      name: 'Pearloom',
      url: BASE,
      logo: `${BASE}/email-logo.png`,
      description: 'Beautiful websites for weddings and life’s big days, with everything to run the event in one place.',
    },
    {
      '@type': 'WebSite',
      '@id': `${BASE}/#website`,
      name: 'Pearloom',
      url: BASE,
      publisher: { '@id': `${BASE}/#org` },
    },
    {
      '@type': 'SoftwareApplication',
      name: 'Pearloom',
      applicationCategory: 'LifestyleApplication',
      operatingSystem: 'Web',
      url: BASE,
      description:
        'Make a wedding, birthday, reunion, or memorial website in minutes — then manage guests, RSVPs, the registry, and the day itself in one place.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
  ],
};

export default async function RootPage() {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect('/dashboard');
  }
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <LandingPageWrapper />
    </>
  );
}
