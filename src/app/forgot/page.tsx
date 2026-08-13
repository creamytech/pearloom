import type { Metadata } from 'next';
import { ForgotClient } from '@/components/auth/ManualAuthPages';

export const metadata: Metadata = {
  title: 'Reset your password · Pearloom',
  description: 'Lost the thread? We will send a reset link.',
};

export default function ForgotPage() {
  return <ForgotClient />;
}
