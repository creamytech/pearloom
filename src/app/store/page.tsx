import type { Metadata } from 'next';
import { ThemeStore } from '@/components/pearloom/store/ThemeStore';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Theme Gallery · Pearloom',
  description:
    'Designer themes for every once-in-a-lifetime day — palette, texture, type, motifs and matching components, woven into a kit. Every one is free. One tap to dress your site.',
};

export default function ThemeStorePage() {
  return <ThemeStore />;
}
