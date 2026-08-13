// Dev-only QA stage for the First Pressing reveal (see
// FirstPressingStage). Same production gate as /dev/theme-pack.
import { notFound } from 'next/navigation';
import { FirstPressingStage } from './FirstPressingStage';

export const dynamic = 'force-dynamic';

export default function FirstPressingPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <FirstPressingStage />;
}
