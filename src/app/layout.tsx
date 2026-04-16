import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import { validateEnv } from "@/lib/env";
import "./globals.css";

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
  title: "Pearloom — The operating system for the days that matter",
  description:
    "Sites, guests, vendors, day-of, and the post-event film — woven into one calm command center for weddings, anniversaries, and every celebration in between.",
};

import { AuthProvider } from '@/components/auth-provider';
import { ToastProvider } from '@/components/ui/toast';
import { OfflineIndicator } from '@/components/shared/OfflineIndicator';
import { SharedScrollProvider } from '@/lib/shared-scroll';
import { ThemeProvider } from '@/components/shell/ThemeProvider';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`h-full antialiased ${fraunces.variable} ${geist.variable} ${geistMono.variable}`}
    >
      <head>
        {/* Inline boot script: read theme from localStorage before paint to avoid flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('pl-theme');var m=window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.dataset.theme=(t==='dark'||t==='light')?t:(m?'dark':'light');}catch(e){document.documentElement.dataset.theme='light';}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-body">
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <SharedScrollProvider>
                <OfflineIndicator />
                {children}
              </SharedScrollProvider>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
