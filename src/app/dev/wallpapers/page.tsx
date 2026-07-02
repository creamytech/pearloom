import { notFound } from 'next/navigation';
import { DevWallpapersClient } from './DevWallpapersClient';

export const metadata = { title: 'Living backgrounds — dev' };
export const dynamic = 'force-dynamic';

export default function DevWallpapersPage() {
  // Hard gate — never serve in production. The folder name (`dev`)
  // wouldn't keep it out of a deployed bundle on its own, and
  // robots.ts doesn't disallow /dev.
  if (process.env.NODE_ENV === 'production') notFound();

  return <DevWallpapersClient />;
}
