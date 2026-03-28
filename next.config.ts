import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  // Suppress the turbopack workspace root warning by setting root explicitly
  turbopack: {
    root: process.cwd(),
  },

  // Image optimization — allow Google Photos and Supabase URLs
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: '*.googleusercontent.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.in' },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  // Silence specific known warnings
  logging: {
    fetches: { fullUrl: false },
  },
};

export default nextConfig;
