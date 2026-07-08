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
    'Weave a wedding, birthday, reunion, or memorial site in minutes — then run the whole day from one calm home: guests, RSVPs, registry, day-of, and the keepsake after.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Pearloom — the operating system for the days that matter',
    description:
      'A craft house for memory. Sites, guests, the day itself, and everything worth keeping after — woven, not templated.',
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
      description: 'A craft house for memory — celebration sites and the operating system around them.',
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
        'Weave a wedding, birthday, reunion, or memorial site in minutes — then run guests, RSVPs, registry, and the day itself from one calm home.',
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
