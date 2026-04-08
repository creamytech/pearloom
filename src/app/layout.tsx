import type { Metadata, Viewport } from "next";
import { validateEnv } from "@/lib/env";
import "./globals.css";

// Run environment validation once at module load (server startup).
validateEnv();

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#A3B18A',
};

export const metadata: Metadata = {
  title: "Pearloom — AI-Powered Celebration Sites",
  description:
    "Create beautiful, AI-powered celebration sites for weddings, anniversaries, and special moments. Every photo, every moment, every chapter.",
};

import { AuthProvider } from '@/components/auth-provider';
import { ToastProvider } from '@/components/ui/toast';
import { OfflineIndicator } from '@/components/shared/OfflineIndicator';
import { SharedScrollProvider } from '@/lib/shared-scroll';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Lora:ital,wght@0,400..700;1,400..700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <ToastProvider>
            <SharedScrollProvider>
              <OfflineIndicator />
              {children}
            </SharedScrollProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
