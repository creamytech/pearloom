export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { SpeechComposerPage } from '@/components/pearloom/pages/SpeechComposerPage';

export const metadata: Metadata = {
  title: 'Speech composer · Pearloom',
  description: 'Paste a draft toast, vows, or welcome speech — Pear scores it and suggests surgical edits.',
};

export default function Page() {
  return <SpeechComposerPage />;
}
