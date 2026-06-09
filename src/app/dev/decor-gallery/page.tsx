// ─────────────────────────────────────────────────────────────
// /dev/decor-gallery — visual QA sheet for the decor SVG library.
//
// Renders every motif, monogram frame, and divider look on one
// page so a designer (or a Playwright screenshot) can review the
// whole collection at a glance. Dev-only — notFound() in
// production, same gate as /dev/theme-pack.
// ─────────────────────────────────────────────────────────────

import { notFound } from 'next/navigation';
import { DecorGalleryClient } from './DecorGalleryClient';

export const dynamic = 'force-dynamic';

export default function DecorGalleryPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <DecorGalleryClient />;
}
