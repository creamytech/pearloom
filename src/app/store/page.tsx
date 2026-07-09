import type { Metadata } from 'next';
import { ThemeStore } from '@/components/pearloom/store/ThemeStore';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Theme Store · Pearloom',
  description:
    'Designer theme packs for every once-in-a-lifetime day. Palette, texture, type, motifs and matching components, woven into a kit. One tap to own, one tap to dress your site.',
};

export default function ThemeStorePage() {
  return <ThemeStore />;
}
