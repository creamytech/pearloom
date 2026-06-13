import type { Metadata } from 'next';
import HelpClient from './HelpClient';

export const metadata: Metadata = {
  title: 'Help | Pearloom',
  description: 'Docs, shortcuts, and answers to common questions about Pearloom.',
};

export default function HelpPage() {
  return <HelpClient />;
}
