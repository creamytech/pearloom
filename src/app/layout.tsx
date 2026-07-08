import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { validateEnv } from "@/lib/env";
import "./globals.css";
import "./pearloom.css";
import "./animation.css";

validateEnv();

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
  axes: ["SOFT", "WONK", "opsz"],
  style: ["normal", "italic"],
});

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-mono",
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F5EFE2' },
    { media: '(prefers-color-scheme: dark)',  color: '#0D0B07' },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://pearloom.com'),
  title: "Pearloom — Beautiful websites for weddings & life's big days",
  description:
    "Create a beautiful website for your wedding, birthday, or celebration — then manage guests, RSVPs, and the whole day from one place.",
  openGraph: {
    siteName: 'Pearloom',
    type: 'website',
    locale: 'en_US',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'Pearloom — beautiful sites for the days that matter' }],
  },
  twitter: {
    card: 'summary_large_image',
  },
};

import { AuthProvider } from '@/components/auth-provider';
import { ToastProvider } from '@/components/ui/toast';
import { OfflineIndicator } from '@/components/shared/OfflineIndicator';
import { SharedScrollProvider } from '@/lib/shared-scroll';
import { ThemeProvider } from '@/components/shell/ThemeProvider';
import { ErrorTelemetry } from '@/components/shell/ErrorTelemetry';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      // Next 16 no longer forces scroll-behavior:auto during SPA
      // navigations; without this attribute our global
      // `html { scroll-behavior: smooth }` makes every route change
      // slow-scroll to the top. The attribute restores instant
      // nav-scroll while keeping smooth in-page anchor scrolling.
      data-scroll-behavior="smooth"
      className={`h-full antialiased ${fraunces.variable} ${geist.variable} ${geistMono.variable}`}
    >
      <head>
        {/* The product is light-mode across the board. Force it before
            paint (and drop any stale pl-theme='dark' a user set back when
            the toggle existed) so nobody is left on dark. Per-site guest
            themes are unaffected — they carry their own --t-* theme bag. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{document.documentElement.dataset.theme='light';localStorage.removeItem('pl-theme');}catch(e){document.documentElement.dataset.theme='light';}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-body">
        {/* Phase 4.6 of AUDIT-2026-05-29 — keyboard users can
            bypass the global nav with one Tab. Stays visually
            hidden until focused (the :focus rule promotes it
            into view). Targets #pl-main, which page layouts
            should put on the primary <main> element. */}
        <a
          href="#pl-main"
          className="pl-skip-link"
          style={{
            position: 'absolute',
            top: -40,
            left: 12,
            zIndex: 9999,
            padding: '8px 14px',
            borderRadius: 'var(--pl-radius-md, 8px)',
            background: 'var(--ink, #0E0D0B)',
            color: 'var(--cream, #FBF7EE)',
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Skip to main content
        </a>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <SharedScrollProvider>
                <OfflineIndicator />
                <ErrorTelemetry />
                {children}
              </SharedScrollProvider>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
        {/* The Pearloom motion engine: flips [data-revealed] on scroll
            and plays the two-strand weave transition. Vanilla, dep-free,
            reduced-motion aware. animation.css carries a progressive-
            enhancement gate (html:not(.pl-motion-ready)) so content is
            always visible even if this never loads. */}
        <Script src="/pearloom-motion.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
