import type { NextConfig } from "next";

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

export default nextConfig;
