// Dev-only visual harness for the ThreadingDoor — the sign-in →
// dashboard threshold scene. Hidden in production; not linked.
import { notFound } from 'next/navigation';
import { ThreadingDoor } from '@/components/brand/ThreadingDoor';

export const dynamic = 'force-dynamic';

export default function DevThreadingDoorPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <ThreadingDoor />;
}
