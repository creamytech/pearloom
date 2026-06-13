import type { NextConfig } from "next";
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  reactCompiler: true,

  // Suppress the turbopack workspace root warning by setting root explicitly
  turbopack: {
    root: process.cwd(),
  },

  // Image optimization — allow Google Photos, Supabase, and Cloudflare R2
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: '*.googleusercontent.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.in' },
      { protocol: 'https', hostname: 'pub-048344d6c97340309d01946d6aad04c3.r2.dev' },
      { protocol: 'https', hostname: '*.r2.dev' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  // Silence specific known warnings
  logging: {
    fetches: { fullUrl: false },
  },
};

// Wrap with Sentry — uploads source maps to Sentry's CDN at build
// time when SENTRY_AUTH_TOKEN is present (CI / prod). Without it,
// the wrapper is a transparent passthrough — dev / preview deploys
// keep their build performance.
//
// The sentry.{server,client,edge}.config.ts files at the repo root
// are auto-loaded by @sentry/nextjs into their respective runtimes;
// each gates Sentry.init on the relevant DSN env var so dev runs
// without a Sentry project still work.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Don't upload source maps in dev / when the auth token isn't set.
  silent: !process.env.SENTRY_AUTH_TOKEN,

  // Hide source maps from public download — they're uploaded to
  // Sentry for symbolication and then deleted from the build output.
  sourcemaps: { deleteSourcemapsAfterUpload: true },

  // Tree-shake the SDK to drop debug/log statements from the
  // production bundle.
  disableLogger: true,

  // Route Sentry's error-reporting through a Next.js rewrite at
  // /monitoring/* so ad-blockers don't strip them.
  tunnelRoute: '/monitoring',
});
